"""
APIs CRUD para Fornecedores de Tecnologia.
"""

from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.db.models.orcamento import Fornecedor
from app.schemas.orcamento import (
    FornecedorCreate,
    FornecedorUpdate,
    FornecedorResponse,
)

router = APIRouter(prefix="/fornecedores", tags=["Fornecedores"])


@router.get("/", response_model=List[FornecedorResponse])
async def list_fornecedores(
    skip: int = 0,
    limit: int = 100,
    ativo: Optional[bool] = None,
    busca: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Lista todos os fornecedores cadastrados."""
    try:
        print(f"[DEBUG] Listando fornecedores: skip={skip}, limit={limit}, ativo={ativo}, busca={busca}")
        query = select(Fornecedor)
        
        if ativo is not None:
            query = query.where(Fornecedor.ativo == ativo)
        
        if busca:
            busca_like = f"%{busca}%"
            query = query.where(
                (Fornecedor.codigo.ilike(busca_like)) |
                (Fornecedor.nome.ilike(busca_like)) |
                (Fornecedor.nome_fantasia.ilike(busca_like)) |
                (Fornecedor.cnpj.ilike(busca_like))
            )
        
        query = query.order_by(Fornecedor.nome).offset(skip).limit(limit)
        print(f"[DEBUG] Executando query...")
        result = await db.execute(query)
        fornecedores = result.scalars().all()
        print(f"[DEBUG] Retornando {len(fornecedores)} fornecedores")
        return fornecedores
    except Exception as e:
        print(f"[ERROR] Erro ao listar fornecedores: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao listar fornecedores: {str(e)}"
        )


@router.get("/{fornecedor_id}", response_model=FornecedorResponse)
async def get_fornecedor(
    fornecedor_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Busca um fornecedor pelo ID."""
    result = await db.execute(
        select(Fornecedor).where(Fornecedor.id == fornecedor_id)
    )
    fornecedor = result.scalar_one_or_none()
    
    if not fornecedor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fornecedor não encontrado"
        )
    
    return fornecedor


@router.post("/", response_model=FornecedorResponse, status_code=status.HTTP_201_CREATED)
async def create_fornecedor(
    data: FornecedorCreate,
    db: AsyncSession = Depends(get_db)
):
    """Cria um novo fornecedor."""
    # Verificar se código já existe
    result = await db.execute(
        select(Fornecedor).where(Fornecedor.codigo == data.codigo)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Já existe um fornecedor com o código '{data.codigo}'"
        )
    
    fornecedor = Fornecedor(**data.model_dump())
    db.add(fornecedor)
    await db.commit()
    await db.refresh(fornecedor)
    
    return fornecedor


@router.put("/{fornecedor_id}", response_model=FornecedorResponse)
async def update_fornecedor(
    fornecedor_id: UUID,
    data: FornecedorUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Atualiza um fornecedor existente."""
    result = await db.execute(
        select(Fornecedor).where(Fornecedor.id == fornecedor_id)
    )
    fornecedor = result.scalar_one_or_none()
    
    if not fornecedor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fornecedor não encontrado"
        )
    
    # Verificar código duplicado
    update_data = data.model_dump(exclude_unset=True)
    if "codigo" in update_data and update_data["codigo"] != fornecedor.codigo:
        result = await db.execute(
            select(Fornecedor).where(
                Fornecedor.codigo == update_data["codigo"],
                Fornecedor.id != fornecedor_id
            )
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Já existe um fornecedor com o código '{update_data['codigo']}'"
            )
    
    # Atualizar campos
    for field, value in update_data.items():
        setattr(fornecedor, field, value)
    
    await db.commit()
    await db.refresh(fornecedor)
    
    return fornecedor


@router.delete("/{fornecedor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_fornecedor(
    fornecedor_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Exclui um fornecedor."""
    result = await db.execute(
        select(Fornecedor).where(Fornecedor.id == fornecedor_id)
    )
    fornecedor = result.scalar_one_or_none()
    
    if not fornecedor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fornecedor não encontrado"
        )
    
    await db.delete(fornecedor)
    await db.commit()

