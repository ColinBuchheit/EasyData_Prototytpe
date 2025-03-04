import requests
import logging
from config.settings import ENV
from services.chat_logger import ChatLogger

# Secure Logging Setup
logger = logging.getLogger(__name__)

class AIService:
    """Handles AI-driven query generation and response processing."""

    def __init__(self, model=None):
        """Initialize AI Service with LLM model selection."""
        self.model = model if model else ENV.DEFAULT_LLM_MODEL
        self.api_key = ENV.AI_API_KEY
        self.api_url = ENV.AI_AGENT_API
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        self.chat_logger = ChatLogger()  # ✅ Enables conversation storage

    def process_query(self, user_id: str, user_query: str, db_schema: dict):
        """
        Processes a user's natural language query and generates an SQL statement.

        Args:
            user_id (str): The user ID associated with the session.
            user_query (str): The natural language query from the user.
            db_schema (dict): The database schema for query generation.

        Returns:
            dict: AI-generated SQL query and AI response.
        """
        logger.info(f"🔍 Processing AI Query: {user_query} (User: {user_id})")

        payload = {
            "model": self.model,
            "query": user_query,
            "schema": db_schema
        }

        try:
            response = requests.post(f"{self.api_url}/generate-sql", json=payload, headers=self.headers, timeout=10)

            if response.status_code == 200:
                response_data = response.json()
                sql_query = response_data.get("sql_query")
                ai_response = response_data.get("ai_response", "No response available.")

                # ✅ Store the conversation in the backend for long-term AI memory
                self.chat_logger.log_conversation(user_id, user_query, ai_response)

                return {"sql_query": sql_query, "ai_response": ai_response}

            logger.error(f"❌ AI API Error: {response.status_code} - {response.text}")
            return {"error": "Failed to generate SQL query."}

        except requests.exceptions.RequestException as e:
            logger.error(f"❌ AI Connection Failed: {str(e)}")
            return {"error": "AI service unavailable."}
