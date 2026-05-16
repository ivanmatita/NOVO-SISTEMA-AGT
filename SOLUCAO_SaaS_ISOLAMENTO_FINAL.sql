-- ========================================================
-- SOLUÇÃO DEFINITIVA: ISOLAMENTO TOTAL SaaS (MULTI-TENANT)
-- Este script deve ser executado no SQL Editor do Supabase.
-- ========================================================

-- 1. FUNÇÃO MESTRE DE IDENTIFICAÇÃO DE EMPRESA
-- Esta função é o pilar de segurança do sistema.
CREATE OR REPLACE FUNCTION public.get_auth_empresa_id()
RETURNS uuid AS $$
BEGIN
  RETURN (SELECT empresa_id FROM public.perfis WHERE id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. AUTOMAÇÃO DE ISOLAMENTO EM TODAS AS TABELAS
DO $$ 
DECLARE 
    t text;
    tables_list text[] := ARRAY[
        'clientes', 
        'fornecedores', 
        'documentos_emitidos', 
        'compras', 
        'caixas', 
        'caixa_movimentacoes', 
        'armazens', 
        'series_fiscais', 
        'tabela_impostos', 
        'secretaria_digital', 
        'alertas_tarefas', 
        'metricas', 
        'locais_trabalho',
        'produtos',
        'servicos',
        'inventario',
        'pos_pontos',
        'pos_sessoes',
        'financeiro_transacoes'
    ];
BEGIN
    FOREACH t IN ARRAY tables_list LOOP
        -- Verificar existência da tabela
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t AND table_schema = 'public') THEN
            
            -- A. Adicionar empresa_id se não existir
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'empresa_id') THEN
                EXECUTE format('ALTER TABLE public.%I ADD COLUMN empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE', t);
            END IF;

            -- B. Habilitar RLS
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

            -- C. Limpar políticas antigas
            EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation" ON public.%I', t);
            EXECUTE format('DROP POLICY IF EXISTS "SaaS_Isolation_Policy" ON public.%I', t);
            EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_policy" ON public.%I', t);
            
            -- D. Criar Nova Política de Isolamento Total
            EXECUTE format('CREATE POLICY "SaaS_Isolation_Policy" ON public.%I 
                            FOR ALL TO authenticated 
                            USING (empresa_id = public.get_auth_empresa_id()) 
                            WITH CHECK (empresa_id = public.get_auth_empresa_id())', t);
            
            -- E. Índice para Performance
            EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(empresa_id)', 'idx_' || t || '_tenant_isolation', t);
            
            RAISE NOTICE 'Isolamento SaaS robusto aplicado na tabela: %', t;
        END IF;
    END LOOP;
END $$;

-- 3. GARANTIR QUE ADMINS PODEM VER A SUA PRÓPRIA EMPRESA
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Empresas_Self_Access" ON public.empresas;
CREATE POLICY "Empresas_Self_Access" ON public.empresas
    FOR ALL TO authenticated
    USING (auth_user_id = auth.uid() OR id = public.get_auth_empresa_id())
    WITH CHECK (auth_user_id = auth.uid());

-- 4. RECARREGAR SCHEMA
NOTIFY pgrst, 'reload schema';
