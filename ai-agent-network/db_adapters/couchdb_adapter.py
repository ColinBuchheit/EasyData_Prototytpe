import couchdb
from .base_db_adapters import BaseDBAdapter, UserDatabase

class CouchDBAdapter(BaseDBAdapter):
    def _connect(self, db: UserDatabase):
        return couchdb.Server(f"http://{db.username}:{db.encrypted_password}@{db.host}:{db.port}")

    def fetch_tables(self, db: UserDatabase):
        client = self._connect(db)
        return list(client)

    def fetch_schema(self, db: UserDatabase, table: str):
        client = self._connect(db)
        db_instance = client[table]
        for doc in db_instance.view("_all_docs", limit=1, include_docs=True):
            return list(doc["doc"].keys())
        return []

    def run_query(self, db: UserDatabase, query: dict):
        client = self._connect(db)
        db_instance = client[query.get("collection") or query.get("table")]
        selector = query.get("selector", {})
        return [row.doc for row in db_instance.find(selector)]
