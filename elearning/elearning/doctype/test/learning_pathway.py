import numpy as np
import json
import frappe


def _convert_theta_to_mastery(
    theta, topic=None, questions_answered=None, num_correct=None, num_total=None
):
    """
    Advanced theta to mastery conversion that better reflects ability differences
    Uses sigmoid transformation with topic-specific adjustments
    """
    # Clamp theta to reasonable bounds
    theta_clamped = max(-4.0, min(4.0, theta))
    # Sigmoid transformation for more nuanced ability representation
    sigmoid_value = 1 / (1 + np.exp(-1.5 * theta_clamped))
    # Base mastery from sigmoid (0 to 800)
    base_mastery = sigmoid_value * 800
    # Confidence adjustment based on number of questions answered (not used here)
    confidence_multiplier = 1.0
    # Final mastery calculation
    final_mastery = base_mastery * confidence_multiplier
    # Ensure it's in valid range (max 800)
    mastery = max(0, min(800, int(round(final_mastery))))
    return mastery


@frappe.whitelist()
def get_learning_pathway():
    """Generate personalized learning pathway based on placement test results"""
    
    # Fetch session_id from request args instead of function parameter
    session_id = frappe.request.args.get("session_id")
    if not session_id:
        frappe.throw(_("Session ID is required"), frappe.ValidationError)

    session = frappe.get_doc("Placement Test Session", session_id)
    # if session.status != "Completed":
    #     frappe.throw("Test session is not completed yet.")

    # --- Topic-centric pathway logic ---
    # Topic curriculum mapping
    TOPIC_INFO = [
        ("1", "Chương I. Phương trình và Hệ phương trình bậc nhất"),
        ("2", "Chương II. Bất đẳng thức"),
        ("3", "Chương III. Căn thức"),
        ("4", "Chương IV. Hệ thức lượng trong tam giác vuông"),
        ("5", "Chương V. Đường tròn"),
        ("6", "Chương VI. Thống kê & Xác suất"),
        ("7", "Chương VII. Hàm số y = ax² (a ≠ 0), Phương trình bậc hai"),
        ("8", "Chương VIII. Đường tròn ngoại tiếp & nội tiếp"),
        ("9", "Chương IX. Đa giác đều"),
        ("10", "Chương X. Hình học trực quan"),
    ]
    TOPIC_DEPENDENCIES = {
        "1": [],
        "2": ["1"],
        "3": ["1"],
        "4": ["1"],
        "5": ["4"],
        "6": [],
        "7": ["2"],
        "8": ["5"],
        "9": ["8"],
        "10": [],
    }
    MASTERY_THRESHOLDS = {"weak": 500, "partial": 750, "strong": 1000}

    # Get topic abilities from the session
    topic_abilities = {
        str(ability.topic): ability for ability in session.topic_abilities
    }

    # Recursive unlock logic: topic is unlocked only if all prerequisites (direct and indirect) are mastered
    def is_fully_unlocked(topic_id, mastery_weights, dependencies, threshold):
        for prereq in dependencies.get(topic_id, []):
            if mastery_weights.get(prereq, 0) < threshold:
                return False
            if not is_fully_unlocked(prereq, mastery_weights, dependencies, threshold):
                return False
        return True

    # Build mastery_weights dict (converted values)
    mastery_weights = {}
    for tid, _ in TOPIC_INFO:
        ability = topic_abilities.get(tid)
        theta = getattr(ability, "ability_estimate", 0)
        mastery_weights[tid] = _convert_theta_to_mastery(theta)

    # Build pathway array with recursive unlock logic
    pathway = []
    for tid, name in TOPIC_INFO:
        mastery_weight = mastery_weights.get(tid, 0)
        unlocked = is_fully_unlocked(
            tid, mastery_weights, TOPIC_DEPENDENCIES, MASTERY_THRESHOLDS["weak"]
        )
        pathway.append(
            {
                "id": tid,
                "name": name,
                "mastery_weight": mastery_weight,
                "is_unlocked": unlocked,
                "status": "unlocked" if unlocked else "locked",
            }
        )

    # Overall level logic (same as before)
    avg_mastery = sum(mastery_weights.values()) / max(1, len(mastery_weights))
    if avg_mastery >= MASTERY_THRESHOLDS["strong"]:
        overall_level = "Nâng cao"
    elif avg_mastery >= MASTERY_THRESHOLDS["partial"]:
        overall_level = "Trung bình"
    else:
        overall_level = "Sơ cấp"

    # Save or update pathway snapshot for Student Knowledge Profile
    student_profile = session.student  # This is a Student Knowledge Profile
    # Use raw SQL for insert/update
    import datetime

    now = frappe.utils.now_datetime()
    pathway_json_str = json.dumps(pathway)
    # Check if record exists
    result = frappe.db.sql(
        """
        SELECT name FROM `tabStudent Pathway Snapshot`
        WHERE student = %s AND session_id = %s
        """,
        (student_profile, session_id),
        as_dict=True,
    )
    if result:
        # Update existing
        frappe.db.sql(
            """
            UPDATE `tabStudent Pathway Snapshot`
            SET pathway_json = %s, overall_level = %s, modified = %s
            WHERE name = %s
            """,
            (pathway_json_str, overall_level, now, result[0]["name"]),
        )
        frappe.db.commit()
        print("Updated existing pathway snapshot for", student_profile)
    else:
        # Insert new
        new_name = frappe.generate_hash()
        frappe.db.sql(
            """
            INSERT INTO `tabStudent Pathway Snapshot`
            (name, student, session_id, pathway_json, overall_level, docstatus, creation, modified, owner, modified_by)
            VALUES (%s, %s, %s, %s, %s, 0, %s, %s, %s, %s)
            """,
            (
                new_name,
                student_profile,
                session_id,
                pathway_json_str,
                overall_level,
                now,
                now,
                frappe.session.user,
                frappe.session.user,
            ),
        )
        frappe.db.commit()
        print("Created new pathway snapshot for", student_profile)

    return {
        "session_id": session_id,
        "pathway": pathway,
        "overall_level": overall_level,
        "topic_scores": mastery_weights,
    }


