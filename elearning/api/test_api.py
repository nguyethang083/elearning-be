import frappe
from frappe import _
from frappe.utils import now_datetime, get_datetime
import json


@frappe.whitelist(allow_guest=True)
def start_test_attempt():
    """Create a new test attempt for the current user"""
    test_id = frappe.request.args.get("test_id")
    if not test_id:
        frappe.throw(_("Test ID is required"))

    # Get the current user
    student = frappe.session.user

    # Check if there's already an active attempt
    existing_attempts = frappe.get_all(
        "Test Attempt",
        filters={"test": test_id, "student": student, "status": "In Progress"},
        fields=["name", "start_time"],
    )

    # If there's an existing attempt that's still valid, return it
    if existing_attempts:
        return {
            "test_attempt_id": existing_attempts[0].name,
            "message": "Continuing existing test attempt",
        }

    # Create a new test attempt
    test_attempt = frappe.new_doc("Test Attempt")
    test_attempt.test = test_id
    test_attempt.student = student
    test_attempt.status = "In Progress"
    test_attempt.start_time = now_datetime()

    try:
        # Add ignore_permissions=True to bypass permission errors
        test_attempt.insert(ignore_permissions=True)
        frappe.db.commit()

        return {
            "test_attempt_id": test_attempt.name,
            "message": "Test attempt started successfully",
        }
    except Exception as e:
        frappe.log_error(f"Failed to create test attempt: {str(e)}")
        frappe.throw(_("Failed to create test attempt: {0}").format(str(e)))


