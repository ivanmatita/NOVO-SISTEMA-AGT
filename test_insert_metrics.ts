import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const rawUrl = process.env.SUPABASE_URL || '';
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/auth\/v1\/?$/, "").replace(/\/$/, "");
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function run() {
  console.log("=== Testing INSERT into 'metrics' ===");
  const testMetrics = {
    empresa_id: '7923151c-9cfd-4cff-909d-6a9b74e3d52f',
    sigla: 'MTR-TEST',
    descricao: 'Test Metric',
    observacoes: 'Testing...'
  };
  
  const { data, error } = await supabaseAdmin
    .from('metrics')
    .insert([testMetrics])
    .select();

  console.log("Insert Error:", error);
  console.log("Insert Data:", data);
}
run();
