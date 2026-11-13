-- 1. CRIAR TABELA DE EMPRESAS
CREATE TABLE IF NOT EXISTS public.empresas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_empresa TEXT NOT NULL,
    nif TEXT UNIQUE,
    email TEXT UNIQUE,
    telefone TEXT,
    endereco TEXT,
    provincia TEXT,
    municipio TEXT,
    pais TEXT DEFAULT 'Angola',
    logo_url TEXT,
    footer_image_url TEXT,
    tipo_empresa TEXT,
    nome_administrador TEXT,
    email_admin TEXT,
    pacote_licenca TEXT,
    valor_licenca TEXT,
    auth_user_id UUID REFERENCES auth.users(id),
    plano TEXT DEFAULT 'trial',
    plano_status TEXT DEFAULT 'trial',
    plano_expira_em TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '14 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Garantir constraint de email (caso tabela já exista, mas sem a constraint)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'empresas_email_key') THEN
        ALTER TABLE public.empresas ADD CONSTRAINT empresas_email_key UNIQUE (email);
    END IF;
END $$;

-- Garantir coluna auth_user_id (caso tabela já exista, mas sem a coluna)
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);

-- 2. CRIAR TABELA DE PERFIS
CREATE TABLE IF NOT EXISTS public.perfis (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    nome TEXT,
    role TEXT DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. FUNÇÃO AUXILIAR PARA RLS
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


-- 4. ATIVAR RLS
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;


-- 5. POLÍTICAS DE ACESSO PARA EMPRESAS
DROP POLICY IF EXISTS "Empresas Isolation" ON public.empresas;
CREATE POLICY "Empresas Isolation" ON public.empresas
    FOR SELECT 
    USING (id = public.get_auth_empresa_id() OR auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Empresas Update Isolation" ON public.empresas;
CREATE POLICY "Empresas Update Isolation" ON public.empresas
    FOR UPDATE
    USING (id = public.get_auth_empresa_id() OR auth_user_id = auth.uid())
    WITH CHECK (id = public.get_auth_empresa_id() OR auth_user_id = auth.uid());

DROP POLICY IF EXISTS "Allow Registration Insert" ON public.empresas;
CREATE POLICY "Allow Registration Insert" ON public.empresas
    FOR INSERT
    TO authenticated
    WITH CHECK (auth_user_id = auth.uid());


-- 6. POLÍTICAS DE ACESSO PARA PERFIS
DROP POLICY IF EXISTS "Perfis Isolation" ON public.perfis;
CREATE POLICY "Perfis Isolation" ON public.perfis
    FOR ALL
    USING (empresa_id = public.get_auth_empresa_id() OR id = auth.uid());

DROP POLICY IF EXISTS "Allow Initial Profile Insert" ON public.perfis;
CREATE POLICY "Allow Initial Profile Insert" ON public.perfis
    FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());
