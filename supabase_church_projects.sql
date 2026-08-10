-- ================================================================
-- GESTÃO DE IGREJA & GESTÃO DE PROJETOS — SCRIPT SQL COMPLETO
-- Copie e execute este script no SQL Editor do Supabase
-- Totalmente idempotente: cria tabelas, índices, triggers e RLS
-- ================================================================

-- 0. EXTENSÕES NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================
-- PARTE A: TABELAS DA GESTÃO DE IGREJA
-- ================================================================

-- A.1 Membros
CREATE TABLE IF NOT EXISTS public.church_membros (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id       UUID NOT NULL,
  nome             TEXT NOT NULL,
  cargo            TEXT DEFAULT 'Membro',
  departamento     TEXT,
  telefone         TEXT,
  email            TEXT,
  provincia        TEXT DEFAULT 'Luanda',
  municipio        TEXT,
  data_nascimento  DATE,
  data_baptismo    DATE,
  status           TEXT DEFAULT 'Ativo',
  observacoes      TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  created_by       UUID,
  deleted_at       TIMESTAMPTZ
);

-- A.2 Dízimos e Ofertas
CREATE TABLE IF NOT EXISTS public.church_dizimos_ofertas (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id       UUID NOT NULL,
  membro_id        UUID REFERENCES public.church_membros(id) ON DELETE SET NULL,
  doador_nome      TEXT,
  tipo             TEXT DEFAULT 'Dízimo',  -- Dízimo, Oferta de Culto, Oferta Especial, Fundo de Construção, Missões
  valor_aoa        NUMERIC(14,2) NOT NULL DEFAULT 0,
  data_movimento   DATE NOT NULL DEFAULT CURRENT_DATE,
  metodo_pagamento TEXT DEFAULT 'TPA / Multicaixa',
  referencia       TEXT,
  status           TEXT DEFAULT 'Confirmado',
  observacoes      TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  created_by       UUID,
  deleted_at       TIMESTAMPTZ
);

-- A.3 Cultos e Eventos
CREATE TABLE IF NOT EXISTS public.church_eventos (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id          UUID NOT NULL,
  titulo              TEXT NOT NULL,
  tipo                TEXT DEFAULT 'Culto Dominical',
  data_evento         DATE NOT NULL,
  hora_evento         TIME,
  local               TEXT DEFAULT 'Santuário Principal',
  capacidade_estimada INTEGER DEFAULT 200,
  orcamento_aoa       NUMERIC(14,2) DEFAULT 0,
  status              TEXT DEFAULT 'Agendado',
  descricao           TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  created_by          UUID,
  deleted_at          TIMESTAMPTZ
);

-- A.4 Ministérios
CREATE TABLE IF NOT EXISTS public.church_ministerios (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id        UUID NOT NULL,
  nome              TEXT NOT NULL,
  lider_nome        TEXT,
  total_integrantes INTEGER DEFAULT 1,
  dia_reuniao       TEXT,
  hora_reuniao      TEXT,
  descricao         TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  created_by        UUID,
  deleted_at        TIMESTAMPTZ
);

-- A.5 Património da Igreja
CREATE TABLE IF NOT EXISTS public.church_patrimonio (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id         UUID NOT NULL,
  nome_item          TEXT NOT NULL,
  categoria          TEXT DEFAULT 'Equipamento de Som',
  valor_estimado_aoa NUMERIC(14,2) DEFAULT 0,
  estado_conservacao TEXT DEFAULT 'Bom',
  localizacao        TEXT,
  data_aquisicao     DATE,
  observacoes        TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW(),
  created_by         UUID,
  deleted_at         TIMESTAMPTZ
);


-- ================================================================
-- PARTE B: TABELAS DA GESTÃO DE PROJETOS E OBRAS
-- ================================================================

-- B.1 Projetos
CREATE TABLE IF NOT EXISTS public.proj_projetos (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id             UUID NOT NULL,
  nome                   TEXT NOT NULL,
  cliente                TEXT NOT NULL,
  descricao              TEXT,
  orcamento_total_aoa    NUMERIC(14,2) DEFAULT 0,
  orcamento_executado_aoa NUMERIC(14,2) DEFAULT 0,
  progresso_pct          NUMERIC(5,2) DEFAULT 0,
  data_inicio            DATE,
  data_fim_prevista      DATE,
  status                 TEXT DEFAULT 'Planeamento',
  prioridade             TEXT DEFAULT 'Normal',
  gerente_nome           TEXT,
  categoria              TEXT DEFAULT 'Infraestrutura',
  provincia              TEXT DEFAULT 'Luanda',
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW(),
  created_by             UUID,
  deleted_at             TIMESTAMPTZ
);

