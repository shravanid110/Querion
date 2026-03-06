import logging
import httpx
import re as _re
import json
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..models import get_monitor_db, UserProject, ProjectFile, ProjectLog
from app.config import settings

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# ── Agent instance (shared) ───────────────────────────────────────────────────
_agent = None
def get_agent():
    global _agent
    if _agent is None:
        try:
            from ..agents.monitoring_agent import MonitoringAgent
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
            
            # --- Real-time Logic ---
            # Prepare log for mapping engine (MUST MATCH log_chart_mapper.py expectation)
            log_data = {
                "level": "ERROR" if "error" in l.line.lower() else ("WARNING" if "warning" in l.line.lower() else "INFO"),
                "message": l.line,
                "timestamp": str(l.timestamp or datetime.utcnow())
            }

            # 1. Update global metrics engine
            from app.services.metrics_engine import metrics_engine
            metrics_engine.process_log(log_data)

            # 2. Analyze for intelligent charts
            from app.services.log_chart_mapper import analyze_log_and_assign_chart, explain_log_issue
            chart_mapping = analyze_log_and_assign_chart(log_data)
            explanation = explain_log_issue(log_data)

            # 3. Broadcast to all active sessions via management websocket
            # We use "default_user" for now as per monitor_ws.py implementation
            broadcast_payload = {
                "type": "mapped_chart",
                "mapping": chart_mapping,
                "ai": explanation,
                "log_line": l.line # Pass to live stream console too
            }
            
            # Use asyncio to fire and forget the broadcast
            import asyncio
            from .monitor_ws import manager  # Deferred import to avoid circular dependency
            
            loop = asyncio.get_event_loop()
            if loop.is_running():
                loop.create_task(manager.broadcast_to_user("default_user", broadcast_payload))
                # Also broadcast the log itself for the Terminal console
                loop.create_task(manager.broadcast_to_user("default_user", {
                    "type": log_data["level"].lower(),
                    "data": l.line
                }))

    project.last_updated = datetime.utcnow()
    db.commit()
    return {"status": "success", "project_id": project.id}


