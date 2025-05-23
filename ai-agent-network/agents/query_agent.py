from agents.base_agent import BaseAgent
from typing import Dict, Any
import openai
import os
import json

from utils.settings import OPENAI_API_KEY, QUERY_AGENT_MODEL
from utils.logger import logger
from utils.token_usage_tracker import track_tokens
from utils.error_handling import handle_agent_error, ErrorSeverity, create_ai_service_error

openai.api_key = OPENAI_API_KEY


class QueryAgent(BaseAgent):
    """
    Translates user intent into an SQL/NoSQL query using GPT.
    Leverages schema + DB type to create accurate, runnable queries.
    """

    def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            task = input_data.get("task", "")
            schema = input_data.get("schema", {})
            db_type = input_data.get("db_type", "postgres")

            if not task or not schema:
                logger.warning("⚠️ QueryAgent missing task or schema input.")
                return handle_agent_error(
                    self.name(),
                    ValueError("Missing task or schema input."),
                    ErrorSeverity.MEDIUM
                )

            logger.info(f"🧠 QueryAgent building query for DB: {db_type}")

            prompt = self._build_prompt(task, schema, db_type)

            try:
                response = openai.ChatCompletion.create(
                    model=QUERY_AGENT_MODEL,
                    messages=[
                        {
                            "role": "system",
                            "content": f"You are a highly accurate database assistant. Generate only {db_type.upper()} queries."
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    temperature=0.2
                )

                usage = response["usage"]
                track_tokens("query_agent", QUERY_AGENT_MODEL,
                            usage["prompt_tokens"], usage["completion_tokens"])

                query = response.choices[0].message.content.strip()

                if not query.lower().startswith("select") and "{" not in query:
                    logger.warning("⚠️ GPT did not return a recognizable query.")
                    return handle_agent_error(
                        self.name(),
                        ValueError("GPT returned unrecognizable query."),
                        ErrorSeverity.MEDIUM
                    )

                logger.info(f"✅ QueryAgent generated query: {query[:100]}...")

                return {
                    "success": True,
                    "query": query
                }
            except openai.error.OpenAIError as e:
                # Specific handling for OpenAI API errors
                logger.error(f"❌ OpenAI API error: {e}")
                return create_ai_service_error(
                    message=str(e),
                    service="openai",
                    model=QUERY_AGENT_MODEL,
                    severity=ErrorSeverity.HIGH,
                    source=self.name(),
                    original_error=e
                ).to_dict()

        except Exception as e:
            logger.exception("❌ QueryAgent encountered an error.")
            return handle_agent_error(self.name(), e, ErrorSeverity.MEDIUM)

    def _build_prompt(self, task: str, schema: Dict[str, Any], db_type: str) -> str:
        tables = schema.get("tables", [])
        columns = schema.get("columns", {})

        try:
            schema_summary = "\n".join(
                f"{table}:\n" + "\n".join([f"  - {col['name']} ({col['type']})" for col in cols])
                for table, cols in columns.items()
            )
        except Exception as e:
            logger.error(f"❌ Failed to parse schema columns: {e}")
            schema_summary = "[schema unavailable]"

        return (
            f"Task: {task}\n\n"
            f"Database Type: {db_type.upper()}\n"
            f"Tables: {', '.join(tables)}\n\n"
            f"Schema:\n{schema_summary}\n\n"
            f"Generate a single {db_type.upper()} query that answers the task. "
            f"Return only the query and nothing else."
        )