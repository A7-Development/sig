"""
Módulo de Orçamento - APIs
"""
from fastapi import APIRouter

from .totvs import router as totvs_router
from .departamentos import router as departamentos_router
from .secoes import router as secoes_router
from .centros_custo import router as centros_custo_router
from .feriados import router as feriados_router

router = APIRouter(prefix="/orcamento", tags=["Orçamento"])

# Incluir sub-routers
router.include_router(totvs_router)
router.include_router(departamentos_router)
router.include_router(secoes_router)
router.include_router(centros_custo_router)
router.include_router(feriados_router)

