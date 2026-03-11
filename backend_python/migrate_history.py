"""
Migration: create query_history table in Supabase.
Run once: python migrate_history.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.models import engine

with engine.connect() as conn:
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS query_history (
            id          VARCHAR(36)   PRIMARY KEY,
            user_id     VARCHAR(36)   DEFAULT 'default_user',
            conn_id     VARCHAR(36),
            conn_name   VARCHAR(255),
            prompt      TEXT          NOT NULL,
            sql_query   TEXT,
            explanation TEXT,
            columns     JSONB,
            rows_data   JSONB,
            metrics     JSONB,
            created_at  TIMESTAMP     DEFAULT NOW()
        )
    """))
    conn.commit()
    print("✅ query_history table created!")
