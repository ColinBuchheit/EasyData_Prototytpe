from agents.base_agent import BaseAgent
from typing import Dict, Any
import os
import requests
import json

from utils.settings import ANTHROPIC_API_KEY, CHAT_MODEL
from utils.logger import logger
from utils.token_usage_tracker import track_tokens
from utils.api_client import APIClient
from utils.error_handling import handle_agent_error, ErrorSeverity, create_ai_service_error


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
                return handle_agent_error(
                    self.name(),
                    ValueError("Missing raw_output for explanation."),
                    ErrorSeverity.MEDIUM
                )

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
            return handle_agent_error(self.name(), e, ErrorSeverity.MEDIUM)

    def _ask_claude(self, prompt: str) -> str:
        """Call Claude API with improved error handling and retries"""
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
            # Use the APIClient utility for retries and timeouts
            response = APIClient.call_anthropic_api(
                endpoint="messages",
                payload=payload,
                api_key=ANTHROPIC_API_KEY,
                retries=3,
                timeout=30
            )

            # Claude doesn't return token usage yet — approximate:
            token_guess = len(prompt.split()) + 150
            track_tokens("chat_agent", CHAT_MODEL, token_guess // 2, token_guess // 2)

            content = response["content"][0]["text"]
            return content

        except Exception as e:
            logger.error(f"❌ Claude call failed in ChatAgent: {e}")
            return create_ai_service_error(
                message=f"Failed to communicate with Claude: {str(e)}",
                service="anthropic",
                model=CHAT_MODEL,
                severity=ErrorSeverity.MEDIUM,
                source=self.name(),
                original_error=e,
                suggestions=["Verify Anthropic API key", "Check API access"]
            ).to_dict().get("error", {}).get("message", "The assistant was unable to summarize the output.")