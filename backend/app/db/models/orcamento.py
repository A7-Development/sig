"""
Modelos do mÃ³dulo de OrÃ§amento.
Todos os dados sÃ£o armazenados no PostgreSQL SIG.
"""

import uuid
import json
from datetime import datetime, date
from sqlalchemy import Column, String, Boolean, DateTime, Date, Integer, ForeignKey, Numeric, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSON
from sqlalchemy.orm import relationship
from app.db.session import Base


class Departamento(Base):
    """Departamento da estrutura organizacional."""
    __tablename__ = "departamentos"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    codigo = Column(String(50), unique=True, nullable=False, index=True)
    codigo_totvs = Column(String(50), nullable=True, index=True)  # VÃ­nculo opcional com GDEPTO
    nome = Column(String(200), nullable=False)
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    secoes = relationship("Secao", back_populates="departamento", lazy="selectin")
    
    def __repr__(self):
        return f"<Departamento {self.codigo}: {self.nome}>"


class Secao(Base):
    """SeÃ§Ã£o dentro de um departamento."""
    __tablename__ = "secoes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    departamento_id = Column(UUID(as_uuid=True), ForeignKey("departamentos.id", ondelete="CASCADE"), nullable=False)
    codigo = Column(String(50), unique=True, nullable=False, index=True)
    codigo_totvs = Column(String(50), nullable=True, index=True)  # VÃ­nculo opcional com PSECAO
    nome = Column(String(200), nullable=False)
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    departamento = relationship("Departamento", back_populates="secoes", lazy="selectin")
    
    def __repr__(self):
        return f"<Secao {self.codigo}: {self.nome}>"


class CentroCusto(Base):
    """Centro de Custo para alocaÃ§Ã£o de custos."""
    __tablename__ = "centros_custo"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    codigo = Column(String(50), unique=True, nullable=False, index=True)
    codigo_totvs = Column(String(50), nullable=True, index=True)  # VÃ­nculo opcional com PCCUSTO
    nome = Column(String(200), nullable=False)
    
    # ClassificaÃ§Ã£o
    tipo = Column(String(30), nullable=False, default="OPERACIONAL")  # OPERACIONAL, ADMINISTRATIVO, OVERHEAD
    cliente = Column(String(200), nullable=True)  # Nome do cliente (quando aplicÃ¡vel)
    contrato = Column(String(100), nullable=True)  # ReferÃªncia do contrato
    
    # LocalizaÃ§Ã£o (para cÃ¡lculo de feriados)
    uf = Column(String(2), nullable=True)
    cidade = Column(String(100), nullable=True)
    
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<CentroCusto {self.codigo}: {self.nome}>"


class Feriado(Base):
    """Feriados para cÃ¡lculo de dias Ãºteis/trabalhados."""
    __tablename__ = "feriados"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    data = Column(Date, nullable=False, index=True)
    nome = Column(String(200), nullable=False)
    tipo = Column(String(20), nullable=False, default="NACIONAL")  # NACIONAL, ESTADUAL, MUNICIPAL
    uf = Column(String(2), nullable=True)  # Para feriados estaduais
    cidade = Column(String(100), nullable=True)  # Para feriados municipais
    recorrente = Column(Boolean, default=False)  # Se repete todo ano (ex: Natal)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<Feriado {self.data}: {self.nome}>"


class Funcao(Base):
    """FunÃ§Ã£o/Cargo para o orÃ§amento de pessoal."""
    __tablename__ = "funcoes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    codigo = Column(String(50), unique=True, nullable=False, index=True)
    codigo_totvs = Column(String(50), nullable=True, index=True)  # VÃ­nculo opcional com PFUNCAO
    nome = Column(String(200), nullable=False)
    cbo = Column(String(20), nullable=True)  # CÃ³digo Brasileiro de OcupaÃ§Ãµes
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<Funcao {self.codigo}: {self.nome}>"


class Empresa(Base):
    """Empresa do grupo para configuraÃ§Ãµes especÃ­ficas (tributos, encargos, etc.)."""
    __tablename__ = "empresas"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    codigo = Column(String(50), unique=True, nullable=False, index=True)
    razao_social = Column(String(200), nullable=False)
    nome_fantasia = Column(String(200), nullable=True)
    cnpj = Column(String(20), nullable=True, unique=True)
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    tributos = relationship("Tributo", back_populates="empresa", lazy="selectin", cascade="all, delete-orphan")
    encargos = relationship("Encargo", back_populates="empresa", lazy="selectin", cascade="all, delete-orphan")
    cenarios_rel = relationship("CenarioEmpresa", back_populates="empresa", lazy="selectin")
    
    def __repr__(self):
        return f"<Empresa {self.codigo}: {self.razao_social}>"


