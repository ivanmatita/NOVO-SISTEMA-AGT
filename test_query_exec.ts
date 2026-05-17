import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.error("SERVICE ROLE KEY MISSING");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

async function check() {
  const { data, error } = await supabase.rpc('query_exec', { query: 'SELECT 1 as val' });

  if (error) {
    console.error("query_exec check failed:", error);
  } else {
    console.log("query_exec exists! Result:", data);
  }
}

check();
