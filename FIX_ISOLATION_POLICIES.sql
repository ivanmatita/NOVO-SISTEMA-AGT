-- Permitir que o proprietário original (auth_user_id) faça SELECT na sua própria empresa,
-- mesmo antes de ter um perfil criado.
DROP POLICY IF EXISTS "Empresas Isolation" ON public.empresas;
CREATE POLICY "Empresas Isolation" ON public.empresas
    FOR SELECT 
    USING (id = public.get_auth_empresa_id() OR auth_user_id = auth.uid());

-- Permitir update também pelo proprietário original
DROP POLICY IF EXISTS "Empresas Update Isolation" ON public.empresas;
CREATE POLICY "Empresas Update Isolation" ON public.empresas
    FOR UPDATE
    USING (id = public.get_auth_empresa_id() OR auth_user_id = auth.uid())
    WITH CHECK (id = public.get_auth_empresa_id() OR auth_user_id = auth.uid());

-- Permitir que o próprio utilizador faça SELECT/UPDATE no seu perfil
DROP POLICY IF EXISTS "Perfis Isolation" ON public.perfis;
CREATE POLICY "Perfis Isolation" ON public.perfis
    FOR ALL
    USING (empresa_id = public.get_auth_empresa_id() OR id = auth.uid());
