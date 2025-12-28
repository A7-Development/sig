-- Migration: Adicionar tipo_rateio ao rateio_grupos e area_m2 aos centros_custo
-- Data: 2025-12-27
-- Descrição: 
--   1. Adiciona coluna tipo_rateio ao rateio_grupos (MANUAL, HC, AREA, PA)
--   2. Adiciona coluna area_m2 aos centros_custo para rateio proporcional à área

-- ============================================
-- 1. Adicionar tipo_rateio ao rateio_grupos
-- ============================================

ALTER TABLE rateio_grupos 
ADD COLUMN IF NOT EXISTS tipo_rateio VARCHAR(20) DEFAULT 'MANUAL' NOT NULL;

COMMENT ON COLUMN rateio_grupos.tipo_rateio IS 'Tipo de rateio: MANUAL (percentuais definidos), HC (proporcional ao headcount), AREA (proporcional à área m²), PA (proporcional às posições de atendimento)';

-- ============================================
-- 2. Adicionar area_m2 aos centros_custo
-- ============================================

ALTER TABLE centros_custo 
ADD COLUMN IF NOT EXISTS area_m2 NUMERIC(10, 2);

COMMENT ON COLUMN centros_custo.area_m2 IS 'Área em metros quadrados para cálculo de rateio proporcional à área';

-- ============================================
-- 3. Atualizar registros existentes (se necessário)
-- ============================================

-- Garantir que todos os grupos de rateio existentes tenham tipo MANUAL
UPDATE rateio_grupos 
SET tipo_rateio = 'MANUAL' 
WHERE tipo_rateio IS NULL;

-- ============================================
-- Verificação
-- ============================================

DO $$
BEGIN
    -- Verificar se as colunas foram criadas
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'rateio_grupos' AND column_name = 'tipo_rateio'
    ) THEN
        RAISE NOTICE 'Coluna tipo_rateio adicionada com sucesso em rateio_grupos';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'centros_custo' AND column_name = 'area_m2'
    ) THEN
        RAISE NOTICE 'Coluna area_m2 adicionada com sucesso em centros_custo';
    END IF;
END $$;

