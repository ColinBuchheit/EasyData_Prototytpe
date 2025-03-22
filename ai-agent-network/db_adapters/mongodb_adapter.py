from pymongo import MongoClient
from .base_db_adapters import BaseDBAdapter, UserDatabase

class MongoDBAdapter(BaseDBAdapter):
    def _connect(self, db: UserDatabase):
        uri = f"mongodb://{db.username}:{db.encrypted_password}@{db.host}:{db.port}"
        return MongoClient(uri)[db.database_name]

    def fetch_tables(self, db: UserDatabase):
        client = self._connect(db)
        return client.list_collection_names()

    def fetch_schema(self, db: UserDatabase, collection: str):
        client = self._connect(db)
        doc = client[collection].find_one()
        return list(doc.keys()) if doc else []

    def run_query(self, db: UserDatabase, query: dict):
        client = self._connect(db)
        collection = query.get("collection")
        filter_ = query.get("filter", {})
        return list(client[collection].find(filter_))
