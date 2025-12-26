-- Migration: Adicionar campos para tipo de cálculo (Manual, Span, Rateio)
-- Permite configurar como a quantidade de cada função é calculada

-- 1. Adicionar campo tipo_calculo
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quadro_pessoal' AND column_name = 'tipo_calculo'
    ) THEN
        ALTER TABLE quadro_pessoal 
        ADD COLUMN tipo_calculo VARCHAR(20) DEFAULT 'manual';
        
        RAISE NOTICE 'Coluna tipo_calculo adicionada';
    ELSE
        RAISE NOTICE 'Coluna tipo_calculo já existe';
    END IF;
END $$;

-- 2. Adicionar campos para SPAN
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quadro_pessoal' AND column_name = 'span_ratio'
    ) THEN
        ALTER TABLE quadro_pessoal 
        ADD COLUMN span_ratio NUMERIC(10, 2) DEFAULT NULL;
        
        RAISE NOTICE 'Coluna span_ratio adicionada';
    ELSE
        RAISE NOTICE 'Coluna span_ratio já existe';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quadro_pessoal' AND column_name = 'span_funcoes_base_ids'
    ) THEN
        ALTER TABLE quadro_pessoal 
        ADD COLUMN span_funcoes_base_ids JSONB DEFAULT NULL;
        
        RAISE NOTICE 'Coluna span_funcoes_base_ids adicionada';
    ELSE
        RAISE NOTICE 'Coluna span_funcoes_base_ids já existe';
    END IF;
END $$;

-- 3. Adicionar campos para RATEIO
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quadro_pessoal' AND column_name = 'rateio_grupo_id'
    ) THEN
        ALTER TABLE quadro_pessoal 
        ADD COLUMN rateio_grupo_id UUID DEFAULT NULL;
        
        RAISE NOTICE 'Coluna rateio_grupo_id adicionada';
    ELSE
        RAISE NOTICE 'Coluna rateio_grupo_id já existe';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quadro_pessoal' AND column_name = 'rateio_percentual'
    ) THEN
        ALTER TABLE quadro_pessoal 
        ADD COLUMN rateio_percentual NUMERIC(5, 2) DEFAULT NULL;
        
        RAISE NOTICE 'Coluna rateio_percentual adicionada';
    ELSE
        RAISE NOTICE 'Coluna rateio_percentual já existe';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quadro_pessoal' AND column_name = 'rateio_qtd_total'
    ) THEN
        ALTER TABLE quadro_pessoal 
        ADD COLUMN rateio_qtd_total INTEGER DEFAULT NULL;
        
        RAISE NOTICE 'Coluna rateio_qtd_total adicionada';
    ELSE
        RAISE NOTICE 'Coluna rateio_qtd_total já existe';
    END IF;
END $$;

-- 4. Criar índice para rateio_grupo_id para facilitar buscas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'quadro_pessoal' AND indexname = 'idx_quadro_rateio_grupo'
    ) THEN
        CREATE INDEX idx_quadro_rateio_grupo ON quadro_pessoal(rateio_grupo_id) 
        WHERE rateio_grupo_id IS NOT NULL;
        
        RAISE NOTICE 'Índice idx_quadro_rateio_grupo criado';
    ELSE
        RAISE NOTICE 'Índice idx_quadro_rateio_grupo já existe';
    END IF;
END $$;

-- Verificação final
DO $$
DECLARE
    has_tipo_calculo BOOLEAN;
    has_span_ratio BOOLEAN;
    has_span_funcoes BOOLEAN;
    has_rateio_grupo BOOLEAN;
    has_rateio_perc BOOLEAN;
    has_rateio_qtd BOOLEAN;
BEGIN
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quadro_pessoal' AND column_name = 'tipo_calculo') INTO has_tipo_calculo;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quadro_pessoal' AND column_name = 'span_ratio') INTO has_span_ratio;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quadro_pessoal' AND column_name = 'span_funcoes_base_ids') INTO has_span_funcoes;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quadro_pessoal' AND column_name = 'rateio_grupo_id') INTO has_rateio_grupo;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quadro_pessoal' AND column_name = 'rateio_percentual') INTO has_rateio_perc;
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quadro_pessoal' AND column_name = 'rateio_qtd_total') INTO has_rateio_qtd;
    
    IF has_tipo_calculo AND has_span_ratio AND has_span_funcoes AND has_rateio_grupo AND has_rateio_perc AND has_rateio_qtd THEN
        RAISE NOTICE '[OK] Migração concluída com sucesso!';
        RAISE NOTICE '  - tipo_calculo: OK';
        RAISE NOTICE '  - span_ratio: OK';
        RAISE NOTICE '  - span_funcoes_base_ids: OK';
        RAISE NOTICE '  - rateio_grupo_id: OK';
        RAISE NOTICE '  - rateio_percentual: OK';
        RAISE NOTICE '  - rateio_qtd_total: OK';
    ELSE
        RAISE WARNING '[AVISO] Algumas colunas podem estar faltando';
    END IF;
END $$;







