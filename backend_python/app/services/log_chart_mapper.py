import random
from typing import Dict, Any, List

class SeverityDetector:
    """Detects severity levels based on log content and status codes."""
    
    CRITICAL = "CRITICAL"
    WARNING = "WARNING"
    MINOR = "MINOR"
    HEALTHY = "HEALTHY"

    @staticmethod
    def detect(log: Dict[str, Any]) -> str:
        level = log.get("level", "INFO").upper()
        status_code = log.get("status_code")
        message = log.get("message", "").lower()

        if level == "ERROR" or (status_code and str(status_code).startswith("5")):
            return SeverityDetector.CRITICAL
        
        if "critical" in message or "timeout" in message or "failure" in message or "deadlock" in message:
            return SeverityDetector.CRITICAL
            
        if level == "WARNING" or (status_code and str(status_code).startswith("4")):
            return SeverityDetector.WARNING
            
        if "slow" in message or "retry" in message or "deprecated" in message:
            return SeverityDetector.MINOR
            
        return SeverityDetector.HEALTHY

    @staticmethod
    def get_color(severity: str) -> str:
        colors = {
            SeverityDetector.CRITICAL: "red",
            SeverityDetector.WARNING: "orange",
            SeverityDetector.MINOR: "yellow",
            SeverityDetector.HEALTHY: "green"
        }
        return colors.get(severity, "blue")

