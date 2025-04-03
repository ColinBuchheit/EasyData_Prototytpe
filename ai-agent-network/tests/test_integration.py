# tests/test_integration.py

import unittest
from unittest.mock import MagicMock, patch
import sys
import os
import json

# Add the parent directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from crew import run_crew_pipeline


class TestAgentNetwork(unittest.TestCase):
    def setUp(self):
        self.user_id = "test_user_123"
        self.db_info = {
            "db_type": "postgres",
            "host": "localhost",
            "port": 5432,
            "username": "test_user",
            "encrypted_password": "test_password",
            "database_name": "test_db"
        }
        self.task_description = "Show me the top 10 customers by order value"

        self.mock_schema = {
            "tables": ["customers", "orders", "order_items", "products"],
            "columns": {
                "customers": [
                    {"name": "id", "type": "integer"},
                    {"name": "name", "type": "varchar"},
                    {"name": "email", "type": "varchar"}
                ],
                "orders": [
                    {"name": "id", "type": "integer"},
                    {"name": "customer_id", "type": "integer"},
                    {"name": "order_value", "type": "decimal"}
                ]
            }
        }

        self.mock_query_result = {
            "rows": [{"customer_id": 1, "total_value": 1500.0}],
            "rowCount": 1
        }

    @patch('crew.CrewAIAgentAdapter.create_crew_agent')
    @patch('crew.get_adapter_for_db')
    @patch('crew.execute_db_query')
    @patch('crew.get_context', return_value=None)
    @patch('crew.set_context')
    @patch('crew.append_to_context')
    def test_complete_workflow(self, mock_append, mock_set, mock_get, mock_exec_query,
                           mock_get_adapter, mock_create_agent):
        """Test that the full workflow succeeds when validation passes"""
        
        # Create mock results objects
        initial_results = MagicMock()
        initial_results.schema_task = self.mock_schema
        initial_results.query_task = "SELECT * FROM customers"
        
        validation_results = MagicMock()
        # Use a string here, not a dictionary
        validation_results.validation_task = '{"valid": true, "reason": "Query is valid"}'
        
        final_results = MagicMock()
        final_results.visualization_task = {
            "success": True, 
            "visual_type": "bar", 
            "summary": "Chart summary", 
            "chart_code": "plt.plot(...)"
        }
        final_results.chat_task = {"success": True, "message": "Here are the results"}
        
        # Create mock Crew instances
        mock_initial_crew = MagicMock()
        mock_initial_crew.kickoff.return_value = initial_results
        
        mock_validation_crew = MagicMock()
        mock_validation_crew.kickoff.return_value = validation_results
        
        mock_final_crew = MagicMock()
        mock_final_crew.kickoff.return_value = final_results
        
        # Setup other mocks
        mock_get_adapter.return_value = MagicMock()
        mock_exec_query.return_value = self.mock_query_result
        
        # Patch the Crew constructor to return different instances
        with patch('crew.Crew', side_effect=[
            mock_initial_crew, mock_validation_crew, mock_final_crew
        ]):
            # Run the pipeline
            result = run_crew_pipeline(
                task=self.task_description,
                user_id=self.user_id,
                db_info=self.db_info,
                visualize=True
            )
        
        # === Assert ===
        self.assertTrue(result["success"])
        self.assertIn("final_output", result)
        self.assertIn("text", result["final_output"])
        self.assertIn("query", result["final_output"])
        self.assertIn("visualization", result["final_output"])
        
        # Verify each crew was used
        mock_initial_crew.kickoff.assert_called_once()
        mock_validation_crew.kickoff.assert_called_once()
        mock_final_crew.kickoff.assert_called_once()
        
        # Verify query was executed
        mock_exec_query.assert_called_once()

    @patch('crew.CrewAIAgentAdapter.create_crew_agent')
    @patch('crew.get_adapter_for_db')
    @patch('crew.execute_db_query')
    @patch('crew.get_context', return_value=None)
    @patch('crew.set_context')
    @patch('crew.append_to_context')
    def test_workflow_with_validation_failure(self, mock_append, mock_set, mock_get,
                                          mock_exec_query, mock_get_adapter,
                                          mock_create_agent):
        """Test that the workflow fails correctly when validation fails"""
        
        # Create mock results objects
        initial_results = MagicMock()
        initial_results.schema_task = self.mock_schema
        initial_results.query_task = "DROP TABLE customers;"
        
        validation_results = MagicMock()
        validation_results.validation_task = '{"valid": false, "reason": "Query is unsafe: DROP operation"}'
        
        # Create mock Crew instances
        mock_initial_crew = MagicMock()
        mock_initial_crew.kickoff.return_value = initial_results
        
        mock_validation_crew = MagicMock()
        mock_validation_crew.kickoff.return_value = validation_results
        
        # Setup other mocks
        mock_get_adapter.return_value = MagicMock()
        
        # Patch the Crew constructor to return different instances
        with patch('crew.Crew', side_effect=[
            mock_initial_crew, mock_validation_crew
        ]):
            # Run the pipeline
            result = run_crew_pipeline(
                task="Drop the customers table",
                user_id=self.user_id,
                db_info=self.db_info,
                visualize=True
            )
        
        # === Assert ===
        self.assertFalse(result["success"])
        self.assertIn("Query failed validation checks", result["error"])
        
        # Verify crews were used
        mock_initial_crew.kickoff.assert_called_once()
        mock_validation_crew.kickoff.assert_called_once()
        
        # Verify query was NOT executed since validation failed
        mock_exec_query.assert_not_called()


if __name__ == "__main__":
    unittest.main()