import redis
from typing import Dict, Any, List
import json
from .base import BaseConnector

class RedisConnector(BaseConnector):
    def test_connection(self, credentials: Dict[str, Any]) -> Dict[str, Any]:
        try:
            r = redis.Redis(
                host=credentials.get('host', 'localhost'),
                port=credentials.get('port', 6379),
                password=credentials.get('password'),
                socket_timeout=5
            )
            r.ping()
            r.close()
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_schema_summary(self, credentials: Dict[str, Any]) -> str:
        try:
            r = redis.Redis(
                host=credentials.get('host', 'localhost'),
                port=credentials.get('port', 6379),
                password=credentials.get('password')
            )
            
            info = r.info()
            keys_count = r.dbsize()
            
            # Sample some keys
            keys = r.keys('*')[:20]
            key_samples = []
            for key in keys:
                k_type = r.type(key).decode('utf-8')
                key_samples.append(f"{key.decode('utf-8')} ({k_type})")
                
            summary = f"Redis Server: {info.get('redis_version')}\nTotal Keys: {keys_count}\nKey Samples: {', '.join(key_samples)}"
            r.close()
            return summary
        except Exception as e:
            return f"Could not fetch Redis info: {str(e)}"

    def execute_read_only_query(self, credentials: Dict[str, Any], query: str) -> Dict[str, Any]:
        """
        Expect AI to generate a Redis command or a set of commands in JSON.
        Example: { "command": "GET", "key": "..." } or { "command": "HGETALL", "key": "..." }
        """
        try:
            r = redis.Redis(
                host=credentials.get('host', 'localhost'),
                port=credentials.get('port', 6379),
                password=credentials.get('password')
            )
            
            try:
                q = json.loads(query)
            except:
                # If AI generated 'GET mykey', we can try to parse it
                parts = query.split(' ')
                q = {"command": parts[0], "key": parts[1] if len(parts) > 1 else None}

            cmd = q.get("command", "").upper()
            key = q.get("key")
            
            if not key:
                # Some commands don't need keys like DBSIZE
                result = getattr(r, cmd.lower())()
            else:
                result = getattr(r, cmd.lower())(key)
                
            # Formatting result for our UI table
            formatted_rows = []
            if isinstance(result, dict):
                formatted_rows = [{"key": k.decode('utf-8') if isinstance(k, bytes) else k, "value": v.decode('utf-8') if isinstance(v, bytes) else v} for k, v in result.items()]
            elif isinstance(result, list):
                formatted_rows = [{"value": v.decode('utf-8') if isinstance(v, bytes) else v} for v in result]
            else:
                val = result.decode('utf-8') if isinstance(result, bytes) else str(result)
                formatted_rows = [{"key": key, "value": val}]
                
            columns = [{"name": "key", "type": "string"}, {"name": "value", "type": "string"}]
            if formatted_rows and "key" not in formatted_rows[0]:
                columns = [{"name": "value", "type": "string"}]
                
            r.close()
            return {
                "columns": columns,
                "rows": formatted_rows
            }
        except Exception as e:
            raise Exception(f"Redis Error: {str(e)}")
