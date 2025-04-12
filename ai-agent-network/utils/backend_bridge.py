# utils/backend_bridge.py

import requests
from typing import Dict, Any, Optional, Union
from utils.settings import BACKEND_API_URL
from utils.logger import logger


def fetch_query_result(query: str, db_info: Dict[str, Any], user_id: str) -> Optional[str]:
    """
    Sends a query execution request to the backend.
    """
    try:
        response = requests.post(f"{BACKEND_API_URL}/api/query/execute", json={
            "query": query,
            "db_info": db_info,
            "user_id": user_id
        }, headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {get_backend_token()}"
        })
        response.raise_for_status()
        logger.info(f"✅ Query executed via backend for user {user_id}")
        return response.json().get("result", "")
    except Exception as e:
        logger.error(f"❌ Failed to execute query for user {user_id}: {e}")
        return None


def fetch_schema_for_user_db(db_info: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """
    Retrieves schema from backend instead of direct DB connection.
    """
    try:
        logger.info(f"Fetching schema from backend for user {user_id}")
        response = requests.post(f"{BACKEND_API_URL}/api/schema/fetch", json={
            "db_info": db_info,
            "user_id": user_id
        }, headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {get_backend_token()}"
        })
        response.raise_for_status()
        
        schema_result = response.json()
        
        # Log success with number of tables found
        if "schema" in schema_result and "tables" in schema_result["schema"]:
            num_tables = len(schema_result["schema"]["tables"])
            logger.info(f"✅ Schema fetched from backend for user {user_id} - Found {num_tables} tables")
        else:
            logger.warning(f"⚠️ Schema response missing expected structure for user {user_id}")
        
        return schema_result
    except requests.exceptions.RequestException as e:
        if hasattr(e, 'response') and e.response:
            status_code = e.response.status_code
            error_detail = f"Status code: {status_code}"
            try:
                error_json = e.response.json()
                error_detail += f", Message: {error_json.get('message', 'No details provided')}"
            except:
                pass
            logger.error(f"❌ Backend request failed for schema fetch: {error_detail}")
        else:
            logger.error(f"❌ Connection error with backend for schema fetch: {e}")
        
        return {"success": False, "error": str(e)}
    except Exception as e:
        logger.error(f"❌ Failed to fetch schema for user {user_id}: {e}")
        return {"success": False, "error": str(e)}


def save_conversation_to_backend(data: Dict[str, Any]) -> bool:
    """
    Persists the conversation context (prompt, query, output) to backend store.
    """
    try:
        response = requests.post(f"{BACKEND_API_URL}/api/conversation/store", json=data, headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {get_backend_token()}"
        })
        response.raise_for_status()
        logger.info(f"✅ Conversation saved to backend for user {data.get('user_id')}")
        return True
    except Exception as e:
        logger.warning(f"⚠️ Could not save conversation to backend: {e}")
        return False


def get_backend_token() -> str:
    """
    Gets authentication token for backend API access. This implements
    a service-to-service authentication model.
    """
    from settings import BACKEND_SECRET, BACKEND_SERVICE_ID
    import time
    import hmac
    import hashlib
    import base64
    import json
    
    # Create a simple JWT-like token with HMAC
    now = int(time.time())
    payload = {
        "service_id": BACKEND_SERVICE_ID,
        "timestamp": now,
        "exp": now + 3600  # 1 hour expiry
    }
    
    # Convert payload to base64 encoded JSON string
    payload_bytes = json.dumps(payload).encode('utf-8')
    payload_b64 = base64.b64encode(payload_bytes).decode('utf-8')
    
    # Create signature with HMAC-SHA256
    signature = hmac.new(
        BACKEND_SECRET.encode('utf-8'),
        payload_b64.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    # Combine into token
    return f"{payload_b64}.{signature}"


def health_check() -> Dict[str, Any]:
    """
    Check backend API health
    """
    try:
        response = requests.get(f"{BACKEND_API_URL}/api/health", headers={
            "Authorization": f"Bearer {get_backend_token()}"
        })
        response.raise_for_status()
        return {"status": "ok", "backend_status": response.json()}
    except Exception as e:
        logger.error(f"❌ Backend health check failed: {e}")
        return {"status": "error", "message": str(e)}


def register_ai_agent() -> bool:
    """
    Register this AI agent instance with the backend
    """
    try:
        from settings import AI_AGENT_ID, AI_AGENT_VERSION
        
        response = requests.post(f"{BACKEND_API_URL}/api/agent/register", json={
            "agent_id": AI_AGENT_ID,
            "version": AI_AGENT_VERSION,
            "capabilities": ["query_generation", "schema_analysis", "visualization"],
            "status": "online"
        }, headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {get_backend_token()}"
        })
        response.raise_for_status()
        logger.info(f"✅ AI agent registered with backend: {AI_AGENT_ID}")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to register AI agent with backend: {e}")
        return False