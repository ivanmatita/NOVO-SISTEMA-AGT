-- =========================
-- SYSTEM USERS (UTILIZADORES DO SISTEMA)
-- =========================
CREATE TABLE IF NOT EXISTS public.system_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    profession TEXT,
    date DATE,
    permission_area TEXT, -- admin, faturacao, rh, financeiro
    contact TEXT,
    morada TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_system_users_company ON public.system_users(company_id);

-- RLS
ALTER TABLE public.system_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their company's system users" ON public.system_users
    FOR ALL USING (
        company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
    )
    WITH CHECK (
        company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
    );

-- REFRESH
NOTIFY pgrst, 'reload schema';
