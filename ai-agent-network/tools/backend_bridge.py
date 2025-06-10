# tools/backend_bridge.py

import requests
import json
import time
import hmac
import hashlib
import base64
import os
from dotenv import load_dotenv
from tools.auth_token import generate_agent_token


load_dotenv()

BACKEND_API_URL = os.getenv("BACKEND_API_URL", "http://localhost:3000")
BACKEND_SECRET = os.getenv("BACKEND_SECRET")
BACKEND_SERVICE_ID = os.getenv("BACKEND_SERVICE_ID")
AI_AGENT_ID = os.getenv("AI_AGENT_ID")
AI_AGENT_VERSION = os.getenv("AI_AGENT_VERSION")



def get_backend_token() -> str:
    """
    Generates a time-based HMAC token for service-to-service auth.
    """
    now = int(time.time())
    payload = {
        "service_id": BACKEND_SERVICE_ID,
        "timestamp": now,
        "exp": now + 3600
    }
    payload_bytes = json.dumps(payload).encode("utf-8")
    payload_b64 = base64.b64encode(payload_bytes).decode("utf-8")

    signature = hmac.new(
        BACKEND_SECRET.encode("utf-8"),
        payload_b64.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

    return f"{payload_b64}.{signature}"


def headers() -> dict:
    return {
        "Authorization": f"Bearer {get_backend_token()}",
        "Request-Secret": BACKEND_SECRET,
        "Content-Type": "application/json"
    }


def fetch_schema_for_user_db(db_info: dict, user_id: str) -> dict:
    try:
        response = requests.post(
            f"{BACKEND_API_URL}/api/query/schema/fetch",
            json={"db_info": db_info, "user_id": user_id},
            headers=headers()
        )
        response.raise_for_status()
        return {"success": True, "schema": response.json()}
    except Exception as e:
        return {"success": False, "error": str(e)}


def fetch_query_result(query: str, db_info: dict, user_id: str) -> dict:
    try:
        db_id = db_info.get("id")
        payload = {
            "query": query,
            "db_info": db_info,
            "user_id": user_id,
            "dbId": db_id
        }
        response = requests.post(
            f"{BACKEND_API_URL}/api/query/execute",
            json=payload,
            headers=headers()
        )
        response.raise_for_status()
        return {"success": True, "data": response.json()}
    except Exception as e:
        return {"success": False, "error": str(e)}


def save_conversation_to_backend(payload: dict) -> dict:
    try:
        response = requests.post(
            f"{BACKEND_API_URL}/api/query/conversation/store",
            json=payload,
            headers=headers()
        )
        response.raise_for_status()
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}


def detect_database_for_query(user_id: str, query: str) -> dict:
    try:
        response = requests.post(
            f"{BACKEND_API_URL}/api/query/context/detect",
            json={"query": query, "user_id": user_id},
            headers=headers()
        )
        response.raise_for_status()
        return response.json()
    except Exception as e:
        return {"success": False, "error": str(e)}


def register_ai_agent() -> dict:
    try:
        response = requests.post(
            f"{BACKEND_API_URL}/api/auth/agent/register",
            json={
                "agent_id": AI_AGENT_ID,
                "version": AI_AGENT_VERSION,
                "capabilities": ["query_generation", "schema_analysis", "visualization"],
                "status": "online"
            },
            headers=headers()
        )
        response.raise_for_status()
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}


def health_check() -> dict:
    try:
        response = requests.get(
            f"{BACKEND_API_URL}/api/health",
            headers=headers()
        )
        response.raise_for_status()
        return {"success": True, "status": response.json()}
    except Exception as e:
        return {"success": False, "error": str(e)}
