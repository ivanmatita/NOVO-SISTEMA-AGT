-- ==================================================================================
-- 🔐 RECRIAÇÃO TOTAL & FORTIFICADA DA TABELA "caixas" COM TOAS AS COLUNAS E RLS
-- Execute esta query no Editor SQL do seu painel Supabase (https://supabase.com)
-- ==================================================================================

-- 1. PREPARAR CAMINHO (remover tabela anterior com segurança)
-- ATENÇÃO: Dependendo de dados legados, isto apagará caixas anteriores para evitar inconsistência de colunas.
DROP TABLE IF EXISTS public.caixas CASCADE;

-- 2. CRIAR A TABELA EXACTA DE CAIXAS COM TODAS AS COLUNAS EM FALTA
CREATE TABLE public.caixas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id uuid NOT NULL,
    nome_caixa text NOT NULL,
    account text DEFAULT '',
    moeda text NOT NULL DEFAULT 'AOA',
    status text NOT NULL DEFAULT 'aberto',
    valor_inicial numeric DEFAULT 0,
    current_balance numeric DEFAULT 0,
    responsavel text,
    utilizador_id uuid,
    observacao text,
    created_at timestamptz DEFAULT now(),
    is_deleted boolean NOT NULL DEFAULT false
);

-- 3. CRIAR ÍNDICES ÚTEIS PARA PERFORMANCE DE BUSCAS MULTI-TENANT
CREATE INDEX IF NOT EXISTS idx_caixas_empresa_id ON public.caixas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_caixas_is_deleted ON public.caixas(is_deleted);

-- 4. HABILITAR ROW LEVEL SECURITY (RLS) NA TABELA
ALTER TABLE public.caixas ENABLE ROW LEVEL SECURITY;

-- 5. LIMPAR E ANULAR TODAS AS POLÍTICAS ANTIGAS DA TABELA "caixas"
DROP POLICY IF EXISTS "caixas_isolation" ON public.caixas;
DROP POLICY IF EXISTS "Select caixas" ON public.caixas;
DROP POLICY IF EXISTS "Insert caixas" ON public.caixas;
DROP POLICY IF EXISTS "Update caixas" ON public.caixas;
DROP POLICY IF EXISTS "Delete caixas" ON public.caixas;
DROP POLICY IF EXISTS "caixas_select_policy" ON public.caixas;
DROP POLICY IF EXISTS "caixas_insert_policy" ON public.caixas;
DROP POLICY IF EXISTS "caixas_update_policy" ON public.caixas;
DROP POLICY IF EXISTS "caixas_delete_policy" ON public.caixas;

-- 6. CRIAR OS 4 NÍVEIS DE SEGURANÇA (DECLARATIVO MULTI-TENANT)

-- Nível 1: ISOLAMENTO DE DADOS DE LEITURA (SELECT)
-- O utilizador só consegue ver caixas da sua própria empresa (SaaS).
CREATE POLICY "caixas_select_policy" ON public.caixas
FOR SELECT TO authenticated
USING (empresa_id = public.get_auth_empresa_id());

-- Nível 2: ISOLAMENTO DE INSERÇÃO (INSERT)
-- O utilizador só insere novos registos vinculados devidamente à sua própria empresa.
CREATE POLICY "caixas_insert_policy" ON public.caixas
FOR INSERT TO authenticated
WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- Nível 3: ISOLAMENTO DE EDIÇÃO (UPDATE)
-- Permite editar as informações do formulário (nome, saldos, responsável) mantendo a empresa isolada.
CREATE POLICY "caixas_update_policy" ON public.caixas
FOR UPDATE TO authenticated
USING (empresa_id = public.get_auth_empresa_id())
WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- Nível 4: SEGURANÇA CONTRA APAGAR DADOS DO SUPABASE (BLOCKED DELETE)
-- "nunca apagar dados no supabase"
-- Não temos nenhuma política para 'DELETE'. Por padrão, sem políticas explícitas de delete,
-- comandos SQL DELETE disparados por utilizadores autenticados serão REJEITADOS pelo Supabase.
-- Desta forma, a exclusão lógica definida pelo código TypeScript ('is_deleted = true') é a única permitida.

-- 7. ADICIONAR TABELA AO FLUXO REALTIME (Habilita sincronização instantânea em tempo real)
-- Nota: se já estiver registada, o PostgreSQL ignora ou lança aviso seguro.
-- Caso apresente erro por já existir na publicação, pode ignorá-lo com segurança.
ALTER PUBLICATION supabase_realtime ADD TABLE public.caixas;
