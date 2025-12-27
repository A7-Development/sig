"""Verifica se as colunas foram criadas."""
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

print("Verificando colunas em 'funcoes':")
cur.execute("""
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'funcoes' 
    AND column_name IN ('jornada_mensal', 'is_home_office', 'is_pj')
    ORDER BY column_name
""")
for row in cur.fetchall():
    print(f"  - {row[0]}: {row[1]}")

print("\nVerificando colunas em 'politicas_beneficio':")
cur.execute("""
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'politicas_beneficio' 
    AND column_name IN ('pct_desconto_vt', 'pct_desconto_vr', 'pct_desconto_am')
    ORDER BY column_name
""")
for row in cur.fetchall():
    print(f"  - {row[0]}: {row[1]}")

conn.close()
print("\nVerificacao concluida!")