-- B.2 Tarefas de Projetos (Kanban)
CREATE TABLE IF NOT EXISTS public.proj_tarefas (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id       UUID NOT NULL,
  projeto_id       UUID REFERENCES public.proj_projetos(id) ON DELETE CASCADE,
  nome             TEXT NOT NULL,
  responsavel_nome TEXT,
  status           TEXT DEFAULT 'Pendente', -- Pendente, Em Progresso, Em Revisão, Concluído
  prioridade       TEXT DEFAULT 'Média',     -- Crítica, Alta, Média, Baixa
  horas_estimadas  NUMERIC(8,2) DEFAULT 8,
  data_limite      DATE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  created_by       UUID,
  deleted_at       TIMESTAMPTZ
);

-- B.3 Equipa e Recursos de Projetos
CREATE TABLE IF NOT EXISTS public.proj_equipa_recursos (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id            UUID NOT NULL,
  nome                  TEXT NOT NULL,
  cargo                 TEXT NOT NULL,
  email                 TEXT,
  custo_hora_aoa        NUMERIC(10,2) DEFAULT 5000,
  disponibilidade_pct   INTEGER DEFAULT 100,
  projetos_ativos_count INTEGER DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  created_by            UUID,
  deleted_at            TIMESTAMPTZ
);

-- B.4 Custos e Orçamentos de Projetos
CREATE TABLE IF NOT EXISTS public.proj_orcamentos_custos (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id       UUID NOT NULL,
  projeto_id       UUID REFERENCES public.proj_projetos(id) ON DELETE SET NULL,
  descricao        TEXT NOT NULL,
  categoria        TEXT DEFAULT 'Materiais', -- Materiais, Mão-de-Obra, Subcontratados, Equipamentos, Licenças, Viagens, Outro
  valor_aoa        NUMERIC(14,2) NOT NULL DEFAULT 0,
  data_custo       DATE NOT NULL DEFAULT CURRENT_DATE,
  status_pagamento TEXT DEFAULT 'Pendente',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  created_by       UUID,
  deleted_at       TIMESTAMPTZ
);

-- B.5 Marcos e Entregáveis (Milestones)
CREATE TABLE IF NOT EXISTS public.proj_marcos_milestones (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id       UUID NOT NULL,
  projeto_id       UUID REFERENCES public.proj_projetos(id) ON DELETE CASCADE,
  titulo           TEXT NOT NULL,
  data_marco       DATE NOT NULL,
  valor_vinc_aoa   NUMERIC(14,2) DEFAULT 0,
  status           TEXT DEFAULT 'Pendente',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  created_by       UUID,
  deleted_at       TIMESTAMPTZ
);

-- ================================================================
-- PARTE C: ÍNDICES DE PERFORMANCE
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_church_membros_empresa   ON public.church_membros(empresa_id);
CREATE INDEX IF NOT EXISTS idx_church_dizimos_empresa   ON public.church_dizimos_ofertas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_church_eventos_empresa   ON public.church_eventos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_church_min_empresa       ON public.church_ministerios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_church_pat_empresa       ON public.church_patrimonio(empresa_id);

CREATE INDEX IF NOT EXISTS idx_proj_projetos_empresa   ON public.proj_projetos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_proj_tarefas_empresa    ON public.proj_tarefas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_proj_recursos_empresa   ON public.proj_equipa_recursos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_proj_custos_empresa     ON public.proj_orcamentos_custos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_proj_marcos_empresa     ON public.proj_marcos_milestones(empresa_id);

-- ================================================================
-- PARTE D: TRIGGERS DE UPDATED_AT (IDEMPOTENTES)
-- ================================================================
CREATE OR REPLACE FUNCTION public.church_proj_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_church_membros_updated   ON public.church_membros;
DROP TRIGGER IF EXISTS trg_church_dizimos_updated   ON public.church_dizimos_ofertas;
DROP TRIGGER IF EXISTS trg_church_eventos_updated   ON public.church_eventos;
DROP TRIGGER IF EXISTS trg_church_ministerios_upd   ON public.church_ministerios;
DROP TRIGGER IF EXISTS trg_church_patrimonio_upd    ON public.church_patrimonio;

DROP TRIGGER IF EXISTS trg_proj_projetos_updated    ON public.proj_projetos;
DROP TRIGGER IF EXISTS trg_proj_tarefas_updated     ON public.proj_tarefas;
DROP TRIGGER IF EXISTS trg_proj_recursos_updated    ON public.proj_equipa_recursos;
DROP TRIGGER IF EXISTS trg_proj_custos_updated      ON public.proj_orcamentos_custos;
DROP TRIGGER IF EXISTS trg_proj_marcos_updated      ON public.proj_marcos_milestones;

