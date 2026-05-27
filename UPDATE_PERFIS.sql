-- 1. Adicionar colunas adicionais solicitadas na tabela perfis (se não existirem)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='perfis' AND column_name='permissions') THEN
        ALTER TABLE public.perfis ADD COLUMN permissions JSONB DEFAULT '{}'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='perfis' AND column_name='modules_access') THEN
        ALTER TABLE public.perfis ADD COLUMN modules_access TEXT[] DEFAULT ARRAY[]::TEXT[];
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='perfis' AND column_name='menu_permissions') THEN
        ALTER TABLE public.perfis ADD COLUMN menu_permissions JSONB DEFAULT '{}'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='perfis' AND column_name='route_permissions') THEN
        ALTER TABLE public.perfis ADD COLUMN route_permissions JSONB DEFAULT '{}'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='perfis' AND column_name='can_view_dashboard') THEN
        ALTER TABLE public.perfis ADD COLUMN can_view_dashboard BOOLEAN DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='perfis' AND column_name='can_manage_clients') THEN
        ALTER TABLE public.perfis ADD COLUMN can_manage_clients BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='perfis' AND column_name='can_manage_sales') THEN
        ALTER TABLE public.perfis ADD COLUMN can_manage_sales BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='perfis' AND column_name='can_manage_products') THEN
        ALTER TABLE public.perfis ADD COLUMN can_manage_products BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='perfis' AND column_name='can_manage_finance') THEN
        ALTER TABLE public.perfis ADD COLUMN can_manage_finance BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='perfis' AND column_name='can_manage_hr') THEN
        ALTER TABLE public.perfis ADD COLUMN can_manage_hr BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='perfis' AND column_name='can_manage_stock') THEN
        ALTER TABLE public.perfis ADD COLUMN can_manage_stock BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='perfis' AND column_name='can_manage_reports') THEN
        ALTER TABLE public.perfis ADD COLUMN can_manage_reports BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='perfis' AND column_name='can_manage_settings') THEN
        ALTER TABLE public.perfis ADD COLUMN can_manage_settings BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='perfis' AND column_name='can_manage_users') THEN
        ALTER TABLE public.perfis ADD COLUMN can_manage_users BOOLEAN DEFAULT false;
    END IF;
END $$;
