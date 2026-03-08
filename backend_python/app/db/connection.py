from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import QueuePool
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database Connection String for Supabase
# Example: postgresql://postgres.USER:PASSWORD@HOST:PORT/DATABASE
DATABASE_URL = os.getenv("DATABASE_URL")

# Configure SQLAlchemy Engine
# queue_pool enables pooling for scalability
engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=10,
    max_overflow=20,
    pool_timeout=30,
    pool_recycle=1800,
    connect_args={
        "sslmode": "require" # SSL required by Supabase
    }
)

# Manage database sessions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()

def get_db():
    """ Dependency for database sessions """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def execute_raw_sql(sql: str, params: dict = None):
    """ Executes a secure parameterized raw SQL query """
    with engine.connect() as connection:
        result = connection.execute(sql, params or {})
        return result