def determine_overall_level_from_abilities(topic_abilities):
    """Determine overall student level based on topic performance"""
    if not topic_abilities:
        return "Sơ cấp"

    avg_mastery = sum(
        data["mastery_weight"] for data in topic_abilities.values()
    ) / len(topic_abilities)

    if avg_mastery >= 2.0:
        return "Nâng cao"
    elif avg_mastery >= 0.5:
        return "Trung bình"
    else:
        return "Sơ cấp"


def calculate_chapter_progress(chapter_index, topic_abilities=None):
    """Calculate progress for each chapter based on placement test results"""
    if not topic_abilities:
        return 0

    # Direct mapping: Chapter index corresponds to topic order in placement test
    # Convert topic_abilities to ordered list based on topic keys, sorted numerically
    topic_keys = sorted(topic_abilities.keys(), key=lambda x: int(x))

    if chapter_index < len(topic_keys):
        # Use the corresponding topic's mastery weight directly
        topic_key = topic_keys[chapter_index]
        mastery_weight = topic_abilities[topic_key]["mastery_weight"]

        # Convert mastery weight (0-1000) to percentage (0-100)
        # Assuming mastery_weight ranges from 0 to 1000
        progress = min(100, max(0, int(mastery_weight / 10)))
        return progress
    else:
        # For chapters beyond available topics, use 0
        return 0


