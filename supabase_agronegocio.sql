-- ================================================================
-- GESTÃO DE AGRONEGÓCIO — SCRIPT SQL UNIFICADO E 100% IDEMPOTENTE
-- Execute este script no SQL Editor do Supabase
-- Resolve erros de RLS e de Triggers que já existem
-- ================================================================

-- 0. EXTENSÕES NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- 1. CRIAR OU ATUALIZAR ESTRUTURA DAS TABELAS
-- ================================================================

-- 1.1 Fazendas
CREATE TABLE IF NOT EXISTS public.agro_fazendas (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id    UUID NOT NULL,
  nome          TEXT NOT NULL,
  provincia     TEXT NOT NULL,
  municipio     TEXT,
  area_total_ha NUMERIC(12,2) DEFAULT 0,
  coordenadas   TEXT,
  tipo          TEXT DEFAULT 'Agrícola',
  tecnico_responsavel TEXT,
  telefone      TEXT,
  observacoes   TEXT,
  ativa         BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  created_by    UUID,
  deleted_at    TIMESTAMPTZ
);

-- 1.2 Culturas
CREATE TABLE IF NOT EXISTS public.agro_culturas (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id          UUID NOT NULL,
  fazenda_id          UUID REFERENCES public.agro_fazendas(id) ON DELETE SET NULL,
  nome                TEXT NOT NULL,
  variedade           TEXT,
  area_ha             NUMERIC(10,2) DEFAULT 0,
  data_plantio        DATE,
  data_colheita_prev  DATE,
  data_colheita_real  DATE,
  status              TEXT DEFAULT 'Planejado',
  est_rendimento_ton  NUMERIC(10,2) DEFAULT 0,
  real_rendimento_ton NUMERIC(10,2),
  custo_producao      NUMERIC(14,2) DEFAULT 0,
  tecnico_responsavel TEXT,
  observacoes         TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  created_by          UUID,
  deleted_at          TIMESTAMPTZ
);

-- 1.3 Animais
CREATE TABLE IF NOT EXISTS public.agro_animais (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id           UUID NOT NULL,
  fazenda_id           UUID REFERENCES public.agro_fazendas(id) ON DELETE SET NULL,
  tipo                 TEXT NOT NULL,
  raca                 TEXT,
  quantidade           INTEGER DEFAULT 0,
  proposito            TEXT DEFAULT 'Corte',
  peso_medio_kg        NUMERIC(8,2),
  valor_mercado_aoa    NUMERIC(14,2),
  data_ultima_vacinacao DATE,
  data_proxima_vacina  DATE,
  numero_lote_sanitario TEXT,
  status               TEXT DEFAULT 'Saudável',
  observacoes          TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  created_by           UUID,
  deleted_at           TIMESTAMPTZ
);

-- 1.4 Insumos
CREATE TABLE IF NOT EXISTS public.agro_insumos (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id        UUID NOT NULL,
  nome              TEXT NOT NULL,
  categoria         TEXT DEFAULT 'Semente',
  fornecedor        TEXT,
  local_armazem     TEXT,
  quantidade_atual  NUMERIC(14,3) DEFAULT 0,
  unidade           TEXT DEFAULT 'kg',
  quantidade_minima NUMERIC(14,3) DEFAULT 0,
  preco_unitario    NUMERIC(14,2) DEFAULT 0,
  numero_lote       TEXT,
  data_validade     DATE,
  observacoes       TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  created_by        UUID,
  deleted_at        TIMESTAMPTZ
);

-- 1.5 Vendas
CREATE TABLE IF NOT EXISTS public.agro_vendas_agro (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id        UUID NOT NULL,
  produto           TEXT NOT NULL,
  cultura_id        UUID REFERENCES public.agro_culturas(id) ON DELETE SET NULL,
  cliente           TEXT NOT NULL,
  quantidade        NUMERIC(14,3) NOT NULL,
  unidade           TEXT DEFAULT 'Ton',
  preco_unitario    NUMERIC(14,2) DEFAULT 0,
  valor_total       NUMERIC(14,2) NOT NULL,
  data_venda        DATE NOT NULL,
  transportadora    TEXT,
  destino           TEXT,
  numero_guia       TEXT,
  status_pagamento  TEXT DEFAULT 'Pendente',
  observacoes       TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  created_by        UUID,
  deleted_at        TIMESTAMPTZ
);

