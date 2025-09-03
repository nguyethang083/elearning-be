import frappe
from frappe import _
from frappe.utils import validate_email_address, random_string, get_url, now, add_to_date, now_datetime, get_datetime, cint, has_gravatar, add_days
from frappe.utils.password import update_password as frappe_update_password
from frappe.core.doctype.user.user import test_password_strength, generate_keys
import uuid
import base64
import urllib.parse
import random
import string
import json
import hashlib
import hmac
import jwt
import datetime
from elearning.api.jwt_auth import get_jwt_settings


# --- User Signup and Email Verification ---

@frappe.whitelist(allow_guest=True)
def custom_user_signup(first_name, last_name, email, password, age_level=None, redirect_to=None):
    """
    Sign up a new user, create a verification token, and send a verification email.
    User is created as disabled until email is verified.
    """
    try:
        # Ensure Student Role exists
        if not frappe.db.exists("Role", "Student"):
            frappe.get_doc({
                "doctype": "Role",
                "role_name": "Student",
                "desk_access": 0
            }).insert(ignore_permissions=True)
        
        # Validate email
        if not validate_email_address(email):
            frappe.throw(_("Invalid email address"))
        
        # Check if user already exists
        if frappe.db.exists("User", email):
            frappe.throw(_("Email already registered"))
        
        # Check password strength
        # user_data for test_password_strength should be a tuple in the order:
        # (name, first_name, last_name, email, birth_date)
        user_data_tuple_for_strength_test = (
            f"{first_name} {last_name}", # name (full name)
            first_name,
            last_name,
            email,
            None  # birth_date (set to None if not available)
        )
        test_password_strength(password, user_data=user_data_tuple_for_strength_test)

        # Create user - Initially disabled
        user = frappe.get_doc({
            "doctype": "User",
            "email": email,
            "first_name": first_name,
            "last_name": last_name,
            "send_welcome_email": 0, # We are sending a verification email
            "enabled": 0,  # Start with disabled user until email is verified
            "new_password": password, # Frappe will hash this on insert
            "roles": [{"role": "Student"}]
        })
        
        if age_level:
            # Assuming 'age_level' is a custom field in User DocType.
            # Ensure this field exists in your User DocType customization.
            user.age_level = age_level
        
        user.insert(ignore_permissions=True)
        
        # Create a student profile (if Student DocType exists)
        create_student_profile(user.name, first_name, last_name, email, age_level)

        # Generate verification token
        verification_token = generate_verification_token(email)

        # Store token in Email Verification Token doctype
        token_doc_name = create_email_verification_token(email, verification_token, redirect_to)
        if not token_doc_name:
            frappe.db.rollback() # Rollback user creation if token cannot be made
            frappe.throw(_("Failed to create verification token. Please try again."))

        # Lấy URL backend từ site_config hoặc dùng URL hiện tại
        backend_url = frappe.conf.get("backend_url") or frappe.utils.get_request_site_address(True)
        api_verify_url = f"{backend_url}/api/method/elearning.api.auth.verify_email_token_and_redirect?token={verification_token}"

        email_subject = _("Verify Your Email Address for Elearning Platform")
        email_message = _("""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Email Verification</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h2 style="color: #4a6cf7;">Elearning Platform</h2>
            </div>
            <div style="background-color: #f9f9f9; border-radius: 10px; padding: 25px; margin-bottom: 20px; border: 1px solid #eee;">
                <h3 style="margin-top: 0; color: #333;">Hi {0},</h3>
                <p>Thank you for registering with our Elearning Platform. To activate your account, please verify your email address by clicking the button below:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{1}" style="background-color: #4a6cf7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Verify Email Address</a>
                </div>
                
                <p>This verification link will expire in 24 hours.</p>
                <p>If you're having trouble clicking the button, copy and paste the URL below into your web browser:</p>
                <p style="word-break: break-all; font-size: 12px; color: #666; margin-top: 10px;">{1}</p>
            </div>
            <div style="font-size: 12px; color: #666; text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
                <p>If you did not request this email, please ignore it or contact our support team if you have concerns.</p>
            </div>
        </body>
        </html>
        """).format(first_name, api_verify_url)

        frappe.sendmail(
            recipients=email,
            subject=email_subject,
            message=email_message,
            now=True # Send immediately
        )
        
        return {
            "success": True,
            "message": _("Registration successful. Please check your email for verification."),
            "email": email
        }
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "User Signup Error")
        frappe.throw(_("Error during signup: {0}").format(str(e)))

