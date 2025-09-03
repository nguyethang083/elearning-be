import os
import requests
import frappe
import json
from frappe.model.document import Document
from frappe.utils import now, get_datetime, time_diff_in_seconds
from elearning.elearning.doctype.test.test import get_test_data
from elearning.elearning.doctype.test.analysis_processor import (
    update_mastery_after_test,
)
from frappe import _
import re
from elearning.elearning.utils.gemini_grader_service import (
    grade_essay_with_gemini,
    call_gemini_api_with_tracking,
)
import logging
import base64

logger = logging.getLogger(__name__)


def get_current_user():
    user = frappe.session.user
    if user == "Guest":
        frappe.throw(_("Authentication required."), frappe.AuthenticationError)
    return user


class TestAttempt(Document):
    pass


@frappe.whitelist()
def get_test_attempt_status(test_id=None):
    test_id = frappe.request.args.get("test_id")
    user = get_current_user()
    latest_attempt = frappe.get_list(
        "Test Attempt",
        filters={"test": test_id, "user": user},
        fields=["name", "status"],
        order_by="start_time desc",
        limit=1,
    )
    if not latest_attempt:
        return {"status": "not_started"}
    else:
        status = latest_attempt[0].status
        valid_statuses = ["In Progress", "Completed", "To be graded", "Graded"]
        if status not in valid_statuses:
            frappe.logger(__name__).warning(
                f"Unexpected status '{status}' found for attempt {latest_attempt[0].name}"
            )
            return {"status": "Completed"}
        return {"status": status}


@frappe.whitelist()
def start_or_resume_test_attempt(test_id=None):
    test_id = frappe.request.args.get("test_id")

    if not test_id:
        test_id = frappe.request.args.get("test_id")

    if not test_id:
        frappe.throw(_("Test ID is required"))

    user = get_current_user()
    logger = frappe.logger("start_or_resume_test_attempt")

    if not frappe.db.exists("Test", test_id):
        logger.error(f"Test {test_id} not found for user {user}.")
        frappe.throw(_("Test {0} not found").format(test_id), frappe.DoesNotExistError)

    test_doc_meta = frappe.get_cached_value(
        "Test",
        test_id,
        ["is_active", "title", "time_limit_minutes", "instructions"],
        as_dict=True,
    )
    if not test_doc_meta:
        logger.error(f"Could not retrieve metadata for Test {test_id}.")
        frappe.throw(_("Test {0} not found").format(test_id), frappe.DoesNotExistError)
    if not test_doc_meta.is_active:
        logger.warning(f"Attempt to start inactive Test {test_id} by user {user}.")
        frappe.throw(
            _("Test {0} is not active.").format(test_id), frappe.ValidationError
        )

    existing_attempt = frappe.get_list(
        "Test Attempt",
        filters={"test": test_id, "user": user, "status": "In Progress"},
        fields=["name", "start_time", "remaining_time_seconds", "last_viewed_question"],
        limit=1,
    )

    attempt_doc = None
    if existing_attempt:
        attempt_id = existing_attempt[0].name
        attempt_doc = frappe.get_doc("Test Attempt", attempt_id)
        logger.info(f"Resuming attempt {attempt_id} for test {test_id}, user {user}")
    else:
        logger.info(f"Starting new attempt for test {test_id}, user {user}")
        attempt_doc = frappe.new_doc("Test Attempt")
        attempt_doc.test = test_id
        attempt_doc.user = user
        attempt_doc.status = "In Progress"
        attempt_doc.start_time = now()
        if test_doc_meta.time_limit_minutes and test_doc_meta.time_limit_minutes > 0:
            attempt_doc.remaining_time_seconds = test_doc_meta.time_limit_minutes * 60

        try:
            attempt_doc.insert(ignore_permissions=True)
            frappe.db.commit()
            attempt_id = attempt_doc.name
            logger.info(
                f"New Test Attempt {attempt_id} created for Test {test_id}, user {user}."
            )
        except Exception as e:
            frappe.db.rollback()
            logger.error(
                f"Failed to create new Test Attempt for test {test_id}, user {user}. Error: {e}",
                exc_info=True,
            )
            frappe.throw(_("Could not start the test attempt. Please try again."))

    test_data_for_taking = get_test_data(test_id)

    saved_answers_dict = {}
    if attempt_doc and attempt_doc.get("answers"):
        for answer_detail in attempt_doc.answers:
            # In 'Attempt Answer Item', 'question' field stores the base Question.name
            # 'test_question_item' field stores the Test Question Item.name (e.g. r0bv2trdu1)
            # We need to use the value in 'test_question_item' as the key for saved_answers_dict
            # if it's populated.
            key_for_saved_answers = getattr(answer_detail, "test_question_item", None)
            if key_for_saved_answers:
                saved_answers_dict[key_for_saved_answers] = {
                    "userAnswer": answer_detail.user_answer,
                    "timeSpentSeconds": getattr(answer_detail, "time_spent_seconds", 0),
                }
            else:
                # Fallback or logging if test_question_item is not set in saved answer
                logger.warning(
                    f"Saved answer item {answer_detail.name} in attempt {attempt_doc.name} is missing 'test_question_item' link."
                )

    time_elapsed_seconds = 0
    if existing_attempt and attempt_doc.start_time:  # ensure start_time is not None
        time_elapsed_seconds = time_diff_in_seconds(
            now(), get_datetime(attempt_doc.start_time)
        )

    # Parse marked for review questions
    marked_for_review_dict = {}
    if (
        attempt_doc
        and hasattr(attempt_doc, "marked_for_review_questions")
        and attempt_doc.marked_for_review_questions
    ):
        try:
            import json

            marked_for_review_list = json.loads(attempt_doc.marked_for_review_questions)
            if isinstance(marked_for_review_list, list):
                marked_for_review_dict = {q_id: True for q_id in marked_for_review_list}
        except (json.JSONDecodeError, TypeError) as e:
            logger.warning(
                f"Failed to parse marked_for_review_questions for attempt {attempt_doc.name}: {e}"
            )

    return {
        "attempt": {
            "id": attempt_doc.name,
            "status": attempt_doc.status,
            "start_time": attempt_doc.start_time,
            "remaining_time_seconds": attempt_doc.remaining_time_seconds,
            "last_viewed_question_id": attempt_doc.last_viewed_question,
        },
        "test": {
            "id": test_id,
            "title": test_doc_meta.title,
            "time_limit_minutes": test_doc_meta.time_limit_minutes,
            "instructions": test_doc_meta.instructions,
        },
        "questions": test_data_for_taking.get("questions", []),
        "saved_answers": saved_answers_dict,  # Keyed by test_question_item.name (e.g. r0bv2trdu1)
        "marked_for_review": marked_for_review_dict,  # New field for marked for review questions
        "time_elapsed_seconds": time_elapsed_seconds,
    }


