import frappe
import random
import numpy as np
from catsim.irt import negative_log_likelihood, see, inf
from scipy.optimize import minimize_scalar
import math
from collections import defaultdict, deque

STANDARD_ERROR_THRESHOLD = 0.3  # More stringent threshold
MAX_QUESTIONS_TOTAL = 40
MIN_QUESTIONS_PER_TOPIC = 3  # Minimum questions per topic
MAX_QUESTIONS_PER_TOPIC = 12  # Maximum questions per topic

# Topic dependency graph for learning pathway generation
TOPIC_DEPENDENCIES = {
    "1": [],  # Topic 1: Phương trình & Hệ phương trình bậc nhất - Base topic (no prerequisites)
    "2": ["1"],  # Topic 2: Bất đẳng thức - requires Topic 1
    "3": ["1"],  # Topic 3: Căn thức - requires Topic 1
    "4": ["1"],  # Topic 4: Hệ thức lượng trong tam giác vuông - requires Topic 1
    "5": ["4"],  # Topic 5: Đường tròn - requires Topic 4
    "6": [],  # Topic 6: Thống kê & Xác suất - no prerequisites (recommended/independent)
    "7": [
        "2"
    ],  # Topic 7: Hàm số y = ax² (a ≠ 0), Phương trình bậc hai - requires Topic 2 only
    "8": ["5"],  # Topic 8: Đường tròn ngoại tiếp & nội tiếp - requires Topic 5
    "9": ["8"],  # Topic 9: Đa giác đều - requires Topic 8
    "10": [],  # Topic 10: Hình học trực quan - no prerequisites (recommended/independent)
}

# Mastery level thresholds
MASTERY_THRESHOLDS = {
    "weak": 500,  # < 500: must re-learn from scratch
    "partial": 750,  # 500-750: needs reinforcement
    "strong": 1000,  # > 750: can skip or review briefly
}


@frappe.whitelist()
def check_student_profile_exists():
    current_user = frappe.session.user
    if current_user == "Guest":
        return {"exists": False}
    exists = frappe.db.exists("Student Knowledge Profile", {"student": current_user})
    return {"exists": exists}


@frappe.whitelist()
def start_test():
    current_user = frappe.session.user
    if current_user == "Guest":
        frappe.throw(
            "Yêu cầu đăng nhập để thực hiện bài test.", frappe.AuthenticationError
        )

    try:
        user_details = frappe.get_doc("User", current_user)
        profile = frappe.get_doc(
            {
                "doctype": "Student Knowledge Profile",
                "student": current_user,
                "student_name": user_details.full_name,
            }
        )
        profile.insert(ignore_permissions=True)
        frappe.db.commit()
    except frappe.exceptions.DuplicateEntryError:
        frappe.db.rollback()
        profile = frappe.get_doc("Student Knowledge Profile", {"student": current_user})
    if not profile:
        frappe.throw("Không thể khởi tạo hoặc tìm thấy hồ sơ năng lực.")
    if frappe.db.exists(
        "Placement Test Session", {"student": profile.name, "status": "Completed"}
    ):
        frappe.throw("Bạn đã hoàn thành bài test này rồi.")

    existing = frappe.db.get_value(
        "Placement Test Session",
        {"student": profile.name, "status": "In Progress"},
        "name",
    )
    if existing:
        session = frappe.get_doc("Placement Test Session", existing)
        next_q = _get_next_question_with_catsim(session)
        if not next_q:
            return _finalize_session_and_get_results(session)
        # Gửi kèm trạng thái năng lực ban đầu khi resume
        initial_abilities = [t.as_dict() for t in session.topic_abilities]
        return {
            "status": "in_progress",
            "session_id": existing,
            "question": _format_question_for_frontend(next_q),
            "topic_abilities": initial_abilities,
        }

    topics = [d.name for d in frappe.get_all("Topics", fields=["name"])]
    if not topics:
        frappe.throw("Hệ thống chưa có Topic nào được tạo.")

    session = frappe.new_doc("Placement Test Session")
    session.student = profile.name
    session.status = "In Progress"
    session.start_time = frappe.utils.now_datetime()
    session.insert(ignore_permissions=True)

    # Add topic abilities after the session is created
    for t in topics:
        topic_ability = frappe.new_doc("Session Topic Ability")
        topic_ability.parent = session.name
        topic_ability.parenttype = "Placement Test Session"
        topic_ability.parentfield = "topic_abilities"
        topic_ability.topic = t
        topic_ability.ability_estimate = 0.0
        topic_ability.standard_error = 1.0
        topic_ability.questions_answered = 0
        topic_ability.insert(ignore_permissions=True)

    frappe.db.commit()

    # Reload the session to get the child records
    session.reload()

    # Select first question using the same logic as adaptive testing
    first_question_id = _get_next_question_with_catsim(session)

    if not first_question_id:
        frappe.throw("Không tìm thấy câu hỏi nào cho các chủ đề trong hệ thống.")

    initial_abilities = [t.as_dict() for t in session.topic_abilities]
    return {
        "status": "started",
        "session_id": session.name,
        "question": _format_question_for_frontend(first_question_id),
        "topic_abilities": initial_abilities,
    }


