import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const url = (process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(url, serviceKey);

async function run() {
  const email = 'fgreematitaivang7@gmail.com';
  
  const { data: perfis, error: perfisErr } = await supabase.from('perfis').select('*').eq('email', email);
  console.log("=== PERFIS ===", perfis || perfisErr);

  const { data: sysUsers, error: sysErr } = await supabase.from('system_users').select('*').eq('email', email);
  console.log("=== SYSTEM_USERS ===", sysUsers || sysErr);

  const { data: authUsers, error: authErr } = await supabase.rpc('query_exec_select', {
    query: `SELECT id, email, created_at FROM auth.users WHERE email = '${email}'`
  });
  console.log("=== AUTH USERS ===", authUsers || authErr);
}

run();
