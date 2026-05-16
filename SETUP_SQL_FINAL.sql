-- ========================================================
-- SCHEMA SaaS MULTIEMPRESA DEFINITIVO (PRODUÇÃO)
-- Use este SQL no Editor SQL do seu Supabase
-- ========================================================

-- 1. EXTENSÕES NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. LIMPEZA DE LEGADO (Opcional - Use com cuidado)
-- DROP TABLE IF EXISTS public.perfis CASCADE;
-- DROP TABLE IF EXISTS public.empresas CASCADE;

-- 3. TABELA: EMPRESAS
CREATE TABLE IF NOT EXISTS public.empresas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    nome_empresa TEXT NOT NULL,
    nif TEXT,
    email TEXT,
    telefone TEXT,
    endereco TEXT,
    provincia TEXT,
    municipio TEXT,
    pais TEXT DEFAULT 'Angola',
    logo_url TEXT,
    tipo_empresa TEXT,
    nome_administrador TEXT,
    plano TEXT DEFAULT 'trial',
    moeda TEXT DEFAULT 'AOA',
    aceitou_termos BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. TABELA: PERFIS (Usuários vinculados a empresas)
CREATE TABLE IF NOT EXISTS public.perfis (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    nome TEXT,
    email TEXT,
    role TEXT DEFAULT 'admin', -- admin, gerente, operador
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

-- 6. POLÍTICAS PARA EMPRESAS
-- O dono da empresa (auth_user_id) tem acesso total
DROP POLICY IF EXISTS "Dono_Empresa_Acesso_Total" ON public.empresas;
CREATE POLICY "Dono_Empresa_Acesso_Total" ON public.empresas
    FOR ALL TO authenticated
    USING (auth_user_id = auth.uid())
    WITH CHECK (auth_user_id = auth.uid());

-- Membros da empresa podem visualizar os dados da empresa
DROP POLICY IF EXISTS "Membros_Empresa_Visualizacao" ON public.empresas;
CREATE POLICY "Membros_Empresa_Visualizacao" ON public.empresas
    FOR SELECT TO authenticated
    USING (id IN (SELECT empresa_id FROM public.perfis WHERE id = auth.uid()));

-- 7. POLÍTICAS PARA PERFIS
-- Cada usuário pode gerir o seu próprio perfil
DROP POLICY IF EXISTS "Usuario_Gere_Proprio_Perfil" ON public.perfis;
CREATE POLICY "Usuario_Gere_Proprio_Perfil" ON public.perfis
    FOR ALL TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Administradores podem ver todos os perfis da mesma empresa
DROP POLICY IF EXISTS "Admin_Ve_Perfis_Da_Empresa" ON public.perfis;
CREATE POLICY "Admin_Ve_Perfis_Da_Empresa" ON public.perfis
    FOR SELECT TO authenticated
    USING (empresa_id IN (SELECT empresa_id FROM public.perfis WHERE id = auth.uid() AND role = 'admin'));

-- 8. ÍNDICES DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_empresas_auth_user ON public.empresas(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_perfis_empresa ON public.perfis(empresa_id);

-- 9. RECARREGAR CONFIGURAÇÃO DA API
NOTIFY pgrst, 'reload schema';

ANALYZE public.empresas;
ANALYZE public.perfis;
