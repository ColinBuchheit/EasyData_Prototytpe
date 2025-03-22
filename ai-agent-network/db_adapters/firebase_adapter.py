import json
import firebase_admin
from firebase_admin import credentials, firestore
from .base_db_adapters import BaseDBAdapter, UserDatabase

class FirebaseAdapter(BaseDBAdapter):
    def _connect(self, db: UserDatabase):
        key = f"user_{db.user_id}_db_{db.id}"
        if key not in firebase_admin._apps:
            cred = credentials.Certificate(json.loads(db.encrypted_password))
            firebase_admin.initialize_app(cred, name=key)
        return firestore.client(firebase_admin.get_app(name=key))

    def fetch_tables(self, db: UserDatabase):
        client = self._connect(db)
        collections = client.collections()
        return [col.id for col in collections]

    def fetch_schema(self, db: UserDatabase, table: str):
        client = self._connect(db)
        docs = client.collection(table).limit(1).stream()
        for doc in docs:
            return list(doc.to_dict().keys())
        return []

    def run_query(self, db: UserDatabase, query: dict):
        client = self._connect(db)
        collection = query.get("collection")
        docs = client.collection(collection).stream()
        return [{**doc.to_dict(), "id": doc.id} for doc in docs]
