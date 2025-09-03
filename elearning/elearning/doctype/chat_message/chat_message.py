# Copyright (c) 2025, Minh Quy and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime
import requests
import re


class ChatMessage(Document):
    pass


@frappe.whitelist()
def send_message(session_id, content, sender="User", attachment_count=0):
    """
    Send a message in a chat session and get AI response if sender is User

    Args:
        session_id (str): Chat session ID
        content (str): Message content
        sender (str): Sender type (User or AI)
        attachment_count (int): Number of attachments

    Returns:
        dict: Response with AI message if applicable
    """
    try:
        # Validate session exists
        if not frappe.db.exists("Chat Session", session_id):
            return {"success": False, "message": "Chat session not found"}

        # Process attachments
        attachments_info = []
        attachment_count = int(attachment_count or 0)

        for i in range(attachment_count):
            attachment_key = f"attachment_{i}"
            if attachment_key in frappe.request.files:
                file_obj = frappe.request.files[attachment_key]
                if file_obj and file_obj.filename:
                    # Save file to Frappe
                    file_doc = frappe.get_doc(
                        {
                            "doctype": "File",
                            "file_name": file_obj.filename,
                            "content": file_obj.read(),
                            "is_private": 1,
                        }
                    )
                    file_doc.insert(ignore_permissions=True)

                    attachments_info.append(
                        {
                            "name": file_obj.filename,
                            "url": file_doc.file_url,
                            "file_url": file_doc.file_url,
                            "content_type": file_obj.content_type,
                        }
                    )

        # Determine message type based on attachments
        message_type = "Text"
        if attachments_info:
            # Check if any attachment is an image
            has_image = any(
                att.get("content_type", "").startswith("image/")
                for att in attachments_info
            )
            if has_image:
                message_type = "Image"

        # Save user message
        msg = frappe.get_doc(
            {
                "doctype": "Chat Message",
                "parent": session_id,
                "parenttype": "Chat Session",
                "parentfield": "messages",
                "sender": sender,
                "message_type": message_type,
                "content": content,
                "attachments": (
                    frappe.as_json(attachments_info) if attachments_info else None
                ),
                "timestamp": now_datetime(),
            }
        )
        msg.insert(ignore_permissions=True)

        # If sender is User, get AI response
        if sender == "User":
            ai_response = call_gemini_ai(content, attachments_info)

            # Save AI message
            ai_msg = frappe.get_doc(
                {
                    "doctype": "Chat Message",
                    "parent": session_id,
                    "parenttype": "Chat Session",
                    "parentfield": "messages",
                    "sender": "AI",
                    "message_type": "Text",
                    "content": ai_response,
                    "timestamp": now_datetime(),
                }
            )
            ai_msg.insert(ignore_permissions=True)

            frappe.db.commit()

            return {
                "success": True,
                "ai_response": ai_response,
                "message": "Message sent and AI responded successfully",
            }

        frappe.db.commit()
        return {"success": True, "message": "Message sent successfully"}

    except Exception as e:
        error_msg = str(e)
        # Truncate error message if too long for logging
        if len(error_msg) > 100:
            error_msg = error_msg[:100] + "..."
        frappe.log_error(f"Error sending message: {error_msg}", "Chat Send Error")
        return {"success": False, "message": f"Failed to send message: {str(e)}"}


