from services.schema_introspection import get_schema
import asyncpg
import os
import json
from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_USER = os.getenv("DB_USER", "easydata_admin")
DB_PASSWORD = os.getenv("DB_PASSWORD", "ColbolSeadog-1224")
DB_DATABASE = os.getenv("DB_DATABASE", "easydatabase")

async def execute_query(user_id: int, query: str):
    """
    Executes an AI-generated SQL query after verifying it matches the database schema.
    """
    print(f"🔍 AI-generated Query: {query}")

    schema = await get_schema(user_id)
    if not schema:
        raise Exception("❌ No schema available for validation.")

    # Validate the query against the schema
    is_valid = validate_query_against_schema(query, schema)
    if not is_valid:
        raise Exception("❌ AI-generated query is invalid. Schema mismatch detected.")

    # Connect and execute the query
    try:
        conn = await asyncpg.connect(
            host=DB_HOST, port=DB_PORT, user=DB_USER, password=DB_PASSWORD, database=DB_DATABASE
        )
        result = await conn.fetch(query)
        await conn.close()

        print("✅ Query executed successfully!")
        return result

    except Exception as e:
        print(f"❌ Query execution error: {e}")
        return None

def validate_query_against_schema(query: str, schema: dict):
    """
    Ensures the AI-generated SQL query references valid tables & columns.
    """
    for table in schema.keys():
        if table in query:
            print(f"✅ Valid table detected: {table}")
            return True
    print("❌ Query does not match known schema.")
    return False
