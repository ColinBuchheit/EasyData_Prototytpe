from agents.base_agent import BaseAgent
from typing import Dict, Any
import openai
import json

from utils.settings import OPENAI_API_KEY, VALIDATION_MODEL
from utils.logger import logger
from utils.token_usage_tracker import track_tokens
from utils.error_handling import handle_agent_error, ErrorSeverity, create_ai_service_error

openai.api_key = OPENAI_API_KEY


class ValidationSecurityAgent(BaseAgent):
    """
    Ensures a generated query is safe, logical, and aligned with the user's task.
    Detects injection, destructive commands, or semantic mismatches.
    """

    def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            task = input_data.get("task", "")
            query = input_data.get("query", "")
            db_type = input_data.get("db_type", "postgres")

            if not query or not task:
                logger.warning("⚠️ Validation agent received empty task or query.")
                return handle_agent_error(
                    self.name(),
                    ValueError("Missing task or query."),
                    ErrorSeverity.MEDIUM
                )

            prompt = self._build_validation_prompt(task, query, db_type)
            logger.info("🔒 Validating query for logic and safety.")

            try:
                response = openai.ChatCompletion.create(
                    model=VALIDATION_MODEL,
                    messages=[
                        {
                            "role": "system",
                            "content": (
                                "You are a strict validation agent. "
                                "You must ONLY return a single JSON object in the format:\n"
                                '{ "valid": true|false, "reason": "brief explanation" }\n'
                                "Never include extra commentary or formatting."
                            )
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    temperature=0
                )

                usage = response["usage"]
                track_tokens("validation_security_agent", VALIDATION_MODEL,
                             usage["prompt_tokens"], usage["completion_tokens"])

                raw_output = response.choices[0].message.content.strip()

                try:
                    parsed = json.loads(raw_output)
                    is_valid = parsed.get("valid", False)
                    reason = parsed.get("reason", "No explanation provided.")
                except json.JSONDecodeError:
                    logger.warning("⚠️ Could not parse validation output as JSON.")
                    is_valid = False
                    reason = raw_output[:250]

                logger.info(f"✅ Validation result: {is_valid} | Reason: {reason}")

                return {
                    "success": True,
                    "valid": is_valid,
                    "reason": reason
                }

            except openai.error.OpenAIError as e:
                logger.error(f"❌ OpenAI API error during validation: {e}")
                return create_ai_service_error(
                    message=str(e),
                    service="openai",
                    model=VALIDATION_MODEL,
                    severity=ErrorSeverity.HIGH,
                    source=self.name(),
                    original_error=e
                ).to_dict()

        except Exception as e:
            logger.exception("❌ ValidationSecurityAgent failed.")
            return handle_agent_error(
                self.name(),
                e,
                ErrorSeverity.HIGH,
                suggestions=["Check query syntax", "Verify security policies"]
            )

    def _build_validation_prompt(self, task: str, query: str, db_type: str) -> str:
        return (
            f"Task: {task}\n"
            f"Query: {query}\n"
            f"Database Type: {db_type.upper()}\n\n"
            "Determine whether this query safely and correctly fulfills the task without risking SQL injection, "
            "destructive operations (like DROP or DELETE), or logical errors.\n\n"
            "ONLY reply with one of the following JSON formats:\n"
            '{ "valid": true, "reason": "Brief explanation why it is safe." }\n'
            '{ "valid": false, "reason": "Brief explanation why it is unsafe or incorrect." }'
        )
