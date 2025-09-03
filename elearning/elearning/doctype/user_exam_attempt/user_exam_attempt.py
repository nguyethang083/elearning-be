# Copyright (c) 2025, Minh Quy and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import now_datetime, cint, flt, now, get_datetime, add_to_date
from datetime import timedelta
import json
import os
import requests
import time
import re
import random
#import google.generativeai as genai
#from google.generativeai.types import HarmCategory, HarmBlockThreshold

class UserExamAttempt(Document):
	def __init__(self, *args, **kwargs):
		super(UserExamAttempt, self).__init__(*args, **kwargs)
		self._original_completion_timestamp = None
		if self.get("name"):
			self._original_completion_timestamp = frappe.db.get_value("User Exam Attempt", self.name, "completion_timestamp")
	
	def validate(self):
		"""Validate exam attempt on saving"""
		self.validate_user()
		self.validate_topic()
		
	def validate_user(self):
		"""Ensure user exists"""
		if not frappe.db.exists("User", self.user):
			frappe.throw(_("User does not exist"))
	
	def validate_topic(self):
		"""Ensure topic exists"""
		if not frappe.db.exists("Topics", self.topic):
			frappe.throw(_("Topic does not exist"))
	
	def on_update(self):
		"""Actions to perform when the document is updated"""
		# Update statistics when completion_timestamp is set for the first time
		if self.completion_timestamp and not self._original_completion_timestamp:
			self.calculate_exam_statistics()
	
	def calculate_exam_statistics(self):
		"""Log completion of the exam attempt"""
		# Log completion for analytics
		frappe.logger().info(f"Exam completed: {self.name} by {self.user} for topic {self.topic}")
		
		# Get total number of questions for logging purposes
		total_questions = frappe.db.count("User Exam Attempt Detail", {"parent": self.name})
		frappe.logger().info(f"Total questions for attempt {self.name}: {total_questions}")
	
	def get_analytics(self):
		"""Return analytics data for this attempt"""
		analytics = {
			"total_questions": len(self.attempt_details) if self.attempt_details else 0,
			"completion_time": self.completion_timestamp,
			"topic": self.topic,
			"created": self.creation
		}
		
		# Add more analytics data as needed
		
		return analytics

def get_current_user():
	user = frappe.session.user
	if user == "Guest":
		frappe.throw(_("Authentication required."), frappe.AuthenticationError)
	return user

@frappe.whitelist()
def start_exam_attempt():
	"""
	Start a new exam attempt for a specific topic
	
	Args from request:
		topic_name (str): Name of the topic
		
	Returns:
		dict: Information about the created exam attempt
	"""
	try:
		# Extract parameters from form_dict or JSON request
		if frappe.local.form_dict.get('topic_name'):
			topic_name = frappe.local.form_dict.get('topic_name')
			frappe.logger().debug(f"start_exam_attempt: Got topic_name from form_dict: {topic_name}")
		else:
			# Try to get from JSON body
			try:
				request_json = frappe.request.get_json()
				topic_name = request_json.get('topic_name')
				frappe.logger().debug(f"start_exam_attempt: Got topic_name from JSON: {topic_name}")
			except Exception as e:
				frappe.logger().error(f"start_exam_attempt: Error getting JSON data: {str(e)}")
				frappe.throw(_("Topic name is required"))
		
		if not topic_name:
			frappe.logger().error("start_exam_attempt: topic_name is missing")
			frappe.throw(_("Topic name is required"))
		
		user_id = get_current_user()
		frappe.logger().debug(f"start_exam_attempt: User: {user_id}, Topic: {topic_name}")
		
		# Check if topic exists
		if not frappe.db.exists("Topics", topic_name):
			frappe.logger().error(f"start_exam_attempt: Topic does not exist: {topic_name}")
			frappe.throw(_("Topic does not exist"))
		
		# Get current user flashcard settings to determine if we should reuse existing attempts
		settings_list = frappe.get_all(
			"User Flashcard Setting",
			filters={"user": user_id, "topic": topic_name},
			fields=["flashcard_arrange_mode", "study_exam_flashcard_type_filter"]
		)
		
		current_flashcard_arrange_mode = "chronological"
		current_flashcard_type_filter = "All"
		
		if settings_list:
			current_flashcard_arrange_mode = settings_list[0].flashcard_arrange_mode
			current_flashcard_type_filter = settings_list[0].study_exam_flashcard_type_filter
		
		# Check for recent attempts within the last 5 minutes for the same topic and user
		recent_attempts = frappe.get_all(
			"User Exam Attempt",
			filters={
				"user": user_id,
				"topic": topic_name,
				"creation": [">=", frappe.utils.add_to_date(now(), minutes=-5)]
			},
			fields=["name", "start_time"],
			order_by="creation desc",
			limit=1
		)
		
		# If a recent attempt exists, check if it was created with the same settings
		if recent_attempts:
			existing_attempt = frappe.get_doc("User Exam Attempt", recent_attempts[0].name)
			
			# Get the flashcards that were used in the existing attempt
			detail_records = frappe.get_all(
				"User Exam Attempt Detail",
				filters={"parent": existing_attempt.name},
				fields=["flashcard"]
			)
			
			# Get the flashcard types from the existing attempt
			existing_flashcard_types = set()
			for detail in detail_records:
				flashcard_type = frappe.db.get_value("Flashcard", detail.flashcard, "flashcard_type")
				if flashcard_type:
					existing_flashcard_types.add(flashcard_type)
			
			# Get flashcards that would be included with current settings
			current_filters = {"topic": topic_name}
			if current_flashcard_type_filter != "All":
				current_filters["flashcard_type"] = current_flashcard_type_filter
			
			current_flashcards = frappe.get_all(
				"Flashcard",
				filters=current_filters,
				fields=["flashcard_type"]
			)
			
			current_flashcard_types = set()
			for flashcard in current_flashcards:
				if flashcard.flashcard_type:
					current_flashcard_types.add(flashcard.flashcard_type)
			
			# Check if the flashcard type composition has changed
			settings_changed = existing_flashcard_types != current_flashcard_types
			
			frappe.logger().info(f"start_exam_attempt: Settings comparison - existing types: {existing_flashcard_types}, current types: {current_flashcard_types}, changed: {settings_changed}")
			
			# Only reuse if settings haven't changed
			if not settings_changed:
				frappe.logger().info(f"start_exam_attempt: Found recent attempt {existing_attempt.name} with same settings, reusing")
				
				# Get flashcards for this attempt to maintain consistent behavior with new attempt creation
				flashcards = []
				for detail in detail_records:
					flashcard = frappe.get_doc("Flashcard", detail.flashcard)
					flashcard_data = {
						"name": flashcard.name,
						"question": flashcard.question,
						"answer": flashcard.answer,
						"explanation": flashcard.explanation,
						"flashcard_type": flashcard.flashcard_type,
						"hint": flashcard.hint
					}
					
					# Add ordering steps if applicable
					if flashcard.flashcard_type == "Ordering Steps":
						ordering_steps = frappe.get_all(
							"Ordering Step Item",
							filters={"parent": flashcard.name},
							fields=["step_content", "correct_order"],
							order_by="correct_order"
						)
						flashcard_data["ordering_steps_items"] = ordering_steps
					
					flashcards.append(flashcard_data)
				
				return {
					"success": True,
					"message": _("Using existing exam attempt"),
					"attempt": {
						"name": existing_attempt.name,
						"topic": existing_attempt.topic,
						"start_time": existing_attempt.start_time,
						"flashcards": flashcards
					}
				}
			else:
				frappe.logger().info(f"start_exam_attempt: Found recent attempt {existing_attempt.name} but settings changed, creating new attempt")

		# Get flashcards for this topic with current settings
		filters = {"topic": topic_name}
		
		# Apply flashcard type filter if specified
		if current_flashcard_type_filter != "All":
			filters["flashcard_type"] = current_flashcard_type_filter
		
		flashcards = frappe.get_all(
			"Flashcard",
			filters=filters,
			fields=["name", "question", "answer", "explanation", "flashcard_type", "hint"]
		)
		
		if not flashcards:
			frappe.throw(_("No flashcards found for this topic with current filter settings"))
		
		# Process additional data for specific flashcard types
		for flashcard in flashcards:
			if flashcard.get("flashcard_type") == "Ordering Steps":
				ordering_steps = frappe.get_all(
					"Ordering Step Item",
					filters={"parent": flashcard.get("name")},
					fields=["step_content", "correct_order"],
					order_by="correct_order"
				)
				flashcard["ordering_steps_items"] = ordering_steps
		
		# Shuffle flashcards if random mode is selected
		if current_flashcard_arrange_mode == "random":
			random.shuffle(flashcards)
		
		# Create exam attempt
		attempt = frappe.new_doc("User Exam Attempt")
		attempt.user = user_id
		attempt.topic = topic_name
		attempt.start_time = now()
		attempt.insert(ignore_permissions=True)
		
		# Create exam attempt details for each flashcard
		for flashcard in flashcards:
			detail = frappe.new_doc("User Exam Attempt Detail")
			detail.parent = attempt.name
			detail.parenttype = "User Exam Attempt"
			detail.parentfield = "attempt_details"
			detail.flashcard = flashcard.name if isinstance(flashcard, dict) else flashcard
			detail.user_answer = ""
			detail.user_self_assessment = "Chưa hiểu"
			detail.insert(ignore_permissions=True)
		
		frappe.db.commit()
		frappe.logger().info(f"start_exam_attempt: Created new exam attempt {attempt.name} for user {user_id} on topic {topic_name} with {len(flashcards)} flashcards")
		
		return {
			"success": True,
			"message": _("Exam attempt started successfully"),
			"attempt": {
				"name": attempt.name,
				"topic": attempt.topic,
				"start_time": attempt.start_time,
				"flashcards": flashcards
			}
		}
		
	except Exception as e:
		frappe.logger().error(f"start_exam_attempt error: {str(e)}")
		return {
			"success": False,
			"message": str(e)
		}

