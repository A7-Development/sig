"""
Script para alterar colunas qtd_* de Integer para Numeric.
Permite valores fracionados para rateio.
"""

import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/sig_db")

# Parse DATABASE_URL
if DATABASE_URL.startswith("postgresql://"):
    # Format: postgresql://user:pass@host:port/dbname
    parts = DATABASE_URL.replace("postgresql://", "").split("@")
    user_pass = parts[0].split(":")
    host_port_db = parts[1].split("/")
    host_port = host_port_db[0].split(":")
    
    DB_CONFIG = {
        "user": user_pass[0],
        "password": user_pass[1] if len(user_pass) > 1 else "",
        "host": host_port[0],
        "port": host_port[1] if len(host_port) > 1 else "5432",
        "dbname": host_port_db[1] if len(host_port_db) > 1 else "sig_db"
    }
else:
    DB_CONFIG = {
        "user": "postgres",
        "password": "postgres",
        "host": "localhost",
        "port": "5432",
        "dbname": "sig_db"
    }


def run_migration():
    print("=" * 60)
    print("Alterando colunas qtd_* para NUMERIC(10,2)")
    print("=" * 60)
    
    meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
    
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        conn.autocommit = True
        cursor = conn.cursor()
        
        for mes in meses:
            col_name = f"qtd_{mes}"
            print(f"Alterando coluna {col_name}...")
            
            try:
                cursor.execute(f"""
                    ALTER TABLE quadro_pessoal 
                    ALTER COLUMN {col_name} TYPE NUMERIC(10, 2)
                """)
                print(f"   OK - {col_name}")
            except Exception as e:
                if "already" in str(e).lower() or "type" in str(e).lower():
                    print(f"   Já é NUMERIC - {col_name}")
                else:
                    print(f"   ERRO - {col_name}: {e}")
        
        cursor.close()
        conn.close()
        
        print("=" * 60)
        print("Migration concluída!")
        print("=" * 60)
        
    except Exception as e:
        print(f"Erro na conexão: {e}")
        raise


if __name__ == "__main__":
    run_migration()



