-- ==========================================
-- SAAS MULTI-TENANT DEFINITIVE PRODUCTION SETUP
-- ==========================================

-- 1. EXTENSIONS & SCHEMA
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. GET_AUTH_EMPRESA_ID (The Heart of Multi-tenancy)
-- This function identifies which company the logged-in user belongs to.
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
    
    -- Fallback: If no profile record found, check if this user directly owns an enterprise
    IF v_empresa_id IS NULL THEN
        SELECT id INTO v_empresa_id FROM public.empresas WHERE auth_user_id = auth.uid() LIMIT 1;
    END IF;
    
    RETURN v_empresa_id;
END;
$$;

-- 3. TABLES (Ensuring structure)

-- [MIGRATION HELPER] Ensure columns exist in case tables were created partially
DO $$ 
BEGIN
    -- For EMPRESAS
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='empresas' AND column_name='auth_user_id') THEN
        ALTER TABLE public.empresas ADD COLUMN auth_user_id uuid REFERENCES auth.users(id);
    END IF;
    -- For PERFIS
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='perfis' AND column_name='empresa_id') THEN
        ALTER TABLE public.perfis ADD COLUMN empresa_id uuid REFERENCES public.empresas(id);
    END IF;
END $$;

-- EMPRESAS
CREATE TABLE IF NOT EXISTS public.empresas (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    auth_user_id uuid REFERENCES auth.users(id),
    nome text NOT NULL,
    nome_empresa text,
    nif text UNIQUE,
    email text,
    telefone text,
    endereco text,
    provincia text,
    municipio text,
    pais text DEFAULT 'Angola',
    tipo_empresa text,
    nome_administrador text,
    pacote_licenca text,
    plano text DEFAULT 'trial',
    plano_status text DEFAULT 'trial',
    created_at timestamptz DEFAULT now()
);

-- PERFIS (Plural used in app code)
CREATE TABLE IF NOT EXISTS public.perfis (
    id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    empresa_id uuid REFERENCES public.empresas(id),
    email text,
    nome text,
    role text DEFAULT 'admin',
    status text DEFAULT 'Ativo',
    created_at timestamptz DEFAULT now()
);

-- 4. RLS POLICIES (Professional Isolation)

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locais_trabalho ENABLE ROW LEVEL SECURITY;

-- EMPRESAS: User can see the company they own OR are linked to
DROP POLICY IF EXISTS "empresas_isolation" ON public.empresas;
CREATE POLICY "empresas_isolation" ON public.empresas
    FOR ALL TO authenticated
    USING (id = public.get_auth_empresa_id() OR auth_user_id = auth.uid());

-- PERFIS: User can only see/edit their own profile
DROP POLICY IF EXISTS "perfis_isolation" ON public.perfis;
CREATE POLICY "perfis_isolation" ON public.perfis
    FOR ALL TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- CLIENTES: Strict Tenant Isolation
DROP POLICY IF EXISTS "clientes_isolation" ON public.clientes;
CREATE POLICY "clientes_isolation" ON public.clientes
    FOR ALL TO authenticated
    USING (empresa_id = public.get_auth_empresa_id())
    WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- LOCAIS: Strict Tenant Isolation
DROP POLICY IF EXISTS "locais_isolation" ON public.locais_trabalho;
CREATE POLICY "locais_isolation" ON public.locais_trabalho
    FOR ALL TO authenticated
    USING (empresa_id = public.get_auth_empresa_id())
    WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- 5. AUTO-CONTEXT TRIGGERS (Zero-downtime inserts)
-- These functions automatically fill the empresa_id on insert if missing.

CREATE OR REPLACE FUNCTION public.force_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
  -- If empresa_id is not provided, fetch from profile
  IF NEW.empresa_id IS NULL THEN
    NEW.empresa_id := public.get_auth_empresa_id();
  END IF;
  
  -- Integrity Check
  IF NEW.empresa_id IS NULL THEN
    RAISE EXCEPTION 'Acesso Negado: O utilizador não possui uma empresa associada. Por favor, complete o registo.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply to Clientes
DROP TRIGGER IF EXISTS tr_force_tenant_clientes ON public.clientes;
CREATE TRIGGER tr_force_tenant_clientes
    BEFORE INSERT ON public.clientes
    FOR EACH ROW EXECUTE FUNCTION public.force_tenant_id();

-- Apply to Locais de Trabalho
DROP TRIGGER IF EXISTS tr_force_tenant_locais ON public.locais_trabalho;
CREATE TRIGGER tr_force_tenant_locais
    BEFORE INSERT ON public.locais_trabalho
    FOR EACH ROW EXECUTE FUNCTION public.force_tenant_id();

-- 6. INDEXES for Performance
CREATE INDEX IF NOT EXISTS idx_clientes_empresa ON public.clientes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_locais_empresa ON public.locais_trabalho(empresa_id);
CREATE INDEX IF NOT EXISTS idx_perfis_empresa ON public.perfis(empresa_id);
