-- 1. Actualização da estrutura da tabela perfis
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS modules_access TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS menu_permissions JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS route_permissions JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS can_view_dashboard BOOLEAN DEFAULT true;
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS can_manage_clients BOOLEAN DEFAULT false;
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS can_manage_sales BOOLEAN DEFAULT false;
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS can_manage_products BOOLEAN DEFAULT false;
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS can_manage_finance BOOLEAN DEFAULT false;
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS can_manage_hr BOOLEAN DEFAULT false;
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS can_manage_stock BOOLEAN DEFAULT false;
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS can_manage_reports BOOLEAN DEFAULT false;
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS can_manage_settings BOOLEAN DEFAULT false;
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS can_manage_users BOOLEAN DEFAULT false;
