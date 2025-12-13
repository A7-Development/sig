"""
APIs CRUD para Políticas de Benefício (templates).
"""

from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.db.models.orcamento import PoliticaBeneficio
from app.schemas.orcamento import (
    PoliticaBeneficioCreate,
    PoliticaBeneficioUpdate,
    PoliticaBeneficioResponse,
)

router = APIRouter(prefix="/politicas-beneficio", tags=["Políticas de Benefício"])


@router.get("/", response_model=List[PoliticaBeneficioResponse])
async def list_politicas(
    regime: Optional[str] = Query(None, description="Filtrar por regime (CLT ou PJ)"),
    ativo: Optional[bool] = Query(None, description="Filtrar por status"),
    busca: Optional[str] = Query(None, description="Buscar por nome ou código"),
    db: AsyncSession = Depends(get_db)
):
    """Lista todas as políticas de benefício."""
    query = select(PoliticaBeneficio)
    
    if regime:
        query = query.where(PoliticaBeneficio.regime == regime)
    
    if ativo is not None:
        query = query.where(PoliticaBeneficio.ativo == ativo)
    
    if busca:
        busca_like = f"%{busca}%"
        query = query.where(
            (PoliticaBeneficio.codigo.ilike(busca_like)) |
            (PoliticaBeneficio.nome.ilike(busca_like))
        )
    
    query = query.order_by(PoliticaBeneficio.regime, PoliticaBeneficio.nome)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{politica_id}", response_model=PoliticaBeneficioResponse)
async def get_politica(
    politica_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Busca uma política pelo ID."""
    result = await db.execute(
        select(PoliticaBeneficio).where(PoliticaBeneficio.id == politica_id)
    )
    politica = result.scalar_one_or_none()
    
    if not politica:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Política de benefício não encontrada"
        )
    
    return politica


@router.post("/", response_model=PoliticaBeneficioResponse, status_code=status.HTTP_201_CREATED)
async def create_politica(
    data: PoliticaBeneficioCreate,
    db: AsyncSession = Depends(get_db)
):
    """Cria uma nova política de benefício."""
    # Verificar código duplicado
    result = await db.execute(
        select(PoliticaBeneficio).where(PoliticaBeneficio.codigo == data.codigo)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Já existe uma política com o código '{data.codigo}'"
        )
    
    politica = PoliticaBeneficio(**data.model_dump())
    db.add(politica)
    await db.commit()
    await db.refresh(politica)
    
    return politica


@router.post("/gerar-padrao", response_model=List[PoliticaBeneficioResponse])
async def gerar_politicas_padrao(
    db: AsyncSession = Depends(get_db)
):
    """Gera políticas de benefício padrão."""
    # Verificar se já existem
    result = await db.execute(select(PoliticaBeneficio).limit(1))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existem políticas cadastradas"
        )
    
    politicas_padrao = [
        {
            "codigo": "OPER_6X1",
            "nome": "Operacional 6x1",
            "descricao": "Política para operadores com escala 6x1",
            "regime": "CLT",
            "escala": "6x1",
            "jornada_mensal": 180,
            "vt_dia": 12.00,
            "vt_desconto_6pct": True,
            "vr_dia": 28.00,
            "va_dia": 0,
            "plano_saude": 180.00,
            "plano_dental": 35.00,
            "seguro_vida": 0,
            "aux_creche": 400.00,
            "aux_creche_percentual": 8.00,
            "aux_home_office": 0,
            "dias_treinamento": 15,
        },
        {
            "codigo": "OPER_5X2",
            "nome": "Operacional 5x2",
            "descricao": "Política para operadores com escala 5x2",
            "regime": "CLT",
            "escala": "5x2",
            "jornada_mensal": 220,
            "vt_dia": 12.00,
            "vt_desconto_6pct": True,
            "vr_dia": 32.00,
            "va_dia": 0,
            "plano_saude": 180.00,
            "plano_dental": 35.00,
            "seguro_vida": 0,
            "aux_creche": 400.00,
            "aux_creche_percentual": 8.00,
            "aux_home_office": 0,
            "dias_treinamento": 15,
        },
        {
            "codigo": "ADMIN",
            "nome": "Administrativo",
            "descricao": "Política para funções administrativas",
            "regime": "CLT",
            "escala": "5x2",
            "jornada_mensal": 220,
            "vt_dia": 12.00,
            "vt_desconto_6pct": True,
            "vr_dia": 35.00,
            "va_dia": 0,
            "plano_saude": 350.00,
            "plano_dental": 45.00,
            "seguro_vida": 0,
            "aux_creche": 400.00,
            "aux_creche_percentual": 8.00,
            "aux_home_office": 0,
            "dias_treinamento": 10,
        },
        {
            "codigo": "GESTAO",
            "nome": "Gestão",
            "descricao": "Política para cargos de gestão (coordenadores, gerentes)",
            "regime": "CLT",
            "escala": "5x2",
            "jornada_mensal": 220,
            "vt_dia": 12.00,
            "vt_desconto_6pct": False,  # Isentos de desconto
            "vr_dia": 45.00,
            "va_dia": 0,
            "plano_saude": 650.00,
            "plano_dental": 60.00,
            "seguro_vida": 50.00,
            "aux_creche": 500.00,
            "aux_creche_percentual": 5.00,
            "aux_home_office": 0,
            "dias_treinamento": 5,
        },
        {
            "codigo": "PJ_PADRAO",
            "nome": "PJ Padrão",
            "descricao": "Política para contratações PJ (sem benefícios)",
            "regime": "PJ",
            "escala": "5x2",
            "jornada_mensal": 220,
            "vt_dia": 0,
            "vt_desconto_6pct": False,
            "vr_dia": 0,
            "va_dia": 0,
            "plano_saude": 0,
            "plano_dental": 0,
            "seguro_vida": 0,
            "aux_creche": 0,
            "aux_creche_percentual": 0,
            "aux_home_office": 0,
            "dias_treinamento": 5,
        },
    ]
    
    novas_politicas = []
    for pol_data in politicas_padrao:
        politica = PoliticaBeneficio(ativo=True, **pol_data)
        db.add(politica)
        novas_politicas.append(politica)
    
    await db.commit()
    
    for pol in novas_politicas:
        await db.refresh(pol)
    
    return novas_politicas


@router.put("/{politica_id}", response_model=PoliticaBeneficioResponse)
async def update_politica(
    politica_id: UUID,
    data: PoliticaBeneficioUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Atualiza uma política de benefício."""
    result = await db.execute(
        select(PoliticaBeneficio).where(PoliticaBeneficio.id == politica_id)
    )
    politica = result.scalar_one_or_none()
    
    if not politica:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Política de benefício não encontrada"
        )
    
    update_data = data.model_dump(exclude_unset=True)
    
    # Verificar código duplicado
    if "codigo" in update_data and update_data["codigo"] != politica.codigo:
        result = await db.execute(
            select(PoliticaBeneficio).where(
                PoliticaBeneficio.codigo == update_data["codigo"],
                PoliticaBeneficio.id != politica_id
            )
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Já existe uma política com o código '{update_data['codigo']}'"
            )
    
    for field, value in update_data.items():
        setattr(politica, field, value)
    
    await db.commit()
    await db.refresh(politica)
    
    return politica


@router.delete("/{politica_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_politica(
    politica_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Exclui uma política de benefício."""
    result = await db.execute(
        select(PoliticaBeneficio).where(PoliticaBeneficio.id == politica_id)
    )
    politica = result.scalar_one_or_none()
    
    if not politica:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Política de benefício não encontrada"
        )
    
    await db.delete(politica)
    await db.commit()




