-- 🚨 FIX CAIXAS: ESTRUTURA, RLS E ÍNDICES
-- Data: 2026-05-17
-- Objetivo: Garantir funcionamento 100% isolado da Tabela de Caixas

-- 1. CRIAR TABELA (Se não existir, preservando dados caso exista)
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
    -- Colunas extras que o front-end pode estar a usar/esperar, caso não existam
    account TEXT,
    moeda TEXT DEFAULT 'AOA',
    status TEXT DEFAULT 'aberto'
);

-- 2. HABILITAR RLS (Row Level Security)
ALTER TABLE public.caixas ENABLE ROW LEVEL SECURITY;

-- 3. VALIDAR POLICY
DROP POLICY IF EXISTS "SAAS_TENANT_ISOLATION_caixas" ON public.caixas;

CREATE POLICY "SAAS_TENANT_ISOLATION_caixas"
ON public.caixas
FOR ALL
TO authenticated
USING (
  empresa_id = (
    SELECT empresa_id
    FROM public.profiles
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  empresa_id = (
    SELECT empresa_id
    FROM public.profiles
    WHERE id = auth.uid()
  )
);

-- 4. PERFORMANCE / ÍNDICES
CREATE INDEX IF NOT EXISTS idx_caixas_empresa_id ON public.caixas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_caixas_created_at ON public.caixas(created_at);

-- 5. REALTIME
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE tablename = 'caixas') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE caixas;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE tablename = 'caixa_movimentacoes') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE caixa_movimentacoes;
  END IF;
END $$;
