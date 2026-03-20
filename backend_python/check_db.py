import sqlite3
import os

db_path = "c:\\Users\\lenovo\\Desktop\\Querion\\querion\\backend_python\\querion.db"
if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
else:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print(f"Tables: {tables}")
        
        if ('connections',) in tables:
            cursor.execute("SELECT COUNT(*) FROM connections")
            print(f"Connections count: {cursor.fetchone()[0]}")
            cursor.execute("SELECT id, name FROM connections LIMIT 5")
            print(f"Sample Connections: {cursor.fetchall()}")
        
        if ('multidb_connections',) in tables:
            cursor.execute("SELECT COUNT(*) FROM multidb_connections")
            print(f"Multidb Connections count: {cursor.fetchone()[0]}")
            cursor.execute("SELECT id, name, db_type FROM multidb_connections LIMIT 5")
            print(f"Sample Multidb Connections: {cursor.fetchall()}")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()
