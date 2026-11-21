-- ==============================================================================
-- MIGRATION: 20261120_001_stock_enterprise_evolution.sql
-- DESCRIPTION: Evolução Enterprise Avançada do Módulo de Stock (IMATEC ERP)
--              - Expande produtos, categorias e movimentacoes_stock sem apagar dados
--              - Cria tabelas relacionais com isolamento multi-tenant (empresa_id)
--              - Usa armazem_id text para compatibilidade universal (int em Prod, uuid em Staging)
--              - Configura políticas RLS estritas com get_auth_empresa_id()
--              - Backfill idempotente de stock_saldos por armazém
-- SAFETY: 100% idempotente, zero DROP/TRUNCATE/DELETE destrutivo.
-- ==============================================================================

-- 1. Expandir tabela produtos com colunas enterprise
ALTER TABLE IF EXISTS public.produtos ADD COLUMN IF NOT EXISTS sku text;
ALTER TABLE IF EXISTS public.produtos ADD COLUMN IF NOT EXISTS ean text;
ALTER TABLE IF EXISTS public.produtos ADD COLUMN IF NOT EXISTS subcategoria text;
ALTER TABLE IF EXISTS public.produtos ADD COLUMN IF NOT EXISTS categoria_id uuid;
ALTER TABLE IF EXISTS public.produtos ADD COLUMN IF NOT EXISTS unidade_id uuid;
ALTER TABLE IF EXISTS public.produtos ADD COLUMN IF NOT EXISTS stock_reservado numeric DEFAULT 0;
ALTER TABLE IF EXISTS public.produtos ADD COLUMN IF NOT EXISTS data_validade date;
ALTER TABLE IF EXISTS public.produtos ADD COLUMN IF NOT EXISTS controla_lote boolean DEFAULT false;
ALTER TABLE IF EXISTS public.produtos ADD COLUMN IF NOT EXISTS controla_serie boolean DEFAULT false;
ALTER TABLE IF EXISTS public.produtos ADD COLUMN IF NOT EXISTS lote_padrao text;
ALTER TABLE IF EXISTS public.produtos ADD COLUMN IF NOT EXISTS fornecedor_id uuid;
ALTER TABLE IF EXISTS public.produtos ADD COLUMN IF NOT EXISTS fornecedor_nome text;
ALTER TABLE IF EXISTS public.produtos ADD COLUMN IF NOT EXISTS valorizacao_metodo text DEFAULT 'CMP';
ALTER TABLE IF EXISTS public.produtos ADD COLUMN IF NOT EXISTS observacoes text;
ALTER TABLE IF EXISTS public.produtos ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE IF EXISTS public.produtos ADD COLUMN IF NOT EXISTS updated_by uuid;

-- 2. Expandir tabela categorias (suporte a Categorias & Subcategorias por empresa)
ALTER TABLE IF EXISTS public.categorias ADD COLUMN IF NOT EXISTS empresa_id uuid;
ALTER TABLE IF EXISTS public.categorias ADD COLUMN IF NOT EXISTS nome text;
ALTER TABLE IF EXISTS public.categorias ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE IF EXISTS public.categorias ADD COLUMN IF NOT EXISTS descricao text;
ALTER TABLE IF EXISTS public.categorias ADD COLUMN IF NOT EXISTS parent_id uuid;
ALTER TABLE IF EXISTS public.categorias ADD COLUMN IF NOT EXISTS codigo text;
ALTER TABLE IF EXISTS public.categorias ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true;
ALTER TABLE IF EXISTS public.categorias ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE IF EXISTS public.categorias ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_categorias_empresa_id ON public.categorias(empresa_id);
CREATE INDEX IF NOT EXISTS idx_categorias_parent_id ON public.categorias(parent_id);

