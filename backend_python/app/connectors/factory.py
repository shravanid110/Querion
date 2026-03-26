from typing import Dict, Any, Optional
from .base import BaseConnector

class MultiDBFactory:
    _connectors: Dict[str, BaseConnector] = {}

    @classmethod
    def register(cls, db_type: str, connector: BaseConnector):
        cls._connectors[db_type.lower()] = connector

    @classmethod
    def get_connector(cls, db_type: str) -> Optional[BaseConnector]:
        return cls._connectors.get(db_type.lower())

    @classmethod
    def test_connection(cls, db_type: str, credentials: Dict[str, Any]) -> Dict[str, Any]:
        connector = cls.get_connector(db_type)
        if not connector:
            return {"success": False, "error": f"Unsupported database type: {db_type}"}
        return connector.test_connection(credentials)

    @classmethod
    def get_schema_summary(cls, db_type: str, credentials: Dict[str, Any]) -> str:
        connector = cls.get_connector(db_type)
        if not connector:
            return f"Unsupported database type: {db_type}"
        return connector.get_schema_summary(credentials)

    @classmethod
    def execute_read_only_query(cls, db_type: str, credentials: Dict[str, Any], query: str) -> Dict[str, Any]:
        connector = cls.get_connector(db_type)
        if not connector:
            raise Exception(f"Unsupported database type: {db_type}")
        return connector.execute_read_only_query(credentials, query)

# Import and register connectors
from .postgres_connector import PostgresConnector
from .mongodb_connector import MongoDBConnector
from .sqlite_connector import SQLiteConnector
from .redis_connector import RedisConnector
from .mariadb_connector import MariaDBConnector
from .firebase_connector import FirebaseConnector
from .oracle_connector import OracleConnector
from .sqlserver_connector import SQLServerConnector

MultiDBFactory.register('postgresql', PostgresConnector())
MultiDBFactory.register('supabase', PostgresConnector()) 
MultiDBFactory.register('mongodb', MongoDBConnector())
MultiDBFactory.register('sqlite', SQLiteConnector())
MultiDBFactory.register('redis', RedisConnector())
MultiDBFactory.register('mariadb', MariaDBConnector())
MultiDBFactory.register('mysql', MariaDBConnector())
MultiDBFactory.register('firebase', FirebaseConnector())
MultiDBFactory.register('oracle', OracleConnector())
MultiDBFactory.register('mssql', SQLServerConnector())
MultiDBFactory.register('sqlserver', SQLServerConnector())
