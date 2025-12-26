"""
Schemas do mÃ³dulo de OrÃ§amento.
"""

from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field, field_validator


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
# SeÃ§Ã£o
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
# FunÃ§Ã£o
# ============================================

class FuncaoBase(BaseModel):
    codigo: str = Field(..., min_length=1, max_length=50)
    nome: str = Field(..., min_length=1, max_length=200)
    codigo_totvs: Optional[str] = Field(None, max_length=50)
    cbo: Optional[str] = Field(None, max_length=20)
    jornada_mensal: int = Field(180, ge=1, le=300, description="Horas/mês (180 ou 220)")
    is_home_office: bool = Field(False, description="Se função é home office")
    is_pj: bool = Field(False, description="Se função é PJ")
    ativo: bool = True


class FuncaoCreate(FuncaoBase):
    pass


class FuncaoUpdate(BaseModel):
    codigo: Optional[str] = Field(None, min_length=1, max_length=50)
    nome: Optional[str] = Field(None, min_length=1, max_length=200)
    codigo_totvs: Optional[str] = Field(None, max_length=50)
    cbo: Optional[str] = Field(None, max_length=20)
    jornada_mensal: Optional[int] = Field(None, ge=1, le=300)
    is_home_office: Optional[bool] = None
    is_pj: Optional[bool] = None
    ativo: Optional[bool] = None


