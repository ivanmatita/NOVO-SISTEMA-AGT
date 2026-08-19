// scripts/inspect_sync_produtos_func.mjs
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

async function run() {
  const func = await sql(`
    SELECT pg_get_functiondef(oid) as def
    FROM pg_proc 
    WHERE proname = 'sync_produtos_fields';
  `);
  console.log('--- DEFINIÇÃO DE sync_produtos_fields() ---');
  console.log(func[0]?.def);
}

run().catch(console.error);

