# utils/backend_bridge.py

import requests
import json
import time
import hmac
import hashlib
import base64
from typing import Dict, Any, Optional, List, Union

from utils.logger import logger
from utils.settings import BACKEND_API_URL, BACKEND_SECRET, BACKEND_SERVICE_ID, AI_AGENT_ID, AI_AGENT_VERSION


def fetch_query_result(query: str, db_info: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """
    Sends a query execution request to the backend.
    
    Args:
        query: The SQL query to execute
        db_info: Database information including id, db_type, and database_name
        user_id: The user's ID
        
    Returns:
        Dict containing query results or error information
    """
    try:
        # Extract dbId from db_info
        db_id = db_info.get('id')
        if not db_id:
            logger.error(f"Missing database ID in db_info")
            return {"success": False, "error": "Missing database ID in request"}
            
        response = requests.post(
            f"{BACKEND_API_URL}/api/query/execute", 
            json={
                "query": query,
                "db_info": db_info,
                "user_id": user_id,
                "dbId": db_id  # Make sure dbId is explicitly included
            }, 
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {get_backend_token()}"
            }
        )
        response.raise_for_status()
        result = response.json()
        logger.info(f"✅ Query executed via backend for user {user_id}")
        
        return result
    except requests.exceptions.RequestException as e:
        # Handle HTTP errors with detailed logging
        if hasattr(e, 'response') and e.response:
            status_code = e.response.status_code
            error_detail = f"Status code: {status_code}"
            try:
                error_json = e.response.json()
                error_detail += f", Message: {error_json.get('message', 'No details provided')}"
                logger.error(f"❌ Backend request failed for query execution: {error_detail}")
                return {"success": False, "error": error_detail}
            except:
                pass
        logger.error(f"❌ Failed to execute query for user {user_id}: {e}")
        return {"success": False, "error": str(e)}
    except Exception as e:
        logger.error(f"❌ Failed to execute query for user {user_id}: {e}")
        return {"success": False, "error": str(e)}


def execute_multi_db_query(task: str, db_ids: List[int], user_id: str) -> Dict[str, Any]:
    """
    Executes a query across multiple databases.
    
    Args:
        task: The natural language query or task description
        db_ids: List of database IDs to query across
        user_id: The user's ID
        
    Returns:
        Dict containing results from each database
    """
    try:
        logger.info(f"Executing multi-database query for user {user_id}")
        response = requests.post(
            f"{BACKEND_API_URL}/api/query/multi", 
            json={
                "task": task,
                "dbIds": db_ids,
                "user_id": user_id
            },
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {get_backend_token()}"
            }
        )
        response.raise_for_status()
        result = response.json()
        logger.info(f"✅ Multi-DB query executed via backend for user {user_id}")
        
        return result
    except Exception as e:
        logger.error(f"❌ Failed to execute multi-DB query for user {user_id}: {e}")
        return {"success": False, "error": str(e)}


def fetch_schema_for_user_db(db_info: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """
    Retrieves schema from backend instead of direct DB connection.
    Enhanced version that handles more schema details.
    
    Args:
        db_info: Database information including id, db_type, and database_name
        user_id: The user's ID
        
    Returns:
        Dict containing schema information
    """
    try:
        db_id = db_info.get('id')
        if not db_id:
            logger.warning("⚠️ No database ID provided in db_info")
            return {"success": False, "error": "No database ID provided"}
            
        logger.info(f"Fetching schema from backend for user {user_id}, db {db_id}")
        
        # First try the unified schema endpoint for richer schema information
        unified_schema = get_unified_schema(db_id, user_id)
        if unified_schema.get("success"):
            logger.info(f"✅ Unified schema fetched for user {user_id}, db {db_id}")
            return unified_schema
            
        # Fall back to the original endpoint if unified schema fails
        response = requests.post(
            f"{BACKEND_API_URL}/api/query/schema/fetch", 
            json={
                "db_info": db_info,
                "user_id": user_id
            },
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {get_backend_token()}"
            }
        )
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


