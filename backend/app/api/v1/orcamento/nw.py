"""
APIs de consulta ao NW (PostgreSQL).
ATENÇÃO: Todas as rotas são SOMENTE LEITURA (GET) no NW.
A importação ESCREVE apenas no banco SIG.
"""

from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.db.models.orcamento import Empresa
from app.schemas.orcamento import ImportacaoTotvs, ImportacaoResultado
from app.services.nw import (
    listar_empresas_nw,
    buscar_empresa_nw_por_codigo,
    EmpresaNW,
)

router = APIRouter(prefix="/nw", tags=["NW - Consulta"])


@router.get("/empresas", response_model=List[EmpresaNW])
async def get_empresas_nw(
    busca: Optional[str] = Query(None, description="Filtrar por nome ou código"),
    apenas_ativas: bool = Query(True, description="Apenas empresas ativas")
):
    """
    Lista empresas do NW.
    SOMENTE LEITURA - não modifica dados no NW.
    """
    try:
        return listar_empresas_nw(apenas_ativas=apenas_ativas, busca=busca)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao consultar NW: {str(e)}"
        )


@router.get("/empresas/{codigo}", response_model=EmpresaNW)
async def get_empresa_nw(codigo: str):
    """
    Busca uma empresa específica pelo código no NW.
    SOMENTE LEITURA.
    """
    try:
        empresa = buscar_empresa_nw_por_codigo(codigo)
        if not empresa:
            raise HTTPException(
                status_code=404,
                detail="Empresa não encontrada no NW"
            )
        return empresa
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao consultar NW: {str(e)}"
        )


@router.post("/empresas/importar", response_model=ImportacaoResultado)
async def importar_empresas_nw(
    dados: ImportacaoTotvs,
    db: AsyncSession = Depends(get_db)
):
    """
    Importa empresas selecionadas do NW para o SIG.
    LÊ do NW (somente leitura) e ESCREVE no SIG.
    """
    importados = 0
    ignorados = 0
    erros = []
    
    for codigo in dados.codigos:
        try:
            # Verificar se já existe no SIG
            result = await db.execute(
                select(Empresa).where(
                    (Empresa.codigo == codigo)
                )
            )
            if result.scalar_one_or_none():
                ignorados += 1
                continue
            
            # Buscar dados do NW
            empresa_nw = buscar_empresa_nw_por_codigo(codigo)
            if not empresa_nw:
                erros.append(f"Empresa {codigo} não encontrada no NW")
                continue
            
            # Criar nova empresa no SIG
            nova_empresa = Empresa(
                codigo=empresa_nw.codigo,
                razao_social=empresa_nw.razao_social,
                nome_fantasia=empresa_nw.nome_fantasia,
                cnpj=empresa_nw.cnpj,
                ativo=True
            )
            db.add(nova_empresa)
            importados += 1
            
        except Exception as e:
            erros.append(f"Erro ao importar {codigo}: {str(e)}")
    
    await db.commit()
    
    return ImportacaoResultado(
        importados=importados,
        ignorados=ignorados,
        erros=erros
    )




