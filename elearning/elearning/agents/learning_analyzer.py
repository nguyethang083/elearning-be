"""
Learning analysis agents: Insight (weakness detection) and Practice (exercise generation)
"""

import frappe
import json
import re
import pickle
from typing import Dict, Any, List
from datetime import datetime
import os

import requests
from .prompts import INSIGHT_TEMPLATE, PRACTICE_TEMPLATE

# Import and apply math format fix
from elearning.elearning.doctype.chat_message.chat_message import fix_math_format

class LearningAnalyzer:
    """
    Learning analysis engine combining weakness detection and practice generation
    """
    
    def __init__(self):
        self.api_key = frappe.conf.get("gemini_api_key")
        self.api_url = None
        if self.api_key:
            self.api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={self.api_key}"
        self.videos_data = []
        self.lo_document_store = None
        self.lo_retriever = None
        self.lo_text_embedder = None
        self._load_videos_data()
        self._load_learning_object_embeddings()
    
    def _load_videos_data(self):
        """Load videos data for practice recommendations"""
        try:
            app_path = frappe.get_app_path("elearning")
            videos_path = os.path.join(app_path, "elearning", "agents", "data", "videos.json")
            
            if os.path.exists(videos_path):
                with open(videos_path, "r", encoding="utf-8") as f:
                    self.videos_data = json.load(f)
                pass
            else:
                pass
                
        except Exception as e:
            frappe.log_error(f"Failed to load videos data: {str(e)}")
    
    def _load_learning_object_embeddings(self):
        """Load Learning Object embeddings for matching"""
        try:
            app_path = frappe.get_app_path("elearning")
            lo_embeddings_path = os.path.join(app_path, "elearning", "agents", "data", "learning_objects_embedded.pkl")
            
            if os.path.exists(lo_embeddings_path):
                with open(lo_embeddings_path, "rb") as f:
                    lo_documents = pickle.load(f)
                
                # Initialize document store for Learning Objects
                try:
                    from haystack.document_stores.in_memory import InMemoryDocumentStore
                    from haystack.components.retrievers.in_memory import InMemoryEmbeddingRetriever
                    from haystack.components.embedders import SentenceTransformersTextEmbedder
                    
                    self.lo_document_store = InMemoryDocumentStore()
                    self.lo_document_store.write_documents(lo_documents)
                    
                    # Initialize retriever for Learning Objects
                    self.lo_retriever = InMemoryEmbeddingRetriever(document_store=self.lo_document_store)
                    
                    # Initialize text embedder for queries
                    self.lo_text_embedder = SentenceTransformersTextEmbedder(
                        model="bkai-foundation-models/vietnamese-bi-encoder"
                    )
                    self.lo_text_embedder.warm_up()
                    
                    frappe.logger().info(f"Loaded {len(lo_documents)} Learning Object embeddings")
                    
                except ImportError:
                    frappe.log_error("Haystack not available for Learning Object matching")
                    
            else:
                frappe.logger().warning("Learning Object embeddings not found. Run embed_learning_objects.py first.")
                
        except Exception as e:
            frappe.log_error(f"Failed to load Learning Object embeddings: {str(e)}")
    
    def find_best_matching_lo(self, query_text: str, top_k: int = 1) -> str:
        """
        Find the best matching Learning Object ID for a weakness query
        """
        try:
            if not self.lo_retriever or not self.lo_text_embedder:
                frappe.logger().warning("Learning Object embeddings not loaded")
                return None
            
            # Create embedding for the query
            embedding_result = self.lo_text_embedder.run(text=query_text)
            query_embedding = embedding_result["embedding"]
            
            # Retrieve most similar Learning Objects
            results = self.lo_retriever.run(
                query_embedding=query_embedding,
                top_k=top_k
            )
            
            if results["documents"] and len(results["documents"]) > 0:
                best_match = results["documents"][0]
                lo_id = best_match.meta.get("lo_id")
                
                frappe.logger().info(f"Found matching LO: {lo_id} for query: {query_text}")
                return lo_id
            
            return None
            
        except Exception as e:
            frappe.log_error(f"Error finding matching Learning Object: {str(e)[:80]}...", "LO Matching Error")
            return None
    
    def get_learning_object_prerequisites(self, lo_id: str) -> List[Dict]:
        """
        Get prerequisites for a Learning Object from child table
        """
        try:
            prerequisites = frappe.get_all(
                "Learning Object Prerequisite",
                filters={"parent": lo_id},
                fields=["prerequisite_learning_object", "parent", "parentfield"]
            )
            
            return prerequisites
            
        except Exception as e:
            frappe.log_error(f"Error getting LO prerequisites: {str(e)[:80]}...", "LO Prerequisites Error")
            return []
    
    def check_user_knowledge_gaps(self, user: str, lo_ids: List[str]) -> List[str]:
        """
        Check if user has knowledge gaps for specific Learning Objects
        """
        try:
            if not lo_ids:
                return []
            
            existing_gaps = frappe.get_all(
                "Knowledge Gap",
                filters={
                    "user": user,
                    "learning_object": ["in", lo_ids]
                },
                fields=["learning_object"]
            )
            
            return [gap["learning_object"] for gap in existing_gaps]
            
        except Exception as e:
            frappe.log_error(f"Error checking knowledge gaps: {str(e)[:80]}...", "Knowledge Gap Check Error")
            return []
    
    def analyze_prerequisite_gaps(self, user: str, main_lo_id: str) -> Dict[str, Any]:
        """
        Analyze prerequisite gaps for intelligent tutoring
        Returns analysis with recommendation strategy
        """
        try:
            # Get prerequisites for the main Learning Object
            prerequisites = self.get_learning_object_prerequisites(main_lo_id)
            
            if not prerequisites:
                return {
                    "has_prerequisites": False,
                    "strategy": "direct_practice",
                    "message": "Chỉ yếu phần ngọn - Luyện tập trực tiếp"
                }
            
            # Extract prerequisite LO IDs
            prerequisite_ids = [p["prerequisite_learning_object"] for p in prerequisites]
            
            # Check if user has gaps in these prerequisites
            user_prerequisite_gaps = self.check_user_knowledge_gaps(user, prerequisite_ids)
            
            if user_prerequisite_gaps:
                # Scenario A: Yếu cả gốc rễ
                return {
                    "has_prerequisites": True,
                    "strategy": "foundation_first",
                    "weak_prerequisites": user_prerequisite_gaps,
                    "all_prerequisites": prerequisite_ids,
                    "message": "Yếu cả gốc rễ - Cần ôn lại kiến thức nền tảng"
                }
            else:
                # Scenario B: Chỉ yếu phần ngọn
                return {
                    "has_prerequisites": True,
                    "strategy": "targeted_practice", 
                    "prerequisites": prerequisite_ids,
                    "message": "Chỉ yếu phần ngọn - Luyện tập có định hướng"
                }
                
        except Exception as e:
            frappe.log_error(f"Error analyzing prerequisite gaps: {str(e)[:80]}...", "Prerequisite Analysis Error")
            return {
                "has_prerequisites": False,
                "strategy": "direct_practice",
                "message": "Lỗi phân tích - Luyện tập trực tiếp"
            }
    
    def call_gemini_api(self, prompt: str) -> str:
        """
        Call Gemini AI API following chat_message.py pattern
        """
        try:
            if not self.api_key:
                return ""
            
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
            
            return ""
                
        except Exception as e:
            frappe.log_error(f"Error calling Gemini API: {str(e)[:80]}...", "Gemini API Error")
            return ""
    
    def insight_agent(self, conversation_history: str, topic_context: str = None) -> Dict[str, Any]:
        """
        Enhanced Insight agent: Analyze conversation to detect learning weaknesses
        Uses LLM to extract weakness query, then vector matching to find Learning Objects
        """
        try:
            if not self.api_key:
                return {"misunderstood_concepts": [], "learning_object_name": None, "sentiment": "neutral"}
            
            # Step 1: Use LLM to extract weakness query (simplified INSIGHT_TEMPLATE)
            analysis_prompt = f"""
Bạn là một chuyên gia phân tích giáo dục. Hãy đọc kỹ đoạn hội thoại sau và xác định những khái niệm toán học mà học sinh đang gặp khó khăn.

**Hội thoại:**
{conversation_history}

**Nhiệm vụ:**
1. Phân tích những câu hỏi hoặc nhận định của học sinh thể hiện sự nhầm lẫn hoặc thiếu hiểu biết
2. Trích xuất ra một cụm từ mô tả chính xác khó khăn của học sinh (ví dụ: "khó khăn khi trục căn thức ở mẫu", "nhầm lẫn về điều kiện áp dụng hệ thức Vi-ét")
3. Đánh giá cảm xúc của học sinh

**Trả lời theo format JSON:**
{{"weakness_query": "[Mô tả ngắn gọn và chính xác khó khăn của học sinh]", "sentiment": "[confused/frustrated/neutral]"}}

Chỉ trả về JSON, không thêm văn bản khác.
"""
            
            # Get LLM analysis
            llm_response = self.call_gemini_api(analysis_prompt)
            
            # Extract JSON from LLM response
            json_match = re.search(r"\{.*\}", llm_response, re.DOTALL)
            if not json_match:
                return {"misunderstood_concepts": [], "learning_object_name": None, "sentiment": "neutral"}
            
            analysis_result = json.loads(json_match.group(0))
            weakness_query = analysis_result.get("weakness_query", "")
            sentiment = analysis_result.get("sentiment", "neutral")
            
            if not weakness_query:
                return {"misunderstood_concepts": [], "learning_object_name": None, "sentiment": sentiment}
            
            # Step 2: Use vector matching to find best Learning Object
            matching_lo_id = self.find_best_matching_lo(weakness_query)
            
            # Format result with debug info
            result = {
                "misunderstood_concepts": [weakness_query],
                "learning_object_name": matching_lo_id,
                "sentiment": sentiment,
                "debug_insight": {
                    "step": "completed",
                    "weakness_query": weakness_query,
                    "matching_lo_id": matching_lo_id,
                    "vector_match_success": bool(matching_lo_id),
                    "llm_analysis_result": analysis_result
                }
            }
            
            frappe.logger().info(f"🎯 INSIGHT_RESULT: weakness='{weakness_query}', LO={matching_lo_id}, sentiment={sentiment}")
            return result
                
        except Exception as e:
            error_msg = str(e)
            if len(error_msg) > 80:
                error_msg = error_msg[:80] + "..."
            frappe.log_error(f"Enhanced insight agent failed: {error_msg}", "Enhanced Insight Agent Error")
            return {"misunderstood_concepts": [], "learning_object_name": None, "sentiment": "neutral"}
    
    def _get_learning_objects_for_topic(self, topic_context: str = None) -> List[Dict]:
        """
        Get Learning Objects for a specific topic or all active ones
        """
        try:
            filters = {"is_active": 1}
            
            # If topic context is provided, filter by topic
            if topic_context:
                # Try to find topic by name or ID
                topic_doc = frappe.get_all(
                    "Topics",
                    filters={"name": topic_context},
                    fields=["name"],
                    limit=1
                )
                
                if topic_doc:
                    filters["topic"] = topic_doc[0].name
                else:
                    # If not found by name, try to find by title
                    topic_doc = frappe.get_all(
                        "Topics",
                        filters={"topic_title": ["like", f"%{topic_context}%"]},
                        fields=["name"],
                        limit=1
                    )
                    if topic_doc:
                        filters["topic"] = topic_doc[0].name
            
            # Get learning objects
            learning_objects = frappe.get_all(
                "Learning Object",
                filters=filters,
                fields=["name", "learning_object_title", "description", "topic"],
                order_by="learning_object_title"
            )
            
            frappe.logger().info(f"Found {len(learning_objects)} learning objects for topic: {topic_context}")
            return learning_objects
            
        except Exception as e:
            frappe.log_error(f"Failed to get learning objects: {str(e)}")
            return []
    
    def _format_learning_objects_for_prompt(self, learning_objects: List[Dict]) -> str:
        """
        Format learning objects for the prompt
        """
        try:
            formatted_list = []
            for lo in learning_objects:
                title = lo.get("learning_object_title", "Unknown")
                name = lo.get("name", "")
                description = lo.get("description", "")
                
                # Create a concise description
                if description:
                    # Truncate description if too long
                    desc = description[:100] + "..." if len(description) > 100 else description
                    formatted_list.append(f"- {name}: {title} ({desc})")
                else:
                    formatted_list.append(f"- {name}: {title}")
            
            return "\n".join(formatted_list)
            
        except Exception as e:
            frappe.log_error(f"Failed to format learning objects: {str(e)}")
            return ""
    
    def practice_agent(self, student_weakness: str) -> str:
        """
        Practice agent: Generate exercises and video recommendations
        """
        try:
            if not self.api_key:
                return "Xin lỗi, tôi không thể tạo bài tập lúc này."
            
            # Prepare video data for prompt
            video_cheatsheet = []
            for video in self.videos_data:
                video_cheatsheet.append({
                    "title": video.get("title", ""),
                    "keywords": video.get("keywords", []),
                    "summary": video.get("summary_for_llm", "")
                })
            
            video_json = json.dumps(video_cheatsheet, ensure_ascii=False)
            
            # Build practice prompt
            prompt = PRACTICE_TEMPLATE.replace("{{ student_weakness }}", student_weakness)
            prompt = prompt.replace("{{ video_cheatsheet_json }}", video_json)
            
            # Generate practice content
            practice_content = self.call_gemini_api(prompt)
            
            if not practice_content:
                return "Xin lỗi, tôi không thể tạo bài tập lúc này."
            
            
            practice_content = fix_math_format(practice_content)
            
            return practice_content
            
        except Exception as e:
            error_msg = str(e)
            if len(error_msg) > 80:
                error_msg = error_msg[:80] + "..."
            frappe.log_error(f"Practice agent failed: {error_msg}", "Practice Agent Error")
            return "Xin lỗi, tôi không thể tạo bài tập lúc này."
    
    def generate_intelligent_tutoring_response(self, user: str, main_lo_id: str, weakness_description: str) -> str:
        """
        Generate intelligent tutoring response based on prerequisite analysis
        """
        try:
            # Analyze prerequisite gaps
            analysis = self.analyze_prerequisite_gaps(user, main_lo_id)
            
            # Get Learning Object details
            lo_details = frappe.get_doc("Learning Object", main_lo_id)
            lo_title = lo_details.get("learning_object_title", "")
            
            if analysis["strategy"] == "foundation_first":
                # Scenario A: Yếu cả gốc rễ
                weak_prerequisites = analysis.get("weak_prerequisites", [])
                
                # Get prerequisite details
                prerequisite_titles = []
                for prereq_id in weak_prerequisites:
                    try:
                        prereq_doc = frappe.get_doc("Learning Object", prereq_id)
                        prerequisite_titles.append(prereq_doc.get("learning_object_title", prereq_id))
                    except:
                        prerequisite_titles.append(prereq_id)
                
                response = {
                    "type": "intelligent_tutoring",
                    "strategy": "foundation_first",
                    "content": f"""💡 **Phân tích thông minh:**

{user} này, mình thấy bạn đang gặp khó khăn với phần **"{lo_title}"**. 

Có vẻ như để hiểu rõ phần này, chúng ta cần xem lại một chút kiến thức nền tảng trước nhé:

🔗 **Kiến thức cần ôn lại:**
{chr(10).join([f"• {title}" for title in prerequisite_titles])}

Bạn có muốn ôn lại những phần nền tảng này trước không?""",
                    "buttons": [
                        {
                            "text": "Ôn lại kiến thức nền tảng",
                            "action": "review_prerequisites",
                            "data": {"prerequisites": weak_prerequisites}
                        },
                        {
                            "text": f"Bỏ qua, học \"{lo_title}\" luôn",
                            "action": "skip_prerequisites",
                            "data": {"main_lo": main_lo_id}
                        }
                    ],
                    "main_lo": main_lo_id,
                    "prerequisites": weak_prerequisites
                }

            elif analysis["strategy"] == "targeted_practice":
                # Scenario B: Chỉ yếu phần ngọn
                response = {
                    "type": "intelligent_tutoring",
                    "strategy": "targeted_practice",
                    "content": f"""💡 **Phân tích thông minh:**

Mình thấy bạn đang gặp một chút vướng mắc với **"{lo_title}"**. Đây là một kỹ năng quan trọng và bạn đã có đủ kiến thức nền tảng rồi.

Bạn có muốn làm một vài bài tập hoặc xem video về chủ đề này để nắm vững hơn không?""",
                    "buttons": [
                        {
                            "text": "Luyện tập ngay",
                            "action": "start_practice",
                            "data": {"main_lo": main_lo_id, "weakness": weakness_description}
                        },
                        {
                            "text": "Xem video gợi ý", 
                            "action": "watch_video",
                            "data": {"main_lo": main_lo_id, "topic": lo_details.get("topic", "")}
                        }
                    ],
                    "main_lo": main_lo_id
                }

            else:
                # Direct practice
                response = {
                    "type": "simple_practice",
                    "strategy": "direct_practice",
                    "content": f"""💡 **Gợi ý luyện tập:**

Mình thấy bạn cần luyện tập thêm về **"{lo_title}"**. Hãy cùng nhau làm một số bài tập để củng cố kiến thức nhé!""",
                    "buttons": [
                        {
                            "text": "Bắt đầu luyện tập",
                            "action": "start_practice",
                            "data": {"main_lo": main_lo_id, "weakness": weakness_description}
                        }
                    ],
                    "main_lo": main_lo_id
                }
            
            return response
            
        except Exception as e:
            error_msg = str(e)
            if len(error_msg) > 80:
                error_msg = error_msg[:80] + "..."
            frappe.log_error(f"Intelligent tutoring response failed: {error_msg}", "Intelligent Tutoring Error")
            
            # Fallback response
            return {
                "type": "fallback",
                "strategy": "direct_practice", 
                "content": f"""💡 **Gợi ý học tập:**

Mình thấy bạn cần luyện tập thêm về **"{weakness_description}"**. Hãy cùng nhau làm một số bài tập để củng cố kiến thức nhé!""",
                "buttons": [
                    {
                        "text": "Bắt đầu luyện tập",
                        "action": "start_practice",
                        "data": {"weakness": weakness_description}
                    }
                ]
            }
    
    def create_knowledge_gap(self, user: str, learning_object: str) -> str:
        try:
            frappe.logger().info(f"🎯 CREATE_KNOWLEDGE_GAP: Starting for user={user}, LO={learning_object}")
            
            # Validate Learning Object exists
            if not frappe.db.exists("Learning Object", learning_object):
                frappe.logger().error(f"❌ Learning Object {learning_object} does not exist!")
                return None
            
            # Check if knowledge gap already exists
            existing_gap = frappe.get_all(
                "Knowledge Gap",
                filters={
                    "user": user,
                    "learning_object": learning_object,
                    "status": ["in", ["Identified", "Addressing"]]
                },
                limit=1
            )
            
            frappe.logger().info(f"🔍 EXISTING_GAP_CHECK: Found {len(existing_gap)} existing gaps")
            
            if existing_gap:
                # Update existing gap
                gap_doc = frappe.get_doc("Knowledge Gap", existing_gap[0].name)
                gap_doc.last_detected_on = datetime.now()
                gap_doc.save(ignore_permissions=True) 
                frappe.logger().info(f"✅ Updated existing knowledge gap: {gap_doc.name}")
            else:
                # Create new knowledge gap
                frappe.logger().info(f"📝 Creating new Knowledge Gap with data: user={user}, LO={learning_object}")
                
                gap_doc = frappe.get_doc({
                    "doctype": "Knowledge Gap",
                    "user": user,
                    "learning_object": learning_object,
                    "status": "Identified",
                    "last_detected_on": datetime.now()
                    # Skip source fields to avoid validation errors
                })
                
                frappe.logger().info(f"📋 Gap doc before insert: {gap_doc.as_dict()}")
                gap_doc.insert(ignore_permissions=True) 
                frappe.logger().info(f"✅ Created new knowledge gap: {gap_doc.name}")
            
            frappe.db.commit()
            frappe.logger().info(f"💾 Database committed for Knowledge Gap: {gap_doc.name}")
            
            return gap_doc.name
                
        except Exception as e:
            error_msg = str(e)
            frappe.logger().error(f"❌ CREATE_KNOWLEDGE_GAP_ERROR: {error_msg}")
            frappe.log_error(f"Failed to create knowledge gap: {error_msg}")
            frappe.db.rollback()
            return None
    
    def analyze_and_store_weaknesses(self, user: str, conversation_history: str) -> List[str]:
        """
        Analyze conversation for weaknesses and store them as Knowledge Gaps
        """
        try:
            # Get insights from conversation
            insights = self.insight_agent(conversation_history)
            misunderstood_concepts = insights.get("misunderstood_concepts", [])
            
            created_gaps = []
            
            for concept in misunderstood_concepts:
                # Try to find matching learning object
                learning_object = self._find_learning_object_for_concept(concept)
                
                if learning_object:
                    gap_name = self.create_knowledge_gap(
                        user=user,
                        learning_object=learning_object
                    )
                    if gap_name:
                        created_gaps.append(gap_name)
            
            frappe.logger().info(f"Created {len(created_gaps)} knowledge gaps for user {user}")
            return created_gaps
            
        except Exception as e:
            frappe.log_error(f"Failed to analyze and store weaknesses: {str(e)}")
            return []
    
    def _find_learning_object_for_concept(self, concept: str) -> str:
        """
        Find the best matching Learning Object for a concept
        This is a simplified implementation - in production, you might want
        to use semantic search or keyword matching
        """
        try:
            # Search for learning objects that might match the concept
            learning_objects = frappe.get_all(
                "Learning Object",
                filters={"is_active": 1},
                fields=["name", "title", "description"]
            )
            
            # Simple keyword matching (can be improved with semantic search)
            concept_lower = concept.lower()
            
            for lo in learning_objects:
                title_lower = lo.title.lower() if lo.title else ""
                desc_lower = lo.description.lower() if lo.description else ""
                
                if (concept_lower in title_lower or 
                    concept_lower in desc_lower or
                    any(keyword in concept_lower for keyword in title_lower.split())):
                    return lo.name
            
            # If no match found, return None
            return None
            
        except Exception as e:
            frappe.log_error(f"Failed to find learning object for concept {concept}: {str(e)}")
            return None
    
    def generate_practice_for_weakness(self, user: str, weakness_concept: str = None) -> str:
        """
        Generate practice content for a specific weakness or general practice
        """
        try:
            if not weakness_concept:
                # Get user's most recent knowledge gaps
                recent_gaps = frappe.get_all(
                    "Knowledge Gap",
                    filters={
                        "user": user,
                        "status": ["in", ["Identified", "Addressing"]]
                    },
                    fields=["learning_object"],
                    order_by="last_detected_on desc",
                    limit=1
                )
                
                if recent_gaps:
                    learning_object = frappe.get_doc("Learning Object", recent_gaps[0].learning_object)
                    weakness_concept = learning_object.title
                else:
                    weakness_concept = "các chủ đề toán lớp 9 tổng quát"
            
            # Generate practice content
            practice_content = self.practice_agent(weakness_concept)
            
            frappe.logger().info(f"Generated practice for user {user}, weakness: {weakness_concept}")
            return practice_content
            
        except Exception as e:
            frappe.log_error(f"Failed to generate practice: {str(e)}")
            return "Xin lỗi, tôi không thể tạo bài tập lúc này."