@frappe.whitelist()
def submit_exam_answer_and_get_feedback():
	"""
	Submit answer for a flashcard in an exam attempt and get AI feedback
	
	Args from request:
		attempt_name (str): Name of the exam attempt
		flashcard_name (str): Name of the flashcard
		user_answer (str): User's answer
		
	Returns:
		dict: Result with AI feedback
	"""
	try:
		# Extract parameters from form_dict or JSON request
		if frappe.local.form_dict.get('attempt_name') and frappe.local.form_dict.get('flashcard_name'):
			attempt_name = frappe.local.form_dict.get('attempt_name')
			flashcard_name = frappe.local.form_dict.get('flashcard_name')
			user_answer = frappe.local.form_dict.get('user_answer', '')
			frappe.logger().debug(f"submit_exam_answer_and_get_feedback: Got params from form_dict: attempt={attempt_name}, flashcard={flashcard_name}")
		else:
			# Try to get from JSON body
			try:
				request_json = frappe.request.get_json()
				attempt_name = request_json.get('attempt_name')
				flashcard_name = request_json.get('flashcard_name')
				user_answer = request_json.get('user_answer', '')
				frappe.logger().debug(f"submit_exam_answer_and_get_feedback: Got params from JSON: attempt={attempt_name}, flashcard={flashcard_name}")
			except Exception as e:
				frappe.logger().error(f"submit_exam_answer_and_get_feedback: Error getting JSON data: {str(e)}")
				frappe.throw(_("Required parameters are missing"))
		
		if not attempt_name or not flashcard_name:
			frappe.logger().error("submit_exam_answer_and_get_feedback: attempt_name or flashcard_name is missing")
			frappe.throw(_("Attempt name and flashcard name are required"))
		
		user_id = get_current_user()
		frappe.logger().debug(f"submit_exam_answer_and_get_feedback: User: {user_id}, Attempt: {attempt_name}, Flashcard: {flashcard_name}")
		
		# Check if attempt exists and belongs to user
		attempt = frappe.get_doc("User Exam Attempt", attempt_name)
		if attempt.user != user_id:
			frappe.logger().error(f"submit_exam_answer_and_get_feedback: Attempt {attempt_name} does not belong to user {user_id}")
			frappe.throw(_("This exam attempt does not belong to you"))
		
		if attempt.completion_timestamp:
			frappe.logger().error(f"submit_exam_answer_and_get_feedback: Attempt {attempt_name} is already completed")
			frappe.throw(_("This exam attempt is already completed"))
		
		# Check if flashcard exists
		if not frappe.db.exists("Flashcard", flashcard_name):
			frappe.logger().error(f"submit_exam_answer_and_get_feedback: Flashcard {flashcard_name} does not exist")
			frappe.throw(_("Flashcard does not exist"))
		
		flashcard = frappe.get_doc("Flashcard", flashcard_name)
		
		# Find the detail record
		detail_list = frappe.get_all(
			"User Exam Attempt Detail",
			filters={"parent": attempt_name, "flashcard": flashcard_name},
			fields=["name"]
		)
		
		if not detail_list:
			# Tạo mới User Exam Attempt Detail nếu không tìm thấy
			frappe.logger().info(f"submit_exam_answer_and_get_feedback: Creating new detail for attempt {attempt_name}, flashcard {flashcard_name}")
			detail = frappe.new_doc("User Exam Attempt Detail")
			detail.parent = attempt_name
			detail.parenttype = "User Exam Attempt"
			detail.parentfield = "attempt_details"
			detail.flashcard = flashcard_name
			detail.user_answer = ""
			# Lưu doc mới tạo
			detail.insert(ignore_permissions=True)
			frappe.db.commit()
		else:
			detail = frappe.get_doc("User Exam Attempt Detail", detail_list[0].name)
		
		# Save user answer
		frappe.logger().info(f"submit_exam_answer_and_get_feedback: Saving answer for flashcard {flashcard_name}, attempt {attempt_name}")
		detail.user_answer = user_answer
		
		# Generate AI feedback using Gemini
		ai_feedback = generate_ai_feedback(detail, user_answer)
		
		# Store feedback in the appropriate fields
		detail.ai_feedback_what_was_correct = ai_feedback.get("ai_feedback_what_was_correct", "")
		detail.ai_feedback_what_was_incorrect = ai_feedback.get("ai_feedback_what_was_incorrect", "")
		detail.ai_feedback_what_to_include = ai_feedback.get("ai_feedback_what_to_include", "")
		
		detail.save(ignore_permissions=True)
		frappe.db.commit()
		
		return {
			"success": True,
			"message": _("Answer submitted successfully"),
			"ai_feedback_what_was_correct": detail.ai_feedback_what_was_correct,
			"ai_feedback_what_was_incorrect": detail.ai_feedback_what_was_incorrect,
			"ai_feedback_what_to_include": detail.ai_feedback_what_to_include
		}
		
	except Exception as e:
		frappe.logger().error(f"submit_exam_answer_and_get_feedback error: {str(e)}")
		return {
			"success": False,
			"message": str(e)
		}

