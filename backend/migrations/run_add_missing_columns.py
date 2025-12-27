"""
Script para executar a migração de colunas faltantes.
Executa: backend/migrations/add_missing_columns.sql
"""

import os
import sys
from pathlib import Path

# Adiciona o diretório backend ao path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv
import psycopg2

# Carregar variáveis de ambiente
load_dotenv(backend_dir / ".env")

def get_db_url():
    """Obtém a URL do banco de dados."""
    return os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/sig")

def run_migration():
    """Executa a migração SQL."""
    db_url = get_db_url()
    
    # Converter URL async para sync se necessário
    if db_url.startswith("postgresql+asyncpg://"):
        db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")
    
    print(f"Conectando ao banco de dados...")
    
    try:
        conn = psycopg2.connect(db_url)
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Ler arquivo SQL
        sql_file = Path(__file__).parent / "add_missing_columns.sql"
        with open(sql_file, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        print("Executando migração...")
        
        # Executar cada bloco DO $$ separadamente
        blocks = sql_content.split('DO $$')
        
        for i, block in enumerate(blocks):
            if block.strip() and 'BEGIN' in block:
                full_block = 'DO $$' + block
                # Encontrar o fim do bloco (END $$;)
                if 'END $$;' in full_block:
                    end_pos = full_block.find('END $$;') + len('END $$;')
                    sql_to_run = full_block[:end_pos]
                    try:
                        cursor.execute(sql_to_run)
                        print(f"  Bloco {i} executado com sucesso")
                    except Exception as e:
                        print(f"  Aviso no bloco {i}: {e}")
        
        print("\n✅ Migração concluída com sucesso!")
        
        # Verificar colunas criadas
        cursor.execute("""
            SELECT column_name, data_type, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'funcoes' 
            AND column_name IN ('jornada_mensal', 'is_home_office', 'is_pj')
            ORDER BY column_name
        """)
        print("\nColunas em 'funcoes':")
        for row in cursor.fetchall():
            print(f"  - {row[0]}: {row[1]} (default: {row[2]})")
        
        cursor.execute("""
            SELECT column_name, data_type, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'politicas_beneficio' 
            AND column_name IN ('pct_desconto_vt', 'pct_desconto_vr', 'pct_desconto_am')
            ORDER BY column_name
        """)
        print("\nColunas em 'politicas_beneficio':")
        for row in cursor.fetchall():
            print(f"  - {row[0]}: {row[1]} (default: {row[2]})")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Erro na migração: {e}")
        raise

if __name__ == "__main__":
    run_migration()