@frappe.whitelist()
def submit_answer_and_get_next():
    # Try to get parameters from request args first (GET), then from form_dict (POST)
    session_id = frappe.request.args.get("session_id") or frappe.form_dict.get(
        "session_id"
    )
    question_id = frappe.request.args.get("question_id") or frappe.form_dict.get(
        "question_id"
    )
    is_correct = frappe.request.args.get("is_correct") or frappe.form_dict.get(
        "is_correct"
    )

    if not session_id:
        frappe.throw("Session ID is required")
    if not question_id:
        frappe.throw("Question ID is required")
    if is_correct is None:
        frappe.throw("is_correct parameter is required")

    session = frappe.get_doc("Placement Test Session", session_id)
    if session.status == "Completed":
        frappe.throw("Phiên test này đã kết thúc.")

    is_correct = bool(is_correct)

    # Since we no longer pre-log questions, always create a new entry
    try:
        # Use direct SQL insert for reliability
        log_name = frappe.generate_hash()

        frappe.db.sql(
            """
            INSERT INTO `tabPlacement Answer Log` 
            (name, placement_test_session, placement_question, is_correct, docstatus, creation, modified, owner, modified_by)
            VALUES (%s, %s, %s, %s, 0, NOW(), NOW(), %s, %s)
            """,
            (
                log_name,
                session_id,
                question_id,
                1 if is_correct else 0,
                frappe.session.user,
                frappe.session.user,
            ),
        )
        frappe.db.commit()
        print(f"Successfully saved answer: {question_id} = {is_correct}")

    except Exception as e:
        print(f"Error saving answer: {e}")
        frappe.throw(f"Không thể lưu kết quả trả lời: {e}")

    frappe.db.commit()

    question_doc = frappe.get_doc("Placement Question", question_id)
    question_topic = question_doc.topic

    # Update ability for the answered topic
    new_ability, new_error = _update_ability_with_catsim(session.name, question_topic)
    topic_ability_row = next(
        row for row in session.topic_abilities if row.topic == question_topic
    )
    topic_ability_row.ability_estimate = new_ability
    topic_ability_row.standard_error = new_error
    topic_ability_row.questions_answered += 1

    for t_row in session.topic_abilities:
        updated_ability, updated_se = _update_ability_with_catsim(
            session.name, t_row.topic
        )
        t_row.ability_estimate = updated_ability
        t_row.standard_error = updated_se
    session.save(ignore_permissions=True)
    frappe.db.commit()

    # === Chuẩn bị dữ liệu feedback cho frontend ===
    # Get performance data for this topic
    topic_logs = frappe.db.sql(
        """
        SELECT placement_question, is_correct 
        FROM `tabPlacement Answer Log` 
        WHERE placement_test_session = %s 
        AND placement_question IN (
            SELECT name FROM `tabPlacement Question` WHERE topic = %s
        )
        AND is_correct IS NOT NULL
        ORDER BY creation ASC
        """,
        (session.name, question_topic),
        as_dict=True,
    )

    topic_correct = sum(1 for log in topic_logs if log.is_correct)
    topic_total = len(topic_logs)

    feedback_data = {
        "answered_question_id": question_id,
        "was_correct": is_correct,
        "updated_topic": question_topic,
        "new_theta": new_ability,
        "new_se": new_error,
        "new_mastery_weight": _convert_theta_to_mastery(
            new_ability,
            topic=question_topic,
            questions_answered=topic_ability_row.questions_answered,
            num_correct=topic_correct,
            num_total=topic_total,
        ),
        "all_topic_abilities": [t.as_dict() for t in session.topic_abilities],
    }

    topic_abilities_for_frontend = [t.as_dict() for t in session.topic_abilities]

    if _check_termination(session):
        final_data = _finalize_session_and_get_results(session)
        final_data["last_feedback"] = feedback_data
        final_data["topic_abilities"] = topic_abilities_for_frontend
        return final_data

    # Reload session to get latest data before selecting next question
    session.reload()
    next_question_id = _get_next_question_with_catsim(session)

    if not next_question_id:
        final_data = _finalize_session_and_get_results(session)
        final_data["last_feedback"] = feedback_data
        final_data["topic_abilities"] = topic_abilities_for_frontend
        return final_data

    question_data = _format_question_for_frontend(next_question_id)

    return {
        "status": "in_progress",
        "session_id": session.name,
        "question": question_data,
        "feedback": feedback_data,
        "topic_abilities": topic_abilities_for_frontend,
    }