@frappe.whitelist(allow_guest=True)
def submit_test(test_id, test_attempt_id, submission_data):
    """Submit a test attempt with answers"""
    try:
        # Log incoming data for debugging
        frappe.logger().debug(
            f"Submit test called with: test_id={test_id}, attempt_id={test_attempt_id}"
        )

        # Debug print the submission data structure
        if isinstance(submission_data, str):
            try:
                parsed_data = json.loads(submission_data)
                frappe.logger().debug(
                    f"Parsed submission_data: {json.dumps(parsed_data, indent=2)[:500]}..."
                )
            except:
                frappe.logger().debug(
                    f"Raw submission_data (string): {submission_data[:500]}..."
                )
        else:
            frappe.logger().debug(
                f"Raw submission_data (dict): {json.dumps(submission_data, indent=2)[:500]}..."
            )

        # Validate input parameters
        if not test_id or not test_attempt_id:
            frappe.throw(_("Test ID and attempt ID are required"))

        # Convert submission_data to dict if it's a string
        if isinstance(submission_data, str):
            submission_data = json.loads(submission_data)

        # Add more defensive code for expected data structure
        if not isinstance(submission_data, dict):
            frappe.throw(_("Invalid submission data format"))

        # Ensure questionMapping exists
        if not submission_data.get("questionMapping"):
            frappe.throw(_("Question mapping is required"))

        # Get the test attempt
        try:
            test_attempt = frappe.get_doc("Test Attempt", test_attempt_id)
        except Exception as e:
            frappe.log_error(f"Failed to find test attempt {test_attempt_id}: {str(e)}")
            frappe.throw(_("Test attempt not found"))

        # Verify test attempt belongs to correct test
        if test_attempt.test != test_id:
            frappe.log_error(
                f"Test mismatch: attempt's test is {test_attempt.test}, but provided {test_id}"
            )
            frappe.throw(_("Test attempt does not match the provided test ID"))

        # Skip if already completed to prevent duplicate submissions
        if test_attempt.status == "Completed" and test_attempt.end_time:
            return {
                "success": True,
                "test_attempt_id": test_attempt_id,
                "message": "Test was already completed",
                "score": test_attempt.final_score,
                "is_passed": test_attempt.is_passed,
            }

        # Update test attempt as completed
        test_attempt.status = "Completed"
        test_attempt.end_time = now_datetime()
        if submission_data.get("time_taken"):
            try:
                test_attempt.time_spent_seconds = int(submission_data.get("time_taken"))
            except (TypeError, ValueError):
                # If time_taken is not convertible to int, use 0
                test_attempt.time_spent_seconds = 0

        # Save the test attempt
        test_attempt.save(ignore_permissions=True)
        frappe.db.commit()

        # Process answers
        try:
            process_test_answers(test_attempt_id, submission_data)
        except Exception as e:
            frappe.log_error(
                f"Error in process_test_answers: {str(e)}, traceback: {frappe.get_traceback()}"
            )
            # Continue even if there's an error processing answers

        # Calculate score
        try:
            score_data = calculate_test_score(test_attempt_id)
        except Exception as e:
            frappe.log_error(
                f"Error in calculate_test_score: {str(e)}, traceback: {frappe.get_traceback()}"
            )
            score_data = {"score": 0, "is_passed": 0}

        return {
            "success": True,
            "test_attempt_id": test_attempt_id,
            "score": score_data.get("score", 0),
            "raw_score": score_data.get("raw_score", 0),
            "total_points": score_data.get("total_points", 0),
            "is_passed": score_data.get("is_passed", 0),
            "message": "Test submitted successfully",
        }

    except Exception as e:
        frappe.log_error(
            f"Error submitting test: {str(e)}, traceback: {frappe.get_traceback()}"
        )
        frappe.throw(_("Error submitting test: {0}").format(str(e)))
    """Submit a test attempt with answers"""
    try:
        # Log incoming data for debugging
        frappe.logger().debug(
            f"Submit test called with: test_id={test_id}, attempt_id={test_attempt_id}"
        )

        # Debug print the submission data structure
        if isinstance(submission_data, str):
            try:
                parsed_data = json.loads(submission_data)
                frappe.logger().debug(
                    f"Parsed submission_data: {json.dumps(parsed_data, indent=2)[:500]}..."
                )
            except:
                frappe.logger().debug(
                    f"Raw submission_data (string): {submission_data[:500]}..."
                )
        else:
            frappe.logger().debug(
                f"Raw submission_data (dict): {json.dumps(submission_data, indent=2)[:500]}..."
            )

        # Validate input parameters
        if not test_id or not test_attempt_id:
            frappe.throw(_("Test ID and attempt ID are required"))

        # Convert submission_data to dict if it's a string
        if isinstance(submission_data, str):
            submission_data = json.loads(submission_data)

        # Add more defensive code for expected data structure
        if not isinstance(submission_data, dict):
            frappe.throw(_("Invalid submission data format"))

        # Ensure questionMapping exists
        if not submission_data.get("questionMapping"):
            frappe.throw(_("Question mapping is required"))

        # Get the test attempt
        try:
            test_attempt = frappe.get_doc("Test Attempt", test_attempt_id)
        except Exception as e:
            frappe.log_error(f"Failed to find test attempt {test_attempt_id}: {str(e)}")
            frappe.throw(_("Test attempt not found"))

        # Verify test attempt belongs to correct test
        if test_attempt.test != test_id:
            frappe.log_error(
                f"Test mismatch: attempt's test is {test_attempt.test}, but provided {test_id}"
            )
            frappe.throw(_("Test attempt does not match the provided test ID"))

        # Skip if already completed to prevent duplicate submissions
        if test_attempt.status == "Completed" and test_attempt.end_time:
            return {
                "success": True,
                "test_attempt_id": test_attempt_id,
                "message": "Test was already completed",
                "score": test_attempt.final_score or 0,
                "total_points": test_attempt.total_points or 0,
                "percentage": test_attempt.percentage_score or 0,
            }

        # Update test attempt as completed
        test_attempt.status = "Completed"
        test_attempt.end_time = now_datetime()
        if submission_data.get("time_taken"):
            try:
                test_attempt.time_spent_seconds = int(submission_data.get("time_taken"))
            except (TypeError, ValueError):
                # If time_taken is not convertible to int, use 0
                test_attempt.time_spent_seconds = 0

        # Save the test attempt
        test_attempt.save(ignore_permissions=True)
        frappe.db.commit()

        # Process answers
        try:
            process_test_answers(test_attempt_id, submission_data)
        except Exception as e:
            frappe.log_error(
                f"Error in process_test_answers: {str(e)}, traceback: {frappe.get_traceback()}"
            )
            # Continue even if there's an error processing answers

        # Calculate score
        try:
            score_data = calculate_test_score(test_attempt_id)
        except Exception as e:
            frappe.log_error(
                f"Error in calculate_test_score: {str(e)}, traceback: {frappe.get_traceback()}"
            )
            score_data = {
                "score": 0,
                "total_points": 0,
                "percentage": 0,
                "is_passed": 0,
            }

        return {
            "success": True,
            "test_attempt_id": test_attempt_id,
            "score": score_data.get("score", 0),
            "total_points": score_data.get("total_points", 0),
            "percentage": score_data.get("percentage", 0),
            "is_passed": score_data.get("is_passed", 0),
            "message": "Test submitted successfully",
        }

    except Exception as e:
        frappe.log_error(
            f"Error submitting test: {str(e)}, traceback: {frappe.get_traceback()}"
        )
        frappe.throw(_("Error submitting test: {0}").format(str(e)))


