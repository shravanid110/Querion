from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
import datetime

Base = declarative_base()

class UserProject(Base):
    __tablename__ = "users_projects"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(255), nullable=False, index=True)
    project_name = Column(String(255), nullable=False)
    last_updated = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    files = relationship("ProjectFile", back_populates="project", cascade="all, delete-orphan")
    logs = relationship("ProjectLog", back_populates="project", cascade="all, delete-orphan")

class ProjectFile(Base):
    __tablename__ = "project_files"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("users_projects.id"), nullable=False)
    file_path = Column(String(1024), nullable=False)
    content = Column(Text, nullable=True)
    
    project = relationship("UserProject", back_populates="files")

class ProjectLog(Base):
    __tablename__ = "project_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("users_projects.id"), nullable=False)
    log_line = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    
    project = relationship("UserProject", back_populates="logs")

# Separate DB for monitoring as requested
MONITOR_DB_URL = "sqlite:///./querion_monitor.db"
monitor_engine_args = {
    "connect_args": {"check_same_thread": False},
    "pool_pre_ping": True
}

if "sqlite" not in MONITOR_DB_URL:
    monitor_engine_args["pool_size"] = 20
    monitor_engine_args["max_overflow"] = 30

monitor_engine = create_engine(MONITOR_DB_URL, **monitor_engine_args)
MonitorSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=monitor_engine)

def init_monitor_db():
    Base.metadata.create_all(bind=monitor_engine)

def get_monitor_db():
    db = MonitorSessionLocal()
    try:
        yield db
    finally:
        db.close()
