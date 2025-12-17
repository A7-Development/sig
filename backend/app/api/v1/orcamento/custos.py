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
    TipoCusto, CustoCalculado, ParametroCusto, Cenario
)
from app.schemas.orcamento import (
    TipoCustoBase, TipoCustoCreate, TipoCustoUpdate, TipoCustoResponse,
    CustoCalculadoResponse, CustoCalculadoComRelacionamentos,
    ParametroCustoCreate, ParametroCustoUpdate, ParametroCustoResponse,
    DRELinha, DREResponse
)
from app.services.calculo_custos import calcular_e_salvar_custos

router = APIRouter(prefix="/custos", tags=["Custos"])


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
    query = select(TipoCusto).order_by(TipoCusto.ordem, TipoCusto.codigo)
    
    if categoria:
        query = query.where(TipoCusto.categoria == categoria)
    if ativo is not None:
        query = query.where(TipoCusto.ativo == ativo)
    
    result = await db.execute(query)
    return result.scalars().all()


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
    
    # Buscar custos agrupados por tipo e mês
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
    
    # Converter para lista de DRELinha
    linhas = []
    total_geral = 0
    for dados in rubricas_dict.values():
        linhas.append(DRELinha(**dados))
        total_geral += dados["total"]
    
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

