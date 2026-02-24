from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app.services.report_service import ReportGenerator
import os
from fastapi.responses import FileResponse

router = APIRouter()
report_gen = ReportGenerator()

class ReportRequest(BaseModel):
    data: List[Dict[str, Any]]
    user_query: str
    config: Optional[Dict[str, Any]] = None
    format: str = "pdf" # default format requested

@router.post("/generate")
async def generate_enterprise_report(req: ReportRequest):
    try:
        # We only generate the requested format for the immediate download
        config = req.config or {}
        config["output_formats"] = [req.format]
        
        output_files, report_id = report_gen.generate_report(req.data, req.user_query, config)
        
        if not output_files:
            raise HTTPException(status_code=500, detail="Report generation failed")
            
        file_path = output_files[0]
        filename = os.path.basename(file_path)
        
        return FileResponse(
            path=file_path,
            filename=filename,
            media_type='application/octet-stream'
        )
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
