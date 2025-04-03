import time
import logging
import requests
import openai
from typing import Dict, Any, Optional, Callable

from utils.error_handling import create_ai_service_error, ErrorSeverity, retry_on_failure

logger = logging.getLogger("ai-agent-api")

class APIClient:
    """Utility for making API calls with retries and timeouts"""
    
    @staticmethod
    def call_openai_api(
        func: Callable,
        *args,
        retries: int = 3,
        timeout: int = 30,
        backoff_factor: float = 1.5,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Call OpenAI API with retries and timeouts
        
        Args:
            func: OpenAI API function to call
            *args: Args to pass to the function
            retries: Number of retries on failure
            timeout: Timeout in seconds
            backoff_factor: Factor to increase backoff time between retries
            **kwargs: Kwargs to pass to the function
            
        Returns:
            API response
        """
        # Add timeout to kwargs
        if 'timeout' not in kwargs:
            kwargs['timeout'] = timeout
            
        # Define the function to retry
        def _call_api():
            try:
                return func(*args, **kwargs)
            except openai.error.Timeout as e:
                logger.warning(f"OpenAI API timeout: {e}")
                raise create_ai_service_error(
                    f"API call timed out after {timeout}s",
                    service="openai",
                    model=kwargs.get("model", "unknown"),
                    severity=ErrorSeverity.MEDIUM,
                    original_error=e
                )
            except openai.error.APIError as e:
                logger.error(f"OpenAI API error: {e}")
                raise create_ai_service_error(
                    f"API error: {str(e)}",
                    service="openai",
                    model=kwargs.get("model", "unknown"),
                    severity=ErrorSeverity.HIGH,
                    original_error=e
                )
            except openai.error.RateLimitError as e:
                logger.error(f"OpenAI rate limit error: {e}")
                raise create_ai_service_error(
                    "Rate limit exceeded",
                    service="openai",
                    model=kwargs.get("model", "unknown"),
                    severity=ErrorSeverity.HIGH,
                    suggestions=["Reduce API call frequency", "Implement rate limiting queue"],
                    original_error=e
                )
            except Exception as e:
                logger.exception(f"Unexpected error calling OpenAI API: {e}")
                raise create_ai_service_error(
                    f"Unexpected error: {str(e)}",
                    service="openai",
                    model=kwargs.get("model", "unknown"),
                    severity=ErrorSeverity.HIGH,
                    original_error=e
                )
        
        # Attempt the API call with retries
        for attempt in range(1, retries + 1):
            try:
                return _call_api()
            except Exception as e:
                if attempt == retries:
                    raise e
                
                # Calculate backoff time
                backoff_time = backoff_factor * (2 ** (attempt - 1))
                logger.warning(f"Retrying OpenAI API call in {backoff_time:.2f}s (attempt {attempt}/{retries})")
                time.sleep(backoff_time)
    
    @staticmethod
    def call_anthropic_api(
        endpoint: str,
        payload: Dict[str, Any],
        api_key: str,
        retries: int = 3,
        timeout: int = 30,
        backoff_factor: float = 1.5
    ) -> Dict[str, Any]:
        """
        Call Anthropic API with retries and timeouts
        
        Args:
            endpoint: API endpoint to call
            payload: Request payload
            api_key: Anthropic API key
            retries: Number of retries on failure
            timeout: Timeout in seconds
            backoff_factor: Factor to increase backoff time between retries
            
        Returns:
            API response
        """
        headers = {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }
        
        model = payload.get("model", "unknown")
        
        # Define the function to retry
        def _call_api():
            try:
                response = requests.post(
                    f"https://api.anthropic.com/v1/{endpoint}",
                    headers=headers,
                    json=payload,
                    timeout=timeout
                )
                response.raise_for_status()
                return response.json()
            except requests.exceptions.Timeout as e:
                logger.warning(f"Anthropic API timeout: {e}")
                raise create_ai_service_error(
                    f"API call timed out after {timeout}s",
                    service="anthropic",
                    model=model,
                    severity=ErrorSeverity.MEDIUM,
                    original_error=e
                )
            except requests.exceptions.HTTPError as e:
                status_code = e.response.status_code if hasattr(e, 'response') else "unknown"
                logger.error(f"Anthropic API HTTP error {status_code}: {e}")
                
                # Try to parse error response
                error_detail = "No details available"
                try:
                    error_json = e.response.json()
                    error_detail = error_json.get('error', {}).get('message', error_detail)
                except:
                    pass
                
                raise create_ai_service_error(
                    f"HTTP error {status_code}: {error_detail}",
                    service="anthropic",
                    model=model,
                    severity=ErrorSeverity.HIGH,
                    original_error=e
                )
            except Exception as e:
                logger.exception(f"Unexpected error calling Anthropic API: {e}")
                raise create_ai_service_error(
                    f"Unexpected error: {str(e)}",
                    service="anthropic",
                    model=model, 
                    severity=ErrorSeverity.HIGH,
                    original_error=e
                )
        
        # Attempt the API call with retries
        for attempt in range(1, retries + 1):
            try:
                return _call_api()
            except Exception as e:
                if attempt == retries:
                    raise e
                
                # Calculate backoff time
                backoff_time = backoff_factor * (2 ** (attempt - 1))
                logger.warning(f"Retrying Anthropic API call in {backoff_time:.2f}s (attempt {attempt}/{retries})")
                time.sleep(backoff_time)