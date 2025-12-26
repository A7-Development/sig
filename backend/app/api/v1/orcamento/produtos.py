"""
APIs CRUD para Produtos de Tecnologia.
"""

from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.session import get_db
from app.db.models.orcamento import ProdutoTecnologia, Fornecedor
from app.schemas.orcamento import (
    ProdutoTecnologiaCreate,
    ProdutoTecnologiaUpdate,
    ProdutoTecnologiaResponse,
)

router = APIRouter(prefix="/produtos", tags=["Produtos de Tecnologia"])


async def gerar_codigo_produto(db: AsyncSession, categoria: str) -> str:
    """Gera código automático sequencial baseado na categoria."""
    # Prefixos por categoria
    prefixos = {
        "DISCADOR": "DISC",
        "URA": "URA",
        "AGENTE_VIRTUAL": "AV",
        "QUALIDADE": "QUAL",
        "AUTOMACAO": "AUTO",
        "CRM": "CRM",
        "ANALYTICS": "ANLT",
        "OUTROS": "PROD"
    }
    
    prefixo = prefixos.get(categoria, "PROD")
    
    # Buscar último código com esse prefixo
    result = await db.execute(
        select(ProdutoTecnologia.codigo)
        .where(ProdutoTecnologia.codigo.like(f"{prefixo}-%"))
        .order_by(ProdutoTecnologia.codigo.desc())
        .limit(1)
    )
    ultimo_codigo = result.scalar_one_or_none()
    
    if ultimo_codigo:
        # Extrair número e incrementar
        try:
            numero = int(ultimo_codigo.split('-')[1])
            novo_numero = numero + 1
        except:
            novo_numero = 1
    else:
        novo_numero = 1
    
    return f"{prefixo}-{novo_numero:03d}"


@router.get("/", response_model=List[ProdutoTecnologiaResponse])
async def list_produtos(
    skip: int = 0,
    limit: int = 100,
    ativo: Optional[bool] = None,
    fornecedor_id: Optional[UUID] = None,
    categoria: Optional[str] = None,
    busca: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Lista todos os produtos de tecnologia cadastrados."""
    query = select(ProdutoTecnologia)
    
    if ativo is not None:
        query = query.where(ProdutoTecnologia.ativo == ativo)
    
    if fornecedor_id:
        query = query.where(ProdutoTecnologia.fornecedor_id == fornecedor_id)
    
    if categoria:
        query = query.where(ProdutoTecnologia.categoria == categoria)
    
    if busca:
        busca_like = f"%{busca}%"
        query = query.where(
            (ProdutoTecnologia.codigo.ilike(busca_like)) |
            (ProdutoTecnologia.nome.ilike(busca_like)) |
            (ProdutoTecnologia.descricao.ilike(busca_like))
        )
    
    query = query.order_by(ProdutoTecnologia.nome).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{produto_id}", response_model=ProdutoTecnologiaResponse)
async def get_produto(
    produto_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Busca um produto pelo ID."""
    result = await db.execute(
        select(ProdutoTecnologia).where(ProdutoTecnologia.id == produto_id)
    )
    produto = result.scalar_one_or_none()
    
    if not produto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produto não encontrado"
        )
    
    return produto


@router.post("/", response_model=ProdutoTecnologiaResponse, status_code=status.HTTP_201_CREATED)
async def create_produto(
    data: ProdutoTecnologiaCreate,
    db: AsyncSession = Depends(get_db)
):
    """Cria um novo produto de tecnologia."""
    try:
        print(f"[DEBUG] ===== CRIAR PRODUTO =====")
        print(f"[DEBUG] Recebido data: {data}")
        print(f"[DEBUG] Recebido data.model_dump(): {data.model_dump()}")
        print(f"[DEBUG] data.codigo = '{data.codigo}'")
        print(f"[DEBUG] data.categoria = '{data.categoria}'")
        
        # Gerar código automático se não fornecido, vazio ou "AUTO"
        if not data.codigo or not data.codigo.strip() or data.codigo.strip().upper() == "AUTO":
            print(f"[DEBUG] Gerando código automático...")
            codigo = await gerar_codigo_produto(db, data.categoria)
            print(f"[DEBUG] Código gerado: {codigo}")
        else:
            codigo = data.codigo.strip()
            print(f"[DEBUG] Código fornecido: {codigo}")
    except Exception as e:
        print(f"[ERROR] Erro ao processar criação de produto: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise
    
    # Verificar se código já existe
    result = await db.execute(
        select(ProdutoTecnologia).where(ProdutoTecnologia.codigo == codigo)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Já existe um produto com o código '{codigo}'"
        )
    
    # Verificar se fornecedor existe
    result = await db.execute(
        select(Fornecedor).where(Fornecedor.id == data.fornecedor_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fornecedor não encontrado"
        )
    
    # Criar produto com código gerado
    produto_dict = data.model_dump()
    produto_dict['codigo'] = codigo
    produto = ProdutoTecnologia(**produto_dict)
    db.add(produto)
    await db.commit()
    await db.refresh(produto)
    
    return produto


@router.put("/{produto_id}", response_model=ProdutoTecnologiaResponse)
async def update_produto(
    produto_id: UUID,
    data: ProdutoTecnologiaUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Atualiza um produto existente."""
    result = await db.execute(
        select(ProdutoTecnologia).where(ProdutoTecnologia.id == produto_id)
    )
    produto = result.scalar_one_or_none()
    
    if not produto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produto não encontrado"
        )
    
    # Verificar código duplicado
    update_data = data.model_dump(exclude_unset=True)
    if "codigo" in update_data and update_data["codigo"] != produto.codigo:
        result = await db.execute(
            select(ProdutoTecnologia).where(
                ProdutoTecnologia.codigo == update_data["codigo"],
                ProdutoTecnologia.id != produto_id
            )
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Já existe um produto com o código '{update_data['codigo']}'"
            )
    
    # Verificar fornecedor se está sendo atualizado
    if "fornecedor_id" in update_data:
        result = await db.execute(
            select(Fornecedor).where(Fornecedor.id == update_data["fornecedor_id"])
        )
        if not result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Fornecedor não encontrado"
            )
    
    # Atualizar campos
    for field, value in update_data.items():
        setattr(produto, field, value)
    
    await db.commit()
    await db.refresh(produto)
    
    return produto


@router.delete("/{produto_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_produto(
    produto_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Exclui um produto."""
    result = await db.execute(
        select(ProdutoTecnologia).where(ProdutoTecnologia.id == produto_id)
    )
    produto = result.scalar_one_or_none()
    
    if not produto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Produto não encontrado"
        )
    
    await db.delete(produto)
    await db.commit()

