-- MIGRATION: Staging Complete Alignment & Schema Hardening
-- Target: Supabase Staging (sfnibpxfevhelaikqbiq)
-- Purpose: Harmonize schema columns, RLS policies, and test data for all modules

-- 1. Harmonize empresas
UPDATE public.empresas SET nome_empresa = nome WHERE nome_empresa IS NULL OR nome_empresa = '';

-- Allow authenticated users / superadmins to insert and update empresas
DROP POLICY IF EXISTS "empresas_insert_policy" ON public.empresas;
DROP POLICY IF EXISTS "empresas_insert_authenticated" ON public.empresas;
CREATE POLICY "empresas_insert_authenticated" ON public.empresas FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "empresas_update_policy" ON public.empresas;
DROP POLICY IF EXISTS "empresas_update_authenticated" ON public.empresas;
CREATE POLICY "empresas_update_authenticated" ON public.empresas FOR UPDATE TO authenticated USING (true);

-- 2. Harmonize produtos (Ensure preco_venda, preco_custo, stock_atual exist)
ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS preco_venda numeric;
UPDATE public.produtos SET preco_venda = preco WHERE preco_venda IS NULL AND preco IS NOT NULL;
UPDATE public.produtos SET preco = preco_venda WHERE preco IS NULL AND preco_venda IS NOT NULL;

-- 3. Harmonize armazens & caixas
ALTER TABLE public.armazens ADD COLUMN IF NOT EXISTS codigo text;
UPDATE public.armazens SET codigo = 'ARM-' || substring(id::text, 1, 4) WHERE codigo IS NULL;

ALTER TABLE public.caixas ADD COLUMN IF NOT EXISTS codigo text;
UPDATE public.caixas SET codigo = COALESCE(codigo_caixa, 'CX-01') WHERE codigo IS NULL;
UPDATE public.caixas SET codigo_caixa = codigo WHERE codigo_caixa IS NULL;

-- 4. Harmonize colaboradores
ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS salario_base numeric;
UPDATE public.colaboradores SET salario_base = salario WHERE salario_base IS NULL AND salario IS NOT NULL;
UPDATE public.colaboradores SET salario = salario_base WHERE salario IS NULL AND salario_base IS NOT NULL;

-- 5. Harmonize hr_processamentos
ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS status text;
UPDATE public.hr_processamentos SET status = estado WHERE status IS NULL AND estado IS NOT NULL;
UPDATE public.hr_processamentos SET estado = status WHERE estado IS NULL AND status IS NOT NULL;

-- 6. Harmonize exercicios_fiscais
ALTER TABLE public.exercicios_fiscais ADD COLUMN IF NOT EXISTS estado text;
UPDATE public.exercicios_fiscais SET estado = CASE WHEN fechado = true THEN 'fechado' ELSE 'aberto' END WHERE estado IS NULL;

-- 7. Populate default Categorias for Staging if empty
INSERT INTO public.categorias (id, empresa_id, nome, created_at)
SELECT 
  gen_random_uuid(),
  '11111111-0000-0000-0000-000000000001'::uuid,
  c.nome,
  NOW()
FROM (
  VALUES 
    ('Alimentação & Bebidas'),
    ('Serviços & Consultoria'),
    ('Informática & Eletrónicos'),
    ('Material de Escritório'),
    ('Geral')
) AS c(nome)
WHERE NOT EXISTS (
  SELECT 1 FROM public.categorias WHERE empresa_id = '11111111-0000-0000-0000-000000000001'
);

-- 8. Ensure all essential tables have RLS policies for authenticated users
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'clientes', 'fornecedores', 'produtos', 'categorias', 'armazens',
    'caixas', 'series_fiscais', 'documentos_emitidos', 'documentos_relacionados',
    'colaboradores', 'hr_processamentos', 'hr_assiduidade', 'hr_contratos',
    'locais_trabalho', 'exercicios_fiscais', 'licencas_empresas', 'compras',
    'caixa_movimentacoes', 'impostos', 'contas_pag_impostos', 'diarios_contabeis',
    'lancamentos_contabeis', 'pos_user_configs', 'logs_auditoria', 'media_arquivos',
    'alertas', 'alertas_tarefas', 'professions'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
    
    -- Drop existing wide-open or broken policies to create clean isolation
    EXECUTE format('DROP POLICY IF EXISTS %I_isolation ON public.%I;', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I_all_access ON public.%I;', tbl, tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I_authenticated_all ON public.%I;', tbl, tbl);
    
    -- Create company isolation policy for authenticated users
    EXECUTE format('
      CREATE POLICY %I_authenticated_all ON public.%I
      FOR ALL TO authenticated
      USING (
        empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = auth.uid()) OR
        empresa_id IS NULL OR
        (SELECT is_superadmin FROM public.perfis WHERE id = auth.uid()) = true OR
        (SELECT role FROM public.perfis WHERE id = auth.uid()) = ''superadmin''
      )
      WITH CHECK (
        empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = auth.uid()) OR
        empresa_id IS NULL OR
        (SELECT is_superadmin FROM public.perfis WHERE id = auth.uid()) = true OR
        (SELECT role FROM public.perfis WHERE id = auth.uid()) = ''superadmin''
      );
    ', tbl, tbl);
  END LOOP;
END $$;
