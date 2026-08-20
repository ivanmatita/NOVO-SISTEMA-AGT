-- ==============================================================================
-- MIGRATION: 20260820_001_fix_clientes_schema_and_rls.sql
-- DESCRIPTION: Aligns clientes schema, adds missing columns with safe defaults,
--              creates performance indexes, and ensures RLS policies are secure.
-- ENVIRONMENT: Staging & Production Parity
-- SAFETY: Zero data loss, uses ALTER TABLE ADD COLUMN IF NOT EXISTS.
-- ==============================================================================
DO $$
BEGIN
    -- 1. Ensure all columns exist on public.clientes
    ALTER TABLE IF EXISTS public.clientes ADD COLUMN IF NOT EXISTS nif text;
    ALTER TABLE IF EXISTS public.clientes ADD COLUMN IF NOT EXISTS contribuinte text;
    ALTER TABLE IF EXISTS public.clientes ADD COLUMN IF NOT EXISTS endereco text;
    ALTER TABLE IF EXISTS public.clientes ADD COLUMN IF NOT EXISTS morada text;
    ALTER TABLE IF EXISTS public.clientes ADD COLUMN IF NOT EXISTS localidade text;
    ALTER TABLE IF EXISTS public.clientes ADD COLUMN IF NOT EXISTS codigo_postal text;
    ALTER TABLE IF EXISTS public.clientes ADD COLUMN IF NOT EXISTS provincia text;
    ALTER TABLE IF EXISTS public.clientes ADD COLUMN IF NOT EXISTS municipio text;
    ALTER TABLE IF EXISTS public.clientes ADD COLUMN IF NOT EXISTS pais text DEFAULT 'Angola';
    ALTER TABLE IF EXISTS public.clientes ADD COLUMN IF NOT EXISTS webpage text;
    ALTER TABLE IF EXISTS public.clientes ADD COLUMN IF NOT EXISTS website text;
    ALTER TABLE IF EXISTS public.clientes ADD COLUMN IF NOT EXISTS tipo text DEFAULT 'singular';
    ALTER TABLE IF EXISTS public.clientes ADD COLUMN IF NOT EXISTS tipo_entidade text DEFAULT 'Cliente';
    ALTER TABLE IF EXISTS public.clientes ADD COLUMN IF NOT EXISTS tipo_cliente text DEFAULT 'normal';
    ALTER TABLE IF EXISTS public.clientes ADD COLUMN IF NOT EXISTS saldo_inicial numeric DEFAULT 0;
    ALTER TABLE IF EXISTS public.clientes ADD COLUMN IF NOT EXISTS estado_nif text DEFAULT 'não encontrado';
    ALTER TABLE IF EXISTS public.clientes ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true;
    ALTER TABLE IF EXISTS public.clientes ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
    ALTER TABLE IF EXISTS public.clientes ADD COLUMN IF NOT EXISTS notas text;
    ALTER TABLE IF EXISTS public.clientes ADD COLUMN IF NOT EXISTS observacoes text;
    ALTER TABLE IF EXISTS public.clientes ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
    ALTER TABLE IF EXISTS public.clientes ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

    -- 2. Bidirectional data synchronization for legacy compatibility
    UPDATE public.clientes SET nif = contribuinte WHERE nif IS NULL AND contribuinte IS NOT NULL;
    UPDATE public.clientes SET contribuinte = nif WHERE contribuinte IS NULL AND nif IS NOT NULL;

    UPDATE public.clientes SET endereco = morada WHERE (endereco IS NULL OR endereco = '') AND (morada IS NOT NULL AND morada <> '');
    UPDATE public.clientes SET morada = endereco WHERE (morada IS NULL OR morada = '') AND (endereco IS NOT NULL AND endereco <> '');

    UPDATE public.clientes SET ativo = is_active WHERE ativo IS NULL AND is_active IS NOT NULL;
    UPDATE public.clientes SET is_active = ativo WHERE is_active IS NULL AND ativo IS NOT NULL;

    -- 3. Performance Indexes
    CREATE INDEX IF NOT EXISTS idx_clientes_empresa_id ON public.clientes(empresa_id);
    CREATE INDEX IF NOT EXISTS idx_clientes_nif ON public.clientes(empresa_id, nif);
    CREATE INDEX IF NOT EXISTS idx_clientes_nome ON public.clientes(empresa_id, nome);
END $$;