@frappe.whitelist()
def submit_self_assessment_and_init_srs():
	"""
	Submit self-assessment for a flashcard in an exam attempt and initialize SRS progress
	
	Args from request:
		attempt_name (str): Name of the exam attempt
		flashcard_name (str): Name of the flashcard
		self_assessment_value (str): Self-assessment value (one of: "Chưa hiểu", 
			"Mơ hồ", "Khá ổn", "Rất rõ")
		
	Returns:
		dict: Result of self-assessment and SRS initialization
	"""
	try:
		# Extract parameters from form_dict or JSON request
		if frappe.local.form_dict.get('attempt_name') and frappe.local.form_dict.get('flashcard_name'):
			attempt_name = frappe.local.form_dict.get('attempt_name')
			flashcard_name = frappe.local.form_dict.get('flashcard_name')
			self_assessment_value = frappe.local.form_dict.get('self_assessment_value')
			frappe.logger().debug(f"submit_self_assessment_and_init_srs: Got params from form_dict: attempt={attempt_name}, flashcard={flashcard_name}, assessment={self_assessment_value}")
		else:
			# Try to get from JSON body
			try:
				request_json = frappe.request.get_json()
				attempt_name = request_json.get('attempt_name')
				flashcard_name = request_json.get('flashcard_name')
				self_assessment_value = request_json.get('self_assessment_value')
				frappe.logger().debug(f"submit_self_assessment_and_init_srs: Got params from JSON: attempt={attempt_name}, flashcard={flashcard_name}, assessment={self_assessment_value}")
			except Exception as e:
				frappe.logger().error(f"submit_self_assessment_and_init_srs: Error getting JSON data: {str(e)}")
				return {
					"success": False,
					"message": "Required parameters are missing or invalid JSON format"
				}
		
		if not attempt_name or not flashcard_name or not self_assessment_value:
			frappe.logger().error("submit_self_assessment_and_init_srs: attempt_name, flashcard_name or self_assessment_value is missing")
			return {
				"success": False,
				"message": "Attempt name, flashcard name and self assessment value are required"
			}
	
		user_id = get_current_user()
		frappe.logger().debug(f"submit_self_assessment_and_init_srs: User: {user_id}, Attempt: {attempt_name}, Flashcard: {flashcard_name}")
	
		# Validate self_assessment_value
		valid_values = [
			"Chưa hiểu", 
			"Mơ hồ", 
			"Khá ổn", 
			"Rất rõ"
		]
	
		if self_assessment_value not in valid_values:
			frappe.logger().error(f"submit_self_assessment_and_init_srs: Invalid assessment value: '{self_assessment_value}'. Valid values: {valid_values}")
			return {
				"success": False,
				"message": f"Invalid self-assessment value: '{self_assessment_value}'. Valid values are: {', '.join(valid_values)}"
			}
	
		# Check if attempt exists and belongs to user
		try:
			attempt = frappe.get_doc("User Exam Attempt", attempt_name)
			if attempt.user != user_id:
					frappe.logger().error(f"submit_self_assessment_and_init_srs: Attempt {attempt_name} does not belong to user {user_id}")
					return {
						"success": False,
						"message": "This exam attempt does not belong to you"
					}
		except frappe.DoesNotExistError:
			frappe.logger().error(f"submit_self_assessment_and_init_srs: Attempt {attempt_name} does not exist")
			return {
				"success": False,
				"message": "Exam attempt does not exist"
			}
	
		# Check if flashcard exists
		if not frappe.db.exists("Flashcard", flashcard_name):
			frappe.logger().error(f"submit_self_assessment_and_init_srs: Flashcard {flashcard_name} does not exist")
			return {
				"success": False,
				"message": "Flashcard does not exist"
			}
	
		# Find the detail record
		detail_list = frappe.get_all(
			"User Exam Attempt Detail",
			filters={"parent": attempt_name, "flashcard": flashcard_name},
			fields=["name"]
		)
	
		if not detail_list:
			frappe.logger().error(f"submit_self_assessment_and_init_srs: Flashcard {flashcard_name} not found in attempt {attempt_name}")
			return {
				"success": False,
				"message": "This flashcard is not part of the exam attempt"
			}
	
		detail = frappe.get_doc("User Exam Attempt Detail", detail_list[0].name)
	
		# Update self-assessment
		frappe.logger().info(f"submit_self_assessment_and_init_srs: Updating self assessment for flashcard {flashcard_name} to {self_assessment_value}")
		detail.user_self_assessment = self_assessment_value
		
		# Generate and save detailed explanation if not already present
		if not detail.detailed_explanation:
			try:
				frappe.logger().info(f"submit_self_assessment_and_init_srs: Generating detailed explanation for flashcard {flashcard_name}")
				
				# Get flashcard data
				flashcard = frappe.get_doc("Flashcard", flashcard_name)
				
				# Prepare AI feedback data
				ai_feedback = {
					"ai_feedback_what_was_correct": detail.ai_feedback_what_was_correct,
					"ai_feedback_what_was_incorrect": detail.ai_feedback_what_was_incorrect,
					"ai_feedback_what_to_include": detail.ai_feedback_what_to_include
				}
				
				# Generate detailed explanation
				explanation_result = get_detailed_explanation(
					flashcard_name=flashcard_name,
					question=flashcard.question,
					answer=flashcard.answer,
					user_answer=detail.user_answer,
					flashcard_type=flashcard.flashcard_type,
					ai_feedback=ai_feedback
				)
				
				if explanation_result and explanation_result.get("success") and explanation_result.get("detailed_explanation"):
					detail.detailed_explanation = explanation_result["detailed_explanation"]
					frappe.logger().info(f"submit_self_assessment_and_init_srs: Generated detailed explanation for flashcard {flashcard_name}")
				else:
					frappe.logger().warning(f"submit_self_assessment_and_init_srs: Failed to generate detailed explanation for flashcard {flashcard_name}")
					
			except Exception as e:
				frappe.logger().error(f"submit_self_assessment_and_init_srs: Error generating detailed explanation for flashcard {flashcard_name}: {str(e)}")
		
		detail.save(ignore_permissions=True)
	
		# Check if all questions have self-assessment values and auto-complete if needed
		if not attempt.completion_timestamp:
			# Get total number of questions in the attempt
			total_questions = frappe.db.count("User Exam Attempt Detail", {"parent": attempt.name})
			
			# Count questions with self-assessment
			assessed_questions = frappe.db.count(
				"User Exam Attempt Detail", 
				{
					"parent": attempt.name, 
					"user_self_assessment": ["!=", ""],
					"user_self_assessment": ["is", "not null"]
				}
			)
			
			frappe.logger().debug(f"submit_self_assessment_and_init_srs: {assessed_questions}/{total_questions} questions have self-assessment for attempt {attempt.name}")
			
			# If all questions have self-assessment, auto-complete the attempt
			if assessed_questions >= total_questions:
				frappe.logger().info(f"submit_self_assessment_and_init_srs: Auto-completing attempt {attempt.name} (all questions assessed)")
				
				# Calculate time spent
				now_dt = get_datetime(now())
				duration_seconds = 0
				
				if attempt.start_time:
					start_time = get_datetime(attempt.start_time)
					duration_seconds = (now_dt - start_time).total_seconds()
				else:
					creation_time = get_datetime(attempt.creation)
					duration_seconds = (now_dt - creation_time).total_seconds()
				
				# Ensure valid duration
				if duration_seconds <= 0:
					duration_seconds = 60  # Default to 1 minute
				
				# Update completion data
				attempt.completion_timestamp = now_dt
				attempt.time_spent_seconds = duration_seconds
				attempt.save(ignore_permissions=True)
				
				frappe.logger().info(f"submit_self_assessment_and_init_srs: Attempt {attempt.name} completed with duration {duration_seconds}s")
	
		# Initialize or update SRS progress based on self-assessment
		# Map self-assessment values to SRS initial values
		srs_values = {
			"Chưa hiểu": {
				"status": "learning",
				"interval_days": 0.02,  # 30 minutes
				"ease_factor": 2.0,
				"repetitions": 0,
				"learning_step": 0
			},
			"Mơ hồ": {
				"status": "learning",
				"interval_days": 0.04,  # 1 hour
				"ease_factor": 2.3,
				"repetitions": 0,
				"learning_step": 1
			},
			"Khá ổn": {
				"status": "learning",
				"interval_days": 0.17,  # 4 hours  
				"ease_factor": 2.5,
				"repetitions": 1,
				"learning_step": 2
			},
			"Rất rõ": {
				"status": "review",
				"interval_days": 1,  # 1 day
				"ease_factor": 2.7,
				"repetitions": 1,
				"learning_step": 0
			}
		}
	
		# Get SRS values for this self-assessment
		srs_initial = srs_values.get(self_assessment_value)
	
		# Check if SRS progress already exists
		progress_list = frappe.get_all(
			"User SRS Progress",
			filters={"user": user_id, "flashcard": flashcard_name},
			fields=["name"]
		)
	
		now_dt = get_datetime(now())
		# Handle fractional days properly for short intervals
		interval_days = srs_initial["interval_days"]
		if interval_days < 1:
			# For fractional days, use timedelta for accurate calculation
			interval_seconds = interval_days * 24 * 60 * 60  # Convert days to seconds
			next_review = now_dt + timedelta(seconds=interval_seconds)
		else:
			# For whole days, use add_to_date
			next_review = add_to_date(now_dt, days=int(interval_days))
	
		if progress_list:
			# Update existing progress
			frappe.logger().info(f"submit_self_assessment_and_init_srs: Updating existing SRS progress for flashcard {flashcard_name}")
			progress = frappe.get_doc("User SRS Progress", progress_list[0].name)
			progress.status = srs_initial["status"]
			progress.interval_days = srs_initial["interval_days"]
			progress.ease_factor = srs_initial["ease_factor"]
			progress.repetitions = srs_initial["repetitions"]
			progress.learning_step = srs_initial["learning_step"]
			progress.last_review_timestamp = now_dt
			progress.next_review_timestamp = next_review
		else:
			# Create new progress
			frappe.logger().info(f"submit_self_assessment_and_init_srs: Creating new SRS progress for flashcard {flashcard_name}")
			progress = frappe.new_doc("User SRS Progress")
			progress.user = user_id
			progress.flashcard = flashcard_name
			progress.status = srs_initial["status"]
			progress.interval_days = srs_initial["interval_days"]
			progress.ease_factor = srs_initial["ease_factor"]
			progress.repetitions = srs_initial["repetitions"]
			progress.learning_step = srs_initial["learning_step"]
			progress.last_review_timestamp = now_dt
			progress.next_review_timestamp = next_review
	
		progress.save(ignore_permissions=True)
		frappe.db.commit()
	
		return {
			"success": True,
			"message": _("Self-assessment submitted and SRS progress initialized"),
			"self_assessment": self_assessment_value,
			"srs_progress": {
				"status": progress.status,
				"interval_days": progress.interval_days,
				"next_review": progress.next_review_timestamp
			}
		}
	except Exception as e:
		frappe.logger().error(f"submit_self_assessment_and_init_srs error: {str(e)}")
		return {
			"success": False,
			"message": str(e)
		}

