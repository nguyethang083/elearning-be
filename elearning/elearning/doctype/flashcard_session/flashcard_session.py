# Copyright (c) 2025, Minh Quy and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe import _
from frappe.utils import now_datetime, getdate, add_days, get_datetime


class FlashcardSession(Document):
	pass


def get_current_user():
	user = frappe.session.user
	if user == "Guest":
		frappe.throw(_("Authentication required."), frappe.AuthenticationError)
	return user


def get_active_session(user, topic_id, mode):
	"""Check if user has an active session for the given topic and mode"""
	active_sessions = frappe.get_all(
		"Flashcard Session",
		filters={
			"user": user,
			"topic": topic_id,
			"mode": mode,
			"end_time": ["is", "not set"]
		},
		fields=["name", "start_time", "time_spent_seconds"]
	)
	
	if active_sessions:
		frappe.logger().debug(f"Found active session: {active_sessions[0]}")
		return active_sessions[0]
	return None


@frappe.whitelist()
def start_flashcard_session():
	"""
	Khởi tạo phiên học flashcard mới
	
	Args from JSON body:
		topic_id (str): ID của chủ đề
		mode (str, optional): Chế độ học (Basic, SRS, Exam), mặc định là Basic
		
	Returns:
		dict: Thông tin về phiên học đã tạo
	"""
	try:
		# Get parameters from JSON body
		request_json = frappe.request.get_json()
		if not request_json:
			frappe.logger().error("start_flashcard_session: No JSON data in request")
			frappe.throw(_("Invalid request format"))
			
		topic_id = request_json.get('topic_id')
		mode = request_json.get('mode', 'Basic')
		
		frappe.logger().debug(f"start_flashcard_session: Got params from JSON: topic_id={topic_id}, mode={mode}")
		
		if not topic_id:
			frappe.logger().error("start_flashcard_session: topic_id is missing")
			frappe.throw(_("Topic ID is required"))
			
		user = get_current_user()
		frappe.logger().debug(f"start_flashcard_session: User: {user}, Topic: {topic_id}, Mode: {mode}")
		
		# Check for existing active session
		active_session = get_active_session(user, topic_id, mode)
		if active_session:
			frappe.logger().info(f"Returning existing active session: {active_session.name}")
			return {"success": True, "session_id": active_session.name, "existing": True}
		
		# Xử lý topic_id nếu là số
		if topic_id and isinstance(topic_id, str) and topic_id.isdigit():
			# Tìm topic với ID là số này
			topics = frappe.get_all(
				"Topics",
				filters={"name": ["like", f"%{topic_id}"]},
				fields=["name"]
			)
			if topics:
				topic_id = topics[0].name
				frappe.logger().debug(f"start_flashcard_session: Resolved topic_id to {topic_id}")
			else:
				# Thử tạo ID theo định dạng cũ
				formatted_topic_id = f"TOPIC-{int(topic_id):05d}"
				if frappe.db.exists("Topics", formatted_topic_id):
					topic_id = formatted_topic_id
					frappe.logger().debug(f"start_flashcard_session: Formatted topic_id to {topic_id}")
		
		# Tạo session mới
		session = frappe.new_doc("Flashcard Session")
		session.user = user
		session.topic = topic_id
		session.start_time = now_datetime()
		session.mode = mode
		session.time_spent_seconds = 0
		session.insert(ignore_permissions=True)
		frappe.db.commit()
		
		frappe.logger().info(f"start_flashcard_session: Created new session {session.name} for user {user}, topic {topic_id}, mode {mode}")
		return {"success": True, "session_id": session.name}
	except Exception as e:
		frappe.logger().error(f"start_flashcard_session error: {str(e)}")
		return {"success": False, "error": str(e)}


@frappe.whitelist()
def update_flashcard_session_time():
	"""Cập nhật thời gian đã dành cho phiên học flashcard"""
	try:
		# Get parameters from JSON body
		request_json = frappe.request.get_json()
		if not request_json:
			frappe.logger().error("update_flashcard_session_time: No JSON data in request")
			frappe.throw(_("Invalid request format"))
			
		session_id = request_json.get('session_id')
		time_spent_seconds = request_json.get('time_spent_seconds')
		
		frappe.logger().debug(f"update_flashcard_session_time: Got params from JSON: session_id={session_id}, time_spent_seconds={time_spent_seconds}")
		
		if not session_id or time_spent_seconds is None:
			frappe.logger().error("update_flashcard_session_time: session_id or time_spent_seconds is missing")
			frappe.throw(_("Session ID and time spent are required"))
			
		user = get_current_user()
		
		session = frappe.get_doc("Flashcard Session", session_id)
		if session.user != user:
			frappe.throw(_("Không có quyền cập nhật phiên học này"))
		
		session.time_spent_seconds += int(time_spent_seconds)
		session.save(ignore_permissions=True)
		frappe.db.commit()
		
		frappe.logger().debug(f"update_flashcard_session_time: Updated session {session_id} with {time_spent_seconds} seconds")
		return {"success": True}
	except Exception as e:
		frappe.logger().error(f"update_flashcard_session_time error: {str(e)}")
		return {"success": False, "error": str(e)}


