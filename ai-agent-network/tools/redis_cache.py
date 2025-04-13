# tools/redis_cache.py

import redis
import json
import os
from dotenv import load_dotenv

load_dotenv()

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_DB = int(os.getenv("REDIS_DB", 0))

client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=REDIS_DB)

def set_in_cache(key: str, value: dict, expire_seconds: int = 900) -> None:
    """
    Save data to Redis with optional TTL
    """
    client.set(key, json.dumps(value), ex=expire_seconds)

def get_from_cache(key: str) -> dict:
    """
    Retrieve data from Redis
    """
    val = client.get(key)
    if val:
        return json.loads(val)
    return None

def delete_from_cache(key: str) -> None:
    client.delete(key)

def exists_in_cache(key: str) -> bool:
    return client.exists(key) == 1
