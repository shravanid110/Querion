import logging
from typing import List, Dict, Any, Optional
from .template_engine import TemplateEngine
from .analysis_engine import AnalysisEngine
from .chart_engine import ChartEngine
from .export_engine import ExportEngine

logger = logging.getLogger(__name__)

class ReportGenerator:
    """
    Main orchestrator for report generation. 
    Coordinates analysis, template building, chart generation, and exporting.
    """
    
    def __init__(self, output_dir: str = "reports"):
        self.template_engine = TemplateEngine()
        self.analysis_engine = AnalysisEngine()
        self.chart_engine = ChartEngine()
        self.export_engine = ExportEngine(base_dir=output_dir)

    def generate_report(
        self,
        user_query: str,
        sql_query: str,
        data: List[Dict[str, Any]],
        metadata: Optional[Dict[str, Any]] = None,
        export_format: str = "pdf"
    ) -> Dict[str, Any]:
        """
        Executes the full report generation workflow.
        """
        try:
            # 1. Analyze Data
            analysis_results = self.analysis_engine.analyze_data(data)
            
            # 2. Generate Charts (if numeric data exists)
            chart_paths = []
            if analysis_results["numeric_columns"]:
                chart_paths = self.chart_engine.generate_charts(data, analysis_results["numeric_columns"])
                
            # 3. Build Template
            report = self.template_engine.build_template(
                user_query=user_query,
                sql_query=sql_query,
                data=data,
                analysis_results=analysis_results,
                chart_paths=chart_paths,
                metadata=metadata
            )
            
            # 4. Export Report
            format_lower = export_format.lower()
            file_path = ""
            
            if format_lower == "pdf":
                file_path = self.export_engine.export_to_pdf(report, data)
            elif format_lower == "excel" or format_lower == "xlsx":
                file_path = self.export_engine.export_to_excel(report, data)
            elif format_lower == "csv":
                file_path = self.export_engine.export_to_csv(report, data)
            elif format_lower == "json":
                file_path = self.export_engine.export_to_json(report, data)
            else:
                raise ValueError(f"Unsupported export format: {export_format}")
            
            return {
                "report_id": report["header"]["report_id"],
                "report_type": report["header"]["report_type"],
                "file_path": file_path,
                "status": "success"
            }
            
        except Exception as e:
            logger.error(f"Failed to generate report: {e}")
            return {
                "report_id": None,
                "report_type": "error",
                "file_path": None,
                "status": "error",
                "message": str(e)
            }
