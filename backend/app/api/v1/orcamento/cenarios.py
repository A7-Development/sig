"""
CRUD de Cenários de Orçamento.
"""

from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.db.models.orcamento import Cenario, Premissa, QuadroPessoal
from app.schemas.orcamento import (
    CenarioCreate, CenarioUpdate, CenarioResponse, CenarioComRelacionamentos,
    PremissaCreate, PremissaUpdate, PremissaResponse,
    QuadroPessoalCreate, QuadroPessoalUpdate, QuadroPessoalResponse, QuadroPessoalComRelacionamentos
)
from app.services.calculo_custos import calcular_custos_cenario, calcular_overhead_ineficiencia

router = APIRouter(prefix="/cenarios", tags=["Cenários"])


# ============================================
# CENÁRIOS
# ============================================

@router.get("", response_model=List[CenarioComRelacionamentos])
async def list_cenarios(
    skip: int = 0,
    limit: int = 100,
    ano: Optional[int] = None,
    empresa_id: Optional[UUID] = None,
    status: Optional[str] = None,
    ativo: Optional[bool] = None,
    db: AsyncSession = Depends(get_db)
):
    """Lista todos os cenários."""
    query = select(Cenario).options(selectinload(Cenario.empresa))
    
    if ano:
        query = query.where(Cenario.ano == ano)
    if empresa_id:
        query = query.where(Cenario.empresa_id == empresa_id)
    if status:
        query = query.where(Cenario.status == status)
    if ativo is not None:
        query = query.where(Cenario.ativo == ativo)
    
    query = query.order_by(Cenario.ano.desc(), Cenario.codigo).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{cenario_id}", response_model=CenarioComRelacionamentos)
async def get_cenario(cenario_id: UUID, db: AsyncSession = Depends(get_db)):
    """Busca um cenário por ID."""
    query = select(Cenario).options(
        selectinload(Cenario.empresa),
        selectinload(Cenario.premissas),
    ).where(Cenario.id == cenario_id)
    result = await db.execute(query)
    cenario = result.scalar_one_or_none()
    
    if not cenario:
        raise HTTPException(status_code=404, detail="Cenário não encontrado")
    return cenario


@router.post("", response_model=CenarioResponse)
async def create_cenario(data: CenarioCreate, db: AsyncSession = Depends(get_db)):
    """Cria um novo cenário."""
    # Verificar se código já existe
    existing = await db.execute(select(Cenario).where(Cenario.codigo == data.codigo))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Código já existe")
    
    cenario = Cenario(**data.model_dump())
    db.add(cenario)
    await db.commit()
    await db.refresh(cenario)
    
    # Criar premissa padrão
    premissa = Premissa(cenario_id=cenario.id)
    db.add(premissa)
    await db.commit()
    
    return cenario


@router.put("/{cenario_id}", response_model=CenarioResponse)
async def update_cenario(cenario_id: UUID, data: CenarioUpdate, db: AsyncSession = Depends(get_db)):
    """Atualiza um cenário."""
    result = await db.execute(select(Cenario).where(Cenario.id == cenario_id))
    cenario = result.scalar_one_or_none()
    
    if not cenario:
        raise HTTPException(status_code=404, detail="Cenário não encontrado")
    
    if cenario.status == "BLOQUEADO":
        raise HTTPException(status_code=400, detail="Cenário bloqueado não pode ser alterado")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(cenario, key, value)
    
    await db.commit()
    await db.refresh(cenario)
    return cenario


@router.delete("/{cenario_id}")
async def delete_cenario(cenario_id: UUID, db: AsyncSession = Depends(get_db)):
    """Exclui um cenário."""
    result = await db.execute(select(Cenario).where(Cenario.id == cenario_id))
    cenario = result.scalar_one_or_none()
    
    if not cenario:
        raise HTTPException(status_code=404, detail="Cenário não encontrado")
    
    if cenario.status == "APROVADO":
        raise HTTPException(status_code=400, detail="Cenário aprovado não pode ser excluído")
    
    await db.delete(cenario)
    await db.commit()
    return {"message": "Cenário excluído com sucesso"}


