"""
Schemas do módulo de Orçamento.
"""

from datetime import datetime, date
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field


# ============================================
# Departamento
# ============================================

class DepartamentoBase(BaseModel):
    codigo: str = Field(..., min_length=1, max_length=50)
    nome: str = Field(..., min_length=1, max_length=200)
    codigo_totvs: Optional[str] = Field(None, max_length=50)
    ativo: bool = True


class DepartamentoCreate(DepartamentoBase):
    pass


class DepartamentoUpdate(BaseModel):
    codigo: Optional[str] = Field(None, min_length=1, max_length=50)
    nome: Optional[str] = Field(None, min_length=1, max_length=200)
    codigo_totvs: Optional[str] = Field(None, max_length=50)
    ativo: Optional[bool] = None


class DepartamentoResponse(DepartamentoBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DepartamentoComSecoes(DepartamentoResponse):
    secoes: List["SecaoResponse"] = []


# ============================================
# Seção
# ============================================

class SecaoBase(BaseModel):
    departamento_id: UUID
    codigo: str = Field(..., min_length=1, max_length=50)
    nome: str = Field(..., min_length=1, max_length=200)
    codigo_totvs: Optional[str] = Field(None, max_length=50)
    ativo: bool = True


class SecaoCreate(SecaoBase):
    pass


class SecaoUpdate(BaseModel):
    departamento_id: Optional[UUID] = None
    codigo: Optional[str] = Field(None, min_length=1, max_length=50)
    nome: Optional[str] = Field(None, min_length=1, max_length=200)
    codigo_totvs: Optional[str] = Field(None, max_length=50)
    ativo: Optional[bool] = None


class SecaoResponse(SecaoBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SecaoComDepartamento(SecaoResponse):
    departamento: Optional[DepartamentoResponse] = None


# ============================================
# Centro de Custo
# ============================================

class CentroCustoBase(BaseModel):
    codigo: str = Field(..., min_length=1, max_length=50)
    nome: str = Field(..., min_length=1, max_length=200)
    codigo_totvs: Optional[str] = Field(None, max_length=50)
    tipo: str = Field("OPERACIONAL", pattern="^(OPERACIONAL|ADMINISTRATIVO|OVERHEAD)$")
    cliente: Optional[str] = Field(None, max_length=200)
    contrato: Optional[str] = Field(None, max_length=100)
    uf: Optional[str] = Field(None, min_length=2, max_length=2)
    cidade: Optional[str] = Field(None, max_length=100)
    ativo: bool = True


class CentroCustoCreate(CentroCustoBase):
    pass


class CentroCustoUpdate(BaseModel):
    codigo: Optional[str] = Field(None, min_length=1, max_length=50)
    nome: Optional[str] = Field(None, min_length=1, max_length=200)
    codigo_totvs: Optional[str] = Field(None, max_length=50)
    tipo: Optional[str] = Field(None, pattern="^(OPERACIONAL|ADMINISTRATIVO|OVERHEAD)$")
    cliente: Optional[str] = Field(None, max_length=200)
    contrato: Optional[str] = Field(None, max_length=100)
    uf: Optional[str] = Field(None, min_length=2, max_length=2)
    cidade: Optional[str] = Field(None, max_length=100)
    ativo: Optional[bool] = None


class CentroCustoResponse(CentroCustoBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================
# Feriado
# ============================================

class FeriadoBase(BaseModel):
    data: date
    nome: str = Field(..., min_length=1, max_length=200)
    tipo: str = Field("NACIONAL", pattern="^(NACIONAL|ESTADUAL|MUNICIPAL)$")
    uf: Optional[str] = Field(None, min_length=2, max_length=2)
    cidade: Optional[str] = Field(None, max_length=100)
    recorrente: bool = False


class FeriadoCreate(FeriadoBase):
    pass


class FeriadoUpdate(BaseModel):
    data: Optional[date] = None
    nome: Optional[str] = Field(None, min_length=1, max_length=200)
    tipo: Optional[str] = Field(None, pattern="^(NACIONAL|ESTADUAL|MUNICIPAL)$")
    uf: Optional[str] = Field(None, min_length=2, max_length=2)
    cidade: Optional[str] = Field(None, max_length=100)
    recorrente: Optional[bool] = None


class FeriadoResponse(FeriadoBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================
# Função
# ============================================

class FuncaoBase(BaseModel):
    codigo: str = Field(..., min_length=1, max_length=50)
    nome: str = Field(..., min_length=1, max_length=200)
    codigo_totvs: Optional[str] = Field(None, max_length=50)
    cbo: Optional[str] = Field(None, max_length=20)
    ativo: bool = True


class FuncaoCreate(FuncaoBase):
    pass


class FuncaoUpdate(BaseModel):
    codigo: Optional[str] = Field(None, min_length=1, max_length=50)
    nome: Optional[str] = Field(None, min_length=1, max_length=200)
    codigo_totvs: Optional[str] = Field(None, max_length=50)
    cbo: Optional[str] = Field(None, max_length=20)
    ativo: Optional[bool] = None


class FuncaoResponse(FuncaoBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================
# Empresa
# ============================================

class EmpresaBase(BaseModel):
    codigo: str = Field(..., min_length=1, max_length=50)
    razao_social: str = Field(..., min_length=1, max_length=200)
    nome_fantasia: Optional[str] = Field(None, max_length=200)
    cnpj: Optional[str] = Field(None, max_length=20)
    ativo: bool = True


class EmpresaCreate(EmpresaBase):
    pass


class EmpresaUpdate(BaseModel):
    codigo: Optional[str] = Field(None, min_length=1, max_length=50)
    razao_social: Optional[str] = Field(None, min_length=1, max_length=200)
    nome_fantasia: Optional[str] = Field(None, max_length=200)
    cnpj: Optional[str] = Field(None, max_length=20)
    ativo: Optional[bool] = None


class EmpresaResponse(EmpresaBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================
# Tributo (sobre receita)
# ============================================

class TributoBase(BaseModel):
    empresa_id: UUID
    codigo: str = Field(..., min_length=1, max_length=50)  # PIS, COFINS, ISS, CPREV
    nome: str = Field(..., min_length=1, max_length=200)
    aliquota: float = Field(..., ge=0, le=100)
    ordem: int = 0
    ativo: bool = True


class TributoCreate(TributoBase):
    pass


class TributoUpdate(BaseModel):
    empresa_id: Optional[UUID] = None
    codigo: Optional[str] = Field(None, min_length=1, max_length=50)
    nome: Optional[str] = Field(None, min_length=1, max_length=200)
    aliquota: Optional[float] = Field(None, ge=0, le=100)
    ordem: Optional[int] = None
    ativo: Optional[bool] = None


class TributoResponse(TributoBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================
# Encargo (patronal sobre folha)
# ============================================

class EncargoBase(BaseModel):
    empresa_id: UUID
    regime: str = Field("CLT", pattern="^(CLT|PJ)$")
    codigo: str = Field(..., min_length=1, max_length=50)  # INSS_EMPRESA, INSS_TERCEIROS, SAT_RAT
    nome: str = Field(..., min_length=1, max_length=200)
    aliquota: float = Field(..., ge=0, le=100)
    base_calculo: str = Field("SALARIO", pattern="^(SALARIO|TOTAL)$")
    ordem: int = 0
    ativo: bool = True


class EncargoCreate(EncargoBase):
    pass


class EncargoUpdate(BaseModel):
    empresa_id: Optional[UUID] = None
    regime: Optional[str] = Field(None, pattern="^(CLT|PJ)$")
    codigo: Optional[str] = Field(None, min_length=1, max_length=50)
    nome: Optional[str] = Field(None, min_length=1, max_length=200)
    aliquota: Optional[float] = Field(None, ge=0, le=100)
    base_calculo: Optional[str] = Field(None, pattern="^(SALARIO|TOTAL)$")
    ordem: Optional[int] = None
    ativo: Optional[bool] = None


class EncargoResponse(EncargoBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================
# Provisão (13º, Férias, Demandas)
# ============================================

class ProvisaoBase(BaseModel):
    codigo: str = Field(..., min_length=1, max_length=50)  # 13_SALARIO, FERIAS, DEMANDAS
    nome: str = Field(..., min_length=1, max_length=200)
    descricao: Optional[str] = None
    percentual: float = Field(..., ge=0, le=100)
    incide_encargos: bool = True
    ordem: int = 0
    ativo: bool = True


class ProvisaoCreate(ProvisaoBase):
    pass


class ProvisaoUpdate(BaseModel):
    codigo: Optional[str] = Field(None, min_length=1, max_length=50)
    nome: Optional[str] = Field(None, min_length=1, max_length=200)
    descricao: Optional[str] = None
    percentual: Optional[float] = Field(None, ge=0, le=100)
    incide_encargos: Optional[bool] = None
    ordem: Optional[int] = None
    ativo: Optional[bool] = None


class ProvisaoResponse(ProvisaoBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================
# Empresa com Tributos e Encargos
# ============================================

class EmpresaComTributos(EmpresaResponse):
    tributos: List[TributoResponse] = []
    encargos: List[EncargoResponse] = []


# ============================================
# Política de Benefício
# ============================================

class PoliticaBeneficioBase(BaseModel):
    codigo: str = Field(..., min_length=1, max_length=50)
    nome: str = Field(..., min_length=1, max_length=200)
    descricao: Optional[str] = None
    regime: str = Field("CLT", pattern="^(CLT|PJ)$")
    escala: str = Field("6x1", pattern="^(5x2|6x1|12x36)$")
    jornada_mensal: int = Field(180, ge=100, le=260)
    vt_dia: float = Field(0, ge=0)
    vt_desconto_6pct: bool = True
    vr_dia: float = Field(0, ge=0)
    va_dia: float = Field(0, ge=0)
    plano_saude: float = Field(0, ge=0)
    plano_dental: float = Field(0, ge=0)
    seguro_vida: float = Field(0, ge=0)
    aux_creche: float = Field(0, ge=0)
    aux_creche_percentual: float = Field(0, ge=0, le=100)
    aux_home_office: float = Field(0, ge=0)
    dias_treinamento: int = Field(15, ge=0)
    ativo: bool = True


class PoliticaBeneficioCreate(PoliticaBeneficioBase):
    pass


class PoliticaBeneficioUpdate(BaseModel):
    codigo: Optional[str] = Field(None, min_length=1, max_length=50)
    nome: Optional[str] = Field(None, min_length=1, max_length=200)
    descricao: Optional[str] = None
    regime: Optional[str] = Field(None, pattern="^(CLT|PJ)$")
    escala: Optional[str] = Field(None, pattern="^(5x2|6x1|12x36)$")
    jornada_mensal: Optional[int] = Field(None, ge=100, le=260)
    vt_dia: Optional[float] = Field(None, ge=0)
    vt_desconto_6pct: Optional[bool] = None
    vr_dia: Optional[float] = Field(None, ge=0)
    va_dia: Optional[float] = Field(None, ge=0)
    plano_saude: Optional[float] = Field(None, ge=0)
    plano_dental: Optional[float] = Field(None, ge=0)
    seguro_vida: Optional[float] = Field(None, ge=0)
    aux_creche: Optional[float] = Field(None, ge=0)
    aux_creche_percentual: Optional[float] = Field(None, ge=0, le=100)
    aux_home_office: Optional[float] = Field(None, ge=0)
    dias_treinamento: Optional[int] = Field(None, ge=0)
    ativo: Optional[bool] = None


class PoliticaBeneficioResponse(PoliticaBeneficioBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================
# Faixa Salarial
# ============================================

class FaixaSalarialBase(BaseModel):
    codigo: str = Field(..., min_length=1, max_length=20)
    nome: str = Field(..., min_length=1, max_length=100)
    ordem: int = 0
    ativo: bool = True


class FaixaSalarialCreate(FaixaSalarialBase):
    pass


class FaixaSalarialUpdate(BaseModel):
    codigo: Optional[str] = Field(None, min_length=1, max_length=20)
    nome: Optional[str] = Field(None, min_length=1, max_length=100)
    ordem: Optional[int] = None
    ativo: Optional[bool] = None


class FaixaSalarialResponse(FaixaSalarialBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================
# Tabela Salarial
# ============================================

class TabelaSalarialBase(BaseModel):
    funcao_id: UUID
    faixa_id: Optional[UUID] = None
    politica_id: Optional[UUID] = None
    regime: str = Field("CLT", pattern="^(CLT|PJ)$")
    salario_base: float = Field(..., gt=0)
    override_vt_dia: Optional[float] = None
    override_vr_dia: Optional[float] = None
    override_plano_saude: Optional[float] = None
    ativo: bool = True


class TabelaSalarialCreate(TabelaSalarialBase):
    pass


class TabelaSalarialUpdate(BaseModel):
    funcao_id: Optional[UUID] = None
    faixa_id: Optional[UUID] = None
    politica_id: Optional[UUID] = None
    regime: Optional[str] = Field(None, pattern="^(CLT|PJ)$")
    salario_base: Optional[float] = Field(None, gt=0)
    override_vt_dia: Optional[float] = None
    override_vr_dia: Optional[float] = None
    override_plano_saude: Optional[float] = None
    ativo: Optional[bool] = None


class TabelaSalarialResponse(TabelaSalarialBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    funcao: Optional[FuncaoResponse] = None
    faixa: Optional[FaixaSalarialResponse] = None
    politica: Optional[PoliticaBeneficioResponse] = None

    class Config:
        from_attributes = True


# ============================================
# Importação do TOTVS
# ============================================

class ImportacaoTotvs(BaseModel):
    """Schema para importação de dados do TOTVS."""
    codigos: List[str] = Field(..., min_items=1, description="Lista de códigos a importar")


class ImportacaoResultado(BaseModel):
    """Resultado da importação do TOTVS."""
    importados: int
    ignorados: int
    erros: List[str] = []


# ============================================
# Cenário de Orçamento
# ============================================

class CenarioBase(BaseModel):
    codigo: str = Field(..., min_length=1, max_length=50)
    nome: str = Field(..., min_length=1, max_length=200)
    descricao: Optional[str] = None
    empresa_id: Optional[UUID] = None
    ano: int = Field(..., ge=2020, le=2100)
    mes_inicio: int = Field(1, ge=1, le=12)
    mes_fim: int = Field(12, ge=1, le=12)
    status: str = Field("RASCUNHO", pattern="^(RASCUNHO|APROVADO|BLOQUEADO)$")
    ativo: bool = True


class CenarioCreate(CenarioBase):
    pass


class CenarioUpdate(BaseModel):
    codigo: Optional[str] = Field(None, min_length=1, max_length=50)
    nome: Optional[str] = Field(None, min_length=1, max_length=200)
    descricao: Optional[str] = None
    empresa_id: Optional[UUID] = None
    ano: Optional[int] = Field(None, ge=2020, le=2100)
    mes_inicio: Optional[int] = Field(None, ge=1, le=12)
    mes_fim: Optional[int] = Field(None, ge=1, le=12)
    status: Optional[str] = None
    ativo: Optional[bool] = None


class CenarioResponse(CenarioBase):
    id: UUID
    versao: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class EmpresaSimples(BaseModel):
    id: UUID
    codigo: str
    razao_social: str
    nome_fantasia: Optional[str] = None

    class Config:
        from_attributes = True


class CenarioComRelacionamentos(CenarioResponse):
    empresa: Optional[EmpresaSimples] = None


# ============================================
# Premissa
# ============================================

class PremissaBase(BaseModel):
    cenario_id: UUID
    absenteismo: float = Field(3.0, ge=0, le=100)
    turnover: float = Field(5.0, ge=0, le=100)
    ferias_indice: float = Field(8.33, ge=0, le=100)
    dias_treinamento: int = Field(15, ge=0, le=180)
    reajuste_data: Optional[date] = None
    reajuste_percentual: float = Field(0, ge=0, le=100)
    dissidio_mes: Optional[int] = Field(None, ge=1, le=12)
    dissidio_percentual: float = Field(0, ge=0, le=100)


class PremissaCreate(PremissaBase):
    pass


class PremissaUpdate(BaseModel):
    absenteismo: Optional[float] = Field(None, ge=0, le=100)
    turnover: Optional[float] = Field(None, ge=0, le=100)
    ferias_indice: Optional[float] = Field(None, ge=0, le=100)
    dias_treinamento: Optional[int] = Field(None, ge=0, le=180)
    reajuste_data: Optional[date] = None
    reajuste_percentual: Optional[float] = Field(None, ge=0, le=100)
    dissidio_mes: Optional[int] = Field(None, ge=1, le=12)
    dissidio_percentual: Optional[float] = Field(None, ge=0, le=100)


class PremissaResponse(PremissaBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================
# Quadro de Pessoal
# ============================================

class QuadroPessoalBase(BaseModel):
    cenario_id: UUID
    funcao_id: UUID
    secao_id: Optional[UUID] = None
    centro_custo_id: Optional[UUID] = None
    tabela_salarial_id: Optional[UUID] = None
    regime: str = Field("CLT", pattern="^(CLT|PJ)$")
    
    # Quantidades mensais
    qtd_jan: int = Field(0, ge=0)
    qtd_fev: int = Field(0, ge=0)
    qtd_mar: int = Field(0, ge=0)
    qtd_abr: int = Field(0, ge=0)
    qtd_mai: int = Field(0, ge=0)
    qtd_jun: int = Field(0, ge=0)
    qtd_jul: int = Field(0, ge=0)
    qtd_ago: int = Field(0, ge=0)
    qtd_set: int = Field(0, ge=0)
    qtd_out: int = Field(0, ge=0)
    qtd_nov: int = Field(0, ge=0)
    qtd_dez: int = Field(0, ge=0)
    
    salario_override: Optional[float] = None
    span: Optional[int] = None
    observacao: Optional[str] = None
    ativo: bool = True


class QuadroPessoalCreate(QuadroPessoalBase):
    pass


class QuadroPessoalUpdate(BaseModel):
    funcao_id: Optional[UUID] = None
    secao_id: Optional[UUID] = None
    centro_custo_id: Optional[UUID] = None
    tabela_salarial_id: Optional[UUID] = None
    regime: Optional[str] = None
    
    qtd_jan: Optional[int] = Field(None, ge=0)
    qtd_fev: Optional[int] = Field(None, ge=0)
    qtd_mar: Optional[int] = Field(None, ge=0)
    qtd_abr: Optional[int] = Field(None, ge=0)
    qtd_mai: Optional[int] = Field(None, ge=0)
    qtd_jun: Optional[int] = Field(None, ge=0)
    qtd_jul: Optional[int] = Field(None, ge=0)
    qtd_ago: Optional[int] = Field(None, ge=0)
    qtd_set: Optional[int] = Field(None, ge=0)
    qtd_out: Optional[int] = Field(None, ge=0)
    qtd_nov: Optional[int] = Field(None, ge=0)
    qtd_dez: Optional[int] = Field(None, ge=0)
    
    salario_override: Optional[float] = None
    span: Optional[int] = None
    observacao: Optional[str] = None
    ativo: Optional[bool] = None


class FuncaoSimples(BaseModel):
    id: UUID
    codigo: str
    nome: str

    class Config:
        from_attributes = True


class SecaoSimples(BaseModel):
    id: UUID
    codigo: str
    nome: str

    class Config:
        from_attributes = True


class CentroCustoSimples(BaseModel):
    id: UUID
    codigo: str
    nome: str

    class Config:
        from_attributes = True


class QuadroPessoalResponse(QuadroPessoalBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class QuadroPessoalComRelacionamentos(QuadroPessoalResponse):
    funcao: Optional[FuncaoSimples] = None
    secao: Optional[SecaoSimples] = None
    centro_custo: Optional[CentroCustoSimples] = None


# Atualizar forward references
DepartamentoComSecoes.model_rebuild()

