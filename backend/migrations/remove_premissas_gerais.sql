-- Migration: Remover tabela de premissas gerais
-- Data: 2025-12-18
-- Motivo: Usar apenas premissas específicas por função/mês (premissa_funcao_mes)
-- 
-- A tabela 'premissas' continha valores gerais por cenário, mas não era usada
-- para cálculos reais. Todos os cálculos usam premissas_funcao_mes que permite
-- valores específicos por função, seção e mês.

BEGIN;

-- Dropar tabela de premissas gerais
-- CASCADE remove automaticamente constraints e relacionamentos
DROP TABLE IF EXISTS premissas CASCADE;

COMMIT;






