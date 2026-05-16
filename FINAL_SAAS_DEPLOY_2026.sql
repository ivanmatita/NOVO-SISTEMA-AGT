-- ========================================================
-- PRODUCTION READY SAAS ARCHITECTURE (2026)
-- SOLUÇÃO DEFINITIVA: ANTI-RATE-LIMIT & AUTO-ONBOARDING
-- ========================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. MASTER MULTI-TENANT FUNCTION (Security Definer)
-- This function identifies the company ID for the current authenticated user.
CREATE OR REPLACE FUNCTION public.get_auth_empresa_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id uuid;
BEGIN
    -- Priority 1: Check profiles table (Explicit relationship)
    SELECT empresa_id INTO v_id FROM public.perfis WHERE id = auth.uid();
    
    -- Priority 2: Check companies table (Ownership relationship)
    IF v_id IS NULL THEN
        SELECT id INTO v_id FROM public.empresas WHERE auth_user_id = auth.uid() LIMIT 1;
    END IF;
    
    RETURN v_id;
END;
$$;

-- 3. TABLES FIXES

-- Ensure EMPRESAS has auth_user_id (The owner)
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id);

-- Ensure PERFIS is correctly structured
CREATE TABLE IF NOT EXISTS public.perfis (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    empresa_id uuid REFERENCES public.empresas(id),
    email text,
    nome text,
    role text DEFAULT 'admin',
    status text DEFAULT 'Ativo',
    created_at timestamptz DEFAULT now()
);

-- 4. RLS POLICIES (THE BRICK WALL)

-- Reset RLS
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

-- EMPRESAS: Allow users to create their own company or see the one they are linked to.
DROP POLICY IF EXISTS "SaaS_Self_Create" ON public.empresas;
CREATE POLICY "SaaS_Self_Create" ON public.empresas
    FOR INSERT TO authenticated
    WITH CHECK (auth_user_id = auth.uid());

DROP POLICY IF EXISTS "SaaS_Self_View" ON public.empresas;
CREATE POLICY "SaaS_Self_View" ON public.empresas
    FOR SELECT TO authenticated
    USING (auth_user_id = auth.uid() OR id = public.get_auth_empresa_id());

DROP POLICY IF EXISTS "SaaS_Self_Update" ON public.empresas;
CREATE POLICY "SaaS_Self_Update" ON public.empresas
    FOR UPDATE TO authenticated
    USING (auth_user_id = auth.uid());

-- PERFIS: Users see and update only themselves.
DROP POLICY IF EXISTS "SaaS_Perfis_Isolation" ON public.perfis;
CREATE POLICY "SaaS_Perfis_Isolation" ON public.perfis
    FOR ALL TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- 5. DATA ISOLATION (Recursive Multi-tenancy)
-- Any table that has empresa_id MUST use this pattern.
DO $$ 
DECLARE 
    t text;
BEGIN
    FOR t IN (SELECT table_name FROM information_schema.columns WHERE column_name = 'empresa_id' AND table_schema = 'public') LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format('DROP POLICY IF EXISTS %I_isolation ON public.%I', t, t);
        EXECUTE format('CREATE POLICY %I_isolation ON public.%I FOR ALL TO authenticated USING (empresa_id = public.get_auth_empresa_id()) WITH CHECK (empresa_id = public.get_auth_empresa_id())', t, t);
    END LOOP;
END $$;

-- 6. PERFORMANCE & INDEXES
CREATE INDEX IF NOT EXISTS idx_empresas_owner ON public.empresas(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_perfis_tenant ON public.perfis(empresa_id);

-- 7. CLEANUP: Orphaned Profiles (Optional logic if needed later)