def _get_next_question_with_catsim(session):
    """
    FIXED: Proper adaptive testing with content balancing and no re-selection
    """
    # Validate that topics have questions
    all_topics = [t.topic for t in session.topic_abilities]
    total_questions = frappe.db.count(
        "Placement Question", {"topic": ["in", all_topics]}
    )

    if total_questions == 0:
        print(f"Error: No questions found for topics {all_topics}")
        return None

    print(
        f"Total available questions: {total_questions} across {len(all_topics)} topics"
    )

    # Get all answered questions to prevent re-selection
    answered_logs = frappe.db.sql(
        """
        SELECT placement_question, is_correct 
        FROM `tabPlacement Answer Log` 
        WHERE placement_test_session = %s 
        AND is_correct IS NOT NULL
        ORDER BY creation ASC
        """,
        (session.name,),
        as_dict=True,
    )

    answered_questions = {
        log.placement_question for log in answered_logs if log.placement_question
    }
    print(
        f"Session {session.name}: Actually answered questions ({len(answered_questions)}): {answered_questions}"
    )

    # Get question counts per topic
    topic_question_counts = {}
    for topic_ability in session.topic_abilities:
        topic_name = topic_ability.topic
        topic_logs = [
            log
            for log in answered_logs
            if log.placement_question
            and _get_question_topic(log.placement_question) == topic_name
        ]
        topic_question_counts[topic_name] = len(topic_logs)

    # Phase 1: Ensure minimum coverage (first 3-4 questions per topic)
    total_answered = len(answered_questions)
    print(
        f"Total answered: {total_answered}, Minimum needed: {len(session.topic_abilities) * MIN_QUESTIONS_PER_TOPIC}"
    )

    if total_answered < len(session.topic_abilities) * MIN_QUESTIONS_PER_TOPIC:
        return _select_question_for_coverage_phase(
            session, answered_questions, topic_question_counts
        )

    # Phase 2: Adaptive selection based on information and content constraints
    return _select_question_adaptive_phase(
        session, answered_questions, topic_question_counts
    )


def _select_question_for_coverage_phase(
    session, answered_questions, topic_question_counts
):
    """
    Phase 1: Ensure each topic gets minimum coverage with appropriate difficulty
    """
    # Find topics that need more questions
    under_covered_topics = []
    for topic_ability in session.topic_abilities:
        topic_name = topic_ability.topic
        if topic_question_counts.get(topic_name, 0) < MIN_QUESTIONS_PER_TOPIC:
            under_covered_topics.append(topic_ability)

    print(f"Coverage phase: {len(under_covered_topics)} topics need more questions")

    if not under_covered_topics:
        return None

    # Select topic with highest standard error among under-covered
    target_topic = max(under_covered_topics, key=lambda t: t.standard_error)
    print(
        f"Coverage phase: Selected topic '{target_topic.topic}' with SE={target_topic.standard_error:.3f}"
    )

    selected_question = _select_best_question_in_topic(
        target_topic.topic,
        target_topic.ability_estimate,
        answered_questions,
        phase="coverage",
    )

    if selected_question:
        print(f"Selected question in coverage phase: {selected_question}")

    return selected_question


