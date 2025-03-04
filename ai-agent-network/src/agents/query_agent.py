from crewai import Agent
import requests
import logging
from config.settings import BACKEND_API_URL, AI_API_KEY, AUTH_HEADERS
from agents.validation_security_agent import ValidationSecurityAgent

# Secure Logging
logger = logging.getLogger(__name__)

class QueryAgent(Agent):
    """Securely generates SQL queries with validation and access control."""

    def __init__(self):
        """Initialize Query Agent with security mechanisms."""
        self.name = "Query Agent"
        self.role = "Secure SQL Query Generator"
        self.validator = ValidationSecurityAgent()  # ✅ Secure Query Validation

    def generate_sql(self, user_query: str, db_type: str, schema: dict, user_role: str) -> dict:
        """
        Securely generates and validates an AI-powered SQL query.

        Args:
            user_query (str): The natural language query from the user.
            db_type (str): The database type (PostgreSQL, MySQL, etc.).
            schema (dict): The database schema metadata.
            user_role (str): The user's role (admin, analyst, etc.).

        Returns:
            dict: Validated SQL query or an error message.
        """
        if user_role not in ["admin", "analyst"]:
            logger.warning(f"❌ Unauthorized query request by user {user_role}")
            return {"error": "Unauthorized request"}

        logger.info(f"🔍 Generating secure SQL for query: {user_query}")

        payload = {
            "userQuery": user_query,
            "dbType": db_type,
            "schema": schema
        }

        try:
            response = requests.post(
                f"{BACKEND_API_URL}/generate-secure-sql",
                json=payload,
                headers={**AUTH_HEADERS, "api_key": AI_API_KEY},
                timeout=10  # ✅ Prevent indefinite waiting
            )

            if response.status_code == 200:
                response_data = response.json()
                sql_query = response_data.get("sqlQuery")

                if not sql_query:
                    logger.error("❌ AI Response Error: No SQL query returned.")
                    return {"error": "AI did not return a SQL query."}

                # ✅ Validate SQL Query Before Returning It
                if not self.validator.validate_sql(sql_query, schema):
                    logger.warning("❌ Query validation failed.")
                    return {"error": "Generated query failed validation."}

                logger.info("✅ Query is valid and secure.")
                return {"sql_query": sql_query}

            logger.error(f"❌ API Call Failed | Status: {response.status_code} | Response: {response.text}")
            return {"error": "Failed to generate SQL query"}

        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Network error while contacting AI-Agent: {str(e)}")
            return {"error": "Network error"}
