-- ==============================================================================
-- IMATEC ERP - CAIXAS & MOVIMENTAÇÕES (MULTI-TENANT SETUP)
-- ==============================================================================

-- 1. TABELA DE CAIXAS
CREATE TABLE IF NOT EXISTS public.caixas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    nome_caixa TEXT NOT NULL,
    account TEXT, -- Nº Conta / IBAN
    valor_inicial NUMERIC DEFAULT 0,
    current_balance NUMERIC DEFAULT 0,
    responsavel TEXT,
    utilizador_id TEXT, -- ID do utilizador associado (pode ser UUID se referenciar auth.users)
    observacao TEXT,
    status TEXT DEFAULT 'aberto', -- aberto, fechado
    moeda TEXT DEFAULT 'AOA',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. TABELA DE MOVIMENTAÇÕES DE CAIXA
CREATE TABLE IF NOT EXISTS public.caixa_movimentacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    caixa_id UUID NOT NULL REFERENCES public.caixas(id) ON DELETE CASCADE,
    target_caixa_id UUID REFERENCES public.caixas(id) ON DELETE SET NULL, -- Para transferências
    type TEXT NOT NULL, -- entrada, saida, transferencia
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    moeda TEXT DEFAULT 'AOA',
    description TEXT,
    date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. ENABLE RLS
ALTER TABLE public.caixas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caixa_movimentacoes ENABLE ROW LEVEL SECURITY;

-- 4. POLICIES (ISOLAMENTO TOTAL)
-- Função get_auth_empresa_id() já deve existir do SETUP principal.

-- Políticas para CAIXAS
DROP POLICY IF EXISTS "Caixas Isolation" ON public.caixas;
CREATE POLICY "Caixas Isolation" ON public.caixas
    FOR ALL
    USING (company_id = public.get_auth_empresa_id())
    WITH CHECK (company_id = public.get_auth_empresa_id());

-- Políticas para MOVIMENTAÇÕES
DROP POLICY IF EXISTS "Movimentacoes Isolation" ON public.caixa_movimentacoes;
CREATE POLICY "Movimentacoes Isolation" ON public.caixa_movimentacoes
    FOR ALL
    USING (company_id = public.get_auth_empresa_id())
    WITH CHECK (company_id = public.get_auth_empresa_id());

-- 5. INDEXES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_caixas_company ON public.caixas(company_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_company ON public.caixa_movimentacoes(company_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_caixa ON public.caixa_movimentacoes(caixa_id);

-- 6. TRIGGER PARA ATUALIZAR SALDO AUTOMATICAMENTE (Opcional mas recomendado para integridade)
-- No momento faremos via Frontend como solicitado, mas RLS garante que não mudam dados de outros.
    
