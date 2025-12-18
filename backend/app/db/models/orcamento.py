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
    """Função/Cargo para o orçamento de pessoal."""
    __tablename__ = "funcoes"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    codigo = Column(String(50), unique=True, nullable=False, index=True)
    codigo_totvs = Column(String(50), nullable=True, index=True)  # Vínculo opcional com PFUNCAO
    nome = Column(String(200), nullable=False)
    cbo = Column(String(20), nullable=True)  # Código Brasileiro de Ocupações
    
    # Campos para cálculo de custos
    jornada_mensal = Column(Integer, nullable=False, default=180)  # Horas/mês (180 ou 220)
    is_home_office = Column(Boolean, default=False)  # Se função é home office (não recebe VT)
    is_pj = Column(Boolean, default=False)  # Se função é PJ (honorários)
    
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<Funcao {self.codigo}: {self.nome}>"


class Fornecedor(Base):
    """Fornecedor de produtos/serviços de tecnologia."""
    __tablename__ = "fornecedores"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    codigo = Column(String(50), unique=True, nullable=False, index=True)
    codigo_nw = Column(String(50), nullable=True, index=True)  # Vínculo opcional com NW clifor
    nome = Column(String(200), nullable=False)
    nome_fantasia = Column(String(200), nullable=True)
    cnpj = Column(String(20), nullable=True)
    
    # Contato
    contato_nome = Column(String(200), nullable=True)
    contato_email = Column(String(200), nullable=True)
    contato_telefone = Column(String(50), nullable=True)
    
    # Observações
    observacao = Column(Text, nullable=True)
    
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    produtos = relationship("ProdutoTecnologia", back_populates="fornecedor", lazy="selectin")
    
    def __repr__(self):
        return f"<Fornecedor {self.codigo}: {self.nome}>"


class ProdutoTecnologia(Base):
    """Produto/Solução de tecnologia (Discador, URA, Automação, etc.)."""
    __tablename__ = "produtos_tecnologia"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    fornecedor_id = Column(UUID(as_uuid=True), ForeignKey("fornecedores.id", ondelete="CASCADE"), nullable=False)
    
    codigo = Column(String(50), unique=True, nullable=False, index=True)
    nome = Column(String(200), nullable=False)
    categoria = Column(String(50), nullable=False)  # DISCADOR, URA, AGENTE_VIRTUAL, AUTOMACAO, QUALIDADE, etc.
    
    # Valor de referência/tabela (pode ser sobrescrito na alocação)
    valor_base = Column(Numeric(12, 2), nullable=True)  # Valor base/tabela do fornecedor
    unidade_medida = Column(String(30), nullable=True)  # licença, PA, HC, etc.
    
    # Conta contábil padrão (comentado temporariamente até criar tabela contas_contabeis)
    # conta_contabil_id = Column(UUID(as_uuid=True), ForeignKey("contas_contabeis.id", ondelete="SET NULL"), nullable=True)
    conta_contabil_id = Column(UUID(as_uuid=True), nullable=True)  # Sem FK por enquanto
    
    # Observações
    descricao = Column(Text, nullable=True)
    
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    fornecedor = relationship("Fornecedor", back_populates="produtos", lazy="selectin")
    # conta_contabil = relationship("ContaContabil", lazy="selectin")  # Comentado até criar tabela
    
    def __repr__(self):
        return f"<ProdutoTecnologia {self.codigo}: {self.nome}>"


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
    
    # Descontos de benefícios (percentuais sobre o valor do benefício)
    pct_desconto_vt = Column(Numeric(5, 2), default=6.0)  # 6% do salário, limitado ao VT
    pct_desconto_vr = Column(Numeric(5, 2), default=0)  # % sobre valor do VR
    pct_desconto_am = Column(Numeric(5, 2), default=0)  # % sobre valor do plano
    
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
    posicoes = relationship("QuadroPessoal", back_populates="cenario", lazy="selectin", cascade="all, delete-orphan")
    spans = relationship("FuncaoSpan", back_populates="cenario", lazy="selectin", cascade="all, delete-orphan")
    premissas_funcao_mes = relationship("PremissaFuncaoMes", back_populates="cenario", lazy="selectin", cascade="all, delete-orphan")
    custos_calculados = relationship("CustoCalculado", back_populates="cenario", lazy="selectin", cascade="all, delete-orphan")
    parametros_custo = relationship("ParametroCusto", back_populates="cenario", lazy="selectin", cascade="all, delete-orphan")
    
    @property
    def empresas(self):
        """Retorna lista de empresas associadas."""
        return [rel.empresa for rel in self.empresas_rel]
    
    def __repr__(self):
        return f"<Cenario {self.codigo}: {self.nome} ({self.ano_inicio}/{self.mes_inicio:02d} - {self.ano_fim}/{self.mes_fim:02d})>"



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


