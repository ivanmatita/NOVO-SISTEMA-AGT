import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const rawUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const url = rawUrl
  .replace(/\/rest\/v1\/?$/, "")
  .replace(/\/auth\/v1\/?$/, "")
  .replace(/\/$/, "");
const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

const supabase = createClient(url, serviceKey);

async function run() {
  const { data, error } = await supabase.rpc('execute_sql', {
    sql_query: `SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE schemaname = 'public' AND tablename = 'compras';`
  });
  if (error) {
    // If execute_sql RPC doesn't exist, try querying standard catalog if allowed, or another method. Let's do direct select.
    console.error("Error querying policies:", error);
  } else {
    console.log("compras RLS Policies:", JSON.stringify(data, null, 2));
  }
}

run();
