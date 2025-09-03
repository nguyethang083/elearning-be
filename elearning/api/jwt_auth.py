import frappe
import jwt
import datetime
from frappe import _
from frappe.auth import LoginManager
from frappe.utils import cint
from pymysql.err import OperationalError

# JWT Configuration - Read from site_config.json
def get_jwt_settings():
    """Get JWT settings from site_config.json"""
    jwt_secret = frappe.conf.get("jwt_secret")
    if not jwt_secret:
        jwt_secret = "your-secret-key-change-this-in-site-config"  # Default, but should be overridden in site_config.json
        frappe.log_error("JWT Secret not configured in site_config.json. Using default (UNSAFE)", "JWT Config Error")
    
    return {
        "secret": jwt_secret,
        "algorithm": "HS256",
        "access_token_expires": cint(frappe.conf.get("jwt_expiry", 86400)),  # Default 24 hours in seconds
    }

@frappe.whitelist(allow_guest=True)
def jwt_login():
    """
    Custom JWT login endpoint that accepts email and password and returns a JWT token.
    """
    try:
        # Get request data
        if frappe.local.form_dict.get('email') and frappe.local.form_dict.get('password'):
            email = frappe.local.form_dict['email']
            password = frappe.local.form_dict['password']
        else:
            # Try to get from JSON body
            try:
                request_json = frappe.request.get_json()
                email = request_json.get('email')
                password = request_json.get('password')
            except Exception:
                frappe.throw(_("Invalid request. Email and password are required."))
        
        if not email or not password:
            frappe.throw(_("Email and password are required."))
        
        # Authenticate user with Frappe's login manager
        login_manager = LoginManager()
        
        try:
            login_manager.authenticate(user=email, pwd=password)
            # DO NOT call login_manager.post_login() to avoid creating session
        except frappe.AuthenticationError:
            frappe.response.status_code = 401
            return {
                "success": False,
                "message": _("Invalid email or password"),
            }
        
        # Get user details for JWT payload
        user = frappe.get_doc("User", email)
        if not user.enabled:
            frappe.response.status_code = 403
            return {
                "success": False,
                "message": _("User account is disabled"),
            }
        
        # Get user roles
        user_roles = [role.role for role in user.roles]
        
        # Generate JWT token
        jwt_settings = get_jwt_settings()
        
        # Calculate expiry time
        expiry = datetime.datetime.utcnow() + datetime.timedelta(seconds=jwt_settings["access_token_expires"])
        
        # Create JWT payload
        payload = {
            "user_id": user.name,
            "email": user.email,
            "full_name": user.full_name,
            "roles": user_roles,
            "exp": expiry,
            "iat": datetime.datetime.utcnow(),
        }
        
        # Sign the JWT
        access_token = jwt.encode(
            payload,
            jwt_settings["secret"],
            algorithm=jwt_settings["algorithm"]
        )
        
        # Return token and user info
        return {
            "success": True,
            "message": _("Authentication successful"),
            "access_token": access_token,
            "user": {
                "name": user.full_name,
                "email": user.email,
                "roles": user_roles,
                "id": user.name
            }
        }
    
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "JWT Login Error")
        frappe.response.status_code = 500
        return {
            "success": False,
            "message": str(e),
        }

def verify_jwt_token(token):
    """
    Verify the JWT token and return the payload if valid
    """
    try:
        jwt_settings = get_jwt_settings()
        
        # Decode and verify token
        payload = jwt.decode(
            token,
            jwt_settings["secret"],
            algorithms=[jwt_settings["algorithm"]],
            options={"verify_signature": True}
        )
        
        return payload
    except jwt.ExpiredSignatureError:
        frappe.log_error("JWT token expired", "JWT Verification Error")
        return None
    except jwt.InvalidTokenError:
        frappe.log_error("Invalid JWT token", "JWT Verification Error")
        return None
    except Exception as e:
        frappe.log_error(str(e), "JWT Verification Error")
        return None

# Add middleware to verify JWT tokens
def jwt_auth_middleware():
    """
    Middleware to authenticate requests using JWT token in Authorization header
    To be called from hooks.py before_request
    """
    # Skip for whitelisted methods and certain paths
    if (
        frappe.local.request.path.startswith("/api/method/elearning.api.jwt_auth.jwt_login") or
        frappe.local.request.path.startswith("/api/method/login") or
        frappe.local.request.path.startswith("/api/method/logout") or
        frappe.local.request.path.startswith("/api/method/frappe.core.doctype.user.user") or
        "allow_guest=True" in frappe.local.flags
    ):
        return
    
    # Check if Authorization header exists
    auth_header = frappe.request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        # No token provided, let Frappe handle normal auth
        return
    
    # Extract token
    token = auth_header.replace("Bearer ", "")
    
    # Verify token
    payload = verify_jwt_token(token)
    if not payload:
        frappe.response.status_code = 401
        frappe.local.response["message"] = _("Invalid or expired token")
        return
    
    # Set session user from token
    user_id = payload.get("user_id")
    
    if user_id:
        try:
            # Set Frappe's session user to the user from the token
            frappe.local.login_manager.login_as(user_id)
            frappe.log_error(f"Frappe session successfully set for user: {frappe.session.user} via JWT", "JWT Auth Success")
        except OperationalError as e:
            # Bắt chính xác lỗi race condition (1020)
            if e.args[0] == 1020:
                # Bỏ qua lỗi này một cách an toàn vì một request khác đã cập nhật session thành công
                # Đảm bảo request hiện tại vẫn tiếp tục với session hợp lệ
                frappe.local.login_manager.resume = True
                pass
            else:
                # Nếu là lỗi database khác, hãy báo lỗi như bình thường
                raise
    else:
        frappe.response.status_code = 401
        frappe.local.response["message"] = _("Invalid token payload")

@frappe.whitelist()
def get_user_info():
    """
    Get user information for the currently authenticated user
    Used to verify JWT authentication is working
    """
    user = frappe.session.user
    if user == "Guest":
        frappe.response.status_code = 401
        return {
            "success": False,
            "message": _("Not authenticated")
        }
    
    user_doc = frappe.get_doc("User", user)
    user_roles = [role.role for role in user_doc.roles]
    
    return {
        "success": True,
        "user": {
            "name": user_doc.full_name,
            "email": user_doc.email,
            "roles": user_roles,
            "id": user_doc.name
        }
    }