-- ========================================================
-- SCRIPT POUR CRIAR A TABELA 'hr_ordens_transferencia'
-- ========================================================

CREATE TABLE IF NOT EXISTS public.hr_ordens_transferencia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    ordem_ref TEXT NOT NULL,
    mes_referencia TEXT NOT NULL,
    data_pagamento DATE NOT NULL,
    caixa_id UUID REFERENCES public.caixas(id) ON DELETE SET NULL,
    caixa_name TEXT,
    employee_count INTEGER,
    total_paid NUMERIC(15,2),
    dados_ordem JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.hr_ordens_transferencia ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS iso_hr_ordens_transferencia ON public.hr_ordens_transferencia;
CREATE POLICY iso_hr_ordens_transferencia
ON public.hr_ordens_transferencia
FOR ALL
TO authenticated
USING (empresa_id = public.get_auth_empresa_id())
WITH CHECK (empresa_id = public.get_auth_empresa_id());

CREATE INDEX IF NOT EXISTS idx_hr_ord_empresa ON public.hr_ordens_transferencia(empresa_id);

NOTIFY pgrst, 'reload schema';
