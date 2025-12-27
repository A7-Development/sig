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
    
    # Política de trabalho - dias da semana
    trabalha_sabado: Decimal = Field(default=Decimal("0"), ge=0, le=1)  # 0=não, 0.5=meio período, 1=integral
    trabalha_domingo: bool = False
    
    # Política de trabalho - feriados
    trabalha_feriado_nacional: bool = False
    trabalha_feriado_estadual: bool = False
    trabalha_feriado_municipal: bool = False
    
    # Localização (para feriados estaduais/municipais)
    uf: Optional[str] = Field(None, min_length=2, max_length=2)
    cidade: Optional[str] = Field(None, max_length=100)


class SecaoCreate(SecaoBase):
    pass


class SecaoUpdate(BaseModel):
    departamento_id: Optional[UUID] = None
    codigo: Optional[str] = Field(None, min_length=1, max_length=50)
    nome: Optional[str] = Field(None, min_length=1, max_length=200)
    codigo_totvs: Optional[str] = Field(None, max_length=50)
    ativo: Optional[bool] = None
    
    # Política de trabalho
    trabalha_sabado: Optional[Decimal] = Field(None, ge=0, le=1)
    trabalha_domingo: Optional[bool] = None
    trabalha_feriado_nacional: Optional[bool] = None
    trabalha_feriado_estadual: Optional[bool] = None
    trabalha_feriado_municipal: Optional[bool] = None
    uf: Optional[str] = Field(None, min_length=2, max_length=2)
    cidade: Optional[str] = Field(None, max_length=100)


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
    conta_contabil_codigo: Optional[str] = Field(None, max_length=50, description="Código da conta contábil (view NW)")
    conta_contabil_descricao: Optional[str] = Field(None, max_length=255, description="Descrição da conta contábil")
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
    conta_contabil_codigo: Optional[str] = Field(None, max_length=50)
    conta_contabil_descricao: Optional[str] = Field(None, max_length=255)
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
    conta_contabil_codigo: Optional[str] = Field(None, max_length=50)
    conta_contabil_descricao: Optional[str] = Field(None, max_length=255)
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
# Cenário Seção (Seção do Cenário - Nova Hierarquia)
# ============================================
# NOVA HIERARQUIA: Cenário -> Empresa -> Seção (representa Cliente)
# A Seção agora representa o "Cliente" (ex: CLARO, VIVO, CORPORATIVO)

class CenarioSecaoBase(BaseModel):
    cenario_cliente_id: Optional[UUID] = None  # Mantido para compatibilidade
    cenario_empresa_id: Optional[UUID] = None  # Nova FK direta para empresa
    secao_id: UUID
    # Nota: fator_pa foi movido para QuadroPessoal (por função)
    ativo: bool = True


class CenarioSecaoCreate(BaseModel):
    """Schema para criar seção diretamente na empresa (nova hierarquia)."""
    secao_id: UUID
    cenario_empresa_id: Optional[UUID] = None  # Preenchido automaticamente pela API


class CenarioSecaoUpdate(BaseModel):
    ativo: Optional[bool] = None


class CenarioSecaoResponse(BaseModel):
    id: UUID
    cenario_cliente_id: Optional[UUID] = None
    cenario_empresa_id: Optional[UUID] = None
    secao_id: UUID
    ativo: bool
    created_at: datetime
    updated_at: datetime
    secao: Optional["SecaoSimples"] = None
    is_corporativo: bool = False  # Propriedade calculada

    class Config:
        from_attributes = True


class CenarioClienteComSecoes(CenarioClienteResponse):
    """Cliente do cenário com suas seções (hierarquia antiga)."""
    secoes: List[CenarioSecaoResponse] = []


# ============================================
# CenarioSecaoCC - Associação Seção-CC
# ============================================

class CenarioSecaoCCBase(BaseModel):
    centro_custo_id: UUID

class CenarioSecaoCCCreate(CenarioSecaoCCBase):
    pass

