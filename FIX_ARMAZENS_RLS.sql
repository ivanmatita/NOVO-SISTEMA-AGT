-- 1. GARANTIR QUE A TABELA EXISTE E TEM RLS
ALTER TABLE IF EXISTS public.armazens ENABLE ROW LEVEL SECURITY;

-- 2. REMOVER POLÍTICAS ANTIGAS NA TABELA ARMAZENS
DROP POLICY IF EXISTS "Armazens Isolation" ON public.armazens;
DROP POLICY IF EXISTS "armazens_select_policy" ON public.armazens;
DROP POLICY IF EXISTS "armazens_insert_policy" ON public.armazens;
DROP POLICY IF EXISTS "armazens_update_policy" ON public.armazens;
DROP POLICY IF EXISTS "armazens_delete_policy" ON public.armazens;

-- 3. CRIAR POLÍTICAS CORRETAS E BLINDADAS
CREATE POLICY "armazens_select_policy" ON public.armazens
FOR SELECT
TO authenticated
USING (company_id = public.get_auth_empresa_id());

CREATE POLICY "armazens_insert_policy" ON public.armazens
FOR INSERT
TO authenticated
WITH CHECK (company_id = public.get_auth_empresa_id());

CREATE POLICY "armazens_update_policy" ON public.armazens
FOR UPDATE
TO authenticated
USING (company_id = public.get_auth_empresa_id())
WITH CHECK (company_id = public.get_auth_empresa_id());

CREATE POLICY "armazens_delete_policy" ON public.armazens
FOR DELETE
TO authenticated
USING (company_id = public.get_auth_empresa_id());
