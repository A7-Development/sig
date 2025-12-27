"""Adiciona colunas conta_contabil_codigo e conta_contabil_descricao na tabela tipos_custo."""
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
conn.autocommit = True
cur = conn.cursor()

# Verificar e adicionar colunas
colunas = [
    ("conta_contabil_codigo", "VARCHAR(50)"),
    ("conta_contabil_descricao", "VARCHAR(255)"),
]

for coluna, tipo in colunas:
    cur.execute(f"""
        SELECT COUNT(*) FROM information_schema.columns 
        WHERE table_name = 'tipos_custo' AND column_name = '{coluna}'
    """)
    existe = cur.fetchone()[0] > 0
    
    if not existe:
        print(f"Adicionando coluna {coluna}...")
        cur.execute(f"ALTER TABLE tipos_custo ADD COLUMN {coluna} {tipo}")
        print(f"  Coluna {coluna} adicionada!")
    else:
        print(f"Coluna {coluna} ja existe")

conn.close()
print("\nVerificacao concluida!")







