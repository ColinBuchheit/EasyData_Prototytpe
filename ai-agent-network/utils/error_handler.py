import time
import logging
from typing import Callable, Any


def retry_on_failure(func: Callable, retries: int = 3, delay: int = 2, agent_name: str = "") -> Any:
    """
    Retry a function up to `retries` times with exponential backoff.
    Logs all failures. Returns the final exception if all retries fail.
    """
    for attempt in range(1, retries + 1):
        try:
            return func()
        except Exception as e:
            logging.warning(
                f"[{agent_name or 'system'}] Attempt {attempt}/{retries} failed: {e}"
            )
            if attempt < retries:
                time.sleep(delay * attempt)  # exponential backoff
            else:
                logging.error(f"[{agent_name}] All retries failed.")
                raise


def handle_agent_error(agent_name: str, error: Exception) -> dict:
    """
    Formats a consistent agent error response.
    """
    logging.error(f"[{agent_name}] Agent execution failed: {str(error)}")
    return {
        "success": False,
        "error": str(error),
        "agent": agent_name
    }


def try_safe(agent_name: str, func: Callable, *args, **kwargs) -> dict:
    """
    Wraps agent logic to return either a successful result or a structured error.
    """
    try:
        result = func(*args, **kwargs)
        if isinstance(result, dict) and not result.get("success", True):
            return handle_agent_error(agent_name, Exception(result.get("error", "Unknown error")))
        return result
    except Exception as e:
        return handle_agent_error(agent_name, e)
