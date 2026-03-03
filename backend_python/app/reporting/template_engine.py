import datetime
import uuid
from typing import List, Dict, Any, Optional

class TemplateEngine:
    """
    Engine for detecting report types and building the universal report template.
    """
    
    REPORT_TYPES = {
        "financial": "financial_report",
        "sales": "sales_report",
        "customer": "customer_report",
        "inventory": "inventory_report",
        "performance": "performance_report",
        "audit": "audit_report",
        "operational": "operational_report",
        "analytical": "analytical_report",
        "statistical": "statistical_report",
        "comparison": "comparison_report",
        "trend": "trend_report",
        "summary": "summary_report"
    }

    @staticmethod
    def detect_report_type(user_query: str) -> str:
        """
        Detects the report type based on keywords in the user query.
        """
        query_lower = user_query.lower()
        for keyword, report_type in TemplateEngine.REPORT_TYPES.items():
            if keyword in query_lower:
                return report_type
        return "custom_report"

    @staticmethod
    def build_template(
        user_query: str,
        sql_query: str,
        data: List[Dict[str, Any]],
        analysis_results: Dict[str, Any],
        chart_paths: List[str],
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Builds the universal report template dictionary.
        """
        report_id = str(uuid.uuid4())
        report_type = TemplateEngine.detect_report_type(user_query)
        timestamp = datetime.datetime.now().isoformat()
        
        # Use first 50 rows for data table in the template to avoid bloat
        # The export engine will handle full data for CSV/Excel
        display_data = data[:50] 

        template = {
            "header": {
                "report_id": report_id,
                "report_title": f"{report_type.replace('_', ' ').title()}",
                "report_type": report_type,
                "generated_timestamp": timestamp,
                "generated_by": "Querion Engine"
            },
            "metadata": {
                "user_query": user_query,
                "sql_query": sql_query,
                "database_name": metadata.get("database_name", "Unknown") if metadata else "Unknown",
                "table_name": metadata.get("table_name", "Unknown") if metadata else "Unknown",
                "total_records": analysis_results["total_records"],
                "execution_time": metadata.get("execution_time", "N/A") if metadata else "N/A"
            },
            "summary": {
                "total_records": analysis_results["total_records"],
                "numeric_columns": analysis_results["numeric_columns"],
                "key_findings": analysis_results["insights"][:5] # Top 5 insights
            },
            "metrics": analysis_results["metrics"],
            "data_table": display_data,
            "insights": analysis_results["insights"],
            "charts": chart_paths,
            "footer": {
                "generated_timestamp": timestamp,
                "system_name": "Querion Report Generation Engine v1.0"
            }
        }
        
        return template
