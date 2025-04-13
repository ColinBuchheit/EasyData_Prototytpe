# agents/orchestrator_agent.py

from .base_agent import BaseAgent
from agents.chat_agent import ChatAgent
from agents.intent_agent import IntentAgent
from agents.schema_agent import SchemaAgent
from agents.query_agent import QueryAgent
from agents.validation_agent import ValidationAgent
from agents.analysis_agent import AnalysisAgent
from agents.memory_agent import MemoryAgent

class OrchestratorAgent(BaseAgent):
    def __init__(
        self,
        name: str,
        chat_agent: ChatAgent,
        intent_agent: IntentAgent,
        schema_agent: SchemaAgent,
        query_agent: QueryAgent,
        validation_agent: ValidationAgent,
        analysis_agent: AnalysisAgent,
        memory_agent: MemoryAgent
    ):
        super().__init__(name)
        self.chat_agent = chat_agent
        self.intent_agent = intent_agent
        self.schema_agent = schema_agent
        self.query_agent = query_agent
        self.validation_agent = validation_agent
        self.analysis_agent = analysis_agent
        self.memory_agent = memory_agent

    def run(self, task: dict) -> dict:
        print(f"[Orchestrator] Received task: {task['message']}")
        intent_result = self.intent_agent.run(task)
        intent = intent_result.get("intent", "chat")
        print(f"[Orchestrator] Intent classified as: {intent}")

        task["intent"] = intent

        if intent == "schema":
            return self.schema_agent.run(task)

        elif intent == "context":
            return self.memory_agent.run(task)

        elif intent in ["query", "multi-db"]:
            schema_result = self.schema_agent.run(task)
            if not schema_result.get("success"):
                return self.chat_agent.run({
                    **task,
                    "output": f"Failed to load schema: {schema_result.get('error')}"
                })

            task["schema"] = schema_result.get("schema")

            validation_result = self.validation_agent.run(task)
            if not validation_result.get("success"):
                return self.chat_agent.run({
                    **task,
                    "output": f"Query rejected: {validation_result.get('reason')}"
                })

            query_result = self.query_agent.run(task)
            if not query_result.get("success"):
                return self.chat_agent.run({
                    **task,
                    "output": f"Query execution failed: {query_result.get('error')}"
                })

            analysis = self.analysis_agent.run({"query_results": query_result})
            return self.chat_agent.run({
                **task,
                "output": analysis.get("summary", "No summary available."),
                "query": task["query"],
                "chart": analysis.get("chart_code", ""),
                "agents": ["intent", "schema", "query", "validation", "analysis"]
            })

        elif intent == "chat":
            return self.chat_agent.run(task)

        else:
            return self.chat_agent.run({
                **task,
                "output": f"I'm not sure how to handle intent: {intent}"
            })
