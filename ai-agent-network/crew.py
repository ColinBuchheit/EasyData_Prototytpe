# crew.py

from crewai import Agent, Crew, Task
from typing import Dict, Any, List, Optional, Union, Callable
import asyncio
import traceback
import json
import re
import time
import uuid

from agents.schema_agent import SchemaAgent
from agents.query_agent import QueryAgent
from agents.validation_security_agent import ValidationSecurityAgent
from agents.analysis_vizualization_agent import AnalysisVisualizationAgent
from agents.chat_agent import ChatAgent

from db_adapters.db_adapter_router import get_adapter_for_db
from db_adapters.base_db_adapters import UserDatabase

from utils.context_manager import get_context, set_context, append_to_context
from utils.backend_bridge import (
    fetch_query_result, 
    fetch_schema_for_user_db, 
    save_conversation_to_backend,
    track_ai_usage
)
from utils.logger import logger
from utils.error_handling import handle_agent_error, ErrorSeverity

# Import the new modules
from intent_system import IntentClassifier, IntentType
from websocket_server import get_websocket_manager

from crewai_adapter import CrewAIAgentAdapter

# === Create Base Agent Instances ===
schema_agent_impl = SchemaAgent()
query_agent_impl = QueryAgent()
validation_agent_impl = ValidationSecurityAgent()
analysis_viz_agent_impl = AnalysisVisualizationAgent()
chat_agent_impl = ChatAgent()

# === Wrap with CrewAI Adapter ===
crew_schema_agent = CrewAIAgentAdapter.create_crew_agent(
    schema_agent_impl,
    role="Database Schema Extractor",
    goal="Extract and understand the database's structure so queries can be written correctly.",
    name="Schema Agent"
)

crew_query_agent = CrewAIAgentAdapter.create_crew_agent(
    query_agent_impl,
    role="Query Generator",
    goal="Write a valid query from the user's natural language request using database schema.",
    name="Query Agent"
)

crew_validation_agent = CrewAIAgentAdapter.create_crew_agent(
    validation_agent_impl,
    role="Security Validator",
    goal="Ensure the query is safe, relevant, and logically correct before execution.",
    name="Validation Agent"
)

crew_visualization_agent = CrewAIAgentAdapter.create_crew_agent(
    analysis_viz_agent_impl,
    role="Chart Generator",
    goal="Generate an appropriate visualization for the query results.",
    name="Visualization Agent"
)

crew_chat_agent = CrewAIAgentAdapter.create_crew_agent(
    chat_agent_impl,
    role="Intent Classifier and Conversation Manager",
    goal="Determine user intent and manage conversations or explain query results.",
    name="Chat Agent"
)

# This function creates a task context to track progress
def create_task_context(user_id: str, task: str) -> Dict[str, Any]:
    """
    Create a task context for tracking execution progress
    
    Args:
        user_id: User ID
        task: The task description
        
    Returns:
        Dict containing task context information
    """
    task_id = str(uuid.uuid4())
    return {
        "task_id": task_id,
        "user_id": user_id,
        "task": task,
        "created_at": time.time(),
        "status": "pending",
        "progress": 0.0,
        "agents_called": [],
        "current_agent": None,
        "errors": []
    }

# Function to send real-time updates
async def send_agent_update(task_context: Dict[str, Any], agent_name: str, message: str):
    """
    Send a real-time update about an agent's processing
    
    Args:
        task_context: The task context
        agent_name: Name of the agent
        message: Message about what the agent is doing
    """
    try:
        ws_manager = get_websocket_manager()
        await ws_manager.send_agent_thinking(
            task_context["user_id"],
            agent_name,
            message
        )
    except Exception as e:
        logger.warning(f"Failed to send WebSocket update: {e}")

