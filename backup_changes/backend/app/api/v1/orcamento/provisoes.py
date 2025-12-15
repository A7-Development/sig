"""
CRUD de Provisões (13º Salário, Férias, Demandas Trabalhistas).
Provisões são globais (não por empresa).
"""

from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.db.models.orcamento import Provisao
from app.schemas.orcamento import (
    ProvisaoCreate, ProvisaoUpdate, ProvisaoResponse
)

router = APIRouter(prefix="/provisoes", tags=["Provisões"])


# Provisões padrão
PROVISOES_PADRAO = [
    {
        "codigo": "13_SALARIO",
        "nome": "13º Salário",
        "descricao": "Provisão para pagamento do 13º salário (1/12 por mês)",
        "percentual": 8.33,  # 1/12 = 8.33%
        "incide_encargos": True,
        "ordem": 1
    },
    {
        "codigo": "FERIAS",
        "nome": "Férias + 1/3",
        "descricao": "Provisão para férias + 1/3 constitucional",
        "percentual": 11.11,  # (1/12) + (1/3 de 1/12) = 11.11%
        "incide_encargos": True,
        "ordem": 2
    },
    {
        "codigo": "DEMANDAS",
        "nome": "Demandas Trabalhistas",
        "descricao": "Provisão para eventuais demandas trabalhistas",
        "percentual": 2.00,
        "incide_encargos": False,
        "ordem": 3
    },
]


@router.get("", response_model=List[ProvisaoResponse])
async def list_provisoes(
    ativo: Optional[bool] = Query(None, description="Filtrar por status"),
    db: AsyncSession = Depends(get_db)
):
    """Lista todas as provisões."""
    query = select(Provisao)
    
    if ativo is not None:
        query = query.where(Provisao.ativo == ativo)
    
    query = query.order_by(Provisao.ordem, Provisao.codigo)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{provisao_id}", response_model=ProvisaoResponse)
async def get_provisao(provisao_id: UUID, db: AsyncSession = Depends(get_db)):
    """Busca uma provisão pelo ID."""
    result = await db.execute(select(Provisao).where(Provisao.id == provisao_id))
    provisao = result.scalar_one_or_none()
    if not provisao:
        raise HTTPException(status_code=404, detail="Provisão não encontrada")
    return provisao


@router.post("", response_model=ProvisaoResponse, status_code=201)
async def create_provisao(data: ProvisaoCreate, db: AsyncSession = Depends(get_db)):
    """Cria uma nova provisão."""
    # Verificar duplicidade
    result = await db.execute(
        select(Provisao).where(Provisao.codigo == data.codigo)
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Provisão {data.codigo} já existe")
    
    provisao = Provisao(**data.model_dump())
    db.add(provisao)
    await db.commit()
    await db.refresh(provisao)
    return provisao


@router.put("/{provisao_id}", response_model=ProvisaoResponse)
async def update_provisao(
    provisao_id: UUID, 
    data: ProvisaoUpdate, 
    db: AsyncSession = Depends(get_db)
):
    """Atualiza uma provisão."""
    result = await db.execute(select(Provisao).where(Provisao.id == provisao_id))
    provisao = result.scalar_one_or_none()
    if not provisao:
        raise HTTPException(status_code=404, detail="Provisão não encontrada")
    
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(provisao, field, value)
    
    await db.commit()
    await db.refresh(provisao)
    return provisao


@router.delete("/{provisao_id}", status_code=204)
async def delete_provisao(provisao_id: UUID, db: AsyncSession = Depends(get_db)):
    """Remove uma provisão."""
    result = await db.execute(select(Provisao).where(Provisao.id == provisao_id))
    provisao = result.scalar_one_or_none()
    if not provisao:
        raise HTTPException(status_code=404, detail="Provisão não encontrada")
    
    await db.delete(provisao)
    await db.commit()


@router.post("/gerar-padrao", response_model=List[ProvisaoResponse])
async def gerar_provisoes_padrao(db: AsyncSession = Depends(get_db)):
    """Gera as provisões padrão (13º, Férias, Demandas)."""
    provisoes_criadas = []
    
    for prov_data in PROVISOES_PADRAO:
        # Verificar se já existe
        result = await db.execute(
            select(Provisao).where(Provisao.codigo == prov_data["codigo"])
        )
        if result.scalar_one_or_none():
            continue
        
        provisao = Provisao(**prov_data)
        db.add(provisao)
        provisoes_criadas.append(provisao)
    
    await db.commit()
    for p in provisoes_criadas:
        await db.refresh(p)
    
    return provisoes_criadas

