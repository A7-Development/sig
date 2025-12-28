"""
APIs de custos de pessoal.
"""

from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, HTTPException, Query, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.db.models.orcamento import (
    TipoCusto, CustoCalculado, CustoTecnologia, ParametroCusto, Cenario,
    QuadroPessoal, TabelaSalarial, Funcao
)
from app.schemas.orcamento import (
    TipoCustoBase, TipoCustoCreate, TipoCustoUpdate, TipoCustoResponse,
    CustoCalculadoResponse, CustoCalculadoComRelacionamentos,
    CustoTecnologiaResponse, CustoTecnologiaComRelacionamentos,
    ParametroCustoCreate, ParametroCustoUpdate, ParametroCustoResponse,
    DRELinha, DREResponse
)
from app.services.calculo_custos import calcular_e_salvar_custos
from app.services.calculo_custos_tecnologia import calcular_e_salvar_custos_tecnologia
from pydantic import BaseModel


# ============================================
# Schemas de Validação
# ============================================

class ValidacaoItem(BaseModel):
    """Item de validação com alerta ou erro."""
    tipo: str  # "erro" ou "aviso"
    categoria: str  # "politica_beneficio", "tabela_salarial", etc.
    titulo: str
    descricao: str
    funcoes_afetadas: List[str] = []
    hc_total_afetado: float = 0


class ValidacaoResponse(BaseModel):
    """Resposta do endpoint de validação."""
    tem_erros: bool
    tem_avisos: bool
    total_hc_sem_politica: float
    total_funcoes_sem_politica: int
    items: List[ValidacaoItem]

router = APIRouter(prefix="/custos", tags=["Custos"])


# Endpoint de teste simples
@router.get("/test")
async def test_endpoint():
    """Teste simples."""
    return {"status": "ok", "message": "Endpoint de custos funcionando"}


# ============================================
# Validação de Configuração
# ============================================

@router.get("/cenarios/{cenario_id}/validar", response_model=ValidacaoResponse)
async def validar_configuracao_cenario(
    cenario_id: UUID,
    cenario_secao_id: Optional[UUID] = Query(None, description="Validar apenas uma seção"),
    db: AsyncSession = Depends(get_db)
):
    """
    Valida a configuração do cenário e retorna avisos/erros.
    Verifica se todas as funções no quadro de pessoal têm:
    - Tabela salarial vinculada
    - Política de benefícios vinculada à tabela salarial
    """
    # Verificar se cenário existe
    cenario = await db.get(Cenario, cenario_id)
    if not cenario:
        raise HTTPException(status_code=404, detail="Cenário não encontrado")
    
    items: List[ValidacaoItem] = []
    
    # Buscar quadro de pessoal com relacionamentos
    query = select(QuadroPessoal).options(
        selectinload(QuadroPessoal.funcao),
        selectinload(QuadroPessoal.tabela_salarial).selectinload(TabelaSalarial.politica)
    ).where(
        QuadroPessoal.cenario_id == cenario_id,
        QuadroPessoal.ativo == True
    )
    
    if cenario_secao_id:
        query = query.where(QuadroPessoal.cenario_secao_id == cenario_secao_id)
    
    result = await db.execute(query)
    quadros = result.scalars().all()
    
    # Agrupar por função para análise
    funcoes_sem_tabela: dict = {}  # funcao_nome -> hc_total
    funcoes_sem_politica: dict = {}  # funcao_nome -> hc_total
    
    MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
    
    for quadro in quadros:
        funcao_nome = quadro.funcao.nome if quadro.funcao else "Função não definida"
        
        # Calcular HC total dessa posição
        hc_total = sum(float(getattr(quadro, f"qtd_{mes}", 0) or 0) for mes in MESES)
        
        if hc_total <= 0:
            continue  # Ignora posições sem HC
        
        # Verificar se tem tabela salarial
        if not quadro.tabela_salarial:
            if funcao_nome not in funcoes_sem_tabela:
                funcoes_sem_tabela[funcao_nome] = 0
            funcoes_sem_tabela[funcao_nome] += hc_total
        # Verificar se a tabela salarial tem política de benefícios
        elif not quadro.tabela_salarial.politica:
            if funcao_nome not in funcoes_sem_politica:
                funcoes_sem_politica[funcao_nome] = 0
            funcoes_sem_politica[funcao_nome] += hc_total
    
    # Gerar alertas para funções sem tabela salarial
    for funcao_nome, hc_total in funcoes_sem_tabela.items():
        items.append(ValidacaoItem(
            tipo="erro",
            categoria="tabela_salarial",
            titulo="Função sem Tabela Salarial",
            descricao=f"A função '{funcao_nome}' não possui tabela salarial vinculada. O cálculo de salários e benefícios não será realizado.",
            funcoes_afetadas=[funcao_nome],
            hc_total_afetado=hc_total
        ))
    
    # Gerar alertas para funções sem política de benefícios
    for funcao_nome, hc_total in funcoes_sem_politica.items():
        items.append(ValidacaoItem(
            tipo="aviso",
            categoria="politica_beneficio",
            titulo="Função sem Política de Benefícios",
            descricao=f"A função '{funcao_nome}' possui tabela salarial, mas não tem política de benefícios vinculada. Os valores de VT, VR e VA serão calculados como zero.",
            funcoes_afetadas=[funcao_nome],
            hc_total_afetado=hc_total
        ))
    
    # Calcular totais
    total_hc_sem_politica = sum(funcoes_sem_politica.values()) + sum(funcoes_sem_tabela.values())
    total_funcoes_sem_politica = len(funcoes_sem_politica) + len(funcoes_sem_tabela)
    tem_erros = len(funcoes_sem_tabela) > 0
    tem_avisos = len(funcoes_sem_politica) > 0
    
    return ValidacaoResponse(
        tem_erros=tem_erros,
        tem_avisos=tem_avisos,
        total_hc_sem_politica=total_hc_sem_politica,
        total_funcoes_sem_politica=total_funcoes_sem_politica,
        items=items
    )