@frappe.whitelist(allow_guest=True)
def submit_test_attempt():
    submit_logger = frappe.logger("submit_test_attempt")

    attempt_id = frappe.form_dict.get("attempt_id")
    submission_data = frappe.form_dict.get("submission_data")

    print(
        f"Initial read from form_dict - attempt_id: {attempt_id}, submission_data exists: {bool(submission_data)}"
    )

    if not attempt_id or not submission_data:
        print("Data not found in form_dict, parsing raw request body as fallback.")
        try:
            # Dùng frappe.request.data, cách mà chúng ta vừa xác minh là có dữ liệu.
            raw_body = frappe.request.data
            if raw_body:
                request_json = json.loads(raw_body.decode("utf-8"))
                # Chỉ ghi đè các biến nếu chúng còn thiếu.
                if not attempt_id:
                    attempt_id = request_json.get("attempt_id")
                if not submission_data:
                    submission_data = request_json.get("submission_data")
        except Exception as e:
            submit_logger.error(f"Error parsing JSON body fallback: {e}", exc_info=True)

    if not attempt_id or not submission_data:
        frappe.throw(
            _(
                "Required parameters 'attempt_id' or 'submission_data' could not be found in the request."
            ),
            frappe.ValidationError,
        )

    user = get_current_user()
    submit_logger.info(
        f"Successfully retrieved data for attempt_id: {attempt_id}. Proceeding with submission."
    )

    try:
        # Bây giờ, submission_data chắc chắn có giá trị và là một chuỗi JSON
        submission_data_dict = json.loads(submission_data)
        answers_input = submission_data_dict.get("answers", {})
        time_left = submission_data_dict.get("timeLeft")
        last_viewed_test_q_detail_id = submission_data_dict.get(
            "lastViewedTestQuestionId"
        )
        marked_for_review_input = submission_data_dict.get(
            "markedForReview", {}
        )  # New: marked for review questions
    except Exception as e:
        submit_logger.error(
            f"Error parsing nested submission_data string for attempt {attempt_id}. Error: {e}",
            exc_info=True,
        )
        frappe.throw(
            _("Could not parse nested submission data."), frappe.ValidationError
        )

    attempt_doc = frappe.get_doc("Test Attempt", attempt_id)

    if attempt_doc.user != user:
        frappe.throw(
            _("You are not permitted to submit this attempt."), frappe.PermissionError
        )
    if attempt_doc.status != "In Progress":
        frappe.throw(
            _("This attempt cannot be submitted (Status: {0}).").format(
                attempt_doc.status
            ),
            frappe.ValidationError,
        )

    test_doc = frappe.get_doc("Test", attempt_doc.test)
    test_q_details_map = {
        tqd.name: {"question": tqd.question, "points": tqd.points}
        for tqd in test_doc.questions
    }

    total_score = 0
    total_possible_score = 0
    attempt_doc.answers = []

    any_essay_needs_manual_review = False
    ai_grading_results_map = {}

    for test_q_item_id, answer_data_from_frontend in answers_input.items():
        user_answer_text = answer_data_from_frontend.get("userAnswer")
        time_spent = answer_data_from_frontend.get("timeSpent")
        base64_images_data = answer_data_from_frontend.get("base64_images", [])

        try:
            q_link = frappe.get_doc(
                "Test Question Item", test_q_item_id
            ).question  # name of Question
        except frappe.DoesNotExistError:
            submit_logger.warning(f"Skipping answer for unknown TQI {test_q_item_id}")
            continue

        q_doc = frappe.get_doc("Question", q_link)
        point_value = getattr(q_doc, "marks", 1) or 1
        total_possible_score += point_value

        final_answer_item_data = {
            "doctype": "Attempt Answer Item",
            "question": q_link,  # Link to Question
            "test_question_item": test_q_item_id,
            "user_answer": (
                str(user_answer_text) if user_answer_text is not None else None
            ),
            "submitted_at": now(),
            "time_spent_seconds": time_spent,
            "is_correct": None,
            "points_awarded": 0,
        }

        try:
            # We still need q_doc to know its type for current processing, even if not saving it to AAI
            q_doc = frappe.get_doc("Question", q_link)
            current_question_type = q_doc.question_type  # Get type for logic below
            print("DEBUG: current_question_type:", current_question_type)
            if current_question_type == "Multiple Choice":
                correct_opt = next(
                    (o.name for o in q_doc.options if o.is_correct), None
                )
                if (
                    user_answer_text
                    and correct_opt
                    and str(user_answer_text).strip() == correct_opt.strip()
                ):
                    final_answer_item_data["is_correct"] = True
                    final_answer_item_data["points_awarded"] = point_value
                else:
                    final_answer_item_data["is_correct"] = False

            elif current_question_type == "Essay":
                final_answer_item_data["answer_images"] = []
                file_doc_names_for_gemini = []
                for img_idx, img_data_obj in enumerate(base64_images_data):
                    try:
                        base64_str = img_data_obj.get("data")
                        original_filename = img_data_obj.get(
                            "filename", f"image_{test_q_item_id}_{img_idx + 1}.png"
                        )
                        if not base64_str:
                            submit_logger.warning(
                                f"    Empty Base64 data for file {original_filename}. Skipping."
                            )
                            continue
                        image_bytes = base64.b64decode(base64_str)
                        file_doc = frappe.get_doc(
                            {
                                "doctype": "File",
                                "file_name": original_filename,
                                "is_private": 1,
                                "content": image_bytes,
                                "attached_to_doctype": "Test Attempt",
                                "attached_to_name": attempt_doc.name,
                            }
                        )
                        file_doc.insert(ignore_permissions=True)
                        file_doc_names_for_gemini.append(file_doc.name)
                        final_answer_item_data["answer_images"].append(
                            {"doctype": "Answer Image", "image": file_doc.file_url}
                        )
                    except Exception as e_b64_file:
                        submit_logger.error(
                            f"    Error processing Base64 image '{original_filename}': {e_b64_file}",
                            exc_info=True,
                        )
                print("DEBUG: before item retrieval")
                rubric_items_raw = frappe.get_all(
                    "Rubric Item",
                    filters={"question": q_doc.name},
                    fields=["name", "description", "max_score", "step_order"],
                    order_by="step_order asc",
                )
                print("DEBUG: rubric_items_raw:", rubric_items_raw)
                rubric_for_ai = [
                    {
                        "id": ri.name,
                        "description": ri.description,
                        "max_score": ri.max_score,
                        "step_order": ri.step_order,
                    }
                    for ri in rubric_items_raw
                ]

                if not rubric_for_ai:
                    final_answer_item_data["ai_feedback"] = (
                        "Không có thang điểm (rubric) cho câu hỏi này. Cần chấm thủ công."
                    )
                    final_answer_item_data["points_awarded"] = 0
                    any_essay_needs_manual_review = True
                else:
                    ai_grading_result = grade_essay_with_gemini(
                        question_doc_content=q_doc.content,
                        question_name_for_log=f"{q_doc.name} (Attempt: {attempt_id})",
                        rubric_items=rubric_for_ai,
                        file_doc_names=file_doc_names_for_gemini,
                        student_answer_text=user_answer_text,
                        user_id=user,  # Add user for token tracking
                    )

                    print(
                        f"AI Grading Result for TQI {test_q_item_id}: {ai_grading_result}"
                    )

                    ai_grading_results_map[test_q_item_id] = {
                        "result": ai_grading_result,
                        "question_link_name": q_link,
                    }

                    if ai_grading_result and not ai_grading_result.get("error"):
                        final_answer_item_data["ai_score"] = ai_grading_result.get(
                            "total_score_awarded"
                        )
                        final_answer_item_data["ai_feedback"] = ai_grading_result.get(
                            "overall_feedback"
                        )
                        final_answer_item_data["points_awarded"] = (
                            ai_grading_result.get("total_score_awarded", 0)
                        )

                        if (
                            final_answer_item_data.get("ai_feedback")
                            == "Không có nội dung bài làm được nộp (cả văn bản và hình ảnh)."
                        ):
                            # Nếu không có bài làm, không cần manual review, auto 0 điểm
                            final_answer_item_data["ai_rubric_scores"] = []
                        elif final_answer_item_data.get("points_awarded", 0) == 0 and (
                            "error"
                            in (final_answer_item_data.get("ai_feedback") or "").lower()
                            or "lỗi"
                            in (final_answer_item_data.get("ai_feedback") or "").lower()
                        ):
                            any_essay_needs_manual_review = False
                    else:
                        feedback_from_ai_service = (
                            "Lỗi trong quá trình chấm điểm bằng AI. Cần chấm thủ công."
                        )
                        if ai_grading_result and ai_grading_result.get(
                            "overall_feedback"
                        ):
                            feedback_from_ai_service = ai_grading_result.get(
                                "overall_feedback"
                            )
                        final_answer_item_data["ai_feedback"] = feedback_from_ai_service
                        final_answer_item_data["points_awarded"] = 0
                        any_essay_needs_manual_review = True

            attempt_doc.append("answers", final_answer_item_data)
            total_score += final_answer_item_data.get("points_awarded", 0)

        except frappe.DoesNotExistError:
            submit_logger.error(
                f"Base Question {q_link} not found (TestQ ID: {test_q_item_id}, Attempt: {attempt_id})"
            )
            error_answer_data = final_answer_item_data.copy()
            error_answer_data.update(
                {
                    "ai_feedback": "Lỗi: Không tìm thấy câu hỏi gốc trong hệ thống.",
                    "points_awarded": 0,
                }
            )
            attempt_doc.append("answers", error_answer_data)
        except Exception as e_ans_proc:
            submit_logger.error(
                f"Error processing answer for Q {q_link} (TestQ ID: {test_q_item_id}, Attempt: {attempt_id}): {e_ans_proc}",
                exc_info=True,
            )
            error_answer_data = final_answer_item_data.copy()
            error_answer_data.update(
                {
                    "ai_feedback": f"Lỗi hệ thống khi xử lý câu trả lời này: {e_ans_proc}",
                    "points_awarded": 0,
                }
            )
            attempt_doc.append("answers", error_answer_data)

    attempt_doc.final_score = total_score
    # Nếu tất cả answers là essay và đều có ai_feedback là "Không có nội dung bài làm..." thì set Graded và 0 điểm
    all_essay_and_no_content = True
    for ans_data in attempt_doc.answers:
        q_type = None
        if ans_data.question:
            try:
                q_type = frappe.get_value(
                    "Question", ans_data.question, "question_type"
                )
            except Exception:
                pass
        ai_feedback = getattr(ans_data, "ai_feedback", None)
        if (
            q_type != "Essay"
            or ai_feedback
            != "Không có nội dung bài làm được nộp (cả văn bản và hình ảnh)."
        ):
            all_essay_and_no_content = False
            break

    if all_essay_and_no_content and len(attempt_doc.answers) > 0:
        attempt_doc.final_score = 0
        attempt_doc.status = "Graded"
    elif any_essay_needs_manual_review:
        attempt_doc.status = "To be graded"
    else:
        # To check if there are essays, we now need to fetch the question type for each answer
        has_essays_in_attempt = False
        for ans_data in attempt_doc.answers:
            if ans_data.question:
                try:
                    q_type = frappe.get_value(
                        "Question", ans_data.question, "question_type"
                    )
                    if q_type == "Essay":
                        has_essays_in_attempt = True
                        break
                except Exception:
                    pass
        if has_essays_in_attempt:
            attempt_doc.status = "Graded"
        else:
            attempt_doc.status = "Completed"

    attempt_doc.end_time = now()
    attempt_doc.remaining_time_seconds = time_left if time_left is not None else 0
    if (
        last_viewed_test_q_detail_id
        and last_viewed_test_q_detail_id in test_q_details_map
    ):
        attempt_doc.last_viewed_question = test_q_details_map[
            last_viewed_test_q_detail_id
        ]["question"]
    else:
        attempt_doc.last_viewed_question = None

    attempt_doc.is_passed = False
    if total_possible_score > 0 and test_doc.passing_score is not None:
        score_percentage = (total_score / total_possible_score) * 100
        if score_percentage >= test_doc.passing_score:
            attempt_doc.is_passed = True
    elif test_doc.passing_score == 0:
        attempt_doc.is_passed = True

    # Handle marked for review questions
    if marked_for_review_input:
        marked_for_review_list = [
            q_id for q_id, is_marked in marked_for_review_input.items() if is_marked
        ]
        attempt_doc.marked_for_review_questions = json.dumps(marked_for_review_list)
        submit_logger.info(
            f"Saved marked for review questions for attempt {attempt_doc.name}: {marked_for_review_list}"
        )

    try:
        attempt_doc.save(ignore_permissions=True)
        frappe.db.commit()
        submit_logger.info(
            f"Test Attempt {attempt_doc.name} and its AttemptAnswerItems (with images) saved successfully."
        )
    except Exception as e_save_attempt:
        submit_logger.error(
            f"Error saving Test Attempt {attempt_doc.name}: {e_save_attempt}",
            exc_info=True,
        )
        frappe.throw(
            _("Error saving test attempt. Please try again."), frappe.ValidationError
        )

    saved_attempt_doc = frappe.get_doc("Test Attempt", attempt_doc.name)

    for ans_item_reloaded in saved_attempt_doc.answers:
        # ---- MODIFICATION START ----
        # Get question_type from the linked Question document
        current_ans_question_type = None
        if ans_item_reloaded.question:  # Check if the 'question' link field is set
            try:
                current_ans_question_type = frappe.get_value(
                    "Question", ans_item_reloaded.question, "question_type"
                )
            except frappe.DoesNotExistError:
                submit_logger.warning(
                    f"Linked Question {ans_item_reloaded.question} not found for AAI {ans_item_reloaded.name} during Rubric Score creation."
                )
            except Exception as e_get_q_type:
                submit_logger.error(
                    f"Error fetching question_type for AAI {ans_item_reloaded.name}, Question {ans_item_reloaded.question}: {e_get_q_type}"
                )

        if current_ans_question_type == "Essay":
            # ---- MODIFICATION END ----
            ai_grading_data = ai_grading_results_map.get(
                ans_item_reloaded.test_question_item
            )

            if (
                ai_grading_data
                and ai_grading_data.get("result")
                and not ai_grading_data["result"].get("error")
            ):
                rubric_scores_from_ai = ai_grading_data["result"].get(
                    "rubric_scores", []
                )
                if rubric_scores_from_ai:
                    submit_logger.info(
                        f"Creating standalone Rubric Score Items for AAI: {ans_item_reloaded.name}"
                    )
                    for scored_rubric_item_from_ai in rubric_scores_from_ai:
                        rubric_item_id_from_ai = scored_rubric_item_from_ai.get(
                            "rubric_item_id"
                        )
                        points_awarded_from_ai = scored_rubric_item_from_ai.get(
                            "points_awarded"
                        )
                        comment_from_ai = scored_rubric_item_from_ai.get("comment")

                        if not rubric_item_id_from_ai:
                            submit_logger.warning(
                                f"  Skipping standalone RSI for AAI {ans_item_reloaded.name} due to missing 'rubric_item_id'"
                            )
                            continue
                        if not frappe.db.exists("Rubric Item", rubric_item_id_from_ai):
                            submit_logger.warning(
                                f"  Skipping standalone RSI for AAI {ans_item_reloaded.name}: Base Rubric Item ID '{rubric_item_id_from_ai}' does not exist."
                            )
                            continue

                        try:
                            rsi_doc = frappe.new_doc("Rubric Score Item")
                            rsi_doc.set(
                                "attempt_answer_item_link", ans_item_reloaded.name
                            )
                            rsi_doc.rubric_item = rubric_item_id_from_ai
                            rsi_doc.points_awarded = points_awarded_from_ai
                            rsi_doc.comment = comment_from_ai
                            rsi_doc.insert(ignore_permissions=True)
                            submit_logger.info(
                                f"    Created standalone Rubric Score Item: {rsi_doc.name} for AAI {ans_item_reloaded.name}"
                            )
                        except Exception as e_rsi_create:
                            submit_logger.error(
                                f"    Error creating standalone Rubric Score Item for AAI {ans_item_reloaded.name}: {e_rsi_create}",
                                exc_info=True,
                            )
                    frappe.db.commit()
                else:
                    submit_logger.info(
                        f"  No rubric scores from AI to create for AAI: {ans_item_reloaded.name}"
                    )
            elif (
                ai_grading_data
                and ai_grading_data.get("result")
                and ai_grading_data["result"].get("error")
            ):
                submit_logger.warning(
                    f"  AI grading returned an error for AAI: {ans_item_reloaded.name}. No standalone Rubric Score Items will be created. AI Feedback: {ai_grading_data['result'].get('overall_feedback')}"
                )
            # else: # No AI result found for this test_question_item, or question_link_name mismatch
            # submit_logger.info(f"No AI grading result found for AAI {ans_item_reloaded.name} with TQI {ans_item_reloaded.test_question_item} to create RubricScoreItems.")

    final_saved_attempt_doc = frappe.get_doc("Test Attempt", attempt_doc.name)
    if final_saved_attempt_doc.answers:
        # print("--- Child 'answers' details AFTER ALL SAVES & RELOAD ---")
        for i, ans_doc_reloaded in enumerate(final_saved_attempt_doc.answers):
            # print(f"  Reloaded Answer Item {i} - Name: {ans_doc_reloaded.name}, Doctype: {ans_doc_reloaded.doctype}:")

            answer_images_reloaded = getattr(ans_doc_reloaded, "answer_images", None)
            if answer_images_reloaded and len(answer_images_reloaded) > 0:
                print(
                    f"    It HAS reloaded answer_images with {len(answer_images_reloaded)} entries."
                )
                # for k, img_doc_reloaded in enumerate(answer_images_reloaded): # Not needed if just confirming count
                #     print(f"      Reloaded Answer Image Entry {k} (Doc): {json.dumps(img_doc_reloaded.as_dict(), default=str)}")
            else:
                print(
                    f"    Reloaded answer_images is MISSING or empty on {ans_doc_reloaded.name}."
                )

    if (
        final_saved_attempt_doc.status == "Graded"
        or final_saved_attempt_doc.status == "Completed"
    ):
        generate_and_save_feedback_with_llm(final_saved_attempt_doc)  # type: ignore

    # Update mastery weight after test submission
    if final_saved_attempt_doc.status in ["Completed", "Graded"]:
        update_mastery_after_test(final_saved_attempt_doc)

    return {
        "status": final_saved_attempt_doc.status,
        "score": final_saved_attempt_doc.final_score,
        "passed": final_saved_attempt_doc.is_passed,
        "attemptId": final_saved_attempt_doc.name,
    }


