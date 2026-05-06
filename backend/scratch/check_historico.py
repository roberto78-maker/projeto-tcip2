import sqlite3
import os

db_path = "c:/Projetos/Antigravity/backend/db.sqlite3"
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM custodia_historico;")
    count = cursor.fetchone()[0]
    print(f"Total entries in custodia_historico: {count}")
    if count > 0:
        cursor.execute("SELECT * FROM custodia_historico ORDER BY data DESC LIMIT 5;")
        rows = cursor.fetchall()
        for row in rows:
            print(row)
    conn.close()
else:
    print("Database not found")
