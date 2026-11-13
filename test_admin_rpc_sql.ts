import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const rawUrl = process.env.SUPABASE_URL || '';
const supabaseUrl = rawUrl
  .replace(/\/rest\/v1\/?$/, "")
  .replace(/\/auth\/v1\/?$/, "")
  .replace(/\/$/, "");

const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function run() {
  console.log("=== Testing query_exec with Admin Client ===");
  const { data: qeData, error: qeErr } = await supabaseAdmin.rpc('query_exec', { query: 'SELECT 1 as val' });
  console.log("query_exec Error:", qeErr);
  console.log("query_exec Data:", qeData);

  console.log("\n=== Testing exec_sql with Admin Client ===");
  const { data: esData, error: esErr } = await supabaseAdmin.rpc('exec_sql', { query: 'SELECT 1 as val' });
  console.log("exec_sql Error:", esErr);
  console.log("exec_sql Data:", esData);
}

run();
