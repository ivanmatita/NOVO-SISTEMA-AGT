// List all tables in Staging
const token = 'process.env.SUPABASE_TOKEN';
const stagingRef = 'sfnibpxfevhelaikqbiq';

async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${stagingRef}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  return await res.json();
}

async function run() {
  const tables = await sql(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);

  console.log("=== TODAS AS TABELAS EM STAGING ===");
  console.log(tables.map(r => r.table_name));

  // Check counts for all tables
  for (const t of tables) {
    try {
      const c = await sql(`SELECT count(*) as count FROM public."${t.table_name}";`);
      console.log(`${t.table_name}: ${c[0]?.count ?? 'error'}`);
    } catch (e) {
      console.log(`${t.table_name}: erro`);
    }
  }
}

run().catch(console.error);

