-- ==========================================
-- ESTRUTURA DE TENANCY COMPLETA - SAAS 2026
-- ==========================================

-- 1. Tabelas de infraestrutura de Tenancy
CREATE TABLE IF NOT EXISTS public.empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_empresa text NOT NULL,
  nif text UNIQUE,
  email text,
  telefone text,
  endereco text,
  provincia text,
  municipio text,
  pais text DEFAULT 'Angola',
  logo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.perfis (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome text,
  role text DEFAULT 'admin',
  created_at timestamptz DEFAULT now()
);

-- 2. Ativar RLS
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

-- 3. Função de Helper para RLS
CREATE OR REPLACE FUNCTION public.get_tenant_id() 
RETURNS uuid AS $$
  SELECT empresa_id FROM public.perfis WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 4. Políticas para Funcionamento do Registro (Signup)
DROP POLICY IF EXISTS "permitir_criar_empresa" ON public.empresas;
CREATE POLICY "permitir_criar_empresa" 
ON public.empresas FOR INSERT 
TO authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "usuarios_veem_propria_empresa" ON public.empresas;
CREATE POLICY "usuarios_veem_propria_empresa" 
ON public.empresas FOR SELECT 
TO authenticated 
USING (id = public.get_tenant_id());

DROP POLICY IF EXISTS "admins_atualizam_empresa" ON public.empresas;
CREATE POLICY "admins_atualizam_empresa" 
ON public.empresas FOR UPDATE 
TO authenticated 
USING (id = public.get_tenant_id());

DROP POLICY IF EXISTS "perfis_select" ON public.perfis;
CREATE POLICY "perfis_select" ON public.perfis FOR SELECT TO authenticated USING (id = auth.uid());

DROP POLICY IF EXISTS "perfis_insert" ON public.perfis;
CREATE POLICY "perfis_insert" ON public.perfis FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- 5. Migração Automática de todas as tabelas para Tenancy
DO $$ 
DECLARE
  t text;
  -- Lista de tabelas que precisam de isolamento por empresa
  tables_to_isolate text[] := ARRAY[
    'clientes', 'clients', 'compras', 'vendas', 'produtos', 'armazens', 
    'caixas', 'documentos_emitidos', 'series_fiscais', 'tabela_impostos', 
    'secretaria_digital', 'funcionarios', 'movimentacoes_caixa', 'notificacoes',
    'metricas_negocio', 'tarefas', 'frota_veiculos', 'membros_igreja', 'doacoes'
  ];
BEGIN
  FOREACH t IN ARRAY tables_to_isolate LOOP
    -- Garantir coluna company_id
    BEGIN
      EXECUTE format('ALTER TABLE IF EXISTS public.%I ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.empresas(id)', t);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Não foi possível adicionar coluna à tabela %', t;
    END;
    
    -- Ativar RLS
    EXECUTE format('ALTER TABLE IF EXISTS public.%I ENABLE ROW LEVEL SECURITY', t);
    
    -- Remover políticas antigas de nomes variados
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_isolation', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'company_isolation', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'company_isolation_compras', t);

    -- Criar Política Mestra de Isolamento
    EXECUTE format('
      CREATE POLICY %I ON public.%I
      FOR ALL TO authenticated
      USING (company_id = public.get_tenant_id())
      WITH CHECK (company_id = public.get_tenant_id())
    ', t || '_isolation', t);
  END LOOP;
END $$;
