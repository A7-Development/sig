"""
Serviço de Capacity Planning - Cálculo de quantidades via spans.
"""

from typing import List, Dict, Optional
from uuid import UUID
from math import ceil
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import noload

from app.db.models.orcamento import FuncaoSpan, QuadroPessoal, QuadroPessoalMes, Cenario


def to_float(value) -> float:
    """Converte valor para float de forma segura (suporta Decimal, int, float, None)."""
    if value is None:
        return 0.0
    if isinstance(value, Decimal):
        return float(value)
    return float(value)


MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']


async def calcular_span_para_posicao(
    db: AsyncSession,
    posicao: QuadroPessoal,
    cenario_secao_id: Optional[UUID] = None
) -> Dict[str, any]:
    """
    Calcula as quantidades mensais para uma posição do tipo SPAN.
    Suporta cenários multi-ano usando a tabela QuadroPessoalMes.
    
    Args:
        db: Sessão do banco de dados
        posicao: Posição do tipo SPAN a ser calculada
        cenario_secao_id: Se fornecido, filtra funções base apenas desta seção
    
    Returns:
        Dict com:
        - 'qtd_xxx': quantidades para as 12 colunas (primeiro ano)
        - 'multi_ano': lista de {ano, mes, quantidade} para todos os anos
    """
    import logging
    logger = logging.getLogger(__name__)
    
    if posicao.tipo_calculo != 'span' or not posicao.span_funcoes_base_ids or not posicao.span_ratio:
        logger.info(f"[CALC SPAN] Posição {posicao.id}: tipo={posicao.tipo_calculo}, base_ids={posicao.span_funcoes_base_ids}, ratio={posicao.span_ratio}")
        return {}
    
    # IDs das funções base (podem ser strings UUID vindas do JSON)
    funcoes_base_ids = [
        UUID(fid) if isinstance(fid, str) else fid 
        for fid in posicao.span_funcoes_base_ids
    ]
    
    logger.info(f"[CALC SPAN] Buscando posições com funcao_id in {funcoes_base_ids}")
    
    span_ratio = float(posicao.span_ratio)
    if span_ratio <= 0:
        return {}
    
    # Buscar posições das funções base na mesma seção
    query = select(QuadroPessoal).options(noload(QuadroPessoal.cenario)).where(
        QuadroPessoal.cenario_id == posicao.cenario_id,
        QuadroPessoal.funcao_id.in_(funcoes_base_ids),
        QuadroPessoal.ativo == True
    )
    
    # Filtrar pela mesma seção se especificado
    if cenario_secao_id:
        query = query.where(QuadroPessoal.cenario_secao_id == cenario_secao_id)
    elif posicao.cenario_secao_id:
        query = query.where(QuadroPessoal.cenario_secao_id == posicao.cenario_secao_id)
    
    result = await db.execute(query)
    posicoes_base = result.scalars().all()
    
    logger.info(f"[CALC SPAN] Encontradas {len(posicoes_base)} posições base")
    
    # Buscar dados da nova tabela QuadroPessoalMes para cenários multi-ano
    posicoes_base_ids = [p.id for p in posicoes_base]
    quantidades_mes_result = await db.execute(
        select(QuadroPessoalMes).where(
            QuadroPessoalMes.quadro_pessoal_id.in_(posicoes_base_ids)
        )
    )
    quantidades_mes_records = quantidades_mes_result.scalars().all()
    
    # Resultado
    quantidades = {}
    multi_ano_list = []
    
    if quantidades_mes_records:
        # CENÁRIO MULTI-ANO: usar dados da tabela QuadroPessoalMes
        logger.info(f"[CALC SPAN] *** MULTI-ANO ATIVO *** Encontrados {len(quantidades_mes_records)} registros")
        
        # Log detalhado dos registros encontrados
        for record in quantidades_mes_records:
            logger.info(f"[CALC SPAN] Registro: quadro_id={record.quadro_pessoal_id}, ano={record.ano}, mes={record.mes}, qtd={record.quantidade}")
        
        # Agrupar quantidades por ano/mês
        quantidades_por_ano_mes: Dict[tuple, float] = {}
        for record in quantidades_mes_records:
            key = (record.ano, record.mes)
            quantidades_por_ano_mes[key] = quantidades_por_ano_mes.get(key, 0) + to_float(record.quantidade)
        
        logger.info(f"[CALC SPAN] Quantidades agrupadas: {dict(quantidades_por_ano_mes)}")
        
        # Calcular SPAN para cada ano/mês
        primeiro_ano = None
        for (ano, mes), soma_base in sorted(quantidades_por_ano_mes.items()):
            quantidade_span = ceil(soma_base / span_ratio) if soma_base > 0 else 0
            multi_ano_list.append({'ano': ano, 'mes': mes, 'quantidade': quantidade_span})
            logger.info(f"[CALC SPAN] Calculado: {ano}-{mes} = {soma_base} / {span_ratio} = {quantidade_span}")
            
            # Guardar primeiro ano para compatibilidade com colunas qtd_xxx
            if primeiro_ano is None:
                primeiro_ano = ano
            
            # Preencher colunas qtd_xxx apenas com o primeiro ano
            if ano == primeiro_ano:
                mes_key = MESES[mes - 1]
                quantidades[f'qtd_{mes_key}'] = quantidade_span
        
        logger.info(f"[CALC SPAN] Resultado multi-ano: {len(multi_ano_list)} registros")
    else:
        # FALLBACK: usar colunas qtd_xxx do QuadroPessoal (apenas 12 meses)
        logger.info("[CALC SPAN] Fallback para colunas qtd_xxx do QuadroPessoal")
        for pb in posicoes_base:
            logger.info(f"[CALC SPAN] Base: funcao_id={pb.funcao_id}, qtd_jan={pb.qtd_jan}")
        
        for mes in MESES:
            soma_base = sum(to_float(getattr(p, f'qtd_{mes}', 0)) for p in posicoes_base)
            quantidade_span = ceil(soma_base / span_ratio) if soma_base > 0 else 0
            quantidades[f'qtd_{mes}'] = quantidade_span
    
    quantidades['multi_ano'] = multi_ano_list
    logger.info(f"[CALC SPAN] Resultado colunas: {[k for k in quantidades.keys() if k.startswith('qtd_')]}")
    
    return quantidades


