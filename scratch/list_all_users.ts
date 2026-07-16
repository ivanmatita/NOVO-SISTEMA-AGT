import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(url, serviceKey);

async function run() {
  console.log("=== SELECTING ALL FROM perfis ===");
  const { data: perfis, error: errPerfis } = await supabase.from('perfis').select('*');
  if (errPerfis) {
    console.error("perfis error:", errPerfis);
  } else {
    console.log(`Found ${perfis?.length || 0} perfis:`);
    console.dir(perfis, { depth: null });
  }

  console.log("=== SELECTING ALL FROM system_users ===");
  const { data: sysUsers, error: errSys } = await supabase.from('system_users').select('*');
  if (errSys) {
    console.error("system_users error:", errSys);
  } else {
    console.log(`Found ${sysUsers?.length || 0} system_users:`);
    console.dir(sysUsers, { depth: null });
  }
}

run();
