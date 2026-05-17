-- 🚨 MIGRATION: GESTÃO DE ALERTAS E CAIXAS SaaS (SEM APAGAR DADOS)
-- Data: 2026-05-17
-- Objetivo: Criar as tabelas (se não existirem) e aplicar o isolamento estrito (RLS) sem apagar nenhuma informação prévia.

-- ==========================================
-- 1. ESTRUTURA DAS TABELAS (IF NOT EXISTS)
-- ==========================================

-- TABELA DE ALERTAS
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

-- TABELA DE CAIXAS
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
    utilizador_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABELA DE MOVIMENTAÇÕES DE CAIXA
CREATE TABLE IF NOT EXISTS public.caixa_movimentacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
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
-- 2. ATIVAÇÃO DE ROW LEVEL SECURITY (RLS)
-- ==========================================
ALTER TABLE public.alertas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caixas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caixa_movimentacoes ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 3. POLÍTICAS DE ISOLAMENTO (TENANT ISOLATION)
-- ==========================================
-- Limpa policies antigas (caso existam) para recriar de forma segura
DROP POLICY IF EXISTS "SaaS_Tenant_Isolation_Alertas" ON public.alertas;
DROP POLICY IF EXISTS "SaaS_Tenant_Isolation_Caixas" ON public.caixas;
DROP POLICY IF EXISTS "SaaS_Tenant_Isolation_Movimentacoes" ON public.caixa_movimentacoes;

-- Criação das políticas seguras baseadas no `empresa_id` do utilizador logado (tabela perfis)
CREATE POLICY "SaaS_Tenant_Isolation_Alertas" ON public.alertas
FOR ALL TO authenticated
USING (empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = auth.uid()))
WITH CHECK (empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = auth.uid()));

CREATE POLICY "SaaS_Tenant_Isolation_Caixas" ON public.caixas
FOR ALL TO authenticated
USING (empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = auth.uid()))
WITH CHECK (empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = auth.uid()));

CREATE POLICY "SaaS_Tenant_Isolation_Movimentacoes" ON public.caixa_movimentacoes
FOR ALL TO authenticated
USING (empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = auth.uid()))
WITH CHECK (empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = auth.uid()));

-- ==========================================
-- 4. ÍNDICES DE PERFORMANCE
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_alertas_empresa_id ON public.alertas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_caixas_empresa_id ON public.caixas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_caixa_mov_empresa_id ON public.caixa_movimentacoes(empresa_id);

-- ==========================================
-- 5. SUPORTE A REALTIME
-- ==========================================
-- Permite que as aplicações frontend "escutem" atualizações em tempo real destas tabelas
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
