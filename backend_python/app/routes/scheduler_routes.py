import uuid
import datetime
import smtplib
from email.mime.text import MIMEText
from fastapi import APIRouter, Depends, Body, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from apscheduler.schedulers.background import BackgroundScheduler

from app.models import get_db, SessionLocal, Connection, MultidbConnection, ScheduledPrompt
from app.config import settings
from app.services.encryption import decrypt

router = APIRouter()

# ── API 1: Get Databases (Dedicated for Scheduler) ──────────────────────────
@router.get("/databases")
async def get_databases(db: Session = Depends(get_db)):
    mysql_conns = db.query(Connection).all()
    multi_conns = db.query(MultidbConnection).all()
    
    databases = []
    for c in mysql_conns:
        databases.append({
            "id": c.id,
            "name": c.name or f"MySQL @ {c.host}",
            "status": "active"
        })
    for c in multi_conns:
        databases.append({
            "id": c.id,
            "name": c.name or f"{c.db_type} @ {c.host}",
            "status": "active"
        })
    return databases

# ── API 2: Schedule Prompt ────────────────────────────────────────────────────
class ScheduleRequest(BaseModel):
    database_id: str
    prompt: str
    scheduled_datetime: str
    email: str

@router.post("/schedule")
async def schedule_prompt(req: ScheduleRequest, db: Session = Depends(get_db)):
    print(f"[SCHEDULER] Received schedule request for DB: {req.database_id}")
    try:
        # JS toISOString is UTC, so parse as UTC and compare with utcnow()
        clean_dt_str = req.scheduled_datetime.replace("Z", "")
        dt = datetime.datetime.fromisoformat(clean_dt_str)
        
        print(f"[SCHEDULER] Scheduled Time (UTC): {dt}, Current Time (UTC): {datetime.datetime.utcnow()}")
        
        if dt < datetime.datetime.utcnow():
            print("[SCHEDULER] Error: Time is in the past (UTC comparison)")
            raise HTTPException(status_code=400, detail="Scheduled time must be in the future (UTC)")
        
        # Determine db_type
        db_type = "mysql"
        conn = db.query(Connection).filter(Connection.id == req.database_id).first()
        if not conn:
            conn = db.query(MultidbConnection).filter(MultidbConnection.id == req.database_id).first()
            if conn:
                db_type = conn.db_type
            else:
                raise HTTPException(status_code=404, detail="Database not found")
        
        token = str(uuid.uuid4())
        new_task = ScheduledPrompt(
            database_id=req.database_id,
            db_type=db_type,
            prompt=req.prompt,
            scheduled_datetime=dt,
            email=req.email,
            token=token
        )
        db.add(new_task)
        db.commit()
        print("[SCHEDULER] Successfully scheduled task")
        return {"success": True, "id": new_task.id}
    except Exception as e:
        db.rollback()
        print(f"[SCHEDULER] ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ── API 3: Verify Token (Internal for Frontend) ─────────────────────────────
@router.get("/verify-token/{token}")
async def verify_token(token: str, db: Session = Depends(get_db)):
    task = db.query(ScheduledPrompt).filter(ScheduledPrompt.token == token).first()
    if not task:
        raise HTTPException(status_code=404, detail="Invalid or expired token")
        
    # Get DB Name if possible for the UI
    db_name = "Unknown DB"
    if task.db_type == "mysql":
        conn = db.query(Connection).filter(Connection.id == task.database_id).first()
        if conn: db_name = conn.name
    else:
        conn = db.query(MultidbConnection).filter(MultidbConnection.id == task.database_id).first()
        if conn: db_name = conn.name or f"{conn.db_type} Connection"

    return {
        "database_id": task.database_id,
        "database_name": db_name,
        "db_type": task.db_type,
        "prompt": task.prompt,
        "status": task.status
    }

# ── API 4: Secure Execution Verification API ──────────────────────────────────
@router.post("/execute-verify")
async def execute_verify(data: dict = Body(...), db: Session = Depends(get_db)):
    token = data.get("token")
    db_pw = data.get("db_password")
    
    task = db.query(ScheduledPrompt).filter(ScheduledPrompt.token == token).first()
    if not task:
        raise HTTPException(status_code=404, detail="Invalid token")
    
    if task.status == "executed":
        return {"success": False, "error": "This task has already been executed."}
    
    conn = None
    if task.db_type == "mysql":
        conn = db.query(Connection).filter(Connection.id == task.database_id).first()
    else:
        conn = db.query(MultidbConnection).filter(MultidbConnection.id == task.database_id).first()
        
    if not conn:
        raise HTTPException(status_code=404, detail="Database connection no longer exists")
        
    try:
        stored_db_password = decrypt(conn.password)
        if db_pw != stored_db_password:
            raise HTTPException(status_code=401, detail="Invalid database password")
    except Exception:
        raise HTTPException(status_code=401, detail="Could not verify database password")

    task.status = "executed"
    db.commit()
    
    return {
        "success": True, 
        "prompt": task.prompt, 
        "database_id": task.database_id,
        "db_type": task.db_type
    }

# ── Scheduler Helper Functions ────────────────────────────────────────────────
def send_email(to_email: str, subject: str, body: str):
    print(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] Email Service: Attempting to notify {to_email}")
    print(f"[DEBUG] Using SMTP_USER: {settings.SMTP_USER}")
    print(f"[DEBUG] App Passkey length: {len(settings.SMTP_PASS) if settings.SMTP_PASS else 0}")
    try:
        if not to_email: return False
            
        msg = MIMEText(body)
        msg['Subject'] = subject
        msg['From'] = settings.SMTP_USER
        msg['To'] = to_email

        if not settings.SMTP_USER or not settings.SMTP_PASS:
            print("⚠️ EMAIL NOT SENT: SMTP credentials missing in .env")
            return False

        # Failsafe: Aggressively remove all whitespace/newlines again right before login
        final_user = settings.SMTP_USER.strip()
        final_pass = settings.SMTP_PASS.replace(" ", "").strip()
        print(f"[DEBUG] Final processed user: {final_user}")
        print(f"[DEBUG] Final processed passkey length: {len(final_pass)}")

        # Choose SSL or TLS based on port
        if settings.SMTP_PORT == 465:
            server_class = smtplib.SMTP_SSL
        else:
            server_class = smtplib.SMTP
            
        with server_class(settings.SMTP_SERVER, settings.SMTP_PORT) as server:
            if settings.SMTP_PORT != 465:
                server.starttls()
            
            server.login(final_user, final_pass)
            server.send_message(msg)
            
        print("✅ Email sent successfully")
        return True
    except Exception as e:
        print(f"❌ Failed to send email: {e}")
        return False

def background_job():
    db = SessionLocal()
    try:
        current_time = datetime.datetime.now()
        due = db.query(ScheduledPrompt).filter(
            ScheduledPrompt.status == "pending",
            ScheduledPrompt.scheduled_datetime <= current_time
        ).all()
        
        for task in due:
            subject = f"Querion: {task.prompt[:30]}..."
            # Point to the main dashboard so the user can see their workspace
            link = f"http://localhost:3000/dashboard?token={task.token}"
            body = f"""Hello,

Your scheduled query prompt is ready for action:

PROMPT:
"{task.prompt}"

To run this query on your database, please click the secure link below. You will be asked for your database password to ensure security.

SECURE DASHBOARD LINK:
{link}

Best regards,
Querion Analytics Team"""
            
            if send_email(task.email, subject, body):
                task.status = "notified"
        db.commit()
    except Exception as e:
        print(f"Error in scheduler job: {e}")
    finally:
        db.close()

def start_scheduler():
    scheduler = BackgroundScheduler()
    scheduler.add_job(background_job, 'interval', seconds=30)
    scheduler.start()
    print("⏰ Background Scheduler service started (Check every 30s)")