def _select_question_adaptive_phase(session, answered_questions, topic_question_counts):
    """
    Phase 2: Pure adaptive selection with content balancing
    """
    best_question = None
    max_utility = -1

    for topic_ability in session.topic_abilities:
        topic_name = topic_ability.topic
        current_count = topic_question_counts.get(topic_name, 0)

        # Skip if topic has reached maximum
        if current_count >= MAX_QUESTIONS_PER_TOPIC:
            continue

        # Calculate content balancing weight
        # For this we need to get the actual answered count, not just used count
        answered_logs = frappe.get_all(
            "Placement Answer Log",
            filters={
                "placement_test_session": session.name,
                "is_correct": ["is", "set"],
            },
            fields=["placement_question"],
        )
        total_answered = len([log for log in answered_logs if log.placement_question])
        expected_proportion = 1.0 / len(session.topic_abilities)
        actual_proportion = current_count / max(total_answered, 1)
        content_weight = max(0.1, expected_proportion / max(actual_proportion, 0.01))

        # Find best question in this topic
        question_id = _select_best_question_in_topic(
            topic_name,
            topic_ability.ability_estimate,
            answered_questions,
            phase="adaptive",
        )

        if question_id:
            # Calculate utility combining information and content balance
            info_value = _calculate_question_information(
                question_id, topic_ability.ability_estimate
            )

            # Utility = Information × Content Weight × Standard Error Priority
            utility = info_value * content_weight * (topic_ability.standard_error**0.5)

            print(
                f"Topic {topic_name}: Info={info_value:.3f}, ContentWeight={content_weight:.2f}, SE={topic_ability.standard_error:.3f}, Utility={utility:.3f}"
            )

            if utility > max_utility:
                max_utility = utility
                best_question = question_id

    if best_question:
        print(
            f"Selected question in adaptive phase: {best_question} with utility: {max_utility:.3f}"
        )

    return best_question


def _select_best_question_in_topic(
    topic_name, theta, answered_questions, phase="adaptive"
):
    """
    Select the best question within a specific topic
    """
    # Get available questions in topic, excluding used ones
    if answered_questions:
        # Use raw SQL for reliable exclusion
        candidate_items = frappe.db.sql(
            """
            SELECT name, discrimination, difficulty, guessing_probability
            FROM `tabPlacement Question`
            WHERE topic = %s
            AND name NOT IN ({})
            """.format(
                ",".join(["%s"] * len(answered_questions))
            ),
            [topic_name] + list(answered_questions),
            as_dict=True,
        )
    else:
        candidate_items = frappe.get_all(
            "Placement Question",
            filters={"topic": topic_name},
            fields=["name", "discrimination", "difficulty", "guessing_probability"],
        )

    print(
        f"Topic '{topic_name}': Found {len(candidate_items)} candidate questions (phase: {phase})"
    )
    print(
        f"Topic '{topic_name}': Excluded {len(answered_questions)} used questions: {list(answered_questions)[:3]}..."
    )

    if not candidate_items:
        print(f"No questions available for topic '{topic_name}'")
        return None

    if phase == "coverage":
        # For coverage phase, prefer questions near current ability
        best_question = None
        min_difficulty_diff = float("inf")

        for item in candidate_items:
            difficulty_diff = abs(item.difficulty - theta)
            if difficulty_diff < min_difficulty_diff:
                min_difficulty_diff = difficulty_diff
                best_question = item.name

        print(
            f"Coverage phase: Selected question '{best_question}' with difficulty diff {min_difficulty_diff:.3f}"
        )
        return best_question

    else:  # adaptive phase
        # For adaptive phase, maximize information
        best_question = None
        max_info = -1

        for item in candidate_items:
            info_val = _calculate_question_information_from_params(
                theta,
                item.discrimination,
                item.difficulty,
                item.guessing_probability or 0.25,
                0.05,  # upper asymptote
            )

            if info_val > max_info:
                max_info = info_val
                best_question = item.name

        print(
            f"Adaptive phase: Selected question '{best_question}' with info {max_info:.3f}"
        )
        return best_question


def _calculate_question_information(question_id, theta):
    """
    Calculate Fisher information for a specific question
    """
    question = frappe.get_doc("Placement Question", question_id)
    return _calculate_question_information_from_params(
        theta,
        question.discrimination,
        question.difficulty,
        question.guessing_probability or 0.25,
        0.05,
    )


