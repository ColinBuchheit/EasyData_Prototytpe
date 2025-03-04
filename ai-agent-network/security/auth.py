from fastapi import HTTPException, Security, Depends
from fastapi.security import APIKeyHeader
import jwt
import time
import logging
from src.config.env import ENV

# Secure Logging Setup
logger = logging.getLogger(__name__)

# API Key & JWT Setup
api_key_header = APIKeyHeader(name="api_key", auto_error=False)

if not ENV.JWT_SECRET or not ENV.BACKEND_SECRET:
    raise RuntimeError("❌ Critical Error: Missing JWT_SECRET or BACKEND_SECRET in environment variables.")

# ✅ User rate-limiting tracker (anti-spam)
user_request_timestamps = {}

def enforce_rate_limit(user_id: str, max_requests: int = 5, window_seconds: int = 60):
    """Prevents excessive API requests per user."""
    current_time = time.time()
    if user_id not in user_request_timestamps:
        user_request_timestamps[user_id] = []

    user_request_timestamps[user_id] = [
        t for t in user_request_timestamps[user_id] if current_time - t < window_seconds
    ]

    if len(user_request_timestamps[user_id]) >= max_requests:
        logger.warning(f"❌ Rate limit exceeded for User {user_id}")
        raise HTTPException(status_code=429, detail="Too many requests. Please wait.")

    user_request_timestamps[user_id].append(current_time)

async def verify_api_key(api_key: str = Security(api_key_header)):
    """Enforces API key authentication."""
    if api_key != ENV.BACKEND_SECRET:
        logger.warning("❌ Unauthorized API access attempt.")
        raise HTTPException(status_code=403, detail="Invalid API Key.")
    return api_key

async def get_current_user(api_key: str = Depends(verify_api_key), authorization: str = Security(APIKeyHeader(name="Authorization", auto_error=False))):
    """Verifies JWT authentication and role-based access."""
    if not authorization:
        logger.warning("⚠️ Unauthorized request: No token provided")
        raise HTTPException(status_code=401, detail="❌ No token provided.")

    token = authorization.split(" ")[1] if " " in authorization else authorization

    try:
        decoded_token = jwt.decode(token, ENV.JWT_SECRET, algorithms=["HS256"])
        user_data = {
            "id": decoded_token.get("id"),
            "role": decoded_token.get("role")
        }

        if not user_data["id"] or not user_data["role"]:
            raise HTTPException(status_code=401, detail="❌ Invalid token structure.")

        # ✅ Enforce rate-limiting
        enforce_rate_limit(user_data["id"])
        return user_data

    except jwt.ExpiredSignatureError:
        logger.warning("⚠️ Token expired: Reauthentication required.")
        raise HTTPException(status_code=401, detail="❌ Token expired, please log in again.")

    except jwt.InvalidTokenError:
        logger.error("❌ Unauthorized: Invalid token")
        raise HTTPException(status_code=401, detail="❌ Unauthorized: Invalid token.")

async def require_role(roles: list):
    """Middleware function to enforce role-based access control (RBAC)."""
    async def role_checker(user=Depends(get_current_user)):
        if user["role"] not in roles:
            logger.warning(f"🚫 Access Denied: User {user['id']} attempted restricted action.")
            raise HTTPException(status_code=403, detail="❌ Forbidden: Insufficient permissions.")
        logger.info(f"✅ Role validation passed: User {user['id']} has role {user['role']}")
        return user
    return role_checker

async def verify_backend_request(request_secret: str = Security(APIKeyHeader(name="request_secret", auto_error=False))):
    """Ensures only backend requests with the correct secret key are processed."""
    if request_secret != ENV.BACKEND_SECRET:
        logger.warning("⚠️ Unauthorized backend request detected.")
        raise HTTPException(status_code=403, detail="❌ Unauthorized: Backend secret invalid.")
    logger.info("✅ Backend request authenticated successfully.")
