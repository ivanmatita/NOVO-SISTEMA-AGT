-- ===================================================
-- EMERGENCY REPAIR: ORPHANED ACCOUNTS & RLS FIX
-- Use this if users can log in but see no data or get "Orphaned Account"
-- ===================================================

-- 1. Ensure get_auth_empresa_id is robust
CREATE OR REPLACE FUNCTION public.get_auth_empresa_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_empresa_id uuid;
BEGIN
    -- Check profile first
    SELECT empresa_id INTO v_empresa_id FROM public.perfis WHERE id = auth.uid();
    
    -- Fallback: If no profile, check if user OWNS a company
    IF v_empresa_id IS NULL THEN
        SELECT id INTO v_empresa_id FROM public.empresas WHERE auth_user_id = auth.uid() LIMIT 1;
    END IF;
    
    RETURN v_empresa_id;
END;
$$;

-- 2. REPAIR PROFILES: Create missing profiles for owners
INSERT INTO public.perfis (id, empresa_id, email, nome, role, status)
SELECT 
    e.auth_user_id, 
    e.id, 
    COALESCE(e.email, u.email), 
    COALESCE(e.nome, e.nome_empresa, 'Admin'), 
    'admin', 
    'Ativo'
FROM public.empresas e
JOIN auth.users u ON e.auth_user_id = u.id
LEFT JOIN public.perfis p ON u.id = p.id
WHERE p.id IS NULL AND e.auth_user_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- 3. REPAIR DATA: Link orpaned clientes/locais to the user's company
-- (Only if they were uploaded without an empresa_id or with a dummy one)
-- Replace 'DUMMY_ID' with any placeholder id you might have used.

-- 4. UPDATE POLICIES: Ensure everyone can see their own company
DROP POLICY IF EXISTS "empresas_isolation" ON public.empresas;
CREATE POLICY "empresas_isolation" ON public.empresas
    FOR ALL TO authenticated
    USING (id = public.get_auth_empresa_id() OR auth_user_id = auth.uid());

-- 5. RECOMMENDATION: Increase Rate Limits
-- Go to Supabase Dashboard -> Settings -> Authentication -> Rate Limits
-- Set "Max Sign-In/Sign-Up attempts per 5 minutes" to 100 or 500 for development.
