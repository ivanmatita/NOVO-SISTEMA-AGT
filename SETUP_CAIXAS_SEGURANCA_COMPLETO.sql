-- ==================================================================================
-- 🔐 RECRIAÇÃO TOTAL DA TABELA "caixas" COM TODAS AS COLUNAS E REGRAS DE RLS
-- Execute este script completo no Editor SQL do seu painel Supabase (https://supabase.com)
-- ==================================================================================

-- ----------------------------------------------------------------------------------
-- OPÇÃO A: LIMPEZA COMPLETA & RECONSTRUÇÃO DO ZERO (RECOMENDADO PARA CORRIGIR ERROS)
-- ATENÇÃO: Isto apagará as tabelas caixas e caixa_movimentacoes para recriar com a estrutura ideal.
-- ----------------------------------------------------------------------------------
DROP TABLE IF EXISTS public.caixa_movimentacoes CASCADE;
DROP TABLE IF EXISTS public.caixas CASCADE;

-- 1. CRIAR A TABELA "caixas" EXATA E COMPLETA
CREATE TABLE public.caixas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id uuid NOT NULL,
    nome_caixa text NOT NULL,
    codigo_caixa text NOT NULL,                    -- EX: "CX01"
    moeda text NOT NULL DEFAULT 'AOA',              -- EX: "AOA", "USD", "EUR"
    account text DEFAULT '',                        -- Número de Conta / IBAN
    valor_inicial numeric NOT NULL DEFAULT 0,       -- Saldo de abertura
    current_balance numeric NOT NULL DEFAULT 0,     -- Saldo em tempo real
    responsavel text NOT NULL,                      -- Nome do responsável
    utilizador_id uuid,                             -- ID do utilizador associado (pode ser nulo)
    observacao text,                                -- Notas/observações adicionais
    activo boolean NOT NULL DEFAULT true,           -- Se o caixa está ativo
    status text NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'fechado')),
    data_abertura timestamptz DEFAULT now(),
    data_fechamento timestamptz,
    is_deleted boolean NOT NULL DEFAULT false,      -- Soft delete (exclusão lógica)
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. RECONSTRUIR A TABELA "caixa_movimentacoes" VINCULADA À TABELA RECONSTRUÍDA
CREATE TABLE public.caixa_movimentacoes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id uuid NOT NULL,
    caixa_id uuid NOT NULL REFERENCES public.caixas(id) ON DELETE CASCADE,
    target_caixa_id uuid REFERENCES public.caixas(id) ON DELETE SET NULL,
    type text NOT NULL CHECK (type IN ('entrada', 'saida', 'transferencia')),
    amount numeric NOT NULL DEFAULT 0,
    moeda text DEFAULT 'AOA',
    description text,
    date timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now()
);

-- 3. CRIAR ÍNDICES DE ALTA PERFORMANCE (ISOLAMENTO MULTI-TENANT SEGURO)
CREATE INDEX IF NOT EXISTS idx_caixas_empresa_id ON public.caixas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_caixas_is_deleted ON public.caixas(is_deleted);
CREATE INDEX IF NOT EXISTS idx_caixas_activo ON public.caixas(activo);
CREATE INDEX IF NOT EXISTS idx_mov_empresa_id ON public.caixa_movimentacoes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_mov_caixa_id ON public.caixa_movimentacoes(caixa_id);

-- 4. HABILITAR ROW LEVEL SECURITY (RLS) PARA AS DUAS TABELAS
ALTER TABLE public.caixas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caixa_movimentacoes ENABLE ROW LEVEL SECURITY;

-- 5. LIMPAR POLÍTICAS ANTIGAS DA TABELA "caixas" PARA EVITAR CONFLITOS DE SEGURANÇA
DROP POLICY IF EXISTS "caixas_isolation" ON public.caixas;
DROP POLICY IF EXISTS "Select caixas" ON public.caixas;
DROP POLICY IF EXISTS "Insert caixas" ON public.caixas;
DROP POLICY IF EXISTS "Update caixas" ON public.caixas;
DROP POLICY IF EXISTS "Delete caixas" ON public.caixas;
DROP POLICY IF EXISTS "caixas_select_policy" ON public.caixas;
DROP POLICY IF EXISTS "caixas_insert_policy" ON public.caixas;
DROP POLICY IF EXISTS "caixas_update_policy" ON public.caixas;
DROP POLICY IF EXISTS "caixas_delete_policy" ON public.caixas;

-- 6. CRIAR POLÍTICAS DE CONTROLE DE ACESSO E EXCLUSÃO LÓGICA (ISOLAMENTO MULTI-TENANT BRUTAL)

-- SELECT: Permite visualizar apenas registros da empresa do usuário ativo de acordo com RLS
CREATE POLICY "caixas_select_policy" ON public.caixas
FOR SELECT TO authenticated
USING (empresa_id = public.get_auth_empresa_id() AND is_deleted = false);

-- INSERT: Permite inserir caixas garantindo o vínculo com a empresa correta
CREATE POLICY "caixas_insert_policy" ON public.caixas
FOR INSERT TO authenticated
WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- UPDATE: Permite atualizar dados sem violar isolamento multi-tenant
CREATE POLICY "caixas_update_policy" ON public.caixas
FOR UPDATE TO authenticated
USING (empresa_id = public.get_auth_empresa_id())
WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- 7. BLOQUEIO DE DELETE FÍSICO (NUNCA DELETAR REGISTROS DO SUPABASE)
-- Nenhuma política para 'DELETE' é concedida para utilizadores normais autenticados.
-- Adicionalmente, criamos abaixo um TRIGGER de segurança máxima que impede qualquer remoção física (Hard-delete),
-- obrigando o sistema e qualquer operador a realizar apenas Soft-delete lógicos ('is_deleted = true').
CREATE OR REPLACE FUNCTION public.block_physical_delete_caixas()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Erro de Segurança: Exclusão física não permitida! Utilize os mecanismos de exclusão lógica (is_deleted = true) para preservar o histórico de auditoria.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_block_physical_delete_caixas_trigger ON public.caixas;
CREATE TRIGGER trg_block_physical_delete_caixas_trigger
BEFORE DELETE ON public.caixas
FOR EACH ROW
EXECUTE FUNCTION public.block_physical_delete_caixas();

-- 8. APLICAR EXATAMENTE AS MESMAS REGRAS DE SEGURANÇA E RLS NA TABELA DE MOVIMENTAÇÕES
DROP POLICY IF EXISTS "mov_select_policy" ON public.caixa_movimentacoes;
DROP POLICY IF EXISTS "mov_insert_policy" ON public.caixa_movimentacoes;
DROP POLICY IF EXISTS "mov_update_policy" ON public.caixa_movimentacoes;

CREATE POLICY "mov_select_policy" ON public.caixa_movimentacoes
FOR SELECT TO authenticated
USING (empresa_id = public.get_auth_empresa_id());

CREATE POLICY "mov_insert_policy" ON public.caixa_movimentacoes
FOR INSERT TO authenticated
WITH CHECK (empresa_id = public.get_auth_empresa_id());

CREATE POLICY "mov_update_policy" ON public.caixa_movimentacoes
FOR UPDATE TO authenticated
USING (empresa_id = public.get_auth_empresa_id())
WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- 9. ADICIONAR AS TABELAS AO CANAL REALTIME DO SUPABASE PARA ATUALIZAÇÕES INSTANTÂNEAS NO IFRAME
-- Caso já existam na publicação, o PostgreSQL ignora com segurança
ALTER PUBLICATION supabase_realtime ADD TABLE public.caixas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.caixa_movimentacoes;
