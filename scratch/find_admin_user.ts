import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(url, serviceKey);

async function run() {
  const { data: perfis, error } = await supabase.from('perfis').select('*').ilike('email', '%matitaivan7%');
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Found perfis matching matitaivan7:");
    console.dir(perfis, { depth: null });
  }
}

run();
