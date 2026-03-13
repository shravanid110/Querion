import redis
import ssl
import socket
from typing import Dict, Any, List
import json
from .base import BaseConnector

class RedisConnector(BaseConnector):
    def test_connection(self, credentials: Dict[str, Any]) -> Dict[str, Any]:
        host = credentials.get('host', 'localhost')
        
        # Robust port extraction
        try:
            port_val = credentials.get('port')
            port = int(port_val) if port_val else 6379
        except:
            port = 6379
            
        username = credentials.get('username')
        password = credentials.get('password')
        
        print(f"DEBUG: [REDIS] Testing connection to {host}:{port}")
        
        # 1. Fast socket check to prevent long hangs on unreachable hosts
        try:
            with socket.create_connection((host, port), timeout=3):
                print(f"DEBUG: [REDIS] Port {port} is open.")
        except Exception as e:
            print(f"DEBUG: [REDIS] Port unreachable: {e}")
            return {"success": False, "error": f"Cloud Redis unreachable at {host}:{port}. Ensure your IP is whitelisted and the host/port is correct."}

        # 2. Driver connection attempt
        try:
            r = self._get_connection(credentials, is_test=True)
            r.ping()
            r.close()
            return {"success": True}
        except Exception as e:
            final_err = str(e)
            print(f"DEBUG: [REDIS] Connection test failed: {final_err}")
                
            # Check for obvious credential mixups
            hint = ""
            if username and username.lower() == 'postgres':
                hint = " TIP: You are using 'postgres' as username. Are you sure these aren't PostgreSQL credentials?"
            elif "Authentication required" in final_err:
                hint = " TIP: Password is incorrect or missing."
            elif "Timeout" in final_err or "timeout" in final_err.lower():
                hint = " TIP: Connection timed out. Check if SSL/TLS is REQUIRED (standard on some clusters)."

            return {"success": False, "error": f"Redis connectivity failed: {final_err}.{hint}"}

    def _get_connection(self, credentials: Dict[str, Any], is_test=False):
        host = credentials.get('host', 'localhost')
        try:
            port_val = credentials.get('port')
            port = int(port_val) if port_val else 6379
        except:
            port = 6379
        
        username = credentials.get('username')
        password = credentials.get('password')
        db_raw = credentials.get('database', '0')
        try:
            db_index = int(db_raw) if db_raw and str(db_raw).isdigit() else 0
        except:
            db_index = 0
            
        # Cloud providers (Upstash, AWS, RedisLabs) usually prefer SSL 
        use_ssl = port == 6380 or any(x in host.lower() for x in ['upstash', 'redislabs', 'aiven', 'cloud'])
        
        # For Railway proxies (e.g. shuttle.proxy.rlwy.net:42XXX), SSL is typically NOT used.
        if "rlwy.net" in host.lower() and port != 6380:
            use_ssl = False

        timeout = 5 if is_test else 10

        def create_client(ssl_enabled):
            return redis.Redis(
                host=host,
                port=port,
                username=username if username and username.lower() not in ['default', 'none', ''] else None,
                password=password,
                db=db_index,
                ssl=ssl_enabled,
                ssl_cert_reqs=ssl.CERT_NONE if ssl_enabled else None, # Skip verification for cloud proxies
                decode_responses=True,
                socket_timeout=timeout,
                socket_connect_timeout=timeout,
                retry_on_timeout=False
            )

        try:
            client = create_client(use_ssl)
            client.ping()
            return client
        except Exception as e1:
            print(f"DEBUG: [REDIS] Initial attempt (ssl={use_ssl}) failed: {e1}. Retrying with auto-ssl detection...")
            try:
                # Fallback to the other SSL state
                client = create_client(not use_ssl)
                client.ping()
                return client
            except Exception as e2:
                print(f"DEBUG: [REDIS] Connection attempt failed: {e2}")
                raise e2

    def get_schema_summary(self, credentials: Dict[str, Any]) -> str:
        try:
            r = self._get_connection(credentials)
            info = r.info()
            keys_count = r.dbsize()
            
            # Sample some keys
            keys = r.keys('*')[:20]
            key_samples = []
            for key in keys:
                try:
                    k_type = r.type(key)
                    key_samples.append(f"{key} ({k_type})")
                except:
                    continue
                
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
            r = self._get_connection(credentials)
            
            try:
                q = json.loads(query)
                cmd = q.get("command", "").strip()
                key = q.get("key", "").strip()
                
                # Build arguments for execute_command
                exec_args = [cmd]
                if key:
                    exec_args.append(key)
                
                # Check for additional arguments
                extra = q.get("args")
                if isinstance(extra, list):
                    exec_args.extend([str(a) for a in extra])
                elif isinstance(extra, str) and extra:
                    exec_args.extend(extra.split(' '))
            except:
                # Fallback for plain string commands like 'KEYS *'
                exec_args = [p.strip() for p in query.split(' ') if p.strip()]

            if not exec_args:
                raise Exception("Empty command received.")

            # EXECUTE RAW COMMAND
            # Fix for "ManagementCommands.command() takes 1 positional argument but 2 were given"
            # This happens because redis-py intercepts 'COMMAND' and routes to a method with no args.
            try:
                # Sanitize: Remove trailing semicolons AI might add
                if exec_args:
                    exec_args[-1] = exec_args[-1].replace(';', '')

                if exec_args[0].upper() == 'COMMAND' and len(exec_args) > 1:
                    # Force bypass the high-level method and just use execute_command
                    # if it fails with TypeError, we try the first arg only
                    try:
                        result = r.execute_command(*exec_args)
                    except TypeError:
                        result = r.execute_command(exec_args[0])
                else:
                    result = r.execute_command(*exec_args)
            except TypeError as te:
                if "positional argument" in str(te):
                    result = r.execute_command(exec_args[0])
                else:
                    raise te
                
            # Formatting result for our UI table
            formatted_rows = []
            if isinstance(result, dict):
                formatted_rows = [{"key": str(k), "value": str(v)} for k, v in result.items()]
            elif isinstance(result, (list, set, tuple)):
                # If it's a simple list (like KEYS result), show as values
                formatted_rows = [{"key": f"Item {i}", "value": str(v)} for i, v in enumerate(result)]
            else:
                # Single value result
                display_key = exec_args[1] if len(exec_args) > 1 else exec_args[0]
                formatted_rows = [{"key": display_key, "value": str(result)}]
                
            columns = [{"name": "key", "type": "string"}, {"name": "value", "type": "string"}]
                
            r.close()
            return {
                "columns": columns,
                "rows": formatted_rows
            }
        except Exception as e:
            raise Exception(f"Redis Error: {str(e)}")
