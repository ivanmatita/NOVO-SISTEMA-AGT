-- Migration 002: Funcoes auxiliares Security Definer para RLS multiempresa
-- Data: 2026-08-19

-- Funcao segura para obter o empresa_id do utilizador autenticado sem recursao
CREATE OR REPLACE FUNCTION public.auth_empresa_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT empresa_id FROM public.perfis WHERE id = auth.uid() LIMIT 1;
$$;

-- Funcao segura para obter o role do utilizador autenticado
CREATE OR REPLACE FUNCTION public.auth_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.perfis WHERE id = auth.uid() LIMIT 1;
$$;

-- Garantir permissoes de execucao para authenticated e anon
GRANT EXECUTE ON FUNCTION public.auth_empresa_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.auth_role() TO authenticated, anon;
