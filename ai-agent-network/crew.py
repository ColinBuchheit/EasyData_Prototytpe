# crew.py

import os
from dotenv import load_dotenv
from openai import OpenAI
from anthropic import Anthropic

from agents.analysis_agent import AnalysisAgent
from agents.chat_agent import ChatAgent
from agents.intent_agent import IntentAgent
from agents.memory_agent import MemoryAgent
from agents.orchestrator_agent import OrchestratorAgent
from agents.query_agent import QueryAgent
from agents.schema_agent import SchemaAgent
from agents.validation_agent import ValidationAgent

# Load .env values
load_dotenv()

# === Clients ===
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
claude_client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

# === Models ===
CHAT_MODEL = os.getenv("CHAT_MODEL", "gpt-4o")
INTENT_MODEL = os.getenv("INTENT_MODEL", "gpt-4o")
SCHEMA_MODEL = os.getenv("SCHEMA_ANALYSIS_MODEL", "claude-3-sonnet-20240229")
ANALYSIS_MODEL = os.getenv("ANALYSIS_MODEL", "claude-3-sonnet-20240229")
QUERY_MODEL = os.getenv("QUERY_AGENT_MODEL", "gpt-4o")
VALIDATION_MODEL = os.getenv("VALIDATION_MODEL", "gpt-4o")

# === Agents ===
chat_agent = ChatAgent("ChatAgent", openai_client, CHAT_MODEL)
intent_agent = IntentAgent("IntentAgent", openai_client, INTENT_MODEL)
schema_agent = SchemaAgent("SchemaAgent", claude_client, SCHEMA_MODEL)
query_agent = QueryAgent("QueryAgent", openai_client, QUERY_MODEL)
analysis_agent = AnalysisAgent("AnalysisAgent", claude_client, ANALYSIS_MODEL)
memory_agent = MemoryAgent("MemoryAgent")
validation_agent = ValidationAgent("ValidationAgent")


# === Orchestrator ===
orchestrator_agent = OrchestratorAgent(
    name="OrchestratorAgent",
    chat_agent=chat_agent,
    intent_agent=intent_agent,
    schema_agent=schema_agent,
    query_agent=query_agent,
    validation_agent=validation_agent,
    analysis_agent=analysis_agent,
    memory_agent=memory_agent
)

def build_agent_network():
    return orchestrator_agent