def process_test_answers(test_attempt_id, submission_data):
    """Process and save student answers"""
    try:
        question_mapping = submission_data.get("questionMapping", {})
        if not question_mapping:
            frappe.log_error("Missing questionMapping in submission_data")
            return

        # Process multiple choice answers
        if submission_data.get("multipleChoiceAnswers"):
            for question_idx, option_id in submission_data[
                "multipleChoiceAnswers"
            ].items():
                try:
                    if not option_id or not question_mapping.get(question_idx):
                        continue

                    # Get the question item
                    question_item_name = question_mapping[question_idx]
                    question_item = frappe.get_doc(
                        "Test Question Item", question_item_name
                    )

                    # Get the original question to find the option item ID
                    question = frappe.get_doc("Question", question_item.question)

                    # Find the option item that matches the label
                    option_item = None
                    for option in question.options:
                        if option.label.lower() == option_id.lower():
                            option_item = option
                            break

                    if not option_item:
                        frappe.log_error(
                            f"Option with label '{option_id}' not found for question {question.name}"
                        )
                        continue

                    # Check if an answer already exists for this question
                    existing = frappe.get_all(
                        "Student Answer",
                        filters={
                            "test_attempt": test_attempt_id,
                            "question_item": question_item_name,
                        },
                        fields=["name"],
                    )

                    # Determine if the answer is correct
                    is_correct = 1 if option_item.is_correct else 0

                    if existing:
                        # Update existing answer
                        answer = frappe.get_doc("Student Answer", existing[0].name)
                        answer.selected_option = (
                            option_item.name
                        )  # Use the name of the option item
                        answer.is_correct = is_correct
                        answer.answered_at = now_datetime()
                        answer.save(ignore_permissions=True)
                    else:
                        # Create new student answer
                        answer = frappe.new_doc("Student Answer")
                        answer.test_attempt = test_attempt_id
                        answer.question_item = question_item_name
                        answer.selected_option = (
                            option_item.name
                        )  # Use the name of the option item
                        answer.is_correct = is_correct
                        answer.answered_at = now_datetime()
                        answer.insert(ignore_permissions=True)

                    # Log successful answer creation
                    frappe.logger().debug(
                        f"Saved Student Answer for question {question_idx}: option={option_item.name}, correct={is_correct}"
                    )

                except Exception as e:
                    frappe.log_error(
                        f"Error processing multiple choice answer for question {question_idx}: {str(e)}, traceback: {frappe.get_traceback()}"
                    )
                    continue

        # Process short answers
        if submission_data.get("shortAnswers"):
            for question_idx, answer_text in submission_data["shortAnswers"].items():
                try:
                    if not answer_text or not question_mapping.get(question_idx):
                        continue

                    # Check if an answer already exists for this question
                    existing = frappe.get_all(
                        "Student Answer",
                        filters={
                            "test_attempt": test_attempt_id,
                            "question_item": question_mapping[question_idx],
                        },
                        fields=["name"],
                    )

                    if existing:
                        # Update existing answer
                        answer = frappe.get_doc("Student Answer", existing[0].name)
                        answer.answer_text = answer_text
                        answer.needs_manual_grading = 1
                        answer.answered_at = now_datetime()
                        answer.save(ignore_permissions=True)
                    else:
                        # Create new short answer
                        answer = frappe.new_doc("Student Answer")
                        answer.test_attempt = test_attempt_id
                        answer.question_item = question_mapping[question_idx]
                        answer.answer_text = answer_text
                        answer.needs_manual_grading = 1
                        answer.answered_at = now_datetime()
                        answer.insert(ignore_permissions=True)
                except Exception as e:
                    frappe.log_error(
                        f"Error processing short answer for question {question_idx}: {str(e)}, traceback: {frappe.get_traceback()}"
                    )
                    continue

        # Process long answers
        if submission_data.get("longAnswers"):
            for question_idx, answer_text in submission_data["longAnswers"].items():
                try:
                    if not answer_text or not question_mapping.get(question_idx):
                        continue

                    # Check if an answer already exists for this question
                    existing = frappe.get_all(
                        "Student Answer",
                        filters={
                            "test_attempt": test_attempt_id,
                            "question_item": question_mapping[question_idx],
                        },
                        fields=["name"],
                    )

                    if existing:
                        # Update existing answer
                        answer = frappe.get_doc("Student Answer", existing[0].name)
                        answer.answer_text = answer_text
                        answer.needs_manual_grading = 1
                        answer.answered_at = now_datetime()
                        answer.save(ignore_permissions=True)
                    else:
                        # Create new long answer
                        answer = frappe.new_doc("Student Answer")
                        answer.test_attempt = test_attempt_id
                        answer.question_item = question_mapping[question_idx]
                        answer.answer_text = answer_text
                        answer.needs_manual_grading = 1
                        answer.answered_at = now_datetime()
                        answer.insert(ignore_permissions=True)
                except Exception as e:
                    frappe.log_error(
                        f"Error processing long answer for question {question_idx}: {str(e)}, traceback: {frappe.get_traceback()}"
                    )
                    continue

        # Process drawings
        if submission_data.get("canvasStates"):
            for question_idx, canvas_data in submission_data["canvasStates"].items():
                try:
                    if not canvas_data or not question_mapping.get(question_idx):
                        continue

                    # Check if an answer already exists for this question
                    existing = frappe.get_all(
                        "Student Answer",
                        filters={
                            "test_attempt": test_attempt_id,
                            "question_item": question_mapping[question_idx],
                        },
                        fields=["name"],
                    )

                    if existing:
                        # Update existing answer
                        answer = frappe.get_doc("Student Answer", existing[0].name)
                        answer.drawing_data = json.dumps(canvas_data)
                        answer.needs_manual_grading = 1
                        answer.answered_at = now_datetime()
                        answer.save(ignore_permissions=True)
                    else:
                        # Create new drawing answer
                        answer = frappe.new_doc("Student Answer")
                        answer.test_attempt = test_attempt_id
                        answer.question_item = question_mapping[question_idx]
                        answer.drawing_data = json.dumps(canvas_data)
                        answer.needs_manual_grading = 1
                        answer.answered_at = now_datetime()
                        answer.insert(ignore_permissions=True)
                except Exception as e:
                    frappe.log_error(
                        f"Error processing drawing for question {question_idx}: {str(e)}, traceback: {frappe.get_traceback()}"
                    )
                    continue

        # Commit all changes
        frappe.db.commit()
        frappe.logger().debug(
            f"Successfully processed all answers for test attempt {test_attempt_id}"
        )

    except Exception as e:
        frappe.log_error(
            f"Error processing answers: {str(e)}, traceback: {frappe.get_traceback()}"
        )
        frappe.throw(_("Error processing answers: {0}").format(str(e)))


