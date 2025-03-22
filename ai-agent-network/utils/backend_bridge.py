# utils/backend_bridge.py

import requests
from typing import Any, Dict, Optional, Union
from settings import BACKEND_API_URL
from utils.logger import logger

def fetch_query_result(query: str, db_info: Dict[str, Any], user_id: str) -> Optional[str]:
    """
    Sends a query execution request to the backend.
    """
    try:
        response = requests.post(f"{BACKEND_API_URL}/query/execute", json={
            "query": query,
            "db_info": db_info,
            "user_id": user_id
        })
        response.raise_for_status()
        logger.info("✅ Query executed via backend for user %s", user_id)
        return response.json().get("result", "")
    except Exception as e:
        logger.error(f"❌ Failed to execute query for user {user_id}: {e}")
        return None


def fetch_schema_for_user_db(db_info: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """
    Retrieves schema from backend if not using local adapter.
    """
    try:
        response = requests.post(f"{BACKEND_API_URL}/schema/fetch", json={
            "db_info": db_info,
            "user_id": user_id
        })
        response.raise_for_status()
        logger.info("✅ Schema fetched from backend for user %s", user_id)
        return response.json()
    except Exception as e:
        logger.error(f"❌ Failed to fetch schema for user {user_id}: {e}")
        return {"success": False, "error": str(e)}


def save_conversation_to_backend(data: Dict[str, Any]) -> bool:
    """
    Persists the conversation context (prompt, query, output) to backend store.
    """
    try:
        response = requests.post(f"{BACKEND_API_URL}/conversation/store", json=data)
        response.raise_for_status()
        logger.info("✅ Conversation saved to backend for user %s", data.get("user_id"))
        return True
    except Exception as e:
        logger.warning(f"⚠️ Could not save conversation to backend: {e}")
        return False
