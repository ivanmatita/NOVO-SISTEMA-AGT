-- Add missing columns to empresas table for licensing and admin metadata
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS nome_administrador TEXT;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS email_admin TEXT;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS pacote_licenca TEXT;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS valor_licenca TEXT;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);

-- Reload schema
NOTIFY pgrst, 'reload schema';
