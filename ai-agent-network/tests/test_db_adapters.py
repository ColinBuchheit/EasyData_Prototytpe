# tests/test_db_adapters.py

import unittest
from unittest.mock import MagicMock, patch
import sys
import os

# Add the parent directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db_adapters.base_db_adapters import BaseDBAdapter, UserDatabase
from db_adapters.db_adapter_router import get_adapter_for_db


class TestDBAdapter(BaseDBAdapter):
    """Concrete implementation of BaseDBAdapter for testing"""
    
    def __init__(self):
        self.connect_called = False
        self.fetch_tables_called = False
        self.fetch_schema_called = False
        self.run_query_called = False
    
    def _connect(self, db):
        self.connect_called = True
        return "mock_connection"
    
    def fetch_tables(self, db):
        self.fetch_tables_called = True
        return ["table1", "table2"]
    
    def fetch_schema(self, db, table):
        self.fetch_schema_called = True
        return [{"column": "id", "type": "int"}, {"column": "name", "type": "string"}]
    
    def run_query(self, db, query):
        self.run_query_called = True
        return [{"id": 1, "name": "test"}]


class TestBaseDBAdapter(unittest.TestCase):
    
    def setUp(self):
        self.adapter = TestDBAdapter()
        self.db = UserDatabase(
            db_type="test_db",
            host="localhost",
            port=5432,
            username="test_user",
            encrypted_password="test_password",
            database_name="test_db"
        )
    
    def test_fetch_tables_calls_connect(self):
        """Test that fetch_tables calls _connect"""
        self.adapter.fetch_tables(self.db)
        self.assertTrue(self.adapter.connect_called)
        self.assertTrue(self.adapter.fetch_tables_called)
    
    def test_fetch_schema_calls_connect(self):
        """Test that fetch_schema calls _connect"""
        self.adapter.fetch_schema(self.db, "table1")
        self.assertTrue(self.adapter.connect_called)
        self.assertTrue(self.adapter.fetch_schema_called)
    
    def test_run_query_calls_connect(self):
        """Test that run_query calls _connect"""
        self.adapter.run_query(self.db, "SELECT * FROM table1")
        self.assertTrue(self.adapter.connect_called)
        self.assertTrue(self.adapter.run_query_called)


class TestDBAdapterRouter(unittest.TestCase):
    
    @patch('db_adapters.db_adapter_router.PostgresAdapter')
    @patch('db_adapters.db_adapter_router.MySQLAdapter')
    @patch('db_adapters.db_adapter_router.MongoDBAdapter')
    def test_get_adapter_for_known_db_types(self, MockMongo, MockMySQL, MockPostgres):
        """Test that get_adapter_for_db returns the correct adapter for known DB types"""
        # Setup mocks
        MockPostgres.return_value = "postgres_adapter"
        MockMySQL.return_value = "mysql_adapter"
        MockMongo.return_value = "mongodb_adapter"
        
        # Test each supported adapter
        self.assertEqual(get_adapter_for_db("postgres"), "postgres_adapter")
        self.assertEqual(get_adapter_for_db("mysql"), "mysql_adapter")
        self.assertEqual(get_adapter_for_db("mongodb"), "mongodb_adapter")
        
    def test_get_adapter_for_unknown_db_type(self):
        """Test that get_adapter_for_db raises an exception for unknown DB types"""
        with self.assertRaises(ValueError):
            get_adapter_for_db("unknown_db_type")


if __name__ == "__main__":
    unittest.main()