def _calculate_question_information_from_params(theta, a, b, c, d):
    """
    Calculate Fisher Information for 4PL IRT model
    """
    try:
        # 4PL model probability
        exp_term = np.exp(a * (theta - b))
        p = c + (d - c) * exp_term / (1 + exp_term)

        # First derivative
        dp_dtheta = a * (d - c) * exp_term / ((1 + exp_term) ** 2)

        # Fisher Information
        information = (dp_dtheta**2) / (p * (1 - p))

        return float(information) if not np.isnan(information) else 0.0
    except (ZeroDivisionError, OverflowError):
        return 0.0


def _get_question_topic(question_id):
    """
    Helper function to get topic of a question
    """
    return frappe.db.get_value("Placement Question", question_id, "topic")


def _estimate_ability_using_mle(responses, item_params, current_theta=0.0):
    """
    IMPROVED: More robust MLE estimation with better bounds and error handling
    """
    if not responses or item_params.size == 0:
        return current_theta, 1.0

    # Handle edge cases
    correct_count = sum(responses)
    total_count = len(responses)

    if correct_count == 0:
        # All wrong - set to minimum ability
        return -4.0, 0.8
    elif correct_count == total_count:
        # All correct - set to maximum ability
        return 4.0, 0.8

    try:
        # Multiple starting points for robustness
        best_theta = current_theta
        best_likelihood = float("inf")

        starting_points = [current_theta, 0.0, -1.0, 1.0]

        for start_theta in starting_points:
            try:
                res = minimize_scalar(
                    negative_log_likelihood,
                    args=(responses, item_params),
                    bounds=(-4.0, 4.0),
                    method="bounded",
                    options={"xatol": 1e-8, "maxiter": 100},
                )

                if res.success and res.fun < best_likelihood:
                    best_likelihood = res.fun
                    best_theta = res.x
            except:
                continue

        # Calculate standard error
        se = see(best_theta, item_params)
        se = max(0.1, min(2.0, se))  # Reasonable bounds for SE

        print(
            f"MLE: {correct_count}/{total_count} correct, theta={best_theta:.3f}, SE={se:.3f}"
        )

        return float(best_theta), float(se)

    except Exception as e:
        print(f"MLE error: {e}, falling back to simple estimation")
        # Fallback: simple logit transformation
        proportion_correct = correct_count / total_count
        # Avoid extreme values
        proportion_correct = max(0.01, min(0.99, proportion_correct))
        fallback_theta = np.log(proportion_correct / (1 - proportion_correct))
        return float(np.clip(fallback_theta, -3.0, 3.0)), 1.0


def _update_ability_with_catsim(session_name, topic):
    items = frappe.get_all(
        "Placement Question",
        filters={"topic": topic},
        fields=["name", "discrimination", "difficulty", "guessing_probability"],
    )
    if not items:
        return 0.0, 1.0

    name_idx = {}
    params = []
    for i, it in enumerate(items):
        name_idx[it.name] = i
        params.append(
            [
                it.discrimination,  # a: discrimination parameter
                it.difficulty,  # b: difficulty parameter
                it.guessing_probability
                or 0.25,  # c: guessing probability (lower asymptote)
                0.05,  # FIXED: d: upper asymptote (probability of careless error by high-ability person)
            ]
        )
    item_params = np.array(params)

    # FIXED: Get responses for this specific topic only
    logs = frappe.db.sql(
        """
        SELECT placement_question, is_correct 
        FROM `tabPlacement Answer Log` 
        WHERE placement_test_session = %s 
        AND placement_question IN (
            SELECT name FROM `tabPlacement Question` WHERE topic = %s
        )
        AND is_correct IS NOT NULL
        ORDER BY creation
        """,
        (session_name, topic),
        as_dict=True,
    )

    print(f"Topic '{topic}': Found {len(logs)} answers for ability estimation")

    responses, used = [], []
    for lg in logs:
        if lg["placement_question"] in name_idx:
            idx = name_idx[lg["placement_question"]]
            responses.append(bool(lg["is_correct"]))
            used.append(item_params[idx])
            print(f"  Question {lg['placement_question']}: {bool(lg['is_correct'])}")

    if not responses:
        return 0.0, 1.0

    print(f"Topic '{topic}': {sum(responses)}/{len(responses)} correct answers")
    return _estimate_ability_using_mle(responses, np.vstack(used))


