from agents.base_agent import BaseAgent
from typing import Dict, Any
import openai

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
                        {"role": "system", "content": "You are a security and logic validator for database queries."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.1
                )

                usage = response["usage"]
                track_tokens("validation_security_agent", VALIDATION_MODEL,
                            usage["prompt_tokens"], usage["completion_tokens"])

                answer = response.choices[0].message.content.strip().lower()

                # Safe parsing
                is_valid = '"valid": true' in answer or '"valid":true' in answer or '"valid": "true"' in answer

                logger.info(f"✅ Validation result: {is_valid} | Reason: {answer[:120]}")

                return {
                    "success": True,
                    "valid": is_valid,
                    "reason": answer
                }
                
            except openai.error.OpenAIError as e:
                # Specific handling for OpenAI API errors
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
                ErrorSeverity.HIGH,  # Using HIGH because this is a security-critical component
                suggestions=["Check query syntax", "Verify security policies"]
            )

    def _build_validation_prompt(self, task: str, query: str, db_type: str) -> str:
        return (
            f"Task:\n{task}\n\n"
            f"Generated {db_type.upper()} query:\n{query}\n\n"
            "Does this query safely and correctly fulfill the user's task?\n"
            "- Avoids dangerous operations like DELETE, DROP, UPDATE\n"
            "- Is aligned with the task's intent\n"
            "- Is semantically valid and uses appropriate fields\n\n"
            "Reply ONLY in this JSON format:\n"
            '{ "valid": true, "reason": "Query matches the task and is safe." }'
        )