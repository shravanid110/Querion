# csv_to_db.py
import pandas as pd
import sqlite3
from sqlalchemy import create_engine

csv_file = "your_50000_dataset.csv"  # ← Your file path
db_url = "sqlite:///querion_test.db"  # ← Local DB file (change later for cloud)

# Read CSV in chunks if huge (optimized for memory)
df = pd.read_csv(csv_file, low_memory=False)

# Create engine (SQLAlchemy for future-proof)
engine = create_engine(db_url)

# Import to table (infers types automatically — faster than manual)
df.to_sql("main_table", engine, if_exists="replace", index=False, chunksize=10000)  # Chunks for speed

print("DB ready! Table: main_table, Rows:", len(df))