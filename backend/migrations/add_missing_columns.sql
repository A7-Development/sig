-- Migração: Adicionar colunas faltantes nas tabelas funcoes e politicas_beneficio
-- Data: 2025-12-17

-- ============================================
-- Tabela: funcoes
-- ============================================

-- Adiciona jornada_mensal se não existir
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'funcoes' AND column_name = 'jornada_mensal') THEN
        ALTER TABLE funcoes ADD COLUMN jornada_mensal INTEGER DEFAULT 220;
    END IF;
END $$;

-- Adiciona is_home_office se não existir
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'funcoes' AND column_name = 'is_home_office') THEN
        ALTER TABLE funcoes ADD COLUMN is_home_office BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Adiciona is_pj se não existir
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'funcoes' AND column_name = 'is_pj') THEN
        ALTER TABLE funcoes ADD COLUMN is_pj BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- ============================================
-- Tabela: politicas_beneficio
-- ============================================

-- Adiciona pct_desconto_vt se não existir
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'politicas_beneficio' AND column_name = 'pct_desconto_vt') THEN
        ALTER TABLE politicas_beneficio ADD COLUMN pct_desconto_vt NUMERIC(5,2) DEFAULT 6.0;
    END IF;
END $$;

-- Adiciona pct_desconto_vr se não existir
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'politicas_beneficio' AND column_name = 'pct_desconto_vr') THEN
        ALTER TABLE politicas_beneficio ADD COLUMN pct_desconto_vr NUMERIC(5,2) DEFAULT 0;
    END IF;
END $$;

-- Adiciona pct_desconto_am se não existir
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'politicas_beneficio' AND column_name = 'pct_desconto_am') THEN
        ALTER TABLE politicas_beneficio ADD COLUMN pct_desconto_am NUMERIC(5,2) DEFAULT 0;
    END IF;
END $$;

-- Verificação final
SELECT 'Migração concluída com sucesso!' as status;

