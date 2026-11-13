-- 1. Create companies table
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT, -- tecnologia, comércio, serviços, saúde, educação, outros
    nif TEXT,
    address_street TEXT,
    address_neighborhood TEXT,
    address_municipality TEXT,
    address_province TEXT,
    address_postal_code TEXT,
    address_country TEXT,
    phone TEXT,
    email TEXT,
    admin_name TEXT,
    billing_name TEXT,
    billing_nif TEXT,
    billing_street TEXT,
    billing_neighborhood TEXT,
    billing_municipality TEXT,
    billing_province TEXT,
    billing_postal_code TEXT,
    billing_country TEXT,
    billing_phone TEXT,
    billing_email TEXT,
    promo_code TEXT,
    pre_registration_date TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create users table (public profile)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create clients table
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create workplaces table
CREATE TABLE IF NOT EXISTS public.workplaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workplaces ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users: can only see their own profile
CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Enable insert for users own profile" ON public.users
    FOR INSERT WITH CHECK (true);

-- Companies: users can see their own company
CREATE POLICY "Users can view their own company" ON public.companies
    FOR SELECT USING (
        id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
    );

CREATE POLICY "Enable insert for companies" ON public.companies
    FOR INSERT WITH CHECK (true);

-- Clients: users can manage clients of their company
CREATE POLICY "Users can manage their company's clients" ON public.clients
    FOR ALL USING (
        company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
    )
    WITH CHECK (
        company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
    );

-- Workplaces: users can manage workplaces of their company
CREATE POLICY "Users can manage their company's workplaces" ON public.workplaces
    FOR ALL USING (
        company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
    )
    WITH CHECK (
        company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
    );

-- Automation: Trigger to set company_id automatically
CREATE OR REPLACE FUNCTION public.set_company_id()
RETURNS TRIGGER AS $$
BEGIN
    NEW.company_id := (SELECT company_id FROM public.users WHERE id = auth.uid());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_set_client_company_id
BEFORE INSERT ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.set_company_id();

CREATE TRIGGER tr_set_workplace_company_id
BEFORE INSERT ON public.workplaces
FOR EACH ROW EXECUTE FUNCTION public.set_company_id();
