# test_connection.py
import sys
sys.path.append('db')
from db_connection import get_connection

try:
    conn = get_connection()
    print("Connected successfully!")
    conn.close()
except Exception as e:
    print(f"Connection failed: {e}")