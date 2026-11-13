// Inspect and fix problematic triggers in Staging
const token = 'process.env.SUPABASE_TOKEN';
const stagingRef = 'sfnibpxfevhelaikqbiq';

async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${stagingRef}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  const json = await res.json();
  if (!res.ok) { console.error('❌ Error:', json.message); return null; }
  return json;
}

async function run() {
  // 1. Check existing triggers
  console.log("=== TRIGGERS EXISTENTES EM STAGING ===");
  const triggers = await sql(`
    SELECT trigger_name, event_object_table, action_statement
    FROM information_schema.triggers 
    WHERE trigger_schema = 'public'
    ORDER BY event_object_table;
  `);
  if (triggers) console.log(JSON.stringify(triggers, null, 2));

  // 2. Check the problematic function
  console.log("\n=== FUNÇÃO sync_armazens_fields ===");
  const func = await sql(`
    SELECT prosrc FROM pg_proc WHERE proname = 'sync_armazens_fields';
  `);
  if (func) console.log(JSON.stringify(func, null, 2));
}

run().catch(console.error);

