# tests/test_integration.py

import unittest
from unittest.mock import MagicMock, patch
import sys
import os
import json

# Add the parent directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import necessary modules
from agents.schema_agent import SchemaAgent
from agents.query_agent import QueryAgent
from agents.validation_security_agent import ValidationSecurityAgent
from agents.analysis_vizualization_agent import AnalysisVisualizationAgent
from agents.chat_agent import ChatAgent
from db_adapters.base_db_adapters import UserDatabase
from crew import run_crew_pipeline


class TestAgentNetwork(unittest.TestCase):
    
    def setUp(self):
        # Prepare test data
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
        
        # Set up schema mock data
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
                    {"name": "order_date", "type": "date"},
                    {"name": "total_amount", "type": "decimal"}
                ],
                "order_items": [
                    {"name": "id", "type": "integer"},
                    {"name": "order_id", "type": "integer"},
                    {"name": "product_id", "type": "integer"},
                    {"name": "quantity", "type": "integer"},
                    {"name": "price", "type": "decimal"}
                ],
                "products": [
                    {"name": "id", "type": "integer"},
                    {"name": "name", "type": "varchar"},
                    {"name": "price", "type": "decimal"},
                    {"name": "category", "type": "varchar"}
                ]
            }
        }
        
        # Mock query result
        self.mock_query_result = [
            {"customer_id": 1, "customer_name": "Alice", "total_value": 1500.00},
            {"customer_id": 2, "customer_name": "Bob", "total_value": 1200.00},
            {"customer_id": 3, "customer_name": "Charlie", "total_value": 900.00}
        ]
    
    @patch('crew.SchemaAgent')
    @patch('crew.QueryAgent')
    @patch('crew.ValidationSecurityAgent')
    @patch('crew.AnalysisVisualizationAgent')
    @patch('crew.ChatAgent')
    @patch('crew.get_adapter_for_db')
    @patch('crew.execute_db_query')
    @patch('crew.set_context')
    @patch('crew.get_context')
    @patch('crew.append_to_context')
    def test_complete_workflow(self, mock_append_context, mock_get_context, mock_set_context, 
                              mock_execute_query, mock_get_adapter, mock_chat_agent, 
                              mock_viz_agent, mock_validation_agent, mock_query_agent, 
                              mock_schema_agent):
        """Test the complete agent workflow pipeline"""
        # Setup mocks
        mock_get_context.return_value = None
        
        # Schema agent mock
        schema_instance = MagicMock()
        schema_instance.run.return_value = {
            "success": True,
            "schema": self.mock_schema
        }
        mock_schema_agent.return_value = schema_instance
        
        # Query agent mock
        query_instance = MagicMock()
        query_instance.run.return_value = {
            "success": True,
            "query": "SELECT c.id as customer_id, c.name as customer_name, SUM(o.total_amount) as total_value FROM customers c JOIN orders o ON c.id = o.customer_id GROUP BY c.id, c.name ORDER BY total_value DESC LIMIT 10"
        }
        mock_query_agent.return_value = query_instance
        
        # Validation agent mock
        validation_instance = MagicMock()
        validation_instance.run.return_value = {
            "success": True,
            "valid": True,
            "reason": "Query is safe and aligned with task intent"
        }
        mock_validation_agent.return_value = validation_instance
        
        # Execute query mock
        mock_execute_query.return_value = self.mock_query_result
        
        # Visualization agent mock
        viz_instance = MagicMock()
        viz_instance.run.return_value = {
            "success": True,
            "visual_type": "bar",
            "summary": "Bar chart showing top customers by order value",
            "chart_code": "import matplotlib.pyplot as plt\n..."
        }
        mock_viz_agent.return_value = viz_instance
        
        # Chat agent mock
        chat_instance = MagicMock()
        chat_instance.run.return_value = {
            "success": True,
            "message": "Here are the top customers by order value. Alice has the highest total order value at $1,500.00..."
        }
        mock_chat_agent.return_value = chat_instance
        
        # DB adapter mock
        mock_adapter = MagicMock()
        mock_get_adapter.return_value = mock_adapter
        
        # Execute the pipeline
        result = run_crew_pipeline(
            task_description=self.task_description,
            user_id=self.user_id,
            db_info=self.db_info,
            visualize=True
        )
        
        # Assert the pipeline completed successfully
        self.assertTrue(result["success"])
        self.assertIn("final_output", result)
        self.assertIn("text", result["final_output"])
        self.assertIn("visualization", result["final_output"])
        self.assertIn("query", result["final_output"])
        
        # Verify all agents were called
        schema_instance.run.assert_called_once()
        query_instance.run.assert_called_once()
        validation_instance.run.assert_called_once()
        viz_instance.run.assert_called_once()
        chat_instance.run.assert_called_once()
        mock_execute_query.assert_called_once()
    
    @patch('crew.execute_db_query')
    @patch('crew.get_adapter_for_db')
    @patch('crew.set_context')
    @patch('crew.get_context')
    def test_workflow_with_validation_failure(self, mock_get_context, mock_set_context, 
                                            mock_get_adapter, mock_execute_query):
        """Test workflow when validation fails"""
        # Set up mocks for a failed validation scenario
        mock_get_context.return_value = None
        
        # Use real methods but with mocked dependencies
        with patch('crew.SchemaAgent') as mock_schema_agent, \
             patch('crew.QueryAgent') as mock_query_agent, \
             patch('crew.ValidationSecurityAgent') as mock_validation_agent:
            
            # Schema agent mock
            schema_instance = MagicMock()
            schema_instance.run.return_value = {
                "success": True,
                "schema": self.mock_schema
            }
            mock_schema_agent.return_value = schema_instance
            
            # Query agent mock - generate an unsafe query
            query_instance = MagicMock()
            query_instance.run.return_value = {
                "success": True,
                "query": "DROP TABLE customers; --"
            }
            mock_query_agent.return_value = query_instance
            
            # Validation agent mock - should reject the unsafe query
            validation_instance = MagicMock()
            validation_instance.run.return_value = {
                "success": True,
                "valid": False,
                "reason": "Query contains dangerous operations (DROP)"
            }
            mock_validation_agent.return_value = validation_instance
            
            # Execute the pipeline
            result = run_crew_pipeline(
                task_description="Drop the customers table",
                user_id=self.user_id,
                db_info=self.db_info,
                visualize=True
            )
            
            # Assert the pipeline failed at validation
            self.assertFalse(result["success"])
            self.assertIn("error", result)
            self.assertIn("validation checks", result["error"])
            
            # Verify validation was performed but query execution was not called
            schema_instance.run.assert_called_once()
            query_instance.run.assert_called_once()
            validation_instance.run.assert_called_once()
            mock_execute_query.assert_not_called()


if __name__ == "__main__":
    unittest.main()