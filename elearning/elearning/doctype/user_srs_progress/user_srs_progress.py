# Copyright (c) 2025, Minh Quy and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import now_datetime, add_days, getdate, get_datetime
from datetime import datetime, timedelta
import random
import math
import requests
import re
import json

class UserSRSProgress(Document):
    def before_save(self):
        """Validate before saving"""
        # skip validation while fixtures are loading
        if getattr(frappe.flags, "in_import", False):
            return
        self.validate_user_flashcard()
    
    def validate_user_flashcard(self):
        """Ensure user and flashcard exist"""
        if not frappe.db.exists("User", self.user):
            frappe.throw(_("User {0} does not exist").format(self.user))
        
        if not frappe.db.exists("Flashcard", self.flashcard):
            frappe.throw(_("Flashcard {0} does not exist").format(self.flashcard))

    def validate(self):
        if not self.topic and self.flashcard:
            # Get topic from flashcard if not set
            self.topic = frappe.db.get_value("Flashcard", self.flashcard, "topic")
            
        if not self.topic:
            frappe.throw("Topic is required and must be set either directly or through a flashcard")

def get_current_user():
    """Get current authenticated user"""
    user = frappe.session.user
    if user == "Guest":
        frappe.throw(_("Authentication required."), frappe.AuthenticationError)
    return user

@frappe.whitelist()
def get_due_srs_summary():
    """
    Get summary of SRS cards due for review and upcoming cards, grouped by topic
    
    Returns:
        dict: Number of due cards, upcoming cards and topic summaries
    """
    user_id = get_current_user()
    now = now_datetime()
    upcoming_days = 2  # Hiển thị thẻ sắp đến hạn trong 2 ngày tới
    upcoming_date = add_days(now, upcoming_days)
    
    # Get all SRS progress records that are due now
    due_records = frappe.get_all(
        "User SRS Progress",
        filters={
            "user": user_id,
            "next_review_timestamp": ["<=", now]
        },
        fields=["name", "flashcard", "next_review_timestamp"]
    )
    
    # Get upcoming SRS progress records
    upcoming_records = frappe.get_all(
        "User SRS Progress",
        filters={
            "user": user_id,
            "next_review_timestamp": [">", now],
            "next_review_timestamp": ["<=", upcoming_date]
        },
        fields=["name", "flashcard", "next_review_timestamp"]
    )
    
    all_records = due_records + upcoming_records
    
    if not all_records:
        return {
            "success": True,
            "due_count": 0,
            "upcoming_count": 0,
            "total_count": 0,
            "topics": []
        }
    
    # Get flashcard details to group by topic
    flashcard_names = [record.flashcard for record in all_records]
    
    flashcard_topics = frappe.get_all(
        "Flashcard",
        filters={"name": ["in", flashcard_names]},
        fields=["name", "topic"]
    )
    
    # Create a map of flashcard to topic
    flashcard_to_topic = {fc.name: fc.topic for fc in flashcard_topics}
    
    # Group by topic
    topic_data = {}
    for record in all_records:
        topic = flashcard_to_topic.get(record.flashcard)
        if not topic:
            continue
            
        if topic not in topic_data:
            topic_data[topic] = {
                "due_count": 0,
                "upcoming_count": 0,
                "cards": []
            }
            
        # Determine if it's due now or upcoming
        is_due = record.next_review_timestamp <= now
        
        if is_due:
            topic_data[topic]["due_count"] += 1
        else:
            topic_data[topic]["upcoming_count"] += 1
            
        topic_data[topic]["cards"].append({
            "id": record.name,
            "flashcard": record.flashcard,
            "next_review": record.next_review_timestamp,
            "is_due": is_due
        })
    
    # Get topic names
    topic_names = {}
    for topic_id in topic_data.keys():
        topic_name = frappe.db.get_value("Topics", topic_id, "topic_name")
        topic_names[topic_id] = topic_name
    
    # Format response
    topics = []
    for topic_id, data in topic_data.items():
        topics.append({
            "topic_id": topic_id,
            "topic_name": topic_names.get(topic_id, "Unknown Topic"),
            "due_count": data["due_count"],
            "upcoming_count": data["upcoming_count"],
            "total_count": data["due_count"] + data["upcoming_count"],
            "cards": sorted(data["cards"], key=lambda x: x["next_review"])
        })
    
    # Sort by total count (highest first)
    topics.sort(key=lambda x: x["total_count"], reverse=True)
    
    # Calculate counts
    due_count = sum(topic["due_count"] for topic in topics)
    upcoming_count = sum(topic["upcoming_count"] for topic in topics)
    total_count = due_count + upcoming_count
    
    return {
        "success": True,
        "due_count": due_count,
        "upcoming_count": upcoming_count,
        "total_count": total_count,
        "topics": topics
    }