class CenarioSecaoCCResponse(BaseModel):
    id: UUID
    cenario_secao_id: UUID
    centro_custo_id: UUID
    ativo: bool
    created_at: datetime
    centro_custo: Optional["CentroCustoSimples"] = None
    
    class Config:
        from_attributes = True


# ============================================
# Cenário de Orçamento
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
    centro_custo_id: UUID = Field(..., description="Centro de Custo é obrigatório (projeto/pool)")
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
# Custo Direto (Alocação por Centro de Custo)
# ============================================

class CustoDiretoBase(BaseModel):
    cenario_id: UUID
    cenario_secao_id: UUID
    centro_custo_id: UUID
    item_custo_id: UUID
    
    # Tipo de valor: FIXO, VARIAVEL, FIXO_VARIAVEL
    tipo_valor: str = Field("FIXO", max_length=20, description="FIXO, VARIAVEL, FIXO_VARIAVEL")
    
    # Componente Fixo
    valor_fixo: Optional[float] = Field(None, ge=0, description="Valor fixo mensal")
    
    # Componente Variável
    valor_unitario_variavel: Optional[float] = Field(None, ge=0, description="Valor por unidade")
    unidade_medida: Optional[str] = Field(None, max_length=20, description="HC, PA, UNIDADE")
    funcao_base_id: Optional[UUID] = Field(None, description="Função base para cálculo variável (null = total do CC)")
    tipo_medida: Optional[str] = Field(None, max_length=30, description="HC_TOTAL, HC_FUNCAO, PA_TOTAL, PA_FUNCAO")
    
    # Rateio
    tipo_calculo: str = Field("manual", max_length=20, description="manual, rateio")
    rateio_grupo_id: Optional[UUID] = None
    rateio_percentual: Optional[float] = Field(None, ge=0, le=100)
    
    descricao: Optional[str] = None
    ativo: bool = True


class CustoDiretoCreate(CustoDiretoBase):
    pass


class CustoDiretoUpdate(BaseModel):
    cenario_secao_id: Optional[UUID] = None
    centro_custo_id: Optional[UUID] = None
    item_custo_id: Optional[UUID] = None
    tipo_valor: Optional[str] = Field(None, max_length=20)
    valor_fixo: Optional[float] = Field(None, ge=0)
    valor_unitario_variavel: Optional[float] = Field(None, ge=0)
    unidade_medida: Optional[str] = Field(None, max_length=20)
    funcao_base_id: Optional[UUID] = None
    tipo_medida: Optional[str] = Field(None, max_length=30)
    tipo_calculo: Optional[str] = Field(None, max_length=20)
    rateio_grupo_id: Optional[UUID] = None
    rateio_percentual: Optional[float] = Field(None, ge=0, le=100)
    descricao: Optional[str] = None
    ativo: Optional[bool] = None


