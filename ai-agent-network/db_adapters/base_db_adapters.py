from abc import ABC, abstractmethod
from typing import List, Any, Dict
from dataclasses import dataclass

@dataclass
class UserDatabase:
    db_type: str
    host: str
    port: int
    username: str
    encrypted_password: str
    database_name: str

class BaseDBAdapter(ABC):
    @abstractmethod
    def fetch_tables(self, db: UserDatabase) -> List[str]:
        pass

    @abstractmethod
    def fetch_schema(self, db: UserDatabase, table: str) -> Any:
        pass

    @abstractmethod
    def run_query(self, db: UserDatabase, query: Any) -> Any:
        pass
