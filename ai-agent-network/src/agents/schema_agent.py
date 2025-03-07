import requests
import logging
import json
import time
from config.settings import BACKEND_API_URL, AI_API_KEY, AUTH_HEADERS, REDIS_CLIENT

logger = logging.getLogger(__name__)

class SchemaAgent:
    """Fetches database schema from AI-service with Redis caching and NoSQL support."""

    def __init__(self):
        """Initialize Schema Agent with caching and NoSQL support."""
        self.relational_dbs = {"postgres", "mysql", "mssql", "sqlite"}
        self.nosql_dbs = {"mongodb", "firebase", "dynamodb", "couchdb"}

    def get_schema(self, user_id: int, db_type: str, user_role: str):
        """
        Retrieves the database schema via AI-service, with Redis caching and NoSQL support.

        Args:
            user_id (int): The user ID for identifying the schema request.
            db_type (str): The database type (PostgreSQL, MongoDB, etc.).
            user_role (str): The user's role (admin, analyst, etc.).

        Returns:
            dict: The database schema metadata or an error message.
        """
        if user_role not in ["admin", "analyst"]:
            logger.warning(f"❌ Unauthorized schema request by User {user_id}")
            return {"error": "Unauthorized request"}

        cache_key = f"schema:{user_id}:{db_type}"

        # ✅ Check Redis Cache First
        cached_schema = REDIS_CLIENT.get(cache_key)
        if cached_schema:
            logger.info(f"⚡ Cache HIT: Returning cached schema for {db_type} (User: {user_id})")
            return json.loads(cached_schema.decode("utf-8"))

        logger.warning(f"🚨 Cache MISS: Fetching schema from AI-service for {db_type} (User: {user_id})")

        retries = 3
        backoff_factor = 2  # Exponential backoff strategy

        for attempt in range(retries):
            try:
                response = requests.get(
                    f"{BACKEND_API_URL}/db/schema",
                    params={"user_id": user_id, "db_type": db_type},
                    headers={**AUTH_HEADERS, "api_key": AI_API_KEY},
                    timeout=10  # ✅ Prevents indefinite waiting
                )

                if response.status_code == 200:
                    schema = response.json().get("schema", None)

                    if not schema or not isinstance(schema, dict):
                        logger.error(f"❌ Invalid schema received for {db_type} (User: {user_id})")
                        return {"error": "Invalid schema"}

                    # ✅ Store Schema in Redis with TTL from ENV
                    REDIS_CLIENT.setex(cache_key, 86400, json.dumps(schema))  # Expires in 24h
                    logger.info(f"✅ Schema retrieved and cached for {db_type} (User: {user_id})")
                    return schema

                logger.error(f"❌ Schema retrieval failed | Status: {response.status_code} | Response: {response.text}")
                return {"error": "Failed to retrieve schema"}

            except requests.exceptions.RequestException as e:
                wait_time = backoff_factor ** attempt
                logger.warning(f"⚠️ Network error retrieving schema (Retry {attempt + 1}/{retries} in {wait_time}s): {str(e)}")
                time.sleep(wait_time)

        logger.error("❌ Schema retrieval failed after multiple attempts.")
        return {"error": "Network error after multiple retries"}

    def invalidate_schema_cache(self, user_id: int, db_type: str):
        """
        Manually invalidates schema cache for a specific user and database type.

        Args:
            user_id (int): The user ID.
            db_type (str): The database type.

        Returns:
            dict: Success or error message.
        """
        cache_key = f"schema:{user_id}:{db_type}"
        REDIS_CLIENT.delete(cache_key)
        logger.info(f"🗑️ Schema cache manually invalidated for User {user_id} ({db_type})")
        return {"message": "Schema cache invalidated."}

    def invalidate_all_user_schemas(self, user_id: int):
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
        return {"message": "All user schema caches invalidated."}
