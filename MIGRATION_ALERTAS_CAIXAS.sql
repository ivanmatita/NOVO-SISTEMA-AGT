-- 🚨 MIGRATION: GESTÃO DE ALERTAS E CAIXAS SaaS
-- Data: 2026-05-17
-- Objetivo: Criar infraestrutura multi-tenant para alertas e caixas com RLS absoluto.

-- 1. TABELA DE ALERTAS
CREATE TABLE IF NOT EXISTS public.alertas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    mensagem TEXT,
    tipo TEXT DEFAULT 'info' CHECK (tipo IN ('danger', 'warning', 'info', 'success')),
    importancia TEXT DEFAULT 'media' CHECK (importancia IN ('baixa', 'media', 'alta')),
    lido BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA DE CAIXAS (GARANTIR ESTRUTURA)
CREATE TABLE IF NOT EXISTS public.caixas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    nome_caixa TEXT NOT NULL,
    moeda TEXT DEFAULT 'AOA',
    status TEXT DEFAULT 'aberto' CHECK (status IN ('aberto', 'fechado')),
    valor_inicial NUMERIC DEFAULT 0,
    current_balance NUMERIC DEFAULT 0,
    responsavel TEXT,
    observacao TEXT,
    utilizador_id TEXT, -- Referência opcional ao utilizador que gere o caixa
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABELA DE MOVIMENTAÇÕES DE CAIXA
CREATE TABLE IF NOT EXISTS public.caixa_movimentacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    caixa_id UUID NOT NULL REFERENCES public.caixas(id) ON DELETE CASCADE,
    target_caixa_id UUID REFERENCES public.caixas(id) ON DELETE SET NULL, -- Para transferências
    type TEXT NOT NULL CHECK (type IN ('entrada', 'saida', 'transferencia')),
    amount NUMERIC NOT NULL DEFAULT 0,
    moeda TEXT DEFAULT 'AOA',
    description TEXT,
    date TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. HABILITAR RLS (ROW LEVEL SECURITY)
ALTER TABLE public.alertas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caixas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caixa_movimentacoes ENABLE ROW LEVEL SECURITY;

-- 5. POLICIES DE ISOLAMENTO (TENANT ISOLATION)
-- Nota: Usamos a tabela 'perfis' para validar a empresa do utilizador logado.

-- Alertas
DROP POLICY IF EXISTS "SaaS_Tenant_Isolation_Alertas" ON public.alertas;
CREATE POLICY "SaaS_Tenant_Isolation_Alertas" ON public.alertas
FOR ALL TO authenticated
USING (empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = auth.uid()))
WITH CHECK (empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = auth.uid()));

-- Caixas
DROP POLICY IF EXISTS "SaaS_Tenant_Isolation_Caixas" ON public.caixas;
CREATE POLICY "SaaS_Tenant_Isolation_Caixas" ON public.caixas
FOR ALL TO authenticated
USING (empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = auth.uid()))
WITH CHECK (empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = auth.uid()));

-- Movimentações
DROP POLICY IF EXISTS "SaaS_Tenant_Isolation_Movimentacoes" ON public.caixa_movimentacoes;
CREATE POLICY "SaaS_Tenant_Isolation_Movimentacoes" ON public.caixa_movimentacoes
FOR ALL TO authenticated
USING (empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = auth.uid()))
WITH CHECK (empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = auth.uid()));

-- 6. ÍNDICES DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_alertas_empresa_id ON public.alertas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_alertas_created_at ON public.alertas(created_at);
CREATE INDEX IF NOT EXISTS idx_caixas_empresa_id ON public.caixas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_caixa_mov_empresa_id ON public.caixa_movimentacoes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_caixa_mov_caixa_id ON public.caixa_movimentacoes(caixa_id);
CREATE INDEX IF NOT EXISTS idx_caixa_mov_date ON public.caixa_movimentacoes(date);

-- 7. TRIGGERS PARA UPDATED_AT
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER tr_alertas_updated_at BEFORE UPDATE ON public.alertas FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();
CREATE TRIGGER tr_caixas_updated_at BEFORE UPDATE ON public.caixas FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- 8. REALTIME CONFIG
-- O Supabase requer que as tabelas sejam adicionadas à publicação 'supabase_realtime' para habilitar o realtime via SDK
-- No entanto, muitas vezes isso já é gerido pelo dashboard. Aqui garantimos via SQL.
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE tablename = 'alertas') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE alertas;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE tablename = 'caixas') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE caixas;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE tablename = 'caixa_movimentacoes') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE caixa_movimentacoes;
  END IF;
END $$;
