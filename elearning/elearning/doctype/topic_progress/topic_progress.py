# Copyright (c) 2025, Minh Quy and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime


class TopicProgress(Document):
    def before_save(self):
        """Tự động cập nhật last_calculated khi lưu"""
        self.last_calculated = now_datetime()
    
    def calculate_progress(self):
        """Tính toán progress dựa trên SRS và exam attempts"""
        if not self.user or not self.topic:
            return 0
        
        # Lấy dữ liệu SRS
        srs_data = self.get_srs_data()
        total_cards = srs_data.get('total_count', 0)
        due_cards = srs_data.get('due_count', 0)
        
        # Lấy dữ liệu exam attempts
        exam_attempts = self.get_exam_attempts()
        exam_count = len(exam_attempts)
        
        # Cập nhật các field
        self.total_srs_cards = total_cards
        self.due_srs_cards = due_cards
        self.exam_attempts_count = exam_count
        
        # Tính toán progress
        total_progress = 0
        
        # 1. Base progress for having SRS cards
        if total_cards > 0:
            self.srs_progress = 20  # 20% cơ bản cho SRS
            
            # SRS progression based on cards not due today
            srs_progression = (total_cards - due_cards) / total_cards * 60 if total_cards > 0 else 0
            total_progress = 20 + srs_progression
        else:
            self.srs_progress = 0
        
        # 2. Additional progress for exam attempts
        if exam_count > 0:
            # Exam progress: 5% base + 2% per attempt, max 15%
            exam_progress = min(15, 5 + (exam_count * 2))
            self.exam_progress = exam_progress
            total_progress += exam_progress
        else:
            self.exam_progress = 0
        
        # Cap at 100%
        self.progress_percentage = min(round(total_progress), 100)
        
        return self.progress_percentage
    
    def get_srs_data(self):
        """Lấy dữ liệu SRS cho topic cụ thể"""
        try:
            # Gọi API get_due_srs_summary
            result = frappe.call(
                "elearning.elearning.doctype.user_srs_progress.user_srs_progress.get_due_srs_summary"
            )
            
            if result and result.get('topics'):
                # Tìm topic tương ứng
                for topic_data in result['topics']:
                    if (str(topic_data.get('topic_id')) == str(self.topic) or 
                        str(topic_data.get('topic_name')) == str(self.topic)):
                        return {
                            'total_count': topic_data.get('total_count', 0),
                            'due_count': topic_data.get('due_count', 0),
                            'upcoming_count': topic_data.get('upcoming_count', 0)
                        }
            
            return {'total_count': 0, 'due_count': 0, 'upcoming_count': 0}
        except Exception as e:
            frappe.log_error(f"Error getting SRS data: {str(e)}")
            return {'total_count': 0, 'due_count': 0, 'upcoming_count': 0}
    
    def get_exam_attempts(self):
        """Lấy dữ liệu exam attempts cho topic cụ thể"""
        try:
            # Gọi API get_user_exam_history
            result = frappe.call(
                "elearning.elearning.doctype.user_exam_attempt.user_exam_attempt.get_user_exam_history",
                topic_name=str(self.topic)
            )
            
            if result and result.get('attempts'):
                return result['attempts']
            elif isinstance(result, list):
                return result
            else:
                return []
        except Exception as e:
            frappe.log_error(f"Error getting exam attempts: {str(e)}")
            return []


@frappe.whitelist()
def create_or_update_topic_progress(user, topic):
    """Tạo hoặc cập nhật topic progress cho user"""
    try:
        # Kiểm tra xem đã có topic progress chưa
        existing_progress = frappe.get_value(
            "Topic Progress",
            {"user": user, "topic": topic},
            "name"
        )
        
        if existing_progress:
            # Cập nhật existing progress
            doc = frappe.get_doc("Topic Progress", existing_progress)
        else:
            # Tạo mới
            doc = frappe.get_doc({
                "doctype": "Topic Progress",
                "user": user,
                "topic": topic
            })
        
        # Tính toán progress
        doc.calculate_progress()
        
        # Lưu document
        doc.save()
        
        return {
            "success": True,
            "message": "Topic progress updated successfully",
            "progress": doc.progress_percentage,
            "srs_progress": doc.srs_progress,
            "exam_progress": doc.exam_progress
        }
        
    except Exception as e:
        frappe.log_error(f"Error creating/updating topic progress: {str(e)}")
        return {
            "success": False,
            "message": f"Error: {str(e)}"
        }


@frappe.whitelist()
def get_topic_progress(user, topic):
    """Lấy topic progress cho user cụ thể"""
    try:
        progress = frappe.get_value(
            "Topic Progress",
            {"user": user, "topic": topic},
            ["progress_percentage", "srs_progress", "exam_progress", "total_srs_cards", "due_srs_cards", "exam_attempts_count", "last_calculated"],
            as_dict=True
        )
        
        if progress:
            return {
                "success": True,
                "data": progress
            }
        else:
            return {
                "success": False,
                "message": "No progress found for this topic"
            }
            
    except Exception as e:
        frappe.log_error(f"Error getting topic progress: {str(e)}")
        return {
            "success": False,
            "message": f"Error: {str(e)}"
        }
