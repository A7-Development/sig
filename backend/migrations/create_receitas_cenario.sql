-- Migration: Criar tabelas de Receitas do Cenário
-- Data: 2024-12-26
-- Descrição: Receitas por centro de custo com premissas mensais

-- Tabela principal de receitas do cenário
CREATE TABLE IF NOT EXISTS receitas_cenario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cenario_id UUID NOT NULL REFERENCES cenarios(id) ON DELETE CASCADE,
    centro_custo_id UUID NOT NULL REFERENCES centros_custo(id) ON DELETE CASCADE,
    tipo_receita_id UUID NOT NULL REFERENCES tipos_receita(id) ON DELETE RESTRICT,
    
    -- Tipo de cálculo
    tipo_calculo VARCHAR(20) NOT NULL DEFAULT 'FIXA_CC',
    -- Valores: FIXA_CC, FIXA_HC, FIXA_PA, VARIAVEL
    
    -- Função que representa o PA (obrigatório para FIXA_PA e VARIAVEL)
    funcao_pa_id UUID NULL REFERENCES funcoes(id) ON DELETE SET NULL,
    
    -- Valores para receitas fixas
    valor_fixo NUMERIC(15, 2) NULL,
    
    -- Limites para receita variável (por PA)
    valor_minimo_pa NUMERIC(15, 2) NULL,
    valor_maximo_pa NUMERIC(15, 2) NULL,
    
    -- Descrição adicional
    descricao TEXT NULL,
    
    -- Controle
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Tabela de premissas mensais para receita variável
CREATE TABLE IF NOT EXISTS receita_premissa_mes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receita_cenario_id UUID NOT NULL REFERENCES receitas_cenario(id) ON DELETE CASCADE,
    
    -- Período
    mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
    ano INTEGER NOT NULL,
    
    -- Indicadores de vendas
    vopdu NUMERIC(10, 4) NULL DEFAULT 0,           -- Venda Operador Dia Útil
    indice_conversao NUMERIC(5, 4) NULL DEFAULT 0, -- Índice de instalação/ativação (0-1)
    ticket_medio NUMERIC(15, 2) NULL DEFAULT 0,    -- Ticket médio em R$
    fator NUMERIC(10, 4) NULL DEFAULT 1,           -- Fator multiplicador
    indice_estorno NUMERIC(5, 4) NULL DEFAULT 0,   -- Índice de estorno (0-1)
    
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    
    -- Unicidade por receita/mês/ano
    CONSTRAINT uq_receita_premissa_mes UNIQUE (receita_cenario_id, mes, ano)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS ix_receitas_cenario_cenario ON receitas_cenario(cenario_id);
CREATE INDEX IF NOT EXISTS ix_receitas_cenario_cc ON receitas_cenario(centro_custo_id);
CREATE INDEX IF NOT EXISTS ix_receitas_cenario_tipo ON receitas_cenario(tipo_receita_id);
CREATE INDEX IF NOT EXISTS ix_receitas_cenario_ativo ON receitas_cenario(ativo);

CREATE INDEX IF NOT EXISTS ix_receita_premissa_mes_receita ON receita_premissa_mes(receita_cenario_id);
CREATE INDEX IF NOT EXISTS ix_receita_premissa_mes_periodo ON receita_premissa_mes(ano, mes);



