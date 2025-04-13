# websocket_server.py
import asyncio
import json
import uuid
from typing import Dict, Any, List, Set, Optional, Callable
import logging
from datetime import datetime

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, Header, Query
from fastapi.middleware.cors import CORSMiddleware

from utils.logger import logger
from utils.settings import ENV

# Message types for WebSocket communication
class MessageType:
    AGENT_THINKING = "agent_thinking"  # Agent is processing
    AGENT_RESULT = "agent_result"      # Agent produced a result
    QUERY_EXECUTION = "query_execution" # Database query execution
    INTERMEDIATE_RESULT = "intermediate_result" # Partial results
    FINAL_RESULT = "final_result"      # Final response
    ERROR = "error"                    # Error occurred
    LOG = "log"                        # Debug log message
    PIPELINE_START = "pipeline_start"  # Started processing
    PIPELINE_END = "pipeline_end"      # Completed processing
    CLIENT_COMMAND = "client_command"  # Command from client

class WebSocketManager:
    """
    Manages WebSocket connections and broadcasts messages to clients
    """
    def __init__(self):
        self.active_connections: Dict[str, Dict[str, Any]] = {}
        
    async def connect(self, websocket: WebSocket, session_id: str, user_id: str) -> None:
        """Accept a new WebSocket connection"""
        await websocket.accept()
        self.active_connections[session_id] = {
            "websocket": websocket,
            "user_id": user_id,
            "connected_at": datetime.now().isoformat(),
            "last_activity": datetime.now().isoformat()
        }
        logger.info(f"WebSocket connected: session_id={session_id}, user_id={user_id}")
        
    def disconnect(self, session_id: str) -> None:
        """Remove a disconnected WebSocket connection"""
        if session_id in self.active_connections:
            user_id = self.active_connections[session_id]["user_id"]
            logger.info(f"WebSocket disconnected: session_id={session_id}, user_id={user_id}")
            del self.active_connections[session_id]
    
    async def broadcast_to_user(self, user_id: str, message: Dict[str, Any]) -> None:
        """Send a message to all connections for a specific user"""
        if not user_id:
            return
            
        # Add timestamp to message
        if "timestamp" not in message:
            message["timestamp"] = datetime.now().isoformat()
            
        # Find all sessions for this user
        sessions = [
            session_id for session_id, info in self.active_connections.items()
            if info["user_id"] == user_id
        ]
        
        # Send to each session
        for session_id in sessions:
            try:
                await self.active_connections[session_id]["websocket"].send_text(
                    json.dumps(message)
                )
                # Update last activity
                self.active_connections[session_id]["last_activity"] = datetime.now().isoformat()
            except Exception as e:
                logger.error(f"Error sending message to session {session_id}: {e}")
                # Don't disconnect here - the connection might still be valid
    
    async def send_agent_thinking(self, user_id: str, agent_name: str, thought: str) -> None:
        """Send an agent thinking update"""
        await self.broadcast_to_user(user_id, {
            "type": MessageType.AGENT_THINKING,
            "agent": agent_name,
            "thought": thought
        })
    
    async def send_agent_result(self, user_id: str, agent_name: str, result: Dict[str, Any]) -> None:
        """Send an agent result update"""
        await self.broadcast_to_user(user_id, {
            "type": MessageType.AGENT_RESULT,
            "agent": agent_name,
            "result": result
        })
    
    async def send_query_execution(self, user_id: str, query: str, db_info: Dict[str, Any]) -> None:
        """Send a query execution update"""
        # Sanitize db_info to remove sensitive data
        safe_db_info = {
            "id": db_info.get("id"),
            "db_type": db_info.get("db_type"),
            "database_name": db_info.get("database_name")
        }
        
        await self.broadcast_to_user(user_id, {
            "type": MessageType.QUERY_EXECUTION,
            "query": query,
            "db_info": safe_db_info
        })
    
    async def send_intermediate_result(self, user_id: str, data: Dict[str, Any]) -> None:
        """Send an intermediate result update"""
        await self.broadcast_to_user(user_id, {
            "type": MessageType.INTERMEDIATE_RESULT,
            "data": data
        })
    
    async def send_final_result(self, user_id: str, result: Dict[str, Any]) -> None:
        """Send the final result"""
        await self.broadcast_to_user(user_id, {
            "type": MessageType.FINAL_RESULT,
            "result": result
        })
    
    async def send_error(self, user_id: str, error: str, details: Optional[Dict[str, Any]] = None) -> None:
        """Send an error message"""
        await self.broadcast_to_user(user_id, {
            "type": MessageType.ERROR,
            "error": error,
            "details": details or {}
        })
    
    async def send_log(self, user_id: str, level: str, message: str) -> None:
        """Send a log message (only in development)"""
        if ENV == "development":
            await self.broadcast_to_user(user_id, {
                "type": MessageType.LOG,
                "level": level,
                "message": message
            })
    
    async def send_pipeline_start(self, user_id: str, task: str) -> None:
        """Send pipeline start notification"""
        await self.broadcast_to_user(user_id, {
            "type": MessageType.PIPELINE_START,
            "task": task
        })
    
    async def send_pipeline_end(self, user_id: str, success: bool, message: str) -> None:
        """Send pipeline end notification"""
        await self.broadcast_to_user(user_id, {
            "type": MessageType.PIPELINE_END,
            "success": success,
            "message": message
        })

# Create a singleton instance
manager = WebSocketManager()

def get_websocket_manager() -> WebSocketManager:
    """Get the WebSocket manager singleton"""
    return manager

# WebSocket route handler for FastAPI
async def websocket_endpoint(
    websocket: WebSocket,
    user_id: str = Query(..., description="User ID for the connection"),
    session_id: Optional[str] = Query(None, description="Optional session ID for reconnection")
):
    """WebSocket endpoint for real-time agent updates"""
    # Generate a new session ID if none provided
    if not session_id:
        session_id = str(uuid.uuid4())
    
    manager = get_websocket_manager()
    
    try:
        await manager.connect(websocket, session_id, user_id)
        
        # Send initial connection confirmation
        await websocket.send_text(json.dumps({
            "type": "connection_established",
            "session_id": session_id,
            "user_id": user_id,
            "timestamp": datetime.now().isoformat()
        }))
        
        # Listen for client messages
        while True:
            try:
                # Wait for messages from the client
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Process client commands
                if message.get("type") == MessageType.CLIENT_COMMAND:
                    command = message.get("command")
                    logger.info(f"Received client command: {command} from user {user_id}")
                    
                    # Handle commands (could expand this)
                    if command == "cancel_operation":
                        # TODO: Implement cancellation logic
                        await websocket.send_text(json.dumps({
                            "type": "command_response",
                            "command": command,
                            "status": "acknowledged",
                            "timestamp": datetime.now().isoformat()
                        }))
            except json.JSONDecodeError:
                logger.warning(f"Received invalid JSON from client: {data}")
                continue
            except Exception as e:
                logger.error(f"Error processing client message: {e}")
                continue
                
    except WebSocketDisconnect:
        manager.disconnect(session_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(session_id)

# Function to add WebSocket routes to FastAPI app
def setup_websocket_routes(app: FastAPI) -> None:
    """Add WebSocket routes to the FastAPI application"""
    app.add_websocket_route("/ws", websocket_endpoint)
    
    @app.on_event("startup")
    async def startup_event():
        logger.info("Starting WebSocket server")
    
    @app.on_event("shutdown")
    async def shutdown_event():
        logger.info("Shutting down WebSocket server")