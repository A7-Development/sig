-- Migration: Adicionar estrutura Cenario > Clientes > Secoes
-- Permite organizar o capacity planning por cliente e seção

-- 1. Criar tabela cenario_cliente (Clientes do Cenário)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'cenario_cliente'
    ) THEN
        CREATE TABLE cenario_cliente (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            cenario_id UUID NOT NULL,
            cliente_nw_codigo VARCHAR(50) NOT NULL,
            nome_cliente VARCHAR(255),
            ativo BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_cenario_cliente_cenario FOREIGN KEY (cenario_id) 
                REFERENCES cenarios(id) ON DELETE CASCADE,
            CONSTRAINT uq_cenario_cliente UNIQUE (cenario_id, cliente_nw_codigo)
        );
        
        CREATE INDEX idx_cenario_cliente_cenario ON cenario_cliente(cenario_id);
        CREATE INDEX idx_cenario_cliente_codigo ON cenario_cliente(cliente_nw_codigo);
        
        RAISE NOTICE 'Tabela cenario_cliente criada com sucesso';
    ELSE
        RAISE NOTICE 'Tabela cenario_cliente ja existe';
    END IF;
END $$;

-- 2. Criar tabela cenario_secao (Seções do Cliente no Cenário)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'cenario_secao'
    ) THEN
        CREATE TABLE cenario_secao (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            cenario_cliente_id UUID NOT NULL,
            secao_id UUID NOT NULL,
            
            -- Configurações específicas da seção no cenário
            fator_pa NUMERIC(5, 2) DEFAULT 3.0,  -- Fator para calcular PAs (HC / fator = PAs)
            
            ativo BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            CONSTRAINT fk_cenario_secao_cliente FOREIGN KEY (cenario_cliente_id) 
                REFERENCES cenario_cliente(id) ON DELETE CASCADE,
            CONSTRAINT fk_cenario_secao_secao FOREIGN KEY (secao_id) 
                REFERENCES secoes(id) ON DELETE CASCADE,
            CONSTRAINT uq_cenario_secao UNIQUE (cenario_cliente_id, secao_id)
        );
        
        CREATE INDEX idx_cenario_secao_cliente ON cenario_secao(cenario_cliente_id);
        CREATE INDEX idx_cenario_secao_secao ON cenario_secao(secao_id);
        
        RAISE NOTICE 'Tabela cenario_secao criada com sucesso';
    ELSE
        RAISE NOTICE 'Tabela cenario_secao ja existe';
    END IF;
END $$;

-- 3. Adicionar FK de cenario_secao na tabela quadro_pessoal
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quadro_pessoal' AND column_name = 'cenario_secao_id'
    ) THEN
        ALTER TABLE quadro_pessoal 
        ADD COLUMN cenario_secao_id UUID,
        ADD CONSTRAINT fk_quadro_cenario_secao FOREIGN KEY (cenario_secao_id) 
            REFERENCES cenario_secao(id) ON DELETE SET NULL;
        
        CREATE INDEX idx_quadro_cenario_secao ON quadro_pessoal(cenario_secao_id);
        
        RAISE NOTICE 'Coluna cenario_secao_id adicionada a quadro_pessoal';
    ELSE
        RAISE NOTICE 'Coluna cenario_secao_id ja existe em quadro_pessoal';
    END IF;
END $$;

-- 4. Adicionar FK de cenario_secao na tabela funcao_span
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'funcao_span' AND column_name = 'cenario_secao_id'
    ) THEN
        ALTER TABLE funcao_span 
        ADD COLUMN cenario_secao_id UUID,
        ADD CONSTRAINT fk_span_cenario_secao FOREIGN KEY (cenario_secao_id) 
            REFERENCES cenario_secao(id) ON DELETE CASCADE;
        
        CREATE INDEX idx_span_cenario_secao ON funcao_span(cenario_secao_id);
        
        RAISE NOTICE 'Coluna cenario_secao_id adicionada a funcao_span';
    ELSE
        RAISE NOTICE 'Coluna cenario_secao_id ja existe em funcao_span';
    END IF;
