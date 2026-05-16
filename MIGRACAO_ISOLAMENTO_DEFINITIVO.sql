-- ========================================================
-- REPARO CRÍTICO DE SEGURANÇA: ISOLAMENTO TOTAL SaaS
-- Bloqueia a visualização de dados entre diferentes empresas.
-- ========================================================

-- 1. FUNÇÃO DE APOIO PARA IDENTIFICAR A EMPRESA DO UTILIZADOR
CREATE OR REPLACE FUNCTION public.get_auth_empresa_id()
RETURNS uuid AS $$
  -- Procura o empresa_id na tabela de perfis para o utilizador autenticado
  SELECT empresa_id FROM public.perfis WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 2. APLICAR ISOLAMENTO EM TODAS AS TABELAS DE NEGÓCIO
DO $$ 
DECLARE 
    t text;
    -- Tabelas detetadas no sistema que precisam de isolamento
    tables_list text[] := ARRAY[
        'clientes', 
        'clients', 
        'fornecedores', 
        'suppliers', 
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
        'inventario'
    ];
BEGIN
    FOREACH t IN ARRAY tables_list LOOP
        -- Verificar se a tabela existe na base de dados
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t AND table_schema = 'public') THEN
            
            -- A. Garantir que a coluna empresa_id existe e está vinculada
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'empresa_id') THEN
                EXECUTE format('ALTER TABLE public.%I ADD COLUMN empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE', t);
            END IF;

            -- B. ATIVAR ROW LEVEL SECURITY (RLS) - OBRIGATÓRIO
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

            -- C. REMOVER POLÍTICAS ANTIGAS QUE POSSAM ESTAR A PERMITIR ACESSO INDEVIDO
            -- Removemos políticas genéricas como "Allow all" ou "Public access"
            EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation" ON public.%I', t);
            EXECUTE format('DROP POLICY IF EXISTS "SaaS_Isolation" ON public.%I', t);
            EXECUTE format('DROP POLICY IF EXISTS "Enable read access for all users" ON public.%I', t);
            EXECUTE format('DROP POLICY IF EXISTS "allow_all" ON public.%I', t);
            EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_policy" ON public.%I', t);
            
            -- D. CRIAR NOVA POLÍTICA DE ISOLAMENTO RIGOROSO
            -- Esta política garante que:
            -- SELECT: Só vê os dados da própria empresa
            -- INSERT: Só pode inserir se definir a própria empresa
            -- UPDATE/DELETE: Só pode alterar dados da própria empresa
            EXECUTE format('CREATE POLICY "SaaS_Isolation_Policy" ON public.%I 
                            FOR ALL TO authenticated 
                            USING (empresa_id = public.get_auth_empresa_id()) 
                            WITH CHECK (empresa_id = public.get_auth_empresa_id())', t);
            
            -- E. ÍNDICE DE PERFORMANCE
            EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(empresa_id)', 'idx_' || t || '_isolation', t);
            
            RAISE NOTICE 'Isolamento SaaS ativado na tabela: %', t;
        END IF;
    END LOOP;
END $$;

-- 3. RECARREGAR CONFIGURAÇÃO DA API SUPABASE
NOTIFY pgrst, 'reload schema';

ANALYZE public.clientes;
ANALYZE public.documentos_emitidos;
ANALYZE public.compras;
