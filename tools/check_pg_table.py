import psycopg2, os

env_path = "/home/ubuntu/ai-native-command-center-v2/.env"
url = ""
with open(env_path) as f:
    for line in f:
        line = line.strip()
        if line.startswith("DATABASE_URL="):
            url = line.split("=", 1)[1].strip().strip("\"'")
            break

conn = psycopg2.connect(url)
cur = conn.cursor()
cur.execute(
    "SELECT column_name FROM information_schema.columns "
    "WHERE table_name = 'crawler_cookies_account' ORDER BY ordinal_position"
)
cols = [r[0] for r in cur.fetchall()]
print("Table columns:", cols)
cur.execute("SELECT count(*) FROM crawler_cookies_account")
print("Row count:", cur.fetchone()[0])

# Also check if ensureDb() created it by looking at recent api logs
cur.execute("SELECT to_char(update_time at time zone 'Asia/Shanghai', 'YYYY-MM-DD HH24:MI:SS') FROM crawler_cookies_account LIMIT 3")
rows = cur.fetchall()
if rows:
    print("Recent update times:", rows)

cur.close()
conn.close()
