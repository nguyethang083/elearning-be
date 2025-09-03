# Copyright (c) 2025, Minh Quy and contributors
# For license information, please see license.txt

# ==============================================================================
# student_topic_mastery.py
#
# This file contains all the backend logic for calculating and updating
# the "Weakness Score" for each student on each topic.
# It is triggered by hooks from "Flashcard Session" and "Student Knowledge Profile".
# ==============================================================================

import frappe
from frappe.model.document import Document
from frappe.utils import now
import math

# Define constants for weights to be used across functions
W_ACCURACY = 0.25   
W_PACING = 0.15    
W_DECAY = 0.40     
W_GAP = 0.20   


class StudentTopicMastery(Document):
    pass


# ==============================================================================
# MAIN HOOK FUNCTION (triggered after a learning session)
# ==============================================================================


def update_mastery_on_session_completion(session_doc, method=None):
    """
    This is the main hook function, triggered by `on_submit` of `Flashcard Session`.
    It recalculates and updates the Student Topic Mastery record after a learning activity.
    """
    try:
        student = session_doc.user  # The field is 'user' in Flashcard Session
        topic = str(session_doc.topic)

        # Step 1: Get the existing mastery record. We need it for the baseline 'accuracy_component'.
        if not frappe.db.exists(
            "Student Topic Mastery", {"student": student, "topic": topic}
        ):
            frappe.log_error(
                f"Student Topic Mastery record not found for student {student}, topic {topic}. Cannot update.",
                "Weakness Score Update Error",
            )
            return

        mastery_doc = frappe.get_doc(
            "Student Topic Mastery", {"student": student, "topic": topic}
        )

        # Step 2: Calculate the NEW Pacing Component from the session that just completed.
        pacing_component = calculate_pacing_component(
            topic, session_doc.time_spent_seconds
        )

        # Step 3: Calculate the NEW Decay Component from the student's current SRS progress.
        decay_component = calculate_decay_component(student, topic)

        gap_component = calculate_gap_component(student, topic)

        # Step 4: Calculate the final Weakness Score using the new normalized formula
        final_score = calculate_normalized_weakness_score(
            mastery_doc.accuracy_component, pacing_component, decay_component, gap_component
        )

        # Step 5: Update the document with the newly calculated values.
        mastery_doc.pacing_component = pacing_component
        mastery_doc.decay_component = decay_component
        mastery_doc.gap_component = gap_component
        mastery_doc.weakness_score = final_score
        mastery_doc.last_updated_on = now()

        mastery_doc.save(ignore_permissions=True)

        # Step 6: CRITICAL - Commit the changes to the database. Without this, changes are rolled back.
        frappe.db.commit()
        frappe.log_info(
            f"Successfully updated mastery for student {student}, topic {topic}. New score: {final_score}"
        )

    except Exception:
        frappe.log_error(
            frappe.get_traceback(), "update_mastery_on_session_completion Failed"
        )
        frappe.db.rollback()  # Rollback any partial changes if an error occurs.


# ==============================================================================
# HELPER FUNCTIONS (for calculating individual components)
# ==============================================================================

def calculate_gap_component(student, topic):
    """
    Calculates the Gap Component based on the number of unresolved Knowledge Gaps.
    """
    try:
        # Đếm số lượng Knowledge Gap có status KHÁC 'Resolved'
        num_gaps = frappe.db.count(
            "Knowledge Gap",
            {
                "user": student,
                "learning_object.topic": topic, # Giả sử LO có trường 'topic'
                "status": ["!=", "Resolved"]
            }
        )

        if num_gaps == 0:
            return 0.0

        # --- Sigmoid Function Implementation ---
        # x0: Midpoint - at how many gaps is the weakness score 50%?
        # A good starting point is 2.5. This means having 2-3 gaps is a significant problem.
        midpoint = 2.5

        # k: Steepness - how fast does the score rise?
        # A value around 1.0 to 1.5 is usually good.
        steepness = 1.2

        # Calculate the sigmoid score
        try:
            exponent = -steepness * (num_gaps - midpoint)
            gap_score = 1 / (1 + math.exp(exponent))
        except OverflowError:
            # Handle cases where the exponent is too large/small
            gap_score = 1.0 if num_gaps > midpoint else 0.0
            
        return gap_score

    except Exception:
        frappe.log_error(frappe.get_traceback(), "calculate_gap_component Failed")
        return 0.0


