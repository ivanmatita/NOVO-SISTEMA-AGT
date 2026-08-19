import { createClient } from '@supabase/supabase-js';

const PROD_URL = "https://nawqfidnawokqaheqvar.supabase.co";
const PROD_SERVICE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hd3FmaWRuYXdva3FhaGVxdmFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODIxODE0NiwiZXhwIjoyMDkzNzk0MTQ2fQ.ToB7OlAF5FDHEKZMAZLmbvLtHb250qiVFmOUQm1VaOo";
const PROD_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hd3FmaWRuYXdva3FhaGVxdmFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMTgxNDYsImV4cCI6MjA5Mzc5NDE0Nn0.qFkIexxKcQDWax3pfhcgPMR3ZFIsE-gYWTS62i5Edgs";

const adminClient = createClient(PROD_URL, PROD_SERVICE, { auth: { persistSession: false } });
const anonClient = createClient(PROD_URL, PROD_ANON, { auth: { persistSession: false } });

async function run() {
  console.log("==================================================");
  console.log("🔍 TESTANDO REGISTO E RLS NO SUPABASE DE PRODUÇÃO");
  console.log("==================================================\n");

  // 1. Obter uma empresa existente em Produção
  const { data: empresas, error: empErr } = await adminClient.from('empresas').select('*').limit(1);
  if (empErr || !empresas || empresas.length === 0) {
    console.error("❌ Erro ao buscar empresas em Produção:", empErr);
    return;
  }
  const empresa = empresas[0];
  console.log("Empresa alvo de teste em Produção:", { id: empresa.id, nome: empresa.nome || empresa.nome_empresa, nif: empresa.nif });

  // 2. Verificar Perfis existentes em Produção
  const { data: perfis, error: perfErr } = await adminClient.from('perfis').select('*').eq('empresa_id', empresa.id).limit(2);
  console.log(`Perfis encontrados para empresa (${perfis?.length || 0}):`, perfis?.map(p => ({ id: p.id, email: p.email, role: p.role })));

  // 3. Testar inserção via Anon Client (como se fosse um utilizador logado com token ou cliente direto)
  console.log("\n--- TESTE 1: Inserção de Produto via Admin Client ---");
  const testProdAdmin = {
    empresa_id: empresa.id,
    nome: `Produto Teste Admin ${Date.now()}`,
    codigo: `PRD-${Date.now()}`,
    preco: 1500,
    preco_venda: 1500,
    stock: 10,
    stock_atual: 10,
    ativo: true
  };
  const { data: pAdminData, error: pAdminErr } = await adminClient.from('produtos').insert(testProdAdmin).select();
  if (pAdminErr) {
    console.error("❌ FALHA no insert de produto (Admin):", pAdminErr);
  } else {
    console.log("✅ SUCESSO no insert de produto (Admin):", pAdminData[0]?.id);
    // Limpar produto de teste
    await adminClient.from('produtos').delete().eq('id', pAdminData[0]?.id);
  }

  console.log("\n--- TESTE 2: Inserção de Produto via Anon Client ---");
  const { data: pAnonData, error: pAnonErr } = await anonClient.from('produtos').insert(testProdAdmin).select();
  if (pAnonErr) {
    console.error("❌ FALHA no insert de produto (Anon Client):", pAnonErr);
  } else {
    console.log("✅ SUCESSO no insert de produto (Anon Client):", pAnonData);
  }

  // 4. Testar inserção de Cliente
  console.log("\n--- TESTE 3: Inserção de Cliente via Admin Client ---");
  const testCli = {
    empresa_id: empresa.id,
    nome: `Cliente Teste ${Date.now()}`,
    nif: `999${Date.now().toString().slice(-6)}`,
    telefone: '923000000',
    email: `teste${Date.now()}@teste.com`
  };
  const { data: cData, error: cErr } = await adminClient.from('clientes').insert(testCli).select();
  if (cErr) {
    console.error("❌ FALHA no insert de cliente (Admin):", cErr);
  } else {
    console.log("✅ SUCESSO no insert de cliente (Admin):", cData[0]?.id);
    await adminClient.from('clientes').delete().eq('id', cData[0]?.id);
  }

  // 5. Inspecionar Policies RLS em Produção
  console.log("\n--- TESTE 4: Inspecionar Policies RLS em Produção ---");
  const { data: rlsData, error: rlsErr } = await adminClient.rpc('query_exec', {
    query: `
      SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `
  });
  console.log("Policies RLS em Produção:", rlsData || rlsErr);
}

run().catch(console.error);