def get_unified_schema(db_id: int, user_id: str) -> Dict[str, Any]:
    """
    Retrieves unified schema information for a database.
    
    Args:
        db_id: The database ID
        user_id: The user's ID
        
    Returns:
        Dict containing unified schema information
    """
    try:
        logger.info(f"Fetching unified schema from backend for user {user_id}, db {db_id}")
        response = requests.get(
            f"{BACKEND_API_URL}/api/database/schema/unified/{db_id}",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {get_backend_token()}"
            }
        )
        response.raise_for_status()
        
        schema_result = response.json()
        if schema_result.get("success") and "schema" in schema_result:
            logger.info(f"✅ Unified schema fetched for user {user_id}, db {db_id}")
        else:
            logger.warning(f"⚠️ Unified schema response missing expected structure")
            
        return schema_result
    except Exception as e:
        logger.error(f"❌ Failed to fetch unified schema for user {user_id}, db {db_id}: {e}")
        return {"success": False, "error": str(e)}


def save_conversation_to_backend(data: Dict[str, Any]) -> bool:
    """
    Persists the conversation context (prompt, query, output) to backend store.
    
    Args:
        data: Dict containing conversation data including user_id, context, conversation_id, 
              prompt, query, and output
              
    Returns:
        Boolean indicating success
    """
    try:
        response = requests.post(
            f"{BACKEND_API_URL}/api/query/conversation/store", 
            json=data, 
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {get_backend_token()}"
            }
        )
        response.raise_for_status()
        logger.info(f"✅ Conversation saved to backend for user {data.get('user_id')}")
        return True
    except Exception as e:
        logger.warning(f"⚠️ Could not save conversation to backend: {e}")
        return False


def get_database_context(user_id: str) -> Dict[str, Any]:
    """
    Gets the current database context for a user.
    
    Args:
        user_id: The user's ID
        
    Returns:
        Dict containing current database context information
    """
    try:
        logger.info(f"Getting database context for user {user_id}")
        response = requests.get(
            f"{BACKEND_API_URL}/api/query/context",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {get_backend_token()}"
            }
        )
        response.raise_for_status()
        
        context_result = response.json()
        if context_result.get("success"):
            logger.info(f"✅ Database context retrieved for user {user_id}")
        else:
            logger.warning(f"⚠️ No database context found for user {user_id}")
            
        return context_result
    except Exception as e:
        logger.error(f"❌ Failed to get database context for user {user_id}: {e}")
        return {"success": False, "error": str(e)}


def set_database_context(user_id: str, db_id: int) -> Dict[str, Any]:
    """
    Sets the current database context for a user.
    
    Args:
        user_id: The user's ID
        db_id: The database ID to set as current context
        
    Returns:
        Dict containing result information
    """
    try:
        logger.info(f"Setting database context for user {user_id} to db {db_id}")
        response = requests.post(
            f"{BACKEND_API_URL}/api/query/context",
            json={
                "dbId": db_id
            },
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {get_backend_token()}"
            }
        )
        response.raise_for_status()
        
        result = response.json()
        if result.get("success"):
            logger.info(f"✅ Database context set for user {user_id} to db {db_id}")
        else:
            logger.warning(f"⚠️ Failed to set database context for user {user_id}")
            
        return result
    except Exception as e:
        logger.error(f"❌ Failed to set database context for user {user_id}: {e}")
        return {"success": False, "error": str(e)}


def track_ai_usage(user_id: str, task: str, db_id: int, success: bool, details: Dict[str, Any] = None) -> bool:
    """
    Tracks AI usage for analytics purposes.
    
    Args:
        user_id: The user's ID
        task: The task performed
        db_id: The database ID
        success: Whether the operation was successful
        details: Additional details about the operation
        
    Returns:
        Boolean indicating if tracking was successful
    """
    try:
        if details is None:
            details = {}
            
        logger.info(f"Tracking AI usage for user {user_id}")
        response = requests.post(
            f"{BACKEND_API_URL}/api/analytics/usage/track",
            json={
                "action": "ai_query",
                "resourceId": db_id,
                "resourceType": "database",
                "details": {
                    "task": task,
                    "success": success,
                    "dbId": db_id,
                    **details
                }
            },
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {get_backend_token()}"
            }
        )
        response.raise_for_status()
        return True
    except Exception as e:
        logger.warning(f"⚠️ Failed to track AI usage: {e}")
        return False


