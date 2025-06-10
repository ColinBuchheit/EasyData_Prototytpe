# agents/schema_agent.py

from .base_agent import BaseAgent
import json
from tools import backend_bridge

class SchemaAgent(BaseAgent):
    def __init__(self, name: str, anthropic_client, model: str):
        super().__init__(name)
        self.client = anthropic_client
        self.model = model
    
    def fetch_schema(self, task: dict) -> dict:
        user_id = task.get("user_id")
        db_info = task.get("db_info")

        print(f"[SchemaAgent] Fetching schema for user {user_id} and DB {db_info.get('id')}...")

        try:
            response = backend_bridge.fetch_schema_for_user_db(db_info, user_id)
            if response.get("success"):
                schema = response.get("schema")
                print(f"[SchemaAgent] Retrieved schema: {json.dumps(schema, indent=2)[:1000]}")  # truncated for safety
                return {"success": True, "schema": schema}
            else:
                print(f"[SchemaAgent] Failed to fetch schema: {response.get('error')}")
                return {"success": False, "error": response.get("error")}
        except Exception as e:
            print(f"[SchemaAgent] Exception while fetching schema: {str(e)}")
            return {"success": False, "error": str(e)}


    def run(self, task: dict) -> dict:
        schema = task.get("schema")
        if not schema:
            # Try to fetch schema if not provided directly
            schema_result = self.fetch_schema(task)
            if not schema_result.get("success"):
                return schema_result
            schema = schema_result.get("schema")

        prompt = f"""You are a schema analysis assistant. Analyze the following database schema and describe:


1. What this database contains
2. What kinds of business questions could be asked
3. Example questions the user might ask

SCHEMA:
{json.dumps(schema, indent=2)}
"""

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=1000,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )

            # Claude SDK may return differently depending on version
            if hasattr(response, "content"):
                reply = response.content[0].text
            else:
                reply = response.completion

            return {"success": True, "reply": reply}
        except Exception as e:
            return {"success": False, "error": str(e)}
