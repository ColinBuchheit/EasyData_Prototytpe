# agents/intent_agent.py

from .base_agent import BaseAgent

class IntentAgent(BaseAgent):
    def __init__(self, name: str, client, model: str):
        super().__init__(name)
        self.client = client
        self.model = model

    def run(self, task: dict) -> dict:
        message = task["message"]

        prompt = f"""You are an intent classifier.
Classify this message into one of the following intents:
["query", "visualization", "schema", "context", "multi-db", "chat"]

User Message:
"{message}"

Respond ONLY with the label."""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0,
                max_tokens=10
            )
            intent = response.choices[0].message.content.strip().lower()
            return {"intent": intent}
        except Exception as e:
            return {"intent": "chat", "error": str(e)}
