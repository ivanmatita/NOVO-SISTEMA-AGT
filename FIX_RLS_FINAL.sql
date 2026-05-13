-- 1. DROP DE TODAS AS POLÍTICAS ANTIGAS NA TABELA EMPRESAS PARA EVITAR CONFLITOS
DROP POLICY IF EXISTS "Empresas Isolation" ON public.empresas;
DROP POLICY IF EXISTS "Empresas Update Isolation" ON public.empresas;
DROP POLICY IF EXISTS "Allow Registration Insert" ON public.empresas;
DROP POLICY IF EXISTS "Tenant Isolation" ON public.empresas;
DROP POLICY IF EXISTS "empresas_select_policy" ON public.empresas;
DROP POLICY IF EXISTS "empresas_insert_policy" ON public.empresas;
DROP POLICY IF EXISTS "empresas_update_policy" ON public.empresas;
DROP POLICY IF EXISTS "empresas_delete_policy" ON public.empresas;

-- 2. GARANTIR RLS ATIVO
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);

UPDATE public.empresas 
SET auth_user_id = id 
WHERE auth_user_id IS NULL AND id IN (SELECT id FROM auth.users);

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

-- 3. CRIAR POLÍTICAS CORRETAS (MODELO FORNECIDO)

-- SELECT
CREATE POLICY "empresas_select_policy" ON public.empresas
FOR SELECT
TO authenticated
USING (auth.uid() = auth_user_id);

-- INSERT
CREATE POLICY "empresas_insert_policy" ON public.empresas
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = auth_user_id);

-- UPDATE
CREATE POLICY "empresas_update_policy" ON public.empresas
FOR UPDATE
TO authenticated
USING (auth.uid() = auth_user_id)
WITH CHECK (auth.uid() = auth_user_id);

-- DELETE
CREATE POLICY "empresas_delete_policy" ON public.empresas
FOR DELETE
TO authenticated
USING (auth.uid() = auth_user_id);

-- 4. GARANTIR QUE A TABELA PERFIS TEM UMA POLÍTICA COMPATÍVEL
DROP POLICY IF EXISTS "Perfis Isolation" ON public.perfis;
DROP POLICY IF EXISTS "Allow Initial Profile Insert" ON public.perfis;
DROP POLICY IF EXISTS "perfis_select_policy" ON public.perfis;
DROP POLICY IF EXISTS "perfis_insert_policy" ON public.perfis;
DROP POLICY IF EXISTS "perfis_update_policy" ON public.perfis;

CREATE POLICY "perfis_select_policy" ON public.perfis
FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "perfis_insert_policy" ON public.perfis
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

CREATE POLICY "perfis_update_policy" ON public.perfis
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());