def format_time_spent(seconds):
    """Format seconds into MM:SS or HH:MM:SS format"""
    if not seconds:
        return "00:00"

    try:
        # Ensure seconds is an integer
        seconds = int(seconds)

        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        secs = seconds % 60

        if hours > 0:
            return f"{hours:02d}:{minutes:02d}:{secs:02d}"
        else:
            return f"{minutes:02d}:{secs:02d}"
    except Exception:
        return "00:00"


def calculate_test_score(test_attempt_id):
    """Calculate the score for a test attempt on a scale of 0-10"""
    try:
        total_score = 0
        possible_score = 0

        # Get the test attempt
        test_attempt = frappe.get_doc("Test Attempt", test_attempt_id)

        # Get the test to check for passing criteria
        test_doc = frappe.get_doc("Test", test_attempt.test)

        # Get all student answers for this attempt
        answers = frappe.get_all(
            "Student Answer",
            filters={"test_attempt": test_attempt_id, "selected_option": ["!=", ""]},
            fields=["name", "question_item", "selected_option", "is_correct"],
        )

        # Process each answer that has is_correct flag
        for answer in answers:
            try:
                # Get question item
                question_item = frappe.get_doc(
                    "Test Question Item", answer.question_item
                )

                # If already marked as correct, add points
                if answer.is_correct:
                    total_score += question_item.points or 0

            except Exception as e:
                frappe.log_error(f"Error processing answer {answer.name}: {str(e)}")
                continue

        # Calculate possible score
        question_items = frappe.get_all(
            "Test Question Item",
            filters={"parent": test_attempt.test, "parenttype": "Test"},
            fields=["points"],
        )

        for qi in question_items:
            possible_score += qi.points or 0

        # Calculate score on scale of 10
        if possible_score > 0:
            # Convert raw score to scale of 10
            test_attempt.final_score = round((total_score / possible_score) * 10, 1)
        else:
            test_attempt.final_score = 0

        # Determine if the student passed based on final_score
        passing_score = getattr(
            test_doc, "passing_score", 5
        )  # Default to 5/10 if not set
        test_attempt.is_passed = 1 if test_attempt.final_score >= passing_score else 0

        # Log pass/fail status
        status = "PASSED" if test_attempt.is_passed else "FAILED"
        frappe.logger().info(
            f"Test attempt {test_attempt_id} {status} with score {test_attempt.final_score}/10 (raw: {total_score}/{possible_score})"
        )

        # Save the test attempt with score information
        test_attempt.save(ignore_permissions=True)
        frappe.db.commit()

        return {
            "score": test_attempt.final_score,
            "total_points": possible_score,
            "raw_score": total_score,
            "is_passed": test_attempt.is_passed,
        }

    except Exception as e:
        frappe.log_error(
            f"Error calculating score: {str(e)}, traceback: {frappe.get_traceback()}"
        )
        return {"score": 0, "total_points": 0, "raw_score": 0, "is_passed": 0}


