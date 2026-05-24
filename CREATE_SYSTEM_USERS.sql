-- Tabela: system_users
-- Utilizada para gestão de utilizadores da empresa com isolamento por empresa (multi-tenancy) e permissões granulares.

DROP TABLE IF EXISTS public.system_users;

CREATE TABLE public.system_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL,
    company_name TEXT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    profession TEXT,
    date DATE,
    contact TEXT,
    morada TEXT,
    permission_areas TEXT[] DEFAULT '{}',
    role TEXT DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Ativar Row Level Security (RLS)
ALTER TABLE public.system_users ENABLE ROW LEVEL SECURITY;

-- 1. Políticas de leitura: utilizadores só podem ver os utilizadores da sua própria empresa
CREATE POLICY "Utilizadores só podem ver utilizadores da sua empresa" 
ON public.system_users 
FOR SELECT TO authenticated
USING (company_id::text = current_setting('request.jwt.claims', true)::jsonb->>'empresa_id');

-- 2. Políticas de inserção
CREATE POLICY "Admins podem inserir utilizadores" 
ON public.system_users 
FOR INSERT TO authenticated
WITH CHECK (company_id::text = current_setting('request.jwt.claims', true)::jsonb->>'empresa_id');

-- 3. Políticas de atualização
CREATE POLICY "Utilizadores podem atualizar dados da sua empresa" 
ON public.system_users 
FOR UPDATE TO authenticated
USING (company_id::text = current_setting('request.jwt.claims', true)::jsonb->>'empresa_id')
WITH CHECK (company_id::text = current_setting('request.jwt.claims', true)::jsonb->>'empresa_id');

-- Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_system_users_company ON public.system_users(company_id);