def generate_verification_token(email):
    """Generate a unique verification token for email verification."""
    # Using a more standard approach for token generation
    return random_string(40) # Frappe's random_string is cryptographically secure

def create_email_verification_token(email, token, redirect_to=None):
    """Create and store email verification token. Assumes 'Email Verification Token' DocType exists."""
    if not frappe.db.exists("DocType", "Email Verification Token"):
        # This DocType should be created manually or via fixtures/migrations, not on-the-fly here.
        frappe.log_error("DocType 'Email Verification Token' does not exist.", "Email Verification Setup Error")
        frappe.throw(_("Email verification system is not properly configured."))
        return None # Indicate failure

    # Delete any existing UNUSED tokens for this email to prevent multiple active tokens
    existing_tokens = frappe.get_all("Email Verification Token",
                                     filters={"email": email, "used": 0},
                                     fields=["name"])
    for t in existing_tokens:
        frappe.delete_doc("Email Verification Token", t.name, ignore_permissions=True)

    # Create new token with 24-hour expiry
    current_dt = now_datetime() # Use Frappe's now_datetime()
    expiry_dt = add_to_date(current_dt, hours=24)

    try:
        verification_doc = frappe.get_doc({
            "doctype": "Email Verification Token",
            "email": email,
            "token": token,
            "expiry": expiry_dt,
            "redirect_to": redirect_to or "", # Store the intended final redirect URL from frontend
            "used": 0
        })
        verification_doc.insert(ignore_permissions=True)
        # frappe.db.commit() # Usually not needed, Frappe handles transaction
        return verification_doc.name # Return the name of the created token document
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Create Email Verification Token Error")
        return None # Indicate failure

# Removed create_email_verification_doctype() - This should be done via Desk or fixtures.

@frappe.whitelist(allow_guest=True)
def verify_email_token_and_redirect(token):
    """
    Verify email token, enable user, and redirect to a frontend page.
    This endpoint is meant to be called from the link in the verification email.
    """
    # Đảm bảo frontend_url trỏ đến Next.js app đúng cách
    current_site_url = frappe.utils.get_request_site_address(True) if frappe.local.site else "http://localhost:8000"
    frontend_base_url = frappe.conf.get("frontend_url") or current_site_url
    
    # Đảm bảo frontend_base_url không có dấu / ở cuối
    if frontend_base_url.endswith("/"):
        frontend_base_url = frontend_base_url[:-1]
    
    # Tạo URL cho trang xác thực thành công và thất bại
    verification_success_url = f"{frontend_base_url}/auth/email-verified"
    verification_failure_url = f"{frontend_base_url}/auth/verification-failed"
    
    frappe.log_error(f"Redirecting with frontend_base_url: {frontend_base_url}", "Email Verification Debug")

    try:
        if not token:
            frappe.local.response["type"] = "redirect"
            frappe.local.response["location"] = f"{verification_failure_url}?error=missing_token"
            return

        if not frappe.db.exists("DocType", "Email Verification Token"):
            frappe.log_error("DocType 'Email Verification Token' not found during verification.", "Email Verification Error")
            frappe.local.response["type"] = "redirect"
            frappe.local.response["location"] = f"{verification_failure_url}?error=setup_error"
            return

        token_doc_name = frappe.db.get_value("Email Verification Token", {"token": token, "used": 0})
        
        if not token_doc_name:
            frappe.local.response["type"] = "redirect"
            frappe.local.response["location"] = f"{verification_failure_url}?error=invalid_or_used_token"
            return

        token_record = frappe.get_doc("Email Verification Token", token_doc_name)

        if get_datetime(now()) > get_datetime(token_record.expiry): # Ensure comparison of datetime objects
            token_record.used = 1 # Mark as used even if expired to prevent reuse
            token_record.save(ignore_permissions=True)
            frappe.db.commit()
            frappe.local.response["type"] = "redirect"
            frappe.local.response["location"] = f"{verification_failure_url}?error=expired_token"
            return

        token_record.used = 1
        token_record.save(ignore_permissions=True)
        
        email_to_verify = token_record.email
        if not frappe.db.exists("User", email_to_verify):
            frappe.log_error(f"User {email_to_verify} not found during email verification for token {token}", "Email Verification Error")
            frappe.local.response["type"] = "redirect"
            frappe.local.response["location"] = f"{verification_failure_url}?error=user_not_found"
            return

        user = frappe.get_doc("User", email_to_verify)
        if not user.enabled:
            user.enabled = 1
            # If you have a custom field like 'email_verified' on User DocType:
            if hasattr(user, 'email_verified'):
                 user.email_verified = 1
            user.save(ignore_permissions=True)
        
        frappe.db.commit() # Commit changes

        # Redirect to email-verified page instead of appending status and email to the final_redirect
        final_redirect = f"{verification_success_url}?email={urllib.parse.quote(email_to_verify)}"

        frappe.local.response["type"] = "redirect"
        frappe.local.response["location"] = final_redirect
        return
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Verify Email Token and Redirect Error")
        frappe.local.response["type"] = "redirect"
        frappe.local.response["location"] = f"{verification_failure_url}?error=server_error"
        return

