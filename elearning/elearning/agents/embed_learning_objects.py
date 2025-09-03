"""
Script to create embeddings for Learning Objects for Insight Agent matching
"""

import frappe
import json
import pickle
import os
from typing import List, Dict
from pathlib import Path

# Import Haystack components
try:
    from haystack import Document
    from haystack.document_stores.in_memory import InMemoryDocumentStore
    from haystack.components.retrievers.in_memory import InMemoryEmbeddingRetriever
    from haystack.components.embedders import SentenceTransformersTextEmbedder
except ImportError:
    frappe.log_error("Haystack not installed")

def fetch_learning_objects() -> List[Dict]:
    """
    Fetch all Learning Objects from Frappe database
    """
    try:
        learning_objects = frappe.get_all(
            "Learning Object",
            fields=["name", "learning_object_title", "description", "topic"]
        )
        
        frappe.logger().info(f"Fetched {len(learning_objects)} Learning Objects")
        return learning_objects
        
    except Exception as e:
        frappe.log_error(f"Failed to fetch Learning Objects: {str(e)}")
        return []

def create_learning_object_documents(learning_objects: List[Dict]) -> List[Document]:
    """
    Convert Learning Objects to Haystack Documents for embedding
    """
    documents = []
    
    for lo in learning_objects:
        # Create searchable content combining title and description
        content_parts = []
        
        if lo.get("learning_object_title"):
            content_parts.append(lo["learning_object_title"])
        
        if lo.get("description"):
            content_parts.append(lo["description"])
        
        # Add topic info for better context
        if lo.get("topic"):
            content_parts.append(f"Chủ đề: {lo['topic']}")
        
        content = " | ".join(content_parts)
        
        # Create Document with metadata
        doc = Document(
            content=content,
            meta={
                "lo_id": lo["name"],
                "title": lo.get("learning_object_title", ""),
                "description": lo.get("description", ""),
                "topic": lo.get("topic", "")
            }
        )
        
        documents.append(doc)
    
    frappe.logger().info(f"Created {len(documents)} Learning Object documents")
    return documents

def embed_and_save_learning_objects():
    """
    Main function to embed Learning Objects and save to file
    """
    try:
        # Fetch Learning Objects from database
        learning_objects = fetch_learning_objects()
        
        if not learning_objects:
            frappe.logger().warning("No Learning Objects found")
            return False
        
        # Convert to documents
        documents = create_learning_object_documents(learning_objects)
        
        # Initialize text embedder
        text_embedder = SentenceTransformersTextEmbedder(
            model="bkai-foundation-models/vietnamese-bi-encoder"
        )
        text_embedder.warm_up()
        
        # Create embeddings for each document
        for doc in documents:
            embedding_result = text_embedder.run(text=doc.content)
            doc.embedding = embedding_result["embedding"]
        
        # Ensure data directory exists
        app_path = frappe.get_app_path("elearning")
        data_dir = os.path.join(app_path, "elearning", "agents", "data")
        os.makedirs(data_dir, exist_ok=True)
        
        # Save embedded documents to pickle file
        output_path = os.path.join(data_dir, "learning_objects_embedded.pkl")
        with open(output_path, "wb") as f:
            pickle.dump(documents, f)
        
        frappe.logger().info(f"Successfully saved {len(documents)} embedded Learning Objects to {output_path}")
        
        # Also save a JSON index for reference
        index_data = []
        for doc in documents:
            index_data.append({
                "lo_id": doc.meta["lo_id"],
                "title": doc.meta["title"],
                "content": doc.content
            })
        
        index_path = os.path.join(data_dir, "learning_objects_index.json")
        with open(index_path, "w", encoding="utf-8") as f:
            json.dump(index_data, f, ensure_ascii=False, indent=2)
        
        frappe.logger().info(f"Also saved index to {index_path}")
        return True
        
    except Exception as e:
        frappe.log_error(f"Failed to embed Learning Objects: {str(e)}")
        return False

@frappe.whitelist()
def generate_learning_object_embeddings():
    """
    API endpoint to generate Learning Object embeddings
    """
    try:
        success = embed_and_save_learning_objects()
        
        if success:
            return {
                "success": True,
                "message": "Learning Object embeddings generated successfully"
            }
        else:
            return {
                "success": False,
                "message": "Failed to generate Learning Object embeddings"
            }
            
    except Exception as e:
        frappe.log_error(f"Learning Object embedding API failed: {str(e)}")
        return {
            "success": False,
            "message": f"Error: {str(e)}"
        }

if __name__ == "__main__":
    # Can be run directly for testing
    embed_and_save_learning_objects()
