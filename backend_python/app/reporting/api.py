from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from .report_engine import ReportGenerator
import os

router = APIRouter(prefix="/reporting", tags=["Reporting"])
generator = ReportGenerator()

class ReportRequest(BaseModel):
    user_query: str = Field(..., description="The natural language query used to generate the data")
    sql_query: str = Field(..., description="The SQL query that was executed")
    data: List[Dict[str, Any]] = Field(..., description="The result data rows")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Optional metadata about the query")
    export_format: str = Field("pdf", pattern="^(pdf|excel|csv|json|xlsx)$", description="The desired export format")

class ReportResponse(BaseModel):
    report_id: Optional[str]
    report_type: str
    file_path: Optional[str]
    status: str
    message: Optional[str] = None

@router.post("/generate-report", response_model=ReportResponse)
async def generate_report_endpoint(request: ReportRequest):
    """
    Endpoint to generate a professional report from query results.
    """
    if not request.data:
        raise HTTPException(status_code=400, detail="No data provided for report generation.")
        
    result = generator.generate_report(
        user_query=request.user_query,
        sql_query=request.sql_query,
        data=request.data,
        metadata=request.metadata,
        export_format=request.export_format
    )
    
    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result.get("message", "Unknown error during report generation"))
        
    return result

@router.get("/download/{report_type}/{filename}")
async def download_report(report_type: str, filename: str):
    """
    Optional endpoint to download generated reports (if serving static files isn't enough).
    Note: In production, you'd use FileResponse.
    """
    from fastapi.responses import FileResponse
    
    # Map report_type to extension for directory lookup
    ext_map = {
        "pdf": "pdf",
        "excel": "excel",
        "xlsx": "excel",
        "csv": "csv",
        "json": "json"
    }
    
    ext = filename.split(".")[-1]
    dir_name = ext_map.get(ext, "pdf")
    file_path = os.path.join("reports", dir_name, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Report file not found")
        
    return FileResponse(file_path)
