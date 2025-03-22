# main.py

from crew import run_crew_pipeline
from utils.logger import logger
from utils.context_cache import get_context, clear_context
from typing import Dict, Any


def run(task: str, user_id: str, db_info: Dict[str, Any], visualize: bool = True):
    """
    Triggers the full AI Agent pipeline manually.
    Returns structured result and prints to console.
    """
    logger.info(f"🧠 Running agent pipeline via main.py for user: {user_id}")

    result = run_crew_pipeline(
        task=task,
        user_id=user_id,
        db_info=db_info,
        visualize=visualize
    )

    print("\n✅ Final Output:")
    print(result)

    print("\n🧠 Cached Context:")
    print(get_context(user_id) or {})

    return result


if __name__ == "__main__":
    print("⚠️ No CLI entry implemented. Use the `run()` function from a Python shell or test file.")
