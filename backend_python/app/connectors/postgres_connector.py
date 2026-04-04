import psycopg2
from typing import Dict, Any
from .base import BaseConnector

class PostgresConnector(BaseConnector):
    def test_connection(self, credentials: Dict[str, Any]) -> Dict[str, Any]:
        import socket
        host = credentials.get('host')
        port = credentials.get('port', 5432)
        try:
            port = int(port)
        except:
            port = 5432

        print(f"DEBUG: [POSTGRES] Pre-checking {host}:{port}")
        
        # Fast socket check to prevent driver hang
        try:
            with socket.create_connection((host, port), timeout=2):
                print(f"DEBUG: [POSTGRES] Port {port} is open.")
        except Exception as e:
            print(f"DEBUG: [POSTGRES] Port check failed: {e}")
            return {"success": False, "error": f"Could not reach database host at {host}:{port}. Error: {str(e)}"}

        try:
            host_lower = str(host or '').lower()
            # Remote cloud DBs strictly require SSL. Use 'require' and disable cert verification for maximum compatibility
            is_cloud = any(x in host_lower for x in ['rlwy.net', 'supabase', 'neon', 'rds.amazonaws.com', 'render.com', 'azure', 'googlevpc'])
            is_local = any(x in host_lower for x in ['localhost', '127.0.0.1'])
            
            ssl_mode = 'require' if (is_cloud or not is_local) else 'prefer'
            
            print(f"DEBUG: [POSTGRES] Connecting with sslmode={ssl_mode}")
            conn = psycopg2.connect(
                host=host,
                port=port,
                dbname=credentials.get('database'),
                user=credentials.get('username'),
                password=credentials.get('password'),
                connect_timeout=15,
                sslmode=ssl_mode
            )
            conn.close()
            print("DEBUG: [POSTGRES] Connection successful!")
            return {"success": True}
        except Exception as e:
            print(f"DEBUG: [POSTGRES] Driver error: {e}")
            return {"success": False, "error": str(e)}

    def get_schema_summary(self, credentials: Dict[str, Any]) -> str:
        try:
            host = str(credentials.get('host', '')).lower()
            is_local = any(x in host for x in ['localhost', '127.0.0.1'])
            ssl_mode = 'require' if not is_local else 'prefer'

            conn = psycopg2.connect(
                host=credentials.get('host'),
                port=credentials.get('port', 5432),
                dbname=credentials.get('database'),
                user=credentials.get('username'),
                password=credentials.get('password'),
                connect_timeout=10,
                sslmode=ssl_mode
            )
            cursor = conn.cursor()
            
            # Query to get tables and columns in 'public' schema
            query = """
                SELECT table_name, column_name, data_type 
                FROM information_schema.columns 
                WHERE table_schema = 'public'
                ORDER BY table_name;
            """
            cursor.execute(query)
            rows = cursor.fetchall()
            
            if not rows:
                return "The database is empty or no tables found in public schema."
                
            schema_dict = {}
            for table_name, column_name, data_type in rows:
                if table_name not in schema_dict:
                    schema_dict[table_name] = []
                schema_dict[table_name].append(f"{column_name} ({data_type})")
                
            schema_parts = []
            for table, cols in schema_dict.items():
                schema_parts.append(f"Table: {table}\nColumns: {', '.join(cols)}")
                
            cursor.close()
            conn.close()
            return "\n\n".join(schema_parts)
            
        except Exception as e:
            return f"Could not fetch schema: {str(e)}"

    def execute_read_only_query(self, credentials: Dict[str, Any], query: str) -> Dict[str, Any]:
        """Execute query."""
        if any(keyword in query.upper() for keyword in ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE"]):
            raise Exception("Only SELECT read-only queries are allowed.")
            
        try:
            host = str(credentials.get('host', '')).lower()
            is_local = any(x in host for x in ['localhost', '127.0.0.1'])
            ssl_mode = 'require' if not is_local else 'prefer'

            conn = psycopg2.connect(
                host=credentials.get('host'),
                port=credentials.get('port', 5432),
                dbname=credentials.get('database'),
                user=credentials.get('username'),
                password=credentials.get('password'),
                connect_timeout=10,
                sslmode=ssl_mode
            )
            # Set to read only transaction
            conn.set_session(readonly=True, autocommit=True)
            
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
            raise Exception(f"Query Execution Error: {str(e)}")