def check_database_health(db_id: int, user_id: str) -> Dict[str, Any]:
    """
    Checks the health of a database connection.
    
    Args:
        db_id: The database ID
        user_id: The user's ID
        
    Returns:
        Dict containing health check results
    """
    try:
        logger.info(f"Checking database health for user {user_id}, db {db_id}")
        response = requests.get(
            f"{BACKEND_API_URL}/api/database/health/connection/{db_id}",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {get_backend_token()}"
            }
        )
        response.raise_for_status()
        
        result = response.json()
        if result.get("success"):
            health_status = result.get("status", {}).get("isHealthy", False)
            logger.info(f"✅ Database health check for db {db_id}: {'Healthy' if health_status else 'Unhealthy'}")
        else:
            logger.warning(f"⚠️ Database health check failed for db {db_id}")
            
        return result
    except Exception as e:
        logger.error(f"❌ Failed to check database health for db {db_id}: {e}")
        return {"success": False, "error": str(e)}


def detect_database_for_query(user_id: str, query: str) -> Dict[str, Any]:
    """
    Detects which database should be used for a given query.
    
    Args:
        user_id: The user's ID
        query: The natural language query
        
    Returns:
        Dict containing detected database information
    """
    try:
        logger.info(f"Detecting database for query, user {user_id}")
        response = requests.post(
            f"{BACKEND_API_URL}/api/query/context/detect",
            json={
                "query": query
            },
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {get_backend_token()}"
            }
        )
        response.raise_for_status()
        
        result = response.json()
        if result.get("success") and (result.get("detected") or result.get("switched")):
            db_id = result.get("recommendedDbId") or result.get("dbId")
            logger.info(f"✅ Detected database {db_id} for query")
        else:
            logger.warning("⚠️ Could not detect database for query")
            
        return result
    except Exception as e:
        logger.error(f"❌ Failed to detect database for query: {e}")
        return {"success": False, "error": str(e)}


def fetch_database_relationships(db_id: int, user_id: str) -> Dict[str, Any]:
    """
    Fetches database relationship information.
    
    Args:
        db_id: The database ID
        user_id: The user's ID
        
    Returns:
        Dict containing relationship information
    """
    try:
        logger.info(f"Fetching database relationships for user {user_id}, db {db_id}")
        # This endpoint doesn't exist directly, but we can extract it from the schema
        schema_result = get_unified_schema(db_id, user_id)
        
        if schema_result.get("success") and "schema" in schema_result:
            schema = schema_result["schema"]
            relationships = schema.get("relationships", [])
            return {
                "success": True,
                "relationships": relationships
            }
        else:
            return {
                "success": False,
                "error": "Could not fetch relationships",
                "schema_result": schema_result
            }
    except Exception as e:
        logger.error(f"❌ Failed to fetch database relationships: {e}")
        return {"success": False, "error": str(e)}


def get_backend_token() -> str:
    """
    Gets authentication token for backend API access. This implements
    a service-to-service authentication model.
    
    Returns:
        String containing the authentication token
    """
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
    
    Returns:
        Dict containing health check results
    """
    try:
        response = requests.get(
            f"{BACKEND_API_URL}/api/health", 
            headers={
                "Authorization": f"Bearer {get_backend_token()}"
            }
        )
        response.raise_for_status()
        return {"status": "ok", "backend_status": response.json()}
    except Exception as e:
        logger.error(f"❌ Backend health check failed: {e}")
        return {"status": "error", "message": str(e)}


def register_ai_agent() -> bool:
    """
    Register this AI agent instance with the backend
    
    Returns:
        Boolean indicating if registration was successful
    """
    try:
        response = requests.post(
            f"{BACKEND_API_URL}/api/auth/agent/register", 
            json={
                "agent_id": AI_AGENT_ID,
                "version": AI_AGENT_VERSION,
                "capabilities": ["query_generation", "schema_analysis", "visualization"],
                "status": "online"
            }, 
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {get_backend_token()}"
            }
        )
        response.raise_for_status()
        logger.info(f"✅ AI agent registered with backend: {AI_AGENT_ID}")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to register AI agent with backend: {e}")
        return False