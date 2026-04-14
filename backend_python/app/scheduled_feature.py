import os
import uuid
import datetime
import smtplib
from email.mime.text import MIMEText
from typing import List, Optional
from fastapi import FastAPI, APIRouter, Depends, Body, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, String, Integer, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from apscheduler.schedulers.background import BackgroundScheduler

# Import existing settings and models to stay in the same DB
try:
    from app.config import settings
    from app.models import Connection, MultidbConnection
except ImportError:
    # Fallback for standalone test or path issues
    import sys
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from app.config import settings
    from app.models import Connection, MultidbConnection

# 1. Database Setup for the New Feature
Base = declarative_base()

class ScheduledPrompt(Base):
    __tablename__ = "scheduled_prompts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    database_id = Column(String(36), nullable=False)
    db_type = Column(String(50), nullable=False)
    prompt = Column(Text, nullable=False)
    scheduled_datetime = Column(DateTime, nullable=False)
    email = Column(String(255), nullable=False)
    status = Column(String(20), default="pending") # "pending", "notified", "executed"
    token = Column(String(100), unique=True) # Secure link token
    created_at = Column(DateTime, default=datetime.datetime.now)

# Initialize this table in the existing database
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# FOR DEVELOPMENT ONLY: Ensure schema is updated by dropping if needed
# We drop and recreate because SQLite doesn't support easy column additions via create_all
from sqlalchemy import inspect
inspector = inspect(engine)
if "scheduled_prompts" in inspector.get_table_names():
    columns = [c["name"] for c in inspector.get_columns("scheduled_prompts")]
    if "db_type" not in columns:
        print("Updating scheduled_prompts schema...")
        Base.metadata.drop_all(bind=engine, tables=[ScheduledPrompt.__table__])

Base.metadata.create_all(bind=engine)

# 2. FastAPI Setup (Standalone for isolation)
app = FastAPI(title="Scheduled Prompt Service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# API 1: Get Databases
@app.get("/api/databases")
async def get_databases(db: Session = Depends(get_db)):
    # Fetch from both connection sources
    mysql_conns = db.query(Connection).all()
    multi_conns = db.query(MultidbConnection).all()
    
    print(f"DEBUG: Found {len(mysql_conns)} mysql connections and {len(multi_conns)} multi connections")
    
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

# API 2: Schedule Prompt
class ScheduleRequest(BaseModel):
    database_id: str
    prompt: str
    scheduled_datetime: str
    email: str

@app.post("/api/schedule")
async def schedule_prompt(req: ScheduleRequest, db: Session = Depends(get_db)):
    try:
        dt = datetime.datetime.fromisoformat(req.scheduled_datetime.replace("Z", ""))
        if dt < datetime.datetime.now():
            raise HTTPException(status_code=400, detail="Scheduled time must be in the future")
        
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
        return {"success": True, "id": new_task.id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# 3. Scheduler & Email Logic
def send_email(to_email: str, subject: str, body: str):
    # Failsafe: Aggressively remove all whitespace/newlines again right before login
    final_user = settings.SMTP_USER.strip()
    final_pass = settings.SMTP_PASS.replace(" ", "").strip()
    
    try:
        if not to_email:
            print("⚠️ EMAIL NOT SENT: Recipient email is empty")
            return False
            
        msg = MIMEText(body)
        msg['Subject'] = subject
        msg['From'] = settings.SMTP_USER
        msg['To'] = to_email

        if not settings.SMTP_USER or not settings.SMTP_PASS:
            print("⚠️ EMAIL NOT SENT: SMTP credentials missing in .env")
            return False

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
    print("Scheduler running...")
    db = SessionLocal()
    try:
        print("Checking scheduled prompts...")
        current_time = datetime.datetime.now()
        due = db.query(ScheduledPrompt).filter(
            ScheduledPrompt.status == "pending",
            ScheduledPrompt.scheduled_datetime <= current_time
        ).all()
        
        for task in due:
            subject = "Scheduled Query Execution"
            body = f"""Hello,

Your scheduled query is ready for execution.

Query/Prompt:
{task.prompt}

Execution Time: {task.scheduled_datetime}

Click here to view/execute: http://localhost:3000/execute?token={task.token}

Best regards,
Querion Team"""
            
            if send_email(task.email, subject, body):
                task.status = "sent"
        db.commit()
    except Exception as e:
        print(f"Error in scheduler: {e}")
    finally:
        db.close()

scheduler = BackgroundScheduler()
scheduler.add_job(background_job, 'interval', seconds=30)
scheduler.start()

# 4. Secure Execution Verification API
@app.post("/api/execute-verify")
async def execute_verify(data: dict = Body(...), db: Session = Depends(get_db)):
    token = data.get("token")
    user_pw = data.get("user_password")
    db_pw = data.get("db_password")
    
    task = db.query(ScheduledPrompt).filter(ScheduledPrompt.token == token).first()
    if not task:
        raise HTTPException(status_code=404, detail="Invalid token")
    
    if task.status == "executed":
        return {"success": False, "error": "This task has already been executed."}
    
    # ── VALIDATE PASSWORD (Simplified Secure Bridge) ──────────────────────────
    # In a full app, we would verify the user_pw against the user session.
    # For now, we validate the db_pw if it matches the stored (decrypted) password.
    
    from app.services.encryption import decrypt
    
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

    # ── EXECUTE ───────────────────────────────────────────────────────────────
    # We marks it as executed after verification.
    task.status = "executed"
    db.commit()
    
    return {
        "success": True, 
        "prompt": task.prompt, 
        "database_id": task.database_id,
        "db_type": task.db_type
    }

if __name__ == "__main__":
    import uvicorn
    print("🚀 Scheduled Feature Service starting on port 4001...")
    uvicorn.run(app, host="0.0.0.0", port=4001)