@frappe.whitelist(allow_guest=True)
def get_test_attempts():
    """Get all completed test attempts for the current user and specified test"""
    try:
        test_id = frappe.request.args.get("test_id")
        if not test_id:
            frappe.throw(_("Test ID is required"))

        # Get the current user
        student = frappe.session.user

        # # Check if user is logged in
        # if student == "Guest":
        #     frappe.throw(_("Please log in to view test attempts"))

        # Log for debugging
        frappe.logger().info(
            f"Fetching test attempts for test_id={test_id}, student={student}"
        )

        # Get all completed attempts for this user and test
        filters = {"test": test_id, "student": student, "status": "Completed"}

        # Log the filters we're using
        frappe.logger().info(f"Using filters: {filters}")

        attempts = frappe.get_all(
            "Test Attempt",
            filters=filters,
            fields=["name", "end_time", "start_time", "final_score", "is_passed"],
            order_by="end_time desc",
        )

        # Log the raw attempts we got
        frappe.logger().info(f"Found {len(attempts)} attempts for test {test_id}")

        # Format the data for display
        formatted_attempts = []
        for attempt in attempts:
            # Calculate time spent from start_time and end_time
            time_spent = 0
            if attempt.get("start_time") and attempt.get("end_time"):
                try:
                    start = get_datetime(attempt.start_time)
                    end = get_datetime(attempt.end_time)
                    time_diff = end - start
                    time_spent = int(time_diff.total_seconds())
                except Exception as e:
                    frappe.logger().debug(f"Error calculating time spent: {str(e)}")
                    time_spent = 0

            # Format the attempt data
            formatted_attempts.append(
                {
                    "id": attempt.name,
                    "date": (
                        frappe.utils.format_datetime(attempt.end_time, "medium")
                        if attempt.get("end_time")
                        else ""
                    ),
                    "score": attempt.get("final_score", 0) or 0,
                    "time_taken": format_time_spent(time_spent),
                    "is_passed": attempt.get("is_passed", 0) or 0,
                }
            )

        # Log the formatted attempts we're returning
        frappe.logger().info(f"Returning {len(formatted_attempts)} formatted attempts")

        return formatted_attempts

    except Exception as e:
        frappe.log_error(
            f"Error getting test attempts: {str(e)}, traceback: {frappe.get_traceback()}"
        )
        return []  # Return empty list instead of throwing error to make API more robust


