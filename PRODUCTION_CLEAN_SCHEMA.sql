-- ========================================================
-- SCHEMA SAAS MULTIEMPRESA - PRODUÇÃO (LIMP0)
-- FOCO: ESTABILIDADE, SEM COLUNA 'STATUS', SEM 'NOME' LEGADO
-- ========================================================

-- 1. ATIVAR EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABELA EMPRESAS (RECRIAÇÃO SEGURA)
-- Se a tabela já existir, removemos apenas as colunas problemáticas
ALTER TABLE public.empresas DROP COLUMN IF EXISTS status;
ALTER TABLE public.empresas DROP COLUMN IF EXISTS nome;

-- Certificar que 'id' e 'nome_empresa' estão corretos
ALTER TABLE public.empresas ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.empresas ALTER COLUMN nome_empresa SET NOT NULL;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id);

-- 3. TABELA PERFIS (RECRIAÇÃO SEGURA)
ALTER TABLE public.perfis DROP COLUMN IF EXISTS status;
ALTER TABLE public.perfis ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 4. RLS - SEGURANÇA
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

-- Política Empresas
DROP POLICY IF EXISTS "SaaS_Empresas_Access" ON public.empresas;
CREATE POLICY "SaaS_Empresas_Access" ON public.empresas
    FOR ALL TO authenticated
    USING (auth_user_id = auth.uid())
    WITH CHECK (auth_user_id = auth.uid());

-- Política Perfis
DROP POLICY IF EXISTS "SaaS_Perfis_Access" ON public.perfis;
CREATE POLICY "SaaS_Perfis_Access" ON public.perfis
    FOR ALL TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- 5. RECARREGAR API SUPABASE
NOTIFY pgrst, 'reload schema';

ANALYZE public.empresas;
ANALYZE public.perfis;
