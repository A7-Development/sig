"""
APIs CRUD para Encargos Trabalhistas e Tributários.
"""

from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.db.models.orcamento import Encargo, Empresa
from app.schemas.orcamento import (
    EncargoCreate,
    EncargoUpdate,
    EncargoResponse,
)

router = APIRouter(prefix="/encargos", tags=["Encargos"])


@router.get("/", response_model=List[EncargoResponse])
async def list_encargos(
    empresa_id: Optional[UUID] = Query(None, description="Filtrar por empresa"),
    regime: Optional[str] = Query(None, description="Filtrar por regime (CLT ou PJ)"),
    categoria: Optional[str] = Query(None, description="Filtrar por categoria"),
    ativo: Optional[bool] = Query(None, description="Filtrar por status"),
    db: AsyncSession = Depends(get_db)
):
    """Lista todos os encargos cadastrados."""
    query = select(Encargo)
    
    if empresa_id:
        query = query.where(Encargo.empresa_id == empresa_id)
    
    if regime:
        query = query.where(Encargo.regime == regime)
    
    if categoria:
        query = query.where(Encargo.categoria == categoria)
    
    if ativo is not None:
        query = query.where(Encargo.ativo == ativo)
    
    query = query.order_by(Encargo.regime, Encargo.ordem, Encargo.nome)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{encargo_id}", response_model=EncargoResponse)
async def get_encargo(
    encargo_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Busca um encargo pelo ID."""
    result = await db.execute(
        select(Encargo).where(Encargo.id == encargo_id)
    )
    encargo = result.scalar_one_or_none()
    
    if not encargo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Encargo não encontrado"
        )
    
    return encargo


@router.post("/", response_model=EncargoResponse, status_code=status.HTTP_201_CREATED)
async def create_encargo(
    data: EncargoCreate,
    db: AsyncSession = Depends(get_db)
):
    """Cria um novo encargo."""
    # Verificar se empresa existe
    result = await db.execute(
        select(Empresa).where(Empresa.id == data.empresa_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empresa não encontrada"
        )
    
    # Verificar se código já existe para esta empresa e regime
    result = await db.execute(
        select(Encargo).where(
            Encargo.empresa_id == data.empresa_id,
            Encargo.regime == data.regime,
            Encargo.codigo == data.codigo
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Já existe um encargo com o código '{data.codigo}' para esta empresa e regime"
        )
    
    encargo = Encargo(**data.model_dump())
    db.add(encargo)
    await db.commit()
    await db.refresh(encargo)
    
    return encargo


@router.post("/copiar/{empresa_origem_id}/{empresa_destino_id}", response_model=List[EncargoResponse])
async def copiar_encargos(
    empresa_origem_id: UUID,
    empresa_destino_id: UUID,
    regime: Optional[str] = Query(None, description="Copiar apenas um regime específico"),
    db: AsyncSession = Depends(get_db)
):
    """Copia encargos de uma empresa para outra."""
    # Verificar empresas
    for emp_id, nome in [(empresa_origem_id, "origem"), (empresa_destino_id, "destino")]:
        result = await db.execute(select(Empresa).where(Empresa.id == emp_id))
        if not result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Empresa de {nome} não encontrada"
            )
    
    # Buscar encargos da origem
    query = select(Encargo).where(Encargo.empresa_id == empresa_origem_id)
    if regime:
        query = query.where(Encargo.regime == regime)
    
    result = await db.execute(query)
    encargos_origem = result.scalars().all()
    
    # Buscar encargos existentes no destino para evitar duplicados
    result = await db.execute(
        select(Encargo).where(Encargo.empresa_id == empresa_destino_id)
    )
    encargos_destino = {(e.regime, e.codigo) for e in result.scalars().all()}
    
    novos_encargos = []
    for enc in encargos_origem:
        if (enc.regime, enc.codigo) not in encargos_destino:
            novo = Encargo(
                empresa_id=empresa_destino_id,
                regime=enc.regime,
                codigo=enc.codigo,
                nome=enc.nome,
                categoria=enc.categoria,
                aliquota=enc.aliquota,
                base_calculo=enc.base_calculo,
                ordem=enc.ordem,
                ativo=enc.ativo
            )
            db.add(novo)
            novos_encargos.append(novo)
    
    await db.commit()
    
    # Refresh para obter IDs
    for enc in novos_encargos:
        await db.refresh(enc)
    
    return novos_encargos


@router.put("/{encargo_id}", response_model=EncargoResponse)
async def update_encargo(
    encargo_id: UUID,
    data: EncargoUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Atualiza um encargo existente."""
    result = await db.execute(
        select(Encargo).where(Encargo.id == encargo_id)
    )
    encargo = result.scalar_one_or_none()
    
    if not encargo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Encargo não encontrado"
        )
    
    update_data = data.model_dump(exclude_unset=True)
    
    # Verificar código duplicado se estiver sendo alterado
    if "codigo" in update_data and update_data["codigo"] != encargo.codigo:
        empresa_id = update_data.get("empresa_id", encargo.empresa_id)
        regime = update_data.get("regime", encargo.regime)
        
        result = await db.execute(
            select(Encargo).where(
                Encargo.empresa_id == empresa_id,
                Encargo.regime == regime,
                Encargo.codigo == update_data["codigo"],
                Encargo.id != encargo_id
            )
        )
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Já existe um encargo com o código '{update_data['codigo']}' para esta empresa e regime"
            )
    
    # Atualizar campos
    for field, value in update_data.items():
        setattr(encargo, field, value)
    
    await db.commit()
    await db.refresh(encargo)
    
    return encargo


