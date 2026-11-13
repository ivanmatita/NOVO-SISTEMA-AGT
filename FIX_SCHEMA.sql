-- ========================================================
-- SCRIPT PARA GARANTIR QUE AS COLUNAS EXISTAM
-- ========================================================

-- Adicionar is_processed a hr_assiduidade, se não existir
ALTER TABLE public.hr_assiduidade ADD COLUMN IF NOT EXISTS is_processed BOOLEAN NOT NULL DEFAULT false;

-- Adicionar is_processed a hr_processamentos, se não existir
ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS is_processed BOOLEAN NOT NULL DEFAULT true;

-- Criar do zero se faltar (com base nos anteriores)
-- Mas essas já rodam de forma não-destrutiva

NOTIFY pgrst, 'reload schema';