@frappe.whitelist()
def get_srs_review_cards():
    """
    Get flashcards due for review based on SRS algorithm
    
    Args from request:
        topic_name (str): Name of the topic
        
    Returns:
        dict: List of flashcards to review and stats
    """
    try:
        # Extract parameters from form_dict or JSON request
        if frappe.local.form_dict.get('topic_name'):
            topic_name = frappe.local.form_dict.get('topic_name')
            frappe.logger().debug(f"get_srs_review_cards: Got topic_name from form_dict: {topic_name}")
        else:
            # Try to get from JSON body
            try:
                request_json = frappe.request.get_json()
                topic_name = request_json.get('topic_name')
                frappe.logger().debug(f"get_srs_review_cards: Got topic_name from JSON: {topic_name}")
            except Exception as e:
                frappe.logger().error(f"get_srs_review_cards: Error getting JSON data: {str(e)}")
                frappe.throw(_("Topic name is required"))
        
        if not topic_name:
            frappe.logger().error("get_srs_review_cards: topic_name is missing")
            frappe.throw(_("Topic name is required"))
            
        user_id = get_current_user()
        frappe.logger().debug(f"get_srs_review_cards: User: {user_id}, Topic: {topic_name}")
        
        # Check if topic exists
        if not frappe.db.exists("Topics", topic_name):
            frappe.logger().error(f"get_srs_review_cards: Topic does not exist: {topic_name}")
            frappe.throw(_("Topic does not exist"))
        
        # Get user flashcard settings
        user_settings = get_user_flashcard_setting(user_id, topic_name)
        
        # Get all flashcards for this topic
        filters = {"topic": topic_name}
        
        # Apply flashcard type filter if specified
        if user_settings.get("study_exam_flashcard_type_filter") != "All":
            filters["flashcard_type"] = user_settings.get("study_exam_flashcard_type_filter")
        
        # Get all exam attempts for this topic and user
        exam_attempts = frappe.get_all(
            "User Exam Attempt", 
            filters={"user": user_id, "topic": topic_name},
            fields=["name"]
        )
        
        # If there are no exam attempts, return empty list with a specific message
        if not exam_attempts:
            return {
                "success": True,
                "cards": [],
                "stats": {
                    "new": 0,
                    "learning": 0,
                    "review": 0,
                    "lapsed": 0,
                    "total": 0,
                    "due": 0,
                },
                "message": "No exam attempts found. Please take an exam first to enable SRS."
            }
        
        # Get all self-assessed flashcards from exam attempts
        assessed_flashcards = []
        for attempt in exam_attempts:
            details = frappe.get_all(
                "User Exam Attempt Detail",
                filters={
                    "parent": attempt.name,
                    "user_self_assessment": ["!=", ""]  # Only include assessed cards
                },
                fields=["flashcard", "user_self_assessment"]
            )
            assessed_flashcards.extend(details)
        
        frappe.logger().debug(f"get_srs_review_cards: Found {len(assessed_flashcards)} assessed flashcards")
        
        # If no self-assessed flashcards, return empty list with message
        if not assessed_flashcards:
            frappe.logger().debug("get_srs_review_cards: No assessed flashcards found")
            return {
                "success": True,
                "cards": [],
                "stats": {
                    "new": 0,
                    "learning": 0,
                    "review": 0,
                    "lapsed": 0,
                    "total": 0,
                    "due": 0,
                },
                "no_assessments": True,
                "message": _("No self-assessed flashcards found. Please complete and assess flashcards in Exam Mode first.")
            }
        
        # Get unique flashcard names from assessed cards
        assessed_flashcard_names = list(set([detail.flashcard for detail in assessed_flashcards]))
        
        # Add filter to only include assessed flashcards
        filters["name"] = ["in", assessed_flashcard_names]
        
        all_flashcards = frappe.get_all(
            "Flashcard", 
            filters=filters,
            fields=["name", "question", "answer", "explanation", "flashcard_type", "hint"]
        )
        
        # Process additional data for specific flashcard types
        for flashcard in all_flashcards:
            if flashcard.get("flashcard_type") == "Ordering Steps":
                ordering_steps = frappe.get_all(
                    "Ordering Step Item",
                    filters={"parent": flashcard.get("name")},
                    fields=["step_content", "correct_order"],
                    order_by="correct_order"
                )
                flashcard["ordering_steps_items"] = ordering_steps
        
        # Get all progress records for these flashcards
        existing_progress = frappe.get_all(
            "User SRS Progress",
            filters={"user": user_id, "flashcard": ["in", [card.name for card in all_flashcards]]},
            fields=["flashcard", "status", "next_review_timestamp", "interval_days", "ease_factor", "repetitions", "learning_step"]
        )
        
        frappe.logger().debug(f"get_srs_review_cards: Found {len(existing_progress)} existing progress records")
        
        # Create a map for easier access
        progress_map = {p.flashcard: p for p in existing_progress}
        
        # Categorize cards
        now = now_datetime()
        frappe.logger().debug(f"get_srs_review_cards: Current timestamp for comparison: {now}")
        
        new_cards = []
        learning_cards = []
        review_cards = []
        lapsed_cards = []
        
        # Card counts
        total_counts = {
            "new": 0,
            "learning": 0,
            "review": 0,
            "lapsed": 0
        }
        
        # Cards due for review
        due_counts = {
            "new": 0,
            "learning": 0,
            "review": 0,
            "lapsed": 0
        }
        
        frappe.logger().debug(f"get_srs_review_cards: Starting card categorization for {len(all_flashcards)} flashcards")
        
        for card in all_flashcards:
            if card.name in progress_map:
                progress = progress_map[card.name]
                total_counts[progress.status] += 1
                
                # Check if due for review
                next_review_time = get_datetime(progress.next_review_timestamp)
                is_due = next_review_time <= now
                
                # TEMPORARY FIX: For learning cards, also include cards due within next 24 hours
                is_due_soon = False
                if progress.status == "learning":
                    next_24_hours = now + timedelta(hours=24)
                    is_due_soon = next_review_time <= next_24_hours
                
                frappe.logger().debug(f"get_srs_review_cards: Card {card.name} - Status: {progress.status}, Next review: {next_review_time}, Current time: {now}, Due: {is_due}, Due soon (24h): {is_due_soon}")
                
                if is_due or is_due_soon:
                    card_with_progress = card.copy()
                    card_with_progress["status"] = progress.status
                    card_with_progress["interval_days"] = progress.interval_days
                    card_with_progress["ease_factor"] = progress.ease_factor
                    card_with_progress["repetitions"] = progress.repetitions
                    card_with_progress["learning_step"] = progress.learning_step
                    
                    if progress.status == "learning":
                        learning_cards.append(card_with_progress)
                        due_counts["learning"] += 1
                    elif progress.status == "review":
                        review_cards.append(card_with_progress)
                        due_counts["review"] += 1
                    elif progress.status == "lapsed":
                        lapsed_cards.append(card_with_progress)
                        due_counts["lapsed"] += 1
            else:
                # New card
                card_with_status = card.copy()
                card_with_status["status"] = "new"
                new_cards.append(card_with_status)
                total_counts["new"] += 1
                frappe.logger().debug(f"get_srs_review_cards: Card {card.name} - New card added")
        
        frappe.logger().debug(f"get_srs_review_cards: Card categorization complete - New: {len(new_cards)}, Learning: {len(learning_cards)}, Review: {len(review_cards)}, Lapsed: {len(lapsed_cards)}")
        frappe.logger().debug(f"get_srs_review_cards: Due counts - New: {due_counts['new']}, Learning: {due_counts['learning']}, Review: {due_counts['review']}, Lapsed: {due_counts['lapsed']}")
        
        # Shuffle new cards for variety
        random.shuffle(new_cards)
        
        # Use all new cards instead of limiting them
        limited_new_cards = new_cards
        due_counts["new"] = len(limited_new_cards)
        
        # Apply card arrangement mode
        if user_settings.get("flashcard_arrange_mode") == "random":
            random.shuffle(learning_cards)
            random.shuffle(review_cards)
            random.shuffle(lapsed_cards)
        
        # Order: learning -> lapsed -> review -> new
        result_cards = learning_cards + lapsed_cards + review_cards + limited_new_cards
        
        # Total cards due
        total_due = sum(due_counts.values())
        
        frappe.logger().debug(f"get_srs_review_cards: Final result - Total cards: {len(result_cards)}, Total due: {total_due}")
        
        # Check for upcoming cards in the next 2 days
        upcoming_days = 2
        upcoming_date = add_days(now, upcoming_days)
        
        # Get count of upcoming cards 
        upcoming_cards_count = frappe.db.count(
            "User SRS Progress",
            filters={
                "user": user_id,
                "flashcard": ["in", [card.name for card in all_flashcards]],
                "next_review_timestamp": [">", now],
                "next_review_timestamp": ["<=", upcoming_date]
            }
        )
        
        frappe.logger().debug(f"get_srs_review_cards: Upcoming cards count: {upcoming_cards_count}")
        
        # Return stats and cards
        result = {
            "success": True,
            "cards": result_cards,
            "stats": {
                **total_counts,
                "total": sum(total_counts.values()),
                "due": total_due,
                "upcoming": upcoming_cards_count,
                "current_review": due_counts
            }
        }
        
        frappe.logger().debug(f"get_srs_review_cards: Returning result with {len(result['cards'])} cards and stats: {result['stats']}")
        
        return result
    
    except Exception as e:
        frappe.logger().error(f"get_srs_review_cards error: {str(e)}")
        return {
            "success": False,
            "message": str(e)
        }

