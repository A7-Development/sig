"""
Serviço de cálculo de custos de tecnologia.
"""

from typing import Optional, Dict, Any
from decimal import Decimal
from uuid import UUID
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, and_

from app.db.models.orcamento import (
    AlocacaoTecnologia,
    CustoTecnologia,
    ProdutoTecnologia,
    CenarioSecao,
    PremissaFuncaoMes,
    Cenario
)


async def calcular_e_salvar_custos_tecnologia(
    db: AsyncSession,
    cenario_id: UUID,
    cenario_secao_id: Optional[UUID] = None,
    ano: Optional[int] = None
) -> Dict[str, Any]:
    """
    Calcula os custos de tecnologia de um cenário.
    
    Args:
        db: Sessão do banco de dados
        cenario_id: ID do cenário
        cenario_secao_id: ID da seção (opcional - se não informado, calcula para todas)
        ano: Ano para cálculo (opcional - se não informado, usa ano do cenário)
    
    Returns:
        Dicionário com estatísticas do cálculo
    """
    # Buscar cenário
    cenario = await db.get(Cenario, cenario_id)
    if not cenario:
        raise ValueError("Cenário não encontrado")
    
    # Determinar ano de cálculo
    if not ano:
        ano = cenario.ano_base
    
    # Remover custos anteriores
    delete_query = delete(CustoTecnologia).where(
        and_(
            CustoTecnologia.cenario_id == cenario_id,
            CustoTecnologia.ano == ano
        )
    )
    
    if cenario_secao_id:
        delete_query = delete_query.where(CustoTecnologia.cenario_secao_id == cenario_secao_id)
    
    await db.execute(delete_query)
    await db.commit()
    
    # Buscar alocações
    alocacoes_query = select(AlocacaoTecnologia).where(
        and_(
            AlocacaoTecnologia.cenario_id == cenario_id,
            AlocacaoTecnologia.ativo == True
        )
    )
    
    if cenario_secao_id:
        alocacoes_query = alocacoes_query.where(AlocacaoTecnologia.cenario_secao_id == cenario_secao_id)
    
    result = await db.execute(alocacoes_query)
    alocacoes = result.scalars().all()
    
    custos_criados = 0
    valor_total = Decimal('0.00')
    
    # Processar cada alocação
    for alocacao in alocacoes:
        # Determinar valor unitário
        if alocacao.valor_override:
            valor_unitario = Decimal(str(alocacao.valor_override))
        elif alocacao.produto and alocacao.produto.valor_unitario:
            valor_unitario = Decimal(str(alocacao.produto.valor_unitario))
        else:
            valor_unitario = Decimal('0.00')
        
        # Mapear meses para atributos
        meses_map = {
            1: 'qtd_jan', 2: 'qtd_fev', 3: 'qtd_mar', 4: 'qtd_abr',
            5: 'qtd_mai', 6: 'qtd_jun', 7: 'qtd_jul', 8: 'qtd_ago',
            9: 'qtd_set', 10: 'qtd_out', 11: 'qtd_nov', 12: 'qtd_dez'
        }
        
        # Calcular custos mês a mês
        for mes in range(1, 13):
            # Obter quantidade base do mês
            qtd_attr = meses_map[mes]
            qtd_base = Decimal(str(getattr(alocacao, qtd_attr, 0) or 0))
            
            # Para alocações dinâmicas (POR_PA, POR_HC), ajustar quantidade
            if alocacao.tipo_alocacao == "POR_PA":
                # Buscar total de PAs da seção no mês
                pa_total = await _obter_total_pas_secao(db, cenario_id, alocacao.cenario_secao_id, ano, mes)
                qtd_base = Decimal(str(pa_total)) * Decimal(str(alocacao.fator_multiplicador or 1.0))
            
            elif alocacao.tipo_alocacao == "POR_HC":
                # Buscar total de HCs da seção no mês
                hc_total = await _obter_total_hcs_secao(db, cenario_id, alocacao.cenario_secao_id, ano, mes)
                qtd_base = Decimal(str(hc_total)) * Decimal(str(alocacao.fator_multiplicador or 1.0))
            
            elif alocacao.tipo_alocacao == "POR_CAPACIDADE":
                # Buscar capacidade da seção no mês
                capacidade = await _obter_capacidade_secao(db, cenario_id, alocacao.cenario_secao_id, ano, mes)
                qtd_base = Decimal(str(capacidade)) * Decimal(str(alocacao.fator_multiplicador or 1.0))
            
            # Calcular valor do mês
            valor_calculado = qtd_base * valor_unitario
            
            # Se houver valor, criar registro de custo
            if valor_calculado > 0:
                parametros_calculo = {
                    "tipo_alocacao": alocacao.tipo_alocacao,
                    "qtd_base": float(qtd_base),
                    "valor_unitario": float(valor_unitario),
                    "fator_multiplicador": float(alocacao.fator_multiplicador or 1.0)
                }
                
                custo = CustoTecnologia(
                    cenario_id=cenario_id,
                    cenario_secao_id=alocacao.cenario_secao_id,
                    alocacao_tecnologia_id=alocacao.id,
                    produto_id=alocacao.produto_id,
                    conta_contabil_id=alocacao.produto.conta_contabil_id if alocacao.produto else None,
                    mes=mes,
                    ano=ano,
                    quantidade_base=qtd_base,
                    valor_unitario=valor_unitario,
                    valor_calculado=valor_calculado,
                    tipo_calculo=alocacao.tipo_alocacao,
                    parametros_calculo=parametros_calculo
                )
                
                db.add(custo)
                custos_criados += 1
                valor_total += valor_calculado
    
    await db.commit()
    
    return {
        "cenario_id": str(cenario_id),
        "ano": ano,
        "alocacoes_processadas": len(alocacoes),
        "custos_criados": custos_criados,
        "valor_total": float(valor_total)
    }


