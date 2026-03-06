from sqlalchemy import Column, String, Integer, DateTime, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import datetime
import uuid
from .config import settings

Base = declarative_base()

class Connection(Base):
    __tablename__ = "Connection"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=True)
    host = Column(String(255), nullable=False)
    port = Column(Integer, default=3306)
    database = Column(String(255), nullable=False)
    username = Column(String(255), nullable=False)
    password = Column(String(1024), nullable=False) # Encrypted
    createdAt = Column(DateTime, default=datetime.datetime.utcnow)

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
