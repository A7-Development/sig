"""
API de Rateios de Custos.

Gerencia grupos de rateio para distribuir custos de Centros de Custo tipo POOL
para Centros de Custo tipo OPERACIONAL.
"""

from typing import List, Optional
from uuid import UUID
from decimal import Decimal
from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.db.models.orcamento import Cenario, RateioGrupo, RateioDestino, CentroCusto
from app.schemas.orcamento import (
    RateioGrupoCreate, RateioGrupoUpdate, RateioGrupoResponse, RateioGrupoComValidacao,
    RateioDestinoCreate, RateioDestinoResponse
)

router = APIRouter(prefix="/rateios", tags=["Rateios"])


# ============================================
# GRUPOS DE RATEIO
# ============================================

@router.get("/cenario/{cenario_id}", response_model=List[RateioGrupoComValidacao])
async def listar_rateios_cenario(
    cenario_id: UUID,
    apenas_ativos: bool = True,
    db: AsyncSession = Depends(get_db)
):
    """
    Lista todos os grupos de rateio de um cenário.
    Inclui informação de validação (percentuais = 100%).
    """
    # Verificar se cenário existe
    cenario_result = await db.execute(select(Cenario).where(Cenario.id == cenario_id))
    if not cenario_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Cenário não encontrado")
    
    query = select(RateioGrupo).where(
        RateioGrupo.cenario_id == cenario_id
    ).options(
        selectinload(RateioGrupo.cc_origem),
        selectinload(RateioGrupo.destinos).selectinload(RateioDestino.cc_destino)
    )
    
    if apenas_ativos:
        query = query.where(RateioGrupo.ativo == True)
    
    result = await db.execute(query.order_by(RateioGrupo.nome))
    grupos = result.scalars().all()
    
    # Adicionar validação
    response = []
    for grupo in grupos:
        percentual_total = sum(float(d.percentual) for d in grupo.destinos if d.percentual)
        is_valido = abs(percentual_total - 100.0) < 0.01  # Tolerância de 0.01%
        
        mensagem = None
        if not is_valido:
            if percentual_total < 100:
                mensagem = f"Faltam {100 - percentual_total:.2f}% para completar 100%"
            else:
                mensagem = f"Excede em {percentual_total - 100:.2f}% (total: {percentual_total:.2f}%)"
        
        grupo_dict = {
            "id": grupo.id,
            "cenario_id": grupo.cenario_id,
            "cc_origem_pool_id": grupo.cc_origem_pool_id,
            "nome": grupo.nome,
            "descricao": grupo.descricao,
            "ativo": grupo.ativo,
            "created_at": grupo.created_at,
            "updated_at": grupo.updated_at,
            "cc_origem": grupo.cc_origem,
            "destinos": grupo.destinos,
            "percentual_total": percentual_total,
            "is_valido": is_valido,
            "mensagem_validacao": mensagem
        }
        response.append(grupo_dict)
    
    return response


