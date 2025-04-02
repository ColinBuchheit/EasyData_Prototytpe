# crewai_adapter.py

from typing import Dict, Any, Callable
from crewai import Agent as CrewAgent
from utils.logger import logger
import os
from dotenv import load_dotenv
load_dotenv()

os.environ["OPENAI_API_KEY"] = os.getenv("OPENAI_API_KEY")
os.environ["ANTHROPIC_API_KEY"] = os.getenv("ANTHROPIC_API_KEY", "")

class CrewAIAgentAdapter:
    """
    Adapter class to bridge your BaseAgent implementations with CrewAI Agents.
    This lets you use your existing agent code with CrewAI's orchestration.
    """
    
    @classmethod
    def adapt_agent(cls, base_agent_instance, role: str, goal: str) -> Callable:
        """
        Creates a function that wraps your BaseAgent's run method to be compatible
        with CrewAI's expected interface.
        
        Args:
            base_agent_instance: An instance of a class that inherits from BaseAgent
            role: The agent's role description for CrewAI
            goal: The agent's goal description for CrewAI
            
        Returns:
            A function that can be used as CrewAI Agent's _execute method
        """
        agent_name = base_agent_instance.__class__.__name__
        
        def _execute_task(task, context=None):
            logger.info(f"🔄 CrewAI executing {agent_name} with task: {task}")
            
            # Map CrewAI context to your agent's expected input format
            input_data = context or {}
            
            # Add the task description to input_data
            input_data["task"] = task
            
            # Execute your agent's run method
            result = base_agent_instance.run(input_data)
            
            if not result.get("success", False):
                error_msg = result.get("error", "Unknown error")
                logger.error(f"❌ {agent_name} failed: {error_msg}")
                return f"Failed: {error_msg}"
            
            # Extract the relevant output based on agent type
            if "query" in result:
                return result["query"]
            elif "message" in result:
                return result["message"]
            elif "chart_code" in result:
                return {
                    "visual_type": result.get("visual_type", ""),
                    "summary": result.get("summary", ""),
                    "chart_code": result.get("chart_code", "")
                }
            elif "valid" in result:
                return {"valid": result["valid"], "reason": result.get("reason", "")}
            elif "schema" in result:
                return result["schema"]
            else:
                return str(result)
        
        return _execute_task

    @classmethod
    def create_crew_agent(cls, base_agent_instance, role: str, goal: str, name: str = None, **kwargs) -> CrewAgent:
        """
        Creates a CrewAI Agent that wraps your BaseAgent implementation.
        
        Args:
            base_agent_instance: An instance of a class that inherits from BaseAgent
            role: The agent's role description
            goal: The agent's goal description
            name: Optional name for the agent
            **kwargs: Additional CrewAgent parameters
            
        Returns:
            A CrewAI Agent instance
        """
        executor = cls.adapt_agent(base_agent_instance, role, goal)
        agent_name = name or base_agent_instance.__class__.__name__
        
        return CrewAgent(
            name=agent_name,
            role=role,
            goal=goal,
            backstory=f"I am an AI agent specialized in {role.lower()}.",
            allow_delegation=False,
            verbose=True,
            **kwargs,
            _execute=executor
        )