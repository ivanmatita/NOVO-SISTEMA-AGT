-- ============================================================
-- FIX: Utilizadores criados que aparecem com empresa_id = NULL
-- e company_id = valor correto.
-- O endpoint GET /api/system-users filtra apenas por empresa_id,
-- por isso estes utilizadores ficam invisíveis na listagem.
--
-- Execute este script no SQL Editor do Supabase.
-- ============================================================

-- PASSO 1: Corrigir todos os registos onde empresa_id é NULL
-- mas company_id tem o valor correto.
UPDATE public.perfis
SET empresa_id = company_id
WHERE empresa_id IS NULL
  AND company_id IS NOT NULL;

-- PASSO 2: Garantir que company_id e empresa_id estão sincronizados
-- (copiar empresa_id para company_id onde este está nulo)
UPDATE public.perfis
SET company_id = empresa_id
WHERE company_id IS NULL
  AND empresa_id IS NOT NULL;

-- PASSO 3: Corrigir o trigger handle_new_user para usar empresa_id
-- (coluna actual da tabela perfis)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    empresa_uuid UUID;
BEGIN
    -- Procura se existe uma empresa cujo dono seja o utilizador recém-criado
    SELECT id INTO empresa_uuid
    FROM public.empresas
    WHERE auth_user_id = NEW.id
    LIMIT 1;

    -- Se não encontrar empresa neste exato momento (normal no cadastro SaaS),
    -- o backend tratará de fazer a inserção segura do perfil em seguida.
    IF empresa_uuid IS NULL THEN
        RETURN NEW;
    END IF;

    -- Cria o perfil administrativo usando empresa_id (coluna principal actual)
    INSERT INTO public.perfis (
        id,
        empresa_id,
        company_id,
        nome,
        email,
        role,
        is_admin,
        is_active,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        empresa_uuid,
        empresa_uuid,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'nome', 'Administrador'),
        NEW.email,
        'admin',
        TRUE,
        TRUE,
        NOW(),
        NOW()
    )
    ON CONFLICT (id)
    DO UPDATE SET
        empresa_id = COALESCE(EXCLUDED.empresa_id, public.perfis.empresa_id),
        company_id = COALESCE(EXCLUDED.company_id, public.perfis.company_id),
        nome = COALESCE(EXCLUDED.nome, public.perfis.nome),
        email = COALESCE(EXCLUDED.email, public.perfis.email),
        updated_at = NOW();

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Erro na Trigger handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Recriar trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- PASSO 4: Verificar resultado (mostrar quantos registos foram corrigidos)
SELECT
    COUNT(*) AS total_perfis,
    COUNT(CASE WHEN empresa_id IS NOT NULL THEN 1 END) AS com_empresa_id,
    COUNT(CASE WHEN empresa_id IS NULL THEN 1 END) AS sem_empresa_id,
    COUNT(CASE WHEN company_id IS NOT NULL THEN 1 END) AS com_company_id,
    COUNT(CASE WHEN empresa_id IS NULL AND company_id IS NULL THEN 1 END) AS orfaos_totais
FROM public.perfis;

-- Notificar PostgREST para recarregar cache
NOTIFY pgrst, 'reload schema';