def generate_pathway_chapters(topic_abilities):
    """Generate learning pathway chapters based on test results"""

    # Calculate overall score for status determination based on average progress
    total_progress = 0
    valid_chapters = 0

    # Pre-calculate progress for all chapters to determine status
    chapter_progresses = []
    for i in range(10):  # We have 10 chapters
        progress = calculate_chapter_progress(i, topic_abilities)
        chapter_progresses.append(progress)
        if progress > 0:
            total_progress += progress
            valid_chapters += 1

    avg_progress = total_progress / max(1, valid_chapters)  # Avoid division by zero

    # Prerequisite logic for locked/unlocked chapters
    # Define prerequisites for each chapter (by id)
    PREREQUISITES = {
        1: [],
        2: [1],
        3: [1],
        4: [1],
        5: [4],
        6: [],
        7: [2],
        8: [5],
        9: [8],
        10: [],
    }

    def is_unlocked(chapter_id, chapter_progresses):
        prereqs = PREREQUISITES.get(chapter_id, [])
        for pre in prereqs:
            if (
                chapter_progresses[pre - 1] < 75
            ):  # Require at least 75% mastery in prerequisite
                return False
        return True

    chapters = []
    chapter_info = [
        (
            1,
            "Chương I. Phương trình và Hệ phương trình bậc nhất",
            "Nắm vững các khái niệm cơ bản về phương trình bậc nhất một ẩn và hệ phương trình.",
        ),
        (
            2,
            "Chương II. Hàm số và Đồ thị",
            "Hiểu các khái niệm về hàm số và cách vẽ đồ thị.",
        ),
        (3, "Chương III. Số Phức", "Nắm vững các phép toán với số phức và ứng dụng."),
        (4, "Chương IV. Bất đẳng thức", "Học cách giải và chứng minh bất đẳng thức."),
        (
            5,
            "Chương V. Hình học phẳng",
            "Tìm hiểu các khái niệm về hình học Euclid trong mặt phẳng.",
        ),
        (
            6,
            "Chương VI. Hình học không gian",
            "Khám phá hình học ba chiều và các ứng dụng.",
        ),
        (7, "Chương VII. Đạo hàm", "Nắm vững khái niệm đạo hàm và các ứng dụng."),
        (
            8,
            "Chương VIII. Tích phân",
            "Học cách tính tích phân và ứng dụng trong thực tế.",
        ),
        (
            9,
            "Chương IX. Xác suất và Thống kê",
            "Tìm hiểu về xác suất và các phương pháp thống kê cơ bản.",
        ),
        (10, "Chương X. Lượng giác", "Nắm vững các hàm lượng giác và ứng dụng."),
    ]
    for i, name, desc in chapter_info:
        progress = chapter_progresses[i - 1]
        status = (
            "completed"
            if progress >= 80
            else ("in-progress" if progress >= 20 else "not-started")
        )
        unlocked = is_unlocked(i, chapter_progresses)
        chapters.append(
            {
                "id": i,
                "name": name,
                "description": desc,
                "progress": progress,
                "status": status,
                "is_unlocked": unlocked,
            }
        )

    overall_level = determine_overall_level(avg_progress)

    return {
        "personalizedPathway": True,
        "studentLevel": overall_level,
        "studyPlan": {
            "totalChapters": len(chapters),
            "progressOverview": f"Hoàn thành {sum(1 for ch in chapters if ch['status'] == 'completed')} trong {len(chapters)} chương",
            "chapters": chapters,
        },
    }


def determine_overall_level(avg_progress):
    """Determine student level based on average progress."""
    if avg_progress >= 70:
        return "Nâng cao"
    elif avg_progress >= 40:
        return "Trung cấp"
    else:
        return "Sơ cấp"


@frappe.whitelist()
def get_latest_student_pathway_snapshot():
    """Return the latest Student Pathway Snapshot for the current user (for analytics page)"""
    current_user = frappe.session.user
    if current_user == "Guest":
        frappe.throw("Bạn cần đăng nhập để xem lộ trình học tập.")
    # Find Student Knowledge Profile for current user
    profile_name = frappe.db.get_value(
        "Student Knowledge Profile", {"student": current_user}, "name"
    )
    if not profile_name:
        frappe.throw("Không tìm thấy hồ sơ năng lực cho người dùng hiện tại.")
    # Get latest snapshot (by creation or modified)
    result = frappe.db.sql(
        """
        SELECT pathway_json, overall_level, session_id, modified
        FROM `tabStudent Pathway Snapshot`
        WHERE student = %s
        ORDER BY modified DESC
        LIMIT 1
        """,
        (profile_name,),
        as_dict=True,
    )
    if not result:
        return {}
    # pathway_json is stored as JSON string
    pathway_json = result[0]["pathway_json"]
    try:
        pathway = json.loads(pathway_json)
    except Exception:
        pathway = []
    return {
        "pathway": pathway,
        "overall_level": result[0]["overall_level"],
        "session_id": result[0]["session_id"],
        "modified": result[0]["modified"],
    }
