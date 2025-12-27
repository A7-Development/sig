-- Migration: Alterar colunas qtd_* de Integer para Numeric para suportar rateio fracionado
-- Data: 2024

DO $$
BEGIN
    -- Alterar qtd_jan
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quadro_pessoal' AND column_name = 'qtd_jan' AND data_type = 'integer') THEN
        ALTER TABLE quadro_pessoal ALTER COLUMN qtd_jan TYPE NUMERIC(10, 2);
        RAISE NOTICE 'Coluna qtd_jan alterada para NUMERIC(10,2)';
    END IF;

    -- Alterar qtd_fev
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quadro_pessoal' AND column_name = 'qtd_fev' AND data_type = 'integer') THEN
        ALTER TABLE quadro_pessoal ALTER COLUMN qtd_fev TYPE NUMERIC(10, 2);
        RAISE NOTICE 'Coluna qtd_fev alterada para NUMERIC(10,2)';
    END IF;

    -- Alterar qtd_mar
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quadro_pessoal' AND column_name = 'qtd_mar' AND data_type = 'integer') THEN
        ALTER TABLE quadro_pessoal ALTER COLUMN qtd_mar TYPE NUMERIC(10, 2);
        RAISE NOTICE 'Coluna qtd_mar alterada para NUMERIC(10,2)';
    END IF;

    -- Alterar qtd_abr
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quadro_pessoal' AND column_name = 'qtd_abr' AND data_type = 'integer') THEN
        ALTER TABLE quadro_pessoal ALTER COLUMN qtd_abr TYPE NUMERIC(10, 2);
        RAISE NOTICE 'Coluna qtd_abr alterada para NUMERIC(10,2)';
    END IF;

    -- Alterar qtd_mai
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quadro_pessoal' AND column_name = 'qtd_mai' AND data_type = 'integer') THEN
        ALTER TABLE quadro_pessoal ALTER COLUMN qtd_mai TYPE NUMERIC(10, 2);
        RAISE NOTICE 'Coluna qtd_mai alterada para NUMERIC(10,2)';
    END IF;

    -- Alterar qtd_jun
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quadro_pessoal' AND column_name = 'qtd_jun' AND data_type = 'integer') THEN
        ALTER TABLE quadro_pessoal ALTER COLUMN qtd_jun TYPE NUMERIC(10, 2);
        RAISE NOTICE 'Coluna qtd_jun alterada para NUMERIC(10,2)';
    END IF;

    -- Alterar qtd_jul
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quadro_pessoal' AND column_name = 'qtd_jul' AND data_type = 'integer') THEN
        ALTER TABLE quadro_pessoal ALTER COLUMN qtd_jul TYPE NUMERIC(10, 2);
        RAISE NOTICE 'Coluna qtd_jul alterada para NUMERIC(10,2)';
    END IF;

    -- Alterar qtd_ago
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quadro_pessoal' AND column_name = 'qtd_ago' AND data_type = 'integer') THEN
        ALTER TABLE quadro_pessoal ALTER COLUMN qtd_ago TYPE NUMERIC(10, 2);
        RAISE NOTICE 'Coluna qtd_ago alterada para NUMERIC(10,2)';
    END IF;

    -- Alterar qtd_set
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quadro_pessoal' AND column_name = 'qtd_set' AND data_type = 'integer') THEN
        ALTER TABLE quadro_pessoal ALTER COLUMN qtd_set TYPE NUMERIC(10, 2);
        RAISE NOTICE 'Coluna qtd_set alterada para NUMERIC(10,2)';
    END IF;

    -- Alterar qtd_out
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quadro_pessoal' AND column_name = 'qtd_out' AND data_type = 'integer') THEN
        ALTER TABLE quadro_pessoal ALTER COLUMN qtd_out TYPE NUMERIC(10, 2);
        RAISE NOTICE 'Coluna qtd_out alterada para NUMERIC(10,2)';
    END IF;

    -- Alterar qtd_nov
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quadro_pessoal' AND column_name = 'qtd_nov' AND data_type = 'integer') THEN
        ALTER TABLE quadro_pessoal ALTER COLUMN qtd_nov TYPE NUMERIC(10, 2);
        RAISE NOTICE 'Coluna qtd_nov alterada para NUMERIC(10,2)';
    END IF;

    -- Alterar qtd_dez
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quadro_pessoal' AND column_name = 'qtd_dez' AND data_type = 'integer') THEN
        ALTER TABLE quadro_pessoal ALTER COLUMN qtd_dez TYPE NUMERIC(10, 2);
        RAISE NOTICE 'Coluna qtd_dez alterada para NUMERIC(10,2)';
    END IF;

    RAISE NOTICE 'Migration concluída com sucesso!';
END $$;