# === Execute Query Between Tasks ===
def execute_db_query(query: str, db_info: Dict[str, Any], user_id: str, task_context: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Sends a query to the backend for execution.
    Does NOT execute database queries directly.
    """
    try:
        logger.info(f"🔍 Sending query to backend for user {user_id}")
        
        # Send WebSocket update if task_context is available
        if task_context:
            try:
                # Log instead of using asyncio.run() to avoid event loop issues
                message = f"Executing query: {query[:100]}..." if len(query) > 100 else query
                logger.info(f"Would send agent update: {message}")
            except Exception as e:
                logger.warning(f"Failed to prepare query execution update: {e}")
        
        result = fetch_query_result(query=query, db_info=db_info, user_id=user_id)
        append_to_context(user_id, {"query_result": result})
        
        # Send query result update via WebSocket
        if task_context:
            try:
                ws_manager = get_websocket_manager()
                has_rows = "rows" in result and result["rows"]
                row_count = len(result["rows"]) if has_rows else 0
                
                # Log instead of using asyncio.run() to avoid event loop issues
                logger.info(f"Would send query results: rows={row_count}, success=True")
            except Exception as e:
                logger.warning(f"Failed to prepare query result update: {e}")
        
        return result
    except Exception as e:
        logger.exception("❌ Backend query execution failed:")
        
        # Send error update via WebSocket if task_context is available
        if task_context:
            try:
                # Log instead of using asyncio.run() to avoid event loop issues
                logger.error(f"Would send error: Query execution failed: {str(e)}")
            except Exception as ws_e:
                logger.warning(f"Failed to prepare query error update: {ws_e}")
        
        return {"error": str(e)}

# === Main Orchestration Function ===
def run_crew_pipeline(task: str, user_id: str, db_info: Dict[str, Any], visualize: bool = True) -> Dict[str, Any]:
    try:
        # Create task context for tracking progress
        task_context = create_task_context(user_id, task)
        task_context["status"] = "in_progress"
        
        # Try to send a starting update via WebSocket
        try:
            # Use create_task instead of asyncio.run to handle WebSocket operations
            # within the existing event loop
            loop = asyncio.get_running_loop() if hasattr(asyncio, 'get_running_loop') else asyncio.get_event_loop()
            loop.create_task(get_websocket_manager().send_pipeline_start(user_id, task))
        except Exception as e:
            logger.warning(f"Failed to send pipeline start via WebSocket: {e}")
        
        context = get_context(user_id) or {}
        logger.info(f"📦 Loaded context for user {user_id}: {len(context.keys())} keys")

        # Analyze intent with the new IntentClassifier
        try:
            intent_result = IntentClassifier.classify_intent(task, user_id, context)
            logger.info(f"Intent classification: {intent_result['intent_type']} (confidence: {intent_result['confidence']})")
            task_context["intent"] = intent_result
            
            # Store intent in context
            append_to_context(user_id, {"last_intent": intent_result})
            
            # Send intent detection update
            try:
                loop = asyncio.get_running_loop() if hasattr(asyncio, 'get_running_loop') else asyncio.get_event_loop()
                loop.create_task(send_agent_update(
                    task_context,
                    "IntentClassifier",
                    f"Detected intent: {intent_result['intent_type']} (confidence: {intent_result['confidence']})"
                ))
            except Exception as e:
                logger.warning(f"Failed to send intent update via WebSocket: {e}")
        except Exception as e:
            logger.warning(f"Intent classification failed: {e}")
            # Continue without intent classification

        # First, detect intent with Chat Agent
        task_context["progress"] = 0.1
        task_context["current_agent"] = "chat_agent"
        task_context["agents_called"].append("chat_agent")
        
        try:
            loop = asyncio.get_running_loop() if hasattr(asyncio, 'get_running_loop') else asyncio.get_event_loop()
            loop.create_task(send_agent_update(
                task_context,
                "chat_agent",
                "Analyzing user request to determine intent..."
            ))
        except Exception as e:
            logger.warning(f"Failed to send chat agent update via WebSocket: {e}")
        
        chat_task = Task(
            identifier="intent_detection_task",
            description=f"Determine if this is a conversation, database query, or system question: {task}",
            agent=crew_chat_agent,
            expected_output="Classification of user intent",
            context=[{
                "description": "Classify user intent",
                "expected_output": "JSON with intent classification",
                "task": task,
                "operation": "classify_intent"  # Special flag for Chat Agent
            }]
        )
        
        # Run the intent classification
        intent_crew = Crew(
            agents=[crew_chat_agent],
            tasks=[chat_task],
            verbose=True,
            process="sequential"
        )
        
        intent_result = intent_crew.kickoff()
        intent_output = getattr(intent_result, "intent_detection_task", {})
        
        # Send intent result via WebSocket
        try:
            loop = asyncio.get_running_loop() if hasattr(asyncio, 'get_running_loop') else asyncio.get_event_loop()
            loop.create_task(get_websocket_manager().send_agent_result(
                user_id,
                "chat_agent",
                {"intent": intent_output}
            ))
        except Exception as e:
            logger.warning(f"Failed to send agent result via WebSocket: {e}")
        
        logger.debug(f"Intent detection result: {intent_output}")
        
        # Improved intent parsing logic
        intent_type = "unknown"
        confidence = 0
        
        if isinstance(intent_output, dict):
            intent_type = intent_output.get("intent_type", "unknown")
            confidence = intent_output.get("confidence", 0)
        elif isinstance(intent_output, str):
            # Try to parse if it's a string containing JSON
            try:
                parsed_intent = json.loads(intent_output)
                intent_type = parsed_intent.get("intent_type", "unknown")
                confidence = parsed_intent.get("confidence", 0)
            except:
                # Look for specific keywords in the text response
                intent_output_lower = intent_output.lower()
                if "system" in intent_output_lower or "connection" in intent_output_lower:
                    intent_type = "system_question"
                    confidence = 0.8
                elif "conversation" in intent_output_lower or "greeting" in intent_output_lower:
                    intent_type = "conversation"
                    confidence = 0.8
                elif "query" in intent_output_lower or "database" in intent_output_lower:
                    intent_type = "query"
                    confidence = 0.8
        
        logger.info(f"Detected intent: {intent_type} (confidence: {confidence})")
        
        # Handle system questions specially (about connections, database systems, etc.)
        if intent_type == "system_question" or intent_type == IntentType.SYSTEM_QUESTION.name:
            task_context["current_agent"] = "chat_agent"
            try:
                loop = asyncio.get_running_loop() if hasattr(asyncio, 'get_running_loop') else asyncio.get_event_loop()
                loop.create_task(send_agent_update(
                    task_context,
                    "chat_agent",
                    "Preparing response to system question..."
                ))
            except Exception as e:
                logger.warning(f"Failed to send system question update via WebSocket: {e}")
            
            # Create a specialized context for system questions
            system_question_context = {
                "description": "Answer question about database connections or system information",
                "expected_output": "Helpful information about the system or available connections",
                "task": task,
                "is_system_question": True,
                "user_id": user_id
            }
            
            system_response_task = Task(
                identifier="system_question_task",
                description=f"Answer system question: {task}",
                agent=crew_chat_agent,
                expected_output="Helpful system information response",
                context=[system_question_context]
            )
            
            system_crew = Crew(
                agents=[crew_chat_agent],
                tasks=[system_response_task],
                verbose=True,
                process="sequential"
            )
            
            system_result = system_crew.kickoff()
            system_output = getattr(system_result, "system_question_task", "")
            
            # Extract the response message
            response_text = ""
            if isinstance(system_output, str):
                response_text = system_output
            elif isinstance(system_output, dict):
                response_text = system_output.get("message", "")
            
            # If response_text is still empty, look for other possible keys
            if not response_text and isinstance(system_output, dict):
                for key in ["response", "text", "answer", "content"]:
                    if key in system_output and system_output[key]:
                        response_text = system_output[key]
                        break
            
            # If response_text is still empty, provide a default response
            if not response_text:
                response_text = "I can help you with information about your database connections and system capabilities. What would you like to know?"
            
            # Task complete
            task_context["progress"] = 1.0
            task_context["status"] = "completed"
            
            # Send final result via WebSocket
            try:
                loop = asyncio.get_running_loop() if hasattr(asyncio, 'get_running_loop') else asyncio.get_event_loop()
                loop.create_task(get_websocket_manager().send_final_result(
                    user_id,
                    {
                        "text": response_text,
                        "is_system_question": True
                    }
                ))
                
                loop.create_task(get_websocket_manager().send_pipeline_end(
                    user_id,
                    True,
                    "Response to system question completed"
                ))
            except Exception as e:
                logger.warning(f"Failed to send final system question result: {e}")
            
            # Save conversation context to backend if possible
            try:
                save_conversation_to_backend({
                    "user_id": user_id,
                    "prompt": task,
                    "output": response_text,
                    "intent_type": "system_question"
                })
            except Exception as e:
                logger.warning(f"Failed to save conversation to backend: {e}")
            
            return {
                "success": True,
                "final_output": {
                    "text": response_text,
                    "is_system_question": True
                },
                "agents_called": ["chat_agent"]
            }
                
        # If it's conversational or the intent is unknown/unparseable, handle as conversation
        if intent_type in ["conversation", "unknown", "ambiguous"] or intent_type == IntentType.CONVERSATION.name:
            task_context["current_agent"] = "chat_agent"
            try:
                loop = asyncio.get_running_loop() if hasattr(asyncio, 'get_running_loop') else asyncio.get_event_loop()
                loop.create_task(send_agent_update(
                    task_context,
                    "chat_agent",
                    "Preparing response to conversation..."
                ))
            except Exception as e:
                logger.warning(f"Failed to send conversation update via WebSocket: {e}")
            
            # Handle as conversation
            chat_context = {
                "description": "Respond to general user conversation",
                "expected_output": "Friendly, helpful response",
                "task": task,
                "is_general_conversation": True,
                "user_id": user_id  # Pass user_id for potential backend queries
            }
            
            chat_response_task = Task(
                identifier="chat_response_task",
                description=f"Respond to conversation: {task}",
                agent=crew_chat_agent,
                expected_output="Friendly conversation response",
                context=[chat_context]
            )
            
            chat_crew = Crew(
                agents=[crew_chat_agent],
                tasks=[chat_response_task],
                verbose=True,
                process="sequential"
            )
            
            chat_result = chat_crew.kickoff()
            chat_output = getattr(chat_result, "chat_response_task", "")
            
            # Properly extract the response message from whatever format we received
            response_text = ""
            if isinstance(chat_output, str):
                response_text = chat_output
            elif isinstance(chat_output, dict):
                response_text = chat_output.get("message", "")
            
            # If response_text is still empty, look for other possible keys
            if not response_text and isinstance(chat_output, dict):
                for key in ["response", "text", "answer", "content"]:
                    if key in chat_output and chat_output[key]:
                        response_text = chat_output[key]
                        break
            
            # If still empty, provide a default response
            if not response_text:
                response_text = "I'm here to help with your database queries or chat with you. What would you like to do?"
            
            # Task complete
            task_context["progress"] = 1.0
            task_context["status"] = "completed"
            
            # Send final result via WebSocket
            try:
                loop = asyncio.get_running_loop() if hasattr(asyncio, 'get_running_loop') else asyncio.get_event_loop()
                loop.create_task(get_websocket_manager().send_final_result(
                    user_id,
                    {
                        "text": response_text,
                        "is_general_conversation": True
                    }
                ))
                
                loop.create_task(get_websocket_manager().send_pipeline_end(
                    user_id,
                    True,
                    "Conversation response completed"
                ))
            except Exception as e:
                logger.warning(f"Failed to send final conversation result: {e}")
            
            # Save conversation context to backend if possible
            try:
                save_conversation_to_backend({
                    "user_id": user_id,
                    "prompt": task,
                    "output": response_text,
                    "intent_type": "conversation"
                })
            except Exception as e:
                logger.warning(f"Failed to save conversation to backend: {e}")
            
            return {
                "success": True,
                "final_output": {
                    "text": response_text,
                    "is_general_conversation": True
                },
                "agents_called": ["chat_agent"]
            }
        
        # Handle data exploration intent
        if intent_type == IntentType.DATA_EXPLORATION.name:
            task_context["current_agent"] = "schema_agent"
            try:
                loop = asyncio.get_running_loop() if hasattr(asyncio, 'get_running_loop') else asyncio.get_event_loop()
                loop.create_task(send_agent_update(
                    task_context,
                    "schema_agent",
                    "Exploring database structure..."
                ))
            except Exception as e:
                logger.warning(f"Failed to send schema exploration update via WebSocket: {e}")
            
            # Data exploration context
            exploration_context = {
                "description": "Explore database structure",
                "expected_output": "Information about database schema",
                "task": task,
                "operation": "data_exploration",
                "user_id": user_id,
                "db_info": db_info
            }
            
            exploration_task = Task(
                identifier="exploration_task",
                description=f"Explore database structure: {task}",
                agent=crew_chat_agent,
                expected_output="Database structure information",
                context=[exploration_context]
            )
            
            exploration_crew = Crew(
                agents=[crew_chat_agent],
                tasks=[exploration_task],
                verbose=True,
                process="sequential"
            )
            
            exploration_result = exploration_crew.kickoff()
            exploration_output = getattr(exploration_result, "exploration_task", "")
            
            # Extract response message
            response_text = ""
            if isinstance(exploration_output, str):
                response_text = exploration_output
            elif isinstance(exploration_output, dict):
                response_text = exploration_output.get("message", "")
            
            # Task complete
            task_context["progress"] = 1.0
            task_context["status"] = "completed"
            
            # Send final result via WebSocket
            try:
                loop = asyncio.get_running_loop() if hasattr(asyncio, 'get_running_loop') else asyncio.get_event_loop()
                loop.create_task(get_websocket_manager().send_final_result(
                    user_id,
                    {
                        "text": response_text,
                        "is_data_exploration": True
                    }
                ))
                
                loop.create_task(get_websocket_manager().send_pipeline_end(
                    user_id,
                    True,
                    "Data exploration completed"
                ))
            except Exception as e:
                logger.warning(f"Failed to send final exploration result: {e}")
            
            return {
                "success": True,
                "final_output": {
                    "text": response_text,
                    "is_data_exploration": True
                },
                "agents_called": ["chat_agent", "schema_agent"]
            }
        
        # Only proceed with database operations for "query" intent
        # Make a copy of db_info without the schema field to avoid errors
        db_info_copy = {k: v for k, v in db_info.items() if k != 'schema'}
        
        # Now use the backend bridge to fetch the actual schema - never make it up
        logger.info(f"🔍 Fetching real schema from backend for user {user_id}")
        task_context["progress"] = 0.2
        task_context["current_agent"] = "schema_agent"
        
        try:
            loop = asyncio.get_running_loop() if hasattr(asyncio, 'get_running_loop') else asyncio.get_event_loop()
            loop.create_task(send_agent_update(
                task_context,
                "schema_agent",
                "Fetching database schema from backend..."
            ))
        except Exception as e:
            logger.warning(f"Failed to send schema update via WebSocket: {e}")
        
        schema_result = fetch_schema_for_user_db(db_info, user_id)
        
        if not schema_result.get("success", False):
            logger.error(f"❌ Failed to fetch schema from backend: {schema_result.get('error')}")
            
            # Send error via WebSocket
            try:
                loop = asyncio.get_running_loop() if hasattr(asyncio, 'get_running_loop') else asyncio.get_event_loop()
                loop.create_task(get_websocket_manager().send_error(
                    user_id,
                    f"Could not retrieve database schema: {schema_result.get('error')}",
                    {"db_info": db_info_copy}
                ))
                
                loop.create_task(get_websocket_manager().send_pipeline_end(
                    user_id,
                    False,
                    f"Schema retrieval failed: {schema_result.get('error')}"
                ))
            except Exception as e:
                logger.warning(f"Failed to send schema error via WebSocket: {e}")
            
            task_context["status"] = "failed"
            task_context["errors"].append({
                "timestamp": time.time(),
                "error": f"Could not retrieve database schema: {schema_result.get('error')}",
                "agent": "schema_agent"
            })
            
            return {
                "success": False,
                "error": f"Could not retrieve database schema: {schema_result.get('error')}",
                "agents_called": ["chat_agent", "schema_agent"]
            }
        
        # Extract real schema from response
        schema_output = schema_result.get("schema", {})
        
        # If schema is empty or no tables, return error
        if not schema_output or not schema_output.get("tables", []):
            logger.warning("⚠️ No tables found in schema from backend")
            
            # Send error via WebSocket
            try:
                loop = asyncio.get_running_loop() if hasattr(asyncio, 'get_running_loop') else asyncio.get_event_loop()
                loop.create_task(get_websocket_manager().send_error(
                    user_id,
                    "No tables found in database schema.",
                    {"db_info": db_info_copy}
                ))
                
                loop.create_task(get_websocket_manager().send_pipeline_end(
                    user_id,
                    False,
                    "No tables found in database schema"
                ))
            except Exception as e:
                logger.warning(f"Failed to send schema error via WebSocket: {e}")
            
            task_context["status"] = "failed"
            task_context["errors"].append({
                "timestamp": time.time(),
                "error": "No tables found in database schema.",
                "agent": "schema_agent"
            })
            
            return {
                "success": False,
                "error": "No tables found in database schema.",
                "agents_called": ["chat_agent", "schema_agent"]
            }
        
        # Send schema result via WebSocket
        try:
            loop = asyncio.get_running_loop() if hasattr(asyncio, 'get_running_loop') else asyncio.get_event_loop()
            loop.create_task(get_websocket_manager().send_agent_result(
                user_id,
                "schema_agent",
                {
                    "schema": {
                        "tables": schema_output.get("tables", []),
                        "table_count": len(schema_output.get("tables", []))
                    }
                }
            ))
        except Exception as e:
            logger.warning(f"Failed to send schema result via WebSocket: {e}")
        
        # Now create the UserDatabase instance with the sanitized db_info
        db = UserDatabase(**db_info_copy)
        
        append_to_context(user_id, {"schema": schema_output})

        # Proceed with query generation
        task_context["progress"] = 0.3
        task_context["current_agent"] = "query_agent"
        task_context["agents_called"].append("query_agent")
        
        try:
            loop = asyncio.get_running_loop() if hasattr(asyncio, 'get_running_loop') else asyncio.get_event_loop()
            loop.create_task(send_agent_update(
                task_context,
                "query_agent",
                "Generating database query from natural language..."
            ))
        except Exception as e:
            logger.warning(f"Failed to send query generation update via WebSocket: {e}")
        
        query_task = Task(
            identifier="query_task",
            description=f"Generate a database query for task: {task}",
            agent=crew_query_agent,
            expected_output="Valid database query string",
            context=[{
                "description": "User's natural language request and database type",
                "expected_output": "A valid SQL or NoSQL query",
                "task": task,
                "db_type": db.db_type,
                "schema": schema_output  # Pass schema from previous step
            }]
        )

        query_crew = Crew(
            agents=[crew_query_agent],
            tasks=[query_task],
            verbose=True,
            process="sequential"
        )
        
        query_result = query_crew.kickoff()
        query_output = getattr(query_result, "query_task", "")

        # Safely extract query string
        if isinstance(query_output, dict):
            query_str = query_output.get("query") or query_output.get("output") or ""
        elif isinstance(query_output, str):
            query_str = query_output
        else:
            query_str = ""
        
        # Send query result via WebSocket
        try:
            loop = asyncio.get_running_loop() if hasattr(asyncio, 'get_running_loop') else asyncio.get_event_loop()
            loop.create_task(get_websocket_manager().send_agent_result(
                user_id,
                "query_agent",
                {
                    "query": query_str
                }
            ))
        except Exception as e:
            logger.warning(f"Failed to send query result via WebSocket: {e}")

        append_to_context(user_id, {"query": query_output})
        
        # Continue with validation via ValidationSecurityAgent
        if not query_str or len(query_str.strip()) < 5:  # Very short query strings are likely errors
            logger.warning(f"⚠️ No valid query string generated for task: {task}")
            
            # Send error via WebSocket
            try:
                loop = asyncio.get_running_loop() if hasattr(asyncio, 'get_running_loop') else asyncio.get_event_loop()
                loop.create_task(get_websocket_manager().send_error(
                    user_id,
                    "Failed to generate a valid database query for your request.",
                    {"task": task}
                ))
                
                loop.create_task(get_websocket_manager().send_pipeline_end(
                    user_id,
                    False,
                    "Query generation failed"
                ))
            except Exception as e:
                logger.warning(f"Failed to send query error via WebSocket: {e}")
            
            task_context["status"] = "failed"
            task_context["errors"].append({
                "timestamp": time.time(),
                "error": "Failed to generate a valid database query for your request.",
                "agent": "query_agent"
            })
            
            return {
                "success": False,
                "error": "Failed to generate a valid database query for your request.",
                "agents_called": ["chat_agent", "schema_agent", "query_agent"]
            }

        # Validation Step
        task_context["progress"] = 0.5
        task_context["current_agent"] = "validation_agent"
        task_context["agents_called"].append("validation_agent")
        
        try:
            loop = asyncio.get_running_loop() if hasattr(asyncio, 'get_running_loop') else asyncio.get_event_loop()
            loop.create_task(send_agent_update(
                task_context,
                "validation_agent",
                "Validating query for security and correctness..."
            ))
        except Exception as e:
            logger.warning(f"Failed to send validation update via WebSocket: {e}")
        
        validation_task = Task(
            identifier="validation_task",
            description="Validate the query for security and logical correctness",
            agent=crew_validation_agent,
            expected_output='Strict JSON: { "valid": true|false, "reason": "explanation" }',
            context=[{
                "description": "Validate this query strictly.",
                "expected_output": 'Strict JSON: { "valid": true|false, "reason": "explanation" }',
                "task": task,
                "query": query_str,
                "db_type": db_info.get("db_type", "unknown")  # Pass db_type to validation agent
            }]
        )

        validation_crew = Crew(
            agents=[crew_validation_agent],
            tasks=[validation_task],
            verbose=True,
            process="sequential"
        )

        validation_results = validation_crew.kickoff()
        validation_raw = getattr(validation_results, "validation_task", "{}")

        # Clean and parse output (improved parsing logic)
        logger.debug(f"🧪 Raw validation output type: {type(validation_raw)}, content: {validation_raw}")

        if isinstance(validation_raw, str):
            # More robust regex cleanup to handle various LLM formatting issues
            clean_validation = re.sub(r'```(?:json)?|```', '', validation_raw, flags=re.MULTILINE)
            clean_validation = clean_validation.strip()
            
            logger.debug(f"Cleaned validation output: {clean_validation}")
            
            try:
                validation_output = json.loads(clean_validation)
                logger.debug(f"Successfully parsed validation JSON: {validation_output}")
            except json.JSONDecodeError as e:
                logger.error(f"❌ JSON parsing error: {e}, raw content: {clean_validation}")
                # Attempt fallback parsing using regex
                valid_match = re.search(r'"valid"\s*:\s*(true|false)', clean_validation, re.IGNORECASE)
                reason_match = re.search(r'"reason"\s*:\s*"([^"]*)"', clean_validation)
                
                is_valid = valid_match and valid_match.group(1).lower() == "true"
                reason = reason_match.group(1) if reason_match else "No reason available"
                
                validation_output = {"valid": is_valid, "reason": reason}
                logger.debug(f"Created validation output from regex: {validation_output}")
        elif isinstance(validation_raw, dict):
            validation_output = validation_raw
            logger.debug(f"Validation output is already a dict: {validation_output}")
        else:
            logger.error(f"❌ Unexpected validation output type: {type(validation_raw)}")
            validation_output = {"valid": False, "reason": f"Unexpected validation output format: {type(validation_raw)}"}

        # Safely extract validity and reason with proper debugging
        is_valid = bool(validation_output.get("valid", False))
        reason = validation_output.get("reason", "No reason provided")

        logger.debug(f"Final validation result - valid: {is_valid}, reason: {reason}")
        
        # Send validation result via WebSocket
        try:
            loop = asyncio.get_running_loop() if hasattr(asyncio, 'get_running_loop') else asyncio.get_event_loop()
            loop.create_task(get_websocket_manager().send_agent_result(
                user_id,
                "validation_agent",
                {
                    "valid": is_valid,
                    "reason": reason
                }
            ))
        except Exception as e:
            logger.warning(f"Failed to send validation result via WebSocket: {e}")

        if not is_valid:
            logger.warning(f"⚠️ Query validation failed for user {user_id}: {reason}")
            
            # Send error via WebSocket
            try:
                loop = asyncio.get_running_loop() if hasattr(asyncio, 'get_running_loop') else asyncio.get_event_loop()
                loop.create_task(get_websocket_manager().send_error(
                    user_id,
                    f"Query failed validation checks: {reason}",
                    {"query": query_str}
                ))
                
                # Note: Removed duplicate error send
                
                loop.create_task(get_websocket_manager().send_pipeline_end(
                    user_id,
                    False,
                    f"Query validation failed: {reason}"
                ))
            except Exception as e:
                logger.warning(f"Failed to send validation error via WebSocket: {e}")
            
            task_context["status"] = "failed"
            task_context["errors"].append({
                "timestamp": time.time(),
                "error": f"Query failed validation checks: {reason}",
                "agent": "validation_agent"
            })
            
            return {
                "success": False,
                "error": f"Query failed validation checks: {reason}",
                "agents_called": ["chat_agent", "query_agent", "validation_agent"]
            }

        logger.info(f"✅ Query passed validation: {reason}")
        
        # Execute the query
        if not isinstance(query_str, str) or not query_str.strip():
            logger.error("⚠️ Query output is not a valid string.")
            
            # Send error via WebSocket
            try:
                loop = asyncio.get_running_loop() if hasattr(asyncio, 'get_running_loop') else asyncio.get_event_loop()
                loop.create_task(get_websocket_manager().send_error(
                    user_id,
                    "Query generation did not return a valid string.",
                    {"task": task}
                ))
                
                loop.create_task(get_websocket_manager().send_pipeline_end(
                    user_id,
                    False,
                    "Query generation failed"
                ))
            except Exception as e:
                logger.warning(f"Failed to send query error via WebSocket: {e}")
            
            task_context["status"] = "failed"
            task_context["errors"].append({
                "timestamp": time.time(),
                "error": "Query generation did not return a valid string.",
                "agent": "query_agent"
            })
            
            return {
                "success": False,
                "error": "Query generation did not return a valid string.",
                "agents_called": ["chat_agent", "query_agent", "validation_agent"]
            }

        task_context["progress"] = 0.6
        try:
            loop = asyncio.get_running_loop() if hasattr(asyncio, 'get_running_loop') else asyncio.get_event_loop()
            loop.create_task(send_agent_update(
                task_context,
                "backend_bridge",
                "Executing validated query on database..."
            ))
        except Exception as e:
            logger.warning(f"Failed to send query execution update via WebSocket: {e}")
        
        db_response = execute_db_query(query_str, db_info, user_id, task_context)

        if "error" in db_response:
            logger.error(f"❌ Query execution failed for user {user_id}")
            
            # Send error via WebSocket
            try:
                loop = asyncio.get_running_loop() if hasattr(asyncio, 'get_running_loop') else asyncio.get_event_loop()
                loop.create_task(get_websocket_manager().send_error(
                    user_id,
                    f"Database query execution failed: {db_response.get('error')}",
                    {"query": query_str}
                ))
                
                loop.create_task(get_websocket_manager().send_pipeline_end(
                    user_id,
                    False,
                    "Query execution failed"
                ))
            except Exception as e:
                logger.warning(f"Failed to send query execution error via WebSocket: {e}")
            
            task_context["status"] = "failed"
            task_context["errors"].append({
                "timestamp": time.time(),
                "error": f"Database query execution failed: {db_response.get('error')}",
                "agent": "backend_bridge"
            })
            
            return {
                "success": False,
                "error": f"Database query execution failed: {db_response.get('error')}",
                "agents_called": ["chat_agent", "query_agent", "validation_agent"]
            }

        if not db_response or "rows" not in db_response:
            logger.warning("⚠️ No data returned from query, skipping visualization/chat agents.")
            
            # Send warning via WebSocket
            try:
                loop = asyncio.get_running_loop() if hasattr(asyncio, 'get_running_loop') else asyncio.get_event_loop()
                loop.create_task(get_websocket_manager().send_intermediate_result(
                    user_id,
                    {
                        "query_executed": query_str,
                        "has_results": False,
                        "warning": "No data returned from database"
                    }
                ))
            except Exception as e:
                logger.warning(f"Failed to send no data warning via WebSocket: {e}")
            
            return {
                "success": False,
                "error": "No data returned from database.",
                "query": query_str,
                "agents_called": ["chat_agent", "query_agent", "validation_agent"]
            }

        # Continue to Visualization and Chat Agents
        remaining_tasks = []
        agents_called = ["chat_agent", "query_agent", "validation_agent"]

        if visualize:
            task_context["progress"] = 0.8
            task_context["current_agent"] = "visualization_agent"
            task_context["agents_called"].append("visualization_agent")
            
            try:
                loop = asyncio.get_running_loop() if hasattr(asyncio, 'get_running_loop') else asyncio.get_event_loop()
                loop.create_task(send_agent_update(
                    task_context,
                    "visualization_agent",
                    "Creating visualization for query results..."
                ))
            except Exception as e:
                logger.warning(f"Failed to send visualization update via WebSocket: {e}")
            
            visualization_task = Task(
                identifier="visualization_task",
                description=f"Create visualization for query results of: {task}",
                agent=crew_visualization_agent,
                expected_output="Visualization code and summary",
                context=[{
                    "description": "Query result and task details to visualize data",
                    "expected_output": "Python chart code and a summary",
                    "task": task,
                    "query_result": db_response
                }]
            )
            remaining_tasks.append(visualization_task)
            agents_called.append("visualization_agent")

        task_context["progress"] = 0.9
        task_context["current_agent"] = "chat_agent"
        
        try:
            loop = asyncio.get_running_loop() if hasattr(asyncio, 'get_running_loop') else asyncio.get_event_loop()
            loop.create_task(send_agent_update(
                task_context,
                "chat_agent",
                "Preparing human-friendly explanation of results..."
            ))
        except Exception as e:
            logger.warning(f"Failed to send chat explanation update via WebSocket: {e}")
        
        chat_task = Task(
            identifier="chat_task",
            description=f"Explain query results in user-friendly terms: {task}",
            agent=crew_chat_agent,
            expected_output="User-friendly explanation of results",
            context=[{
                "description": "Query result and user task to explain in plain language",
                "expected_output": "Natural language summary with friendly tone",
                "task": task,
                "query_result": db_response,
                "tone": "friendly"
            }]
        )

        remaining_tasks.append(chat_task)
        agents_called.append("chat_agent")

        remaining_crew = Crew(
            agents=[crew_visualization_agent, crew_chat_agent],
            tasks=remaining_tasks,
            verbose=True,
            process="parallel" if visualize else "sequential"
        )

        final_results = remaining_crew.kickoff()
        visualization_output = getattr(final_results, "visualization_task", {}) if visualize else None
        chat_output = getattr(final_results, "chat_task", {})
        
        # Send agent results via WebSocket
        try:
            loop = asyncio.get_running_loop() if hasattr(asyncio, 'get_running_loop') else asyncio.get_event_loop()
            
            if visualize and visualization_output:
                loop.create_task(get_websocket_manager().send_agent_result(
                    user_id,
                    "visualization_agent",
                    {
                        "visual_type": visualization_output.get("visual_type", ""),
                        "summary": visualization_output.get("summary", ""),
                        "has_chart": True
                    }
                ))
            
            loop.create_task(get_websocket_manager().send_agent_result(
                user_id,
                "chat_agent",
                {
                    "message": chat_output.get("message", ""),
                    "type": "explanation"
                }
            ))
        except Exception as e:
            logger.warning(f"Failed to send final agent results via WebSocket: {e}")

        if visualize and visualization_output:
            append_to_context(user_id, {"visualization": visualization_output})

        append_to_context(user_id, {"chat": chat_output})

        set_context(user_id, {
            "task": task,
            "query": query_str,
            "response": chat_output.get("message", ""),
            "visual": visualization_output.get("chart_code") if visualization_output else None
        })
        
        # Final task completion
        task_context["progress"] = 1.0
        task_context["status"] = "completed"
        
        # Send final result and pipeline completion via WebSocket
        try:
            final_output = {
                "text": chat_output.get("message", ""),
                "visualization": visualization_output if visualize and visualization_output else None,
                "query": query_str
            }
            
            loop = asyncio.get_running_loop() if hasattr(asyncio, 'get_running_loop') else asyncio.get_event_loop()
            loop.create_task(get_websocket_manager().send_final_result(
                user_id,
                final_output
            ))
            
            loop.create_task(get_websocket_manager().send_pipeline_end(
                user_id,
                True,
                "Pipeline completed successfully"
            ))
        except Exception as e:
            logger.warning(f"Failed to send final result via WebSocket: {e}")

        logger.info(f"✅ CrewAI pipeline completed for user {user_id}")
        
        # Track AI usage for analytics
        try:
            track_ai_usage(
                user_id=user_id,
                task=task,
                db_id=db_info.get("id", 0),
                success=True,
                details={
                    "query_generated": query_str,
                    "agents_used": agents_called,
                    "visualization_created": visualize and visualization_output is not None
                }
            )
        except Exception as e:
            logger.warning(f"Failed to track AI usage: {e}")

        return {
            "success": True,
            "final_output": {
                "text": chat_output.get("message", ""),
                "visualization": visualization_output if visualize and visualization_output else None,
                "query": query_str
            },
            "agents_called": agents_called
        }

    except Exception as e:
        logger.exception("❌ CrewAI orchestration failed due to an exception:")
        
        # Update task context on error if it exists
        if 'task_context' in locals():
            task_context["status"] = "failed"
            task_context["errors"].append({
                "timestamp": time.time(),
                "error": str(e),
                "trace": traceback.format_exc()
            })
        
        # Send error notification via WebSocket
        try:
            loop = asyncio.get_running_loop() if hasattr(asyncio, 'get_running_loop') else asyncio.get_event_loop()
            loop.create_task(get_websocket_manager().send_error(
                user_id,
                f"Orchestration error: {str(e)}",
                {"trace": traceback.format_exc()}
            ))
            
            loop.create_task(get_websocket_manager().send_pipeline_end(
                user_id,
                False,
                f"Pipeline failed: {str(e)}"
            ))
        except Exception as ws_error:
            logger.warning(f"Failed to send error via WebSocket: {ws_error}")
        
        # Track failed usage
        try:
            track_ai_usage(
                user_id=user_id,
                task=task,
                db_id=db_info.get("id", 0) if 'db_info' in locals() else 0,
                success=False,
                details={
                    "error": str(e),
                    "agents_called": task_context.get("agents_called", []) if 'task_context' in locals() else []
                }
            )
        except Exception as track_error:
            logger.warning(f"Failed to track failed AI usage: {track_error}")
        
        return {
            "success": False,
            "error": f"Orchestration error: {str(e)}",
            "trace": traceback.format_exc()
        }
