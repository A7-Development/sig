-- Migration: Corrigir FK da tabela cenario_cliente
-- Problema: tabela foi criada com cenario_id, mas modelo usa cenario_empresa_id
-- A estrutura correta é: cenario -> cenario_empresa -> cenario_cliente -> cenario_secao

-- 1. Remover tabelas antigas (ordem importa por causa das FKs)
DROP TABLE IF EXISTS cenario_secao CASCADE;
DROP TABLE IF EXISTS cenario_cliente CASCADE;

-- 2. Criar tabela cenario_cliente corretamente (FK para cenarios_empresas)
CREATE TABLE IF NOT EXISTS cenario_cliente (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cenario_empresa_id UUID NOT NULL,
    cliente_nw_codigo VARCHAR(50) NOT NULL,
    nome_cliente VARCHAR(255),
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cenario_cliente_empresa FOREIGN KEY (cenario_empresa_id) 
        REFERENCES cenarios_empresas(id) ON DELETE CASCADE,
    CONSTRAINT uq_cenario_empresa_cliente UNIQUE (cenario_empresa_id, cliente_nw_codigo)
);

CREATE INDEX IF NOT EXISTS idx_cenario_cliente_empresa ON cenario_cliente(cenario_empresa_id);
CREATE INDEX IF NOT EXISTS idx_cenario_cliente_codigo ON cenario_cliente(cliente_nw_codigo);

RAISE NOTICE 'Tabela cenario_cliente recriada com FK correta para cenarios_empresas';

-- 3. Criar tabela cenario_secao (FK para cenario_cliente)
CREATE TABLE IF NOT EXISTS cenario_secao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cenario_cliente_id UUID NOT NULL,
    secao_id UUID NOT NULL,
    fator_pa NUMERIC(5, 2) DEFAULT 3.0,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cenario_secao_cliente FOREIGN KEY (cenario_cliente_id) 
        REFERENCES cenario_cliente(id) ON DELETE CASCADE,
    CONSTRAINT fk_cenario_secao_secao FOREIGN KEY (secao_id) 
        REFERENCES secoes(id) ON DELETE CASCADE,
    CONSTRAINT uq_cenario_cliente_secao UNIQUE (cenario_cliente_id, secao_id)
);

CREATE INDEX IF NOT EXISTS idx_cenario_secao_cliente ON cenario_secao(cenario_cliente_id);
CREATE INDEX IF NOT EXISTS idx_cenario_secao_secao ON cenario_secao(secao_id);

RAISE NOTICE 'Tabela cenario_secao recriada';

-- Verificação final
DO $$
DECLARE
    has_cliente BOOLEAN;
    has_secao BOOLEAN;
    correct_fk BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'cenario_cliente'
    ) INTO has_cliente;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'cenario_secao'
    ) INTO has_secao;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'cenario_cliente' AND column_name = 'cenario_empresa_id'
    ) INTO correct_fk;
    
    IF has_cliente AND has_secao AND correct_fk THEN
        RAISE NOTICE '[OK] Migração concluída! FK corrigida para cenarios_empresas';
    ELSE
        RAISE WARNING '[ERRO] Migração pode ter falhado';
    END IF;
END $$;





