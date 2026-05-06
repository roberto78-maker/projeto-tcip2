import sqlite3
import os

db_path = "c:/Projetos/Antigravity/backend/db.sqlite3"
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    # Get last 10 log entries
    cursor.execute("""
        SELECT action_time, user_id, object_repr, action_flag, change_message 
        FROM django_admin_log 
        ORDER BY action_time DESC 
        LIMIT 10;
    """)
    logs = cursor.fetchall()
    for log in logs:
        print(f"{log[0]} | User {log[1]} | {log[2]} | {log[3]} | {log[4]}")
    conn.close()
else:
    print("Database not found")
