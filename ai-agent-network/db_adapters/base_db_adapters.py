from typing import List, Dict, Any, Optional, Union
from abc import ABC, abstractmethod
from datetime import datetime
import logging
from utils.logger import logger

class UserDatabase:
    """
    Represents a database connection from a user's configuration.
    This is the primary data structure shared between the Node.js backend
    and the Python AI agent network.
    """
    
    def __init__(
        self,
        id: int,
        db_type: str,
        database_name: str,
        user_id: int = 0,
        connection_name: Optional[str] = None,
        host: Optional[str] = None,
        port: Optional[int] = None,
        username: Optional[str] = None,
        encrypted_password: Optional[str] = None,
        is_connected: bool = False,
        created_at: Optional[datetime] = None,
        updated_at: Optional[datetime] = None
    ):
        # Validate required fields
        if not isinstance(id, int):
            logger.error(f"Invalid id type: {type(id)}, value: {id}")
            raise TypeError(f"id must be an integer, got {type(id)}")
            
        if not isinstance(db_type, str):
            logger.error(f"Invalid db_type type: {type(db_type)}, value: {db_type}")
            raise TypeError(f"db_type must be a string, got {type(db_type)}")
            
        if not isinstance(database_name, str):
            logger.error(f"Invalid database_name type: {type(database_name)}, value: {database_name}")
            raise TypeError(f"database_name must be a string, got {type(database_name)}")
        
        # Required fields
        self.id = id
        self.db_type = db_type
        self.database_name = database_name
        
        # Optional fields
        self.user_id = user_id
        self.connection_name = connection_name
        self.host = host
        self.port = port
        self.username = username
        self.encrypted_password = encrypted_password
        self.is_connected = is_connected
        self.created_at = created_at or datetime.now()
        self.updated_at = updated_at
        
    def __str__(self) -> str:
        """String representation without sensitive data"""
        return (
            f"UserDatabase(id={self.id}, type={self.db_type}, "
            f"name={self.database_name}, user_id={self.user_id})"
        )
        
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary format for API communication"""
        return {
            "id": self.id,
            "db_type": self.db_type,
            "database_name": self.database_name,
            "user_id": self.user_id,
            "connection_name": self.connection_name,
            "host": self.host,
            "port": self.port,
            "username": self.username,
            "encrypted_password": "***" if self.encrypted_password else None,
            "is_connected": self.is_connected
        }
        
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'UserDatabase':
        """Create a UserDatabase from a dictionary with validation"""
        
        # Validate required fields
        required_fields = ["id", "db_type", "database_name"]
        for field in required_fields:
            if field not in data:
                logger.error(f"Missing required field '{field}' in UserDatabase data")
                raise ValueError(f"Missing required field '{field}' in UserDatabase data")
                
        # Convert id to int if it's a string
        id_value = data["id"]
        if not isinstance(id_value, int):
            try:
                id_value = int(id_value)
            except (ValueError, TypeError):
                logger.error(f"Invalid database ID: {id_value}, must be an integer")
                raise ValueError(f"Invalid database ID: {id_value}, must be an integer")
                
        # Convert port to int if it's a string
        port_value = data.get("port")
        if port_value is not None and not isinstance(port_value, int):
            try:
                port_value = int(port_value)
            except (ValueError, TypeError):
                logger.warning(f"Invalid port: {port_value}, setting to None")
                port_value = None
        
        # Create instance with validated values
        return cls(
            id=id_value,
            db_type=data["db_type"],
            database_name=data["database_name"],
            user_id=int(data.get("user_id", 0)),
            connection_name=data.get("connection_name"),
            host=data.get("host"),
            port=port_value,
            username=data.get("username"),
            encrypted_password=data.get("encrypted_password"),
            is_connected=bool(data.get("is_connected", False))
        )


class BaseDBAdapter(ABC):
    """
    Abstract base class for all database adapters.
    Defines the common interface that all database adapters must implement.
    """
    
    @abstractmethod
    def fetch_tables(self, db: UserDatabase) -> List[str]:
        """
        Fetch all tables from the connected database
        
        Args:
            db: UserDatabase configuration
            
        Returns:
            List of table names
        """
        pass
    
    @abstractmethod
    def fetch_schema(self, db: UserDatabase, table: str) -> List[Dict[str, Any]]:
        """
        Fetch schema for a specific table
        
        Args:
            db: UserDatabase configuration
            table: Name of the table to get schema for
            
        Returns:
            List of column definitions
        """
        pass
    
    @abstractmethod
    def run_query(self, db: UserDatabase, query: Any) -> Any:
        """
        Execute a query against the database
        
        Args:
            db: UserDatabase configuration
            query: Query to execute (SQL string or NoSQL query object)
            
        Returns:
            Query results
        """
        pass
    
    @abstractmethod
    def connect(self, db: UserDatabase) -> Any:
        """
        Connect to the database
        
        Args:
            db: UserDatabase configuration
            
        Returns:
            Connection object
        """
        pass
    
    @abstractmethod
    def disconnect(self, db: UserDatabase) -> None:
        """
        Disconnect from the database
        
        Args:
            db: UserDatabase configuration
        """
        pass