async def aplicar_calculo_span(
    db: AsyncSession,
    posicao: QuadroPessoal
) -> QuadroPessoal:
    """
    Calcula e aplica as quantidades SPAN a uma posição.
    Suporta cenários multi-ano salvando na tabela QuadroPessoalMes.
    
    Args:
        db: Sessão do banco de dados
        posicao: Posição do tipo SPAN
    
    Returns:
        Posição atualizada com as quantidades calculadas
    """
    import logging
    from sqlalchemy import delete
    logger = logging.getLogger(__name__)
    
    resultado = await calcular_span_para_posicao(db, posicao)
    
    if not resultado:
        return posicao
    
    # Extrair dados multi-ano (se existirem)
    multi_ano_list = resultado.pop('multi_ano', [])
    
    # Aplicar quantidades às colunas qtd_xxx (primeiro ano / compatibilidade)
    logger.info(f"[APLICAR SPAN] Posição {posicao.id}: aplicando {len(resultado)} colunas qtd_xxx")
    for campo, valor in resultado.items():
        if campo.startswith('qtd_'):
            setattr(posicao, campo, valor)
    
    # Salvar dados multi-ano na tabela QuadroPessoalMes
    if multi_ano_list:
        logger.info(f"[APLICAR SPAN] Salvando {len(multi_ano_list)} registros multi-ano para posição {posicao.id}")
        
        # Remover registros existentes
        await db.execute(
            delete(QuadroPessoalMes).where(QuadroPessoalMes.quadro_pessoal_id == posicao.id)
        )
        
        # Inserir novos registros
        for item in multi_ano_list:
            novo_mes = QuadroPessoalMes(
                quadro_pessoal_id=posicao.id,
                ano=item['ano'],
                mes=item['mes'],
                quantidade=item['quantidade']
            )
            db.add(novo_mes)
    
    return posicao


