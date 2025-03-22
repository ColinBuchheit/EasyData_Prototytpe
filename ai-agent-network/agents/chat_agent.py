from agents.base_agent import BaseAgent
from typing import Dict, Any
import os
import requests
import json

from utils.settings import ANTHROPIC_API_KEY, CHAT_MODEL
from utils.logger import logger
from utils.token_usage_tracker import track_tokens


class ChatAgent(BaseAgent):
    """
    Converts technical output into human-friendly language.
    Uses Claude 3 Sonnet to summarize query results for business users.
    """

    def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            task = input_data.get("task", "")
            raw_output = input_data.get("query_result") or input_data.get("raw_output")
            tone = input_data.get("tone", "friendly")

            if not raw_output:
                logger.warning("⚠️ ChatAgent missing raw_output or query_result")
                return {"success": False, "error": "Missing raw_output for explanation."}

            logger.info(f"💬 ChatAgent summarizing task in tone: {tone}")

            prompt = f"""
Task:
{task}

Output to explain:
{raw_output}

Explain this output to a business user in a {tone} tone. Use plain language. Do not include any charts or code.
"""

            reply = self._ask_claude(prompt)

            return {
                "success": True,
                "type": "text",
                "agent": self.name(),
                "message": reply.strip()
            }

        except Exception as e:
            logger.exception("❌ ChatAgent failed to run.")
            return {"success": False, "error": str(e)}

    def _ask_claude(self, prompt: str) -> str:
        headers = {
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }

        payload = {
            "model": CHAT_MODEL,
            "max_tokens": 512,
            "temperature": 0.5,
            "system": "You are a helpful assistant that explains technical outputs to business users.",
            "messages": [
                {"role": "user", "content": prompt}
            ]
        }

        try:
            response = requests.post("https://api.anthropic.com/v1/messages", headers=headers, json=payload)
            response.raise_for_status()

            # Claude doesn't return token usage yet — approximate:
            token_guess = len(prompt.split()) + 150
            track_tokens("chat_agent", CHAT_MODEL, token_guess // 2, token_guess // 2)

            content = response.json()["content"][0]["text"]
            return content

        except Exception as e:
            logger.error(f"❌ Claude call failed in ChatAgent: {e}")
            return "The assistant was unable to summarize the output."
