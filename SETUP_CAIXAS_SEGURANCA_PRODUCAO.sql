-- ====================================================================
-- SCRIPT DE IMPLANTAÇÃO DE CONTROLE DE CAIXAS / BANCOS E SEGURANÇA MULTIEMPRESA
-- ====================================================================
-- Este script define a estrutura final e retrocompatível para a tabela "public.caixas"
-- e "public.caixa_movimentacoes" com isolamento total de dados por empresa_id (SaaS),
-- controle de RLS (Row Level Security), prevenção de exclusão física e sincronização inteligente.
-- Execute este script no editor SQL do seu painel do Supabase.

BEGIN;

-- 1. CRIAR TABELA public.caixas (Se não existir)
CREATE TABLE IF NOT EXISTS public.caixas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id uuid NOT NULL,
    nome_caixa text NOT NULL,
    codigo_caixa text NOT NULL,                    -- EX: "CX01"
    moeda text NOT NULL DEFAULT 'AOA',              -- EX: "AOA", "USD", "EUR"
    
    -- Número de Conta / IBAN (Colunas sincronizadas para garantir compatibilidade)
    numero_conta text DEFAULT '',
    account text DEFAULT '',
    
    -- Saldo Inicial / Abertura (Sincronizadas)
    saldo_inicial numeric NOT NULL DEFAULT 0,
    valor_inicial numeric NOT NULL DEFAULT 0,
    
    -- Saldo em Tempo Real (Sincronizadas)
    saldo_actual numeric NOT NULL DEFAULT 0,
    current_balance numeric NOT NULL DEFAULT 0,
    
    -- Responsável do Caixa (Sincronizadas)
    responsavel_caixa text DEFAULT '',
    responsavel text DEFAULT '',
    
    utilizador_id uuid,                             -- ID do utilizador associado (pode ser nulo)
    observacao text,                                -- Notas/observações adicionais
    activo boolean NOT NULL DEFAULT true,           -- Estado operacional (ativo/inactivo)
    status text NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'fechado')),
    data_abertura timestamptz DEFAULT now(),
    data_fechamento timestamptz,
    is_deleted boolean NOT NULL DEFAULT false,      -- Soft Delete (Exclusão lógica do sistema)
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 2. ADICIONAR COLUNAS PARA COMPATIBILIDADE DE SCHEMAS SE CORRER UPGRADE
-- Garante que se a tabela existia antes com menos campos, ela não quebre e receba todos os campos da nova versão.
ALTER TABLE public.caixas ADD COLUMN IF NOT EXISTS numero_conta text DEFAULT '';
ALTER TABLE public.caixas ADD COLUMN IF NOT EXISTS account text DEFAULT '';
ALTER TABLE public.caixas ADD COLUMN IF NOT EXISTS saldo_inicial numeric NOT NULL DEFAULT 0;
ALTER TABLE public.caixas ADD COLUMN IF NOT EXISTS valor_inicial numeric NOT NULL DEFAULT 0;
ALTER TABLE public.caixas ADD COLUMN IF NOT EXISTS saldo_actual numeric NOT NULL DEFAULT 0;
ALTER TABLE public.caixas ADD COLUMN IF NOT EXISTS current_balance numeric NOT NULL DEFAULT 0;
ALTER TABLE public.caixas ADD COLUMN IF NOT EXISTS responsavel_caixa text DEFAULT '';
ALTER TABLE public.caixas ADD COLUMN IF NOT EXISTS responsavel text DEFAULT '';
ALTER TABLE public.caixas ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto', 'fechado'));
ALTER TABLE public.caixas ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;

-- 3. CRIAR TABELA DE MOVIMENTAÇÕES DE CAIXA (public.caixa_movimentacoes)
CREATE TABLE IF NOT EXISTS public.caixa_movimentacoes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id uuid NOT NULL,
    caixa_id uuid NOT NULL REFERENCES public.caixas(id) ON DELETE CASCADE,
    tipo text NOT NULL CHECK (tipo IN ('entrada', 'saida', 'transferencia_origem', 'transferencia_destino')),
    valor numeric NOT NULL CHECK (valor >= 0),
    moeda text NOT NULL DEFAULT 'AOA',
    descricao text NOT NULL,
    data_movimentacao timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now()
);

