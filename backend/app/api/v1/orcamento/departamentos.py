"""
APIs CRUD para Departamentos.
"""

from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.db.models import Departamento
from app.schemas.orcamento import (
    DepartamentoCreate,
    DepartamentoUpdate,
    DepartamentoResponse,
    DepartamentoComSecoes,
    ImportacaoTotvs,
    ImportacaoResultado,
)
from app.services.corporerm import listar_departamentos

router = APIRouter(prefix="/departamentos", tags=["Departamentos"])


@router.get("/", response_model=List[DepartamentoResponse])
async def list_departamentos(
    skip: int = 0,
    limit: int = 100,
    ativo: Optional[bool] = None,
    busca: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Lista todos os departamentos."""
    query = select(Departamento)
    
    if ativo is not None:
        query = query.where(Departamento.ativo == ativo)
    
    if busca:
        query = query.where(
            (Departamento.nome.ilike(f"%{busca}%")) |
            (Departamento.codigo.ilike(f"%{busca}%"))
        )
    
    query = query.order_by(Departamento.nome).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{departamento_id}", response_model=DepartamentoComSecoes)
async def get_departamento(
    departamento_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Busca departamento por ID."""
    result = await db.execute(
        select(Departamento).where(Departamento.id == departamento_id)
    )
    departamento = result.scalar_one_or_none()
    
    if not departamento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Departamento não encontrado"
        )
    
    return departamento


@router.post("/", response_model=DepartamentoResponse, status_code=status.HTTP_201_CREATED)
async def create_departamento(
    data: DepartamentoCreate,
    db: AsyncSession = Depends(get_db)
):
    """Cria novo departamento."""
    # Verificar se código já existe
    result = await db.execute(
        select(Departamento).where(Departamento.codigo == data.codigo)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Código já cadastrado"
        )
    
    departamento = Departamento(**data.model_dump())
    db.add(departamento)
    await db.commit()
    await db.refresh(departamento)
    
    return departamento


@router.put("/{departamento_id}", response_model=DepartamentoResponse)
async def update_departamento(
    departamento_id: UUID,
    data: DepartamentoUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Atualiza departamento."""
    result = await db.execute(
        select(Departamento).where(Departamento.id == departamento_id)
    )
    departamento = result.scalar_one_or_none()
    
    if not departamento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Departamento não encontrado"
        )
    
    # Verificar código duplicado
    if data.codigo and data.codigo != departamento.codigo:
        result = await db.execute(
            select(Departamento).where(
                Departamento.codigo == data.codigo,
                Departamento.id != departamento_id
            )
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Código já cadastrado"
            )
    
    # Atualizar campos
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(departamento, field, value)
    
    await db.commit()
    await db.refresh(departamento)
    
    return departamento


@router.delete("/{departamento_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_departamento(
    departamento_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Exclui departamento."""
    result = await db.execute(
        select(Departamento).where(Departamento.id == departamento_id)
    )
    departamento = result.scalar_one_or_none()
    
    if not departamento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Departamento não encontrado"
        )
    
    await db.delete(departamento)
    await db.commit()


@router.post("/importar-totvs", response_model=ImportacaoResultado)
async def importar_departamentos_totvs(
    data: ImportacaoTotvs,
    db: AsyncSession = Depends(get_db)
):
    """
    Importa departamentos selecionados do TOTVS.
    Cria registros no SIG com vínculo ao código TOTVS.
    """
    # Buscar departamentos do TOTVS
    deptos_totvs = listar_departamentos(apenas_ativos=True)
    deptos_map = {d.codigo: d for d in deptos_totvs}
    
    importados = 0
    ignorados = 0
    erros = []
    
    for codigo in data.codigos:
        if codigo not in deptos_map:
            erros.append(f"Código {codigo} não encontrado no TOTVS")
            continue
        
        depto_totvs = deptos_map[codigo]
        
        # Verificar se já existe
        result = await db.execute(
            select(Departamento).where(Departamento.codigo_totvs == codigo)
        )
        if result.scalar_one_or_none():
            ignorados += 1
            continue
        
        # Criar novo departamento
        novo_depto = Departamento(
            codigo=codigo,
            codigo_totvs=codigo,
            nome=depto_totvs.nome,
            ativo=True
        )
        db.add(novo_depto)
        importados += 1
    
    await db.commit()
    
    return ImportacaoResultado(
        importados=importados,
        ignorados=ignorados,
        erros=erros
    )

