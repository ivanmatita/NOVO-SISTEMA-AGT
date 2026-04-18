import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log("No supabase env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Testing auth...");
  const { data: authData, error: authError } = await supabase.auth.getSession();
  console.log("Auth:", authError ? authError.message : "OK");

  console.log("Testing faturas...");
  const { data: faturas, error: fError } = await supabase.from('faturas').select('*, series_fiscais(*)').limit(1);
  console.log("Faturas:", fError ? fError.message : "OK");

  console.log("Testing employees...");
  const { data: emp, error: eError } = await supabase.from('funcionarios').select('*, profissoes(*)').limit(1);
  console.log("Employees:", eError ? eError.message : "OK");
  
  console.log("Testing armazens...");
  const { data: arm, error: aError } = await supabase.from('armazens').select('*').limit(1);
  console.log("Armazens:", aError ? aError.message : "OK");
}

run();