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
    TipoCusto, CustoCalculado, CustoTecnologia, ParametroCusto, Cenario
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

router = APIRouter(prefix="/custos", tags=["Custos"])


# Endpoint de teste simples
@router.get("/test")
async def test_endpoint():
    """Teste simples."""
    return {"status": "ok", "message": "Endpoint de custos funcionando"}


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
        quantidade = await calcular_e_salvar_custos(
            db=db,
            cenario_id=cenario_id,
            cenario_secao_id=cenario_secao_id,
            ano=ano
        )
        
        return {
            "success": True,
            "message": f"Custos calculados com sucesso",
            "quantidade": quantidade
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
    
    # Pré-calcular HC/PA por mês para custos variáveis
    # Buscar quadro de pessoal para calcular HC por mês
    MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
    
    async def calcular_hc_mes(centro_custo_id, funcao_id, mes_idx, ano_calc):
        """Calcula HC para um mês específico."""
        query = select(QuadroPessoal).where(
            QuadroPessoal.cenario_id == cenario_id,
            QuadroPessoal.ativo == True
        )
        if centro_custo_id:
            query = query.where(QuadroPessoal.centro_custo_id == centro_custo_id)
        if funcao_id:
            query = query.where(QuadroPessoal.funcao_id == funcao_id)
        
        result = await db.execute(query)
        quadros = result.scalars().all()
        
        total_hc = 0.0
        mes_key = f"qtd_{MESES[mes_idx]}"
        for q in quadros:
            # Verificar se o registro tem dados para este ano
            if hasattr(q, mes_key):
                valor = getattr(q, mes_key, 0) or 0
                total_hc += float(valor)
        
        return total_hc
    
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
                    # Buscar HC do centro de custo (ou função específica)
                    hc = await calcular_hc_mes(
                        custo.centro_custo_id if custo.tipo_medida in ["HC_TOTAL", None] else None,
                        custo.funcao_base_id if custo.tipo_medida == "HC_FUNCAO" else None,
                        mes_idx,
                        ano
                    )
                    valor_mensal = valor_unitario * hc
                elif custo.unidade_medida == "PA":
                    # PA = Posição de Atendimento (usar mesmo cálculo de HC por simplicidade)
                    pa = await calcular_hc_mes(
                        custo.centro_custo_id,
                        custo.funcao_base_id if custo.tipo_medida == "PA_FUNCAO" else None,
                        mes_idx,
                        ano
                    )
                    valor_mensal = valor_unitario * pa
                else:
                    # Unidade genérica, usar valor unitário direto
                    valor_mensal = valor_unitario
                    
            elif custo.tipo_valor == "FIXO_VARIAVEL":
                valor_fixo = float(custo.valor_fixo or 0)
                valor_unitario = float(custo.valor_unitario_variavel or 0)
                
                # Calcular componente variável
                hc = await calcular_hc_mes(
                    custo.centro_custo_id,
                    custo.funcao_base_id,
                    mes_idx,
                    ano
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

