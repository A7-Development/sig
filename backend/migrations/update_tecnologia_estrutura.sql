-- Migration: Atualizar estrutura de Tecnologia
-- Data: 2024-12-18
-- Descrição: Remove tipo_precificacao de produtos e atualiza estrutura de alocações

-- 1. Atualizar tabela produtos_tecnologia
-- Remover tipo_precificacao e renomear valor_unitario para valor_base
ALTER TABLE produtos_tecnologia 
  DROP COLUMN IF EXISTS tipo_precificacao CASCADE;

ALTER TABLE produtos_tecnologia 
  RENAME COLUMN valor_unitario TO valor_base;

COMMENT ON COLUMN produtos_tecnologia.valor_base IS 'Valor base/tabela do fornecedor (referência)';


-- 2. Atualizar tabela alocacoes_tecnologia
-- Remover campos antigos de quantidades mensais
ALTER TABLE alocacoes_tecnologia 
  DROP COLUMN IF EXISTS qtd_jan CASCADE,
  DROP COLUMN IF EXISTS qtd_fev CASCADE,
  DROP COLUMN IF EXISTS qtd_mar CASCADE,
  DROP COLUMN IF EXISTS qtd_abr CASCADE,
  DROP COLUMN IF EXISTS qtd_mai CASCADE,
  DROP COLUMN IF EXISTS qtd_jun CASCADE,
  DROP COLUMN IF EXISTS qtd_jul CASCADE,
  DROP COLUMN IF EXISTS qtd_ago CASCADE,
  DROP COLUMN IF EXISTS qtd_set CASCADE,
  DROP COLUMN IF EXISTS qtd_out CASCADE,
  DROP COLUMN IF EXISTS qtd_nov CASCADE,
  DROP COLUMN IF EXISTS qtd_dez CASCADE,
  DROP COLUMN IF EXISTS valor_override CASCADE,
  DROP COLUMN IF EXISTS percentual_rateio CASCADE;

-- Adicionar novos campos
ALTER TABLE alocacoes_tecnologia 
  ADD COLUMN IF NOT EXISTS valor_fixo_mensal NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS tipo_variavel VARCHAR(20),
  ADD COLUMN IF NOT EXISTS valor_unitario_variavel NUMERIC(12, 2);

-- Atualizar tipo_alocacao existente para novos valores
-- Mapear valores antigos para novos
UPDATE alocacoes_tecnologia 
SET tipo_alocacao = 'FIXO' 
WHERE tipo_alocacao IN ('FIXO', 'POR_CAPACIDADE', 'RATEIO');

UPDATE alocacoes_tecnologia 
SET tipo_alocacao = 'VARIAVEL', tipo_variavel = 'POR_PA'
WHERE tipo_alocacao = 'POR_PA';

UPDATE alocacoes_tecnologia 
SET tipo_alocacao = 'VARIAVEL', tipo_variavel = 'POR_HC'
WHERE tipo_alocacao = 'POR_HC';

-- Comentários
COMMENT ON COLUMN alocacoes_tecnologia.tipo_alocacao IS 'FIXO, FIXO_VARIAVEL, VARIAVEL';
COMMENT ON COLUMN alocacoes_tecnologia.valor_fixo_mensal IS 'Valor fixo mensal (para FIXO e FIXO_VARIAVEL)';
COMMENT ON COLUMN alocacoes_tecnologia.tipo_variavel IS 'POR_PA ou POR_HC (para VARIAVEL e FIXO_VARIAVEL)';
COMMENT ON COLUMN alocacoes_tecnologia.valor_unitario_variavel IS 'Valor por unidade variável';
COMMENT ON COLUMN alocacoes_tecnologia.fator_multiplicador IS 'Multiplicador para cálculo variável';


-- 3. Atualizar tabela custos_tecnologia para refletir nova estrutura
-- Não precisa alterar, pois já usa valores calculados genéricos

