import pymysql
from dotenv import load_dotenv
load_dotenv()

conn = pymysql.connect(host='localhost', user='root', password='', database='datagenerator_db')
cur = conn.cursor()

queries = [
    "ALTER TABLE conexiones ADD COLUMN IF NOT EXISTS nombre_alias VARCHAR(100) NULL",
    "ALTER TABLE conexiones ADD COLUMN IF NOT EXISTS usuario_db VARCHAR(255) NULL",
    "ALTER TABLE conexiones ADD COLUMN IF NOT EXISTS password_db TEXT NULL",
]

for sql in queries:
    try:
        cur.execute(sql)
        print(f"OK: {sql[:70]}")
    except Exception as e:
        print(f"Skip ({e})")

conn.commit()
conn.close()
print("DONE")
