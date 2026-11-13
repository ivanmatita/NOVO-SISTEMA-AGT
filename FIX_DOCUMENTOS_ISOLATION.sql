-- =========================================================================================
-- 🔥 SOLUÇÃO DEFINITIVA SaaS: DOCUMENTOS EMITIDOS & ISOLAMENTO TOTAL 🔥
-- MÓDULOS: Documentos Emitidos, Séries Fiscais, Tabela de Impostos, Clientes
-- =========================================================================================

BEGIN;

-- 1. GARANTIR ATIVAÇÃO DE RLS
ALTER TABLE public.documentos_emitidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.series_fiscais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tabela_impostos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- 2. LIMPAR POLÍTICAS ANTIGAS PARA EVITAR "MISSING OR INSUFFICIENT PERMISSIONS" OU LEAK
DO $$ 
DECLARE 
    t text;
BEGIN
    FOR t IN SELECT unnest(ARRAY['documentos_emitidos', 'series_fiscais', 'tabela_impostos', 'clientes']) LOOP
        EXECUTE format('DROP POLICY IF EXISTS "SaaS_Isolation_Policy" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "SAAS_SELECT_DOCUMENTOS" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "SAAS_INSERT_DOCUMENTOS" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "SAAS_UPDATE_DOCUMENTOS" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "SAAS_DELETE_DOCUMENTOS" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "SAAS_TENANT_ISOLATION_%I" ON public.%I', t, t);
    END LOOP;
END $$;

-- 3. CRIAR POLÍTICAS DE ALTA PERFORMANCE (USANDO GET_AUTH_EMPRESA_ID)
-- Nota: A função get_auth_empresa_id() já existe e é estável.

-- Documentos Emitidos
CREATE POLICY "SAAS_TENANT_ISOLATION_documentos_emitidos" ON public.documentos_emitidos
    FOR ALL TO authenticated
    USING (empresa_id = public.get_auth_empresa_id())
    WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- Séries Fiscais
CREATE POLICY "SAAS_TENANT_ISOLATION_series_fiscais" ON public.series_fiscais
    FOR ALL TO authenticated
    USING (empresa_id = public.get_auth_empresa_id())
    WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- Tabela de Impostos
CREATE POLICY "SAAS_TENANT_ISOLATION_tabela_impostos" ON public.tabela_impostos
    FOR ALL TO authenticated
    USING (empresa_id = public.get_auth_empresa_id())
    WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- Clientes
CREATE POLICY "SAAS_TENANT_ISOLATION_clientes" ON public.clientes
    FOR ALL TO authenticated
    USING (empresa_id = public.get_auth_empresa_id())
    WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- 4. ÍNDICES DE PERFORMANCE (Fundamental para SaaS Multi-tenant)
CREATE INDEX IF NOT EXISTS idx_documentos_emitidos_empresa_id ON public.documentos_emitidos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_documentos_emitidos_created_at ON public.documentos_emitidos(created_at);
CREATE INDEX IF NOT EXISTS idx_series_fiscais_empresa_id ON public.series_fiscais(empresa_id);
CREATE INDEX IF NOT EXISTS idx_tabela_impostos_empresa_id ON public.tabela_impostos(empresa_id);

-- 5. REPARAÇÃO DE INTEGRIDADE: Marcar a tabela de Documentos na Publication do Realtime
-- Isto garante que o frontend receba os eventos via Supabase Channel
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'documentos_emitidos') THEN
       -- Tentar adicionar se a publication existir
       BEGIN
         ALTER PUBLICATION supabase_realtime ADD TABLE public.documentos_emitidos;
       EXCEPTION WHEN OTHERS THEN
         RAISE NOTICE 'Não foi possível adicionar à publication realtime: %', SQLERRM;
       END;
    END IF;
END $$;

COMMIT;

-- ✅ SUCESSO: RLS E ISOLAMENTO APLICADOS PARA DOCUMENTOS EMITIDOS.
