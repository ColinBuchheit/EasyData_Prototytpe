import mysql.connector
from .base_db_adapters import BaseDBAdapter, UserDatabase

class MySQLAdapter(BaseDBAdapter):
    def _connect(self, db: UserDatabase):
        return mysql.connector.connect(
            host=db.host,
            port=db.port,
            user=db.username,
            password=db.encrypted_password,
            database=db.database_name
        )
        
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
        # MySQLAdapter doesn't maintain persistent connections
        # But we implement this method to satisfy the abstract base class
        pass

    def fetch_tables(self, db: UserDatabase):
        conn = self._connect(db)
        cur = conn.cursor()
        cur.execute("SHOW TABLES")
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return [r[0] for r in rows]

    def fetch_schema(self, db: UserDatabase, table: str):
        conn = self._connect(db)
        cur = conn.cursor()
        cur.execute(f"DESCRIBE `{table}`")
        schema = cur.fetchall()
        cur.close()
        conn.close()
        return schema

    def run_query(self, db: UserDatabase, query: str):
        conn = self._connect(db)
        cur = conn.cursor()
        cur.execute(query)
        result = cur.fetchall()
        cur.close()
        conn.close()
        return result
