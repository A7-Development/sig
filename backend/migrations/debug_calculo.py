"""Debug do cálculo de custos."""
import asyncio
import os
import sys
from pathlib import Path
from uuid import UUID

backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv
load_dotenv(backend_dir / ".env")

import psycopg2

db_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/sig")
if db_url.startswith("postgresql+asyncpg://"):
    db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")

conn = psycopg2.connect(db_url)
cur = conn.cursor()

# Listar cenários com quadro
print("=" * 60)
print("CENÁRIOS COM QUADRO PESSOAL")
print("=" * 60)

cur.execute("""
    SELECT 
        c.id, c.nome, c.ano_inicio,
        cs.id as secao_id,
        f.nome as funcao,
        qp.qtd_jan, qp.qtd_fev, qp.qtd_mar
    FROM cenarios c
    JOIN quadro_pessoal qp ON qp.cenario_id = c.id
    LEFT JOIN cenario_secao cs ON cs.id = qp.cenario_secao_id
    LEFT JOIN funcoes f ON f.id = qp.funcao_id
    ORDER BY c.nome, f.nome
""")

for row in cur.fetchall():
    print(f"Cenário: {row[1]} (ID: {row[0][:8]}...)")
    print(f"  Ano: {row[2]}")
    print(f"  Seção ID: {row[3]}")
    print(f"  Função: {row[4]}")
    print(f"  Jan: {row[5]}, Fev: {row[6]}, Mar: {row[7]}")
    print()

# Verificar tipos de custo
cur.execute("SELECT COUNT(*) FROM tipos_custo WHERE ativo = true")
print(f"Tipos de custo ativos: {cur.fetchone()[0]}")

# Verificar tabela salarial
cur.execute("""
    SELECT qp.id, f.nome, ts.salario_base, pb.vt_dia, pb.vr_dia
    FROM quadro_pessoal qp
    LEFT JOIN funcoes f ON f.id = qp.funcao_id
    LEFT JOIN tabelas_salariais ts ON ts.id = qp.tabela_salarial_id
    LEFT JOIN politicas_beneficio pb ON pb.id = ts.politica_id
    LIMIT 5
""")
print("\nQuadro com salários:")
for row in cur.fetchall():
    print(f"  - {row[1]}: Salário={row[2]}, VT={row[3]}, VR={row[4]}")

conn.close()

