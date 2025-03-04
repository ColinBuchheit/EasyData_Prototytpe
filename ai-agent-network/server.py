import uvicorn
import logging
from src.config.settings import ENV

# Secure Logging Setup
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    logger.info("🚀 Starting AI-Agent API Server...")
    uvicorn.run(
        "main:app",
        host=ENV.SERVER_HOST,
        port=int(ENV.SERVER_PORT),
        reload=True if ENV.DEBUG_MODE == "true" else False,
        workers=int(ENV.SERVER_WORKERS)
    )
