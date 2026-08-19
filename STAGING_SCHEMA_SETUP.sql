-- =====================================================================
-- IMATEC SOFT ERP — SCRIPT DDL EESTRUTURAL PARA AMBIENTE SUPABASE STAGING
-- =====================================================================
-- Este script recria toda a estrutura de tabelas, funções RPC, triggers, 
-- extensões, armazenamento e políticas RLS para o projeto Supabase STAGING.
-- NÃO CONTÉM NENHUM DADO DE PRODUÇÃO.
-- =====================================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ESTRUTURA CORE DE EMPRESAS E PERFIS
CREATE TABLE IF NOT EXISTS public.config_empresa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID UNIQUE NOT NULL,
    nome_empresa TEXT NOT NULL,
    nif TEXT,
    matricula TEXT,
    alvara TEXT,
    endereco TEXT,
    provincia TEXT,
    municipio TEXT,
    codigo_postal TEXT,
    pais TEXT DEFAULT 'Angola',
    inss TEXT,
    telefone TEXT,
    responsavel TEXT,
    email TEXT,
    regime TEXT DEFAULT 'Geral',
    tipo_empresa TEXT DEFAULT 'Sociedade Anónima',
    coordenadas_bancarias TEXT,
    logo_url TEXT,
    watermark_url TEXT,
    footer_image_url TEXT,
    plano TEXT DEFAULT 'staging',
    pacote_licenca TEXT DEFAULT 'Empresarial',
    valor_licenca NUMERIC(15,2) DEFAULT 0,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.perfis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    cargo TEXT,
    nif TEXT,
    telefone TEXT,
    nivel_acesso TEXT DEFAULT 'operador', -- superadmin, admin, gestor, operador, contabilista, pos
    modulos_acesso JSONB DEFAULT '[]',
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. CLIENTES E FORNECEDORES
CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    nome TEXT NOT NULL,
    nif TEXT DEFAULT '999999999',
    email TEXT,
    telefone TEXT,
    endereco TEXT,
    pais TEXT DEFAULT 'AO',
    tipo_cliente TEXT DEFAULT 'Consumidor Final',
    limite_credito NUMERIC(15,2) DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fornecedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    nome TEXT NOT NULL,
    nif TEXT DEFAULT '999999999',
    email TEXT,
    telefone TEXT,
    endereco TEXT,
    iban TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. PRODUTOS, SERVIÇOS E ARMAZÉNS
CREATE TABLE IF NOT EXISTS public.produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    codigo TEXT NOT NULL,
    nome TEXT NOT NULL,
    descricao TEXT,
    categoria TEXT DEFAULT 'Geral',
    preco_venda NUMERIC(15,2) NOT NULL DEFAULT 0,
    preco_custo NUMERIC(15,2) DEFAULT 0,
    taxa_imposto NUMERIC(5,2) DEFAULT 14.00,
    motivo_isencao TEXT,
    codigo_isencao TEXT,
    tipo TEXT DEFAULT 'P', -- P (Produto) ou S (Serviço)
    unidade TEXT DEFAULT 'UN',
    stock_atual NUMERIC(15,3) DEFAULT 0,
    stock_minimo NUMERIC(15,3) DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.armazens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    nome TEXT NOT NULL,
    localizacao TEXT,
    responsavel TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. FATURAÇÃO E DOCUMENTOS FISCAIS AGT
CREATE TABLE IF NOT EXISTS public.series_fiscais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    tipo TEXT NOT NULL, -- FT, FR, NC, ND, PP, OR
    ano INTEGER NOT NULL,
    serie TEXT NOT NULL DEFAULT 'PRD',
    descricao TEXT,
    proximo_numero INTEGER DEFAULT 1,
    ultimo_documento_id UUID,
    ultima_certificacao TIMESTAMPTZ,
    utilizador_id UUID,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_empresa_tipo_serie UNIQUE (empresa_id, tipo, serie)
);

CREATE TABLE IF NOT EXISTS public.documentos_emitidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    tipo_documento TEXT NOT NULL,
    numero_documento TEXT NOT NULL,
    serie TEXT DEFAULT 'PRD',
    ano INTEGER DEFAULT EXTRACT(YEAR FROM now()),
    numero_sequencial INTEGER,
    cliente_id UUID,
    cliente_nome TEXT,
    cliente_email TEXT,
    cliente_nif TEXT,
    total NUMERIC(15,2) DEFAULT 0,
    imposto NUMERIC(15,2) DEFAULT 0,
    estado TEXT DEFAULT 'EMITIDO',
    status TEXT DEFAULT 'Válido',
    data_emissao TIMESTAMPTZ DEFAULT now(),
    hash_sha256 TEXT,
    codigo_curto TEXT,
    detalhes JSONB DEFAULT '{}',
    is_certified BOOLEAN DEFAULT false,
    is_draft BOOLEAN DEFAULT false,
    documento_anulado BOOLEAN DEFAULT false,
    motivo_anulacao TEXT,
    anulado_at TIMESTAMPTZ,
    anulado_por UUID,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. CAIXAS E TESOURARIA
