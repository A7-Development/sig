-- Migração para o novo modelo Master-Detail
-- Hierarquia: Cenário > Empresa > Cliente > Seção > QuadroPessoal
-- Data: 2025-12-15

-- ============================================
-- 1. Adicionar ID à tabela cenarios_empresas
-- ============================================

-- Primeiro, criar nova coluna id
ALTER TABLE cenarios_empresas 
ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();

-- Preencher IDs para registros existentes
UPDATE cenarios_empresas SET id = gen_random_uuid() WHERE id IS NULL;

-- Criar índice único para a nova PK
CREATE UNIQUE INDEX IF NOT EXISTS idx_cenarios_empresas_id ON cenarios_empresas(id);

-- Nota: A PK composta original será mantida como unique constraint

-- ============================================
-- 2. Alterar cenario_cliente para referenciar cenarios_empresas
-- ============================================

-- Adicionar nova coluna cenario_empresa_id
ALTER TABLE cenario_cliente 
ADD COLUMN IF NOT EXISTS cenario_empresa_id UUID;

-- Migrar dados: encontrar o cenario_empresa correspondente
-- (Isso assume que cada cliente está associado à primeira empresa do cenário)
UPDATE cenario_cliente cc
SET cenario_empresa_id = (
    SELECT ce.id 
    FROM cenarios_empresas ce 
    WHERE ce.cenario_id = cc.cenario_id 
    LIMIT 1
)
WHERE cenario_empresa_id IS NULL;

-- Para registros sem empresa, criar uma associação padrão (se necessário)
-- ou deletar registros órfãos
DELETE FROM cenario_cliente WHERE cenario_empresa_id IS NULL;

-- Criar FK
ALTER TABLE cenario_cliente
ADD CONSTRAINT fk_cenario_cliente_empresa 
FOREIGN KEY (cenario_empresa_id) REFERENCES cenarios_empresas(id) ON DELETE CASCADE;

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_cenario_cliente_empresa ON cenario_cliente(cenario_empresa_id);

-- Remover coluna antiga cenario_id (após validar migração)
-- ALTER TABLE cenario_cliente DROP COLUMN cenario_id;

-- Atualizar unique constraint
ALTER TABLE cenario_cliente DROP CONSTRAINT IF EXISTS uq_cenario_cliente;
ALTER TABLE cenario_cliente ADD CONSTRAINT uq_cenario_empresa_cliente 
UNIQUE (cenario_empresa_id, cliente_nw_codigo);

-- ============================================
-- 3. Remover fator_pa de cenario_secao
-- ============================================

-- O campo será mantido por compatibilidade, mas não mais usado
-- ALTER TABLE cenario_secao DROP COLUMN IF EXISTS fator_pa;

-- ============================================
-- 4. Adicionar fator_pa ao quadro_pessoal
-- ============================================

ALTER TABLE quadro_pessoal 
ADD COLUMN IF NOT EXISTS fator_pa NUMERIC(5,2) DEFAULT 1.0;

-- Migrar valores de fator_pa das seções para o quadro_pessoal
UPDATE quadro_pessoal qp
SET fator_pa = COALESCE(
    (SELECT cs.fator_pa FROM cenario_secao cs WHERE cs.id = qp.cenario_secao_id),
    1.0
)
WHERE fator_pa IS NULL OR fator_pa = 1.0;

-- ============================================
-- 5. Verificação
-- ============================================

-- Verificar estrutura final
-- SELECT 'cenarios_empresas' as tabela, column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'cenarios_empresas';

-- SELECT 'cenario_cliente' as tabela, column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'cenario_cliente';

-- SELECT 'quadro_pessoal' as tabela, column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'quadro_pessoal' AND column_name = 'fator_pa';

COMMIT;






