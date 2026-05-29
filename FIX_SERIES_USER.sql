CREATE TABLE IF NOT EXISTS public.series_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    serie_id UUID REFERENCES public.series_fiscais(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.perfis(id) ON DELETE CASCADE,
    empresa_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE
);

ALTER TABLE public.series_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY series_users_isolation_policy ON public.series_users
    FOR ALL TO authenticated
    USING (empresa_id = public.get_auth_empresa_id())
    WITH CHECK (empresa_id = public.get_auth_empresa_id());
