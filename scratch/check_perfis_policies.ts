import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const url = (process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(url, serviceKey);

async function run() {
  console.log("Checking policies on perfis and system_users...");

  const q1 = `
    SELECT policyname, tablename, cmd, qual, with_check 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename IN ('perfis', 'system_users')
  `;

  const { data, error } = await supabase.rpc('query_exec_select', { query: q1 });
  if (error) {
    console.error("Error fetching policies:", error);
  } else {
    console.log("Policies:", data);
  }
}

run();
