from crewai import Agent
import requests
import logging
import json
import time
from config.settings import BACKEND_API_URL, AI_API_KEY, AUTH_HEADERS
from agents.validation_security_agent import ValidationSecurityAgent
from agents.schema_agent import SchemaAgent

logger = logging.getLogger(__name__)

class QueryAgent(Agent):
    """Generates and validates secure queries for both SQL and NoSQL databases."""

    def __init__(self):
        """Initialize Query Agent with security mechanisms and schema management."""
        self.name = "Query Agent"
        self.role = "Secure Query Generator"
        self.validator = ValidationSecurityAgent()
        self.schema_agent = SchemaAgent()

        # ✅ Define supported database types
        self.relational_dbs = {"postgres", "mysql", "mssql", "sqlite"}
        self.nosql_dbs = {"mongodb", "firebase", "dynamodb", "couchdb"}

    def generate_query(self, user_query: str, db_type: str, user_id: int, user_role: str) -> dict:
        """
        Generates and validates a query for both SQL and NoSQL databases.

        Args:
            user_query (str): The natural language query from the user.
            db_type (str): The database type (PostgreSQL, MongoDB, etc.).
            user_id (int): The user's ID.
            user_role (str): The user's role (admin, analyst, etc.).

        Returns:
            dict: Validated query or an error message.
        """
        if user_role not in ["admin", "analyst"]:
            logger.warning(f"❌ Unauthorized query request by user {user_role}")
            return {"error": "Unauthorized request"}

        logger.info(f"🔍 Retrieving schema for User {user_id}, DB Type: {db_type}")
        schema = self.schema_agent.get_schema(user_id, db_type, user_role)

        if "error" in schema:
            return {"error": "❌ Schema retrieval failed. Cannot generate query."}

        logger.info(f"🔍 Generating secure query for {db_type}: {user_query}")

        payload = {
            "userQuery": user_query,
            "dbType": db_type,
            "schema": schema
        }

        try:
            if db_type in self.relational_dbs:
                response = self._generate_sql_query(payload)
            elif db_type in self.nosql_dbs:
                response = self._generate_nosql_query(payload)
            else:
                logger.error(f"❌ Unsupported database type: {db_type}")
                return {"error": f"Unsupported database type: {db_type}"}

            if "error" in response:
                return response  # Return error if query generation failed

            return response  # ✅ Return the successfully generated query

        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Network error while contacting AI-Agent: {str(e)}")
            return {"error": "Network error"}

    def _generate_sql_query(self, payload: dict) -> dict:
        """Handles SQL-based query generation and validation with retry logic."""
        max_retries = 3
        backoff_factor = 2  # Exponential backoff

        for attempt in range(max_retries):
            try:
                response = requests.post(
                    f"{BACKEND_API_URL}/generate-secure-sql",
                    json=payload,
                    headers={**AUTH_HEADERS, "api_key": AI_API_KEY},
                    timeout=10
                )

                if response.status_code == 200:
                    response_data = response.json()
                    sql_query = response_data.get("sqlQuery")

                    if not sql_query:
                        logger.error("❌ AI Response Error: No SQL query returned.")
                        return {"error": "AI did not return a SQL query."}

                    # ✅ Validate SQL Query Before Returning It
                    if not self.validator.validate_sql(sql_query, payload["schema"]):
                        logger.warning("❌ Query validation failed.")
                        return {"error": "Generated SQL query failed validation."}

                    logger.info("✅ SQL query is valid and secure.")
                    return {"query": sql_query}

                logger.error(f"❌ API Call Failed | Status: {response.status_code} | Response: {response.text}")
                return {"error": "Failed to generate SQL query"}

            except requests.exceptions.RequestException as e:
                logger.warning(f"⚠️ Retry {attempt + 1}/{max_retries}: Network error contacting AI-Agent: {str(e)}")
                time.sleep(backoff_factor ** attempt)

        logger.error("❌ SQL query generation failed after multiple retries.")
        return {"error": "Network error after multiple retries"}

    def _generate_nosql_query(self, payload: dict) -> dict:
        """Handles NoSQL-based query generation (e.g., MongoDB, Firebase) with retry logic."""
        max_retries = 3
        backoff_factor = 2  # Exponential backoff

        for attempt in range(max_retries):
            try:
                response = requests.post(
                    f"{BACKEND_API_URL}/generate-secure-nosql",
                    json=payload,
                    headers={**AUTH_HEADERS, "api_key": AI_API_KEY},
                    timeout=10
                )

                if response.status_code == 200:
                    response_data = response.json()
                    nosql_query = response_data.get("nosqlQuery")

                    if not nosql_query:
                        logger.error("❌ AI Response Error: No NoSQL query returned.")
                        return {"error": "AI did not return a NoSQL query."}

                    # ✅ Validate NoSQL Query Before Returning It
                    if not self.validator.validate_nosql(nosql_query, payload["schema"]):
                        logger.warning("❌ NoSQL query validation failed.")
                        return {"error": "Generated NoSQL query failed validation."}

                    logger.info("✅ NoSQL query is valid and secure.")
                    return {"query": nosql_query}

                logger.error(f"❌ API Call Failed | Status: {response.status_code} | Response: {response.text}")
                return {"error": "Failed to generate NoSQL query"}

            except requests.exceptions.RequestException as e:
                logger.warning(f"⚠️ Retry {attempt + 1}/{max_retries}: Network error contacting AI-Agent: {str(e)}")
                time.sleep(backoff_factor ** attempt)

        logger.error("❌ NoSQL query generation failed after multiple retries.")
        return {"error": "Network error after multiple retries"}
