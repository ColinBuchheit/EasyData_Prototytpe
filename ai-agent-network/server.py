from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any

from crew import run_crew_pipeline
from utils.redis_client import get_redis_client
from utils.logger import logger

app = FastAPI(title="AI Agent Network")

# === Enable CORS (for frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 🔒 Optional: restrict to your frontend domain in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === Request Schema
class CrewRequest(BaseModel):
    task: str
    user_id: str
    db_info: Dict[str, Any]
    visualize: bool = True


# === Run the AI Agent Network
@app.post("/run")
async def run_pipeline(payload: CrewRequest):
    try:
        logger.info(f"📥 Received pipeline request for user {payload.user_id}")
        result = run_crew_pipeline(
            task=payload.task,
            user_id=payload.user_id,
            db_info=payload.db_info,
            visualize=payload.visualize
        )
        return result
    except Exception as e:
        logger.exception("❌ Failed to run pipeline")
        return {"success": False, "error": str(e)}


# === Redis Health Check
@app.get("/health/redis")
async def redis_health():
    try:
        client = get_redis_client()
        client.ping()
        return {"status": "ok", "message": "Redis is live."}
    except Exception as e:
        return {"status": "error", "message": str(e)}


# === Root
@app.get("/")
async def root():
    return {"status": "ok", "message": "AI-Agent-Network is running"}