@frappe.whitelist()
def complete_exam_attempt():
	"""
	Complete an exam attempt
	
	Args from request:
		attempt_name (str): Name of the exam attempt
		
	Returns:
		dict: Result of completing the exam attempt
	"""
	try:
		# Extract parameters from form_dict or JSON request
		if frappe.local.form_dict.get('attempt_name'):
			attempt_name = frappe.local.form_dict.get('attempt_name')
			frappe.logger().debug(f"complete_exam_attempt: Got param from form_dict: attempt={attempt_name}")
		else:
			# Try to get from JSON body
			try:
				request_json = frappe.request.get_json()
				attempt_name = request_json.get('attempt_name')
				frappe.logger().debug(f"complete_exam_attempt: Got param from JSON: attempt={attempt_name}")
			except Exception as e:
				frappe.logger().error(f"complete_exam_attempt: Error getting JSON data: {str(e)}")
				frappe.throw(_("Required parameter is missing"))
		
		if not attempt_name:
			frappe.logger().error("complete_exam_attempt: attempt_name is missing")
			frappe.throw(_("Attempt name is required"))
		
		user_id = get_current_user()
		frappe.logger().debug(f"complete_exam_attempt: User: {user_id}, Attempt: {attempt_name}")
	
		# Check if attempt exists and belongs to user
		attempt = frappe.get_doc("User Exam Attempt", attempt_name)
		if attempt.user != user_id:
			frappe.logger().error(f"complete_exam_attempt: Attempt {attempt_name} does not belong to user {user_id}")
			frappe.throw(_("This exam attempt does not belong to you"))
	
		# Check if attempt is already completed
		if attempt.completion_timestamp:
			frappe.logger().warning(f"complete_exam_attempt: Attempt {attempt_name} is already completed")
			return {
				"success": True,
				"message": _("This exam attempt is already completed"),
				"attempt": attempt.as_dict()
			}
		
		# Get all flashcards for this attempt
		detail_records = frappe.get_all(
			"User Exam Attempt Detail",
			filters={"parent": attempt.name},
			fields=["name", "flashcard", "user_answer"]
		)
		
		# Count total flashcards
		flashcards_count = len(detail_records)
		
		# Update attempt with completion data
		now_dt = get_datetime(now())
		
		# Calculate time spent properly
		duration_seconds = 0
		if attempt.start_time:
			start_time = get_datetime(attempt.start_time)
			duration_seconds = (now_dt - start_time).total_seconds()
			frappe.logger().debug(f"complete_exam_attempt: Calculated duration from start_time: {duration_seconds}s")
		else:
			# Fallback to creation time if start_time is not set
			creation_time = get_datetime(attempt.creation)
			duration_seconds = (now_dt - creation_time).total_seconds()
			frappe.logger().debug(f"complete_exam_attempt: Calculated duration from creation: {duration_seconds}s")
		
		# Ensure we have a valid duration
		if duration_seconds <= 0:
			duration_seconds = 60  # Default to 1 minute if calculation results in 0 or negative
			frappe.logger().warning(f"complete_exam_attempt: Invalid duration calculated, using default: {duration_seconds}s")
		
		# Format for logging
		mins = int(duration_seconds / 60)
		secs = int(duration_seconds % 60)
		formatted_time = f"{mins}m {secs}s"
		
		attempt.completion_timestamp = now_dt
		attempt.time_spent_seconds = duration_seconds
		
		frappe.logger().info(f"complete_exam_attempt: Completing attempt {attempt_name} with {flashcards_count} flashcards, time {formatted_time}")
		attempt.save(ignore_permissions=True)
	
		# Double-check that time_spent_seconds was saved correctly
		saved_attempt = frappe.get_doc("User Exam Attempt", attempt_name)
		if saved_attempt.time_spent_seconds != duration_seconds:
			frappe.logger().warning(f"complete_exam_attempt: time_spent_seconds wasn't saved correctly. Expected: {duration_seconds}, Actual: {saved_attempt.time_spent_seconds}")
			# Try to update it directly with db.set_value
			frappe.db.set_value("User Exam Attempt", attempt_name, "time_spent_seconds", duration_seconds)
			frappe.logger().info(f"complete_exam_attempt: Updated time_spent_seconds directly via db.set_value")
		
		frappe.db.commit()
	
		return {
			"success": True,
			"message": _("Exam attempt completed successfully"),
			"attempt": attempt.as_dict()
		}
	except Exception as e:
		frappe.logger().error(f"complete_exam_attempt error: {str(e)}")
		return {
			"success": False,
			"message": str(e)
		}

