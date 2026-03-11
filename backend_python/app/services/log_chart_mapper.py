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
        level = (log.get("level") or log.get("type") or "INFO").upper()
        status_code = log.get("status_code")
        message = (log.get("message") or log.get("data") or "").lower()
        count = log.get("count", 1)

        if "unexpected token" in message or "syntax error" in message or "internal server error" in message or "failed to compile" in message:
            return SeverityDetector.CRITICAL
            
        if "critical" in message or "timeout" in message or "failure" in message or "deadlock" in message or "exception" in message:
            return SeverityDetector.CRITICAL
            
        # Frequency-based boosting (Agent 4)
        if count > 10 and ("fail" in message or "error" in message):
            return SeverityDetector.CRITICAL

        if level == "WARNING" or (status_code and str(status_code).startswith("4")) or count > 5:
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
        # Basic
        "lineChart", "barChart", "areaChart", "scatterPlot", "bubbleChart",
        # Comparison
        "groupedBarChart", "divergingBar", "dotPlot",
        # Distribution
        "histogram", "boxPlot", "densityPlot",
        # Part-to-Whole
        "pieChart", "donutChart", "treemap", "sunburst", "waterfall",
        # Relationship (Advanced)
        "networkGraph", "chordDiagram", "sankeyDiagram", "forceDirected",
        # Time Series
        "timeSeriesLine", "stepLine", "candlestick",
        # System Monitoring
        "gauge", "progressRing", "kpiCard", "sparkline", "liveLogStream",
        # Elite Visuals
        "heatmap", "calendarHeatmap", "threeDScatter", "threeDSurface", "streamGraph",
        # Legacy/Internal
        "radialGauge", "ring", "ringChart"
    ]

    @staticmethod
    def map_log_to_chart(log: Dict[str, Any]) -> Dict[str, str]:
        message = (log.get("message") or log.get("data") or "").lower()
        service = (log.get("service") or "").lower()
        status_code = str(log.get("status_code", ""))
        
        # ── CORE ARCHITECTURE MAPPING (Agent 5) ──
        if "spike" in message or "traffic" in message:
            return {"chart_type": "lineChart", "panel": "API_TRAFFIC", "title": "Traffic Leak", "metric_type": "load"}
        if "distribution" in message or "breakdown" in message:
            return {"chart_type": "pieChart", "panel": "ANALYTICS", "title": "Error Distribution", "metric_type": "grouping"}
        if "dependency" in message or "service chain" in message:
            return {"chart_type": "sankeyDiagram", "panel": "SYSTEM_HEALTH", "title": "Service Dependency", "metric_type": "topology"}
        if "density" in message or "load intensity" in message:
            return {"chart_type": "heatmap", "panel": "INFRASTRUCTURE", "title": "Resource Density", "metric_type": "intensity"}
        if "history" in message:
            return {"chart_type": "calendarHeatmap", "panel": "ANALYTICS", "title": "Event History", "metric_type": "temporal"}
        if "stack trace" in message or "error call" in message:
            return {"chart_type": "waterfall", "panel": "APPLICATION_LOGS", "title": "Call Stack Trace", "metric_type": "debug"}

        # ── DATABASE & PERFORMANCE ──
        if "db timeout" in message or "database timeout" in message:
            return {"chart_type": "gauge", "panel": "DATABASE_MONITORING", "title": "DB Timeout", "metric_type": "connection"}
        if "slow query" in message or "slow sql" in message:
            return {"chart_type": "line", "panel": "DATABASE_MONITORING", "title": "DB Slow Query", "metric_type": "performance"}
        if "duplicate key" in message:
            return {"chart_type": "table", "panel": "DATABASE_MONITORING", "title": "Duplicate Key Error", "metric_type": "integrity"}
        if "deadlock" in message:
            if "thread" in message:
                return {"chart_type": "counter", "panel": "SYSTEM_HEALTH", "title": "Thread Deadlock", "metric_type": "concurrency"}
            return {"chart_type": "counter", "panel": "DATABASE_MONITORING", "title": "Transaction Deadlock", "metric_type": "concurrency"}
        if "schema mismatch" in message or "table not found" in message:
            return {"chart_type": "table", "panel": "DATABASE_MONITORING", "title": "DB Schema Mismatch", "metric_type": "validation"}
        if "migration" in message and ("fail" in message or "error" in message):
            return {"chart_type": "counter", "panel": "DATABASE_MONITORING", "title": "Migration Failure", "metric_type": "deployment"}
        if "redis" in message and ("fail" in message or "down" in message):
            return {"chart_type": "gauge", "panel": "DATABASE_MONITORING", "title": "Redis Connection", "metric_type": "cache"}
        if "cache overflow" in message:
            return {"chart_type": "ring", "panel": "DATABASE_MONITORING", "title": "Cache Overflow", "metric_type": "memory"}
        if "cache connection" in message and ("fail" in message or "error" in message):
            return {"chart_type": "gauge", "panel": "DATABASE_MONITORING", "title": "Cache Conn Fail", "metric_type": "availability"}

        # ── AUTH & SECURITY ──
        if "auth failure" in message or "login fail" in message:
            return {"chart_type": "pie", "panel": "SECURITY", "title": "Auth Failure", "metric_type": "access"}
        if "expired token" in message or "jwt expired" in message:
            return {"chart_type": "line", "panel": "SECURITY", "title": "Expired Token", "metric_type": "session"}
        if "role denied" in message or "permission denied" in message:
            return {"chart_type": "bar", "panel": "SECURITY", "title": "Role Denied", "metric_type": "authorization"}
        if "session expired" in message:
            return {"chart_type": "pie", "panel": "SECURITY", "title": "Session Expired", "metric_type": "session"}
        if "oauth" in message and ("fail" in message or "error" in message):
            return {"chart_type": "pie", "panel": "SECURITY", "title": "OAuth Failure", "metric_type": "external_auth"}
        if "sql injection" in message:
            return {"chart_type": "securityTable", "panel": "SECURITY", "title": "SQL Injection Attempt", "metric_type": "exploit"}
        if "brute force" in message:
            return {"chart_type": "line", "panel": "SECURITY", "title": "Brute Force Detection", "metric_type": "attack"}
        if "token tampering" in message or "signature mismatch" in message:
            return {"chart_type": "securityBar", "panel": "SECURITY", "title": "Token Tampering", "metric_type": "integrity"}
        if "unauthorized" in message and "access" in message:
            return {"chart_type": "bar", "panel": "SECURITY", "title": "Unauthorized Access", "metric_type": "access"}
        if "ssl" in message and "expired" in message:
            return {"chart_type": "badge", "panel": "SECURITY", "title": "SSL Expired", "metric_type": "certificate"}

        # ── API & TRAFFIC ──
        if status_code == "400" or "bad request" in message:
            return {"chart_type": "bar", "panel": "API_TRAFFIC", "title": "Bad Request (400)", "metric_type": "http_error"}
        if status_code == "500" or "internal error" in message:
            return {"chart_type": "counter", "panel": "API_TRAFFIC", "title": "Internal Error", "metric_type": "http_error"}
        if status_code == "503" or "service unavailable" in message:
            return {"chart_type": "alertPanel", "panel": "API_TRAFFIC", "title": "Service Unavailable", "metric_type": "availability"}
        if status_code == "429" or "rate limit" in message:
            return {"chart_type": "line", "panel": "API_TRAFFIC", "title": "Rate Limited", "metric_type": "throughput"}
        if "slow endpoint" in message or "latency" in message:
            return {"chart_type": "line", "panel": "API_TRAFFIC", "title": "Slow Endpoint", "metric_type": "latency"}
        if "rps" in message or "high rps" in message:
            return {"chart_type": "line", "panel": "API_TRAFFIC", "title": "High RPS Traffic", "metric_type": "volume"}
        if "user spike" in message:
            return {"chart_type": "line", "panel": "API_TRAFFIC", "title": "User Spike", "metric_type": "engagement"}
        if "traffic spike" in message:
            return {"chart_type": "line", "panel": "API_TRAFFIC", "title": "Traffic Spike", "metric_type": "load"}
        if "imbalance" in message:
            return {"chart_type": "bar", "panel": "API_TRAFFIC", "title": "Load Imbalance", "metric_type": "distribution"}
        if "invalid method" in message:
            return {"chart_type": "bar", "panel": "API_TRAFFIC", "title": "Invalid Method", "metric_type": "http_bad"}
        if "payload too large" in message or status_code == "413":
            return {"chart_type": "table", "panel": "API_TRAFFIC", "title": "Payload Too Large", "metric_type": "http_bad"}
        if "unsupported type" in message or status_code == "415":
            return {"chart_type": "table", "panel": "API_TRAFFIC", "title": "Unsupported Media", "metric_type": "http_bad"}

        # ── SYSTEM & INFRA ──
        if "cpu overload" in message:
            return {"chart_type": "ring", "panel": "SYSTEM_HEALTH", "title": "CPU Overload", "metric_type": "usage"}
        if "memory leak" in message:
            return {"chart_type": "ring", "panel": "SYSTEM_HEALTH", "title": "Memory Leak", "metric_type": "usage"}
        if "disk full" in message or "disk space" in message:
            return {"chart_type": "gauge", "panel": "SYSTEM_HEALTH", "title": "Disk Full", "metric_type": "usage"}
        if "docker" in message and "crash" in message:
            return {"chart_type": "counter", "panel": "SYSTEM_HEALTH", "title": "Docker Container Crash", "metric_type": "restart"}
        if "container restart" in message:
            return {"chart_type": "counter", "panel": "SYSTEM_HEALTH", "title": "Container Restart", "metric_type": "restart"}
        if "threads" in message and "exhaust" in message:
            return {"chart_type": "line", "panel": "SYSTEM_HEALTH", "title": "Thread Exhaustion", "metric_type": "threads"}
        if "dns" in message and "fail" in message:
            return {"chart_type": "timeline", "panel": "SYSTEM_HEALTH", "title": "DNS Failure", "metric_type": "network"}
        if "network timeout" in message:
            return {"chart_type": "line", "panel": "SYSTEM_HEALTH", "title": "Network Timeout", "metric_type": "network"}
        if "queue overflow" in message:
            return {"chart_type": "gauge", "panel": "SYSTEM_HEALTH", "title": "Queue Overflow", "metric_type": "load"}
        if "service restart" in message:
            return {"chart_type": "counter", "panel": "SYSTEM_HEALTH", "title": "Service Restart", "metric_type": "lifecycle"}

        # ── ERRORS & EXCEPTIONS ──
        if "file corrupt" in message:
            return {"chart_type": "table", "panel": "APPLICATION_LOGS", "title": "File Corrupt", "metric_type": "io_error"}
        if "null pointer" in message or "npe" in message:
            return {"chart_type": "logViewer", "panel": "APPLICATION_LOGS", "title": "Null Pointer", "metric_type": "runtime_error"}
        if "division by zero" in message:
            return {"chart_type": "stackTrace", "panel": "APPLICATION_LOGS", "title": "Division by Zero", "metric_type": "runtime_error"}
        if "invalid input" in message:
            return {"chart_type": "table", "panel": "APPLICATION_LOGS", "title": "Invalid Input", "metric_type": "logic_error"}
        if "json parse" in message:
            return {"chart_type": "table", "panel": "APPLICATION_LOGS", "title": "JSON Parse Error", "metric_type": "format_error"}
        if "timeout exception" in message:
            return {"chart_type": "table", "panel": "APPLICATION_LOGS", "title": "Timeout Exception", "metric_type": "runtime_error"}
        if "unknown exception" in message or "unexpected error" in message:
            return {"chart_type": "logConsole", "panel": "APPLICATION_LOGS", "title": "Unknown Exception", "metric_type": "runtime_error"}
        if "config error" in message:
            return {"chart_type": "logViewer", "panel": "APPLICATION_LOGS", "title": "Config Error", "metric_type": "env_error"}
        if "environment variable" in message and "missing" in message:
            return {"chart_type": "logViewer", "panel": "APPLICATION_LOGS", "title": "Env Var Missing", "metric_type": "env_error"}
        if "unexpected token" in message or "syntax error" in message or "syntaxerror" in message:
            return {"chart_type": "stackTrace", "panel": "APPLICATION_LOGS", "title": "Syntax Error", "metric_type": "compilation_failure"}
        if "high error rate" in message:
            return {"chart_type": "ring", "panel": "APPLICATION_LOGS", "title": "High Error Rate", "metric_type": "health_score"}

        # ── EXTERNAL & JOBS ──
        if "ai api" in message and "fail" in message:
            return {"chart_type": "counter", "panel": "EXTERNAL_SERVICES", "title": "AI API Failure", "metric_type": "third_party"}
        if "payment" in message and "timeout" in message:
            return {"chart_type": "pie", "panel": "EXTERNAL_SERVICES", "title": "Payment Timeout", "metric_type": "third_party"}
        if "webhook" in message:
            if "retry" in message:
                return {"chart_type": "counter", "panel": "EXTERNAL_SERVICES", "title": "Webhook Retry Fail", "metric_type": "outbound"}
            return {"chart_type": "line", "panel": "EXTERNAL_SERVICES", "title": "Webhook Failure", "metric_type": "outbound"}
        if "cron failure" in message:
            return {"chart_type": "counter", "panel": "EXTERNAL_SERVICES", "title": "Cron Failure", "metric_type": "scheduler"}
        if "background job" in message:
            if "stuck" in message:
                return {"chart_type": "counter", "panel": "EXTERNAL_SERVICES", "title": "Background Job Stuck", "metric_type": "workers"}
            if "crash" in message:
                return {"chart_type": "counter", "panel": "EXTERNAL_SERVICES", "title": "Background Job Crash", "metric_type": "workers"}

        # DEFAULT / RANDOM for non-matching
        random_charts = ["bar", "line", "pie", "counter", "gauge"]
        return {
            "chart_type": random.choice(random_charts),
            "panel": "GENERIC_MONITORING",
            "title": "Log Activity Trend",
            "metric_type": "general_metric"
        }
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
        message = (log.get("message") or log.get("data") or "").lower()
        level = (log.get("level") or log.get("type") or "INFO").upper()
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

        if "unexpected token" in message or "syntax error" in message or "failed to compile" in message:
            return {
                "reason": "Critical Syntax or Compilation Error detected in the project build pipeline.",
                "impact": "HIGH: The application UI will fail to render. Compilation is blocked, preventing any updates to the user.",
                "suggested_fix": "Identify the variable typo or missing symbol (e.g. check for a space in 'setStudents' or a missing comma). Fix the source file and save to trigger a clean HMR update."
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
