import os
import uuid
import json
import logging
import pandas as pd
from datetime import datetime
from typing import List, Dict, Any, Optional
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import inch

logger = logging.getLogger(__name__)

REPORT_TYPE_KEYWORDS = {
    "financial": [
        "revenue", "profit", "loss", "income", "expense", "expenses", "financial",
        "earnings", "balance", "cashflow", "cash flow", "payment summary",
        "sales amount", "turnover", "tax", "billing", "invoice", "gross",
        "net profit", "net income", "margin"
    ],
    "transaction": [
        "transaction", "transactions", "payment", "payments", "transfer",
        "transfers", "order", "orders", "purchase", "purchases",
        "booking", "bookings", "transaction history", "payment history",
        "order history", "sales transactions"
    ],
    "operational": [
        "daily report", "daily activity", "operations", "operational",
        "activity report", "system activity", "usage report",
        "today activity", "daily summary", "system usage"
    ],
    "customer": [
        "customer", "customers", "user", "users", "client", "clients",
        "member", "members", "account holders", "registered users",
        "active users", "inactive users", "new users",
        "customer list", "user list"
    ],
    "audit": [
        "audit", "audit log", "logs", "login history", "access log",
        "activity log", "security log", "change log",
        "modification history", "user activity log",
        "system log", "authentication log"
    ],
    "performance": [
        "performance", "performance report", "execution time",
        "response time", "latency", "system performance",
        "query performance", "speed report", "efficiency report"
    ],
    "analytical": [
        "analysis", "analytics", "trend", "trends", "growth",
        "comparison", "statistics", "statistical", "pattern",
        "patterns", "insights", "forecast", "prediction",
        "trend analysis", "growth rate"
    ],
    "inventory": [
        "inventory", "stock", "stocks", "product quantity",
        "product stock", "available stock", "remaining stock",
        "warehouse", "warehouse report", "stock report"
    ],
    "exception": [
        "error", "errors", "exception", "exceptions", "failed",
        "failures", "invalid", "invalid records", "missing data",
        "anomalies", "problem report", "issue report", "error log"
    ],
    "compliance": [
        "compliance", "regulation", "regulatory", "legal report",
        "policy compliance", "compliance status", "requirement report"
    ],
    "executive": [
        "summary", "executive summary", "overview", "dashboard",
        "high level report", "business summary", "company summary",
        "kpi", "kpis", "key metrics", "performance summary"
    ],
    "master": [
        "master data", "master report", "database report",
        "all records", "full list", "complete list",
        "data list", "entity list", "record list"
    ],
    "custom": []
}

