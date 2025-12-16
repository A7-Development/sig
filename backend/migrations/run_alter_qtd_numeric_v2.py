"""
Script para alterar colunas qtd_* de Integer para Numeric.
Permite valores fracionados para rateio.
Usando SQLAlchemy para conexão.
"""

import asyncio
import sys
sys.path.insert(0, ".")

from sqlalchemy import text
from app.db.session import AsyncSessionLocal


async def run_migration():
    print("=" * 60)
    print("Alterando colunas qtd_* para NUMERIC(10,2)")
    print("=" * 60)
    
    meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
    
    async with AsyncSessionLocal() as session:
        for mes in meses:
            col_name = f"qtd_{mes}"
            print(f"Alterando coluna {col_name}...")
            
            try:
                await session.execute(text(f"""
                    ALTER TABLE quadro_pessoal 
                    ALTER COLUMN {col_name} TYPE NUMERIC(10, 2)
                """))
                await session.commit()
                print(f"   OK - {col_name}")
            except Exception as e:
                await session.rollback()
                if "already" in str(e).lower() or "does not exist" in str(e).lower():
                    print(f"   Coluna ou tabela nao existe - {col_name}")
                else:
                    print(f"   AVISO - {col_name}: {e}")
    
    print("=" * 60)
    print("Migration concluida!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(run_migration())

