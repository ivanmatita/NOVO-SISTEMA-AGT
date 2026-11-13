-- ========================================================
-- SCRIPT PARA CRIAR AS TABELAS 'hr_assiduidade' e 'hr_processamentos'
-- E CONFIGURAR O ISOLAMENTO DE DADOS POR EMPRESA (SaaS)
-- ========================================================

-- 1. Criação da tabela de Assiduidade
CREATE TABLE IF NOT EXISTS public.hr_assiduidade (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
    mes_referencia TEXT NOT NULL, 
    mapa JSONB NOT NULL DEFAULT '{}', 
    is_processed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(colaborador_id, mes_referencia)
);

ALTER TABLE public.hr_assiduidade ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS iso_hr_assiduidade ON public.hr_assiduidade;
CREATE POLICY iso_hr_assiduidade
ON public.hr_assiduidade
FOR ALL
TO authenticated
USING (empresa_id = public.get_auth_empresa_id())
WITH CHECK (empresa_id = public.get_auth_empresa_id());

CREATE INDEX IF NOT EXISTS idx_hr_ass_empresa ON public.hr_assiduidade(empresa_id);

-- 2. Criação da tabela de Processamento de Salários
CREATE TABLE IF NOT EXISTS public.hr_processamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    colaborador_id UUID NOT NULL REFERENCES public.colaboradores(id) ON DELETE CASCADE,
    mes_referencia TEXT NOT NULL,
    dados_processamento JSONB NOT NULL DEFAULT '{}',
    is_processed BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(colaborador_id, mes_referencia)
);

ALTER TABLE public.hr_processamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS iso_hr_proc ON public.hr_processamentos;
CREATE POLICY iso_hr_proc
ON public.hr_processamentos
FOR ALL
TO authenticated
USING (empresa_id = public.get_auth_empresa_id())
WITH CHECK (empresa_id = public.get_auth_empresa_id());

CREATE INDEX IF NOT EXISTS idx_hr_proc_empresa ON public.hr_processamentos(empresa_id);

NOTIFY pgrst, 'reload schema';
