import psycopg2
import logging
from config.settings import ENV

# Secure Logging Setup
logger = logging.getLogger(__name__)

class ChatLogger:
    """Handles conversation logging for AI memory and user sessions."""

    def __init__(self):
        """Initialize database connection."""
        try:
            self.conn = psycopg2.connect(
                dbname=ENV.DB_NAME,
                user=ENV.DB_USER,
                password=ENV.DB_PASSWORD,
                host=ENV.DB_HOST,
                port=ENV.DB_PORT
            )
            self.cur = self.conn.cursor()
            self.create_table()
        except Exception as e:
            logger.error(f"❌ Failed to connect to chat history database: {str(e)}")

    def create_table(self):
        """Creates the chat history table if it does not exist."""
        query = """
        CREATE TABLE IF NOT EXISTS chat_history (
            id SERIAL PRIMARY KEY,
            user_id VARCHAR(255),
            user_query TEXT,
            ai_response TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
        self.cur.execute(query)
        self.conn.commit()

    def log_conversation(self, user_id: str, user_query: str, ai_response: str):
        """
        Stores a user conversation in the database.

        Args:
            user_id (str): The user ID.
            user_query (str): The natural language input.
            ai_response (str): The AI's generated response.
        """
        query = """
        INSERT INTO chat_history (user_id, user_query, ai_response)
        VALUES (%s, %s, %s);
        """
        try:
            self.cur.execute(query, (user_id, user_query, ai_response))
            self.conn.commit()
            logger.info(f"✅ Conversation logged for user {user_id}")
        except Exception as e:
            logger.error(f"❌ Failed to log conversation: {str(e)}")

    def get_chat_history(self, user_id: str):
        """
        Retrieves the chat history for a specific user.

        Args:
            user_id (str): The user ID.

        Returns:
            list: A list of past chat records.
        """
        query = "SELECT user_query, ai_response, timestamp FROM chat_history WHERE user_id = %s ORDER BY timestamp DESC LIMIT 10;"
        try:
            self.cur.execute(query, (user_id,))
            return self.cur.fetchall()
        except Exception as e:
            logger.error(f"❌ Failed to fetch chat history: {str(e)}")
            return []
