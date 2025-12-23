"""Ver custos calculados."""
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

# Resumo por categoria
cur.execute("""
    SELECT tc.categoria, SUM(cc.valor_calculado) as total
    FROM custos_calculados cc
    JOIN tipos_custo tc ON tc.id = cc.tipo_custo_id
    GROUP BY tc.categoria
    ORDER BY total DESC
""")
print("CUSTOS POR CATEGORIA:")
print("-" * 40)
total_geral = 0
for row in cur.fetchall():
    print(f"  {row[0]}: R$ {row[1]:,.2f}")
    total_geral += float(row[1])
print("-" * 40)
print(f"  TOTAL ANUAL: R$ {total_geral:,.2f}")
print(f"  MÉDIA MENSAL: R$ {total_geral/12:,.2f}")

# Top 5 rubricas
print("\n\nTOP 5 RUBRICAS:")
print("-" * 40)
cur.execute("""
    SELECT tc.codigo, tc.nome, SUM(cc.valor_calculado) as total
    FROM custos_calculados cc
    JOIN tipos_custo tc ON tc.id = cc.tipo_custo_id
    GROUP BY tc.codigo, tc.nome
    ORDER BY total DESC
    LIMIT 5
""")
for row in cur.fetchall():
    print(f"  {row[0]}: {row[1]} = R$ {row[2]:,.2f}")

conn.close()




