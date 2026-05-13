-- Correção: Criar a função get_auth_empresa_id() que estava em falta para que o RLS e as Caixas funcionem

CREATE OR REPLACE FUNCTION public.get_auth_empresa_id()
RETURNS UUID AS $$
DECLARE
    tenant_id UUID;
BEGIN
    -- 1. Tentar encontrar a empresa através do perfil do utilizador (novo modelo)
    SELECT empresa_id INTO tenant_id
    FROM public.perfis
    WHERE id = auth.uid();

    -- 2. Tentar encontrar a empresa verificando se o utilizador é o owner direto na tabela empresas
    IF tenant_id IS NULL THEN
        SELECT id INTO tenant_id
        FROM public.empresas
        WHERE auth_user_id = auth.uid();
    END IF;

    -- 3. Modo legado: O ID da empresa era diretamente o ID do utilizador
    IF tenant_id IS NULL THEN
        SELECT id INTO tenant_id
        FROM public.empresas
        WHERE id = auth.uid();
    END IF;

    -- 4. Fallback final
    IF tenant_id IS NULL THEN
        tenant_id := auth.uid();
    END IF;

    RETURN tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recarregar o schema caso seja necessário
NOTIFY pgrst, 'reload schema';