-- 1.6 Maquinaria
CREATE TABLE IF NOT EXISTS public.agro_maquinaria (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id           UUID NOT NULL,
  nome                 TEXT NOT NULL,
  tipo                 TEXT DEFAULT 'Trator',
  marca                TEXT,
  modelo               TEXT,
  ano_fabricacao       INTEGER,
  placa_matricula      TEXT,
  status               TEXT DEFAULT 'Operacional',
  horas_uso            NUMERIC(10,1) DEFAULT 0,
  consumo_medio        TEXT,
  data_ultima_manutencao DATE,
  data_proxima_manutencao DATE,
  custo_manutencao_total NUMERIC(14,2) DEFAULT 0,
  observacoes          TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  created_by           UUID,
  deleted_at           TIMESTAMPTZ
);

-- 1.7 Custos
CREATE TABLE IF NOT EXISTS public.agro_custos (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id    UUID NOT NULL,
  fazenda_id    UUID REFERENCES public.agro_fazendas(id) ON DELETE SET NULL,
  cultura_id    UUID REFERENCES public.agro_culturas(id) ON DELETE SET NULL,
  descricao     TEXT NOT NULL,
  categoria     TEXT DEFAULT 'Mão-de-Obra',
  valor_aoa     NUMERIC(14,2) NOT NULL DEFAULT 0,
  data_custo    DATE NOT NULL DEFAULT CURRENT_DATE,
  observacoes   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  created_by    UUID,
  deleted_at    TIMESTAMPTZ
);

-- ================================================================
-- 2. ÍNDICES DE PERFORMANCE
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_agro_fazendas_empresa   ON public.agro_fazendas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_agro_culturas_empresa   ON public.agro_culturas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_agro_animais_empresa    ON public.agro_animais(empresa_id);
CREATE INDEX IF NOT EXISTS idx_agro_insumos_empresa    ON public.agro_insumos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_agro_vendas_empresa     ON public.agro_vendas_agro(empresa_id);
CREATE INDEX IF NOT EXISTS idx_agro_maquinaria_empresa ON public.agro_maquinaria(empresa_id);
CREATE INDEX IF NOT EXISTS idx_agro_custos_empresa     ON public.agro_custos(empresa_id);

-- ================================================================
-- 3. REMOVER E RECRIAR TRIGGERS DE UPDATED_AT (SEM ERROS)
-- ================================================================
CREATE OR REPLACE FUNCTION public.agro_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_agro_fazendas_updated_at   ON public.agro_fazendas;
DROP TRIGGER IF EXISTS trg_agro_culturas_updated_at   ON public.agro_culturas;
DROP TRIGGER IF EXISTS trg_agro_animais_updated_at    ON public.agro_animais;
DROP TRIGGER IF EXISTS trg_agro_insumos_updated_at    ON public.agro_insumos;
DROP TRIGGER IF EXISTS trg_agro_vendas_updated_at     ON public.agro_vendas_agro;
DROP TRIGGER IF EXISTS trg_agro_maquinaria_updated_at ON public.agro_maquinaria;
DROP TRIGGER IF EXISTS trg_agro_custos_updated_at     ON public.agro_custos;

CREATE TRIGGER trg_agro_fazendas_updated_at   BEFORE UPDATE ON public.agro_fazendas   FOR EACH ROW EXECUTE FUNCTION public.agro_set_updated_at();
CREATE TRIGGER trg_agro_culturas_updated_at   BEFORE UPDATE ON public.agro_culturas   FOR EACH ROW EXECUTE FUNCTION public.agro_set_updated_at();
CREATE TRIGGER trg_agro_animais_updated_at    BEFORE UPDATE ON public.agro_animais    FOR EACH ROW EXECUTE FUNCTION public.agro_set_updated_at();
CREATE TRIGGER trg_agro_insumos_updated_at    BEFORE UPDATE ON public.agro_insumos    FOR EACH ROW EXECUTE FUNCTION public.agro_set_updated_at();
CREATE TRIGGER trg_agro_vendas_updated_at     BEFORE UPDATE ON public.agro_vendas_agro FOR EACH ROW EXECUTE FUNCTION public.agro_set_updated_at();
CREATE TRIGGER trg_agro_maquinaria_updated_at BEFORE UPDATE ON public.agro_maquinaria FOR EACH ROW EXECUTE FUNCTION public.agro_set_updated_at();
CREATE TRIGGER trg_agro_custos_updated_at     BEFORE UPDATE ON public.agro_custos     FOR EACH ROW EXECUTE FUNCTION public.agro_set_updated_at();

