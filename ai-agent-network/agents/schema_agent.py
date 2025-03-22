from agents.base_agent import BaseAgent
from db_adapters.db_adapter_router import UserDatabase, BaseDBAdapter
from typing import Dict, Any, List
from utils.logger import logger


class SchemaAgent(BaseAgent):
    """
    Fetches and formats the table + column metadata from the connected user DB.
    Prepares a clean schema object used by other agents (query, validation, etc).
    """

    def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            db: UserDatabase = input_data["db"]
            adapter: BaseDBAdapter = input_data["adapter"]

            logger.info(f"🔍 SchemaAgent fetching tables for user DB: {db.db_type}")

            tables = adapter.fetch_tables(db)
            if not tables:
                logger.warning("⚠️ No tables found in user DB.")
                return {"success": False, "error": "No tables found in database."}

            schema = {}
            for table in tables:
                try:
                    raw_columns = adapter.fetch_schema(db, table)
                    parsed_columns = self._parse_columns(raw_columns, db.db_type)
                    schema[table] = parsed_columns
                except Exception as table_error:
                    logger.warning(f"⚠️ Failed to fetch schema for table {table}: {table_error}")
                    schema[table] = []

            logger.info(f"✅ SchemaAgent completed. Tables: {tables}")

            return {
                "success": True,
                "schema": {
                    "tables": tables,
                    "columns": schema,
                    "db_type": db.db_type
                }
            }

        except Exception as e:
            logger.exception("❌ SchemaAgent encountered a fatal error.")
            return {"success": False, "error": str(e)}

    def _parse_columns(self, raw: Any, db_type: str) -> List[Dict[str, str]]:
        parsed = []

        if not raw:
            return []

        try:
            if isinstance(raw, list) and isinstance(raw[0], (tuple, list)):
                # SQL-like
                for col in raw:
                    name, dtype = col[0], col[1]
                    parsed.append({"name": name, "type": dtype})

            elif db_type == "sqlite":
                # PRAGMA table_info format
                for col in raw:
                    parsed.append({"name": col[1], "type": col[2]})

            elif isinstance(raw[0], dict):
                # NoSQL / JSON-based schema
                for col in raw:
                    parsed.append({
                        "name": col.get("column_name") or col.get("name"),
                        "type": col.get("data_type") or "unknown"
                    })

            else:
                parsed = [{"name": str(c), "type": "unknown"} for c in raw]

        except Exception as e:
            logger.warning(f"⚠️ Failed to parse columns: {e}")
            parsed = [{"name": "unknown", "type": "unknown"}]

        return parsed
