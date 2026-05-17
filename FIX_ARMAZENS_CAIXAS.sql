-- 🚨 FIX ARMAZÉNS E CAIXAS: RLS ABSOLUTO E ÍNDICES
-- Data: 2026-05-17
-- Objetivo: Garantir isolamento absoluto para Armazéns e Caixas

ALTER TABLE public.caixas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.armazens ENABLE ROW LEVEL SECURITY;

-- Limpar policies existentes
DROP POLICY IF EXISTS "SAAS_TENANT_ISOLATION_caixas" ON public.caixas;
DROP POLICY IF EXISTS "SAAS_TENANT_ISOLATION_armazens" ON public.armazens;

-- Crio as políticas seguras baseadas no perfil do utilizador
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

CREATE POLICY "SAAS_TENANT_ISOLATION_armazens"
ON public.armazens
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

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_caixas_empresa_id ON public.caixas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_armazens_empresa_id ON public.armazens(empresa_id);
CREATE INDEX IF NOT EXISTS idx_caixas_created_at ON public.caixas(created_at);
CREATE INDEX IF NOT EXISTS idx_armazens_created_at ON public.armazens(created_at);

-- Support realtime
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE tablename = 'caixas') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE caixas;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE tablename = 'armazens') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE armazens;
  END IF;
END $$;