CREATE TRIGGER trg_church_membros_updated   BEFORE UPDATE ON public.church_membros         FOR EACH ROW EXECUTE FUNCTION public.church_proj_set_updated_at();
CREATE TRIGGER trg_church_dizimos_updated   BEFORE UPDATE ON public.church_dizimos_ofertas FOR EACH ROW EXECUTE FUNCTION public.church_proj_set_updated_at();
CREATE TRIGGER trg_church_eventos_updated   BEFORE UPDATE ON public.church_eventos         FOR EACH ROW EXECUTE FUNCTION public.church_proj_set_updated_at();
CREATE TRIGGER trg_church_ministerios_upd   BEFORE UPDATE ON public.church_ministerios     FOR EACH ROW EXECUTE FUNCTION public.church_proj_set_updated_at();
CREATE TRIGGER trg_church_patrimonio_upd    BEFORE UPDATE ON public.church_patrimonio      FOR EACH ROW EXECUTE FUNCTION public.church_proj_set_updated_at();

CREATE TRIGGER trg_proj_projetos_updated    BEFORE UPDATE ON public.proj_projetos          FOR EACH ROW EXECUTE FUNCTION public.church_proj_set_updated_at();
CREATE TRIGGER trg_proj_tarefas_updated     BEFORE UPDATE ON public.proj_tarefas           FOR EACH ROW EXECUTE FUNCTION public.church_proj_set_updated_at();
CREATE TRIGGER trg_proj_recursos_updated    BEFORE UPDATE ON public.proj_equipa_recursos    FOR EACH ROW EXECUTE FUNCTION public.church_proj_set_updated_at();
CREATE TRIGGER trg_proj_custos_updated      BEFORE UPDATE ON public.proj_orcamentos_custos  FOR EACH ROW EXECUTE FUNCTION public.church_proj_set_updated_at();
CREATE TRIGGER trg_proj_marcos_updated      BEFORE UPDATE ON public.proj_marcos_milestones  FOR EACH ROW EXECUTE FUNCTION public.church_proj_set_updated_at();

-- ================================================================
-- PARTE E: POLÍTICAS DE RLS PERMISSIVAS & SEGURANÇA
-- ================================================================
ALTER TABLE public.church_membros         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.church_dizimos_ofertas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.church_eventos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.church_ministerios     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.church_patrimonio      ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.proj_projetos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proj_tarefas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proj_equipa_recursos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proj_orcamentos_custos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proj_marcos_milestones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "church_membros_all"   ON public.church_membros;
DROP POLICY IF EXISTS "church_dizimos_all"   ON public.church_dizimos_ofertas;
DROP POLICY IF EXISTS "church_eventos_all"   ON public.church_eventos;
DROP POLICY IF EXISTS "church_ministerios_all" ON public.church_ministerios;
DROP POLICY IF EXISTS "church_patrimonio_all" ON public.church_patrimonio;

DROP POLICY IF EXISTS "proj_projetos_all"   ON public.proj_projetos;
DROP POLICY IF EXISTS "proj_tarefas_all"    ON public.proj_tarefas;
DROP POLICY IF EXISTS "proj_recursos_all"   ON public.proj_equipa_recursos;
DROP POLICY IF EXISTS "proj_custos_all"     ON public.proj_orcamentos_custos;
DROP POLICY IF EXISTS "proj_marcos_all"     ON public.proj_marcos_milestones;

CREATE POLICY "church_membros_all"   ON public.church_membros         FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "church_dizimos_all"   ON public.church_dizimos_ofertas FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "church_eventos_all"   ON public.church_eventos         FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "church_ministerios_all" ON public.church_ministerios   FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "church_patrimonio_all" ON public.church_patrimonio      FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

CREATE POLICY "proj_projetos_all"   ON public.proj_projetos          FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "proj_tarefas_all"    ON public.proj_tarefas           FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "proj_recursos_all"   ON public.proj_equipa_recursos   FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "proj_custos_all"     ON public.proj_orcamentos_custos  FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
CREATE POLICY "proj_marcos_all"     ON public.proj_marcos_milestones  FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- ================================================================
-- PARTE F: CONCESSÃO DE PERMISSÕES DOS ROLES
-- ================================================================
GRANT ALL ON public.church_membros         TO authenticated, anon, service_role;
GRANT ALL ON public.church_dizimos_ofertas TO authenticated, anon, service_role;
GRANT ALL ON public.church_eventos         TO authenticated, anon, service_role;
GRANT ALL ON public.church_ministerios     TO authenticated, anon, service_role;
GRANT ALL ON public.church_patrimonio      TO authenticated, anon, service_role;

GRANT ALL ON public.proj_projetos          TO authenticated, anon, service_role;
GRANT ALL ON public.proj_tarefas           TO authenticated, anon, service_role;
GRANT ALL ON public.proj_equipa_recursos   TO authenticated, anon, service_role;
GRANT ALL ON public.proj_orcamentos_custos TO authenticated, anon, service_role;
GRANT ALL ON public.proj_marcos_milestones TO authenticated, anon, service_role;

-- ================================================================
-- FIM DO SCRIPT
-- ================================================================
