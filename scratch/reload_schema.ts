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

async function reload() {
  const { data, error } = await supabase.rpc('query_exec', { query: "NOTIFY pgrst, 'reload schema';" });

  if (error) {
    console.error("Schema reload failed:", error);
  } else {
    console.log("Schema reload success! Result:", data);
  }
}

reload();
