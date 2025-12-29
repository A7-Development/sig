-- Migration: Adicionar campos de conta contábil na tabela tributos
-- Data: 2025-01-27
-- Descrição: Permite associar cada tributo a uma conta contábil para DRE

-- Adicionar colunas de conta contábil
ALTER TABLE tributos 
ADD COLUMN IF NOT EXISTS conta_contabil_codigo VARCHAR(50),
ADD COLUMN IF NOT EXISTS conta_contabil_descricao VARCHAR(255);

-- Criar índice para busca por código de conta
CREATE INDEX IF NOT EXISTS idx_tributos_conta_contabil_codigo 
ON tributos(conta_contabil_codigo);

-- Comentários nas colunas
COMMENT ON COLUMN tributos.conta_contabil_codigo IS 'Código da conta contábil do NW para DRE';
COMMENT ON COLUMN tributos.conta_contabil_descricao IS 'Descrição cacheada da conta contábil';

