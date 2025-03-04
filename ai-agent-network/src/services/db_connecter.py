import psycopg2
import logging
from config.settings import ENV

# Secure Logging Setup
logger = logging.getLogger(__name__)

class DBConnector:
    """Handles database connections and query execution."""

    def __init__(self):
        """Initialize the database connection."""
        try:
            self.conn = psycopg2.connect(
                dbname=ENV.DB_NAME,
                user=ENV.DB_USER,
                password=ENV.DB_PASSWORD,
                host=ENV.DB_HOST,
                port=ENV.DB_PORT
            )
            self.cur = self.conn.cursor()
            logger.info("✅ Database connection established.")
        except Exception as e:
            logger.error(f"❌ Failed to connect to the database: {str(e)}")

    def execute_query(self, sql_query: str):
        """
        Executes a SQL query securely.

        Args:
            sql_query (str): The SQL query to execute.

        Returns:
            list: Query results.
        """
        try:
            self.cur.execute(sql_query)
            results = self.cur.fetchall()
            logger.info("✅ Query executed successfully.")
            return results
        except Exception as e:
            logger.error(f"❌ Query Execution Error: {str(e)}")
            return []

    def close_connection(self):
        """Closes the database connection."""
        self.cur.close()
        self.conn.close()
        logger.info("✅ Database connection closed.")
