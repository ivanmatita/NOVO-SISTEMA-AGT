-- ========================================================
-- FIX FOR RELATION "public.users" DOES NOT EXIST (ERROR 42P01)
-- ========================================================

-- Map public.users view to public.perfis table (with company_id and empresa_id aliases)
CREATE OR REPLACE VIEW public.users AS 
SELECT 
    id,
    empresa_id,
    empresa_id AS company_id,
    nome,
    nome AS name,
    email,
    role,
    is_admin,
    is_active,
    created_at,
    updated_at
FROM public.perfis;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
