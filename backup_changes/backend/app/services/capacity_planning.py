"""
Serviço de Capacity Planning - Cálculo de quantidades via spans.
"""

from typing import List, Dict
from uuid import UUID
from math import ceil
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.models.orcamento import FuncaoSpan, QuadroPessoal, Cenario


async def calcular_quantidades_span(
    db: AsyncSession,
    cenario_id: UUID
) -> Dict[str, int]:
    """
    Calcula quantidades de funções baseadas em spans configurados.
    
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
    # Chave: (funcao_id, mes) -> quantidade
    quantidades_base: Dict[tuple, int] = {}
    
    meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
    
    for posicao in quadro:
        funcao_id = posicao.funcao_id
        for idx, mes in enumerate(meses, start=1):
            qtd = getattr(posicao, f'qtd_{mes}', 0) or 0
            key = (funcao_id, idx)
            quantidades_base[key] = quantidades_base.get(key, 0) + qtd
    
    # Calcular quantidades via spans
    quantidades_calculadas: Dict[str, int] = {}
    
    for span in spans:
        funcao_id = span.funcao_id
        funcoes_base_ids = span.funcoes_base_ids  # Lista de UUIDs
        span_ratio = float(span.span_ratio)
        
        # Para cada mês (1-12)
        for mes in range(1, 13):
            # Soma quantidades das funções base para este mês
            soma_base = 0
            for funcao_base_id in funcoes_base_ids:
                key = (funcao_base_id, mes)
                soma_base += quantidades_base.get(key, 0)
            
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
    
    meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
    
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
                mes_nome = meses[mes_num - 1]
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
                mes_nome = meses[mes_num - 1]
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


"""

from typing import List, Dict
from uuid import UUID
from math import ceil
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.models.orcamento import FuncaoSpan, QuadroPessoal, Cenario


async def calcular_quantidades_span(
    db: AsyncSession,
    cenario_id: UUID
) -> Dict[str, int]:
    """
    Calcula quantidades de funções baseadas em spans configurados.
    
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
    # Chave: (funcao_id, mes) -> quantidade
    quantidades_base: Dict[tuple, int] = {}
    
    meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
    
    for posicao in quadro:
        funcao_id = posicao.funcao_id
        for idx, mes in enumerate(meses, start=1):
            qtd = getattr(posicao, f'qtd_{mes}', 0) or 0
            key = (funcao_id, idx)
            quantidades_base[key] = quantidades_base.get(key, 0) + qtd
    
    # Calcular quantidades via spans
    quantidades_calculadas: Dict[str, int] = {}
    
    for span in spans:
        funcao_id = span.funcao_id
        funcoes_base_ids = span.funcoes_base_ids  # Lista de UUIDs
        span_ratio = float(span.span_ratio)
        
        # Para cada mês (1-12)
        for mes in range(1, 13):
            # Soma quantidades das funções base para este mês
            soma_base = 0
            for funcao_base_id in funcoes_base_ids:
                key = (funcao_base_id, mes)
                soma_base += quantidades_base.get(key, 0)
            
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
    
    meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
    
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
                mes_nome = meses[mes_num - 1]
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
                mes_nome = meses[mes_num - 1]
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

