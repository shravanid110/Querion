import pymssql
from typing import Dict, Any
from .base import BaseConnector

class SQLServerConnector(BaseConnector):
    def test_connection(self, credentials: Dict[str, Any]) -> Dict[str, Any]:
        try:
            conn = pymssql.connect(
                server=credentials.get('host'),
                user=credentials.get('username'),
                password=credentials.get('password'),
                database=credentials.get('database'),
                port=str(credentials.get('port', 1433)),
                login_timeout=5
            )
            conn.close()
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_schema_summary(self, credentials: Dict[str, Any]) -> str:
        try:
            conn = pymssql.connect(
                server=credentials.get('host'),
                user=credentials.get('username'),
                password=credentials.get('password'),
                database=credentials.get('database'),
                port=str(credentials.get('port', 1433))
            )
            cursor = conn.cursor()
            
            # Query to get tables
            query = """
                SELECT TABLE_NAME 
                FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_TYPE = 'BASE TABLE'
                ORDER BY TABLE_NAME
            """
            cursor.execute(query)
            tables = [row[0] for row in cursor.fetchall()]
            
            if not tables:
                return "The SQL Server database is empty."
                
            schema_parts = []
            for table in tables[:15]:
                cursor.execute(f"""
                    SELECT COLUMN_NAME, DATA_TYPE 
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_NAME = '{table}'
                """)
                cols = cursor.fetchall()
                col_strings = [f"{c[0]} ({c[1]})" for c in cols]
                schema_parts.append(f"Table: {table}\nColumns: {', '.join(col_strings)}")
                
            conn.close()
            return "\n\n".join(schema_parts)
        except Exception as e:
            return f"Could not fetch MS SQL schema: {str(e)}"

    def execute_read_only_query(self, credentials: Dict[str, Any], query: str) -> Dict[str, Any]:
        if any(keyword in query.upper() for keyword in ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE"]):
            raise Exception("Only SELECT read-only queries are allowed.")
            
        try:
            conn = pymssql.connect(
                server=credentials.get('host'),
                user=credentials.get('username'),
                password=credentials.get('password'),
                database=credentials.get('database'),
                port=str(credentials.get('port', 1433))
            )
            cursor = conn.cursor(as_dict=True)
            cursor.execute(query)
            
            rows = cursor.fetchall()
            if cursor.description:
                columns = [{"name": desc[0], "type": "string"} for desc in cursor.description]
            else:
                columns = []
                
            conn.close()
            return {
                "columns": columns,
                "rows": rows
            }
        except Exception as e:
            raise Exception(f"SQL Server Error: {str(e)}")
