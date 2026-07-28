import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.error("SERVICE ROLE KEY MISSING");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

async function run() {
  const query = `
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'compras'
  `;
  const { data, error } = await supabase.rpc('query_exec_select', { query });

  if (error) {
    console.error("Failed to query columns:", error);
  } else {
    console.log("Columns of table 'compras':", JSON.stringify(data, null, 2));
  }
}

run();
