-- ==============================================================================
-- MIGRATION: 20261123_001_stock_producao_module.sql
-- DESCRIPTION: Módulo Completo de Produção na Área de Stock (IMATEC ERP)
--              - Expande produtos e movimentacoes_stock com rastreio de origem
--              - Cria public.producoes, public.itens_producao,
--                public.anexos_producao e public.historico_producao
--              - Usa armazem_id/local_trabalho_id/centro_custo_id text para
--                compatibilidade universal entre Staging (UUID) e Produção (int/uuid)
--              - Configura RLS multi-tenant estrito com public.get_auth_empresa_id()
-- SAFETY: 100% idempotente e não-destrutivo. Zero DROP/TRUNCATE/DELETE.
-- ==============================================================================

-- 1. Expandir public.produtos com colunas de rastreabilidade de produção e compras
ALTER TABLE IF EXISTS public.produtos ADD COLUMN IF NOT EXISTS origem text DEFAULT 'MANUAL';
ALTER TABLE IF EXISTS public.produtos ADD COLUMN IF NOT EXISTS producao_id uuid;
ALTER TABLE IF EXISTS public.produtos ADD COLUMN IF NOT EXISTS centro_custo_id text;
ALTER TABLE IF EXISTS public.produtos ADD COLUMN IF NOT EXISTS centro_custo_nome text;
ALTER TABLE IF EXISTS public.produtos ADD COLUMN IF NOT EXISTS tipo_imposto text;
ALTER TABLE IF EXISTS public.produtos ADD COLUMN IF NOT EXISTS rubrica text;
ALTER TABLE IF EXISTS public.produtos ADD COLUMN IF NOT EXISTS ordem text;
ALTER TABLE IF EXISTS public.produtos ADD COLUMN IF NOT EXISTS posicao text;
ALTER TABLE IF EXISTS public.produtos ADD COLUMN IF NOT EXISTS tipo_artigo text;

CREATE INDEX IF NOT EXISTS idx_produtos_empresa_origem ON public.produtos(empresa_id, origem);
CREATE INDEX IF NOT EXISTS idx_produtos_producao_id ON public.produtos(producao_id);

-- 2. Expandir public.movimentacoes_stock com origem e producao_id
ALTER TABLE IF EXISTS public.movimentacoes_stock ADD COLUMN IF NOT EXISTS origem text;
ALTER TABLE IF EXISTS public.movimentacoes_stock ADD COLUMN IF NOT EXISTS producao_id uuid;
CREATE INDEX IF NOT EXISTS idx_movimentacoes_producao ON public.movimentacoes_stock(empresa_id, producao_id);

-- 3. Tabela Principal de Produções
CREATE TABLE IF NOT EXISTS public.producoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  numero_producao text NOT NULL,
  ordem text,
  tipo_producao text NOT NULL DEFAULT 'Produção interna',
  local_trabalho_id text,
  local_trabalho_nome text,
  armazem_id text,
  armazem_nome text,
  estado text NOT NULL DEFAULT 'em_andamento',
  quantidade_produtos integer NOT NULL DEFAULT 0,
  quantidade_total numeric NOT NULL DEFAULT 0,
  valor_total_custo numeric NOT NULL DEFAULT 0,
  valor_total_venda numeric NOT NULL DEFAULT 0,
  bloqueada boolean NOT NULL DEFAULT false,
  bloqueado_por uuid,
  bloqueado_por_nome text,
  bloqueado_em timestamptz,
  desbloqueado_por uuid,
  desbloqueado_por_nome text,
  desbloqueado_em timestamptz,
  responsavel_id uuid,
  responsavel_nome text,
  observacoes text,
  data_registo timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, numero_producao)
);

CREATE INDEX IF NOT EXISTS idx_producoes_empresa_created ON public.producoes(empresa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_producoes_empresa_estado ON public.producoes(empresa_id, estado);
CREATE INDEX IF NOT EXISTS idx_producoes_empresa_armazem ON public.producoes(empresa_id, armazem_id);

-- 4. Itens / Produtos Associados a Cada Produção
CREATE TABLE IF NOT EXISTS public.itens_producao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  producao_id uuid NOT NULL REFERENCES public.producoes(id) ON DELETE CASCADE,
  product_id uuid,
  ordem text,
  posicao text,
  descricao text NOT NULL,
  referencia text NOT NULL,
  quantidade numeric NOT NULL DEFAULT 1,
  valor_custo numeric NOT NULL DEFAULT 0,
  valor_venda numeric NOT NULL DEFAULT 0,
  tipo_artigo text NOT NULL DEFAULT 'Produto Acabado',
  tipologia text,
  armazem_id text,
  armazem_nome text,
  centro_custo_id text,
  centro_custo_nome text,
  tipo_imposto text,
  taxa_imposto numeric DEFAULT 0,
  data_validade date,
  rubrica text,
  rubrica_id text,
  movimento_stock_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_itens_producao_empresa ON public.itens_producao(empresa_id, producao_id);
CREATE INDEX IF NOT EXISTS idx_itens_producao_ref ON public.itens_producao(empresa_id, referencia);
CREATE INDEX IF NOT EXISTS idx_itens_producao_product ON public.itens_producao(product_id);

-- 5. Anexos de Produção (PDF, Excel, Imagens ligadas ao Storage)
CREATE TABLE IF NOT EXISTS public.anexos_producao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  producao_id uuid NOT NULL REFERENCES public.producoes(id) ON DELETE CASCADE,
  nome_original text NOT NULL,
  nome_arquivo text NOT NULL,
  bucket text NOT NULL DEFAULT 'media',
  caminho_arquivo text NOT NULL,
  url_publica text,
  mime_type text,
  tamanho_bytes bigint DEFAULT 0,
  extensao text,
  uploaded_by uuid,
  uploaded_by_nome text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_anexos_producao_empresa ON public.anexos_producao(empresa_id, producao_id);

-- 6. Histórico & Auditoria de Produção (Trancar, Destrancar, Edições, Stock, Relatórios, Uploads)
CREATE TABLE IF NOT EXISTS public.historico_producao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  producao_id uuid NOT NULL REFERENCES public.producoes(id) ON DELETE CASCADE,
  acao text NOT NULL,
  detalhes jsonb DEFAULT '{}'::jsonb,
  usuario_id uuid,
  usuario_nome text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_historico_producao_empresa ON public.historico_producao(empresa_id, producao_id, created_at DESC);

-- 7. Ativar RLS e Aplicar Políticas Multi-Tenant Seguras
DO $$
DECLARE
  t text;
  tbls text[] := ARRAY[
    'producoes',
    'itens_producao',
    'anexos_producao',
    'historico_producao'
  ];
BEGIN
  FOREACH t IN ARRAY tbls LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t || '_tenant_select', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t || '_tenant_insert', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t || '_tenant_update', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', t || '_tenant_delete', t);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (empresa_id = public.get_auth_empresa_id());',
      t || '_tenant_select', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (empresa_id = public.get_auth_empresa_id());',
      t || '_tenant_insert', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (empresa_id = public.get_auth_empresa_id()) WITH CHECK (empresa_id = public.get_auth_empresa_id());',
      t || '_tenant_update', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (empresa_id = public.get_auth_empresa_id());',
      t || '_tenant_delete', t
    );
  END LOOP;
END $$;

-- 8. Recarregar schema PostgREST
NOTIFY pgrst, 'reload schema';