def _check_termination(session):
    """
    IMPROVED: More sophisticated termination criteria
    """
    # Count actually answered questions
    total_answered = frappe.db.count(
        "Placement Answer Log",
        {
            "placement_test_session": session.name,
            "is_correct": ["is", "set"],
        },
    )

    # Hard limit
    if total_answered >= MAX_QUESTIONS_TOTAL:
        print(f"Terminating: Reached maximum questions ({total_answered})")
        return True

    # Check if we have minimum questions per topic
    topic_counts = {}
    answered_logs = frappe.get_all(
        "Placement Answer Log",
        filters={"placement_test_session": session.name, "is_correct": ["is", "set"]},
        fields=["placement_question"],
    )

    for log in answered_logs:
        topic = _get_question_topic(log.placement_question)
        topic_counts[topic] = topic_counts.get(topic, 0) + 1

    # Ensure minimum coverage
    min_questions_met = all(
        topic_counts.get(t.topic, 0) >= MIN_QUESTIONS_PER_TOPIC
        for t in session.topic_abilities
    )

    if not min_questions_met:
        print("Continuing: Minimum topic coverage not yet achieved")
        return False

    # Check precision criteria
    se_threshold_met = all(
        t.standard_error <= STANDARD_ERROR_THRESHOLD for t in session.topic_abilities
    )

    if se_threshold_met:
        print("Terminating: Standard error threshold met for all topics")
        return True

    # Minimum questions achieved, check if we should continue
    if total_answered >= len(session.topic_abilities) * MIN_QUESTIONS_PER_TOPIC + 5:
        # After minimum + buffer, use stricter SE criteria
        avg_se = np.mean([t.standard_error for t in session.topic_abilities])
        if avg_se <= STANDARD_ERROR_THRESHOLD * 1.2:
            print(
                f"Terminating: Average SE ({avg_se:.3f}) acceptable after {total_answered} questions"
            )
            return True

    print(f"Continuing: {total_answered} questions answered, SE criteria not met")
    return False


def _finalize_session_and_get_results(session):
    if session.status != "Completed":
        session.status = "Completed"
        session.end_time = frappe.utils.now_datetime()
        session.save(ignore_permissions=True)

    profile = frappe.get_doc("Student Knowledge Profile", session.student)
    profile.topic_mastery = []
    results = []

    for t in session.topic_abilities:
        logs = frappe.get_all(
            "Placement Answer Log",
            filters={
                "placement_test_session": session.name,
                "is_correct": ["is", "set"],
            },
            fields=["placement_question", "is_correct"],
        )
        topic_questions = frappe.get_all(
            "Placement Question", filters={"topic": t.topic}, fields=["name"]
        )
        topic_question_names = {q.name for q in topic_questions}
        topic_logs = [
            lg for lg in logs if lg["placement_question"] in topic_question_names
        ]
        num_answered = len(topic_logs)
        num_correct = sum(1 for lg in topic_logs if lg["is_correct"])
        correct_ratio = float(num_correct) / num_answered if num_answered > 0 else None

        if t.questions_answered == 0:
            mw = 0
        else:
            mw = _convert_theta_to_mastery(
                t.ability_estimate,
                topic=t.topic,
                questions_answered=t.questions_answered,
                num_correct=num_correct,
                num_total=num_answered,
            )

        profile.append(
            "topic_mastery",
            {"topic": t.topic, "mastery_weight": mw},
        )

        # === THAY ĐỔI: Lấy topic_name từ DocType Topics ===
        topic_name = frappe.db.get_value("Topics", t.topic, "topic_name") or t.topic
        results.append(
            {
                "topic": topic_name,  # Gửi topic_name
                "ability_estimate": t.ability_estimate,
                "standard_error": t.standard_error,
                "mastery_weight": mw,
                "num_answered": num_answered,
                "num_correct": num_correct,
                "correct_ratio": correct_ratio,
            }
        )

    # Set flag to skip the mastery hook during Topic Mastery operations
    profile._skip_mastery_hook = True
    profile.save(ignore_permissions=True)
    frappe.db.commit()

    return {"status": "completed", "session_id": session.name, "results": results}


