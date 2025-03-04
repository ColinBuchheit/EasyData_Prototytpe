import os
from dotenv import load_dotenv

# ✅ Load environment variables from .env file
load_dotenv()

class ENV:
    """Centralized Configuration for AI-Agent Network"""

    # ✅ Secure API Key Management
    JWT_SECRET = os.getenv("JWT_SECRET")
    BACKEND_SECRET = os.getenv("BACKEND_SECRET")

    if not JWT_SECRET or not BACKEND_SECRET:
        raise RuntimeError("❌ Critical Error: Missing JWT_SECRET or BACKEND_SECRET in environment variables.")

    # ✅ Database Configurations
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "5432")
    DB_USER = os.getenv("DB_USER", "admin")
    DB_PASSWORD = os.getenv("DB_PASSWORD")
    DB_NAME = os.getenv("DB_NAME", "ai_db")

    if not DB_PASSWORD:
        raise RuntimeError("❌ Critical Error: Database password is not set.")

    # ✅ AI-Agent API Configurations
    AI_API_KEY = os.getenv("AI_API_KEY")
    AI_AGENT_API = os.getenv("AI_AGENT_API", "http://localhost:5000")
    DEFAULT_LLM_MODEL = os.getenv("DEFAULT_LLM_MODEL", "gpt-4")
    DEFAULT_EMBEDDING_MODEL = os.getenv("DEFAULT_EMBEDDING_MODEL", "text-embedding-ada-002")

    if not AI_API_KEY:
        raise RuntimeError("❌ Critical Error: AI API Key is missing.")

    # ✅ Logging Settings
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

    # ✅ Server Configuration
    SERVER_HOST = os.getenv("SERVER_HOST", "0.0.0.0")
    SERVER_PORT = os.getenv("SERVER_PORT", "8000")
    DEBUG_MODE = os.getenv("DEBUG_MODE", "true")
    SERVER_WORKERS = os.getenv("SERVER_WORKERS", "4")

    @staticmethod
    def display_config():
        """Prints the loaded configuration for debugging."""
        print(f"🔹 AI-Agent Configurations Loaded:")
        print(f"   - AI API: {ENV.AI_AGENT_API}")
        print(f"   - Database: {ENV.DB_HOST}:{ENV.DB_PORT}")
        print(f"   - Logging Level: {ENV.LOG_LEVEL}")

