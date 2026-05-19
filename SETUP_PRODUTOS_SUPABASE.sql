-- SQL para criar a tabela de produtos e movimentações de stock com RLS
-- Criado em: 2026-05-19
-- Versão: 1.1

BEGIN;

-- 1. Criar a tabela 'produtos' se não existir
CREATE TABLE IF NOT EXISTS public.produtos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id uuid NOT NULL,
    name text NOT NULL,
    referente text,
    barcode text,
    category text,
    tipologia text,
    unit text DEFAULT 'un',
    price numeric DEFAULT 0,
    cost_price numeric DEFAULT 0,
    stock_quantity numeric DEFAULT 0,
    min_stock numeric DEFAULT 0,
    warehouse_id integer,
    image text,
    data_registo timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_produtos_empresa_id ON public.produtos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_produtos_category ON public.produtos(category);

-- 2. Criar a tabela 'movimentacoes_stock' se não existir
CREATE TABLE IF NOT EXISTS public.movimentacoes_stock (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id uuid NOT NULL,
    product_id uuid NOT NULL,
    type text NOT NULL, -- 'entry', 'exit', 'transfer', 'adjustment_plus', 'adjustment_minus'
    quantity numeric NOT NULL,
    unit_price numeric DEFAULT 0,
    previous_stock numeric DEFAULT 0,
    current_stock numeric DEFAULT 0,
    warehouse_id integer,
    to_warehouse_id integer,
    description text,
    reference_id text,
    created_at timestamptz DEFAULT now()
);

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_mov_stock_empresa_id ON public.movimentacoes_stock(empresa_id);
CREATE INDEX IF NOT EXISTS idx_mov_stock_product_id ON public.movimentacoes_stock(product_id);

-- 3. Habilitar RLS
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_stock ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de RLS para 'produtos'
DROP POLICY IF EXISTS "SAAS_TENANT_ISOLATION_produtos_SELECT" ON public.produtos;
DROP POLICY IF EXISTS "SAAS_TENANT_ISOLATION_produtos_INSERT" ON public.produtos;
DROP POLICY IF EXISTS "SAAS_TENANT_ISOLATION_produtos_UPDATE" ON public.produtos;
DROP POLICY IF EXISTS "SAAS_TENANT_ISOLATION_produtos_DELETE" ON public.produtos;

CREATE POLICY "SAAS_TENANT_ISOLATION_produtos_SELECT" ON public.produtos FOR SELECT TO authenticated
USING (empresa_id = COALESCE((auth.jwt() -> 'user_metadata' ->> 'empresa_id')::uuid, (SELECT empresa_id FROM public.perfis WHERE id = auth.uid())));

CREATE POLICY "SAAS_TENANT_ISOLATION_produtos_INSERT" ON public.produtos FOR INSERT TO authenticated
WITH CHECK (empresa_id = COALESCE((auth.jwt() -> 'user_metadata' ->> 'empresa_id')::uuid, (SELECT empresa_id FROM public.perfis WHERE id = auth.uid())));

CREATE POLICY "SAAS_TENANT_ISOLATION_produtos_UPDATE" ON public.produtos FOR UPDATE TO authenticated
USING (empresa_id = COALESCE((auth.jwt() -> 'user_metadata' ->> 'empresa_id')::uuid, (SELECT empresa_id FROM public.perfis WHERE id = auth.uid())))
WITH CHECK (empresa_id = COALESCE((auth.jwt() -> 'user_metadata' ->> 'empresa_id')::uuid, (SELECT empresa_id FROM public.perfis WHERE id = auth.uid())));

CREATE POLICY "SAAS_TENANT_ISOLATION_produtos_DELETE" ON public.produtos FOR DELETE TO authenticated
USING (empresa_id = COALESCE((auth.jwt() -> 'user_metadata' ->> 'empresa_id')::uuid, (SELECT empresa_id FROM public.perfis WHERE id = auth.uid())));

-- 5. Políticas de RLS para 'movimentacoes_stock'
DROP POLICY IF EXISTS "SAAS_TENANT_ISOLATION_mov_stock_SELECT" ON public.movimentacoes_stock;
DROP POLICY IF EXISTS "SAAS_TENANT_ISOLATION_mov_stock_INSERT" ON public.movimentacoes_stock;

CREATE POLICY "SAAS_TENANT_ISOLATION_mov_stock_SELECT" ON public.movimentacoes_stock FOR SELECT TO authenticated
USING (empresa_id = COALESCE((auth.jwt() -> 'user_metadata' ->> 'empresa_id')::uuid, (SELECT empresa_id FROM public.perfis WHERE id = auth.uid())));

CREATE POLICY "SAAS_TENANT_ISOLATION_mov_stock_INSERT" ON public.movimentacoes_stock FOR INSERT TO authenticated
WITH CHECK (empresa_id = COALESCE((auth.jwt() -> 'user_metadata' ->> 'empresa_id')::uuid, (SELECT empresa_id FROM public.perfis WHERE id = auth.uid())));

COMMIT;
