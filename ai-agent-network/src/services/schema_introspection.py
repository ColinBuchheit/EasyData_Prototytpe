import asyncpg
import json
import os
import redis
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# PostgreSQL Connection (EasyData Database)
EASYDATA_DB_HOST = os.getenv("EASYDATA_DB_HOST", "localhost")
EASYDATA_DB_PORT = os.getenv("EASYDATA_DB_PORT", "5432")
EASYDATA_DB_USER = os.getenv("EASYDATA_DB_USER", "easydata_admin")
EASYDATA_DB_PASSWORD = os.getenv("EASYDATA_DB_PASSWORD", "ColbolSeadog-1224")
EASYDATA_DB_DATABASE = os.getenv("EASYDATA_DB_DATABASE", "easydata")

# Redis Connection
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
redis_client = redis.StrictRedis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)

async def store_schema_in_db(user_id: int, schema_mapping: dict):
    """
    Store schema mapping in the EasyData database.
    """
    try:
        conn = await asyncpg.connect(
            host=EASYDATA_DB_HOST, port=EASYDATA_DB_PORT,
            user=EASYDATA_DB_USER, password=EASYDATA_DB_PASSWORD,
            database=EASYDATA_DB_DATABASE
        )

        schema_json = json.dumps(schema_mapping)

        await conn.execute("""
            INSERT INTO user_schemas (user_id, schema_data)
            VALUES ($1, $2)
            ON CONFLICT (user_id) DO UPDATE SET schema_data = EXCLUDED.schema_data
        """, user_id, schema_json)

        await conn.close()
        print(f"✅ Schema successfully stored in EasyData DB for user {user_id}")
    except Exception as e:
        print(f"❌ Error storing schema in EasyData DB: {e}")

async def fetch_schema(user_id: int, user_db_config: dict):
    """
    Fetches the schema of a user's database and stores it in Redis & EasyData DB.
    """
    print(f"🔍 Fetching schema for user {user_id}...")

    try:
        conn = await asyncpg.connect(
            host=user_db_config["host"], port=user_db_config["port"],
            user=user_db_config["user"], password=user_db_config["password"],
            database=user_db_config["database"]
        )

        # Get all tables
        tables = await conn.fetch(
            """SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"""
        )

        schema_mapping = {}

        for table in tables:
            table_name = table["table_name"]
            # Get columns for each table
            columns = await conn.fetch(
                """SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1""",
                table_name,
            )
            schema_mapping[table_name] = [{"column_name": col["column_name"], "data_type": col["data_type"]} for col in columns]

        await conn.close()

        # Store schema in Redis for AI agents
        redis_key = f"schema:{user_id}"
        redis_client.set(redis_key, json.dumps(schema_mapping))

        # Store schema in EasyData database
        await store_schema_in_db(user_id, schema_mapping)

        print(f"✅ Schema stored for user {user_id}")
        return schema_mapping

    except Exception as e:
        print(f"❌ Error fetching schema: {str(e)}")
        return None

async def get_schema(user_id: int):
    """
    Retrieve schema from Redis. If missing, fetch from EasyData DB.
    """
    redis_key = f"schema:{user_id}"
    schema = redis_client.get(redis_key)
    
    if schema:
        print(f"📄 Retrieved schema for user {user_id} from Redis")
        return json.loads(schema)
    
    print(f"⚠️ No schema found in Redis for user {user_id}, fetching from EasyData DB...")

    try:
        conn = await asyncpg.connect(
            host=EASYDATA_DB_HOST, port=EASYDATA_DB_PORT,
            user=EASYDATA_DB_USER, password=EASYDATA_DB_PASSWORD,
            database=EASYDATA_DB_DATABASE
        )

        row = await conn.fetchrow("SELECT schema_data FROM user_schemas WHERE user_id = $1", user_id)
        await conn.close()

        if row:
            schema = json.loads(row["schema_data"])
            redis_client.set(redis_key, json.dumps(schema))  # Store back in Redis for future requests
            print(f"✅ Retrieved schema from EasyData DB for user {user_id}")
            return schema

    except Exception as e:
        print(f"❌ Error retrieving schema from EasyData DB: {e}")

    return None
