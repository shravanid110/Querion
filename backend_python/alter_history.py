import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.models import engine

with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE query_history ALTER COLUMN columns TYPE TEXT USING columns::text;"))
        conn.execute(text("ALTER TABLE query_history ALTER COLUMN rows_data TYPE TEXT USING rows_data::text;"))
        conn.execute(text("ALTER TABLE query_history ALTER COLUMN metrics TYPE TEXT USING metrics::text;"))
        conn.commit()
        print("✅ Columns altered to TEXT")
    except Exception as e:
        print(f"Error altering table: {e}")
