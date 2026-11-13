-- ==============================================================================
-- 🚨 SAAS SCHEMA REPAIR & STANDARDIZATION (FINAL ERP) 🚨
-- Copy and paste this ENTIRE block into the Supabase SQL Editor and click RUN.
-- This ensures all tables, foreign keys, and policies are standardized.
-- ==============================================================================

-- 1. EXTENSÃO UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABELA CLIENTES (FINAL ERP)
-- Standardizing based on user request: no 'address' or 'initial_balance'.
CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  contribuinte VARCHAR(20) NOT NULL UNIQUE,
  nome_cliente VARCHAR(150) NOT NULL,

  morada TEXT,
  localidade VARCHAR(100),
  codigo_postal VARCHAR(20),
  provincia VARCHAR(100),
  municipio VARCHAR(100),
  pais VARCHAR(100) DEFAULT 'Angola',

  telefone VARCHAR(20),
  email VARCHAR(150),

  estado_nif VARCHAR(50),
  webpage TEXT,
  tipo_cliente VARCHAR(50),

  saldo_inicial NUMERIC(12,2) DEFAULT 0,

  company_id UUID,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_clientes_nome ON public.clientes(nome_cliente);
CREATE INDEX IF NOT EXISTS idx_clientes_contribuinte ON public.clientes(contribuinte);
CREATE INDEX IF NOT EXISTS idx_clientes_company ON public.clientes(company_id);

-- 4. RELAÇÃO COM EMPRESA
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_clientes_company'
  ) THEN
    ALTER TABLE public.clientes
    ADD CONSTRAINT fk_clientes_company
    FOREIGN KEY (company_id)
    REFERENCES public.companies(id)
    ON DELETE CASCADE;
  END IF;
END $$;

-- 5. RELAÇÃO FATURAS → CLIENTES
-- Ensure faturas has cliente_id column and it references clientes.id
ALTER TABLE public.faturas ADD COLUMN IF NOT EXISTS cliente_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_faturas_clientes'
  ) THEN
    ALTER TABLE public.faturas
    ADD CONSTRAINT fk_faturas_clientes
    FOREIGN KEY (cliente_id)
    REFERENCES public.clientes(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- 6. RELAÇÃO LOCAIS TRABALHO → CLIENTES
-- Ensure locais_trabalho has cliente_id column and it references clientes.id
ALTER TABLE public.locais_trabalho ADD COLUMN IF NOT EXISTS cliente_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_locais_clientes'
  ) THEN
    ALTER TABLE public.locais_trabalho
    ADD CONSTRAINT fk_locais_clientes
    FOREIGN KEY (cliente_id)
    REFERENCES public.clientes(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- 7. ENABLE RLS FOR CLIENTES
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- Dynamic Policies for Clientes (Multi-tenant)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Access by company_id" ON public.clientes;
    CREATE POLICY "Access by company_id" ON public.clientes
    FOR ALL
    USING (company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()))
    WITH CHECK (company_id = (SELECT company_id FROM public.users WHERE id = auth.uid()));
EXCEPTION
    WHEN undefined_table THEN
        -- Fallback if users table doesn't exist yet
        NULL;
END $$;

-- 8. CACHE SUPABASE
NOTIFY pgrst, 'reload schema';
