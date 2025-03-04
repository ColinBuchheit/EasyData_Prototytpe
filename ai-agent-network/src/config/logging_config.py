import logging
import os
from config.settings import ENV  # ✅ Load log level from settings.py

# Create logs directory if not exists
LOGS_DIR = "logs"
if not os.path.exists(LOGS_DIR):
    os.makedirs(LOGS_DIR)

# Logging Configuration
LOG_FILE = os.path.join(LOGS_DIR, "ai_agent_network.log")

logging.basicConfig(
    level=getattr(logging, ENV.LOG_LEVEL, logging.INFO),  # ✅ Load log level from settings.py
    format="%(asctime)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE),  # ✅ Log to a file
        logging.StreamHandler()         # ✅ Log to the console
    ]
)

logger = logging.getLogger(__name__)
