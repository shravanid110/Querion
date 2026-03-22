import sqlite3
import requests
import json
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Cannot find Supabase credentials")
    exit(1)

conn = sqlite3.connect('querion.db')
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

cursor.execute('SELECT * FROM query_history')
rows = cursor.fetchall()
print(f"Syncing {len(rows)} legacy query history records to Supabase...")

url = f"{SUPABASE_URL}/rest/v1/query_history"
headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates" # upsert
}

success_count = 0
for row in rows:
    data = dict(row)
    
    payload = {
        "id": data.get("id"),
        "user_id": data.get("user_id", "default_user"),
        "conn_id": data.get("conn_id"),
        "conn_name": data.get("conn_name"),
        "prompt": data.get("prompt"),
        "sql_query": data.get("sql_query"),
        "explanation": data.get("explanation"),
        "columns": data.get("columns"),
        "rows_data": data.get("rows_data"),
        "metrics": data.get("metrics"),
        "created_at": data.get("created_at")
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        if response.status_code in (200, 201):
            success_count += 1
            print(f"✅ Synced: Query on {payload.get('conn_name')} - '{payload.get('prompt')}'")
        else:
            print(f"❌ Failed to sync {payload.get('id')}: {response.json().get('message', response.text)}")
    except Exception as e:
        print(f"❌ Error for {payload.get('id')}: {str(e)}")

print(f"\nCompleted! Successfully synced {success_count} out of {len(rows)} query history records.")
