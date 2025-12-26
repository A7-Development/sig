"""
API para gerenciamento de Alocações de Tecnologia em Cenários.
"""

from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.db.session import get_db
from app.db.models.orcamento import AlocacaoTecnologia, Cenario, CenarioSecao, ProdutoTecnologia
from app.schemas.orcamento import (
    AlocacaoTecnologiaResponse,
    AlocacaoTecnologiaCreate,
    AlocacaoTecnologiaUpdate
)

router = APIRouter(prefix="/alocacoes", tags=["Alocações de Tecnologia"])


@router.get("", response_model=List[AlocacaoTecnologiaResponse])
async def listar_alocacoes(
    cenario_id: UUID = Query(..., description="ID do cenário"),
    cenario_secao_id: UUID = Query(None, description="ID da seção (opcional)"),
    ativo: bool = Query(None, description="Filtrar por status ativo"),
    db: AsyncSession = Depends(get_db)
):
    """Lista todas as alocações de tecnologia de um cenário."""
    filters = [AlocacaoTecnologia.cenario_id == cenario_id]
    
    if cenario_secao_id:
        filters.append(AlocacaoTecnologia.cenario_secao_id == cenario_secao_id)
    
    if ativo is not None:
        filters.append(AlocacaoTecnologia.ativo == ativo)
    
    query = select(AlocacaoTecnologia).where(and_(*filters)).order_by(AlocacaoTecnologia.created_at)
    result = await db.execute(query)
    alocacoes = result.scalars().all()
    
    return alocacoes


@router.get("/{alocacao_id}", response_model=AlocacaoTecnologiaResponse)
async def obter_alocacao(
    alocacao_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Retorna uma alocação específica."""
    query = select(AlocacaoTecnologia).where(AlocacaoTecnologia.id == alocacao_id)
    result = await db.execute(query)
    alocacao = result.scalar_one_or_none()
    
    if not alocacao:
        raise HTTPException(status_code=404, detail="Alocação não encontrada")
    
    return alocacao


@router.post("", response_model=AlocacaoTecnologiaResponse, status_code=201)
async def criar_alocacao(
    alocacao: AlocacaoTecnologiaCreate,
    db: AsyncSession = Depends(get_db)
):
    """Cria uma nova alocação de tecnologia."""
    # Validar cenário
    cenario_query = select(Cenario).where(Cenario.id == alocacao.cenario_id)
    cenario_result = await db.execute(cenario_query)
    if not cenario_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Cenário não encontrado")
    
    # Validar seção
    secao_query = select(CenarioSecao).where(CenarioSecao.id == alocacao.cenario_secao_id)
    secao_result = await db.execute(secao_query)
    if not secao_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Seção do cenário não encontrada")
    
    # Validar produto
    produto_query = select(ProdutoTecnologia).where(ProdutoTecnologia.id == alocacao.produto_id)
    produto_result = await db.execute(produto_query)
    if not produto_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Produto de tecnologia não encontrado")
    
    # Verificar se já existe alocação para o mesmo produto na mesma seção
    check_query = select(AlocacaoTecnologia).where(
        and_(
            AlocacaoTecnologia.cenario_id == alocacao.cenario_id,
            AlocacaoTecnologia.cenario_secao_id == alocacao.cenario_secao_id,
            AlocacaoTecnologia.produto_id == alocacao.produto_id,
            AlocacaoTecnologia.ativo == True
        )
    )
    check_result = await db.execute(check_query)
    if check_result.scalar_one_or_none():
        raise HTTPException(
            status_code=400, 
            detail="Já existe uma alocação ativa para este produto nesta seção"
        )
    
    # Criar alocação
    nova_alocacao = AlocacaoTecnologia(**alocacao.model_dump())
    db.add(nova_alocacao)
    await db.commit()
    await db.refresh(nova_alocacao)
    
    return nova_alocacao


@router.put("/{alocacao_id}", response_model=AlocacaoTecnologiaResponse)
async def atualizar_alocacao(
    alocacao_id: UUID,
    alocacao_update: AlocacaoTecnologiaUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Atualiza uma alocação existente."""
    query = select(AlocacaoTecnologia).where(AlocacaoTecnologia.id == alocacao_id)
    result = await db.execute(query)
    alocacao = result.scalar_one_or_none()
    
    if not alocacao:
        raise HTTPException(status_code=404, detail="Alocação não encontrada")
    
    # Atualizar campos
    update_data = alocacao_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(alocacao, field, value)
    
    await db.commit()
    await db.refresh(alocacao)
    
    return alocacao


@router.delete("/{alocacao_id}", status_code=204)
async def excluir_alocacao(
    alocacao_id: UUID,
    soft_delete: bool = Query(True, description="Se True, apenas desativa. Se False, exclui do banco."),
    db: AsyncSession = Depends(get_db)
):
    """Exclui (ou desativa) uma alocação."""
    query = select(AlocacaoTecnologia).where(AlocacaoTecnologia.id == alocacao_id)
    result = await db.execute(query)
    alocacao = result.scalar_one_or_none()
    
    if not alocacao:
        raise HTTPException(status_code=404, detail="Alocação não encontrada")
    
    if soft_delete:
        alocacao.ativo = False
        await db.commit()
    else:
        await db.delete(alocacao)
        await db.commit()
    
    return None

