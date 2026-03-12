import sqlite3
import os
from typing import Dict, Any
from .base import BaseConnector

class SQLiteConnector(BaseConnector):
    def test_connection(self, credentials: Dict[str, Any]) -> Dict[str, Any]:
        path = credentials.get('uri') or credentials.get('database')
        if not path:
            return {"success": False, "error": "Database file path is required."}
            
        try:
            # Check if file exists if it's not :memory:
            if path != ':memory:' and not os.path.exists(path):
                # We don't want to create new files during "test" usually, 
                # but sqlite3.connect creates it. Let's check existence first.
                return {"success": False, "error": f"Database file not found at: {path}"}
                
            conn = sqlite3.connect(path)
            conn.close()
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_schema_summary(self, credentials: Dict[str, Any]) -> str:
        path = credentials.get('uri') or credentials.get('database')
        try:
            conn = sqlite3.connect(path)
            cursor = conn.cursor()
            
            # Get tables
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = [row[0] for row in cursor.fetchall() if not row[0].startswith('sqlite_')]
            
            if not tables:
                return "The database is empty."
                
            schema_parts = []
            for table in tables:
                cursor.execute(f"PRAGMA table_info({table});")
                cols = cursor.fetchall()
                col_strings = [f"{c[1]} ({c[2]})" for c in cols]
                schema_parts.append(f"Table: {table}\nColumns: {', '.join(col_strings)}")
                
            conn.close()
            return "\n\n".join(schema_parts)
        except Exception as e:
            return f"Could not fetch schema: {str(e)}"

    def execute_read_only_query(self, credentials: Dict[str, Any], query: str) -> Dict[str, Any]:
        path = credentials.get('uri') or credentials.get('database')
        if any(keyword in query.upper() for keyword in ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE"]):
            raise Exception("Only SELECT read-only queries are allowed.")
            
        try:
            conn = sqlite3.connect(path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute(query)
            
            description = cursor.description
            if description:
                columns = [{"name": desc[0], "type": "string"} for desc in description]
                rows = [dict(row) for row in cursor.fetchall()]
            else:
                columns = []
                rows = []
                
            conn.close()
            return {
                "columns": columns,
                "rows": rows
            }
        except Exception as e:
            raise Exception(f"SQLite Error: {str(e)}")
