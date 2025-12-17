"""
Script para adicionar campo abs_pct_justificado nas tabelas de premissas.
"""

import asyncio
import sys
sys.path.insert(0, ".")

from sqlalchemy import text
from app.db.session import AsyncSessionLocal


async def run_migration():
    print("=" * 60)
    print("Adicionando campo abs_pct_justificado")
    print("=" * 60)
    
    async with AsyncSessionLocal() as session:
        # 1. Adicionar na tabela premissas
        print("1. Adicionando em premissas...")
        try:
            await session.execute(text("""
                ALTER TABLE premissas 
                ADD COLUMN IF NOT EXISTS abs_pct_justificado NUMERIC(5, 2) DEFAULT 75.0
            """))
            await session.commit()
            print("   OK - premissas")
        except Exception as e:
            await session.rollback()
            print(f"   AVISO - premissas: {e}")
        
        # 2. Adicionar na tabela premissa_funcao_mes
        print("2. Adicionando em premissa_funcao_mes...")
        try:
            await session.execute(text("""
                ALTER TABLE premissa_funcao_mes 
                ADD COLUMN IF NOT EXISTS abs_pct_justificado NUMERIC(5, 2) DEFAULT 75.0
            """))
            await session.commit()
            print("   OK - premissa_funcao_mes")
        except Exception as e:
            await session.rollback()
            print(f"   AVISO - premissa_funcao_mes: {e}")
    
    print("=" * 60)
    print("Migration concluida!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(run_migration())



