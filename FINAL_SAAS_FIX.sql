-- =========================================================================================
-- 🔥 SCRIPT DE REPARAÇÃO DEFINITIVA: ISOLAMENTO SAAS & ERRO STACK DEPTH LIMIT 🔥
-- =========================================================================================

BEGIN;

-- 1. CORREÇÃO DA FUNÇÃO CENTRAL PARA EVITAR O LOOP (STACK DEPTH LIMIT)
CREATE OR REPLACE FUNCTION public.get_auth_empresa_id()
RETURNS uuid AS $$
DECLARE
  v_empresa_id uuid;
BEGIN
  -- Acesso sem disparar policies na tabela perfis, garantindo máxima performance
  SELECT empresa_id INTO v_empresa_id FROM public.perfis WHERE id = auth.uid() LIMIT 1;
  RETURN v_empresa_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- 2. POLÍTICA SEGURA PARA A TABELA 'perfis'
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "SaaS_Isolation_Policy" ON public.perfis;
DROP POLICY IF EXISTS "Perfis_Permit_Own" ON public.perfis;
CREATE POLICY "Perfis_Permit_Own" ON public.perfis
    FOR ALL TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- 3. POLÍTICA SEGURA PARA A TABELA 'empresas'
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "SaaS_Isolation_Policy" ON public.empresas;
DROP POLICY IF EXISTS "Empresas_Profile_Isolation" ON public.empresas;
CREATE POLICY "Empresas_Profile_Isolation" ON public.empresas
    FOR ALL TO authenticated
    USING (auth_user_id = auth.uid() OR id = public.get_auth_empresa_id())
    WITH CHECK (auth_user_id = auth.uid());

-- 4. APLICAR ISOLAMENTO RLS A TODAS AS OUTRAS TABELAS RELEVANTES
DO $$ 
DECLARE 
    t text;
    tables_list text[] := ARRAY[
        'clientes', 'fornecedores', 'documentos_emitidos', 'compras', 
        'caixas', 'caixa_movimentacoes', 'armazens', 'series_fiscais', 
        'tabela_impostos', 'secretaria_digital', 'alertas_tarefas', 
        'metricas', 'locais_trabalho', 'produtos', 'servicos', 'inventario'
    ];
BEGIN
    FOREACH t IN ARRAY tables_list LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t AND table_schema = 'public') THEN
            
            -- Ativar RLS
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

            -- Limpar políticas antigas/inseguras
            EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation" ON public.%I', t);
            EXECUTE format('DROP POLICY IF EXISTS "SaaS_Isolation" ON public.%I', t);
            EXECUTE format('DROP POLICY IF EXISTS "allow_all" ON public.%I', t);
            EXECUTE format('DROP POLICY IF EXISTS "clientes_isolation" ON public.%I', t);
            EXECUTE format('DROP POLICY IF EXISTS "SAAS_TENANT_ISOLATION_" || %I ON public.%I', t, t);
            EXECUTE format('DROP POLICY IF EXISTS "SaaS_Isolation_Policy" ON public.%I', t);
            
            -- Criar política infalível nova
            EXECUTE format('CREATE POLICY "SaaS_Isolation_Policy" ON public.%I 
                            FOR ALL TO authenticated 
                            USING (empresa_id = public.get_auth_empresa_id()) 
                            WITH CHECK (empresa_id = public.get_auth_empresa_id())', t);
        END IF;
    END LOOP;
END $$;

COMMIT;

-- ATUALIZAR CACHÉ (Obrigatório)
NOTIFY pgrst, 'reload schema';
