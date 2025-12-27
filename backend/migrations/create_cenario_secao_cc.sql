-- Migration: Criar tabela de associação entre CenarioSecao e CentroCusto
-- Data: 2024-12-26
-- Descrição: Permite que o usuário adicione CCs específicos a cada seção do cenário

CREATE TABLE IF NOT EXISTS cenario_secao_cc (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cenario_secao_id UUID NOT NULL REFERENCES cenario_secao(id) ON DELETE CASCADE,
    centro_custo_id UUID NOT NULL REFERENCES centros_custo(id) ON DELETE CASCADE,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    
    -- Garantir unicidade
    CONSTRAINT uq_cenario_secao_cc UNIQUE (cenario_secao_id, centro_custo_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS ix_cenario_secao_cc_secao ON cenario_secao_cc(cenario_secao_id);
CREATE INDEX IF NOT EXISTS ix_cenario_secao_cc_cc ON cenario_secao_cc(centro_custo_id);



