-- =========================================================================================
-- 🔥 PATCH DE EMERGÊNCIA: RESOLVER ERROR "stack depth limit exceeded" EM AMBIENTE SAAS 🔥
-- =========================================================================================
--
-- O problema acontece devido a um LOOP INFINITO no RLS da tabela 'perfis' e 'empresas'.
-- A função get_auth_empresa_id() fazia um SELECT na tabela perfis, e devido a algumas policies erradas, 
-- isto despoletava uma reação em cadeia interminável até esgotar a stack de execução no servidor de base de dados.
--
-- ESTA É A CORREÇÃO DE RLS À PROVA DE BALA (SEM APAGAR TABELAS)

BEGIN;

--------------------------------------------------------------------------------------
-- 1. CONFIGURAÇÃO DA FUNÇÃO CENTRAL 'get_auth_empresa_id' SEGURA & SEM RECURSÃO
--------------------------------------------------------------------------------------
-- Fazemos com que rode com segurança sem aplicar RLS na tabela à qual consulta (perfis),
-- e não chame outras funções recursivamente, garantindo super performance (STABLE SECURITY DEFINER).

CREATE OR REPLACE FUNCTION public.get_auth_empresa_id()
RETURNS uuid AS $$
DECLARE
  v_empresa_id uuid;
BEGIN
  -- Este SELECT é blindado, como a função é SECURITY DEFINER e roda no search_path = public, 
  -- salta a filtragem excessiva e poupa a base de dados.
  SELECT empresa_id INTO v_empresa_id FROM public.perfis WHERE id = auth.uid() LIMIT 1;
  RETURN v_empresa_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

--------------------------------------------------------------------------------------
-- 2. RECRIAR POLICIES DA TABELA 'perfis' (ESTRITAMENTE O NECESSÁRIO E SEM INCEPTION)
--------------------------------------------------------------------------------------
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
  pol record;
BEGIN
  FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'perfis' AND schemaname = 'public') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.perfis', pol.policyname);
  END LOOP;
END $$;

-- NUNCA chamar 'public.get_auth_empresa_id()' aqui debaixo. Só causaria o "Stack Limit" no RLS
CREATE POLICY "Perfis_Permit_Own" ON public.perfis
    FOR ALL TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());


--------------------------------------------------------------------------------------
-- 3. RECRIAR POLICIES DA TABELA 'empresas' (EVITAR LOOP DE VERIFICAÇÕES)
--------------------------------------------------------------------------------------
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
  pol record;
BEGIN
  FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'empresas' AND schemaname = 'public') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.empresas', pol.policyname);
  END LOOP;
END $$;

-- Aqui podemos chamar get_auth_empresa_id() com segurança, porque já não dá recursão do lado dos 'perfis'
CREATE POLICY "Empresas_Profile_Isolation" ON public.empresas
    FOR ALL TO authenticated
    USING (
      auth_user_id = auth.uid() OR 
      id = public.get_auth_empresa_id()
    )
    WITH CHECK (auth_user_id = auth.uid());


--------------------------------------------------------------------------------------
-- 4. VERIFICAÇÃO PARA CUIDAR DAS TABELAS AFETADAS DIRETAMENTE NO ERRO RLS 
--------------------------------------------------------------------------------------
-- A tabela Clientes e Locais de Trabalho tinham crashes derivado ao mesmo loop. 

-- Garantir 'clientes'
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clientes_isolation" ON public.clientes;
CREATE POLICY "clientes_isolation" ON public.clientes
    FOR ALL TO authenticated
    USING (empresa_id = public.get_auth_empresa_id())
    WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- Garantir 'locais_trabalho'
ALTER TABLE public.locais_trabalho ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "SAAS_TENANT_ISOLATION_locais_trabalho" ON public.locais_trabalho;
CREATE POLICY "SAAS_TENANT_ISOLATION_locais_trabalho" ON public.locais_trabalho
    FOR ALL TO authenticated
    USING (empresa_id = public.get_auth_empresa_id())
    WITH CHECK (empresa_id = public.get_auth_empresa_id());

COMMIT;

-- Atualizar caché de funções do Supabase (Obrigatório depois de alterar definer functions)
NOTIFY pgrst, 'reload schema';
