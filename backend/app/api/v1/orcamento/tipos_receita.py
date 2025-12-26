"""
API de Tipos de Receita.
Cadastro de tipos de receita com conta contábil para DRE.
"""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db.models.orcamento import TipoReceita
from app.schemas.orcamento import (
    TipoReceitaCreate,
    TipoReceitaUpdate,
    TipoReceitaResponse,
)

router = APIRouter(prefix="/tipos-receita", tags=["Tipos de Receita"])


@router.get("", response_model=List[TipoReceitaResponse])
async def listar_tipos_receita(
    ativo: Optional[bool] = Query(None, description="Filtrar por status ativo"),
    categoria: Optional[str] = Query(None, description="Filtrar por categoria"),
    db: AsyncSession = Depends(get_db)
):
    """Lista todos os tipos de receita."""
    query = select(TipoReceita)
    
    if ativo is not None:
        query = query.where(TipoReceita.ativo == ativo)
    if categoria:
        query = query.where(TipoReceita.categoria == categoria)
    
    query = query.order_by(TipoReceita.ordem, TipoReceita.codigo)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{tipo_id}", response_model=TipoReceitaResponse)
async def obter_tipo_receita(
    tipo_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Obtém um tipo de receita por ID."""
    result = await db.execute(
        select(TipoReceita).where(TipoReceita.id == tipo_id)
    )
    tipo = result.scalar_one_or_none()
    
    if not tipo:
        raise HTTPException(status_code=404, detail="Tipo de receita não encontrado")
    
    return tipo


async def _gerar_proximo_codigo(db: AsyncSession) -> str:
    """Gera o próximo código sequencial (REC001, REC002, etc.)."""
    result = await db.execute(
        select(func.max(TipoReceita.codigo))
        .where(TipoReceita.codigo.like("REC%"))
    )
    ultimo_codigo = result.scalar_one_or_none()
    
    if ultimo_codigo:
        try:
            numero = int(ultimo_codigo[3:]) + 1
        except ValueError:
            numero = 1
    else:
        numero = 1
    
    return f"REC{numero:03d}"


@router.post("", response_model=TipoReceitaResponse, status_code=201)
async def criar_tipo_receita(
    data: TipoReceitaCreate,
    db: AsyncSession = Depends(get_db)
):
    """Cria um novo tipo de receita. Código é gerado automaticamente."""
    # Gerar código automaticamente
    codigo = await _gerar_proximo_codigo(db)
    
    # Calcular próxima ordem
    result = await db.execute(select(func.max(TipoReceita.ordem)))
    max_ordem = result.scalar_one_or_none() or 0
    
    tipo = TipoReceita(
        codigo=codigo,
        ordem=max_ordem + 1,
        **data.model_dump()
    )
    db.add(tipo)
    await db.commit()
    await db.refresh(tipo)
    
    return tipo


@router.put("/{tipo_id}", response_model=TipoReceitaResponse)
async def atualizar_tipo_receita(
    tipo_id: UUID,
    data: TipoReceitaUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Atualiza um tipo de receita. O código não pode ser alterado."""
    result = await db.execute(
        select(TipoReceita).where(TipoReceita.id == tipo_id)
    )
    tipo = result.scalar_one_or_none()
    
    if not tipo:
        raise HTTPException(status_code=404, detail="Tipo de receita não encontrado")
    
    # Atualizar campos (código não está no schema de update)
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(tipo, field, value)
    
    await db.commit()
    await db.refresh(tipo)
    
    return tipo


@router.delete("/{tipo_id}", status_code=204)
async def excluir_tipo_receita(
    tipo_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Exclui um tipo de receita permanentemente."""
    result = await db.execute(
        select(TipoReceita).where(TipoReceita.id == tipo_id)
    )
    tipo = result.scalar_one_or_none()
    
    if not tipo:
        raise HTTPException(status_code=404, detail="Tipo de receita não encontrado")
    
    await db.delete(tipo)
    await db.commit()

