-- ADD MISSING COLUMNS
ALTER TABLE public.documentos_relacionados ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.documentos_emitidos ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- REFRESH POLICIES
DROP POLICY IF EXISTS "relacionados_isolation" ON public.documentos_relacionados;
CREATE POLICY "relacionados_isolation" ON public.documentos_relacionados
    FOR ALL USING (deleted_at IS NULL AND empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = auth.uid()));