# --- Student Profile ---
def create_student_profile(user_name, first_name, last_name, email, age_level=None):
    """Create a student profile if Student DocType exists and profile doesn't exist."""
    if not frappe.db.exists("DocType", "Student"):
        frappe.log_error("DocType 'Student' does not exist. Cannot create student profile.", "Student Profile Creation")
        return
    
    if frappe.db.exists("Student", {"user": user_name}): # Check by user link is more robust
        return
    
    try:
        student_doc_data = {
        "doctype": "Student",
        "first_name": first_name,
        "last_name": last_name,
            "email": email, # Assuming Student DocType has an email field
            "user": user_name, # Link to the User document
            "student_name": f"{first_name} {last_name}" # Or however you define student_name
        }
        if age_level:
            student_doc_data["age_level"] = age_level # Assuming 'age_level' is a field in Student DocType

        student = frappe.get_doc(student_doc_data)
        student.insert(ignore_permissions=True)
        # frappe.db.commit() # Usually not needed
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), f"Create Student Profile Error for {user_name}")


# --- Resend Verification ---
@frappe.whitelist(allow_guest=True)
def resend_verification_email_api(email): # Renamed to avoid conflict if you have another
    """Resend verification email if user exists and is not yet verified/enabled."""
    if not email or not validate_email_address(email):
        frappe.throw(_("Valid email is required."))

    if not frappe.db.exists("User", email):
        frappe.throw(_("User with this email not found."))
    
    user = frappe.get_doc("User", email)
    
    if user.enabled: # If user is already enabled, assume verified
        frappe.throw(_("Email is already verified for this user."))
    
    # Generate a new token or re-use an existing one (better to generate new)
    new_verification_token = generate_verification_token(email)
    token_doc_name = create_email_verification_token(email, new_verification_token, None) # redirect_to can be None

    if not token_doc_name:
        frappe.throw(_("Failed to prepare new verification token. Please contact support."))

    # Lấy URL backend từ site_config hoặc dùng URL hiện tại
    backend_url = frappe.conf.get("backend_url") or frappe.utils.get_request_site_address(True)
    api_verify_url = f"{backend_url}/api/method/elearning.api.auth.verify_email_token_and_redirect?token={new_verification_token}"
    
    email_subject = _("Verify Your Email Address for Elearning Platform (Resend)")
    email_message = _("""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #4a6cf7;">Elearning Platform</h2>
        </div>
        <div style="background-color: #f9f9f9; border-radius: 10px; padding: 25px; margin-bottom: 20px; border: 1px solid #eee;">
            <h3 style="margin-top: 0; color: #333;">Hi {0},</h3>
            <p>We received a request to resend your email verification link. To activate your account, please verify your email address by clicking the button below:</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{1}" style="background-color: #4a6cf7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Verify Email Address</a>
            </div>
            
            <p>This verification link will expire in 24 hours.</p>
            <p>If you're having trouble clicking the button, copy and paste the URL below into your web browser:</p>
            <p style="word-break: break-all; font-size: 12px; color: #666; margin-top: 10px;">{1}</p>
        </div>
        <div style="font-size: 12px; color: #666; text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
            <p>If you did not request this email, please ignore it or contact our support team if you have concerns.</p>
        </div>
    </body>
    </html>
    """).format(user.first_name, api_verify_url)

    frappe.sendmail(
        recipients=email,
        subject=email_subject,
        message=email_message,
        now=True
    )

    return {
        "success": True,
        "message": _("Verification email sent to {0}").format(email)
    }

