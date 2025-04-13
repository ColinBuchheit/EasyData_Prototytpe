import os

# === Core Environment ===
ENV = os.getenv("ENV", "development")
ENVIRONMENT = os.getenv("ENVIRONMENT", ENV)  # Alias for ENV for backward compatibility
DEBUG = ENV == "development"

# === OpenAI ===
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# === AI Model Configs ===
QUERY_AGENT_MODEL = os.getenv("QUERY_AGENT_MODEL", "gpt-4-0125-preview")
ORCHESTRATION_AGENT_MODEL = os.getenv("ORCHESTRATION_AGENT_MODEL", "gpt-4-0125-preview")
SCHEMA_ANALYSIS_MODEL = os.getenv("SCHEMA_ANALYSIS_MODEL", "claude-3-opus-20240229")
VALIDATION_MODEL = os.getenv("VALIDATION_MODEL", "claude-3-opus-20240229")
GPT_MODEL_FOR_CHARTS = os.getenv("GPT_MODEL_FOR_CHARTS", "gpt-4-0125-preview")
CHAT_MODEL = os.getenv("CHAT_MODEL", "claude-3-sonnet-20240229")

# === Claude / Anthropic (optional) ===
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
CLAUDE_MODEL = os.getenv("CLAUDE_MODEL", "claude-3-sonnet-20240229")

# === Redis ===
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", "")
REDIS_CONTEXT_EXPIRE_SECONDS = int(os.getenv("REDIS_CONTEXT_EXPIRE_SECONDS", "300"))
CACHE_TTL = int(os.getenv("CACHE_TTL", "3600"))  # Default 1 hour cache TTL

# === Backend Connection ===
# Use exact value from .env, default to port 3000 if not specified
BACKEND_API_URL = os.getenv("BACKEND_API_URL", "http://localhost:3001")
BACKEND_SECRET = os.getenv("BACKEND_SECRET", "a4b2c8e9d3f1a7e5b6c0d9f8a2c3e7f5d4b1e0a6c9f2d8b7e1a0c4d3f6b5e2a9")
BACKEND_SERVICE_ID = os.getenv("BACKEND_SERVICE_ID", "ai-agent-network-service")

# === AI Agent Identity ===
AI_AGENT_ID = os.getenv("AI_AGENT_ID", "ai-agent-network-v1")
AI_AGENT_VERSION = os.getenv("AI_AGENT_VERSION", "1.0.0")
AI_API_KEY = os.getenv("AI_API_KEY", "")

# === Logging ===
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FORMAT = os.getenv("LOG_FORMAT", "%(asctime)s [%(levelname)s] [%(name)s] %(message)s")

# === Optional: MongoDB (if you ever fetch memory from it) ===
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/ai_conversations")