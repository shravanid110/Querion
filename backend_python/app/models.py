from sqlalchemy import Column, String, Integer, DateTime, create_engine, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import datetime
import uuid
from .config import settings

Base = declarative_base()

class Connection(Base):
    __tablename__ = "connections"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=True) # ID of the user who owns this connection
    name = Column(String(255), nullable=True)
    host = Column(String(255), nullable=False)
    port = Column(Integer, default=3306)
    database = Column(String(255), nullable=False)
    username = Column(String(255), nullable=False)
    password = Column(String(1024), nullable=False) # Encrypted DB Password
    user_master_password = Column(String(255), nullable=True) # Hashed Master Password
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class MultidbConnection(Base):
    __tablename__ = "multidb_connections"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=True)
    db_type = Column(String(50), nullable=False)
    name = Column(String(255), nullable=True)
    host = Column(String(255), nullable=True)
    port = Column(Integer, default=3306)
    database = Column(String(255), nullable=True)
    username = Column(String(255), nullable=True)
    password = Column(String(1024), nullable=True)
    uri = Column(Text, nullable=True)
    user_master_password = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class QueryHistory(Base):
    __tablename__ = "query_history"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), default="default_user")
    conn_id = Column(String(36))
    conn_name = Column(String(255))
    prompt = Column(Text)
    sql_query = Column(Text)
    explanation = Column(Text)
    columns = Column(Text) # JSON string
    rows_data = Column(Text) # JSON string
    metrics = Column(Text) # JSON string
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

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
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

from sqlalchemy.pool import NullPool

engine_args = {"pool_pre_ping": True}

# Handle connection arguments for different DB types
if "sqlite" in settings.DATABASE_URL:
    engine_args["connect_args"] = {"check_same_thread": False}
    engine_args["poolclass"] = NullPool
else:
    # Aggressive timeout for PostgreSQL/others to prevent startup hang
    engine_args["connect_args"] = {"connect_timeout": 5}
    engine_args["pool_size"] = 50
    engine_args["max_overflow"] = 100
    engine_args["pool_timeout"] = 60

engine = create_engine(settings.DATABASE_URL, **engine_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Initialize DB
def init_db():
    Base.metadata.create_all(bind=engine)
