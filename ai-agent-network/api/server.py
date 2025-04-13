from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import APIKeyHeader
from pydantic import BaseModel
from dotenv import load_dotenv
from crew import build_agent_network
import os
import json
import asyncio

load_dotenv()

API_KEY = os.getenv("AI_API_KEY", "dev-mode-key")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")
orchestrator = build_agent_network()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

api_key_header = APIKeyHeader(name="Authorization", auto_error=False)

def validate_api_key(auth: str = Depends(api_key_header)):
    if not auth or not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = auth.split(" ")[1]
    if token != API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")


class RunQueryRequest(BaseModel):
    task: str
    user_id: str
    db_info: dict
    visualize: bool = True


@app.get("/api/v1/health")
async def health_check():
    return {"status": "ok", "message": "AI agent network is operational"}


@app.post("/api/v1/run", dependencies=[Depends(validate_api_key)])
async def run_query(request: RunQueryRequest):
    payload = {
        "message": request.task,
        "user_id": request.user_id,
        "db_info": request.db_info,
        "conversation_id": f"ai-{request.user_id}",
        "query": None,
        "visualize": request.visualize
    }

    result = orchestrator.run(payload)

    return JSONResponse({
        "success": True,
        "final_output": {
            "query": result.get("query", ""),
            "text": result.get("reply", ""),
            "visualization": {
                "chart_code": result.get("chart", "")
            }
        },
        "agents_called": result.get("agents", [])
    })


@app.websocket("/ws/query")
async def websocket_query(ws: WebSocket):
    await ws.accept()
    await ws.send_json({
        "type": "connected",
        "message": "Connected to EasyData WebSocket API"
    })

    try:
        while True:
            msg = await ws.receive_json()

            msg_type = msg.get("type")
            data = msg.get("data", {})

            if msg_type == "ping":
                await ws.send_json({"type": "pong", "data": {"timestamp": int(asyncio.time.time() * 1000)}})

            elif msg_type == "query":
                task = data.get("task")
                user_id = str(data.get("userId"))
                db_id = data.get("dbId")

                if not task or not db_id:
                    await ws.send_json({
                        "type": "error",
                        "message": "Missing task or dbId",
                        "errorCode": "MISSING_FIELDS"
                    })
                    continue

                await ws.send_json({
                    "type": "processing",
                    "message": "Processing your query..."
                })

                payload = {
                    "message": task,
                    "user_id": user_id,
                    "db_info": {
                        "id": db_id,
                        "db_type": "postgres",  # you can modify this dynamically if needed
                        "database_name": "unknown"
                    },
                    "conversation_id": f"ws-{user_id}",
                    "query": None,
                    "visualize": True
                }

                result = orchestrator.run(payload)

                await ws.send_json({
                    "type": "queryResult",
                    "data": {
                        "success": True,
                        "query": result.get("query", ""),
                        "explanation": result.get("reply", ""),
                        "visualizationCode": result.get("chart", ""),
                        "agentsCalled": result.get("agents", []),
                        "dbId": db_id,
                        "dbName": "easydatabase"  # optionally resolved via API
                    }
                })

            else:
                await ws.send_json({
                    "type": "error",
                    "message": f"Unknown WebSocket message type '{msg_type}'",
                    "errorCode": "UNKNOWN_TYPE"
                })

    except WebSocketDisconnect:
        print("WebSocket closed")
    except Exception as e:
        await ws.send_json({
            "type": "error",
            "message": "Unhandled server error",
            "error": str(e),
            "errorCode": "SERVER_ERROR"
        })