class AlocacaoTecnologia(Base):
    """Alocação de produto de tecnologia em uma seção do cenário."""
    __tablename__ = "alocacoes_tecnologia"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cenario_id = Column(UUID(as_uuid=True), ForeignKey("cenarios.id", ondelete="CASCADE"), nullable=False)
    cenario_secao_id = Column(UUID(as_uuid=True), ForeignKey("cenario_secao.id", ondelete="CASCADE"), nullable=False)
    produto_id = Column(UUID(as_uuid=True), ForeignKey("produtos_tecnologia.id", ondelete="CASCADE"), nullable=False)
    
    # Tipo de alocação
    tipo_alocacao = Column(String(30), nullable=False, default="FIXO")
    # FIXO (só valor fixo), FIXO_VARIAVEL (fixo + variável), VARIAVEL (só variável)
    
    # Valores mensais FIXOS (para FIXO e FIXO_VARIAVEL)
    valor_fixo_mensal = Column(Numeric(12, 2), nullable=True)  # Valor fixo mensal
    
    # Componente VARIÁVEL (para VARIAVEL e FIXO_VARIAVEL)
    tipo_variavel = Column(String(20), nullable=True)  # POR_PA, POR_HC
    valor_unitario_variavel = Column(Numeric(12, 2), nullable=True)  # Valor por unidade (PA ou HC)
    fator_multiplicador = Column(Numeric(10, 4), default=1.0)  # Multiplicador para o cálculo
    
    # Observações
    observacao = Column(Text, nullable=True)
    
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    cenario = relationship("Cenario", lazy="selectin")
    cenario_secao = relationship("CenarioSecao", lazy="selectin")
    produto = relationship("ProdutoTecnologia", lazy="selectin")
    
    def __repr__(self):
        return f"<AlocacaoTecnologia {self.produto.nome if self.produto else 'N/A'} - Cenário {self.cenario_id}>"


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
    quadro_pessoal = relationship("QuadroPessoal", back_populates="cenario_secao", lazy="selectin", cascade="all, delete-orphan")
    spans = relationship("FuncaoSpan", back_populates="cenario_secao", lazy="selectin", cascade="all, delete-orphan")
    premissas_funcao_mes = relationship("PremissaFuncaoMes", back_populates="cenario_secao", lazy="selectin", cascade="all, delete-orphan")
    
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


# ============================================
# MÓDULO DE CUSTOS
# ============================================

