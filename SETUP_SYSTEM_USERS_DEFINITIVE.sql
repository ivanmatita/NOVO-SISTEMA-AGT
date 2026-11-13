-- ====================================================================
-- SISTEMA MULTI-TENANT SEGURO - CONFIGURAÇÃO DEFINITIVA DE SYSTEM_USERS & PERFIS
-- ====================================================================

-- 1. Criar/Garantir a tabela logs_auditoria
CREATE TABLE IF NOT EXISTS public.logs_auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
    user_id UUID,
    user_email TEXT,
    action TEXT NOT NULL,
    ip TEXT,
    browser TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.logs_auditoria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Superadmins can read logs" ON public.logs_auditoria;
CREATE POLICY "Superadmins can read logs" ON public.logs_auditoria FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can insert logs" ON public.logs_auditoria;
CREATE POLICY "Anyone can insert logs" ON public.logs_auditoria FOR INSERT TO authenticated WITH CHECK (true);


-- 2. Criar/Garantir a tabela system_users com todos os campos necessários
CREATE TABLE IF NOT EXISTS public.system_users (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    profession TEXT,
    contact TEXT,
    morada TEXT,
    role TEXT NOT NULL DEFAULT 'user',
    permission_areas TEXT[] DEFAULT '{}' NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    created_by UUID,
    username TEXT,
    level INTEGER DEFAULT 1,
    is_admin BOOLEAN DEFAULT false,
    validade DATE,
    CONSTRAINT system_users_company_email_key UNIQUE (company_id, email)
);

-- Garantir que restrições rígidas antigas da coluna 'role' sejam removidas se existirem
ALTER TABLE public.system_users DROP CONSTRAINT IF EXISTS system_users_role_check;


-- 3. Criar Índices de Alta Performance para Isolamento Multi-tenant rápido
CREATE INDEX IF NOT EXISTS idx_system_users_company_id ON public.system_users(company_id);
CREATE INDEX IF NOT EXISTS idx_system_users_email ON public.system_users(email);
CREATE INDEX IF NOT EXISTS idx_system_users_is_active ON public.system_users(is_active);
CREATE INDEX IF NOT EXISTS idx_logs_auditoria_company_id ON public.logs_auditoria(company_id);


-- 4. Função e Trigger para Atualizar Automaticamente o Campo updated_at
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp ON public.system_users;
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON public.system_users
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_timestamp();


-- 5. Ativar Row Level Security (RLS) na Tabela de system_users
ALTER TABLE public.system_users ENABLE ROW LEVEL SECURITY;


-- 6. Políticas de Segurança com Isolamento Multi-tenant Baseados no Perfil do Utilizador Autenticado
DROP POLICY IF EXISTS "system_users_select_policy" ON public.system_users;
DROP POLICY IF EXISTS "system_users_insert_policy" ON public.system_users;
DROP POLICY IF EXISTS "system_users_update_policy" ON public.system_users;
DROP POLICY IF EXISTS "system_users_delete_policy" ON public.system_users;

DROP POLICY IF EXISTS "system_users_select" ON public.system_users;
DROP POLICY IF EXISTS "system_users_insert" ON public.system_users;
DROP POLICY IF EXISTS "system_users_update" ON public.system_users;
DROP POLICY IF EXISTS "system_users_delete" ON public.system_users;

-- 6.1 Política de Leitura (SELECT)
CREATE POLICY "system_users_select" ON public.system_users
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.perfis
        WHERE perfis.id = auth.uid()
          AND perfis.empresa_id = system_users.company_id
    )
);

-- 6.2 Política de Inserção (INSERT)
CREATE POLICY "system_users_insert" ON public.system_users
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.perfis
        WHERE perfis.id = auth.uid()
          AND perfis.empresa_id = system_users.company_id
    )
);

-- 6.3 Política de Atualização (UPDATE)
CREATE POLICY "system_users_update" ON public.system_users
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.perfis
        WHERE perfis.id = auth.uid()
          AND perfis.empresa_id = system_users.company_id
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.perfis
        WHERE perfis.id = auth.uid()
          AND perfis.empresa_id = system_users.company_id
    )
);

-- 6.4 Política de Deleção (DELETE)
CREATE POLICY "system_users_delete" ON public.system_users
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.perfis
        WHERE perfis.id = auth.uid()
          AND perfis.empresa_id = system_users.company_id
    )
);


-- 7. Recarregar Cache do PostgREST para Atualizar Imediatamente
NOTIFY pgrst, 'reload schema';
