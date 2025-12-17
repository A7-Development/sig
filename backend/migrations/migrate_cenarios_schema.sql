-- Migration script para atualizar schema de cenários
-- Execute este script no banco de dados PostgreSQL

-- 1. Adicionar novas colunas de período flexível
DO $$ 
BEGIN
    -- Verificar se coluna ano_inicio já existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cenarios' AND column_name = 'ano_inicio'
    ) THEN
        -- Adicionar novas colunas
        ALTER TABLE cenarios 
        ADD COLUMN ano_inicio INTEGER,
        ADD COLUMN mes_inicio INTEGER DEFAULT 1,
        ADD COLUMN ano_fim INTEGER,
        ADD COLUMN mes_fim INTEGER DEFAULT 12;
        
        -- Migrar dados existentes: copiar ano para ano_inicio e ano_fim
        UPDATE cenarios 
        SET ano_inicio = COALESCE(ano, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER),
            ano_fim = COALESCE(ano, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER),
            mes_inicio = COALESCE(mes_inicio, 1),
            mes_fim = COALESCE(mes_fim, 12)
        WHERE ano_inicio IS NULL;
        
        -- Tornar colunas NOT NULL após migração
        ALTER TABLE cenarios 
        ALTER COLUMN ano_inicio SET NOT NULL,
        ALTER COLUMN mes_inicio SET NOT NULL,
        ALTER COLUMN mes_inicio SET DEFAULT 1,
        ALTER COLUMN ano_fim SET NOT NULL,
        ALTER COLUMN mes_fim SET NOT NULL,
        ALTER COLUMN mes_fim SET DEFAULT 12;
        
        RAISE NOTICE 'Colunas ano_inicio, mes_inicio, ano_fim, mes_fim adicionadas e dados migrados';
    ELSE
        RAISE NOTICE 'Colunas já existem, pulando criação';
    END IF;
END $$;

-- 2. Criar tabela de associação cenarios_empresas (many-to-many)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'cenarios_empresas'
    ) THEN
        CREATE TABLE cenarios_empresas (
            cenario_id UUID NOT NULL,
            empresa_id UUID NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (cenario_id, empresa_id),
            CONSTRAINT fk_cenario FOREIGN KEY (cenario_id) 
                REFERENCES cenarios(id) ON DELETE CASCADE,
            CONSTRAINT fk_empresa FOREIGN KEY (empresa_id) 
                REFERENCES empresas(id) ON DELETE CASCADE
        );
        
        CREATE INDEX idx_cenarios_empresas_cenario ON cenarios_empresas(cenario_id);
        CREATE INDEX idx_cenarios_empresas_empresa ON cenarios_empresas(empresa_id);
        
        -- Migrar dados existentes: se houver empresa_id na tabela cenarios
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'cenarios' AND column_name = 'empresa_id'
        ) THEN
            INSERT INTO cenarios_empresas (cenario_id, empresa_id, created_at)
            SELECT id, empresa_id, created_at
            FROM cenarios
            WHERE empresa_id IS NOT NULL
            ON CONFLICT DO NOTHING;
            
            RAISE NOTICE 'Dados de empresa_id migrados para cenarios_empresas';
        END IF;
        
        RAISE NOTICE 'Tabela cenarios_empresas criada';
    ELSE
        RAISE NOTICE 'Tabela cenarios_empresas já existe';
    END IF;
END $$;

-- 3. (Opcional) Remover colunas antigas após verificar que tudo está funcionando
-- Descomente as linhas abaixo APENAS após confirmar que tudo está funcionando corretamente
-- e fazer backup do banco de dados

-- ALTER TABLE cenarios DROP COLUMN IF EXISTS ano;
-- ALTER TABLE cenarios DROP COLUMN IF EXISTS empresa_id;

-- Verificação final
DO $$
DECLARE
    has_ano_inicio BOOLEAN;
    has_cenarios_empresas BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cenarios' AND column_name = 'ano_inicio'
    ) INTO has_ano_inicio;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'cenarios_empresas'
    ) INTO has_cenarios_empresas;
    
    IF has_ano_inicio AND has_cenarios_empresas THEN
        RAISE NOTICE '✓ Migração concluída com sucesso!';
        RAISE NOTICE '  - Colunas de período flexível: OK';
        RAISE NOTICE '  - Tabela de associação empresas: OK';
    ELSE
        RAISE WARNING '⚠ Algumas partes da migração podem ter falhado. Verifique os logs acima.';
    END IF;
END $$;








