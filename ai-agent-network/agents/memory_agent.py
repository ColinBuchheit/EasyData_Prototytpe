from .base_agent import BaseAgent
from tools.redis_cache import get_from_cache

class MemoryAgent(BaseAgent):
    def __init__(self, name: str):
        super().__init__(name)

    def run(self, task: dict) -> dict:
        user_id = task["user_id"]
        key = f"chat:{user_id}:history"

        try:
            cached = get_from_cache(key)
            if not cached:
                return {"success": True, "history": "No prior messages found."}
            return {"success": True, "history": cached}
        except Exception as e:
            return {"success": False, "error": str(e)}
