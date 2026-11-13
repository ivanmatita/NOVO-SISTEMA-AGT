-- ==========================================
-- ESTRUTURA SAAS PROFISSIONAL (BOOST)
-- ==========================================

-- 1. FUNÇÃO MESTRE DE IDENTIDADE (Security Definer é CRITICO aqui)
CREATE OR REPLACE FUNCTION public.get_auth_empresa_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id uuid;
BEGIN
    -- Busca direta no perfil vinculado ao Auth UID
    SELECT empresa_id INTO v_id FROM public.perfis WHERE id = auth.uid();
    
    -- Fallback: Se não tem perfil mas é dono de uma empresa recém-criada
    IF v_id IS NULL THEN
        SELECT id INTO v_id FROM public.empresas WHERE auth_user_id = auth.uid() LIMIT 1;
    END IF;
    
    RETURN v_id;
END;
$$;

-- 2. TABELA EMPRESAS (Garantir colunas vitais)
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id);

-- 3. POLÍTICAS RLS: EMPRESAS (Permite criação inicial e isolamento)
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SaaS_Empresas_Insert" ON public.empresas;
CREATE POLICY "SaaS_Empresas_Insert" ON public.empresas
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = auth_user_id);

DROP POLICY IF EXISTS "SaaS_Empresas_Select" ON public.empresas;
CREATE POLICY "SaaS_Empresas_Select" ON public.empresas
FOR SELECT TO authenticated
USING (auth_user_id = auth.uid() OR id = public.get_auth_empresa_id());

DROP POLICY IF EXISTS "SaaS_Empresas_Update" ON public.empresas;
CREATE POLICY "SaaS_Empresas_Update" ON public.empresas
FOR UPDATE TO authenticated
USING (auth_user_id = auth.uid());

-- 4. POLÍTICAS RLS: PERFIS
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SaaS_Perfis_Access" ON public.perfis;
CREATE POLICY "SaaS_Perfis_Access" ON public.perfis
FOR ALL TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 5. ISOLAMENTO FORÇADO DE DADOS (Clientes, etc)
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SaaS_Data_Isolation" ON public.clientes;
CREATE POLICY "SaaS_Data_Isolation" ON public.clientes
FOR ALL TO authenticated
USING (empresa_id = public.get_auth_empresa_id())
WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- 6. INDEXES PARA PERFORMANCE MULTI-TENANT
CREATE INDEX IF NOT EXISTS idx_empresas_user ON public.empresas(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_perfis_empresa ON public.perfis(empresa_id);
CREATE INDEX IF NOT EXISTS idx_clientes_empresa ON public.clientes(empresa_id);