@router.get("/{rateio_id}", response_model=RateioGrupoComValidacao)
async def obter_rateio(
    rateio_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Obtém detalhes de um grupo de rateio."""
    result = await db.execute(
        select(RateioGrupo)
        .where(RateioGrupo.id == rateio_id)
        .options(
            selectinload(RateioGrupo.cc_origem),
            selectinload(RateioGrupo.destinos).selectinload(RateioDestino.cc_destino)
        )
    )
    grupo = result.scalar_one_or_none()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo de rateio não encontrado")
    
    percentual_total = sum(float(d.percentual) for d in grupo.destinos if d.percentual)
    is_valido = abs(percentual_total - 100.0) < 0.01
    
    mensagem = None
    if not is_valido:
        if percentual_total < 100:
            mensagem = f"Faltam {100 - percentual_total:.2f}% para completar 100%"
        else:
            mensagem = f"Excede em {percentual_total - 100:.2f}% (total: {percentual_total:.2f}%)"
    
    return {
        "id": grupo.id,
        "cenario_id": grupo.cenario_id,
        "cc_origem_pool_id": grupo.cc_origem_pool_id,
        "nome": grupo.nome,
        "descricao": grupo.descricao,
        "ativo": grupo.ativo,
        "created_at": grupo.created_at,
        "updated_at": grupo.updated_at,
        "cc_origem": grupo.cc_origem,
        "destinos": grupo.destinos,
        "percentual_total": percentual_total,
        "is_valido": is_valido,
        "mensagem_validacao": mensagem
    }


@router.post("/cenario/{cenario_id}", response_model=RateioGrupoResponse)
async def criar_rateio(
    cenario_id: UUID,
    data: RateioGrupoCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Cria um novo grupo de rateio.
    
    Validações:
    - CC de origem deve ser tipo POOL
    - CCs de destino devem ser tipo OPERACIONAL
    - Percentuais devem somar 100% (warning, não bloqueia criação)
    """
    # Verificar se cenário existe
    cenario_result = await db.execute(select(Cenario).where(Cenario.id == cenario_id))
    if not cenario_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Cenário não encontrado")
    
    # Validar CC de origem (deve ser POOL)
    cc_origem_result = await db.execute(
        select(CentroCusto).where(CentroCusto.id == data.cc_origem_pool_id)
    )
    cc_origem = cc_origem_result.scalar_one_or_none()
    if not cc_origem:
        raise HTTPException(status_code=404, detail="Centro de Custo de origem não encontrado")
    
    if (cc_origem.tipo or "").upper() != "POOL":
        raise HTTPException(
            status_code=400,
            detail=f"Centro de Custo de origem deve ser tipo POOL. '{cc_origem.nome}' é tipo '{cc_origem.tipo}'."
        )
    
    # Criar grupo
    grupo = RateioGrupo(
        cenario_id=cenario_id,
        cc_origem_pool_id=data.cc_origem_pool_id,
        nome=data.nome,
        descricao=data.descricao,
        ativo=data.ativo
    )
    db.add(grupo)
    await db.flush()  # Para obter o ID
    
    # Adicionar destinos
    percentual_total = 0.0
    for destino_data in data.destinos:
        # Validar CC de destino (deve ser OPERACIONAL)
        cc_destino_result = await db.execute(
            select(CentroCusto).where(CentroCusto.id == destino_data.cc_destino_id)
        )
        cc_destino = cc_destino_result.scalar_one_or_none()
        if not cc_destino:
            raise HTTPException(
                status_code=404,
                detail=f"Centro de Custo de destino {destino_data.cc_destino_id} não encontrado"
            )
        
        tipo_destino = (cc_destino.tipo or "").upper()
        if tipo_destino == "POOL":
            raise HTTPException(
                status_code=400,
                detail=f"Centro de Custo de destino deve ser OPERACIONAL. '{cc_destino.nome}' é tipo POOL."
            )
        
        destino = RateioDestino(
            rateio_grupo_id=grupo.id,
            cc_destino_id=destino_data.cc_destino_id,
            percentual=destino_data.percentual
        )
        db.add(destino)
        percentual_total += float(destino_data.percentual)
    
    await db.commit()
    await db.refresh(grupo)
    
    # Carregar relacionamentos
    result = await db.execute(
        select(RateioGrupo)
        .where(RateioGrupo.id == grupo.id)
        .options(
            selectinload(RateioGrupo.cc_origem),
            selectinload(RateioGrupo.destinos).selectinload(RateioDestino.cc_destino)
        )
    )
    grupo = result.scalar_one()
    
    return grupo


@router.patch("/{rateio_id}", response_model=RateioGrupoResponse)
async def atualizar_rateio(
    rateio_id: UUID,
    data: RateioGrupoUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Atualiza informações de um grupo de rateio."""
    result = await db.execute(
        select(RateioGrupo).where(RateioGrupo.id == rateio_id)
    )
    grupo = result.scalar_one_or_none()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo de rateio não encontrado")
    
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(grupo, field, value)
    
    await db.commit()
    await db.refresh(grupo)
    
    # Carregar relacionamentos
    result = await db.execute(
        select(RateioGrupo)
        .where(RateioGrupo.id == grupo.id)
        .options(
            selectinload(RateioGrupo.cc_origem),
            selectinload(RateioGrupo.destinos).selectinload(RateioDestino.cc_destino)
        )
    )
    grupo = result.scalar_one()
    
    return grupo


@router.delete("/{rateio_id}")
async def excluir_rateio(
    rateio_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Exclui um grupo de rateio e todos os seus destinos.
    """
    result = await db.execute(
        select(RateioGrupo).where(RateioGrupo.id == rateio_id)
    )
    grupo = result.scalar_one_or_none()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo de rateio não encontrado")
    
    await db.delete(grupo)
    await db.commit()
    
    return {"message": "Grupo de rateio excluído com sucesso"}


# ============================================
# DESTINOS DE RATEIO
# ============================================

@router.post("/{rateio_id}/destinos", response_model=RateioDestinoResponse)
async def adicionar_destino(
    rateio_id: UUID,
    data: RateioDestinoCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Adiciona um destino a um grupo de rateio.
    
    Validações:
    - CC de destino deve ser tipo OPERACIONAL
    - CC não pode já estar no grupo
    """
    # Verificar grupo
    grupo_result = await db.execute(
        select(RateioGrupo).where(RateioGrupo.id == rateio_id)
    )
    grupo = grupo_result.scalar_one_or_none()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo de rateio não encontrado")
    
    # Validar CC de destino
    cc_result = await db.execute(
        select(CentroCusto).where(CentroCusto.id == data.cc_destino_id)
    )
    cc = cc_result.scalar_one_or_none()
    if not cc:
        raise HTTPException(status_code=404, detail="Centro de Custo não encontrado")
    
    tipo = (cc.tipo or "").upper()
    if tipo == "POOL":
        raise HTTPException(
            status_code=400,
            detail=f"Centro de Custo de destino deve ser OPERACIONAL. '{cc.nome}' é tipo POOL."
        )
    
    # Verificar duplicidade
    existing = await db.execute(
        select(RateioDestino).where(
            RateioDestino.rateio_grupo_id == rateio_id,
            RateioDestino.cc_destino_id == data.cc_destino_id
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Este Centro de Custo já está no grupo de rateio")
    
    destino = RateioDestino(
        rateio_grupo_id=rateio_id,
        cc_destino_id=data.cc_destino_id,
        percentual=data.percentual
    )
    db.add(destino)
    await db.commit()
    await db.refresh(destino)
    
    # Carregar relacionamento
    result = await db.execute(
        select(RateioDestino)
        .where(RateioDestino.id == destino.id)
        .options(selectinload(RateioDestino.cc_destino))
    )
    destino = result.scalar_one()
    
    return destino


@router.patch("/{rateio_id}/destinos/{destino_id}", response_model=RateioDestinoResponse)
async def atualizar_destino(
    rateio_id: UUID,
    destino_id: UUID,
    percentual: float = Query(..., ge=0, le=100, description="Novo percentual"),
    db: AsyncSession = Depends(get_db)
):
    """Atualiza o percentual de um destino."""
    result = await db.execute(
        select(RateioDestino).where(
            RateioDestino.id == destino_id,
            RateioDestino.rateio_grupo_id == rateio_id
        )
    )
    destino = result.scalar_one_or_none()
    if not destino:
        raise HTTPException(status_code=404, detail="Destino não encontrado")
    
    destino.percentual = Decimal(str(percentual))
    await db.commit()
    await db.refresh(destino)
    
    # Carregar relacionamento
    result = await db.execute(
        select(RateioDestino)
        .where(RateioDestino.id == destino.id)
        .options(selectinload(RateioDestino.cc_destino))
    )
    destino = result.scalar_one()
    
    return destino


@router.delete("/{rateio_id}/destinos/{destino_id}")
async def remover_destino(
    rateio_id: UUID,
    destino_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Remove um destino de um grupo de rateio."""
    result = await db.execute(
        select(RateioDestino).where(
            RateioDestino.id == destino_id,
            RateioDestino.rateio_grupo_id == rateio_id
        )
    )
    destino = result.scalar_one_or_none()
    if not destino:
        raise HTTPException(status_code=404, detail="Destino não encontrado")
    
    await db.delete(destino)
    await db.commit()
    
    return {"message": "Destino removido com sucesso"}


# ============================================
# VALIDAÇÃO E UTILIDADES
# ============================================

@router.post("/{rateio_id}/validar")
async def validar_rateio(
    rateio_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Valida um grupo de rateio.
    Retorna se os percentuais somam 100%.
    """
    result = await db.execute(
        select(RateioGrupo)
        .where(RateioGrupo.id == rateio_id)
        .options(selectinload(RateioGrupo.destinos))
    )
    grupo = result.scalar_one_or_none()
    if not grupo:
        raise HTTPException(status_code=404, detail="Grupo de rateio não encontrado")
    
    percentual_total = sum(float(d.percentual) for d in grupo.destinos if d.percentual)
    is_valido = abs(percentual_total - 100.0) < 0.01
    
    return {
        "rateio_id": str(rateio_id),
        "nome": grupo.nome,
        "percentual_total": round(percentual_total, 2),
        "is_valido": is_valido,
        "mensagem": "Rateio válido!" if is_valido else f"Percentual total deve ser 100%, atual: {percentual_total:.2f}%"
    }


@router.get("/cenario/{cenario_id}/pools-disponiveis")
async def listar_pools_disponiveis(
    cenario_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Lista os Centros de Custo tipo POOL disponíveis para criar rateios.
    """
    result = await db.execute(
        select(CentroCusto).where(
            CentroCusto.ativo == True,
            CentroCusto.tipo == "POOL"
        ).order_by(CentroCusto.nome)
    )
    pools = result.scalars().all()
    
    return [
        {
            "id": str(cc.id),
            "codigo": cc.codigo,
            "nome": cc.nome,
            "tipo": cc.tipo
        }
        for cc in pools
    ]


@router.get("/cenario/{cenario_id}/operacionais-disponiveis")
async def listar_operacionais_disponiveis(
    cenario_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Lista os Centros de Custo tipo OPERACIONAL disponíveis como destino de rateios.
    """
    result = await db.execute(
        select(CentroCusto).where(
            CentroCusto.ativo == True,
            CentroCusto.tipo.in_(["OPERACIONAL", "ADMINISTRATIVO", "OVERHEAD"])
        ).order_by(CentroCusto.nome)
    )
    operacionais = result.scalars().all()
    
    return [
        {
            "id": str(cc.id),
            "codigo": cc.codigo,
            "nome": cc.nome,
            "tipo": cc.tipo
        }
        for cc in operacionais
    ]

