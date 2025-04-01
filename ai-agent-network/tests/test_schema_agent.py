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
        self.assertEqual(result["error"], "Test exception")
        
        # Verify logging
        mock_logger.exception.assert_called_once()
    
    @patch('agents.schema_agent.SchemaAgent._extract_tables_from_query')
    def test_validate_query_against_schema(self, mock_extract):
        """Test query validation against schema"""
        # Setup mock
        mock_extract.return_value = ["users", "orders"]
        
        # Test valid query
        with patch('agents.schema_agent.SchemaAgent.fetchAllTables', return_value=["users", "orders", "products"]):
            result = self.agent.validateQueryAgainstSchema("SELECT * FROM users JOIN orders", "postgres")
            self.assertTrue(result["isValid"])
        
        # Test invalid query with unknown tables
        with patch('agents.schema_agent.SchemaAgent.fetchAllTables', return_value=["products"]):
            result = self.agent.validateQueryAgainstSchema("SELECT * FROM users", "postgres")
            self.assertFalse(result["isValid"])
            self.assertIn("unknown tables", result["message"].lower())
    
    def test_extract_tables_from_query(self):
        """Test extracting table names from query"""
        # Basic SELECT query
        tables = self.agent.extractTablesFromQuery("SELECT * FROM users")
        self.assertEqual(tables, ["users"])
        
        # JOIN query
        tables = self.agent.extractTablesFromQuery("SELECT u.name FROM users u JOIN orders o ON u.id = o.user_id")
        self.assertIn("users", tables)
        self.assertIn("orders", tables)
        
        # Query with WHERE clause
        tables = self.agent.extractTablesFromQuery("SELECT * FROM products WHERE category = 'Electronics'")
        self.assertEqual(tables, ["products"])
        
        # Multiple JOINs
        tables = self.agent.extractTablesFromQuery(
            "SELECT * FROM orders JOIN users ON orders.user_id = users.id JOIN products ON orders.product_id = products.id"
        )
        self.assertEqual(set(tables), set(["orders", "users", "products"]))


if __name__ == "__main__":
    unittest.main()