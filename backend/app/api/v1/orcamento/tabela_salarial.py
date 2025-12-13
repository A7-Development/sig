"""
APIs CRUD para Tabela Salarial.
"""

from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.db.models.orcamento import TabelaSalarial, Funcao, FaixaSalarial, PoliticaBeneficio
from app.schemas.orcamento import (
    TabelaSalarialCreate,
    TabelaSalarialUpdate,
    TabelaSalarialResponse,
)

router = APIRouter(prefix="/tabela-salarial", tags=["Tabela Salarial"])


@router.get("/", response_model=List[TabelaSalarialResponse])
async def list_tabela_salarial(
    funcao_id: Optional[UUID] = Query(None, description="Filtrar por função"),
    regime: Optional[str] = Query(None, description="Filtrar por regime (CLT ou PJ)"),
    faixa_id: Optional[UUID] = Query(None, description="Filtrar por faixa"),
    politica_id: Optional[UUID] = Query(None, description="Filtrar por política"),
    ativo: Optional[bool] = Query(None, description="Filtrar por status"),
    db: AsyncSession = Depends(get_db)
):
    """Lista todos os itens da tabela salarial."""
    query = select(TabelaSalarial).options(
        selectinload(TabelaSalarial.funcao),
        selectinload(TabelaSalarial.faixa),
        selectinload(TabelaSalarial.politica),
    )
    
    if funcao_id:
        query = query.where(TabelaSalarial.funcao_id == funcao_id)
    
    if regime:
        query = query.where(TabelaSalarial.regime == regime)
    
    if faixa_id:
        query = query.where(TabelaSalarial.faixa_id == faixa_id)
    
    if politica_id:
        query = query.where(TabelaSalarial.politica_id == politica_id)
    
    if ativo is not None:
        query = query.where(TabelaSalarial.ativo == ativo)
    
    query = query.order_by(TabelaSalarial.regime)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{item_id}", response_model=TabelaSalarialResponse)
async def get_tabela_salarial(
    item_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Busca um item da tabela salarial pelo ID."""
    result = await db.execute(
        select(TabelaSalarial)
        .options(
            selectinload(TabelaSalarial.funcao),
            selectinload(TabelaSalarial.faixa),
            selectinload(TabelaSalarial.politica),
        )
        .where(TabelaSalarial.id == item_id)
    )
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item da tabela salarial não encontrado"
        )
    
    return item


@router.post("/", response_model=TabelaSalarialResponse, status_code=status.HTTP_201_CREATED)
async def create_tabela_salarial(
    data: TabelaSalarialCreate,
    db: AsyncSession = Depends(get_db)
):
    """Cria um novo item na tabela salarial."""
    # Verificar função
    result = await db.execute(select(Funcao).where(Funcao.id == data.funcao_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Função não encontrada")
    
    # Verificar faixa (se informada)
    if data.faixa_id:
        result = await db.execute(select(FaixaSalarial).where(FaixaSalarial.id == data.faixa_id))
        if not result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Faixa não encontrada")
    
    # Verificar política (se informada)
    if data.politica_id:
        result = await db.execute(select(PoliticaBeneficio).where(PoliticaBeneficio.id == data.politica_id))
        if not result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Política não encontrada")
    
    # Verificar duplicidade (mesma função + regime + faixa)
    query = select(TabelaSalarial).where(
        TabelaSalarial.funcao_id == data.funcao_id,
        TabelaSalarial.regime == data.regime,
    )
    if data.faixa_id:
        query = query.where(TabelaSalarial.faixa_id == data.faixa_id)
    else:
        query = query.where(TabelaSalarial.faixa_id.is_(None))
    
    result = await db.execute(query)
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existe um registro para esta função, regime e faixa"
        )
    
    item = TabelaSalarial(**data.model_dump())
    db.add(item)
    await db.commit()
    
    # Recarregar com relacionamentos
    result = await db.execute(
        select(TabelaSalarial)
        .options(
            selectinload(TabelaSalarial.funcao),
            selectinload(TabelaSalarial.faixa),
            selectinload(TabelaSalarial.politica),
        )
        .where(TabelaSalarial.id == item.id)
    )
    return result.scalar_one()


@router.put("/{item_id}", response_model=TabelaSalarialResponse)
async def update_tabela_salarial(
    item_id: UUID,
    data: TabelaSalarialUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Atualiza um item da tabela salarial."""
    result = await db.execute(
        select(TabelaSalarial).where(TabelaSalarial.id == item_id)
    )
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item da tabela salarial não encontrado"
        )
    
    update_data = data.model_dump(exclude_unset=True)
    
    # Verificar referências se estiverem sendo alteradas
    if "funcao_id" in update_data:
        result = await db.execute(select(Funcao).where(Funcao.id == update_data["funcao_id"]))
        if not result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Função não encontrada")
    
    if "faixa_id" in update_data and update_data["faixa_id"]:
        result = await db.execute(select(FaixaSalarial).where(FaixaSalarial.id == update_data["faixa_id"]))
        if not result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Faixa não encontrada")
    
    if "politica_id" in update_data and update_data["politica_id"]:
        result = await db.execute(select(PoliticaBeneficio).where(PoliticaBeneficio.id == update_data["politica_id"]))
        if not result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Política não encontrada")
    
    for field, value in update_data.items():
        setattr(item, field, value)
    
    await db.commit()
    
    # Recarregar com relacionamentos
    result = await db.execute(
        select(TabelaSalarial)
        .options(
            selectinload(TabelaSalarial.funcao),
            selectinload(TabelaSalarial.faixa),
            selectinload(TabelaSalarial.politica),
        )
        .where(TabelaSalarial.id == item.id)
    )
    return result.scalar_one()


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tabela_salarial(
    item_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Exclui um item da tabela salarial."""
    result = await db.execute(
        select(TabelaSalarial).where(TabelaSalarial.id == item_id)
    )
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item da tabela salarial não encontrado"
        )
    
    await db.delete(item)
    await db.commit()




