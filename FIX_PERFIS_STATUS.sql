-- ========================================================
-- FIX FINAL: COLUNA STATUS NA TABELA PERFIS
-- ========================================================

-- 1. Adicionar a coluna status se não existir
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS status text DEFAULT 'Ativo';

-- 2. Atualizar todos os perfis para 'Ativo'
UPDATE public.perfis SET status = 'Ativo' WHERE status IS NULL;

-- 3. Recarregar o cache do Supabase
NOTIFY pgrst, 'reload schema';

ANALYZE public.perfis;
