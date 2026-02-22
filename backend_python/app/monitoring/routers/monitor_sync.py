from fastapi import APIRouter, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from ..models import get_monitor_db, UserProject, ProjectFile, ProjectLog
from ..agents.monitoring_agent import MonitoringAgent
from app.config import settings
from app.monitoring.schemas import LogMessage

router = APIRouter()

# ── Agent instance (shared) ───────────────────────────────────────────────────
_agent = None
def get_agent():
    global _agent
    if _agent is None:
        try:
            _agent = MonitoringAgent(groq_api_key=settings.GROK_API_KEY)
        except Exception:
            pass
    return _agent

# ── Pydantic Models ───────────────────────────────────────────────────────────

class FileDelta(BaseModel):
    file_path: str
    content: str

class LogLine(BaseModel):
    line: str
    timestamp: Optional[datetime] = None

class SyncRequest(BaseModel):
    user_id: str
    project_name: str
    files: Optional[List[FileDelta]] = None
    logs: Optional[List[LogLine]] = None

class ChatRequest(BaseModel):
    user_id: str
    project_name: str
    message: str

# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/sync")
async def sync_monitor_data(req: SyncRequest, db: Session = Depends(get_monitor_db)):
    """Receive file deltas and log lines from the CLI."""
    project = db.query(UserProject).filter(
        UserProject.user_id == req.user_id,
        UserProject.project_name == req.project_name
    ).first()

    if not project:
        project = UserProject(user_id=req.user_id, project_name=req.project_name)
        db.add(project)
        db.flush()

    if req.files:
        for f in req.files:
            existing_file = db.query(ProjectFile).filter(
                ProjectFile.project_id == project.id,
                ProjectFile.file_path == f.file_path
            ).first()
            if existing_file:
                existing_file.content = f.content
            else:
                db.add(ProjectFile(
                    project_id=project.id,
                    file_path=f.file_path,
                    content=f.content
                ))

    if req.logs:
        for l in req.logs:
            db.add(ProjectLog(
                project_id=project.id,
                log_line=l.line,
                timestamp=l.timestamp or datetime.utcnow()
            ))

    project.last_updated = datetime.utcnow()
    db.commit()
    return {"status": "success", "project_id": project.id}


@router.get("/projects/{user_id}")
async def get_user_projects(user_id: str, db: Session = Depends(get_monitor_db)):
    """List all projects for a user."""
    projects = db.query(UserProject).filter(UserProject.user_id == user_id).all()
    return [{
        "id": p.id,
        "name": p.project_name,
        "last_updated": p.last_updated,
        "file_count": len(p.files),
        "log_count": len(p.logs)
    } for p in projects]


@router.get("/logs/{project_id}")
async def get_project_logs(project_id: int, limit: int = 200, db: Session = Depends(get_monitor_db)):
    """Return recent log lines for a project."""
    project = db.query(UserProject).filter(UserProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    logs = db.query(ProjectLog).filter(
        ProjectLog.project_id == project_id
    ).order_by(ProjectLog.timestamp.desc()).limit(limit).all()
    logs.reverse()  # chronological order
    return [{"log_line": l.log_line, "timestamp": l.timestamp} for l in logs]


@router.get("/files/{project_id}")
async def get_project_files(project_id: int, db: Session = Depends(get_monitor_db)):
    """Return a list of all files (with content) for a project."""
    project = db.query(UserProject).filter(UserProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    files = db.query(ProjectFile).filter(ProjectFile.project_id == project_id).all()
    return [{"file_path": f.file_path, "content": f.content or ""} for f in files]


@router.post("/chat")
async def chat_with_agent(req: ChatRequest, db: Session = Depends(get_monitor_db)):
    """Answer questions about a specific project using the monitoring agent."""
    project = db.query(UserProject).filter(
        UserProject.user_id == req.user_id,
        UserProject.project_name == req.project_name
    ).first()

    if not project:
        return {"response": f"Project '{req.project_name}' not found. Please connect it first using the CLI."}

    # Build context from latest files and logs
    recent_logs = db.query(ProjectLog).filter(
        ProjectLog.project_id == project.id
    ).order_by(ProjectLog.timestamp.desc()).limit(20).all()
    recent_logs.reverse()

    files = db.query(ProjectFile).filter(ProjectFile.project_id == project.id).all()

    log_context = "\n".join([l.log_line for l in recent_logs]) or "No logs captured yet."
    file_context = "\n\n".join([
        f"### {f.file_path}\n```\n{(f.content or '')[:800]}\n```"
        for f in files[:5]
    ]) or "No files synced yet."

    # Convert logs for the agent
    log_messages = [
        LogMessage(type="terminal", data=l.log_line, timestamp=l.timestamp)
        for l in recent_logs
    ]

    agent = get_agent()
    if not agent:
        # Fallback: return context-based answer without LLM
        return {
            "response": (
                f"⚠️ AI agent not available (GROK_API_KEY may be missing).\n\n"
                f"**Recent logs for {req.project_name}:**\n```\n{log_context[-1000:]}\n```"
            )
        }

    try:
        # Run agent with logs only for now (extend later to include file context)
        result = await agent.run(log_messages)
        fix_block = ""
        if result.suggested_fix:
            fix_block = "\n\n**Suggested Fix:**\n```python\n" + result.suggested_fix + "\n```"
        return {"response": result.content + fix_block}
    except Exception as e:
        return {
            "response": (
                f"Analysis context for **{req.project_name}**:\n\n"
                f"**Recent Logs:**\n```\n{log_context[-800:]}\n```\n\n"
                f"*(AI agent error: {str(e)[:100]})*"
            )
        }
