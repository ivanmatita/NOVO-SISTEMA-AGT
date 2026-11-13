import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log("=== Testing INSERT into 'metrics' via ANON client ===");
  // I don't have a valid auth session in this script.
  // I need to see what error it gives if I try to insert.
  
  const testMetrics = {
    empresa_id: '7923151c-9cfd-4cff-909d-6a9b74e3d52f', // Need to make this match the auth user later...
    sigla: 'MTR-TEST2',
    descricao: 'Test Metric Anon',
    observacoes: 'Testing Anon...'
  };
  
  const { data, error } = await supabase
    .from('metrics')
    .insert([testMetrics]);

  console.log("Insert Error:", error);
}
run();
