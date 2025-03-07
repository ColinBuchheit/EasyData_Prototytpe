from fastapi import HTTPException, Security, Depends
from fastapi.security import APIKeyHeader
import jwt
import time
import logging
import redis  # ✅ Added Redis for JWT revocation
from src.config.env import ENV

# Secure Logging Setup
logger = logging.getLogger(__name__)

# API Key & JWT Setup
api_key_header = APIKeyHeader(name="api_key", auto_error=False)

if not ENV.JWT_SECRET or not ENV.BACKEND_SECRET:
    raise RuntimeError("❌ Critical Error: Missing JWT_SECRET or BACKEND_SECRET in environment variables.")

# ✅ Redis-based JWT Blacklist Storage
redis_client = redis.Redis(host=ENV.REDIS_HOST, port=ENV.REDIS_PORT, db=0)

# ✅ Role-based Permissions
ROLE_PERMISSIONS = {
    "admin": ["manage_schema", "modify_agents", "generate_queries"],
    "user": ["generate_queries"]
}

# ✅ Redis-Based Rate Limiting (Prevents Abuse)
def enforce_rate_limit(user_id: str, role: str, max_requests: int = 5, window_seconds: int = 60):
    """Prevents excessive API requests per user, with exceptions for admins."""
    current_time = time.time()
    
    # Admins get a higher rate limit
    if role == "admin":
        max_requests = 20  

    rate_key = f"rate_limit:{user_id}"
    request_timestamps = redis_client.lrange(rate_key, 0, -1)

    # ✅ Remove expired requests
    valid_requests = [float(t) for t in request_timestamps if current_time - float(t) < window_seconds]
    redis_client.delete(rate_key)
    
    for t in valid_requests:
        redis_client.rpush(rate_key, t)

    # ✅ Enforce Rate Limit
    if len(valid_requests) >= max_requests:
        logger.warning(f"❌ Rate limit exceeded for User {user_id} ({role})")
        raise HTTPException(status_code=429, detail="Too many requests. Please wait.")

    redis_client.rpush(rate_key, current_time)
    redis_client.expire(rate_key, window_seconds)

# ✅ Unified API Key Authentication
async def verify_api_key(api_key: str = Security(APIKeyHeader(name="api_key", auto_error=False))):
    """Enforces API key authentication."""
    if api_key != ENV.BACKEND_SECRET:
        logger.warning("❌ Unauthorized API access attempt.")
        raise HTTPException(status_code=403, detail="Invalid API Key.")
    return api_key

async def get_current_user(api_key: str = Depends(verify_api_key), authorization: str = Security(APIKeyHeader(name="Authorization", auto_error=False))):
    """Verifies JWT authentication, checks for blacklisted tokens, and applies role-based access control."""
    if not authorization:
        logger.warning("⚠️ Unauthorized request: No token provided")
        raise HTTPException(status_code=401, detail="❌ No token provided.")

    token = authorization.split(" ")[1] if " " in authorization else authorization

    # ✅ Check if token is blacklisted (revoked)
    if redis_client.get(f"blacklist:{token}"):
        logger.warning("⚠️ Token is blacklisted. Access denied.")
        raise HTTPException(status_code=401, detail="❌ Token is invalid or revoked.")

    try:
        decoded_token = jwt.decode(token, ENV.JWT_SECRET, algorithms=["HS256"])
        user_data = {
            "id": decoded_token.get("id"),
            "role": decoded_token.get("role")
        }

        if not user_data["id"] or not user_data["role"]:
            raise HTTPException(status_code=401, detail="❌ Invalid token structure.")

        # ✅ Enforce rate-limiting with role-based limits
        enforce_rate_limit(user_data["id"], user_data["role"])
        return user_data

    except jwt.ExpiredSignatureError:
        logger.warning("⚠️ Token expired: Reauthentication required.")
        raise HTTPException(status_code=401, detail="❌ Token expired, please log in again.")

    except jwt.InvalidTokenError:
        logger.error("❌ Unauthorized: Invalid token")
        raise HTTPException(status_code=401, detail="❌ Unauthorized: Invalid token.")

async def require_role(required_permissions: list):
    """Middleware function to enforce role-based access control (RBAC)."""
    async def role_checker(user=Depends(get_current_user)):
        user_permissions = ROLE_PERMISSIONS.get(user["role"], [])
        
        if not any(permission in user_permissions for permission in required_permissions):
            logger.warning(f"🚫 Access Denied: User {user['id']} ({user['role']}) lacks required permissions.")
            raise HTTPException(status_code=403, detail="❌ Forbidden: Insufficient permissions.")

        logger.info(f"✅ Role validation passed: User {user['id']} has necessary permissions.")
        return user
    return role_checker

async def verify_backend_request(api_key: str = Security(APIKeyHeader(name="api_key", auto_error=False))):
    """Ensures only backend requests with the correct secret key are processed."""
    return await verify_api_key(api_key)

async def revoke_token(token: str):
    """Revokes a JWT by adding it to the Redis blacklist."""
    redis_client.setex(f"blacklist:{token}", min(ENV.JWT_EXPIRATION, 600), "revoked")
    logger.info(f"✅ Token revoked: {token}")
