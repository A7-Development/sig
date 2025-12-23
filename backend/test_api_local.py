"""
Teste local da API sem precisar do servidor rodando.
Execute: python test_api_local.py
"""
import asyncio
from app.db.session import AsyncSessionLocal
from app.db.models.orcamento import TipoCusto
from sqlalchemy import select

async def test_tipos_custo():
    print("Testando query de tipos de custo...")
    async with AsyncSessionLocal() as db:
        query = select(TipoCusto).order_by(TipoCusto.ordem, TipoCusto.codigo)
        result = await db.execute(query)
        tipos = result.scalars().all()
        print(f"OK - Encontrados {len(tipos)} tipos de custo")
        if tipos:
            print(f"  Primeiro: {tipos[0].codigo} - {tipos[0].nome}")
        return tipos

if __name__ == "__main__":
    tipos = asyncio.run(test_tipos_custo())
    print("\nOK - Query funcionando corretamente!")
    print(f"  Total de rubricas: {len(tipos)}")