class ChartMapper:
    """Maps logs to specific chart configurations based on predefined rules."""
    
    CHART_TYPES = [
        "radialGauge", "ring", "gauge", "counter", "lineChart", 
        "ringChart", "donutChart", "horizontalBarChart", "liveTable",
        "pieChart", "barChart", "logStream", "ramRingRed", "cpuGaugeRed",
        "logConsole", "criticalBadge", "timelineGraph", "logTable", 
        "storageRing", "errorTable", "stackTraceViewer", "redisRing",
        "spikeLine", "securityTable", "securityBarChart", "flashingCounter",
        "criticalAlertPanel"
    ]

    @staticmethod
    def map_log_to_chart(log: Dict[str, Any]) -> Dict[str, str]:
        message = log.get("message", "").lower()
        service = log.get("service", "").lower()
        status_code = str(log.get("status_code", ""))
        
        # SYSTEM HEALTH
        if "cpu" in message:
            return {
                "chart_type": "cpuGaugeRed" if "overload" in message or "high" in message else "radialGauge",
                "panel": "SYSTEM_HEALTH",
                "title": "CPU Utilization",
                "metric_type": "utilization"
            }
        if "ram" in message or "memory" in message:
            return {
                "chart_type": "ramRingRed" if "overflow" in message or "leak" in message else "ring",
                "panel": "SYSTEM_HEALTH",
                "title": "Memory Usage",
                "metric_type": "utilization"
            }
        if "disk" in message or "storage" in message:
            return {
                "chart_type": "gauge",
                "panel": "SYSTEM_HEALTH",
                "title": "Disk Usage",
                "metric_type": "utilization"
            }
        if "uptime" in message or "started" in message:
            return {
                "chart_type": "counter",
                "panel": "SYSTEM_HEALTH",
                "title": "Server Uptime",
                "metric_type": "uptime"
            }
        if "threads" in message or "processes" in message:
            return {
                "chart_type": "lineChart",
                "panel": "SYSTEM_HEALTH",
                "title": "Active Processes",
                "metric_type": "process_count"
            }

        # API MONITORING
        if "requests per second" in message or "rps" in message:
            return {
                "chart_type": "lineChart",
                "panel": "API_MONITORING",
                "title": "Requests Per Second",
                "metric_type": "traffic"
            }
        if "latency" in message or "response time" in message:
            return {
                "chart_type": "lineChart",
                "panel": "API_MONITORING",
                "title": "API Latency",
                "metric_type": "performance"
            }
        if "error rate" in message:
            return {
                "chart_type": "ringChart",
                "panel": "API_MONITORING",
                "title": "Error Rate %",
                "metric_type": "reliability"
            }
        if "status" in message and ("distribution" in message or "code" in message):
            return {
                "chart_type": "donutChart",
                "panel": "API_MONITORING",
                "title": "HTTP Status Distribution",
                "metric_type": "traffic_split"
            }
        if "top endpoints" in message or "most requested" in message:
            return {
                "chart_type": "horizontalBarChart",
                "panel": "API_MONITORING",
                "title": "Top Endpoints",
                "metric_type": "traffic_rank"
            }
            
        # DATABASE MONITORING
        if "db connections" in message or "database connection" in message:
            return {
                "chart_type": "gauge",
                "panel": "DATABASE_MONITORING",
                "title": "Active DB Connections",
                "metric_type": "connections"
            }
        if "query execution" in message or "sql execution" in message:
            return {
                "chart_type": "lineChart",
                "panel": "DATABASE_MONITORING",
                "title": "Query Performance",
                "metric_type": "db_performance"
            }
        if "slow query" in message or "long running query" in message:
            return {
                "chart_type": "liveTable",
                "panel": "DATABASE_MONITORING",
                "title": "Slow Queries",
                "metric_type": "performance_issues"
            }
        if "deadlock" in message:
            return {
                "chart_type": "counter",
                "panel": "DATABASE_MONITORING",
                "title": "DB Deadlocks",
                "metric_type": "critical_events"
            }

        # SPECIFIC ERRORS (Mapping 50+ list summary)
        if "duplicate key" in message:
            return {"chart_type": "table", "panel": "ERROR_TRACKING", "title": "Duplicate Key Errors", "metric_type": "db_error"}
        if "foreign key" in message:
            return {"chart_type": "pieChart", "panel": "ERROR_TRACKING", "title": "Foreign Key Violations", "metric_type": "db_error"}
        if "timeout" in message:
            if "db" in message or "database" in message:
                return {"chart_type": "ringChart", "panel": "ERROR_TRACKING", "title": "DB Timeouts", "metric_type": "health"}
            return {"chart_type": "lineChart", "panel": "ERROR_TRACKING", "title": "Network Timeouts", "metric_type": "network"}
        if "rollback" in message:
            return {"chart_type": "barChart", "panel": "ERROR_TRACKING", "title": "Transaction Rollbacks", "metric_type": "db_error"}
        if "table not found" in message:
            return {"chart_type": "logStream", "panel": "ERROR_TRACKING", "title": "Schema Errors", "metric_type": "db_error"}
            
        # AUTH ERRORS
        if "jwt" in message or "token" in message:
            if "invalid" in message:
                return {"chart_type": "pieChart", "panel": "AUTH_ERRORS", "title": "Invalid JWTs", "metric_type": "security"}
            if "expired" in message:
                return {"chart_type": "lineChart", "panel": "AUTH_ERRORS", "title": "Expired Sessions", "metric_type": "security"}
        if "unauthorized" in message or "forbidden" in message or "role" in message:
            return {"chart_type": "barChart", "panel": "AUTH_ERRORS", "title": "Permission Denied", "metric_type": "security"}
        if "csrf" in message:
            return {"chart_type": "counter", "panel": "AUTH_ERRORS", "title": "CSRF Mismatches", "metric_type": "security"}

        # API STATUS ERRORS
        if status_code == "400":
            return {"chart_type": "barChart", "panel": "API_ERRORS", "title": "400 Bad Requests", "metric_type": "http_error"}
        if status_code == "401":
            return {"chart_type": "pieChart", "panel": "API_ERRORS", "title": "401 Unauthorized", "metric_type": "http_error"}
        if status_code == "404":
            return {"chart_type": "horizontalBarChart", "panel": "API_ERRORS", "title": "404 Not Found", "metric_type": "http_error"}
        if status_code == "429":
            return {"chart_type": "spikeLine", "panel": "API_ERRORS", "title": "Rate Limits (429)", "metric_type": "traffic_limit"}
        if status_code == "500":
            return {"chart_type": "flashingCounter", "panel": "API_ERRORS", "title": "500 Internal Errors", "metric_type": "critical"}
        if status_code == "503":
            return {"chart_type": "criticalAlertPanel", "panel": "API_ERRORS", "title": "Service Unavailable", "metric_type": "outage"}

        # SERVER/LOGIC ERRORS
        if "null pointer" in message or "npe" in message:
            return {"chart_type": "errorTable", "panel": "APP_ERRORS", "title": "Null Pointer Exceptions", "metric_type": "code_bug"}
        if "division by zero" in message:
            return {"chart_type": "stackTraceViewer", "panel": "APP_ERRORS", "title": "Arithmetic Errors", "metric_type": "code_bug"}
        if "redis" in message:
            return {"chart_type": "redisRing", "panel": "APP_ERRORS", "title": "Redis Cache Health", "metric_type": "infra"}
        if "ssl" in message and "expired" in message:
            return {"chart_type": "criticalBadge", "panel": "SERVER_ERRORS", "title": "SSL Expiration", "metric_type": "security"}
        if "dns" in message and "fail" in message:
            return {"chart_type": "timelineGraph", "panel": "SERVER_ERRORS", "title": "DNS Failures", "metric_type": "network"}

        # SECURITY
        if "sql injection" in message:
            return {"chart_type": "securityTable", "panel": "SECURITY", "title": "SQLi Attempts", "metric_type": "attack"}
        if "brute force" in message:
            return {"chart_type": "lineChart", "panel": "SECURITY", "title": "Brute Force Pattern", "metric_type": "attack"}

        # DEFAULT / RANDOM for non-matching
        random_charts = ["barChart", "lineChart", "pieChart", "counter", "gauge"]
        return {
            "chart_type": random.choice(random_charts),
            "panel": "GENERIC_MONITORING",
            "title": "Log Activity Trend",
            "metric_type": "general_metrtic"
        }

