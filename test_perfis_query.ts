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
  console.log("=== Querying existing profiles from 'perfis' ===");
  const { data, error } = await supabaseAdmin
    .from('perfis')
    .select('id, nome, role, email, empresa_id');

  if (error) {
    console.error("Error fetching profiles:", error);
  } else {
    console.log(`Found ${data?.length || 0} profiles:`);
    console.log(JSON.stringify(data, null, 2));
  }
}

run();