# --- Custom Reset Password ---
@frappe.whitelist(allow_guest=True)
def reset_password_api(user_email):
    """Custom reset password handler that uses our email templates instead of default Frappe ones."""
    if not user_email or not validate_email_address(user_email):
        frappe.throw(_("Valid email is required."))

    if not frappe.db.exists("User", user_email):
        frappe.throw(_("User with this email not found."))
    
    user = frappe.get_doc("User", user_email)
    
    # Generate reset password key using Frappe's method but don't send email
    key = frappe.generate_hash()
    # Sử dụng hashlib thay vì frappe.utils.password.sha256_hash
    hashed_key = hashlib.sha256(key.encode()).hexdigest()
    user.db_set("reset_password_key", hashed_key)
    user.db_set("last_reset_password_key_generated_on", now_datetime())
    
    # Create reset password URL
    site_url = frappe.conf.get('frontend_url') or frappe.utils.get_request_site_address(True)
    reset_url = f"{site_url}/auth/reset-password?token={key}&email={urllib.parse.quote(user_email)}"
    
    email_subject = _("Reset Your Password for Elearning Platform")
    email_message = _("""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #4a6cf7;">Elearning Platform</h2>
        </div>
        <div style="background-color: #f9f9f9; border-radius: 10px; padding: 25px; margin-bottom: 20px; border: 1px solid #eee;">
            <h3 style="margin-top: 0; color: #333;">Hi {0},</h3>
            <p>You requested a password reset. Please click the button below to reset your password:</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{1}" style="background-color: #4a6cf7; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Reset Password</a>
            </div>
            
            <p>This reset password link will expire in 24 hours.</p>
            <p>If you're having trouble clicking the button, copy and paste the URL below into your web browser:</p>
            <p style="word-break: break-all; font-size: 12px; color: #666; margin-top: 10px;">{1}</p>
        </div>
        <div style="font-size: 12px; color: #666; text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
            <p>If you did not request this password reset, you can safely ignore this email.</p>
        </div>
    </body>
    </html>
    """).format(user.first_name, reset_url)

    frappe.sendmail(
        recipients=user_email,
        subject=email_subject,
        message=email_message,
        now=True
    )
    
    return {
        "success": True, 
        "message": _("Password reset instructions have been sent to your email")
    }

