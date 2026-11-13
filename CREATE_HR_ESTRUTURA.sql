-- ====================================================================
-- SCRIPT ÚNICO DEFINITIVO: CRIAÇÃO DA TABELA DE GESTÃO DE CONTRATOS (RH)
-- ====================================================================

-- 1. Criação da Tabela de Contratos associada à tabela de colaboradores
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

-- 2. Habilitação de RLS (Row Level Security) para Isolamento Seguro de Empresas (Tenant)
ALTER TABLE public.hr_contratos ENABLE ROW LEVEL SECURITY;

-- 3. Exclusão e recriação da política de segurança de isolamento
DROP POLICY IF EXISTS hr_contratos_isolation_policy ON public.hr_contratos;

CREATE POLICY hr_contratos_isolation_policy
ON public.hr_contratos
FOR ALL
TO authenticated
USING (
    empresa_id = public.get_auth_empresa_id()
)
WITH CHECK (
    empresa_id = public.get_auth_empresa_id()
);

-- 4. Criação de índices para máxima performance nas consultas e filtragem por empresa
CREATE INDEX IF NOT EXISTS idx_hr_contratos_empresa ON public.hr_contratos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_hr_contratos_colaborador ON public.hr_contratos(colaborador_id);

-- 5. Atualização do cache do PostgREST do Supabase
NOTIFY pgrst, 'reload schema';
