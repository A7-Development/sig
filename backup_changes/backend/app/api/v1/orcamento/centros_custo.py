"""
APIs CRUD para Centros de Custo.
"""

from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.db.models import CentroCusto
from app.schemas.orcamento import (
    CentroCustoCreate,
    CentroCustoUpdate,
    CentroCustoResponse,
    ImportacaoTotvs,
    ImportacaoResultado,
)
from app.services.corporerm import listar_centros_custo

router = APIRouter(prefix="/centros-custo", tags=["Centros de Custo"])


@router.get("/", response_model=List[CentroCustoResponse])
async def list_centros_custo(
    skip: int = 0,
    limit: int = 100,
    ativo: Optional[bool] = None,
    tipo: Optional[str] = None,
    cliente: Optional[str] = None,
    busca: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Lista todos os centros de custo."""
    query = select(CentroCusto)
    
    if ativo is not None:
        query = query.where(CentroCusto.ativo == ativo)
    
    if tipo:
        query = query.where(CentroCusto.tipo == tipo)
    
    if cliente:
        query = query.where(CentroCusto.cliente.ilike(f"%{cliente}%"))
    
    if busca:
        query = query.where(
            (CentroCusto.nome.ilike(f"%{busca}%")) |
            (CentroCusto.codigo.ilike(f"%{busca}%")) |
            (CentroCusto.cliente.ilike(f"%{busca}%"))
        )
    
    query = query.order_by(CentroCusto.nome).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{centro_custo_id}", response_model=CentroCustoResponse)
async def get_centro_custo(
    centro_custo_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Busca centro de custo por ID."""
    result = await db.execute(
        select(CentroCusto).where(CentroCusto.id == centro_custo_id)
    )
    centro = result.scalar_one_or_none()
    
    if not centro:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Centro de custo não encontrado"
        )
    
    return centro


@router.post("/", response_model=CentroCustoResponse, status_code=status.HTTP_201_CREATED)
async def create_centro_custo(
    data: CentroCustoCreate,
    db: AsyncSession = Depends(get_db)
):
    """Cria novo centro de custo."""
    # Verificar se código já existe
    result = await db.execute(
        select(CentroCusto).where(CentroCusto.codigo == data.codigo)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Código já cadastrado"
        )
    
    centro = CentroCusto(**data.model_dump())
    db.add(centro)
    await db.commit()
    await db.refresh(centro)
    
    return centro


@router.put("/{centro_custo_id}", response_model=CentroCustoResponse)
async def update_centro_custo(
    centro_custo_id: UUID,
    data: CentroCustoUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Atualiza centro de custo."""
    result = await db.execute(
        select(CentroCusto).where(CentroCusto.id == centro_custo_id)
    )
    centro = result.scalar_one_or_none()
    
    if not centro:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Centro de custo não encontrado"
        )
    
    # Verificar código duplicado
    if data.codigo and data.codigo != centro.codigo:
        result = await db.execute(
            select(CentroCusto).where(
                CentroCusto.codigo == data.codigo,
                CentroCusto.id != centro_custo_id
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
        setattr(centro, field, value)
    
    await db.commit()
    await db.refresh(centro)
    
    return centro


@router.delete("/{centro_custo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_centro_custo(
    centro_custo_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Exclui centro de custo."""
    result = await db.execute(
        select(CentroCusto).where(CentroCusto.id == centro_custo_id)
    )
    centro = result.scalar_one_or_none()
    
    if not centro:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Centro de custo não encontrado"
        )
    
    await db.delete(centro)
    await db.commit()


@router.post("/importar-totvs", response_model=ImportacaoResultado)
async def importar_centros_custo_totvs(
    data: ImportacaoTotvs,
    tipo: str = Query("OPERACIONAL", description="Tipo do centro de custo"),
    db: AsyncSession = Depends(get_db)
):
    """
    Importa centros de custo selecionados do TOTVS.
    """
    # Buscar centros de custo do TOTVS
    ccs_totvs = listar_centros_custo(apenas_ativos=True)
    ccs_map = {c.codigo: c for c in ccs_totvs}
    
    importados = 0
    ignorados = 0
    erros = []
    
    for codigo in data.codigos:
        if codigo not in ccs_map:
            erros.append(f"Código {codigo} não encontrado no TOTVS")
            continue
        
        cc_totvs = ccs_map[codigo]
        
        # Verificar se já existe
        result = await db.execute(
            select(CentroCusto).where(CentroCusto.codigo_totvs == codigo)
        )
        if result.scalar_one_or_none():
            ignorados += 1
            continue
        
        # Criar novo centro de custo
        novo_cc = CentroCusto(
            codigo=codigo,
            codigo_totvs=codigo,
            nome=cc_totvs.nome or codigo,
            tipo=tipo,
            ativo=True
        )
        db.add(novo_cc)
        importados += 1
    
    await db.commit()
    
    return ImportacaoResultado(
        importados=importados,
        ignorados=ignorados,
        erros=erros
    )

