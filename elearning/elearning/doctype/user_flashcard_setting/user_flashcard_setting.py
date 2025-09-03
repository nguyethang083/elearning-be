# Copyright (c) 2025, Minh Quy and contributors
# For license information, please see license.txt

import frappe
import random
from frappe.model.document import Document
from frappe import _
from datetime import datetime, timedelta

def get_current_user():
    user = frappe.session.user
    if user == "Guest":
        frappe.throw(_("Authentication required."), frappe.AuthenticationError)
    return user

class UserFlashcardSetting(Document):
    def before_save(self):
        # skip validation while fixtures are loading
        if getattr(frappe.flags, "in_import", False):
            return
        self.validate_user_topic()
    
    def validate_user_topic(self):
        # Check if user exists
        if not frappe.db.exists("User", self.user):
            frappe.throw(_("User {0} does not exist").format(self.user))
        
        # Check if topic exists
        if not frappe.db.exists("Topics", self.topic):
            frappe.throw(_("Topic {0} does not exist").format(self.topic))

@frappe.whitelist()
def get_user_flashcard_setting():
    """
    Get user flashcard settings for a specific topic
    
    Args:
        topic_name (str): Name of the topic from request data
        
    Returns:
        dict: User flashcard settings for the topic
    """
    try:
        # Extract topic_name from form_dict or JSON request
        if frappe.local.form_dict.get('topic_name'):
            topic_name = frappe.local.form_dict.get('topic_name')
            frappe.logger().debug(f"get_user_flashcard_setting: Got topic_name from form_dict: {topic_name}")
        else:
            # Try to get from JSON body
            try:
                request_json = frappe.request.get_json()
                topic_name = request_json.get('topic_name')
                frappe.logger().debug(f"get_user_flashcard_setting: Got topic_name from JSON: {topic_name}")
            except Exception as e:
                frappe.logger().error(f"get_user_flashcard_setting: Error getting JSON data: {str(e)}")
                frappe.throw(_("Topic name is required"))
        
        if not topic_name:
            frappe.logger().error("get_user_flashcard_setting: topic_name is missing")
            frappe.throw(_("Topic name is required"))
        
        user_id = get_current_user()
        frappe.logger().debug(f"get_user_flashcard_setting: User: {user_id}, Topic: {topic_name}")
        
        # Check if topic exists
        if not frappe.db.exists("Topics", topic_name):
            frappe.logger().error(f"get_user_flashcard_setting: Topic does not exist: {topic_name}")
            frappe.throw(_("Topic does not exist"))

        # Find existing settings for this user and topic
        settings_list = frappe.get_all(
            "User Flashcard Setting",
            filters={"user": user_id, "topic": topic_name},
            fields=["name", "flashcard_arrange_mode", "flashcard_direction", "study_exam_flashcard_type_filter"]
        )
        
        if settings_list:
            # Return existing settings
            settings = settings_list[0]
            frappe.logger().debug(f"get_user_flashcard_setting: Found existing settings for user {user_id} and topic {topic_name}")
            return {
                "success": True,
                "settings": {
                    "flashcard_arrange_mode": settings.flashcard_arrange_mode,
                    "flashcard_direction": settings.flashcard_direction,
                    "study_exam_flashcard_type_filter": settings.study_exam_flashcard_type_filter
                }
            }
        else:
            # Return default settings
            frappe.logger().debug(f"get_user_flashcard_setting: No settings found, returning defaults for user {user_id} and topic {topic_name}")
            return {
                "success": True,
                "settings": {
                    "flashcard_arrange_mode": "chronological",
                    "flashcard_direction": "front_first",
                    "study_exam_flashcard_type_filter": "All"
                }
            }
    except Exception as e:
        frappe.logger().error(f"get_user_flashcard_setting error: {str(e)}")
        return {
            "success": False,
            "message": str(e)
        }