# Global instance
_learning_analyzer = None

def get_learning_analyzer():
    """Get or create global learning analyzer instance"""
    global _learning_analyzer
    if _learning_analyzer is None:
        _learning_analyzer = LearningAnalyzer()
    return _learning_analyzer

@frappe.whitelist()
def analyze_learning_weaknesses(user: str, conversation_history: str, topic_context: str = None) -> Dict[str, Any]:
    """
    API endpoint for analyzing learning weaknesses with Learning Object integration
    """
    try:
        analyzer = get_learning_analyzer()
        
        # Analyze conversation with topic context
        insights = analyzer.insight_agent(conversation_history, topic_context)
        
        # Store weaknesses as knowledge gaps
        created_gaps = analyzer.analyze_and_store_weaknesses(
            user=user,
            conversation_history=conversation_history,
            topic_context=topic_context
        )
        
        return {
            "insights": insights,
            "created_gaps": created_gaps,
            "success": True
        }
        
    except Exception as e:
        frappe.log_error(f"Learning weakness analysis failed: {str(e)}")
        return {
            "insights": {"misunderstood_concepts": [], "learning_object_name": None, "sentiment": "neutral"},
            "created_gaps": [],
            "success": False,
            "error": str(e)
        }

@frappe.whitelist()
def generate_practice_exercises(user: str, weakness_concept: str = None) -> str:
    """
    API endpoint for generating practice exercises
    """
    try:
        analyzer = get_learning_analyzer()
        return analyzer.generate_practice_for_weakness(user, weakness_concept)
        
    except Exception as e:
        frappe.log_error(f"Practice generation failed: {str(e)}")
        return "Xin lỗi, tôi không thể tạo bài tập lúc này." 

