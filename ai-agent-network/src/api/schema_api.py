from fastapi import APIRouter, HTTPException, Depends
import logging
import time
import json
from pydantic import BaseModel, Field
from agents.schema_agent import SchemaAgent
from security.auth import require_role
from slowapi import Limiter
from slowapi.util import get_remote_address
from config.settings import REDIS_CLIENT

# Secure Logging Setup
logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/schema", tags=["Schema API"])
schema_agent = SchemaAgent()
limiter = Limiter(key_func=get_remote_address)

# ✅ Supported Database Types
SUPPORTED_DBS = {"postgres", "mysql", "mssql", "sqlite", "mongodb", "firebase", "dynamodb", "couchdb"}

class SchemaRequest(BaseModel):
    user_id: int = Field(..., description="User ID requesting the schema.")
    db_type: str = Field(..., description="Database type (PostgreSQL, MongoDB, etc.).")
    user_role: str = Field(..., description="User's role (admin, analyst, etc.).")

    @classmethod
    def validate_db_type(cls, db_type: str):
        """Ensures only supported databases are allowed."""
        if db_type.lower() not in SUPPORTED_DBS:
            raise ValueError(f"❌ Unsupported database type: {db_type}")
        return db_type.lower()

def get_schema_with_retries(user_id, db_type, user_role, retries=3):
    """
    Implements exponential backoff retry logic for schema retrieval.
    """
    backoff_factor = 2  # Exponential backoff
    for attempt in range(retries):
        schema = schema_agent.get_schema(user_id, db_type, user_role)
        if schema:
            return schema

        wait_time = backoff_factor ** attempt
        logger.warning(f"⚠️ Schema retrieval failed. Retrying in {wait_time} seconds...")
        time.sleep(wait_time)

    return None  # Failed after retries

@router.get("/")
@limiter.limit("3/minute")  # ✅ Limit to 3 schema requests per minute per user
async def get_schema(user_id: int, db_type: str, current_user=Depends(require_role(["admin", "analyst"]))):
    """
    Securely fetches the database schema for a user.
    """
    logger.info(f"🔍 Schema request by User {user_id} | DB: {db_type}")

    schema = get_schema_with_retries(user_id, db_type, current_user["role"])

    if not schema:
        raise HTTPException(status_code=404, detail="❌ No schema found for this database.")

    return {"status": "success", "schema": schema}

@router.get("/cached-schema")
async def get_cached_schema(user_id: int, db_type: str):
    """
    Retrieves a cached schema result if available.

    Args:
        user_id (int): The user ID.
        db_type (str): The database type.

    Returns:
        dict: Cached schema result or error message.
    """
    cache_key = f"schema:{user_id}:{db_type}"
    cached_schema = REDIS_CLIENT.get(cache_key)

    if cached_schema:
        logger.info(f"⚡ Returning cached schema for {db_type} (User: {user_id})")
        return {"status": "success", "schema": json.loads(cached_schema.decode("utf-8"))}

    return {"status": "error", "message": "No cached schema found."}

@router.post("/invalidate-schema")
async def invalidate_schema(user_id: int, db_type: str):
    """
    Manually invalidates a schema cache for a specific user and database type.

    Args:
        user_id (int): The user ID.
        db_type (str): The database type.

    Returns:
        dict: Success or error message.
    """
    cache_key = f"schema:{user_id}:{db_type}"
    REDIS_CLIENT.delete(cache_key)
    logger.info(f"🗑️ Schema cache manually invalidated for User {user_id} ({db_type})")
    return {"status": "success", "message": "Schema cache invalidated."}

@router.post("/invalidate-all-user-schemas")
async def invalidate_all_user_schemas(user_id: int):
    """
    Invalidates all cached schemas for a specific user.

    Args:
        user_id (int): The user ID.

    Returns:
        dict: Success or error message.
    """
    keys = REDIS_CLIENT.keys(f"schema:{user_id}:*")
    for key in keys:
        REDIS_CLIENT.delete(key)

    logger.info(f"🗑️ All schema caches invalidated for User {user_id}")
    return {"status": "success", "message": "All user schema caches invalidated."}

@router.get("/supported-dbs")
async def list_supported_databases():
    """
    Lists all supported database types.

    Returns:
        dict: Supported databases.
    """
    return {"status": "success", "supported_databases": list(SUPPORTED_DBS)}
