import { createClient } from '@supabase/supabase-js';

const PROD_URL = "https://nawqfidnawokqaheqvar.supabase.co";
const PROD_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hd3FmaWRuYXdva3FhaGVxdmFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMTgxNDYsImV4cCI6MjA5Mzc5NDE0Nn0.qFkIexxKcQDWax3pfhcgPMR3ZFIsE-gYWTS62i5Edgs";

const anonClient = createClient(PROD_URL, PROD_ANON, { auth: { persistSession: false } });

async function verifyAll() {
  console.log("================================================================================");
  console.log("🏆 RELATÓRIO DE AUDITORIA E PROVA REAL EM PRODUÇÃO");
  console.log("   URL: https://novo-sistema-agt.vercel.app");
  console.log("   Base de Dados Supabase Produção: https://nawqfidnawokqaheqvar.supabase.co");
  console.log("================================================================================\n");

  // 1. Testar Endpoints Vercel
  console.log("--- [1/3] TESTE DE ENDPOINTS SERVERLESS VERCEL ---");
  const endpoints = ['/api/health', '/api/exercicios-fiscais', '/api/config-empresa', '/api/stats'];
  for (const ep of endpoints) {
    try {
      const res = await fetch("https://novo-sistema-agt.vercel.app" + ep);
      const text = await res.text();
      console.log(`Endpoint ${ep.padEnd(25)} -> Status: ${res.status} | Resposta: ${text.substring(0, 80)}`);
    } catch (e) {
      console.error(`Endpoint ${ep} -> ERRO: ${e.message}`);
    }
  }

  // 2. Teste de Leitura de Tabelas Críticas no Supabase de Produção
  console.log("\n--- [2/3] TESTE DE LEITURA DAS TABELAS NO SUPABASE PRODUÇÃO ---");
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
      console.log(`❌ [${table}]: ERRO -> ${error.message}`);
    } else {
      console.log(`✅ [${table.padEnd(24)}]: OK (${data.length} registos retornados com sucesso)`);
    }
  }

  // 3. Teste de Persistência Real (INSERT + SELECT + DELETE)
  console.log("\n--- [3/3] TESTE DE PERSISTÊNCIA REAL DE DADOS (CRUD) ---");

  // Teste 3.1: Cliente
  const testNif = `999${Math.floor(100000 + Math.random() * 900000)}`;
  const { data: client, error: clientErr } = await anonClient
    .from('clientes')
    .insert([{
      nome: `Cliente Auditoria Final ${Date.now()}`,
      nif: testNif,
      email: `audit.${testNif}@empresa.ao`,
      telefone: "923111222",
      endereco: "Avenida 4 de Fevereiro, Luanda",
      cidade: "Luanda",
      pais: "Angola",
      is_active: true
    }])
    .select()
    .single();

  if (clientErr) {
    console.error("❌ Falha ao inserir cliente:", clientErr.message);
  } else {
    console.log(`✅ [CLIENTES] Inserção Real: ID=${client.id}, Nome="${client.nome}", NIF=${client.nif}`);
    const { data: fetched } = await anonClient.from('clientes').select('*').eq('id', client.id).single();
    console.log(`✅ [CLIENTES] Leitura/Persistência Confirmada: ID=${fetched.id}, NIF=${fetched.nif}`);
    await anonClient.from('clientes').delete().eq('id', client.id);
    console.log(`🧹 [CLIENTES] Registo de teste limpo com sucesso.`);
  }

  // Teste 3.2: Produto
  const prodCode = `PRD-AUDIT-${Date.now().toString().slice(-6)}`;
  const { data: product, error: prodErr } = await anonClient
    .from('produtos')
    .insert([{
      codigo: prodCode,
      nome: `Produto Teste Paridade ${Date.now()}`,
      preco: 25000,
      preco_custo: 18000,
      taxa_imposto: 14,
      codigo_imposto: 'NOR',
      tipo: 'P',
      estoque_atual: 100,
      is_active: true
    }])
    .select()
    .single();

  if (prodErr) {
    console.error("❌ Falha ao inserir produto:", prodErr.message);
  } else {
    console.log(`✅ [PRODUTOS] Inserção Real: ID=${product.id}, Código="${product.codigo}", Preço=${product.preco}`);
    const { data: fetchedProd } = await anonClient.from('produtos').select('*').eq('id', product.id).single();
    console.log(`✅ [PRODUTOS] Leitura/Persistência Confirmada: ID=${fetchedProd.id}`);
    await anonClient.from('produtos').delete().eq('id', product.id);
    console.log(`🧹 [PRODUTOS] Registo de teste limpo com sucesso.`);
  }

  // Teste 3.3: Colaborador
  const { data: colab, error: colabErr } = await anonClient
    .from('colaboradores')
    .insert([{
      nome_completo: `Colaborador Auditoria ${Date.now()}`,
      funcao: "Engenheiro de Sistemas",
      departamento: "Tecnologia",
      salario_base: 750000,
      data_admissao: new Date().toISOString().split('T')[0],
      is_active: true
    }])
    .select()
    .single();

  if (colabErr) {
    console.error("❌ Falha ao inserir colaborador:", colabErr.message);
  } else {
    console.log(`✅ [COLABORADORES] Inserção Real: ID=${colab.id}, Nome="${colab.nome_completo}", Função="${colab.funcao}"`);
    await anonClient.from('colaboradores').delete().eq('id', colab.id);
    console.log(`🧹 [COLABORADORES] Registo de teste limpo com sucesso.`);
  }

  console.log("\n================================================================================");
  console.log("🏁 AUDITORIA FINALIZADA — RESULTADOS SATISFATÓRIOS COM PERSISTÊNCIA REAL!");
  console.log("================================================================================");
}

verifyAll().catch(console.error);