class TipoCusto(Base):
    """Rubrica de custo pré-definida (30 tipos padrão)."""
    __tablename__ = "tipos_custo"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    codigo = Column(String(50), unique=True, nullable=False, index=True)
    nome = Column(String(200), nullable=False)
    descricao = Column(Text, nullable=True)
    
    # Categoria da rubrica
    categoria = Column(String(30), nullable=False)  # REMUNERACAO, BENEFICIO, ENCARGO, PROVISAO, PREMIO, DESCONTO
    
    # Tipo de cálculo
    tipo_calculo = Column(String(30), nullable=False)  # HC_X_SALARIO, HC_X_VALOR, PERCENTUAL_RUBRICA, PERCENTUAL_RECEITA, FORMULA
    
    # Vínculo com conta contábil (código da view NW)
    conta_contabil_codigo = Column(String(50), nullable=True, index=True)
    conta_contabil_descricao = Column(String(255), nullable=True)  # Cache da descrição
    
    # Flags de incidência - determinam se esta rubrica entra na base de cálculo de outras
    incide_fgts = Column(Boolean, default=False)  # Entra na base de FGTS?
    incide_inss = Column(Boolean, default=False)  # Entra na base de INSS?
    reflexo_ferias = Column(Boolean, default=False)  # Reflete em férias?
    reflexo_13 = Column(Boolean, default=False)  # Reflete em 13º?
    
    # Alíquota/Percentual padrão (para rubricas de percentual)
    aliquota_padrao = Column(Numeric(10, 4), nullable=True)  # Ex: 8.0 para FGTS
    
    # Rubrica base para cálculo (quando tipo_calculo = PERCENTUAL_RUBRICA)
    rubrica_base_id = Column(UUID(as_uuid=True), ForeignKey("tipos_custo.id", ondelete="SET NULL"), nullable=True)
    
    # Ordem de exibição e cálculo (importante para dependências)
    ordem = Column(Integer, default=0)
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Self-referential relationship
    rubrica_base = relationship("TipoCusto", remote_side=[id], lazy="selectin")
    
    def __repr__(self):
        return f"<TipoCusto {self.codigo}: {self.nome} ({self.categoria})>"


