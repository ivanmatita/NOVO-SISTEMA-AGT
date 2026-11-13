import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, serviceKey!);

async function main() {
  console.log("=== TESTING FUNCTIONS START ===");

  try {
     const { data, error } = await supabase.rpc('get_user_empresa_id');
     console.log("get_user_empresa_id call:", { data, error });
  } catch (e: any) {
     console.error("get_user_empresa_id threw exception:", e.message);
  }

  console.log("=== TESTING FUNCTIONS END ===");
}

main();
