"""
APIs CRUD para Feriados.
"""

from uuid import UUID
from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, extract

from app.db.session import get_db
from app.db.models import Feriado
from app.schemas.orcamento import (
    FeriadoCreate,
    FeriadoUpdate,
    FeriadoResponse,
)

router = APIRouter(prefix="/feriados", tags=["Feriados"])


@router.get("/", response_model=List[FeriadoResponse])
async def list_feriados(
    skip: int = 0,
    limit: int = 100,
    ano: Optional[int] = None,
    mes: Optional[int] = None,
    tipo: Optional[str] = None,
    uf: Optional[str] = None,
    cidade: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Lista todos os feriados com filtros opcionais."""
    query = select(Feriado)
    
    if ano:
        query = query.where(extract('year', Feriado.data) == ano)
    
    if mes:
        query = query.where(extract('month', Feriado.data) == mes)
    
    if tipo:
        query = query.where(Feriado.tipo == tipo)
    
    if uf:
        query = query.where(
            (Feriado.tipo == "NACIONAL") |
            (Feriado.uf == uf)
        )
    
    if cidade:
        query = query.where(
            (Feriado.tipo == "NACIONAL") |
            (Feriado.tipo == "ESTADUAL") |
            (Feriado.cidade == cidade)
        )
    
    query = query.order_by(Feriado.data).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/por-ano/{ano}", response_model=List[FeriadoResponse])
async def list_feriados_ano(
    ano: int,
    uf: Optional[str] = None,
    cidade: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Lista feriados de um ano específico.
    Inclui feriados recorrentes automaticamente.
    """
    query = select(Feriado).where(
        (extract('year', Feriado.data) == ano) |
        (Feriado.recorrente == True)
    )
    
    if uf:
        query = query.where(
            (Feriado.tipo == "NACIONAL") |
            (Feriado.uf == uf)
        )
    
    if cidade:
        query = query.where(
            (Feriado.tipo == "NACIONAL") |
            (Feriado.tipo == "ESTADUAL") |
            (Feriado.cidade == cidade)
        )
    
    query = query.order_by(Feriado.data)
    result = await db.execute(query)
    
    feriados = result.scalars().all()
    
    # Ajustar ano dos feriados recorrentes para o ano solicitado
    resultado = []
    for f in feriados:
        if f.recorrente and f.data.year != ano:
            # Criar cópia com ano ajustado
            resultado.append(FeriadoResponse(
                id=f.id,
                data=date(ano, f.data.month, f.data.day),
                nome=f.nome,
                tipo=f.tipo,
                uf=f.uf,
                cidade=f.cidade,
                recorrente=f.recorrente,
                created_at=f.created_at
            ))
        else:
            resultado.append(f)
    
    return sorted(resultado, key=lambda x: x.data)


@router.get("/{feriado_id}", response_model=FeriadoResponse)
async def get_feriado(
    feriado_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Busca feriado por ID."""
    result = await db.execute(
        select(Feriado).where(Feriado.id == feriado_id)
    )
    feriado = result.scalar_one_or_none()
    
    if not feriado:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feriado não encontrado"
        )
    
    return feriado


@router.post("/", response_model=FeriadoResponse, status_code=status.HTTP_201_CREATED)
async def create_feriado(
    data: FeriadoCreate,
    db: AsyncSession = Depends(get_db)
):
    """Cria novo feriado."""
    # Validar tipo vs campos
    if data.tipo == "ESTADUAL" and not data.uf:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Feriado estadual requer UF"
        )
    
    if data.tipo == "MUNICIPAL" and (not data.uf or not data.cidade):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Feriado municipal requer UF e cidade"
        )
    
    # Verificar duplicidade
    query = select(Feriado).where(
        Feriado.data == data.data,
        Feriado.tipo == data.tipo
    )
    if data.uf:
        query = query.where(Feriado.uf == data.uf)
    if data.cidade:
        query = query.where(Feriado.cidade == data.cidade)
    
    result = await db.execute(query)
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Feriado já cadastrado para esta data/localidade"
        )
    
    feriado = Feriado(**data.model_dump())
    db.add(feriado)
    await db.commit()
    await db.refresh(feriado)
    
    return feriado


@router.put("/{feriado_id}", response_model=FeriadoResponse)
async def update_feriado(
    feriado_id: UUID,
    data: FeriadoUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Atualiza feriado."""
    result = await db.execute(
        select(Feriado).where(Feriado.id == feriado_id)
    )
    feriado = result.scalar_one_or_none()
    
    if not feriado:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feriado não encontrado"
        )
    
    # Atualizar campos
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(feriado, field, value)
    
    await db.commit()
    await db.refresh(feriado)
    
    return feriado


@router.delete("/{feriado_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_feriado(
    feriado_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Exclui feriado."""
    result = await db.execute(
        select(Feriado).where(Feriado.id == feriado_id)
    )
    feriado = result.scalar_one_or_none()
    
    if not feriado:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feriado não encontrado"
        )
    
    await db.delete(feriado)
    await db.commit()


@router.post("/gerar-nacionais/{ano}", response_model=List[FeriadoResponse])
async def gerar_feriados_nacionais(
    ano: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Gera os feriados nacionais fixos para um ano.
    Feriados móveis (Carnaval, Páscoa, Corpus Christi) precisam ser adicionados manualmente.
    """
    feriados_fixos = [
        (date(ano, 1, 1), "Confraternização Universal"),
        (date(ano, 4, 21), "Tiradentes"),
        (date(ano, 5, 1), "Dia do Trabalho"),
        (date(ano, 9, 7), "Independência do Brasil"),
        (date(ano, 10, 12), "Nossa Senhora Aparecida"),
        (date(ano, 11, 2), "Finados"),
        (date(ano, 11, 15), "Proclamação da República"),
        (date(ano, 12, 25), "Natal"),
    ]
    
    criados = []
    for data_feriado, nome in feriados_fixos:
        # Verificar se já existe
        result = await db.execute(
            select(Feriado).where(
                Feriado.data == data_feriado,
                Feriado.tipo == "NACIONAL"
            )
        )
        if result.scalar_one_or_none():
            continue
        
        feriado = Feriado(
            data=data_feriado,
            nome=nome,
            tipo="NACIONAL",
            recorrente=True
        )
        db.add(feriado)
        criados.append(feriado)
    
    await db.commit()
    
    for f in criados:
        await db.refresh(f)
    
    return criados