# --- Social Login ---
@frappe.whitelist(allow_guest=True)
def social_login_handler(provider, user_id, email, full_name, picture=None, access_token=None): # Renamed
    """Handles user creation/login via social providers and returns user info and Frappe session."""
    try:
        user_doc = None
        is_new_user = False

        if frappe.db.exists("User", email):
            user_doc = frappe.get_doc("User", email)
            # Ensure user is enabled if they exist (e.g., if they signed up normally then social)
            if not user_doc.enabled:
                user_doc.enabled = 1
                # Consider if email_verified flag needs setting here too
                if hasattr(user_doc, 'email_verified') and not user_doc.email_verified:
                    user_doc.email_verified = 1
                user_doc.save(ignore_permissions=True)


            # Check and add social login if not present
            has_provider_login = any(sl.provider == provider and sl.userid == user_id for sl in user_doc.social_logins)
            if not has_provider_login:
                user_doc.append("social_logins", {
                    "provider": provider,
                    "userid": user_id
                })
                user_doc.save(ignore_permissions=True)
        else:
            is_new_user = True
            # Create new user
            # Split full_name carefully
            name_parts = full_name.split(" ", 1)
            first_name = name_parts[0]
            last_name = name_parts[1] if len(name_parts) > 1 else ""

            user_doc = frappe.get_doc({
                "doctype": "User",
                "email": email,
                "first_name": first_name,
                "last_name": last_name,
                "send_welcome_email": 0,
                "enabled": 1, # Enable directly for social logins
                "new_password": random_string(20), # Generate a random secure password
                "roles": [{"role": "Student"}],
                "social_logins": [{
                "provider": provider,
                "userid": user_id
                }]
            })
            if hasattr(user_doc, 'email_verified'): # Assume email from social provider is verified
                user_doc.email_verified = 1
            
            if picture:
                user_doc.user_image = picture

            user_doc.insert(ignore_permissions=True)
            create_student_profile(user_doc.name, first_name, last_name, email)

        # Log in the user in Frappe and create a Frappe session
        frappe.local.login_manager.login_as(user_doc.name)
        # make_session will set the sid cookie in the response
        # This is crucial for subsequent API calls from the client if not using a separate token
        frappe.local.login_manager.make_session(resume=True)

        # Get user roles for JWT payload
        user_roles = [role.role for role in user_doc.roles]

        # Lấy JWT settings từ hàm được import
        jwt_settings = get_jwt_settings()

        # Tính thời gian hết hạn
        expiry = datetime.datetime.utcnow() + datetime.timedelta(seconds=jwt_settings["access_token_expires"])
        
        # Tạo JWT payload
        payload = {
            "user_id": user_doc.name,
            "email": user_doc.email,
            "full_name": user_doc.full_name,
            "roles": user_roles,
            "exp": expiry,
            "iat": datetime.datetime.utcnow(),
        }
        
        # Ký JWT
        access_token = jwt.encode(
            payload,
            jwt_settings["secret"],
            algorithm=jwt_settings["algorithm"]
        )

        # For NextAuth, you might not need to return a Frappe API key/secret.
        # NextAuth will manage its own session based on this successful Frappe login.
        # The 'sid' cookie set by make_session() is what Frappe backend will use.
        return {
            "success": True,
            "message": {
                "access_token": access_token,
                "user_info": {
                    "id": user_doc.name,
                "name": user_doc.full_name,
                "email": user_doc.email,
                    "image": user_doc.user_image,
                    "roles": user_roles
            },
            "is_new_user": is_new_user
            }
        }
        
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), f"Social Login Handler Error for {email} via {provider}")
        frappe.response.http_status_code = 500
        return {"success": False, "message": str(e)}