class Tributo(Base):
    """Tributos sobre receita por empresa (PIS, COFINS, ISS, etc.)."""
    __tablename__ = "tributos"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id = Column(UUID(as_uuid=True), ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False)
    
    # IdentificaÃ§Ã£o
    codigo = Column(String(50), nullable=False)  # PIS, COFINS, ISS, CPREV
    nome = Column(String(200), nullable=False)
    
    # Valor
    aliquota = Column(Numeric(10, 4), nullable=False)  # Percentual
    
    # Controle
    ordem = Column(Integer, default=0)
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    empresa = relationship("Empresa", back_populates="tributos", lazy="selectin")
    
    def __repr__(self):
        return f"<Tributo {self.codigo}: {self.nome} ({self.aliquota}%)>"


class Encargo(Base):
    """Encargos patronais sobre folha por empresa (INSS, SAT/RAT, etc.)."""
    __tablename__ = "encargos"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    empresa_id = Column(UUID(as_uuid=True), ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False)
    regime = Column(String(10), nullable=False, default="CLT")  # CLT, PJ
    
    # IdentificaÃ§Ã£o do encargo
    codigo = Column(String(50), nullable=False)  # INSS_EMPRESA, INSS_TERCEIROS, SAT_RAT
    nome = Column(String(200), nullable=False)
    
    # Valor
    aliquota = Column(Numeric(10, 4), nullable=False)  # Percentual (ex: 20.0000 = 20%)
    base_calculo = Column(String(50), nullable=False, default="SALARIO")  # SALARIO, TOTAL
    
    # Controle
    ordem = Column(Integer, default=0)  # Ordem de exibiÃ§Ã£o
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    empresa = relationship("Empresa", back_populates="encargos", lazy="selectin")
    
    def __repr__(self):
        return f"<Encargo {self.codigo}: {self.nome} ({self.aliquota}%)>"


class Provisao(Base):
    """ProvisÃµes de mÃ£o de obra (13Âº, FÃ©rias, Demandas Trabalhistas)."""
    __tablename__ = "provisoes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # IdentificaÃ§Ã£o
    codigo = Column(String(50), unique=True, nullable=False, index=True)  # 13_SALARIO, FERIAS, DEMANDAS
    nome = Column(String(200), nullable=False)
    descricao = Column(Text, nullable=True)
    
    # Valor padrÃ£o
    percentual = Column(Numeric(10, 4), nullable=False)  # Percentual sobre salÃ¡rio
    incide_encargos = Column(Boolean, default=True)  # Se encargos incidem sobre esta provisÃ£o
    
    # Controle
    ordem = Column(Integer, default=0)
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<Provisao {self.codigo}: {self.nome} ({self.percentual}%)>"


class PoliticaBeneficio(Base):
    """PolÃ­tica/Template de benefÃ­cios reutilizÃ¡vel."""
    __tablename__ = "politicas_beneficio"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    codigo = Column(String(50), unique=True, nullable=False, index=True)
    nome = Column(String(200), nullable=False)
    descricao = Column(Text, nullable=True)
    regime = Column(String(10), nullable=False, default="CLT")  # CLT, PJ
    
    # Jornada e Escala
    escala = Column(String(20), nullable=False, default="6x1")  # 5x2, 6x1, 12x36
    jornada_mensal = Column(Integer, nullable=False, default=180)  # Horas/mÃªs
    
    # BenefÃ­cios (valores diÃ¡rios ou mensais)
    vt_dia = Column(Numeric(10, 2), default=0)  # VT por dia trabalhado
    vt_desconto_6pct = Column(Boolean, default=True)  # Aplica desconto 6%?
    vr_dia = Column(Numeric(10, 2), default=0)  # VR por dia trabalhado
    va_dia = Column(Numeric(10, 2), default=0)  # VA por dia trabalhado
    plano_saude = Column(Numeric(10, 2), default=0)  # Plano saÃºde mensal
    plano_dental = Column(Numeric(10, 2), default=0)  # Plano dental mensal
    seguro_vida = Column(Numeric(10, 2), default=0)  # Seguro vida mensal
    aux_creche = Column(Numeric(10, 2), default=0)  # Valor aux creche
    aux_creche_percentual = Column(Numeric(5, 2), default=0)  # % do quadro que recebe
    aux_home_office = Column(Numeric(10, 2), default=0)  # AuxÃ­lio home office mensal
    
    # Treinamento
    dias_treinamento = Column(Integer, default=15)  # Dias de treinamento inicial
    
    # Controle
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<PoliticaBeneficio {self.codigo}: {self.nome}>"


