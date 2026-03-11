"""
Migration script to add user_id and user_master_password columns to connections table.
Run this once: python migrate_connections.py
"""
import sys
import os

# Add app to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.models import engine

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE connections ADD COLUMN IF NOT EXISTS user_id VARCHAR(36) DEFAULT 'default_user'"))
        print("✅ Added user_id column")
    except Exception as e:
        print(f"⚠️  user_id: {e}")

    try:
        conn.execute(text("ALTER TABLE connections ADD COLUMN IF NOT EXISTS user_master_password VARCHAR(255)"))
        print("✅ Added user_master_password column")
    except Exception as e:
        print(f"⚠️  user_master_password: {e}")

    conn.commit()
    print("✅ Migration complete!")
