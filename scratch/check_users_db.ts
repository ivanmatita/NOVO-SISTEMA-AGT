import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const url = (process.env.SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(url, serviceKey);

async function run() {
  console.log("Checking columns via query_exec_select...");

  const query = `
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name IN ('perfis', 'system_users', 'empresas')
    ORDER BY table_name, column_name
  `;

  const { data, error } = await supabase.rpc('query_exec_select', { query });
  if (error) {
    console.error("Error inspecting columns:", error);
  } else {
    console.log("=== COLUMNS ===");
    console.log(data);
  }
}

run();
