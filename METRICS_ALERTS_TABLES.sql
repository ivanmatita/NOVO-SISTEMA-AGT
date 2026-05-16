-- ==============================================================================
-- 🚀 SCRIPT PARA CRIAR AS TABELAS DE MÉTRICAS E GESTÃO DE ALERTAS
-- ==============================================================================

-- 1. Tabela Métricas (metrics)
CREATE TABLE IF NOT EXISTS public.metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    sigla TEXT NOT NULL,
    descricao TEXT NOT NULL,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Tabela Alertas / Tarefas (alertas_tarefas)
CREATE TABLE IF NOT EXISTS public.alertas_tarefas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- imposto, seguranca, operacional, geral
    description TEXT,
    responsible TEXT,
    start_date DATE,
    end_date DATE,
    advance_time TEXT,
    obs TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Ativar RLS
ALTER TABLE public.metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertas_tarefas ENABLE ROW LEVEL SECURITY;

-- 4. Criar Políticas de RLS
-- Para metrics:
DROP POLICY IF EXISTS "Metrics Isolation" ON public.metrics;
CREATE POLICY "Metrics Isolation" ON public.metrics
    FOR ALL
    USING (company_id = public.get_auth_empresa_id());

-- Para alertas_tarefas:
DROP POLICY IF EXISTS "Alertas Isolation" ON public.alertas_tarefas;
CREATE POLICY "Alertas Isolation" ON public.alertas_tarefas
    FOR ALL
    USING (company_id = public.get_auth_empresa_id());
