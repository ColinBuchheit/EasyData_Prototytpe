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
from utils.backend_bridge import fetch_query_result
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
    role="Narrative Generator",
    goal="Explain the results to the user in a clear, friendly format.",
    name="Chat Agent"
)

# === Execute Query Between Tasks ===
def execute_db_query(query: str, db_info: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    try:
        logger.info(f"🔍 Executing query for user {user_id}")
        result = fetch_query_result(query=query, db_info=db_info, user_id=user_id)
        append_to_context(user_id, {"query_result": result})
        return result
    except Exception as e:
        logger.exception("❌ Database query execution failed:")
        return {"error": str(e)}

# === Main Orchestration Function ===
def run_crew_pipeline(task_description: str, user_id: str, db_info: Dict[str, Any], visualize: bool = True) -> Dict[str, Any]:
    try:
        db = UserDatabase(**db_info)
        adapter = get_adapter_for_db(db.db_type)

        context = get_context(user_id) or {}
        logger.info(f"📦 Loaded context for user {user_id}: {len(context.keys())} keys")

        schema_task = Task(
            identifier="schema_task",
            description="Extract and organize the database schema",
            agent=crew_schema_agent,
            expected_output="Complete database schema information",
            context=[{
                "description": "Database connection and adapter used for schema extraction",
                "expected_output": "Structured representation of database schema (tables, columns, types)",
                "db": db,
                "adapter": adapter
            }]
        )

        query_task = Task(
            identifier="query_task",
            description=f"Generate a database query for task: {task_description}",
            agent=crew_query_agent,
            expected_output="Valid database query string",
            context=[{
                "description": "User's natural language request and database type",
                "expected_output": "A valid SQL or NoSQL query",
                "task": task_description,
                "db_type": db.db_type
            }],
            dependencies=[schema_task]
        )

        crew_tasks = [schema_task, query_task]
        agents_called = ["schema_agent", "query_agent"]

        crew = Crew(
            agents=[crew_schema_agent, crew_query_agent, crew_validation_agent, crew_visualization_agent, crew_chat_agent],
            tasks=crew_tasks,
            verbose=True,
            process="sequential"
        )

        logger.info(f"🚀 Starting CrewAI pipeline for user {user_id} with task: {task_description}")
        initial_results = crew.kickoff()

        schema_output = getattr(initial_results, "schema_task", {})
        query_output = getattr(initial_results, "query_task", "")

        # Safely extract query string
        if isinstance(query_output, dict):
            query_str = query_output.get("query") or query_output.get("output") or ""
        elif isinstance(query_output, str):
            query_str = query_output
        else:
            query_str = ""

        append_to_context(user_id, {"schema": schema_output})
        append_to_context(user_id, {"query": query_output})

        # Validation Step
        validation_task = Task(
            identifier="validation_task",
            description="Validate the query for security and logical correctness",
            agent=crew_validation_agent,
            expected_output='Strict JSON: { "valid": true|false, "reason": "explanation" }',
            context=[{
                "description": "Validate this query strictly.",
                "expected_output": 'Strict JSON: { "valid": true|false, "reason": "explanation" }',
                "task": task_description,
                "query": query_str
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

        # Optional logging for debug
        logger.debug(f"🧪 Raw validation output from agent:\n{validation_raw}")

        # Clean and parse output
        if isinstance(validation_raw, str):
            # Remove ```json or ``` if wrapped
            validation_raw = re.sub(r"^```(json)?|```$", "", validation_raw.strip(), flags=re.MULTILINE).strip()
            try:
                validation_output = json.loads(validation_raw)
            except json.JSONDecodeError:
                logger.error("❌ Validation agent returned invalid JSON.")
                return {
                    "success": False,
                    "error": "Validation agent did not return valid JSON format.",
                    "agents_called": agents_called
                }
        elif isinstance(validation_raw, dict):
            validation_output = validation_raw
        else:
            validation_output = {}

        # Safely extract validity and reason
        is_valid = validation_output.get("valid") is True
        reason = validation_output.get("reason", "Validation failed with no reason provided.")

        if not is_valid:
            logger.warning(f"⚠️ Query validation failed for user {user_id}: {reason}")
            return {
                "success": False,
                "error": f"Query failed validation checks: {reason}",
                "agents_called": agents_called
            }

        logger.info(f"✅ Query passed validation: {reason}")
        # Execute the query
        if not isinstance(query_str, str) or not query_str.strip():
            logger.error("⚠️ Query output is not a valid string.")
            return {
                "success": False,
                "error": "Query generation did not return a valid string.",
                "agents_called": agents_called
            }

        db_response = execute_db_query(query_str, db_info, user_id)

        if "error" in db_response:
            logger.error(f"❌ Query execution failed for user {user_id}")
            return {
                "success": False,
                "error": f"Database query execution failed: {db_response.get('error')}",
                "agents_called": agents_called
            }

        if not db_response or "rows" not in db_response:
            logger.warning("⚠️ No data returned from query, skipping visualization/chat agents.")
            return {
                "success": False,
                "error": "No data returned from database.",
                "query": query_str,
                "agents_called": agents_called
            }

        # Continue to Visualization and Chat Agents
        remaining_tasks = []

        if visualize:
            visualization_task = Task(
                identifier="visualization_task",
                description=f"Create visualization for query results of: {task_description}",
                agent=crew_visualization_agent,
                expected_output="Visualization code and summary",
                context=[{
                    "description": "Query result and task details to visualize data",
                    "expected_output": "Python chart code and a summary",
                    "task": task_description,
                    "query_result": db_response
                }]
            )
            remaining_tasks.append(visualization_task)
            agents_called.append("analysis_visualization_agent")

        chat_task = Task(
            identifier="chat_task",
            description=f"Explain query results in user-friendly terms: {task_description}",
            agent=crew_chat_agent,
            expected_output="User-friendly explanation of results",
            context=[{
                "description": "Query result and user task to explain in plain language",
                "expected_output": "Natural language summary with friendly tone",
                "task": task_description,
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
            "task": task_description,
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
