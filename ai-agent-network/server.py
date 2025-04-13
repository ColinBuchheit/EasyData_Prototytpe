from fastapi import FastAPI, Request, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List, Union

from crew import run_crew_pipeline
from utils.redis_client import get_redis_client
from utils.logger import logger
from utils.backend_bridge import (
    health_check, 
    register_ai_agent, 
    check_database_health,
    fetch_schema_for_user_db
)
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


# === Authentication middleware dependency
async def verify_api_key(authorization: Optional[str] = Header(None)) -> str:
    """Verify the API key in the Authorization header"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Missing or invalid Authorization header"
        )
    token = authorization.replace("Bearer ", "")
    # In a real implementation, you'd validate the token
    # For now, we just return it
    return token


# === Run the AI Agent Network
@app.post("/api/v1/run")
async def run_pipeline(payload: CrewRequest, token: str = Depends(verify_api_key)):
    try:
        logger.info(f"📥 Received pipeline request for user {payload.user_id}")
        
        # Log the request for debugging
        logger.debug(f"Request payload: {payload.dict()}")
        
        # Try to register the agent with the backend on each request
        # This ensures the agent is registered if the backend was restarted
        register_ai_agent()
        
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


# === Schema Endpoint
@app.post("/api/v1/schema")
async def get_schema(request: DatabaseConnectionRequest, token: str = Depends(verify_api_key)):
    """Fetch schema for a database through the backend bridge"""
    try:
        # Make sure the request has user_id
        if "user_id" not in request.db_info:
            raise HTTPException(
                status_code=400,
                detail="Missing user_id in request"
            )
            
        user_id = request.db_info["user_id"]
        schema_result = fetch_schema_for_user_db(request.db_info, user_id)
        
        return schema_result
    except Exception as e:
        logger.exception("❌ Failed to fetch schema")
        raise HTTPException(
            status_code=500,
            detail=f"Schema fetch failed: {str(e)}"
        )


# === Redis Health Check
@app.get("/api/v1/health/redis")
async def redis_health(token: str = Depends(verify_api_key)):
    try:
        client = get_redis_client()
        client.ping()
        return {"status": "ok", "message": "Redis is live."}
    except Exception as e:
        return {"status": "error", "message": str(e)}


# === Database Health Check
@app.post("/api/v1/health/database")
async def database_health(request: DatabaseConnectionRequest, token: str = Depends(verify_api_key)):
    try:
        # First try the backend bridge for health check
        if "id" in request.db_info and "user_id" in request.db_info:
            db_id = request.db_info["id"]
            user_id = request.db_info["user_id"]
            result = check_database_health(db_id, user_id)
            if result.get("success"):
                return result
        
        # Fall back to direct connection check
        result = check_db_connection(request.db_info)
        return result
    except Exception as e:
        logger.exception("❌ Database health check failed")
        return {"status": "error", "message": str(e)}


# === Backend Health Check
@app.get("/api/v1/health/backend")
async def backend_health(token: str = Depends(verify_api_key)):
    """Check backend API health"""
    result = health_check()
    return result


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
    
    # Check backend connection
    backend_status = "unknown"
    backend_message = "Not checked"
    
    try:
        backend_check = health_check()
        backend_status = backend_check.get("status", "error")
        backend_message = backend_check.get("message", "Backend check failed")
    except Exception as e:
        backend_status = "error"
        backend_message = str(e)
    
    # Determine overall status
    overall_status = "ok"
    if redis_status != "ok" or backend_status != "ok":
        overall_status = "degraded"
    
    return {
        "status": overall_status,
        "version": "1.0.0",
        "services": {
            "redis": {
                "status": redis_status,
                "message": redis_message
            },
            "backend": {
                "status": backend_status,
                "message": backend_message
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


# === Initialization on startup
@app.on_event("startup")
async def startup_event():
    logger.info("🚀 Starting AI Agent Network")
    
    # Try to register the agent with the backend
    success = register_ai_agent()
    if success:
        logger.info("✅ AI Agent registered with backend successfully")
    else:
        logger.warning("⚠️ AI Agent registration with backend failed")


# === Entrypoint for local development
if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting AI Agent Network on http://0.0.0.0:8000")
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)