class FaixaSalarial(Base):
    """Faixa salarial (JÃºnior, Pleno, SÃªnior, etc.)."""
    __tablename__ = "faixas_salariais"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    codigo = Column(String(20), unique=True, nullable=False, index=True)
    nome = Column(String(100), nullable=False)
    ordem = Column(Integer, default=0)  # Para ordenaÃ§Ã£o
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<FaixaSalarial {self.codigo}: {self.nome}>"


class TabelaSalarial(Base):
    """Tabela salarial: FunÃ§Ã£o + Regime + Faixa + PolÃ­tica = SalÃ¡rio."""
    __tablename__ = "tabela_salarial"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # VÃ­nculos
    funcao_id = Column(UUID(as_uuid=True), ForeignKey("funcoes.id", ondelete="CASCADE"), nullable=False)
    faixa_id = Column(UUID(as_uuid=True), ForeignKey("faixas_salariais.id", ondelete="SET NULL"), nullable=True)
    politica_id = Column(UUID(as_uuid=True), ForeignKey("politicas_beneficio.id", ondelete="SET NULL"), nullable=True)
    
    # Regime
    regime = Column(String(10), nullable=False, default="CLT")  # CLT, PJ
    
    # SalÃ¡rio
    salario_base = Column(Numeric(12, 2), nullable=False)
    
    # Override de benefÃ­cios (se diferente da polÃ­tica)
    override_vt_dia = Column(Numeric(10, 2), nullable=True)
    override_vr_dia = Column(Numeric(10, 2), nullable=True)
    override_plano_saude = Column(Numeric(10, 2), nullable=True)
    
    # Controle
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    funcao = relationship("Funcao", lazy="selectin")
    faixa = relationship("FaixaSalarial", lazy="selectin")
    politica = relationship("PoliticaBeneficio", lazy="selectin")
    
    def __repr__(self):
        return f"<TabelaSalarial {self.funcao_id} {self.regime} R${self.salario_base}>"


# ============================================
# CENÃRIOS DE ORÃ‡AMENTO
# ============================================

