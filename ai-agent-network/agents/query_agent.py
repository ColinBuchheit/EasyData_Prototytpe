from .base_agent import BaseAgent
from tools import backend_bridge
import json

class QueryAgent(BaseAgent):
    def __init__(self, name: str, client, model: str):
        super().__init__(name)
        self.client = client
        self.model = model

    def run(self, task: dict) -> dict:
        user_id = task.get("user_id")
        db_info = task.get("db_info")
        schema = task.get("schema")
        message = task.get("message")
        query = task.get("query")

        if not user_id or not db_info or not message:
            return {"success": False, "error": "Missing user_id, db_info, or message."}

        # Step 1: Generate query if not present
        if not query:
            if not schema:
                return {"success": False, "error": "Missing schema to generate query."}

            db_type = db_info.get("db_type", "sql").lower()
            prompt = f"""
You are a SQL generation AI for a {db_type.upper()} database.
ONLY return raw SQL. Do NOT explain, format, or wrap in markdown.

User: {message}
Schema: {json.dumps(schema, indent=2)}
"""

            try:
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0,
                    max_tokens=300
                )
                sql = response.choices[0].message.content.strip()

                # Strip markdown/code blocks
                sql = sql.replace("```sql", "").replace("```", "").strip()

                task["query"] = sql
                print(f"[QueryAgent] Final SQL:\n{sql}")

            except Exception as e:
                return {"success": False, "error": f"Query generation failed: {str(e)}"}

        # Step 2: Execute the query
        try:
            result = backend_bridge.fetch_query_result(task["query"], db_info, user_id)
            result["query"] = task["query"]
            result["success"] = True
            result["agentsCalled"] = ["query_agent"]
            return result
        except Exception as e:
            return {"success": False, "error": f"Query execution failed: {str(e)}"}
