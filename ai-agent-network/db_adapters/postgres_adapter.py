import psycopg2
from .base_db_adapters import BaseDBAdapter, UserDatabase

class PostgresAdapter(BaseDBAdapter):
    def _connect(self, db: UserDatabase):
        return psycopg2.connect(
            host=db.host,
            port=db.port,
            user=db.username,
            password=db.encrypted_password,
            dbname=db.database_name
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
        # The postgres adapter doesn't maintain persistent connections
        # But we implement this method to satisfy the abstract base class
        pass

    def fetch_tables(self, db: UserDatabase):
        conn = self._connect(db)
        cur = conn.cursor()
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
        tables = [row[0] for row in cur.fetchall()]
        conn.close()
        return tables

    def fetch_schema(self, db: UserDatabase, table: str):
        conn = self._connect(db)
        cur = conn.cursor()
        cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = %s", (table,))
        schema = cur.fetchall()
        conn.close()
        return schema

    def run_query(self, db: UserDatabase, query: str):
        conn = self._connect(db)
        cur = conn.cursor()
        cur.execute(query)
        result = cur.fetchall()
        conn.close()
        return result