@frappe.whitelist()
def update_srs_progress():
    """
    Update SRS progress based on user rating
    
    Args from request:
        flashcard_name (str): Name of the flashcard
        user_rating (str): User's rating (e.g., "correct", "wrong")
        
    Returns:
        dict: Updated SRS progress info
    """
    try:
        # Extract parameters from form_dict or JSON request
        if frappe.local.form_dict.get('flashcard_name') and frappe.local.form_dict.get('user_rating'):
            flashcard_name = frappe.local.form_dict.get('flashcard_name')
            user_rating = frappe.local.form_dict.get('user_rating')
            frappe.logger().debug(f"update_srs_progress: Got params from form_dict: flashcard={flashcard_name}, rating={user_rating}")
        else:
            # Try to get from JSON body
            try:
                request_json = frappe.request.get_json()
                flashcard_name = request_json.get('flashcard_name')
                user_rating = request_json.get('user_rating')
                frappe.logger().debug(f"update_srs_progress: Got params from JSON: flashcard={flashcard_name}, rating={user_rating}")
            except Exception as e:
                frappe.logger().error(f"update_srs_progress: Error getting JSON data: {str(e)}")
                frappe.throw(_("Required parameters are missing"))
        
        if not flashcard_name or not user_rating:
            frappe.logger().error("update_srs_progress: flashcard_name or user_rating is missing")
            frappe.throw(_("Flashcard name and user rating are required"))
        
        user_id = get_current_user()
        frappe.logger().debug(f"update_srs_progress: User: {user_id}, Flashcard: {flashcard_name}, Rating: {user_rating}")
        
        # Check if flashcard exists
        if not frappe.db.exists("Flashcard", flashcard_name):
            frappe.logger().error(f"update_srs_progress: Flashcard {flashcard_name} does not exist")
            frappe.throw(_("Flashcard does not exist"))
        
        # Map user ratings to internal ratings
        rating_map = {
            "wrong": "again",  # User got it wrong
            "again": "again",  # User got it wrong
            "hard": "hard",    # Remembered with difficulty
            "correct": "good", # User got it right
            "good": "good",    # User got it right
            "easy": "easy"     # User got it perfectly
        }
        
        # Standardize the rating
        internal_rating = rating_map.get(user_rating, "again")
        frappe.logger().debug(f"update_srs_progress: Mapped rating '{user_rating}' to internal rating '{internal_rating}'")
        
        # Quality scores for SM-2 algorithm (0-5)
        quality_scores = {
            "again": 0,  # Complete blackout
            "hard": 1,   # Correct but with serious difficulty
            "good": 3,   # Correct with some difficulty
            "easy": 5    # Perfect recall
        }
        
        quality = quality_scores.get(internal_rating, 0)
        
        # Get current timestamp
        now = now_datetime()
        
        # Default values for a new SRS progress
        defaults = {
            "status": "new",
            "interval_days": 0,
            "ease_factor": 2.5,
            "repetitions": 0,
            "learning_step": 0,
            "last_review_timestamp": now,
            "next_review_timestamp": now
        }
        
        # Find existing progress or create new
        progress_list = frappe.get_all(
            "User SRS Progress",
            filters={"user": user_id, "flashcard": flashcard_name},
            fields=["name"]
        )
        
        if progress_list:
            # Update existing progress
            frappe.logger().info(f"update_srs_progress: Updating existing SRS progress for {flashcard_name}")
            progress = frappe.get_doc("User SRS Progress", progress_list[0].name)
        else:
            # Create new progress
            frappe.logger().info(f"update_srs_progress: Creating new SRS progress for {flashcard_name}")
            progress = frappe.new_doc("User SRS Progress")
            progress.user = user_id
            progress.flashcard = flashcard_name
            for key, value in defaults.items():
                setattr(progress, key, value)
        
        # Current values
        status = progress.status
        interval = progress.interval_days
        ease_factor = progress.ease_factor
        repetitions = progress.repetitions
        learning_step = progress.learning_step
        
        frappe.logger().debug(f"update_srs_progress: Current values - status: {status}, interval: {interval}, ease_factor: {ease_factor}, repetitions: {repetitions}, learning_step: {learning_step}")
        
        # Update based on the SM-2 algorithm and card status
        if status == "new" or status == "learning":
            # Initial learning phase
            if internal_rating == "again":  # Failed
                status = "learning"
                learning_step = 0
                interval = 0  # Review again in the same session
            elif internal_rating == "hard":  # Hard but passed
                learning_step += 1
                if learning_step >= 2:  # Move to review after passing twice
                    status = "review"
                    repetitions = 1
                    interval = 1  # First interval is 1 day
                else:
                    status = "learning"
                    interval = 0.5  # 12 hours
            elif internal_rating == "good":  # Good
                learning_step += 1
                if learning_step >= 2:  # Move to review after passing twice
                    status = "review"
                    repetitions = 1
                    interval = 1  # First interval is 1 day
                else:
                    status = "learning"
                    interval = 0.25  # 6 hours
            elif internal_rating == "easy":  # Easy
                status = "review"
                repetitions = 1
                interval = 3  # Skip to 3 days for easy cards
        
        elif status == "review" or status == "lapsed":
            # Regular review phase (SM-2 algorithm)
            if internal_rating == "again":  # Failed review
                status = "lapsed"
                repetitions = 0
                learning_step = 0
                interval = 0  # Relearn immediately
            else:
                # Update ease factor based on quality
                ease_factor = max(1.3, ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))
                
                if internal_rating == "hard":
                    # Hard cards get a shorter interval
                    interval = max(1, interval * 1.2)
                elif internal_rating == "good":
                    # Standard interval increase
                    if repetitions == 0:
                        interval = 1
                    elif repetitions == 1:
                        interval = 3
                    else:
                        interval = interval * ease_factor
                elif internal_rating == "easy":
                    # Easy cards get a longer interval
                    if repetitions == 0:
                        interval = 3
                    else:
                        interval = interval * ease_factor * 1.3
                
                repetitions += 1
                status = "review"
        
        frappe.logger().debug(f"update_srs_progress: New values - status: {status}, interval: {interval}, ease_factor: {ease_factor}, repetitions: {repetitions}, learning_step: {learning_step}")
        
        # Update progress
        progress.status = status
        progress.interval_days = interval
        progress.ease_factor = ease_factor
        progress.repetitions = repetitions
        progress.learning_step = learning_step
        progress.last_review_timestamp = now
        
        # Calculate next review time based on interval
        if interval < 1:
            # Less than a day (convert to hours)
            hours = int(interval * 24)
            progress.next_review_timestamp = now + timedelta(hours=hours)
        else:
            # Days
            progress.next_review_timestamp = now + timedelta(days=int(interval))
        
        frappe.logger().info(f"update_srs_progress: Next review timestamp set to {progress.next_review_timestamp}")
        
        # Save the progress
        progress.save(ignore_permissions=True)
        frappe.db.commit()
        
        return {
            "success": True,
            "message": _("SRS progress updated successfully"),
            "progress": {
                "status": progress.status,
                "interval_days": progress.interval_days,
                "next_review": progress.next_review_timestamp,
                "ease_factor": progress.ease_factor,
                "repetitions": progress.repetitions
            }
        }
    except Exception as e:
        frappe.logger().error(f"update_srs_progress error: {str(e)}")
        return {
            "success": False,
            "message": str(e)
        }

