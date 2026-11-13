-- DEFINITIVE SAAS MULTI-TENANT ARCHITECTURE
-- Run this in the Supabase SQL Editor to wipe and reset with professional policies

-- 1. UTILITY: get_auth_empresa_id (The Security Heart)
-- This function is SECURITY DEFINER to bypass RLS during the lookup itself
CREATE OR REPLACE FUNCTION public.get_auth_empresa_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_empresa_id uuid;
BEGIN
    -- 1. Check Profile (Primary Source)
    SELECT empresa_id INTO v_empresa_id
    FROM public.perfis
    WHERE id = auth.uid();
    
    -- 2. Fallback: Check if user is the direct owner of a company (Legacy/Bootstrap)
    IF v_empresa_id IS NULL THEN
        SELECT id INTO v_empresa_id
        FROM public.empresas
        WHERE auth_user_id = auth.uid()
        LIMIT 1;
    END IF;
    
    RETURN v_empresa_id;
END;
$$;

-- 2. TABLES HARDENING
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id);

-- 3. RLS POLICIES: EMPRESAS
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SaaS_Empresa_Access" ON public.empresas;
CREATE POLICY "SaaS_Empresa_Access" ON public.empresas
FOR ALL TO authenticated
USING (auth_user_id = auth.uid() OR id = public.get_auth_empresa_id())
WITH CHECK (auth_user_id = auth.uid());

-- 4. RLS POLICIES: PERFIS
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SaaS_Perfil_Access" ON public.perfis;
CREATE POLICY "SaaS_Perfil_Access" ON public.perfis
FOR ALL TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 5. RLS POLICIES: CLIENTES (Hard Isolation)
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SaaS_Clientes_Isolation" ON public.clientes;
CREATE POLICY "SaaS_Clientes_Isolation" ON public.clientes
FOR ALL TO authenticated
USING (empresa_id = public.get_auth_empresa_id())
WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- 6. RLS POLICIES: LOCAIS_TRABALHO (Hard Isolation)
ALTER TABLE public.locais_trabalho ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SaaS_Locais_Isolation" ON public.locais_trabalho;
CREATE POLICY "SaaS_Locais_Isolation" ON public.locais_trabalho
FOR ALL TO authenticated
USING (empresa_id = public.get_auth_empresa_id())
WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- 7. TRIGGER: Auto-Fill empresa_id on Insert
CREATE OR REPLACE FUNCTION public.force_empresa_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.empresa_id IS NULL THEN
    NEW.empresa_id := public.get_auth_empresa_id();
  END IF;
  
  -- Safety check: User MUST have a company to insert data
  IF NEW.empresa_id IS NULL THEN
    RAISE EXCEPTION 'Acesso Negado: O utilizador não possui uma empresa associada.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_force_empresa_clientes ON public.clientes;
CREATE TRIGGER tr_force_empresa_clientes
BEFORE INSERT ON public.clientes
FOR EACH ROW EXECUTE FUNCTION public.force_empresa_id();

DROP TRIGGER IF EXISTS tr_force_empresa_locais ON public.locais_trabalho;
CREATE TRIGGER tr_force_empresa_locais
BEFORE INSERT ON public.locais_trabalho
FOR EACH ROW EXECUTE FUNCTION public.force_empresa_id();
