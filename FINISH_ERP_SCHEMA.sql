-- ==========================================
-- FINAL UNIFIED ERP SCHEMA 
-- ==========================================

-- 1. EMPRESAS (Using 'empresas' as expected by code)
CREATE TABLE IF NOT EXISTS public.empresas (
    id UUID PRIMARY KEY, -- Will match auth.uid()
    name TEXT NOT NULL,
    nif TEXT,
    address TEXT,
    responsavel TEXT,
    email TEXT,
    telefone TEXT,
    regime TEXT,
    tipo_empresa TEXT,
    coordenadas_bancarias TEXT,
    logo_url TEXT,
    logo_size INTEGER DEFAULT 100,
    watermark_url TEXT,
    watermark_size INTEGER DEFAULT 100,
    footer_image_url TEXT,
    footer_size INTEGER DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. FORNECEDORES
CREATE TABLE IF NOT EXISTS public.fornecedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    nif TEXT,
    email TEXT,
    telefone TEXT,
    morada TEXT,
    localidade TEXT,
    codigo_postal TEXT,
    provincia TEXT,
    municipio TEXT,
    pais TEXT DEFAULT 'Angola',
    webpage TEXT,
    sigla_banco TEXT, -- Standardized name
    iban TEXT,
    tipo_fornecedor TEXT DEFAULT 'normal', -- Standardized name
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id, nome)
);

-- 3. CAIXAS
CREATE TABLE IF NOT EXISTS public.caixas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    bank_name TEXT,
    account TEXT,
    responsible TEXT,
    initial_balance NUMERIC DEFAULT 0,
    current_balance NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'aberto',
    obs TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. CAIXA MOVEMENTS
CREATE TABLE IF NOT EXISTS public.caixa_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    caixa_id UUID REFERENCES public.caixas(id) ON DELETE CASCADE,
    target_caixa_id UUID REFERENCES public.caixas(id) ON DELETE SET NULL,
    type TEXT NOT NULL, -- 'entrada', 'saida', 'transferencia', 'abertura', 'fechamento'
    amount NUMERIC NOT NULL,
    moeda TEXT DEFAULT 'Kwanza',
    description TEXT,
    date TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. COMPRAS
CREATE TABLE IF NOT EXISTS public.compras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    supplier_id UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL,
    data DATE DEFAULT CURRENT_DATE,
    data_vencimento DATE,
    document_type TEXT NOT NULL,
    numero_compra TEXT,
    invoice_number TEXT,
    work_site_id UUID,
    supplier_name TEXT,
    vat_withholding NUMERIC DEFAULT 0,
    exchange_rate NUMERIC DEFAULT 1,
    currency TEXT DEFAULT 'Kwanza',
    counter_value NUMERIC DEFAULT 0,
    global_discount NUMERIC DEFAULT 0,
    service_date DATE,
    caixa_id UUID REFERENCES public.caixas(id) ON DELETE SET NULL,
    payment_method TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    total NUMERIC DEFAULT 0,
    hash TEXT,
    status TEXT DEFAULT 'completed',
    document_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- RLS POLICIES
-- ==========================================

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "emp_access" ON public.empresas;
CREATE POLICY "emp_access" ON public.empresas FOR ALL USING (id = auth.uid());

ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sup_access" ON public.fornecedores;
CREATE POLICY "sup_access" ON public.fornecedores FOR ALL USING (company_id = auth.uid());

ALTER TABLE public.caixas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cax_access" ON public.caixas;
CREATE POLICY "cax_access" ON public.caixas FOR ALL USING (company_id = auth.uid());

ALTER TABLE public.caixa_movements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mov_access" ON public.caixa_movements;
CREATE POLICY "mov_access" ON public.caixa_movements FOR ALL USING (company_id = auth.uid());

ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "buy_access" ON public.compras;
CREATE POLICY "buy_access" ON public.compras FOR ALL USING (company_id = auth.uid());

-- RELOAD SCHEMA
NOTIFY pgrst, 'reload schema';
