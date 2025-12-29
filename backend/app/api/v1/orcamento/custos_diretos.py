"""
API endpoints para gerenciamento de Custos Diretos.
Custos alocados diretamente em Centros de Custo, com suporte a:
- Valores Fixos, Variáveis ou Fixo+Variável
- Rateio entre múltiplos CCs
- Cálculo baseado em HC, PA ou quantidade fixa
"""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.db.models.orcamento import CustoDireto, Cenario, CenarioSecao, CentroCusto, ProdutoTecnologia, Funcao
from app.schemas.orcamento import (
    CustoDiretoCreate,
    CustoDiretoUpdate,
    CustoDiretoResponse,
)
from app.api.deps import get_current_user

router = APIRouter(prefix="/custos-diretos", tags=["Custos Diretos"])


# IMPORTANTE: Rotas com paths específicos devem vir ANTES de rotas com parâmetros dinâmicos

@router.get("/funcoes-disponiveis/{cenario_id}")
async def listar_funcoes_disponiveis(
    cenario_id: UUID,
    centro_custo_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    Lista funções disponíveis para usar como base de cálculo variável.
    Se centro_custo_id for informado, retorna apenas funções alocadas naquele CC.
    """
    try:
        # Query base de funções
        query = select(Funcao).where(Funcao.ativo == True).order_by(Funcao.nome)
        result = await db.execute(query)
        funcoes = result.scalars().all()
        
        # Retornar lista formatada
        return [
            {
                "id": str(f.id),
                "codigo": f.codigo or "",
                "nome": f.nome or "",
                "cbo": f.cbo or "",
            }
            for f in funcoes
        ]
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("", response_model=List[CustoDiretoResponse])
async def listar_custos_diretos(
    cenario_id: UUID,
    cenario_secao_id: Optional[UUID] = None,
    centro_custo_id: Optional[UUID] = None,
    apenas_ativos: bool = True,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Lista custos diretos de um cenário, com filtros opcionais."""
    query = select(CustoDireto).options(
        selectinload(CustoDireto.item_custo),
        selectinload(CustoDireto.centro_custo),
        selectinload(CustoDireto.funcao_base),
    ).where(CustoDireto.cenario_id == cenario_id)
    
    if cenario_secao_id:
        query = query.where(CustoDireto.cenario_secao_id == cenario_secao_id)
    
    if centro_custo_id:
        query = query.where(CustoDireto.centro_custo_id == centro_custo_id)
    
    if apenas_ativos:
        query = query.where(CustoDireto.ativo == True)
    
    query = query.order_by(CustoDireto.created_at.desc())
    
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{custo_id}", response_model=CustoDiretoResponse)
async def obter_custo_direto(
    custo_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Obtém um custo direto pelo ID."""
    query = select(CustoDireto).options(
        selectinload(CustoDireto.item_custo),
        selectinload(CustoDireto.centro_custo),
        selectinload(CustoDireto.funcao_base),
    ).where(CustoDireto.id == custo_id)
    
    result = await db.execute(query)
    custo = result.scalar_one_or_none()
    
    if not custo:
        raise HTTPException(status_code=404, detail="Custo direto não encontrado")
    
    return custo


@router.post("", response_model=CustoDiretoResponse)
async def criar_custo_direto(
    data: CustoDiretoCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Cria um novo custo direto."""
    # Validar cenário
    cenario = await db.get(Cenario, data.cenario_id)
    if not cenario:
        raise HTTPException(status_code=404, detail="Cenário não encontrado")
    
    # Validar seção
    secao = await db.get(CenarioSecao, data.cenario_secao_id)
    if not secao:
        raise HTTPException(status_code=404, detail="Seção do cenário não encontrada")
    
    # Validar centro de custo
    cc = await db.get(CentroCusto, data.centro_custo_id)
    if not cc:
        raise HTTPException(status_code=404, detail="Centro de custo não encontrado")
    
    # Validar item de custo
    item = await db.get(ProdutoTecnologia, data.item_custo_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item de custo não encontrado")
    
    # Validar função base se informada
    if data.funcao_base_id:
        funcao = await db.get(Funcao, data.funcao_base_id)
        if not funcao:
            raise HTTPException(status_code=404, detail="Função base não encontrada")
    
    # Validar tipo de valor
    if data.tipo_valor == "FIXO" and data.valor_fixo is None:
        raise HTTPException(status_code=400, detail="Valor fixo é obrigatório para tipo FIXO")
    
    if data.tipo_valor == "VARIAVEL" and (data.valor_unitario_variavel is None or data.unidade_medida is None):
        raise HTTPException(status_code=400, detail="Valor unitário e unidade de medida são obrigatórios para tipo VARIAVEL")
    
    if data.tipo_valor == "FIXO_VARIAVEL":
        if data.valor_fixo is None:
            raise HTTPException(status_code=400, detail="Valor fixo é obrigatório para tipo FIXO_VARIAVEL")
        if data.valor_unitario_variavel is None or data.unidade_medida is None:
            raise HTTPException(status_code=400, detail="Valor unitário e unidade de medida são obrigatórios para tipo FIXO_VARIAVEL")
    
    custo = CustoDireto(**data.model_dump())
    db.add(custo)
    await db.commit()
    await db.refresh(custo)
    
    # Recarregar com relacionamentos
    query = select(CustoDireto).options(
        selectinload(CustoDireto.item_custo),
        selectinload(CustoDireto.centro_custo),
        selectinload(CustoDireto.funcao_base),
    ).where(CustoDireto.id == custo.id)
    
    result = await db.execute(query)
    return result.scalar_one()


@router.put("/{custo_id}", response_model=CustoDiretoResponse)
async def atualizar_custo_direto(
    custo_id: UUID,
    data: CustoDiretoUpdate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Atualiza um custo direto."""
    custo = await db.get(CustoDireto, custo_id)
    if not custo:
        raise HTTPException(status_code=404, detail="Custo direto não encontrado")
    
    update_data = data.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(custo, field, value)
    
    await db.commit()
    await db.refresh(custo)
    
    # Recarregar com relacionamentos
    query = select(CustoDireto).options(
        selectinload(CustoDireto.item_custo),
        selectinload(CustoDireto.centro_custo),
        selectinload(CustoDireto.funcao_base),
    ).where(CustoDireto.id == custo.id)
    
    result = await db.execute(query)
    return result.scalar_one()


@router.delete("/{custo_id}")
async def excluir_custo_direto(
    custo_id: UUID,
    hard_delete: bool = Query(False, description="Se True, exclui permanentemente"),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """Exclui um custo direto (soft ou hard delete)."""
    custo = await db.get(CustoDireto, custo_id)
    if not custo:
        raise HTTPException(status_code=404, detail="Custo direto não encontrado")
    
    if hard_delete:
        await db.delete(custo)
    else:
        custo.ativo = False
    
    await db.commit()
    
    return {"detail": "Custo direto excluído com sucesso"}



