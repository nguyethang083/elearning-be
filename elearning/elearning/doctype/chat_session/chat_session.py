# Copyright (c) 2025, Minh Quy and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime


class ChatSession(Document):
    pass


@frappe.whitelist()
def create_chat_session(user=None, topic_context=None):
    """
    Create a new chat session
    
    Args:
        user (str): User email/name
        topic_context (str, optional): Topic context for the session
        
    Returns:
        dict: Session information with session_id
    """
    try:
        # Create new chat session
        doc = frappe.get_doc({
            "doctype": "Chat Session",
            "user": user,
            "topic_context": topic_context,
            "start_time": now_datetime(),
            "status": "Active"
        })
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        
        return {
            "success": True,
            "session_id": doc.name,
            "message": "Chat session created successfully"
        }
        
    except Exception as e:
        frappe.log_error(f"Error creating chat session: {str(e)}", "Chat Session Creation Error")
        return {
            "success": False,
            "message": f"Failed to create chat session: {str(e)}"
        }


@frappe.whitelist()
def get_chat_session(session_id):
    """
    Get chat session details and messages
    
    Args:
        session_id (str): Session ID to retrieve
        
    Returns:
        dict: Session details and messages
    """
    try:
        if not frappe.db.exists("Chat Session", session_id):
            return {
                "success": False,
                "message": "Chat session not found"
            }
        
        session = frappe.get_doc("Chat Session", session_id)
        messages = frappe.get_all(
            "Chat Message",
            filters={"parent": session_id},
            fields=["sender", "message_type", "content", "timestamp"],
            order_by="timestamp"
        )
        
        return {
            "success": True,
            "session": {
                "name": session.name,
                "user": session.user,
                "start_time": session.start_time,
                "end_time": session.end_time,
                "topic_context": session.topic_context,
                "status": session.status
            },
            "messages": messages
        }
        
    except Exception as e:
        frappe.log_error(f"Error getting chat session: {str(e)}", "Chat Session Retrieval Error")
        return {
            "success": False,
            "message": f"Failed to get chat session: {str(e)}"
        }


@frappe.whitelist()
def end_chat_session(session_id):
    """
    End a chat session by setting end_time
    
    Args:
        session_id (str): Session ID to end
        
    Returns:
        dict: Success status
    """
    try:
        if not frappe.db.exists("Chat Session", session_id):
            return {
                "success": False,
                "message": "Chat session not found"
            }
        
        session = frappe.get_doc("Chat Session", session_id)
        session.end_time = now_datetime()
        session.status = "Ended"
        session.save(ignore_permissions=True)
        frappe.db.commit()
        
        return {
            "success": True,
            "message": "Chat session ended successfully"
        }
        
    except Exception as e:
        frappe.log_error(f"Error ending chat session: {str(e)}", "Chat Session End Error")
        return {
            "success": False,
            "message": f"Failed to end chat session: {str(e)}"
        }
