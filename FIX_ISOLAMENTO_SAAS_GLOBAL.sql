-- ========================================================
-- FIX CRÍTICO: ISOLAMENTO SaaS MULTI-TENANT (TENANCY ISOLATION)
-- Objetivo: Impedir que empresas vejam dados umas das outras.
-- ========================================================

-- 1. FUNÇÃO MESTRE DE IDENTIFICAÇÃO DE TENANT
-- Esta função é o coração do isolamento. Ela descobre qual a empresa do utilizador atual.
CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS uuid AS $$
  SELECT empresa_id FROM public.perfis WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. LISTA DE TABELAS QUE PRECISAM DE ISOLAMENTO
-- Clientes, Fornecedores, Caixas, Compras, Documentos, etc.
DO $$ 
DECLARE 
    t text;
    tables_to_isolate text[] := ARRAY[
        'clientes', 
        'fornecedores', 
        'documentos_emitidos', 
        'caixas', 
        'compras', 
        'locais_trabalho',
        'metricas',
        'secretaria',
        'inventario'
    ];
BEGIN
    FOREACH t IN ARRAY tables_to_isolate LOOP
        -- A. Garantir que a coluna empresa_id existe
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t AND table_schema = 'public') THEN
            
            -- Adicionar coluna se não existir
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'empresa_id') THEN
                EXECUTE format('ALTER TABLE public.%I ADD COLUMN empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE', t);
            END IF;

            -- B. Ativar RLS
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

            -- C. Criar Política de Isolamento (Remove antigas se existirem)
            EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_policy" ON public.%I', t);
            EXECUTE format('CREATE POLICY "tenant_isolation_policy" ON public.%I 
                            FOR ALL TO authenticated 
                            USING (empresa_id = public.get_my_tenant_id()) 
                            WITH CHECK (empresa_id = public.get_my_tenant_id())', t);
            
            -- D. Criar Índice para performance
            EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(empresa_id)', 'idx_' || t || '_tenant', t);
            
            RAISE NOTICE 'Isolamento aplicado com sucesso na tabela: %', t;
        ELSE
            RAISE WARNING 'Tabela não encontrada para isolamento: %', t;
        END IF;
    END LOOP;
END $$;

-- 3. FORÇAR ATUALIZAÇÃO DO CACHE
NOTIFY pgrst, 'reload schema';

-- 4. VERIFICAÇÃO FINAL
ANALYZE public.clientes;
ANALYZE public.documentos_emitidos;
RAISE NOTICE 'O isolamento SaaS foi implementado em todas as tabelas detetadas.';
