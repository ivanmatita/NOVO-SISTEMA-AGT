-- =========================================================================
-- PARTE 1: TABELA DE UTILIZADORES DO SISTEMA (system_users)
-- =========================================================================
-- Garante a criação da tabela de utilizadores com isolamento multi-tenant (empresa_id).
-- Cada utilizador pertence a uma empresa_id e apenas os dados dessa empresa são visíveis.

CREATE TABLE IF NOT EXISTS public.system_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL, -- UUID da Empresa à qual o utilizador pertence
    company_name TEXT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    profession TEXT,
    date DATE, -- Data de entrada ou validade secundária
    contact TEXT,
    morada TEXT,
    permission_areas TEXT[] DEFAULT '{}',
    role TEXT DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    username TEXT, -- Nome de utilizador secundário para identificação
    level INTEGER DEFAULT 1, -- Nível interno de permissões de 1 a 10
    is_admin BOOLEAN DEFAULT FALSE, -- Flag que indica se tem acesso total de admin
    validade DATE -- Data limite de validade de acesso à conta
);

-- Ativar segurança a nível de linha (Row Level Security - RLS)
ALTER TABLE public.system_users ENABLE ROW LEVEL SECURITY;

-- Excluir políticas antigas para evitar colisões
DROP POLICY IF EXISTS "Utilizadores só podem ver utilizadores da sua empresa" ON public.system_users;
DROP POLICY IF EXISTS "Admins podem inserir utilizadores" ON public.system_users;
DROP POLICY IF EXISTS "Utilizadores podem atualizar dados da sua empresa" ON public.system_users;

-- 1. Política de Leitura: Qualquer utilizador autenticado só pode visualizar utilizadores do mesmo tenant (empresa)
CREATE POLICY "Utilizadores só podem ver utilizadores da sua empresa" 
ON public.system_users 
FOR SELECT TO authenticated
USING (company_id::text = (current_setting('request.jwt.claims', true)::jsonb->>'empresa_id'));

-- 2. Política de Inserção: Permite a inserção de utilizadores que correspondam à empresa ativa na sessão JWT
CREATE POLICY "Admins podem inserir utilizadores" 
ON public.system_users 
FOR INSERT TO authenticated
WITH CHECK (company_id::text = (current_setting('request.jwt.claims', true)::jsonb->>'empresa_id'));

-- 3. Política de Atualização: Permite atualizar registos apenas dentro do mesmo tenant ativo (empresa)
CREATE POLICY "Utilizadores podem atualizar dados da sua empresa" 
ON public.system_users 
FOR UPDATE TO authenticated
USING (company_id::text = (current_setting('request.jwt.claims', true)::jsonb->>'empresa_id'))
WITH CHECK (company_id::text = (current_setting('request.jwt.claims', true)::jsonb->>'empresa_id'));

-- 4. Política de Eliminação: Permite eliminar utilizadores apenas dentro da mesma empresa
CREATE POLICY "Admins podem eliminar utilizadores da empresa" 
ON public.system_users 
FOR DELETE TO authenticated
USING (company_id::text = (current_setting('request.jwt.claims', true)::jsonb->>'empresa_id'));

-- Índice otimizado para pesquisas rápidas baseadas no isolamento por empresa
CREATE INDEX IF NOT EXISTS idx_system_users_company ON public.system_users(company_id);


-- =========================================================================
-- PARTE 2: TABELA DE REGISTO DE ATIVIDADES E SESSÕES (user_activities_sessions)
-- =========================================================================
-- Monitoriza entradas, saídas, tempo de permanência ativa, cliques de interação,
-- inserções de conteúdo, tarefas realizadas e score de desempenho para fins estatísticos.

CREATE TABLE IF NOT EXISTS public.user_activities_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    utilizador_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    empresa_id UUID NOT NULL, -- Tenant de isolamento empresarial
    data_entrada TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL, -- Data e Hora de Login
    data_saida TIMESTAMP WITH TIME ZONE, -- Data e Hora de Logout (ou interrupção)
    tempo_ativo_segundos INTEGER DEFAULT 0 NOT NULL, -- Quantidade de segundos de permanência ativa
    movimentos INTEGER DEFAULT 0 NOT NULL, -- Cliques nas áreas de trabalho e navegação
    insercoes INTEGER DEFAULT 0 NOT NULL, -- Inserções no banco de dados (formulários guardados)
    tarefas_concluidas INTEGER DEFAULT 0 NOT NULL, -- Operações financeiras ou de negócio terminadas
    ip TEXT, -- IP de onde o login foi feito
    navegador TEXT, -- User-Agent do utilizador
    ultimo_clique TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL, -- Timestamp do último heartbeat ou clique
    status TEXT DEFAULT 'ativo' NOT NULL -- Estado da sessão ('ativo', 'finalizado')
);

-- Ativar segurança RLS para a tabela de atividades
ALTER TABLE public.user_activities_sessions ENABLE ROW LEVEL SECURITY;

-- Excluir políticas para evitar duplicações
DROP POLICY IF EXISTS "Empresas can read their own activities" ON public.user_activities_sessions;
DROP POLICY IF EXISTS "Anyone can manage their own activities" ON public.user_activities_sessions;

-- 1. Política de Leitura: Garante que os gestores de uma empresa vejam unicamente as atividades da sua própria empresa
CREATE POLICY "Empresas can read their own activities" 
ON public.user_activities_sessions 
FOR SELECT TO authenticated
USING (empresa_id::text = (current_setting('request.jwt.claims', true)::jsonb->>'empresa_id'));

-- 2. Política de Gestão (Inserção/Atualização): Permite que dados sejam criados e atualizados em tempo real pelo frontend autenticado no seu tenant
CREATE POLICY "Anyone can manage their own activities" 
ON public.user_activities_sessions 
FOR ALL TO authenticated
USING (empresa_id::text = (current_setting('request.jwt.claims', true)::jsonb->>'empresa_id'))
WITH CHECK (empresa_id::text = (current_setting('request.jwt.claims', true)::jsonb->>'empresa_id'));

-- Índices otimizados para relatórios analíticos de alta velocidade
CREATE INDEX IF NOT EXISTS idx_activities_utilizador ON public.user_activities_sessions(utilizador_id);
CREATE INDEX IF NOT EXISTS idx_activities_empresa ON public.user_activities_sessions(empresa_id);
CREATE INDEX IF NOT EXISTS idx_activities_status ON public.user_activities_sessions(status);

-- Notificar PostgREST para limpar o cache de esquema e disponibilizar as alterações imediatamente
NOTIFY pgrst, 'reload schema';
