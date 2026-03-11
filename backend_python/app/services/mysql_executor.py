# Mapping: backend/src/services/mysqlExecutor.ts
import mysql.connector
import re
from typing import Dict, Any, List, Optional

class MySQLService:
    @staticmethod
    def test_connection(params: Dict[str, Any]) -> Dict[str, Any]:
        connection = None
        try:
            # Added SSL and robust connection params to match TypeScript 'rejectUnauthorized: false'
            connection = mysql.connector.connect(
                host=params.get('host'),
                port=params.get('port', 3306),
                user=params.get('user'),
                password=params.get('password'),
                database=params.get('database'),
                connect_timeout=5,
                ssl_disabled=False,
                ssl_verify_cert=False # Equivalent to rejectUnauthorized: false
            )
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}
        finally:
            if connection and connection.is_connected():
                connection.close()

    @staticmethod
    def execute_read_only_query(params: Dict[str, Any], sql: str) -> Dict[str, Any]:
        # Rule 3: Read-Only Enforcement
        forbidden_keywords = ['INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'TRUNCATE', 'GRANT', 'REVOKE', 'REPLACE', 'RENAME']
        uppercase_sql = sql.strip().upper()

        if any(re.search(rf'\b{kw}\b', uppercase_sql) for kw in forbidden_keywords):
            raise Exception("Database modifications are not allowed. This dashboard is strictly read-only; you can only query and view existing data.")

        connection = None
        try:
            connection = mysql.connector.connect(
                host=params.get('host'),
                port=params.get('port', 3306),
                user=params.get('user'),
                password=params.get('password'),
                database=params.get('database'),
                connect_timeout=10,
                ssl_disabled=False,
                ssl_verify_cert=False
            )
            cursor = connection.cursor(dictionary=True)
            cursor.execute(sql)
            rows = cursor.fetchall()
            columns = [desc[0] for desc in cursor.description] if cursor.description else []
            return {
                "rows": rows,
                "columns": columns
            }
        except Exception as e:
            print(f"Database Execution Error: {str(e)}")
            raise Exception(f"Database Error: {str(e)}")
        finally:
            if connection and connection.is_connected():
                connection.close()

    @staticmethod
    def get_schema_summary(params: Dict[str, Any]) -> str:
        connection = None
        try:
            print(f"[Schema] Connecting to {params['host']} as {params['user']}.")
            connection = mysql.connector.connect(
                host=params.get('host'),
                port=params.get('port', 3306),
                user=params.get('user'),
                password=params.get('password'),
                database=params.get('database'),
                connect_timeout=20, # Increased for slow schema fetches
                ssl_disabled=False,
                ssl_verify_cert=False
            )

            cursor = connection.cursor()
            cursor.execute("SHOW TABLES")
            tables = cursor.fetchall()
            table_names = [t[0] for t in tables]

            if not table_names:
                return "The database is empty. No tables found."

            all_tables_header = ", ".join(table_names[:100])
            if len(table_names) > 100:
                all_tables_header += "... (and more)"

            schema_context = f"DATABASE SCHEMA:\nTotal Tables Found: {len(table_names)}\nAll Table Names: {all_tables_header}\n\nCOLUMN DETAILS (for first 40 tables):\n"

            for table in table_names[:60]:
                try:
                    cursor.execute(f"DESCRIBE `{table}`")
                    columns = cursor.fetchall()
                    col_details = ", ".join([f"{c[0]} ({c[1]})" for c in columns])
                    schema_context += f"- {table}: [{col_details}]\n"
                except Exception as e:
                    print(f"Could not describe table {table}: {str(e)}")

            return schema_context
        except Exception as e:
            print(f"CRITICAL: Error fetching schema from MySQL: {str(e)}")
            hint = ""
            if "Access denied" in str(e):
                hint = " TIP: This usually means the password is wrong or was encrypted with an old version of the app. Try deleting and re-creating this connection."
            return f"Could not fetch schema. Database error: {str(e)}{hint}"
        finally:
            if connection and connection.is_connected():
                connection.close()

