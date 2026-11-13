-- Update system_users table
ALTER TABLE public.system_users ADD COLUMN IF NOT EXISTS email TEXT;
