"""
Tutor agent: Main orchestration hub for multi-agent system
"""

import frappe
import json
from typing import Dict, Any, List
from datetime import datetime

import requests
from .problem_solver import get_problem_solver
from .learning_analyzer import get_learning_analyzer
from .prompts import TUTOR_TEMPLATE

# Import and apply math format fix
from elearning.elearning.doctype.chat_message.chat_message import fix_math_format

class TutorAgent:
    """
    Main tutor agent that orchestrates all other agents
    """
    
    def __init__(self):
        self.api_key = frappe.conf.get("gemini_api_key")
        self.api_url = None
        if self.api_key:
            self.api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={self.api_key}"
        self.problem_solver = get_problem_solver()
        self.learning_analyzer = get_learning_analyzer()
    
    def handle_user_message(self, user: str, user_input: str, conversation_history: List[Dict], 
                          image_data: bytes = None, topic_context: str = None) -> Dict[str, Any]:
        """
        Main method to handle user messages and orchestrate responses
        """
        try:
            # Convert conversation history to string format
            conversation_str = self._format_conversation_history(conversation_history)
            
            # Determine intent and handle with integrated tutor
            intent = self._classify_intent_from_input(user_input)
            
            if intent == "math_question":
                response = self._handle_math_question(user_input, image_data, conversation_str)
            elif intent == "request_for_practice":
                response = self._handle_practice_request(user, conversation_str, topic_context)
            elif intent in ["greeting_social", "expression_of_stress", "learning_support", "off_topic", "general"]:
                response = self._handle_with_tutor(user_input, conversation_str)
            else:
                # Fallback for unknown intents
                response = self._handle_with_tutor(user_input, conversation_str)
            
            # Check if proactive practice should be triggered
            proactive_response = None
            should_trigger = self._should_trigger_proactive_practice(conversation_history)
            frappe.logger().info(f"Should trigger proactive practice: {should_trigger}")
            
            if should_trigger:
                frappe.logger().info("Triggering proactive practice...")
                proactive_response = self._trigger_proactive_practice(user, conversation_str, topic_context)
                frappe.logger().info(f"Proactive response: {type(proactive_response)}, {proactive_response}")
            
            return {
                "response": response,
                "intent": intent,
                "proactive_response": proactive_response,
                "success": True,
                "debug_info": {
                    "should_trigger_proactive": should_trigger,
                    "proactive_response_type": type(proactive_response).__name__ if proactive_response else None,
                    "conversation_length": len(conversation_history),
                    "user_input_length": len(user_input),
                    "topic_context": topic_context
                }
            }
            
        except Exception as e:
            error_msg = str(e)
            if len(error_msg) > 80:
                error_msg = error_msg[:80] + "..."
            frappe.log_error(f"Tutor agent failed: {error_msg}", "Tutor Agent Error")
            return {
                "response": "Rất xin lỗi, tôi đang gặp một chút sự cố.",
                "intent": "error",
                "proactive_response": None,
                "success": False,
                "error": str(e)
            }
    
    def call_gemini_api(self, prompt: str) -> str:
        """
        Call Gemini AI API following chat_message.py pattern
        """
        try:
            if not self.api_key:
                return "Xin lỗi, tôi không thể trả lời lúc này. API key chưa được cấu hình."
            
            payload = {
                "contents": [
                    {"role": "user", "parts": [{"text": prompt}]}
                ],
                "generationConfig": {
                    "temperature": 0.4,
                    "topP": 0.8,
                    "topK": 40,
                    "maxOutputTokens": 1024,
                },
            }
            
            response = requests.post(self.api_url, json=payload, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("candidates") and len(data["candidates"]) > 0:
                    ai_text = (
                        data.get("candidates", [{}])[0]
                        .get("content", {})
                        .get("parts", [{}])[0]
                        .get("text", "")
                    )
                    return ai_text.strip()
                else:
                    return "Xin lỗi, tôi không thể tạo phản hồi lúc này."
            else:
                return "Xin lỗi, tôi gặp lỗi khi xử lý yêu cầu của bạn."
                
        except Exception as e:
            frappe.log_error(f"Error calling Gemini API: {str(e)[:80]}...", "Gemini API Error")
            return "Xin lỗi, tôi không thể trả lời lúc này. Vui lòng thử lại sau."
    
    def _classify_intent_from_input(self, user_input: str) -> str:
        """
        LLM-based intent classification for more accurate detection
        """
        try:
            if not self.api_key:
                # Fallback to simple keyword matching if no API key
                return self._classify_intent_keywords(user_input)
            
            intent_prompt = f"""
Dựa vào tin nhắn từ học sinh, hãy phân loại ý định thành MỘT trong các loại sau:

**DANH SÁCH CÁC LOẠI Ý ĐỊNH:**
- math_question: Câu hỏi toán học, yêu cầu giải bài tập, giải thích công thức
- request_for_practice: Yêu cầu bài tập để luyện tập, thực hành
- greeting_social: Chào hỏi, cảm ơn, tạm biệt, lời khen
- expression_of_stress: Biểu hiện căng thẳng, stress, nản lòng về học tập
- learning_support: Hỏi về phương pháp học, xin lời khuyên học tập
- off_topic: Ngoài chủ đề học tập (thời tiết, tin tức, câu hỏi cá nhân...)
- general: Các trường hợp khác

**TIN NHẮN HỌC SINH:** "{user_input}"

**CHỈ TRẢ LỜI MỘT NHÃN:** 
"""
            
            intent_response = self.call_gemini_api(intent_prompt)
            
            # Extract intent from response
            intent_response = intent_response.strip().lower()
            
            # Validate against known intents
            valid_intents = [
                'math_question', 'request_for_practice', 'greeting_social', 
                'expression_of_stress', 'learning_support', 'off_topic', 'general'
            ]
            
            for intent in valid_intents:
                if intent in intent_response:
                    frappe.logger().info(f"LLM Intent classification: '{user_input}' → {intent}")
                    return intent
            
            # Default fallback
            frappe.logger().warning(f"LLM Intent classification failed for: '{user_input}', using general")
            return "general"
            
        except Exception as e:
            frappe.log_error(f"Intent classification failed: {str(e)[:80]}...", "Intent Classification Error")
            # Fallback to keyword-based classification
            return self._classify_intent_keywords(user_input)
    
    def _classify_intent_keywords(self, user_input: str) -> str:
        """
        Fallback keyword-based intent classification
        """
        # Math keywords
        math_keywords = [
            'giải', 'tính', 'phương trình', 'x^2', 'x²', '=', '+', '-', '*', '/',
            'bài toán', 'toán', 'công thức', 'diện tích', 'chu vi', 'thể tích',
            'sin', 'cos', 'tan', 'log', 'ln', 'sqrt', '√', 'delta', 'Δ',
            'hình tròn', 'hình vuông', 'tam giác', 'hình chữ nhật',
            'phân số', 'số thập phân', 'căn bậc', 'lũy thừa', 'logarit'
        ]
        
        # Practice keywords
        practice_keywords = ['bài tập', 'luyện tập', 'thực hành', 'ôn tập', 'bài làm']
        
        # Greeting keywords
        greeting_keywords = ['chào', 'xin chào', 'hello', 'hi', 'cảm ơn', 'tạm biệt']
        
        # Stress keywords
        stress_keywords = ['khó', 'nản', 'mệt', 'stress', 'áp lực', 'không hiểu']
        
        user_lower = user_input.lower()
        
        if any(keyword in user_lower for keyword in math_keywords):
            return "math_question"
        elif any(keyword in user_lower for keyword in practice_keywords):
            return "request_for_practice"
        elif any(keyword in user_lower for keyword in greeting_keywords):
            return "greeting_social"
        elif any(keyword in user_lower for keyword in stress_keywords):
            return "expression_of_stress"
        else:
            return "general"
    
    def _should_trigger_proactive_practice(self, conversation_history: List[Dict]) -> bool:
        """
        Hybrid trigger strategy combining frequency, negative signals, and user requests
        """
        # Get recent user messages
        user_messages = [msg for msg in conversation_history if msg.get('role') == 'user']
        recent_user_messages = user_messages[-6:]  # Last 6 user messages
        
        if not recent_user_messages:
            return False
            
        # IMMEDIATE TRIGGER: Strong confusion signals override conversation length requirement
        latest_message = recent_user_messages[-1].get('content', '').lower()
        immediate_confusion_signals = [
            'gặp khó khăn', 'không hiểu', 'khó quá', 'khó thật', 'em bí', 
            'không biết làm', 'thắc mắc', 'nhầm lẫn', 'em sai', 'em chưa hiểu'
        ]
        
        if any(signal in latest_message for signal in immediate_confusion_signals):
            frappe.logger().info(f"🚨 IMMEDIATE_CONFUSION_TRIGGER: Found signal in '{latest_message}'")
            return True
        
        # Regular triggers require at least 2 messages
        if len(conversation_history) < 2:
            return False
        
        # Check if we've already triggered proactive analysis recently (cooldown)
        proactive_count = sum(1 for msg in conversation_history[-10:] if msg.get('isProactive', False))
        if proactive_count >= 2:  # Max 2 proactive responses per 10 messages
            return False
        
        # MECHANISM 3: User-invoked trigger (highest priority)
        latest_message = recent_user_messages[-1].get('content', '').lower()
        user_request_keywords = [
            '/analyze', '/phân tích', 'phân tích giúp em', 'em đang yếu ở đâu',
            'điểm yếu của em', 'em cần ôn gì', 'em kém phần nào'
        ]
        
        if any(keyword in latest_message for keyword in user_request_keywords):
            frappe.logger().info("INSIGHT TRIGGER: User explicit request")
            return True
        
        # MECHANISM 2: Negative signal trigger (immediate activation)
        confusion_signals = [
            'không hiểu', 'khó quá', 'vẫn chưa rõ', 'tại sao lại', 'sao mà',
            'chỗ này em không', 'em bối rối', 'làm thế nào', 'không biết cách',
            'em mắc ở', 'em nhầm ở đâu', 'em sai chỗ nào', 'gặp khó khăn',
            'gặp vấn đề', 'em khó', 'em yếu', 'em kém'
        ]
        
        # Check last 2 messages for immediate confusion
        for msg in recent_user_messages[-2:]:
            content = msg.get('content', '').lower()
            frappe.logger().info(f"Checking message for confusion: '{content}'")
            for signal in confusion_signals:
                if signal in content:
                    frappe.logger().info(f"INSIGHT TRIGGER: Confusion signal '{signal}' detected in '{content}'")
                    return True
        
        # Check for repetitive questions (same concept asked multiple times)
        if len(recent_user_messages) >= 3:
            contents = [msg.get('content', '').lower() for msg in recent_user_messages[-3:]]
            
            # Simple repetition detection - check for common math terms
            math_terms = ['phương trình', 'căn thức', 'biểu thức', 'đạo hàm', 'tích phân', 
                         'lượng giác', 'hình học', 'đại số', 'vi phân']
            
            for term in math_terms:
                term_count = sum(1 for content in contents if term in content)
                if term_count >= 2:  # Same term mentioned in 2+ recent messages
                    frappe.logger().info(f"INSIGHT TRIGGER: Repetitive pattern detected for '{term}'")
                    return True
        
        # MECHANISM 1: Frequency-based trigger (fallback)
        # Trigger every 4 user messages as baseline
        total_user_messages = len(user_messages)
        if total_user_messages > 0 and total_user_messages % 4 == 0:
            # Additional check: ensure there's enough mathematical content
            math_keywords = ['giải', 'tính', 'phương trình', 'toán', 'công thức', 'bài tập', 
                           'tìm x', '=', 'đạo hàm', 'tích phân', 'căn', 'logarit']
            
            math_message_count = sum(1 for msg in recent_user_messages 
                                   if any(kw in msg.get('content', '').lower() for kw in math_keywords))
            
            if math_message_count >= 2:  # At least 2 math-related messages in recent history
                frappe.logger().info(f"INSIGHT TRIGGER: Frequency-based (every 4 messages) with math content")
                return True
        
        return False
    
    def _handle_with_tutor(self, user_input: str, conversation_str: str) -> str:
        """
        Handle non-math questions with integrated tutor agent
        """
        try:
            prompt = TUTOR_TEMPLATE.replace("{{ conversation_history }}", conversation_str)
            prompt += f"\n\nTin nhắn mới nhất của học sinh: {user_input}"
            
            response = self.call_gemini_api(prompt)
            
            
            response = fix_math_format(response)
            
            return response
            
        except Exception as e:
            error_msg = str(e)
            if len(error_msg) > 80:
                error_msg = error_msg[:80] + "..."
            frappe.log_error(f"Tutor handler failed: {error_msg}", "Tutor Handler Error")
            return "Xin lỗi, tôi không thể trả lời lúc này."
    
    def _handle_math_question(self, user_input: str, image_data: bytes, conversation_str: str) -> str:
        """
        Handle math questions using problem solving engine
        """
        try:
            return self.problem_solver.problem_solving_engine(
                query_text=user_input,
                query_image=image_data,
                conversation_history_str=conversation_str
            )
        except Exception as e:
            frappe.log_error(f"Math question handling failed: {str(e)}")
            return "Xin lỗi, tôi không thể giải bài toán này lúc này."
    
    def _analyze_conversation_and_create_gaps(self, user: str, conversation_str: str, 
                                            topic_context: str = None, analysis_type: str = "General") -> Dict[str, Any]:
        """
        Helper method to ensure consistent insight analysis and Knowledge Gap creation
        """
        try:
            frappe.logger().info(f"🔍 ANALYZE_CONVERSATION: Starting analysis for user={user}, type={analysis_type}")
            frappe.logger().info(f"🔍 CONVERSATION: {conversation_str[:100]}...")
            
            # Analyze conversation for weaknesses
            insights = self.learning_analyzer.insight_agent(conversation_str, topic_context)
            
            frappe.logger().info(f"🔍 INSIGHTS_RESULT: {insights}")
            
            # Always create Knowledge Gap when both weakness and LO are detected
            if insights and insights.get("misunderstood_concepts") and insights.get("learning_object_name"):
                weakness_description = insights["misunderstood_concepts"][0]
                main_lo_id = insights["learning_object_name"]
                
                frappe.logger().info(f"🎯 CREATING_KNOWLEDGE_GAP: user={user}, LO={main_lo_id}, weakness='{weakness_description}'")
                
                # Create knowledge gap record
                gap_name = self.learning_analyzer.create_knowledge_gap(
                    user=user,
                    learning_object=main_lo_id
                )
                
                if gap_name:
                    frappe.logger().info(f"✅ SUCCESS: Created Knowledge Gap {gap_name} for LO {main_lo_id}")
                    insights["knowledge_gap_created"] = gap_name
                    insights["debug_gap_creation"] = "success"
                else:
                    frappe.logger().error(f"❌ FAILED: Knowledge Gap creation returned None for LO {main_lo_id}")
                    insights["debug_gap_creation"] = "failed"
            else:
                frappe.logger().warning(f"⚠️ NO_KNOWLEDGE_GAP: insights={bool(insights)}, concepts={insights.get('misunderstood_concepts') if insights else None}, LO={insights.get('learning_object_name') if insights else None}")
                insights["debug_gap_creation"] = "no_conditions_met"
            
            # Add comprehensive debug info
            insights["debug_analysis"] = {
                "has_insights": bool(insights),
                "has_concepts": bool(insights.get("misunderstood_concepts")) if insights else False,
                "has_learning_object": bool(insights.get("learning_object_name")) if insights else False,
                "concepts_count": len(insights.get("misunderstood_concepts", [])) if insights else 0,
                "learning_object_id": insights.get("learning_object_name") if insights else None,
                "user": user,
                "source_type": analysis_type
            }
            
            return insights
            
        except Exception as e:
            frappe.logger().error(f"❌ ANALYZE_CONVERSATION_ERROR: {str(e)}")
            frappe.log_error(f"Conversation analysis failed: {str(e)}")
            return {"misunderstood_concepts": [], "learning_object_name": None, "sentiment": "neutral"}
    
    def _handle_practice_request(self, user: str, conversation_str: str, topic_context: str = None) -> str:
        """
        Handle practice requests using learning analyzer
        Ensures Knowledge Gap is created when weakness is detected
        """
        try:
            # Use consistent analysis method
            insights = self._analyze_conversation_and_create_gaps(
                user=user, 
                conversation_str=conversation_str, 
                topic_context=topic_context, 
                analysis_type="Practice Request"
            )
            
            if insights and insights.get("misunderstood_concepts"):
                # Use detected weakness for practice generation
                weakness = insights["misunderstood_concepts"][0]
                return self.learning_analyzer.practice_agent(weakness)
            else:
                # No specific weakness detected - generate general practice
                return self.learning_analyzer.practice_agent("các chủ đề toán lớp 9 tổng quát")
                
        except Exception as e:
            frappe.log_error(f"Practice request handling failed: {str(e)}")
            return "Xin lỗi, tôi không thể tạo bài tập lúc này."
    

    
    def _trigger_proactive_practice(self, user: str, conversation_str: str, topic_context: str = None) -> str:
        """
        Trigger proactive practice based on conversation analysis
        """
        try:
            # Use consistent analysis method
            insights = self._analyze_conversation_and_create_gaps(
                user=user, 
                conversation_str=conversation_str, 
                topic_context=topic_context, 
                analysis_type="Proactive Analysis"
            )
            
            if insights and insights.get("misunderstood_concepts") and insights.get("learning_object_name"):
                weakness_description = insights["misunderstood_concepts"][0]
                main_lo_id = insights["learning_object_name"]
                
                # Generate intelligent tutoring response with prerequisite analysis
                intelligent_response = self.learning_analyzer.generate_intelligent_tutoring_response(
                    user=user,
                    main_lo_id=main_lo_id,
                    weakness_description=weakness_description
                )
                
                # Handle both string and dict responses for backward compatibility
                if isinstance(intelligent_response, dict):
                    # Add debug info to response
                    intelligent_response["debug_proactive"] = {
                        "insights_from_analysis": insights.get("debug_analysis", {}),
                        "gap_creation_status": insights.get("debug_gap_creation", "unknown"),
                        "weakness_description": weakness_description,
                        "main_lo_id": main_lo_id
                    }
                    return intelligent_response
                else:
                    return {
                        "type": "simple_text",
                        "content": intelligent_response,
                        "buttons": [],
                        "debug_proactive": {
                            "insights_from_analysis": insights.get("debug_analysis", {}),
                            "gap_creation_status": insights.get("debug_gap_creation", "unknown"),
                            "weakness_description": weakness_description,
                            "main_lo_id": main_lo_id
                        }
                    }
            else:
                return {
                    "debug_proactive": {
                        "no_insights_reason": "missing_concepts_or_learning_object",
                        "insights_data": insights
                    }
                }
                
        except Exception as e:
            frappe.log_error(f"Proactive practice failed: {str(e)}")
            return None
    
    def _format_conversation_history(self, conversation_history: List[Dict]) -> str:
        """
        Format conversation history for AI processing
        """
        try:
            formatted_messages = []
            for msg in conversation_history[-10:]:  # Last 10 messages
                role = msg.get('role', 'unknown')
                content = msg.get('content', '')
                if content:
                    formatted_messages.append(f"{role.capitalize()}: {content}")
            
            return "\n".join(formatted_messages)
            
        except Exception as e:
            error_msg = str(e)
            if len(error_msg) > 80:
                error_msg = error_msg[:80] + "..."
            frappe.log_error(f"Conversation formatting failed: {error_msg}", "Conversation Format Error")
            return ""
    
    def create_chat_session(self, user: str, topic_context: str = None) -> str:
        """
        Create a new chat session
        """
        try:
            frappe.logger().info(f"Creating chat session for user: {user}")
            session_doc = frappe.get_doc({
                "doctype": "Chat Session",
                "user": user,
                "start_time": datetime.now(),
                "topic_context": topic_context
            })
            session_doc.insert(ignore_permissions=True)
            frappe.db.commit()
            frappe.logger().info(f"Chat session created successfully: {session_doc.name}")
            return session_doc.name
            
        except Exception as e:
            error_msg = str(e)
            frappe.logger().error(f"Failed to create chat session: {error_msg}")
            if len(error_msg) > 80:
                error_msg = error_msg[:80] + "..."
            frappe.log_error(f"Failed to create chat session: {error_msg}", "Chat Session Error")
            return None
    
    def save_chat_message(self, session_id: str, sender: str, content: str, 
                         message_type: str = "Text", intent: str = None, attachments_info: list = None) -> str:
        """
        Save a chat message to the chat session
        """
        try:
            # Load the chat session document
            session_doc = frappe.get_doc("Chat Session", session_id)
            
            # Append new message to the messages child table
            message_row = session_doc.append("messages", {
                "sender": sender,
                "message_type": message_type,
                "content": content,
                "attachments": frappe.as_json(attachments_info) if attachments_info else None,
                "timestamp": datetime.now()
            })
            
            # Save the parent document (this will save the child table too)
            session_doc.save(ignore_permissions=True)
            frappe.db.commit()
            
            frappe.logger().info(f"Chat message saved successfully to session {session_id}")
            return message_row.name
            
        except Exception as e:
            error_msg = str(e)
            frappe.logger().error(f"Failed to save chat message: {error_msg}")
            if len(error_msg) > 80:
                error_msg = error_msg[:80] + "..."
            frappe.log_error(f"Failed to save chat message: {error_msg}", "Chat Message Error")
            return None

# Global instance
_tutor_agent = None

def get_tutor_agent():
    """Get or create global tutor agent instance"""
    global _tutor_agent
    if _tutor_agent is None:
        _tutor_agent = TutorAgent()
    return _tutor_agent

@frappe.whitelist()
def handle_chat_message(user: str, user_input: str, conversation_history: str = "", 
                       session_id: str = None, topic_context: str = None, attachment_count: int = 0) -> Dict[str, Any]:
    """
    Main API endpoint for handling chat messages with Learning Object integration
    """
    try:
        tutor = get_tutor_agent()
        
        # Process attachments (images)
        image_bytes = None
        attachments_info = []
        attachment_count = int(attachment_count or 0)
        
        for i in range(attachment_count):
            attachment_key = f'attachment_{i}'
            if attachment_key in frappe.request.files:
                file_obj = frappe.request.files[attachment_key]
                if file_obj and file_obj.filename:
                    # Save file to Frappe
                    file_doc = frappe.get_doc({
                        "doctype": "File",
                        "file_name": file_obj.filename,
                        "content": file_obj.read(),
                        "is_private": 1
                    })
                    file_doc.insert(ignore_permissions=True)
                    
                    # Store attachment info
                    attachments_info.append({
                        "name": file_obj.filename,
                        "url": file_doc.file_url,
                        "content_type": file_obj.content_type
                    })
                    
                    # Check if it's an image for LLM processing
                    if file_obj.content_type and file_obj.content_type.startswith('image/'):
                        file_obj.seek(0)  # Reset file pointer
                        image_bytes = file_obj.read()
                        # Don't break - process all attachments
        
        # Convert conversation history from string to list of dicts
        conversation_list = []
        if conversation_history:
            try:
                conversation_list = json.loads(conversation_history)
            except:
                # If parsing fails, create a simple format
                conversation_list = [{"role": "user", "content": user_input}]
        
        # Handle the message with topic context
        result = tutor.handle_user_message(
            user=user,
            user_input=user_input,
            conversation_history=conversation_list,
            image_data=image_bytes,
            topic_context=topic_context
        )
        
        # Save to database if session_id provided
        if session_id and result.get("success"):
            # Determine message type for user message
            user_message_type = "Image" if attachments_info and any(
                att.get('content_type', '').startswith('image/') for att in attachments_info
            ) else "Text"
            
            # Save user message with attachments
            tutor.save_chat_message(
                session_id=session_id,
                sender="User",
                content=user_input,
                message_type=user_message_type,
                intent=result.get("intent"),
                attachments_info=attachments_info if attachments_info else None
            )
            
            # Save AI response
            tutor.save_chat_message(
                session_id=session_id,
                sender="AI",
                content=result.get("response"),
                message_type="Text"
            )
        
        return result
        
    except Exception as e:
        frappe.log_error(f"Chat message handling failed: {str(e)}")
        return {
            "response": "Rất xin lỗi, tôi đang gặp một chút sự cố.",
            "intent": "error",
            "proactive_response": None,
            "success": False,
            "error": str(e)
        }

@frappe.whitelist()
def create_chat_session(user: str, topic_context: str = None) -> str:
    """
    API endpoint for creating a new chat session
    """
    try:
        tutor = get_tutor_agent()
        return tutor.create_chat_session(user, topic_context)
        
    except Exception as e:
        error_msg = str(e)
        if len(error_msg) > 80:
            error_msg = error_msg[:80] + "..."
        frappe.log_error(f"Chat session creation failed: {error_msg}", "Chat Session Creation Error")
        return None 