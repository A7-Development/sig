"""
Módulo de Orçamento - APIs
"""
from fastapi import APIRouter

from .totvs import router as totvs_router
from .nw import router as nw_router
from .departamentos import router as departamentos_router
from .secoes import router as secoes_router
from .centros_custo import router as centros_custo_router
from .feriados import router as feriados_router
from .funcoes import router as funcoes_router
from .empresas import router as empresas_router
from .tributos import router as tributos_router
from .encargos import router as encargos_router
from .provisoes import router as provisoes_router
from .politicas_beneficio import router as politicas_beneficio_router
from .faixas_salariais import router as faixas_salariais_router
from .tabela_salarial import router as tabela_salarial_router
from .cenarios import router as cenarios_router
from .custos import router as custos_router

router = APIRouter(prefix="/orcamento", tags=["Orçamento"])

# Incluir sub-routers
router.include_router(totvs_router)
router.include_router(nw_router)
router.include_router(departamentos_router)
router.include_router(secoes_router)
router.include_router(centros_custo_router)
router.include_router(feriados_router)
router.include_router(funcoes_router)
router.include_router(empresas_router)
router.include_router(tributos_router)
router.include_router(encargos_router)
router.include_router(provisoes_router)
router.include_router(politicas_beneficio_router)
router.include_router(faixas_salariais_router)
router.include_router(tabela_salarial_router)
router.include_router(cenarios_router)
router.include_router(custos_router)