END $$;

-- 5. Adicionar FK de cenario_secao na tabela premissa_funcao_mes
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'premissa_funcao_mes' AND column_name = 'cenario_secao_id'
    ) THEN
        ALTER TABLE premissa_funcao_mes 
        ADD COLUMN cenario_secao_id UUID,
        ADD CONSTRAINT fk_premissa_mes_cenario_secao FOREIGN KEY (cenario_secao_id) 
            REFERENCES cenario_secao(id) ON DELETE CASCADE;
        
        CREATE INDEX idx_premissa_mes_cenario_secao ON premissa_funcao_mes(cenario_secao_id);
        
        RAISE NOTICE 'Coluna cenario_secao_id adicionada a premissa_funcao_mes';
    ELSE
        RAISE NOTICE 'Coluna cenario_secao_id ja existe em premissa_funcao_mes';
    END IF;
END $$;

-- Verificacao final
DO $$
DECLARE
    has_cenario_cliente BOOLEAN;
    has_cenario_secao BOOLEAN;
    has_quadro_secao BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'cenario_cliente'
    ) INTO has_cenario_cliente;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'cenario_secao'
    ) INTO has_cenario_secao;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quadro_pessoal' AND column_name = 'cenario_secao_id'
    ) INTO has_quadro_secao;
    
    IF has_cenario_cliente AND has_cenario_secao AND has_quadro_secao THEN
        RAISE NOTICE '[OK] Migracao concluida com sucesso!';
        RAISE NOTICE '  - Tabela cenario_cliente: OK';
        RAISE NOTICE '  - Tabela cenario_secao: OK';
        RAISE NOTICE '  - FK cenario_secao_id em quadro_pessoal: OK';
    ELSE
        RAISE WARNING '[AVISO] Algumas partes da migracao podem ter falhado';
    END IF;
END $$;

-- Permite organizar o capacity planning por cliente e seção

-- 1. Criar tabela cenario_cliente (Clientes do Cenário)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'cenario_cliente'
    ) THEN
        CREATE TABLE cenario_cliente (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            cenario_id UUID NOT NULL,
            cliente_nw_codigo VARCHAR(50) NOT NULL,
            nome_cliente VARCHAR(255),
            ativo BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_cenario_cliente_cenario FOREIGN KEY (cenario_id) 
                REFERENCES cenarios(id) ON DELETE CASCADE,
            CONSTRAINT uq_cenario_cliente UNIQUE (cenario_id, cliente_nw_codigo)
        );
        
        CREATE INDEX idx_cenario_cliente_cenario ON cenario_cliente(cenario_id);
        CREATE INDEX idx_cenario_cliente_codigo ON cenario_cliente(cliente_nw_codigo);
        
        RAISE NOTICE 'Tabela cenario_cliente criada com sucesso';
    ELSE
        RAISE NOTICE 'Tabela cenario_cliente ja existe';
    END IF;
END $$;

-- 2. Criar tabela cenario_secao (Seções do Cliente no Cenário)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'cenario_secao'
    ) THEN
        CREATE TABLE cenario_secao (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            cenario_cliente_id UUID NOT NULL,
            secao_id UUID NOT NULL,
            
            -- Configurações específicas da seção no cenário
            fator_pa NUMERIC(5, 2) DEFAULT 3.0,  -- Fator para calcular PAs (HC / fator = PAs)
            
            ativo BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            CONSTRAINT fk_cenario_secao_cliente FOREIGN KEY (cenario_cliente_id) 
                REFERENCES cenario_cliente(id) ON DELETE CASCADE,
            CONSTRAINT fk_cenario_secao_secao FOREIGN KEY (secao_id) 
                REFERENCES secoes(id) ON DELETE CASCADE,
            CONSTRAINT uq_cenario_secao UNIQUE (cenario_cliente_id, secao_id)
        );
        
        CREATE INDEX idx_cenario_secao_cliente ON cenario_secao(cenario_cliente_id);
        CREATE INDEX idx_cenario_secao_secao ON cenario_secao(secao_id);
        
        RAISE NOTICE 'Tabela cenario_secao criada com sucesso';
    ELSE
        RAISE NOTICE 'Tabela cenario_secao ja existe';
    END IF;
