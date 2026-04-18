-- Comprehensive Supabase Schema for FaturaPronta
-- Execute this in the Supabase SQL Editor

-- 1. Professions
CREATE TABLE IF NOT EXISTS public.professions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Employees
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    role TEXT,
    profession_id UUID REFERENCES public.professions(id) ON DELETE SET NULL,
    salary NUMERIC DEFAULT 0,
    email TEXT,
    phone TEXT,
    hired_at DATE,
    nif TEXT,
    address TEXT,
    iban TEXT,
    bank_name TEXT,
    image_url TEXT,
    birth_date DATE,
    gender TEXT,
    marital_status TEXT,
    academic_level TEXT,
    department TEXT,
    bi TEXT,
    contract_type TEXT,
    dependents INTEGER DEFAULT 0,
    subject_to_irt BOOLEAN DEFAULT TRUE,
    subject_to_inss BOOLEAN DEFAULT TRUE,
    bank_account TEXT,
    inss_number TEXT,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Work Sites (Canteiros/Obras)
CREATE TABLE IF NOT EXISTS public.work_sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    start_date DATE,
    end_date DATE,
    title TEXT NOT NULL,
    code TEXT,
    staff_per_day INTEGER DEFAULT 0,
    total_staff INTEGER DEFAULT 0,
    location TEXT,
    description TEXT,
    contact TEXT,
    observations TEXT,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Fiscal Series
CREATE TABLE IF NOT EXISTS public.fiscal_series (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    type TEXT DEFAULT 'normal',
    is_active BOOLEAN DEFAULT TRUE,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Invoices (Documentos)
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    document_type TEXT NOT NULL, -- FT, FR, etc.
    work_site_id UUID REFERENCES public.work_sites(id) ON DELETE SET NULL,
    vat_withholding NUMERIC DEFAULT 0,
    exchange_rate NUMERIC DEFAULT 1,
    currency TEXT DEFAULT 'Kwanza',
    counter_value NUMERIC DEFAULT 0,
    global_discount NUMERIC DEFAULT 0,
    service_date DATE,
    service_location TEXT,
    cash_box TEXT,
    payment_method TEXT,
    series_id UUID REFERENCES public.fiscal_series(id) ON DELETE SET NULL,
    invoice_number TEXT,
    hash TEXT,
    signature TEXT,
    is_certified BOOLEAN DEFAULT FALSE,
    total_amount NUMERIC DEFAULT 0,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Invoice Items
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity NUMERIC DEFAULT 1,
    unit_price NUMERIC DEFAULT 0,
    tax_rate NUMERIC DEFAULT 14,
    discount NUMERIC DEFAULT 0,
    total NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Warehouses
CREATE TABLE IF NOT EXISTS public.warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    location TEXT,
    province TEXT,
    manager TEXT,
    contact TEXT,
    observations TEXT,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Products
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    reference TEXT,
    registration_date DATE DEFAULT CURRENT_DATE,
    warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL,
    document_type TEXT,
    price NUMERIC DEFAULT 0,
    cost_price NUMERIC DEFAULT 0,
    stock_quantity NUMERIC DEFAULT 0,
    image_url TEXT,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. Stock Movements
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'entrada', 'saida', 'transferencia'
    quantity NUMERIC NOT NULL,
    previous_stock NUMERIC,
    current_stock NUMERIC,
    warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL,
    to_warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL,
    description TEXT,
    unit_price NUMERIC,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. Payroll
CREATE TABLE IF NOT EXISTS public.payroll (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    base_salary NUMERIC,
    inss_worker NUMERIC,
    inss_company NUMERIC,
    irt NUMERIC,
    net_salary NUMERIC,
    paid_at TIMESTAMPTZ,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. App Settings
CREATE TABLE IF NOT EXISTS public.app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(key, company_id)
);

-- 12. Caixas
CREATE TABLE IF NOT EXISTS public.caixas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    initial_balance NUMERIC DEFAULT 0,
    current_balance NUMERIC DEFAULT 0,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 13. Caixa Movements
CREATE TABLE IF NOT EXISTS public.caixa_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caixa_id UUID REFERENCES public.caixas(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'entrada', 'saida'
    amount NUMERIC NOT NULL,
    description TEXT,
    date TIMESTAMPTZ DEFAULT now(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for all tables
ALTER TABLE public.professions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_series ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caixas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caixa_movements ENABLE ROW LEVEL SECURITY;

-- Generic Policy function
-- (Assuming public.users mapping is already set up in supabase_setup.sql)

-- You would need to add policies for each table like this:
-- CREATE POLICY "Enforce company access" ON public.employees
--     FOR ALL USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));
