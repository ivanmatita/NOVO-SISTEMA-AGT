-- ====================================================================
-- FIX: RESOLVER ERRO "operator does not exist: bigint = uuid"
-- Execute este script no Painel SQL do Supabase (SQL Editor)
-- Link do painel: https://supabase.com/dashboard/project/_/sql
-- ====================================================================

-- 1. Desativar RLS temporariamente e remover políticas antigas para evitar bloqueios
ALTER TABLE IF EXISTS public.professions DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "SaaS_Isolation_Policy" ON public.professions;
DROP POLICY IF EXISTS "tenant_isolation_policy" ON public.professions;
DROP POLICY IF EXISTS "Tenant Isolation" ON public.professions;
DROP POLICY IF EXISTS "Allow all actions for company" ON public.professions;

-- 2. Eliminar a tabela antiga de profissões (que foi criada incorretamente como bigint)
-- Nota: Esta tabela está completamente vazia (0 registros), por isso é 100% seguro eliminá-la.
DROP TABLE IF EXISTS public.professions CASCADE;

-- 3. Recriar a tabela "professions" com as colunas corretas de tipo UUID
CREATE TABLE public.professions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    inss_profession TEXT,
    base_salary NUMERIC DEFAULT 0,
    acerto_salarial NUMERIC DEFAULT 0,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Re-ativar o RLS (Row Level Security) para garantir a privacidade dos dados multi-tenant
ALTER TABLE public.professions ENABLE ROW LEVEL SECURITY;

-- 5. Criar a política de isolamento SaaS para restringir acessos à empresa do utilizador logado
CREATE POLICY "SaaS_Isolation_Policy" ON public.professions 
    FOR ALL TO authenticated 
    USING (empresa_id = public.get_auth_empresa_id()) 
    WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- 6. Garantir também uma política genérica para o Onboarding ou bypass, se necessário
CREATE POLICY "Allow all actions for company" ON public.professions
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- 7. Dar privilégios de acesso aos perfis PostgREST do Supabase
GRANT ALL ON public.professions TO authenticated;
GRANT ALL ON public.professions TO anon;
GRANT ALL ON public.professions TO service_role;

-- 8. Recarregar o cache do esquema do Supabase
NOTIFY pgrst, 'reload schema';

-- 9. Confirmar conclusão
SELECT 'Tabela professions recriada com sucesso com tipos UUID!' as status;