# Tabela de associação para múltiplas empresas por cenário
class CenarioEmpresa(Base):
    """Associação entre Cenários e Empresas. Cada empresa do cenário pode ter múltiplos clientes."""
    __tablename__ = "cenarios_empresas"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cenario_id = Column(UUID(as_uuid=True), ForeignKey("cenarios.id", ondelete="CASCADE"), nullable=False, index=True)
    empresa_id = Column(UUID(as_uuid=True), ForeignKey("empresas.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    cenario = relationship("Cenario", back_populates="empresas_rel")
    empresa = relationship("Empresa", back_populates="cenarios_rel")
    clientes = relationship("CenarioCliente", back_populates="cenario_empresa", lazy="selectin", cascade="all, delete-orphan")
    
    __table_args__ = (
        UniqueConstraint('cenario_id', 'empresa_id', name='uq_cenario_empresa'),
    )


class Cenario(Base):
    """CenÃ¡rio de orÃ§amento de pessoal."""
    __tablename__ = "cenarios"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # IdentificaÃ§Ã£o
    codigo = Column(String(50), unique=True, nullable=False, index=True)
    nome = Column(String(200), nullable=False)
    descricao = Column(Text, nullable=True)
    
    # Cliente do NW (cÃ³digo do cliente na tabela clifor)
    cliente_nw_codigo = Column(String(50), nullable=True, index=True)
    
    # PerÃ­odo flexÃ­vel (permite cruzar anos)
    ano_inicio = Column(Integer, nullable=False)
    mes_inicio = Column(Integer, nullable=False)  # 1-12
    ano_fim = Column(Integer, nullable=False)
    mes_fim = Column(Integer, nullable=False)  # 1-12
    
    # Status (sempre inicia como RASCUNHO)
    status = Column(String(20), nullable=False, default="RASCUNHO")  # RASCUNHO, APROVADO, BLOQUEADO
    versao = Column(Integer, default=1)
    
    # Controle
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    empresas_rel = relationship("CenarioEmpresa", back_populates="cenario", lazy="selectin", cascade="all, delete-orphan")
    # Nota: clientes agora são acessados via empresas_rel -> clientes (hierarquia Empresa > Cliente > Seção)
    premissas = relationship("Premissa", back_populates="cenario", lazy="selectin", cascade="all, delete-orphan")
    posicoes = relationship("QuadroPessoal", back_populates="cenario", lazy="selectin", cascade="all, delete-orphan")
    spans = relationship("FuncaoSpan", back_populates="cenario", lazy="selectin", cascade="all, delete-orphan")
    premissas_funcao_mes = relationship("PremissaFuncaoMes", back_populates="cenario", lazy="selectin", cascade="all, delete-orphan")
    
    @property
    def empresas(self):
        """Retorna lista de empresas associadas."""
        return [rel.empresa for rel in self.empresas_rel]
    
    def __repr__(self):
        return f"<Cenario {self.codigo}: {self.nome} ({self.ano_inicio}/{self.mes_inicio:02d} - {self.ano_fim}/{self.mes_fim:02d})>"


class Premissa(Base):
    """Premissas/Ã­ndices de um cenÃ¡rio de orÃ§amento."""
    __tablename__ = "premissas"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cenario_id = Column(UUID(as_uuid=True), ForeignKey("cenarios.id", ondelete="CASCADE"), nullable=False)
    
    # Ãndices de IneficiÃªncia (percentuais)
    absenteismo = Column(Numeric(5, 2), default=3.0)  # % absenteismo total
    abs_pct_justificado = Column(Numeric(5, 2), default=75.0)  # % do ABS que e justificado
    turnover = Column(Numeric(5, 2), default=5.0)  # % turnover mensal
    ferias_indice = Column(Numeric(5, 2), default=8.33)  # 1/12 = 8.33%
    
    # Treinamento
    dias_treinamento = Column(Integer, default=15)  # Dias de treinamento
    
    # Reajustes (data e percentual)
    reajuste_data = Column(Date, nullable=True)  # Data do reajuste
    reajuste_percentual = Column(Numeric(5, 2), default=0)  # % reajuste
    
    # Dissidio
    dissidio_mes = Column(Integer, nullable=True)  # Mes do dissidio (1-12)
    dissidio_percentual = Column(Numeric(5, 2), default=0)  # % estimado
    
    # Controle
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    cenario = relationship("Cenario", back_populates="premissas", lazy="selectin")
    
    def __repr__(self):
        return f"<Premissa cenario={self.cenario_id} abs={self.absenteismo}% to={self.turnover}%>"


class QuadroPessoal(Base):
    """PosiÃ§Ã£o no quadro de pessoal de um cenÃ¡rio."""
    __tablename__ = "quadro_pessoal"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cenario_id = Column(UUID(as_uuid=True), ForeignKey("cenarios.id", ondelete="CASCADE"), nullable=False)
    cenario_secao_id = Column(UUID(as_uuid=True), ForeignKey("cenario_secao.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # VÃ­nculos
    funcao_id = Column(UUID(as_uuid=True), ForeignKey("funcoes.id", ondelete="CASCADE"), nullable=False)
    secao_id = Column(UUID(as_uuid=True), ForeignKey("secoes.id", ondelete="SET NULL"), nullable=True)
    centro_custo_id = Column(UUID(as_uuid=True), ForeignKey("centros_custo.id", ondelete="SET NULL"), nullable=True)
    tabela_salarial_id = Column(UUID(as_uuid=True), ForeignKey("tabela_salarial.id", ondelete="SET NULL"), nullable=True)
    
    # Regime
    regime = Column(String(10), nullable=False, default="CLT")  # CLT, PJ
    
    # Quantidade por mês (12 colunas para flexibilidade) - Numeric para suportar rateio fracionado
    qtd_jan = Column(Numeric(10, 2), default=0)
    qtd_fev = Column(Numeric(10, 2), default=0)
    qtd_mar = Column(Numeric(10, 2), default=0)
    qtd_abr = Column(Numeric(10, 2), default=0)
    qtd_mai = Column(Numeric(10, 2), default=0)
    qtd_jun = Column(Numeric(10, 2), default=0)
    qtd_jul = Column(Numeric(10, 2), default=0)
    qtd_ago = Column(Numeric(10, 2), default=0)
    qtd_set = Column(Numeric(10, 2), default=0)
    qtd_out = Column(Numeric(10, 2), default=0)
    qtd_nov = Column(Numeric(10, 2), default=0)
    qtd_dez = Column(Numeric(10, 2), default=0)
    
    # Override de salÃ¡rio (se diferente da tabela salarial)
    salario_override = Column(Numeric(12, 2), nullable=True)
    
    # Span de supervisão (para cargos de gestão)
    span = Column(Integer, nullable=True)  # Quantidade de subordinados
    
    # Fator PA - para cálculo de Posições de Atendimento (HC / fator = PAs)
    fator_pa = Column(Numeric(5, 2), default=1.0)
    
    # Tipo de cálculo: manual, span, rateio
    tipo_calculo = Column(String(20), default='manual')  # manual | span | rateio
    
    # Campos para SPAN (cálculo baseado em outras funções)
    span_ratio = Column(Numeric(10, 2), nullable=True)  # Ex: 35 = 1 para cada 35
    span_funcoes_base_ids = Column(JSON, nullable=True)  # Lista de IDs das funções base
    
    # Campos para RATEIO (compartilhamento entre seções)
    rateio_grupo_id = Column(UUID(as_uuid=True), nullable=True, index=True)  # Agrupa posições rateadas
    rateio_percentual = Column(Numeric(5, 2), nullable=True)  # % desta seção (ex: 40.00)
    rateio_qtd_total = Column(Integer, nullable=True)  # Qtd total a ratear (só na principal)
    
    # Observações
    observacao = Column(Text, nullable=True)
    
    # Controle
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    cenario = relationship("Cenario", back_populates="posicoes", lazy="selectin")
    cenario_secao = relationship("CenarioSecao", back_populates="quadro_pessoal", lazy="selectin")
    funcao = relationship("Funcao", lazy="selectin")
    secao = relationship("Secao", lazy="selectin")
    centro_custo = relationship("CentroCusto", lazy="selectin")
    tabela_salarial = relationship("TabelaSalarial", lazy="selectin")
    
    def __repr__(self):
        return f"<QuadroPessoal {self.funcao_id} cenario={self.cenario_id}>"


class FuncaoSpan(Base):
    """ConfiguraÃ§Ã£o de span (ratio) para cÃ¡lculo automÃ¡tico de quantidades de funÃ§Ãµes."""
    __tablename__ = "funcao_span"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cenario_id = Column(UUID(as_uuid=True), ForeignKey("cenarios.id", ondelete="CASCADE"), nullable=False, index=True)
    cenario_secao_id = Column(UUID(as_uuid=True), ForeignKey("cenario_secao.id", ondelete="CASCADE"), nullable=True, index=True)
    
    # FunÃ§Ã£o que serÃ¡ calculada via span (ex: Supervisor)
    funcao_id = Column(UUID(as_uuid=True), ForeignKey("funcoes.id", ondelete="CASCADE"), nullable=False)
    
    # FunÃ§Ãµes base para cÃ¡lculo (JSON array de UUIDs)
    # Ex: [operador_id1, operador_id2] - span serÃ¡ calculado sobre a soma dessas funÃ§Ãµes
    funcoes_base_ids = Column(JSON, nullable=False)  # JSON array de UUIDs
    
    # Ratio do span (ex: 35 significa 1 supervisor para cada 35 operadores)
    span_ratio = Column(Numeric(10, 2), nullable=False)
    
    # Controle
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    cenario = relationship("Cenario", back_populates="spans", lazy="selectin")
    cenario_secao = relationship("CenarioSecao", back_populates="spans", lazy="selectin")
    funcao = relationship("Funcao", lazy="selectin")
    
    def __repr__(self):
        return f"<FuncaoSpan {self.funcao_id} span={self.span_ratio} sobre {len(self.funcoes_base_ids or [])} funÃ§Ãµes>"


class CenarioCliente(Base):
    """Cliente associado a uma empresa dentro de um cenário de orçamento."""
    __tablename__ = "cenario_cliente"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cenario_empresa_id = Column(UUID(as_uuid=True), ForeignKey("cenarios_empresas.id", ondelete="CASCADE"), nullable=False, index=True)
    cliente_nw_codigo = Column(String(50), nullable=False, index=True)
    nome_cliente = Column(String(255), nullable=True)  # Cache do nome para exibição
    
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    cenario_empresa = relationship("CenarioEmpresa", back_populates="clientes", lazy="selectin")
    secoes = relationship("CenarioSecao", back_populates="cenario_cliente", lazy="selectin", cascade="all, delete-orphan")
    
    __table_args__ = (
        UniqueConstraint('cenario_empresa_id', 'cliente_nw_codigo', name='uq_cenario_empresa_cliente'),
    )
    
    def __repr__(self):
        return f"<CenarioCliente {self.cliente_nw_codigo} empresa={self.cenario_empresa_id}>"


class CenarioSecao(Base):
    """Seção (operação) de um cliente dentro de um cenário."""
    __tablename__ = "cenario_secao"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cenario_cliente_id = Column(UUID(as_uuid=True), ForeignKey("cenario_cliente.id", ondelete="CASCADE"), nullable=False, index=True)
    secao_id = Column(UUID(as_uuid=True), ForeignKey("secoes.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Nota: fator_pa foi movido para QuadroPessoal (por função)
    
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    cenario_cliente = relationship("CenarioCliente", back_populates="secoes", lazy="selectin")
    secao = relationship("Secao", lazy="selectin")
    quadro_pessoal = relationship("QuadroPessoal", back_populates="cenario_secao", lazy="selectin")
    spans = relationship("FuncaoSpan", back_populates="cenario_secao", lazy="selectin")
    premissas_funcao_mes = relationship("PremissaFuncaoMes", back_populates="cenario_secao", lazy="selectin")
    
    __table_args__ = (
        UniqueConstraint('cenario_cliente_id', 'secao_id', name='uq_cenario_secao'),
    )
    
    def __repr__(self):
        return f"<CenarioSecao secao={self.secao_id} cliente={self.cenario_cliente_id}>"


class PremissaFuncaoMes(Base):
    """Premissas de ineficiÃªncia por funÃ§Ã£o e por mÃªs."""
    __tablename__ = "premissa_funcao_mes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cenario_id = Column(UUID(as_uuid=True), ForeignKey("cenarios.id", ondelete="CASCADE"), nullable=False, index=True)
    cenario_secao_id = Column(UUID(as_uuid=True), ForeignKey("cenario_secao.id", ondelete="CASCADE"), nullable=True, index=True)
    funcao_id = Column(UUID(as_uuid=True), ForeignKey("funcoes.id", ondelete="CASCADE"), nullable=False)
    
    # PerÃ­odo
    mes = Column(Integer, nullable=False)  # 1-12
    ano = Column(Integer, nullable=False)
    
    # Ãndices de IneficiÃªncia (percentuais)
    absenteismo = Column(Numeric(5, 2), default=3.0)  # % absenteismo total
    abs_pct_justificado = Column(Numeric(5, 2), default=75.0)  # % do ABS que e justificado
    turnover = Column(Numeric(5, 2), default=5.0)  # % turnover mensal
    ferias_indice = Column(Numeric(5, 2), default=8.33)  # 1/12 = 8.33%
    
    # Treinamento
    dias_treinamento = Column(Integer, default=15)  # Dias de treinamento
    
    # Controle
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    cenario = relationship("Cenario", back_populates="premissas_funcao_mes", lazy="selectin")
    cenario_secao = relationship("CenarioSecao", back_populates="premissas_funcao_mes", lazy="selectin")
    funcao = relationship("Funcao", lazy="selectin")
    
    # Unique constraint: uma premissa por funÃ§Ã£o/mÃªs/ano/cenÃ¡rio/seÃ§Ã£o
    __table_args__ = (
        UniqueConstraint('cenario_id', 'cenario_secao_id', 'funcao_id', 'mes', 'ano', name='uq_premissa_funcao_mes_v2'),
    )
    
    def __repr__(self):
        return f"<PremissaFuncaoMes cenario={self.cenario_id} funcao={self.funcao_id} {self.mes:02d}/{self.ano}>"