class CustoCalculado(Base):
    """Resultado do cálculo de custo por rubrica/função/mês."""
    __tablename__ = "custos_calculados"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Vínculos com cenário
    cenario_id = Column(UUID(as_uuid=True), ForeignKey("cenarios.id", ondelete="CASCADE"), nullable=False, index=True)
    cenario_secao_id = Column(UUID(as_uuid=True), ForeignKey("cenario_secao.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Vínculo com função e faixa
    funcao_id = Column(UUID(as_uuid=True), ForeignKey("funcoes.id", ondelete="CASCADE"), nullable=False, index=True)
    faixa_id = Column(UUID(as_uuid=True), ForeignKey("faixas_salariais.id", ondelete="SET NULL"), nullable=True)
    
    # Tipo de custo (rubrica)
    tipo_custo_id = Column(UUID(as_uuid=True), ForeignKey("tipos_custo.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Período
    mes = Column(Integer, nullable=False)  # 1-12
    ano = Column(Integer, nullable=False)
    
    # Valores do cálculo
    hc_base = Column(Numeric(10, 2), default=0)  # HC usado no cálculo
    valor_base = Column(Numeric(14, 2), default=0)  # Base de cálculo (salário, benefício, etc.)
    indice_aplicado = Column(Numeric(10, 4), default=0)  # Índice/alíquota aplicada
    valor_calculado = Column(Numeric(14, 2), default=0)  # Resultado final
    
    # Memória de cálculo (JSON com detalhes)
    memoria_calculo = Column(JSON, nullable=True)
    
    # Controle
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    cenario = relationship("Cenario", lazy="selectin")
    cenario_secao = relationship("CenarioSecao", lazy="selectin")
    funcao = relationship("Funcao", lazy="selectin")
    faixa = relationship("FaixaSalarial", lazy="selectin")
    tipo_custo = relationship("TipoCusto", lazy="selectin")
    
    __table_args__ = (
        UniqueConstraint('cenario_id', 'cenario_secao_id', 'funcao_id', 'faixa_id', 'tipo_custo_id', 'mes', 'ano', 
                        name='uq_custo_calculado'),
    )
    
    def __repr__(self):
        return f"<CustoCalculado {self.tipo_custo_id} funcao={self.funcao_id} {self.mes:02d}/{self.ano} = R${self.valor_calculado}>"


class CustoTecnologia(Base):
    """Custo calculado de tecnologia por mês."""
    __tablename__ = "custos_tecnologia"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cenario_id = Column(UUID(as_uuid=True), ForeignKey("cenarios.id", ondelete="CASCADE"), nullable=False)
    cenario_secao_id = Column(UUID(as_uuid=True), ForeignKey("cenario_secao.id", ondelete="CASCADE"), nullable=False)
    alocacao_tecnologia_id = Column(UUID(as_uuid=True), ForeignKey("alocacoes_tecnologia.id", ondelete="CASCADE"), nullable=False)
    produto_id = Column(UUID(as_uuid=True), ForeignKey("produtos_tecnologia.id", ondelete="CASCADE"), nullable=False)
    # conta_contabil_id = Column(UUID(as_uuid=True), ForeignKey("contas_contabeis.id", ondelete="SET NULL"), nullable=True)
    conta_contabil_id = Column(UUID(as_uuid=True), nullable=True)  # Sem FK por enquanto
    
    mes = Column(Integer, nullable=False)
    ano = Column(Integer, nullable=False)
    
    quantidade_base = Column(Numeric(10, 2), nullable=False)  # Qtd usada no cálculo
    valor_unitario = Column(Numeric(12, 2), nullable=False)   # Valor unit usado
    valor_calculado = Column(Numeric(12, 2), nullable=False)  # Resultado final
    
    # Metadados para auditoria
    tipo_calculo = Column(String(30), nullable=False)  # FIXO, POR_PA, POR_HC, etc.
    parametros_calculo = Column(JSON, nullable=True)   # Detalhes do cálculo
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    cenario = relationship("Cenario", lazy="selectin")
    cenario_secao = relationship("CenarioSecao", lazy="selectin")
    alocacao = relationship("AlocacaoTecnologia", lazy="selectin")
    produto = relationship("ProdutoTecnologia", lazy="selectin")
    # conta_contabil = relationship("ContaContabil", lazy="selectin")  # Comentado até criar tabela
    
    __table_args__ = (
        UniqueConstraint('cenario_id', 'alocacao_tecnologia_id', 'mes', 'ano', name='uq_custo_tec_mes_ano'),
    )
    
    def __repr__(self):
        return f"<CustoTecnologia {self.produto_id} {self.mes:02d}/{self.ano} = R${self.valor_calculado}>"


class ParametroCusto(Base):
    """Parâmetros configuráveis por seção para cálculo de custos."""
    __tablename__ = "parametros_custo"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Vínculo (seção ou cenário global)
    cenario_id = Column(UUID(as_uuid=True), ForeignKey("cenarios.id", ondelete="CASCADE"), nullable=False, index=True)
    cenario_secao_id = Column(UUID(as_uuid=True), ForeignKey("cenario_secao.id", ondelete="CASCADE"), nullable=True, index=True)
    
    # Tipo de custo relacionado (opcional - se null, é parâmetro global)
    tipo_custo_id = Column(UUID(as_uuid=True), ForeignKey("tipos_custo.id", ondelete="CASCADE"), nullable=True, index=True)
    
    # Chave e valor do parâmetro
    chave = Column(String(100), nullable=False)  # Ex: pct_elegibilidade_am, pct_bonus_receita, pct_deslig_empresa
    valor = Column(Numeric(14, 4), nullable=False)  # Valor numérico do parâmetro
    descricao = Column(String(255), nullable=True)  # Descrição do parâmetro
    
    # Controle
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    cenario = relationship("Cenario", lazy="selectin")
    cenario_secao = relationship("CenarioSecao", lazy="selectin")
    tipo_custo = relationship("TipoCusto", lazy="selectin")
    
    __table_args__ = (
        UniqueConstraint('cenario_id', 'cenario_secao_id', 'tipo_custo_id', 'chave', name='uq_parametro_custo'),
    )
    
    def __repr__(self):
        return f"<ParametroCusto {self.chave}={self.valor}>"

