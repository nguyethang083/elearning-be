import frappe
import json
from frappe.utils import get_datetime
from frappe import _


def update_mastery_after_test(attempt_doc):
    """
    Update mastery weight in pathway snapshot after test submission.
    """
    try:
        user = attempt_doc.user
        test_doc = frappe.get_doc("Test", attempt_doc.test)
        topic = test_doc.topic
        if not topic:
            return

        # Get score percentage
        total_possible = sum(q.points for q in test_doc.questions if q.points)
        if total_possible == 0:
            return
        score_percentage = (attempt_doc.final_score / total_possible) * 100

        # Get student profile
        profile_name = frappe.db.get_value(
            "Student Knowledge Profile", {"student": user}, "name"
        )
        if not profile_name:
            return

        # Get latest pathway snapshot
        snapshot = frappe.db.sql(
            """
            SELECT name, pathway_json FROM `tabStudent Pathway Snapshot`
            WHERE student = %s
            ORDER BY modified DESC
            LIMIT 1
            """,
            (profile_name,),
            as_dict=True,
        )
        if not snapshot:
            return

        pathway_json = snapshot[0]["pathway_json"]
        try:
            pathway = json.loads(pathway_json)
        except:
            return

        # Update mastery_weight for the topic
        updated = False
        for chapter in pathway:
            if str(chapter.get("id")) == str(topic):
                old_mastery = chapter.get("mastery_weight", 0)
                if score_percentage >= 80:
                    new_mastery = min(1000, old_mastery + 100)
                elif score_percentage >= 60:
                    new_mastery = min(1000, old_mastery + 50)
                elif score_percentage < 50:
                    new_mastery = max(0, old_mastery - 50)
                else:
                    new_mastery = old_mastery
                chapter["mastery_weight"] = new_mastery
                updated = True
                break

        if updated:
            # Update dependencies if mastery > threshold
            threshold = 750
            dependencies = {
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

            def is_unlocked(t_id, pathway):
                for prereq in dependencies.get(str(t_id), []):
                    prereq_chapter = next(
                        (c for c in pathway if str(c.get("id")) == str(prereq)), None
                    )
                    if (
                        not prereq_chapter
                        or prereq_chapter.get("mastery_weight", 0) < threshold
                    ):
                        return False
                return True

            for chapter in pathway:
                t_id = str(chapter.get("id"))
                if chapter.get("mastery_weight", 0) >= threshold and is_unlocked(
                    t_id, pathway
                ):
                    chapter["is_unlocked"] = True
                    chapter["status"] = "unlocked"

            # Save updated pathway
            new_pathway_json = json.dumps(pathway)
            frappe.db.sql(
                """
                UPDATE `tabStudent Pathway Snapshot`
                SET pathway_json = %s, modified = %s
                WHERE name = %s
                """,
                (new_pathway_json, frappe.utils.now_datetime(), snapshot[0]["name"]),
            )
            frappe.db.commit()

    except Exception as e:
        frappe.log_error(f"Error updating mastery after test: {e}")


@frappe.whitelist()
def get_performance_trend():
    """
    Get performance trend data for the current user.
    Returns monthly scores for each chapter.
    """
    user = frappe.session.user
    print(f"DEBUG: API called by user: {user}")
    if user == "Guest":
        frappe.throw(_("Authentication required."), frappe.AuthenticationError)

    try:
        # Get all completed/graded attempts for the user
        attempts = frappe.get_list(
            "Test Attempt",
            filters={"user": user, "status": ["in", ["Completed", "Graded"]]},
            fields=["name", "test", "final_score", "end_time"],
            order_by="end_time asc",
        )

        print(f"DEBUG: Found {len(attempts)} attempts for user {user}")
        for attempt in attempts:
            print(
                f"  - Attempt: {attempt.name}, Test: {attempt.test}, Score: {attempt.final_score}, End: {attempt.end_time}"
            )

        # Check if there are attempts with different statuses
        all_attempts = frappe.get_list(
            "Test Attempt",
            filters={"user": user},
            fields=["name", "status", "test", "final_score", "end_time"],
            order_by="end_time desc",
            limit=10,
        )
        print(f"DEBUG: All attempts for user {user} (last 10):")
        for attempt in all_attempts:
            print(
                f"  - {attempt.name}: Status={attempt.status}, Test={attempt.test}, Score={attempt.final_score}, End={attempt.end_time}"
            )

        # If no attempts, return empty data
        if not attempts:
            print("DEBUG: No completed/graded attempts found, returning empty data")
            return {
                "labels": [],
                "datasets": [],
            }

        # Group by month and topic
        # Only process Assessment and Exam type tests (Practice tests don't have topics)
        trend_data = {}
        for attempt in attempts:
            if not attempt.end_time:
                continue
            end_date = get_datetime(attempt.end_time)
            month_key = end_date.strftime("%Y-%m")

            try:
                test_doc = frappe.get_doc("Test", attempt.test)

                # Only process Assessment and Exam type tests that should have topics
                if test_doc.test_type not in ["Assessment", "Exam"]:
                    continue

                topic = test_doc.topic
                if not topic or str(topic).strip() == "":
                    print(
                        f"DEBUG: Skipping attempt {attempt.name} - Test {attempt.test} has no topic"
                    )
                    continue
            except Exception as e:
                print(f"DEBUG: Error getting test document for {attempt.test}: {e}")
                continue

            print(
                f"DEBUG: Processing attempt {attempt.name} - Test: {attempt.test}, Topic: {topic}"
            )

            # Calculate total possible score using the same logic as get_test_details
            total_possible = 0
            for q in test_doc.get("questions", []):
                try:
                    question_doc = frappe.get_doc("Question", q.get("question"))
                    if question_doc.question_type == "Essay":
                        rubric_items = frappe.get_all(
                            "Rubric Item",
                            filters={"question": question_doc.name},
                            fields=["max_score"],
                        )
                        essay_score = (
                            sum(item.max_score for item in rubric_items)
                            if rubric_items
                            else 0
                        )
                        total_possible += essay_score
                    else:
                        total_possible += getattr(question_doc, "marks", 1)
                except Exception as e:
                    print(
                        f"DEBUG: Error calculating score for question {q.get('question')}: {e}"
                    )
                    total_possible += 1

            if total_possible == 0:
                print(
                    f"DEBUG: Skipping attempt {attempt.name} - Test {attempt.test} has no questions with points"
                )
                continue
            score_percentage = (attempt.final_score / total_possible) * 100

            if month_key not in trend_data:
                trend_data[month_key] = {}
            if topic not in trend_data[month_key]:
                trend_data[month_key][topic] = []
            trend_data[month_key][topic].append(score_percentage)

        print(f"DEBUG: Trend data keys: {list(trend_data.keys())}")

        # Aggregate: average score per topic per month
        labels = sorted(trend_data.keys())
        formatted_labels = []
        for label in labels:
            year, month = label.split("-")
            month_num = int(month)
            formatted_labels.append(f"Th{month_num}")
        datasets = []
        colors = [
            "rgba(99, 102, 241, 1)",  # blue
            "rgba(236, 72, 153, 1)",  # pink
            "rgba(74, 222, 128, 1)",  # green
            "rgba(251, 191, 36, 1)",  # yellow
            "rgba(59, 130, 246, 1)",  # blue
            "rgba(244, 63, 94, 1)",  # red
            "rgba(16, 185, 129, 1)",  # emerald
            "rgba(168, 85, 247, 1)",  # violet
            "rgba(251, 113, 133, 1)",  # rose
            "rgba(34, 197, 94, 1)",  # lime
        ]

        for i in range(1, 11):  # Chapters 1-10
            topic = str(i)
            data = []
            for label in labels:
                if topic in trend_data.get(label, {}):
                    scores = trend_data[label][topic]
                    avg_score = sum(scores) / len(scores)
                    data.append(round(avg_score, 1))
                else:
                    data.append(0)
            datasets.append(
                {
                    "label": f"Chương {i}",
                    "data": data,
                    "color": colors[i - 1] if i - 1 < len(colors) else "rgba(0,0,0,1)",
                }
            )

        result = {
            "labels": formatted_labels,
            "datasets": datasets,
        }
        print(
            f"DEBUG: Returning {len(formatted_labels)} labels and {len(datasets)} datasets"
        )
        return result

    except Exception as e:
        frappe.log_error(f"Error getting performance trend: {e}")
        return {
            "labels": [],
            "datasets": [],
        }
