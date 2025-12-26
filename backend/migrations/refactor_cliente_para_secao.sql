-- ============================================
-- MIGRAÇÃO: Cliente -> Seção + Rateio
-- Versão: 1.0
-- Data: 2024-12
-- ============================================
-- Esta migração simplifica a hierarquia do cenário:
-- ANTES: Cenário -> Empresa -> Cliente -> Seção -> QuadroPessoal
-- DEPOIS: Cenário -> Empresa -> Seção (representa Cliente) -> QuadroPessoal
-- ============================================

-- 1. Adicionar cenario_empresa_id em cenario_secao (nova FK direta para empresa)
ALTER TABLE cenario_secao ADD COLUMN IF NOT EXISTS cenario_empresa_id UUID;

-- 1.1 Tornar cenario_cliente_id nullable (não mais obrigatório na nova hierarquia)
ALTER TABLE cenario_secao ALTER COLUMN cenario_cliente_id DROP NOT NULL;

-- 2. Migrar dados existentes: copiar empresa_id do cliente para a seção
UPDATE cenario_secao cs
SET cenario_empresa_id = cc.cenario_empresa_id
FROM cenario_cliente cc
WHERE cs.cenario_cliente_id = cc.id
  AND cs.cenario_empresa_id IS NULL;

-- 3. Adicionar FK para cenario_empresa_id
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_cenario_secao_empresa_new'
    ) THEN
        ALTER TABLE cenario_secao 
        ADD CONSTRAINT fk_cenario_secao_empresa_new 
        FOREIGN KEY (cenario_empresa_id) REFERENCES cenarios_empresas(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 4. Criar tabelas de rateio
CREATE TABLE IF NOT EXISTS rateio_grupos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cenario_id UUID NOT NULL REFERENCES cenarios(id) ON DELETE CASCADE,
    cc_origem_pool_id UUID NOT NULL REFERENCES centros_custo(id),
    nome VARCHAR(200) NOT NULL,
    descricao TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rateio_destinos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rateio_grupo_id UUID NOT NULL REFERENCES rateio_grupos(id) ON DELETE CASCADE,
    cc_destino_id UUID NOT NULL REFERENCES centros_custo(id),
    percentual NUMERIC(5,2) NOT NULL CHECK (percentual >= 0 AND percentual <= 100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Adicionar centro_custo_id em custos_calculados (para resultado por CC)
ALTER TABLE custos_calculados ADD COLUMN IF NOT EXISTS centro_custo_id UUID;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_custos_calculados_cc'
    ) THEN
        ALTER TABLE custos_calculados 
        ADD CONSTRAINT fk_custos_calculados_cc 
        FOREIGN KEY (centro_custo_id) REFERENCES centros_custo(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 6. Índices para performance
CREATE INDEX IF NOT EXISTS idx_cenario_secao_empresa_new ON cenario_secao(cenario_empresa_id);
CREATE INDEX IF NOT EXISTS idx_rateio_grupos_cenario ON rateio_grupos(cenario_id);
CREATE INDEX IF NOT EXISTS idx_rateio_grupos_cc_origem ON rateio_grupos(cc_origem_pool_id);
CREATE INDEX IF NOT EXISTS idx_rateio_destinos_grupo ON rateio_destinos(rateio_grupo_id);
CREATE INDEX IF NOT EXISTS idx_rateio_destinos_cc ON rateio_destinos(cc_destino_id);
CREATE INDEX IF NOT EXISTS idx_custos_calculados_cc ON custos_calculados(centro_custo_id);

-- 7. Adicionar tipo POOL ao enum de tipos de centro de custo (se necessário)
-- Nota: O campo tipo já aceita strings, então POOL será aceito automaticamente
-- Apenas documentando que os tipos válidos agora são: OPERACIONAL, POOL, ADMINISTRATIVO, OVERHEAD

-- ============================================
-- NOTA IMPORTANTE:
-- - A tabela cenario_cliente NÃO é removida para manter compatibilidade
-- - Novos cenários usarão cenario_empresa_id diretamente
-- - A seção "CORPORATIVO" e o CC "POOL RATEIO" serão criados no TOTVS
-- ============================================

