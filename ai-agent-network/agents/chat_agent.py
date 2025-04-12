from agents.base_agent import BaseAgent
from typing import Dict, Any
import os
import requests
import json

from utils.settings import ANTHROPIC_API_KEY, CHAT_MODEL
from utils.logger import logger
from utils.token_usage_tracker import track_tokens
from utils.api_client import APIClient
from utils.error_handling import handle_agent_error, ErrorSeverity


class ChatAgent(BaseAgent):
    """
    Handles both technical explanations and general conversation.
    Uses Claude 3 Sonnet to summarize query results for business users or
    respond to general conversation messages like greetings.
    """

    def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            task = input_data.get("task", "")
            
            # Check if this is a general conversation
            if input_data.get("is_general_conversation", False):
                return self._handle_general_conversation(task)
            
            # Regular explanation flow for query results
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
            return handle_agent_error(self.name(), e, ErrorSeverity.MEDIUM)
            
    def _handle_general_conversation(self, task: str) -> Dict[str, Any]:
        """Handle general conversation not related to database queries"""
        task_lower = task.lower().strip()
        
        # Simple greeting responses
        greetings = ["hi", "hello", "hey", "greetings", "howdy", "what's up", "hi there"]
        if task_lower in greetings:
            return {
                "success": True,
                "type": "text",
                "agent": self.name(),
                "message": "Hello! I'm your AI database assistant. I can help you query your databases using natural language and visualize the results. What would you like to know about your data?"
            }
            
        # Help request or what can you do
        if any(phrase in task_lower for phrase in ["help", "what can you do", "how do you work"]):
            return {
                "success": True,
                "type": "text",
                "agent": self.name(),
                "message": """I can help you access information from your databases using natural language. For example, you can ask me things like:

- Show me the top 10 products by sales
- What are the most recent orders?
- How many users signed up last month?
- Find customers who spent over $1000 last quarter
- What's the average order value by category?

Just describe what you'd like to know, and I'll translate that into a database query for you, execute it, and explain the results."""
            }
            
        # Who are you / what are you
        if any(phrase in task_lower for phrase in ["who are you", "what are you"]):
            return {
                "success": True,
                "type": "text",
                "agent": self.name(),
                "message": "I'm an AI database assistant designed to help you interact with your databases using natural language. I can translate your questions into database queries, execute them, and explain the results in a way that's easy to understand. I can also create visualizations of your data to help you gain insights."
            }
            
        # Default general response
        return {
            "success": True,
            "type": "text",
            "agent": self.name(),
            "message": "I'm your database assistant. I can help you query your databases using natural language. What would you like to know about your data?"
        }

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
            return "The assistant was unable to summarize the output."