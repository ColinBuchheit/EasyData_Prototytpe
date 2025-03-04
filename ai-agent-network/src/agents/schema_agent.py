from crewai import Agent
import requests
import logging
import time
from config.settings import BACKEND_API_URL, AI_API_KEY, AUTH_HEADERS

# Secure Logging
logger = logging.getLogger(__name__)

class SchemaAgent(Agent):
    """Securely fetches and stores database schema metadata with caching and access control."""

    def __init__(self):
        """Initialize Schema Agent with security mechanisms and caching."""
        self.schema_cache = {}  # ✅ In-memory cache
        self.cache_expiry_time = 300  # ✅ Cache expiry time in seconds (5 min)

    def is_cache_valid(self, cache_key):
        """Checks if cached schema is still valid based on expiry time."""
        if cache_key in self.schema_cache:
            cache_timestamp = self.schema_cache[cache_key].get("timestamp", 0)
            if time.time() - cache_timestamp < self.cache_expiry_time:
                return True
        return False

    def get_schema(self, user_id: int, db_type: str, user_role: str):
        """
        Securely retrieves database schema from the backend or cache.

        Args:
            user_id (int): The user ID for identifying the schema request.
            db_type (str): The database type (PostgreSQL, MySQL, etc.).
            user_role (str): The user's role (admin, analyst, etc.).

        Returns:
            dict: The database schema metadata or an error message.
        """
        if user_role not in ["admin", "analyst"]:
            logger.warning(f"❌ Unauthorized schema request by User {user_id}")
            return {"error": "Unauthorized request"}

        cache_key = f"{user_id}-{db_type}"

        # ✅ Check Cache First
        if self.is_cache_valid(cache_key):
            logger.info(f"🔄 Returning cached schema for {db_type} (User: {user_id})")
            return self.schema_cache[cache_key]["schema"]

        try:
            logger.info(f"🔍 Fetching schema from backend for {db_type} (User: {user_id})")

            response = requests.get(
                f"{BACKEND_API_URL}/secure-schema",
                params={"user_id": user_id, "db_type": db_type},
                headers={**AUTH_HEADERS, "api_key": AI_API_KEY},
                timeout=10  # ✅ Prevent indefinite waiting
            )

            if response.status_code == 200:
                schema = response.json().get("schema", None)

                if not schema or not isinstance(schema, dict):
                    logger.error(f"❌ Invalid schema received for {db_type} (User: {user_id})")
                    return {"error": "Invalid schema"}

                # ✅ Store Schema in Cache with Timestamp
                self.schema_cache[cache_key] = {
                    "schema": schema,
                    "timestamp": time.time()
                }
                logger.info(f"✅ Schema retrieved and cached for {db_type} (User: {user_id})")
                return schema

            logger.error(f"❌ Schema retrieval failed | Status: {response.status_code} | Response: {response.text}")
            return {"error": "Failed to retrieve schema"}

        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Network error while retrieving schema: {str(e)}")
            return {"error": "Network error"}
