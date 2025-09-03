app_name = "elearning"
app_title = "Elearning"
app_publisher = "Minh Quy"
app_description = "A student-centric platform for mathematics learning and examination preparation, targeting Grade 9 students in Vietnam and Leaving Certificate students in Ireland"
app_email = "minhquyle2302@gmail.com"
app_license = "mit"

# Apps
# ------------------

# required_apps = []

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "elearning",
# 		"logo": "/assets/elearning/logo.png",
# 		"title": "Elearning",
# 		"route": "/elearning",
# 		"has_permission": "elearning.api.permission.has_app_permission"
# 	}
# ]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/elearning/css/elearning.css"
# app_include_js = "/assets/elearning/js/elearning.js"

# include js, css files in header of web template
# web_include_css = "/assets/elearning/css/elearning.css"
# web_include_js = "/assets/elearning/js/elearning.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "elearning/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "elearning/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "elearning.utils.jinja_methods",
# 	"filters": "elearning.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "elearning.install.before_install"
# after_install = "elearning.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "elearning.uninstall.before_uninstall"
# after_uninstall = "elearning.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "elearning.utils.before_app_install"
# after_app_install = "elearning.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "elearning.utils.before_app_uninstall"
# after_app_uninstall = "elearning.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "elearning.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# DocType Class
# ---------------
# Override standard doctype classes

# Document Events
# ---------------
# Hook on document methods and events

doc_events = {
    "Flashcard Session": {
        "on_update": "elearning.elearning.doctype.student_topic_mastery.student_topic_mastery.update_mastery_on_session_completion",
        "on_trash": "elearning.elearning.doctype.student_topic_mastery.student_topic_mastery.update_mastery_on_session_completion",
    },
    "Student Knowledge Profile": {
        "on_update": "elearning.elearning.doctype.student_topic_mastery.student_topic_mastery.initialize_student_mastery_from_profile",
        "on_trash": "elearning.elearning.doctype.student_topic_mastery.student_topic_mastery.initialize_student_mastery_from_profile",
    },
    "Knowledge Gap": {
        "on_update": "elearning.elearning.doctype.student_topic_mastery.student_topic_mastery.update_mastery_on_gap_change",
        "on_trash": "elearning.elearning.doctype.student_topic_mastery.student_topic_mastery.update_mastery_on_gap_change",
    },
}

# Fixtures
# ---------------
# Records to be exported for version control

fixtures = [
    # Export DocType definitions
    {
        "dt": "DocType",
        "filters": [
            [
                "name",
                "in",
                [
                    "Test",
                    "Question",
                    "Topic",
                    "Test Attempt",
                    "Test Question Item",
                    "Question Option",
                    "Attempt Answer Item",
                    "Rubric Score Item",
                    "Rubric Item",
                    "Answer Image",
                    "Flashcard",
                    "User Exam Attempt",
                    "User Exam Attempt Detail",
                    "User SRS Progress",
                    "User Flashcard Setting",
                    "Flashcard Session",
                    "User",
                    "Email Verification Token",
                    "Placement Question Option",
                    "Placement Question",
                    "Topic Mastery",
                    "Placement Answer Log",
                    "Placement Test Session",
                    "Student Knowledge Profile",
                    "Student Pathway Snapshot",
                    "Knowledge Gap",
                    "Learning Object",
                    "Learning Object Prerequisite",
                ],
            ]
        ],
    },
    # Export data records
    {"dt": "Test", "filters": [["name", "!=", ""]]},  # Export all Test records
    {"dt": "User", "filters": [["name", "!=", ""]]},
    {"dt": "Rubric Item", "filters": [["name", "!=", ""]]},
    {"dt": "Rubric Score Item", "filters": [["name", "!=", ""]]},
    {"dt": "Question", "filters": [["name", "!=", ""]]},  # Export all Question records
    {"dt": "Topics", "filters": [["name", "like", "Topics%"]]},
    # {
    #     "dt": "Email Verification Token"
    # },
    {"dt": "Flashcard", "filters": [["name", "!=", ""]]},  # Export tất cả các Flashcard
    {"dt": "User Exam Attempt", "filters": [["name", "!=", ""]]},
    {"dt": "User Exam Attempt Detail", "filters": [["name", "!=", ""]]},
    {"dt": "User Flashcard Setting", "filters": [["name", "!=", ""]]},
    {"dt": "Flashcard Session", "filters": [["name", "!=", ""]]},
    {"dt": "Placement Question", "filters": [["name", "!=", ""]]},
    {"dt": "Knowledge Gap", "filters": [["name", "!=", ""]]},
    {"dt": "Learning Object", "filters": [["name", "!=", ""]]},
    {"dt": "Learning Object Prerequisite", "filters": [["name", "!=", ""]]},
    # Not including Test Attempt as these are user-specific and typically not fixtures
]

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"elearning.tasks.all"
# 	],
# 	"daily": [
# 		"elearning.tasks.daily"
# 	],
# 	"hourly": [
# 		"elearning.tasks.hourly"
# 	],
# 	"weekly": [
# 		"elearning.tasks.weekly"
# 	],
# 	"monthly": [
# 		"elearning.tasks.monthly"
# 	],
# }

# Testing
# -------

# before_tests = "elearning.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "elearning.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "elearning.task.get_dashboard_data"
# }

# CORS Headers Configuration
# -------------------------
cors_headers = [
    "Access-Control-Allow-Origin",
    "Access-Control-Allow-Methods",
    "Access-Control-Allow-Headers",
    "Access-Control-Allow-Credentials",
]

# Response Hooks
# -------------------------
# Xử lý trước khi trả về response
after_request = ["elearning.api.api.handle_cors"]

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["elearning.utils.before_request"]

before_request = ["elearning.api.jwt_auth.jwt_auth_middleware"]
# after_request = ["elearning.utils.after_request"]

# Job Events
# ----------
# before_job = ["elearning.utils.before_job"]
# after_job = ["elearning.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"elearning.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

# API endpoints
# api_endpoints = [
#     "elearning.api.topic.find_all_active_topics",
#     "elearning.api.flashcard.get_flashcards_by_topic",
#     "elearning.api.flashcard.get_flashcard_by_id"
# ]

# Make the API endpoints available
whitelisted_methods = {
    "elearning.api.topic.find_all_active_topics": "elearning.api.topic.find_all_active_topics",
    "elearning.api.flashcard.get_flashcards_by_topic": "elearning.api.flashcard.get_flashcards_by_topic",
    "elearning.api.flashcard.get_flashcard_by_id": "elearning.api.flashcard.get_flashcard_by_id",
}