@frappe.whitelist()
def end_flashcard_session():
	"""Kết thúc phiên học flashcard"""
	try:
		# Get parameters from JSON body
		request_json = frappe.request.get_json()
		if not request_json:
			frappe.logger().error("end_flashcard_session: No JSON data in request")
			frappe.throw(_("Invalid request format"))
			
		session_id = request_json.get('session_id')
		
		frappe.logger().debug(f"end_flashcard_session: Got session_id from JSON: {session_id}")
		
		if not session_id:
			frappe.logger().error("end_flashcard_session: session_id is missing")
			frappe.throw(_("Session ID is required"))
			
		user = get_current_user()
		
		session = frappe.get_doc("Flashcard Session", session_id)
		if session.user != user:
			frappe.throw(_("Không có quyền cập nhật phiên học này"))
		
		session.end_time = now_datetime()
		session.save(ignore_permissions=True)
		frappe.db.commit()
		
		frappe.logger().info(f"end_flashcard_session: Ended session {session_id} for user {user}")
		return {"success": True}
	except Exception as e:
		frappe.logger().error(f"end_flashcard_session error: {str(e)}")
		return {"success": False, "error": str(e)}


@frappe.whitelist()
def get_flashcard_time_by_month():
	"""
	Lấy dữ liệu thời gian sử dụng flashcard theo tháng, phân loại theo mode
	
	Args from request:
		year (int, optional): Năm cần lấy dữ liệu, mặc định là năm hiện tại
		
	Returns:
		list: Danh sách thời gian học flashcard theo tháng
	"""
	try:
		# Extract parameters from form_dict or JSON request
		if frappe.local.form_dict.get('year'):
			year = frappe.local.form_dict.get('year')
			frappe.logger().debug(f"get_flashcard_time_by_month: Got year from form_dict: {year}")
		else:
			# Try to get from JSON body
			try:
				request_json = frappe.request.get_json()
				year = request_json.get('year')
				frappe.logger().debug(f"get_flashcard_time_by_month: Got year from JSON: {year}")
			except Exception as e:
				frappe.logger().debug(f"get_flashcard_time_by_month: Error getting JSON data: {str(e)}")
				year = None
		
		# Use current year if not provided
		if not year:
			year = getdate().year
			frappe.logger().debug(f"get_flashcard_time_by_month: Using current year: {year}")
			
		# Convert to int if it's a string
		if isinstance(year, str) and year.isdigit():
			year = int(year)
		
		user = get_current_user()
		frappe.logger().debug(f"get_flashcard_time_by_month: Getting flashcard time for user: {user}, year: {year}")
		
		# Lấy dữ liệu từ Flashcard Session theo từng mode
		query = """
			SELECT 
				MONTH(start_time) as month,
				mode,
				SUM(time_spent_seconds) as time_spent
			FROM `tabFlashcard Session`
			WHERE user = %s AND YEAR(start_time) = %s
			GROUP BY MONTH(start_time), mode
		"""
		
		data = frappe.db.sql(query, (user, year), as_dict=True)
		
		# Log dữ liệu gốc để kiểm tra
		frappe.logger().debug(f"get_flashcard_time_by_month: Raw data for user {user}: {data}")
		
		# Phân loại dữ liệu theo tháng và mode
		result = {}
		for item in data:
			month = item.month
			mode = item.mode
			time_spent = item.time_spent or 0  # Đảm bảo không có giá trị None
			
			if month not in result:
				result[month] = {
					"Basic": 0,
					"Exam": 0,
					"SRS": 0
				}
			
			result[month][mode] = time_spent
		
		# Tạo kết quả cho tất cả 12 tháng
		formatted_result = []
		for month in range(1, 13):
			month_data = result.get(month, {"Basic": 0, "Exam": 0, "SRS": 0})
			
			formatted_result.append({
				"month": month,
				"month_name": frappe.utils.formatdate(f"{year}-{month:02d}-01", "MMM"),
				"basic_time": month_data["Basic"] or 0,
				"exam_time": month_data["Exam"] or 0,
				"srs_time": month_data["SRS"] or 0,
				"study_time": (month_data["Basic"] or 0) + (month_data["SRS"] or 0),
				"test_time": month_data["Exam"] or 0
			})
		
		# Kiểm tra và log số lượng dữ liệu có time > 0
		non_zero_months = [m for m in formatted_result if m["basic_time"] > 0 or m["exam_time"] > 0 or m["srs_time"] > 0]
		frappe.logger().info(f"get_flashcard_time_by_month: Found {len(non_zero_months)} months with non-zero time for user {user}")
		
		return formatted_result
	except Exception as e:
		frappe.logger().error(f"get_flashcard_time_by_month error: {str(e)}")
		# Trả về dữ liệu trống nếu có lỗi
		formatted_result = []
		for month in range(1, 13):
			formatted_result.append({
				"month": month,
				"month_name": frappe.utils.formatdate(f"{year}-{month:02d}-01", "MMM"),
				"basic_time": 0,
				"exam_time": 0,
				"srs_time": 0,
				"study_time": 0,
				"test_time": 0
			})
		return formatted_result