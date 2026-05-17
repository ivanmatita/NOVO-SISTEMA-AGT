-- 🚨 FIX SESSÕES CAIXA COMPLETO
-- Este script cria a tabela de caixas e movimentações, caso não existam.

-- ==========================================
-- 1. TABELA DE CAIXAS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.caixas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    nome_caixa TEXT NOT NULL,
    valor_inicial NUMERIC DEFAULT 0,
    current_balance NUMERIC DEFAULT 0,
    responsavel TEXT,
    utilizador_id UUID,
    observacao TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    account TEXT,
    moeda TEXT DEFAULT 'AOA',
    status TEXT DEFAULT 'aberto'
);

-- ==========================================
-- 2. TABELA DE MOVIMENTAÇÕES DE CAIXA
-- ==========================================
CREATE TABLE IF NOT EXISTS public.caixa_movimentacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    caixa_id UUID NOT NULL REFERENCES public.caixas(id) ON DELETE CASCADE,
    target_caixa_id UUID REFERENCES public.caixas(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('entrada', 'saida', 'transferencia')),
    amount NUMERIC NOT NULL DEFAULT 0,
    moeda TEXT DEFAULT 'AOA',
    description TEXT,
    date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 3. ROW LEVEL SECURITY (RLS)
-- ==========================================
ALTER TABLE public.caixas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caixa_movimentacoes ENABLE ROW LEVEL SECURITY;

-- CAIXAS POLICY
DROP POLICY IF EXISTS "SAAS_TENANT_ISOLATION_caixas" ON public.caixas;
CREATE POLICY "SAAS_TENANT_ISOLATION_caixas"
ON public.caixas
FOR ALL
TO authenticated
USING (empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = auth.uid()))
WITH CHECK (empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = auth.uid()));

-- MOVIMENTACOES POLICY
DROP POLICY IF EXISTS "SAAS_TENANT_ISOLATION_mov" ON public.caixa_movimentacoes;
CREATE POLICY "SAAS_TENANT_ISOLATION_mov"
ON public.caixa_movimentacoes
FOR ALL
TO authenticated
USING (empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = auth.uid()))
WITH CHECK (empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = auth.uid()));

-- ==========================================
-- 4. ÍNDICES
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_caixas_empresa_id ON public.caixas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_caixamov_empresa_id ON public.caixa_movimentacoes(empresa_id);

-- ==========================================
-- 5. REALTIME
-- ==========================================
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE tablename = 'caixas') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.caixas;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE tablename = 'caixa_movimentacoes') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.caixa_movimentacoes;
  END IF;
END $$;
