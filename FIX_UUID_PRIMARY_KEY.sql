-- ========================================================
-- FIX: GERAÇÃO AUTOMÁTICA DE IDs (PRIMARY KEYS)
-- Resolva o erro: "null value in column id violates not-null"
-- ========================================================

-- 1. Ativar extensões de criptografia e UUID (essencial no Postgres)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Corrigir a tabela EMPRESAS para gerar IDs por si mesma
ALTER TABLE public.empresas 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 3. Caso a tabela PERFIS também tenha este erro:
ALTER TABLE public.perfis 
ALTER COLUMN created_at SET DEFAULT now();

-- 4. Criar Política RLS para INSERT (se não existir)
-- Impede que utilizadores bloqueiem a própria criação de conta
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SaaS_Auto_Creation_Policy" ON public.empresas;
CREATE POLICY "SaaS_Auto_Creation_Policy" ON public.empresas
    FOR INSERT 
    TO authenticated
    WITH CHECK (auth_user_id = auth.uid());

-- 5. Limpar Cache do Esquema (PostgREST)
NOTIFY pgrst, 'reload schema';

ANALYZE public.empresas;
