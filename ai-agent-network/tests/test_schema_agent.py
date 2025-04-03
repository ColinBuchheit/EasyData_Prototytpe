# tests/test_schema_agent.py

import unittest
from unittest.mock import MagicMock, patch
import sys
import os
import json

# Add the parent directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents.schema_agent import SchemaAgent
from db_adapters.base_db_adapters import UserDatabase


class TestSchemaAgent(unittest.TestCase):
    
    def setUp(self):
        self.agent = SchemaAgent()
        self.mock_db = UserDatabase(
            db_type="postgres",
            host="localhost",
            port=5432,
            username="test_user",
            encrypted_password="test_password",
            database_name="test_db"
        )
        self.mock_adapter = MagicMock()
        
    @patch('agents.schema_agent.logger')
    def test_fetch_schema_success(self, mock_logger):
        """Test successful schema fetching"""
        # Mock the adapter's fetch_tables and fetch_schema methods
        self.mock_adapter.fetch_tables.return_value = ["users", "orders"]
        self.mock_adapter.fetch_schema.return_value = [
            {"name": "id", "type": "integer"},
            {"name": "name", "type": "varchar"}
        ]
        
        input_data = {
            "db": self.mock_db,
            "adapter": self.mock_adapter
        }
        
        result = self.agent._fetch_schema(input_data)
        
        # Verify the result is successful
        self.assertTrue(result["success"])
        self.assertIn("schema", result)
        self.assertEqual(result["schema"]["tables"], ["users", "orders"])
        self.assertEqual(len(result["schema"]["columns"]["users"]), 2)
        
        # Verify adapter methods were called correctly
        self.mock_adapter.fetch_tables.assert_called_once_with(self.mock_db)
        self.mock_adapter.fetch_schema.assert_any_call(self.mock_db, "users")
        self.mock_adapter.fetch_schema.assert_any_call(self.mock_db, "orders")
    
    @patch('agents.schema_agent.logger')
    def test_fetch_schema_no_tables(self, mock_logger):
        """Test schema fetching when no tables are found"""
        self.mock_adapter.fetch_tables.return_value = []
        
        input_data = {
            "db": self.mock_db,
            "adapter": self.mock_adapter
        }
        
        result = self.agent._fetch_schema(input_data)
        
        # Verify the result indicates failure
        self.assertFalse(result["success"])
        # Check for error object instead of direct string
        if isinstance(result["error"], dict) and "message" in result["error"]:
            self.assertEqual(result["error"]["message"], "No tables found in database.")
        else:
            self.assertEqual(result["error"], "No tables found in database.")
        
        # Verify adapter methods were called correctly
        self.mock_adapter.fetch_tables.assert_called_once_with(self.mock_db)
        self.mock_adapter.fetch_schema.assert_not_called()
    
    @patch('agents.schema_agent.logger')
    def test_fetch_schema_adapter_error(self, mock_logger):
        """Test schema fetching when adapter raises an exception"""
        self.mock_adapter.fetch_tables.side_effect = Exception("Test exception")
        
        input_data = {
            "db": self.mock_db,
            "adapter": self.mock_adapter
        }
        
        result = self.agent._fetch_schema(input_data)
        
        # Verify the result indicates failure
        self.assertFalse(result["success"])
        # Check for error object instead of direct string
        if isinstance(result["error"], dict) and "message" in result["error"]:
            self.assertIn("Test exception", result["error"]["message"])
        else:
            self.assertEqual(result["error"], "Test exception")
        
        # Verify logging
        mock_logger.exception.assert_called_once()
    
    @patch('agents.schema_agent.SchemaAgent._build_matching_prompt')
    def test_match_database_for_query(self, mock_build_prompt):
        """Test database matching for a query"""
        # Setup mock
        mock_build_prompt.return_value = "Mock prompt"
        
        with patch('openai.ChatCompletion.create') as mock_openai:
            mock_completion = MagicMock()
            mock_completion.choices[0].message.content = json.dumps({
                "selectedDbId": 123,
                "confidence": 0.9,
                "reasoning": "This is the most relevant database"
            })
            mock_openai.return_value = mock_completion
            
            result = self.agent._match_database_for_query({
                "userId": 1,
                "query": "SELECT * FROM users",
                "databases": [{"dbId": 123, "dbName": "test_db"}]
            })
            
            # Verify result
            self.assertTrue(result["success"])
            self.assertEqual(result["selectedDbId"], 123)
            self.assertAlmostEqual(result["confidence"], 0.9)
    
    @patch('agents.schema_agent.SchemaAgent._format_schema_for_prompt')
    def test_analyze_schema(self, mock_format):
        """Test schema analysis"""
        # Setup mock
        mock_format.return_value = "Formatted schema"
        
        with patch('openai.ChatCompletion.create') as mock_openai:
            mock_completion = MagicMock()
            mock_completion.choices[0].message.content = json.dumps({
                "tables": [{"name": "users", "purpose": "Store user data"}],
                "domainType": "Business",
                "contentDescription": "CRM system",
                "dataCategory": ["Users", "Orders"]
            })
            mock_openai.return_value = mock_completion
            
            result = self.agent._analyze_schema({
                "dbId": 123,
                "dbType": "postgres",
                "dbName": "test_db",
                "schemaDetails": [{"table": "users", "columns": []}]
            })
            
            # Verify result
            self.assertTrue(result["success"])
            self.assertEqual(result["domainType"], "Business")
            self.assertIn("tables", result)


if __name__ == "__main__":
    unittest.main()