import boto3
from .base_db_adapters import BaseDBAdapter, UserDatabase

class DynamoDBAdapter(BaseDBAdapter):
    def _connect(self, db: UserDatabase):
        return boto3.client(
            "dynamodb",
            region_name="us-east-1",
            aws_access_key_id=db.username,
            aws_secret_access_key=db.encrypted_password
        )

    def fetch_tables(self, db: UserDatabase):
        client = self._connect(db)
        response = client.list_tables()
        return response.get("TableNames", [])

    def fetch_schema(self, db: UserDatabase, table: str):
        client = self._connect(db)
        response = client.describe_table(TableName=table)
        return response["Table"]["AttributeDefinitions"]

    def run_query(self, db: UserDatabase, query: dict):
        client = self._connect(db)
        return client.scan(TableName=query.get("table")).get("Items", [])
