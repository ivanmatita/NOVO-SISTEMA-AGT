-- ==============================================================================
-- ADD MISSING RELATIONS AND COLUMNS (RUN IN SUPABASE SQL EDITOR)
-- ==============================================================================

-- 1. ADD FOREIGN KEY FROM FUNCIONARIOS TO PROFISSOES
ALTER TABLE public.funcionarios
ADD COLUMN IF NOT EXISTS profession_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_funcionarios_profissoes'
    ) THEN
        ALTER TABLE public.funcionarios
        ADD CONSTRAINT fk_funcionarios_profissoes
        FOREIGN KEY (profession_id) REFERENCES public.profissoes(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2. ADD FOREIGN KEY FROM FATURAS TO SERIES_FISCAIS
ALTER TABLE public.faturas
ADD COLUMN IF NOT EXISTS series_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_faturas_series'
    ) THEN
        ALTER TABLE public.faturas
        ADD CONSTRAINT fk_faturas_series
        FOREIGN KEY (series_id) REFERENCES public.series_fiscais(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. ENSURE ALL TABLES HAVE company_id AS FOREIGN KEY
DO $$
BEGIN
    -- For Companies
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_company') THEN
        ALTER TABLE public.users ADD CONSTRAINT fk_users_company FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_funcionarios_company') THEN
        ALTER TABLE public.funcionarios ADD CONSTRAINT fk_funcionarios_company FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_faturas_company') THEN
        ALTER TABLE public.faturas ADD CONSTRAINT fk_faturas_company FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_profissoes_company') THEN
        ALTER TABLE public.profissoes ADD CONSTRAINT fk_profissoes_company FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_series_company') THEN
        ALTER TABLE public.series_fiscais ADD CONSTRAINT fk_series_company FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_clientes_company') THEN
        ALTER TABLE public.clientes ADD CONSTRAINT fk_clientes_company FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 4. ENABLE RLS FOR SPECIFIC SAAS TABLES ONLY (AVOIDS ERROR 42P01 WITH VIEWS)
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN
        SELECT unnest(ARRAY[
            'companies', 'users', 'produtos', 'movimentos_stock',
            'profissoes', 'funcionarios', 'clientes', 'locais_trabalho',
            'series_fiscais', 'faturas', 'itens_fatura', 'transactions'
        ])
    LOOP
        -- Check if it's actually a base table
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t AND table_type = 'BASE TABLE') THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
        END IF;
    END LOOP;
END $$;

-- 5. RELOAD POSTGREST CACHE (CRITICAL FOR SUPABASE TO SEE NEW RELATIONS)
NOTIFY pgrst, 'reload schema';
