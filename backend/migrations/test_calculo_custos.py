"""Testa o cálculo de custos diretamente."""
import asyncio
import os
import sys
from pathlib import Path
from uuid import UUID

backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv
load_dotenv(backend_dir / ".env")

async def test_calculo():
    from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
    from sqlalchemy.orm import sessionmaker
    from app.core.config import settings
    from app.services.calculo_custos import calcular_e_salvar_custos
    
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    cenario_id = UUID("86a75d96-ebc8-4bc2-b75b-64a73714220b")
    
    async with async_session() as db:
        try:
            print(f"Calculando custos para cenário {cenario_id}...")
            quantidade = await calcular_e_salvar_custos(db, cenario_id, ano=2026)
            print(f"Custos calculados: {quantidade}")
        except Exception as e:
            import traceback
            print(f"ERRO: {e}")
            traceback.print_exc()
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(test_calculo())








