"""Verifica e vincula salário ao quadro pessoal."""
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

# Verificar função do quadro pessoal
cur.execute("""
    SELECT qp.id, qp.funcao_id, f.nome as funcao_nome, qp.tabela_salarial_id
    FROM quadro_pessoal qp
    JOIN funcoes f ON f.id = qp.funcao_id
""")
print("Quadro Pessoal:")
quadros = cur.fetchall()
for row in quadros:
    print(f"  - QP ID: {str(row[0])[:8]}, Função: {row[2]}, Func ID: {str(row[1])[:8]}, Tab Sal: {row[3]}")

# Verificar tabela salarial
cur.execute("""
    SELECT ts.id, ts.funcao_id, f.nome as funcao_nome, ts.salario_base
    FROM tabela_salarial ts
    JOIN funcoes f ON f.id = ts.funcao_id
""")
print("\nTabela Salarial:")
tabelas = cur.fetchall()
for row in tabelas:
    print(f"  - Tab ID: {str(row[0])[:8]}, Função: {row[2]}, Func ID: {str(row[1])[:8]}, Salário: R$ {row[3]}")

# Vincular automaticamente se a função for a mesma
print("\nTentando vincular...")
for qp in quadros:
    qp_id, qp_funcao_id, qp_funcao_nome, tab_sal_id = qp
    if tab_sal_id is None:
        # Buscar tabela salarial para essa função
        for ts in tabelas:
            ts_id, ts_funcao_id, ts_funcao_nome, salario = ts
            if ts_funcao_id == qp_funcao_id:
                print(f"  Vinculando QP {str(qp_id)[:8]} com Tabela {str(ts_id)[:8]} (Salário R$ {salario})")
                cur.execute("""
                    UPDATE quadro_pessoal 
                    SET tabela_salarial_id = %s 
                    WHERE id = %s
                """, (ts_id, qp_id))
                break
        else:
            print(f"  Sem tabela salarial para função {qp_funcao_nome}")

conn.close()
print("\nConcluído!")



