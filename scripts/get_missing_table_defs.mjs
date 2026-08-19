// Detailed list of missing tables and schemas in Staging
const token = 'process.env.SUPABASE_TOKEN';
const prodRef = 'nawqfidnawokqaheqvar';
const stagingRef = 'sfnibpxfevhelaikqbiq';

async function sql(projectRef, query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  return await res.json();
}

async function run() {
  const prodTables = await sql(prodRef, `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);

  const stagingTables = await sql(stagingRef, `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);

  const pSet = new Set((prodTables || []).map(r => r.table_name));
  const sSet = new Set((stagingTables || []).map(r => r.table_name));

  const missingInStaging = [...pSet].filter(t => !sSet.has(t));
  console.log("=== TABELAS AUSENTES EM STAGING ===");
  console.log(missingInStaging);

  // For each missing table, get its CREATE TABLE definition from Production (columns & types)
  console.log("\n=== OBTENDO ESTRUTURA DAS TABELAS AUSENTES ===");
  for (const t of missingInStaging) {
    const cols = await sql(prodRef, `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = '${t}'
      ORDER BY ordinal_position;
    `);
    console.log(`\nTabela: ${t}`);
    console.log(cols);
  }
}

run().catch(console.error);