def calculate_pacing_component(topic, current_session_time):
    """Calculates the Pacing Component."""
    if not current_session_time or current_session_time <= 0:
        return 0

    system_avg_time = frappe.db.get_value(
        "Flashcard Session",
        {"topic": topic, "time_spent_seconds": [">", 0]},  # Ignore sessions with 0 time
        "AVG(time_spent_seconds)",
    )

    if not system_avg_time or system_avg_time <= 0:
        return 0  # No penalty if this is the first valid session for the topic.

    pacing_ratio = (current_session_time / system_avg_time) - 1
    return max(0, min(1, pacing_ratio))


def calculate_decay_component(student, topic):
    """Calculates the Decay Component from SRS Progress.
    This is now much simpler because User SRS Progress has a 'topic' field.
    """
    avg_ease_factor = frappe.db.get_value(
        "User SRS Progress", {"user": student, "topic": topic}, "AVG(ease_factor)"
    )

    # If the student hasn't reviewed any cards for this topic, default to 2.5 (no decay).
    if not avg_ease_factor:
        return 0

    # Convert ease factor (range 1.3 to 2.5) to decay component (range 0 to 1).
    decay_component = (2.5 - avg_ease_factor) / (2.5 - 1.3)
    return max(0, min(1, decay_component))


def calculate_normalized_weakness_score(accuracy_component, pacing_component=None, decay_component=None):
    """
    Tính toán Weakness Score được chuẩn hóa dựa trên tổng trọng số có sẵn.

    Công thức mới:
    Weakness Score = (Tổng điểm yếu có trọng số) / (Tổng trọng số có sẵn)
    
    Args:
        accuracy_component: Điểm yếu về độ chính xác (0-1), luôn có giá trị
        pacing_component: Điểm yếu về tốc độ (0-1), None nếu không có dữ liệu
        decay_component: Điểm yếu về quên lãng (0-1), None nếu không có dữ liệu
        gap_component: Điểm yếu về khoảng cách (0-1), None nếu không có dữ liệu
    
    Bước 1: Tính điểm yếu thô cho từng thành phần (0-1)
    Bước 2: Tính tổng điểm yếu có trọng số
    Bước 3: Tính tổng trọng số có sẵn
    Bước 4: Chuẩn hóa kết quả
    """

    # Bước 1: Tính điểm yếu thô (Raw Weakness) cho từng thành phần
    accuracy_weakness = accuracy_component if accuracy_component is not None else 0
    pacing_weakness = pacing_component if pacing_component is not None else 0
    decay_weakness = decay_component if decay_component is not None else 0
    gap_weakness = gap_component if gap_component is not None else 0
    
    # Bước 2: Tính tổng điểm yếu có trọng số (chỉ tính các thành phần có dữ liệu)
    weighted_sum = 0
    total_weight = 0
    
    # Bước 3: Tính tổng trọng số có sẵn (chỉ cộng trọng số của thành phần có dữ liệu)
    
    # Accuracy: Luôn có dữ liệu từ test đầu vào
    if accuracy_component is not None:
        weighted_sum += accuracy_weakness * W_ACCURACY
        total_weight += W_ACCURACY
    
    # Pacing: Chỉ có sau khi học sinh hoàn thành ít nhất 1 session
    if pacing_component is not None:
        weighted_sum += pacing_weakness * W_PACING
        total_weight += W_PACING
    
    # Decay: Chỉ có sau khi học sinh có SRS progress
    if decay_component is not None:
        weighted_sum += decay_weakness * W_DECAY
        total_weight += W_DECAY

    # Gap: Có sau khi chatbot phát hiện điểm yếu
    if gap_component is not None: # Thêm khối này
        weighted_sum += gap_weakness * W_GAP
        total_weight += W_GAP
    
    # Bước 4: Chuẩn hóa kết quả
    if total_weight > 0:
        normalized_score = weighted_sum / total_weight
        # Đảm bảo kết quả nằm trong khoảng [0, 1]
        return max(0, min(1, normalized_score))
    else:
        # Nếu không có thành phần nào có dữ liệu, trả về 0
        return 0


