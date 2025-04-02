import os

# === Core Environment ===
ENV = os.getenv("ENV", "development")
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

# === Claude / Anthropic (optional)
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
CLAUDE_MODEL = os.getenv("CLAUDE_MODEL", "claude-3-sonnet-20240229")

# === Redis ===
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
REDIS_CONTEXT_EXPIRE_SECONDS = int(os.getenv("REDIS_CONTEXT_EXPIRE_SECONDS", "300"))

# === Backend URL (for live DB query execution)
BACKEND_API_URL = os.getenv("BACKEND_API_URL", "http://localhost:8080")

# === Optional: MongoDB (if you ever fetch memory from it)
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/ai_conversations")

# === Logging
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
