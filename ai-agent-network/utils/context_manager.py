import redis
import json
import time
import logging
from typing import Dict, Any, Optional, List, Union

from utils.error_handling import StandardizedError, ErrorCategory, ErrorSeverity

# Configure logger
logger = logging.getLogger("ai-agent-context")

class ContextManager:
    """
    Unified context management for the AI Agent Network.
    Handles storage, retrieval, and manipulation of context data across components.
    """
    
    # Singleton instance
    _instance = None
    
    # Redis client
    _redis_client = None
    
    # Default expiry time (in seconds)
    DEFAULT_EXPIRY_TIME = 600  # 10 minutes
    
    def __new__(cls, redis_url: Optional[str] = None, expiry_time: Optional[int] = None):
        """Singleton pattern implementation"""
        if cls._instance is None:
            cls._instance = super(ContextManager, cls).__new__(cls)
            cls._instance._initialize(redis_url, expiry_time)
        return cls._instance
    
    def _initialize(self, redis_url: Optional[str], expiry_time: Optional[int]) -> None:
        """Initialize the context manager"""
        from utils.settings import REDIS_URL, REDIS_CONTEXT_EXPIRE_SECONDS
        
        # Set configuration
        self.redis_url = redis_url or REDIS_URL
        self.expiry_time = expiry_time or REDIS_CONTEXT_EXPIRE_SECONDS or self.DEFAULT_EXPIRY_TIME
        
        # In-memory cache for fallback
        self._memory_cache = {}
        
        # Try to connect to Redis
        try:
            self._redis_client = redis.Redis.from_url(
                self.redis_url, 
                decode_responses=True,
                socket_connect_timeout=5
            )
            # Test connection
            self._redis_client.ping()
            logger.info(f"✅ Connected to Redis at {self.redis_url}")
            self._use_redis = True
        except Exception as e:
            logger.warning(f"⚠️ Failed to connect to Redis: {e}. Using in-memory cache instead.")
            self._use_redis = False
    
    def get_context(self, user_id: str) -> Optional[Dict[str, Any]]:
        """
        Get context for a user.
        
        Args:
            user_id: User ID to get context for
            
        Returns:
            Context data or None if not found
        """
        key = f"user:{user_id}:context"
        
        try:
            if self._use_redis:
                # Try Redis first
                cached_data = self._redis_client.get(key)
                if cached_data:
                    return json.loads(cached_data)
            else:
                # Fall back to memory cache
                if key in self._memory_cache:
                    # Check if expired
                    cache_entry = self._memory_cache[key]
                    if time.time() < cache_entry.get("expiry", 0):
                        return cache_entry.get("data")
                    else:
                        # Remove expired entry
                        del self._memory_cache[key]
        except Exception as e:
            logger.warning(f"⚠️ Failed to get context from cache: {e}")
        
        return None
    
    def set_context(self, user_id: str, context: Dict[str, Any], expiry: Optional[int] = None) -> bool:
        """
        Set context for a user.
        
        Args:
            user_id: User ID to set context for
            context: Context data to store
            expiry: Optional custom expiry time (in seconds)
            
        Returns:
            True if successful, False otherwise
        """
        key = f"user:{user_id}:context"
        expiry_time = expiry or self.expiry_time
        
        try:
            # Add timestamp to context
            context_with_meta = context.copy()
            context_with_meta["_last_updated"] = time.time()
            
            # Store serialized data
            serialized = json.dumps(context_with_meta)
            
            if self._use_redis:
                # Store in Redis
                self._redis_client.setex(key, expiry_time, serialized)
            else:
                # Store in memory with expiry
                self._memory_cache[key] = {
                    "data": context_with_meta,
                    "expiry": time.time() + expiry_time
                }
            
            return True
        except Exception as e:
            logger.warning(f"⚠️ Failed to store context: {e}")
            return False
    
    def append_to_context(self, user_id: str, update_data: Dict[str, Any], expiry: Optional[int] = None) -> bool:
        """
        Update existing context for a user.
        
        Args:
            user_id: User ID to update context for
            update_data: New data to add to context
            expiry: Optional custom expiry time (in seconds)
            
        Returns:
            True if successful, False otherwise
        """
        # Get current context (or empty dict if none exists)
        current_context = self.get_context(user_id) or {}
        
        # Update context with new data
        current_context.update(update_data)
        
        # Store updated context
        return self.set_context(user_id, current_context, expiry)
    
    def clear_context(self, user_id: str) -> bool:
        """
        Clear context for a user.
        
        Args:
            user_id: User ID to clear context for
            
        Returns:
            True if successful, False otherwise
        """
        key = f"user:{user_id}:context"
        
        try:
            if self._use_redis:
                # Remove from Redis
                self._redis_client.delete(key)
            else:
                # Remove from memory cache if exists
                if key in self._memory_cache:
                    del self._memory_cache[key]
            
            return True
        except Exception as e:
            logger.warning(f"⚠️ Failed to clear context: {e}")
            return False
    
    def get_all_contexts(self) -> Dict[str, Dict[str, Any]]:
        """
        Get all context data (mainly for debugging).
        
        Returns:
            Dictionary of all context data by user ID
        """
        if not self._use_redis:
            # Return memory cache data
            return {
                k.split(":")[1]: v.get("data", {})
                for k, v in self._memory_cache.items()
                if k.startswith("user:") and k.endswith(":context")
            }
        
        # Get all keys from Redis
        try:
            keys = self._redis_client.keys("user:*:context")
            result = {}
            
            for key in keys:
                user_id = key.split(":")[1]
                data = self._redis_client.get(key)
                if data:
                    result[user_id] = json.loads(data)
            
            return result
        except Exception as e:
            logger.warning(f"⚠️ Failed to get all contexts: {e}")
            return {}
    
    def store_agent_result(self, user_id: str, agent_name: str, result: Dict[str, Any]) -> bool:
        """
        Store an agent's result in context.
        
        Args:
            user_id: User ID
            agent_name: Name of the agent
            result: Result data from the agent
            
        Returns:
            True if successful, False otherwise
        """
        # Create a standardized structure for agent results
        agent_data = {
            agent_name: {
                "result": result,
                "timestamp": time.time()
            }
        }
        
        return self.append_to_context(user_id, agent_data)
    
    def get_agent_result(self, user_id: str, agent_name: str) -> Optional[Dict[str, Any]]:
        """
        Get a specific agent's result from context.
        
        Args:
            user_id: User ID
            agent_name: Name of the agent
            
        Returns:
            Agent result data or None if not found
        """
        context = self.get_context(user_id)
        if not context or agent_name not in context:
            return None
        
        return context[agent_name].get("result")
    
    def is_connected(self) -> bool:
        """
        Check if Redis is connected.
        
        Returns:
            True if Redis is connected, False otherwise
        """
        if not self._use_redis:
            return False
        
        try:
            return self._redis_client.ping()
        except:
            return False


# Create a default instance
_context_manager = None

def get_context_manager() -> ContextManager:
    """
    Get the global context manager instance.
    
    Returns:
        ContextManager instance
    """
    global _context_manager
    if _context_manager is None:
        _context_manager = ContextManager()
    return _context_manager


# Convenience functions that mirror the old context_cache API for compatibility

def get_context(user_id: str) -> Optional[Dict[str, Any]]:
    """Get context for a user"""
    return get_context_manager().get_context(user_id)

def set_context(user_id: str, context: Dict[str, Any]) -> bool:
    """Set context for a user"""
    return get_context_manager().set_context(user_id, context)

def clear_context(user_id: str) -> bool:
    """Clear context for a user"""
    return get_context_manager().clear_context(user_id)

def append_to_context(user_id: str, update_data: Dict[str, Any]) -> bool:
    """Update existing context for a user"""
    return get_context_manager().append_to_context(user_id, update_data)