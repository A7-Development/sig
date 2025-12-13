"""
APIs CRUD para Seções.
"""

from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.db.models import Secao, Departamento
from app.schemas.orcamento import (
    SecaoCreate,
    SecaoUpdate,
    SecaoResponse,
    SecaoComDepartamento,
    ImportacaoTotvs,
    ImportacaoResultado,
)
from app.services.corporerm import listar_secoes

router = APIRouter(prefix="/secoes", tags=["Seções"])


@router.get("/", response_model=List[SecaoComDepartamento])
async def list_secoes(
    skip: int = 0,
    limit: int = 100,
    ativo: Optional[bool] = None,
    departamento_id: Optional[UUID] = None,
    busca: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Lista todas as seções."""
    query = select(Secao)
    
    if ativo is not None:
        query = query.where(Secao.ativo == ativo)
    
    if departamento_id:
        query = query.where(Secao.departamento_id == departamento_id)
    
    if busca:
        query = query.where(
            (Secao.nome.ilike(f"%{busca}%")) |
            (Secao.codigo.ilike(f"%{busca}%"))
        )
    
    query = query.order_by(Secao.nome).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{secao_id}", response_model=SecaoComDepartamento)
async def get_secao(
    secao_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Busca seção por ID."""
    result = await db.execute(
        select(Secao).where(Secao.id == secao_id)
    )
    secao = result.scalar_one_or_none()
    
    if not secao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Seção não encontrada"
        )
    
    return secao


@router.post("/", response_model=SecaoResponse, status_code=status.HTTP_201_CREATED)
async def create_secao(
    data: SecaoCreate,
    db: AsyncSession = Depends(get_db)
):
    """Cria nova seção."""
    # Verificar se departamento existe
    result = await db.execute(
        select(Departamento).where(Departamento.id == data.departamento_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Departamento não encontrado"
        )
    
    # Verificar se código já existe
    result = await db.execute(
        select(Secao).where(Secao.codigo == data.codigo)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Código já cadastrado"
        )
    
    secao = Secao(**data.model_dump())
    db.add(secao)
    await db.commit()
    await db.refresh(secao)
    
    return secao


@router.put("/{secao_id}", response_model=SecaoResponse)
async def update_secao(
    secao_id: UUID,
    data: SecaoUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Atualiza seção."""
    result = await db.execute(
        select(Secao).where(Secao.id == secao_id)
    )
    secao = result.scalar_one_or_none()
    
    if not secao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Seção não encontrada"
        )
    
    # Verificar departamento
    if data.departamento_id:
        result = await db.execute(
            select(Departamento).where(Departamento.id == data.departamento_id)
        )
        if not result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Departamento não encontrado"
            )
    
    # Verificar código duplicado
    if data.codigo and data.codigo != secao.codigo:
        result = await db.execute(
            select(Secao).where(
                Secao.codigo == data.codigo,
                Secao.id != secao_id
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
        setattr(secao, field, value)
    
    await db.commit()
    await db.refresh(secao)
    
    return secao


@router.delete("/{secao_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_secao(
    secao_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Exclui seção."""
    result = await db.execute(
        select(Secao).where(Secao.id == secao_id)
    )
    secao = result.scalar_one_or_none()
    
    if not secao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Seção não encontrada"
        )
    
    await db.delete(secao)
    await db.commit()


@router.post("/importar-totvs", response_model=ImportacaoResultado)
async def importar_secoes_totvs(
    data: ImportacaoTotvs,
    departamento_id: UUID = Query(..., description="Departamento de destino"),
    db: AsyncSession = Depends(get_db)
):
    """
    Importa seções selecionadas do TOTVS.
    Requer um departamento de destino.
    """
    # Verificar departamento
    result = await db.execute(
        select(Departamento).where(Departamento.id == departamento_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Departamento não encontrado"
        )
    
    # Buscar seções do TOTVS
    secoes_totvs = listar_secoes(apenas_ativas=True)
    secoes_map = {s.codigo: s for s in secoes_totvs}
    
    importados = 0
    ignorados = 0
    erros = []
    
    for codigo in data.codigos:
        if codigo not in secoes_map:
            erros.append(f"Código {codigo} não encontrado no TOTVS")
            continue
        
        secao_totvs = secoes_map[codigo]
        
        # Verificar se já existe
        result = await db.execute(
            select(Secao).where(Secao.codigo_totvs == codigo)
        )
        if result.scalar_one_or_none():
            ignorados += 1
            continue
        
        # Criar nova seção
        nova_secao = Secao(
            departamento_id=departamento_id,
            codigo=codigo,
            codigo_totvs=codigo,
            nome=secao_totvs.descricao,
            ativo=True
        )
        db.add(nova_secao)
        importados += 1
    
    await db.commit()
    
    return ImportacaoResultado(
        importados=importados,
        ignorados=ignorados,
        erros=erros
    )

