import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '');
console.log("Using URL:", url);
const supabase = createClient(url, key);

async function run(){ 
  const sql = fs.readFileSync('UPDATE_COMPRAS_WITH_RECIBOS.sql', 'utf8'); 
  const {data, error} = await supabase.rpc('query_exec', {query: sql}); 
  console.log("Error:", error);
  console.log("Data:", data);
  const reloadRes = await supabase.rpc('query_exec', {query: "NOTIFY pgrst, 'reload schema';"});
  console.log("Reload result:", reloadRes);
} 
run();