-- 4. ÍNDICES DE PERFORMANCE DE CONSULTA E ISOLAMENTO MULTIEMPRESA
CREATE INDEX IF NOT EXISTS idx_caixas_empresa ON public.caixas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_caixas_status_is_deleted ON public.caixas(empresa_id, status, is_deleted);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_caixa ON public.caixa_movimentacoes(caixa_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_empresa ON public.caixa_movimentacoes(empresa_id);

-- 5. FUNÇÃO TRIGGER PARA SINCRONIZAÇÃO AUTOMÁTICA DE COMPATIBILIDADE DE COLUNAS
-- Esta função é executada antes de qualquer INSERT ou UPDATE na tabela caixas.
-- Ela detecta qual coluna foi atualizada e espelha o valor para a respectiva coluna compatível.
CREATE OR REPLACE FUNCTION public.sync_caixa_columns_func()
RETURNS TRIGGER AS $$
BEGIN
    -- Sincronizar número de conta e account
    IF (TG_OP = 'INSERT') THEN
        IF (NEW.numero_conta IS NOT NULL AND NEW.numero_conta <> '' AND (NEW.account IS NULL OR NEW.account = '')) THEN
            NEW.account := NEW.numero_conta;
        ELSIF (NEW.account IS NOT NULL AND NEW.account <> '' AND (NEW.numero_conta IS NULL OR NEW.numero_conta = '')) THEN
            NEW.numero_conta := NEW.account;
        END IF;
    ELSE -- TG_OP = 'UPDATE'
        IF (NEW.numero_conta IS DISTINCT FROM OLD.numero_conta) THEN
            NEW.account := COALESCE(NEW.numero_conta, '');
        ELSIF (NEW.account IS DISTINCT FROM OLD.account) THEN
            NEW.numero_conta := COALESCE(NEW.account, '');
        END IF;
    END IF;

    -- Sincronizar saldo_inicial e valor_inicial
    IF (TG_OP = 'INSERT') THEN
        IF (NEW.saldo_inicial <> 0 AND NEW.valor_inicial = 0) THEN
            NEW.valor_inicial := NEW.saldo_inicial;
        ELSIF (NEW.valor_inicial <> 0 AND NEW.saldo_inicial = 0) THEN
            NEW.saldo_inicial := NEW.valor_inicial;
        END IF;
    ELSE -- TG_OP = 'UPDATE'
        IF (NEW.saldo_inicial IS DISTINCT FROM OLD.saldo_inicial) THEN
            NEW.valor_inicial := NEW.saldo_inicial;
        ELSIF (NEW.valor_inicial IS DISTINCT FROM OLD.valor_inicial) THEN
            NEW.saldo_inicial := NEW.valor_inicial;
        END IF;
    END IF;

    -- Sincronizar saldo_actual e current_balance
    IF (TG_OP = 'INSERT') THEN
        IF (NEW.saldo_actual <> 0 AND NEW.current_balance = 0) THEN
            NEW.current_balance := NEW.saldo_actual;
        ELSIF (NEW.current_balance <> 0 AND NEW.saldo_actual = 0) THEN
            NEW.saldo_actual := NEW.current_balance;
        END IF;
    ELSE -- TG_OP = 'UPDATE'
        IF (NEW.saldo_actual IS DISTINCT FROM OLD.saldo_actual) THEN
            NEW.current_balance := NEW.saldo_actual;
        ELSIF (NEW.current_balance IS DISTINCT FROM OLD.current_balance) THEN
            NEW.saldo_actual := NEW.current_balance;
        END IF;
    END IF;

    -- Sincronizar responsavel_caixa e responsavel
    IF (TG_OP = 'INSERT') THEN
        IF (NEW.responsavel_caixa IS NOT NULL AND NEW.responsavel_caixa <> '' AND (NEW.responsavel IS NULL OR NEW.responsavel = '')) THEN
            NEW.responsavel := NEW.responsavel_caixa;
        ELSIF (NEW.responsavel IS NOT NULL AND NEW.responsavel <> '' AND (NEW.responsavel_caixa IS NULL OR NEW.responsavel_caixa = '')) THEN
            NEW.responsavel_caixa := NEW.responsavel;
        END IF;
    ELSE -- TG_OP = 'UPDATE'
        IF (NEW.responsavel_caixa IS DISTINCT FROM OLD.responsavel_caixa) THEN
            NEW.responsavel := COALESCE(NEW.responsavel_caixa, '');
        ELSIF (NEW.responsavel IS DISTINCT FROM OLD.responsavel) THEN
            NEW.responsavel_caixa := COALESCE(NEW.responsavel, '');
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_caixa_columns ON public.caixas;
CREATE TRIGGER trg_sync_caixa_columns
BEFORE INSERT OR UPDATE ON public.caixas
FOR EACH ROW
EXECUTE FUNCTION public.sync_caixa_columns_func();


-- 6. FUNÇÃO TRIGGER PARA IMPEDIR A EXCLUSÃO FÍSICA DE DADOS (SOFT DELETE E AUDITORIA)
-- Bloqueia comandos 'DELETE FROM caixas' disparando um erro direto no PostgreSQL.
CREATE OR REPLACE FUNCTION public.block_physical_delete_caixas()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Aviso de Segurança: Exclusão física não permitida! Utilize exclusão lógica (mudar is_deleted para true) para manter a integridade fiscal dos registos de caixa.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_block_delete_caixas ON public.caixas;
CREATE TRIGGER trg_block_delete_caixas
BEFORE DELETE ON public.caixas
FOR EACH ROW
EXECUTE FUNCTION public.block_physical_delete_caixas();


-- 7. REGRAS E POLÍTICAS DE RLS (ROW LEVEL SECURITY) MULTIEMPRESA SEGURO
-- Habilita Row Level Security nas tabelas de caixas para que usuários vinculados a uma empresa não visualizem caixas de outras empresas.
ALTER TABLE public.caixas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caixa_movimentacoes ENABLE ROW LEVEL SECURITY;

-- Excluir políticas antigas para evitar duplicidade ou conflitos
DROP POLICY IF EXISTS "caixas_select_policy" ON public.caixas;
DROP POLICY IF EXISTS "caixas_insert_policy" ON public.caixas;
DROP POLICY IF EXISTS "caixas_update_policy" ON public.caixas;
DROP POLICY IF EXISTS "caixas_delete_policy" ON public.caixas;

DROP POLICY IF EXISTS "mov_select_policy" ON public.caixa_movimentacoes;
DROP POLICY IF EXISTS "mov_insert_policy" ON public.caixa_movimentacoes;
DROP POLICY IF EXISTS "mov_update_policy" ON public.caixa_movimentacoes;

-- SELECT POLITICAS (Apenas registros da própria empresa autenticada e que não foram deletados de forma lógica)
CREATE POLICY "caixas_select_policy" ON public.caixas
FOR SELECT TO authenticated
USING (empresa_id = public.get_auth_empresa_id() AND is_deleted = false);

CREATE POLICY "mov_select_policy" ON public.caixa_movimentacoes
FOR SELECT TO authenticated
USING (empresa_id = public.get_auth_empresa_id());

-- INSERT POLITICAS (Injetar garantindo pertencer à empresa do usuário autenticado)
CREATE POLICY "caixas_insert_policy" ON public.caixas
FOR INSERT TO authenticated
WITH CHECK (empresa_id = public.get_auth_empresa_id());

CREATE POLICY "mov_insert_policy" ON public.caixa_movimentacoes
FOR INSERT TO authenticated
WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- UPDATE POLITICAS (Permitido atualizar apenas para a própria empresa de login)
CREATE POLICY "caixas_update_policy" ON public.caixas
FOR UPDATE TO authenticated
USING (empresa_id = public.get_auth_empresa_id())
WITH CHECK (empresa_id = public.get_auth_empresa_id());

CREATE POLICY "mov_update_policy" ON public.caixa_movimentacoes
FOR UPDATE TO authenticated
USING (empresa_id = public.get_auth_empresa_id())
WITH CHECK (empresa_id = public.get_auth_empresa_id());

COMMIT;