@frappe.whitelist(methods=["PATCH"])
def save_attempt_progress(attempt_id=None, progress_data=None):
    logger = frappe.logger("save_attempt_progress")

    if not attempt_id:
        attempt_id = frappe.form_dict.get("attempt_id")
    if not progress_data:
        progress_data = frappe.form_dict.get("progress_data")

    logger.info(
        f"Initial read from form_dict - attempt_id: {attempt_id}, progress_data exists: {bool(progress_data)}"
    )

    if not attempt_id or not progress_data:
        logger.info(
            "Data not found in form_dict, parsing raw request body as fallback."
        )
        try:
            raw_body = frappe.request.data
            if raw_body:
                request_json = json.loads(raw_body.decode("utf-8"))
                if not attempt_id:
                    attempt_id = request_json.get("attempt_id")
                if not progress_data:
                    # Nếu progress_data từ frontend là một object, ta cần chuyển nó lại thành chuỗi JSON
                    # để logic json.loads(progress_data) ở dưới hoạt động.
                    progress_data_obj = request_json.get("progress_data")
                    if progress_data_obj:
                        progress_data = json.dumps(progress_data_obj)
        except Exception as e:
            logger.error(f"Error parsing JSON body fallback: {e}", exc_info=True)

    if not attempt_id or not progress_data:
        frappe.throw(
            _("Required parameters 'attempt_id' or 'progress_data' are missing."),
            frappe.ValidationError,
        )

    user = get_current_user()  # Add this line

    try:
        progress_data_dict = json.loads(progress_data)
        answers_input = progress_data_dict.get(
            "answers", {}
        )  # keys are test_question_detail_id
        remaining_time = progress_data_dict.get("remainingTimeSeconds")
        last_viewed_test_q_detail_id = progress_data_dict.get(
            "lastViewedTestQuestionId"
        )  # This is Test Question Item ID
        marked_for_review_input = progress_data_dict.get(
            "markedForReview", {}
        )  # New: marked for review questions
    except json.JSONDecodeError:
        logger.error(
            f"Invalid progress_data JSON for attempt {attempt_id}.", exc_info=True
        )
        frappe.throw(_("Invalid progress data format."), frappe.ValidationError)
    except Exception as e:
        logger.error(
            f"Could not parse progress_data for attempt {attempt_id}. Error: {e}",
            exc_info=True,
        )
        frappe.throw(_("Could not parse progress data."), frappe.ValidationError)

    try:
        attempt_doc = frappe.get_doc("Test Attempt", attempt_id)
    except frappe.DoesNotExistError:
        logger.error(f"Test Attempt {attempt_id} not found during save progress.")
        frappe.throw(
            _("Test Attempt {0} not found.").format(attempt_id),
            frappe.DoesNotExistError,
        )

    if attempt_doc.user != user:
        logger.warning(
            f"User {user} tried to save progress for attempt {attempt_id} owned by {attempt_doc.user}."
        )
        frappe.throw(
            _("You are not permitted to save progress for this attempt."),
            frappe.PermissionError,
        )
    if attempt_doc.status != "In Progress":
        logger.warning(
            f"Attempt to save progress for Test Attempt {attempt_id} which is not 'In Progress' (Status: {attempt_doc.status})."
        )
        frappe.throw(
            _("Cannot save progress. Status is {0}.").format(attempt_doc.status),
            frappe.ValidationError,
        )

    attempt_doc.remaining_time_seconds = remaining_time

    if last_viewed_test_q_detail_id:
        base_question_name = frappe.db.get_value(
            "Test Question Item", last_viewed_test_q_detail_id, "question"
        )
        if base_question_name:
            attempt_doc.last_viewed_question = (
                base_question_name  # Stores the base Question.name
            )
        else:
            attempt_doc.last_viewed_question = None
            logger.warning(
                f"Could not find base Question for Test Question Item {last_viewed_test_q_detail_id} during save progress for attempt {attempt_id}."
            )
    else:
        attempt_doc.last_viewed_question = None

    if answers_input:
        existing_answers_map = {
            ans.test_question_item: ans
            for ans in attempt_doc.answers
            if getattr(ans, "test_question_item", None)
        }
        logger.debug(
            f"SaveProgress: Existing answers map keys for attempt {attempt_id}: {list(existing_answers_map.keys())}"
        )

        for (
            test_q_item_id,
            answer_data,
        ) in answers_input.items():  # test_q_item_id is Test Question Item ID
            user_answer = answer_data.get("userAnswer")

            # Get the base question name (Question.name) from the Test Question Item ID
            base_question_name = frappe.db.get_value(
                "Test Question Item", test_q_item_id, "question"
            )

            if not base_question_name:
                logger.warning(
                    f"Skipping save progress for unknown Test Question Item ID {test_q_item_id} in attempt {attempt_id} (base question not found)."
                )
                continue

            if test_q_item_id in existing_answers_map:
                answer_row = existing_answers_map[test_q_item_id]
                answer_row.user_answer = (
                    str(user_answer) if user_answer is not None else None
                )
                answer_row.submitted_at = now()
                # Ensure grading fields are NOT set here during progress save
                answer_row.is_correct = None
                answer_row.points_awarded = None
                logger.debug(
                    f"SaveProgress: Updated answer for Test Question Item {test_q_item_id} in attempt {attempt_id}."
                )
            else:
                attempt_doc.append(
                    "answers",
                    {
                        "question": base_question_name,  # Base Question.name
                        "test_question_item": test_q_item_id,
                        "user_answer": (
                            str(user_answer) if user_answer is not None else None
                        ),
                        "submitted_at": now(),
                        "is_correct": None,
                        "points_awarded": None,
                        # 'time_spent_seconds' is usually only sent on final submit, not progress save.
                        # If you do send it with progress_data, you can add it here.
                    },
                )
                logger.debug(
                    f"SaveProgress: Appended new answer for Test Question Item {test_q_item_id} in attempt {attempt_id}."
                )

    # Handle marked for review questions
    if marked_for_review_input:
        marked_for_review_list = [
            q_id for q_id, is_marked in marked_for_review_input.items() if is_marked
        ]
        attempt_doc.marked_for_review_questions = json.dumps(marked_for_review_list)
        logger.debug(
            f"SaveProgress: Updated marked for review questions for attempt {attempt_id}: {marked_for_review_list}"
        )

    try:
        attempt_doc.save(ignore_permissions=True)
        frappe.db.commit()
        logger.info(f"Progress saved for Test Attempt {attempt_id}.")
        return {"success": True}
    except Exception as e:
        frappe.db.rollback()
        logger.error(
            f"Failed to save progress for Test Attempt {attempt_id}: {e}", exc_info=True
        )
        frappe.throw(_("Could not save progress. Please try again."))


