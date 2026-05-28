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
  const { data, error } = await supabase.from('perfis').select('*').limit(1);
  if (error) {
    console.error("Error fetching perfis sample:", error);
  } else if (data && data[0]) {
    console.log("Keys in perfis row:", Object.keys(data[0]));
  } else {
    console.log("No data returned or empty table.");
  }
}

run();
