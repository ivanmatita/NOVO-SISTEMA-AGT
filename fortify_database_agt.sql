
-- DATABASE FORTIFICATION FOR AGT ERP
-- Objective: Multi-tenancy, Soft-delete, High Security (RLS)

-- 1. ENSURE BASE TABLES EXIST
CREATE TABLE IF NOT EXISTS public.documentos_tipos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT NOT NULL,
    descricao TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.series_fiscais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    serie TEXT NOT NULL
);

-- 2. ADD NECESSARY COLUMNS (Phase 2)
ALTER TABLE public.documentos_tipos ADD COLUMN IF NOT EXISTS empresa_id UUID;
ALTER TABLE public.documentos_tipos ADD COLUMN IF NOT EXISTS requer_origem BOOLEAN DEFAULT false;
ALTER TABLE public.documentos_tipos ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;
ALTER TABLE public.documentos_tipos ADD COLUMN IF NOT EXISTS ordem INTEGER DEFAULT 0;
ALTER TABLE public.documentos_tipos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.documentos_tipos ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.series_fiscais ADD COLUMN IF NOT EXISTS proximo_numero INTEGER DEFAULT 1;
ALTER TABLE public.series_fiscais ADD COLUMN IF NOT EXISTS ultimo_hash TEXT;
ALTER TABLE public.series_fiscais ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;
ALTER TABLE public.series_fiscais ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.series_fiscais ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.series_fiscais ADD COLUMN IF NOT EXISTS tipo TEXT;
ALTER TABLE public.series_fiscais ADD COLUMN IF NOT EXISTS ano INTEGER;

-- 3. RELATED DOCUMENTS
CREATE TABLE IF NOT EXISTS public.documentos_relacionados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL,
    documento_origem_id UUID NOT NULL,
    documento_relacionado_id UUID NOT NULL,
    tipo_relacao TEXT NOT NULL,
    motivo TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    ativo BOOLEAN DEFAULT true
);

-- 4. CONSTRAINTS
ALTER TABLE public.documentos_tipos DROP CONSTRAINT IF EXISTS unique_code_per_tenant;
ALTER TABLE public.documentos_tipos DROP CONSTRAINT IF EXISTS documentos_tipos_codigo_key;
ALTER TABLE public.documentos_tipos ADD CONSTRAINT unique_code_per_tenant UNIQUE (codigo, empresa_id);

-- 5. ENABLE RLS
ALTER TABLE public.documentos_tipos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.series_fiscais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_relacionados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tipos_isolation" ON public.documentos_tipos;
CREATE POLICY "tipos_isolation" ON public.documentos_tipos
    FOR SELECT USING (empresa_id IS NULL OR empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = auth.uid()));

DROP POLICY IF EXISTS "series_isolation" ON public.series_fiscais;
CREATE POLICY "series_isolation" ON public.series_fiscais
    FOR ALL USING (empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = auth.uid()));

DROP POLICY IF EXISTS "relacionados_isolation" ON public.documentos_relacionados;
CREATE POLICY "relacionados_isolation" ON public.documentos_relacionados
    FOR ALL USING (empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = auth.uid()));

-- No Hard Deletes
DROP POLICY IF EXISTS "no_hard_delete_series" ON public.series_fiscais;
CREATE POLICY "no_hard_delete_series" ON public.series_fiscais FOR DELETE USING (false);

DROP POLICY IF EXISTS "no_hard_delete_tipos" ON public.documentos_tipos;
CREATE POLICY "no_hard_delete_tipos" ON public.documentos_tipos FOR DELETE USING (false);

DROP POLICY IF EXISTS "no_hard_delete_relacionados" ON public.documentos_relacionados;
CREATE POLICY "no_hard_delete_relacionados" ON public.documentos_relacionados FOR DELETE USING (false);

-- 6. SEED STANDARD TYPES
INSERT INTO public.documentos_tipos (codigo, descricao, ordem, requer_origem)
VALUES 
('FT', 'Fatura', 1, false),
('FR', 'Fatura Recibo', 2, false),
('RC', 'Recibo', 3, true),
('NC', 'Nota de Crédito', 4, true),
('ND', 'Nota de Débito', 5, true),
('PP', 'Fatura Proforma', 6, false),
('OR', 'Orçamento', 7, false),
('FS', 'Fatura Simplificada', 8, false),
('GR', 'Guia de Remessa', 9, false),
('GT', 'Guia de Transporte', 10, false)
ON CONFLICT (codigo, empresa_id) DO UPDATE 
SET descricao = EXCLUDED.descricao, 
    requer_origem = EXCLUDED.requer_origem, 
    ordem = EXCLUDED.ordem;