@frappe.whitelist()
def get_user_attempts_for_test(test_id=None):
    test_id = frappe.request.args.get("test_id")
    user = get_current_user()

    attempts = frappe.get_list(
        "Test Attempt",
        filters={"test": test_id, "user": user},
        fields=[
            "name as id",
            "status",
            "final_score",
            "is_passed",
            "start_time",
            "end_time",
        ],
        order_by="start_time desc",
    )

    for attempt in attempts:
        attempt["time_taken_seconds"] = None
        if attempt.start_time and attempt.end_time:
            start = get_datetime(attempt.start_time)
            end = get_datetime(attempt.end_time)
            attempt["time_taken_seconds"] = time_diff_in_seconds(end, start)
    return attempts


@frappe.whitelist()
def get_user_attempts_for_all_tests():
    """
    Get all test attempts for the current user across all tests

    Returns:
        list: List of test attempts with associated test information
    """
    user = get_current_user()

    attempts = frappe.get_list(
        "Test Attempt",
        filters={"user": user},
        fields=[
            "name as id",
            "status",
            "final_score",
            "is_passed",
            "start_time",
            "end_time",
            "test as test_id",
        ],
        order_by="start_time desc",
    )

    for attempt in attempts:
        # Calculate time taken
        attempt["time_taken_seconds"] = None
        if attempt.start_time and attempt.end_time:
            start = get_datetime(attempt.start_time)
            end = get_datetime(attempt.end_time)
            attempt["time_taken_seconds"] = time_diff_in_seconds(end, start)

        # Get test title
        if attempt.test_id:
            try:
                test_title = frappe.get_value("Test", attempt.test_id, "title")
                attempt["test_title"] = test_title
            except:
                attempt["test_title"] = f"Test: {attempt.test_id}"

    return attempts