# ==============================================================================
# INITIALIZATION HOOK FUNCTION (triggered after initial assessment)
# ==============================================================================


def initialize_student_mastery_from_profile(profile_doc, method=None):
    """
    Initializes or updates Student Topic Mastery records from the Student Knowledge Profile.
    This is triggered by a hook on `on_update` of `Student Knowledge Profile`.
    """
    try:
        student = profile_doc.student
        for topic_entry in profile_doc.topic_mastery:
            # Make sure you have a field named 'topic' in your child table linking to the Topic DocType
            topic_id = str(topic_entry.topic)
            mastery_weight = float(topic_entry.mastery_weight or 0)

            # Calculate the initial accuracy component.
            accuracy_component = (1000 - mastery_weight) / 1000
            accuracy_component = max(0, min(1, accuracy_component))

            # At initialization, Pacing and Decay không có dữ liệu (None)
            initial_weakness_score = calculate_normalized_weakness_score(
                accuracy_component, None, None, None
            )

            # Use frappe.db.exists for efficiency
            if frappe.db.exists(
                "Student Topic Mastery", {"student": student, "topic": topic_id}
            ):
                # Update existing record using frappe.db.set_value for performance
                frappe.db.set_value(
                    "Student Topic Mastery",
                    {"student": student, "topic": topic_id},
                    {
                        "accuracy_component": accuracy_component,
                        "pacing_component": 0,
                        "decay_component": 0,
                        "weakness_score": initial_weakness_score,
                        "last_updated_on": now(),
                    },
                )
            else:
                # Create a new record if it doesn't exist
                new_mastery = frappe.new_doc("Student Topic Mastery")
                new_mastery.student = student
                new_mastery.topic = topic_id
                new_mastery.accuracy_component = accuracy_component
                new_mastery.pacing_component = 0
                new_mastery.decay_component = 0
                new_mastery.weakness_score = initial_weakness_score
                new_mastery.last_updated_on = now()
                new_mastery.insert(ignore_permissions=True)

        # CRITICAL: Commit all changes made in the loop.
        frappe.db.commit()

    except Exception:
        frappe.log_error(
            frappe.get_traceback(), "initialize_student_mastery_from_profile Failed"
        )
        frappe.db.rollback()


def update_mastery_on_gap_change(gap_doc, method=None):
    """
    Triggered when a Knowledge Gap is created, updated, or deleted.
    Recalculates the Weakness Score for the corresponding Topic.
    """
    try:
        # Lấy thông tin từ Knowledge Gap doc
        student = gap_doc.user
        lo_doc = frappe.get_doc("Learning Object", gap_doc.learning_object)
        topic = lo_doc.topic

        recalculate_mastery_for_topic(student, topic)

    except Exception:
        frappe.log_error(frappe.get_traceback(), "update_mastery_on_gap_change Failed")

