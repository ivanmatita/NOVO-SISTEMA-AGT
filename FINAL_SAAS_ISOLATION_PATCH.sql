-- ========================================================
-- PATCH SEGURO DE ISOLAMENTO SaaS
-- ========================================================

-- 1. REPARAR FUNÇÃO get_auth_empresa_id
CREATE OR REPLACE FUNCTION public.get_auth_empresa_id()
RETURNS uuid AS $$
BEGIN
  RETURN (SELECT empresa_id FROM public.perfis WHERE id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. ROTINA DE PATCH SEM APAGAR DADOS
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
        'financeiro_transacoes',
        'profissoes',
        'funcionarios',
        'pgc_contas',
        'diarios_contabilidade'
    ];
    primeira_empresa uuid;
    pol record;
BEGIN
    -- Selecionar empresa principal para fallback (evita perdas)
    SELECT id INTO primeira_empresa FROM public.empresas LIMIT 1;

    FOREACH t IN ARRAY tables_list LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t AND table_schema = 'public') THEN
            
            -- HABILITAR RLS
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

            -- REMOVER TODAS AS POLÍTICAS EXISTENTES
            FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = t AND schemaname = 'public') LOOP
                EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
            END LOOP;

            -- GARANTIR COLUNA empresa_id
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'empresa_id') THEN
                EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE', t);
                
                -- Se criamos a coluna e temos uma empresa padrão, migrar os dados órfãos para evitar perda!
                IF primeira_empresa IS NOT NULL THEN
                    EXECUTE format('UPDATE public.%I SET empresa_id = $1 WHERE empresa_id IS NULL', t) USING primeira_empresa;
                END IF;
            ELSE
                -- Se a coluna já existe, mas tem nulos
                IF primeira_empresa IS NOT NULL THEN
                    EXECUTE format('UPDATE public.%I SET empresa_id = $1 WHERE empresa_id IS NULL', t) USING primeira_empresa;
                END IF;
            END IF;

            -- CIRAR NOVA POLÍTICA RESTRITA
            EXECUTE format('CREATE POLICY "SAAS_TENANT_ISOLATION_%s" ON public.%I 
                            FOR ALL TO authenticated 
                            USING (empresa_id = public.get_auth_empresa_id()) 
                            WITH CHECK (empresa_id = public.get_auth_empresa_id())', t, t);
        END IF;
    END LOOP;

    -- REPARAR TABELA EMPRESAS
    ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'empresas' AND schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.empresas', pol.policyname);
    END LOOP;
    CREATE POLICY "Empresas_Profile_Isolation" ON public.empresas
        FOR ALL TO authenticated
        USING (auth_user_id = auth.uid() OR id = public.get_auth_empresa_id())
        WITH CHECK (auth_user_id = auth.uid());

    -- REPARAR TABELA PERFIS
    ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'perfis' AND schemaname = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.perfis', pol.policyname);
    END LOOP;
    CREATE POLICY "Perfis_Secure_Isolation" ON public.perfis
        FOR ALL TO authenticated
        USING (id = auth.uid() OR empresa_id = public.get_auth_empresa_id())
        WITH CHECK (id = auth.uid());

END $$;
