import logging
import os

# === Logging Configuration ===
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
LOG_TO_FILE = os.getenv("LOG_TO_FILE", "false").lower() == "true"
LOG_FILE_PATH = os.getenv("LOG_FILE_PATH", "logs/ai_agent.log")

# Create formatter
formatter = logging.Formatter(
    fmt="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)

# Create root logger
logger = logging.getLogger("ai-agent")
logger.setLevel(LOG_LEVEL)

# Avoid adding handlers multiple times (important when re-importing)
if not logger.hasHandlers():

    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    # Optional: File handler
    if LOG_TO_FILE:
        import os
        os.makedirs(os.path.dirname(LOG_FILE_PATH), exist_ok=True)
        file_handler = logging.FileHandler(LOG_FILE_PATH)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)

# ✅ You can now: from utils.logger import logger
