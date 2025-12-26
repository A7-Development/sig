"""Testa a query de tipos_custo igual à API."""
import asyncio
import os
import sys
from pathlib import Path

backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from dotenv import load_dotenv
load_dotenv(backend_dir / ".env")

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from app.db.models.orcamento import TipoCusto
from app.schemas.orcamento import TipoCustoResponse

db_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/sig")
if db_url.startswith("postgresql+asyncpg://"):
    db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")

engine = create_engine(db_url, echo=False)

def test_query():
    with Session(engine) as db:
        # Mesma query da API
        query = select(TipoCusto).order_by(TipoCusto.ordem, TipoCusto.codigo)
        result = db.execute(query)
        tipos = result.scalars().all()
        
        print(f"Encontrados {len(tipos)} tipos de custo")
        
        for tipo in tipos[:3]:
            print(f"\nTipo: {tipo.codigo}")
            print(f"  Nome: {tipo.nome}")
            print(f"  Categoria: {tipo.categoria}")
            print(f"  Tipo calculo: {tipo.tipo_calculo}")
            print(f"  Ordem: {tipo.ordem}")
            print(f"  Ativo: {tipo.ativo}")
            print(f"  Created_at: {tipo.created_at}")
            print(f"  Updated_at: {tipo.updated_at}")
            
            # Tentar criar o response
            try:
                resp = TipoCustoResponse.model_validate(tipo)
                print(f"  Response OK: {resp.codigo}")
            except Exception as e:
                print(f"  ERRO no response: {e}")

if __name__ == "__main__":
    test_query()





