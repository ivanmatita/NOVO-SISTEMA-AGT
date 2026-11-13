-- ==========================================
-- CONNECT ACCOUNTING MODULE TO SUPABASE
-- ==========================================

-- 1. FORNECEDORES (Suppliers)
CREATE TABLE IF NOT EXISTS public.fornecedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    sigla_banco TEXT,
    iban TEXT,
    tipo_fornecedor TEXT DEFAULT 'normal',
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id, nome)
);

-- 2. COMPRAS (Purchases)
CREATE TABLE IF NOT EXISTS public.compras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL,
    data DATE DEFAULT CURRENT_DATE,
    data_vencimento DATE,
    tipo_documento TEXT NOT NULL, -- 'Fatura de Compra', 'Pagamento', etc.
    numero_documento TEXT,
    numero_compra TEXT, -- Sequential number like CMP-2026/001
    work_site_id UUID REFERENCES public.work_sites(id) ON DELETE SET NULL,
    work_site_nome TEXT, -- Cached name
    retencao_iva NUMERIC DEFAULT 0,
    cambio NUMERIC DEFAULT 1,
    moeda TEXT DEFAULT 'Kwanza',
    valor_contravalor NUMERIC DEFAULT 0,
    desconto_global NUMERIC DEFAULT 0,
    data_servico DATE,
    caixa_id UUID REFERENCES public.caixas(id) ON DELETE SET NULL,
    metodo_pagamento TEXT,
    serie_id UUID REFERENCES public.fiscal_series(id) ON DELETE SET NULL,
    hash TEXT,
    status TEXT DEFAULT 'completed',
    items JSONB DEFAULT '[]'::jsonb,
    total NUMERIC DEFAULT 0,
    document_url TEXT,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. ENSURE CAIXAS IS UP TO DATE
ALTER TABLE public.caixas ADD COLUMN IF NOT EXISTS responsible TEXT;
ALTER TABLE public.caixas ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'aberto';
ALTER TABLE public.caixas ADD COLUMN IF NOT EXISTS obs TEXT;

-- 4. RLS POLICIES

-- Fornecedores
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enforce company access for fornecedores" ON public.fornecedores;
CREATE POLICY "Enforce company access for fornecedores" ON public.fornecedores
    FOR ALL USING (company_id = auth.uid());

-- Compras
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enforce company access for compras" ON public.compras;
CREATE POLICY "Enforce company access for compras" ON public.compras
    FOR ALL USING (company_id = auth.uid());

-- Ensure Indexes
CREATE INDEX IF NOT EXISTS idx_fornecedores_company ON public.fornecedores(company_id);
CREATE INDEX IF NOT EXISTS idx_compras_company ON public.compras(company_id);
CREATE INDEX IF NOT EXISTS idx_compras_fornecedor ON public.compras(fornecedor_id);

-- Reload Schema
NOTIFY pgrst, 'reload schema';
