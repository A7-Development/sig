"""
Fix: Torna cenario_cliente_id nullable em cenario_secao
"""
import asyncio
from sqlalchemy import text

import sys
sys.path.insert(0, ".")

from app.db.session import engine

async def run_fix():
    print("Aplicando fix: tornando cenario_cliente_id nullable...")
    
    async with engine.begin() as conn:
        await conn.execute(text(
            "ALTER TABLE cenario_secao ALTER COLUMN cenario_cliente_id DROP NOT NULL;"
        ))
        print("OK - Coluna cenario_cliente_id agora permite NULL!")
    
    print("Fix aplicado com sucesso!")

if __name__ == "__main__":
    asyncio.run(run_fix())




