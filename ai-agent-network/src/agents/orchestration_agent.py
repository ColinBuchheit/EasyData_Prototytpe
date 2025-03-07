from crewai import Crew
import logging
import time
import redis  # ✅ Redis for query caching
import requests
import json
from agents.query_agent import QueryAgent
from agents.schema_agent import SchemaAgent
from agents.validation_security_agent import ValidationSecurityAgent
from agents.analysis_vizualization_agent import AnalysisVisualizationAgent
from services.db_connecter import DBConnector
from src.config.env import ENV

# Secure Logging Setup
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

# ✅ Redis Client for Caching
redis_client = redis.Redis(host=ENV.REDIS_HOST, port=ENV.REDIS_PORT, db=0)

class OrchestrationAgent:
    """Handles AI query execution, validation, schema retrieval, and analysis."""

    def __init__(self):
        self.query_agent = QueryAgent()
        self.schema_agent = SchemaAgent()
        self.validation_agent = ValidationSecurityAgent()
        self.analysis_agent = AnalysisVisualizationAgent()
        self.db_connector = DBConnector()

        self.crew = Crew(
            agents=[
                self.query_agent,
                self.schema_agent,
                self.validation_agent,
                self.analysis_agent
            ],
            tasks=[]
        )

    def enforce_rate_limit(self, user_id: str, max_requests: int = 5, window_seconds: int = 60):
        """Prevents API abuse with Redis-based rate limiting."""
        current_time = time.time()
        rate_key = f"rate_limit:{user_id}"
        request_timestamps = redis_client.lrange(rate_key, 0, -1)

        # ✅ Remove expired timestamps
        valid_requests = [float(t) for t in request_timestamps if current_time - float(t) < window_seconds]
        redis_client.delete(rate_key)

        for t in valid_requests:
            redis_client.rpush(rate_key, t)

        # ✅ Enforce Rate Limit
        if len(valid_requests) >= max_requests:
            logger.warning(f"❌ Rate limit exceeded for user {user_id}. Blocking request.")
            return False

        redis_client.rpush(rate_key, current_time)
        redis_client.expire(rate_key, window_seconds)
        return True

    def process_user_query(self, user_query: str, db_type: str, user_id: str, user_role: str):
        """Processes user queries through the AI-Agent network."""
        logger.info(f"🔍 Processing query for User {user_id} | DB Type: {db_type}")

        # ✅ Enforce Rate Limiting
        if not self.enforce_rate_limit(user_id):
            return {"error": "❌ Rate limit exceeded. Please wait before making another request."}

        cache_key = f"query_cache:{user_query}:{db_type}"
        cached_result = redis_client.get(cache_key)
        if cached_result:
            logger.info(f"⚡ Returning cached result for query: {user_query}")
            return json.loads(cached_result)

        schema = self.schema_agent.get_schema(user_id, db_type, user_role)
        if not schema:
            return {"error": "❌ Failed to retrieve database schema."}

        sql_query_response = self.query_agent.generate_sql(user_query, db_type, schema, user_role)
        if "error" in sql_query_response:
            return sql_query_response  # Return error message if query generation fails

        sql_query = sql_query_response["sql_query"]

        if not self.validation_agent.validate_sql(sql_query, schema):
            return {"error": "❌ SQL query validation failed."}

        logger.info("✅ Query is validated successfully.")

        for attempt in range(3):  # ✅ Retry Only on Transient Errors
            try:
                query_results = self.db_connector.execute_query(sql_query)
                if query_results:
                    break
            except (ConnectionError, TimeoutError) as e:
                logger.warning(f"⚠️ Transient error, retrying ({attempt + 1}/3): {str(e)}")
            except Exception as e:
                logger.error(f"❌ Permanent query error: {str(e)}")
                return {"error": "❌ Database execution failed."}
        else:
            return {"error": "❌ Database execution failed after 3 attempts."}

        insights = self.analysis_agent.analyze_results(query_results)
        visualization_url = self.analysis_agent.generate_visualization(query_results)

        redis_client.setex(cache_key, 3600, json.dumps({
            "sql_query": sql_query,
            "analysis": insights,
            "visualization": visualization_url
        }))
        self.log_query_to_backend(user_id, sql_query, insights)

        return {"sql_query": sql_query, "analysis": insights, "visualization": visualization_url}

    def log_query_to_backend(self, user_id: str, sql_query: str, analysis: str):
        """Sends query logs to the backend."""
        try:
            response = requests.post(f"{ENV.BACKEND_URL}/log-query", json={
                "user_id": user_id,
                "sql_query": sql_query,
                "analysis": analysis
            })
            if response.status_code == 200:
                logger.info(f"✅ Query logged successfully for user {user_id}.")
            else:
                logger.warning(f"⚠️ Failed to log query for user {user_id}. Response: {response.status_code}")
        except Exception as e:
            logger.error(f"❌ Error logging query to backend: {str(e)}")
