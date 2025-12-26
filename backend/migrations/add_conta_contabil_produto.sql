-- Migration: Adicionar campos de conta contábil em produtos_tecnologia (itens de custo)
-- Data: 2024-12-26
-- Descrição: Permite vincular conta contábil do NW aos itens de custo para classificação no DRE

-- Adicionar campos de conta contábil
ALTER TABLE produtos_tecnologia 
ADD COLUMN IF NOT EXISTS conta_contabil_codigo VARCHAR(50) NULL;

ALTER TABLE produtos_tecnologia 
ADD COLUMN IF NOT EXISTS conta_contabil_descricao VARCHAR(255) NULL;

-- Criar índice para busca por conta contábil
CREATE INDEX IF NOT EXISTS ix_produtos_tecnologia_conta_contabil 
ON produtos_tecnologia(conta_contabil_codigo);

-- Remover campo antigo conta_contabil_id se existir (não estava sendo usado)
ALTER TABLE produtos_tecnologia 
DROP COLUMN IF EXISTS conta_contabil_id;

-- Verificar resultado
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'produtos_tecnologia' 
AND column_name LIKE 'conta_contabil%'
ORDER BY ordinal_position;