async def recalcular_spans_afetados_sem_commit(
    db: AsyncSession,
    cenario_id: UUID,
    funcao_id: UUID,
    cenario_secao_id: Optional[UUID] = None
) -> int:
    """
    Recalcula todas as posições SPAN que dependem de uma função específica.
    NÃO faz commit - permite que o chamador controle a transação.
    
    Args:
        db: Sessão do banco de dados
        cenario_id: ID do cenário
        funcao_id: ID da função que foi alterada
        cenario_secao_id: Se fornecido, limita recálculo a esta seção
    
    Returns:
        Número de posições recalculadas
    """
    import logging
    logger = logging.getLogger(__name__)
    
    # Buscar todas as posições SPAN (sem filtro de seção para pegar todos)
    query = select(QuadroPessoal).options(noload(QuadroPessoal.cenario)).where(
        QuadroPessoal.cenario_id == cenario_id,
        QuadroPessoal.tipo_calculo == 'span',
        QuadroPessoal.ativo == True
    )
    
    # NÃO filtrar por seção - recalcular todos os SPANs do cenário
    # if cenario_secao_id:
    #     query = query.where(QuadroPessoal.cenario_secao_id == cenario_secao_id)
    
    result = await db.execute(query)
    posicoes_span = result.scalars().all()
    
    logger.info(f"[SPAN] Buscando SPANs para recalcular. funcao_id={funcao_id}, cenario_id={cenario_id}")
    logger.info(f"[SPAN] Encontradas {len(posicoes_span)} posições SPAN no cenário")
    
    recalculadas = 0
    # Normalizar para lowercase sem hífens para comparação robusta
    funcao_id_str = str(funcao_id).lower().replace('-', '')
    
    for posicao in posicoes_span:
        # Verificar se esta função está nas funções base
        if posicao.span_funcoes_base_ids:
            # Normalizar IDs para comparação
            funcoes_base_raw = posicao.span_funcoes_base_ids
            funcoes_base = [
                str(fid).lower().replace('-', '') if not isinstance(fid, str) else fid.lower().replace('-', '')
                for fid in funcoes_base_raw
            ]
            
            logger.info(f"[SPAN] Posição {posicao.id}: span_funcoes_base_ids (raw)={funcoes_base_raw}")
            logger.info(f"[SPAN] Posição {posicao.id}: span_funcoes_base_ids (normalized)={funcoes_base}")
            logger.info(f"[SPAN] Comparando com funcao_id (normalized)={funcao_id_str}")
            
            if funcao_id_str in funcoes_base:
                logger.info(f"[SPAN] MATCH! Recalculando posição {posicao.id}")
                await aplicar_calculo_span(db, posicao)
                recalculadas += 1
            else:
                logger.info(f"[SPAN] Sem match para posição {posicao.id}")
        else:
            logger.info(f"[SPAN] Posição {posicao.id} não tem span_funcoes_base_ids")
    
    logger.info(f"[SPAN] Total recalculadas: {recalculadas}")
    return recalculadas


async def recalcular_spans_afetados(
    db: AsyncSession,
    cenario_id: UUID,
    funcao_id: UUID,
    cenario_secao_id: Optional[UUID] = None
) -> int:
    """
    Recalcula todas as posições SPAN que dependem de uma função específica.
    Faz commit da transação.
    
    Chamado quando as quantidades de uma função base são alteradas.
    
    Args:
        db: Sessão do banco de dados
        cenario_id: ID do cenário
        funcao_id: ID da função que foi alterada
        cenario_secao_id: Se fornecido, limita recálculo a esta seção
    
    Returns:
        Número de posições recalculadas
    """
    recalculadas = await recalcular_spans_afetados_sem_commit(db, cenario_id, funcao_id, cenario_secao_id)
    
    if recalculadas > 0:
        await db.commit()
    
    return recalculadas


