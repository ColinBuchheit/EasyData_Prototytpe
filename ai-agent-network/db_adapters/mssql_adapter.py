import pyodbc
from .base_db_adapters import BaseDBAdapter, UserDatabase

class MSSQLAdapter(BaseDBAdapter):
    def _connect(self, db: UserDatabase):
        if not all([db.host, db.port, db.username, db.encrypted_password, db.database_name]):
            raise ValueError("Missing MSSQL connection fields.")
        
        conn_str = (
            f"DRIVER={{ODBC Driver 17 for SQL Server}};"
            f"SERVER={db.host},{db.port};"
            f"DATABASE={db.database_name};"
            f"UID={db.username};"
            f"PWD={db.encrypted_password};"
            f"TrustServerCertificate=yes;"
        )
        return pyodbc.connect(conn_str)
        
    def connect(self, db: UserDatabase):
        """
        Connect to the database
        
        Args:
            db: UserDatabase configuration
            
        Returns:
            Connection object
        """
        return self._connect(db)
    
    def disconnect(self, db: UserDatabase) -> None:
        """
        Disconnect from the database
        
        Args:
            db: UserDatabase configuration
        """
        # MSSQL adapter doesn't maintain persistent connections
        # But we implement this method to satisfy the abstract base class
        pass

    def fetch_tables(self, db: UserDatabase):
        conn = self._connect(db)
        cursor = conn.cursor()
        cursor.execute("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'")
        tables = [row[0] for row in cursor.fetchall()]
        conn.close()
        return tables

    def fetch_schema(self, db: UserDatabase, table: str):
        conn = self._connect(db)
        cursor = conn.cursor()
        cursor.execute(f"SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = ?", (table,))
        schema = cursor.fetchall()
        conn.close()
        return schema

    def run_query(self, db: UserDatabase, query: str):
        conn = self._connect(db)
        cursor = conn.cursor()
        cursor.execute(query)
        result = cursor.fetchall()
        conn.close()
        return result
