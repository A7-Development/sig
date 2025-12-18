"""Verifica tabela_salarial."""
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

# Colunas de tabela_salarial
cur.execute("""
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'tabela_salarial'
    ORDER BY ordinal_position
""")
print("Colunas de tabela_salarial:")
for row in cur.fetchall():
    print(f"  - {row[0]}")

# Dados
cur.execute("SELECT * FROM tabela_salarial LIMIT 3")
print("\nDados:")
for row in cur.fetchall():
    print(f"  - {row}")

conn.close()