def call_gemini_ai(content, attachments_info=None):
    """
    Call Gemini AI API to get response

    Args:
        content (str): User message content
        attachments_info (list): List of attachment information

    Returns:
        str: AI response
    """
    try:
        # Get API key from site config
        api_key = frappe.conf.get("gemini_api_key")
        if not api_key:
            return "Xin lỗi, tôi không thể trả lời lúc này. API key chưa được cấu hình."

        api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"

        # System prompt for educational context - Trợ lý toán học thân thiện
        system_prompt = """Bạn là một trợ lý toán học thân thiện và kiên nhẫn, chuyên hỗ trợ học sinh Việt Nam từ lớp 6 đến lớp 12. Vai trò của bạn là:

**PHONG CÁCH GIAO TIẾP:**
- Luôn xưng hô "mình" và gọi học sinh là "bạn" để tạo không khí thân thiện
- Luôn bắt đầu bằng việc hiểu rõ vấn đề của học sinh
- Giải thích từng bước một cách rõ ràng, dễ hiểu
- Sử dụng ngôn ngữ thân thiện, khuyến khích học sinh
- Không bao giờ làm học sinh cảm thấy ngu ngốc khi hỏi

**PHƯƠNG PHÁP HỖ TRỢ:**
1. **Phân tích vấn đề:** Hiểu rõ học sinh đang gặp khó khăn ở đâu
2. **Giải thích khái niệm:** Đưa ra định nghĩa và ví dụ cụ thể
3. **Hướng dẫn từng bước:** Chia nhỏ bài toán thành các bước đơn giản
4. **Kiểm tra hiểu biết:** Đặt câu hỏi để đảm bảo học sinh hiểu
5. **Đưa ra bài tập tương tự:** Giúp học sinh luyện tập

            **KIẾN THỨC TOÁN HỌC:**
            - **Đại số:** Phương trình, bất phương trình, hàm số, đồ thị
            - **Hình học:** Định lý, công thức tính diện tích, thể tích
            - **Lượng giác:** Sin, cos, tan, các công thức lượng giác
            - **Thống kê:** Trung bình, phương sai, xác suất
            - **Giải tích:** Đạo hàm, tích phân (cho học sinh THPT)

**NGUYÊN TẮC TRẢ LỜI:**
- Luôn trả lời bằng tiếng Việt, trừ khi cần thiết dùng thuật ngữ tiếng Anh
- Luôn xưng "mình" và gọi học sinh là "bạn"
- Sử dụng ngôn ngữ thân thiện và khuyến khích
- Khi giải bài toán, luôn viết rõ từng bước
- Nếu học sinh sai, hãy chỉ ra lỗi một cách nhẹ nhàng và hướng dẫn sửa
- Khuyến khích học sinh tự suy nghĩ trước khi đưa ra đáp án

**VÍ DỤ CÁCH TRẢ LỜI:**
- "Mình hiểu vấn đề của bạn rồi! Hãy để mình giải thích từng bước nhé"
- "Bạn hãy thử suy nghĩ xem, nếu bạn gặp khó khăn thì mình sẽ giúp"
- "Rất tốt! Bạn đã hiểu đúng phần này. Bây giờ chúng ta sẽ học phần tiếp theo"
- "Mình thấy bạn đang bị nhầm ở bước này, hãy để mình hướng dẫn lại nhé"

            **MỤC TIÊU:**
            - Giúp học sinh hiểu sâu, nhớ lâu kiến thức toán học
            - Xây dựng sự tự tin và niềm yêu thích toán học
            - Chuẩn bị kiến thức vững chắc cho các kỳ thi quan trọng

Bây giờ bạn hãy hỏi bất kỳ câu hỏi nào về toán học, mình sẽ giúp bạn hiểu rõ từng vấn đề!"""

        # Prepare message parts
        user_parts = [{"text": content}]

        # Add image attachments to the message
        if attachments_info:
            for attachment in attachments_info:
                if attachment.get("content_type", "").startswith("image/"):
                    try:
                        # Read image file and encode to base64
                        import base64

                        file_path = frappe.get_site_path() + attachment["file_url"]
                        with open(file_path, "rb") as img_file:
                            image_data = base64.b64encode(img_file.read()).decode(
                                "utf-8"
                            )

                        user_parts.append(
                            {
                                "inline_data": {
                                    "mime_type": attachment["content_type"],
                                    "data": image_data,
                                }
                            }
                        )

                        # Add context about the image
                        if not content.strip():
                            content = "Hãy mô tả ảnh này và giải thích nội dung toán học trong ảnh (nếu có)."
                            user_parts[0] = {"text": content}

                    except Exception as e:
                        error_msg = str(e)
                        if len(error_msg) > 80:
                            error_msg = error_msg[:80] + "..."
                        frappe.log_error(
                            f"Error processing image: {error_msg}",
                            "Image Process Error",
                        )

        # Generate AI response using Gemini
        payload = {
            "contents": [
                {"role": "user", "parts": [{"text": system_prompt}]},
                {"role": "user", "parts": user_parts},
            ],
            "generationConfig": {
                "temperature": 0.7,
                "topP": 0.8,
                "topK": 40,
                "maxOutputTokens": 1024,
            },
        }

        response = requests.post(api_url, json=payload, timeout=30)

        if response.status_code == 200:
            data = response.json()
            if data.get("candidates") and len(data["candidates"]) > 0:
                ai_text = (
                    data.get("candidates", [{}])[0]
                    .get("content", {})
                    .get("parts", [{}])[0]
                    .get("text", "")
                )
                return clean_markdown_text(ai_text)
            else:
                return "Xin lỗi, tôi không thể tạo phản hồi lúc này."
        else:
            frappe.logger().error(
                f"Gemini API error: {response.status_code} - {response.text}"
            )
            return "Xin lỗi, tôi gặp lỗi khi xử lý yêu cầu của bạn."

    except Exception as e:
        error_msg = str(e)
        # Truncate error message if too long for logging
        if len(error_msg) > 80:
            error_msg = error_msg[:80] + "..."
        frappe.log_error(f"Error calling Gemini AI: {error_msg}", "Gemini AI Error")
        return "Xin lỗi, tôi không thể trả lời lúc này. Vui lòng thử lại sau."


