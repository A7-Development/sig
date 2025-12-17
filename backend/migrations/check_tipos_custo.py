"""Verifica se a tabela tipos_custo existe e tem dados."""
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

# Verificar se tabela existe
cur.execute("""
    SELECT COUNT(*) FROM information_schema.tables 
    WHERE table_name = 'tipos_custo'
""")
tabela_existe = cur.fetchone()[0] > 0
print(f"Tabela tipos_custo existe: {tabela_existe}")

if tabela_existe:
    cur.execute("SELECT COUNT(*) FROM tipos_custo")
    count = cur.fetchone()[0]
    print(f"Quantidade de rubricas: {count}")
    
    if count > 0:
        cur.execute("SELECT codigo, nome FROM tipos_custo ORDER BY ordem LIMIT 5")
        print("Primeiras rubricas:")
        for row in cur.fetchall():
            print(f"  - {row[0]}: {row[1]}")
else:
    print("Tabela nao existe - precisa rodar a migracao add_custos_module.sql")

conn.close()

