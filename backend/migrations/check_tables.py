"""Verifica tabelas relacionadas a salários."""
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

# Listar tabelas com salar
cur.execute("""
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND (table_name LIKE '%salar%' OR table_name LIKE '%politi%' OR table_name LIKE '%benefi%')
""")
print("Tabelas relacionadas:")
for row in cur.fetchall():
    print(f"  - {row[0]}")

# Verificar quadro pessoal
cur.execute("""
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'quadro_pessoal'
    ORDER BY ordinal_position
""")
print("\nColunas de quadro_pessoal:")
for row in cur.fetchall():
    print(f"  - {row[0]}")

# Verificar se tem salario_override
cur.execute("""
    SELECT id, salario_override, tabela_salarial_id
    FROM quadro_pessoal
    LIMIT 3
""")
print("\nQuadro pessoal (salário):")
for row in cur.fetchall():
    print(f"  - ID: {str(row[0])[:8]}, salario_override: {row[1]}, tabela_id: {row[2]}")

conn.close()





