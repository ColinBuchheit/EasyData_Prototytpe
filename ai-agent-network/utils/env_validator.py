import os
from typing import Dict, List, Optional, Set
import logging

logger = logging.getLogger("ai-agent-env")

class EnvValidator:
    """
    Utility to validate environment variables needed for the AI Agent Network.
    This helps ensure all required settings are present before starting the application.
    """
    
    @staticmethod
    def validate_required_env_vars(required_vars: List[str], warn_only: bool = False) -> bool:
        """
        Validate that all required environment variables are present.
        
        Args:
            required_vars: List of required environment variable names
            warn_only: If True, only log warnings for missing vars instead of raising errors
            
        Returns:
            Boolean indicating if all required variables are present
        """
        missing_vars = []
        
        for var_name in required_vars:
            if not os.getenv(var_name):
                missing_vars.append(var_name)
        
        if missing_vars:
            message = f"Missing required environment variables: {', '.join(missing_vars)}"
            if warn_only:
                logger.warning(f"⚠️ {message}")
                return False
            else:
                logger.error(f"❌ {message}")
                raise EnvironmentError(message)
        
        return True
    
    @staticmethod
    def validate_backend_connection_settings(warn_only: bool = False) -> bool:
        """
        Validate settings specifically related to backend connectivity.
        
        Args:
            warn_only: If True, only log warnings for missing vars instead of raising errors
            
        Returns:
            Boolean indicating if all required backend connection variables are present
        """
        required = [
            "BACKEND_API_URL",
            "BACKEND_SECRET",
            "BACKEND_SERVICE_ID",
            "AI_AGENT_ID",
            "AI_AGENT_VERSION"
        ]
        
        return EnvValidator.validate_required_env_vars(required, warn_only)
    
    @staticmethod
    def validate_ai_model_settings(warn_only: bool = False) -> bool:
        """
        Validate settings related to AI models and APIs.
        
        Args:
            warn_only: If True, only log warnings for missing vars instead of raising errors
            
        Returns:
            Boolean indicating if all required AI model variables are present
        """
        # Check if either OpenAI or Anthropic API keys are present
        if not os.getenv("OPENAI_API_KEY") and not os.getenv("ANTHROPIC_API_KEY"):
            message = "Either OPENAI_API_KEY or ANTHROPIC_API_KEY must be set"
            if warn_only:
                logger.warning(f"⚠️ {message}")
                return False
            else:
                logger.error(f"❌ {message}")
                raise EnvironmentError(message)
        
        # Check model settings
        models_to_check = {
            "QUERY_AGENT_MODEL": os.getenv("OPENAI_API_KEY"),
            "SCHEMA_ANALYSIS_MODEL": os.getenv("OPENAI_API_KEY") or os.getenv("ANTHROPIC_API_KEY"),
            "VALIDATION_MODEL": os.getenv("OPENAI_API_KEY") or os.getenv("ANTHROPIC_API_KEY"),
            "CHAT_MODEL": os.getenv("ANTHROPIC_API_KEY"),
            "CLAUDE_MODEL": os.getenv("ANTHROPIC_API_KEY")
        }
        
        missing_models = []
        
        for model_name, api_key in models_to_check.items():
            if not api_key:
                missing_models.append(f"{model_name} (missing corresponding API key)")
            elif not os.getenv(model_name):
                missing_models.append(model_name)
        
        if missing_models:
            message = f"Missing model settings: {', '.join(missing_models)}"
            if warn_only:
                logger.warning(f"⚠️ {message}")
                return False
            else:
                logger.error(f"❌ {message}")
                raise EnvironmentError(message)
                
        return True
    
    @staticmethod
    def validate_all_settings(warn_only: bool = True) -> Dict[str, bool]:
        """
        Run all validation checks and return results.
        
        Args:
            warn_only: If True, only log warnings for missing vars instead of raising errors
            
        Returns:
            Dictionary with validation results for each category
        """
        results = {
            "backend_connection": EnvValidator.validate_backend_connection_settings(warn_only),
            "ai_models": EnvValidator.validate_ai_model_settings(warn_only)
        }
        
        return results


# Example usage
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    
    # Validate all settings
    validation_results = EnvValidator.validate_all_settings(warn_only=True)
    
    # Print results
    for category, is_valid in validation_results.items():
        print(f"{category}: {'✅ Valid' if is_valid else '❌ Invalid'}")