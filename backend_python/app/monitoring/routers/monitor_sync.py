import logging
import asyncio
import httpx
import re as _re
import json
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
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
    try:
        project = db.query(UserProject).filter(
            UserProject.user_id == req.user_id,
            UserProject.project_name == req.project_name
        ).first()

        if not project:
            project = UserProject(user_id=req.user_id, project_name=req.project_name)
            db.add(project)
            db.commit() # Commit to get the ID for the background task
            db.refresh(project)

        # Offload all heavy work to background to prevent CLI Timeout
        asyncio.create_task(process_sync_background(req, project.id))
        
        return {"status": "success", "message": "Changes accepted for background processing.", "project_id": project.id}
    except Exception as e:
        logger.error(f"SYNC_INIT_ERROR: {str(e)}")
        return JSONResponse(status_code=500, content={"error": str(e)})

async def process_sync_background(req: SyncRequest, project_id: int):
    """Heavy lifted processing of files and logs."""
    from .monitor_ws import manager
    from app.services.metrics_engine import metrics_engine
    from app.services.log_chart_mapper import analyze_log_and_assign_chart
    
    with next(get_monitor_db()) as db:
        try:
            # 1. Sync Files
            if req.files:
                for f in req.files:
                    if any(x in f.file_path for x in ["package-lock.json", "yarn.lock", "node_modules", ".git"]):
                        continue
                    
                    existing_file = db.query(ProjectFile).filter(
                        ProjectFile.project_id == project_id,
                        ProjectFile.file_path == f.file_path
                    ).first()
                    if existing_file:
                        existing_file.content = f.content
                    else:
                        db.add(ProjectFile(
                            project_id=project_id,
                            file_path=f.file_path,
                            content=f.content
                        ))

            # 2. Sync Logs
            if req.logs:
                # a. Batch Database Save
                db_logs = [
                    ProjectLog(
                        project_id=project_id,
                        log_line=l.line,
                        timestamp=l.timestamp or datetime.utcnow()
                    ) for l in req.logs
                ]
                db.add_all(db_logs)

                # b. Log Intelligence & Clustering Agent (Agent 1 & 2)
                events_map = {}
                START_MARKERS = ["error", "exception", "unhandled", "unexpected token", "failed to compile", "module not found", "typeerror", "referenceerror", "syntaxerror", "fatal", "critical", "timeout", "500", "400", "traceback", "internal server error"]
                CONT_MARKERS = ["at ", "|", ">", "at JSX", "File:", "Plugin:", "line ", "^", "├──", "└──", "│", "      ", "    ", "  "]
                
                current_stack = []
                last_ts = None
                
                for l in req.logs:
                    line = l.line
                    is_start = any(kw in line.lower() for kw in START_MARKERS) or any(line.strip().startswith(kw) for kw in ["Vite", "Webpack", "React", "Node.js"])
                    is_cont = any(line.startswith(prefix) for prefix in CONT_MARKERS) or line.startswith(' ') or line.startswith('\t') or "^" in line
                    
                    if is_start or is_cont or (not line.strip() and current_stack):
                        if not current_stack: last_ts = l.timestamp or datetime.utcnow()
                        current_stack.append(line)
                    else:
                        if current_stack:
                            txt = "\n".join(current_stack)
                            key = txt[:100].lower().strip()
                            if key in events_map: events_map[key]["count"] += 1
                            else: events_map[key] = {"lines": current_stack, "timestamp": last_ts, "count": 1}
                            current_stack = []
                        key = line[:100].lower().strip()
                        if key in events_map: events_map[key]["count"] += 1
                        else: events_map[key] = {"lines": [line], "timestamp": l.timestamp or datetime.utcnow(), "count": 1}
                
                if current_stack:
                    txt = "\n".join(current_stack)
                    key = txt[:100].lower().strip()
                    if key in events_map: events_map[key]["count"] += 1
                    else: events_map[key] = {"lines": current_stack, "timestamp": last_ts, "count": 1}

                grouped_events = list(events_map.values())

                # c. Process Grouped Events for Dashboard
                import uuid
                for i, event in enumerate(grouped_events):
                    log_id = f"evt-{uuid.uuid4().hex[:12]}"
                    full_block = "\n".join(event["lines"])
                    
                    # Rule 6: Detect SEVERITY
                    severity = "INFO"
                    full_lower = full_block.lower()
                    if any(kw in full_lower for kw in ["fatal", "crash", "critical", "system failure"]):
                        severity = "CRITICAL"
                    elif any(kw in full_lower for kw in ["exception", "failed", "unexpected", "syntax error", "module not found", "error"]):
                        severity = "ERROR"
                    elif "warn" in full_lower or "deprecated" in full_lower or "retry" in full_lower:
                        severity = "WARNING"
                    
                    # Rule 7: Extract Error Type
                    error_type = "System Logic"
                    affected_file = "N/A"
                    if "syntax error" in full_lower or "unexpected token" in full_lower:
                        error_type = "React/JS Syntax Error"
                    elif "typeerror" in full_lower:
                        error_type = "TypeError"
                    elif "failed to compile" in full_lower:
                        error_type = "Compilation Failure"
                    
                    file_match = _re.search(r'(?:File: |Plugin: |at |in )([A-Za-z]:\\[^: \n]+|/[^: \n]+)', full_block)
                    if file_match:
                        affected_file = file_match.group(1)

                    log_data = {
                        "level": severity,
                        "line": full_block, 
                        "timestamp": str(event["timestamp"]),
                        "id": log_id,
                        "error_type": error_type,
                        "file": affected_file,
                        "count": event.get("count", 1)
                    }

                    # a. Instant Terminal Broadcast
                    asyncio.create_task(manager.broadcast_to_user("default_user", {
                        "type": log_data["level"].lower(),
                        "data": full_block,
                        "id": log_id,
                        "count": log_data["count"]
                    }))

                    # b. Fast Chart Mapping
                    chart_mapping = analyze_log_and_assign_chart(log_data)
                    metrics_engine.process_log(log_data)
                    
                    asyncio.create_task(manager.broadcast_to_user("default_user", {
                        "type": "mapped_chart",
                        "mapping": chart_mapping,
                        "log_line": full_block,
                        "log_id": log_id
                    }))

                    # c. Heavy AI Analysis (Ollama/LLM) 
                    if log_data["level"] == "ERROR" or log_data["level"] == "CRITICAL" or i == len(grouped_events) - 1:
                        async def run_slow_ai_task(full_text, is_err, pid, lid, cm, lcnt):
                            try:
                                # Pre-extract path for DB context
                                f_path = "N/A"
                                pm = _re.search(r'([A-Za-z]:\\[^: ]+|/[^: ]+)(\.jsx?|\.tsx?|\.py|\.js|\.ts)', full_text)
                                file_context = None
                                if pm:
                                    f_path = pm.group(0)
                                    with next(get_monitor_db()) as sub_db:
                                        basename = f_path.split('\\')[-1].split('/')[-1]
                                        pf = sub_db.query(ProjectFile).filter(ProjectFile.project_id == pid).filter(ProjectFile.file_path.like(f"%{basename}%")).first()
                                        if pf: file_context = pf.content[:3000]

                                from app.ai.log_analyzer import analyze_log
                                from app.routes.ai_insights import add_insight
                                
                                ai_res = await analyze_log(full_text, file_context=file_context)
                                
                                # Requirement #8: Health Score Calculation Agent
                                base_health = 100
                                if ai_res.get("severity") == "CRITICAL": base_health -= 40
                                elif ai_res.get("severity") == "ERROR": base_health -= 20
                                if lcnt > 5: base_health -= 10
                                health_score = max(0, base_health)

                                ai_payload = {
                                    "severity": ai_res.get("severity", "INFO"),
                                    "cause": ai_res.get("root_cause") or ai_res.get("explanation") or "Logged.",
                                    "impact": ai_res.get("impact", "Nominal."),
                                    "suggested_fix": "; ".join(ai_res.get("fix_steps", [])) if isinstance(ai_res.get("fix_steps"), list) else ai_res.get("suggested_fix", "None."),
                                    "system_status": ai_res.get("system_status", "HEALTHY") if ai_res.get("severity") == "INFO" else "DEGRADED",
                                    "risk_level": ai_res.get("risk_level", f"{100-health_score}%"),
                                    "severity_score": ai_res.get("severity_score", 0),
                                    "health_score": health_score,
                                    "confidence_score": ai_res.get("confidence_score", 0.85),
                                    "error_type": ai_res.get("error_type", "Metric"),
                                    "affected_file": ai_res.get("file_path") or ai_res.get("file") or f_path,
                                    "line_number": ai_res.get("line"),
                                    "code_snippet": ai_res.get("code_snippet"),
                                    "generated_fix_code": ai_res.get("generated_fix_code"),
                                    "analysis": ai_res
                                }
                                add_insight(ai_res, full_text)
                                
                                # Requirement #5 & #10: Chart Selection Sync
                                suggested_chart = ai_res.get("chart_suggestion")
                                final_cm = { **cm, "severity": ai_payload["severity"], "title": ai_res.get("error_type") or cm.get("title") }
                                if suggested_chart and suggested_chart in analyze_log_and_assign_chart.__self__.CHART_TYPES if hasattr(analyze_log_and_assign_chart, "__self__") else True:
                                    final_cm["chart_type"] = suggested_chart

                                await manager.broadcast_to_user("default_user", {
                                    "type": "mapped_chart",
                                    "mapping": final_cm,
                                    "ai": ai_payload, "log_line": full_text, "log_id": lid, "count": lcnt
                                })
                            except Exception as e:
                                logger.error(f"BACKGROUND_AI_ERROR: {e}")

                        asyncio.create_task(run_slow_ai_task(full_block, log_data["level"] in ["ERROR", "CRITICAL"], project_id, log_id, chart_mapping, log_data["count"]))

            db.commit()
            logger.info(f"Background sync complete for project {project_id}")
        except Exception as e:
            logger.error(f"BACKGROUND_SYNC_FATAL_ERROR: {e}")
            db.rollback()
        logger.error(f"SYNC_ERROR: {str(e)}")
        # Don't return 500 if possible, return a JSON error so CLI can show it
        return JSONResponse(status_code=500, content={"error": str(e)})


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

