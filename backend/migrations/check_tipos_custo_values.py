"""Verifica valores da tabela tipos_custo."""
import os
import sys
from pathlib import Path

backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv
import psycopg2

load_dotenv(backend_dir / ".env")

db_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/sig")
if db_url.startswith("postgresql+asyncpg://"):
    db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")

conn = psycopg2.connect(db_url)
cur = conn.cursor()

cur.execute("""
    SELECT codigo, categoria, tipo_calculo
    FROM tipos_custo
    ORDER BY ordem
""")
print("Valores das rubricas:")
for row in cur.fetchall():
    print(f"  - {row[0]}: categoria={row[1]}, tipo_calculo={row[2]}")

conn.close()