class CustoDiretoResponse(CustoDiretoBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    
    # Relacionamentos
    item_custo: Optional["ProdutoTecnologiaResponse"] = None
    centro_custo: Optional["CentroCustoResponse"] = None
    funcao_base: Optional["FuncaoResponse"] = None

    class Config:
        from_attributes = True


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


# ============================================
# Rateio de Custos (POOL -> OPERACIONAL)
# ============================================

class RateioDestinoBase(BaseModel):
    """Destino de um rateio com percentual."""
    cc_destino_id: UUID
    percentual: float = Field(..., ge=0, le=100, description="Percentual do rateio (0-100)")


class RateioDestinoCreate(RateioDestinoBase):
    pass


class RateioDestinoResponse(RateioDestinoBase):
    id: UUID
    rateio_grupo_id: UUID
    created_at: datetime
    cc_destino: Optional["CentroCustoSimples"] = None

    class Config:
        from_attributes = True


class RateioGrupoBase(BaseModel):
    """Grupo de rateio para distribuir custos de CC POOL para CCs OPERACIONAIS."""
    cc_origem_pool_id: UUID
    nome: str = Field(..., min_length=1, max_length=200)
    descricao: Optional[str] = None
    ativo: bool = True


class RateioGrupoCreate(RateioGrupoBase):
    """Schema para criar grupo de rateio."""
    destinos: List[RateioDestinoCreate] = Field(default_factory=list, description="Destinos do rateio com percentuais")


class RateioGrupoUpdate(BaseModel):
    """Schema para atualizar grupo de rateio."""
    nome: Optional[str] = Field(None, min_length=1, max_length=200)
    descricao: Optional[str] = None
    ativo: Optional[bool] = None


class RateioGrupoResponse(RateioGrupoBase):
    id: UUID
    cenario_id: UUID
    created_at: datetime
    updated_at: datetime
    cc_origem: Optional["CentroCustoSimples"] = None
    destinos: List[RateioDestinoResponse] = []
    percentual_total: float = 0  # Soma dos percentuais dos destinos

    class Config:
        from_attributes = True


class RateioGrupoComValidacao(RateioGrupoResponse):
    """Grupo de rateio com informação de validação."""
    is_valido: bool = False  # True se percentual_total == 100
    mensagem_validacao: Optional[str] = None


# ============================================
# CenarioEmpresa com Seções (Nova Hierarquia)
# ============================================

class CenarioEmpresaComSecoes(CenarioEmpresaResponse):
    """Empresa do cenário com seções diretamente ligadas (nova hierarquia)."""
    secoes_diretas: List[CenarioSecaoResponse] = []
    empresa: Optional["EmpresaResponse"] = None


# ============================================
# Tipos de Receita
# ============================================

class TipoReceitaBase(BaseModel):
    codigo: str = Field(..., min_length=1, max_length=50)
    nome: str = Field(..., min_length=1, max_length=200)
    descricao: Optional[str] = None
    categoria: str = Field("OPERACIONAL", max_length=50, description="OPERACIONAL, FINANCEIRA, OUTRAS")
    conta_contabil_codigo: Optional[str] = Field(None, max_length=50)
    conta_contabil_descricao: Optional[str] = Field(None, max_length=255)
    ordem: int = 0
    ativo: bool = True


class TipoReceitaCreate(BaseModel):
    """Schema para criação - código é gerado automaticamente."""
    nome: str = Field(..., min_length=1, max_length=200)
    descricao: Optional[str] = None
    categoria: str = Field("OPERACIONAL", max_length=50, description="OPERACIONAL, FINANCEIRA, OUTRAS")
    conta_contabil_codigo: Optional[str] = Field(None, max_length=50)
    conta_contabil_descricao: Optional[str] = Field(None, max_length=255)
    ativo: bool = True


class TipoReceitaUpdate(BaseModel):
    """Schema para atualização - código não pode ser alterado."""
    nome: Optional[str] = Field(None, min_length=1, max_length=200)
    descricao: Optional[str] = None
    categoria: Optional[str] = Field(None, max_length=50)
    conta_contabil_codigo: Optional[str] = Field(None, max_length=50)
    conta_contabil_descricao: Optional[str] = Field(None, max_length=255)
    ativo: Optional[bool] = None


class TipoReceitaResponse(TipoReceitaBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TipoReceitaSimples(BaseModel):
    """Versão simplificada para listagens."""
    id: UUID
    codigo: str
    nome: str
    categoria: str
    
    class Config:
        from_attributes = True


# ============================================
# Receita Premissa Mes (Indicadores Mensais)
# ============================================

class ReceitaPremissaMesBase(BaseModel):
    mes: int = Field(..., ge=1, le=12)
    ano: int = Field(..., ge=2020, le=2100)
    vopdu: float = Field(0, ge=0, description="Venda Operador Dia Útil")
    indice_conversao: float = Field(0, ge=0, le=1, description="Índice de instalação/ativação (0-1)")
    ticket_medio: float = Field(0, ge=0, description="Ticket médio em R$")
    fator: float = Field(1, ge=0, description="Fator multiplicador")
    indice_estorno: float = Field(0, ge=0, le=1, description="Índice de estorno (0-1)")


class ReceitaPremissaMesCreate(ReceitaPremissaMesBase):
    receita_cenario_id: Optional[UUID] = None  # Preenchido pela API


class ReceitaPremissaMesUpdate(BaseModel):
    vopdu: Optional[float] = Field(None, ge=0)
    indice_conversao: Optional[float] = Field(None, ge=0, le=1)
    ticket_medio: Optional[float] = Field(None, ge=0)
    fator: Optional[float] = Field(None, ge=0)
    indice_estorno: Optional[float] = Field(None, ge=0, le=1)


class ReceitaPremissaMesResponse(ReceitaPremissaMesBase):
    id: UUID
    receita_cenario_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================
# Receita do Cenário
# ============================================

class ReceitaCenarioBase(BaseModel):
    centro_custo_id: UUID
    tipo_receita_id: UUID
    tipo_calculo: str = Field("FIXA_CC", max_length=20, description="FIXA_CC, FIXA_HC, FIXA_PA, VARIAVEL")
    funcao_pa_id: Optional[UUID] = Field(None, description="Função do PA (obrigatório para FIXA_PA e VARIAVEL)")
    valor_fixo: Optional[float] = Field(None, ge=0, description="Valor fixo (por CC, HC ou PA)")
    valor_minimo_pa: Optional[float] = Field(None, ge=0, description="Mínimo por PA (para VARIAVEL)")
    valor_maximo_pa: Optional[float] = Field(None, ge=0, description="Máximo por PA (para VARIAVEL)")
    descricao: Optional[str] = None
    ativo: bool = True


class ReceitaCenarioCreate(ReceitaCenarioBase):
    cenario_id: Optional[UUID] = None  # Preenchido pela API
    premissas: Optional[List[ReceitaPremissaMesCreate]] = Field(default_factory=list, description="Premissas mensais para VARIAVEL")


class ReceitaCenarioUpdate(BaseModel):
    centro_custo_id: Optional[UUID] = None
    tipo_receita_id: Optional[UUID] = None
    tipo_calculo: Optional[str] = Field(None, max_length=20)
    funcao_pa_id: Optional[UUID] = None
    valor_fixo: Optional[float] = Field(None, ge=0)
    valor_minimo_pa: Optional[float] = Field(None, ge=0)
    valor_maximo_pa: Optional[float] = Field(None, ge=0)
    descricao: Optional[str] = None
    ativo: Optional[bool] = None


class ReceitaCenarioResponse(ReceitaCenarioBase):
    id: UUID
    cenario_id: UUID
    created_at: datetime
    updated_at: datetime
    
    # Relacionamentos
    tipo_receita: Optional[TipoReceitaSimples] = None
    centro_custo: Optional[CentroCustoSimples] = None
    funcao_pa: Optional[FuncaoSimples] = None
    premissas: List[ReceitaPremissaMesResponse] = []

    class Config:
        from_attributes = True


class ReceitaPremissasBulkUpdate(BaseModel):
    """Atualização em lote das premissas de uma receita."""
    premissas: List[ReceitaPremissaMesCreate]


# ============================================
# Cálculo de Receita
# ============================================

class ReceitaCalculadaResponse(BaseModel):
    """Receita calculada por mês."""
    receita_cenario_id: UUID
    mes: int
    ano: int
    valor_calculado: float
    valor_bruto: Optional[float] = None  # Antes de limites min/max
    hc_pa: Optional[float] = None
    qtd_pa: Optional[float] = None
    dias_uteis: Optional[int] = None
    memoria_calculo: Optional[Dict[str, Any]] = None


# Atualizar forward references
DepartamentoComSecoes.model_rebuild()
CenarioSecaoResponse.model_rebuild()
CenarioClienteComSecoes.model_rebuild()
CenarioEmpresaComClientes.model_rebuild()
RateioDestinoResponse.model_rebuild()
RateioGrupoResponse.model_rebuild()
CenarioEmpresaComSecoes.model_rebuild()
ReceitaCenarioResponse.model_rebuild()

