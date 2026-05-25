-- Criação da tabela de Contratos de RH (Multitenant)
CREATE TABLE IF NOT EXISTS public.hr_contratos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    colaborador_id UUID REFERENCES public.colaboradores(id) ON DELETE CASCADE,
    tipo_contrato TEXT,
    data_inicio DATE,
    fim_contrato DATE,
    salario_base NUMERIC,
    documento_html TEXT,
    status TEXT DEFAULT 'ativo',
    dados_contrato JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar Row Level Security (RLS) para isolamento por empresa
ALTER TABLE public.hr_contratos ENABLE ROW LEVEL SECURITY;

-- Excluir política de isolamento anterior se existir, e criar nova
DROP POLICY IF EXISTS iso_hr_contratos ON public.hr_contratos;
CREATE POLICY iso_hr_contratos
ON public.hr_contratos
FOR ALL
TO authenticated
USING (empresa_id = public.get_auth_empresa_id())
WITH CHECK (empresa_id = public.get_auth_empresa_id());

-- Índices de desempenho para buscas aceleradas
CREATE INDEX IF NOT EXISTS idx_hr_contratos_empresa ON public.hr_contratos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_hr_contratos_colaborador ON public.hr_contratos(colaborador_id);

-- Recarregar cache de esquema do PostgREST
NOTIFY pgrst, 'reload schema';
