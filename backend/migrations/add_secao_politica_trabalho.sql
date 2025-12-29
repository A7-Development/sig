-- Migration: Adicionar campos de política de trabalho na tabela secoes
-- Data: 2024-12-27
-- Descrição: Adiciona campos para configurar política de trabalho por seção
--            (sábados, domingos, feriados, localização)

-- Política de trabalho - dias da semana
ALTER TABLE secoes ADD COLUMN IF NOT EXISTS trabalha_sabado NUMERIC(3,2) DEFAULT 0;
ALTER TABLE secoes ADD COLUMN IF NOT EXISTS trabalha_domingo BOOLEAN DEFAULT FALSE;

-- Política de trabalho - feriados
ALTER TABLE secoes ADD COLUMN IF NOT EXISTS trabalha_feriado_nacional BOOLEAN DEFAULT FALSE;
ALTER TABLE secoes ADD COLUMN IF NOT EXISTS trabalha_feriado_estadual BOOLEAN DEFAULT FALSE;
ALTER TABLE secoes ADD COLUMN IF NOT EXISTS trabalha_feriado_municipal BOOLEAN DEFAULT FALSE;

-- Localização (para determinar quais feriados estaduais/municipais se aplicam)
ALTER TABLE secoes ADD COLUMN IF NOT EXISTS uf VARCHAR(2);
ALTER TABLE secoes ADD COLUMN IF NOT EXISTS cidade VARCHAR(100);

-- Comentários
COMMENT ON COLUMN secoes.trabalha_sabado IS 'Fator de trabalho aos sábados: 0=não trabalha, 0.5=meio período, 1=integral';
COMMENT ON COLUMN secoes.trabalha_domingo IS 'Se a seção trabalha aos domingos';
COMMENT ON COLUMN secoes.trabalha_feriado_nacional IS 'Se a seção trabalha em feriados nacionais';
COMMENT ON COLUMN secoes.trabalha_feriado_estadual IS 'Se a seção trabalha em feriados estaduais';
COMMENT ON COLUMN secoes.trabalha_feriado_municipal IS 'Se a seção trabalha em feriados municipais';
COMMENT ON COLUMN secoes.uf IS 'UF da seção (para determinar feriados estaduais aplicáveis)';
COMMENT ON COLUMN secoes.cidade IS 'Cidade da seção (para determinar feriados municipais aplicáveis)';


