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

engine_args = {
    "connect_args": {"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {},
    "pool_pre_ping": True
}

# Only add pool_size if not using SQLite (which uses NullPool/StaticPool)
if "sqlite" not in settings.DATABASE_URL:
    engine_args["pool_size"] = 20
    engine_args["max_overflow"] = 30

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
