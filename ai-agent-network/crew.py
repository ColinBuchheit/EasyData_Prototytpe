from crewai import Agent, Crew, Task
from typing import Dict, Any
import traceback
import json
import re


from agents.schema_agent import SchemaAgent
from agents.query_agent import QueryAgent
from agents.validation_security_agent import ValidationSecurityAgent
from agents.analysis_vizualization_agent import AnalysisVisualizationAgent
from agents.chat_agent import ChatAgent

from db_adapters.db_adapter_router import get_adapter_for_db
from db_adapters.base_db_adapters import UserDatabase

from utils.context_manager import get_context, set_context, append_to_context
from utils.backend_bridge import fetch_query_result, fetch_schema_for_user_db, save_conversation_to_backend
from utils.logger import logger
from utils.error_handling import handle_agent_error, ErrorSeverity

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

# === Execute Query Between Tasks ===
def execute_db_query(query: str, db_info: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """
    Sends a query to the backend for execution.
    Does NOT execute database queries directly.
    """
    try:
        logger.info(f"🔍 Sending query to backend for user {user_id}")
        result = fetch_query_result(query=query, db_info=db_info, user_id=user_id)
        append_to_context(user_id, {"query_result": result})
        return result
    except Exception as e:
        logger.exception("❌ Backend query execution failed:")
        return {"error": str(e)}

# === Main Orchestration Function ===
def run_crew_pipeline(task: str, user_id: str, db_info: Dict[str, Any], visualize: bool = True) -> Dict[str, Any]:
    try:
        context = get_context(user_id) or {}
        logger.info(f"📦 Loaded context for user {user_id}: {len(context.keys())} keys")

        # First, detect intent with Chat Agent
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
        if intent_type == "system_question":
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
        if intent_type in ["conversation", "unknown", "ambiguous"]:
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
        
        # Only proceed with database operations for "query" intent
        # Make a copy of db_info without the schema field to avoid errors
        db_info_copy = {k: v for k, v in db_info.items() if k != 'schema'}
        
        # Now use the backend bridge to fetch the actual schema - never make it up
        logger.info(f"🔍 Fetching real schema from backend for user {user_id}")
        
        schema_result = fetch_schema_for_user_db(db_info, user_id)
        
        if not schema_result.get("success", False):
            logger.error(f"❌ Failed to fetch schema from backend: {schema_result.get('error')}")
            return {
                "success": False,
                "error": f"Could not retrieve database schema: {schema_result.get('error')}",
                "agents_called": ["chat_agent"]
            }
        
        # Extract real schema from response
        schema_output = schema_result.get("schema", {})
        
        # If schema is empty or no tables, return error
        if not schema_output or not schema_output.get("tables", []):
            logger.warning("⚠️ No tables found in schema from backend")
            return {
                "success": False,
                "error": "No tables found in database schema.",
                "agents_called": ["chat_agent"]
            }
        
        # Now create the UserDatabase instance with the sanitized db_info
        db = UserDatabase(**db_info_copy)
        
        append_to_context(user_id, {"schema": schema_output})

        # Proceed with query generation
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

        append_to_context(user_id, {"query": query_output})
        
        # Continue with validation via ValidationSecurityAgent
        if not query_str or len(query_str.strip()) < 5:  # Very short query strings are likely errors
            logger.warning(f"⚠️ No valid query string generated for task: {task}")
            return {
                "success": False,
                "error": "Failed to generate a valid database query for your request.",
                "agents_called": ["chat_agent", "schema_agent", "query_agent"]
            }

        # Validation Step
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

        if not is_valid:
            logger.warning(f"⚠️ Query validation failed for user {user_id}: {reason}")
            return {
                "success": False,
                "error": f"Query failed validation checks: {reason}",
                "agents_called": ["chat_agent", "query_agent", "validation_agent"]
            }

        logger.info(f"✅ Query passed validation: {reason}")
        
        # Execute the query
        if not isinstance(query_str, str) or not query_str.strip():
            logger.error("⚠️ Query output is not a valid string.")
            return {
                "success": False,
                "error": "Query generation did not return a valid string.",
                "agents_called": ["chat_agent", "query_agent", "validation_agent"]
            }

        db_response = execute_db_query(query_str, db_info, user_id)

        if "error" in db_response:
            logger.error(f"❌ Query execution failed for user {user_id}")
            return {
                "success": False,
                "error": f"Database query execution failed: {db_response.get('error')}",
                "agents_called": ["chat_agent", "query_agent", "validation_agent"]
            }

        if not db_response or "rows" not in db_response:
            logger.warning("⚠️ No data returned from query, skipping visualization/chat agents.")
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

        if visualize and visualization_output:
            append_to_context(user_id, {"visualization": visualization_output})

        append_to_context(user_id, {"chat": chat_output})

        set_context(user_id, {
            "task": task,
            "query": query_str,
            "response": chat_output.get("message", ""),
            "visual": visualization_output.get("chart_code") if visualization_output else None
        })

        logger.info(f"✅ CrewAI pipeline completed for user {user_id}")

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
        return {
            "success": False,
            "error": f"Orchestration error: {str(e)}",
            "trace": traceback.format_exc()
        }
