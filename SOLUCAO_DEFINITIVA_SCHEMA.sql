-- ========================================================
-- SOLUÇÃO DEFINITIVA: SCHEMA SAAS MULTIEMPRESA 2026
-- FOCO: ELIMINAÇÃO DA COLUNA 'NOME' E USO DE 'NOME_EMPRESA'
-- ========================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELA EMPRESAS (GARANTIR ESTRUTURA CORRETA)
DO $$ 
BEGIN
    -- Se a coluna 'nome' existe e 'nome_empresa' não existe, renomeamos
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'empresas' AND column_name = 'nome' AND table_schema = 'public') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'empresas' AND column_name = 'nome_empresa' AND table_schema = 'public') THEN
        ALTER TABLE public.empresas RENAME COLUMN nome TO nome_empresa;
    END IF;

    -- Se ambas existem, garantimos que nome_empresa tem os dados e removemos nome
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'empresas' AND column_name = 'nome' AND table_schema = 'public') 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'empresas' AND column_name = 'nome_empresa' AND table_schema = 'public') THEN
        UPDATE public.empresas SET nome_empresa = nome WHERE nome_empresa IS NULL;
        ALTER TABLE public.empresas DROP COLUMN nome;
    END IF;

    -- Se nenhuma existe (tabela nova ou erro), criamos nome_empresa
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'empresas' AND column_name = 'nome_empresa' AND table_schema = 'public') THEN
        ALTER TABLE public.empresas ADD COLUMN nome_empresa text;
    END IF;
END $$;

-- 3. GARANTIR COLUNAS OBRIGATÓRIAS
ALTER TABLE public.empresas ALTER COLUMN nome_empresa SET NOT NULL;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS auth_user_id uuid REFERENCES auth.users(id);

-- 4. REPARAÇÃO DE CONTA ÓRFÃ (SQL LEVEL)
-- Caso existam utilizadores em 'perfis' sem empresa, ou empresas sem auth_user_id
UPDATE public.empresas e
SET auth_user_id = p.id
FROM public.perfis p
WHERE e.id = p.empresa_id AND e.auth_user_id IS NULL;

-- 5. RLS POLICIES (SEGURANÇA MÁXIMA)
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Empresas_Owner_Policy" ON public.empresas;
CREATE POLICY "Empresas_Owner_Policy" ON public.empresas
    FOR ALL TO authenticated
    USING (auth_user_id = auth.uid())
    WITH CHECK (auth_user_id = auth.uid());

-- Permitir que membros vejam a empresa (via função auxiliar)
CREATE OR REPLACE FUNCTION public.get_my_company()
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT empresa_id FROM public.perfis WHERE id = auth.uid() LIMIT 1;
$$;

DROP POLICY IF EXISTS "Empresas_Member_Select" ON public.empresas;
CREATE POLICY "Empresas_Member_Select" ON public.empresas
    FOR SELECT TO authenticated
    USING (id = public.get_my_company());

-- 6. INDEXES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_empresas_auth_user ON public.empresas(auth_user_id);

-- 7. FORÇAR REFRESH DO CACHE
-- Execute isto para que o PostgREST (API do Supabase) reconheça as novas colunas imediatamente
NOTIFY pgrst, 'reload schema';

ANALYZE public.empresas;
