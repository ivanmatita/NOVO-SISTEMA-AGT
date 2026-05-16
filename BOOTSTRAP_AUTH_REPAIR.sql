-- Definitive Fix for Company Creation and Profile Linking
-- Run this in the Supabase SQL Editor

-- 1. Ensure empresas is accessible for the creator
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_user_to_insert_own_company" ON public.empresas;
CREATE POLICY "allow_user_to_insert_own_company" 
ON public.empresas FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "allow_user_to_view_own_company" ON public.empresas;
CREATE POLICY "allow_user_to_view_own_company" 
ON public.empresas FOR SELECT 
TO authenticated 
USING (auth.uid() = auth_user_id OR id = public.get_auth_empresa_id());

DROP POLICY IF EXISTS "allow_user_to_update_own_company" ON public.empresas;
CREATE POLICY "allow_user_to_update_own_company" 
ON public.empresas FOR UPDATE 
TO authenticated 
USING (auth.uid() = auth_user_id OR id = public.get_auth_empresa_id());

-- 2. Ensure perfis allows users to manage their own record
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_user_to_manage_own_profile" ON public.perfis;
CREATE POLICY "allow_user_to_manage_own_profile" 
ON public.perfis FOR ALL 
TO authenticated 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

-- 3. Fix potential "null" empresa_id during bootstrap for clientes
-- The function get_auth_empresa_id is already created, but we make it more robust
CREATE OR REPLACE FUNCTION public.get_auth_empresa_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id uuid;
BEGIN
    -- 1. Try profile
    SELECT empresa_id INTO v_id FROM public.perfis WHERE id = auth.uid();
    IF v_id IS NOT NULL THEN RETURN v_id; END IF;

    -- 2. Try company ownership fallback
    SELECT id INTO v_id FROM public.empresas WHERE auth_user_id = auth.uid() LIMIT 1;
    RETURN v_id;
END;
$$;
