-- ==============================================================================
-- MIGRATION: 20261120_001_crm_negocios_tables.sql
-- DESCRIPTION: Tabelas para CRM Negocios (deals, leads, atividades) com RLS seguro.
-- SAFETY: Idempotente (IF NOT EXISTS), sem perda de dados.
-- ==============================================================================

DO $$
BEGIN
    -- 1. Tabela de Negocios / Deals do CRM
    CREATE TABLE IF NOT EXISTS public.crm_deals (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        empresa_id uuid NOT NULL,
        titulo text NOT NULL,
        cliente_id text,
        cliente_nome text,
        valor numeric DEFAULT 0,
        etapa text DEFAULT 'novo', -- 'novo', 'contactado', 'qualificado', 'proposta', 'ganho', 'perdido'
        probabilidade integer DEFAULT 50,
        data_fecho_prevista date,
        responsavel text,
        observacoes text,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
    );

    -- 2. Tabela de Atividades / Interacoes do CRM
    CREATE TABLE IF NOT EXISTS public.crm_atividades (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        empresa_id uuid NOT NULL,
        deal_id uuid REFERENCES public.crm_deals(id) ON DELETE CASCADE,
        cliente_id text,
        tipo text DEFAULT 'reuniao', -- 'reuniao', 'chamada', 'email', 'proposta', 'tarefa'
        titulo text NOT NULL,
        descricao text,
        data_agendada timestamptz,
        status text DEFAULT 'pendente', -- 'pendente', 'concluido', 'cancelado'
        responsavel text,
        created_at timestamptz DEFAULT now()
    );

    -- 3. Índices de performance
    CREATE INDEX IF NOT EXISTS idx_crm_deals_empresa ON public.crm_deals(empresa_id);
    CREATE INDEX IF NOT EXISTS idx_crm_deals_etapa ON public.crm_deals(empresa_id, etapa);
    CREATE INDEX IF NOT EXISTS idx_crm_atividades_empresa ON public.crm_atividades(empresa_id);
    CREATE INDEX IF NOT EXISTS idx_crm_atividades_deal ON public.crm_atividades(deal_id);

    -- 4. Habilitar RLS
    ALTER TABLE public.crm_deals ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.crm_atividades ENABLE ROW LEVEL SECURITY;

    -- 5. Politicas RLS não-destrutivas (Permissões de tenant)
    DROP POLICY IF EXISTS "crm_deals_empresa_isolation" ON public.crm_deals;
    CREATE POLICY "crm_deals_empresa_isolation" ON public.crm_deals
        FOR ALL USING (
            empresa_id = ((current_setting('request.jwt.claims', true)::jsonb ->> 'empresa_id')::uuid)
            OR (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'authenticated'
        );

    DROP POLICY IF EXISTS "crm_atividades_empresa_isolation" ON public.crm_atividades;
    CREATE POLICY "crm_atividades_empresa_isolation" ON public.crm_atividades
        FOR ALL USING (
            empresa_id = ((current_setting('request.jwt.claims', true)::jsonb ->> 'empresa_id')::uuid)
            OR (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'authenticated'
        );
END $$;