-- ================================================================
-- 4. REMOVER E RECRIAR POLÍTICAS RLS PERMISSIVAS
-- ================================================================
DROP POLICY IF EXISTS "agro_fazendas_select"   ON public.agro_fazendas;
DROP POLICY IF EXISTS "agro_fazendas_insert"   ON public.agro_fazendas;
DROP POLICY IF EXISTS "agro_fazendas_update"   ON public.agro_fazendas;
DROP POLICY IF EXISTS "agro_fazendas_delete"   ON public.agro_fazendas;
DROP POLICY IF EXISTS "agro_fazendas_all"      ON public.agro_fazendas;

DROP POLICY IF EXISTS "agro_culturas_select"   ON public.agro_culturas;
DROP POLICY IF EXISTS "agro_culturas_insert"   ON public.agro_culturas;
DROP POLICY IF EXISTS "agro_culturas_update"   ON public.agro_culturas;
DROP POLICY IF EXISTS "agro_culturas_delete"   ON public.agro_culturas;
DROP POLICY IF EXISTS "agro_culturas_all"      ON public.agro_culturas;

DROP POLICY IF EXISTS "agro_animais_select"    ON public.agro_animais;
DROP POLICY IF EXISTS "agro_animais_insert"    ON public.agro_animais;
DROP POLICY IF EXISTS "agro_animais_update"    ON public.agro_animais;
DROP POLICY IF EXISTS "agro_animais_delete"    ON public.agro_animais;
DROP POLICY IF EXISTS "agro_animais_all"       ON public.agro_animais;

DROP POLICY IF EXISTS "agro_insumos_select"    ON public.agro_insumos;
DROP POLICY IF EXISTS "agro_insumos_insert"    ON public.agro_insumos;
DROP POLICY IF EXISTS "agro_insumos_update"    ON public.agro_insumos;
DROP POLICY IF EXISTS "agro_insumos_delete"    ON public.agro_insumos;
DROP POLICY IF EXISTS "agro_insumos_all"       ON public.agro_insumos;

DROP POLICY IF EXISTS "agro_vendas_select"     ON public.agro_vendas_agro;
DROP POLICY IF EXISTS "agro_vendas_insert"     ON public.agro_vendas_agro;
DROP POLICY IF EXISTS "agro_vendas_update"     ON public.agro_vendas_agro;
DROP POLICY IF EXISTS "agro_vendas_delete"     ON public.agro_vendas_agro;
DROP POLICY IF EXISTS "agro_vendas_all"        ON public.agro_vendas_agro;

DROP POLICY IF EXISTS "agro_maquinaria_select" ON public.agro_maquinaria;
DROP POLICY IF EXISTS "agro_maquinaria_insert" ON public.agro_maquinaria;
DROP POLICY IF EXISTS "agro_maquinaria_update" ON public.agro_maquinaria;
DROP POLICY IF EXISTS "agro_maquinaria_delete" ON public.agro_maquinaria;
DROP POLICY IF EXISTS "agro_maquinaria_all"    ON public.agro_maquinaria;

DROP POLICY IF EXISTS "agro_custos_select"     ON public.agro_custos;
DROP POLICY IF EXISTS "agro_custos_insert"     ON public.agro_custos;
DROP POLICY IF EXISTS "agro_custos_update"     ON public.agro_custos;
DROP POLICY IF EXISTS "agro_custos_delete"     ON public.agro_custos;
DROP POLICY IF EXISTS "agro_custos_all"        ON public.agro_custos;

-- ================================================================
-- 5. ATIVAR RLS E DEFINIR POLÍTICAS
-- ================================================================
ALTER TABLE public.agro_fazendas    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agro_culturas    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agro_animais     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agro_insumos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agro_vendas_agro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agro_maquinaria  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agro_custos      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agro_fazendas_all"   ON public.agro_fazendas   FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "agro_culturas_all"   ON public.agro_culturas   FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "agro_animais_all"    ON public.agro_animais    FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "agro_insumos_all"    ON public.agro_insumos    FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "agro_vendas_all"     ON public.agro_vendas_agro FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "agro_maquinaria_all" ON public.agro_maquinaria  FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "agro_custos_all"     ON public.agro_custos     FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- ================================================================
-- 6. CONCEDER PERMISSÕES DOS ROLES
-- ================================================================
GRANT ALL ON public.agro_fazendas    TO authenticated, anon, service_role;
GRANT ALL ON public.agro_culturas    TO authenticated, anon, service_role;
GRANT ALL ON public.agro_animais     TO authenticated, anon, service_role;
GRANT ALL ON public.agro_insumos     TO authenticated, anon, service_role;
GRANT ALL ON public.agro_vendas_agro TO authenticated, anon, service_role;
GRANT ALL ON public.agro_maquinaria  TO authenticated, anon, service_role;
GRANT ALL ON public.agro_custos      TO authenticated, anon, service_role;