END $$;

-- 3. Adicionar FK de cenario_secao na tabela quadro_pessoal
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quadro_pessoal' AND column_name = 'cenario_secao_id'
    ) THEN
        ALTER TABLE quadro_pessoal 
        ADD COLUMN cenario_secao_id UUID,
        ADD CONSTRAINT fk_quadro_cenario_secao FOREIGN KEY (cenario_secao_id) 
            REFERENCES cenario_secao(id) ON DELETE SET NULL;
        
        CREATE INDEX idx_quadro_cenario_secao ON quadro_pessoal(cenario_secao_id);
        
        RAISE NOTICE 'Coluna cenario_secao_id adicionada a quadro_pessoal';
    ELSE
        RAISE NOTICE 'Coluna cenario_secao_id ja existe em quadro_pessoal';
    END IF;
END $$;

-- 4. Adicionar FK de cenario_secao na tabela funcao_span
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'funcao_span' AND column_name = 'cenario_secao_id'
    ) THEN
        ALTER TABLE funcao_span 
        ADD COLUMN cenario_secao_id UUID,
        ADD CONSTRAINT fk_span_cenario_secao FOREIGN KEY (cenario_secao_id) 
            REFERENCES cenario_secao(id) ON DELETE CASCADE;
        
        CREATE INDEX idx_span_cenario_secao ON funcao_span(cenario_secao_id);
        
        RAISE NOTICE 'Coluna cenario_secao_id adicionada a funcao_span';
    ELSE
        RAISE NOTICE 'Coluna cenario_secao_id ja existe em funcao_span';
    END IF;
END $$;

-- 5. Adicionar FK de cenario_secao na tabela premissa_funcao_mes
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'premissa_funcao_mes' AND column_name = 'cenario_secao_id'
    ) THEN
        ALTER TABLE premissa_funcao_mes 
        ADD COLUMN cenario_secao_id UUID,
        ADD CONSTRAINT fk_premissa_mes_cenario_secao FOREIGN KEY (cenario_secao_id) 
            REFERENCES cenario_secao(id) ON DELETE CASCADE;
        
        CREATE INDEX idx_premissa_mes_cenario_secao ON premissa_funcao_mes(cenario_secao_id);
        
        RAISE NOTICE 'Coluna cenario_secao_id adicionada a premissa_funcao_mes';
    ELSE
        RAISE NOTICE 'Coluna cenario_secao_id ja existe em premissa_funcao_mes';
    END IF;
END $$;

-- Verificacao final
DO $$
DECLARE
    has_cenario_cliente BOOLEAN;
    has_cenario_secao BOOLEAN;
    has_quadro_secao BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'cenario_cliente'
    ) INTO has_cenario_cliente;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'cenario_secao'
    ) INTO has_cenario_secao;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quadro_pessoal' AND column_name = 'cenario_secao_id'
    ) INTO has_quadro_secao;
    
    IF has_cenario_cliente AND has_cenario_secao AND has_quadro_secao THEN
        RAISE NOTICE '[OK] Migracao concluida com sucesso!';
        RAISE NOTICE '  - Tabela cenario_cliente: OK';
        RAISE NOTICE '  - Tabela cenario_secao: OK';
        RAISE NOTICE '  - FK cenario_secao_id em quadro_pessoal: OK';
    ELSE
        RAISE WARNING '[AVISO] Algumas partes da migracao podem ter falhado';
    END IF;
END $$;




