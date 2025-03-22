import redis
import json
import os
from typing import Dict, Any, Optional
from settings import REDIS_URL, CONTEXT_EXPIRY_TIME

# ✅ Initialize Redis Connection
redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)


def get_context(user_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieves the latest AI task context for a user from Redis.
    Returns None if no context is found.
    """
    try:
        key = f"user:{user_id}:context"
        cached_data = redis_client.get(key)
        if cached_data:
            return json.loads(cached_data)
        return None
    except Exception as e:
        print(f"[Warning] Failed to fetch context from Redis: {e}")
        return None


def set_context(user_id: str, context: Dict[str, Any]):
    """
    Saves the AI agent's short-term memory for a user in Redis.
    The context expires after CONTEXT_EXPIRY_TIME (default: 10 minutes).
    """
    try:
        key = f"user:{user_id}:context"
        redis_client.setex(key, CONTEXT_EXPIRY_TIME, json.dumps(context))
    except Exception as e:
        print(f"[Warning] Failed to store context in Redis: {e}")


def clear_context(user_id: str):
    """
    Removes stored context for a user from Redis.
    """
    try:
        key = f"user:{user_id}:context"
        redis_client.delete(key)
    except Exception as e:
        print(f"[Warning] Failed to clear context: {e}")


def append_to_context(user_id: str, update_data: Dict[str, Any]):
    """
    Updates an existing context entry while preserving previous data.
    """
    try:
        current_context = get_context(user_id) or {}
        current_context.update(update_data)
        set_context(user_id, current_context)
    except Exception as e:
        print(f"[Warning] Failed to update context: {e}")
