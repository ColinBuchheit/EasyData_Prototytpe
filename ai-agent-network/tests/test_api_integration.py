# tests/test_api_integration.py

import unittest
from unittest.mock import MagicMock, patch
import sys
import os
import json
import requests
from fastapi.testclient import TestClient

# Add the parent directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the server app
from server import app

# Create a test client
client = TestClient(app)

class TestAPIIntegration(unittest.TestCase):
    
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
    
    def test_root_endpoint(self):
        """Test the root endpoint returns proper status"""
        response = client.get("/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "ok")
        self.assertIn("version", data)
    
    def test_health_endpoint(self):
        """Test the health endpoint returns status info"""
        # Mock Redis ping to avoid real Redis dependency
        with patch('server.get_redis_client') as mock_redis:
            mock_client = MagicMock()
            mock_client.ping.return_value = True
            mock_redis.return_value = mock_client
            
            response = client.get("/api/v1/health")
            self.assertEqual(response.status_code, 200)
            data = response.json()
            self.assertIn("status", data)
            self.assertIn("services", data)
            self.assertIn("redis", data["services"])
            self.assertIn("api", data["services"])
    
    @patch('server.run_crew_pipeline')
    def test_run_pipeline_endpoint(self, mock_run_pipeline):
        """Test the run pipeline endpoint with mocked crew pipeline"""
        # Setup mock return value
        mock_run_pipeline.return_value = {
            "success": True,
            "final_output": {
                "text": "Here are the top customers by order value.",
                "query": "SELECT * FROM customers"
            }
        }
        
        # Call the endpoint
        response = client.post(
            "/api/v1/run",
            json={
                "task": self.task_description,
                "user_id": self.user_id,
                "db_info": self.db_info,
                "visualize": True
            }
        )
        
        # Check response
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertIn("final_output", data)
        
        # Verify pipeline was called with correct arguments
        mock_run_pipeline.assert_called_once_with(
            task=self.task_description,
            user_id=self.user_id,
            db_info=self.db_info,
            visualize=True
        )
    
    @patch('db_adapters.db_adapter_router.check_db_connection')
    def test_database_health_endpoint(self, mock_check_db):
        """Test the database health check endpoint"""
        # Setup mock return value
        mock_check_db.return_value = {
            "status": "ok",
            "message": "Successfully connected to postgres database",
            "tables_count": 5
        }
        
        # Call the endpoint
        response = client.post(
            "/api/v1/health/database",
            json={"db_info": self.db_info}
        )
        
        # Check response
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "ok")
        self.assertIn("tables_count", data)
        
        # Verify check_db_connection was called
        mock_check_db.assert_called_once_with(self.db_info)
    
    def test_error_handling(self):
        """Test error handling in the API endpoints"""
        # Test with missing required fields
        response = client.post(
            "/api/v1/run",
            json={"user_id": self.user_id}  # Missing task and db_info
        )
        self.assertEqual(response.status_code, 422)  # Validation error


if __name__ == "__main__":
    unittest.main()