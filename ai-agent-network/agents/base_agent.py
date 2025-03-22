from abc import ABC, abstractmethod
from typing import Dict, Any
from utils.logger import logger


class BaseAgent(ABC):
    """
    Abstract base class for all AI Agents.
    All agents must implement `.run()` and can override `.name()` and `.info()`.
    """

    @abstractmethod
    def run(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main agent logic to be implemented by subclasses.
        Args:
            input_data (dict): Input context.
        Returns:
            dict: Output with at least a `success` key.
        """
        pass

    def name(self) -> str:
        """
        Returns the name of the agent.
        Default: class name.
        """
        return self.__class__.__name__

    def info(self) -> Dict[str, str]:
        """
        Returns metadata about the agent.
        Used for documentation, introspection, or logging.
        """
        return {
            "name": self.name(),
            "description": "No description provided.",
            "version": "1.0.0"
        }

    def validate_output(self, output: Dict[str, Any]) -> bool:
        """
        Optional utility: check that `run()` returns at least a success flag.
        Can be extended in child classes.
        """
        if not isinstance(output, dict):
            logger.warning(f"[{self.name()}] Output is not a dict.")
            return False
        if "success" not in output:
            logger.warning(f"[{self.name()}] Output missing 'success' key.")
            return False
        return True
