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
  const { data, error } = await supabaseAdmin.from('system_users').select('*').limit(1);
  if (error) {
    console.error("Error fetching system_users row:", error);
  } else if (data && data[0]) {
    console.log("Keys in system_users row:", Object.keys(data[0]));
    console.log("Row sample:", data[0]);
  } else {
    console.log("system_users table is empty or doesn't exist.");
  }
}

run();