def get_user_flashcard_setting(user_id, topic_name):
    """
    Helper function to get user flashcard settings
    
    Args:
        user_id (str): User ID
        topic_name (str): Topic name
        
    Returns:
        dict: User flashcard settings
    """
    settings_list = frappe.get_all(
        "User Flashcard Setting",
        filters={"user": user_id, "topic": topic_name},
        fields=["flashcard_arrange_mode", "flashcard_direction", "study_exam_flashcard_type_filter"]
    )
    
    if settings_list:
        return {
            "flashcard_arrange_mode": settings_list[0].flashcard_arrange_mode,
            "flashcard_direction": settings_list[0].flashcard_direction,
            "study_exam_flashcard_type_filter": settings_list[0].study_exam_flashcard_type_filter
        }
    else:
        return {
            "flashcard_arrange_mode": "chronological",
            "flashcard_direction": "front_first",
            "study_exam_flashcard_type_filter": "All"
        }

@frappe.whitelist()
def get_srs_time_by_month():
    """
    Lấy dữ liệu thời gian học SRS theo tháng trong năm
    
    Args from request:
        year (int, optional): Năm cần lấy dữ liệu, mặc định là năm hiện tại
        
    Returns:
        list: Danh sách thời gian học SRS theo tháng
    """
    try:
        # Extract parameters from form_dict or JSON request
        if frappe.local.form_dict.get('year'):
            year = frappe.local.form_dict.get('year')
            frappe.logger().debug(f"get_srs_time_by_month: Got year from form_dict: {year}")
        else:
            # Try to get from JSON body
            try:
                request_json = frappe.request.get_json()
                year = request_json.get('year')
                frappe.logger().debug(f"get_srs_time_by_month: Got year from JSON: {year}")
            except Exception as e:
                frappe.logger().debug(f"get_srs_time_by_month: Error getting JSON data: {str(e)}")
                year = None
        
        # Use current year if not provided
        if not year:
            year = getdate().year
            frappe.logger().debug(f"get_srs_time_by_month: Using current year: {year}")
            
        # Convert to int if it's a string
        if isinstance(year, str) and year.isdigit():
            year = int(year)
        
        user = get_current_user()
        frappe.logger().debug(f"get_srs_time_by_month: Getting SRS time for user: {user}, year: {year}")
        
        # Lấy dữ liệu từ User SRS Progress, tính tổng thời gian đã học theo tháng
        query = """
            SELECT 
                MONTH(last_review_timestamp) as month,
                SUM(total_time_spent_seconds) as time_spent
            FROM `tabUser SRS Progress` 
            WHERE user = %s 
            AND YEAR(last_review_timestamp) = %s
            GROUP BY MONTH(last_review_timestamp)
        """
        
        data = frappe.db.sql(query, (user, year), as_dict=True)
        frappe.logger().debug(f"get_srs_time_by_month: Retrieved {len(data)} month records")
        
        # Chuyển đổi thành định dạng cần thiết
        result = {}
        for item in data:
            result[item.month] = item.time_spent
        
        # Tạo kết quả cho tất cả 12 tháng
        formatted_result = []
        for month in range(1, 13):
            formatted_result.append({
                "month": month,
                "month_name": frappe.utils.formatdate(f"{year}-{month:02d}-01", "MMM"),
                "time_spent": result.get(month, 0)
            })
        
        frappe.logger().info(f"get_srs_time_by_month: Returning data for user {user}, year {year}")
        return formatted_result
    except Exception as e:
        frappe.logger().error(f"get_srs_time_by_month error: {str(e)}")
        return {
            "success": False, 
            "message": str(e)
        }

