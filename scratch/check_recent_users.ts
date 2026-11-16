import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const url = (process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(url, serviceKey);

async function run() {
  console.log("Checking recently registered accounts...");

  const { data: recentAuth, error: authErr } = await supabase.rpc('query_exec_select', {
    query: `SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 5`
  });
  console.log("=== RECENT AUTH USERS ===", recentAuth || authErr);

  const { data: recentCompanies, error: compErr } = await supabase.from('empresas').select('id, nome_empresa, created_at, auth_user_id').order('created_at', { ascending: false }).limit(5);
  console.log("=== RECENT COMPANIES ===", recentCompanies || compErr);

  const { data: recentPerfis, error: perfErr } = await supabase.from('perfis').select('id, nome, email, created_at, empresa_id').order('created_at', { ascending: false }).limit(5);
  console.log("=== RECENT PERFIS ===", recentPerfis || perfErr);

  const { data: recentSysUsers, error: sysErr } = await supabase.from('system_users').select('id, nome, email, created_at, empresa_id').order('created_at', { ascending: false }).limit(5);
  console.log("=== RECENT SYSTEM USERS ===", recentSysUsers || sysErr);
}

run();
