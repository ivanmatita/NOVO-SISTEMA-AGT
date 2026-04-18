import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function run() {
  const { data: comp, error: cError } = await supabase.from('companies').select('*').limit(1);
  console.log("Companies:", cError ? cError.message : "OK");
  
  const { data: users, error: uError } = await supabase.from('users').select('*').limit(1);
  console.log("Users:", uError ? uError.message : "OK");
}

run();