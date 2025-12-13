"""
Modelos do módulo de Orçamento.
Todos os dados são armazenados no PostgreSQL SIG.
"""

import uuid
from datetime import datetime, date
from sqlalchemy import Column, String, Boolean, DateTime, Date, Integer, ForeignKey, Numeric, Text
from sqlalchemy.dialects.postgresql import UUID
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

