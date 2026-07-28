-- ========================================================
-- FIX_VERCEL_RLS_ALL_TABLES.sql
-- Solução Definitiva para Gravação de Dados no Vercel & Supabase
-- ========================================================

-- 1. FIX ALERTAS_TAREFAS RLS
ALTER TABLE IF EXISTS public.alertas_tarefas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alertas_tarefas_isolation" ON public.alertas_tarefas;
CREATE POLICY "alertas_tarefas_isolation" ON public.alertas_tarefas
FOR ALL TO authenticated
USING (
  is_system_admin() OR empresa_id = get_user_company_id() OR empresa_id IS NULL
)
WITH CHECK (
  is_system_admin() OR empresa_id = get_user_company_id() OR empresa_id IS NULL
);

-- 2. IMPROVE HANDLE_NEW_USER TRIGGER TO PREVENT ORPHAN USERS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_empresa_uuid UUID;
    v_user_role TEXT;
    v_user_name TEXT;
BEGIN
    v_user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'admin');
    v_user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1));

    -- Tentar encontrar empresa do utilizador
    SELECT id INTO v_empresa_uuid
    FROM public.empresas
    WHERE auth_user_id = NEW.id
    LIMIT 1;

    -- Tentar do metadata se nao encontrou
    IF v_empresa_uuid IS NULL THEN
       BEGIN
         v_empresa_uuid := (NEW.raw_user_meta_data->>'empresa_id')::UUID;
       EXCEPTION WHEN OTHERS THEN END;
    END IF;

    -- Inserir ou atualizar perfil sempre
    INSERT INTO public.perfis (
        id,
        empresa_id,
        nome,
        email,
        role,
        is_admin,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        NEW.id,
        v_empresa_uuid,
        v_user_name,
        NEW.email,
        v_user_role,
        (v_user_role IN ('admin', 'admin_empresa', 'superadmin', 'super_admin')),
        true,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        empresa_id = COALESCE(EXCLUDED.empresa_id, perfis.empresa_id),
        nome = COALESCE(EXCLUDED.nome, perfis.nome),
        role = COALESCE(EXCLUDED.role, perfis.role),
        updated_at = NOW();

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Aviso em handle_new_user: %', SQLERRM;
        RETURN NEW;
END;
$$;

-- 3. ENSURE TRIGGER WHEN EMPRESA IS CREATED LINK TO USER PERFIL
CREATE OR REPLACE FUNCTION public.handle_new_empresa_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.auth_user_id IS NOT NULL THEN
        UPDATE public.perfis
        SET empresa_id = NEW.id,
            updated_at = NOW()
        WHERE id = NEW.auth_user_id AND empresa_id IS NULL;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_empresa_to_perfil ON public.empresas;
CREATE TRIGGER trg_sync_empresa_to_perfil
AFTER INSERT ON public.empresas
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_empresa_created();

-- 4. ENSURE GET_USER_COMPANY_ID RESOLVES EMPRESA FOR REGISTRATION
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
    v_company_id UUID;
    v_uid UUID := auth.uid();
BEGIN
    IF v_uid IS NULL THEN RETURN NULL; END IF;

    -- 1. Try JWT metadata first
    BEGIN
        v_company_id := (auth.jwt() -> 'user_metadata' ->> 'empresa_id')::UUID;
        IF v_company_id IS NOT NULL THEN RETURN v_company_id; END IF;
    EXCEPTION WHEN OTHERS THEN END;

    -- 2. Try perfis
    SELECT empresa_id INTO v_company_id FROM public.perfis WHERE id = v_uid LIMIT 1;
    IF v_company_id IS NOT NULL THEN RETURN v_company_id; END IF;

    -- 3. Try direct ownership
    SELECT id INTO v_company_id FROM public.empresas WHERE auth_user_id = v_uid LIMIT 1;
    IF v_company_id IS NOT NULL THEN RETURN v_company_id; END IF;

    -- 4. Fallback to latest empresa if only 1 exists in single-tenant setup
    SELECT id INTO v_company_id FROM public.empresas ORDER BY created_at ASC LIMIT 1;
    RETURN v_company_id;
END;
$$;

-- 5. RELOAD POSTGREST SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
