-- =========================================================================
-- SCRIPT DE CORREÇÃO DE RLS E ISOLAMENTO PARA A TABELA DE PRODUTOS
-- Cole e execute este script no SQL Editor do seu painel Supabase.
-- =========================================================================

-- 1. Habilitar RLS na tabela produtos
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

-- 2. Limpar todas as políticas existentes (evita conflitos e duplicados)
DROP POLICY IF EXISTS "produtos_select_policy" ON public.produtos;
DROP POLICY IF EXISTS "produtos_insert_policy" ON public.produtos;
DROP POLICY IF EXISTS "produtos_update_policy" ON public.produtos;
DROP POLICY IF EXISTS "produtos_delete_policy" ON public.produtos;
DROP POLICY IF EXISTS "SAAS_TENANT_ISOLATION_produtos_SELECT" ON public.produtos;
DROP POLICY IF EXISTS "SAAS_TENANT_ISOLATION_produtos_INSERT" ON public.produtos;
DROP POLICY IF EXISTS "SAAS_TENANT_ISOLATION_produtos_UPDATE" ON public.produtos;
DROP POLICY IF EXISTS "SAAS_TENANT_ISOLATION_produtos_DELETE" ON public.produtos;
DROP POLICY IF EXISTS "SaaS_Isolation_Policy" ON public.produtos;
DROP POLICY IF EXISTS "Enable read access for users" ON public.produtos;
DROP POLICY IF EXISTS "Enable insert for users" ON public.produtos;
DROP POLICY IF EXISTS "Enable update for users" ON public.produtos;
DROP POLICY IF EXISTS "Enable delete for users" ON public.produtos;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.produtos;
DROP POLICY IF EXISTS "tenant_isolation_policy" ON public.produtos;

-- 3. Atualizar a função mestre get_auth_empresa_id para ser resiliente
-- Esta função recupera a empresa do utilizador autenticado, seja do JWT ou da tabela perfis.
CREATE OR REPLACE FUNCTION public.get_auth_empresa_id()
RETURNS uuid AS $$
DECLARE
  v_empresa_id uuid;
BEGIN
  -- 1. Tentar ler do JWT claims do Supabase
  BEGIN
    v_empresa_id := COALESCE(
      NULLIF(auth.jwt() -> 'user_metadata' ->> 'empresa_id', ''),
      NULLIF(auth.jwt() ->> 'empresa_id', '')
    )::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_empresa_id := NULL;
  END;
  
  -- 2. Se não estiver no JWT, buscar na tabela de perfis
  IF v_empresa_id IS NULL THEN
    SELECT empresa_id INTO v_empresa_id FROM public.perfis WHERE id = auth.uid() LIMIT 1;
  END IF;
  
  RETURN v_empresa_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 4. Criar novas políticas de segurança isoladas para a tabela produtos
CREATE POLICY "produtos_select_policy" ON public.produtos
    FOR SELECT TO authenticated
    USING (empresa_id = public.get_auth_empresa_id());

CREATE POLICY "produtos_insert_policy" ON public.produtos
    FOR INSERT TO authenticated
    WITH CHECK (empresa_id = public.get_auth_empresa_id());

CREATE POLICY "produtos_update_policy" ON public.produtos
    FOR UPDATE TO authenticated
    USING (empresa_id = public.get_auth_empresa_id())
    WITH CHECK (empresa_id = public.get_auth_empresa_id());

CREATE POLICY "produtos_delete_policy" ON public.produtos
    FOR DELETE TO authenticated
    USING (empresa_id = public.get_auth_empresa_id());

-- 5. Recarregar o esquema da API
NOTIFY pgrst, 'reload schema';