-- 3. Expandir tabela movimentacoes_stock com metadados completos para relatórios detalhados
ALTER TABLE IF EXISTS public.movimentacoes_stock ADD COLUMN IF NOT EXISTS product_name text;
ALTER TABLE IF EXISTS public.movimentacoes_stock ADD COLUMN IF NOT EXISTS armazem_origem_id text;
ALTER TABLE IF EXISTS public.movimentacoes_stock ADD COLUMN IF NOT EXISTS armazem_destino_id text;
ALTER TABLE IF EXISTS public.movimentacoes_stock ADD COLUMN IF NOT EXISTS warehouse_name text;
ALTER TABLE IF EXISTS public.movimentacoes_stock ADD COLUMN IF NOT EXISTS to_warehouse_name text;
ALTER TABLE IF EXISTS public.movimentacoes_stock ADD COLUMN IF NOT EXISTS lote_id uuid;
ALTER TABLE IF EXISTS public.movimentacoes_stock ADD COLUMN IF NOT EXISTS lote_codigo text;
ALTER TABLE IF EXISTS public.movimentacoes_stock ADD COLUMN IF NOT EXISTS serial_number text;
ALTER TABLE IF EXISTS public.movimentacoes_stock ADD COLUMN IF NOT EXISTS data_validade date;
ALTER TABLE IF EXISTS public.movimentacoes_stock ADD COLUMN IF NOT EXISTS motivo text;
ALTER TABLE IF EXISTS public.movimentacoes_stock ADD COLUMN IF NOT EXISTS subtipo text;
ALTER TABLE IF EXISTS public.movimentacoes_stock ADD COLUMN IF NOT EXISTS custo_unitario numeric DEFAULT 0;
ALTER TABLE IF EXISTS public.movimentacoes_stock ADD COLUMN IF NOT EXISTS valor_total numeric DEFAULT 0;
ALTER TABLE IF EXISTS public.movimentacoes_stock ADD COLUMN IF NOT EXISTS documento_origem text;
ALTER TABLE IF EXISTS public.movimentacoes_stock ADD COLUMN IF NOT EXISTS numero_documento text;
ALTER TABLE IF EXISTS public.movimentacoes_stock ADD COLUMN IF NOT EXISTS fornecedor_nome text;
ALTER TABLE IF EXISTS public.movimentacoes_stock ADD COLUMN IF NOT EXISTS cliente_nome text;
ALTER TABLE IF EXISTS public.movimentacoes_stock ADD COLUMN IF NOT EXISTS data_documento date;
ALTER TABLE IF EXISTS public.movimentacoes_stock ADD COLUMN IF NOT EXISTS observacoes text;
ALTER TABLE IF EXISTS public.movimentacoes_stock ADD COLUMN IF NOT EXISTS created_by_nome text;
ALTER TABLE IF EXISTS public.movimentacoes_stock ADD COLUMN IF NOT EXISTS created_by_username text;

