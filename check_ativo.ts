import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();
const cleanUrl = process.env.VITE_SUPABASE_URL!.replace(/\/rest\/v1\/?$/, '');
const supabaseAdmin = createClient(cleanUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function check() {
  const { data, error } = await supabaseAdmin.from('tabela_impostos').select('ativo').limit(1);
  console.log("Error:", error?.message || error);
  console.log("Data:", data);
}
check();