@frappe.whitelist(allow_guest=True)
def update_user_password_api(user_email=None, new_password=None, user=None, reset_token=None):
    """
    Update a user's password (authenticated endpoint)
    Parameters:
        user_email: Email of the user to update password
        new_password: New password for the user
        user: Alternative parameter name for user_email (for compatibility)
        reset_token: Optional token for password reset without authentication
    """
    try:
        # Handle alternative parameter name
        if user_email is None and user is not None:
            user_email = user
        
        # Get current session user
        session_user = frappe.session.user
        
        # Check if this is a reset password request from the reset-password API
        is_reset_password_request = False
        # If we're handling this from reset-password.js, we'll bypass authentication checks
        if session_user == "Guest" and frappe.request and frappe.request.path:
            request_path = frappe.request.path
            if "/api/method/elearning.api.auth.update_user_password" in request_path:
                # Confirm it's coming from our reset password flow by checking the referrer or a special header
                if (frappe.request.environ.get('HTTP_REFERER') and '/reset-password' in frappe.request.environ.get('HTTP_REFERER')) \
                    or frappe.request.headers.get('X-From-Reset-Password'):
                    is_reset_password_request = True
        
        # Authenticate the request
        if session_user == "Guest" and not is_reset_password_request:
            frappe.throw(_("Authentication required to update password."), frappe.AuthenticationError)
        
        # Validate required parameters
        if not user_email:
            frappe.throw(_("Email address is required to update password"))
        
        if not new_password:
            frappe.throw(_("New password is required"))
        
        # If user is trying to change someone else's password and it's not a reset request,
        # verify permissions
        if session_user != user_email and not is_reset_password_request and not frappe.has_permission("User", "write", session_user):
            frappe.throw(_("You do not have permission to update this user's password."), frappe.PermissionError)
        
        # Check if user exists
        if not frappe.db.exists("User", user_email):
            frappe.throw(_("User not found"))
        
        # Password strength check
        user_doc = frappe.get_doc("User", user_email)
        
        user_data = (
            user_doc.full_name or f"{user_doc.first_name} {user_doc.last_name}",
            user_doc.first_name,
            user_doc.last_name,
            user_doc.email,
            user_doc.birth_date if hasattr(user_doc, "birth_date") else None
        )
        
        test_password_strength(new_password, user_data=user_data)
        
        # Use Frappe's password update function which handles hashing
        frappe_update_password(user_email, new_password)
        
        return {
            "success": True,
            "message": _("Password updated successfully.")
        }
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Password Update Error")
        frappe.throw(_("Error updating password: {0}").format(str(e)))

@frappe.whitelist(allow_guest=True)
def update_user_password(user_email=None, new_password=None, user=None, reset_token=None):
    """
    Alias for update_user_password_api to maintain backward compatibility
    Also handles direct form submissions where parameters might come from form_dict
    """
    # Debug: log request parameters
    frappe.logger().debug(f"update_user_password called with: user_email={user_email}, user={user}, has_reset_token={bool(reset_token)}")
    
    if hasattr(frappe.local, 'form_dict'):
        frappe.logger().debug(f"form_dict contains: {frappe.local.form_dict}")
    
    # Accept user parameter as alias for user_email
    if user_email is None:
        user_email = user
    
    # Attempt to get parameters from form_dict if not provided as arguments
    if user_email is None and hasattr(frappe.local, 'form_dict'):
        user_email = frappe.local.form_dict.get('user_email') or frappe.local.form_dict.get('email') or frappe.local.form_dict.get('user')
    
    if new_password is None and hasattr(frappe.local, 'form_dict'):
        new_password = frappe.local.form_dict.get('new_password') or frappe.local.form_dict.get('password')
    
    if reset_token is None and hasattr(frappe.local, 'form_dict'):
        reset_token = frappe.local.form_dict.get('reset_token')
    
    # Debug: log resolved parameters
    frappe.logger().debug(f"Resolved parameters: user_email={user_email}, new_password_length={len(new_password) if new_password else 0}, has_reset_token={bool(reset_token)}")
    
    # Validate required parameters
    if not user_email:
        frappe.throw(_("Email address is required to update password"))
    
    if not new_password:
        frappe.throw(_("New password is required"))
        
    # Call the actual implementation
    return update_user_password_api(user_email, new_password, user=None, reset_token=reset_token)

# --- Test Reset Password (Simple existence check) ---
# This is okay as a simple check.
@frappe.whitelist(allow_guest=True)
def test_user_exists_for_reset(user_email): # Renamed
    if not frappe.db.exists("User", user_email):
        frappe.throw(_("User with this email not found."))
    return {"success": True, "message": _("User exists. Password reset can proceed.")}


# Legacy signup - keep if needed for backward compatibility, otherwise remove.
# @frappe.whitelist(allow_guest=True)
# def signup(first_name, last_name, email, password, age_level=None):
#     return custom_user_signup(first_name, last_name, email, password, age_level)