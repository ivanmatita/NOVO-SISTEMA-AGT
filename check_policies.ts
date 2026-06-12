import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(url, key);

const fixPolicies = async () => {
    console.log("!!! Cleaning up and hardening RLS policies for multi-tenancy !!!");
    
    // Dynamically drop all policies
    const dropQuery = `
      DO $$
      DECLARE
        pol RECORD;
      BEGIN
        FOR pol IN SELECT policyname, tablename FROM pg_policies WHERE tablename IN ('cartas', 'media_arquivos')
        LOOP
          EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
        END LOOP;
      END $$;
    `;
    
    await supabase.rpc('query_exec', { query: dropQuery });
    
    const query = `
      -- 1. Ensure RLS is enabled
      ALTER TABLE public.cartas ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.media_arquivos ENABLE ROW LEVEL SECURITY;

      -- 2. Create clean, strict policies
      -- Cartas
      CREATE POLICY "tenant_select_cartas" ON public.cartas FOR SELECT TO authenticated USING (empresa_id = public.get_auth_empresa_id());
      CREATE POLICY "tenant_insert_cartas" ON public.cartas FOR INSERT TO authenticated WITH CHECK (empresa_id = public.get_auth_empresa_id());
      CREATE POLICY "tenant_update_cartas" ON public.cartas FOR UPDATE TO authenticated USING (empresa_id = public.get_auth_empresa_id()) WITH CHECK (empresa_id = public.get_auth_empresa_id());
      CREATE POLICY "tenant_delete_cartas" ON public.cartas FOR DELETE TO authenticated USING (empresa_id = public.get_auth_empresa_id());
      
      -- Media_arquivos
      CREATE POLICY "tenant_select_media" ON public.media_arquivos FOR SELECT TO authenticated USING (empresa_id = public.get_auth_empresa_id());
      CREATE POLICY "tenant_insert_media" ON public.media_arquivos FOR INSERT TO authenticated WITH CHECK (empresa_id = public.get_auth_empresa_id());
      CREATE POLICY "tenant_update_media" ON public.media_arquivos FOR UPDATE TO authenticated USING (empresa_id = public.get_auth_empresa_id()) WITH CHECK (empresa_id = public.get_auth_empresa_id());
      CREATE POLICY "tenant_delete_media" ON public.media_arquivos FOR DELETE TO authenticated USING (empresa_id = public.get_auth_empresa_id());

      NOTIFY pgrst, 'reload schema';
    `;
    
    const result = await supabase.rpc('query_exec', { query });
    console.log("Policy cleanup and creation result:", JSON.stringify(result, null, 2));

    // Verify
    const { data: finalPolicies } = await supabase.rpc('query_exec_select', { 
      query: `SELECT policyname, tablename, cmd, qual, with_check FROM pg_policies WHERE tablename IN ('cartas', 'media_arquivos')` 
    });
    console.log("Final Active Policies:", JSON.stringify(finalPolicies, null, 2));
}

fixPolicies();
