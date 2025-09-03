"""
Problem solving agents: Informer (RAG) and Verifier (mathematical validation)
"""

import frappe
import json
import re
import pickle
import os
from typing import Dict, Any, List
from pathlib import Path

# Import and apply math format fix
from elearning.elearning.doctype.chat_message.chat_message import fix_math_format

# Import Haystack components
try:
    from haystack import Pipeline, Document
    from haystack.document_stores.in_memory import InMemoryDocumentStore
    from haystack.components.retrievers.in_memory import InMemoryEmbeddingRetriever
    from haystack.components.builders import PromptBuilder
    from haystack.components.embedders import SentenceTransformersTextEmbedder
except ImportError:
    frappe.log_error("Haystack not installed")

import requests
import base64
from .prompts import INFORMER_TEMPLATE

class ProblemSolver:
    """
    Problem solving engine combining RAG (Informer) and mathematical verification (Verifier)
    """
    
    def __init__(self):
        self.api_key = frappe.conf.get("gemini_api_key")
        self.api_url = None
        if self.api_key:
            self.api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={self.api_key}"
        
        self.document_store = None
        self.retriever = None
        self.text_embedder = None
        self.videos_data = []
        self._load_resources()
    
    def _load_resources(self):
        """Load documents and videos data"""
        try:
            # Get the app path
            app_path = frappe.get_app_path("elearning")
            
            # Load embedded documents
            documents_path = os.path.join(app_path, "elearning", "agents", "data", "embedded_documents.pkl")
            if os.path.exists(documents_path):
                with open(documents_path, "rb") as f:
                    documents = pickle.load(f)
                
                # Initialize document store
                self.document_store = InMemoryDocumentStore()
                self.document_store.write_documents(documents)
                
                # Initialize components
                self.retriever = InMemoryEmbeddingRetriever(document_store=self.document_store)
                self.text_embedder = SentenceTransformersTextEmbedder(
                    model="bkai-foundation-models/vietnamese-bi-encoder"
                )
                
                # Warm up the text embedder
                self.text_embedder.warm_up()
                pass
            else:
                pass
            
            # Load videos data
            videos_path = os.path.join(app_path, "elearning", "agents", "data", "videos.json")
            if os.path.exists(videos_path):
                with open(videos_path, "r", encoding="utf-8") as f:
                    self.videos_data = json.load(f)
                pass
            else:
                pass
                
        except Exception as e:
            frappe.log_error(f"Failed to load resources: {str(e)}")
    
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
    
    def informer_agent(self, query: str, conversation_history_str: str) -> str:
        """
        Informer agent: Solve math problems using RAG with built-in verification
        """
        try:
            if not self.api_key:
                return "Xin lỗi, tôi không thể giải bài này lúc này do API key chưa được cấu hình."
                
            if not self.retriever or not self.text_embedder:
                # Fallback to direct LLM without RAG
                prompt = f"""
Bạn là một gia sư toán học chuyên nghiệp. Hãy giải chi tiết và CHÍNH XÁC bài toán sau:
                
                Câu hỏi: {query}
                
Hãy trả lời bằng tiếng Việt với lời giải từng bước rõ ràng. Kiểm tra lại kết quả trước khi trả lời.
                """
                response = self.call_gemini_api(prompt)
                
                
                return fix_math_format(response)
            
            # Get relevant documents using RAG
            try:
                embedding = self.text_embedder.run(text=query)["embedding"]
                context_docs = self.retriever.run(query_embedding=embedding)["documents"]
                
                # Build prompt with context
                prompt = INFORMER_TEMPLATE.replace("{{ query }}", query)
                prompt = prompt.replace("{{ conversation_history }}", conversation_history_str)
                
                # Add document context
                doc_context = ""
                for doc in context_docs:
                    doc_context += f"{doc.content}\n\n"
                prompt = prompt.replace("{% for doc in documents %}\n{{ doc.content }}\n{% endfor %}", doc_context)
                
                response = self.call_gemini_api(prompt)

                return fix_math_format(response)
                
            except Exception:
                # Fallback if RAG fails
                prompt = f"""
Bạn là một gia sư toán học chuyên nghiệp. Hãy giải chi tiết và CHÍNH XÁC bài toán sau:

Câu hỏi: {query}

Hãy trả lời bằng tiếng Việt với lời giải từng bước rõ ràng. Kiểm tra lại kết quả trước khi trả lời.
"""
                response = self.call_gemini_api(prompt)
                
                return fix_math_format(response)
            
        except Exception as e:
            frappe.log_error(f"Informer agent failed: {str(e)[:80]}...", "Informer Agent Error")
            return "Xin lỗi, tôi không thể giải bài này lúc này."
    
    def extract_text_from_image(self, image_data: bytes) -> str:
        """
        Extract text from image using Gemini Vision API
        """
        try:
            if not self.api_key:
                return ""
            
            # Encode image to base64
            image_b64 = base64.b64encode(image_data).decode('utf-8')
            
            payload = {
                "contents": [
                    {
                        "role": "user", 
                        "parts": [
                            {"text": "Bạn là một hệ thống OCR toán học siêu chính xác. Hãy đọc và trích xuất toàn bộ văn bản từ hình ảnh sau đây. Chỉ trả về phần văn bản được trích xuất."},
                            {
                                "inline_data": {
                                    "mime_type": "image/jpeg",
                                    "data": image_b64
                                }
                            }
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.1,
                    "topP": 0.8,
                    "maxOutputTokens": 512,
                },
            }
            
            response = requests.post(self.api_url, json=payload, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                if data.get("candidates") and len(data["candidates"]) > 0:
                    text = (
                        data.get("candidates", [{}])[0]
                        .get("content", {})
                        .get("parts", [{}])[0]
                        .get("text", "")
                    )
                    return text.strip()
            
            return ""
                
        except Exception as e:
            frappe.log_error(f"Error extracting text from image: {str(e)[:80]}...", "OCR Error")
            return ""
    
    def problem_solving_engine(self, query_text: str, query_image: bytes = None, 
                             conversation_history_str: str = "") -> str:
        """
        Main problem solving engine combining multimodal input processing
        """
        try:
            # Extract text from image if provided
            extracted_text_from_image = ""
            if query_image:
                extracted_text_from_image = self.extract_text_from_image(query_image)
            
            # Combine text inputs
            full_query_text = (query_text + " " + extracted_text_from_image).strip()
            
            if not full_query_text:
                return "Xin lỗi, tôi không thể hiểu được câu hỏi của bạn."
            
            # Get answer from Informer agent (with built-in verification)
            answer = self.informer_agent(full_query_text, conversation_history_str)
            
            # Check if answer is meaningful
            if not answer or answer.strip() == "" or "không thể" in answer.lower():
                    return "Xin lỗi, tôi đang gặp khó khăn khi giải bài toán này. Bạn có thể thử lại không?"
            
            return answer
                
        except Exception as e:
            frappe.log_error(f"Problem solving engine failed: {str(e)[:80]}...", "Problem Solver Error")
            return "Xin lỗi, đã có lỗi khi xử lý yêu cầu của bạn."

# Global instance
_problem_solver = None

def get_problem_solver():
    """Get or create global problem solver instance"""
    global _problem_solver
    if _problem_solver is None:
        _problem_solver = ProblemSolver()
    return _problem_solver

@frappe.whitelist()
def solve_math_problem(query_text: str, conversation_history: str = "", image_data: str = None) -> str:
    """
    API endpoint for solving math problems
    """
    try:
        solver = get_problem_solver()
        
        # Convert image data if provided
        query_image = None
        if image_data:
            query_image = base64.b64decode(image_data)
        
        result = solver.problem_solving_engine(
            query_text=query_text,
            query_image=query_image,
            conversation_history_str=conversation_history
        )
        
        return result
        
    except Exception as e:
        error_msg = str(e)
        if len(error_msg) > 80:
            error_msg = error_msg[:80] + "..."
        frappe.log_error(f"Math problem solving API failed: {error_msg}", "Problem Solver API Error")
        return "Xin lỗi, đã có lỗi khi xử lý yêu cầu của bạn." 