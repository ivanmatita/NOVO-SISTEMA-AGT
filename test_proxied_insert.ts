import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const rawUrl = process.env.SUPABASE_URL || '';
const supabaseUrl = rawUrl
  .replace(/\/rest\/v1\/?$/, "")
  .replace(/\/auth\/v1\/?$/, "")
  .replace(/\/$/, "");

const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function run() {
  console.log("=== Testing INSERT via Admin Client ===");
  const testEmpresaId = '7923151c-9cfd-4cff-909d-6a9b74e3d52f';
  
  // Need to be careful with column names. Let's use the ones I know exist.
  const testCaixa = {
    empresa_id: testEmpresaId,
    nome_caixa: 'Caixa Proxied Test',
    codigo_caixa: 'PRX-' + Math.floor(Math.random() * 1000)
    // RLS will probably require other non-nullable columns too.
  };

  const { data, error } = await supabaseAdmin
    .from('caixas')
    .insert(testCaixa)
    .select();

  console.log("Insert Error:", error);
  console.log("Insert Data:", data);
}

run().catch(console.error);
