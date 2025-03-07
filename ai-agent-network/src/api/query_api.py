from fastapi import APIRouter, HTTPException, Depends
import logging
import json
from pydantic import BaseModel, Field
from agents.query_agent import QueryAgent
from agents.validation_security_agent import ValidationSecurityAgent
from agents.schema_agent import SchemaAgent
from security.auth import require_role
from slowapi import Limiter
from slowapi.util import get_remote_address
from config.settings import REDIS_CLIENT

# Secure Logging Setup
logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/query", tags=["Query API"])
query_agent = QueryAgent()
schema_agent = SchemaAgent()
validation_agent = ValidationSecurityAgent()
limiter = Limiter(key_func=get_remote_address)

# ✅ Supported Database Types
SUPPORTED_DBS = {"postgres", "mysql", "mssql", "sqlite", "mongodb", "firebase", "dynamodb", "couchdb"}

class QueryRequest(BaseModel):
    user_query: str = Field(..., min_length=5, max_length=500, description="The natural language query from the user.")
    db_type: str = Field(..., description="The database type (PostgreSQL, MongoDB, etc.).")
    user_id: int = Field(..., description="User ID associated with the request.")
    user_role: str = Field(..., description="The user's role (admin, analyst, etc.).")

    @classmethod
    def validate_db_type(cls, db_type: str):
        """Ensures only supported databases are allowed."""
        if db_type.lower() not in SUPPORTED_DBS:
            raise ValueError(f"❌ Unsupported database type: {db_type}")
        return db_type.lower()

@router.post("/generate-query")
@limiter.limit("5/minute")  # ✅ Limit to 5 queries per minute per user
async def generate_query(request: QueryRequest, current_user=Depends(require_role(["admin", "analyst"]))):
    """
    Processes a natural language query, validates it, and generates a secure SQL/NoSQL query.

    Args:
        request (QueryRequest): User's input query request.
        current_user (dict): Authenticated user details.

    Returns:
        dict: Secure query or an error message.
    """
    logger.info(f"🔍 Query request from User {request.user_id} | DB: {request.db_type}")

    # ✅ Retrieve schema dynamically before query generation
    schema = schema_agent.get_schema(request.user_id, request.db_type, request.user_role)
    if "error" in schema:
        raise HTTPException(status_code=400, detail="❌ Failed to retrieve database schema.")

    # ✅ Generate AI-powered SQL/NoSQL query
    generated_query = query_agent.generate_query(request.user_query, request.db_type, request.user_id, request.user_role)
    if "error" in generated_query:
        raise HTTPException(status_code=400, detail=generated_query["error"])

    # ✅ Validate query before returning it
    if not validation_agent.validate_sql(generated_query["query"], schema):
        raise HTTPException(status_code=400, detail="❌ Query validation failed.")

    # ✅ Cache result for quick retrieval
    cache_key = f"query_cache:{request.user_query}:{request.db_type}"
    REDIS_CLIENT.setex(cache_key, 3600, json.dumps({"query": generated_query["query"]}))

    return {"status": "success", "query": generated_query["query"]}

@router.get("/cached-query")
async def get_cached_query(user_query: str, db_type: str):
    """
    Retrieves a cached query result if available.

    Args:
        user_query (str): The query text to check for caching.
        db_type (str): The database type.

    Returns:
        dict: Cached query result or error message.
    """
    cache_key = f"query_cache:{user_query}:{db_type}"
    cached_query = REDIS_CLIENT.get(cache_key)

    if cached_query:
        logger.info(f"⚡ Returning cached query result for {user_query} ({db_type})")
        return {"status": "success", "cached_query": json.loads(cached_query.decode("utf-8"))}

    return {"status": "error", "message": "No cached query found."}

@router.get("/supported-dbs")
async def list_supported_databases():
    """
    Lists all supported database types.

    Returns:
        dict: Supported databases.
    """
    return {"status": "success", "supported_databases": list(SUPPORTED_DBS)}
