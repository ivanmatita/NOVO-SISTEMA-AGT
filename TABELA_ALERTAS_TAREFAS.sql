-- TABELA DE ALERTAS E TAREFAS SAAS MULTIEMPRESA

CREATE TABLE IF NOT EXISTS public.alertas_tarefas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    name TEXT NOT NULL,
    type TEXT,
    description TEXT,
    responsible TEXT,
    start_date DATE,
    end_date DATE,
    advance_time TEXT,
    obs TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- HABILITAR RLS
ALTER TABLE public.alertas_tarefas ENABLE ROW LEVEL SECURITY;

-- POLICY MULTIEMPRESA
DROP POLICY IF EXISTS "SAAS_TENANT_ISOLATION_alertas_tarefas" ON public.alertas_tarefas;

CREATE POLICY "SAAS_TENANT_ISOLATION_alertas_tarefas"
ON public.alertas_tarefas
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

-- PERFORMANCE / ÍNDICES
CREATE INDEX IF NOT EXISTS idx_alertas_empresa_id ON public.alertas_tarefas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_alertas_created_at ON public.alertas_tarefas(created_at);
CREATE INDEX IF NOT EXISTS idx_alertas_type ON public.alertas_tarefas(type);

-- REALTIME SUPABASE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE tablename = 'alertas_tarefas'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.alertas_tarefas;
  END IF;
END $$;
