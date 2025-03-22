from crewai import Agent, Crew, Task
from typing import Dict, Any
import traceback

from agents.schema_agent import SchemaAgent
from agents.query_agent import QueryAgent
from agents.validation_security_agent import ValidationSecurityAgent
from agents.analysis_vizualization_agent import AnalysisVisualizationAgent
from agents.chat_agent import ChatAgent

from db_adapters.db_adapter_router import get_adapter_for_db
from db_adapters.base_db_adapters import UserDatabase

from utils.context_cache import get_context, set_context, append_to_context
from utils.backend_bridge import fetch_query_result
from utils.logger import logger

# Import the adapter for CrewAI integration
from crewai_adapter import CrewAIAgentAdapter

# === Create Base Agent Instances ===
schema_agent_impl = SchemaAgent()
query_agent_impl = QueryAgent()
validation_agent_impl = ValidationSecurityAgent()
analysis_viz_agent_impl = AnalysisVisualizationAgent()
chat_agent_impl = ChatAgent()

# === CrewAI Agent Wrappers with Adapter ===
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

# === Function to execute database queries ===
def execute_db_query(query: str, db_info: Dict[str, Any], user_id: str) -> Dict[str, Any]:
    """
    Execute the database query between CrewAI tasks.
    """
    try:
        logger.info(f"🔍 Executing query for user {user_id}")
        result = fetch_query_result(query=query, db_info=db_info, user_id=user_id)
        append_to_context(user_id, {"query_result": result})
        return result
    except Exception as e:
        logger.exception("❌ Database query execution failed:")
        return {"error": str(e)}

# === Task Orchestration Function ===
def run_crew_pipeline(task_description: str, user_id: str, db_info: Dict[str, Any], visualize: bool = True) -> Dict[str, Any]:
    try:
        # Initialize DB and adapter
        db = UserDatabase(**db_info)
        adapter = get_adapter_for_db(db.db_type)
        
        # Load previous context if any
        context = get_context(user_id) or {}
        logger.info(f"📦 Loaded context for user {user_id}: {len(context.keys())} keys")
        
        # Define CrewAI tasks
        schema_task = Task(
            description="Extract and organize the database schema",
            agent=crew_schema_agent,
            expected_output="Complete database schema information",
            context={"db": db, "adapter": adapter}
        )
        
        query_task = Task(
            description=f"Generate a database query for task: {task_description}",
            agent=crew_query_agent,
            expected_output="Valid database query string",
            context={"task": task_description, "db_type": db.db_type},
            dependencies=[schema_task]
        )
        
        validation_task = Task(
            description="Validate the query for security and logical correctness",
            agent=crew_validation_agent,
            expected_output="Validation result with safety assessment",
            context={"task": task_description},
            dependencies=[query_task, schema_task]
        )
        
        # Tasks to include in the crew
        crew_tasks = [schema_task, query_task, validation_task]
        agents_called = ["schema_agent", "query_agent", "validation_agent"]
        
        # Create the crew with initial tasks
        crew = Crew(
            agents=[
                crew_schema_agent, 
                crew_query_agent,
                crew_validation_agent,
                crew_visualization_agent,
                crew_chat_agent
            ],
            tasks=crew_tasks,
            verbose=True,
            process=Crew.SEQUENTIAL  # Start with sequential processing for the first tasks
        )
        
        # Execute initial tasks
        logger.info(f"🚀 Starting CrewAI pipeline for user {user_id} with task: {task_description}")
        initial_results = crew.kickoff()
        
        # Check validation result
        schema_output = initial_results.get("schema_task", {})
        query_output = initial_results.get("query_task", {})
        validation_output = initial_results.get("validation_task", {})
        
        # Update context with initial results
        append_to_context(user_id, {"schema": schema_output})
        append_to_context(user_id, {"query": query_output})
        append_to_context(user_id, {"validation": validation_output})
        
        # Check if query is valid and can be executed
        if not validation_output or validation_output.get("valid") is False:
            logger.warning(f"⚠️ Query validation failed for user {user_id}")
            return {
                "success": False, 
                "error": "Query failed validation checks",
                "agents_called": agents_called
            }
        
        # Execute the query
        query = query_output
        db_response = execute_db_query(query, db_info, user_id)
        
        if "error" in db_response:
            logger.error(f"❌ Query execution failed for user {user_id}")
            return {
                "success": False,
                "error": f"Database query execution failed: {db_response.get('error')}",
                "agents_called": agents_called
            }
        
        # Define remaining tasks with query result context
        remaining_tasks = []
        
        if visualize:
            visualization_task = Task(
                description=f"Create visualization for query results of: {task_description}",
                agent=crew_visualization_agent,
                expected_output="Visualization code and summary",
                context={
                    "task": task_description,
                    "query_result": db_response
                }
            )
            remaining_tasks.append(visualization_task)
            agents_called.append("analysis_visualization_agent")
        
        chat_task = Task(
            description=f"Explain query results in user-friendly terms: {task_description}",
            agent=crew_chat_agent,
            expected_output="User-friendly explanation of results",
            context={
                "task": task_description,
                "query_result": db_response,
                "tone": "friendly"
            }
        )
        remaining_tasks.append(chat_task)
        agents_called.append("chat_agent")
        
        # Create a new crew for the remaining tasks
        remaining_crew = Crew(
            agents=[crew_visualization_agent, crew_chat_agent],
            tasks=remaining_tasks,
            verbose=True,
            process=Crew.PARALLEL if visualize else Crew.SEQUENTIAL  # Parallel if visualization is included
        )
        
        # Execute remaining tasks
        final_results = remaining_crew.kickoff()
        
        # Extract visualization and chat results
        visualization_output = final_results.get("visualization_task", {}) if visualize else None
        chat_output = final_results.get("chat_task", {})
        
        # Update final context
        if visualize and visualization_output:
            append_to_context(user_id, {"visualization": visualization_output})
        
        append_to_context(user_id, {"chat": chat_output})
        
        # Set final context
        set_context(user_id, {
            "task": task_description,
            "query": query,
            "response": chat_output.get("message", ""),
            "visual": visualization_output.get("chart_code") if visualization_output else None
        })
        
        logger.info(f"✅ CrewAI pipeline completed for user {user_id}")
        
        return {
            "success": True,
            "final_output": {
                "text": chat_output.get("message", ""),
                "visualization": visualization_output if visualize and visualization_output else None,
                "query": query
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