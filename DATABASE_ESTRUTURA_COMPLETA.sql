-- ==============================================================================
-- 🚀 MASTER DATABASE SETUP FOR FATURAPRONTA V3
-- Execute este script no SQL Editor do Supabase para garantir a estrutura correta.
-- ==============================================================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA DE EMPRESAS (Perfil da Empresa)
CREATE TABLE IF NOT EXISTS public.empresas (
    id UUID PRIMARY KEY, -- Deve corresponder ao auth.uid() do administrador
    nome_empresa TEXT NOT NULL,
    nif TEXT,
    email TEXT,
    telefone TEXT,
    endereco TEXT,
    provincia TEXT,
    municipio TEXT,
    pais TEXT DEFAULT 'Angola',
    logo_url TEXT,
    matricula TEXT,
    alvara TEXT,
    localizacao TEXT,
    codigo_postal TEXT,
    inss TEXT,
    contacto TEXT,
    responsavel TEXT,
    regime TEXT,
    tipo_empresa TEXT,
    coordenadas_bancarias TEXT,
    logo_size NUMERIC DEFAULT 100,
    watermark_url TEXT,
    watermark_size NUMERIC DEFAULT 100,
    footer_image_url TEXT,
    footer_size NUMERIC DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. TABELA DE CLIENTES
CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    nome TEXT NOT NULL,
    contribuinte TEXT,
    morada TEXT,
    localidade TEXT,
    codigo_postal TEXT,
    provincia TEXT,
    municipio TEXT,
    pais TEXT DEFAULT 'Angola',
    telefone TEXT,
    email TEXT,
    estado_nif TEXT DEFAULT 'ativo',
    webpage TEXT,
    tipo_cliente TEXT DEFAULT 'normal',
    saldo_inicial NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. TABELA DE FORNECEDORES
CREATE TABLE IF NOT EXISTS public.fornecedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    nif TEXT,
    nome TEXT NOT NULL,
    email TEXT,
    telefone TEXT,
    pais TEXT DEFAULT 'Angola',
    provincia TEXT,
    municipio TEXT,
    localidade TEXT,
    morada TEXT,
    codigo_postal TEXT,
    sigla_banco TEXT,
    iban TEXT,
    tipo_fornecedor TEXT DEFAULT 'Normal',
    webpage TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_fornecedores_company_id ON public.fornecedores(company_id);
CREATE INDEX IF NOT EXISTS idx_fornecedores_nome ON public.fornecedores(nome);

-- 4. TABELA DE CAIXAS (Bancos e Caixas Físicos)
DROP TABLE IF EXISTS public.caixas CASCADE;
CREATE TABLE public.caixas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    nome_caixa TEXT NOT NULL,
    account TEXT,
    valor_inicial NUMERIC(15,2) DEFAULT 0,
    current_balance NUMERIC(15,2) DEFAULT 0,
    responsavel TEXT,
    utilizador_id UUID,
    status TEXT DEFAULT 'aberto',
    observacao TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_caixas_company_id ON public.caixas(company_id);
CREATE INDEX IF NOT EXISTS idx_caixas_nome ON public.caixas(nome_caixa);

-- 5. MOVIMENTAÇÕES DE CAIXA
DROP TABLE IF EXISTS public.caixa_movimentacoes CASCADE;
CREATE TABLE public.caixa_movimentacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    caixa_id UUID REFERENCES public.caixas(id) ON DELETE CASCADE,
    target_caixa_id UUID REFERENCES public.caixas(id) ON DELETE SET NULL,
    type TEXT NOT NULL, -- 'entrada', 'saida', 'transferencia'
    amount NUMERIC NOT NULL,
    moeda TEXT DEFAULT 'Kwanza',
    description TEXT,
    date TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. DOCUMENTOS EMITIDOS (Vendas/Faturamento)
CREATE TABLE IF NOT EXISTS public.documentos_emitidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    tipo_documento TEXT NOT NULL,
    numero_documento TEXT NOT NULL,
    cliente_nome TEXT,
    cliente_email TEXT,
    total NUMERIC DEFAULT 0,
    imposto NUMERIC DEFAULT 0,
    estado TEXT DEFAULT 'ativo',
    data_emissao TIMESTAMPTZ DEFAULT now(),
    detalhes JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. COMPRAS
CREATE TABLE IF NOT EXISTS public.compras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    supplier_id UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL,
    data DATE DEFAULT CURRENT_DATE,
    data_vencimento DATE,
    document_type TEXT NOT NULL,
    numero_compra TEXT,
    invoice_number TEXT,
    work_site_id UUID,
    supplier_name TEXT,
    country_code TEXT DEFAULT 'Angola',
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

-- 8. LOCAIS DE TRABALHO
CREATE TABLE IF NOT EXISTS public.locais_trabalho (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  endereco TEXT,
  cidade TEXT,
  telefone TEXT,
  email TEXT,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. TABELA DE IMPOSTOS
CREATE TABLE IF NOT EXISTS public.tabela_impostos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    taxa NUMERIC NOT NULL,
    descricao TEXT,
    codigo_imposto TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. SÉRIES FISCAIS
CREATE TABLE IF NOT EXISTS public.series_fiscais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    serie TEXT NOT NULL,
    descricao TEXT,
    tipo TEXT,
    proximo_numero INT DEFAULT 1,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. SECRETARIA DIGITAL (Documentos e Ficheiros)
CREATE TABLE IF NOT EXISTS public.secretaria_digital (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    tipo TEXT,
    filename TEXT,
    url TEXT,
    size NUMERIC,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- 🔐 CONFIGURAÇÃO DE SEGURANÇA (RLS)
-- ==========================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caixas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caixa_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_emitidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locais_trabalho ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tabela_impostos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.series_fiscais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secretaria_digital ENABLE ROW LEVEL SECURITY;

-- Criar políticas de acesso baseadas no auth.uid()
DROP POLICY IF EXISTS "access_empresas" ON public.empresas;
CREATE POLICY "access_empresas" ON public.empresas FOR ALL USING (id = auth.uid());

DROP POLICY IF EXISTS "access_clientes" ON public.clientes;
CREATE POLICY "access_clientes" ON public.clientes FOR ALL USING (company_id = auth.uid());

DROP POLICY IF EXISTS "company_isolation_fornecedores" ON public.fornecedores;
DROP POLICY IF EXISTS "access_fornecedores" ON public.fornecedores;
CREATE POLICY "company_isolation_fornecedores" ON public.fornecedores FOR ALL USING (auth.uid() = company_id) WITH CHECK (auth.uid() = company_id);

DROP POLICY IF EXISTS "company_isolation_caixas" ON public.caixas;
CREATE POLICY "company_isolation_caixas" ON public.caixas FOR ALL USING (auth.uid() = company_id) WITH CHECK (auth.uid() = company_id);

DROP POLICY IF EXISTS "company_isolation_movements" ON public.caixa_movimentacoes;
CREATE POLICY "company_isolation_movements" ON public.caixa_movimentacoes FOR ALL USING (auth.uid() = company_id) WITH CHECK (auth.uid() = company_id);

DROP POLICY IF EXISTS "company_isolation_compras" ON public.compras;
CREATE POLICY "company_isolation_compras" ON public.compras FOR ALL USING (auth.uid() = company_id) WITH CHECK (auth.uid() = company_id);

DROP POLICY IF EXISTS "access_locais" ON public.locais_trabalho;
CREATE POLICY "access_locais" ON public.locais_trabalho FOR ALL USING (company_id = auth.uid());

DROP POLICY IF EXISTS "access_impostos" ON public.tabela_impostos;
CREATE POLICY "access_impostos" ON public.tabela_impostos FOR ALL USING (company_id = auth.uid());

DROP POLICY IF EXISTS "access_series" ON public.series_fiscais;
CREATE POLICY "access_series" ON public.series_fiscais FOR ALL USING (company_id = auth.uid());

DROP POLICY IF EXISTS "access_secretaria" ON public.secretaria_digital;
CREATE POLICY "access_secretaria" ON public.secretaria_digital FOR ALL USING (company_id = auth.uid());

-- Atualizar o cache de schema
NOTIFY pgrst, 'reload schema';
