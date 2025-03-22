import sqlite3
from .base_db_adapters import BaseDBAdapter, UserDatabase

class SQLiteAdapter(BaseDBAdapter):
    def _connect(self, db: UserDatabase):
        if not db.host:
            raise ValueError("SQLite DB path (stored in `host`) is required.")
        return sqlite3.connect(db.host)

    def fetch_tables(self, db: UserDatabase):
        conn = self._connect(db)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]
        conn.close()
        return tables

    def fetch_schema(self, db: UserDatabase, table: str):
        conn = self._connect(db)
        cursor = conn.cursor()
        cursor.execute(f"PRAGMA table_info({table})")
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