@router.post("/{cenario_id}/duplicar", response_model=CenarioResponse)
async def duplicar_cenario(
    cenario_id: UUID,
    novo_codigo: str = Query(..., description="Código do novo cenário"),
    novo_nome: str = Query(..., description="Nome do novo cenário"),
    db: AsyncSession = Depends(get_db)
):
    """Duplica um cenário existente com todas as posições."""
    # Buscar cenário original
    result = await db.execute(
        select(Cenario).options(
            selectinload(Cenario.premissas),
            selectinload(Cenario.posicoes)
        ).where(Cenario.id == cenario_id)
    )
    original = result.scalar_one_or_none()
    
    if not original:
        raise HTTPException(status_code=404, detail="Cenário não encontrado")
    
    # Verificar se novo código já existe
    existing = await db.execute(select(Cenario).where(Cenario.codigo == novo_codigo))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Código já existe")
    
    # Criar novo cenário
    novo_cenario = Cenario(
        codigo=novo_codigo,
        nome=novo_nome,
        descricao=f"Cópia de {original.nome}",
        empresa_id=original.empresa_id,
        ano=original.ano,
        mes_inicio=original.mes_inicio,
        mes_fim=original.mes_fim,
        status="RASCUNHO",
        versao=1
    )
    db.add(novo_cenario)
    await db.commit()
    await db.refresh(novo_cenario)
    
    # Duplicar premissas
    for premissa_orig in original.premissas:
        nova_premissa = Premissa(
            cenario_id=novo_cenario.id,
            absenteismo=premissa_orig.absenteismo,
            turnover=premissa_orig.turnover,
            ferias_indice=premissa_orig.ferias_indice,
            dias_treinamento=premissa_orig.dias_treinamento,
            reajuste_data=premissa_orig.reajuste_data,
            reajuste_percentual=premissa_orig.reajuste_percentual,
            dissidio_mes=premissa_orig.dissidio_mes,
            dissidio_percentual=premissa_orig.dissidio_percentual
        )
        db.add(nova_premissa)
    
    # Duplicar posições
    for posicao_orig in original.posicoes:
        nova_posicao = QuadroPessoal(
            cenario_id=novo_cenario.id,
            funcao_id=posicao_orig.funcao_id,
            secao_id=posicao_orig.secao_id,
            centro_custo_id=posicao_orig.centro_custo_id,
            tabela_salarial_id=posicao_orig.tabela_salarial_id,
            regime=posicao_orig.regime,
            qtd_jan=posicao_orig.qtd_jan,
            qtd_fev=posicao_orig.qtd_fev,
            qtd_mar=posicao_orig.qtd_mar,
            qtd_abr=posicao_orig.qtd_abr,
            qtd_mai=posicao_orig.qtd_mai,
            qtd_jun=posicao_orig.qtd_jun,
            qtd_jul=posicao_orig.qtd_jul,
            qtd_ago=posicao_orig.qtd_ago,
            qtd_set=posicao_orig.qtd_set,
            qtd_out=posicao_orig.qtd_out,
            qtd_nov=posicao_orig.qtd_nov,
            qtd_dez=posicao_orig.qtd_dez,
            salario_override=posicao_orig.salario_override,
            span=posicao_orig.span,
            observacao=posicao_orig.observacao
        )
        db.add(nova_posicao)
    
    await db.commit()
    await db.refresh(novo_cenario)
    return novo_cenario


# ============================================
# PREMISSAS
# ============================================

@router.get("/{cenario_id}/premissas", response_model=List[PremissaResponse])
async def list_premissas(cenario_id: UUID, db: AsyncSession = Depends(get_db)):
    """Lista premissas de um cenário."""
    result = await db.execute(
        select(Premissa).where(Premissa.cenario_id == cenario_id)
    )
    return result.scalars().all()


@router.put("/{cenario_id}/premissas/{premissa_id}", response_model=PremissaResponse)
async def update_premissa(
    cenario_id: UUID, 
    premissa_id: UUID, 
    data: PremissaUpdate, 
    db: AsyncSession = Depends(get_db)
):
    """Atualiza uma premissa."""
    result = await db.execute(
        select(Premissa).where(
            Premissa.id == premissa_id,
            Premissa.cenario_id == cenario_id
        )
    )
    premissa = result.scalar_one_or_none()
    
    if not premissa:
        raise HTTPException(status_code=404, detail="Premissa não encontrada")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(premissa, key, value)
    
    await db.commit()
    await db.refresh(premissa)
    return premissa


