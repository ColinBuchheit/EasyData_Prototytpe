from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List, Union

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

# === Request Schema with stricter validation
class DbInfo(BaseModel):
    id: int
    db_type: str
    database_name: str
    schema: Optional[Dict[str, Any]] = None
    
class CrewRequest(BaseModel):
    task: str
    user_id: str
    db_info: DbInfo
    visualize: bool = True

class DatabaseConnectionRequest(BaseModel):
    db_info: Dict[str, Any]


# === Run the AI Agent Network
@app.post("/api/v1/run")
async def run_pipeline(payload: CrewRequest):
    try:
        logger.info(f"📥 Received pipeline request for user {payload.user_id}")
        
        # Log the request for debugging
        logger.debug(f"Request payload: {payload.dict()}")
        
        # Convert pydantic model to dict for run_crew_pipeline
        db_info_dict = payload.db_info.dict()
        
        result = run_crew_pipeline(
            task=payload.task,
            user_id=payload.user_id,
            db_info=db_info_dict,
            visualize=payload.visualize
        )
        return result
    except Exception as e:
        logger.exception("❌ Failed to run pipeline")
        # Provide more detailed error information
        raise HTTPException(
            status_code=500,
            detail=f"Pipeline execution failed: {str(e)}"
        )


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


# === Entrypoint for local development
if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting AI Agent Network on http://0.0.0.0:8000")
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)