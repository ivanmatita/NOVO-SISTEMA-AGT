// Check not null constraints on metrics table
const token = process.env.SUPABASE_TOKEN || 'process.env.SUPABASE_TOKEN';
const ref = 'sfnibpxfevhelaikqbiq';

async function run() {
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'metrics';
    ` })
  });
  console.log('Metrics schema:', await r.json());
}
run();