@frappe.whitelist()
def get_learning_objects_for_topic(topic_context: str = None) -> Dict[str, Any]:
    """
    API endpoint for getting learning objects for a specific topic
    """
    try:
        analyzer = get_learning_analyzer()
        learning_objects = analyzer._get_learning_objects_for_topic(topic_context)
        
        # Format for frontend consumption
        formatted_objects = []
        for lo in learning_objects:
            formatted_objects.append({
                "name": lo.get("name"),
                "title": lo.get("learning_object_title"),
                "description": lo.get("description"),
                "topic": lo.get("topic")
            })
        
        return {
            "learning_objects": formatted_objects,
            "count": len(formatted_objects),
            "topic_context": topic_context,
            "success": True
        }
        
    except Exception as e:
        frappe.log_error(f"Failed to get learning objects: {str(e)}")
        return {
            "learning_objects": [],
            "count": 0,
            "topic_context": topic_context,
            "success": False,
            "error": str(e)
        }

@frappe.whitelist()
def generate_learning_object_embeddings():
    """
    API endpoint to generate Learning Object embeddings
    """
    try:
        from .embed_learning_objects import embed_and_save_learning_objects
        
        success = embed_and_save_learning_objects()
        
        if success:
            return {
                "success": True,
                "message": "Learning Object embeddings generated successfully. Restart the application to load them."
            }
        else:
            return {
                "success": False,
                "message": "Failed to generate Learning Object embeddings"
            }
            
    except Exception as e:
        error_msg = str(e)
        if len(error_msg) > 80:
            error_msg = error_msg[:80] + "..."
        frappe.log_error(f"Learning Object embedding API failed: {error_msg}", "LO Embedding API Error")
        return {
            "success": False,
            "message": f"Error: {str(e)}"
        }

@frappe.whitelist()
def test_intelligent_tutoring(user: str, learning_object_id: str, weakness_description: str = ""):
    """
    API endpoint to test intelligent tutoring with prerequisite analysis
    """
    try:
        analyzer = get_learning_analyzer()
        
        # Generate intelligent tutoring response
        response = analyzer.generate_intelligent_tutoring_response(
            user=user,
            main_lo_id=learning_object_id,
            weakness_description=weakness_description or f"Test weakness for {learning_object_id}"
        )
        
        # Also get analysis details for debugging
        analysis = analyzer.analyze_prerequisite_gaps(user, learning_object_id)
        
        return {
            "success": True,
            "tutoring_response": response,
            "analysis_details": analysis,
            "message": "Intelligent tutoring response generated successfully"
        }
        
    except Exception as e:
        error_msg = str(e)
        if len(error_msg) > 80:
            error_msg = error_msg[:80] + "..."
        frappe.log_error(f"Test intelligent tutoring failed: {error_msg}", "Test Intelligent Tutoring Error")
        return {
            "success": False,
            "message": f"Error: {str(e)}"
        } 