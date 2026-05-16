-- ========================================================
-- SCHEMA SaaS MULTI-TENANT DEFINITIVO - ISOLAMENTO TOTAL
-- Objetivo: Limpeza total de políticas legadas e isolamento robusto.
-- ========================================================

-- 1. FUNÇÃO MESTRE DE IDENTIFICAÇÃO DE TENANT (EMPRESA)
-- Esta função é o coração do sistema. Se ela falhar, o acesso é negado.
CREATE OR REPLACE FUNCTION public.get_auth_empresa_id()
RETURNS uuid AS $$
BEGIN
  -- Tenta buscar o empresa_id vinculado ao utilizador na tabela perfis
  RETURN (SELECT empresa_id FROM public.perfis WHERE id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. PROCEDIMENTO DE LIMPEZA E ISOLAMENTO DE TABELAS
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
BEGIN
    -- Primeiro, garantir que a tabela empresas está segura
    ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "SaaS_Empresas_Access" ON public.empresas;
    DROP POLICY IF EXISTS "Dono_Empresa_Acesso_Total" ON public.empresas;
    
    -- Política para Empresas: O Dono (auth_user_id) ou Membro (via perfis) tem acesso
    CREATE POLICY "SaaS_Empresas_Access_Policy" ON public.empresas
        FOR ALL TO authenticated
        USING (auth_user_id = auth.uid() OR id = public.get_auth_empresa_id())
        WITH CHECK (auth_user_id = auth.uid());

    -- Segundo, garantir que a tabela perfis está segura
    ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "SaaS_Perfis_Access" ON public.perfis;
    DROP POLICY IF EXISTS "Usuario_Gere_Proprio_Perfil" ON public.perfis;
    
    CREATE POLICY "SaaS_Perfis_Access_Policy" ON public.perfis
        FOR ALL TO authenticated
        USING (id = auth.uid() OR empresa_id = public.get_auth_empresa_id())
        WITH CHECK (id = auth.uid());

    -- Terceiro, aplicar isolamento em todas as tabelas de negócio
    FOREACH t IN ARRAY tables_list LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t AND table_schema = 'public') THEN
            
            -- Garantir coluna empresa_id
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'empresa_id') THEN
                EXECUTE format('ALTER TABLE public.%I ADD COLUMN empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE', t);
            END IF;

            -- Forçar ativação de RLS
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

            -- Limpar políticas legadas (todas as variações comuns)
            EXECUTE format('DROP POLICY IF EXISTS "SaaS_Isolation_Policy" ON public.%I', t);
            EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation" ON public.%I', t);
            EXECUTE format('DROP POLICY IF EXISTS "allow_all" ON public.%I', t);
            EXECUTE format('DROP POLICY IF EXISTS "Enable read access for all users" ON public.%I', t);

            -- Aplicar Política de Isolamento Multi-Tenant Rigorosa
            EXECUTE format('CREATE POLICY "SaaS_Isolation_Policy" ON public.%I 
                            FOR ALL TO authenticated 
                            USING (empresa_id = public.get_auth_empresa_id()) 
                            WITH CHECK (empresa_id = public.get_auth_empresa_id())', t);
            
            -- Índice para performance de filtros por empresa
            EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(empresa_id)', 'idx_' || t || '_isolation', t);
            
        END IF;
    END LOOP;
END $$;

-- 3. RECARREGAR CONFIGURAÇÃO DA API
NOTIFY pgrst, 'reload schema';
ANALYZE public.empresas;
ANALYZE public.perfis;
