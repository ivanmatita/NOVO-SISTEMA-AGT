import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

const supabase = createClient(url, serviceKey);

async function run() {
  const { data, error } = await supabase.from('secretaria_digital').select('*').limit(1);
  if (error) {
    console.error("Error querying secretaria_digital:", error);
  } else {
    console.log("secretaria_digital is valid. Sample entry:", data);
  }
}

run();
