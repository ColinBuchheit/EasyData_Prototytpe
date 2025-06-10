from .base_agent import BaseAgent

class ValidationAgent(BaseAgent):
    def __init__(self, name: str):
        super().__init__(name)

    def run(self, task: dict) -> dict:
        query = task.get("query", "")
        banned_phrases = ["drop", "delete", "truncate", "--", ";--"]
        for phrase in banned_phrases:
            if phrase in query.lower():
                return {"success": False, "reason": f"Query contains unsafe keyword: {phrase}"}
        return {"success": True}