def recalculate_mastery_for_topic(student, topic):
    """A general function to recalculate mastery for a student-topic pair."""
    if not frappe.db.exists("Student Topic Mastery", {"student": student, "topic": topic}):
        return

    mastery_doc = frappe.get_doc("Student Topic Mastery", {"student": student, "topic": topic})
    
    # Lấy lại các giá trị component đã có
    # Pacing và Decay không thay đổi khi KG thay đổi, nên đọc lại giá trị cũ
    pacing_component = mastery_doc.pacing_component
    decay_component = mastery_doc.decay_component
    
    # Chỉ tính lại Gap component
    gap_component = calculate_gap_component(student, topic)

    # Tính điểm cuối cùng
    final_score = calculate_normalized_weakness_score(
        mastery_doc.accuracy_component, 
        pacing_component, 
        decay_component,
        gap_component
    )

    # Cập nhật và lưu
    mastery_doc.weakness_score = final_score
    mastery_doc.last_updated_on = now()
    mastery_doc.save(ignore_permissions=True)
    frappe.db.commit()
    frappe.log_info(f"Mastery recalculated on gap change for student {student}, topic {topic}. New score: {final_score}")

# ==============================================================================
# API ENDPOINT (for frontend to fetch data)
# ==============================================================================


@frappe.whitelist()
def get_knowledge_constellation():
    """
    API endpoint for the frontend to fetch the data needed to draw the
    "Knowledge Constellation" map.
    """
    user = frappe.session.user
    if not user or user == "Guest":
        frappe.throw(
            "Authentication required to view your learning pathway.",
            frappe.AuthenticationError,
        )

    profile_name = frappe.db.get_value(
        "Student Knowledge Profile", {"student": user}, "name"
    )

    try:
        # Get all mastery data for the logged-in user
        mastery_data = frappe.get_all(
            "Student Topic Mastery",
            filters={"student": user},
            fields=[
                "topic",
                "weakness_score",
                "accuracy_component",
                "pacing_component",
                "decay_component",
            ],
        )

        # Get all topic names in a single query for efficiency
        all_topics = frappe.get_all("Topics", fields=["name", "topic_name"])
        topic_name_map = {str(t.name): t.topic_name for t in all_topics}

        # Get latest Student Pathway Snapshot for the user
        snapshot = frappe.db.get_value(
            "Student Pathway Snapshot",
            {"student": profile_name},
            ["pathway_json"],
            order_by="creation desc",
        )

        # Build a map of topic_id to is_unlocked from the snapshot
        unlocked_map = {}
        if snapshot:
            import json

            try:
                pathway_data = json.loads(snapshot)
                if isinstance(pathway_data, dict):
                    chapters = pathway_data.get("pathway", [])
                elif isinstance(pathway_data, list):
                    chapters = pathway_data
                else:
                    chapters = []
                for chapter in chapters:
                    tid = str(chapter.get("id"))
                    is_unlocked_val = bool(chapter.get("is_unlocked", False))
                    unlocked_map[tid] = is_unlocked_val
            except Exception:
                frappe.log_error(
                    frappe.get_traceback(),
                    "Parse pathway_json failed in get_knowledge_constellation",
                )

        # Combine the data
        constellation = []
        for mastery in mastery_data:
            topic_id_str = str(mastery.topic)
            print(
                f"DEBUG topic_id_str: {topic_id_str}, is_unlocked: {unlocked_map.get(topic_id_str, False)}"
            )
            is_unlocked = unlocked_map.get(topic_id_str, False)
            constellation.append(
                {
                    "topic_id": topic_id_str,
                    "topic_name": topic_name_map.get(
                        topic_id_str, f"Topic {topic_id_str}"
                    ),
                    "weakness_score": mastery.weakness_score,
                    "is_unlocked": is_unlocked,
                    "components": {
                        "accuracy": mastery.accuracy_component,
                        "pacing": mastery.pacing_component,
                        "decay": mastery.decay_component,
                    },
                }
            )

        return constellation

    except Exception:
        frappe.log_error(frappe.get_traceback(), "get_knowledge_constellation Failed")
        frappe.throw(
            "An error occurred while loading your learning pathway. Please try again later."
        )
