import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.error("❌ SUPABASE_SERVICE_ROLE_KEY is missing.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

async function checkPerfisPolicies() {
  console.log("🔍 Fetching RLS policies on public.perfis...");

  const query = `
    SELECT 
      policyname,
      permissive,
      roles,
      cmd,
      qual,
      with_check
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'perfis'
  `;

  const { data, error } = await supabase.rpc('query_exec_select', { query });
  console.log("Polices on perfis:", JSON.stringify(data || error, null, 2));
}

checkPerfisPolicies();
