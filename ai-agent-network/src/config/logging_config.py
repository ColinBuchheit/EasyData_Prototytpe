import logging
import os
import datetime
import json
from logging.handlers import TimedRotatingFileHandler
from config.settings import ENV  # ✅ Load log level from settings.py

# Create logs directory if not exists
LOGS_DIR = "logs"
if not os.path.exists(LOGS_DIR):
    os.makedirs(LOGS_DIR)

# ✅ Log filename based on the current date
LOG_FILE = os.path.join(LOGS_DIR, f"{datetime.date.today()}.log")

# ✅ JSON-based structured logging
class JsonFormatter(logging.Formatter):
    """Formats log messages as JSON for structured logging."""

    def format(self, record):
        log_record = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "message": record.getMessage(),
            "filename": record.filename,
            "line": record.lineno,
            "session_id": getattr(record, "session_id", "N/A")
        }
        return json.dumps(log_record, ensure_ascii=False)

# ✅ Configure logging settings
LOG_FORMAT = "%(asctime)s - %(levelname)s - [%(filename)s:%(lineno)d] - Session: %(session_id)s - %(message)s"
logging.basicConfig(
    level=getattr(logging, ENV.LOG_LEVEL, logging.INFO),  # ✅ Load log level from settings.py
    format=LOG_FORMAT,
    handlers=[
        logging.StreamHandler()  # ✅ Log to the console
    ]
)

# ✅ Use rotating logs (keeps logs for the last 7 days)
log_handler = TimedRotatingFileHandler(LOG_FILE, when="midnight", interval=1, backupCount=7)
log_handler.setFormatter(JsonFormatter())  # ✅ Apply JSON formatting
logger = logging.getLogger(__name__)
logger.addHandler(log_handler)

# ✅ Helper function to log with session tracking
def log_with_session(level, message, session_id="N/A"):
    """
    Logs messages with session-specific tracking.
    
    Args:
        level (str): Log level (INFO, WARNING, ERROR, DEBUG).
        message (str): Log message.
        session_id (str): User's session ID (default: "N/A").
    """
    extra = {"session_id": session_id}
    if level == "info":
        logger.info(message, extra=extra)
    elif level == "warning":
        logger.warning(message, extra=extra)
    elif level == "error":
        logger.error(message, extra=extra)
    elif level == "debug":
        logger.debug(message, extra=extra)
