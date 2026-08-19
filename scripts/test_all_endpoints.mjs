// scripts/test_all_endpoints.mjs
const token = 'process.env.SUPABASE_TOKEN';
const stagingRef = 'sfnibpxfevhelaikqbiq';

async function testQuery(name, sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${stagingRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`❌ [${name}] FALHOU:`, err);
  } else {
    const data = await res.json();
    console.log(`✅ [${name}] SUCESSO:`, data);
  }
}

async function runTests() {
  await testQuery('employee_penalties', 'SELECT count(*) FROM public.employee_penalties;');
  await testQuery('professions', 'SELECT name, base_salary, inss_profession FROM public.professions LIMIT 2;');
  await testQuery('series_fiscais', 'SELECT serie, descricao, tipo, proximo_numero FROM public.series_fiscais LIMIT 2;');
  await testQuery('perfis', 'SELECT nome, role, is_admin, level, permission_areas FROM public.perfis LIMIT 1;');
  await testQuery('storage_buckets', "SELECT id, name, public FROM storage.buckets WHERE id IN ('empresa-documentos', 'media', 'avatars');");
  await testQuery('clientes', 'SELECT nome, nif, contribuinte, codigo_postal FROM public.clientes LIMIT 2;');
  await testQuery('metrics', 'SELECT tipo, type, valor, value, activo FROM public.metrics LIMIT 2;');
}

runTests();

