# crew.py

from crewai import Agent
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

# === CrewAI Agent Wrappers (Descriptive Roles) ===

crew_schema_agent = Agent(
    name="Schema Agent",
    role="Database Schema Extractor",
    goal="Understand the database's structure so queries can be written correctly."
)

crew_query_agent = Agent(
    name="Query Agent",
    role="Query Generator",
    goal="Write a valid query from the user's natural language request."
)

crew_validation_agent = Agent(
    name="Validation Agent",
    role="Security Validator",
    goal="Ensure the query is safe, relevant, and logically correct."
)

crew_visualization_agent = Agent(
    name="Visualization Agent",
    role="Chart Generator",
    goal="Generate a chart if visualization is requested or appropriate."
)

crew_chat_agent = Agent(
    name="Chat Agent",
    role="Narrative Generator",
    goal="Explain the results to the user in a clear, friendly format."
)


# === Task Orchestration Function ===

def run_crew_pipeline(task: str, user_id: str, db_info: Dict[str, Any], visualize: bool = True) -> Dict[str, Any]:
    try:
        db = UserDatabase(**db_info)
        adapter = get_adapter_for_db(db.db_type)
        agents_called = []

        # Load previous context if any
        context = get_context(user_id) or {}
        logger.info(f"📦 Loaded context for user {user_id}: {context.keys()}")

        # Step 1: Schema Agent
        schema_result = SchemaAgent().run({"db": db, "adapter": adapter})
        agents_called.append("schema_agent")
        if not schema_result.get("success"):
            logger.error("❌ Schema agent failed.")
            return {"success": False, "error": "Schema extraction failed", "agents_called": agents_called}
        append_to_context(user_id, {"schema": schema_result})

        # Step 2: Query Agent
        query_result = QueryAgent().run({
            "task": task,
            "schema": schema_result,
            "db_type": db.db_type
        })
        agents_called.append("query_agent")
        if not query_result.get("success"):
            logger.error("❌ Query agent failed.")
            return {"success": False, "error": "Query generation failed", "agents_called": agents_called}
        append_to_context(user_id, {"query": query_result})

        # Step 3: Validation Agent
        validation_result = ValidationSecurityAgent().run({
            "task": task,
            "query": query_result["query"],
            "schema": schema_result
        })
        agents_called.append("validation_security_agent")
        if not validation_result.get("valid", False):
            logger.warning("⚠️ Query failed validation.")
            return {"success": False, "error": "Query failed validation", "agents_called": agents_called}

        # Step 4: Fetch from backend
        db_response = fetch_query_result(query=query_result["query"], db_info=db_info, user_id=user_id)
        append_to_context(user_id, {"query_result": db_response})

        # Step 5: Visualization (optional)
        visual_output = {}
        if visualize:
            visual_output = AnalysisVisualizationAgent().run({
                "task": task,
                "query_result": db_response
            })
            agents_called.append("analysis_visualization_agent")
            append_to_context(user_id, {"visualization": visual_output})

        # Step 6: Chat Agent
        chat_output = ChatAgent().run({
            "task": task,
            "query_result": db_response
        })
        agents_called.append("chat_agent")
        append_to_context(user_id, {"summary": chat_output.get("message")})

        # Step 7: Finalize context
        set_context(user_id, {
            "task": task,
            "query": query_result.get("query"),
            "response": chat_output.get("message"),
            "visual": visual_output.get("chart_code") if visual_output.get("success") else None
        })

        logger.info(f"✅ Crew pipeline completed for user {user_id}")
        return {
            "success": True,
            "final_output": {
                "text": chat_output.get("message"),
                "visualization": visual_output if visual_output.get("success") else None,
                "query": query_result["query"]
            },
            "agents_called": agents_called
        }

    except Exception as e:
        logger.exception("❌ Orchestration failed due to an exception:")
        return {
            "success": False,
            "error": f"Orchestration error: {str(e)}",
            "trace": traceback.format_exc()
        }
