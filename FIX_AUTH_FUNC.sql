-- FIX get_auth_empresa_id function to use company_id from perfis
CREATE OR REPLACE FUNCTION public.get_auth_empresa_id()
RETURNS UUID AS $$
DECLARE
    tenant_id UUID;
BEGIN
    -- Try company_id from perfis
    SELECT company_id INTO tenant_id
    FROM public.perfis
    WHERE id = auth.uid();
    
    -- Fallback to empresa_id from profiles
    IF tenant_id IS NULL THEN
        SELECT empresa_id INTO tenant_id
        FROM public.profiles
        WHERE id = auth.uid();
    END IF;

    RETURN tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
