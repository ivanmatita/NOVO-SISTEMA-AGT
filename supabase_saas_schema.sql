-- ==============================================================================
-- COMPLETELY CLEAN MULTI-TENANT SAAS SCHEMA - RUN IN SUPABASE SQL EDITOR
-- ==============================================================================

-- 1. COMPANIES (Tenants / Empresas)
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    nif TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. USERS (Links Supabase Auth to a Company)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    username TEXT,
    email TEXT,
    full_name TEXT,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. ARMAZENS
CREATE TABLE IF NOT EXISTS public.armazens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. PRODUTOS
CREATE TABLE IF NOT EXISTS public.produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price NUMERIC DEFAULT 0,
    cost_price NUMERIC DEFAULT 0,
    stock_quantity NUMERIC DEFAULT 0,
    warehouse_id UUID REFERENCES public.armazens(id) ON DELETE SET NULL,
    category TEXT,
    unit TEXT,
    barcode TEXT,
    referente TEXT,
    image TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. MOVIMENTOS_STOCK
CREATE TABLE IF NOT EXISTS public.movimentos_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
    warehouse_id UUID REFERENCES public.armazens(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- entry, exit, transfer
    quantity NUMERIC NOT NULL,
    unit_price NUMERIC,
    previous_stock NUMERIC,
    current_stock NUMERIC,
    to_warehouse_id UUID REFERENCES public.armazens(id) ON DELETE CASCADE,
    description TEXT,
    reference_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. PROFISSOES
CREATE TABLE IF NOT EXISTS public.profissoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    inss_profession TEXT,
    base_salary NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 7. FUNCIONARIOS
CREATE TABLE IF NOT EXISTS public.funcionarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    profession_id UUID REFERENCES public.profissoes(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role TEXT,
    nif TEXT,
    salary NUMERIC DEFAULT 0,
    bank_account TEXT,
    iban TEXT,
    inss_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 8. CLIENTES
CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    nif TEXT,
    address TEXT,
    localidade TEXT,
    provincia TEXT,
    municipio TEXT,
    pais TEXT,
    telefone TEXT,
    initial_balance NUMERIC DEFAULT 0,
    estado_nif TEXT DEFAULT 'ativo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 9. LOCAIS DE TRABALHO
CREATE TABLE IF NOT EXISTS public.locais_trabalho (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    location TEXT,
    code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 10. SERIES FISCAIS
CREATE TABLE IF NOT EXISTS public.series_fiscais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 11. FATURAS
CREATE TABLE IF NOT EXISTS public.faturas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    series_id UUID REFERENCES public.series_fiscais(id) ON DELETE SET NULL,
    work_site_id UUID REFERENCES public.locais_trabalho(id) ON DELETE SET NULL,
    invoice_number TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    due_date TIMESTAMP WITH TIME ZONE,
    total NUMERIC DEFAULT 0,
    payment_status TEXT DEFAULT 'pending',
    status TEXT DEFAULT 'ativo',
    document_type TEXT,
    hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 12. ITENS FATURA
CREATE TABLE IF NOT EXISTS public.itens_fatura (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.faturas(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
    description TEXT,
    quantity NUMERIC NOT NULL,
    unit_price NUMERIC NOT NULL,
    total NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 13. PAYROLL (Folha de Pagamento)
CREATE TABLE IF NOT EXISTS public.payroll (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.funcionarios(id) ON DELETE SET NULL,
    month TEXT NOT NULL,
    year TEXT NOT NULL,
    base_salary NUMERIC DEFAULT 0,
    subsidy_transport NUMERIC DEFAULT 0,
    subsidy_food NUMERIC DEFAULT 0,
    subsidy_residence NUMERIC DEFAULT 0,
    other_bonus NUMERIC DEFAULT 0,
    irt NUMERIC DEFAULT 0,
    inss NUMERIC DEFAULT 0,
    net_salary NUMERIC DEFAULT 0,
    payment_status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 14. SECURITY OCCURRENCES
CREATE TABLE IF NOT EXISTS public.security_occurrences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    site_id UUID REFERENCES public.locais_trabalho(id) ON DELETE SET NULL,
    guard_id UUID REFERENCES public.funcionarios(id) ON DELETE SET NULL,
    severity TEXT CHECK (severity IN ('Baixa', 'Média', 'Alta', 'Crítica')),
    status TEXT DEFAULT 'aberto', -- aberto, em_investigacao, resolvido, fechado
    date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 15. SECURITY ARMORY
CREATE TABLE IF NOT EXISTS public.security_armory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    serial_number TEXT UNIQUE,
    model TEXT,
    type TEXT, -- arma_fogo, radio, colete, outro
    status TEXT DEFAULT 'disponivel', -- disponivel, em_uso, manutencao, extraviado
    last_inspection TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 16. SECURITY ARMORY LOGS
CREATE TABLE IF NOT EXISTS public.security_armory_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    item_id UUID REFERENCES public.security_armory(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.funcionarios(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- OUT, IN
    condition TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 17. SECURITY ROSTERING
CREATE TABLE IF NOT EXISTS public.security_rostering (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    site_id UUID REFERENCES public.locais_trabalho(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.funcionarios(id) ON DELETE CASCADE,
    shift_start TIMESTAMP WITH TIME ZONE,
    shift_end TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'scheduled',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ==============================================================================
-- ADD FOREIGN KEY RELATIONSHIP THAT WAS REPORTED MISSING (TRANSACTIONS / CAIXAS)
-- IF THEY EXIST. WE CREATE THEM TO BE SURE.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    type TEXT,
    category TEXT,
    amount NUMERIC,
    description TEXT,
    reference_id UUID,
    payment_method TEXT,
    reference TEXT,
    observation TEXT,
    date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);


-- ==============================================================================
-- REUSABLE DATABASE FUNCTION FOR RLS (GET CURRENT TENANT)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_auth_company_id()
RETURNS UUID AS $$
DECLARE
    tenant_id UUID;
BEGIN
    SELECT company_id INTO tenant_id
    FROM public.users
    WHERE id = auth.uid();
    RETURN tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==============================================================================
-- ENABLE ROW LEVEL SECURITY (RLS) FOR ALL TABLES
-- ==============================================================================
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN
        SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    END LOOP;
END $$;


-- ==============================================================================
-- APPLY IDEMPOTENT RLS POLICIES FOR SECURE SAAS ISOLATION
-- ==============================================================================
DO $$
DECLARE
    t text;
BEGIN
    -- Tables that strictly isolate using column: company_id
    FOR t IN
        SELECT unnest(ARRAY[
            'armazens', 'produtos', 'movimentos_stock', 'profissoes',
            'funcionarios', 'clientes', 'locais_trabalho',
            'series_fiscais', 'faturas', 'transactions', 'payroll',
            'security_occurrences', 'security_armory', 'security_armory_logs', 'security_rostering'
        ])
    LOOP
        -- Safely drop existing policies to assure idempotence
        EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation" ON public.%I;', t);
        
        -- Create isolated policies
        EXECUTE format('CREATE POLICY "Tenant Isolation" ON public.%I 
                 FOR ALL USING (company_id = public.get_auth_company_id());', t);
    END LOOP;
    
    -- ITEM FATURA ISOLATION (Inherits company_id via faturas)
    EXECUTE 'DROP POLICY IF EXISTS "Tenant Isolation Items" ON public.itens_fatura;';
    EXECUTE 'CREATE POLICY "Tenant Isolation Items" ON public.itens_fatura
             FOR ALL
             USING (invoice_id IN (SELECT id FROM public.faturas WHERE company_id = public.get_auth_company_id()));';
             
    -- USERS (See own company context only)
    EXECUTE 'DROP POLICY IF EXISTS "Users Isolation" ON public.users;';
    EXECUTE 'CREATE POLICY "Users Isolation" ON public.users
             FOR ALL
             USING (company_id = public.get_auth_company_id());';

    -- COMPANIES (Only valid authenticated users get company data)
    EXECUTE 'DROP POLICY IF EXISTS "Companies Isolation" ON public.companies;';
    EXECUTE 'CREATE POLICY "Companies Isolation" ON public.companies
             FOR SELECT
             USING (id = public.get_auth_company_id());';

END $$;

-- ==============================================================================
-- TRIGGER SUPABASE POSTGREST SCHEMA CACHE RELOAD
-- ==============================================================================
NOTIFY pgrst, 'reload schema';