@frappe.whitelist()
def submit_srs_answer_and_get_feedback():
    """
    Submit an answer in SRS mode and get tutor-like feedback
    
    Args from request:
        flashcard_name (str): Name of the flashcard
        user_answer (str): User's answer
        previous_answers (list, optional): List of previous answers for this card
        
    Returns:
        dict: Feedback and detailed explanation
    """
    try:
        # Extract parameters
        if frappe.local.form_dict.get('flashcard_name') and frappe.local.form_dict.get('user_answer'):
            flashcard_name = frappe.local.form_dict.get('flashcard_name')
            user_answer = frappe.local.form_dict.get('user_answer')
            previous_answers = frappe.local.form_dict.get('previous_answers', [])
            frappe.logger().debug(f"submit_srs_answer_and_get_feedback: Got params from form_dict")
        else:
            try:
                request_json = frappe.request.get_json()
                flashcard_name = request_json.get('flashcard_name')
                user_answer = request_json.get('user_answer')
                previous_answers = request_json.get('previous_answers', [])
                frappe.logger().debug(f"submit_srs_answer_and_get_feedback: Got params from JSON")
            except Exception as e:
                frappe.logger().error(f"submit_srs_answer_and_get_feedback: Error getting JSON data: {str(e)}")
                frappe.throw(_("Required parameters are missing"))
        
        if not flashcard_name or not user_answer:
            frappe.logger().error("submit_srs_answer_and_get_feedback: flashcard_name or user_answer is missing")
            frappe.throw(_("Flashcard name and user answer are required"))
        
        user_id = get_current_user()
        
        # Get flashcard details
        flashcard = frappe.get_doc("Flashcard", flashcard_name)
        
        # Get API key
        api_key = frappe.conf.get("gemini_api_key")
        if not api_key:
            api_key = frappe.db.get_single_value("Elearning Settings", "gemini_api_key")
            
        if not api_key:
            return {
                "success": False,
                "message": "Gemini API key not configured"
            }
        
        api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        
        system_prompt = """
        Mình là một người bạn học cùng nhiệt tình và thấu hiểu. Mình sẽ giúp bạn phân tích câu trả lời và đưa ra những góp ý hữu ích.

        Mình sẽ phân tích câu trả lời theo các khía cạnh sau:
        1. Mức độ hiểu bài: Đánh giá sự hiểu biết của bạn về khái niệm/phương pháp
        2. Cách trình bày: Đánh giá logic, cấu trúc và sự rõ ràng trong cách trình bày
        3. Điểm mạnh: Nêu bật những điểm tốt trong cách giải của bạn
        4. Điểm cần cải thiện: Chỉ ra những điểm cần khắc phục một cách nhẹ nhàng
        5. Gợi ý cải thiện: Đưa ra các gợi ý cụ thể để bạn có thể cải thiện

        Lưu ý quan trọng:
        - Luôn bắt đầu bằng lời khen ngợi về nỗ lực của bạn
        - Sử dụng ngôn ngữ thân thiện, dễ hiểu
        - Tránh dùng từ ngữ tiêu cực
        - Kết thúc bằng lời động viên tích cực
        - Nếu bạn có nhiều lần thử, mình sẽ so sánh với các lần trước để chỉ ra sự tiến bộ
        - Sử dụng cú pháp LaTeX với \\( \\) cho công thức inline và \\[ \\] cho công thức standalone

        Phản hồi của mình sẽ có cấu trúc:
        1. Lời khen ngợi và ghi nhận nỗ lực
        2. Phân tích chi tiết câu trả lời
        3. Gợi ý cụ thể để cải thiện
        4. Lời động viên kết thúc

        QUAN TRỌNG: Phản hồi PHẢI bằng tiếng Việt và luôn xưng hô "mình - bạn".
        """
        
        user_prompt = f"""Câu hỏi: {flashcard.question}
Đáp án đúng: {flashcard.answer}
Câu trả lời hiện tại của học sinh: {user_answer}
"""

        if previous_answers and len(previous_answers) > 0:
            user_prompt += "\nCác lần trả lời trước đây:\n"
            for idx, prev_answer in enumerate(previous_answers):
                user_prompt += f"Lần {idx + 1}: {prev_answer}\n"

        if flashcard.flashcard_type == "Ordering Steps":
            correct_steps = frappe.get_all(
                "Ordering Step Item",
                filters={"parent": flashcard.name},
                fields=["step_content", "correct_order"],
                order_by="correct_order"
            )
            correct_steps_text = "\n".join([f"{idx+1}. {step.step_content}" for idx, step in enumerate(correct_steps)])
            user_prompt += f"\nThứ tự các bước đúng:\n{correct_steps_text}"
        
        payload = {
            "contents": [
                {"role": "user", "parts": [{"text": system_prompt}]},
                {"role": "user", "parts": [{"text": user_prompt}]}
            ],
            "generationConfig": {
                "temperature": 0.7,
                "topP": 0.8,
                "topK": 40,
                "maxOutputTokens": 1024
            }
        }
        
        try:
            response = requests.post(api_url, json=payload, timeout=30)
            if response.status_code == 200:
                data = response.json()
                feedback_text = (
                    data.get("candidates", [{}])[0]
                    .get("content", {})
                    .get("parts", [{}])[0]
                    .get("text", "")
                )
                
                # Clean up the feedback text
                feedback_text = clean_markdown_text(feedback_text)
                
                # Try to get detailed explanation from local function
                detailed_explanation = get_detailed_explanation(
                    flashcard_name=flashcard_name,
                    question=flashcard.question,
                    answer=flashcard.answer,
                    user_answer=user_answer,
                    flashcard_type=flashcard.flashcard_type
                )
                
                return {
                    "success": True,
                    "feedback": feedback_text,
                    "detailed_explanation": detailed_explanation.get("explanation") if detailed_explanation else flashcard.explanation
                }
            else:
                return {
                    "success": False,
                    "message": f"API Error: {response.status_code}"
                }
        except Exception as api_error:
            frappe.log_error(f"Gemini API error: {str(api_error)}", "SRS Feedback Generation Error")
            return {
                "success": False,
                "message": str(api_error)
            }
    
    except Exception as e:
        frappe.log_error(f"submit_srs_answer_and_get_feedback error: {str(e)}")
        return {
            "success": False,
            "message": str(e)
        }

