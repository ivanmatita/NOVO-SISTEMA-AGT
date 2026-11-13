-- 1. DROP DE POLÍTICAS ANTIGAS NA TABELA EMPRESAS PARA EVITAR CONFLITOS
DROP POLICY IF EXISTS "Empresas Isolation" ON public.empresas;
DROP POLICY IF EXISTS "Empresas Update Isolation" ON public.empresas;
DROP POLICY IF EXISTS "Allow Registration Insert" ON public.empresas;
DROP POLICY IF EXISTS "Tenant Isolation" ON public.empresas;
DROP POLICY IF EXISTS "empresas_select_policy" ON public.empresas;
DROP POLICY IF EXISTS "empresas_insert_policy" ON public.empresas;
DROP POLICY IF EXISTS "empresas_update_policy" ON public.empresas;
DROP POLICY IF EXISTS "empresas_delete_policy" ON public.empresas;

-- 2. GARANTIR QUE A COLUNA auth_user_id EXISTE
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);

-- Migrar dados antigos caso necessário
UPDATE public.empresas 
SET auth_user_id = id 
WHERE auth_user_id IS NULL AND id IN (SELECT id FROM auth.users);

-- 3. GARANTIR RLS ATIVO
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

-- 4. CRIAR POLÍTICAS CORRETAS E BLINDADAS (MULTIUSUÁRIO + PROPRIETÁRIO)

-- SELECT: Permite que o criador original (auth_user_id) OU qualquer membro (via get_auth_empresa_id) veja a empresa
CREATE POLICY "empresas_select_policy" ON public.empresas
FOR SELECT
TO authenticated
USING (auth.uid() = auth_user_id OR id = public.get_auth_empresa_id());

-- INSERT: Única condição - deve ser o utilizador criador, respeitando auth_user_id
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

-- DELETE: Opcional, reservada para o dono original
CREATE POLICY "empresas_delete_policy" ON public.empresas
FOR DELETE
TO authenticated
USING (auth.uid() = auth_user_id);

-- 5. POLÍTICAS DE PERFIS
DROP POLICY IF EXISTS "Perfis Isolation" ON public.perfis;
DROP POLICY IF EXISTS "Allow Initial Profile Insert" ON public.perfis;
DROP POLICY IF EXISTS "perfis_select_policy" ON public.perfis;
DROP POLICY IF EXISTS "perfis_insert_policy" ON public.perfis;
DROP POLICY IF EXISTS "perfis_update_policy" ON public.perfis;

-- SELECT: O utilizador vê o seu perfil OU colegas da mesma empresa
CREATE POLICY "perfis_select_policy" ON public.perfis
FOR SELECT
TO authenticated
USING (id = auth.uid() OR empresa_id = public.get_auth_empresa_id());

-- INSERT: Apenas o dono
CREATE POLICY "perfis_insert_policy" ON public.perfis
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

CREATE POLICY "perfis_update_policy" ON public.perfis
FOR UPDATE
TO authenticated
USING (id = auth.uid() OR empresa_id = public.get_auth_empresa_id())
WITH CHECK (id = auth.uid() OR empresa_id = public.get_auth_empresa_id());
