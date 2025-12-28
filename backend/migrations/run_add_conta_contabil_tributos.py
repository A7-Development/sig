"""
Script para executar a migration de adicionar conta_contabil em tributos.
Execute: python migrations/run_add_conta_contabil_tributos.py
"""
import asyncio
import sys
import os

# Adiciona o diretório backend ao path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.db.session import engine


async def run_migration():
    """Executa a migration para adicionar colunas de conta contábil em tributos."""
    async with engine.begin() as conn:
        # Adicionar colunas se não existirem
        await conn.execute(text("""
            ALTER TABLE tributos 
            ADD COLUMN IF NOT EXISTS conta_contabil_codigo VARCHAR(50),
            ADD COLUMN IF NOT EXISTS conta_contabil_descricao VARCHAR(255)
        """))
        
        # Criar índice se não existir
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_tributos_conta_contabil_codigo 
            ON tributos(conta_contabil_codigo)
        """))
        
        print("[OK] Migration executada com sucesso!")
        print("  - Adicionada coluna conta_contabil_codigo")
        print("  - Adicionada coluna conta_contabil_descricao")
        print("  - Criado indice idx_tributos_conta_contabil_codigo")


if __name__ == "__main__":
    asyncio.run(run_migration())

