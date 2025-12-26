-- Migration: Criar tabela custos_diretos
-- Data: 2025-12-26
-- Descrição: Tabela para alocação de custos diretos por Centro de Custo

-- Criar tabela custos_diretos
CREATE TABLE IF NOT EXISTS custos_diretos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cenario_id UUID NOT NULL REFERENCES cenarios(id) ON DELETE CASCADE,
    cenario_secao_id UUID NOT NULL REFERENCES cenario_secao(id) ON DELETE CASCADE,
    centro_custo_id UUID NOT NULL REFERENCES centros_custo(id) ON DELETE CASCADE,
    item_custo_id UUID NOT NULL REFERENCES produtos_tecnologia(id) ON DELETE CASCADE,
    
    -- Tipo de valor: FIXO, VARIAVEL, FIXO_VARIAVEL
    tipo_valor VARCHAR(20) NOT NULL DEFAULT 'FIXO',
    
    -- Componente Fixo
    valor_fixo NUMERIC(14, 2),
    
    -- Componente Variável
    valor_unitario_variavel NUMERIC(14, 4),
    unidade_medida VARCHAR(20),  -- HC, PA, UNIDADE
    funcao_base_id UUID REFERENCES funcoes(id) ON DELETE SET NULL,
    tipo_medida VARCHAR(30),  -- HC_TOTAL, HC_FUNCAO, PA_TOTAL, PA_FUNCAO
    
    -- Rateio
    tipo_calculo VARCHAR(20) NOT NULL DEFAULT 'manual',  -- manual, rateio
    rateio_grupo_id UUID,
    rateio_percentual NUMERIC(5, 2),
    
    -- Metadados
    descricao TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS ix_custos_diretos_cenario ON custos_diretos(cenario_id);
CREATE INDEX IF NOT EXISTS ix_custos_diretos_secao ON custos_diretos(cenario_secao_id);
CREATE INDEX IF NOT EXISTS ix_custos_diretos_cc ON custos_diretos(centro_custo_id);
CREATE INDEX IF NOT EXISTS ix_custos_diretos_cenario_cc ON custos_diretos(cenario_id, centro_custo_id);
CREATE INDEX IF NOT EXISTS ix_custos_diretos_rateio ON custos_diretos(rateio_grupo_id);

-- Comentários
COMMENT ON TABLE custos_diretos IS 'Custos diretos alocados por Centro de Custo com suporte a rateio';
COMMENT ON COLUMN custos_diretos.tipo_valor IS 'FIXO: valor fixo mensal, VARIAVEL: baseado em HC/PA, FIXO_VARIAVEL: ambos';
COMMENT ON COLUMN custos_diretos.tipo_medida IS 'HC_TOTAL: total do CC, HC_FUNCAO: de função específica, PA_TOTAL/PA_FUNCAO: idem para PA';

SELECT 'Tabela custos_diretos criada com sucesso!' as resultado;

