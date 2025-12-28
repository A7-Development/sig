-- Migration: Criar tabela de Tipos de Receita
-- Data: 2024-12-26
-- Descrição: Cadastro de tipos de receita com conta contábil para DRE

CREATE TABLE IF NOT EXISTS tipos_receita (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(50) UNIQUE NOT NULL,
    nome VARCHAR(200) NOT NULL,
    descricao TEXT NULL,
    categoria VARCHAR(50) NOT NULL DEFAULT 'OPERACIONAL',
    
    -- Conta Contábil para DRE
    conta_contabil_codigo VARCHAR(50) NULL,
    conta_contabil_descricao VARCHAR(255) NULL,
    
    -- Controle
    ordem INTEGER DEFAULT 0,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS ix_tipos_receita_codigo ON tipos_receita(codigo);
CREATE INDEX IF NOT EXISTS ix_tipos_receita_categoria ON tipos_receita(categoria);
CREATE INDEX IF NOT EXISTS ix_tipos_receita_ativo ON tipos_receita(ativo);

-- Dados iniciais de exemplo
INSERT INTO tipos_receita (codigo, nome, categoria, conta_contabil_codigo, conta_contabil_descricao, ordem) VALUES
    ('REC001', 'Receita de Vendas', 'VARIAVEL', '31101001', 'Receita Bruta de Vendas', 1),
    ('REC002', 'Receita de Serviços', 'FIXA', '31102001', 'Receita de Prestação de Serviços', 2),
    ('REC003', 'Receita por HC', 'FIXA', '31103001', 'Receita por Headcount', 3),
    ('REC004', 'Receita por PA', 'FIXA', '31104001', 'Receita por Posição de Atendimento', 4)
ON CONFLICT (codigo) DO NOTHING;




