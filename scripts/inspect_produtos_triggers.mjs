// scripts/inspect_produtos_triggers.mjs
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
  console.log('--- INSPECCIONANDO TRIGGERS E FUNÇÕES EM produtos E products ---');
  
  // 1. Triggers em produtos e products
  const triggers = await sql(`
    SELECT 
      event_object_table, 
      trigger_name, 
      action_statement, 
      action_orientation, 
      action_timing
    FROM information_schema.triggers
    WHERE event_object_table IN ('produtos', 'products');
  `);
  console.log('Triggers encontrados:', triggers);

  // 2. Colunas de produtos e products
  const cols = await sql(`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name IN ('produtos', 'products')
    ORDER BY table_name, column_name;
  `);
  console.log('\nColunas de produtos e products:');
  cols.forEach(c => console.log(` - ${c.table_name}.${c.column_name} (${c.data_type})`));
}

run().catch(console.error);

