# tests/test_base_agent.py

import unittest
from unittest.mock import MagicMock, patch
import sys
import os

# Add the parent directory to sys.path so we can import from the agent modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.base_agent import BaseAgent


class TestAgent(BaseAgent):
    """Test implementation of BaseAgent for testing purposes"""
    
    def run(self, input_data):
        if "test_success" in input_data:
            return {"success": True, "message": "Test successful"}
        elif "test_error" in input_data:
            return {"success": False, "error": "Test error"}
        elif "test_raise" in input_data:
            raise Exception("Test exception")
        else:
            return {"some_key": "some_value"}  # Missing success key


class TestBaseAgent(unittest.TestCase):
    
    def setUp(self):
        self.agent = TestAgent()
    
    def test_name_method(self):
        """Test that name() returns the class name by default"""
        self.assertEqual(self.agent.name(), "TestAgent")
    
    def test_info_method(self):
        """Test that info() returns the expected metadata"""
        info = self.agent.info()
        self.assertEqual(info["name"], "TestAgent")
        self.assertIn("description", info)
        self.assertIn("version", info)
        
    def test_validate_output_with_success(self):
        """Test validation of a valid output with success flag"""
        result = self.agent.run({"test_success": True})
        self.assertTrue(self.agent.validate_output(result))
        
    def test_validate_output_with_failure(self):
        """Test validation of a valid output with failure flag"""
        result = self.agent.run({"test_error": True})
        self.assertTrue(self.agent.validate_output(result))
        
    def test_validate_output_missing_success(self):
        """Test validation of an invalid output missing success flag"""
        result = self.agent.run({})
        self.assertFalse(self.agent.validate_output(result))
        
    def test_validate_output_not_dict(self):
        """Test validation of an invalid non-dict output"""
        self.assertFalse(self.agent.validate_output("not a dict"))
    
    @patch('agents.base_agent.logger')
    def test_logging_on_validation(self, mock_logger):
        """Test that validation logs appropriate messages"""
        # Test valid output
        self.agent.validate_output({"success": True})
        mock_logger.warning.assert_not_called()
        
        # Test invalid output (not a dict)
        mock_logger.reset_mock()
        self.agent.validate_output("not a dict")
        mock_logger.warning.assert_called_once()
        
        # Test invalid output (missing success)
        mock_logger.reset_mock()
        self.agent.validate_output({})
        mock_logger.warning.assert_called_once()


if __name__ == "__main__":
    unittest.main()