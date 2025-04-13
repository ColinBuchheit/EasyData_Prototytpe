# utils/redis_client.py

import redis
import json
from typing import Any, Dict, Optional, Union
from utils.settings import REDIS_URL, REDIS_PASSWORD, CACHE_TTL
from utils.logger import logger

# Redis client singleton
_redis_client = None

def get_redis_client() -> redis.Redis:
    """
    Get or initialize Redis client as a singleton.
    
    Returns:
        Redis connection client
    """
    global _redis_client
    if _redis_client is None:
        try:
            # Create Redis connection
            if REDIS_PASSWORD:
                _redis_client = redis.Redis.from_url(
                    REDIS_URL, 
                    password=REDIS_PASSWORD,
                    decode_responses=True,
                    socket_timeout=5.0,
                    socket_connect_timeout=5.0
                )
            else:
                _redis_client = redis.Redis.from_url(
                    REDIS_URL,
                    decode_responses=True,
                    socket_timeout=5.0,
                    socket_connect_timeout=5.0
                )
            
            # Test connection
            _redis_client.ping()
            logger.info("✅ Redis connection established")
        except Exception as e:
            logger.error(f"❌ Redis connection error: {e}")
            # Re-raise the exception
            raise
    
    return _redis_client


def cache_set(key: str, value: Any, ttl: int = CACHE_TTL) -> bool:
    """
    Store value in Redis cache with expiration.
    
    Args:
        key: Cache key
        value: Value to cache (will be JSON serialized)
        ttl: Time-to-live in seconds
        
    Returns:
        Boolean indicating success
    """
    try:
        client = get_redis_client()
        serialized = json.dumps(value)
        client.set(key, serialized, ex=ttl)
        return True
    except Exception as e:
        logger.warning(f"⚠️ Redis cache set failed: {e}")
        return False


def cache_get(key: str) -> Optional[Any]:
    """
    Retrieve a value from Redis cache.
    
    Args:
        key: Cache key
        
    Returns:
        Deserialized value or None if not found/expired
    """
    try:
        client = get_redis_client()
        result = client.get(key)
        
        if result is None:
            return None
            
        return json.loads(result)
    except Exception as e:
        logger.warning(f"⚠️ Redis cache get failed: {e}")
        return None


def cache_key_prefix(user_id: str, category: str) -> str:
    """
    Generate a consistent cache key prefix based on user and category.
    
    Args:
        user_id: User identifier 
        category: Category of cached data (e.g., 'schema', 'query', etc)
        
    Returns:
        Cache key prefix string
    """
    return f"ai:agent:{user_id}:{category}:"


def cache_query_result(user_id: str, query_hash: str, result: Dict[str, Any], ttl: int = CACHE_TTL) -> bool:
    """
    Cache a query result.
    
    Args:
        user_id: User identifier
        query_hash: Hash of the query to use as cache key
        result: Query result to cache
        ttl: Time-to-live in seconds
        
    Returns:
        Boolean indicating success
    """
    key = cache_key_prefix(user_id, "query") + query_hash
    return cache_set(key, result, ttl)


def get_cached_query_result(user_id: str, query_hash: str) -> Optional[Dict[str, Any]]:
    """
    Get a cached query result.
    
    Args:
        user_id: User identifier
        query_hash: Hash of the query used as cache key
        
    Returns:
        Cached result or None if not found/expired
    """
    key = cache_key_prefix(user_id, "query") + query_hash
    return cache_get(key)


def cache_schema(user_id: str, db_id: Union[str, int], schema: Dict[str, Any], ttl: int = CACHE_TTL * 24) -> bool:
    """
    Cache a database schema (longer TTL since schemas change less frequently).
    
    Args:
        user_id: User identifier
        db_id: Database identifier
        schema: Schema data to cache
        ttl: Time-to-live in seconds (defaults to 24 times the regular TTL)
        
    Returns:
        Boolean indicating success
    """
    key = cache_key_prefix(user_id, "schema") + str(db_id)
    return cache_set(key, schema, ttl)


def get_cached_schema(user_id: str, db_id: Union[str, int]) -> Optional[Dict[str, Any]]:
    """
    Get a cached database schema.
    
    Args:
        user_id: User identifier
        db_id: Database identifier
        
    Returns:
        Cached schema or None if not found/expired
    """
    key = cache_key_prefix(user_id, "schema") + str(db_id)
    return cache_get(key)


def invalidate_cache(user_id: str, category: str = None) -> int:
    """
    Invalidate cache for a specific user and category.
    
    Args:
        user_id: User identifier
        category: Optional category to restrict deletion
        
    Returns:
        Number of keys deleted
    """
    try:
        client = get_redis_client()
        
        # Create pattern based on whether category is provided
        pattern = f"ai:agent:{user_id}:"
        if category:
            pattern += f"{category}:*"
        else:
            pattern += "*"
            
        # Get matching keys
        keys = client.keys(pattern)
        
        if not keys:
            return 0
            
        # Delete the keys
        deleted = client.delete(*keys)
        logger.info(f"Invalidated {deleted} cache entries for user {user_id}")
        return deleted
    except Exception as e:
        logger.warning(f"⚠️ Cache invalidation failed: {e}")
        return 0


def hash_query(query: str) -> str:
    """
    Create a hash from a query string for use as a cache key.
    
    Args:
        query: The query string to hash
        
    Returns:
        SHA256 hash of the query
    """
    import hashlib
    # Normalize the query by removing extra whitespace
    normalized = " ".join(query.lower().split())
    # Create hash
    return hashlib.sha256(normalized.encode()).hexdigest()