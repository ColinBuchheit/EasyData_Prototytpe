import requests
import logging
import os
from config.settings import ENV

# Secure Logging Setup
logger = logging.getLogger(__name__)

class LLMIntegration:
    """Handles LLM communication for SQL query generation and validation."""

    def __init__(self, model=None):
        """Initialize LLM settings."""
        self.model = model if model else ENV.DEFAULT_LLM_MODEL  # ✅ Load default model from settings
        self.api_key = ENV.AI_API_KEY
        self.api_url = ENV.AI_AGENT_API
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }

    def generate_sql(self, user_query: str, db_schema: dict) -> str:
        """
        Sends a user query to the LLM for SQL generation.

        Args:
            user_query (str): Natural language query from the user.
            db_schema (dict): Database schema metadata.

        Returns:
            str: AI-generated SQL query.
        """
        logger.info(f"🔍 Sending query to LLM: {user_query}")

        payload = {
            "model": self.model,
            "query": user_query,
            "schema": db_schema
        }

        for attempt in range(3):  # ✅ Retry up to 3 times for API failures
            try:
                response = requests.post(f"{self.api_url}/generate-sql", json=payload, headers=self.headers, timeout=10)

                if response.status_code == 200:
                    sql_query = response.json().get("sql_query")
                    logger.info(f"✅ LLM SQL Generation Success: {sql_query}")
                    return sql_query

                logger.warning(f"⚠️ Attempt {attempt+1}: LLM API Error: {response.status_code} - {response.text}")

            except requests.exceptions.RequestException as e:
                logger.error(f"❌ LLM Connection Failed: {str(e)}")

        return "ERROR: AI model unavailable."

    def validate_sql(self, sql_query: str) -> bool:
        """
        Sends a SQL query to the LLM for security validation.

        Args:
            sql_query (str): AI-generated SQL query.

        Returns:
            bool: True if the query passes security validation, False otherwise.
        """
        logger.info(f"🔍 Validating SQL Query via LLM")

        payload = {
            "model": self.model,
            "sql_query": sql_query
        }

        try:
            response = requests.post(f"{self.api_url}/validate-sql", json=payload, headers=self.headers, timeout=10)

            if response.status_code == 200:
                is_valid = response.json().get("is_valid", False)
                logger.info(f"✅ LLM Validation Result: {is_valid}")
                return is_valid

            logger.warning(f"⚠️ LLM Validation Error: {response.status_code} - {response.text}")

        except requests.exceptions.RequestException as e:
            logger.error(f"❌ LLM Validation Failed: {str(e)}")

        return False