# ============================================
# Tipos de Custo (Rubricas)
# ============================================

@router.get("/tipos", response_model=List[TipoCustoResponse])
async def listar_tipos_custo(
    categoria: Optional[str] = Query(None, description="Filtrar por categoria"),
    ativo: Optional[bool] = Query(None, description="Filtrar por status"),
    db: AsyncSession = Depends(get_db)
):
    """Lista todos os tipos de custo (rubricas)."""
    try:
        print(f"[DEBUG] Listando tipos de custo: categoria={categoria}, ativo={ativo}")
        query = select(TipoCusto).order_by(TipoCusto.ordem, TipoCusto.codigo)
        
        if categoria:
            query = query.where(TipoCusto.categoria == categoria)
        if ativo is not None:
            query = query.where(TipoCusto.ativo == ativo)
        
        print(f"[DEBUG] Executando query de tipos de custo...")
        result = await db.execute(query)
        tipos = result.scalars().all()
        print(f"[DEBUG] Retornando {len(tipos)} tipos de custo")
        return tipos
    except Exception as e:
        print(f"[ERROR] Erro ao listar tipos de custo: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao listar tipos de custo: {str(e)}"
        )


@router.get("/tipos/{tipo_id}", response_model=TipoCustoResponse)
async def obter_tipo_custo(
    tipo_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Obtém um tipo de custo específico."""
    tipo = await db.get(TipoCusto, tipo_id)
    if not tipo:
        raise HTTPException(status_code=404, detail="Tipo de custo não encontrado")
    return tipo


@router.put("/tipos/{tipo_id}", response_model=TipoCustoResponse)
async def atualizar_tipo_custo(
    tipo_id: UUID,
    data: TipoCustoUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Atualiza um tipo de custo (principalmente para vincular conta contábil)."""
    tipo = await db.get(TipoCusto, tipo_id)
    if not tipo:
        raise HTTPException(status_code=404, detail="Tipo de custo não encontrado")
    
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(tipo, field, value)
    
    await db.commit()
    await db.refresh(tipo)
    return tipo


# ============================================
# Cálculo de Custos
# ============================================

@router.post("/cenarios/{cenario_id}/calcular")
async def calcular_custos_cenario(
    cenario_id: UUID,
    cenario_secao_id: Optional[UUID] = Query(None, description="Calcular apenas uma seção"),
    ano: Optional[int] = Query(None, description="Ano para cálculo"),
    db: AsyncSession = Depends(get_db)
):
    """
    Calcula os custos de um cenário.
    Remove custos anteriores e recalcula tudo.
    """
    # Verificar se cenário existe
    cenario = await db.get(Cenario, cenario_id)
    if not cenario:
        raise HTTPException(status_code=404, detail="Cenário não encontrado")
    
    try:
        resultado = await calcular_e_salvar_custos(
            db=db,
            cenario_id=cenario_id,
            cenario_secao_id=cenario_secao_id,
            ano=ano
        )
        
        # resultado agora contém { quantidade, rateio }
        quantidade = resultado.get("quantidade", 0) if isinstance(resultado, dict) else resultado
        rateio = resultado.get("rateio", {}) if isinstance(resultado, dict) else {}
        
        return {
            "success": True,
            "message": f"Custos calculados com sucesso",
            "quantidade": quantidade,
            "rateio": rateio
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao calcular custos: {str(e)}"
        )


@router.post("/cenarios/{cenario_id}/calcular-tecnologia")
async def calcular_custos_tecnologia_cenario(
    cenario_id: UUID,
    cenario_secao_id: Optional[UUID] = Query(None, description="Calcular apenas uma seção"),
    ano: Optional[int] = Query(None, description="Ano para cálculo"),
    db: AsyncSession = Depends(get_db)
):
    """
    Calcula os custos de tecnologia de um cenário.
    Remove custos anteriores e recalcula tudo.
    """
    # Verificar se cenário existe
    cenario = await db.get(Cenario, cenario_id)
    if not cenario:
        raise HTTPException(status_code=404, detail="Cenário não encontrado")
    
    try:
        resultado = await calcular_e_salvar_custos_tecnologia(
            db=db,
            cenario_id=cenario_id,
            cenario_secao_id=cenario_secao_id,
            ano=ano
        )
        
        return {
            "success": True,
            "message": "Custos de tecnologia calculados com sucesso",
            **resultado
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao calcular custos de tecnologia: {str(e)}"
        )


@router.get("/cenarios/{cenario_id}/tecnologia", response_model=List[CustoTecnologiaComRelacionamentos])
async def listar_custos_tecnologia_cenario(
    cenario_id: UUID,
    cenario_secao_id: Optional[UUID] = Query(None, description="Filtrar por seção"),
    produto_id: Optional[UUID] = Query(None, description="Filtrar por produto"),
    mes: Optional[int] = Query(None, ge=1, le=12, description="Filtrar por mês"),
    ano: Optional[int] = Query(None, description="Filtrar por ano"),
    db: AsyncSession = Depends(get_db)
):
    """Lista custos de tecnologia calculados de um cenário."""
    query = select(CustoTecnologia).options(
        selectinload(CustoTecnologia.produto),
        selectinload(CustoTecnologia.alocacao)
    ).where(CustoTecnologia.cenario_id == cenario_id)
    
    if cenario_secao_id:
        query = query.where(CustoTecnologia.cenario_secao_id == cenario_secao_id)
    if produto_id:
        query = query.where(CustoTecnologia.produto_id == produto_id)
    if mes:
        query = query.where(CustoTecnologia.mes == mes)
    if ano:
        query = query.where(CustoTecnologia.ano == ano)
    
    query = query.order_by(CustoTecnologia.ano, CustoTecnologia.mes)
    
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/cenarios/{cenario_id}", response_model=List[CustoCalculadoComRelacionamentos])
async def listar_custos_cenario(
    cenario_id: UUID,
    cenario_secao_id: Optional[UUID] = Query(None, description="Filtrar por seção"),
    funcao_id: Optional[UUID] = Query(None, description="Filtrar por função"),
    tipo_custo_id: Optional[UUID] = Query(None, description="Filtrar por tipo de custo"),
    mes: Optional[int] = Query(None, ge=1, le=12, description="Filtrar por mês"),
    ano: Optional[int] = Query(None, description="Filtrar por ano"),
    db: AsyncSession = Depends(get_db)
):
    """Lista custos calculados de um cenário."""
    query = select(CustoCalculado).options(
        selectinload(CustoCalculado.funcao),
        selectinload(CustoCalculado.tipo_custo)
    ).where(CustoCalculado.cenario_id == cenario_id)
    
    if cenario_secao_id:
        query = query.where(CustoCalculado.cenario_secao_id == cenario_secao_id)
    if funcao_id:
        query = query.where(CustoCalculado.funcao_id == funcao_id)
    if tipo_custo_id:
        query = query.where(CustoCalculado.tipo_custo_id == tipo_custo_id)
    if mes:
        query = query.where(CustoCalculado.mes == mes)
    if ano:
        query = query.where(CustoCalculado.ano == ano)
    
    query = query.order_by(CustoCalculado.ano, CustoCalculado.mes)
    
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/cenarios/{cenario_id}/resumo")
async def resumo_custos_cenario(
    cenario_id: UUID,
    cenario_secao_id: Optional[UUID] = Query(None, description="Filtrar por seção"),
    ano: Optional[int] = Query(None, description="Filtrar por ano"),
    db: AsyncSession = Depends(get_db)
):
    """Retorna resumo dos custos agrupados por categoria."""
    query = select(
        TipoCusto.categoria,
        func.sum(CustoCalculado.valor_calculado).label("total")
    ).join(
        CustoCalculado, CustoCalculado.tipo_custo_id == TipoCusto.id
    ).where(
        CustoCalculado.cenario_id == cenario_id
    ).group_by(TipoCusto.categoria)
    
    if cenario_secao_id:
        query = query.where(CustoCalculado.cenario_secao_id == cenario_secao_id)
    if ano:
        query = query.where(CustoCalculado.ano == ano)
    
    result = await db.execute(query)
    
    resumo = {}
    total_geral = 0
    for row in result.fetchall():
        resumo[row.categoria] = float(row.total or 0)
        total_geral += float(row.total or 0)
    
    return {
        "cenario_id": str(cenario_id),
        "por_categoria": resumo,
        "total_geral": total_geral
    }


@router.get("/cenarios/{cenario_id}/dre", response_model=DREResponse)
async def gerar_dre_cenario(
    cenario_id: UUID,
    cenario_secao_id: Optional[UUID] = Query(None, description="Filtrar por seção"),
    ano: Optional[int] = Query(None, description="Ano do DRE"),
    db: AsyncSession = Depends(get_db)
):
    """Gera o DRE (Demonstrativo de Resultado) do cenário."""
    
    # Buscar cenário para pegar o ano padrão
    cenario = await db.get(Cenario, cenario_id)
    if not cenario:
        raise HTTPException(status_code=404, detail="Cenário não encontrado")
    
    if not ano:
        ano = cenario.ano_inicio
    
    # ============================================
    # 1. Buscar custos de PESSOAL agrupados por tipo e mês
    # ============================================
    query = select(
        TipoCusto.codigo,
        TipoCusto.nome,
        TipoCusto.categoria,
        TipoCusto.conta_contabil_codigo,
        TipoCusto.conta_contabil_descricao,
        CustoCalculado.mes,
        func.sum(CustoCalculado.valor_calculado).label("valor")
    ).join(
        CustoCalculado, CustoCalculado.tipo_custo_id == TipoCusto.id
    ).where(
        CustoCalculado.cenario_id == cenario_id,
        CustoCalculado.ano == ano
    ).group_by(
        TipoCusto.codigo,
        TipoCusto.nome,
        TipoCusto.categoria,
        TipoCusto.conta_contabil_codigo,
        TipoCusto.conta_contabil_descricao,
        CustoCalculado.mes
    ).order_by(TipoCusto.codigo, CustoCalculado.mes)
    
    if cenario_secao_id:
        query = query.where(CustoCalculado.cenario_secao_id == cenario_secao_id)
    
    result = await db.execute(query)
    rows = result.fetchall()
    
    # Organizar dados por rubrica
    rubricas_dict = {}
    for row in rows:
        codigo = row.codigo
        if codigo not in rubricas_dict:
            conta_codigo = row.conta_contabil_codigo or ""
            conta_desc = row.conta_contabil_descricao or ""
            conta_completa = f"{conta_codigo} - {conta_desc}" if conta_codigo and conta_desc else conta_codigo or conta_desc or ""
            
            rubricas_dict[codigo] = {
                "tipo_custo_codigo": codigo,
                "tipo_custo_nome": row.nome,
                "categoria": row.categoria,
                "conta_contabil_codigo": conta_codigo,
                "conta_contabil_descricao": conta_desc,
                "conta_contabil_completa": conta_completa,
                "valores_mensais": [0.0] * 12,
                "total": 0.0
            }
        
        mes_idx = row.mes - 1
        valor = float(row.valor or 0)
        rubricas_dict[codigo]["valores_mensais"][mes_idx] = valor
        rubricas_dict[codigo]["total"] += valor
    
    # ============================================
    # 2. Buscar custos de TECNOLOGIA agrupados por produto e mês
    # ============================================
    from app.db.models.orcamento import ProdutoTecnologia
    
    query_tec = select(
        ProdutoTecnologia.codigo,
        ProdutoTecnologia.nome,
        ProdutoTecnologia.categoria,
        ProdutoTecnologia.conta_contabil_codigo,
        ProdutoTecnologia.conta_contabil_descricao,
        CustoTecnologia.mes,
        func.sum(CustoTecnologia.valor_calculado).label("valor")
    ).join(
        CustoTecnologia, CustoTecnologia.produto_id == ProdutoTecnologia.id
    ).where(
        CustoTecnologia.cenario_id == cenario_id,
        CustoTecnologia.ano == ano
    ).group_by(
        ProdutoTecnologia.codigo,
        ProdutoTecnologia.nome,
        ProdutoTecnologia.categoria,
        ProdutoTecnologia.conta_contabil_codigo,
        ProdutoTecnologia.conta_contabil_descricao,
        CustoTecnologia.mes
    ).order_by(ProdutoTecnologia.codigo, CustoTecnologia.mes)
    
    if cenario_secao_id:
        query_tec = query_tec.where(CustoTecnologia.cenario_secao_id == cenario_secao_id)
    
    result_tec = await db.execute(query_tec)
    rows_tec = result_tec.fetchall()
    
    # Adicionar custos de tecnologia ao dicionário
    for row in rows_tec:
        codigo = f"TEC_{row.codigo}"  # Prefixo para diferenciar de custos de pessoal
        if codigo not in rubricas_dict:
            conta_codigo = row.conta_contabil_codigo or ""
            conta_desc = row.conta_contabil_descricao or ""
            conta_completa = f"{conta_codigo} - {conta_desc}" if conta_codigo and conta_desc else conta_codigo or conta_desc or ""
            
            rubricas_dict[codigo] = {
                "tipo_custo_codigo": codigo,
                "tipo_custo_nome": f"{row.nome} (Tecnologia)",
                "categoria": f"TECNOLOGIA_{row.categoria}",
                "conta_contabil_codigo": conta_codigo,
                "conta_contabil_descricao": conta_desc,
                "conta_contabil_completa": conta_completa,
                "valores_mensais": [0.0] * 12,
                "total": 0.0
            }
        
        mes_idx = row.mes - 1
        valor = float(row.valor or 0)
        rubricas_dict[codigo]["valores_mensais"][mes_idx] = valor
        rubricas_dict[codigo]["total"] += valor
    
    # ============================================
    # 3. Buscar CUSTOS DIRETOS agrupados por item de custo e mês
    # ============================================
    from app.db.models.orcamento import CustoDireto, CentroCusto, QuadroPessoal
    
    # Calcular custos diretos para cada mês do cenário
    mes_inicio = cenario.mes_inicio
    mes_fim = cenario.mes_fim
    ano_inicio_cenario = cenario.ano_inicio
    ano_fim_cenario = cenario.ano_fim
    
    # Buscar custos diretos ativos do cenário
    query_diretos = select(CustoDireto).options(
        selectinload(CustoDireto.item_custo),
        selectinload(CustoDireto.centro_custo)
    ).where(
        CustoDireto.cenario_id == cenario_id,
        CustoDireto.ativo == True
    )
    
    if cenario_secao_id:
        query_diretos = query_diretos.where(CustoDireto.cenario_secao_id == cenario_secao_id)
    
    result_diretos = await db.execute(query_diretos)
    custos_diretos = result_diretos.scalars().all()
    
    # OTIMIZAÇÃO: Pré-carregar TODO o quadro de pessoal de uma vez e criar cache
    MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
    
    # Buscar todo o quadro de pessoal do cenário (1 query apenas)
    result_quadro = await db.execute(
        select(QuadroPessoal).where(
            QuadroPessoal.cenario_id == cenario_id,
            QuadroPessoal.ativo == True
        )
    )
    todos_quadros = result_quadro.scalars().all()
    
    # Criar caches indexados para acesso O(1)
    # Cache por centro de custo: {(cc_id, mes_idx): total_hc}
    hc_cache_por_cc: dict = {}
    # Cache por função: {(funcao_id, mes_idx): total_hc}
    hc_cache_por_funcao: dict = {}
    # Cache geral: {mes_idx: total_hc}
    hc_cache_geral: dict = {i: 0.0 for i in range(12)}
    
    for q in todos_quadros:
        for mes_idx, mes_key in enumerate(MESES):
            qtd = float(getattr(q, f"qtd_{mes_key}", 0) or 0)
            if qtd > 0:
                # Cache por CC
                cc_key = (q.centro_custo_id, mes_idx)
                hc_cache_por_cc[cc_key] = hc_cache_por_cc.get(cc_key, 0.0) + qtd
                
                # Cache por função
                func_key = (q.funcao_id, mes_idx)
                hc_cache_por_funcao[func_key] = hc_cache_por_funcao.get(func_key, 0.0) + qtd
                
                # Cache geral
                hc_cache_geral[mes_idx] += qtd
    
    def obter_hc_cache(centro_custo_id, funcao_id, mes_idx):
        """Obtém HC do cache (acesso O(1) sem query)."""
        if funcao_id:
            return hc_cache_por_funcao.get((funcao_id, mes_idx), 0.0)
        elif centro_custo_id:
            return hc_cache_por_cc.get((centro_custo_id, mes_idx), 0.0)
        else:
            return hc_cache_geral.get(mes_idx, 0.0)
    
    # Para cada custo direto, calcular o valor por mês
    for custo in custos_diretos:
        if not custo.item_custo:
            continue
            
        item = custo.item_custo
        codigo = f"DIR_{item.codigo}"
        
        if codigo not in rubricas_dict:
            conta_codigo = item.conta_contabil_codigo or ""
            conta_desc = item.conta_contabil_descricao or ""
            conta_completa = f"{conta_codigo} - {conta_desc}" if conta_codigo and conta_desc else conta_codigo or conta_desc or ""
            
            rubricas_dict[codigo] = {
                "tipo_custo_codigo": codigo,
                "tipo_custo_nome": f"{item.nome} (Custo Direto)",
                "categoria": f"CUSTO_DIRETO_{item.categoria}",
                "conta_contabil_codigo": conta_codigo,
                "conta_contabil_descricao": conta_desc,
                "conta_contabil_completa": conta_completa,
                "valores_mensais": [0.0] * 12,
                "total": 0.0
            }
        
        # Distribuir valor nos meses do ano selecionado
        for mes in range(1, 13):
            # Verificar se o mês está dentro do período do cenário
            if ano == ano_inicio_cenario and mes < mes_inicio:
                continue
            if ano == ano_fim_cenario and mes > mes_fim:
                continue
            if ano < ano_inicio_cenario or ano > ano_fim_cenario:
                continue
            
            mes_idx = mes - 1
            
            # Calcular valor mensal baseado no tipo
            valor_mensal = 0.0
            if custo.tipo_valor == "FIXO":
                valor_mensal = float(custo.valor_fixo or 0)
            elif custo.tipo_valor == "VARIAVEL":
                # Calcular baseado em HC/PA do quadro de pessoal
                valor_unitario = float(custo.valor_unitario_variavel or 0)
                
                if custo.unidade_medida == "HC":
                    # OTIMIZAÇÃO: Usar cache de HC (sem query)
                    hc = obter_hc_cache(
                        custo.centro_custo_id if custo.tipo_medida in ["HC_TOTAL", None] else None,
                        custo.funcao_base_id if custo.tipo_medida == "HC_FUNCAO" else None,
                        mes_idx
                    )
                    valor_mensal = valor_unitario * hc
                elif custo.unidade_medida == "PA":
                    # PA = Posição de Atendimento (usar mesmo cálculo de HC por simplicidade)
                    pa = obter_hc_cache(
                        custo.centro_custo_id,
                        custo.funcao_base_id if custo.tipo_medida == "PA_FUNCAO" else None,
                        mes_idx
                    )
                    valor_mensal = valor_unitario * pa
                else:
                    # Unidade genérica, usar valor unitário direto
                    valor_mensal = valor_unitario
                    
            elif custo.tipo_valor == "FIXO_VARIAVEL":
                valor_fixo = float(custo.valor_fixo or 0)
                valor_unitario = float(custo.valor_unitario_variavel or 0)
                
                # OTIMIZAÇÃO: Usar cache de HC (sem query)
                hc = obter_hc_cache(
                    custo.centro_custo_id,
                    custo.funcao_base_id,
                    mes_idx
                )
                valor_mensal = valor_fixo + (valor_unitario * hc)
            
            # Aplicar rateio se existir
            if custo.tipo_calculo == "rateio" and custo.rateio_percentual:
                valor_mensal = valor_mensal * float(custo.rateio_percentual) / 100
            
            rubricas_dict[codigo]["valores_mensais"][mes_idx] += valor_mensal
            rubricas_dict[codigo]["total"] += valor_mensal
    
    # ============================================
    # 4. Buscar RECEITAS do cenário
    # ============================================
    from app.db.models.orcamento import ReceitaCenario, ReceitaPremissaMes, TipoReceita, Feriado
    from app.api.v1.orcamento.receitas import _calcular_receita_mes
    
    # Buscar receitas ativas do cenário
    query_receitas = select(ReceitaCenario).where(
        ReceitaCenario.cenario_id == cenario_id,
        ReceitaCenario.ativo == True
    ).options(
        selectinload(ReceitaCenario.tipo_receita),
        selectinload(ReceitaCenario.centro_custo),
        selectinload(ReceitaCenario.premissas)
    )
    
    result_receitas = await db.execute(query_receitas)
    receitas = result_receitas.scalars().all()
    
    # Calcular cada receita para cada mês do ano
    for receita in receitas:
        tipo_receita = receita.tipo_receita
        if not tipo_receita:
            continue
        
        codigo = f"REC_{tipo_receita.codigo}"
        
        # Inicializar entrada se não existir
        if codigo not in rubricas_dict:
            conta_codigo = tipo_receita.conta_contabil_codigo or ""
            conta_desc = tipo_receita.conta_contabil_descricao or ""
            conta_completa = f"{conta_codigo} - {conta_desc}" if conta_codigo and conta_desc else conta_codigo or conta_desc or ""
            
            rubricas_dict[codigo] = {
                "tipo_custo_codigo": codigo,
                "tipo_custo_nome": f"{tipo_receita.nome}",
                "categoria": "RECEITA",
                "conta_contabil_codigo": conta_codigo,
                "conta_contabil_descricao": conta_desc,
                "conta_contabil_completa": conta_completa,
                "valores_mensais": [0.0] * 12,
                "total": 0.0
            }
        
        # Calcular receita para cada mês do ano solicitado
        for mes in range(1, 13):
            try:
                resultado = await _calcular_receita_mes(receita, ano, mes, db)
                valor = resultado.valor_calculado
                
                # Receitas são valores positivos (créditos)
                # Invertemos o sinal para que apareçam como positivos no DRE
                rubricas_dict[codigo]["valores_mensais"][mes - 1] += valor
                rubricas_dict[codigo]["total"] += valor
            except Exception as e:
                # Se houver erro no cálculo, apenas ignora o mês
                print(f"Erro ao calcular receita {receita.id} mês {mes}: {e}")
                continue
    
    # ============================================
    # 5. Converter para lista de DRELinha e calcular totais
    # ============================================
    linhas = []
    total_geral = 0
    
    # Separar receitas (valores positivos) e custos (valores negativos para exibição)
    linhas_receita = []
    linhas_custo = []
    
    for dados in rubricas_dict.values():
        if dados["categoria"] == "RECEITA":
            # Receitas: valores positivos (créditos)
            linha = DRELinha(**dados)
            linhas_receita.append(linha)
            total_geral += dados["total"]
        else:
            # Custos: inverter sinal para exibição contábil (valores negativos = débitos)
            dados_custo = dados.copy()
            dados_custo["valores_mensais"] = [-v for v in dados["valores_mensais"]]
            dados_custo["total"] = -dados["total"]
            linha = DRELinha(**dados_custo)
            linhas_custo.append(linha)
            total_geral += dados_custo["total"]  # Já está negativo
    
    # Ordenar: Receitas primeiro, depois custos
    linhas = linhas_receita + linhas_custo
    
    return DREResponse(
        cenario_id=cenario_id,
        cenario_secao_id=cenario_secao_id,
        ano=ano,
        linhas=linhas,
        total_geral=total_geral
    )


# ============================================
# DRE por Centro de Custo
# ============================================

from app.schemas.orcamento import DRELinhaPorCC, DRECentroCusto, DREPorCCResponse

@router.get("/cenarios/{cenario_id}/dre-por-cc", response_model=DREPorCCResponse)
async def gerar_dre_por_cc(
    cenario_id: UUID,
    ano: Optional[int] = Query(None, description="Ano do DRE"),
    centro_custo_id: Optional[UUID] = Query(None, description="Filtrar por CC específico"),
    db: AsyncSession = Depends(get_db)
):
    """
    Gera o DRE agrupado por Centro de Custo com separação de custos diretos e indiretos.
    
    Custos Indiretos são aqueles que vieram de rateio (CC POOL).
    """
    from app.db.models.orcamento import CentroCusto, ReceitaCenario, CustoDireto, QuadroPessoal, ProdutoTecnologia
    from app.api.v1.orcamento.receitas import _calcular_receita_mes
    
    # Buscar cenário
    cenario = await db.get(Cenario, cenario_id)
    if not cenario:
        raise HTTPException(status_code=404, detail="Cenário não encontrado")
    
    if not ano:
        ano = cenario.ano_inicio
    
    # Buscar CCs operacionais (excluindo POOLs)
    query_ccs = select(CentroCusto).where(
        CentroCusto.ativo == True,
        CentroCusto.tipo != "POOL"
    )
    if centro_custo_id:
        query_ccs = query_ccs.where(CentroCusto.id == centro_custo_id)
    
    result_ccs = await db.execute(query_ccs)
    centros_custo = result_ccs.scalars().all()
    
    # Buscar todos os custos calculados do cenário/ano
    query_custos = select(
        CustoCalculado,
        TipoCusto.codigo.label("tipo_codigo"),
        TipoCusto.nome.label("tipo_nome"),
        TipoCusto.categoria.label("tipo_categoria"),
        TipoCusto.conta_contabil_codigo,
        TipoCusto.conta_contabil_descricao
    ).join(
        TipoCusto, CustoCalculado.tipo_custo_id == TipoCusto.id
    ).where(
        CustoCalculado.cenario_id == cenario_id,
        CustoCalculado.ano == ano
    )
    
    result_custos = await db.execute(query_custos)
    custos_rows = result_custos.fetchall()
    
    # Organizar custos por CC
    custos_por_cc: dict = {}
    for row in custos_rows:
        custo = row[0]
        cc_id = custo.centro_custo_id
        if not cc_id:
            continue  # Ignorar custos sem centro de custo
        if cc_id not in custos_por_cc:
            custos_por_cc[cc_id] = []
        
        # Identificar se é custo indireto (rateado)
        memoria = custo.memoria_calculo or {}
        origem = "INDIRETO" if memoria.get("tipo") == "rateio" else "DIRETO"
        
        conta_codigo = row.conta_contabil_codigo or ""
        conta_desc = row.conta_contabil_descricao or ""
        conta_completa = f"{conta_codigo} - {conta_desc}" if conta_codigo and conta_desc else conta_codigo or conta_desc or ""
        
        custos_por_cc[cc_id].append({
            "tipo_codigo": row.tipo_codigo,
            "tipo_nome": row.tipo_nome,
            "categoria": row.tipo_categoria,
            "conta_codigo": conta_codigo,
            "conta_desc": conta_desc,
            "conta_completa": conta_completa,
            "mes": custo.mes,
            "valor": float(custo.valor_calculado or 0),
            "origem": origem,
            "origem_pool": memoria.get("grupo_nome") if origem == "INDIRETO" else None
        })
    
    # Buscar custos diretos (aluguel, etc.) - CustoDireto
    query_custos_diretos = select(
        CustoDireto,
        ProdutoTecnologia.codigo.label("item_codigo"),
        ProdutoTecnologia.nome.label("item_nome"),
        ProdutoTecnologia.categoria.label("item_categoria"),
        ProdutoTecnologia.conta_contabil_codigo,
        ProdutoTecnologia.conta_contabil_descricao
    ).join(
        ProdutoTecnologia, CustoDireto.item_custo_id == ProdutoTecnologia.id
    ).where(
        CustoDireto.cenario_id == cenario_id,
        CustoDireto.ativo == True
    )
    
    result_custos_diretos = await db.execute(query_custos_diretos)
    custos_diretos_rows = result_custos_diretos.fetchall()
    
    for row in custos_diretos_rows:
        custo_direto = row[0]
        cc_id = custo_direto.centro_custo_id
        if not cc_id:
            continue
        if cc_id not in custos_por_cc:
            custos_por_cc[cc_id] = []
        
        conta_codigo = row.conta_contabil_codigo or ""
        conta_desc = row.conta_contabil_descricao or ""
        conta_completa = f"{conta_codigo} - {conta_desc}" if conta_codigo and conta_desc else conta_codigo or conta_desc or ""
        
        # Calcular valor mensal
        valor_mensal = float(custo_direto.valor_fixo or 0)
        
        # Para variável, precisamos calcular baseado no HC/PA do CC
        if custo_direto.tipo_valor in ["VARIAVEL", "FIXO_VARIAVEL"] and custo_direto.valor_unitario_variavel:
            # Por simplicidade, usar um multiplicador médio (pode ser refinado depois)
            # TODO: Calcular baseado no HC/PA real do CC
            valor_variavel = float(custo_direto.valor_unitario_variavel or 0) * 100  # placeholder
            valor_mensal += valor_variavel
        
        # Adicionar para cada mês
        for mes in range(1, 13):
            custos_por_cc[cc_id].append({
                "tipo_codigo": f"CD_{row.item_codigo}",
                "tipo_nome": row.item_nome,
                "categoria": row.item_categoria or "CUSTO_DIRETO",
                "conta_codigo": conta_codigo,
                "conta_desc": conta_desc,
                "conta_completa": conta_completa,
                "mes": mes,
                "valor": valor_mensal,
                "origem": "DIRETO",
                "origem_pool": None
            })
    
    # Buscar custos de tecnologia - CustoTecnologia
    query_custos_tec = select(
        CustoTecnologia,
        ProdutoTecnologia.codigo.label("prod_codigo"),
        ProdutoTecnologia.nome.label("prod_nome"),
        ProdutoTecnologia.categoria.label("prod_categoria"),
        ProdutoTecnologia.conta_contabil_codigo,
        ProdutoTecnologia.conta_contabil_descricao
    ).join(
        ProdutoTecnologia, CustoTecnologia.produto_id == ProdutoTecnologia.id
    ).where(
        CustoTecnologia.cenario_id == cenario_id,
        CustoTecnologia.ano == ano
    )
    
    result_custos_tec = await db.execute(query_custos_tec)
    custos_tec_rows = result_custos_tec.fetchall()
    
    for row in custos_tec_rows:
        custo_tec = row[0]
        cc_id = custo_tec.centro_custo_id
        if not cc_id:
            continue
        if cc_id not in custos_por_cc:
            custos_por_cc[cc_id] = []
        
        conta_codigo = row.conta_contabil_codigo or ""
        conta_desc = row.conta_contabil_descricao or ""
        conta_completa = f"{conta_codigo} - {conta_desc}" if conta_codigo and conta_desc else conta_codigo or conta_desc or ""
        
        custos_por_cc[cc_id].append({
            "tipo_codigo": f"TEC_{row.prod_codigo}",
            "tipo_nome": f"{row.prod_nome} (Tecnologia)",
            "categoria": f"TECNOLOGIA_{row.prod_categoria or 'GERAL'}",
            "conta_codigo": conta_codigo,
            "conta_desc": conta_desc,
            "conta_completa": conta_completa,
            "mes": custo_tec.mes,
            "valor": float(custo_tec.valor_calculado or 0),
            "origem": "DIRETO",
            "origem_pool": None
        })
    
    # Buscar receitas por CC
    query_receitas = select(ReceitaCenario).where(
        ReceitaCenario.cenario_id == cenario_id,
        ReceitaCenario.ativo == True
    ).options(
        selectinload(ReceitaCenario.tipo_receita),
        selectinload(ReceitaCenario.centro_custo),
        selectinload(ReceitaCenario.premissas)
    )
    result_receitas = await db.execute(query_receitas)
    receitas = result_receitas.scalars().all()
    
    receitas_por_cc: dict = {}
    for receita in receitas:
        cc_id = receita.centro_custo_id
        if not cc_id:
            continue
        if cc_id not in receitas_por_cc:
            receitas_por_cc[cc_id] = []
        
        tipo_receita = receita.tipo_receita
        if not tipo_receita:
            continue
        
        conta_codigo = tipo_receita.conta_contabil_codigo or ""
        conta_desc = tipo_receita.conta_contabil_descricao or ""
        conta_completa = f"{conta_codigo} - {conta_desc}" if conta_codigo and conta_desc else conta_codigo or conta_desc or ""
        
        for mes in range(1, 13):
            try:
                resultado = await _calcular_receita_mes(receita, ano, mes, db)
                valor = resultado.valor_calculado
                receitas_por_cc[cc_id].append({
                    "tipo_codigo": f"REC_{tipo_receita.codigo}",
                    "tipo_nome": tipo_receita.nome,
                    "categoria": "RECEITA",
                    "conta_codigo": conta_codigo,
                    "conta_desc": conta_desc,
                    "conta_completa": conta_completa,
                    "mes": mes,
                    "valor": valor,
                    "origem": "DIRETO"
                })
            except:
                continue
    
    # Montar resposta por CC
    dre_centros: List[DRECentroCusto] = []
    totais_consolidado = {
        "receitas": 0.0,
        "custos_diretos": 0.0,
        "custos_indiretos": 0.0
    }
    
    for cc in centros_custo:
        # Agregar custos
        custos_cc = custos_por_cc.get(cc.id, [])
        receitas_cc = receitas_por_cc.get(cc.id, [])
        
        # Agrupar por tipo_codigo + origem
        linhas_map_diretas: dict = {}
        linhas_map_indiretas: dict = {}
        linhas_map_receitas: dict = {}
        
        for c in custos_cc:
            key = f"{c['tipo_codigo']}_{c['origem']}"
            target_map = linhas_map_indiretas if c["origem"] == "INDIRETO" else linhas_map_diretas
            
            if key not in target_map:
                target_map[key] = {
                    "conta_contabil_codigo": c["conta_codigo"],
                    "conta_contabil_descricao": c["conta_desc"],
                    "conta_contabil_completa": c["conta_completa"],
                    "tipo_custo_codigo": c["tipo_codigo"],
                    "tipo_custo_nome": c["tipo_nome"] + (f" ({c['origem_pool']})" if c.get("origem_pool") else ""),
                    "categoria": c["categoria"],
                    "origem": c["origem"],
                    "valores_mensais": [0.0] * 12,
                    "total": 0.0
                }
            target_map[key]["valores_mensais"][c["mes"] - 1] += c["valor"]
            target_map[key]["total"] += c["valor"]
        
        for r in receitas_cc:
            key = r["tipo_codigo"]
            if key not in linhas_map_receitas:
                linhas_map_receitas[key] = {
                    "conta_contabil_codigo": r["conta_codigo"],
                    "conta_contabil_descricao": r["conta_desc"],
                    "conta_contabil_completa": r["conta_completa"],
                    "tipo_custo_codigo": r["tipo_codigo"],
                    "tipo_custo_nome": r["tipo_nome"],
                    "categoria": "RECEITA",
                    "origem": "DIRETO",
                    "valores_mensais": [0.0] * 12,
                    "total": 0.0
                }
            linhas_map_receitas[key]["valores_mensais"][r["mes"] - 1] += r["valor"]
            linhas_map_receitas[key]["total"] += r["valor"]
        
        # Converter para listas
        linhas_diretas = [DRELinhaPorCC(**v) for v in linhas_map_diretas.values()]
        linhas_indiretas = [DRELinhaPorCC(**v) for v in linhas_map_indiretas.values()]
        linhas_receitas = [DRELinhaPorCC(**v) for v in linhas_map_receitas.values()]
        
        # Adicionar receitas às linhas diretas
        linhas_diretas = linhas_receitas + linhas_diretas
        
        # Calcular totais
        total_receitas = sum(l.total for l in linhas_receitas)
        total_custos_diretos = sum(v["total"] for v in linhas_map_diretas.values())
        total_custos_indiretos = sum(v["total"] for v in linhas_map_indiretas.values())
        total_custos = total_custos_diretos + total_custos_indiretos
        margem = total_receitas - total_custos
        margem_pct = (margem / total_receitas * 100) if total_receitas > 0 else 0
        
        # Acumular consolidado
        totais_consolidado["receitas"] += total_receitas
        totais_consolidado["custos_diretos"] += total_custos_diretos
        totais_consolidado["custos_indiretos"] += total_custos_indiretos
        
        dre_centros.append(DRECentroCusto(
            centro_custo_id=cc.id,
            centro_custo_codigo=cc.codigo,
            centro_custo_nome=cc.nome,
            linhas_diretas=linhas_diretas,
            linhas_indiretas=linhas_indiretas,
            total_receitas=total_receitas,
            total_custos_diretos=total_custos_diretos,
            total_custos_indiretos=total_custos_indiretos,
            total_custos=total_custos,
            margem=margem,
            margem_percentual=margem_pct
        ))
    
    # Criar consolidado
    total_custos_consolidado = totais_consolidado["custos_diretos"] + totais_consolidado["custos_indiretos"]
    margem_consolidado = totais_consolidado["receitas"] - total_custos_consolidado
    margem_pct_consolidado = (margem_consolidado / totais_consolidado["receitas"] * 100) if totais_consolidado["receitas"] > 0 else 0
    
    consolidado = DRECentroCusto(
        centro_custo_id=UUID("00000000-0000-0000-0000-000000000000"),
        centro_custo_codigo="CONSOLIDADO",
        centro_custo_nome="Consolidado",
        linhas_diretas=[],
        linhas_indiretas=[],
        total_receitas=totais_consolidado["receitas"],
        total_custos_diretos=totais_consolidado["custos_diretos"],
        total_custos_indiretos=totais_consolidado["custos_indiretos"],
        total_custos=total_custos_consolidado,
        margem=margem_consolidado,
        margem_percentual=margem_pct_consolidado
    )
    
    return DREPorCCResponse(
        cenario_id=cenario_id,
        ano=ano,
        visao="por_cc",
        centros_custo=dre_centros,
        consolidado=consolidado
    )


# ============================================
# Parâmetros de Custo
# ============================================

@router.get("/cenarios/{cenario_id}/parametros", response_model=List[ParametroCustoResponse])
async def listar_parametros_custo(
    cenario_id: UUID,
    cenario_secao_id: Optional[UUID] = Query(None, description="Filtrar por seção"),
    db: AsyncSession = Depends(get_db)
):
    """Lista parâmetros de custo de um cenário."""
    query = select(ParametroCusto).where(ParametroCusto.cenario_id == cenario_id)
    
    if cenario_secao_id:
        query = query.where(ParametroCusto.cenario_secao_id == cenario_secao_id)
    
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/cenarios/{cenario_id}/parametros", response_model=ParametroCustoResponse, status_code=status.HTTP_201_CREATED)
async def criar_parametro_custo(
    cenario_id: UUID,
    data: ParametroCustoCreate,
    db: AsyncSession = Depends(get_db)
):
    """Cria ou atualiza um parâmetro de custo."""
    # Verificar se já existe
    query = select(ParametroCusto).where(
        ParametroCusto.cenario_id == cenario_id,
        ParametroCusto.cenario_secao_id == data.cenario_secao_id,
        ParametroCusto.tipo_custo_id == data.tipo_custo_id,
        ParametroCusto.chave == data.chave
    )
    result = await db.execute(query)
    existente = result.scalar_one_or_none()
    
    if existente:
        # Atualizar
        existente.valor = data.valor
        existente.descricao = data.descricao
        await db.commit()
        await db.refresh(existente)
        return existente
    
    # Criar novo
    parametro = ParametroCusto(
        cenario_id=cenario_id,
        cenario_secao_id=data.cenario_secao_id,
        tipo_custo_id=data.tipo_custo_id,
        chave=data.chave,
        valor=data.valor,
        descricao=data.descricao
    )
    db.add(parametro)
    await db.commit()
    await db.refresh(parametro)
    return parametro


@router.delete("/cenarios/{cenario_id}/parametros/{parametro_id}", status_code=status.HTTP_204_NO_CONTENT)
async def excluir_parametro_custo(
    cenario_id: UUID,
    parametro_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Exclui um parâmetro de custo."""
    parametro = await db.get(ParametroCusto, parametro_id)
    if not parametro or parametro.cenario_id != cenario_id:
        raise HTTPException(status_code=404, detail="Parâmetro não encontrado")
    
    await db.delete(parametro)
    await db.commit()

