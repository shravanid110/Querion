import os
import glob
from datetime import datetime
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from app.services.report_service import generate_ai_report, REPORTS_DIR

router = APIRouter()


class AiReportRequest(BaseModel):
    data:  List[Dict[str, Any]]
    query: str


class LegacyReportRequest(BaseModel):
    data:       List[Dict[str, Any]]
    user_query: str
    config:     Optional[Dict[str, Any]] = None
    format:     str = "pdf"


# ── AI Report (new) ──────────────────────────────────────────────────────────
@router.post("/generate-ai")
async def generate_ai_report_endpoint(req: AiReportRequest):
    """
    Accepts { data: [...], query: "..." }
    Returns a downloadable professional PDF.
    """
    if not req.data:
        raise HTTPException(status_code=400, detail="No data provided.")
    try:
        pdf_path, report_id = await generate_ai_report(req.data, req.query)
        filename = os.path.basename(pdf_path)
        return FileResponse(
            path=pdf_path,
            filename=filename,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except Exception as e:
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ── List saved reports ───────────────────────────────────────────────────────
@router.get("/list")
async def list_saved_reports():
    """Returns metadata of all saved PDF reports."""
    try:
        pattern = os.path.join(REPORTS_DIR, "Report_*.pdf")
        files = sorted(glob.glob(pattern), key=os.path.getmtime, reverse=True)
        result = []
        for f in files:
            fname = os.path.basename(f)
            mtime = os.path.getmtime(f)
            size  = os.path.getsize(f)
            result.append({
                "filename": fname,
                "report_id": fname.replace("Report_", "").replace(".pdf", ""),
                "created_at": datetime.fromtimestamp(mtime).strftime("%Y-%m-%d %H:%M:%S"),
                "size_kb": round(size / 1024, 1),
            })
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Download a saved report ──────────────────────────────────────────────────
@router.get("/download/{filename}")
async def download_report(filename: str):
    path = os.path.join(REPORTS_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Report not found.")
    return FileResponse(
        path=path,
        filename=filename,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── Delete a saved report ────────────────────────────────────────────────────
@router.delete("/delete/{filename}")
async def delete_report(filename: str):
    path = os.path.join(REPORTS_DIR, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Report not found.")
    os.remove(path)
    return {"success": True, "message": f"Deleted {filename}"}


# ── Legacy endpoint (keep backward compatibility) ─────────────────────────────
@router.post("/generate")
async def generate_legacy_report(req: LegacyReportRequest):
    """Legacy endpoint — routes to the new AI generator."""
    ai_req = AiReportRequest(data=req.data, query=req.user_query)
    return await generate_ai_report_endpoint(ai_req)