@frappe.whitelist()
def get_exam_attempt_details():
	"""
	Get details of an exam attempt
	
	Args from request:
		attempt_name (str): Name of the exam attempt
		
	Returns:
		dict: Detailed information about the exam attempt
	"""
	try:
		# Extract parameters from form_dict or JSON request
		if frappe.local.form_dict.get('attempt_name'):
			attempt_name = frappe.local.form_dict.get('attempt_name')
			frappe.logger().debug(f"get_exam_attempt_details: Got param from form_dict: attempt={attempt_name}")
		else:
			# Try to get from JSON body
			try:
				request_json = frappe.request.get_json()
				attempt_name = request_json.get('attempt_name')
				frappe.logger().debug(f"get_exam_attempt_details: Got param from JSON: attempt={attempt_name}")
			except Exception as e:
				frappe.logger().error(f"get_exam_attempt_details: Error getting JSON data: {str(e)}")
				frappe.throw(_("Required parameter 'attempt_name' is missing"))
		
		if not attempt_name:
			frappe.logger().error("get_exam_attempt_details: attempt_name is missing")
			frappe.throw(_("Attempt name is required"))
			
		user_id = get_current_user()
		frappe.logger().debug(f"get_exam_attempt_details: User: {user_id}, Attempt: {attempt_name}")
	
		# Check if attempt exists and belongs to user
		attempt = frappe.get_doc("User Exam Attempt", attempt_name)
		if attempt.user != user_id:
			frappe.throw(_("This exam attempt does not belong to you"))
	
		# Get all flashcards
		detail_records = frappe.get_all(
			"User Exam Attempt Detail",
			filters={"parent": attempt_name},
			fields=["name", "flashcard", "user_answer", "ai_feedback_what_was_correct", "ai_feedback_what_was_incorrect", "ai_feedback_what_to_include", "user_self_assessment", "detailed_explanation"]
		)
	
		# Get all flashcard details
		details = []
		for record in detail_records:
			flashcard = frappe.get_doc("Flashcard", record.flashcard)
			
			detail_data = {
				"name": record.name,
				"flashcard": record.flashcard,
				"question": flashcard.question,
				"answer": flashcard.answer,
				"explanation": flashcard.explanation,
				"flashcard_type": flashcard.flashcard_type,
				"user_answer": record.user_answer,
				"ai_feedback_what_was_correct": record.ai_feedback_what_was_correct,
				"ai_feedback_what_was_incorrect": record.ai_feedback_what_was_incorrect,
				"ai_feedback_what_to_include": record.ai_feedback_what_to_include,
				"user_self_assessment": record.user_self_assessment,
				"detailed_explanation": record.detailed_explanation,
				"hint": flashcard.hint
			}
			
			# Add ordering steps if applicable
			if flashcard.flashcard_type == "Ordering Steps":
				ordering_steps = frappe.get_all(
					"Ordering Step Item",
					filters={"parent": flashcard.name},
					fields=["step_content", "correct_order"],
					order_by="correct_order"
				)
				detail_data["ordering_steps_items"] = ordering_steps
			
			details.append(detail_data)
	
		# Calculate time spent properly
		time_spent_secs = 0
		if attempt.time_spent_seconds and attempt.time_spent_seconds > 0:
			time_spent_secs = attempt.time_spent_seconds
			frappe.logger().debug(f"get_exam_attempt_details: Using stored time_spent_seconds: {time_spent_secs}")
		elif attempt.start_time and attempt.completion_timestamp:
			# Calculate duration between start_time and completion_timestamp
			start_time = get_datetime(attempt.start_time)
			end_time = get_datetime(attempt.completion_timestamp)
			time_spent_secs = (end_time - start_time).total_seconds()
			frappe.logger().debug(f"get_exam_attempt_details: Calculated duration from start_time and completion_timestamp: {time_spent_secs}s")
			
			# Update the attempt with the calculated time if it's not already set
			if not attempt.time_spent_seconds:
				try:
					frappe.db.set_value("User Exam Attempt", attempt.name, "time_spent_seconds", time_spent_secs)
					frappe.logger().debug(f"get_exam_attempt_details: Updated time_spent_seconds for attempt {attempt.name}: {time_spent_secs}s")
				except Exception as e:
					frappe.logger().error(f"get_exam_attempt_details: Error updating time_spent_seconds: {str(e)}")
		elif attempt.creation and attempt.completion_timestamp:
			# Fallback to creation time if start_time is not set
			creation_time = get_datetime(attempt.creation)
			end_time = get_datetime(attempt.completion_timestamp)
			time_spent_secs = (end_time - creation_time).total_seconds()
			frappe.logger().debug(f"get_exam_attempt_details: Calculated duration from creation and completion_timestamp: {time_spent_secs}s")
		
		# Ensure we have a valid duration
		if time_spent_secs <= 0:
			time_spent_secs = 60  # Default to 1 minute if calculation results in 0 or negative
			frappe.logger().warning(f"get_exam_attempt_details: Invalid duration calculated, using default: {time_spent_secs}s")
	
		# Format time spent in a readable format
		time_spent_mins = int(time_spent_secs / 60)
		time_spent_secs_remainder = int(time_spent_secs % 60)
		formatted_time = f"{time_spent_mins}m {time_spent_secs_remainder}s"
	
		# Get topic name
		topic_name = frappe.db.get_value("Topics", attempt.topic, "topic_name")
	
		return {
			"success": True,
			"attempt": {
				"name": attempt.name,
				"topic": attempt.topic,
				"topic_name": topic_name,
				"start_time": attempt.start_time,
				"completion_timestamp": attempt.completion_timestamp,
				"total_questions": len(details),
				"time_spent_seconds": time_spent_secs,
				"formatted_time": formatted_time,
				"details": details
			}
		}
	except Exception as e:
		frappe.logger().error(f"get_exam_attempt_details error: {str(e)}")
		return {
			"success": False,
			"message": str(e)
		}

@frappe.whitelist()
def get_user_exam_history():
	"""
	Get exam history for the current user
	Returns:
		dict: Exam history data with statistics
	"""
	user_id = get_current_user()
	
	try:
		# Extract parameters from form_dict or JSON request
		topic_name = None
		if frappe.local.form_dict.get('topic_name'):
			topic_name = frappe.local.form_dict.get('topic_name')
		else:
			# Try to get from JSON body
			try:
				request_json = frappe.request.get_json()
				topic_name = request_json.get('topic_name')
			except Exception:
				pass  # topic_name is optional
		
		filters = {"user": user_id}
		if topic_name:
			filters["topic"] = topic_name
		
		# Get all exam attempts for the user (optionally filtered by topic)
		exam_attempts = frappe.get_all(
			"User Exam Attempt",
			filters=filters,
			fields=[
				"name", "topic", "start_time", "completion_timestamp", "creation"
			],
			order_by="creation desc"
		)
		
		# Process each attempt to get additional information
		processed_attempts = []
		for attempt in exam_attempts:
			# Get topic information
			if attempt.topic:
				try:
					topic_doc = frappe.get_doc("Topics", attempt.topic)
					attempt["topic_name"] = topic_doc.topic_name
				except:
					attempt["topic_name"] = attempt.topic
			
			# Get attempt details count
			details_count = frappe.db.count("User Exam Attempt Detail", {"parent": attempt.name})
			attempt["total_questions"] = details_count
			
			# Check if attempt has at least one answered question
			answered_questions_count = frappe.db.count(
				"User Exam Attempt Detail", 
				{
					"parent": attempt.name,
					"user_answer": ["!=", ""]
				}
			)
			
			# Calculate time spent if available
			if attempt.start_time and attempt.completion_timestamp:
				start_time = frappe.utils.get_datetime(attempt.start_time)
				end_time = frappe.utils.get_datetime(attempt.completion_timestamp)
				time_diff = end_time - start_time
				time_spent_seconds = int(time_diff.total_seconds())
				
				# Format time
				mins = time_spent_seconds // 60
				secs = time_spent_seconds % 60
				attempt["formatted_time"] = f"{mins}m {secs}s"
				attempt["time_spent_seconds"] = time_spent_seconds
			else:
				attempt["formatted_time"] = "N/A"
				attempt["time_spent_seconds"] = 0
			
			# Only include attempts that have at least one answered question
			if answered_questions_count > 0:
				processed_attempts.append(attempt)
		
		# Calculate overall statistics
		total_attempts = len(processed_attempts)
		completed_attempts = len([a for a in processed_attempts if a.completion_timestamp])
		
		stats = {
			"total_attempts": total_attempts,
			"completed_attempts": completed_attempts,
			"completion_rate": round((completed_attempts / total_attempts * 100), 2) if total_attempts > 0 else 0
		}
		
		return {
			"success": True,
			"attempts": processed_attempts,
			"statistics": stats
		}
		
	except Exception as e:
		frappe.logger().error(f"Error in get_user_exam_history: {str(e)}")
		return {
			"success": False,
			"message": _("Error retrieving exam history: {0}").format(str(e)),
			"attempts": [],
			"statistics": {}
		}