async def _obter_total_pas_secao(
    db: AsyncSession,
    cenario_id: UUID,
    cenario_secao_id: UUID,
    ano: int,
    mes: int
) -> Decimal:
    """Obtém o total de PAs (Posições de Atendimento) de uma seção em um mês."""
    # Buscar premissas da seção no mês
    query = select(func.sum(PremissaFuncaoMes.qtd_pas)).where(
        and_(
            PremissaFuncaoMes.cenario_id == cenario_id,
            PremissaFuncaoMes.cenario_secao_id == cenario_secao_id,
            PremissaFuncaoMes.ano == ano,
            PremissaFuncaoMes.mes == mes
        )
    )
    
    result = await db.execute(query)
    total = result.scalar_one_or_none()
    
    return Decimal(str(total or 0))


async def _obter_total_hcs_secao(
    db: AsyncSession,
    cenario_id: UUID,
    cenario_secao_id: UUID,
    ano: int,
    mes: int
) -> Decimal:
    """Obtém o total de HCs (Head Count) de uma seção em um mês."""
    # Buscar premissas da seção no mês
    query = select(func.sum(PremissaFuncaoMes.headcount_necessario)).where(
        and_(
            PremissaFuncaoMes.cenario_id == cenario_id,
            PremissaFuncaoMes.cenario_secao_id == cenario_secao_id,
            PremissaFuncaoMes.ano == ano,
            PremissaFuncaoMes.mes == mes
        )
    )
    
    result = await db.execute(query)
    total = result.scalar_one_or_none()
    
    return Decimal(str(total or 0))


async def _obter_capacidade_secao(
    db: AsyncSession,
    cenario_id: UUID,
    cenario_secao_id: UUID,
    ano: int,
    mes: int
) -> Decimal:
    """Obtém a capacidade total da seção em um mês."""
    # Buscar premissas da seção no mês
    query = select(func.sum(PremissaFuncaoMes.capacidade_produtiva)).where(
        and_(
            PremissaFuncaoMes.cenario_id == cenario_id,
            PremissaFuncaoMes.cenario_secao_id == cenario_secao_id,
            PremissaFuncaoMes.ano == ano,
            PremissaFuncaoMes.mes == mes
        )
    )
    
    result = await db.execute(query)
    total = result.scalar_one_or_none()
    
    return Decimal(str(total or 0))

