"""
Modelos do módulo de Orçamento.
Todos os dados são armazenados no PostgreSQL SIG.
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
    codigo_totvs = Column(String(50), nullable=True, index=True)  # Vínculo opcional com GDEPTO
    nome = Column(String(200), nullable=False)
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    secoes = relationship("Secao", back_populates="departamento", lazy="selectin")
    
    def __repr__(self):
        return f"<Departamento {self.codigo}: {self.nome}>"


class Secao(Base):
    """Seção dentro de um departamento."""
    __tablename__ = "secoes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    departamento_id = Column(UUID(as_uuid=True), ForeignKey("departamentos.id", ondelete="CASCADE"), nullable=False)
    codigo = Column(String(50), unique=True, nullable=False, index=True)
    codigo_totvs = Column(String(50), nullable=True, index=True)  # Vínculo opcional com PSECAO
    nome = Column(String(200), nullable=False)
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    departamento = relationship("Departamento", back_populates="secoes", lazy="selectin")
    
    def __repr__(self):
        return f"<Secao {self.codigo}: {self.nome}>"


class CentroCusto(Base):
    """Centro de Custo para alocação de custos."""
    __tablename__ = "centros_custo"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    codigo = Column(String(50), unique=True, nullable=False, index=True)
    codigo_totvs = Column(String(50), nullable=True, index=True)  # Vínculo opcional com PCCUSTO
    nome = Column(String(200), nullable=False)
    
    # Classificação
    tipo = Column(String(30), nullable=False, default="OPERACIONAL")  # OPERACIONAL, ADMINISTRATIVO, OVERHEAD
    cliente = Column(String(200), nullable=True)  # Nome do cliente (quando aplicável)
    contrato = Column(String(100), nullable=True)  # Referência do contrato
    
    # Localização (para cálculo de feriados)
    uf = Column(String(2), nullable=True)
    cidade = Column(String(100), nullable=True)
    
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<CentroCusto {self.codigo}: {self.nome}>"


class Feriado(Base):
    """Feriados para cálculo de dias úteis/trabalhados."""
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
    """Função/Cargo para o orçamento de pessoal."""
    __tablename__ = "funcoes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    codigo = Column(String(50), unique=True, nullable=False, index=True)
    codigo_totvs = Column(String(50), nullable=True, index=True)  # Vínculo opcional com PFUNCAO
    nome = Column(String(200), nullable=False)
    cbo = Column(String(20), nullable=True)  # Código Brasileiro de Ocupações
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<Funcao {self.codigo}: {self.nome}>"


class Empresa(Base):
    """Empresa do grupo para configurações específicas (tributos, encargos, etc.)."""
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
    
    # Identificação
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
    
    # Identificação do encargo
    codigo = Column(String(50), nullable=False)  # INSS_EMPRESA, INSS_TERCEIROS, SAT_RAT
    nome = Column(String(200), nullable=False)
    
    # Valor
    aliquota = Column(Numeric(10, 4), nullable=False)  # Percentual (ex: 20.0000 = 20%)
    base_calculo = Column(String(50), nullable=False, default="SALARIO")  # SALARIO, TOTAL
    
    # Controle
    ordem = Column(Integer, default=0)  # Ordem de exibição
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    empresa = relationship("Empresa", back_populates="encargos", lazy="selectin")
    
    def __repr__(self):
        return f"<Encargo {self.codigo}: {self.nome} ({self.aliquota}%)>"


class Provisao(Base):
    """Provisões de mão de obra (13º, Férias, Demandas Trabalhistas)."""
    __tablename__ = "provisoes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Identificação
    codigo = Column(String(50), unique=True, nullable=False, index=True)  # 13_SALARIO, FERIAS, DEMANDAS
    nome = Column(String(200), nullable=False)
    descricao = Column(Text, nullable=True)
    
    # Valor padrão
    percentual = Column(Numeric(10, 4), nullable=False)  # Percentual sobre salário
    incide_encargos = Column(Boolean, default=True)  # Se encargos incidem sobre esta provisão
    
    # Controle
    ordem = Column(Integer, default=0)
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<Provisao {self.codigo}: {self.nome} ({self.percentual}%)>"


class PoliticaBeneficio(Base):
    """Política/Template de benefícios reutilizável."""
    __tablename__ = "politicas_beneficio"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    codigo = Column(String(50), unique=True, nullable=False, index=True)
    nome = Column(String(200), nullable=False)
    descricao = Column(Text, nullable=True)
    regime = Column(String(10), nullable=False, default="CLT")  # CLT, PJ
    
    # Jornada e Escala
    escala = Column(String(20), nullable=False, default="6x1")  # 5x2, 6x1, 12x36
    jornada_mensal = Column(Integer, nullable=False, default=180)  # Horas/mês
    
    # Benefícios (valores diários ou mensais)
    vt_dia = Column(Numeric(10, 2), default=0)  # VT por dia trabalhado
    vt_desconto_6pct = Column(Boolean, default=True)  # Aplica desconto 6%?
    vr_dia = Column(Numeric(10, 2), default=0)  # VR por dia trabalhado
    va_dia = Column(Numeric(10, 2), default=0)  # VA por dia trabalhado
    plano_saude = Column(Numeric(10, 2), default=0)  # Plano saúde mensal
    plano_dental = Column(Numeric(10, 2), default=0)  # Plano dental mensal
    seguro_vida = Column(Numeric(10, 2), default=0)  # Seguro vida mensal
    aux_creche = Column(Numeric(10, 2), default=0)  # Valor aux creche
    aux_creche_percentual = Column(Numeric(5, 2), default=0)  # % do quadro que recebe
    aux_home_office = Column(Numeric(10, 2), default=0)  # Auxílio home office mensal
    
    # Treinamento
    dias_treinamento = Column(Integer, default=15)  # Dias de treinamento inicial
    
    # Controle
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<PoliticaBeneficio {self.codigo}: {self.nome}>"


class FaixaSalarial(Base):
    """Faixa salarial (Júnior, Pleno, Sênior, etc.)."""
    __tablename__ = "faixas_salariais"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    codigo = Column(String(20), unique=True, nullable=False, index=True)
    nome = Column(String(100), nullable=False)
    ordem = Column(Integer, default=0)  # Para ordenação
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<FaixaSalarial {self.codigo}: {self.nome}>"


class TabelaSalarial(Base):
    """Tabela salarial: Função + Regime + Faixa + Política = Salário."""
    __tablename__ = "tabela_salarial"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Vínculos
    funcao_id = Column(UUID(as_uuid=True), ForeignKey("funcoes.id", ondelete="CASCADE"), nullable=False)
    faixa_id = Column(UUID(as_uuid=True), ForeignKey("faixas_salariais.id", ondelete="SET NULL"), nullable=True)
    politica_id = Column(UUID(as_uuid=True), ForeignKey("politicas_beneficio.id", ondelete="SET NULL"), nullable=True)
    
    # Regime
    regime = Column(String(10), nullable=False, default="CLT")  # CLT, PJ
    
    # Salário
    salario_base = Column(Numeric(12, 2), nullable=False)
    
    # Override de benefícios (se diferente da política)
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
# CENÁRIOS DE ORÇAMENTO
# ============================================

# Tabela de associação para múltiplas empresas por cenário
class CenarioEmpresa(Base):
    """Associação many-to-many entre Cenários e Empresas."""
    __tablename__ = "cenarios_empresas"
    
    cenario_id = Column(UUID(as_uuid=True), ForeignKey("cenarios.id", ondelete="CASCADE"), primary_key=True)
    empresa_id = Column(UUID(as_uuid=True), ForeignKey("empresas.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    cenario = relationship("Cenario", back_populates="empresas_rel")
    empresa = relationship("Empresa", back_populates="cenarios_rel")


class Cenario(Base):
    """Cenário de orçamento de pessoal."""
    __tablename__ = "cenarios"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Identificação
    codigo = Column(String(50), unique=True, nullable=False, index=True)
    nome = Column(String(200), nullable=False)
    descricao = Column(Text, nullable=True)
    
    # Cliente do NW (código do cliente na tabela clifor)
    cliente_nw_codigo = Column(String(50), nullable=True, index=True)
    
    # Período flexível (permite cruzar anos)
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
    clientes = relationship("CenarioCliente", back_populates="cenario", lazy="selectin", cascade="all, delete-orphan")
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
    """Premissas/índices de um cenário de orçamento."""
    __tablename__ = "premissas"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cenario_id = Column(UUID(as_uuid=True), ForeignKey("cenarios.id", ondelete="CASCADE"), nullable=False)
    
    # Índices de Ineficiência (percentuais)
    absenteismo = Column(Numeric(5, 2), default=3.0)  # % absenteísmo
    turnover = Column(Numeric(5, 2), default=5.0)  # % turnover mensal
    ferias_indice = Column(Numeric(5, 2), default=8.33)  # 1/12 = 8.33%
    
    # Treinamento
    dias_treinamento = Column(Integer, default=15)  # Dias de treinamento por novo funcionário
    
    # Reajustes (data e percentual)
    reajuste_data = Column(Date, nullable=True)  # Data do reajuste
    reajuste_percentual = Column(Numeric(5, 2), default=0)  # % reajuste
    
    # Dissídio
    dissidio_mes = Column(Integer, nullable=True)  # Mês do dissídio (1-12)
    dissidio_percentual = Column(Numeric(5, 2), default=0)  # % estimado
    
    # Controle
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    cenario = relationship("Cenario", back_populates="premissas", lazy="selectin")
    
    def __repr__(self):
        return f"<Premissa cenario={self.cenario_id} abs={self.absenteismo}% to={self.turnover}%>"


class QuadroPessoal(Base):
    """Posição no quadro de pessoal de um cenário."""
    __tablename__ = "quadro_pessoal"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cenario_id = Column(UUID(as_uuid=True), ForeignKey("cenarios.id", ondelete="CASCADE"), nullable=False)
    cenario_secao_id = Column(UUID(as_uuid=True), ForeignKey("cenario_secao.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Vínculos
    funcao_id = Column(UUID(as_uuid=True), ForeignKey("funcoes.id", ondelete="CASCADE"), nullable=False)
    secao_id = Column(UUID(as_uuid=True), ForeignKey("secoes.id", ondelete="SET NULL"), nullable=True)
    centro_custo_id = Column(UUID(as_uuid=True), ForeignKey("centros_custo.id", ondelete="SET NULL"), nullable=True)
    tabela_salarial_id = Column(UUID(as_uuid=True), ForeignKey("tabela_salarial.id", ondelete="SET NULL"), nullable=True)
    
    # Regime
    regime = Column(String(10), nullable=False, default="CLT")  # CLT, PJ
    
    # Quantidade por mês (12 colunas para flexibilidade)
    qtd_jan = Column(Integer, default=0)
    qtd_fev = Column(Integer, default=0)
    qtd_mar = Column(Integer, default=0)
    qtd_abr = Column(Integer, default=0)
    qtd_mai = Column(Integer, default=0)
    qtd_jun = Column(Integer, default=0)
    qtd_jul = Column(Integer, default=0)
    qtd_ago = Column(Integer, default=0)
    qtd_set = Column(Integer, default=0)
    qtd_out = Column(Integer, default=0)
    qtd_nov = Column(Integer, default=0)
    qtd_dez = Column(Integer, default=0)
    
    # Override de salário (se diferente da tabela salarial)
    salario_override = Column(Numeric(12, 2), nullable=True)
    
    # Span de supervisão (para cargos de gestão)
    span = Column(Integer, nullable=True)  # Quantidade de subordinados
    
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
    """Configuração de span (ratio) para cálculo automático de quantidades de funções."""
    __tablename__ = "funcao_span"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cenario_id = Column(UUID(as_uuid=True), ForeignKey("cenarios.id", ondelete="CASCADE"), nullable=False, index=True)
    cenario_secao_id = Column(UUID(as_uuid=True), ForeignKey("cenario_secao.id", ondelete="CASCADE"), nullable=True, index=True)
    
    # Função que será calculada via span (ex: Supervisor)
    funcao_id = Column(UUID(as_uuid=True), ForeignKey("funcoes.id", ondelete="CASCADE"), nullable=False)
    
    # Funções base para cálculo (JSON array de UUIDs)
    # Ex: [operador_id1, operador_id2] - span será calculado sobre a soma dessas funções
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
        return f"<FuncaoSpan {self.funcao_id} span={self.span_ratio} sobre {len(self.funcoes_base_ids or [])} funções>"


class CenarioCliente(Base):
    """Cliente associado a um cenário de orçamento."""
    __tablename__ = "cenario_cliente"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cenario_id = Column(UUID(as_uuid=True), ForeignKey("cenarios.id", ondelete="CASCADE"), nullable=False, index=True)
    cliente_nw_codigo = Column(String(50), nullable=False, index=True)
    nome_cliente = Column(String(255), nullable=True)  # Cache do nome para exibição
    
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    cenario = relationship("Cenario", back_populates="clientes", lazy="selectin")
    secoes = relationship("CenarioSecao", back_populates="cenario_cliente", lazy="selectin", cascade="all, delete-orphan")
    
    __table_args__ = (
        UniqueConstraint('cenario_id', 'cliente_nw_codigo', name='uq_cenario_cliente'),
    )
    
    def __repr__(self):
        return f"<CenarioCliente {self.cliente_nw_codigo} cenario={self.cenario_id}>"


class CenarioSecao(Base):
    """Seção (operação) de um cliente dentro de um cenário."""
    __tablename__ = "cenario_secao"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cenario_cliente_id = Column(UUID(as_uuid=True), ForeignKey("cenario_cliente.id", ondelete="CASCADE"), nullable=False, index=True)
    secao_id = Column(UUID(as_uuid=True), ForeignKey("secoes.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Configurações específicas da seção no cenário
    fator_pa = Column(Numeric(5, 2), default=3.0)  # Fator para calcular PAs (HC / fator = PAs)
    
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
    """Premissas de ineficiência por função e por mês."""
    __tablename__ = "premissa_funcao_mes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cenario_id = Column(UUID(as_uuid=True), ForeignKey("cenarios.id", ondelete="CASCADE"), nullable=False, index=True)
    cenario_secao_id = Column(UUID(as_uuid=True), ForeignKey("cenario_secao.id", ondelete="CASCADE"), nullable=True, index=True)
    funcao_id = Column(UUID(as_uuid=True), ForeignKey("funcoes.id", ondelete="CASCADE"), nullable=False)
    
    # Período
    mes = Column(Integer, nullable=False)  # 1-12
    ano = Column(Integer, nullable=False)
    
    # Índices de Ineficiência (percentuais)
    absenteismo = Column(Numeric(5, 2), default=3.0)  # % absenteísmo
    turnover = Column(Numeric(5, 2), default=5.0)  # % turnover mensal
    ferias_indice = Column(Numeric(5, 2), default=8.33)  # 1/12 = 8.33%
    
    # Treinamento
    dias_treinamento = Column(Integer, default=15)  # Dias de treinamento por novo funcionário
    
    # Controle
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    cenario = relationship("Cenario", back_populates="premissas_funcao_mes", lazy="selectin")
    cenario_secao = relationship("CenarioSecao", back_populates="premissas_funcao_mes", lazy="selectin")
    funcao = relationship("Funcao", lazy="selectin")
    
    # Unique constraint: uma premissa por função/mês/ano/cenário/seção
    __table_args__ = (
        UniqueConstraint('cenario_id', 'cenario_secao_id', 'funcao_id', 'mes', 'ano', name='uq_premissa_funcao_mes_v2'),
    )
    
    def __repr__(self):
        return f"<PremissaFuncaoMes cenario={self.cenario_id} funcao={self.funcao_id} {self.mes:02d}/{self.ano}>"

class Funcao(Base):
    """Função/Cargo para o orçamento de pessoal."""
    __tablename__ = "funcoes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    codigo = Column(String(50), unique=True, nullable=False, index=True)
    codigo_totvs = Column(String(50), nullable=True, index=True)  # Vínculo opcional com PFUNCAO
    nome = Column(String(200), nullable=False)
    cbo = Column(String(20), nullable=True)  # Código Brasileiro de Ocupações
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<Funcao {self.codigo}: {self.nome}>"


class Empresa(Base):
    """Empresa do grupo para configurações específicas (tributos, encargos, etc.)."""
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
    
    # Identificação
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
    
    # Identificação do encargo
    codigo = Column(String(50), nullable=False)  # INSS_EMPRESA, INSS_TERCEIROS, SAT_RAT
    nome = Column(String(200), nullable=False)
    
    # Valor
    aliquota = Column(Numeric(10, 4), nullable=False)  # Percentual (ex: 20.0000 = 20%)
    base_calculo = Column(String(50), nullable=False, default="SALARIO")  # SALARIO, TOTAL
    
    # Controle
    ordem = Column(Integer, default=0)  # Ordem de exibição
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    empresa = relationship("Empresa", back_populates="encargos", lazy="selectin")
    
    def __repr__(self):
        return f"<Encargo {self.codigo}: {self.nome} ({self.aliquota}%)>"


class Provisao(Base):
    """Provisões de mão de obra (13º, Férias, Demandas Trabalhistas)."""
    __tablename__ = "provisoes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Identificação
    codigo = Column(String(50), unique=True, nullable=False, index=True)  # 13_SALARIO, FERIAS, DEMANDAS
    nome = Column(String(200), nullable=False)
    descricao = Column(Text, nullable=True)
    
    # Valor padrão
    percentual = Column(Numeric(10, 4), nullable=False)  # Percentual sobre salário
    incide_encargos = Column(Boolean, default=True)  # Se encargos incidem sobre esta provisão
    
    # Controle
    ordem = Column(Integer, default=0)
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<Provisao {self.codigo}: {self.nome} ({self.percentual}%)>"


class PoliticaBeneficio(Base):
    """Política/Template de benefícios reutilizável."""
    __tablename__ = "politicas_beneficio"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    codigo = Column(String(50), unique=True, nullable=False, index=True)
    nome = Column(String(200), nullable=False)
    descricao = Column(Text, nullable=True)
    regime = Column(String(10), nullable=False, default="CLT")  # CLT, PJ
    
    # Jornada e Escala
    escala = Column(String(20), nullable=False, default="6x1")  # 5x2, 6x1, 12x36
    jornada_mensal = Column(Integer, nullable=False, default=180)  # Horas/mês
    
    # Benefícios (valores diários ou mensais)
    vt_dia = Column(Numeric(10, 2), default=0)  # VT por dia trabalhado
    vt_desconto_6pct = Column(Boolean, default=True)  # Aplica desconto 6%?
    vr_dia = Column(Numeric(10, 2), default=0)  # VR por dia trabalhado
    va_dia = Column(Numeric(10, 2), default=0)  # VA por dia trabalhado
    plano_saude = Column(Numeric(10, 2), default=0)  # Plano saúde mensal
    plano_dental = Column(Numeric(10, 2), default=0)  # Plano dental mensal
    seguro_vida = Column(Numeric(10, 2), default=0)  # Seguro vida mensal
    aux_creche = Column(Numeric(10, 2), default=0)  # Valor aux creche
    aux_creche_percentual = Column(Numeric(5, 2), default=0)  # % do quadro que recebe
    aux_home_office = Column(Numeric(10, 2), default=0)  # Auxílio home office mensal
    
    # Treinamento
    dias_treinamento = Column(Integer, default=15)  # Dias de treinamento inicial
    
    # Controle
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<PoliticaBeneficio {self.codigo}: {self.nome}>"


class FaixaSalarial(Base):
    """Faixa salarial (Júnior, Pleno, Sênior, etc.)."""
    __tablename__ = "faixas_salariais"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    codigo = Column(String(20), unique=True, nullable=False, index=True)
    nome = Column(String(100), nullable=False)
    ordem = Column(Integer, default=0)  # Para ordenação
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<FaixaSalarial {self.codigo}: {self.nome}>"


class TabelaSalarial(Base):
    """Tabela salarial: Função + Regime + Faixa + Política = Salário."""
    __tablename__ = "tabela_salarial"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Vínculos
    funcao_id = Column(UUID(as_uuid=True), ForeignKey("funcoes.id", ondelete="CASCADE"), nullable=False)
    faixa_id = Column(UUID(as_uuid=True), ForeignKey("faixas_salariais.id", ondelete="SET NULL"), nullable=True)
    politica_id = Column(UUID(as_uuid=True), ForeignKey("politicas_beneficio.id", ondelete="SET NULL"), nullable=True)
    
    # Regime
    regime = Column(String(10), nullable=False, default="CLT")  # CLT, PJ
    
    # Salário
    salario_base = Column(Numeric(12, 2), nullable=False)
    
    # Override de benefícios (se diferente da política)
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
# CENÁRIOS DE ORÇAMENTO
# ============================================

# Tabela de associação para múltiplas empresas por cenário
class CenarioEmpresa(Base):
    """Associação many-to-many entre Cenários e Empresas."""
    __tablename__ = "cenarios_empresas"
    
    cenario_id = Column(UUID(as_uuid=True), ForeignKey("cenarios.id", ondelete="CASCADE"), primary_key=True)
    empresa_id = Column(UUID(as_uuid=True), ForeignKey("empresas.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    cenario = relationship("Cenario", back_populates="empresas_rel")
    empresa = relationship("Empresa", back_populates="cenarios_rel")


class Cenario(Base):
    """Cenário de orçamento de pessoal."""
    __tablename__ = "cenarios"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Identificação
    codigo = Column(String(50), unique=True, nullable=False, index=True)
    nome = Column(String(200), nullable=False)
    descricao = Column(Text, nullable=True)
    
    # Cliente do NW (código do cliente na tabela clifor)
    cliente_nw_codigo = Column(String(50), nullable=True, index=True)
    
    # Período flexível (permite cruzar anos)
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
    clientes = relationship("CenarioCliente", back_populates="cenario", lazy="selectin", cascade="all, delete-orphan")
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
    """Premissas/índices de um cenário de orçamento."""
    __tablename__ = "premissas"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cenario_id = Column(UUID(as_uuid=True), ForeignKey("cenarios.id", ondelete="CASCADE"), nullable=False)
    
    # Índices de Ineficiência (percentuais)
    absenteismo = Column(Numeric(5, 2), default=3.0)  # % absenteísmo
    turnover = Column(Numeric(5, 2), default=5.0)  # % turnover mensal
    ferias_indice = Column(Numeric(5, 2), default=8.33)  # 1/12 = 8.33%
    
    # Treinamento
    dias_treinamento = Column(Integer, default=15)  # Dias de treinamento por novo funcionário
    
    # Reajustes (data e percentual)
    reajuste_data = Column(Date, nullable=True)  # Data do reajuste
    reajuste_percentual = Column(Numeric(5, 2), default=0)  # % reajuste
    
    # Dissídio
    dissidio_mes = Column(Integer, nullable=True)  # Mês do dissídio (1-12)
    dissidio_percentual = Column(Numeric(5, 2), default=0)  # % estimado
    
    # Controle
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    cenario = relationship("Cenario", back_populates="premissas", lazy="selectin")
    
    def __repr__(self):
        return f"<Premissa cenario={self.cenario_id} abs={self.absenteismo}% to={self.turnover}%>"


class QuadroPessoal(Base):
    """Posição no quadro de pessoal de um cenário."""
    __tablename__ = "quadro_pessoal"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cenario_id = Column(UUID(as_uuid=True), ForeignKey("cenarios.id", ondelete="CASCADE"), nullable=False)
    cenario_secao_id = Column(UUID(as_uuid=True), ForeignKey("cenario_secao.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Vínculos
    funcao_id = Column(UUID(as_uuid=True), ForeignKey("funcoes.id", ondelete="CASCADE"), nullable=False)
    secao_id = Column(UUID(as_uuid=True), ForeignKey("secoes.id", ondelete="SET NULL"), nullable=True)
    centro_custo_id = Column(UUID(as_uuid=True), ForeignKey("centros_custo.id", ondelete="SET NULL"), nullable=True)
    tabela_salarial_id = Column(UUID(as_uuid=True), ForeignKey("tabela_salarial.id", ondelete="SET NULL"), nullable=True)
    
    # Regime
    regime = Column(String(10), nullable=False, default="CLT")  # CLT, PJ
    
    # Quantidade por mês (12 colunas para flexibilidade)
    qtd_jan = Column(Integer, default=0)
    qtd_fev = Column(Integer, default=0)
    qtd_mar = Column(Integer, default=0)
    qtd_abr = Column(Integer, default=0)
    qtd_mai = Column(Integer, default=0)
    qtd_jun = Column(Integer, default=0)
    qtd_jul = Column(Integer, default=0)
    qtd_ago = Column(Integer, default=0)
    qtd_set = Column(Integer, default=0)
    qtd_out = Column(Integer, default=0)
    qtd_nov = Column(Integer, default=0)
    qtd_dez = Column(Integer, default=0)
    
    # Override de salário (se diferente da tabela salarial)
    salario_override = Column(Numeric(12, 2), nullable=True)
    
    # Span de supervisão (para cargos de gestão)
    span = Column(Integer, nullable=True)  # Quantidade de subordinados
    
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
    """Configuração de span (ratio) para cálculo automático de quantidades de funções."""
    __tablename__ = "funcao_span"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cenario_id = Column(UUID(as_uuid=True), ForeignKey("cenarios.id", ondelete="CASCADE"), nullable=False, index=True)
    cenario_secao_id = Column(UUID(as_uuid=True), ForeignKey("cenario_secao.id", ondelete="CASCADE"), nullable=True, index=True)
    
    # Função que será calculada via span (ex: Supervisor)
    funcao_id = Column(UUID(as_uuid=True), ForeignKey("funcoes.id", ondelete="CASCADE"), nullable=False)
    
    # Funções base para cálculo (JSON array de UUIDs)
    # Ex: [operador_id1, operador_id2] - span será calculado sobre a soma dessas funções
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
        return f"<FuncaoSpan {self.funcao_id} span={self.span_ratio} sobre {len(self.funcoes_base_ids or [])} funções>"


class CenarioCliente(Base):
    """Cliente associado a um cenário de orçamento."""
    __tablename__ = "cenario_cliente"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cenario_id = Column(UUID(as_uuid=True), ForeignKey("cenarios.id", ondelete="CASCADE"), nullable=False, index=True)
    cliente_nw_codigo = Column(String(50), nullable=False, index=True)
    nome_cliente = Column(String(255), nullable=True)  # Cache do nome para exibição
    
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    cenario = relationship("Cenario", back_populates="clientes", lazy="selectin")
    secoes = relationship("CenarioSecao", back_populates="cenario_cliente", lazy="selectin", cascade="all, delete-orphan")
    
    __table_args__ = (
        UniqueConstraint('cenario_id', 'cliente_nw_codigo', name='uq_cenario_cliente'),
    )
    
    def __repr__(self):
        return f"<CenarioCliente {self.cliente_nw_codigo} cenario={self.cenario_id}>"


class CenarioSecao(Base):
    """Seção (operação) de um cliente dentro de um cenário."""
    __tablename__ = "cenario_secao"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cenario_cliente_id = Column(UUID(as_uuid=True), ForeignKey("cenario_cliente.id", ondelete="CASCADE"), nullable=False, index=True)
    secao_id = Column(UUID(as_uuid=True), ForeignKey("secoes.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Configurações específicas da seção no cenário
    fator_pa = Column(Numeric(5, 2), default=3.0)  # Fator para calcular PAs (HC / fator = PAs)
    
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
    """Premissas de ineficiência por função e por mês."""
    __tablename__ = "premissa_funcao_mes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cenario_id = Column(UUID(as_uuid=True), ForeignKey("cenarios.id", ondelete="CASCADE"), nullable=False, index=True)
    cenario_secao_id = Column(UUID(as_uuid=True), ForeignKey("cenario_secao.id", ondelete="CASCADE"), nullable=True, index=True)
    funcao_id = Column(UUID(as_uuid=True), ForeignKey("funcoes.id", ondelete="CASCADE"), nullable=False)
    
    # Período
    mes = Column(Integer, nullable=False)  # 1-12
    ano = Column(Integer, nullable=False)
    
    # Índices de Ineficiência (percentuais)
    absenteismo = Column(Numeric(5, 2), default=3.0)  # % absenteísmo
    turnover = Column(Numeric(5, 2), default=5.0)  # % turnover mensal
    ferias_indice = Column(Numeric(5, 2), default=8.33)  # 1/12 = 8.33%
    
    # Treinamento
    dias_treinamento = Column(Integer, default=15)  # Dias de treinamento por novo funcionário
    
    # Controle
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    cenario = relationship("Cenario", back_populates="premissas_funcao_mes", lazy="selectin")
    cenario_secao = relationship("CenarioSecao", back_populates="premissas_funcao_mes", lazy="selectin")
    funcao = relationship("Funcao", lazy="selectin")
    
    # Unique constraint: uma premissa por função/mês/ano/cenário/seção
    __table_args__ = (
        UniqueConstraint('cenario_id', 'cenario_secao_id', 'funcao_id', 'mes', 'ano', name='uq_premissa_funcao_mes_v2'),
    )
    
    def __repr__(self):
        return f"<PremissaFuncaoMes cenario={self.cenario_id} funcao={self.funcao_id} {self.mes:02d}/{self.ano}>"