@frappe.whitelist()
def get_exam_attempts_by_topic():
	"""
	Get exam attempts for the current user filtered by topic
	
	Args from request:
		topic_id (str): ID of the topic
		
	Returns:
		list: List of exam attempts for the specified topic
	"""
	try:
		# Extract parameters from form_dict or JSON request
		if frappe.local.form_dict.get('topic_id'):
			topic_id = frappe.local.form_dict.get('topic_id')
		else:
			# Try to get from JSON body
			try:
				request_json = frappe.request.get_json()
				topic_id = request_json.get('topic_id')
			except Exception:
				frappe.throw(_("Topic ID is required"))
		
		if not topic_id:
			frappe.throw(_("Topic ID is required"))
		
		user_id = get_current_user()
		
		# Convert topic_id to topic name for database query
		topic_doc = frappe.get_doc("Topics", {"id": cint(topic_id)})
		if not topic_doc:
			frappe.throw(_("Topic not found"))
		
		topic_name = topic_doc.name
		
		# Get exam attempts for this user and topic
		exam_attempts = frappe.get_all(
			"User Exam Attempt",
			filters={
				"user": user_id,
				"topic": topic_name
			},
			fields=[
				"name", "topic", "start_time", "completion_timestamp", "creation"
			],
			order_by="creation desc"
		)
		
		# Process each attempt to get additional information
		processed_attempts = []
		for attempt in exam_attempts:
			# Add topic information
			attempt["topic_name"] = topic_doc.topic_name
			
			# Get attempt details count
			details_count = frappe.db.count("User Exam Attempt Detail", {"parent": attempt.name})
			attempt["total_questions"] = details_count
			
			# Check if attempt has at least one answered question
			answered_questions_count = frappe.db.count(
				"User Exam Attempt Detail",
				{
					"parent": attempt.name,
					"user_answer": ["!=", ""]
				}
			)
			
			# Calculate time spent if available
			if attempt.start_time and attempt.completion_timestamp:
				start_time = frappe.utils.get_datetime(attempt.start_time)
				end_time = frappe.utils.get_datetime(attempt.completion_timestamp)
				time_diff = end_time - start_time
				time_spent_seconds = int(time_diff.total_seconds())
				
				# Format time
				mins = time_spent_seconds // 60
				secs = time_spent_seconds % 60
				attempt["formatted_time"] = f"{mins}m {secs}s"
				attempt["time_spent_seconds"] = time_spent_seconds
			else:
				attempt["formatted_time"] = "N/A"
				attempt["time_spent_seconds"] = 0
			
			# Only include attempts that have at least one answered question
			if answered_questions_count > 0:
				processed_attempts.append(attempt)
		
		return processed_attempts
	
	except Exception as e:
		frappe.logger().error(f"Error in get_exam_attempts_by_topic: {str(e)}")
		return []

