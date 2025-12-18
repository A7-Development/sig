"""Corrige valores NULL na tabela tipos_custo."""
import os
import sys
from pathlib import Path
from datetime import datetime

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

print("Corrigindo valores NULL na tabela tipos_custo...")

# Atualizar ativo para TRUE onde NULL
cur.execute("""
    UPDATE tipos_custo 
    SET ativo = TRUE 
    WHERE ativo IS NULL
""")
print(f"  ativo: {cur.rowcount} registros atualizados")

# Atualizar created_at onde NULL
cur.execute("""
    UPDATE tipos_custo 
    SET created_at = NOW() 
    WHERE created_at IS NULL
""")
print(f"  created_at: {cur.rowcount} registros atualizados")

# Atualizar updated_at onde NULL
cur.execute("""
    UPDATE tipos_custo 
    SET updated_at = NOW() 
    WHERE updated_at IS NULL
""")
print(f"  updated_at: {cur.rowcount} registros atualizados")

# Também garantir defaults para campos booleanos
cur.execute("""
    UPDATE tipos_custo 
    SET incide_fgts = COALESCE(incide_fgts, FALSE),
        incide_inss = COALESCE(incide_inss, FALSE),
        reflexo_ferias = COALESCE(reflexo_ferias, FALSE),
        reflexo_13 = COALESCE(reflexo_13, FALSE)
    WHERE incide_fgts IS NULL 
       OR incide_inss IS NULL 
       OR reflexo_ferias IS NULL 
       OR reflexo_13 IS NULL
""")
print(f"  flags booleanos: {cur.rowcount} registros atualizados")

conn.close()
print("\nCorrecao concluida!")



