import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL!.replace(/\/rest\/v1\/?$/, '');
console.log("Using URL:", url);
const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run(){ 
  const sql = `
    ALTER TABLE tabela_impostos ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true;
    UPDATE tabela_impostos SET ativo = true WHERE ativo IS NULL;
  `;
  const {data, error} = await supabaseAdmin.rpc('query_exec', {query: sql}); 
  console.log("Error:", error);
  console.log("Data:", data);
} 
run();
