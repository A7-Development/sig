-- Migration script para adicionar campos de Capacity Planning
-- Execute este script no banco de dados PostgreSQL

-- 1. Adicionar coluna cliente_nw_codigo na tabela cenarios
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cenarios' AND column_name = 'cliente_nw_codigo'
    ) THEN
        ALTER TABLE cenarios 
        ADD COLUMN cliente_nw_codigo VARCHAR(50);
        
        CREATE INDEX IF NOT EXISTS idx_cenarios_cliente_nw ON cenarios(cliente_nw_codigo);
        
        RAISE NOTICE 'Coluna cliente_nw_codigo adicionada à tabela cenarios';
    ELSE
        RAISE NOTICE 'Coluna cliente_nw_codigo já existe';
    END IF;
END $$;

-- 2. Criar tabela funcao_span (spans de controle)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'funcao_span'
    ) THEN
        CREATE TABLE funcao_span (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            cenario_id UUID NOT NULL,
            funcao_id UUID NOT NULL,
            funcoes_base_ids JSONB NOT NULL,
            span_ratio NUMERIC(10, 2) NOT NULL,
            ativo BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_funcao_span_cenario FOREIGN KEY (cenario_id) 
                REFERENCES cenarios(id) ON DELETE CASCADE,
            CONSTRAINT fk_funcao_span_funcao FOREIGN KEY (funcao_id) 
                REFERENCES funcoes(id) ON DELETE CASCADE
        );
        
        CREATE INDEX idx_funcao_span_cenario ON funcao_span(cenario_id);
        CREATE INDEX idx_funcao_span_funcao ON funcao_span(funcao_id);
        
        RAISE NOTICE 'Tabela funcao_span criada';
    ELSE
        RAISE NOTICE 'Tabela funcao_span já existe';
    END IF;
END $$;

-- 3. Criar tabela premissa_funcao_mes (premissas por função e mês)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'premissa_funcao_mes'
    ) THEN
        CREATE TABLE premissa_funcao_mes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            cenario_id UUID NOT NULL,
            funcao_id UUID NOT NULL,
            mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
            ano INTEGER NOT NULL,
            absenteismo NUMERIC(5, 2) DEFAULT 3.0,
            turnover NUMERIC(5, 2) DEFAULT 5.0,
            ferias_indice NUMERIC(5, 2) DEFAULT 8.33,
            dias_treinamento INTEGER DEFAULT 15,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_premissa_funcao_mes_cenario FOREIGN KEY (cenario_id) 
                REFERENCES cenarios(id) ON DELETE CASCADE,
            CONSTRAINT fk_premissa_funcao_mes_funcao FOREIGN KEY (funcao_id) 
                REFERENCES funcoes(id) ON DELETE CASCADE,
            CONSTRAINT uq_premissa_funcao_mes UNIQUE (cenario_id, funcao_id, mes, ano)
        );
        
        CREATE INDEX idx_premissa_funcao_mes_cenario ON premissa_funcao_mes(cenario_id);
        CREATE INDEX idx_premissa_funcao_mes_funcao ON premissa_funcao_mes(funcao_id);
        
        RAISE NOTICE 'Tabela premissa_funcao_mes criada';
    ELSE
        RAISE NOTICE 'Tabela premissa_funcao_mes já existe';
    END IF;
END $$;

-- Verificação final
DO $$
DECLARE
    has_cliente_nw BOOLEAN;
    has_funcao_span BOOLEAN;
    has_premissa_funcao_mes BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cenarios' AND column_name = 'cliente_nw_codigo'
    ) INTO has_cliente_nw;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'funcao_span'
    ) INTO has_funcao_span;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'premissa_funcao_mes'
    ) INTO has_premissa_funcao_mes;
    
    IF has_cliente_nw AND has_funcao_span AND has_premissa_funcao_mes THEN
        RAISE NOTICE '✓ Migração concluída com sucesso!';
        RAISE NOTICE '  - Coluna cliente_nw_codigo: OK';
        RAISE NOTICE '  - Tabela funcao_span: OK';
        RAISE NOTICE '  - Tabela premissa_funcao_mes: OK';
    ELSE
        RAISE WARNING '⚠ Algumas partes da migração podem ter falhado. Verifique os logs acima.';
        RAISE WARNING '  - cliente_nw_codigo: %', has_cliente_nw;
        RAISE WARNING '  - funcao_span: %', has_funcao_span;
        RAISE WARNING '  - premissa_funcao_mes: %', has_premissa_funcao_mes;
    END IF;
