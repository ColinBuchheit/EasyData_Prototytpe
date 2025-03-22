from db_adapters.db_adapter_router import BaseDBAdapter
from db_adapters.postgres_adapter import PostgresAdapter
from db_adapters.mysql_adapter import MySQLAdapter
from db_adapters.mongodb_adapter import MongoDBAdapter
from db_adapters.sqlite_adapter import SQLiteAdapter
from db_adapters.mssql_adapter import MSSQLAdapter
from db_adapters.firebase_adapter import FirebaseAdapter
from db_adapters.couchdb_adapter import CouchDBAdapter
from db_adapters.dynamodb_adapter import DynamoDBAdapter

def get_adapter_for_db(db_type: str) -> BaseDBAdapter:
    match db_type.lower():
        case "postgres":
            return PostgresAdapter()
        case "mysql":
            return MySQLAdapter()
        case "mongodb":
            return MongoDBAdapter()
        case "sqlite":
            return SQLiteAdapter()
        case "mssql":
            return MSSQLAdapter()
        case "firebase":
            return FirebaseAdapter()
        case "couchdb":
            return CouchDBAdapter()
        case "dynamodb":
            return DynamoDBAdapter()
        case _:
            raise ValueError(f"Unsupported database type: {db_type}")
