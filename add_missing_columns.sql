-- RUN THIS IN SUPABASE SQL EDITOR TO FIX TRANSACTION SCHEMA MISSING COLUMNS
-- This adds the 'reference' and 'observation' columns if they are missing.

ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS reference TEXT;

ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS observation TEXT;

-- Also ensure reference_id exists (it was UUID in some versions, TEXT in others. Using UUID for consistency with existing SaaS schema)
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS reference_id UUID;

-- Refresh PostgREST cache
NOTIFY pgrst, 'reload schema';
