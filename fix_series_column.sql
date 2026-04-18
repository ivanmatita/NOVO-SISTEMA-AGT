-- ==============================================================================
-- FIX MISSING COLUMNS IN SERIES_FISCAIS
-- ==============================================================================

-- 1. Ensure description column exists in series_fiscais
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'series_fiscais' AND column_name = 'description'
    ) THEN
        ALTER TABLE public.series_fiscais ADD COLUMN description TEXT;
    END IF;
END $$;

-- 2. Update existing null descriptions if any
UPDATE public.series_fiscais SET description = 'Série Geral' WHERE description IS NULL;

-- 3. Reload cache
NOTIFY pgrst, 'reload schema';
