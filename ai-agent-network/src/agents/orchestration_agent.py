from crewai import Crew
import logging
import time
from agents.query_agent import QueryAgent
from agents.schema_agent import SchemaAgent
from agents.validation_security_agent import ValidationSecurityAgent
from agents.analysis_vizualization_agent import AnalysisVisualizationAgent
from services.db_connecter import DBConnector

# Secure Logging Setup
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

class OrchestrationAgent:
    """
    The main AI-agent manager that handles database querying, validation, 
    schema introspection, and result analysis with enhanced security.
    """

    def __init__(self):
        """Initialize agents and prepare the AI-Agent network."""
        self.query_agent = QueryAgent()
        self.schema_agent = SchemaAgent()
        self.validation_agent = ValidationSecurityAgent()
        self.analysis_agent = AnalysisVisualizationAgent()
        self.db_connector = DBConnector()

        # ✅ Define the AI-Agent network (Crew)
        self.crew = Crew(
            agents=[
                self.query_agent,
                self.schema_agent,
                self.validation_agent,
                self.analysis_agent
            ],
            tasks=[]
        )

        # ✅ User rate limit tracking
        self.user_request_timestamps = {}

    def enforce_rate_limit(self, user_id: str, max_requests: int = 5, window_seconds: int = 60):
        """
        Enforces a rate limit on users to prevent API abuse.

        Args:
            user_id (str): The user's ID.
            max_requests (int): Maximum allowed requests per window.
            window_seconds (int): Time window in seconds.
        """
        current_time = time.time()
        if user_id not in self.user_request_timestamps:
            self.user_request_timestamps[user_id] = []

        self.user_request_timestamps[user_id] = [
            t for t in self.user_request_timestamps[user_id] if current_time - t < window_seconds
        ]

        if len(self.user_request_timestamps[user_id]) >= max_requests:
            logger.warning(f"❌ Rate limit exceeded for user {user_id}. Blocking request.")
            return False

        self.user_request_timestamps[user_id].append(current_time)
        return True

    def process_user_query(self, user_query: str, db_type: str, user_id: str, user_role: str):
        """
        Securely processes user queries through the AI-Agent network.

        Args:
            user_query (str): The natural language query from the user.
            db_type (str): The type of database (PostgreSQL, MySQL, etc.).
            user_id (str): The user ID for session tracking.
            user_role (str): The user's role (admin, analyst, etc.).

        Returns:
            dict: Processed response with query, validation, and insights.
        """
        logger.info(f"🔍 Processing query for User {user_id} | DB Type: {db_type}")

        # ✅ Enforce Rate Limiting
        if not self.enforce_rate_limit(user_id):
            return {"error": "❌ Rate limit exceeded. Please wait before making another request."}

        # ✅ Enforce Role-Based Access Control (RBAC)
        if user_role not in ["admin", "analyst"]:
            logger.warning(f"❌ Unauthorized query attempt by user {user_id}.")
            return {"error": "❌ Unauthorized access."}

        # ✅ Step 1: Retrieve Schema Metadata
        logger.info(f"🔍 Fetching schema for {db_type} (User: {user_id})")
        schema = self.schema_agent.get_schema(user_id, db_type, user_role)
        if not schema:
            return {"error": "❌ Failed to retrieve database schema."}

        logger.info("✅ Schema retrieved successfully.")

        # ✅ Step 2: Generate SQL Query
        query_response = self.query_agent.generate_sql(user_query, db_type, schema, user_role)
        if "error" in query_response:
            return query_response  # Return error message if query generation fails

        sql_query = query_response["sql_query"]

        # ✅ Step 3: Validate the SQL Query
        if not self.validation_agent.validate_sql(sql_query, schema):
            return {"error": "❌ SQL query validation failed."}

        logger.info("✅ Query is validated successfully.")

        # ✅ Step 4: Execute SQL Query
        try:
            query_results = self.db_connector.execute_query(sql_query)
            if not query_results:
                return {"error": "❌ Query execution returned no results."}

            logger.info("✅ Query executed successfully.")
        except Exception as e:
            logger.error(f"❌ Database execution error: {str(e)}")
            return {"error": "Database execution error."}

        # ✅ Step 5: Analyze & Visualize Data
        insights = self.analysis_agent.analyze_results(query_results)
        visualization_url = self.analysis_agent.generate_visualization(query_results)

        # ✅ Step 6: Store Query History for Future Enhancements
        self.log_query_history(user_id, sql_query, insights)

        return {
            "sql_query": sql_query,
            "analysis": insights,
            "visualization": visualization_url
        }

    def log_query_history(self, user_id: str, sql_query: str, analysis: str):
        """
        Logs user queries to improve AI query optimization over time.

        Args:
            user_id (str): The user's ID.
            sql_query (str): The executed SQL query.
            analysis (str): The AI-generated insights.
        """
        with open(f"user_query_logs/{user_id}.log", "a") as log_file:
            log_file.write(f"\nUser: {user_id}\nQuery: {sql_query}\nAnalysis: {analysis}\n---\n")

        logger.info(f"📜 Query logged for user {user_id}.")