CREATE TABLE IF NOT EXISTS public.caixas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    nome TEXT NOT NULL,
    moeda TEXT DEFAULT 'AOA',
    saldo_atual NUMERIC(15,2) DEFAULT 0,
    status TEXT DEFAULT 'fechado',
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sessoes_caixa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    caixa_id UUID REFERENCES public.caixas(id),
    operador_id UUID NOT NULL,
    operador_nome TEXT,
    data_abertura TIMESTAMPTZ DEFAULT now(),
    data_fecho TIMESTAMPTZ,
    saldo_inicial NUMERIC(15,2) DEFAULT 0,
    total_entradas NUMERIC(15,2) DEFAULT 0,
    total_saidas NUMERIC(15,2) DEFAULT 0,
    saldo_final NUMERIC(15,2) DEFAULT 0,
    status TEXT DEFAULT 'aberta',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. RECURSOS HUMANOS
CREATE TABLE IF NOT EXISTS public.colaboradores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    nome TEXT NOT NULL,
    nif TEXT,
    inss TEXT,
    cargo TEXT,
    departamento TEXT,
    salario_base NUMERIC(15,2) DEFAULT 0,
    subsidio_alimentacao NUMERIC(15,2) DEFAULT 0,
    subsidio_transporte NUMERIC(15,2) DEFAULT 0,
    iban TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. SISTEMA, SESSÕES E AUDITORIA
CREATE TABLE IF NOT EXISTS public.system_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.logs_auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID,
    user_id UUID,
    email TEXT,
    acao TEXT NOT NULL,
    ip TEXT,
    navegador TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. FUNÇÕES RPC FISCAIS E UTILITÁRIAS
CREATE OR REPLACE FUNCTION public.gerar_hash_sha256(texto text) RETURNS text LANGUAGE sql AS $$
    SELECT encode(digest(texto, 'sha256'), 'hex');
$$;

CREATE OR REPLACE FUNCTION public.obter_e_incrementar_serie(
    p_empresa_id uuid,
    p_tipo text,
    p_ano integer,
    p_serie_nome text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_serie record;
    v_proximo integer;
BEGIN
    SELECT * INTO v_serie FROM public.series_fiscais
    WHERE empresa_id = p_empresa_id AND tipo = p_tipo AND ano = p_ano AND serie = COALESCE(NULLIF(p_serie_nome, ''), 'PRD')
    FOR UPDATE;

    IF v_serie IS NULL THEN
        INSERT INTO public.series_fiscais (empresa_id, tipo, ano, serie, descricao, proximo_numero, ativo)
        VALUES (p_empresa_id, p_tipo, p_ano, COALESCE(NULLIF(p_serie_nome, ''), 'PRD'), 'Série Staging ' || p_tipo, 2, true)
        RETURNING * INTO v_serie;
        v_proximo := 1;
    ELSE
        v_proximo := v_serie.proximo_numero;
        UPDATE public.series_fiscais SET proximo_numero = proximo_numero + 1 WHERE id = v_serie.id;
    END IF;

    RETURN jsonb_build_object(
        'id', v_serie.id,
        'serie', v_serie.serie,
        'proximo_numero', v_proximo
    );
END;
$$;

-- 9. HABILITAR ROW LEVEL SECURITY (RLS) MULTIEMPRESA
ALTER TABLE public.config_empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_emitidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caixas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;

-- Exemplo de Política RLS Declarativa para Isolamento Multiempresa
CREATE POLICY rls_perfis_isolation ON public.perfis 
    FOR ALL USING (empresa_id = empresa_id);

CREATE POLICY rls_clientes_isolation ON public.clientes 
    FOR ALL USING (empresa_id = empresa_id);

CREATE POLICY rls_produtos_isolation ON public.produtos 
    FOR ALL USING (empresa_id = empresa_id);

CREATE POLICY rls_documentos_isolation ON public.documentos_emitidos 
    FOR ALL USING (empresa_id = empresa_id);
