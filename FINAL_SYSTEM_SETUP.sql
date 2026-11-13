-- ==============================================================================
-- IMATEC ERP - COMPLETE MULTI-TENANT SYSTEM SETUP (BLINDADO)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. UNIFIED COMPANIES TABLE (empresas)
CREATE TABLE IF NOT EXISTS public.empresas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_empresa TEXT NOT NULL,
    nif TEXT UNIQUE,
    email TEXT,
    telefone TEXT,
    endereco TEXT,
    provincia TEXT,
    municipio TEXT,
    pais TEXT DEFAULT 'Angola',
    logo_url TEXT,
    tipo_empresa TEXT, -- Prestação de Serviços, Comercial, etc.
    plano TEXT, -- Mensal, Trimestral, Anual
    plano_status TEXT DEFAULT 'trial', -- trial, ativo, expirado
    plano_expira_em TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. UNIFIED USERS TABLE (perfis) - Links Supabase Auth to a Company
CREATE TABLE IF NOT EXISTS public.perfis (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    nome TEXT,
    role TEXT DEFAULT 'user', -- admin, operador
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. RLS HELPER FUNCTION
CREATE OR REPLACE FUNCTION public.get_auth_empresa_id()
RETURNS UUID AS $$
DECLARE
    tenant_id UUID;
BEGIN
    SELECT empresa_id INTO tenant_id
    FROM public.perfis
    WHERE id = auth.uid();
    RETURN tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. ENABLE RLS ON CORE TABLES
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

-- 6. POLICIES FOR CORE TABLES
DROP POLICY IF EXISTS "Empresas Isolation" ON public.empresas;
CREATE POLICY "Empresas Isolation" ON public.empresas
    FOR SELECT 
    USING (id = public.get_auth_empresa_id());

CREATE POLICY "Empresas Update Isolation" ON public.empresas
    FOR UPDATE
    USING (id = public.get_auth_empresa_id())
    WITH CHECK (id = public.get_auth_empresa_id());

DROP POLICY IF EXISTS "Perfis Isolation" ON public.perfis;
CREATE POLICY "Perfis Isolation" ON public.perfis
    FOR ALL
    USING (empresa_id = public.get_auth_empresa_id());

-- 7. ENSURE ALL OTHER TABLES USE RLS AND ISOLATION
DO $$
DECLARE
    t text;
    core_tables text[] := ARRAY[
        'clientes', 'produtos', 'armazens', 'funcionarios', 'profissoes', 
        'locais_trabalho', 'series_fiscais', 'faturas', 'itens_fatura', 
        'transactions', 'payroll', 'security_occurrences', 'security_armory',
        'security_rostering', 'caixas', 'caixa_movements', 'purchases', 
        'purchase_items', 'system_users'
    ];
BEGIN
    -- For items_fatura and purchase_items, isolation is usually via parent reference, 
    -- but let's ensure we have empresa_id everywhere for direct isolation if needed.
    
    FOR t IN SELECT unnest(core_tables) LOOP
        -- Enable RLS
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
        
        -- Default Deny (Optional but safer)
        -- EXECUTE format('DROP POLICY IF EXISTS "Default Deny" ON public.%I;', t);
        -- EXECUTE format('CREATE POLICY "Default Deny" ON public.%I FOR ALL USING (false);', t);

        -- Tenant Isolation Policy
        EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation" ON public.%I;', t);
        EXECUTE format('CREATE POLICY "Tenant Isolation" ON public.%I 
                 FOR ALL USING (empresa_id = public.get_auth_empresa_id());', t);
                 
        -- Add empresa_id back-compatibility ensure
        -- This part depends on if columns exist. Supabase usually has them.
    END LOOP;
END $$;

-- 8. TRIGGER FOR UPDATED_AT
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_perfis_updated_at ON public.perfis;
CREATE TRIGGER tr_perfis_updated_at BEFORE UPDATE ON public.perfis FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS tr_empresas_updated_at ON public.empresas;
CREATE TRIGGER tr_empresas_updated_at BEFORE UPDATE ON public.empresas FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 9. ALLOW INITIAL INSERT FOR COMPANIES (During Registration)
-- Since the user isn't authenticated with a company_id yet during signUp,
-- we need to handle the first insert.
-- Usually, we allow insertions if authenticated (auth.uid() is not null).

DROP POLICY IF EXISTS "Allow Registration Insert" ON public.empresas;
CREATE POLICY "Allow Registration Insert" ON public.empresas
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow Initial Profile Insert" ON public.perfis;
CREATE POLICY "Allow Initial Profile Insert" ON public.perfis
    FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());

-- 10. REFRESH SCHEMA
NOTIFY pgrst, 'reload schema';
