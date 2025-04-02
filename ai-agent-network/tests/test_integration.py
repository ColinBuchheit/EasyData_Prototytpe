# tests/test_integration.py

import unittest
from unittest.mock import MagicMock, patch
import sys
import os

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
                ]
            }
        }

        self.mock_query_result = {"rows": [{"customer_id": 1, "total_value": 1500.0}]}

    def make_mock_agent(self, return_value):
        agent = MagicMock()
        agent.run.return_value = return_value
        return agent

    @patch('crew.CrewAIAgentAdapter.create_crew_agent')
    @patch('crew.get_adapter_for_db')
    @patch('crew.execute_db_query')
    @patch('crew.get_context', return_value=None)
    @patch('crew.set_context')
    @patch('crew.append_to_context')
    def test_complete_workflow(self, mock_append, mock_set, mock_get, mock_exec_query,
                               mock_get_adapter, mock_create_agent):

        # === Mock agent outputs ===
        schema_agent = self.make_mock_agent(self.mock_schema)
        query_agent = self.make_mock_agent("SELECT * FROM customers")
        validation_agent = self.make_mock_agent({
            "valid": True,
            "reason": "Query is valid"
        })
        viz_agent = self.make_mock_agent({
            "success": True,
            "chart_code": "plt.plot(...)"
        })
        chat_agent = self.make_mock_agent({
            "success": True,
            "message": "Here are the top customers."
        })

        # The order must match the order in crew.py
        mock_create_agent.side_effect = [
            schema_agent, query_agent, validation_agent, viz_agent, chat_agent
        ]

        mock_exec_query.return_value = self.mock_query_result
        mock_get_adapter.return_value = MagicMock()

        # === Run ===
        result = run_crew_pipeline(
            task_description=self.task_description,
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

        schema_agent.run.assert_called_once()
        query_agent.run.assert_called_once()
        validation_agent.run.assert_called_once()
        viz_agent.run.assert_called_once()
        chat_agent.run.assert_called_once()
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

        # === Mock agent outputs for failed validation ===
        schema_agent = self.make_mock_agent(self.mock_schema)
        query_agent = self.make_mock_agent("DROP TABLE customers;")
        validation_agent = self.make_mock_agent({
            "valid": False,
            "reason": "Query is unsafe: DROP operation"
        })

        # The rest won't run
        mock_create_agent.side_effect = [
            schema_agent, query_agent, validation_agent,
            self.make_mock_agent({}),  # viz
            self.make_mock_agent({})   # chat
        ]

        mock_get_adapter.return_value = MagicMock()

        # === Run ===
        result = run_crew_pipeline(
            task_description="Drop the customers table",
            user_id=self.user_id,
            db_info=self.db_info,
            visualize=True
        )

        # === Assert ===
        self.assertFalse(result["success"])
        self.assertIn("Query failed validation checks", result["error"])

        schema_agent.run.assert_called_once()
        query_agent.run.assert_called_once()
        validation_agent.run.assert_called_once()
        mock_exec_query.assert_not_called()


if __name__ == "__main__":
    unittest.main()
