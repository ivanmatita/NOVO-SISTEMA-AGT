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
  console.log("=== Querying all caixas using Admin Client ===");
  const { data, error } = await supabaseAdmin
    .from('caixas')
    .select('*');

  if (error) {
    console.error("Error fetching caixas:", error);
  } else {
    console.log(`Found ${data?.length || 0} caixas:`);
    console.log(JSON.stringify(data, null, 2));
  }
}

run();