@frappe.whitelist()
def get_attempt_result_details(attempt_id=None):
    attempt_id = frappe.request.args.get("attempt_id")
    user = get_current_user()
    logger = frappe.logger("get_attempt_result_details")

    try:
        attempt_doc = frappe.get_doc("Test Attempt", attempt_id)
        logger.info(
            f"Fetched Test Attempt: {attempt_doc.name}, Status: {attempt_doc.status}"
        )
    except frappe.DoesNotExistError:
        logger.error(f"Test Attempt {attempt_id} not found.")
        frappe.throw(
            _("Test Attempt {0} not found.").format(attempt_id),
            frappe.DoesNotExistError,
        )

    if hasattr(attempt_doc, "user") and attempt_doc.user != user:
        logger.warning(
            f"Permission denied for user {user} on Test Attempt {attempt_id} owned by {attempt_doc.user}."
        )
        frappe.throw(
            _("You are not permitted to view results for this attempt."),
            frappe.PermissionError,
        )

    valid_result_statuses = ["Completed", "Graded", "To be graded", "Timed Out"]
    if attempt_doc.status not in valid_result_statuses:
        logger.info(
            f"Results cannot be displayed for attempt {attempt_id} with status: {attempt_doc.status}."
        )
        frappe.throw(
            _("Results are not available for this attempt status ({0}).").format(
                attempt_doc.status
            ),
            frappe.ValidationError,
        )

    try:
        test_doc = frappe.get_cached_doc("Test", attempt_doc.test)
    except frappe.DoesNotExistError:
        logger.error(
            f"Associated Test {attempt_doc.test} for Attempt {attempt_id} not found."
        )
        frappe.throw(_("Associated Test not found."), frappe.DoesNotExistError)

    student_answer_item_doc_map = {
        ans.test_question_item: ans
        for ans in attempt_doc.answers
        if ans.test_question_item
    }
    logger.debug(
        f"Attempt answers map (keys): {list(student_answer_item_doc_map.keys())}"
    )

    processed_questions_answers = []
    total_possible_score_from_test = 0

    LINK_FIELD_IN_RUBRIC_SCORE_ITEM_TO_AAI = (
        "attempt_answer_item_link"  # <<< THAY THẾ NẾU CẦN
    )

    for tqd_item in test_doc.questions:
        test_question_item_id = tqd_item.name
        base_question_id = tqd_item.question
        try:
            question_doc = frappe.get_doc("Question", base_question_id)
            # print(f"DEBUG_QUESTION_DOC for Q_ID {base_question_id}: {question_doc.as_dict()}")
            marks_in_question = getattr(question_doc, "marks", 1)
        except frappe.DoesNotExistError:
            marks_in_question = 0
        total_possible_score_from_test += marks_in_question

        question_db_details = {}
        question_frontend_options = []
        # question_original_rubric = [] # Biến này có thể vẫn hữu ích để hiển thị rubric gốc

        try:
            question_doc = frappe.get_doc("Question", base_question_id)
            question_db_details = {
                "content": question_doc.content,
                "question_type": question_doc.question_type,
                "marks": question_doc.marks,
                "explanation": question_doc.explanation,
                "hint": getattr(question_doc, "hint", None),
                "question_image_url": getattr(question_doc, "image_url", None)
                or getattr(question_doc, "image", None),
            }
            if question_doc.question_type == "Multiple Choice":
                correct_option_id = None
                for opt_idx, option_row in enumerate(question_doc.options or []):
                    question_frontend_options.append(
                        {
                            "id": option_row.name,
                            "text": option_row.option_text,
                            "label": chr(65 + opt_idx),
                        }
                    )
                    if option_row.is_correct:
                        correct_option_id = option_row.name
                question_db_details["answer_key_display"] = correct_option_id
            elif question_doc.question_type == "Essay":
                # Vẫn lấy rubric gốc để hiển thị nếu cần
                rubric_items_raw = frappe.get_all(
                    "Rubric Item",
                    filters={"question": question_doc.name},
                    fields=["name", "description", "max_score", "step_order"],
                    order_by="step_order asc",
                )
                question_original_rubric_for_display = [
                    {
                        "id": ri.name,
                        "description": ri.description,
                        "max_score": ri.max_score,
                        "step_order": ri.step_order,
                    }
                    for ri in rubric_items_raw
                ]
                question_db_details["answer_key_display"] = (
                    question_original_rubric_for_display  # Hoặc một cách hiển thị khác
                )
            else:
                question_db_details["answer_key_display"] = question_doc.answer_key
        except frappe.DoesNotExistError:
            logger.error(
                f"Base Question Doc {base_question_id} not found for TQI {test_question_item_id}"
            )
            question_db_details.update(
                {
                    "content": _("Error: Question content not found."),
                    "question_type": "Unknown",
                    "marks": 0,
                }
            )

        student_answer_doc = student_answer_item_doc_map.get(test_question_item_id)

        student_submitted_images_list = []
        ai_rubric_scores_list = (
            []
        )  # Đây sẽ là danh sách điểm rubric đã được chấm cho câu trả lời này
        has_essay_question = False
        if student_answer_doc:
            for img_row in getattr(student_answer_doc, "answer_images", []):
                if img_row.image:
                    student_submitted_images_list.append(
                        {"url": img_row.image, "name": img_row.image.split("/")[-1]}
                    )

            if question_db_details.get("question_type") == "Essay":
                try:
                    has_essay_question = True
                    # Truy vấn các bản ghi Rubric Score Item độc lập liên quan đến student_answer_doc (AttemptAnswerItem) này
                    standalone_rsi_docs = frappe.get_all(
                        "Rubric Score Item",  # Tên Doctype Rubric Score Item độc lập của bạn
                        filters={
                            LINK_FIELD_IN_RUBRIC_SCORE_ITEM_TO_AAI: student_answer_doc.name
                        },
                        fields=[
                            "name",
                            "rubric_item",
                            "points_awarded",
                            "comment",
                        ],  # Các trường bạn muốn lấy
                        # bạn có thể thêm 'order_by' nếu cần, ví dụ theo 'creation' hoặc một trường thứ tự nào đó
                    )

                    for rsi_entry in standalone_rsi_docs:
                        base_rubric_info = {}
                        try:
                            # rsi_entry.rubric_item là link đến Rubric Item gốc (định nghĩa tiêu chí)
                            base_rubric_doc = frappe.get_cached_doc(
                                "Rubric Item", rsi_entry.rubric_item
                            )
                            base_rubric_info = {
                                "description": base_rubric_doc.description,  # Mô tả của tiêu chí gốc
                                "criterion_max_score": base_rubric_doc.max_score,  # Điểm tối đa của tiêu chí gốc
                            }
                        except Exception as e_rubric_fetch:
                            logger.warning(
                                f"Could not fetch base Rubric Item {rsi_entry.rubric_item} for standalone RSI {rsi_entry.name}: {e_rubric_fetch}"
                            )

                        ai_rubric_scores_list.append(
                            {
                                "rubric_score_item_doc_name": rsi_entry.name,  # ID của bản ghi Rubric Score Item độc lập
                                "rubric_item_id": rsi_entry.rubric_item,  # ID của Rubric Item gốc (tiêu chí)
                                "criterion_description": base_rubric_info.get(
                                    "description"
                                ),
                                "criterion_max_score": base_rubric_info.get(
                                    "criterion_max_score"
                                ),
                                "points_awarded_by_ai": rsi_entry.points_awarded,  # Điểm được chấm
                                "ai_comment": rsi_entry.comment,  # Nhận xét
                            }
                        )
                    logger.info(
                        f"Fetched {len(ai_rubric_scores_list)} standalone Rubric Score Items for AAI {student_answer_doc.name}"
                    )
                except Exception as e_fetch_rsi:
                    logger.error(
                        f"Error fetching standalone Rubric Score Items for AAI {student_answer_doc.name}: {e_fetch_rsi}",
                        exc_info=True,
                    )
        else:
            logger.warning(
                f"No student answer document found in map for Test Q Item '{test_question_item_id}'."
            )

        processed_questions_answers.append(
            {
                "q_id": base_question_id,
                "test_question_id": test_question_item_id,
                "q_content": question_db_details.get("content"),
                "q_type": question_db_details.get("question_type"),
                "q_marks": question_db_details.get("marks"),
                "q_image_url": question_db_details.get("question_image_url"),
                "options": question_frontend_options,
                "answer_key_display": question_db_details.get(
                    "answer_key_display"
                ),  # Có thể chứa rubric gốc cho Essay
                "explanation": question_db_details.get("explanation"),
                "hint": question_db_details.get("hint"),
                "user_answer_text": (
                    student_answer_doc.user_answer if student_answer_doc else None
                ),
                "user_submitted_images": student_submitted_images_list,
                "is_correct": (
                    student_answer_doc.is_correct if student_answer_doc else None
                ),
                "points_awarded_final": (
                    student_answer_doc.points_awarded if student_answer_doc else 0
                ),
                "point_value_in_test": marks_in_question,
                "time_spent_seconds": (
                    student_answer_doc.time_spent_seconds
                    if student_answer_doc
                    else None
                ),
                "ai_total_score_for_question": (
                    getattr(student_answer_doc, "ai_score", None)
                    if student_answer_doc
                    else None
                ),
                "ai_overall_feedback_for_question": (
                    getattr(student_answer_doc, "ai_feedback", None)
                    if student_answer_doc
                    else None
                ),
                "ai_rubric_scores": ai_rubric_scores_list,  # Danh sách này giờ được điền từ các bản ghi độc lập
            }
        )

    time_taken_seconds_val = None
    if attempt_doc.start_time and attempt_doc.end_time:
        time_taken_seconds_val = time_diff_in_seconds(
            get_datetime(attempt_doc.end_time), get_datetime(attempt_doc.start_time)
        )

    result_payload = {
        "attempt": {
            "id": attempt_doc.name,
            "status": attempt_doc.status,
            "score": attempt_doc.final_score,
            "passed": attempt_doc.is_passed,
            "start_time": attempt_doc.start_time,
            "end_time": attempt_doc.end_time,
            "time_taken_seconds": time_taken_seconds_val,
        },
        "test": {
            "id": test_doc.name,
            "title": test_doc.title,
            "passing_score_threshold": test_doc.passing_score,
            "total_possible_score": total_possible_score_from_test,
            "has_essay_question": has_essay_question,
        },
        "questions_answers": processed_questions_answers,
        "overall_feedback_from_llm": getattr(attempt_doc, "feedback", None),
        "overall_recommendation_from_llm": getattr(attempt_doc, "recommendation", None),
    }
    logger.info(
        f"Finished processing results for attempt {attempt_id}. Returning {len(processed_questions_answers)} Q&A details."
    )
    return result_payload


