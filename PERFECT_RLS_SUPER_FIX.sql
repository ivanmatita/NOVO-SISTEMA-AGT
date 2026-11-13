-- 1. CORRIGIR SCHEMA: RENAME company_id to empresa_id in all tables
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name FROM information_schema.columns 
        WHERE column_name = 'company_id' AND table_schema = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I RENAME COLUMN company_id TO empresa_id;', t);
    END LOOP;
END $$;

-- 2. REMOVER TODAS AS POLICIES
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN (
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    END LOOP;
END $$;

-- 3. DROP old functions
DROP FUNCTION IF EXISTS public.get_auth_empresa_id() CASCADE;
DROP FUNCTION IF EXISTS public.get_auth_company_id() CASCADE;
DROP FUNCTION IF EXISTS public.get_tenant_id() CASCADE;

-- 4. NEW SECURE FUNCTION TO GET TENANT ID
CREATE OR REPLACE FUNCTION public.get_auth_empresa_id()
RETURNS UUID AS $$
DECLARE
    tenant_id UUID;
BEGIN
    -- Check perfis first
    SELECT empresa_id INTO tenant_id
    FROM public.perfis
    WHERE id = auth.uid()
    LIMIT 1;
    
    IF tenant_id IS NOT NULL THEN
        RETURN tenant_id;
    END IF;

    -- Check if user is the direct owner
    SELECT id INTO tenant_id
    FROM public.empresas
    WHERE auth_user_id = auth.uid()
    LIMIT 1;

    RETURN tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. ENABLE RLS FOR EVERYTHING
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    END LOOP;
END $$;

-- 6. SETUP EMPRESAS
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);

CREATE POLICY "empresas_select" ON public.empresas FOR SELECT USING (auth.uid() = auth_user_id OR id = public.get_auth_empresa_id());
CREATE POLICY "empresas_insert" ON public.empresas FOR INSERT WITH CHECK (auth.uid() = auth_user_id);
CREATE POLICY "empresas_update" ON public.empresas FOR UPDATE USING (auth.uid() = auth_user_id OR id = public.get_auth_empresa_id());
CREATE POLICY "empresas_delete" ON public.empresas FOR DELETE USING (auth.uid() = auth_user_id);

-- 7. SETUP PERFIS
CREATE POLICY "perfis_select" ON public.perfis FOR SELECT USING (id = auth.uid() OR empresa_id = public.get_auth_empresa_id());
CREATE POLICY "perfis_insert" ON public.perfis FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "perfis_update" ON public.perfis FOR UPDATE USING (id = auth.uid() OR empresa_id = public.get_auth_empresa_id());
CREATE POLICY "perfis_delete" ON public.perfis FOR DELETE USING (id = auth.uid());

-- 8. APPLY STANDARD POLICY TO ALL TABLES WITH empresa_id
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name FROM information_schema.columns 
        WHERE column_name = 'empresa_id' AND table_schema = 'public' AND table_name NOT IN ('perfis')
    LOOP
        EXECUTE format('CREATE POLICY "standard_select" ON public.%I FOR SELECT USING (empresa_id = public.get_auth_empresa_id());', t);
        EXECUTE format('CREATE POLICY "standard_insert" ON public.%I FOR INSERT WITH CHECK (empresa_id = public.get_auth_empresa_id());', t);
        EXECUTE format('CREATE POLICY "standard_update" ON public.%I FOR UPDATE USING (empresa_id = public.get_auth_empresa_id());', t);
        EXECUTE format('CREATE POLICY "standard_delete" ON public.%I FOR DELETE USING (empresa_id = public.get_auth_empresa_id());', t);
    END LOOP;
END $$;


-- 9. GARANTIR FOREIGN KEYS
ALTER TABLE public.perfis 
DROP CONSTRAINT IF EXISTS perfis_empresa_id_fkey;

ALTER TABLE public.perfis 
ADD CONSTRAINT perfis_empresa_id_fkey 
FOREIGN KEY (empresa_id) 
REFERENCES public.empresas(id) 
ON DELETE CASCADE;
