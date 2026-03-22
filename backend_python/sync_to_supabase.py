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

# Get all from connections
cursor.execute('SELECT * FROM connections')
rows = cursor.fetchall()
print(f"Syncing {len(rows)} legacy MySQL connections to Supabase 'multidb_connections' (to bypass RLS)...")

url = f"{SUPABASE_URL}/rest/v1/multidb_connections"
headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates" # upsert
}

success_count = 0
for row in rows:
    data = dict(row)
    
    # Map from 'connections' schema to 'multidb_connections' schema
    payload = {
        "id": data.get("id"),
        "user_id": data.get("user_id", "default_user"),
        "db_type": "mysql",
        "name": data.get("name"),
        "host": data.get("host"),
        "port": data.get("port", 3306),
        "database": data.get("database"),
        "username": data.get("username"),
        "password": data.get("password"),
        "uri": None,
        "user_master_password": data.get("user_master_password"),
        "created_at": data.get("created_at")
    }
    
    try:
        response = requests.post(url, headers=headers, json=payload)
        if response.status_code in (200, 201):
            success_count += 1
            print(f"✅ Synced: {payload.get('name')}")
        else:
            print(f"❌ Failed to sync {payload.get('name')}: {response.json().get('message', response.text)}")
    except Exception as e:
        print(f"❌ Error for {payload.get('name')}: {str(e)}")

print(f"\nCompleted! Successfully synced {success_count} out of {len(rows)} connections.")
