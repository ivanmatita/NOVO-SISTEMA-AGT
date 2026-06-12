-- SQL para criar a tabela de histórico agt_logs no Supabase
CREATE TABLE IF NOT EXISTS public.agt_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_no TEXT NOT NULL,
    action TEXT NOT NULL,
    request_id TEXT,
    status TEXT NOT NULL,
    response JSONB,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ativar segurança RLS (Row Level Security)
ALTER TABLE public.agt_logs ENABLE ROW LEVEL SECURITY;

-- Adicionar Política para garantir acesso para utilizadores autenticados ou conforme o modelo de Tenant
DROP POLICY IF EXISTS "Acesso total agt_logs" ON public.agt_logs;
CREATE POLICY "Acesso total agt_logs" ON public.agt_logs
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Criar Índices de performance
CREATE INDEX IF NOT EXISTS idx_agt_logs_doc_no ON public.agt_logs(document_no);
CREATE INDEX IF NOT EXISTS idx_agt_logs_status ON public.agt_logs(status);
