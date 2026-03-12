import oracledb
from typing import Dict, Any
from .base import BaseConnector

class OracleConnector(BaseConnector):
    def test_connection(self, credentials: Dict[str, Any]) -> Dict[str, Any]:
        try:
            # Oracle connection string: host:port/service_name
            # Or use individual params
            conn = oracledb.connect(
                user=credentials.get('username'),
                password=credentials.get('password'),
                dsn=f"{credentials.get('host')}:{credentials.get('port', 1521)}/{credentials.get('database')}"
            )
            conn.close()
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_schema_summary(self, credentials: Dict[str, Any]) -> str:
        try:
            conn = oracledb.connect(
                user=credentials.get('username'),
                password=credentials.get('password'),
                dsn=f"{credentials.get('host')}:{credentials.get('port', 1521)}/{credentials.get('database')}"
            )
            cursor = conn.cursor()
            
            # Query to get tables for current user
            query = """
                SELECT table_name 
                FROM user_tables 
                ORDER BY table_name
            """
            cursor.execute(query)
            tables = [row[0] for row in cursor.fetchall()]
            
            if not tables:
                return "No user tables found in Oracle database."
                
            schema_parts = []
            for table in tables[:15]: # Limit for performance
                cursor.execute(f"SELECT column_name, data_type FROM user_tab_columns WHERE table_name = '{table}'")
                cols = cursor.fetchall()
                col_strings = [f"{c[0]} ({c[1]})" for c in cols]
                schema_parts.append(f"Table: {table}\nColumns: {', '.join(col_strings)}")
                
            cursor.close()
            conn.close()
            return "\n\n".join(schema_parts)
            
        except Exception as e:
            return f"Could not fetch Oracle schema: {str(e)}"

    def execute_read_only_query(self, credentials: Dict[str, Any], query: str) -> Dict[str, Any]:
        if any(keyword in query.upper() for keyword in ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE"]):
            raise Exception("Only SELECT read-only queries are allowed.")
            
        try:
            conn = oracledb.connect(
                user=credentials.get('username'),
                password=credentials.get('password'),
                dsn=f"{credentials.get('host')}:{credentials.get('port', 1521)}/{credentials.get('database')}"
            )
            cursor = conn.cursor()
            cursor.execute(query)
            
            if cursor.description:
                columns = [{"name": desc[0], "type": "string"} for desc in cursor.description]
                rows = [dict(zip([d[0] for d in cursor.description], row)) for row in cursor.fetchall()]
            else:
                columns = []
                rows = []
                
            cursor.close()
            conn.close()
            
            return {
                "columns": columns,
                "rows": rows
            }
        except Exception as e:
            raise Exception(f"Oracle Error: {str(e)}")
