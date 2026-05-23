-- ========================================================
-- SCRIPT PARA CRIAR A TABELA 'hr_assiduidade'
-- E CONFIGURAR O ISOLAMENTO DE DADOS POR EMPRESA (SaaS)
-- ========================================================

CREATE TABLE IF NOT EXISTS public.hr_assiduidade (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
    colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE,
    mes_referencia TEXT NOT NULL, -- Ex: "Maio / 2026"
    mapa JSONB NOT NULL DEFAULT '{}', -- { "1": "P", "2": "FI", ... }
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(colaborador_id, mes_referencia)
);

-- HABILITAR RLS
ALTER TABLE public.hr_assiduidade ENABLE ROW LEVEL SECURITY;

-- POLÍTICA DE ISOLAMENTO
DROP POLICY IF EXISTS hr_assiduidade_isolation_policy ON public.hr_assiduidade;

CREATE POLICY hr_assiduidade_isolation_policy
ON public.hr_assiduidade
FOR ALL
TO authenticated
USING (
  empresa_id = public.get_auth_empresa_id()
)
WITH CHECK (
  empresa_id = public.get_auth_empresa_id()
);

-- ÍNDICES
CREATE INDEX IF NOT EXISTS idx_hr_assiduidade_empresa_id ON public.hr_assiduidade(empresa_id);
CREATE INDEX IF NOT EXISTS idx_hr_assiduidade_colaborador_id ON public.hr_assiduidade(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_hr_assiduidade_mes_referencia ON public.hr_assiduidade(mes_referencia);

NOTIFY pgrst, 'reload schema';
