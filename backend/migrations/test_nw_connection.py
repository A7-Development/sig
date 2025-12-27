"""Testa conexão com banco NW."""
import os
import sys
from pathlib import Path

backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv
import psycopg2

load_dotenv(backend_dir / ".env")

try:
    print("Conectando ao NW...")
    print(f"  Host: {os.getenv('NW_HOST')}")
    print(f"  Database: {os.getenv('NW_DATABASE')}")
    print(f"  User: {os.getenv('NW_USER')}")
    
    conn = psycopg2.connect(
        host=os.getenv('NW_HOST'),
        port=int(os.getenv('NW_PORT', 5432)),
        database=os.getenv('NW_DATABASE'),
        user=os.getenv('NW_USER'),
        password=os.getenv('NW_PASSWORD')
    )
    print("✅ Conexão estabelecida!")
    
    cur = conn.cursor()
    
    # Verificar se a view existe
    cur.execute("""
        SELECT table_name 
        FROM information_schema.views 
        WHERE table_name LIKE '%conta%contabil%'
    """)
    views = cur.fetchall()
    print(f"\nViews encontradas com 'conta' e 'contabil': {len(views)}")
    for v in views:
        print(f"  - {v[0]}")
    
    # Tentar consultar a view
    try:
        cur.execute("SELECT COUNT(*) FROM vw_conta_contabil_niveis")
        count = cur.fetchone()[0]
        print(f"\n✅ View vw_conta_contabil_niveis existe! Registros: {count}")
        
        # Mostrar alguns registros
        cur.execute("SELECT codigo, descricao FROM vw_conta_contabil_niveis LIMIT 5")
        print("\nPrimeiros registros:")
        for row in cur.fetchall():
            print(f"  - {row[0]}: {row[1]}")
    except Exception as e:
        print(f"\n❌ Erro ao consultar vw_conta_contabil_niveis: {e}")
    
    conn.close()
    
except Exception as e:
    print(f"\n❌ Erro de conexão: {e}")







