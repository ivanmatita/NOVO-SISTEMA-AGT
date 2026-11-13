// List auth users in staging
const token = 'process.env.SUPABASE_TOKEN';
const projectRef = 'sfnibpxfevhelaikqbiq';

async function run() {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'SELECT id, email, created_at FROM auth.users;' })
  });
  const json = await res.json();
  console.log("Staging Auth Users:", json);
}

run().catch(console.error);

