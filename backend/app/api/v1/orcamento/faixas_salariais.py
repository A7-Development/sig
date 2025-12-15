"""
APIs CRUD para Faixas Salariais.
"""

from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.db.models.orcamento import FaixaSalarial
from app.schemas.orcamento import (
    FaixaSalarialCreate,
    FaixaSalarialUpdate,
    FaixaSalarialResponse,
)

router = APIRouter(prefix="/faixas-salariais", tags=["Faixas Salariais"])


@router.get("/", response_model=List[FaixaSalarialResponse])
async def list_faixas(
    ativo: Optional[bool] = Query(None, description="Filtrar por status"),
    db: AsyncSession = Depends(get_db)
):
    """Lista todas as faixas salariais."""
    query = select(FaixaSalarial)
    
    if ativo is not None:
        query = query.where(FaixaSalarial.ativo == ativo)
    
    query = query.order_by(FaixaSalarial.ordem, FaixaSalarial.nome)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{faixa_id}", response_model=FaixaSalarialResponse)
async def get_faixa(
    faixa_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Busca uma faixa pelo ID."""
    result = await db.execute(
        select(FaixaSalarial).where(FaixaSalarial.id == faixa_id)
    )
    faixa = result.scalar_one_or_none()
    
    if not faixa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Faixa salarial não encontrada"
        )
    
    return faixa


@router.post("/", response_model=FaixaSalarialResponse, status_code=status.HTTP_201_CREATED)
async def create_faixa(
    data: FaixaSalarialCreate,
    db: AsyncSession = Depends(get_db)
):
    """Cria uma nova faixa salarial."""
    result = await db.execute(
        select(FaixaSalarial).where(FaixaSalarial.codigo == data.codigo)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Já existe uma faixa com o código '{data.codigo}'"
        )
    
    faixa = FaixaSalarial(**data.model_dump())
    db.add(faixa)
    await db.commit()
    await db.refresh(faixa)
    
    return faixa


@router.post("/gerar-padrao", response_model=List[FaixaSalarialResponse])
async def gerar_faixas_padrao(
    db: AsyncSession = Depends(get_db)
):
    """Gera faixas salariais padrão (Júnior, Pleno, Sênior)."""
    result = await db.execute(select(FaixaSalarial).limit(1))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existem faixas cadastradas"
        )
    
    faixas_padrao = [
        {"codigo": "JR", "nome": "Júnior", "ordem": 1},
        {"codigo": "PL", "nome": "Pleno", "ordem": 2},
        {"codigo": "SR", "nome": "Sênior", "ordem": 3},
        {"codigo": "ESP", "nome": "Especialista", "ordem": 4},
    ]
    
    novas_faixas = []
    for faixa_data in faixas_padrao:
        faixa = FaixaSalarial(ativo=True, **faixa_data)
        db.add(faixa)
        novas_faixas.append(faixa)
    
    await db.commit()
    
    for f in novas_faixas:
        await db.refresh(f)
    
    return novas_faixas


@router.put("/{faixa_id}", response_model=FaixaSalarialResponse)
async def update_faixa(
    faixa_id: UUID,
    data: FaixaSalarialUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Atualiza uma faixa salarial."""
    result = await db.execute(
        select(FaixaSalarial).where(FaixaSalarial.id == faixa_id)
    )
    faixa = result.scalar_one_or_none()
    
    if not faixa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Faixa salarial não encontrada"
        )
    
    update_data = data.model_dump(exclude_unset=True)
    
    if "codigo" in update_data and update_data["codigo"] != faixa.codigo:
        result = await db.execute(
            select(FaixaSalarial).where(
                FaixaSalarial.codigo == update_data["codigo"],
                FaixaSalarial.id != faixa_id
            )
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Já existe uma faixa com o código '{update_data['codigo']}'"
            )
    
    for field, value in update_data.items():
        setattr(faixa, field, value)
    
    await db.commit()
    await db.refresh(faixa)
    
    return faixa


@router.delete("/{faixa_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_faixa(
    faixa_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Exclui uma faixa salarial."""
    result = await db.execute(
        select(FaixaSalarial).where(FaixaSalarial.id == faixa_id)
    )
    faixa = result.scalar_one_or_none()
    
    if not faixa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Faixa salarial não encontrada"
        )
    
    await db.delete(faixa)
    await db.commit()





