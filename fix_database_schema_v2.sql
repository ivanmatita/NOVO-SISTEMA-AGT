-- REMOVE REQUIRMENT OF DELETED_AT IN POLICY
DROP POLICY IF EXISTS "relacionados_isolation" ON public.documentos_relacionados;
CREATE POLICY "relacionados_isolation" ON public.documentos_relacionados
    FOR ALL USING (empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = auth.uid()));
