-- ==============================================================================
-- CASH SESSIONS (Sessões de Caixa)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.cash_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    closed_at TIMESTAMP WITH TIME ZONE,
    initial_balance NUMERIC NOT NULL DEFAULT 0,
    final_balance NUMERIC,
    status TEXT DEFAULT 'open',
    pos_point_id UUID, -- If pos_points table is used, this could be a foreign key
    total_sales NUMERIC DEFAULT 0,
    total_discounts NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_cash_sessions_company ON public.cash_sessions(company_id);

-- SEGURANÇA (RLS)
ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their company's cash sessions" ON public.cash_sessions
    FOR ALL USING (
        company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()) OR company_id IS NULL
    )
    WITH CHECK (
        company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()) OR company_id IS NULL
    );

-- REFRESH CACHE
NOTIFY pgrst, 'reload schema';
