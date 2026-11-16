import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const rawUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseUrl = rawUrl
  .replace(/\/rest\/v1\/?$/, "")
  .replace(/\/auth\/v1\/?$/, "")
  .replace(/\/$/, "");

const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  console.log("=== COUNT OF PERFIS ===");
  const { count: perfisCount } = await supabaseAdmin.from('perfis').select('*', { count: 'exact', head: true });
  console.log("Total perfis:", perfisCount);

  console.log("=== COUNT OF SYSTEM_USERS ===");
  const { count: sysCount } = await supabaseAdmin.from('system_users').select('*', { count: 'exact', head: true });
  console.log("Total system_users:", sysCount);

  console.log("=== RECENT PERFIS ===");
  const { data: recentPerfis, error: errP } = await supabaseAdmin
    .from('perfis')
    .select('id, nome, email, role, empresa_id, company_id, created_at')
    .order('created_at', { ascending: false })
    .limit(10);
  if (errP) console.error(errP);
  else console.log(recentPerfis);

  console.log("=== RECENT SYSTEM_USERS ===");
  const { data: recentSys, error: errS } = await supabaseAdmin
    .from('system_users')
    .select('id, nome, email, empresa_id, company_id, created_at')
    .order('created_at', { ascending: false })
    .limit(10);
  if (errS) console.error(errS);
  else console.log(recentSys);
}

run();
