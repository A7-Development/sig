"""
CRUD de Tributos (PIS, COFINS, ISS, etc.) por Empresa.
"""

from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.db.session import get_db
from app.db.models.orcamento import Tributo, Empresa
from app.schemas.orcamento import (
    TributoCreate, TributoUpdate, TributoResponse
)

router = APIRouter(prefix="/tributos", tags=["Tributos"])


# Tributos padrão para geração automática
TRIBUTOS_PADRAO = [
    {"codigo": "PIS", "nome": "PIS", "aliquota": 0.65, "ordem": 1},
    {"codigo": "COFINS", "nome": "COFINS", "aliquota": 3.00, "ordem": 2},
    {"codigo": "ISS", "nome": "ISS", "aliquota": 5.00, "ordem": 3},
    {"codigo": "CPREV", "nome": "Contribuição Previdenciária sobre Receita", "aliquota": 4.50, "ordem": 4},
]


@router.get("", response_model=List[TributoResponse])
async def list_tributos(
    empresa_id: Optional[UUID] = Query(None, description="Filtrar por empresa"),
    ativo: Optional[bool] = Query(None, description="Filtrar por status"),
    db: AsyncSession = Depends(get_db)
):
    """Lista tributos, opcionalmente filtrados por empresa."""
    query = select(Tributo)
    
    if empresa_id:
        query = query.where(Tributo.empresa_id == empresa_id)
    if ativo is not None:
        query = query.where(Tributo.ativo == ativo)
    
    query = query.order_by(Tributo.ordem, Tributo.codigo)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{tributo_id}", response_model=TributoResponse)
async def get_tributo(tributo_id: UUID, db: AsyncSession = Depends(get_db)):
    """Busca um tributo pelo ID."""
    result = await db.execute(select(Tributo).where(Tributo.id == tributo_id))
    tributo = result.scalar_one_or_none()
    if not tributo:
        raise HTTPException(status_code=404, detail="Tributo não encontrado")
    return tributo


@router.post("", response_model=TributoResponse, status_code=201)
async def create_tributo(data: TributoCreate, db: AsyncSession = Depends(get_db)):
    """Cria um novo tributo."""
    # Verificar se empresa existe
    result = await db.execute(select(Empresa).where(Empresa.id == data.empresa_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Empresa não encontrada")
    
    # Verificar duplicidade
    result = await db.execute(
        select(Tributo).where(
            and_(
                Tributo.empresa_id == data.empresa_id,
                Tributo.codigo == data.codigo
            )
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Tributo {data.codigo} já existe para esta empresa")
    
    tributo = Tributo(**data.model_dump())
    db.add(tributo)
    await db.commit()
    await db.refresh(tributo)
    return tributo


@router.put("/{tributo_id}", response_model=TributoResponse)
async def update_tributo(
    tributo_id: UUID, 
    data: TributoUpdate, 
    db: AsyncSession = Depends(get_db)
):
    """Atualiza um tributo."""
    result = await db.execute(select(Tributo).where(Tributo.id == tributo_id))
    tributo = result.scalar_one_or_none()
    if not tributo:
        raise HTTPException(status_code=404, detail="Tributo não encontrado")
    
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(tributo, field, value)
    
    await db.commit()
    await db.refresh(tributo)
    return tributo


@router.delete("/{tributo_id}", status_code=204)
async def delete_tributo(tributo_id: UUID, db: AsyncSession = Depends(get_db)):
    """Remove um tributo."""
    result = await db.execute(select(Tributo).where(Tributo.id == tributo_id))
    tributo = result.scalar_one_or_none()
    if not tributo:
        raise HTTPException(status_code=404, detail="Tributo não encontrado")
    
    await db.delete(tributo)
    await db.commit()


@router.post("/gerar-padrao/{empresa_id}", response_model=List[TributoResponse])
async def gerar_tributos_padrao(
    empresa_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Gera tributos padrão para uma empresa."""
    # Verificar se empresa existe
    result = await db.execute(select(Empresa).where(Empresa.id == empresa_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    tributos_criados = []
    for trib_data in TRIBUTOS_PADRAO:
        # Verificar se já existe
        result = await db.execute(
            select(Tributo).where(
                and_(
                    Tributo.empresa_id == empresa_id,
                    Tributo.codigo == trib_data["codigo"]
                )
            )
        )
        if result.scalar_one_or_none():
            continue
        
        tributo = Tributo(
            empresa_id=empresa_id,
            **trib_data
        )
        db.add(tributo)
        tributos_criados.append(tributo)
    
    await db.commit()
    for t in tributos_criados:
        await db.refresh(t)
    
    return tributos_criados

