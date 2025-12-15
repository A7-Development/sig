"""
APIs CRUD para Funções/Cargos.
"""

from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.db.models.orcamento import Funcao
from app.schemas.orcamento import (
    FuncaoCreate,
    FuncaoUpdate,
    FuncaoResponse,
    ImportacaoTotvs,
    ImportacaoResultado,
)
from app.services.corporerm import listar_funcoes as listar_funcoes_totvs, buscar_funcao_por_codigo

router = APIRouter(prefix="/funcoes", tags=["Funções"])


@router.get("/", response_model=List[FuncaoResponse])
async def list_funcoes(
    skip: int = 0,
    limit: int = 100,
    ativo: Optional[bool] = None,
    busca: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Lista todas as funções cadastradas."""
    query = select(Funcao)
    
    if ativo is not None:
        query = query.where(Funcao.ativo == ativo)
    
    if busca:
        busca_like = f"%{busca}%"
        query = query.where(
            (Funcao.codigo.ilike(busca_like)) |
            (Funcao.nome.ilike(busca_like)) |
            (Funcao.cbo.ilike(busca_like))
        )
    
    query = query.order_by(Funcao.nome).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{funcao_id}", response_model=FuncaoResponse)
async def get_funcao(
    funcao_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Busca uma função pelo ID."""
    result = await db.execute(
        select(Funcao).where(Funcao.id == funcao_id)
    )
    funcao = result.scalar_one_or_none()
    
    if not funcao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Função não encontrada"
        )
    
    return funcao


@router.post("/", response_model=FuncaoResponse, status_code=status.HTTP_201_CREATED)
async def create_funcao(
    data: FuncaoCreate,
    db: AsyncSession = Depends(get_db)
):
    """Cria uma nova função."""
    # Verificar se código já existe
    result = await db.execute(
        select(Funcao).where(Funcao.codigo == data.codigo)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Já existe uma função com o código '{data.codigo}'"
        )
    
    funcao = Funcao(**data.model_dump())
    db.add(funcao)
    await db.commit()
    await db.refresh(funcao)
    
    return funcao


@router.put("/{funcao_id}", response_model=FuncaoResponse)
async def update_funcao(
    funcao_id: UUID,
    data: FuncaoUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Atualiza uma função existente."""
    result = await db.execute(
        select(Funcao).where(Funcao.id == funcao_id)
    )
    funcao = result.scalar_one_or_none()
    
    if not funcao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Função não encontrada"
        )
    
    # Verificar código duplicado
    update_data = data.model_dump(exclude_unset=True)
    if "codigo" in update_data and update_data["codigo"] != funcao.codigo:
        result = await db.execute(
            select(Funcao).where(
                Funcao.codigo == update_data["codigo"],
                Funcao.id != funcao_id
            )
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Já existe uma função com o código '{update_data['codigo']}'"
            )
    
    # Atualizar campos
    for field, value in update_data.items():
        setattr(funcao, field, value)
    
    await db.commit()
    await db.refresh(funcao)
    
    return funcao


@router.delete("/{funcao_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_funcao(
    funcao_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Exclui uma função."""
    result = await db.execute(
        select(Funcao).where(Funcao.id == funcao_id)
    )
    funcao = result.scalar_one_or_none()
    
    if not funcao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Função não encontrada"
        )
    
    await db.delete(funcao)
    await db.commit()


@router.post("/importar-totvs", response_model=ImportacaoResultado)
async def importar_funcoes_totvs(
    data: ImportacaoTotvs,
    db: AsyncSession = Depends(get_db)
):
    """
    Importa funções selecionadas do TOTVS.
    Cria novas funções com base nos dados do CORPORERM.
    """
    importados = 0
    ignorados = 0
    erros = []
    
    for codigo in data.codigos:
        try:
            # Verificar se já existe
            result = await db.execute(
                select(Funcao).where(
                    (Funcao.codigo == codigo) | (Funcao.codigo_totvs == codigo)
                )
            )
            if result.scalar_one_or_none():
                ignorados += 1
                continue
            
            # Buscar dados do TOTVS
            funcao_totvs = buscar_funcao_por_codigo(codigo)
            if not funcao_totvs:
                erros.append(f"Função {codigo} não encontrada no TOTVS")
                continue
            
            # Criar nova função
            nova_funcao = Funcao(
                codigo=funcao_totvs.codigo,
                codigo_totvs=funcao_totvs.codigo,
                nome=funcao_totvs.nome,
                cbo=funcao_totvs.cbo,
                ativo=True
            )
            db.add(nova_funcao)
            importados += 1
            
        except Exception as e:
            erros.append(f"Erro ao importar {codigo}: {str(e)}")
    
    await db.commit()
    
    return ImportacaoResultado(
        importados=importados,
        ignorados=ignorados,
        erros=erros
    )
