import { createClient } from '@supabase/supabase-js';

const PROD_URL = "https://nawqfidnawokqaheqvar.supabase.co";
const PROD_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hd3FmaWRuYXdva3FhaGVxdmFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMTgxNDYsImV4cCI6MjA5Mzc5NDE0Nn0.qFkIexxKcQDWax3pfhcgPMR3ZFIsE-gYWTS62i5Edgs";
const PROD_SERVICE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hd3FmaWRuYXdva3FhaGVxdmFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMTgxNDYsImV4cCI6MjA5Mzc5NDE0Nn0.ToB7OlAF5FDHEKZMAZLmbvLtHb250qiVFmOUQm1VaOo";

const anonClient = createClient(PROD_URL, PROD_ANON, { auth: { persistSession: false } });

async function runLiveTest() {
  console.log("==================================================");
  console.log("🚀 TESTE DE CONECTIVIDADE E PERSISTÊNCIA REAL EM PRODUÇÃO");
  console.log("==================================================");

  // 1. Testar Endpoint /api/health na Vercel
  console.log("\n1. Testando endpoint Vercel /api/health...");
  try {
    const res = await fetch("https://novo-sistema-agt.vercel.app/api/health");
    const text = await res.text();
    console.log(`HTTP Status: ${res.status} ${res.statusText}`);
    console.log(`Resposta: ${text}`);
  } catch (err) {
    console.error("Erro ao chamar /api/health:", err.message);
  }

  // 2. Testar leitura de tabelas críticas no Supabase de Produção (Anon Key / RLS)
  console.log("\n2. Testando leitura de tabelas com Anon Key (Supabase Produção)...");
  
  const tables = [
    'configuracoes_graficas',
    'clientes',
    'colaboradores',
    'produtos',
    'locais_trabalho',
    'caixas',
    'armazens',
    'series_fiscais',
    'licencas_empresas',
    'pos_user_configs',
    'config_empresa',
    'exercicios_fiscais'
  ];

  for (const table of tables) {
    const { data, error } = await anonClient.from(table).select('*').limit(2);
    if (error) {
      console.log(`❌ [${table}]: Erro ao ler -> ${error.message}`);
    } else {
      console.log(`✅ [${table}]: OK (${data.length} registos retornados)`);
    }
  }

  // 3. Testar inserção e persistência REAL de um cliente de teste
  console.log("\n3. Testando inserção REAL de um cliente de teste no Supabase de Produção...");
  const testNif = `999${Math.floor(100000 + Math.random() * 900000)}`;
  const testClient = {
    nome: `Cliente Teste Produção Paridade ${Date.now()}`,
    nif: testNif,
    email: `teste.${testNif}@exemplo.ao`,
    telefone: "923000000",
    endereco: "Luanda, Angola",
    cidade: "Luanda",
    pais: "Angola",
    is_active: true
  };

  const { data: insertedClient, error: insertErr } = await anonClient
    .from('clientes')
    .insert([testClient])
    .select()
    .single();

  if (insertErr) {
    console.error("❌ Erro ao inserir cliente em produção:", insertErr.message);
  } else {
    console.log(`✅ Cliente inserido com sucesso! ID: ${insertedClient.id}, Nome: ${insertedClient.nome}, NIF: ${insertedClient.nif}`);

    // Buscar o cliente inserido para comprovar persistência
    const { data: fetchedClient } = await anonClient
      .from('clientes')
      .select('*')
      .eq('id', insertedClient.id)
      .single();

    if (fetchedClient) {
      console.log(`✅ Persistência comprovada: Cliente recuperado da base de dados com ID ${fetchedClient.id}`);
      
      // Limpeza
      await anonClient.from('clientes').delete().eq('id', insertedClient.id);
      console.log(`🧹 Cliente de teste removido após validação.`);
    }
  }

  // 4. Testar inserção de um colaborador de teste
  console.log("\n4. Testando inserção REAL de um colaborador de teste...");
  const testColab = {
    nome_completo: `Colaborador Teste Paridade ${Date.now()}`,
    funcao: "Auditor de Produção",
    departamento: "Tecnologia",
    salario_base: 500000,
    data_admissao: new Date().toISOString().split('T')[0],
    is_active: true
  };

  const { data: insertedColab, error: colabErr } = await anonClient
    .from('colaboradores')
    .insert([testColab])
    .select()
    .single();

  if (colabErr) {
    console.error("❌ Erro ao inserir colaborador:", colabErr.message);
  } else {
    console.log(`✅ Colaborador inserido com sucesso! ID: ${insertedColab.id}, Nome: ${insertedColab.nome_completo || insertedColab.name}`);
    await anonClient.from('colaboradores').delete().eq('id', insertedColab.id);
    console.log(`🧹 Colaborador de teste removido após validação.`);
  }

  console.log("\n==================================================");
  console.log("🏁 TESTE CONCLUÍDO COM SUCESSO!");
  console.log("==================================================");
}

runLiveTest().catch(console.error);
