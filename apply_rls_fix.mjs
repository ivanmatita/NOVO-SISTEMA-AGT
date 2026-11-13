import dotenv from 'dotenv';
dotenv.config();

const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const sql = `
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Perfis_Secure_Isolation" ON public.perfis;
DROP POLICY IF EXISTS "tenant_isolation_perfis" ON public.perfis;
DROP POLICY IF EXISTS "Perfis_Permit_Own" ON public.perfis;

CREATE POLICY "Perfis_Secure_Isolation" ON public.perfis
    FOR ALL TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.get_auth_empresa_id()
RETURNS uuid AS $$
DECLARE
  v_emp_id uuid;
BEGIN
  SELECT empresa_id INTO v_emp_id FROM public.perfis WHERE id = auth.uid() LIMIT 1;
  RETURN v_emp_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid AS $$
BEGIN
  RETURN public.get_auth_empresa_id();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

NOTIFY pgrst, 'reload schema';
`;

async function applyFix() {
    console.log("Applying RLS Fix via query_exec_select RPC...");
    const res = await fetch(`${url}/rest/v1/rpc/query_exec_select`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': key,
            'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({ query: sql })
    });
    
    if (!res.ok) {
        console.error("Error applying fix:", await res.text());
        process.exit(1);
    }
    
    console.log("Fix Applied Successfully. Response:");
    console.log(await res.json());
}

applyFix();
