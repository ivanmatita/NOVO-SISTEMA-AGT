-- Tabela: hr_processamentos
-- Utilizada para registar o processamento de salários e a emissão de recibos de vencimento por empresa e colaborador.

DROP TABLE IF EXISTS public.hr_processamentos;

CREATE TABLE public.hr_processamentos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    empresa_id UUID NOT NULL,
    colaborador_id TEXT NOT NULL,
    mes_referencia TEXT NOT NULL,
    dados_processamento JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_processed BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(empresa_id, colaborador_id, mes_referencia)
);

-- Ativar Row Level Security (RLS)
ALTER TABLE public.hr_processamentos ENABLE ROW LEVEL SECURITY;

-- Limpar quaisquer políticas que possam ter sido criadas pela interface do Supabase
DROP POLICY IF EXISTS "iso_hr_proc" ON public.hr_processamentos;

-- Políticas de RLS corretas:
-- 1. Permite ver apenas os processamentos da sua empresa
CREATE POLICY "Permitir leitura da sua empresa" 
ON public.hr_processamentos 
FOR SELECT TO authenticated
USING (empresa_id::text = current_setting('request.jwt.claims', true)::jsonb->>'empresa_id' OR empresa_id::text = auth.uid()::text);

-- 2. Permite inserir processamentos na sua empresa
CREATE POLICY "Permitir insercao na sua empresa" 
ON public.hr_processamentos 
FOR INSERT TO authenticated
WITH CHECK (empresa_id::text = current_setting('request.jwt.claims', true)::jsonb->>'empresa_id' OR empresa_id::text = auth.uid()::text);

-- 3. Permite atualizar os seus processamentos
CREATE POLICY "Permitir atualizacao na sua empresa" 
ON public.hr_processamentos 
FOR UPDATE TO authenticated
USING (empresa_id::text = current_setting('request.jwt.claims', true)::jsonb->>'empresa_id' OR empresa_id::text = auth.uid()::text) 
WITH CHECK (empresa_id::text = current_setting('request.jwt.claims', true)::jsonb->>'empresa_id' OR empresa_id::text = auth.uid()::text);

-- 4. Permite apagar (desprocessar) processamentos/recibos
CREATE POLICY "Permitir remocao na sua empresa" 
ON public.hr_processamentos 
FOR DELETE TO authenticated
USING (empresa_id::text = current_setting('request.jwt.claims', true)::jsonb->>'empresa_id' OR empresa_id::text = auth.uid()::text);

-- Adicionar índices para facilitar a pesquisa
CREATE INDEX IF NOT EXISTS idx_hr_proc_empresa ON public.hr_processamentos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_hr_proc_mes_referencia ON public.hr_processamentos(mes_referencia);
