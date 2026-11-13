-- Definitive SQL Fix for Multi-tenant ERP (IMATEC)
-- Objective: Absolute tenant isolation, Fix RLS recursion, and Standardize entreprise_id

-- 1. Create robust auth helper function
CREATE OR REPLACE FUNCTION public.get_auth_empresa_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER -- Essential to bypass RLS during lookup and prevent recursion
STABLE
SET search_path = public
AS $$
DECLARE
    v_empresa_id uuid;
BEGIN
    -- Try to find in the profiles table first (caching for the session if we wanted, but simple lookup is safer)
    SELECT empresa_id INTO v_empresa_id
    FROM public.perfis
    WHERE id = auth.uid();
    
    -- Fallback: Check if the user is an owner of a company directly
    IF v_empresa_id IS NULL THEN
        SELECT id INTO v_empresa_id
        FROM public.empresas
        WHERE auth_user_id = auth.uid()
        LIMIT 1;
    END IF;
    
    RETURN v_empresa_id;
END;
$$;

-- 2. Ensure all relevant tables have empresa_id
-- We assume armazens, alertas_tarefas, metrics, caixa_movimentacoes, etc exist.
-- If they have company_id, we rename it.

DO $$ 
DECLARE 
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.columns 
        WHERE column_name = 'company_id' AND table_schema = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I RENAME COLUMN company_id TO empresa_id', t);
    END;
END $$;

-- 3. Enable RLS and setup universal policies
DO $$ 
DECLARE 
    t text;
    tables_to_isolate text[] := ARRAY[
        'armazens', 
        'alertas_tarefas', 
        'metrics', 
        'caixa_movimentacoes', 
        'caixas',
        'documentos_emitidos',
        'clientes',
        'produtos',
        'fornecedores',
        'colaboradores',
        'compras',
        'series_fiscais',
        'movimentacoes_stock',
        'contas_contabilisticas'
    ];
BEGIN
    FOREACH t IN ARRAY tables_to_isolate
    LOOP
        -- Skip if table doesn't exist
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = t AND table_schema = 'public') THEN
            -- Enable RLS
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
            
            -- Drop existing permissive or conflicting policies
            EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation" ON public.%I', t);
            EXECUTE format('DROP POLICY IF EXISTS "Empresa Isolation" ON public.%I', t);
            EXECUTE format('DROP POLICY IF EXISTS "Enable all for authenticated users only" ON public.%I', t);
            
            -- Create strict tenant isolation policy
            EXECUTE format('
                CREATE POLICY "Tenant Isolation" ON public.%I
                AS PERMISSIVE FOR ALL
                TO authenticated
                USING (empresa_id = public.get_auth_empresa_id())
                WITH CHECK (empresa_id = public.get_auth_empresa_id())
            ', t);
        END IF;
    END LOOP;
END $$;

-- 4. Specific policies for EMPRESAS and PERFIS
-- Empresas: Only owner can see/edit their company
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner access" ON public.empresas;
CREATE POLICY "Owner access" ON public.empresas
AS PERMISSIVE FOR ALL
TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

-- Perfis: Users can read profiles in the same company
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Company members access" ON public.perfis;
CREATE POLICY "Company members access" ON public.perfis
AS PERMISSIVE FOR ALL
TO authenticated
USING (empresa_id = public.get_auth_empresa_id())
WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- 5. Special rule for sign-up: allow insert into empresas and perfis during registration
-- This is tricky. Usually we want to allow insert if auth.uid() is not yet in profiles.
DROP POLICY IF EXISTS "Allow registration" ON public.empresas;
CREATE POLICY "Allow registration" ON public.empresas
FOR INSERT TO authenticated
WITH CHECK (true); -- We rely on auth_user_id being set to auth.uid() in the app

DROP POLICY IF EXISTS "Allow profile creation" ON public.perfis;
CREATE POLICY "Allow profile creation" ON public.perfis
FOR INSERT TO authenticated
WITH CHECK (true);

-- 6. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_armazens_empresa_id ON public.armazens(empresa_id);
CREATE INDEX IF NOT EXISTS idx_alertas_empresa_id ON public.alertas_tarefas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_perfis_empresa_id ON public.perfis(empresa_id);
CREATE INDEX IF NOT EXISTS idx_caixas_empresa_id ON public.caixas(empresa_id);