def fix_math_format(text):
    """
    Convert $ math format to \( \) format for MathRenderer compatibility
    """
    if not text:
        return ""

    # Convert display math: $$...$$  ->  \[...\]
    text = re.sub(r"\$\$(.*?)\$\$", r"\\[\1\\]", text, flags=re.DOTALL)

    # Convert inline math: $...$  ->  \(...\)
    # Use negative lookbehind/lookahead to avoid converting already converted expressions
    text = re.sub(r"(?<!\\)\$([^$\n]+?)(?<!\\)\$", r"\\(\1\\)", text)

    return text


def clean_markdown_text(text):
    """
    Clean up markdown text for better display
    """
    if not text:
        return ""

    # First fix math format
    text = fix_math_format(text)

    # Convert markdown headings to bold text
    text = re.sub(r"^#{1,6}\s*(.+?)$", r"**\1**\n", text, flags=re.MULTILINE)

    # Remove extra asterisks
    text = re.sub(r"(?<!\*)\*(?!\*)", "", text)
    text = re.sub(r"\*\*\s*\*\*", "", text)
    text = re.sub(r"^\*\*\s*$", "", text, flags=re.MULTILINE)
    text = re.sub(r"(?<!\*)\*\*(?!\*)", "", text)

    # Convert bullet points
    text = re.sub(r"^[\s]*[-*+]\s+", "• ", text, flags=re.MULTILINE)
    text = re.sub(r"^[\s]*(\d+)\.\s+", r"\1. ", text, flags=re.MULTILINE)

    # Remove empty bullet points
    text = re.sub(r"^•\s*$", "", text, flags=re.MULTILINE)
    text = re.sub(r"^\d+\.\s*$", "", text, flags=re.MULTILINE)

    # Remove code blocks
    text = re.sub(r"```[\w]*\n?", "", text)
    text = re.sub(r"`([^`]+)`", r"\1", text)

    # Clean up whitespace
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r" +\n", "\n", text)
    text = re.sub(r"^\s*$", "", text, flags=re.MULTILINE)

    # Remove remaining asterisks
    text = re.sub(r"\*+", "", text)

    # Clean up line breaks
    text = re.sub(r"^\n+", "", text)
    text = re.sub(r"\n+$", "", text)

    return text.strip()


@frappe.whitelist()
def get_chat_messages(session_id):
    """
    Get all messages for a chat session

    Args:
        session_id (str): Chat session ID

    Returns:
        dict: List of messages
    """
    try:
        if not frappe.db.exists("Chat Session", session_id):
            return {"success": False, "message": "Chat session not found"}

        messages = frappe.get_all(
            "Chat Message",
            filters={"parent": session_id},
            fields=["sender", "message_type", "content", "timestamp"],
            order_by="timestamp",
        )

        return {"success": True, "messages": messages}

    except Exception as e:
        error_msg = str(e)
        # Truncate error message if too long for logging
        if len(error_msg) > 80:
            error_msg = error_msg[:80] + "..."
        frappe.log_error(
            f"Error getting chat messages: {error_msg}", "Chat Messages Error"
        )
        return {"success": False, "message": f"Failed to get chat messages: {str(e)}"}