class ReportGenerator:
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.default_config = {
            "organization_name": "Querion Enterprise",
            "generated_by": "Querion AI System",
            "output_directory": "./reports",
            "output_formats": ["pdf", "excel", "csv", "json"]
        }
        if config:
            self.default_config.update(config)
        
        if not os.path.exists(self.default_config["output_directory"]):
            os.makedirs(self.default_config["output_directory"])

    def detect_report_type(self, user_query: str) -> str:
        query_lower = user_query.lower()
        for report_type, keywords in REPORT_TYPE_KEYWORDS.items():
            for keyword in keywords:
                if keyword in query_lower:
                    return report_type
        return "custom"

    def validate_data(self, data: List[Dict[str, Any]]) -> bool:
        if not data or not isinstance(data, list):
            return False
        return True

    def analyze_data(self, data: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not data:
            return {}
        
        df = pd.DataFrame(data)
        analysis = {
            "total_records": len(df),
            "total_columns": len(df.columns),
            "numeric_stats": {},
            "exceptions": {
                "null_values_count": int(df.isnull().sum().sum()),
                "missing_values_count": int((df == "").sum().sum()),
                "error_types": []
            }
        }

        # Numeric stats
        numeric_cols = df.select_dtypes(include=['number']).columns
        for col in numeric_cols:
            analysis["numeric_stats"][col] = {
                "sum": float(df[col].sum()),
                "avg": float(df[col].mean()),
                "min": float(df[col].min()),
                "max": float(df[col].max())
            }

        return analysis

    def generate_summary(self, data: List[Dict[str, Any]]) -> List[str]:
        if not data:
            return ["No data available for analysis."]
        
        df = pd.DataFrame(data)
        findings = []
        findings.append(f"The report contains data for {len(df)} records across {len(df.columns)} dimensions.")
        
        numeric_cols = df.select_dtypes(include=['number']).columns
        if not numeric_cols.empty:
            major_col = numeric_cols[0]
            findings.append(f"Primary metric '{major_col}' shows a total of {df[major_col].sum():,.2f} with an average of {df[major_col].mean():,.2f}.")
            findings.append(f"Maximum value for '{major_col}' is {df[major_col].max():,.2f}, while the minimum is {df[major_col].min():,.2f}.")
        
        if df.isnull().values.any():
            findings.append("The dataset contains some missing values that might require audit.")
        else:
            findings.append("Data integrity check passed: No null values detected in the primary record set.")
            
        return findings

    def build_report_structure(self, data: List[Dict[str, Any]], user_query: str, config: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        conf = self.default_config.copy()
        if config:
            conf.update(config)

        report_type = self.detect_report_type(user_query)
        analysis = self.analyze_data(data)
        findings = self.generate_summary(data)
        
        report_id = str(uuid.uuid4())
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        structure = {
            "header": {
                "organization_name": conf["organization_name"],
                "report_title": f"Enterprise {report_type.capitalize()} Analysis",
                "report_type": f"{report_type.capitalize()} Report",
                "report_id": report_id,
                "generated_timestamp": timestamp,
                "generated_by": conf["generated_by"],
                "user_query": user_query
            },
            "executive_summary": {
                "total_records": analysis["total_records"],
                "total_columns": analysis["total_columns"],
                "key_stats": analysis["numeric_stats"],
                "findings": findings,
                "conclusion": "Based on the provided data, the system successfully generated a comprehensive report for further business decision making."
            },
            "data_table": {
                "columns": list(data[0].keys()) if data else [],
                "rows": data
            },
            "analytics_section": analysis["numeric_stats"],
            "exception_section": analysis["exceptions"],
            "metadata": {
                "report_id": report_id,
                "row_count": analysis["total_records"],
                "generation_time": "Real-time"
            },
            "footer": {
                "notice": "System generated notice: Confidential - Internal Use Only",
                "system_name": "Querion Enterprise Engine",
                "generation_time": timestamp
            }
        }
        return structure

    def export_to_pdf(self, report: Dict[str, Any], filepath: str):
        doc = SimpleDocTemplate(filepath, pagesize=letter)
        styles = getSampleStyleSheet()
        elements = []

        # Custom styles
        title_style = ParagraphStyle(
            'ReportTitle',
            parent=styles['Heading1'],
            fontSize=18,
            spaceAfter=20,
            textColor=colors.indigo
        )
        section_style = ParagraphStyle(
            'SectionHeader',
            parent=styles['Heading2'],
            fontSize=14,
            spaceBefore=15,
            spaceAfter=10,
            borderPadding=5,
            textColor=colors.darkblue
        )

        header = report["header"]
        elements.append(Paragraph(header["organization_name"], styles['Normal']))
        elements.append(Paragraph(header["report_title"], title_style))
        elements.append(Paragraph(f"Report Type: {header['report_type']}", styles['Normal']))
        elements.append(Paragraph(f"Report ID: {header['report_id']}", styles['Normal']))
        elements.append(Paragraph(f"Generated On: {header['generated_timestamp']}", styles['Normal']))
        elements.append(Paragraph(f"Generated By: {header['generated_by']}", styles['Normal']))
        elements.append(Spacer(1, 0.3 * inch))

        # Executive Summary
        elements.append(Paragraph("EXECUTIVE SUMMARY", section_style))
        summary = report["executive_summary"]
        elements.append(Paragraph(f"Total Records: {summary['total_records']}", styles['Normal']))
        elements.append(Spacer(1, 0.1 * inch))
        elements.append(Paragraph("Key Findings:", styles['Heading3']))
        for f in summary["findings"]:
            elements.append(Paragraph(f"• {f}", styles['Normal']))
        
        elements.append(Spacer(1, 0.3 * inch))

        # Data Table (First 100 rows to keep PDF manageable)
        elements.append(Paragraph("DETAILED REPORT DATA (Preview)", section_style))
        data_table = report["data_table"]
        headers = data_table["columns"]
        rows = [[str(r.get(h, "")) for h in headers] for r in data_table["rows"][:50]]
        
        # Add headers as first row
        table_data = [headers] + rows
        
        t = Table(table_data)
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.indigo),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTSIZE', (0, 0), (-1, -1), 8)
        ]))
        elements.append(t)
        
        if len(data_table["rows"]) > 50:
            elements.append(Paragraph(f"... showing 50 of {len(data_table['rows'])} rows.", styles['Italic']))

        # Analytics
        elements.append(PageBreak())
        elements.append(Paragraph("DATA ANALYSIS", section_style))
        for col, stats in report["analytics_section"].items():
            elements.append(Paragraph(f"Column: {col}", styles['Heading3']))
            stats_text = f"Sum: {stats['sum']:,.2f} | Avg: {stats['avg']:,.2f} | Min: {stats['min']:,.2f} | Max: {stats['max']:,.2f}"
            elements.append(Paragraph(stats_text, styles['Normal']))
            elements.append(Spacer(1, 0.1 * inch))

        # Footer
        elements.append(Spacer(1, inch))
        footer = report["footer"]
        elements.append(Paragraph("-----------------------------------------", styles['Normal']))
        elements.append(Paragraph(footer["notice"], styles['Italic']))
        elements.append(Paragraph(f"System: {footer['system_name']}", styles['Normal']))
        elements.append(Paragraph(f"Confidentiality: Internal Use Only", styles['Normal']))

        doc.build(elements)

    def export_to_excel(self, report: Dict[str, Any], filepath: str):
        data = report["data_table"]["rows"]
        df = pd.DataFrame(data)
        
        with pd.ExcelWriter(filepath, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Report Data', index=False)
            
            # Create a summary sheet
            summary_info = {
                "Metric": ["Report Title", "Report ID", "Generated On", "Total Records"],
                "Value": [report["header"]["report_title"], report["header"]["report_id"], report["header"]["generated_timestamp"], len(df)]
            }
            summary_df = pd.DataFrame(summary_info)
            summary_df.to_excel(writer, sheet_name='Summary', index=False)

    def export_to_csv(self, report: Dict[str, Any], filepath: str):
        df = pd.DataFrame(report["data_table"]["rows"])
        df.to_csv(filepath, index=False)

    def export_to_json(self, report: Dict[str, Any], filepath: str):
        with open(filepath, 'w') as f:
            json.dump(report, f, indent=4)

    def generate_report(self, data: List[Dict[str, Any]], user_query: str, config: Optional[Dict[str, Any]] = None) -> List[str]:
        if not self.validate_data(data):
            raise ValueError("Invalid input data.")
        
        report = self.build_report_structure(data, user_query, config)
        report_id = report["header"]["report_id"]
        
        output_files = []
        formats = config.get("output_formats", self.default_config["output_formats"]) if config else self.default_config["output_formats"]
        
        base_path = os.path.join(self.default_config["output_directory"], f"Report_{report_id}")
        
        if "pdf" in formats:
            path = f"{base_path}.pdf"
            self.export_to_pdf(report, path)
            output_files.append(path)
            
        if "excel" in formats:
            path = f"{base_path}.xlsx"
            self.export_to_excel(report, path)
            output_files.append(path)
            
        if "csv" in formats:
            path = f"{base_path}.csv"
            self.export_to_csv(report, path)
            output_files.append(path)
            
        if "json" in formats:
            path = f"{base_path}.json"
            self.export_to_json(report, path)
            output_files.append(path)
            
        return output_files, report_id
