-- Migration: Adicionar campos e tabelas para Capacity Planning
-- Execute este script no banco de dados PostgreSQL SIG

-- 1. Adicionar coluna cliente_nw_codigo na tabela cenarios
ALTER TABLE cenarios 
ADD COLUMN IF NOT EXISTS cliente_nw_codigo VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_cenarios_cliente_nw_codigo ON cenarios(cliente_nw_codigo);

-- 2. Criar tabela funcao_span
CREATE TABLE IF NOT EXISTS funcao_span (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cenario_id UUID NOT NULL REFERENCES cenarios(id) ON DELETE CASCADE,
    funcao_id UUID NOT NULL REFERENCES funcoes(id) ON DELETE CASCADE,
    funcoes_base_ids JSONB NOT NULL,
    span_ratio NUMERIC(10, 2) NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_funcao_span_cenario_id ON funcao_span(cenario_id);
CREATE INDEX IF NOT EXISTS idx_funcao_span_funcao_id ON funcao_span(funcao_id);

-- 3. Criar tabela premissa_funcao_mes
CREATE TABLE IF NOT EXISTS premissa_funcao_mes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cenario_id UUID NOT NULL REFERENCES cenarios(id) ON DELETE CASCADE,
    funcao_id UUID NOT NULL REFERENCES funcoes(id) ON DELETE CASCADE,
    mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
    ano INTEGER NOT NULL CHECK (ano >= 2020 AND ano <= 2100),
    absenteismo NUMERIC(5, 2) DEFAULT 3.0,
    turnover NUMERIC(5, 2) DEFAULT 5.0,
    ferias_indice NUMERIC(5, 2) DEFAULT 8.33,
    dias_treinamento INTEGER DEFAULT 15 CHECK (dias_treinamento >= 0 AND dias_treinamento <= 180),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_premissa_funcao_mes UNIQUE (cenario_id, funcao_id, mes, ano)
);

CREATE INDEX IF NOT EXISTS idx_premissa_funcao_mes_cenario_id ON premissa_funcao_mes(cenario_id);
CREATE INDEX IF NOT EXISTS idx_premissa_funcao_mes_funcao_id ON premissa_funcao_mes(funcao_id);
CREATE INDEX IF NOT EXISTS idx_premissa_funcao_mes_periodo ON premissa_funcao_mes(ano, mes);


-- Execute este script no banco de dados PostgreSQL SIG

-- 1. Adicionar coluna cliente_nw_codigo na tabela cenarios
ALTER TABLE cenarios 
ADD COLUMN IF NOT EXISTS cliente_nw_codigo VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_cenarios_cliente_nw_codigo ON cenarios(cliente_nw_codigo);

-- 2. Criar tabela funcao_span
CREATE TABLE IF NOT EXISTS funcao_span (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cenario_id UUID NOT NULL REFERENCES cenarios(id) ON DELETE CASCADE,
    funcao_id UUID NOT NULL REFERENCES funcoes(id) ON DELETE CASCADE,
    funcoes_base_ids JSONB NOT NULL,
    span_ratio NUMERIC(10, 2) NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_funcao_span_cenario_id ON funcao_span(cenario_id);
CREATE INDEX IF NOT EXISTS idx_funcao_span_funcao_id ON funcao_span(funcao_id);

-- 3. Criar tabela premissa_funcao_mes
CREATE TABLE IF NOT EXISTS premissa_funcao_mes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cenario_id UUID NOT NULL REFERENCES cenarios(id) ON DELETE CASCADE,
    funcao_id UUID NOT NULL REFERENCES funcoes(id) ON DELETE CASCADE,
    mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
    ano INTEGER NOT NULL CHECK (ano >= 2020 AND ano <= 2100),
    absenteismo NUMERIC(5, 2) DEFAULT 3.0,
    turnover NUMERIC(5, 2) DEFAULT 5.0,
    ferias_indice NUMERIC(5, 2) DEFAULT 8.33,
    dias_treinamento INTEGER DEFAULT 15 CHECK (dias_treinamento >= 0 AND dias_treinamento <= 180),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_premissa_funcao_mes UNIQUE (cenario_id, funcao_id, mes, ano)
);

CREATE INDEX IF NOT EXISTS idx_premissa_funcao_mes_cenario_id ON premissa_funcao_mes(cenario_id);
CREATE INDEX IF NOT EXISTS idx_premissa_funcao_mes_funcao_id ON premissa_funcao_mes(funcao_id);
CREATE INDEX IF NOT EXISTS idx_premissa_funcao_mes_periodo ON premissa_funcao_mes(ano, mes);








