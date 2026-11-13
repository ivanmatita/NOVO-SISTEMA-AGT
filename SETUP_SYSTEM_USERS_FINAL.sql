-- ====================================================================
-- SISTEMA MULTI-TENANT SEGURO - CONFIGURAÇÃO COMPLETA DE SYSTEM_USERS
-- ====================================================================

-- 1. Remover Políticas antigas para Recriação Segura
DROP POLICY IF EXISTS "system_users_select_policy" ON public.system_users;
DROP POLICY IF EXISTS "system_users_insert_policy" ON public.system_users;
DROP POLICY IF EXISTS "system_users_update_policy" ON public.system_users;
DROP POLICY IF EXISTS "system_users_delete_policy" ON public.system_users;
DROP POLICY IF EXISTS "system_users_security_read" ON public.system_users;
DROP POLICY IF EXISTS "system_users_security_all" ON public.system_users;

-- 2. Modificar/Criar a Tabela system_users
CREATE TABLE IF NOT EXISTS public.system_users (
    id UUID PRIMARY KEY,
    company_id UUID NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    profession TEXT,
    contact TEXT,
    morada TEXT,
    role TEXT NOT NULL DEFAULT 'employee',
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

-- Garantir que restrições antigas rígidas da coluna 'role' sejam removidas se existirem
ALTER TABLE public.system_users DROP CONSTRAINT IF EXISTS system_users_role_check;


-- 3. Criar Índices de Alta Performance
CREATE INDEX IF NOT EXISTS idx_system_users_company_id ON public.system_users(company_id);
CREATE INDEX IF NOT EXISTS idx_system_users_email ON public.system_users(email);
CREATE INDEX IF NOT EXISTS idx_system_users_is_active ON public.system_users(is_active);

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

-- 5. Ativar Row Level Security (RLS)
ALTER TABLE public.system_users ENABLE ROW LEVEL SECURITY;

-- 6. Politícas de Segurança RLS com Isolamento Total Multi-tenant
-- As políticas baseiam-se na relação entre o utilizador atual (auth.uid()) e a sua correspondente empresa na tabela `perfis`.

-- 6.1 Política de Leitura (SELECT): Permite ler apenas utilizadores pertencentes à mesma empresa
CREATE POLICY "system_users_select_policy" ON public.system_users
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.perfis
        WHERE perfis.id = auth.uid()
          AND perfis.empresa_id = system_users.company_id
    )
);

-- 6.2 Política de Inserção (INSERT): Permite criar utilizador se o criador pertencer à mesma empresa
CREATE POLICY "system_users_insert_policy" ON public.system_users
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.perfis
        WHERE perfis.id = auth.uid()
          AND perfis.empresa_id = system_users.company_id
    )
);

-- 6.3 Política de Atualização (UPDATE): Permite atualizar utilizador se ambos forem da mesma empresa
CREATE POLICY "system_users_update_policy" ON public.system_users
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

-- 6.4 Política de Deleção (DELETE): Permite eliminar utilizador do sistema da própria empresa
CREATE POLICY "system_users_delete_policy" ON public.system_users
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.perfis
        WHERE perfis.id = auth.uid()
          AND perfis.empresa_id = system_users.company_id
    )
);

-- 7. Recarregar Cache do PostgREST para reconhecer a nova estrutura imediatamente
NOTIFY pgrst, 'reload schema';