# ============================================
# QUADRO DE PESSOAL
# ============================================

@router.get("/{cenario_id}/quadro", response_model=List[QuadroPessoalComRelacionamentos])
async def list_quadro_pessoal(
    cenario_id: UUID,
    funcao_id: Optional[UUID] = None,
    secao_id: Optional[UUID] = None,
    centro_custo_id: Optional[UUID] = None,
    regime: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Lista posições do quadro de pessoal de um cenário."""
    query = select(QuadroPessoal).options(
        selectinload(QuadroPessoal.funcao),
        selectinload(QuadroPessoal.secao),
        selectinload(QuadroPessoal.centro_custo)
    ).where(QuadroPessoal.cenario_id == cenario_id)
    
    if funcao_id:
        query = query.where(QuadroPessoal.funcao_id == funcao_id)
    if secao_id:
        query = query.where(QuadroPessoal.secao_id == secao_id)
    if centro_custo_id:
        query = query.where(QuadroPessoal.centro_custo_id == centro_custo_id)
    if regime:
        query = query.where(QuadroPessoal.regime == regime)
    
    query = query.where(QuadroPessoal.ativo == True).order_by(QuadroPessoal.created_at)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/{cenario_id}/quadro", response_model=QuadroPessoalResponse)
async def create_posicao(
    cenario_id: UUID,
    data: QuadroPessoalCreate,
    db: AsyncSession = Depends(get_db)
):
    """Adiciona uma posição ao quadro de pessoal."""
    # Verificar se cenário existe
    result = await db.execute(select(Cenario).where(Cenario.id == cenario_id))
    cenario = result.scalar_one_or_none()
    if not cenario:
        raise HTTPException(status_code=404, detail="Cenário não encontrado")
    
    if cenario.status == "BLOQUEADO":
        raise HTTPException(status_code=400, detail="Cenário bloqueado não pode ser alterado")
    
    posicao = QuadroPessoal(**data.model_dump())
    posicao.cenario_id = cenario_id
    db.add(posicao)
    await db.commit()
    await db.refresh(posicao)
    return posicao


@router.put("/{cenario_id}/quadro/{posicao_id}", response_model=QuadroPessoalResponse)
async def update_posicao(
    cenario_id: UUID,
    posicao_id: UUID,
    data: QuadroPessoalUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Atualiza uma posição do quadro de pessoal."""
    result = await db.execute(
        select(QuadroPessoal).where(
            QuadroPessoal.id == posicao_id,
            QuadroPessoal.cenario_id == cenario_id
        )
    )
    posicao = result.scalar_one_or_none()
    
    if not posicao:
        raise HTTPException(status_code=404, detail="Posição não encontrada")
    
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(posicao, key, value)
    
    await db.commit()
    await db.refresh(posicao)
    return posicao


@router.delete("/{cenario_id}/quadro/{posicao_id}")
async def delete_posicao(
    cenario_id: UUID,
    posicao_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Remove uma posição do quadro de pessoal."""
    result = await db.execute(
        select(QuadroPessoal).where(
            QuadroPessoal.id == posicao_id,
            QuadroPessoal.cenario_id == cenario_id
        )
    )
    posicao = result.scalar_one_or_none()
    
    if not posicao:
        raise HTTPException(status_code=404, detail="Posição não encontrada")
    
    await db.delete(posicao)
    await db.commit()
    return {"message": "Posição excluída com sucesso"}


# ============================================
# CÁLCULOS
# ============================================

@router.get("/{cenario_id}/calcular-custos")
async def get_custos_cenario(
    cenario_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Calcula os custos totais de um cenário.
    Retorna salários, benefícios, encargos e provisões por mês.
    """
    try:
        resumo = await calcular_custos_cenario(db, cenario_id)
        return resumo.to_dict()
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no cálculo: {str(e)}")


@router.get("/{cenario_id}/calcular-overhead")
async def get_overhead_cenario(
    cenario_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Calcula o overhead necessário para cobrir ineficiências.
    Considera absenteísmo, turnover e férias.
    """
    try:
        resultado = await calcular_overhead_ineficiencia(db, cenario_id)
        return resultado
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no cálculo: {str(e)}")

