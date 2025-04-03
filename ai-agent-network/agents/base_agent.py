from abc import ABC, abstractmethod
from typing import Dict, Any
import logging

from utils.logger import logger

class BaseAgent(ABC):
    """
    Abstract base class for all agents in the AI Agent Network.
    Provides common functionality and required interface.
    """

    def name(self) -> str:
        """Returns the name of the agent (default: class name)"""
        return self.__class__.__name__

    def info(self) -> Dict[str, Any]:
        """Returns metadata about the agent"""
        return {
            "name": self.name(),
            "description": self.__doc__ or "No description available",
            "version": "1.0.0"
        }

    @abstractmethod
    def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute the agent's main functionality.
        
        Args:
            input_data: Dictionary containing input data for the agent
            
        Returns:
            Dictionary containing the agent's output with at least a 'success' flag
        """
        pass

    def validate_output(self, output: Any) -> bool:
        """
        Validates the output of the agent for expected structure.
        
        Args:
            output: Agent output to validate
            
        Returns:
            True if output is valid, False otherwise
        """
        if not isinstance(output, dict):
            logger.warning(f"{self.name()}: Output is not a dictionary")
            return False
            
        if "success" not in output:
            logger.warning(f"{self.name()}: Output missing 'success' field")
            return False
            
        return True