@frappe.whitelist()
def get_test_attempt_result():
    """Get detailed result for a specific test attempt"""
    try:
        attempt_id = frappe.request.args.get("attempt_id")
        if not attempt_id:
            frappe.throw(_("Test attempt ID is required"))

        # Ensure current user has access to this attempt
        attempt = frappe.get_doc("Test Attempt", attempt_id)
        if frappe.session.user != attempt.student and not frappe.has_permission(
            "Test Attempt", "read"
        ):
            frappe.throw(_("You don't have permission to access this test attempt"))

        # Get the test details
        test = frappe.get_doc("Test", attempt.test)

        # Get all answers for this attempt
        answers = frappe.get_all(
            "Student Answer",
            filters={"test_attempt": attempt_id},
            fields=[
                "name",
                "question_item",
                "selected_option",
                "answer_text",
                "is_correct",
            ],
        )

        # Count correct answers
        correct_answers = sum(1 for answer in answers if answer.is_correct)

        # Calculate time spent
        time_spent = 0
        if attempt.start_time and attempt.end_time:
            try:
                start = get_datetime(attempt.start_time)
                end = get_datetime(attempt.end_time)
                time_diff = end - start
                time_spent = int(time_diff.total_seconds())
            except Exception as e:
                frappe.log_error(f"Error calculating time: {str(e)}")
                time_spent = 0

        # Format the response
        result = {
            "test_title": test.title,
            "test_id": test.name,
            "attempt_id": attempt.name,
            "start_date": frappe.utils.format_datetime(attempt.start_time, "medium"),
            "end_date": frappe.utils.format_datetime(attempt.end_time, "medium"),
            "time_taken": format_time_spent(time_spent),
            "final_score": attempt.final_score or 0,
            "is_passed": attempt.is_passed or 0,
            "total_questions": len(
                frappe.get_all("Test Question Item", filters={"parent": test.name})
            ),
            "correct_answers": correct_answers,
        }

        return result

    except Exception as e:
        frappe.log_error(
            f"Error getting test attempt result: {str(e)}, traceback: {frappe.get_traceback()}"
        )
        frappe.throw(_("Error retrieving test attempt result"))
