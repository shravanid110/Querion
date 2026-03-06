import time
import psutil
from typing import Dict, Any

class MetricsEngine:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MetricsEngine, cls).__new__(cls)
            cls._instance._init()
        return cls._instance
    
    def _init(self):
        self.metrics = {
            "cpu_usage": 0,
            "ram_usage": 0,
            "disk_usage": 0,
            "server_uptime": 0,
            "requests_per_second": 0.0,
            "response_time": 0,
            "error_rate": 0,
            "warning_count": 0,
            "status_codes": {
                "200": 0,
                "400": 0,
                "404": 0,
                "500": 0
            },
            "database": {
                "active_connections": 12, # Baseline
                "query_time": 0,
                "slow_queries": 0,
                "deadlocks": 0
            },
            "security": {
                "failed_logins": 0,
                "suspicious_ips": [],
                "unauthorized_access": 0
            },
            "users": {
                "active_users": 150, # Baseline
                "role_distribution": {"admin": 10, "editor": 40, "viewer": 100}
            }
        }
        self.start_time = time.time()
        self.request_count = 0
        self.last_ts = time.time()

    def process_log(self, log_data: Dict[str, Any]):
        # Extract message and status code (Flexible keys for different sources)
        message = str(log_data.get("message") or log_data.get("data") or "").lower()
        log_type = str(log_data.get("level") or log_data.get("type") or "info").lower()
        status_code = log_data.get("status_code") or log_data.get("status")

        # 1. Update Error/Warning counts
        if log_type == "error" or "error" in message or "exception" in message:
            self.metrics["error_rate"] += 1
        elif log_type == "warning" or "warning" in message:
            self.metrics["warning_count"] += 1

        # 2. Update Status Codes
        if status_code:
            code_str = str(status_code)
            if code_str in self.metrics["status_codes"]:
                self.metrics["status_codes"][code_str] += 1
            else:
                self.metrics["status_codes"][code_str] = 1
        
        # Count requests for RPS
        if "get " in message or "post " in message or "put " in message or "delete " in message or status_code:
            self.request_count += 1

        # 3. Security Detection
        if "login fail" in message or "auth fail" in message:
            self.metrics["security"]["failed_logins"] += 1
        if "unauthorized" in message or "forbidden" in message:
            self.metrics["security"]["unauthorized_access"] += 1

        # 4. Database Metrics
        if "slow query" in message:
            self.metrics["database"]["slow_queries"] += 1
            self.metrics["database"]["active_connections"] += 1
        if "deadlock" in message:
            self.metrics["database"]["deadlocks"] += 1

    def update_system_stats(self):
        try:
            self.metrics["cpu_usage"] = psutil.cpu_percent()
            self.metrics["ram_usage"] = psutil.virtual_memory().percent
            self.metrics["disk_usage"] = psutil.disk_usage('/').percent
        except:
            pass # Fallback for restricted environments
            
        self.metrics["server_uptime"] = int(time.time() - self.start_time)
        
        # Calculate RPS
        now = time.time()
        elapsed = now - self.last_ts
        if elapsed >= 2.0:
            self.metrics["requests_per_second"] = round(self.request_count / elapsed, 1)
            self.request_count = 0
            self.last_ts = now

    def get_metrics(self):
        self.update_system_stats()
        return self.metrics

metrics_engine = MetricsEngine()
