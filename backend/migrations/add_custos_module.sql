-- Migration: Módulo de Custos
-- Adiciona tabelas e campos para cálculo de custos de pessoal

-- ============================================
-- 1. ALTERAÇÕES EM TABELAS EXISTENTES
-- ============================================

-- Adicionar campos em funcoes
ALTER TABLE funcoes 
ADD COLUMN IF NOT EXISTS jornada_mensal INTEGER DEFAULT 180,
ADD COLUMN IF NOT EXISTS is_home_office BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_pj BOOLEAN DEFAULT FALSE;

-- Adicionar campos de desconto em politicas_beneficio
ALTER TABLE politicas_beneficio 
ADD COLUMN IF NOT EXISTS pct_desconto_vt NUMERIC(5,2) DEFAULT 6.0,
ADD COLUMN IF NOT EXISTS pct_desconto_vr NUMERIC(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS pct_desconto_am NUMERIC(5,2) DEFAULT 0;

-- ============================================
-- 2. NOVAS TABELAS
-- ============================================

-- Tabela de tipos de custo (rubricas)
CREATE TABLE IF NOT EXISTS tipos_custo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nome VARCHAR(200) NOT NULL,
    descricao TEXT,
    
    -- Categoria da rubrica
    categoria VARCHAR(30) NOT NULL CHECK (categoria IN ('REMUNERACAO', 'BENEFICIO', 'ENCARGO', 'PROVISAO', 'PREMIO', 'DESCONTO')),
    
    -- Tipo de cálculo
    tipo_calculo VARCHAR(30) NOT NULL CHECK (tipo_calculo IN ('HC_X_SALARIO', 'HC_X_VALOR', 'PERCENTUAL_RUBRICA', 'PERCENTUAL_RECEITA', 'FORMULA')),
    
    -- Vínculo com conta contábil
    conta_contabil_codigo VARCHAR(50),
    conta_contabil_descricao VARCHAR(255),
    
    -- Flags de incidência
    incide_fgts BOOLEAN DEFAULT FALSE,
    incide_inss BOOLEAN DEFAULT FALSE,
    reflexo_ferias BOOLEAN DEFAULT FALSE,
    reflexo_13 BOOLEAN DEFAULT FALSE,
    
    -- Alíquota padrão
    aliquota_padrao NUMERIC(10,4),
    
    -- Rubrica base para cálculo
    rubrica_base_id UUID REFERENCES tipos_custo(id) ON DELETE SET NULL,
    
    -- Controle
    ordem INTEGER DEFAULT 0,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tipos_custo_codigo ON tipos_custo(codigo);
CREATE INDEX IF NOT EXISTS idx_tipos_custo_categoria ON tipos_custo(categoria);
CREATE INDEX IF NOT EXISTS idx_tipos_custo_conta ON tipos_custo(conta_contabil_codigo);

-- Tabela de custos calculados
CREATE TABLE IF NOT EXISTS custos_calculados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Vínculos
    cenario_id UUID NOT NULL REFERENCES cenarios(id) ON DELETE CASCADE,
    cenario_secao_id UUID NOT NULL REFERENCES cenario_secao(id) ON DELETE CASCADE,
    funcao_id UUID NOT NULL REFERENCES funcoes(id) ON DELETE CASCADE,
    faixa_id UUID REFERENCES faixas_salariais(id) ON DELETE SET NULL,
    tipo_custo_id UUID NOT NULL REFERENCES tipos_custo(id) ON DELETE CASCADE,
    
    -- Período
    mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
    ano INTEGER NOT NULL,
    
    -- Valores
    hc_base NUMERIC(10,2) DEFAULT 0,
    valor_base NUMERIC(14,2) DEFAULT 0,
    indice_aplicado NUMERIC(10,4) DEFAULT 0,
    valor_calculado NUMERIC(14,2) DEFAULT 0,
    
    -- Memória de cálculo
    memoria_calculo JSONB,
    
    -- Controle
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint
    CONSTRAINT uq_custo_calculado UNIQUE (cenario_id, cenario_secao_id, funcao_id, faixa_id, tipo_custo_id, mes, ano)
);

CREATE INDEX IF NOT EXISTS idx_custos_calc_cenario ON custos_calculados(cenario_id);
CREATE INDEX IF NOT EXISTS idx_custos_calc_secao ON custos_calculados(cenario_secao_id);
CREATE INDEX IF NOT EXISTS idx_custos_calc_funcao ON custos_calculados(funcao_id);
CREATE INDEX IF NOT EXISTS idx_custos_calc_tipo ON custos_calculados(tipo_custo_id);
CREATE INDEX IF NOT EXISTS idx_custos_calc_periodo ON custos_calculados(ano, mes);

-- Tabela de parâmetros de custo
CREATE TABLE IF NOT EXISTS parametros_custo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Vínculos
    cenario_id UUID NOT NULL REFERENCES cenarios(id) ON DELETE CASCADE,
    cenario_secao_id UUID REFERENCES cenario_secao(id) ON DELETE CASCADE,
    tipo_custo_id UUID REFERENCES tipos_custo(id) ON DELETE CASCADE,
    
    -- Parâmetro
    chave VARCHAR(100) NOT NULL,
    valor NUMERIC(14,4) NOT NULL,
    descricao VARCHAR(255),
    
    -- Controle
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint
    CONSTRAINT uq_parametro_custo UNIQUE (cenario_id, cenario_secao_id, tipo_custo_id, chave)
);

CREATE INDEX IF NOT EXISTS idx_param_custo_cenario ON parametros_custo(cenario_id);
CREATE INDEX IF NOT EXISTS idx_param_custo_secao ON parametros_custo(cenario_secao_id);
CREATE INDEX IF NOT EXISTS idx_param_custo_tipo ON parametros_custo(tipo_custo_id);

-- ============================================
-- 3. TRIGGER PARA UPDATED_AT
-- ============================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
DROP TRIGGER IF EXISTS update_tipos_custo_updated_at ON tipos_custo;
CREATE TRIGGER update_tipos_custo_updated_at
    BEFORE UPDATE ON tipos_custo
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_custos_calculados_updated_at ON custos_calculados;
CREATE TRIGGER update_custos_calculados_updated_at
    BEFORE UPDATE ON custos_calculados
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_parametros_custo_updated_at ON parametros_custo;
CREATE TRIGGER update_parametros_custo_updated_at
    BEFORE UPDATE ON parametros_custo
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

