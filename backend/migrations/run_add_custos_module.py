"""
Script para executar a migração do módulo de custos.
Executa o arquivo SQL add_custos_module.sql no PostgreSQL SIG.
"""

import os
import sys
from pathlib import Path

# Adicionar o diretório pai ao path para imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine, text
from app.core.config import settings


def run_migration():
    """Executa a migração SQL."""
    
    # Criar engine síncrono para migração
    database_url = settings.DATABASE_URL.replace("+asyncpg", "")
    engine = create_engine(database_url, echo=True)
    
    # Ler arquivo SQL
    sql_file = Path(__file__).parent / "add_custos_module.sql"
    
    if not sql_file.exists():
        print(f"ERRO: Arquivo SQL não encontrado: {sql_file}")
        return False
    
    sql_content = sql_file.read_text(encoding="utf-8")
    
    print("=" * 60)
    print("Executando migração: Módulo de Custos")
    print("=" * 60)
    
    try:
        with engine.connect() as conn:
            # Executar cada statement separadamente
            statements = sql_content.split(";")
            for stmt in statements:
                stmt = stmt.strip()
                if stmt and not stmt.startswith("--"):
                    try:
                        conn.execute(text(stmt))
                        conn.commit()
                    except Exception as e:
                        # Ignorar erros de "já existe" para idempotência
                        if "already exists" in str(e) or "já existe" in str(e):
                            print(f"  [SKIP] {str(e)[:80]}")
                        else:
                            print(f"  [WARN] {str(e)[:100]}")
            
            print("\n" + "=" * 60)
            print("Migração concluída com sucesso!")
            print("=" * 60)
            return True
            
    except Exception as e:
        print(f"\nERRO na migração: {e}")
        return False


if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)