def clean_markdown_text(text: str) -> str:
    """
    Làm sạch nội dung Markdown đơn giản (thường từ Gemini hoặc GPT) để hiển thị gọn gàng.
    Giữ lại cấu trúc danh sách và xuống dòng để tăng khả năng đọc.
    """
    if not text:
        return ""
    
    # Chuyển đổi markdown headings thành text in đậm với xuống dòng
    text = re.sub(r'^#{1,6}\s*(.+?)$', r'**\1**\n', text, flags=re.MULTILINE)
    
    # Loại bỏ các dấu * thừa và không đúng format
    # Xóa các dấu * đơn lẻ không có cặp
    text = re.sub(r'(?<!\*)\*(?!\*)', '', text)
    
    # Xóa các ** trống hoặc chỉ có khoảng trắng
    text = re.sub(r'\*\*\s*\*\*', '', text)
    text = re.sub(r'^\*\*\s*$', '', text, flags=re.MULTILINE)
    
    # Xóa các dấu ** đơn lẻ không có cặp (còn sót lại)
    text = re.sub(r'(?<!\*)\*\*(?!\*)', '', text)
    
    # Xóa các dấu * thừa ở đầu dòng không phải bullet point
    text = re.sub(r'^\*+\s*(?![^\n]*\*)', '', text, flags=re.MULTILINE)
    
    # Xóa các dấu * thừa ở cuối dòng
    text = re.sub(r'\*+\s*$', '', text, flags=re.MULTILINE)
    
    # Xóa các dấu * thừa giữa văn bản (không phải bold formatting)
    text = re.sub(r'(?<=\s)\*+(?=\s)', '', text)
    text = re.sub(r'(?<=\w)\*+(?=\w)', '', text)
    
    # Giữ lại cấu trúc danh sách số và bullet points
    # Chuyển đổi - thành •, giữ lại 1., 2., etc.
    text = re.sub(r'^[\s]*[-*+]\s+', '• ', text, flags=re.MULTILINE)
    text = re.sub(r'^[\s]*(\d+)\.\s+', r'\1. ', text, flags=re.MULTILINE)
    
    # Xóa các bullet points trống
    text = re.sub(r'^•\s*$', '', text, flags=re.MULTILINE)
    text = re.sub(r'^\d+\.\s*$', '', text, flags=re.MULTILINE)
    
    # Giữ lại xuống dòng quan trọng nhưng tránh xuống dòng không cần thiết
    text = re.sub(r'\n\s*\n\s*\n+', '\n\n', text)  # Loại bỏ nhiều dòng trống thừa
    
    # Xóa các markdown syntax không cần thiết khác
    text = re.sub(r'```[\w]*\n?', '', text)  # Xóa code blocks
    text = re.sub(r'`([^`]+)`', r'\1', text)  # Xóa inline code
    
    # Chuẩn hóa khoảng trắng nhưng giữ lại structure
    text = re.sub(r'[ \t]+', ' ', text)      # Loại bỏ khoảng trắng dư thừa
    text = re.sub(r' +\n', '\n', text)       # Loại bỏ khoảng trắng cuối dòng
    
    # Xóa các dòng trống chỉ có khoảng trắng
    text = re.sub(r'^\s*$', '', text, flags=re.MULTILINE)
    
    # Cải thiện logic nối dòng để tránh phá vỡ danh sách có số
    lines = text.split('\n')
    processed_lines = []
    
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if not line:
            processed_lines.append('')
            i += 1
            continue
        
        # Kiểm tra xem dòng hiện tại có phải là list item không
        is_current_list_item = (line.startswith('•') or re.match(r'^\d+\.', line) or line.startswith('**'))
        
        # Kiểm tra dòng tiếp theo (nếu có)
        is_next_list_item = False
        if i < len(lines) - 1:
            next_line = lines[i + 1].strip()
            is_next_list_item = (next_line.startswith('•') or re.match(r'^\d+\.', next_line) or next_line.startswith('**'))
        
        # Chỉ nối dòng khi:
        # 1. Dòng hiện tại không phải list item
        # 2. Dòng hiện tại không kết thúc bằng dấu câu
        # 3. Dòng tiếp theo không phải list item
        # 4. Dòng tiếp theo tồn tại và không rỗng
        if (i < len(lines) - 1 and 
            not is_current_list_item and
            not re.search(r'[.!?:]$', line) and 
            not is_next_list_item and
            lines[i + 1].strip()):
            
            # Nối với dòng tiếp theo
            next_line = lines[i + 1].strip()
            processed_lines.append(line + ' ' + next_line)
            i += 2  # Bỏ qua dòng tiếp theo vì đã được nối
        else:
            processed_lines.append(line)
            i += 1
    
    # Loại bỏ các dòng trống và tái tạo text
    text = '\n'.join([line for line in processed_lines if line.strip()])
    
    # Đảm bảo có xuống dòng sau các bullet points và numbered lists
    text = re.sub(r'(• .+?)([A-ZÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬĐÉÈẺẼẸÊẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴ])', r'\1\n\2', text)
    text = re.sub(r'(\d+\. .+?)([A-ZÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬĐÉÈẺẼẸÊẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴ])', r'\1\n\2', text)
    
    # Làm sạch cuối cùng - loại bỏ các dấu * còn sót lại
    text = re.sub(r'\*+', '', text)  # Loại bỏ tất cả dấu * còn lại
    
    # Loại bỏ các dòng trống liên tiếp ở đầu và cuối
    text = re.sub(r'^\n+', '', text)
    text = re.sub(r'\n+$', '', text)
    
    text = text.strip()
    return text


