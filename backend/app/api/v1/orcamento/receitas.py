"""
API de Receitas do Cenário.
Gerencia receitas alocadas em centros de custo com premissas mensais.
"""

from typing import List, Optional
from uuid import UUID
from datetime import date
import calendar

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.db.models.orcamento import (
    ReceitaCenario, ReceitaPremissaMes, TipoReceita,
    Cenario, CentroCusto, Funcao, QuadroPessoal, Feriado
)
from app.schemas.orcamento import (
    ReceitaCenarioCreate,
    ReceitaCenarioUpdate,
    ReceitaCenarioResponse,
    ReceitaPremissaMesCreate,
    ReceitaPremissaMesResponse,
    ReceitaPremissasBulkUpdate,
    ReceitaCalculadaResponse,
)

router = APIRouter(prefix="/receitas", tags=["Receitas do Cenário"])


# ============================================
# CRUD de Receitas do Cenário
# ============================================

@router.get("/cenarios/{cenario_id}", response_model=List[ReceitaCenarioResponse])
async def listar_receitas_cenario(
    cenario_id: UUID,
    centro_custo_id: Optional[UUID] = Query(None, description="Filtrar por Centro de Custo"),
    tipo_calculo: Optional[str] = Query(None, description="Filtrar por tipo de cálculo"),
    db: AsyncSession = Depends(get_db)
):
    """Lista todas as receitas de um cenário."""
    query = select(ReceitaCenario).where(
        ReceitaCenario.cenario_id == cenario_id,
        ReceitaCenario.ativo == True
    ).options(
        selectinload(ReceitaCenario.tipo_receita),
        selectinload(ReceitaCenario.centro_custo),
        selectinload(ReceitaCenario.funcao_pa),
        selectinload(ReceitaCenario.premissas)
    )
    
    if centro_custo_id:
        query = query.where(ReceitaCenario.centro_custo_id == centro_custo_id)
    if tipo_calculo:
        query = query.where(ReceitaCenario.tipo_calculo == tipo_calculo)
    
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{receita_id}", response_model=ReceitaCenarioResponse)
async def obter_receita(
    receita_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Obtém uma receita por ID."""
    result = await db.execute(
        select(ReceitaCenario)
        .where(ReceitaCenario.id == receita_id)
        .options(
            selectinload(ReceitaCenario.tipo_receita),
            selectinload(ReceitaCenario.centro_custo),
            selectinload(ReceitaCenario.funcao_pa),
            selectinload(ReceitaCenario.premissas)
        )
    )
    receita = result.scalar_one_or_none()
    
    if not receita:
        raise HTTPException(status_code=404, detail="Receita não encontrada")
    
    return receita


@router.post("/cenarios/{cenario_id}", response_model=ReceitaCenarioResponse, status_code=201)
async def criar_receita(
    cenario_id: UUID,
    data: ReceitaCenarioCreate,
    db: AsyncSession = Depends(get_db)
):
    """Cria uma nova receita no cenário."""
    # Verificar se cenário existe
    cenario = await db.execute(
        select(Cenario).where(Cenario.id == cenario_id)
    )
    if not cenario.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Cenário não encontrado")
    
    # Validar tipo de cálculo e campos obrigatórios
    tipo_calculo = data.tipo_calculo
    if tipo_calculo in ("FIXA_PA", "VARIAVEL") and not data.funcao_pa_id:
        raise HTTPException(
            status_code=400,
            detail="Função PA é obrigatória para receitas do tipo FIXA_PA e VARIAVEL"
        )
    
    # Extrair premissas antes de criar a receita
    premissas_data = data.premissas or []
    receita_data = data.model_dump(exclude={'cenario_id', 'premissas'})
    receita_data['cenario_id'] = cenario_id
    
    receita = ReceitaCenario(**receita_data)
    db.add(receita)
    await db.flush()  # Para obter o ID
    
    # Criar premissas se fornecidas
    for premissa_data in premissas_data:
        premissa = ReceitaPremissaMes(
            receita_cenario_id=receita.id,
            **premissa_data.model_dump(exclude={'receita_cenario_id'})
        )
        db.add(premissa)
    
    await db.commit()
    await db.refresh(receita)
    
    # Recarregar com relacionamentos
    result = await db.execute(
        select(ReceitaCenario)
        .where(ReceitaCenario.id == receita.id)
        .options(
            selectinload(ReceitaCenario.tipo_receita),
            selectinload(ReceitaCenario.centro_custo),
            selectinload(ReceitaCenario.funcao_pa),
            selectinload(ReceitaCenario.premissas)
        )
    )
    return result.scalar_one()


@router.put("/{receita_id}", response_model=ReceitaCenarioResponse)
async def atualizar_receita(
    receita_id: UUID,
    data: ReceitaCenarioUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Atualiza uma receita existente."""
    result = await db.execute(
        select(ReceitaCenario).where(ReceitaCenario.id == receita_id)
    )
    receita = result.scalar_one_or_none()
    
    if not receita:
        raise HTTPException(status_code=404, detail="Receita não encontrada")
    
    # Atualizar campos
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(receita, field, value)
    
    await db.commit()
    await db.refresh(receita)
    
    # Recarregar com relacionamentos
    result = await db.execute(
        select(ReceitaCenario)
        .where(ReceitaCenario.id == receita.id)
        .options(
            selectinload(ReceitaCenario.tipo_receita),
            selectinload(ReceitaCenario.centro_custo),
            selectinload(ReceitaCenario.funcao_pa),
            selectinload(ReceitaCenario.premissas)
        )
    )
    return result.scalar_one()


@router.delete("/{receita_id}", status_code=204)
async def excluir_receita(
    receita_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Exclui uma receita (soft delete)."""
    result = await db.execute(
        select(ReceitaCenario).where(ReceitaCenario.id == receita_id)
    )
    receita = result.scalar_one_or_none()
    
    if not receita:
        raise HTTPException(status_code=404, detail="Receita não encontrada")
    
    # Soft delete
    receita.ativo = False
    await db.commit()


# ============================================
# Premissas Mensais
# ============================================

@router.get("/{receita_id}/premissas", response_model=List[ReceitaPremissaMesResponse])
async def listar_premissas_receita(
    receita_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Lista as premissas mensais de uma receita."""
    result = await db.execute(
        select(ReceitaPremissaMes)
        .where(ReceitaPremissaMes.receita_cenario_id == receita_id)
        .order_by(ReceitaPremissaMes.ano, ReceitaPremissaMes.mes)
    )
    return result.scalars().all()


@router.put("/{receita_id}/premissas", response_model=List[ReceitaPremissaMesResponse])
async def atualizar_premissas_bulk(
    receita_id: UUID,
    data: ReceitaPremissasBulkUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Atualiza premissas em lote (upsert por mês/ano)."""
    # Verificar se receita existe
    result = await db.execute(
        select(ReceitaCenario).where(ReceitaCenario.id == receita_id)
    )
    receita = result.scalar_one_or_none()
    if not receita:
        raise HTTPException(status_code=404, detail="Receita não encontrada")
    
    # Processar cada premissa
    for premissa_data in data.premissas:
        # Verificar se já existe
        result = await db.execute(
            select(ReceitaPremissaMes).where(
                ReceitaPremissaMes.receita_cenario_id == receita_id,
                ReceitaPremissaMes.mes == premissa_data.mes,
                ReceitaPremissaMes.ano == premissa_data.ano
            )
        )
        existing = result.scalar_one_or_none()
        
        if existing:
            # Atualizar
            existing.vopdu = premissa_data.vopdu
            existing.indice_conversao = premissa_data.indice_conversao
            existing.ticket_medio = premissa_data.ticket_medio
            existing.fator = premissa_data.fator
            existing.indice_estorno = premissa_data.indice_estorno
        else:
            # Criar nova
            premissa = ReceitaPremissaMes(
                receita_cenario_id=receita_id,
                **premissa_data.model_dump(exclude={'receita_cenario_id'})
            )
            db.add(premissa)
    
    await db.commit()
    
    # Retornar todas as premissas atualizadas
    result = await db.execute(
        select(ReceitaPremissaMes)
        .where(ReceitaPremissaMes.receita_cenario_id == receita_id)
        .order_by(ReceitaPremissaMes.ano, ReceitaPremissaMes.mes)
    )
    return result.scalars().all()


# ============================================
# Cálculo de Receitas
# ============================================

@router.get("/{receita_id}/calcular", response_model=List[ReceitaCalculadaResponse])
async def calcular_receita(
    receita_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Calcula a receita por mês com base nas premissas e tipo de cálculo."""
    # Buscar receita com relacionamentos
    result = await db.execute(
        select(ReceitaCenario)
        .where(ReceitaCenario.id == receita_id)
        .options(
            selectinload(ReceitaCenario.cenario),
            selectinload(ReceitaCenario.centro_custo),
            selectinload(ReceitaCenario.premissas)
        )
    )
    receita = result.scalar_one_or_none()
    
    if not receita:
        raise HTTPException(status_code=404, detail="Receita não encontrada")
    
    cenario = receita.cenario
    resultados = []
    
    # Gerar lista de meses do cenário
    meses = []
    ano = cenario.ano_inicio
    mes = cenario.mes_inicio
    while (ano, mes) <= (cenario.ano_fim, cenario.mes_fim):
        meses.append((ano, mes))
        mes += 1
        if mes > 12:
            mes = 1
            ano += 1
    
    # Calcular para cada mês
    for ano, mes in meses:
        resultado = await _calcular_receita_mes(receita, ano, mes, db)
        resultados.append(resultado)
    
    return resultados


async def _calcular_receita_mes(
    receita: ReceitaCenario,
    ano: int,
    mes: int,
    db: AsyncSession
) -> ReceitaCalculadaResponse:
    """Calcula a receita para um mês específico."""
    valor_calculado = 0.0
    valor_bruto = None
    hc_pa = None
    qtd_pa = None
    dias_uteis = None
    memoria = {}
    
    tipo = receita.tipo_calculo
    
    if tipo == "FIXA_CC":
        # Valor fixo por centro de custo
        valor_calculado = float(receita.valor_fixo or 0)
        memoria = {"tipo": "FIXA_CC", "valor_fixo": valor_calculado}
    
    elif tipo == "FIXA_HC":
        # Valor fixo x HC total do CC
        hc_total = await _get_hc_cc(receita.cenario_id, receita.centro_custo_id, ano, mes, db)
        valor_calculado = float(receita.valor_fixo or 0) * hc_total
        memoria = {"tipo": "FIXA_HC", "valor_fixo": float(receita.valor_fixo or 0), "hc_total": hc_total}
    
    elif tipo == "FIXA_PA":
        # Valor fixo x Qtd PA da função
        qtd_pa = await _get_pa_funcao(receita.cenario_id, receita.centro_custo_id, receita.funcao_pa_id, ano, mes, db)
        valor_calculado = float(receita.valor_fixo or 0) * qtd_pa
        memoria = {"tipo": "FIXA_PA", "valor_fixo": float(receita.valor_fixo or 0), "qtd_pa": qtd_pa}
    
    elif tipo == "VARIAVEL":
        # Fórmula completa: HC_PA × VOPDU × Índice × Ticket × Fator × Dias × (1-Estorno)
        # Buscar premissa do mês
        premissa = next((p for p in receita.premissas if p.mes == mes and p.ano == ano), None)
        
        if premissa:
            # Buscar HC do PA (função)
            hc_pa = await _get_hc_funcao(receita.cenario_id, receita.centro_custo_id, receita.funcao_pa_id, ano, mes, db)
            
            # Calcular dias úteis
            dias_uteis = await _calcular_dias_uteis(ano, mes, receita.centro_custo.uf if receita.centro_custo else None, db)
            
            vopdu = float(premissa.vopdu or 0)
            indice = float(premissa.indice_conversao or 0)
            ticket = float(premissa.ticket_medio or 0)
            fator = float(premissa.fator or 1)
            estorno = float(premissa.indice_estorno or 0)
            
            valor_bruto = hc_pa * vopdu * indice * ticket * fator * dias_uteis * (1 - estorno)
            
            # Aplicar limites min/max por PA
            qtd_pa = await _get_pa_funcao(receita.cenario_id, receita.centro_custo_id, receita.funcao_pa_id, ano, mes, db)
            
            valor_min = float(receita.valor_minimo_pa or 0) * qtd_pa if receita.valor_minimo_pa else None
            valor_max = float(receita.valor_maximo_pa or 0) * qtd_pa if receita.valor_maximo_pa else None
            
            if valor_min is not None and valor_bruto < valor_min:
                valor_calculado = valor_min
            elif valor_max is not None and valor_bruto > valor_max:
                valor_calculado = valor_max
            else:
                valor_calculado = valor_bruto
            
            memoria = {
                "tipo": "VARIAVEL",
                "hc_pa": hc_pa,
                "vopdu": vopdu,
                "indice_conversao": indice,
                "ticket_medio": ticket,
                "fator": fator,
                "dias_uteis": dias_uteis,
                "indice_estorno": estorno,
                "qtd_pa": qtd_pa,
                "valor_bruto": valor_bruto,
                "valor_min": valor_min,
                "valor_max": valor_max
            }
    
    return ReceitaCalculadaResponse(
        receita_cenario_id=receita.id,
        mes=mes,
        ano=ano,
        valor_calculado=valor_calculado,
        valor_bruto=valor_bruto,
        hc_pa=hc_pa,
        qtd_pa=qtd_pa,
        dias_uteis=dias_uteis,
        memoria_calculo=memoria
    )


async def _get_hc_cc(cenario_id: UUID, cc_id: UUID, ano: int, mes: int, db: AsyncSession) -> float:
    """Obtém o total de HC do centro de custo no mês."""
    # Mapear mês para coluna
    col_map = {1: 'qtd_jan', 2: 'qtd_fev', 3: 'qtd_mar', 4: 'qtd_abr', 5: 'qtd_mai', 6: 'qtd_jun',
               7: 'qtd_jul', 8: 'qtd_ago', 9: 'qtd_set', 10: 'qtd_out', 11: 'qtd_nov', 12: 'qtd_dez'}
    
    result = await db.execute(
        select(QuadroPessoal).where(
            QuadroPessoal.cenario_id == cenario_id,
            QuadroPessoal.centro_custo_id == cc_id,
            QuadroPessoal.ativo == True
        )
    )
    quadros = result.scalars().all()
    
    total = 0.0
    for q in quadros:
        qtd = getattr(q, col_map[mes], 0) or 0
        total += float(qtd)
    
    return total


async def _get_hc_funcao(cenario_id: UUID, cc_id: UUID, funcao_id: UUID, ano: int, mes: int, db: AsyncSession) -> float:
    """Obtém o HC de uma função específica no CC/mês."""
    col_map = {1: 'qtd_jan', 2: 'qtd_fev', 3: 'qtd_mar', 4: 'qtd_abr', 5: 'qtd_mai', 6: 'qtd_jun',
               7: 'qtd_jul', 8: 'qtd_ago', 9: 'qtd_set', 10: 'qtd_out', 11: 'qtd_nov', 12: 'qtd_dez'}
    
    result = await db.execute(
        select(QuadroPessoal).where(
            QuadroPessoal.cenario_id == cenario_id,
            QuadroPessoal.centro_custo_id == cc_id,
            QuadroPessoal.funcao_id == funcao_id,
            QuadroPessoal.ativo == True
        )
    )
    quadros = result.scalars().all()
    
    total = 0.0
    for q in quadros:
        qtd = getattr(q, col_map[mes], 0) or 0
        total += float(qtd)
    
    return total


async def _get_pa_funcao(cenario_id: UUID, cc_id: UUID, funcao_id: UUID, ano: int, mes: int, db: AsyncSession) -> float:
    """Obtém o PA de uma função específica no CC/mês (HC / fator_pa)."""
    col_map = {1: 'qtd_jan', 2: 'qtd_fev', 3: 'qtd_mar', 4: 'qtd_abr', 5: 'qtd_mai', 6: 'qtd_jun',
               7: 'qtd_jul', 8: 'qtd_ago', 9: 'qtd_set', 10: 'qtd_out', 11: 'qtd_nov', 12: 'qtd_dez'}
    
    result = await db.execute(
        select(QuadroPessoal).where(
            QuadroPessoal.cenario_id == cenario_id,
            QuadroPessoal.centro_custo_id == cc_id,
            QuadroPessoal.funcao_id == funcao_id,
            QuadroPessoal.ativo == True
        )
    )
    quadros = result.scalars().all()
    
    total_pa = 0.0
    for q in quadros:
        qtd = getattr(q, col_map[mes], 0) or 0
        fator = float(q.fator_pa or 1)
        if fator > 0:
            total_pa += float(qtd) / fator
    
    return total_pa


async def _calcular_dias_uteis(ano: int, mes: int, uf: Optional[str], db: AsyncSession) -> int:
    """Calcula dias úteis do mês (dias totais - fins de semana - feriados)."""
    # Total de dias no mês
    _, dias_mes = calendar.monthrange(ano, mes)
    
    # Contar fins de semana
    fins_semana = 0
    for dia in range(1, dias_mes + 1):
        data = date(ano, mes, dia)
        if data.weekday() >= 5:  # Sábado = 5, Domingo = 6
            fins_semana += 1
    
    # Buscar feriados do mês
    query = select(Feriado).where(
        func.extract('month', Feriado.data) == mes,
        func.extract('year', Feriado.data) == ano
    )
    
    # Feriados nacionais
    query_nacional = query.where(Feriado.tipo == "NACIONAL")
    result = await db.execute(query_nacional)
    feriados_nacionais = result.scalars().all()
    
    # Feriados estaduais (se UF informado)
    feriados_estaduais = []
    if uf:
        query_estadual = query.where(Feriado.tipo == "ESTADUAL", Feriado.uf == uf)
        result = await db.execute(query_estadual)
        feriados_estaduais = result.scalars().all()
    
    # Contar feriados que não caem no fim de semana
    feriados_uteis = 0
    for f in feriados_nacionais + feriados_estaduais:
        if f.data.weekday() < 5:  # Dia útil
            feriados_uteis += 1
    
    dias_uteis = dias_mes - fins_semana - feriados_uteis
    return max(dias_uteis, 0)

