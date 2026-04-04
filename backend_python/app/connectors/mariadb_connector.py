import mysql.connector
from typing import Dict, Any
from .base import BaseConnector

class MariaDBConnector(BaseConnector):
    def test_connection(self, credentials: Dict[str, Any]) -> Dict[str, Any]:
        try:
            conn = mysql.connector.connect(
                host=credentials.get('host'),
                port=credentials.get('port', 3306),
                database=credentials.get('database'),
                user=credentials.get('username'),
                password=credentials.get('password'),
                connect_timeout=15,
                ssl_disabled=False,
                ssl_verify_cert=False
            )
            conn.close()
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_schema_summary(self, credentials: Dict[str, Any]) -> str:
        try:
            conn = mysql.connector.connect(
                host=credentials.get('host'),
                port=credentials.get('port', 3306),
                database=credentials.get('database'),
                user=credentials.get('username'),
                password=credentials.get('password'),
                ssl_disabled=False,
                ssl_verify_cert=False
            )
            cursor = conn.cursor()
            
            cursor.execute("SHOW TABLES")
            tables = [t[0] for t in cursor.fetchall()]
            
            if not tables:
                return "The database is empty."
                
            schema_parts = []
            for table in tables:
                cursor.execute(f"DESCRIBE {table}")
                cols = cursor.fetchall()
                col_strings = [f"{c[0]} ({c[1]})" for c in cols]
                schema_parts.append(f"Table: {table}\nColumns: {', '.join(col_strings)}")
                
            cursor.close()
            conn.close()
            return "\n\n".join(schema_parts)
        except Exception as e:
            return f"Could not fetch MariaDB schema: {str(e)}"

    def execute_read_only_query(self, credentials: Dict[str, Any], query: str) -> Dict[str, Any]:
        if any(keyword in query.upper() for keyword in ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE"]):
            raise Exception("Only SELECT read-only queries are allowed.")
            
        try:
            conn = mysql.connector.connect(
                host=credentials.get('host'),
                port=credentials.get('port', 3306),
                database=credentials.get('database'),
                user=credentials.get('username'),
                password=credentials.get('password'),
                ssl_disabled=False,
                ssl_verify_cert=False
            )
            cursor = conn.cursor(dictionary=True)
            cursor.execute(query)
            
            rows = cursor.fetchall()
            if cursor.description:
                columns = [{"name": desc[0], "type": "string"} for desc in cursor.description]
            else:
                columns = []
                
            cursor.close()
            conn.close()
            
            return {
                "columns": columns,
                "rows": rows
            }
        except Exception as e:
            raise Exception(f"MariaDB Error: {str(e)}")
