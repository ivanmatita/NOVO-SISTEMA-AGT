-- ==============================================================================
-- 🏆 MASTER SUPABASE REPAIR & OPTIMIZATION (VERCEL PRODUCTION)
-- ==============================================================================
-- INSTRUÇÕES:
-- 1. Vá ao painel do Supabase -> SQL Editor.
-- 2. Cole este script e clique em 'Run'.
-- 3. Vá em Storage -> Crie um Bucket público chamado 'system-data'.
-- ==============================================================================

-- 1. Função RPC para execução de SQL remoto (Usado pelo Administrador)
CREATE OR REPLACE FUNCTION public.query_exec(query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE query;
END;
$$;

-- 2. Garantir que a tabela 'perfis' existe para o AuthContext
CREATE TABLE IF NOT EXISTS public.perfis (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    empresa_id UUID,
    email TEXT,
    role TEXT DEFAULT 'admin',
    nome TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Habilitar RLS e Permissões Básicas
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON public.perfis;
CREATE POLICY "Usuários podem ver seu próprio perfil" 
ON public.perfis FOR SELECT 
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON public.perfis;
CREATE POLICY "Usuários podem atualizar seu próprio perfil" 
ON public.perfis FOR UPDATE 
USING (auth.uid() = id);

-- 4. Criar tabelas core caso não existam (Fallback para o server.ts)
CREATE TABLE IF NOT EXISTS public.empresas (
    id UUID PRIMARY KEY,
    nome_empresa TEXT NOT NULL,
    nif TEXT,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso total à própria empresa" ON public.empresas;
CREATE POLICY "Acesso total à própria empresa" 
ON public.empresas FOR ALL 
USING (id = auth.uid());

-- 5. Configuração Multi-Tenant para Colaboradores (Exemplo de RLS Profissional)
CREATE TABLE IF NOT EXISTS public.colaboradores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES public.empresas(id),
    name TEXT NOT NULL,
    email TEXT,
    role TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.colaboradores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Isolation por Empresa" ON public.colaboradores;
CREATE POLICY "Isolation por Empresa" 
ON public.colaboradores FOR ALL 
USING (
  empresa_id IN (
    SELECT empresa_id FROM public.perfis WHERE id = auth.uid()
  )
);

-- 6. NOTIFICAÇÃO FINAL
COMMENT ON FUNCTION public.query_exec IS 'Executa SQL dinâmico. Proteja com permissão apenas para ADMIN.';
