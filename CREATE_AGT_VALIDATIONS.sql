-- SQL para criar a tabela de histórico de validação da AGT Angola
CREATE TABLE IF NOT EXISTS public.agt_validations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID,
    document_no TEXT NOT NULL,
    tax_registration_number TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('C', 'R')),
    deductible_vat_percentage NUMERIC(5, 2),
    non_deductible_amount NUMERIC(15, 2),
    submission_timestamp TIMESTAMPTZ NOT NULL,
    action_result_code TEXT,
    document_status_code TEXT,
    error_list JSONB,
    status_validacao TEXT NOT NULL,
    payload_sent JSONB,
    response_received JSONB,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ativar segurança RLS (Row Level Security)
ALTER TABLE public.agt_validations ENABLE ROW LEVEL SECURITY;

-- Adicionar Política para garantir isolamento multi-tenant
DROP POLICY IF EXISTS "Acesso isolado por empresa agt" ON public.agt_validations;
CREATE POLICY "Acesso isolado por empresa agt" ON public.agt_validations
    FOR ALL
    USING (
        empresa_id IS NULL OR 
        empresa_id = (auth.jwt() ->> 'empresa_id')::uuid
    );

-- Criar Índices para Performance de Consultas
CREATE INDEX IF NOT EXISTS idx_agt_val_empresa ON public.agt_validations(empresa_id);
CREATE INDEX IF NOT EXISTS idx_agt_val_doc_no ON public.agt_validations(document_no);
