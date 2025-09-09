import frappe
import json
import os
from datetime import datetime, timedelta
from collections import defaultdict

def get_token_usage_file_path():
    """Get the path to the token usage file"""
    logs_dir = os.path.join(frappe.get_site_path(), "logs")
    return os.path.join(logs_dir, "gemini_token_usage.jsonl")

def read_token_usage_data():
    """Read all token usage data from the file"""
    token_file_path = get_token_usage_file_path()
    
    if not os.path.exists(token_file_path):
        return []
    
    usage_data = []
    try:
        with open(token_file_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    data = json.loads(line)
                    usage_data.append(data)
    except Exception as e:
        frappe.log_error(f"Error reading token usage data: {e}")
    
    return usage_data

def get_user_token_summary(user_id=None, days=None):
    """Get token usage summary for a specific user or all users"""
    usage_data = read_token_usage_data()
    
    if not usage_data:
        return {"message": "No token usage data found"}
    
    # Filter by date if specified
    if days:
        cutoff_date = datetime.now() - timedelta(days=days)
        usage_data = [
            data for data in usage_data 
            if datetime.fromisoformat(data["timestamp"]) >= cutoff_date
        ]
    
    # Filter by user if specified
    if user_id:
        usage_data = [data for data in usage_data if data["user_id"] == user_id]
    
    # Aggregate data
    user_summaries = defaultdict(lambda: {
        "total_input_tokens": 0,
        "total_output_tokens": 0,
        "total_tokens": 0,
        "total_cost": 0.0,
        "question_count": 0,
        "questions": []
    })
    
    for data in usage_data:
        uid = data["user_id"]
        user_summaries[uid]["total_input_tokens"] += data["input_tokens"]
        user_summaries[uid]["total_output_tokens"] += data["output_tokens"]
        user_summaries[uid]["total_tokens"] += data["total_tokens"]
        user_summaries[uid]["total_cost"] += data["estimated_cost_usd"]
        user_summaries[uid]["question_count"] += 1
        user_summaries[uid]["questions"].append({
            "timestamp": data["timestamp"],
            "question_name": data["question_name"],
            "input_tokens": data["input_tokens"],
            "output_tokens": data["output_tokens"],
            "cost": data["estimated_cost_usd"]
        })
    
    # Convert to regular dict and sort questions by timestamp
    result = dict(user_summaries)
    for uid in result:
        result[uid]["questions"].sort(key=lambda x: x["timestamp"], reverse=True)
        # Round costs to 6 decimal places
        result[uid]["total_cost"] = round(result[uid]["total_cost"], 6)
    
    return result

def get_overall_statistics(days=None):
    """Get overall token usage statistics"""
    usage_data = read_token_usage_data()
    
    if not usage_data:
        return {
            "period_days": days,
            "total_input_tokens": 0,
            "total_output_tokens": 0,
            "total_tokens": 0,
            "total_cost_usd": 0.0,
            "unique_users": 0,
            "total_questions_graded": 0,
            "average_cost_per_question": 0.0,
            "average_input_tokens_per_question": 0.0,
            "average_output_tokens_per_question": 0.0
        }
    
    # Filter by date if specified
    if days:
        cutoff_date = datetime.now() - timedelta(days=days)
        usage_data = [
            data for data in usage_data 
            if datetime.fromisoformat(data["timestamp"]) >= cutoff_date
        ]
    
    # Check if filtering resulted in empty data
    if not usage_data:
        return {
            "period_days": days,
            "total_input_tokens": 0,
            "total_output_tokens": 0,
            "total_tokens": 0,
            "total_cost_usd": 0.0,
            "unique_users": 0,
            "total_questions_graded": 0,
            "average_cost_per_question": 0.0,
            "average_input_tokens_per_question": 0.0,
            "average_output_tokens_per_question": 0.0
        }
    
    total_input_tokens = sum(data["input_tokens"] for data in usage_data)
    total_output_tokens = sum(data["output_tokens"] for data in usage_data)
    total_cost = sum(data["estimated_cost_usd"] for data in usage_data)
    unique_users = len(set(data["user_id"] for data in usage_data))
    total_questions = len(usage_data)
    
    return {
        "period_days": days,
        "total_input_tokens": total_input_tokens,
        "total_output_tokens": total_output_tokens,
        "total_tokens": total_input_tokens + total_output_tokens,
        "total_cost_usd": round(total_cost, 6),
        "unique_users": unique_users,
        "total_questions_graded": total_questions,
        "average_cost_per_question": round(total_cost / total_questions if total_questions > 0 else 0, 6),
        "average_input_tokens_per_question": round(total_input_tokens / total_questions if total_questions > 0 else 0, 2),
        "average_output_tokens_per_question": round(total_output_tokens / total_questions if total_questions > 0 else 0, 2)
    }

@frappe.whitelist()
def get_token_usage_report(user_id=None, days=30):
    """API endpoint to get token usage report"""
    try:
        days = int(days) if days else None
        
        # Get overall statistics
        overall_stats = get_overall_statistics(days)
        
        # Get user summaries
        user_summaries = get_user_token_summary(user_id, days)
        
        return {
            "success": True,
            "overall_statistics": overall_stats,
            "user_summaries": user_summaries,
            "report_generated_at": datetime.now().isoformat()
        }
    except Exception as e:
        frappe.log_error(f"Error generating token usage report: {e}")
        return {
            "success": False,
            "error": str(e)
        }

@frappe.whitelist()
def export_token_usage_csv(days=30):
    """Export token usage data as CSV"""
    try:
        import csv
        import io
        
        usage_data = read_token_usage_data()
        
        if days:
            cutoff_date = datetime.now() - timedelta(days=int(days))
            usage_data = [
                data for data in usage_data 
                if datetime.fromisoformat(data["timestamp"]) >= cutoff_date
            ]
        
        # Create CSV content
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=[
            "timestamp", "user_id", "question_name", 
            "input_tokens", "output_tokens", "total_tokens", "estimated_cost_usd"
        ])
        
        writer.writeheader()
        for data in usage_data:
            writer.writerow(data)
        
        csv_content = output.getvalue()
        output.close()
        
        return {
            "success": True,
            "csv_content": csv_content,
            "filename": f"gemini_token_usage_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        }
    except Exception as e:
        frappe.log_error(f"Error exporting token usage CSV: {e}")
        return {
            "success": False,
            "error": str(e)
        }