@router.get("/projects/{user_id}")
async def get_user_projects(user_id: str, db: Session = Depends(get_monitor_db)):
    """List all projects for a user optimized for speed."""
    from sqlalchemy import func
    
    # Subqueries for counts
    file_count_sub = db.query(
        ProjectFile.project_id, 
        func.count(ProjectFile.id).label('count')
    ).group_by(ProjectFile.project_id).subquery()
    
    log_count_sub = db.query(
        ProjectLog.project_id, 
        func.count(ProjectLog.id).label('count')
    ).group_by(ProjectLog.project_id).subquery()

    projects = db.query(
        UserProject,
        func.coalesce(file_count_sub.c.count, 0),
        func.coalesce(log_count_sub.c.count, 0)
    ).outerjoin(
        file_count_sub, UserProject.id == file_count_sub.c.project_id
    ).outerjoin(
        log_count_sub, UserProject.id == log_count_sub.c.project_id
    ).filter(UserProject.user_id == user_id).all()

    results = []
    for p, f_count, l_count in projects:
        results.append({
            "id": p.id,
            "name": p.project_name,
            "last_updated": p.last_updated,
            "file_count": f_count,
            "log_count": l_count
        })
    return results


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
    """Return a list of all file paths for a project (no content for speed)."""
    project = db.query(UserProject).filter(UserProject.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    files = db.query(ProjectFile.file_path).filter(ProjectFile.project_id == project_id).all()
    return [{"file_path": f.file_path} for f in files]


@router.get("/file-content/{project_id}")
async def get_file_content(project_id: int, path: str, db: Session = Depends(get_monitor_db)):
    """Fetch content for a specific file on demand."""
    f = db.query(ProjectFile).filter(
        ProjectFile.project_id == project_id,
        ProjectFile.file_path == path
    ).first()
    if not f:
        raise HTTPException(status_code=404, detail="File not found")
    return {"file_path": f.file_path, "content": f.content or ""}


@router.post("/chat")
async def chat_with_agent(req: ChatRequest, db: Session = Depends(get_monitor_db)):
    """Answer questions with massive project context (tree + code snippets + logs)."""
    project = db.query(UserProject).filter(
        UserProject.user_id == req.user_id,
        UserProject.project_name == req.project_name
    ).first()

    if not project:
        return {"response": f"Project '{req.project_name}' not found. Please connect it first using the CLI."}

    # ── 1. Gather logs ────────────────────────────────────────────────────────
    recent_logs = db.query(ProjectLog).filter(
        ProjectLog.project_id == project.id
    ).order_by(ProjectLog.timestamp.desc()).limit(200).all()
    recent_logs.reverse()
    log_context = "\n".join([l.log_line for l in recent_logs]) or "No logs captured yet."

    # ── 2. Gather file list for Project Tree ──────────────────────────────────
    all_files = db.query(ProjectFile).filter(ProjectFile.project_id == project.id).all()
    
    # Show more files in the tree to explain "Flow"
    _TREE_SKIP = _re.compile(r'(\.pyc|__pycache__|\.git[\\/]|dist|build|DS_Store)', _re.I)
    _CONTENT_SKIP = _re.compile(r'(node_modules|\.min\.[jc]s|package-lock|yarn\.lock|pnpm-lock|\.ico|\.png|\.jpg)', _re.I)
    
    _PRIO = {".py": 0, ".ts": 1, ".tsx": 1, ".js": 2, ".jsx": 2, ".json": 3, ".md": 4, ".env": 0, "requirements.txt": 0, "package.json": 0}

    def _fprio(f):
        path_lower = f.file_path.lower()
        if "main" in path_lower or "app" in path_lower or "config" in path_lower or "index" in path_lower: return -1
        ext = "." + f.file_path.rsplit(".", 1)[-1].lower() if "." in f.file_path else ""
        return _PRIO.get(ext, 10)

    # Project Tree (Structure)
    tree_items = sorted([f.file_path for f in all_files if not _TREE_SKIP.search(f.file_path)])
    file_tree = "\n".join(tree_items[:300]) # Up to 300 files in tree

    # Code Analysis (Priority Files)
    analysis_files = sorted([f for f in all_files if not _CONTENT_SKIP.search(f.file_path)], key=_fprio)
    
    # ── 3. Build code snippets (context budget) ───────────────────────────────
    file_parts = []
    CHAR_BUDGET = 12000 # Reduced for better compatibility with free models
    used = 0
    
    for f in analysis_files[:45]: # Increased to top 45 files
        if used >= CHAR_BUDGET: break
        content = (f.content or "").strip()
        lines = content.split("\n")
        # Take up to 100 lines per file
        snippet = "\n".join(lines[:100])[:1800]
        file_parts.append(f"### FILE: {f.file_path}\n```\n{snippet}\n```")
        used += len(snippet)
    
    file_snippets_context = "\n\n".join(file_parts) or "No code context available."

    # ── 4. Build system prompt ────────────────────────────────────────────────
    system_prompt = (
        f"You are Querion AI, a senior expert developer and architect.\n"
        f"Project: '{req.project_name}'\n\n"
        "URGENT TASKS:\n"
        "1. EXPLAIN FLOW: Use the PROJECT TREE to explain how the app works (backend, frontend, routing).\n"
        "2. LOG ANALYSIS: Look at the RECENT LOGS. Find exact errors (e.g., 'Port in use', '404', 'TypeError').\n"
        "3. LINE-BY-LINE FIX: Reference the exact file and line number from the CODE snippets. Provide the fix.\n"
        "4. COMMANDS: Tell the user exactly what to run in the terminal.\n\n"
        f"### PROJECT TREE (Structure)\n{file_tree}\n\n"
        f"### CODE SNIPPETS (Detailed)\n{file_snippets_context}\n\n"
        f"### RECENT LOGS (Live)\n```\n{log_context}\n```\n"
    )

    # ── 5. Call LLM with Robust Fallbacks ─────────────────────────────────────
    api_key = settings.OPENROUTER_API_KEY or settings.LLM_API_KEY
    if not api_key:
        logger.error("❌ No API Key found (OPENROUTER_API_KEY or LLM_API_KEY)")
    else:
        logger.info(f"🔑 API Key found: {api_key[:4]}...{api_key[-4:]}")
    
    base_url = settings.LLM_BASE_URL.rstrip('/')
    
    # Selected stable models on OpenRouter
    models_to_try = [
        "google/gemini-2.0-flash-exp:free",
        "google/gemini-flash-1.5-8b:free",
        "mistralai/mistral-7b-instruct:free",
        "meta-llama/llama-3.1-8b-instruct:free",
        "openrouter/auto"
    ]
    
    last_error = ""
    for model_id in models_to_try:
        try:
            logger.info(f"🤖 User Prompting Model: {model_id}")
            async with httpx.AsyncClient(timeout=90.0) as client:
                payload = {
                    "model": model_id,
                    "messages": [
                        {"role": "user", "content": f"CONTEXT:\n{system_prompt}\n\nQUESTION: {req.message}"},
                    ],
                    "temperature": 0.2,
                }
                
                resp = await client.post(
                    f"{base_url}/chat/completions",
                    json=payload,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": "http://localhost:3000",
                        "X-Title": "Querion",
                    },
                )

            logger.info(f"📡 API Response ({model_id}): {resp.status_code}")
            
            if resp.status_code == 200:
                data = resp.json()
                if "choices" in data and len(data["choices"]) > 0:
                    content = data["choices"][0].get("message", {}).get("content", "")
                    if content.strip():
                        logger.info(f"✅ Successful response from {model_id} ({len(content)} chars)")
                        return {"response": content.strip()}
                    else:
                        logger.warning(f"⚠️ Empty content from {model_id}")
                else:
                    logger.warning(f"⚠️ No choices in response from {model_id}: {data}")
            
            last_error = f"{model_id} ({resp.status_code}): {resp.text[:200]}"
            logger.warning(f"⚠️ Fail: {last_error}")
            continue

        except Exception as e:
            last_error = f"{model_id} (Ex): {str(e)}"
            logger.error(f"❌ Error during AI call: {last_error}")
            continue

    # ── 6. Local Emergency Response (Never return 500) ─────────────────────────
    # If all AI models fail, provide a manually generated summary based on local knowledge
    error_found = "ERROR" in log_context.upper() or "EXCEPTION" in log_context.upper()
    
    local_response = (
        f"⚠️ **AI Connection Issue (OpenRouter Overloaded)**\n\n"
        f"I tried multiple models ({', '.join(models_to_try)}), but all failed or returned empty responses.\n\n"
        f"**Local Analysis of '{req.project_name}':**\n"
        f"- **Files:** {len(tree_items)} files detected.\n"
        f"- **Logs:** " + ("Potential errors found in recent logs. Please check the 'Live Logs' tab." if error_found else "Logs look clean.") + "\n"
        f"- **Action:** Please check your OpenRouter API key and credits. The last error was: `{last_error}`"
    )
    return {"response": local_response}

