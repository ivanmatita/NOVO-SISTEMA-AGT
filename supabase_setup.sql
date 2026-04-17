-- ATENÇÃO: Execute este script no SQL Editor do seu painel Supabase.

-- 1. Tabela Companies
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT,
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
  pre_registration_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela Users
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY, -- linked to auth.users.id
  email TEXT NOT NULL,
  username TEXT,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela Clients
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  nif TEXT,
  address TEXT,
  localidade TEXT,
  codigo_postal TEXT,
  provincia TEXT,
  municipio TEXT,
  pais TEXT,
  telefone TEXT,
  webpage TEXT,
  tipo_cliente TEXT,
  initial_balance NUMERIC DEFAULT 0,
  estado_nif TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela Workplaces
CREATE TABLE IF NOT EXISTS public.workplaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ATIVAÇÃO DA SEGURANÇA RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workplaces ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS
-- Os utilizadores podem criar empresas na fase de registo
CREATE POLICY "Permitir leitura de empresa" ON public.companies FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de empresa" ON public.companies FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir alteração da empresa pelo utilizador logado" ON public.companies FOR UPDATE USING (id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

-- Utilizadores
CREATE POLICY "Permitir leitura de utilizadores da mesma empresa" ON public.users FOR SELECT USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));
CREATE POLICY "Permitir registo de utilizador" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- Clientes
CREATE POLICY "Leitura de clientes da mesma empresa" ON public.clients FOR SELECT USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));
CREATE POLICY "Inserção de clientes da mesma empresa" ON public.clients FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));
CREATE POLICY "Edição de clientes da mesma empresa" ON public.clients FOR UPDATE USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));
CREATE POLICY "Remoção de clientes da mesma empresa" ON public.clients FOR DELETE USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

-- Workplaces
CREATE POLICY "Leitura de locais de trabalho" ON public.workplaces FOR SELECT USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));
CREATE POLICY "Inserção de locais de trabalho" ON public.workplaces FOR INSERT WITH CHECK (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));
CREATE POLICY "Edição de locais de trabalho" ON public.workplaces FOR UPDATE USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));
CREATE POLICY "Remoção de locais de trabalho" ON public.workplaces FOR DELETE USING (company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid()));

-- Nota: Como tem tabelas extra como products, invoices, app_settings, etc, será provável necessitar replicar a estrutura nestas.
