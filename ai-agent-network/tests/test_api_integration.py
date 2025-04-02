# tests/test_api_integration.py

import unittest
from unittest.mock import MagicMock, patch
import sys
import os
import json
from fastapi.testclient import TestClient

# Add the parent directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the server app
from server import app

# Create a test client
client = TestClient(app)

class TestAPIIntegration(unittest.TestCase):
    
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
    
    def test_root_endpoint(self):
        response = client.get("/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "ok")
        self.assertIn("version", data)
    
    def test_health_endpoint(self):
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
        mock_run_pipeline.return_value = {
            "success": True,
            "final_output": {
                "text": "Here are the top customers by order value.",
                "query": "SELECT * FROM customers"
            }
        }

        response = client.post(
            "/api/v1/run",
            json={
                "task": self.task_description,
                "user_id": self.user_id,
                "db_info": self.db_info,
                "visualize": True
            }
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["success"])
        self.assertIn("final_output", data)
        mock_run_pipeline.assert_called_once_with(
            task=self.task_description,
            user_id=self.user_id,
            db_info=self.db_info,
            visualize=True
        )

    @patch('server.check_db_connection')
    def test_database_health_endpoint(self, mock_check_db):
        mock_check_db.return_value = {
            "status": "ok",
            "message": "Successfully connected to postgres database",
            "tables_count": 5
        }

        response = client.post(
            "/api/v1/health/database",
            json={"db_info": self.db_info}
        )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "ok")
        self.assertIn("tables_count", data)
        mock_check_db.assert_called_once_with(self.db_info)

    def test_error_handling(self):
        response = client.post(
            "/api/v1/run",
            json={"user_id": self.user_id}  # Missing task and db_info
        )
        self.assertEqual(response.status_code, 422)


if __name__ == "__main__":
    unittest.main()
