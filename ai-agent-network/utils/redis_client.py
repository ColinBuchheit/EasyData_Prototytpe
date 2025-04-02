# utils/redis_client.py

import redis
from utils.settings import REDIS_URL
from utils.logger import logger

# Initialize Redis client
try:
    redis_client = redis.Redis.from_url(
        REDIS_URL,
        decode_responses=True,  # Return strings instead of bytes
        socket_connect_timeout=5,  # Fail fast on connect issues
        health_check_interval=30  # Periodic health ping
    )

    # Test connection at startup
    redis_client.ping()
    logger.info(f"✅ Connected to Redis at {REDIS_URL}")

except Exception as e:
    logger.critical(f"❌ Redis connection failed: {e}")
    raise RuntimeError("Redis is not available. Please check REDIS_URL or Redis service.")

def get_redis_client() -> redis.Redis:
    """
    Returns the shared Redis client instance.
    """
    return redis_client