def extract_json_from_markdown(text):
    """
    Extract JSON from Markdown-style code blocks, handling case sensitivity and whitespace.
    Returns cleaned JSON string or original text if no match.
    """
    # Match code blocks with optional 'json' (case-insensitive)
    markdown_match = re.search(
        r"^\s*```(?:json\s+)?([\s\S]+?)\s*```\s*$", text, re.IGNORECASE | re.MULTILINE
    )

    if markdown_match:
        # If found in code block, use the inner content
        return markdown_match.group(1).strip()
    else:
        # Otherwise, use the full text
        return text.strip()


def generate_and_save_feedback_with_llm(attempt_doc):
    logger = frappe.logger("llm_feedback_generation")
    try:
        questions_and_answers = []
        for ans in attempt_doc.answers:  # ans là một Attempt Answer Item document
            question_content = None
            question_type_from_linked_doc = None  # Loại câu hỏi lấy từ Question gốc

            if ans.question:  # ans.question là link đến Question Doctype
                try:
                    question_doc = frappe.get_doc("Question", ans.question)
                    question_content = getattr(
                        question_doc, "content", _("Nội dung câu hỏi không có sẵn.")
                    )
                    question_type_from_linked_doc = getattr(
                        question_doc, "question_type", _("Không rõ loại")
                    )
                except frappe.DoesNotExistError:
                    logger.warning(
                        f"Không tìm thấy Question document {ans.question} được liên kết từ AttemptAnswerItem {ans.name}"
                    )
                    question_content = _("Câu hỏi gốc không tìm thấy.")
                    question_type_from_linked_doc = _("Không rõ loại")
                except Exception as e:
                    logger.warning(
                        f"Lỗi khi tải nội dung/loại cho câu hỏi {ans.question}: {e}"
                    )
                    question_content = _("Lỗi khi tải nội dung câu hỏi.")
                    question_type_from_linked_doc = _("Không rõ loại")
            else:
                logger.warning(
                    f"AttemptAnswerItem {ans.name} không có trường 'question' được liên kết."
                )
                question_content = _("Câu hỏi không được liên kết.")
                question_type_from_linked_doc = _("Không rõ loại")

            q_and_a_item = {
                "ma_cau_hoi_goc": ans.question,  # Link đến Question gốc
                "noi_dung_cau_hoi": question_content,
                "cau_tra_loi_hoc_sinh": ans.user_answer,
                "ket_qua_dung_sai": ans.is_correct,  # Thường là 0 (sai) hoặc 1 (đúng)
                "diem_dat_duoc": ans.points_awarded,
                "loai_cau_hoi": question_type_from_linked_doc,
            }

            # Thêm ai_feedback nếu là câu Essay và có thông tin
            if question_type_from_linked_doc == "Essay":
                # Giả sử 'ai_feedback' là trường trong Attempt Answer Item chứa nhận xét của AI cho câu essay đó
                q_and_a_item["nhan_xet_ai_cho_bai_luan"] = getattr(
                    ans, "ai_feedback", _("Không có nhận xét tự động cho bài luận này.")
                )

            questions_and_answers.append(q_and_a_item)

        llm_payload = {
            "chi_tiet_bai_lam": questions_and_answers,
            "diem_so_tong_cong": attempt_doc.final_score,
        }

        # Prompt bằng tiếng Việt
        prompt = (
            "Dựa trên chi tiết bài làm kiểm tra của học sinh dưới đây, bao gồm nội dung câu hỏi, câu trả lời của học sinh, "
            "kết quả đúng/sai, điểm số đạt được, và đặc biệt là các 'nhan_xet_ai_cho_bai_luan' (nếu có) đối với các câu hỏi tự luận. "
            "Hãy thực hiện những yêu cầu sau:\n"
            "1. Phân tích tổng quan về hiệu suất của học sinh. Chú ý đến các chủ đề kiến thức hoặc dạng câu hỏi mà học sinh làm tốt hoặc chưa tốt "
            "(ví dụ: giải phương trình, đọc hiểu, trắc nghiệm lý thuyết, bài luận về chủ đề X,...). "
            "Bỏ qua những câu hỏi không được trả lời (có 'cau_tra_loi_hoc_sinh' là null hoặc rỗng) khi đánh giá điểm yếu.\n"
            "2. Xác định những điểm mạnh và những lĩnh vực kiến thức hoặc kỹ năng còn yếu mà học sinh cần cải thiện.\n"
            "3. Đưa ra một 'nhận xét tổng quát' (feedback) mang tính xây dựng, tập trung vào những điểm yếu chính.\n"
            "4. Đề xuất một 'kế hoạch cải thiện' (recommendation) cụ thể, bao gồm các gợi ý về cách học tập hoặc ôn luyện để cải thiện những điểm yếu đó.\n"
            "Vui lòng trả lời bằng JSON, bằng tiếng Việt, theo định dạng sau:\n"
            "{\n"
            '  "feedback": "(Nhận xét tổng quát của bạn về bài làm...)",\n'
            '  "recommendation": "(Kế hoạch và đề xuất cải thiện cho học sinh...)"\n'
            "}\n\n"
            f"Dữ liệu bài làm của học sinh: {json.dumps(llm_payload, ensure_ascii=False, indent=2)}"
        )

        api_key = frappe.conf.get("gemini_api_key") or os.environ.get("GEMINI_API_KEY")
        if not api_key:
            logger.error(
                "Gemini API key not found in site config or environment variable."
            )
            attempt_doc.feedback = _(
                "Lỗi hệ thống: Không thể tạo nhận xét tự động do thiếu cấu hình API."
            )
            attempt_doc.save(ignore_permissions=True)
            frappe.db.commit()
            return

        # Use the new wrapper for API call with automatic token tracking
        payload = {"contents": [{"parts": [{"text": prompt}]}]}
        api_result = call_gemini_api_with_tracking(
            payload=payload,
            operation_name=f"feedback_generation_attempt_{attempt_doc.name}",
            user_id=attempt_doc.user,
            timeout=30,
        )

        if api_result["success"]:
            llm_result = api_result["response"]
            print(f"LLM raw response: {json.dumps(llm_result, ensure_ascii=False)}")

            text_candidate_from_llm = ""
            try:
                text_candidate_from_llm = llm_result["candidates"][0]["content"][
                    "parts"
                ][0]["text"]
            except (IndexError, KeyError, TypeError) as e:
                logger.error(
                    f"Could not extract text from LLM response structure: {e}. Response: {llm_result}"
                )
                attempt_doc.feedback = _(
                    "Lỗi hệ thống: Không thể xử lý phản hồi từ AI để tạo nhận xét."
                )
                attempt_doc.save(ignore_permissions=True)
                frappe.db.commit()
                return

            json_extracted_from_markdown = extract_json_from_markdown(text_candidate_from_llm)  # type: ignore
            feedback_data = None

            try:
                logger.debug(
                    f"Attempting to parse JSON from extracted markdown: {repr(json_extracted_from_markdown)}"
                )
                feedback_data = json.loads(json_extracted_from_markdown)
            except json.JSONDecodeError as e:
                logger.warning(
                    f"JSON parse failed for extracted markdown content. Attempting raw text candidate. Error: {e}"
                )
                try:
                    logger.debug(
                        f"Attempting to parse raw text candidate from LLM: {repr(text_candidate_from_llm)}"
                    )
                    feedback_data = json.loads(text_candidate_from_llm)
                except json.JSONDecodeError as e2:
                    logger.error(
                        f"Final JSON parse failed for LLM response. Error: {e2}. Raw text was: {repr(text_candidate_from_llm)}"
                    )
                    # Nếu không parse được JSON, có thể lưu toàn bộ text vào feedback để xem lại
                    feedback_data = {
                        "feedback": _(
                            "AI đã phản hồi, nhưng có lỗi khi xử lý định dạng JSON. Nội dung gốc: "
                        )
                        + text_candidate_from_llm,
                        "recommendation": "",
                    }

            if feedback_data and isinstance(feedback_data, dict):
                attempt_doc.feedback = feedback_data.get(
                    "feedback", _("Không có nhận xét chi tiết.")
                )
                attempt_doc.recommendation = feedback_data.get(
                    "recommendation", _("Không có đề xuất cụ thể.")
                )
            elif (
                isinstance(text_candidate_from_llm, str)
                and text_candidate_from_llm.strip()
            ):  # Nếu không có feedback_data nhưng có text
                attempt_doc.feedback = text_candidate_from_llm
                attempt_doc.recommendation = _("Vui lòng xem nhận xét chi tiết ở trên.")
            else:  # Không có gì cả
                attempt_doc.feedback = _("Không thể tạo nhận xét tự động vào lúc này.")
                attempt_doc.recommendation = None

            attempt_doc.save(ignore_permissions=True)
            frappe.db.commit()
            logger.info(
                f"Successfully generated and saved LLM feedback for attempt {attempt_doc.name}"
            )

        else:
            logger.warning(
                f"Gemini API call failed for feedback generation: {api_result['error']}"
            )
            attempt_doc.feedback = _(
                "Lỗi khi giao tiếp với dịch vụ AI để tạo nhận xét."
            )
            attempt_doc.save(ignore_permissions=True)
            frappe.db.commit()

    except Exception as e:
        logger.error(
            f"Critical error in LLM feedback generation for attempt {attempt_doc.name}: {e}",
            exc_info=True,
        )
        # Cân nhắc có nên cập nhật attempt_doc.feedback với thông báo lỗi ở đây không
        try:  # Cố gắng lưu lỗi vào attempt_doc nếu có thể
            if frappe.db.exists(
                "Test Attempt", attempt_doc.name
            ):  # Đảm bảo attempt_doc vẫn hợp lệ
                doc_to_update = frappe.get_doc("Test Attempt", attempt_doc.name)
                doc_to_update.feedback = _(
                    "Đã xảy ra lỗi nghiêm trọng trong quá trình tạo nhận xét tự động."
                )
                doc_to_update.save(ignore_permissions=True)
                frappe.db.commit()
        except Exception as e_save_err:
            logger.error(
                f"Could not save error feedback to attempt {attempt_doc.name}: {e_save_err}"
            )