END $$;

-- Execute este script no banco de dados PostgreSQL

-- 1. Adicionar coluna cliente_nw_codigo na tabela cenarios
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cenarios' AND column_name = 'cliente_nw_codigo'
    ) THEN
        ALTER TABLE cenarios 
        ADD COLUMN cliente_nw_codigo VARCHAR(50);
        
        CREATE INDEX IF NOT EXISTS idx_cenarios_cliente_nw ON cenarios(cliente_nw_codigo);
        
        RAISE NOTICE 'Coluna cliente_nw_codigo adicionada à tabela cenarios';
    ELSE
        RAISE NOTICE 'Coluna cliente_nw_codigo já existe';
    END IF;
END $$;

-- 2. Criar tabela funcao_span (spans de controle)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'funcao_span'
    ) THEN
        CREATE TABLE funcao_span (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            cenario_id UUID NOT NULL,
            funcao_id UUID NOT NULL,
            funcoes_base_ids JSONB NOT NULL,
            span_ratio NUMERIC(10, 2) NOT NULL,
            ativo BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_funcao_span_cenario FOREIGN KEY (cenario_id) 
                REFERENCES cenarios(id) ON DELETE CASCADE,
            CONSTRAINT fk_funcao_span_funcao FOREIGN KEY (funcao_id) 
                REFERENCES funcoes(id) ON DELETE CASCADE
        );
        
        CREATE INDEX idx_funcao_span_cenario ON funcao_span(cenario_id);
        CREATE INDEX idx_funcao_span_funcao ON funcao_span(funcao_id);
        
        RAISE NOTICE 'Tabela funcao_span criada';
    ELSE
        RAISE NOTICE 'Tabela funcao_span já existe';
    END IF;
END $$;

-- 3. Criar tabela premissa_funcao_mes (premissas por função e mês)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'premissa_funcao_mes'
    ) THEN
        CREATE TABLE premissa_funcao_mes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            cenario_id UUID NOT NULL,
            funcao_id UUID NOT NULL,
            mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
            ano INTEGER NOT NULL,
            absenteismo NUMERIC(5, 2) DEFAULT 3.0,
            turnover NUMERIC(5, 2) DEFAULT 5.0,
            ferias_indice NUMERIC(5, 2) DEFAULT 8.33,
            dias_treinamento INTEGER DEFAULT 15,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_premissa_funcao_mes_cenario FOREIGN KEY (cenario_id) 
                REFERENCES cenarios(id) ON DELETE CASCADE,
            CONSTRAINT fk_premissa_funcao_mes_funcao FOREIGN KEY (funcao_id) 
                REFERENCES funcoes(id) ON DELETE CASCADE,
            CONSTRAINT uq_premissa_funcao_mes UNIQUE (cenario_id, funcao_id, mes, ano)
        );
        
        CREATE INDEX idx_premissa_funcao_mes_cenario ON premissa_funcao_mes(cenario_id);
        CREATE INDEX idx_premissa_funcao_mes_funcao ON premissa_funcao_mes(funcao_id);
        
        RAISE NOTICE 'Tabela premissa_funcao_mes criada';
    ELSE
        RAISE NOTICE 'Tabela premissa_funcao_mes já existe';
    END IF;
END $$;

-- Verificação final
DO $$
DECLARE
    has_cliente_nw BOOLEAN;
    has_funcao_span BOOLEAN;
    has_premissa_funcao_mes BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cenarios' AND column_name = 'cliente_nw_codigo'
    ) INTO has_cliente_nw;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'funcao_span'
    ) INTO has_funcao_span;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'premissa_funcao_mes'
    ) INTO has_premissa_funcao_mes;
    
    IF has_cliente_nw AND has_funcao_span AND has_premissa_funcao_mes THEN
        RAISE NOTICE '✓ Migração concluída com sucesso!';
        RAISE NOTICE '  - Coluna cliente_nw_codigo: OK';
        RAISE NOTICE '  - Tabela funcao_span: OK';
        RAISE NOTICE '  - Tabela premissa_funcao_mes: OK';
    ELSE
        RAISE WARNING '⚠ Algumas partes da migração podem ter falhado. Verifique os logs acima.';
        RAISE WARNING '  - cliente_nw_codigo: %', has_cliente_nw;
        RAISE WARNING '  - funcao_span: %', has_funcao_span;
        RAISE WARNING '  - premissa_funcao_mes: %', has_premissa_funcao_mes;
    END IF;
END $$;














