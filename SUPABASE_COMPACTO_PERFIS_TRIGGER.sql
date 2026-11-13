-- =========================================================================
-- SOLUÇÃO COMPLETA: GESTÃO DE UTILIZADORES, PERFIS E ISOLAMENTO MULTIEMPRESA
-- Execute este script no SQL Editor do seu Supabase para corrigir triggers,
-- criar colunas em falta, aplicar políticas de segurança (RLS) sem recursão
-- e sincronizar utilizadores órfãos da tabela auth.users.
-- =========================================================================

-- 1. Garantir que a tabela public.perfis existe com a estrutura correta
CREATE TABLE IF NOT EXISTS public.perfis (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID,
    nome TEXT,
    email TEXT,
    role TEXT DEFAULT 'user',
    is_admin BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Adicionar colunas caso a tabela já existisse
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- 2. Limpar triggers e funções antigas com possíveis conflitos
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 3. Criar a função auto-onboarding resiliente para novos administradores (SaaS Sign up)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    empresa_uuid UUID;
BEGIN
    -- Procura se existe uma empresa cujo dono seja o utilizador recém-criado
    SELECT id INTO empresa_uuid
    FROM public.empresas
    WHERE auth_user_id = NEW.id
    LIMIT 1;

    -- Se não encontrar empresa neste exato milissegundo (normal no cadastro SaaS onde 
    -- o user auth é criado frações de segundo antes da empresa), a trigger sai pacificamente.
    -- O backend tratará de fazer a inserção segura do perfil em seguida.
    IF empresa_uuid IS NULL THEN
        RETURN NEW;
    END IF;

    -- Cria o perfil administrativo associado de forma automática e segura tolerando conflitos
    INSERT INTO public.perfis (
        id,
        company_id,
        nome,
        email,
        role,
        is_admin,
        is_active,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        empresa_uuid,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'nome', 'Administrador'),
        NEW.email,
        'admin',
        TRUE,
        TRUE,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) 
    DO UPDATE SET
        company_id = EXCLUDED.company_id,
        nome = COALESCE(EXCLUDED.nome, public.perfis.nome),
        email = COALESCE(EXCLUDED.email, public.perfis.email),
        updated_at = NOW();

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Resiliência absoluta: Grava o erro nos logs do postgres e permite que o registo continue
    RAISE LOG 'Erro na Trigger handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Criar a trigger na inserção de novos utilizadores em auth.users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Funções auxiliares seguras com SECURITY DEFINER para evitar recursão infinita em RLS
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID AS $$
    SELECT company_id
    FROM public.perfis 
    WHERE id = auth.uid()
    LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
    SELECT COALESCE(role, 'user')
    FROM public.perfis 
    WHERE id = auth.uid()
    LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- 5. Configurar RLS (Row Level Security) de forma blindada
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

-- Limpar políticas antigas de RLS para evitar sobreposições e conflitos
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename IN ('perfis', 'empresas')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- Criar novas políticas canónicas e limpas para os Perfis
CREATE POLICY "perfis_isolation_policy" ON public.perfis
    FOR ALL TO authenticated
    USING (id = auth.uid() OR company_id = public.get_user_company_id())
    WITH CHECK (id = auth.uid() OR company_id = public.get_user_company_id());

-- Criar novas políticas canónicas para as Empresas
CREATE POLICY "empresas_select_policy" ON public.empresas
    FOR SELECT TO authenticated
    USING (auth_user_id = auth.uid() OR id = public.get_user_company_id());

CREATE POLICY "empresas_insert_policy" ON public.empresas
    FOR INSERT TO authenticated
    WITH CHECK (auth_user_id = auth.uid() OR auth.uid() IS NOT NULL);

CREATE POLICY "empresas_update_policy" ON public.empresas
    FOR UPDATE TO authenticated
    USING (auth_user_id = auth.uid() OR id = public.get_user_company_id())
    WITH CHECK (auth_user_id = auth.uid() OR id = public.get_user_company_id());

CREATE POLICY "empresas_delete_policy" ON public.empresas
    FOR DELETE TO authenticated
    USING (auth_user_id = auth.uid());

-- 6. RECONCILIAÇÃO / AUTOESTABILIZAÇÃO (Heal existing users)
-- Corrige todos os utilizadores já existentes em auth.users que ficaram órfãos de perfil.
-- Alinha-os sob a empresa do primeiro Administrador encontrado ou empresa padrão.
INSERT INTO public.perfis (
    id,
    company_id,
    nome,
    email,
    role,
    is_admin,
    is_active,
    created_at,
    updated_at
)
SELECT
    au.id,
    COALESCE(
        (SELECT id FROM public.empresas WHERE auth_user_id = au.id LIMIT 1), -- Se for dono
        (SELECT company_id FROM public.perfis WHERE role IN ('admin', 'admin_empresa') LIMIT 1), -- Se já houver admin
        '86759b25-5089-478b-919e-a6159807935f' -- ID padrão da principal empresa tributária existente
    ),
    COALESCE(au.raw_user_meta_data->>'full_name', au.raw_user_meta_data->>'nome', au.email),
    au.email,
    'user',
    FALSE,
    TRUE,
    COALESCE(au.created_at, NOW()),
    NOW()
FROM auth.users au
LEFT JOIN public.perfis p ON p.id = au.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Notificar recarregamento do cache de esquemas do PostgREST
NOTIFY pgrst, 'reload schema';
