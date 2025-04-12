# utils/system_context.py

from typing import Dict, Any, List, Optional
import os
import json
from utils.logger import logger
from utils.backend_bridge import fetch_schema_for_user_db

class SystemContextManager:
    """
    Manages system-level context information about databases, connections,
    and other metadata that should be available to agents.
    
    This provides a single source of truth for system information and prevents
    agents from making up answers about the system state.
    """
    
    @staticmethod
    async def get_connected_databases(user_id: str) -> List[Dict[str, Any]]:
        """
        Fetches the list of databases the user is connected to from the backend.
        
        Args:
            user_id: The user ID to get connections for
            
        Returns:
            List of database connection info dictionaries
        """
        try:
            # This would need to be implemented in backend_bridge.py
            from utils.backend_bridge import fetch_user_connections
            
            connections = await fetch_user_connections(user_id)
            return connections
        except Exception as e:
            logger.error(f"❌ Failed to get connected databases for user {user_id}: {e}")
            return []
    
    @staticmethod
    async def get_database_info(user_id: str, db_id: int) -> Optional[Dict[str, Any]]:
        """
        Gets detailed information about a specific database
        
        Args:
            user_id: The user ID
            db_id: The database ID
            
        Returns:
            Database information or None if not found
        """
        try:
            # This would need to be implemented in backend_bridge.py
            from utils.backend_bridge import fetch_database_info
            
            db_info = await fetch_database_info(user_id, db_id)
            return db_info
        except Exception as e:
            logger.error(f"❌ Failed to get database info for {db_id}: {e}")
            return None
    
    @staticmethod
    async def get_database_schema(db_info: Dict[str, Any], user_id: str) -> Dict[str, Any]:
        """
        Gets the schema for a database, using the existing schema fetching functionality
        
        Args:
            db_info: Database connection info
            user_id: The user ID
            
        Returns:
            Database schema information
        """
        try:
            # Use existing functionality
            schema_response = fetch_schema_for_user_db(db_info, user_id)
            
            if not schema_response.get("success", False):
                return {"success": False, "error": schema_response.get("error", "Unknown error")}
            
            return schema_response.get("schema", {})
        except Exception as e:
            logger.error(f"❌ Failed to get database schema: {e}")
            return {"success": False, "error": str(e)}
    
    @staticmethod
    def get_system_description() -> str:
        """
        Returns a description of the system that can be used in agent prompts
        
        Returns:
            System description string
        """
        return """
        You are part of the AI-DB-Agent network system (also known as Maiquery), which helps users interact with their databases 
        using natural language. This system allows users to:
        
        1. Connect to various types of databases (PostgreSQL, MySQL, MongoDB, SQLite, MS SQL, Firebase, CouchDB, DynamoDB)
        2. Query these databases using natural language instead of SQL or other query languages
        3. Visualize the results of these queries
        4. Get explanations of the data in conversational language
        
        You do not have direct access to what databases a user is connected to or what data they contain 
        until they ask a specific query. To find out what databases they're connected to, you should 
        suggest they check the connections panel in the UI or use commands like "Show my connections" 
        or "List my databases".
        
        Never make up information about what databases are connected or what data they contain.
        """