@frappe.whitelist()
def save_user_flashcard_setting():
    """
    Save user flashcard settings for a specific topic
    
    Args (from request):
        topic_name (str): Name of the topic
        settings_data (dict): Settings data to save
        
    Returns:
        dict: Saved user flashcard settings
    """
    # Extract parameters from form_dict or JSON request
    if frappe.local.form_dict.get('topic_name') and frappe.local.form_dict.get('settings_data'):
        topic_name = frappe.local.form_dict.get('topic_name')
        settings_data = frappe.local.form_dict.get('settings_data')
    else:
        # Try to get from JSON body
        try:
            request_json = frappe.request.get_json()
            topic_name = request_json.get('topic_name')
            settings_data = request_json.get('settings_data')
        except Exception:
            frappe.throw(_("Topic name and settings data are required"))
    
    if not topic_name or settings_data is None:
        frappe.throw(_("Topic name and settings data are required"))
    
    user_id = get_current_user()
    
    # Check if topic exists
    if not frappe.db.exists("Topics", topic_name):
        frappe.throw(_("Topic does not exist"))
    
    # Validate settings_data format
    if not isinstance(settings_data, dict):
        try:
            import json
            settings_data = json.loads(settings_data) if isinstance(settings_data, str) else settings_data
        except Exception:
            frappe.throw(_("Invalid settings data format"))
    
    # Define default values
    defaults = {
        "flashcard_arrange_mode": "chronological",
        "flashcard_direction": "front_first",
        "study_exam_flashcard_type_filter": "All"
    }
    
    # Merge with provided settings
    merged_settings = {**defaults, **settings_data}
    
    # Find existing settings
    settings_list = frappe.get_all(
        "User Flashcard Setting",
        filters={"user": user_id, "topic": topic_name},
        fields=["name"]
    )
    
    if settings_list:
        # Update existing settings
        settings = frappe.get_doc("User Flashcard Setting", settings_list[0].name)
        settings.flashcard_arrange_mode = merged_settings.get("flashcard_arrange_mode")
        settings.flashcard_direction = merged_settings.get("flashcard_direction")
        settings.study_exam_flashcard_type_filter = merged_settings.get("study_exam_flashcard_type_filter")
        settings.save(ignore_permissions=True)
    else:
        # Create new settings
        settings = frappe.new_doc("User Flashcard Setting")
        settings.user = user_id
        settings.topic = topic_name
        settings.flashcard_arrange_mode = merged_settings.get("flashcard_arrange_mode")
        settings.flashcard_direction = merged_settings.get("flashcard_direction")
        settings.study_exam_flashcard_type_filter = merged_settings.get("study_exam_flashcard_type_filter")
        settings.insert(ignore_permissions=True)
    
    frappe.db.commit()
    
    return {
        "success": True,
        "message": _("Settings saved successfully"),
        "settings": {
            "flashcard_arrange_mode": settings.flashcard_arrange_mode,
            "flashcard_direction": settings.flashcard_direction,
            "study_exam_flashcard_type_filter": settings.study_exam_flashcard_type_filter
        }
    }

@frappe.whitelist()
def reset_srs_progress_for_topic():
    """
    Reset SRS progress for a specific topic
    
    Args (from request):
        topic_name (str): Name of the topic
        
    Returns:
        dict: Success message and count of deleted records
    """
    # Extract topic_name from form_dict or JSON request
    if frappe.local.form_dict.get('topic_name'):
        topic_name = frappe.local.form_dict.get('topic_name')
    else:
        # Try to get from JSON body
        try:
            request_json = frappe.request.get_json()
            topic_name = request_json.get('topic_name')
        except Exception:
            frappe.throw(_("Topic name is required"))
    
    if not topic_name:
        frappe.throw(_("Topic name is required"))
    
    user_id = get_current_user()
    
    # Check if topic exists
    if not frappe.db.exists("Topics", topic_name):
        frappe.throw(_("Topic does not exist"))
    
    # Get all flashcards for this topic
    flashcards = frappe.get_all(
        "Flashcard",
        filters={"topic": topic_name},
        fields=["name"]
    )
    
    # Delete SRS progress records for these flashcards
    deleted_count = 0
    for flashcard in flashcards:
        srs_progress_list = frappe.get_all(
            "User SRS Progress",
            filters={"user": user_id, "flashcard": flashcard.name},
            fields=["name"]
        )
        
        for progress in srs_progress_list:
            frappe.delete_doc("User SRS Progress", progress.name, ignore_permissions=True)
            deleted_count += 1
    
    frappe.db.commit()
    
    return {
        "success": True,
        "message": _("SRS progress reset successfully"),
        "deleted_count": deleted_count
    } 