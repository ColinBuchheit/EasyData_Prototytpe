# agents/chat_agent.py

from .base_agent import BaseAgent
import os

class ChatAgent(BaseAgent):
    def __init__(self, name: str, openai_client, model: str):
        super().__init__(name)
        self.client = openai_client
        self.model = model

    def run(self, task: dict) -> dict:
        user_message = task["message"]

        prompt = f"""You are a helpful conversational assistant in a database tool.
Respond to the user naturally if they are asking a general question or just chatting.

User: {user_message}
Assistant:"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=500,
                temperature=0.7
            )
            reply = response.choices[0].message.content.strip()
            return {"success": True, "reply": reply}
        except Exception as e:
            return {"success": False, "error": str(e)}
