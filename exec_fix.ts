import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const url = process.env.VITE_SUPABASE_URL!.replace(/\/rest\/v1\/?$/, '');
console.log("Using URL:", url);
const supabase = createClient(url, process.env.VITE_SUPABASE_ANON_KEY!);

async function run(){ 
  const sql = fs.readFileSync('FIX_RECURSION.sql', 'utf8'); 
  const {data, error} = await supabase.rpc('query_exec', {query: sql}); 
  console.log("Error:", error);
  console.log("Data:", data);
} 
run();
