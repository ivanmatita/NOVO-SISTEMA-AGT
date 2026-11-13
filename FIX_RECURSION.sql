-- 1. FIX INFINITE RECURSION na tabela PERFIS
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

DO $$ 
DECLARE 
  pol record;
BEGIN
  FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'perfis' AND schemaname = 'public') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.perfis', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Perfis_Permit_Own" ON public.perfis
    FOR ALL TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- 2. MELHORAR PERFORMANCE E EVITAR MAIS RECURSÕES DO FUNÇÃO GET_AUTH_EMPRESA_ID
CREATE OR REPLACE FUNCTION public.get_auth_empresa_id()
RETURNS uuid AS $$
DECLARE
  v_emp_id uuid;
BEGIN
  SELECT empresa_id INTO v_emp_id FROM public.perfis WHERE id = auth.uid() LIMIT 1;
  RETURN v_emp_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

NOTIFY pgrst, 'reload schema';