CREATE INDEX IF NOT EXISTS idx_movimentacoes_empresa_created ON public.movimentacoes_stock(empresa_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_product ON public.movimentacoes_stock(empresa_id, product_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_ref ON public.movimentacoes_stock(empresa_id, reference_id);

-- 4. Unidades de Medida
CREATE TABLE IF NOT EXISTS public.unidades_medida (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  sigla text NOT NULL,
  nome text NOT NULL,
  fator_conversao numeric DEFAULT 1,
  unidade_base text,
  permite_fracao boolean DEFAULT true,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (empresa_id, sigla)
);
CREATE INDEX IF NOT EXISTS idx_unidades_medida_empresa ON public.unidades_medida(empresa_id);

-- 5. Saldos de Stock por Armazém (Disponível, Reservado, Custo Médio)
CREATE TABLE IF NOT EXISTS public.stock_saldos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  product_id uuid NOT NULL,
  armazem_id text NOT NULL,
  quantidade_disponivel numeric DEFAULT 0,
  quantidade_reservada numeric DEFAULT 0,
  custo_medio numeric DEFAULT 0,
  localizacao_corredor text,
  updated_at timestamptz DEFAULT now(),
  UNIQUE (empresa_id, product_id, armazem_id)
);
CREATE INDEX IF NOT EXISTS idx_stock_saldos_empresa_prod ON public.stock_saldos(empresa_id, product_id);
CREATE INDEX IF NOT EXISTS idx_stock_saldos_empresa_arm ON public.stock_saldos(empresa_id, armazem_id);

-- 6. Lotes, Números de Série e Datas de Validade
CREATE TABLE IF NOT EXISTS public.stock_lotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  product_id uuid NOT NULL,
  armazem_id text,
  numero_lote text,
  numero_serie text,
  data_fabrico date,
  data_validade date,
  quantidade_inicial numeric DEFAULT 0,
  quantidade_atual numeric DEFAULT 0,
  custo_unitario numeric DEFAULT 0,
  fornecedor_id uuid,
  fornecedor_nome text,
  estado text DEFAULT 'ativo',
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stock_lotes_empresa_prod ON public.stock_lotes(empresa_id, product_id);
CREATE INDEX IF NOT EXISTS idx_stock_lotes_validade ON public.stock_lotes(empresa_id, data_validade);

-- 7. Transferências entre Armazéns (Fluxo pendente -> aprovada -> concluida / cancelada)
CREATE TABLE IF NOT EXISTS public.stock_transferencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  codigo text NOT NULL,
  product_id uuid NOT NULL,
  product_name text,
  armazem_origem_id text NOT NULL,
  armazem_origem_nome text,
  armazem_destino_id text NOT NULL,
  armazem_destino_nome text,
  quantidade numeric NOT NULL,
  custo_unitario numeric DEFAULT 0,
  valor_total numeric DEFAULT 0,
  estado text DEFAULT 'pendente',
  lote_codigo text,
  observacoes text,
  solicitado_por uuid,
  solicitado_por_nome text,
  aprovado_por uuid,
  aprovado_por_nome text,
  concluido_em timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stock_transferencias_empresa ON public.stock_transferencias(empresa_id, created_at DESC);

-- 8. Inventário Físico & Reconciliação
CREATE TABLE IF NOT EXISTS public.stock_inventarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  codigo text NOT NULL,
  titulo text NOT NULL,
  armazem_id text,
  armazem_nome text,
  estado text DEFAULT 'aberto',
  total_itens integer DEFAULT 0,
  total_divergencias integer DEFAULT 0,
  valor_diferenca numeric DEFAULT 0,
  responsavel_id uuid,
  responsavel_nome text,
  reconciliado_por uuid,
  reconciliado_por_nome text,
  reconciliado_em timestamptz,
  observacoes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stock_inventarios_empresa ON public.stock_inventarios(empresa_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.stock_inventario_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  inventario_id uuid NOT NULL,
  product_id uuid NOT NULL,
  product_name text,
  sku text,
  armazem_id text,
  stock_sistema numeric DEFAULT 0,
  stock_fisico numeric,
  diferenca numeric DEFAULT 0,
  custo_unitario numeric DEFAULT 0,
  valor_diferenca numeric DEFAULT 0,
  justificativa text,
  reconciliado boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stock_inv_itens_inv ON public.stock_inventario_itens(empresa_id, inventario_id);

-- 9. Requisições e Ordens de Compra
CREATE TABLE IF NOT EXISTS public.stock_ordens_compra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  codigo text NOT NULL,
  tipo text DEFAULT 'requisicao',
  fornecedor_id uuid,
  fornecedor_nome text,
  armazem_id text,
  armazem_nome text,
  estado text DEFAULT 'rascunho',
  prioridade text DEFAULT 'normal',
  origem text DEFAULT 'manual',
  itens jsonb DEFAULT '[]'::jsonb,
  subtotal numeric DEFAULT 0,
  imposto numeric DEFAULT 0,
  total numeric DEFAULT 0,
  data_prevista date,
  compra_id uuid,
  observacoes text,
  solicitado_por uuid,
  solicitado_por_nome text,
  aprovado_por uuid,
  aprovado_por_nome text,
  aprovado_em timestamptz,
  recebido_em timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stock_ordens_compra_empresa ON public.stock_ordens_compra(empresa_id, created_at DESC);

-- 10. Alertas de Stock Crítico / Validade / Auditoria
CREATE TABLE IF NOT EXISTS public.stock_alertas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  product_id uuid,
  product_name text,
  armazem_id text,
  tipo text NOT NULL,
  severidade text DEFAULT 'media',
  titulo text NOT NULL,
  mensagem text NOT NULL,
  dados jsonb DEFAULT '{}'::jsonb,
  estado text DEFAULT 'ativo',
  resolvido_por uuid,
  resolvido_em timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stock_alertas_empresa ON public.stock_alertas(empresa_id, estado, created_at DESC);

-- 11. Configurações do Módulo Stock por Empresa
CREATE TABLE IF NOT EXISTS public.stock_configuracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL UNIQUE,
  metodo_valorizacao text DEFAULT 'CMP',
  permitir_stock_negativo boolean DEFAULT false,
  bloquear_venda_sem_stock boolean DEFAULT true,
  dias_alerta_validade integer DEFAULT 30,
  dias_sem_movimento integer DEFAULT 60,
  aprovar_transferencias boolean DEFAULT false,
  aprovar_inventarios boolean DEFAULT true,
  agentes_frequencia_minutos integer DEFAULT 60,
  alerta_email boolean DEFAULT true,
  updated_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 12. Registo de Atividade dos 9 Agentes IA de Stock
CREATE TABLE IF NOT EXISTS public.agentes_ia_atividades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL,
  agente_nome text NOT NULL,
  tipo_evento text NOT NULL,
  titulo text NOT NULL,
  resumo text,
  detalhes jsonb DEFAULT '{}'::jsonb,
  severidade text DEFAULT 'info',
  requer_confirmacao boolean DEFAULT false,
  estado_confirmacao text DEFAULT 'n/a',
  acao_sugerida jsonb,
  executado_por uuid,
  executado_por_nome text,
  executado_em timestamptz,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agentes_ia_empresa ON public.agentes_ia_atividades(empresa_id, created_at DESC);

-- 13. Ativar RLS e Aplicar Políticas Multi-Tenant Seguras
DO $$
DECLARE
  t text;
  tbls text[] := ARRAY[
    'categorias',
    'unidades_medida',
    'stock_saldos',
    'stock_lotes',
    'stock_transferencias',
    'stock_inventarios',
    'stock_inventario_itens',
    'stock_ordens_compra',
    'stock_alertas',
    'stock_configuracoes',
    'agentes_ia_atividades'
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

-- 14. Backfill idempotente e não-destrutivo de stock_saldos a partir de produtos + armazens
INSERT INTO public.stock_saldos (
  empresa_id,
  product_id,
  armazem_id,
  quantidade_disponivel,
  quantidade_reservada,
  custo_medio,
  updated_at
)
SELECT
  p.empresa_id,
  p.id AS product_id,
  COALESCE(
    NULLIF(p.armazem_id::text, ''),
    NULLIF(p.warehouse_id::text, '0'),
    (SELECT a.id::text FROM public.armazens a WHERE a.empresa_id = p.empresa_id ORDER BY a.created_at ASC NULLS LAST, a.id ASC LIMIT 1)
  ) AS armazem_id,
  COALESCE(p.stock_quantity, p.stock, p.stock_atual, 0) AS quantidade_disponivel,
  COALESCE(p.stock_reservado, 0) AS quantidade_reservada,
  COALESCE(p.cost_price, p.preco_compra, p.preco_custo, 0) AS custo_medio,
  now()
FROM public.produtos p
WHERE p.empresa_id IS NOT NULL
  AND COALESCE(
    NULLIF(p.armazem_id::text, ''),
    NULLIF(p.warehouse_id::text, '0'),
    (SELECT a.id::text FROM public.armazens a WHERE a.empresa_id = p.empresa_id ORDER BY a.created_at ASC NULLS LAST, a.id ASC LIMIT 1)
  ) IS NOT NULL
ON CONFLICT (empresa_id, product_id, armazem_id) DO NOTHING;

-- Recarregar schema PostgREST
NOTIFY pgrst, 'reload schema';
