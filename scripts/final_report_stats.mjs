const token = 'process.env.SUPABASE_TOKEN';
const prodRef = 'nawqfidnawokqaheqvar';
const stagingRef = 'sfnibpxfevhelaikqbiq';

async function sqlQuery(projectRef, query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || JSON.stringify(json));
  return json;
}

async function run() {
  const prodTables = await sqlQuery(prodRef, `SELECT count(*) as total FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';`);
  const stagingTables = await sqlQuery(stagingRef, `SELECT count(*) as total FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';`);
  
  const stagingRls = await sqlQuery(stagingRef, `SELECT count(*) as total FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;`);
  const stagingFunctions = await sqlQuery(stagingRef, `SELECT count(*) as total FROM pg_proc JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid WHERE pg_namespace.nspname = 'public';`);
  const stagingTriggers = await sqlQuery(stagingRef, `SELECT count(*) as total FROM pg_trigger WHERE tgname NOT LIKE 'RI_%' AND tgname NOT LIKE 'pg_%';`);
  const stagingBuckets = await sqlQuery(stagingRef, `SELECT count(*) as total FROM storage.buckets;`);

  console.log('=== ESTATÍSTICAS COMPARATIVAS DE ESTRUTURA ===');
  console.log('• Número de tabelas em produção:', prodTables[0].total);
  console.log('• Número de tabelas em staging:', stagingTables[0].total);
  console.log('• Tabelas com RLS habilitada em staging:', stagingRls[0].total);
  console.log('• Funções PostgreSQL em staging:', stagingFunctions[0].total);
  console.log('• Triggers activos em staging:', stagingTriggers[0].total);
  console.log('• Storage Buckets em staging:', stagingBuckets[0].total);
}

run().catch(console.error);

