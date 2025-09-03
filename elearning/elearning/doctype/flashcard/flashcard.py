# Copyright (c) 2025, Minh Quy and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe import _

def get_current_user():
	user = frappe.session.user
	if user == "Guest":
		frappe.throw(_("Authentication required."), frappe.AuthenticationError)
	return user

class Flashcard(Document):
	pass

@frappe.whitelist(allow_guest=True)
def get_flashcards_for_topic(topic_id=None):
	"""
	Retrieves a list of flashcards filtered by topic.
	If no topic_id is provided, returns all flashcards.
	"""
	user = get_current_user()
	
	if not user:
		frappe.throw(_("Authentication required."), frappe.AuthenticationError)

	try:
		filters = {}
		if topic_id:
			filters["topic"] = topic_id
		
		flashcards = frappe.get_list(
			"Flashcard",
			filters=filters,
			fields=["name", "topic", "question", "answer", "explanation", "flashcard_type", "hint"],
			order_by="name"
		)
		
		return flashcards
		
	except Exception as e:
		frappe.log_error(f"Error fetching flashcards: {e}", "Flashcard API Error")
		frappe.throw(_("An error occurred while fetching flashcards."), exc=e)

@frappe.whitelist(allow_guest=True)
def get_flashcards_for_type():
	"""
	Retrieves a list of flashcards filtered by topic and flashcard_type.
	Returns complete flashcard data including child tables for specific types.
	
	Args from request:
		topic_id (str): The topic ID to filter by
		flashcard_type (str): The flashcard type to filter by (optional)
		
	Returns:
		list: List of flashcards with complete data
	"""
	user = get_current_user()
	
	if not user:
		frappe.throw(_("Authentication required."), frappe.AuthenticationError)

	try:
		# Extract parameters from form_dict or JSON request
		if frappe.local.form_dict.get('topic_id'):
			topic_id = frappe.local.form_dict.get('topic_id')
			flashcard_type = frappe.local.form_dict.get('flashcard_type')
			frappe.logger().debug(f"get_flashcards_for_type: Got params from form_dict: topic_id={topic_id}, type={flashcard_type}")
		else:
			# Try to get from JSON body
			try:
				request_json = frappe.request.get_json()
				topic_id = request_json.get('topic_id')
				flashcard_type = request_json.get('flashcard_type')
				frappe.logger().debug(f"get_flashcards_for_type: Got params from JSON: topic_id={topic_id}, type={flashcard_type}")
			except Exception as e:
				frappe.logger().error(f"get_flashcards_for_type: Error getting JSON data: {str(e)}")
				topic_id = None
				flashcard_type = None
				
		# Ensure topic_id is in the correct format
		if topic_id:
			try:
				# Check if it's a string representation of a number (e.g. "1")
				topic_id = str(topic_id)
				frappe.logger().debug(f"get_flashcards_for_type: Using topic_id: {topic_id}")
			except Exception as e:
				frappe.logger().error(f"get_flashcards_for_type: Error converting topic_id: {str(e)}")
				topic_id = None
		
		filters = {}
		if topic_id:
			filters["topic"] = topic_id
			frappe.logger().debug(f"get_flashcards_for_type: Filtering by topic: {topic_id}")
		else:
			frappe.logger().warning(f"get_flashcards_for_type: No topic_id provided, returning all flashcards")
		
		if flashcard_type and flashcard_type != "All":
			filters["flashcard_type"] = flashcard_type
			frappe.logger().debug(f"get_flashcards_for_type: Also filtering by type: {flashcard_type}")
		
		# Get basic flashcard data
		frappe.logger().debug(f"get_flashcards_for_type: Final filters: {filters}")
		flashcards = frappe.get_list(
			"Flashcard",
			filters=filters,
			fields=["name", "topic", "flashcard_type", "question", "answer", "explanation", "hint"],
			order_by="name"
		)
		
		frappe.logger().debug(f"get_flashcards_for_type: Found {len(flashcards)} flashcards matching criteria")
		
		# For each flashcard, fetch additional data based on its type
		for flashcard in flashcards:
			# For "Ordering Steps" type, fetch the child table items
			if flashcard.get("flashcard_type") == "Ordering Steps":
				ordering_steps = frappe.get_all(
					"Ordering Step Item",
					filters={"parent": flashcard.get("name")},
					fields=["step_content", "correct_order"],
					order_by="correct_order"
				)
				flashcard["ordering_steps_items"] = ordering_steps
		
		return flashcards
		
	except Exception as e:
		frappe.log_error(f"Error fetching flashcards: {e}", "Flashcard API Error")
		frappe.throw(_("An error occurred while fetching flashcards."), exc=e)

@frappe.whitelist(allow_guest=True)
def get_flashcard_by_id(flashcard_id):
	"""
	Retrieves a single flashcard by its ID.
	"""
	user = get_current_user()
	
	if not user:
		frappe.throw(_("Authentication required."), frappe.AuthenticationError)

	try:
		flashcard = frappe.get_doc("Flashcard", flashcard_id)
		result = {
			"name": flashcard.name,
			"topic": flashcard.topic,
			"flashcard_type": flashcard.flashcard_type,
			"question": flashcard.question,
			"answer": flashcard.answer,
			"explanation": flashcard.explanation
		}
		
		# Add optional fields if they exist
		if hasattr(flashcard, "hint") and flashcard.hint:
			result["hint"] = flashcard.hint
		
		# For "Ordering Steps" type, fetch the child table items
		if flashcard.flashcard_type == "Ordering Steps":
			ordering_steps = frappe.get_all(
				"Ordering Step Item",
				filters={"parent": flashcard.name},
				fields=["step_content", "correct_order"],
				order_by="correct_order"
			)
			result["ordering_steps_items"] = ordering_steps
		
		return result
		
	except Exception as e:
		frappe.log_error(f"Error fetching flashcard: {e}", "Flashcard API Error")
		frappe.throw(_("An error occurred while fetching the flashcard."), exc=e)
