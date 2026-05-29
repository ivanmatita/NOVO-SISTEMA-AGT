import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const rawUrl = (process.env.VITE_SUPABASE_URL || '').trim();
const url = rawUrl
  .replace(/\/rest\/v1\/?$/, "")
  .replace(/\/auth\/v1\/?$/, "")
  .replace(/\/$/, "");
const anonKey = (process.env.VITE_SUPABASE_ANON_KEY || '').trim();
const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

const adminClient = createClient(url, serviceKey);
const anonClient = createClient(url, anonKey);

async function run() {
  console.log("URL:", url);
  console.log("=== STEP 1: Test insert with ADMIN client ===");
  const testEmpresaId = '7923151c-9cfd-4cff-909d-6a9b74e3d52f'; // placeholder or some company uuid
  const testCaixa = {
    empresa_id: testEmpresaId,
    nome_caixa: 'Caixa de Teste Admin',
    codigo_caixa: 'TEST-01',
    moeda: 'AOA',
    current_balance: 1000,
    saldo_actual: 1000,
    valor_inicial: 1000,
    saldo_inicial: 1000,
    responsavel: 'Admin Teste',
    responsavel_caixa: 'Admin Teste',
    utilizador_id: null,
    observacao: 'Inserido por script de teste'
  };

  const { data: adminData, error: adminErr } = await adminClient
    .from('caixas')
    .insert([testCaixa])
    .select();

  console.log("ADMIN Insert Error:", adminErr);
  console.log("ADMIN Insert Data:", adminData);

  if (adminData && adminData.length > 0) {
    const insertedId = adminData[0].id;
    console.log("Inserted ID with Admin:", insertedId);

    console.log("\n=== STEP 2: Test SELECT with ANON client ===");
    const { data: anonSelectData, error: anonSelectErr } = await anonClient
      .from('caixas')
      .select('*')
      .eq('id', insertedId);
    console.log("ANON Select Error:", anonSelectErr);
    console.log("ANON Select Data:", anonSelectData);

    console.log("\n=== STEP 3: Test UPDATE with ANON client ===");
    const { data: anonUpdateData, error: anonUpdateErr } = await anonClient
      .from('caixas')
      .update({ observacao: 'Atualizado por Anon' })
      .eq('id', insertedId)
      .eq('empresa_id', testEmpresaId)
      .select();
    console.log("ANON Update Error:", anonUpdateErr);
    console.log("ANON Update Data:", anonUpdateData);

    console.log("\n=== STEP 4: Cleaning up test row with ADMIN ===");
    const { error: cleanErr } = await adminClient
      .from('caixas')
      .delete()
      .eq('id', insertedId);
    console.log("ADMIN Cleanup Error:", cleanErr);
  }
}

run().catch(console.error);
