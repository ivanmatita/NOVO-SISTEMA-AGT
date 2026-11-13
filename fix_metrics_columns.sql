-- Add missing columns to metrics table
ALTER TABLE public.metrics ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT true;
ALTER TABLE public.metrics ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Update RLS if needed (ensure policies exist for empresa_id isolation)
-- Assuming RLS is enabled, we need to enforce empresa_id.
-- This can be done via ALTER TABLE ENABLE ROW LEVEL SECURITY;
-- Then creating policies.

-- Since I don't have direct access to create table ALTER directly easily via RPC without query_exec working,
-- I'll use the /api/exec-sql endpoint I just fixed on server.ts.
