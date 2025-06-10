# ✅ Correct version
class BaseAgent:
    def __init__(self, name: str):
        self.name = name

    def run(self, task: dict) -> dict:
        raise NotImplementedError("Each agent must implement the `run()` method.")
