"""
APIs de consulta ao TOTVS (CORPORERM).
ATENÇÃO: Todas as rotas são SOMENTE LEITURA (GET).
"""

from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query

from app.services.corporerm import (
    listar_funcoes,
    listar_departamentos,
    listar_secoes,
    listar_centros_custo,
    buscar_funcao_por_codigo,
    FuncaoTotvs,
    DepartamentoTotvs,
    SecaoTotvs,
    CentroCustoTotvs,
)

router = APIRouter(prefix="/totvs", tags=["TOTVS - Consulta"])


@router.get("/funcoes", response_model=List[FuncaoTotvs])
async def get_funcoes_totvs(
    busca: Optional[str] = Query(None, description="Filtrar por nome ou código"),
    apenas_ativas: bool = Query(True, description="Apenas funções ativas")
):
    """
    Lista funções/cargos do TOTVS (PFUNCAO).
    SOMENTE LEITURA - não modifica dados no CORPORERM.
    """
    try:
        return listar_funcoes(apenas_ativas=apenas_ativas, busca=busca)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao consultar TOTVS: {str(e)}"
        )


@router.get("/funcoes/{codigo}", response_model=FuncaoTotvs)
async def get_funcao_totvs(codigo: str):
    """
    Busca uma função específica pelo código.
    SOMENTE LEITURA.
    """
    try:
        funcao = buscar_funcao_por_codigo(codigo)
        if not funcao:
            raise HTTPException(
                status_code=404,
                detail="Função não encontrada no TOTVS"
            )
        return funcao
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao consultar TOTVS: {str(e)}"
        )


@router.get("/departamentos", response_model=List[DepartamentoTotvs])
async def get_departamentos_totvs(
    busca: Optional[str] = Query(None, description="Filtrar por nome ou código"),
    apenas_ativos: bool = Query(True, description="Apenas departamentos ativos")
):
    """
    Lista departamentos do TOTVS (GDEPTO).
    SOMENTE LEITURA.
    """
    try:
        return listar_departamentos(apenas_ativos=apenas_ativos, busca=busca)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao consultar TOTVS: {str(e)}"
        )


@router.get("/secoes", response_model=List[SecaoTotvs])
async def get_secoes_totvs(
    busca: Optional[str] = Query(None, description="Filtrar por descrição ou código"),
    apenas_ativas: bool = Query(True, description="Apenas seções ativas"),
    codigo_depto: Optional[str] = Query(None, description="Filtrar por departamento")
):
    """
    Lista seções do TOTVS (PSECAO).
    SOMENTE LEITURA.
    """
    try:
        return listar_secoes(
            apenas_ativas=apenas_ativas,
            busca=busca,
            codigo_depto=codigo_depto
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao consultar TOTVS: {str(e)}"
        )


@router.get("/centros-custo", response_model=List[CentroCustoTotvs])
async def get_centros_custo_totvs(
    busca: Optional[str] = Query(None, description="Filtrar por nome ou código"),
    apenas_ativos: bool = Query(True, description="Apenas centros de custo ativos")
):
    """
    Lista centros de custo do TOTVS (PCCUSTO).
    SOMENTE LEITURA.
    """
    try:
        return listar_centros_custo(apenas_ativos=apenas_ativos, busca=busca)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao consultar TOTVS: {str(e)}"
        )

