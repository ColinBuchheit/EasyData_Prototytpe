# utils/logger.py

import logging
import sys
import os
from datetime import datetime
from typing import Optional

# Try to import settings, but handle case where it's not available yet
try:
    from utils.settings import LOG_LEVEL, LOG_FORMAT, ENVIRONMENT
except ImportError:
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    LOG_FORMAT = os.getenv("LOG_FORMAT", "%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

# Set up logging
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL.upper()),
    format=LOG_FORMAT,
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

# Create logger
logger = logging.getLogger("ai-agent-network")

# Set up file logging if not in development
if ENVIRONMENT != "development":
    # Create logs directory if it doesn't exist
    os.makedirs("logs", exist_ok=True)
    
    # Create file handler for logging
    log_file = f"logs/ai-agent-{datetime.now().strftime('%Y-%m-%d')}.log"
    file_handler = logging.FileHandler(log_file)
    file_handler.setFormatter(logging.Formatter(LOG_FORMAT))
    logger.addHandler(file_handler)

# Add colors to logs in development
if ENVIRONMENT == "development":
    try:
        import coloredlogs
        coloredlogs.install(
            level=LOG_LEVEL.upper(),
            logger=logger,
            fmt=LOG_FORMAT
        )
        logger.debug("Colored logs enabled")
    except ImportError:
        logger.debug("coloredlogs package not found, continuing without colored logs")


class LoggerAdapter(logging.LoggerAdapter):
    """
    Logger adapter to add context to log messages.
    """
    def process(self, msg, kwargs):
        if self.extra:
            return f"[{self.extra.get('context', 'general')}] {msg}", kwargs
        return msg, kwargs


def get_logger(context: Optional[str] = None) -> logging.Logger:
    """
    Get a logger with context.
    
    Args:
        context: Optional context to add to log messages
        
    Returns:
        Logger instance
    """
    if context:
        return LoggerAdapter(logger, {"context": context})
    return logger


# Log startup
logger.info(f"Logger initialized with level: {LOG_LEVEL}")

# Export as default
if __name__ == "__main__":
    logger.debug("Debug message")
    logger.info("Info message")
    logger.warning("Warning message")
    logger.error("Error message")
    
    # Test context logger
    context_logger = get_logger("TEST")
    context_logger.info("Context log message")