@frappe.whitelist(allow_guest=True)
def get_detailed_explanation(flashcard_name=None, question=None, answer=None, user_answer=None, flashcard_type=None, ai_feedback=None):
    """
    Get a detailed explanation for a flashcard answer using Gemini API
    """
    try:
        # Get flashcard details if not provided
        if flashcard_name and not (question and answer and flashcard_type):
            try:
                flashcard = frappe.get_doc("Flashcard", flashcard_name)
                question = flashcard.question
                answer = flashcard.answer
                flashcard_type = flashcard.flashcard_type
            except Exception as e:
                frappe.logger().error(f"Error fetching flashcard {flashcard_name}: {str(e)}")
                return {
                    "success": False,
                    "message": f"Could not fetch flashcard: {str(e)}",
                    "explanation": ""
                }
        
        # Get API key
        api_key = frappe.conf.get("gemini_api_key")
        if not api_key:
            api_key = frappe.db.get_single_value("Elearning Settings", "gemini_api_key")
            
        if not api_key:
            return {
                "success": False,
                "message": "Gemini API key not configured",
                "explanation": answer or "Không có lời giải"
            }
        
        api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
        
        # Prompt ngắn gọn hơn để tránh nội dung quá dài
        system_prompt = """
        Bạn là một gia sư toán học giỏi, hãy giải thích ngắn gọn và rõ ràng.

        Cấu trúc trả lời (tối đa 400 từ):
        1. Phân tích nhanh yêu cầu bài toán
        2. Các bước giải chính (2-3 bước)
        3. Kết luận ngắn gọn

        Lưu ý quan trọng:
        - Giải thích NGẮN GỌN, đi thẳng vào vấn đề
        - Sử dụng LaTeX: \\( \\) cho công thức inline, \\[ \\] cho công thức block
        - Tối đa 3-4 câu cho mỗi bước
        - Luôn kết thúc bằng dấu chấm hoặc cảm thán
        - Tránh lặp lại thông tin không cần thiết
        """
        
        user_prompt = f"""Câu hỏi: {question}
Đáp án: {answer}

Hãy giải thích ngắn gọn cách giải (tối đa 400 từ)."""

        if flashcard_type == "Ordering Steps" and flashcard_name:
            try:
                correct_steps = frappe.get_all(
                    "Ordering Step Item",
                    filters={"parent": flashcard_name},
                    fields=["step_content", "correct_order"],
                    order_by="correct_order"
                )
                steps_text = "\n".join([f"{idx+1}. {step.step_content}" for idx, step in enumerate(correct_steps)])
                user_prompt += f"\n\nCác bước đúng:\n{steps_text}"
            except Exception as e:
                frappe.logger().error(f"Error fetching ordering steps: {str(e)}")
        
        # Giảm maxOutputTokens để có nội dung ngắn gọn hơn
        payload = {
            "contents": [
                {"role": "user", "parts": [{"text": system_prompt}]},
                {"role": "user", "parts": [{"text": user_prompt}]}
            ],
            "generationConfig": {
                "temperature": 0.7,
                "topP": 0.8,
                "topK": 40,
                "maxOutputTokens": 600  # Giảm từ 1024 xuống 600
            }
        }
        
        # Gọi API để sinh explanation
        response = requests.post(api_url, json=payload, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('candidates') and len(data['candidates']) > 0:
                explanation_text = data['candidates'][0]['content']['parts'][0]['text']
                return {
                    "success": True,
                    "message": "Generated successfully",
                    "explanation": explanation_text.strip()
                }
            else:
                return {
                    "success": False,
                    "message": "No explanation generated by AI",
                    "explanation": answer or "Không có lời giải"
                }
        else:
            frappe.logger().error(f"Gemini API error: {response.status_code} - {response.text}")
            return {
                "success": False,
                "message": f"API error: {response.status_code}",
                "explanation": answer or "Không có lời giải"
            }
    
    except Exception as e:
        frappe.log_error(f"Error generating detailed explanation: {str(e)}", "Detailed Explanation Error")
        return {
            "success": False,
            "message": str(e),
            "explanation": answer or "Không có lời giải"
        }