async def calcular_quantidades_span(
    db: AsyncSession,
    cenario_id: UUID
) -> Dict[str, int]:
    """
    Calcula quantidades de funções baseadas em spans configurados.
    (Função de compatibilidade com código antigo usando FuncaoSpan)
    
    Para cada função com span:
    1. Soma as quantidades das funções base (por mês)
    2. Divide pelo span_ratio (arredondando para cima)
    3. Retorna um dicionário com as quantidades calculadas
    
    Returns:
        Dict com chave "{funcao_id}_{mes}" e valor = quantidade calculada
    """
    # Buscar todos os spans ativos do cenário
    spans_result = await db.execute(
        select(FuncaoSpan).where(
            FuncaoSpan.cenario_id == cenario_id,
            FuncaoSpan.ativo == True
        )
    )
    spans = spans_result.scalars().all()
    
    if not spans:
        return {}
    
    # Buscar todas as posições do quadro de pessoal do cenário
    quadro_result = await db.execute(
        select(QuadroPessoal).where(
            QuadroPessoal.cenario_id == cenario_id,
            QuadroPessoal.ativo == True
        )
    )
    quadro = quadro_result.scalars().all()
    
    # Criar dicionário de quantidades por função e mês
    # Chave: (funcao_id, mes) -> quantidade (float)
    quantidades_base: Dict[tuple, float] = {}
    
    for posicao in quadro:
        funcao_id = posicao.funcao_id
        for idx, mes in enumerate(MESES, start=1):
            qtd = to_float(getattr(posicao, f'qtd_{mes}', 0))
            key = (funcao_id, idx)
            quantidades_base[key] = quantidades_base.get(key, 0.0) + qtd
    
    # Calcular quantidades via spans
    quantidades_calculadas: Dict[str, int] = {}
    
    for span in spans:
        funcao_id = span.funcao_id
        funcoes_base_ids = span.funcoes_base_ids  # Lista de UUIDs
        span_ratio = float(span.span_ratio)
        
        # Para cada mês (1-12)
        for mes in range(1, 13):
            # Soma quantidades das funções base para este mês
            soma_base = 0.0
            for funcao_base_id in funcoes_base_ids:
                key = (funcao_base_id, mes)
                soma_base += quantidades_base.get(key, 0.0)
            
            # Calcula quantidade via span (arredondando para cima)
            quantidade_span = ceil(soma_base / span_ratio) if span_ratio > 0 else 0
            
            # Armazena resultado (usar str() para UUID)
            chave = f"{str(funcao_id)}|{mes}"
            quantidades_calculadas[chave] = quantidade_span
    
    return quantidades_calculadas


async def aplicar_spans_ao_quadro(
    db: AsyncSession,
    cenario_id: UUID
) -> Dict[str, int]:
    """
    Aplica os cálculos de spans ao quadro de pessoal.
    Cria ou atualiza posições no quadro com as quantidades calculadas.
    
    Returns:
        Dict com informações sobre quantas posições foram criadas/atualizadas
    """
    # Calcular quantidades
    quantidades = await calcular_quantidades_span(db, cenario_id)
    
    if not quantidades:
        return {"criadas": 0, "atualizadas": 0, "erros": []}
    
    # Buscar spans para mapear funcao_id -> span
    spans_result = await db.execute(
        select(FuncaoSpan).where(
            FuncaoSpan.cenario_id == cenario_id,
            FuncaoSpan.ativo == True
        )
    )
    spans = spans_result.scalars().all()
    
    span_map = {span.funcao_id: span for span in spans}
    
    criadas = 0
    atualizadas = 0
    erros = []
    
    # Agrupar quantidades por função
    quantidades_por_funcao: Dict[UUID, Dict[int, int]] = {}
    for chave, qtd in quantidades.items():
        funcao_id_str, mes_str = chave.split('|')
        funcao_id = UUID(funcao_id_str)
        mes = int(mes_str)
        
        if funcao_id not in quantidades_por_funcao:
            quantidades_por_funcao[funcao_id] = {}
        quantidades_por_funcao[funcao_id][mes] = qtd
    
    # Para cada função com span, criar ou atualizar posição no quadro
    for funcao_id, quantidades_mes in quantidades_por_funcao.items():
        span = span_map.get(funcao_id)
        if not span:
            continue
        
        # Buscar se já existe posição para esta função
        posicao_result = await db.execute(
            select(QuadroPessoal).where(
                QuadroPessoal.cenario_id == cenario_id,
                QuadroPessoal.funcao_id == funcao_id,
                QuadroPessoal.ativo == True
            )
        )
        posicao = posicao_result.scalar_one_or_none()
        
        if posicao:
            # Atualizar posição existente
            for mes_num, qtd in quantidades_mes.items():
                mes_nome = MESES[mes_num - 1]
                setattr(posicao, f'qtd_{mes_nome}', qtd)
            atualizadas += 1
        else:
            # Criar nova posição
            posicao = QuadroPessoal(
                cenario_id=cenario_id,
                funcao_id=funcao_id,
                regime="CLT",  # Padrão, pode ser ajustado depois
                ativo=True
            )
            # Preencher quantidades mensais
            for mes_num, qtd in quantidades_mes.items():
                mes_nome = MESES[mes_num - 1]
                setattr(posicao, f'qtd_{mes_nome}', qtd)
            db.add(posicao)
            criadas += 1
    
    if criadas > 0 or atualizadas > 0:
        await db.commit()
    
    return {
        "criadas": criadas,
        "atualizadas": atualizadas,
        "erros": erros
    }
