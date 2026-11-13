-- 🚨 SQL DE PRODUÇÃO: FIX MULTIEMPRESA SaaS v2
-- Data: 2026-05-17
-- Objetivo: Garantir isolamento absoluto, performance e realtime para metrics e locais_trabalho

-- 🛠 TAREFA 3 & 4 — HABILITAR RLS E LIMPAR POLICIES INSEGURAS
ALTER TABLE public.metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locais_trabalho ENABLE ROW LEVEL SECURITY;

-- Remover policies públicas antigas (pode variar o nome conforme o sistema)
DROP POLICY IF EXISTS standard_select ON public.metrics;
DROP POLICY IF EXISTS standard_insert ON public.metrics;
DROP POLICY IF EXISTS standard_update ON public.metrics;
DROP POLICY IF EXISTS standard_delete ON public.metrics;

DROP POLICY IF EXISTS standard_select ON public.locais_trabalho;
DROP POLICY IF EXISTS standard_insert ON public.locais_trabalho;
DROP POLICY IF EXISTS standard_update ON public.locais_trabalho;
DROP POLICY IF EXISTS standard_delete ON public.locais_trabalho;

-- Limpar policies de isolamento anteriores para evitar duplicados
DROP POLICY IF EXISTS metrics_isolation ON public.metrics;
DROP POLICY IF EXISTS SAAS_TENANT_ISOLATION_metrics ON public.metrics;
DROP POLICY IF EXISTS locais_isolation ON public.locais_trabalho;
DROP POLICY IF EXISTS SAAS_TENANT_ISOLATION_locais_trabalho ON public.locais_trabalho;

-- 🛠 TAREFA 5 & 6 — POLICIES PROFISSIONAIS
-- Nota: Usamos a tabela 'perfis' que é a existente no sistema para identificar a empresa do utilizador.

CREATE POLICY "SAAS_TENANT_ISOLATION_metrics"
ON public.metrics
FOR ALL
TO authenticated
USING (
  empresa_id = (
    SELECT empresa_id
    FROM public.perfis
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  empresa_id = (
    SELECT empresa_id
    FROM public.perfis
    WHERE id = auth.uid()
  )
);

CREATE POLICY "SAAS_TENANT_ISOLATION_locais_trabalho"
ON public.locais_trabalho
FOR ALL
TO authenticated
USING (
  empresa_id = (
    SELECT empresa_id
    FROM public.perfis
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  empresa_id = (
    SELECT empresa_id
    FROM public.perfis
    WHERE id = auth.uid()
  )
);

-- 🛠 TAREFA 16 — PERFORMANCE (ÍNDICES)
CREATE INDEX IF NOT EXISTS idx_metrics_empresa_id ON public.metrics(empresa_id);
CREATE INDEX IF NOT EXISTS idx_locais_empresa_id ON public.locais_trabalho(empresa_id);
CREATE INDEX IF NOT EXISTS idx_locais_created_at ON public.locais_trabalho(created_at);

-- 🛠 TAREFA 17 & 18 — INTEGRIDADE DE DADOS
-- Garantir que empresa_id nunca é nulo e aponta para a tabela correta
-- ALTER TABLE public.metrics ALTER COLUMN empresa_id SET NOT NULL;
-- ALTER TABLE public.locais_trabalho ALTER COLUMN empresa_id SET NOT NULL;

-- Se existirem dados órfãos, eles devem ser mapeados manualmente antes de ativar as FKs restritivas abaixo
-- ALTER TABLE public.metrics ADD CONSTRAINT fk_metrics_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;
-- ALTER TABLE public.locais_trabalho ADD CONSTRAINT fk_locais_empresa FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;

-- Comentários técnicos:
-- 1. O RLS isola os dados ao nível do motor de base de dados. Mesmo que o frontend falhe, o utilizador não vê dados de outra empresa.
-- 2. O uso de subqueries nas policies pode ser otimizado com funções SECURITY DEFINER se a performance escalar para milhões de registros.
-- 3. Índices em empresa_id são mandatórios para garantir que o lookup do RLS é instantâneo.