def _format_question_for_frontend(question_id):
    q = frappe.get_doc("Placement Question", question_id)
    # Lấy topic_name thay vì description
    topic_name = frappe.db.get_value("Topics", q.topic, "topic_name") or q.topic

    opts = [{"text": o.option_text} for o in q.options]
    random.shuffle(opts)
    correct_answer = next((o.option_text for o in q.options if o.is_correct), None)

    return {
        "id": q.name,
        "text": q.content,
        "options": opts,
        "correct_answer": correct_answer,
        "difficulty": q.difficulty,  # Thêm độ khó
        "topic_name": topic_name,  # Thêm topic_name
    }


def _convert_theta_to_mastery(
    theta, topic=None, questions_answered=None, num_correct=None, num_total=None
):
    """
    Advanced theta to mastery conversion that better reflects ability differences
    Uses sigmoid transformation with topic-specific adjustments
    """
    print(
        f"Converting theta {theta:.3f} for topic '{topic}' ({questions_answered} questions) to mastery"
    )

    # Clamp theta to reasonable bounds
    theta_clamped = max(-4.0, min(4.0, theta))

    # Sigmoid transformation for more nuanced ability representation
    # This creates a curve that's more sensitive to differences around average ability
    sigmoid_value = 1 / (
        1 + np.exp(-1.5 * theta_clamped)
    )  # Steeper curve for better differentiation

    # Base mastery from sigmoid (0 to 800)
    base_mastery = sigmoid_value * 800

    # Topic difficulty adjustment - get average difficulty of questions in topic
    topic_difficulty_adjustment = 0
    if topic and questions_answered and questions_answered > 0:
        try:
            # Get average difficulty of all questions in this topic
            avg_topic_difficulty = (
                frappe.db.sql(
                    """
                SELECT AVG(difficulty) as avg_diff 
                FROM `tabPlacement Question` 
                WHERE topic = %s
                """,
                    (topic,),
                    as_dict=True,
                )[0].avg_diff
                or 0.0
            )

            # Adjust based on topic difficulty
            # Higher difficulty topics get bonus points (more challenging = more mastery)
            # Lower difficulty topics get slight reduction (easier = less mastery demonstration)
            topic_difficulty_adjustment = (
                avg_topic_difficulty * 30
            )  # Scale factor - positive for harder topics

        except Exception as e:
            print(f"Could not get topic difficulty adjustment: {e}")

    # Confidence adjustment based on number of questions answered
    confidence_multiplier = 1.0
    if questions_answered:
        if questions_answered < 3:
            confidence_multiplier = 0.8  # Less confident with fewer questions
        elif questions_answered >= 5:
            confidence_multiplier = 1.1  # More confident with more questions

    # Performance consistency bonus/penalty
    performance_adjustment = 0
    if num_correct is not None and num_total is not None and num_total > 0:
        accuracy = num_correct / num_total
        # Reward consistent high performance, penalize inconsistent performance
        if accuracy >= 0.8:
            performance_adjustment = 20  # Bonus for high accuracy
        elif accuracy <= 0.2:
            performance_adjustment = -30  # Penalty for very low accuracy
        elif accuracy == 0.0:
            performance_adjustment = -50  # Extra penalty for zero accuracy

    # Special case: if theta is at minimum (-4.0), ensure very low mastery
    if theta_clamped <= -3.9:  # Close to minimum theta
        # Override with very low base mastery for terrible performance
        base_mastery = max(0, sigmoid_value * 50)  # Cap base at 50 instead of 1000
        performance_adjustment = min(performance_adjustment, -20)  # Ensure penalty

    # Final mastery calculation
    final_mastery = (
        base_mastery + topic_difficulty_adjustment + performance_adjustment
    ) * confidence_multiplier

    # Ensure it's in valid range (max 800)
    mastery = max(0, min(800, int(round(final_mastery))))

    print(
        f"Theta {theta:.3f} -> Sigmoid: {sigmoid_value:.3f} -> Base: {base_mastery:.1f} -> "
        f"Topic adj: {topic_difficulty_adjustment:.1f} -> Perf adj: {performance_adjustment:.1f} -> "
        f"Confidence: {confidence_multiplier:.2f} -> Final mastery: {mastery}"
    )

    return mastery
