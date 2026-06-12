-- AGT Production Setup: Faturação Eletrónica robusta
-- Inclui tabelas necessárias para multi-tenancy e fila de retry.

-- 1. agt_documents (Faturas e Documentos)
CREATE TABLE IF NOT EXISTS public.agt_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    document_no TEXT NOT NULL,
    document_type TEXT NOT NULL,
    document_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT', -- DRAFT, SENT, ACCEPTED, REJECTED
    payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. agt_requests (Log de API AGT)
CREATE TABLE IF NOT EXISTS public.agt_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    document_no TEXT NOT NULL,
    request_id TEXT,
    action TEXT NOT NULL,
    status TEXT NOT NULL,
    payload JSONB,
    response JSONB,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. agt_retry_queue (Fila de Retry)
CREATE TABLE IF NOT EXISTS public.agt_retry_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    document_no TEXT NOT NULL,
    action TEXT NOT NULL,
    attempts INT DEFAULT 0,
    next_retry TIMESTAMPTZ DEFAULT NOW(),
    payload JSONB NOT NULL,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. agt_series (Séries Fiscais)
CREATE TABLE IF NOT EXISTS public.agt_series (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    series_name TEXT NOT NULL,
    series_year INT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS e criar políticas básicas de segurança por empresa_id
ALTER TABLE public.agt_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agt_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agt_retry_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agt_series ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Empresa isolation') THEN
        CREATE POLICY "Empresa isolation" ON public.agt_documents FOR ALL USING (auth.uid() IS NOT NULL AND empresa_id = (SELECT empresa_id FROM public.system_users WHERE user_id = auth.uid()));
        CREATE POLICY "Empresa isolation" ON public.agt_requests FOR ALL USING (auth.uid() IS NOT NULL AND empresa_id = (SELECT empresa_id FROM public.system_users WHERE user_id = auth.uid()));
        CREATE POLICY "Empresa isolation" ON public.agt_retry_queue FOR ALL USING (auth.uid() IS NOT NULL AND empresa_id = (SELECT empresa_id FROM public.system_users WHERE user_id = auth.uid()));
        CREATE POLICY "Empresa isolation" ON public.agt_series FOR ALL USING (auth.uid() IS NOT NULL AND empresa_id = (SELECT empresa_id FROM public.system_users WHERE user_id = auth.uid()));
    END IF;
END $$;
