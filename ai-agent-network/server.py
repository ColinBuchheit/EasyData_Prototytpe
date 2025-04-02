from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, Optional

from crew import run_crew_pipeline
from utils.redis_client import get_redis_client
from utils.logger import logger
from db_adapters.db_adapter_router import check_db_connection

from dotenv import load_dotenv
load_dotenv()


app = FastAPI(title="AI Agent Network", version="1.0.0")

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

class DatabaseConnectionRequest(BaseModel):
    db_info: Dict[str, Any]


# === Run the AI Agent Network
@app.post("/api/v1/run")
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
@app.get("/api/v1/health/redis")
async def redis_health():
    try:
        client = get_redis_client()
        client.ping()
        return {"status": "ok", "message": "Redis is live."}
    except Exception as e:
        return {"status": "error", "message": str(e)}


# === Database Health Check
@app.post("/api/v1/health/database")
async def database_health(request: DatabaseConnectionRequest):
    try:
        result = check_db_connection(request.db_info)
        return result
    except Exception as e:
        logger.exception("❌ Database health check failed")
        return {"status": "error", "message": str(e)}


# === Service Health Check
@app.get("/api/v1/health")
async def service_health():
    """Overall service health check"""
    # Check Redis
    redis_status = "ok"
    redis_message = "Redis is live"
    
    try:
        client = get_redis_client()
        client.ping()
    except Exception as e:
        redis_status = "error"
        redis_message = str(e)
    
    # You could add more service checks here
    
    return {
        "status": "ok" if redis_status == "ok" else "degraded",
        "version": "1.0.0",
        "services": {
            "redis": {
                "status": redis_status,
                "message": redis_message
            },
            "api": {
                "status": "ok",
                "message": "API is running"
            }
        }
    }


# === Root
@app.get("/")
async def root():
    return {"status": "ok", "message": "AI-Agent-Network is running", "version": "1.0.0"}