class FuncaoResponse(FuncaoBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================
# Fornecedor
# ============================================

class FornecedorBase(BaseModel):
    codigo: str = Field(..., min_length=1, max_length=50)
    nome: str = Field(..., min_length=1, max_length=200)
    codigo_nw: Optional[str] = Field(None, max_length=50)
    nome_fantasia: Optional[str] = Field(None, max_length=200)
    cnpj: Optional[str] = Field(None, max_length=20)
    contato_nome: Optional[str] = Field(None, max_length=200)
    contato_email: Optional[str] = Field(None, max_length=200)
    contato_telefone: Optional[str] = Field(None, max_length=50)
    observacao: Optional[str] = None
    ativo: bool = True


class FornecedorCreate(FornecedorBase):
    pass


class FornecedorUpdate(BaseModel):
    codigo: Optional[str] = Field(None, min_length=1, max_length=50)
    nome: Optional[str] = Field(None, min_length=1, max_length=200)
    codigo_nw: Optional[str] = Field(None, max_length=50)
    nome_fantasia: Optional[str] = Field(None, max_length=200)
    cnpj: Optional[str] = Field(None, max_length=20)
    contato_nome: Optional[str] = Field(None, max_length=200)
    contato_email: Optional[str] = Field(None, max_length=200)
    contato_telefone: Optional[str] = Field(None, max_length=50)
    observacao: Optional[str] = None
    ativo: Optional[bool] = None


class FornecedorResponse(FornecedorBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================
# Produto de Tecnologia
# ============================================

class ProdutoTecnologiaBase(BaseModel):
    fornecedor_id: UUID
    codigo: str = Field(..., min_length=1, max_length=50)
    nome: str = Field(..., min_length=1, max_length=200)
    categoria: str = Field(..., max_length=50, description="DISCADOR, URA, AGENTE_VIRTUAL, AUTOMACAO, QUALIDADE, etc")
    tipo_precificacao: Optional[str] = Field(None, max_length=30, description="POR_PA, POR_LICENCA, FIXO, etc")
    valor_unitario: Optional[float] = Field(None, ge=0, description="Valor unitário")
    valor_base: Optional[float] = Field(None, ge=0, description="Valor base/tabela do fornecedor (referência)")
    unidade_medida: Optional[str] = Field(None, max_length=30)
    conta_contabil_id: Optional[UUID] = None
    descricao: Optional[str] = None
    ativo: bool = True


class ProdutoTecnologiaCreate(BaseModel):
    fornecedor_id: UUID
    codigo: Optional[str] = Field(None, max_length=50, description="Código do produto (deixe vazio para gerar automaticamente)")
    nome: str = Field(..., min_length=1, max_length=200)
    categoria: str = Field(..., max_length=50)
    tipo_precificacao: Optional[str] = Field(None, max_length=30)
    valor_unitario: Optional[float] = Field(None, ge=0)
    valor_base: Optional[float] = Field(None, ge=0)
    unidade_medida: Optional[str] = Field(None, max_length=30)
    conta_contabil_id: Optional[UUID] = None
    descricao: Optional[str] = None
    ativo: bool = True


class ProdutoTecnologiaUpdate(BaseModel):
    fornecedor_id: Optional[UUID] = None
    codigo: Optional[str] = Field(None, min_length=1, max_length=50)
    nome: Optional[str] = Field(None, min_length=1, max_length=200)
    categoria: Optional[str] = Field(None, max_length=50)
    tipo_precificacao: Optional[str] = Field(None, max_length=30)
    valor_unitario: Optional[float] = Field(None, ge=0)
    unidade_medida: Optional[str] = Field(None, max_length=30)
    conta_contabil_id: Optional[UUID] = None
    descricao: Optional[str] = None
    ativo: Optional[bool] = None


class ProdutoTecnologiaResponse(ProdutoTecnologiaBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    fornecedor: Optional["FornecedorResponse"] = None

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
# ProvisÃ£o (13Âº, FÃ©rias, Demandas)
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
# PolÃ­tica de BenefÃ­cio
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
    # Descontos de benefícios
    pct_desconto_vt: float = Field(6.0, ge=0, le=100, description="% desconto VT sobre salário")
    pct_desconto_vr: float = Field(0, ge=0, le=100, description="% desconto VR sobre benefício")
    pct_desconto_am: float = Field(0, ge=0, le=100, description="% desconto AM sobre benefício")
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
    pct_desconto_vt: Optional[float] = Field(None, ge=0, le=100)
    pct_desconto_vr: Optional[float] = Field(None, ge=0, le=100)
    pct_desconto_am: Optional[float] = Field(None, ge=0, le=100)
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
# ImportaÃ§Ã£o do TOTVS
# ============================================

class ImportacaoTotvs(BaseModel):
    """Schema para importaÃ§Ã£o de dados do TOTVS."""
    codigos: List[str] = Field(..., min_items=1, description="Lista de cÃ³digos a importar")


class ImportacaoResultado(BaseModel):
    """Resultado da importaÃ§Ã£o do TOTVS."""
    importados: int
    ignorados: int
    erros: List[str] = []


# ============================================
# Cliente NW
# ============================================

class ClienteNW(BaseModel):
    """Cliente do banco NW (tabela clifor)."""
    codigo: str
    razao_social: str
    nome_fantasia: Optional[str] = None
    cnpj: Optional[str] = None

    class Config:
        from_attributes = True


class FornecedorNW(BaseModel):
    """Fornecedor do banco NW (tabela clifor WHERE fornec = 'S')."""
    codigo: str
    razao_social: str
    nome_fantasia: Optional[str] = None
    cnpj: Optional[str] = None

    class Config:
        from_attributes = True


# ============================================
# Cenário Empresa (Empresa do Cenário)
# ============================================

class CenarioEmpresaBase(BaseModel):
    cenario_id: UUID
    empresa_id: UUID


class CenarioEmpresaCreate(BaseModel):
    empresa_id: UUID


class CenarioEmpresaResponse(CenarioEmpresaBase):
    id: UUID
    created_at: datetime
    
    class Config:
        from_attributes = True


class CenarioEmpresaComClientes(CenarioEmpresaResponse):
    """Empresa com seus clientes e seções carregados."""
    clientes: list["CenarioClienteComSecoes"] = []
    empresa: Optional["EmpresaResponse"] = None


# ============================================
# Cenário Cliente (Cliente do Cenário)
# ============================================

class CenarioClienteBase(BaseModel):
    cenario_empresa_id: UUID
    cliente_nw_codigo: str = Field(..., min_length=1, max_length=50)
    nome_cliente: Optional[str] = Field(None, max_length=255)
    ativo: bool = True


class CenarioClienteCreate(BaseModel):
    cliente_nw_codigo: str = Field(..., min_length=1, max_length=50)
    nome_cliente: Optional[str] = Field(None, max_length=255)


class CenarioClienteUpdate(BaseModel):
    nome_cliente: Optional[str] = Field(None, max_length=255)
    ativo: Optional[bool] = None


class CenarioClienteResponse(CenarioClienteBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================
# CenÃ¡rio SeÃ§Ã£o (SeÃ§Ã£o do Cliente no CenÃ¡rio)
# ============================================

class CenarioSecaoBase(BaseModel):
    cenario_cliente_id: UUID
    secao_id: UUID
    # Nota: fator_pa foi movido para QuadroPessoal (por função)
    ativo: bool = True


class CenarioSecaoCreate(BaseModel):
    secao_id: UUID


class CenarioSecaoUpdate(BaseModel):
    ativo: Optional[bool] = None


class CenarioSecaoResponse(CenarioSecaoBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    secao: Optional["SecaoSimples"] = None

    class Config:
        from_attributes = True


class CenarioClienteComSecoes(CenarioClienteResponse):
    """Cliente do cenÃ¡rio com suas seÃ§Ãµes."""
    secoes: List[CenarioSecaoResponse] = []


# ============================================
# CenÃ¡rio de OrÃ§amento
# ============================================

class CenarioBase(BaseModel):
    nome: str = Field(..., min_length=1, max_length=200)
    descricao: Optional[str] = None
    cliente_nw_codigo: Optional[str] = Field(None, max_length=50, description="CÃ³digo do cliente no NW")
    empresa_ids: List[UUID] = Field(default_factory=list)  # MÃºltiplas empresas
    ano_inicio: int = Field(..., ge=2020, le=2100)
    mes_inicio: int = Field(..., ge=1, le=12)
    ano_fim: int = Field(..., ge=2020, le=2100)
    mes_fim: int = Field(..., ge=1, le=12)
    ativo: bool = True
    
    @field_validator('ano_fim')
    @classmethod
    def validate_ano_fim(cls, v, info):
        """Valida que o ano final Ã© posterior ou igual ao inicial."""
        if 'ano_inicio' in info.data:
            ano_inicio = info.data['ano_inicio']
            if v < ano_inicio:
                raise ValueError("Ano final deve ser posterior ou igual ao inicial")
            elif v == ano_inicio and 'mes_inicio' in info.data:
                mes_inicio = info.data['mes_inicio']
                mes_fim = info.data.get('mes_fim', 12)
                if mes_fim < mes_inicio:
                    raise ValueError("MÃªs final deve ser posterior ao mÃªs inicial no mesmo ano")
        return v
    
    @field_validator('mes_fim')
    @classmethod
    def validate_mes_fim(cls, v, info):
        """Valida que o mÃªs final Ã© vÃ¡lido quando no mesmo ano."""
        if 'ano_inicio' in info.data and 'ano_fim' in info.data:
            ano_inicio = info.data['ano_inicio']
            ano_fim = info.data['ano_fim']
            if ano_fim == ano_inicio and 'mes_inicio' in info.data:
                mes_inicio = info.data['mes_inicio']
                if v < mes_inicio:
                    raise ValueError("MÃªs final deve ser posterior ao mÃªs inicial no mesmo ano")
        return v


class CenarioCreate(CenarioBase):
    # CÃ³digo serÃ¡ gerado automaticamente, nÃ£o precisa no create
    pass


class CenarioUpdate(BaseModel):
    nome: Optional[str] = Field(None, min_length=1, max_length=200)
    descricao: Optional[str] = None
    cliente_nw_codigo: Optional[str] = Field(None, max_length=50)
    empresa_ids: Optional[List[UUID]] = None
    ano_inicio: Optional[int] = Field(None, ge=2020, le=2100)
    mes_inicio: Optional[int] = Field(None, ge=1, le=12)
    ano_fim: Optional[int] = Field(None, ge=2020, le=2100)
    mes_fim: Optional[int] = Field(None, ge=1, le=12)
    status: Optional[str] = Field(None, pattern="^(RASCUNHO|APROVADO|BLOQUEADO)$")
    ativo: Optional[bool] = None


class CenarioResponse(BaseModel):
    id: UUID
    codigo: str
    nome: str
    descricao: Optional[str] = None
    cliente_nw_codigo: Optional[str] = None
    ano_inicio: int
    mes_inicio: int
    ano_fim: int
    mes_fim: int
    status: str
    versao: int
    ativo: bool
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
    empresas: List[EmpresaSimples] = Field(default_factory=list)


# ============================================
# Quadro de Pessoal
# ============================================

class QuadroPessoalBase(BaseModel):
    cenario_id: UUID
    funcao_id: UUID
    secao_id: Optional[UUID] = None
    centro_custo_id: Optional[UUID] = None
    tabela_salarial_id: Optional[UUID] = None
    cenario_secao_id: Optional[UUID] = None  # Referência para CenarioSecao (estrutura hierárquica)
    regime: str = Field("CLT", pattern="^(CLT|PJ)$")
    
    # Quantidades mensais (float para suportar rateio fracionado)
    qtd_jan: float = Field(0, ge=0)
    qtd_fev: float = Field(0, ge=0)
    qtd_mar: float = Field(0, ge=0)
    qtd_abr: float = Field(0, ge=0)
    qtd_mai: float = Field(0, ge=0)
    qtd_jun: float = Field(0, ge=0)
    qtd_jul: float = Field(0, ge=0)
    qtd_ago: float = Field(0, ge=0)
    qtd_set: float = Field(0, ge=0)
    qtd_out: float = Field(0, ge=0)
    qtd_nov: float = Field(0, ge=0)
    qtd_dez: float = Field(0, ge=0)
    
    salario_override: Optional[float] = None
    span: Optional[int] = None
    fator_pa: float = Field(1.0, ge=0, description="Fator para calcular PAs (HC / fator = PAs)")
    
    # Tipo de cálculo: manual, span, rateio
    tipo_calculo: str = Field("manual", pattern="^(manual|span|rateio)$", description="Tipo de cálculo da quantidade")
    
    # Campos para SPAN
    span_ratio: Optional[float] = Field(None, gt=0, description="Ratio do span (ex: 35 = 1 para cada 35)")
    span_funcoes_base_ids: Optional[List[UUID]] = Field(None, description="IDs das funções base para cálculo do span")
    
    # Campos para RATEIO
    rateio_grupo_id: Optional[UUID] = Field(None, description="ID do grupo de rateio (agrupa posições rateadas)")
    rateio_percentual: Optional[float] = Field(None, ge=0, le=100, description="Percentual desta seção no rateio")
    rateio_qtd_total: Optional[int] = Field(None, ge=0, description="Quantidade total a ser rateada")
    
    observacao: Optional[str] = None
    ativo: bool = True


class QuadroPessoalCreate(QuadroPessoalBase):
    pass


class QuadroPessoalUpdate(BaseModel):
    funcao_id: Optional[UUID] = None
    secao_id: Optional[UUID] = None
    centro_custo_id: Optional[UUID] = None
    tabela_salarial_id: Optional[UUID] = None
    cenario_secao_id: Optional[UUID] = None
    regime: Optional[str] = None
    
    qtd_jan: Optional[float] = Field(None, ge=0)
    qtd_fev: Optional[float] = Field(None, ge=0)
    qtd_mar: Optional[float] = Field(None, ge=0)
    qtd_abr: Optional[float] = Field(None, ge=0)
    qtd_mai: Optional[float] = Field(None, ge=0)
    qtd_jun: Optional[float] = Field(None, ge=0)
    qtd_jul: Optional[float] = Field(None, ge=0)
    qtd_ago: Optional[float] = Field(None, ge=0)
    qtd_set: Optional[float] = Field(None, ge=0)
    qtd_out: Optional[float] = Field(None, ge=0)
    qtd_nov: Optional[float] = Field(None, ge=0)
    qtd_dez: Optional[float] = Field(None, ge=0)
    
    salario_override: Optional[float] = None
    span: Optional[int] = None
    fator_pa: Optional[float] = Field(None, ge=0)
    
    # Tipo de cálculo
    tipo_calculo: Optional[str] = Field(None, pattern="^(manual|span|rateio)$")
    
    # Campos para SPAN
    span_ratio: Optional[float] = Field(None, gt=0)
    span_funcoes_base_ids: Optional[List[UUID]] = None
    
    # Campos para RATEIO
    rateio_grupo_id: Optional[UUID] = None
    rateio_percentual: Optional[float] = Field(None, ge=0, le=100)
    rateio_qtd_total: Optional[int] = Field(None, ge=0)
    
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


# ============================================
# Alocação de Tecnologia
# ============================================

class AlocacaoTecnologiaBase(BaseModel):
    cenario_id: UUID
    cenario_secao_id: UUID
    produto_id: UUID
    tipo_alocacao: str = Field("FIXO", max_length=30, description="FIXO, VARIAVEL, RATEIO")
    
    # Quantidades mensais
    qtd_jan: Optional[float] = Field(None, ge=0)
    qtd_fev: Optional[float] = Field(None, ge=0)
    qtd_mar: Optional[float] = Field(None, ge=0)
    qtd_abr: Optional[float] = Field(None, ge=0)
    qtd_mai: Optional[float] = Field(None, ge=0)
    qtd_jun: Optional[float] = Field(None, ge=0)
    qtd_jul: Optional[float] = Field(None, ge=0)
    qtd_ago: Optional[float] = Field(None, ge=0)
    qtd_set: Optional[float] = Field(None, ge=0)
    qtd_out: Optional[float] = Field(None, ge=0)
    qtd_nov: Optional[float] = Field(None, ge=0)
    qtd_dez: Optional[float] = Field(None, ge=0)
    
    # Valor override
    valor_override: Optional[float] = Field(None, ge=0, description="Valor para sobrescrever cálculo automático")
    
    # Fator multiplicador
    fator_multiplicador: Optional[float] = Field(1.0, ge=0, description="Multiplicador para cálculo")
    
    # Percentual de rateio
    percentual_rateio: Optional[float] = Field(None, ge=0, le=100, description="Percentual de rateio (0-100)")
    
    observacao: Optional[str] = None
    ativo: bool = True


class AlocacaoTecnologiaCreate(AlocacaoTecnologiaBase):
    pass


class AlocacaoTecnologiaUpdate(BaseModel):
    cenario_secao_id: Optional[UUID] = None
    produto_id: Optional[UUID] = None
    tipo_alocacao: Optional[str] = Field(None, max_length=30)
    
    qtd_jan: Optional[float] = Field(None, ge=0)
    qtd_fev: Optional[float] = Field(None, ge=0)
    qtd_mar: Optional[float] = Field(None, ge=0)
    qtd_abr: Optional[float] = Field(None, ge=0)
    qtd_mai: Optional[float] = Field(None, ge=0)
    qtd_jun: Optional[float] = Field(None, ge=0)
    qtd_jul: Optional[float] = Field(None, ge=0)
    qtd_ago: Optional[float] = Field(None, ge=0)
    qtd_set: Optional[float] = Field(None, ge=0)
    qtd_out: Optional[float] = Field(None, ge=0)
    qtd_nov: Optional[float] = Field(None, ge=0)
    qtd_dez: Optional[float] = Field(None, ge=0)
    
    valor_override: Optional[float] = Field(None, ge=0)
    fator_multiplicador: Optional[float] = Field(None, ge=0)
    percentual_rateio: Optional[float] = Field(None, ge=0, le=100)
    observacao: Optional[str] = None
    ativo: Optional[bool] = None


class AlocacaoTecnologiaResponse(AlocacaoTecnologiaBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    produto: Optional["ProdutoTecnologiaResponse"] = None

    class Config:
        from_attributes = True


# ============================================
# Custos Tecnologia (Calculados)
# ============================================

class CustoTecnologiaBase(BaseModel):
    cenario_id: UUID
    cenario_secao_id: UUID
    alocacao_tecnologia_id: UUID
    produto_id: UUID
    conta_contabil_id: Optional[UUID] = None
    mes: int = Field(..., ge=1, le=12)
    ano: int
    quantidade_base: Decimal
    valor_unitario: Decimal
    valor_calculado: Decimal
    tipo_calculo: str
    parametros_calculo: Optional[Dict[str, Any]] = None


class CustoTecnologiaCreate(CustoTecnologiaBase):
    pass


class CustoTecnologiaUpdate(BaseModel):
    quantidade_base: Optional[Decimal] = None
    valor_unitario: Optional[Decimal] = None
    valor_calculado: Optional[Decimal] = None
    tipo_calculo: Optional[str] = None
    parametros_calculo: Optional[Dict[str, Any]] = None


class CustoTecnologiaResponse(CustoTecnologiaBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


class CustoTecnologiaComRelacionamentos(CustoTecnologiaResponse):
    produto: Optional["ProdutoTecnologiaResponse"] = None
    alocacao: Optional["AlocacaoTecnologiaResponse"] = None


# ============================================
# FunÃ§Ã£o Span (CÃ¡lculo AutomÃ¡tico de Quantidades)
# ============================================

class FuncaoSpanBase(BaseModel):
    cenario_id: UUID
    funcao_id: UUID
    funcoes_base_ids: List[UUID] = Field(..., min_items=1, description="Lista de IDs das funÃ§Ãµes base para cÃ¡lculo")
    span_ratio: float = Field(..., gt=0, description="Ratio do span (ex: 35 = 1 para cada 35)")
    ativo: bool = True


class FuncaoSpanCreate(FuncaoSpanBase):
    pass


class FuncaoSpanUpdate(BaseModel):
    funcao_id: Optional[UUID] = None
    funcoes_base_ids: Optional[List[UUID]] = None
    span_ratio: Optional[float] = Field(None, gt=0)
    ativo: Optional[bool] = None


class FuncaoSpanResponse(FuncaoSpanBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FuncaoSpanComRelacionamentos(FuncaoSpanResponse):
    funcao: Optional[FuncaoSimples] = None


# ============================================
# Premissa por FunÃ§Ã£o e MÃªs
# ============================================

class PremissaFuncaoMesBase(BaseModel):
    cenario_id: UUID
    cenario_secao_id: Optional[UUID] = None
    funcao_id: UUID
    mes: int = Field(..., ge=1, le=12)
    ano: int = Field(..., ge=2020, le=2100)
    absenteismo: float = Field(3.0, ge=0, le=100, description="% absenteismo total")
    abs_pct_justificado: float = Field(75.0, ge=0, le=100, description="% do ABS que e justificado")
    turnover: float = Field(5.0, ge=0, le=100)
    ferias_indice: float = Field(8.33, ge=0, le=100)
    dias_treinamento: int = Field(15, ge=0, le=180)


class PremissaFuncaoMesCreate(PremissaFuncaoMesBase):
    pass


class PremissaFuncaoMesUpdate(BaseModel):
    absenteismo: Optional[float] = Field(None, ge=0, le=100)
    abs_pct_justificado: Optional[float] = Field(None, ge=0, le=100)
    turnover: Optional[float] = Field(None, ge=0, le=100)
    ferias_indice: Optional[float] = Field(None, ge=0, le=100)
    dias_treinamento: Optional[int] = Field(None, ge=0, le=180)


class PremissaFuncaoMesResponse(PremissaFuncaoMesBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PremissaFuncaoMesComRelacionamentos(PremissaFuncaoMesResponse):
    funcao: Optional[FuncaoSimples] = None


# ============================================
# Tipos de Custo (Rubricas)
# ============================================

class TipoCustoBase(BaseModel):
    codigo: str = Field(..., min_length=1, max_length=50)
    nome: str = Field(..., min_length=1, max_length=200)
    descricao: Optional[str] = None
    categoria: str = Field(..., pattern="^(PROVENTO|REMUNERACAO|BENEFICIO|ENCARGO|PROVISAO|PREMIO|DESCONTO)$")
    tipo_calculo: str = Field(..., pattern="^(HC_X_SALARIO|HC_X_VALOR|PERCENTUAL_RUBRICA|PERCENTUAL_RECEITA|FORMULA)$")
    conta_contabil_codigo: Optional[str] = Field(None, max_length=50)
    conta_contabil_descricao: Optional[str] = Field(None, max_length=255)
    incide_fgts: bool = False
    incide_inss: bool = False
    reflexo_ferias: bool = False
    reflexo_13: bool = False
    aliquota_padrao: Optional[float] = None
    rubrica_base_id: Optional[UUID] = None
    ordem: int = Field(0, ge=0)
    ativo: bool = True


class TipoCustoCreate(TipoCustoBase):
    pass


class TipoCustoUpdate(BaseModel):
    codigo: Optional[str] = Field(None, min_length=1, max_length=50)
    nome: Optional[str] = Field(None, min_length=1, max_length=200)
    descricao: Optional[str] = None
    categoria: Optional[str] = Field(None, pattern="^(PROVENTO|REMUNERACAO|BENEFICIO|ENCARGO|PROVISAO|PREMIO|DESCONTO)$")
    tipo_calculo: Optional[str] = Field(None, pattern="^(HC_X_SALARIO|HC_X_VALOR|PERCENTUAL_RUBRICA|PERCENTUAL_RECEITA|FORMULA)$")
    conta_contabil_codigo: Optional[str] = Field(None, max_length=50)
    conta_contabil_descricao: Optional[str] = Field(None, max_length=255)
    incide_fgts: Optional[bool] = None
    incide_inss: Optional[bool] = None
    reflexo_ferias: Optional[bool] = None
    reflexo_13: Optional[bool] = None
    aliquota_padrao: Optional[float] = None
    rubrica_base_id: Optional[UUID] = None
    ordem: Optional[int] = Field(None, ge=0)
    ativo: Optional[bool] = None


class TipoCustoResponse(TipoCustoBase):
    id: UUID
    ativo: Optional[bool] = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    @field_validator('ativo', mode='before')
    @classmethod
    def ativo_default(cls, v):
        """Converte None para True (padrão)."""
        return v if v is not None else True

    class Config:
        from_attributes = True


class TipoCustoSimples(BaseModel):
    """Versão simplificada para listagens."""
    id: UUID
    codigo: str
    nome: str
    categoria: str
    
    class Config:
        from_attributes = True


# ============================================
# Custos Calculados
# ============================================

class CustoCalculadoBase(BaseModel):
    cenario_id: UUID
    cenario_secao_id: UUID
    funcao_id: UUID
    faixa_id: Optional[UUID] = None
    tipo_custo_id: UUID
    mes: int = Field(..., ge=1, le=12)
    ano: int = Field(..., ge=2020, le=2100)
    hc_base: float = 0
    valor_base: float = 0
    indice_aplicado: float = 0
    valor_calculado: float = 0
    memoria_calculo: Optional[dict] = None


class CustoCalculadoCreate(CustoCalculadoBase):
    pass


class CustoCalculadoResponse(CustoCalculadoBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CustoCalculadoComRelacionamentos(CustoCalculadoResponse):
    funcao: Optional[FuncaoSimples] = None
    tipo_custo: Optional[TipoCustoSimples] = None


# ============================================
# Parâmetros de Custo
# ============================================

class ParametroCustoBase(BaseModel):
    cenario_id: UUID
    cenario_secao_id: Optional[UUID] = None
    tipo_custo_id: Optional[UUID] = None
    chave: str = Field(..., min_length=1, max_length=100)
    valor: float
    descricao: Optional[str] = Field(None, max_length=255)


class ParametroCustoCreate(ParametroCustoBase):
    pass


class ParametroCustoUpdate(BaseModel):
    valor: Optional[float] = None
    descricao: Optional[str] = Field(None, max_length=255)


class ParametroCustoResponse(ParametroCustoBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================
# Conta Contábil (view do NW)
# ============================================

class ContaContabilNW(BaseModel):
    """Conta contábil da view vw_conta_contabil_niveis do NW."""
    codigo: str
    descricao: str
    nivel1: Optional[str] = None
    nivel2: Optional[str] = None
    nivel3: Optional[str] = None
    nivel4: Optional[str] = None
    nivel5: Optional[str] = None


# ============================================
# DRE (Demonstrativo de Resultado)
# ============================================

class DRELinha(BaseModel):
    """Linha do DRE com valores por mês."""
    conta_contabil_codigo: str
    conta_contabil_descricao: str
    conta_contabil_completa: str  # Formato "CODIGO - DESCRICAO"
    tipo_custo_codigo: Optional[str] = None
    tipo_custo_nome: Optional[str] = None
    categoria: str
    valores_mensais: List[float]  # 12 valores (jan-dez)
    total: float


class DREResponse(BaseModel):
    """Resposta do DRE consolidado."""
    cenario_id: UUID
    cenario_secao_id: Optional[UUID] = None
    ano: int
    linhas: List[DRELinha]
    total_geral: float


# Atualizar forward references
DepartamentoComSecoes.model_rebuild()
CenarioSecaoResponse.model_rebuild()
CenarioClienteComSecoes.model_rebuild()
CenarioEmpresaComClientes.model_rebuild()

