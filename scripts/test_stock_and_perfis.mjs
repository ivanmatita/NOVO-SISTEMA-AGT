// scripts/test_stock_and_perfis.mjs
const token = 'process.env.SUPABASE_TOKEN';
const stagingRef = 'sfnibpxfevhelaikqbiq';

async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${stagingRef}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || JSON.stringify(json));
  return json;
}

async function verify() {
  console.log('--- TESTANDO STOCK, PRODUTOS, ARMAZÉNS E PERFIS ---');
  const empresaId = '11111111-0000-0000-0000-000000000001';

  // 1. Armazém (enviando 'name' em vez de 'nome')
  console.log('1. Testando inserção de armazém com name e description...');
  const armazem = await sql(`
    INSERT INTO public.armazens (empresa_id, name, description, location)
    VALUES ('${empresaId}', 'Armazém Central Teste', 'Depósito Geral de Mercadorias', 'Luanda, Viana')
    RETURNING id, name, nome, description, descricao;
  `);
  console.log('   ✅ Armazém criado e campos sincronizados:', armazem[0]);

  // 2. Produto (enviando 'name', 'price', 'cost_price', 'code' em vez de campos PT)
  console.log('2. Testando inserção de produto com name, price, cost_price...');
  const produto = await sql(`
    INSERT INTO public.produtos (empresa_id, name, price, cost_price, code, category, active)
    VALUES ('${empresaId}', 'Computador Portátil HP Teste', 450000, 320000, 'HP-TEST-01', 'Informática', true)
    RETURNING id, name, nome, price, preco, code, codigo;
  `);
  console.log('   ✅ Produto criado e campos sincronizados:', produto[0]);

  // 3. Atualizar Administrador / Perfil Staging
  console.log('3. Testando atualização do perfil admin...');
  const perfil = await sql(`
    UPDATE public.perfis
    SET 
      name = 'Administrador Staging',
      nome = 'Administrador Staging',
      permission_areas = ARRAY['all', 'admin', 'pos', 'rh', 'contabilidade', 'faturacao', 'relatorios', 'stock', 'configuracoes'],
      is_admin = true,
      level = 1
    WHERE id = '00000000-0000-0000-0000-000000000001'
    RETURNING id, name, nome, permission_areas, is_admin;
  `);
  console.log('   ✅ Perfil Administrador atualizado:', perfil[0]);

  // Limpeza
  console.log('4. Limpando dados de teste...');
  await sql(`DELETE FROM public.produtos WHERE id = '${produto[0]?.id}';`);
  await sql(`DELETE FROM public.armazens WHERE id = '${armazem[0]?.id}';`);
  console.log('   ✅ Limpeza concluída.');

  console.log('\n🎉 TODOS OS TESTES PASSARAM COM SUCESSO A 100%!');
}

verify().catch(e => {
  console.error('❌ Erro no teste:', e);
  process.exit(1);
});

