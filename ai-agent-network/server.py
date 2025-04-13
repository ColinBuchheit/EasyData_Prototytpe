import asyncio
from fastapi import FastAPI, Request, Depends, HTTPException, Header, Query
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
from websocket_server import setup_websocket_routes, get_websocket_manager
from intent_system import IntentClassifier

# Define your request models
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

# Initialize the FastAPI app
app = FastAPI(title="AI Agent Network", version="1.0.0")

# Setup WebSocket routes
setup_websocket_routes(app)

# Authentication middleware
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

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/api/v1/health")
async def health():
    """Check if the service is healthy"""
    try:
        # Check backend connectivity
        backend_status = health_check()
        
        # Check Redis connectivity
        redis_client = get_redis_client()
        redis_status = redis_client.ping()
        
        return {
            "status": "healthy",
            "backend": "connected" if backend_status else "disconnected",
            "redis": "connected" if redis_status else "disconnected"
        }
    except Exception as e:
        logger.exception("Health check failed")
        return {
            "status": "unhealthy",
            "error": str(e)
        }

# Run the AI agent pipeline
@app.post("/api/v1/run")
async def run_pipeline(payload: CrewRequest, token: str = Depends(verify_api_key)):
    try:
        logger.info(f"📥 Received pipeline request for user {payload.user_id}")
        
        # Log the request for debugging
        logger.debug(f"Request payload: {payload.dict()}")
        
        # Try to register the agent with the backend on each request
        # This ensures the agent is registered if the backend was restarted
        register_ai_agent()
        
        # Send WebSocket notification that we're starting
        websocket_mgr = get_websocket_manager()
        loop = asyncio.get_running_loop() if hasattr(asyncio, 'get_running_loop') else asyncio.get_event_loop()
        loop.create_task(websocket_mgr.send_pipeline_start(
            payload.user_id, 
            payload.task
        ))
        
        # Analyze intent
        intent_result = IntentClassifier.classify_intent(payload.task, payload.user_id)
        logger.info(f"Intent classification: {intent_result['intent_type']} (confidence: {intent_result['confidence']})")
        
        # Convert pydantic model to dict for run_crew_pipeline
        db_info_dict = payload.db_info.dict()
        
        # Execute pipeline
        result = run_crew_pipeline(
            task=payload.task,
            user_id=payload.user_id,
            db_info=db_info_dict,
            visualize=payload.visualize
        )
        
        # Send WebSocket final result notification
        loop = asyncio.get_running_loop() if hasattr(asyncio, 'get_running_loop') else asyncio.get_event_loop()
        if result.get("success", False):
            loop.create_task(websocket_mgr.send_final_result(
                payload.user_id, 
                result
            ))
            loop.create_task(websocket_mgr.send_pipeline_end(
                payload.user_id, 
                True, 
                "Pipeline completed successfully"
            ))
        else:
            error_msg = result.get("error", "Unknown error")
            loop.create_task(websocket_mgr.send_error(
                payload.user_id, 
                error_msg, 
                {"result": result}
            ))
            loop.create_task(websocket_mgr.send_pipeline_end(
                payload.user_id, 
                False, 
                error_msg
            ))
        
        return result
    except Exception as e:
        logger.exception("❌ Failed to run pipeline")
        
        # Send WebSocket error notification
        websocket_mgr = get_websocket_manager()
        loop = asyncio.get_running_loop() if hasattr(asyncio, 'get_running_loop') else asyncio.get_event_loop()
        loop.create_task(websocket_mgr.send_error(
            payload.user_id if 'payload' in locals() else "unknown", 
            str(e)
        ))
        
        # Provide more detailed error information
        raise HTTPException(
            status_code=500,
            detail=f"Pipeline execution failed: {str(e)}"
        )

# Check database connection
@app.post("/api/v1/check-connection")
async def check_connection(db_info: Dict[str, Any], token: str = Depends(verify_api_key)):
    """Check if we can connect to the specified database"""
    try:
        logger.info(f"Checking connection to {db_info.get('db_type')} database: {db_info.get('database_name')}")
        
        # Try direct connection via adapter
        connection_result = check_db_connection(db_info)
        
        # Also check health via backend
        backend_health = check_database_health(db_info)
        
        return {
            "success": connection_result.get("success", False),
            "message": connection_result.get("message", "Unknown status"),
            "backend_health": backend_health
        }
    except Exception as e:
        logger.exception("Failed to check connection")
        return {
            "success": False,
            "message": f"Connection check failed: {str(e)}"
        }

# Get database schema
@app.post("/api/v1/schema")
async def get_schema(db_info: Dict[str, Any], user_id: str, token: str = Depends(verify_api_key)):
    """Get the schema for a database"""
    try:
        logger.info(f"Fetching schema for {db_info.get('database_name')}")
        
        # Fetch schema through backend bridge
        schema_result = fetch_schema_for_user_db(db_info, user_id)
        
        return schema_result
    except Exception as e:
        logger.exception("Failed to fetch schema")
        return {
            "success": False,
            "error": f"Schema fetch failed: {str(e)}"
        }

# Agent thought process endpoint
@app.get("/api/v1/agent-thought-process/{task_id}")
async def get_agent_thought_process(task_id: str, token: str = Depends(verify_api_key)):
    """Get the real-time thought process for a task"""
    # This endpoint will be called by clients to get the current state 
    # of an agent's thought process without needing WebSockets
    from enum import Enum
    
    class TaskStatus(Enum):
        """Enum for task execution status"""
        PENDING = "pending"
        IN_PROGRESS = "in_progress"
        COMPLETED = "completed"
        FAILED = "failed"
        CANCELLED = "cancelled"
    
    # Simulate a response for now
    return {
        "task_id": task_id,
        "status": TaskStatus.IN_PROGRESS.value,
        "progress": 0.65,
        "current_agent": "schema_agent",
        "agents_called": ["chat_agent", "schema_agent"],
        "thoughts": [
            {
                "timestamp": "2025-04-12T10:15:32.123Z",
                "agent": "chat_agent",
                "thought": "Received user query about sales data"
            },
            {
                "timestamp": "2025-04-12T10:15:33.456Z",
                "agent": "schema_agent",
                "thought": "Analyzing database schema to find relevant tables"
            }
        ],
        "intermediate_results": []
    }

# Start the server if running as a script
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
