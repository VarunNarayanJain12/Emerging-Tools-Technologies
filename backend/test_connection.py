# test_connection.py
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from db.db_connection import get_connection

try:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT version();")
    version = cur.fetchone()
    print(f"Connected successfully! PostgreSQL: {version[0][:30]}")
    conn.close()
except Exception as e:
    print(f"Connection failed: {e}")