@router.delete("/{encargo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_encargo(
    encargo_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Exclui um encargo."""
    result = await db.execute(
        select(Encargo).where(Encargo.id == encargo_id)
    )
    encargo = result.scalar_one_or_none()
    
    if not encargo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Encargo não encontrado"
        )
    
    await db.delete(encargo)
    await db.commit()


@router.post("/gerar-padrao/{empresa_id}", response_model=List[EncargoResponse])
async def gerar_encargos_padrao(
    empresa_id: UUID,
    regime: str = Query("CLT", description="Regime para gerar encargos"),
    db: AsyncSession = Depends(get_db)
):
    """
    Gera encargos padrão para uma empresa.
    Útil para inicialização rápida.
    """
    # Verificar empresa
    result = await db.execute(select(Empresa).where(Empresa.id == empresa_id))
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empresa não encontrada"
        )
    
    # Verificar se já existem encargos
    result = await db.execute(
        select(Encargo).where(
            Encargo.empresa_id == empresa_id,
            Encargo.regime == regime
        )
    )
    if result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Já existem encargos cadastrados para esta empresa no regime {regime}"
        )
    
    # Encargos padrão CLT
    encargos_clt = [
        {"codigo": "INSS", "nome": "INSS Patronal", "categoria": "ENCARGO", "aliquota": 20.0, "base_calculo": "SALARIO", "ordem": 1},
        {"codigo": "FGTS", "nome": "FGTS", "categoria": "ENCARGO", "aliquota": 8.0, "base_calculo": "SALARIO", "ordem": 2},
        {"codigo": "RAT", "nome": "RAT/SAT", "categoria": "ENCARGO", "aliquota": 3.0, "base_calculo": "SALARIO", "ordem": 3},
        {"codigo": "TERCEIROS", "nome": "Sistema S (Terceiros)", "categoria": "ENCARGO", "aliquota": 5.8, "base_calculo": "SALARIO", "ordem": 4},
        {"codigo": "PIS_FOLHA", "nome": "PIS sobre Folha", "categoria": "ENCARGO", "aliquota": 1.0, "base_calculo": "SALARIO", "ordem": 5},
        {"codigo": "13_SALARIO", "nome": "13º Salário", "categoria": "PROVISAO", "aliquota": 8.33, "base_calculo": "SALARIO", "ordem": 10},
        {"codigo": "FERIAS", "nome": "Férias + 1/3", "categoria": "PROVISAO", "aliquota": 11.11, "base_calculo": "SALARIO", "ordem": 11},
        {"codigo": "ENC_13", "nome": "Encargos s/ 13º", "categoria": "PROVISAO", "aliquota": 2.98, "base_calculo": "PROVISAO", "ordem": 12},
        {"codigo": "ENC_FERIAS", "nome": "Encargos s/ Férias", "categoria": "PROVISAO", "aliquota": 3.97, "base_calculo": "PROVISAO", "ordem": 13},
    ]
    
    # Encargos padrão PJ
    encargos_pj = [
        {"codigo": "ISS", "nome": "ISS", "categoria": "IMPOSTO", "aliquota": 5.0, "base_calculo": "SALARIO", "ordem": 1},
    ]
    
    encargos_padrao = encargos_clt if regime == "CLT" else encargos_pj
    
    novos_encargos = []
    for enc_data in encargos_padrao:
        encargo = Encargo(
            empresa_id=empresa_id,
            regime=regime,
            ativo=True,
            **enc_data
        )
        db.add(encargo)
        novos_encargos.append(encargo)
    
    await db.commit()
    
    for enc in novos_encargos:
        await db.refresh(enc)
    
    return novos_encargos





