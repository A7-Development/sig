"""
APIs CRUD para Empresas do Grupo.
"""

from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.db.models.orcamento import Empresa
from app.schemas.orcamento import (
    EmpresaCreate,
    EmpresaUpdate,
    EmpresaResponse,
    EmpresaComTributos,
)

router = APIRouter(prefix="/empresas", tags=["Empresas"])


@router.get("/", response_model=List[EmpresaResponse])
async def list_empresas(
    skip: int = 0,
    limit: int = 100,
    ativo: Optional[bool] = None,
    busca: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Lista todas as empresas do grupo."""
    query = select(Empresa)
    
    if ativo is not None:
        query = query.where(Empresa.ativo == ativo)
    
    if busca:
        busca_like = f"%{busca}%"
        query = query.where(
            (Empresa.codigo.ilike(busca_like)) |
            (Empresa.razao_social.ilike(busca_like)) |
            (Empresa.nome_fantasia.ilike(busca_like)) |
            (Empresa.cnpj.ilike(busca_like))
        )
    
    query = query.order_by(Empresa.razao_social).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{empresa_id}", response_model=EmpresaComTributos)
async def get_empresa(
    empresa_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Busca uma empresa pelo ID, incluindo seus encargos."""
    result = await db.execute(
        select(Empresa)
        .options(selectinload(Empresa.encargos))
        .where(Empresa.id == empresa_id)
    )
    empresa = result.scalar_one_or_none()
    
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empresa não encontrada"
        )
    
    return empresa


@router.post("/", response_model=EmpresaResponse, status_code=status.HTTP_201_CREATED)
async def create_empresa(
    data: EmpresaCreate,
    db: AsyncSession = Depends(get_db)
):
    """Cria uma nova empresa."""
    # Verificar se código já existe
    result = await db.execute(
        select(Empresa).where(Empresa.codigo == data.codigo)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Já existe uma empresa com o código '{data.codigo}'"
        )
    
    # Verificar CNPJ duplicado (se informado)
    if data.cnpj:
        result = await db.execute(
            select(Empresa).where(Empresa.cnpj == data.cnpj)
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Já existe uma empresa com o CNPJ '{data.cnpj}'"
            )
    
    empresa = Empresa(**data.model_dump())
    db.add(empresa)
    await db.commit()
    await db.refresh(empresa)
    
    return empresa


@router.put("/{empresa_id}", response_model=EmpresaResponse)
async def update_empresa(
    empresa_id: UUID,
    data: EmpresaUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Atualiza uma empresa existente."""
    result = await db.execute(
        select(Empresa).where(Empresa.id == empresa_id)
    )
    empresa = result.scalar_one_or_none()
    
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empresa não encontrada"
        )
    
    update_data = data.model_dump(exclude_unset=True)
    
    # Verificar código duplicado
    if "codigo" in update_data and update_data["codigo"] != empresa.codigo:
        result = await db.execute(
            select(Empresa).where(
                Empresa.codigo == update_data["codigo"],
                Empresa.id != empresa_id
            )
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Já existe uma empresa com o código '{update_data['codigo']}'"
            )
    
    # Verificar CNPJ duplicado
    if "cnpj" in update_data and update_data["cnpj"] and update_data["cnpj"] != empresa.cnpj:
        result = await db.execute(
            select(Empresa).where(
                Empresa.cnpj == update_data["cnpj"],
                Empresa.id != empresa_id
            )
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Já existe uma empresa com o CNPJ '{update_data['cnpj']}'"
            )
    
    # Atualizar campos
    for field, value in update_data.items():
        setattr(empresa, field, value)
    
    await db.commit()
    await db.refresh(empresa)
    
    return empresa


@router.delete("/{empresa_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_empresa(
    empresa_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Exclui uma empresa."""
    result = await db.execute(
        select(Empresa).where(Empresa.id == empresa_id)
    )
    empresa = result.scalar_one_or_none()
    
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empresa não encontrada"
        )
    
    await db.delete(empresa)
    await db.commit()




