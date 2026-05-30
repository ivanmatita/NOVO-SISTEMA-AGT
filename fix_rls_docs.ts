import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fix() {
  const sql = `
    DROP POLICY IF EXISTS "full_access_company" ON public.documentos_emitidos;
    DROP POLICY IF EXISTS "documentos_emitidos_isolation" ON public.documentos_emitidos;
    
    CREATE POLICY "documentos_emitidos_isolation" ON public.documentos_emitidos FOR ALL TO authenticated 
    USING (public.is_system_admin() OR empresa_id = public.get_user_company_id()) 
    WITH CHECK (public.is_system_admin() OR empresa_id = public.get_user_company_id());
  `;

  const { error } = await supabaseAdmin.rpc('run_sql', { sql_query: sql });
  if (error) console.error("Error fixing RLS:", error);
  else console.log("RLS fixed successfully.");
}

fix();
