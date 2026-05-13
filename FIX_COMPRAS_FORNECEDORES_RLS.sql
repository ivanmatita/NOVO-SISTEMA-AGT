DO $$ 
DECLARE
  t text;
  -- Lista extra de tabelas para garantir RLS de compras e fornecedores
  tables_to_isolate text[] := ARRAY[
    'compras', 'fornecedores'
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
    
    -- Criar Política Mestra de Isolamento
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_isolation', t);
    EXECUTE format('
      CREATE POLICY %I ON public.%I
      FOR ALL TO authenticated
      USING (company_id = public.get_tenant_id())
      WITH CHECK (company_id = public.get_tenant_id())
    ', t || '_isolation', t);
  END LOOP;
END $$;
