"""
Script para executar a migracao de cenario_cliente e cenario_secao.
"""
import psycopg2
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.config import settings

def run_migration():
    """Executa a migracao SQL."""
    try:
        db_url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
        parts = db_url.replace("postgresql://", "").split("@")
        if len(parts) == 2:
            user_pass = parts[0].split(":")
            host_db = parts[1].split("/")
            if len(host_db) == 2:
                host_port = host_db[0].split(":")
                user = user_pass[0]
                password = user_pass[1] if len(user_pass) > 1 else ""
                host = host_port[0]
                port = int(host_port[1]) if len(host_port) > 1 else 5432
                database = host_db[1]
        
        print(f"Conectando ao banco {database} em {host}:{port}...")
        conn = psycopg2.connect(
            host=host,
            port=port,
            database=database,
            user=user,
            password=password
        )
        
        script_path = Path(__file__).parent / "add_cenario_cliente_secao.sql"
        with open(script_path, "r", encoding="utf-8") as f:
            sql = f.read()
        
        print("Executando migracao...")
        with conn.cursor() as cur:
            cur.execute(sql)
            conn.commit()
        
        print("[OK] Migracao concluida com sucesso!")
        conn.close()
        
    except Exception as e:
        print(f"[ERRO] Erro ao executar migracao: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_migration()

Script para executar a migracao de cenario_cliente e cenario_secao.
"""
import psycopg2
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.config import settings

def run_migration():
    """Executa a migracao SQL."""
    try:
        db_url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
        parts = db_url.replace("postgresql://", "").split("@")
        if len(parts) == 2:
            user_pass = parts[0].split(":")
            host_db = parts[1].split("/")
            if len(host_db) == 2:
                host_port = host_db[0].split(":")
                user = user_pass[0]
                password = user_pass[1] if len(user_pass) > 1 else ""
                host = host_port[0]
                port = int(host_port[1]) if len(host_port) > 1 else 5432
                database = host_db[1]
        
        print(f"Conectando ao banco {database} em {host}:{port}...")
        conn = psycopg2.connect(
            host=host,
            port=port,
            database=database,
            user=user,
            password=password
        )
        
        script_path = Path(__file__).parent / "add_cenario_cliente_secao.sql"
        with open(script_path, "r", encoding="utf-8") as f:
            sql = f.read()
        
        print("Executando migracao...")
        with conn.cursor() as cur:
            cur.execute(sql)
            conn.commit()
        
        print("[OK] Migracao concluida com sucesso!")
        conn.close()
        
    except Exception as e:
        print(f"[ERRO] Erro ao executar migracao: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_migration()













