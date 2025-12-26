"""Verifica o quadro pessoal do cenário."""
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

# Listar cenários
cur.execute("SELECT id, nome FROM cenarios LIMIT 5")
print("Cenários:")
for row in cur.fetchall():
    print(f"  - {row[0]}: {row[1]}")

# Verificar quadro pessoal
cur.execute("""
    SELECT c.nome, qp.cenario_secao_id, COUNT(*) 
    FROM quadro_pessoal qp
    JOIN cenarios c ON c.id = qp.cenario_id
    GROUP BY c.nome, qp.cenario_secao_id
""")
print("\nQuadro Pessoal por cenário/seção:")
for row in cur.fetchall():
    print(f"  - {row[0]}: seção={row[1]}, qtd={row[2]}")

conn.close()





