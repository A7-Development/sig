-- Migration: Adicionar Custos Diretos de Tecnologia
-- Data: 2024-12-18
-- Descrição: Cria tabelas para gestão de fornecedores, produtos de tecnologia e alocações em cenários

-- Tabela de Fornecedores
CREATE TABLE IF NOT EXISTS fornecedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(50) UNIQUE NOT NULL,
    codigo_nw VARCHAR(50),
    nome VARCHAR(200) NOT NULL,
    nome_fantasia VARCHAR(200),
    cnpj VARCHAR(20),
    contato_nome VARCHAR(200),
    contato_email VARCHAR(200),
    contato_telefone VARCHAR(50),
    observacao TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fornecedores_codigo ON fornecedores(codigo);
CREATE INDEX IF NOT EXISTS idx_fornecedores_codigo_nw ON fornecedores(codigo_nw);

-- Tabela de Produtos de Tecnologia
CREATE TABLE IF NOT EXISTS produtos_tecnologia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fornecedor_id UUID NOT NULL REFERENCES fornecedores(id) ON DELETE CASCADE,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nome VARCHAR(200) NOT NULL,
    categoria VARCHAR(50) NOT NULL,
    tipo_precificacao VARCHAR(30) NOT NULL DEFAULT 'FIXO',
    valor_unitario NUMERIC(12, 2),
    unidade_medida VARCHAR(30),
    conta_contabil_id UUID,  -- Sem FK por enquanto, até criar tabela contas_contabeis
    descricao TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_produtos_fornecedor ON produtos_tecnologia(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON produtos_tecnologia(categoria);
CREATE INDEX IF NOT EXISTS idx_produtos_codigo ON produtos_tecnologia(codigo);

-- Tabela de Alocações de Tecnologia
CREATE TABLE IF NOT EXISTS alocacoes_tecnologia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cenario_id UUID NOT NULL REFERENCES cenarios(id) ON DELETE CASCADE,
    cenario_secao_id UUID NOT NULL REFERENCES cenario_secao(id) ON DELETE CASCADE,
    produto_id UUID NOT NULL REFERENCES produtos_tecnologia(id) ON DELETE CASCADE,
    tipo_alocacao VARCHAR(30) NOT NULL DEFAULT 'FIXO',
    qtd_jan NUMERIC(10, 2) DEFAULT 0,
    qtd_fev NUMERIC(10, 2) DEFAULT 0,
    qtd_mar NUMERIC(10, 2) DEFAULT 0,
    qtd_abr NUMERIC(10, 2) DEFAULT 0,
    qtd_mai NUMERIC(10, 2) DEFAULT 0,
    qtd_jun NUMERIC(10, 2) DEFAULT 0,
    qtd_jul NUMERIC(10, 2) DEFAULT 0,
    qtd_ago NUMERIC(10, 2) DEFAULT 0,
    qtd_set NUMERIC(10, 2) DEFAULT 0,
    qtd_out NUMERIC(10, 2) DEFAULT 0,
    qtd_nov NUMERIC(10, 2) DEFAULT 0,
    qtd_dez NUMERIC(10, 2) DEFAULT 0,
    valor_override NUMERIC(12, 2),
    fator_multiplicador NUMERIC(10, 4) DEFAULT 1.0,
    percentual_rateio NUMERIC(10, 4),
    observacao TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alocacoes_tec_cenario ON alocacoes_tecnologia(cenario_id);
CREATE INDEX IF NOT EXISTS idx_alocacoes_tec_secao ON alocacoes_tecnologia(cenario_secao_id);
CREATE INDEX IF NOT EXISTS idx_alocacoes_tec_produto ON alocacoes_tecnologia(produto_id);

-- Tabela de Custos de Tecnologia Calculados
CREATE TABLE IF NOT EXISTS custos_tecnologia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cenario_id UUID NOT NULL REFERENCES cenarios(id) ON DELETE CASCADE,
    cenario_secao_id UUID NOT NULL REFERENCES cenario_secao(id) ON DELETE CASCADE,
    alocacao_tecnologia_id UUID NOT NULL REFERENCES alocacoes_tecnologia(id) ON DELETE CASCADE,
    produto_id UUID NOT NULL REFERENCES produtos_tecnologia(id) ON DELETE CASCADE,
    conta_contabil_id UUID,  -- Sem FK por enquanto, até criar tabela contas_contabeis
    mes INTEGER NOT NULL,
    ano INTEGER NOT NULL,
    quantidade_base NUMERIC(10, 2) NOT NULL,
    valor_unitario NUMERIC(12, 2) NOT NULL,
    valor_calculado NUMERIC(12, 2) NOT NULL,
    tipo_calculo VARCHAR(30) NOT NULL,
    parametros_calculo JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT uq_custo_tec_mes_ano UNIQUE (cenario_id, alocacao_tecnologia_id, mes, ano)
);

CREATE INDEX IF NOT EXISTS idx_custos_tec_cenario_ano ON custos_tecnologia(cenario_id, ano);
CREATE INDEX IF NOT EXISTS idx_custos_tec_secao ON custos_tecnologia(cenario_secao_id);
CREATE INDEX IF NOT EXISTS idx_custos_tec_produto ON custos_tecnologia(produto_id);
CREATE INDEX IF NOT EXISTS idx_custos_tec_conta ON custos_tecnologia(conta_contabil_id);

-- Comentários
COMMENT ON TABLE fornecedores IS 'Cadastro de fornecedores de tecnologia';
COMMENT ON TABLE produtos_tecnologia IS 'Produtos e soluções de tecnologia (Discadores, URAs, etc)';
COMMENT ON TABLE alocacoes_tecnologia IS 'Alocação de produtos de tecnologia em seções de cenários orçamentários';
COMMENT ON TABLE custos_tecnologia IS 'Custos calculados de tecnologia por mês';

COMMENT ON COLUMN produtos_tecnologia.tipo_precificacao IS 'FIXO, UNITARIO, POR_PA, POR_HC';
COMMENT ON COLUMN alocacoes_tecnologia.tipo_alocacao IS 'FIXO, POR_PA, POR_HC, POR_CAPACIDADE, RATEIO';

