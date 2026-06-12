-- ==============================================================================
-- IMATEC ERP - COMPLETE MULTI-TENANT SYSTEM SETUP (BLINDADO)
-- INSTRUCÕES: Execute este SQL no editor de SQL do seu painel Supabase.
-- ==============================================================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELA DE EMPRESAS (empresas)
-- Esta tabela armazena os dados mestre de cada empresa no sistema SaaS.
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
    footer_image_url TEXT,
    tipo_empresa TEXT, -- Ex: Prestação de Serviços, Comercial, etc.
    nome_administrador TEXT,
    email_admin TEXT,
    pacote_licenca TEXT,
    valor_licenca TEXT,
    auth_user_id UUID REFERENCES auth.users(id),
    plano TEXT DEFAULT 'trial', -- Ex: Mensal, Trimestral, Anual
    plano_status TEXT DEFAULT 'trial', -- trial, ativo, expirado
    plano_expira_em TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '14 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. TABELA DE PERFIS (perfis)
-- Liga o utilizador (auth.users) a uma empresa específica (empresas).
CREATE TABLE IF NOT EXISTS public.perfis (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    nome TEXT,
    role TEXT DEFAULT 'admin', -- admin, operador, financeiro, rh
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. FUNÇÃO AUXILIAR PARA RLS (get_auth_empresa_id)
-- Obtém o empresa_id do utilizador autenticado para isolamento automático.
CREATE OR REPLACE FUNCTION public.get_auth_empresa_id()
RETURNS UUID AS $$
DECLARE
    tenant_id UUID;
BEGIN
    -- Busca o empresa_id na tabela de perfis usando o UID da sessão atual
    SELECT empresa_id INTO tenant_id
    FROM public.perfis
    WHERE id = auth.uid();
    RETURN tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. ATIVAR RLS (Row Level Security) NAS TABELAS CRÍTICAS
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

-- 6. POLÍTICAS DE SEGURANÇA (POLICIES)
-- Estas políticas garantem que NENHUMA empresa veja dados de outra.

-- Políticas para EMPRESAS
DROP POLICY IF EXISTS "Empresas Isolation" ON public.empresas;
CREATE POLICY "Empresas Isolation" ON public.empresas
    FOR SELECT 
    USING (id = public.get_auth_empresa_id());

DROP POLICY IF EXISTS "Empresas Update Isolation" ON public.empresas;
CREATE POLICY "Empresas Update Isolation" ON public.empresas
    FOR UPDATE
    USING (id = public.get_auth_empresa_id())
    WITH CHECK (id = public.get_auth_empresa_id());

-- Políticas para PERFIS
DROP POLICY IF EXISTS "Perfis Isolation" ON public.perfis;
CREATE POLICY "Perfis Isolation" ON public.perfis
    FOR ALL
    USING (empresa_id = public.get_auth_empresa_id());

-- 7. ISOLAMENTO AUTOMÁTICO EM TODAS AS OUTRAS TABELAS
-- Este script percorre as tabelas existentes e aplica o isolamento por empresa_id ou company_id.
DO $$
DECLARE
    t text;
    core_tables text[] := ARRAY[
        'clientes', 'produtos', 'armazens', 'funcionarios', 'profissoes', 
        'locais_trabalho', 'series_fiscais', 'faturas', 'itens_fatura', 
        'documentos_emitidos', 'caixas', 'caixa_movimentacoes', 'purchases', 
        'payroll', 'security_occurrences', 'security_armory', 'security_rostering'
    ];
BEGIN
    FOR t IN SELECT unnest(core_tables) LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
            -- Ativa RLS
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
            
            -- Cria Política de Isolamento Multiempresa
            EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation" ON public.%I;', t);
            
            -- Tenta detetar se a coluna é company_id ou empresa_id
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'company_id') THEN
                EXECUTE format('CREATE POLICY "Tenant Isolation" ON public.%I FOR ALL USING (company_id = public.get_auth_empresa_id());', t);
            ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'empresa_id') THEN
                EXECUTE format('CREATE POLICY "Tenant Isolation" ON public.%I FOR ALL USING (empresa_id = public.get_auth_empresa_id());', t);
            END IF;
        END IF;
    END LOOP;
END $$;

-- 8. PERMISSÕES INICIAIS (Para o Registo de novas empresas)
-- Permite que utilizadores autenticados criem a sua primeira empresa e perfil.
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

-- 9. TRIGGERS DE UPDATED_AT
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a tabelas principais
CREATE TRIGGER tr_perfis_updated_at BEFORE UPDATE ON public.perfis FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER tr_empresas_updated_at BEFORE UPDATE ON public.empresas FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 10. RECARREGAR SCHEMA (PostgREST)
NOTIFY pgrst, 'reload schema';

-- FINISHED.