def generate_ai_feedback(detail, user_answer):
    """
    Generate AI feedback for a flashcard answer using Gemini API (HTTP request)
    """
    try:
        # Lấy thông tin flashcard từ detail
        flashcard = frappe.get_doc("Flashcard", detail.flashcard)

        api_key = frappe.conf.get("gemini_api_key")
        if not api_key:
            api_key = frappe.db.get_single_value("Elearning Settings", "gemini_api_key")
            
        if not api_key:
            return {
                "ai_feedback_what_was_correct": "Chức năng phản hồi AI không khả dụng.",
                "ai_feedback_what_was_incorrect": "Vui lòng cấu hình Gemini API key trong site_config.json hoặc Elearning Settings.",
                "ai_feedback_what_to_include": "Liên hệ quản trị viên để được hỗ trợ."
            }
        
        api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        
        system_prompt = """
        Bạn là trợ lý AI giáo dục phân tích câu trả lời của học sinh.
        Hãy cung cấp phản hồi cụ thể, mang tính xây dựng về câu trả lời của học sinh so với câu trả lời đúng.
        
        Phản hồi của bạn nên được chia thành ba phần rõ ràng:
        1. Phần đúng: Nêu bật những khía cạnh cụ thể mà học sinh đã làm đúng
        2. Phần chưa đúng: Xác định những lỗi cụ thể hoặc hiểu sai
        3. Phần nên bổ sung: Đề xuất cải tiến cụ thể hoặc thông tin bổ sung
        
        Mỗi phần nên ngắn gọn (2-4 câu). Hãy cụ thể và mang tính giáo dục thay vì chỉ đơn thuần nêu đúng/sai.
        Phản hồi nên giúp học sinh hiểu khái niệm tốt hơn.
        
        Khi cần sử dụng công thức toán học, hãy sử dụng cú pháp LaTeX với \\( \\) cho công thức inline và \\[ \\] cho công thức standalone.
        Ví dụ: "Để tính đạo hàm, ta áp dụng công thức \\( f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h} \\)"
        
        Nếu không thể tạo phản hồi do lỗi, hãy cung cấp thông báo lỗi đơn giản.
        
        QUAN TRỌNG: Phản hồi của bạn PHẢI bằng tiếng Việt.
        """
        
        user_prompt = ""
        if flashcard.flashcard_type == "Concept/Theorem/Formula":
            user_prompt = f"""Câu hỏi: {flashcard.question}
Đáp án đúng: {flashcard.answer}
Câu trả lời của học sinh: {user_answer}

Đây là câu hỏi về khái niệm/định lý/công thức. Hãy đánh giá câu trả lời của học sinh so với đáp án đúng."""
        elif flashcard.flashcard_type == "Fill in the Blank":
            user_prompt = f"""Câu hỏi: {flashcard.question}
Đáp án đúng: {flashcard.answer}
Câu trả lời của học sinh: {user_answer}

Đây là câu hỏi điền vào chỗ trống. Hãy đánh giá câu trả lời của học sinh so với đáp án đúng."""
        elif flashcard.flashcard_type == "Ordering Steps":
            correct_steps = frappe.get_all(
                "Ordering Step Item",
                filters={"parent": flashcard.name},
                fields=["step_content", "correct_order"],
                order_by="correct_order"
            )
            correct_steps_text = "\n".join([f"{idx+1}. {step.step_content}" for idx, step in enumerate(correct_steps)])
            user_prompt = f"""Câu hỏi: {flashcard.question}
Thứ tự các bước đúng:
{correct_steps_text}
Câu trả lời của học sinh: {user_answer}

Đây là câu hỏi sắp xếp các bước theo thứ tự đúng. Hãy đánh giá câu trả lời của học sinh."""
        elif flashcard.flashcard_type == "What's the Next Step?":
            user_prompt = f"""Câu hỏi: {flashcard.question}
Bước tiếp theo đúng: {flashcard.answer}
Câu trả lời của học sinh: {user_answer}

Đây là câu hỏi về bước tiếp theo trong giải quyết vấn đề. Hãy đánh giá liệu học sinh đã xác định đúng bước tiếp theo chưa."""
        elif flashcard.flashcard_type == "Short Answer/Open-ended":
            user_prompt = f"""Câu hỏi: {flashcard.question}
Đáp án mẫu: {flashcard.answer}
Câu trả lời của học sinh: {user_answer}

Đây là câu hỏi mở. Hãy đánh giá câu trả lời của học sinh so với đáp án mẫu, xem xét các cách tiếp cận thay thế hợp lệ."""
        elif flashcard.flashcard_type == "Identify the Error":
            user_prompt = f"""Câu hỏi: {flashcard.question}
Cách xác định lỗi đúng: {flashcard.answer}
Câu trả lời của học sinh: {user_answer}

Đây là câu hỏi xác định lỗi. Hãy đánh giá liệu học sinh đã xác định đúng lỗi chưa."""
        else:
            user_prompt = f"""Câu hỏi: {flashcard.question}
Đáp án đúng: {flashcard.answer}
Câu trả lời của học sinh: {user_answer}

Hãy đánh giá câu trả lời của học sinh so với đáp án đúng."""
        
        payload = {
            "contents": [
                {"role": "user", "parts": [{"text": system_prompt}]},
                {"role": "user", "parts": [{"text": user_prompt}]}
            ],
            "generationConfig": {
                "temperature": 0.2,
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
                
                what_was_correct = ""
                what_was_incorrect = ""
                what_to_include = ""
                
                if "Phần đúng" in feedback_text:
                    sections = feedback_text.split("Phần")
                    for section in sections:
                        if section.strip().startswith("đúng"):
                            next_heading_pos = section.find("Phần", 10)
                            if next_heading_pos > 0:
                                what_was_correct = section[5:next_heading_pos].strip()
                            else:
                                what_was_correct = section[5:].strip()
                        elif section.strip().startswith("chưa đúng"):
                            next_heading_pos = section.find("Phần", 10)
                            if next_heading_pos > 0:
                                what_was_incorrect = section[10:next_heading_pos].strip()
                            else:
                                what_was_incorrect = section[10:].strip()
                
                if "Phần nên bổ sung" in feedback_text:
                    what_to_include_pos = feedback_text.find("Phần nên bổ sung")
                    if what_to_include_pos > 0:
                        what_to_include = feedback_text[what_to_include_pos + 16:].strip()
                
                if not what_was_correct and not what_was_incorrect and not what_to_include:
                    return {
                        "ai_feedback_what_was_correct": "Chúng tôi gặp khó khăn khi phân tích phản hồi AI.",
                        "ai_feedback_what_was_incorrect": "Phản hồi đầy đủ: " + feedback_text,
                        "ai_feedback_what_to_include": "Vui lòng thử lại hoặc kiểm tra định dạng câu trả lời của bạn."
                    }
                
                what_was_correct = what_was_correct.strip()
                what_was_incorrect = what_was_incorrect.strip()
                what_to_include = what_to_include.strip()
                
                # Clean up special formatting characters
                what_was_correct = clean_ai_text(what_was_correct)
                what_was_incorrect = clean_ai_text(what_was_incorrect)
                what_to_include = clean_ai_text(what_to_include)
                
                return {
                    "ai_feedback_what_was_correct": what_was_correct or "Không có phần nào được xác định là đúng.",
                    "ai_feedback_what_was_incorrect": what_was_incorrect or "Không có phần nào được xác định là chưa đúng.",
                    "ai_feedback_what_to_include": what_to_include or "Không có đề xuất cụ thể cho việc cải thiện."
                }
            else:
                return {
                    "ai_feedback_what_was_correct": "Không thể kết nối tới Gemini API.",
                    "ai_feedback_what_was_incorrect": f"Lỗi HTTP: {response.status_code} - {response.text}",
                    "ai_feedback_what_to_include": "Vui lòng thử lại sau hoặc liên hệ hỗ trợ."
                }
        except Exception as api_error:
            frappe.log_error(f"Gemini API error: {str(api_error)}", "AI Feedback Generation Error")
            return {
                "ai_feedback_what_was_correct": "Chúng tôi gặp lỗi khi tạo phản hồi.",
                "ai_feedback_what_was_incorrect": f"Lỗi: {str(api_error)}",
                "ai_feedback_what_to_include": "Vui lòng thử lại sau hoặc liên hệ hỗ trợ."
            }
    
    except Exception as e:
        frappe.log_error(f"AI feedback generation error: {str(e)}", "AI Feedback Generation Error")
        return {
            "ai_feedback_what_was_correct": "Chúng tôi gặp lỗi trong hệ thống phản hồi.",
            "ai_feedback_what_was_incorrect": f"Chi tiết lỗi: {str(e)}",
            "ai_feedback_what_to_include": "Vui lòng thử lại sau hoặc liên hệ hỗ trợ."
        }

def clean_ai_text(text):
	"""
	Làm sạch văn bản từ AI, loại bỏ các dấu hiệu định dạng nhưng giữ lại nội dung
	"""
	# Loại bỏ các dấu đánh số như "1. ", "2. " ở đầu dòng
	text = re.sub(r'^\d+\.\s*', '', text, flags=re.MULTILINE)
	
	# Loại bỏ dấu :** ở đầu và dấu ** ở cuối
	text = re.sub(r':\*\*\s*', '', text)
	text = re.sub(r'\s*\*\*$', '', text, flags=re.MULTILINE)
	
	# Loại bỏ dấu ** ở đầu và cuối
	text = re.sub(r'^\*\*\s*', '', text, flags=re.MULTILINE)
	text = re.sub(r'\s*\*\*$', '', text, flags=re.MULTILINE)
	
	# Loại bỏ các dấu hiệu như :**, ** ở giữa câu
	text = re.sub(r':\*\*|\*\*', '', text)
	
	# Loại bỏ khoảng trắng thừa
	text = re.sub(r'\s+', ' ', text).strip()
	
	return text

@frappe.whitelist()
def get_exam_attempt_time_by_month():
    """
    Lấy dữ liệu thời gian làm bài thi theo tháng trong năm
    
    Args from request:
        year (int, optional): Year to get data for, defaults to current year
        
    Returns:
        list: Monthly time spent data for the specified year
    """
    try:
        # Extract parameters
        year = None
        if frappe.local.form_dict:
            year = cint(frappe.local.form_dict.get('year'))
        else:
            # Try to get from JSON body
            try:
                request_json = frappe.request.get_json()
                if request_json:
                    year = cint(request_json.get('year'))
            except Exception as e:
                frappe.logger().error(f"get_exam_attempt_time_by_month: Error getting JSON data: {str(e)}")
        
        user = get_current_user()
        
        if not year:
            year = frappe.utils.getdate().year
        
        frappe.logger().debug(f"get_exam_attempt_time_by_month: User: {user}, Year: {year}")
        
        # Lấy dữ liệu từ User Exam Attempt
        query = """
            SELECT 
                MONTH(creation) as month,
                SUM(time_spent_seconds) as time_spent
            FROM `tabUser Exam Attempt` 
            WHERE user = %s 
            AND YEAR(creation) = %s
            GROUP BY MONTH(creation)
        """
        
        data = frappe.db.sql(query, (user, year), as_dict=True)
        
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
        
        return {
            "success": True,
            "data": formatted_result
        }
    except Exception as e:
        frappe.logger().error(f"get_exam_attempt_time_by_month error: {str(e)}")
        return {
            "success": False,
            "message": str(e)
        }


def clean_markdown_text(text: str) -> str:
    """
    Làm sạch nội dung Markdown đơn giản (thường từ Gemini hoặc GPT) để hiển thị gọn gàng.
    Giữ lại cấu trúc danh sách và xuống dòng để tăng khả năng đọc.
    Bảo vệ các biểu thức LaTeX khỏi bị hỏng trong quá trình làm sạch.
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
    
    # KHÔNG xóa inline code nếu có thể chứa LaTeX
    # Chỉ xóa inline code đơn giản không chứa ký tự toán học
    text = re.sub(r'`([^`\\\$\[\](){}]+)`', r'\1', text)  # Chỉ xóa inline code đơn giản
    
    # Chuẩn hóa khoảng trắng nhưng giữ lại structure
    text = re.sub(r'[ \t]+', ' ', text)      # Loại bỏ khoảng trắng dư thừa
    text = re.sub(r' +\n', '\n', text)       # Loại bỏ khoảng trắng cuối dòng
    
    # Xóa các dòng trống chỉ có khoảng trắng
    text = re.sub(r'^\s*$', '', text, flags=re.MULTILINE)
    
    # Cải thiện logic nối dòng để tránh phá vỡ danh sách có số và LaTeX
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
        
        # Kiểm tra xem dòng có chứa LaTeX không
        contains_latex = ('\\[' in line or '\\]' in line or '\\(' in line or '\\)' in line or 
                         '\\begin{' in line or '\\end{' in line or '\\frac{' in line or 
                         '\\sqrt{' in line or '\\sum' in line or '\\int' in line)
        
        # Kiểm tra dòng tiếp theo (nếu có)
        is_next_list_item = False
        next_contains_latex = False
        if i < len(lines) - 1:
            next_line = lines[i + 1].strip()
            is_next_list_item = (next_line.startswith('•') or re.match(r'^\d+\.', next_line) or next_line.startswith('**'))
            next_contains_latex = ('\\[' in next_line or '\\]' in next_line or '\\(' in next_line or '\\)' in next_line or 
                                 '\\begin{' in next_line or '\\end{' in next_line or '\\frac{' in next_line or 
                                 '\\sqrt{' in next_line or '\\sum' in next_line or '\\int' in next_line)
        
        # Chỉ nối dòng khi:
        # 1. Dòng hiện tại không phải list item
        # 2. Dòng hiện tại không kết thúc bằng dấu câu
        # 3. Dòng tiếp theo không phải list item
        # 4. Dòng tiếp theo tồn tại và không rỗng
        # 5. Không có dòng nào chứa LaTeX
        if (i < len(lines) - 1 and 
            not is_current_list_item and
            not re.search(r'[.!?:]$', line) and 
            not is_next_list_item and
            not contains_latex and
            not next_contains_latex and
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
	Get a detailed explanation for a flashcard answer using LLM.
	
	Args:
		flashcard_name (str): The name of the flashcard
		question (str): The question text
		answer (str): The original answer text
		user_answer (str): The user's answer
		flashcard_type (str): The type of flashcard
		ai_feedback (dict): The AI feedback previously given
		
	Returns:
		dict: A dictionary with the detailed explanation
	"""
	user = get_current_user()
	
	if not user:
		frappe.throw(_("Authentication required."), frappe.AuthenticationError)
	# Lấy tham số từ form_dict hoặc JSON body nếu chưa được truyền vào hàm
	if not flashcard_name:
		if frappe.local.form_dict.get('flashcard_name'):
			flashcard_name = frappe.local.form_dict.get('flashcard_name')
		else:
			try:
				request_json = frappe.request.get_json()
				flashcard_name = request_json.get('flashcard_name')
			except Exception as e:
				frappe.logger().error(f"get_detailed_explanation: Error getting JSON data: {str(e)}")
	
	if not flashcard_name:
		frappe.throw(_("Missing required parameter: flashcard_name"))
	
	# Lấy các tham số khác từ form_dict hoặc JSON body nếu chưa được truyền vào hàm
	if not question:
		question = frappe.local.form_dict.get('question') or (frappe.request.get_json() or {}).get('question')
	
	if not answer:
		answer = frappe.local.form_dict.get('answer') or (frappe.request.get_json() or {}).get('answer')
	
	if not user_answer:
		user_answer = frappe.local.form_dict.get('user_answer') or (frappe.request.get_json() or {}).get('user_answer')
	
	if not flashcard_type:
		flashcard_type = frappe.local.form_dict.get('flashcard_type') or (frappe.request.get_json() or {}).get('flashcard_type')
	
	if not ai_feedback:
		ai_feedback = frappe.local.form_dict.get('ai_feedback') or (frappe.request.get_json() or {}).get('ai_feedback')
		
	try:
		# Log the incoming parameters for debugging
		frappe.logger().debug(f"get_detailed_explanation called with: flashcard={flashcard_name}, type={flashcard_type}")
		
		# First, try to get the flashcard from the database to ensure we have the latest data
		try:
			flashcard = frappe.get_doc("Flashcard", flashcard_name)
			# If we successfully got the flashcard, update our parameters with the latest version
			question = question or flashcard.question
			answer = answer or flashcard.answer
			flashcard_type = flashcard_type or flashcard.flashcard_type
		except Exception as e:
			frappe.logger().warning(f"Could not fetch flashcard {flashcard_name}: {str(e)}")
			# If we can't get the flashcard and don't have required parameters, throw an error
			if not question or not answer:
				frappe.throw(_("Could not fetch flashcard data and missing required parameters"))
		
		# Check if we have Gemini API configured
		gemini_api_key = frappe.conf.get("gemini_api_key")
		if not gemini_api_key:
			gemini_api_key = frappe.db.get_single_value("Elearning Settings", "gemini_api_key")
		
		if not gemini_api_key:
			frappe.logger().warning("Gemini API key not configured, returning original answer")
			return {"success": True, "detailed_explanation": answer}
		
		# Parse ai_feedback if it's a string
		if isinstance(ai_feedback, str):
			try:
				ai_feedback = json.loads(ai_feedback)
			except:
				frappe.logger().warning("Failed to parse ai_feedback as JSON, treating as empty")
				ai_feedback = {}
		
		# Configure the Gemini API
		genai.configure(api_key=gemini_api_key)
		
		# Set up the model configuration
		generation_config = {
			"temperature": 0.7,
			"top_p": 0.95,
			"top_k": 64,
			"max_output_tokens": 4096,
		}
		
		safety_settings = {
			HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
			HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
			HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
			HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
		}
		
		# Initialize the model
		model = genai.GenerativeModel(
			model_name="gemini-2.0-flash",
			generation_config=generation_config,
			safety_settings=safety_settings
		)
		
		# Create the system prompt
		system_prompt = """
		Bạn là một giáo viên giỏi và nhiệt tình, chuyên giải thích các khái niệm phức tạp một cách rõ ràng và dễ hiểu.
		Nhiệm vụ của bạn là cung cấp lời giải chi tiết, đầy đủ và dễ hiểu cho câu hỏi được đưa ra.
		
		Hãy tuân thủ các hướng dẫn sau:
		1. Phân tích câu hỏi kỹ lưỡng để hiểu chính xác yêu cầu.
		2. Cung cấp lời giải từng bước, giải thích mỗi bước một cách rõ ràng.
		3. Đưa ra các ví dụ minh họa nếu cần thiết để làm rõ khái niệm.
		4. Sử dụng ngôn ngữ đơn giản, dễ hiểu cho học sinh.
		5. Nếu có nhiều cách tiếp cận, hãy trình bày cách tiếp cận tốt nhất trước.
		6. Kết thúc bằng một tóm tắt ngắn gọn về các điểm chính.
		7. Đảm bảo lời giải của bạn chính xác về mặt học thuật.

		Lưu ý quan trọng:
        - Giải thích NGẮN GỌN, đi thẳng vào vấn đề
        - Sử dụng LaTeX: \\( \\) cho công thức inline, \\[ \\] cho công thức block
        - Tối đa 3-4 câu cho mỗi bước
        - Luôn kết thúc bằng dấu chấm hoặc cảm thán
        - Tránh lặp lại thông tin không cần thiết
		
		Định dạng phản hồi của bạn như sau:
		1. Phân tích câu hỏi
		2. Lời giải từng bước
		3. Giải thích các khái niệm quan trọng
		4. Tóm tắt
		
		Hãy nhớ rằng mục tiêu là giúp học sinh thực sự hiểu vấn đề, không chỉ đơn thuần là cung cấp câu trả lời.
		"""
		
		# Create the user content
		user_content = f"""
		# Câu hỏi:
		{question}
		
		# Loại câu hỏi:
		{flashcard_type or "Chưa xác định"}
		
		# Câu trả lời gốc:
		{answer}
		
		# Câu trả lời của học sinh:
		{user_answer or "Không có câu trả lời"}
		
		# Phản hồi AI trước đó:
		Điểm đúng: {ai_feedback.get('ai_feedback_what_was_correct', 'Không có') if ai_feedback else 'Không có'}
		Điểm sai: {ai_feedback.get('ai_feedback_what_was_incorrect', 'Không có') if ai_feedback else 'Không có'}
		Điểm cần bổ sung: {ai_feedback.get('ai_feedback_what_to_include', 'Không có') if ai_feedback else 'Không có'}
		
		Dựa trên thông tin trên, hãy cung cấp một lời giải chi tiết, đầy đủ và dễ hiểu cho câu hỏi này.
		"""
		
		frappe.logger().debug(f"Generating detailed explanation for flashcard {flashcard_name}")
		
		# Generate the detailed explanation
		try:
			# Kết hợp system prompt và user content vì Gemini API không hỗ trợ system role
			combined_prompt = f"{system_prompt}\n\n---\n\n{user_content}"
			
			response = model.generate_content(combined_prompt)
			
			# Check if response was blocked
			if hasattr(response, 'candidates') and response.candidates and response.candidates[0].finish_reason.name == "SAFETY":
				frappe.logger().warning(f"Gemini response blocked by safety filters for flashcard {flashcard_name}")
				return {
					"success": True, 
					"detailed_explanation": f"Lời giải chi tiết:\n\n{answer}\n\n(Lưu ý: Không thể tạo lời giải mở rộng do hạn chế an toàn)"
				}
			
			# Get the response text
			detailed_explanation = response.text if hasattr(response, 'text') and response.text else answer
			frappe.logger().debug(f"Generated explanation length: {len(detailed_explanation)} chars")
			
		except Exception as api_error:
			frappe.logger().error(f"Gemini API error: {str(api_error)}")
			# Fallback to original answer if API fails
			detailed_explanation = f"Lời giải chi tiết:\n\n{answer}\n\n(Lưu ý: Không thể tạo lời giải mở rộng do lỗi API: {str(api_error)})"
		
		# Log the successful generation
		frappe.logger().debug(f"Successfully generated detailed explanation for flashcard {flashcard_name}")
		
		return {
			"success": True,
			"detailed_explanation": detailed_explanation
		}
		
	except Exception as e:
		frappe.log_error(f"Error generating detailed explanation: {str(e)}", "Detailed Explanation Error")
		return {
			"success": False,
			"error": str(e),
			"detailed_explanation": answer  # Fallback to original answer
		}