class AIInsightGenerator:
    """Generates insights and fixes based on log content."""
    
    @staticmethod
    def get_explanation(log: Dict[str, Any]) -> Dict[str, str]:
        message = log.get("message", "").lower()
        level = log.get("level", "INFO").upper()
        status_code = str(log.get("status_code", ""))
        
        # Logic for patterns
        if "404" in message or status_code == "404":
            return {
                "reason": "Endpoint path incorrect or resource deleted",
                "impact": "API requests failing for users",
                "suggested_fix": "Verify route configuration and frontend URL mapping"
            }
        
        if "cpu" in message and ("high" in message or "overload" in message):
            return {
                "reason": "Heavy computation or background task spike",
                "impact": "System latency and slow response times",
                "suggested_fix": "Identify high-consuming processes or scale resources"
            }
            
        if "deadlock" in message or "duplicate key" in message:
            return {
                "reason": "Database transaction conflict or constraint violation",
                "impact": "Data persistence failing",
                "suggested_fix": "Optimize query order or check unique constraints"
            }
            
        if "jwt" in message or "unauthorized" in message:
            return {
                "reason": "Security token missing, expired, or invalid",
                "impact": "User unable to access protected resources",
                "suggested_fix": "Check auth middleware and token expiration settings"
            }

        if level == "ERROR":
            return {
                "reason": "Unexpected application failure",
                "impact": "Reduced service availability",
                "suggested_fix": "Check stack trace and recent code deployments"
            }

        return {
            "reason": "Occasional operational event",
            "impact": "Nominal to zero impact on end users",
            "suggested_fix": "Continue monitoring for pattern frequency"
        }

class LogAnalyzer:
    """Main orchestrator for log analysis and chart mapping."""
    
    def __init__(self):
        self.mapper = ChartMapper()
        self.severity_detector = SeverityDetector()
        self.insight_gen = AIInsightGenerator()

    def analyze(self, log: Dict[str, Any]) -> Dict[str, Any]:
        severity = self.severity_detector.detect(log)
        chart_info = self.mapper.map_log_to_chart(log)
        
        return {
            "chart_type": chart_info["chart_type"],
            "panel": chart_info["panel"],
            "severity": severity,
            "title": chart_info["title"],
            "description": f"Analysis of {log.get('level')} from {log.get('service', 'system')}",
            "metric_type": chart_info["metric_type"],
            "visualization": f"{chart_info['chart_type'].lower()}_view",
            "recommended_color": self.severity_detector.get_color(severity)
        }

# Global Instance
analyzer = LogAnalyzer()

def analyze_log_and_assign_chart(log: Dict[str, Any]) -> Dict[str, Any]:
    """Public function to analyze log and return chart metadata."""
    return analyzer.analyze(log)

def explain_log_issue(log: Dict[str, Any]) -> Dict[str, str]:
    """Public function to return AI-driven insights for a log."""
    return AIInsightGenerator.get_explanation(log)
