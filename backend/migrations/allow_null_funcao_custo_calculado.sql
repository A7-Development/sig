-- Permitir funcao_id e cenario_secao_id como NULL em custos_calculados
-- Necessário para custos rateados (aluguel, etc.) que não têm função associada

ALTER TABLE custos_calculados ALTER COLUMN funcao_id DROP NOT NULL;
ALTER TABLE custos_calculados ALTER COLUMN cenario_secao_id DROP NOT NULL;

COMMENT ON COLUMN custos_calculados.funcao_id IS 'Função associada (nullable para custos rateados de Pool)';
COMMENT ON COLUMN custos_calculados.cenario_secao_id IS 'Seção do cenário (nullable para custos rateados)';

