-- ==============================================================================
-- 🚨 SCRIPT DE RESGATE RLS - MULTIEMPRESA SEGURO 🚨
-- Execute este script no SQL Editor do seu projeto Supabase
-- ==============================================================================

-- 1. GARANTIR A EXISTÊNCIA DA COLUNA `auth_user_id` NA TABELA `empresas`
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);

-- 2. MIGRAÇÃO DE DADOS: Se houver empresas sem `auth_user_id`, tenta assumir que o `id` é o `auth_user_id` (modelo legado)
UPDATE public.empresas 
SET auth_user_id = id 
WHERE auth_user_id IS NULL AND id IN (SELECT id FROM auth.users);

-- Se ainda existirem empresas sem auth_user_id, isto evitará erros no futuro.
-- (Apenas afeta registos antigos em que o RLS permitiu criar)

-- 3. GARANTIR QUE RLS ESTÁ ATIVADO MAS SEM POLÍTICAS CONFLITANTES
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

-- 4. REMOVER ABSOLUTAMENTE TODAS AS POLÍTICAS DA TABELA EMPRESAS ANTES DE AS RECRIAR
DROP POLICY IF EXISTS "Empresas Isolation" ON public.empresas;
DROP POLICY IF EXISTS "Empresas Update Isolation" ON public.empresas;
DROP POLICY IF EXISTS "Allow Registration Insert" ON public.empresas;
DROP POLICY IF EXISTS "Tenant Isolation" ON public.empresas;
DROP POLICY IF EXISTS "empresas_select_policy" ON public.empresas;
DROP POLICY IF EXISTS "empresas_insert_policy" ON public.empresas;
DROP POLICY IF EXISTS "empresas_update_policy" ON public.empresas;
DROP POLICY IF EXISTS "empresas_delete_policy" ON public.empresas;

-- 5. CRIAR POLÍTICAS CORRETAS E BLINDADAS PARA EMPRESAS
-- SELECT: Permite que o criador original (auth_user_id) OU qualquer membro (via get_auth_empresa_id) veja a empresa
CREATE POLICY "empresas_select_policy" ON public.empresas
FOR SELECT
TO authenticated
USING (auth.uid() = auth_user_id OR id = public.get_auth_empresa_id());

-- INSERT: Única condição - deve ser o utilizador autenticado e o auth_user_id deve ser preenchido (que o front-end envia)
CREATE POLICY "empresas_insert_policy" ON public.empresas
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = auth_user_id);

-- UPDATE: Permite edição se for o criador original OU membro da empresa
CREATE POLICY "empresas_update_policy" ON public.empresas
FOR UPDATE
TO authenticated
USING (auth.uid() = auth_user_id OR id = public.get_auth_empresa_id())
WITH CHECK (auth.uid() = auth_user_id OR id = public.get_auth_empresa_id());

-- 6. REMOVER POLÍTICAS ANTIGAS DOS PERFIS E RECRIAR
DROP POLICY IF EXISTS "Perfis Isolation" ON public.perfis;
DROP POLICY IF EXISTS "Allow Initial Profile Insert" ON public.perfis;
DROP POLICY IF EXISTS "perfis_select_policy" ON public.perfis;
DROP POLICY IF EXISTS "perfis_insert_policy" ON public.perfis;
DROP POLICY IF EXISTS "perfis_update_policy" ON public.perfis;

-- SELECT PERFIS: O utilizador vê o seu perfil OU colegas da mesma empresa (se já for membro de uma empresa)
CREATE POLICY "perfis_select_policy" ON public.perfis
FOR SELECT
TO authenticated
USING (id = auth.uid() OR empresa_id = public.get_auth_empresa_id());

-- INSERT PERFIS: Apenas onde ele é o dono (id do perfil tem de ser o uid)
CREATE POLICY "perfis_insert_policy" ON public.perfis
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

CREATE POLICY "perfis_update_policy" ON public.perfis
FOR UPDATE
TO authenticated
USING (id = auth.uid() OR empresa_id = public.get_auth_empresa_id())
WITH CHECK (id = auth.uid() OR empresa_id = public.get_auth_empresa_id());
