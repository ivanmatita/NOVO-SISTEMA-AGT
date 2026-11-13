DROP POLICY IF EXISTS "full_access_company" ON public.documentos_emitidos;
DROP POLICY IF EXISTS "documentos_emitidos_isolation" ON public.documentos_emitidos;

CREATE POLICY "documentos_emitidos_isolation" ON public.documentos_emitidos FOR ALL TO authenticated 
USING (public.is_system_admin() OR empresa_id = public.get_user_company_id()) 
WITH CHECK (public.is_system_admin() OR empresa_id = public.get_user_company_id());
