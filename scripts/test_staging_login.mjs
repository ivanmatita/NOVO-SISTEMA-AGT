// Test login with public client against Staging Supabase
import { createClient } from '@supabase/supabase-js';

const STAGING_URL = 'https://sfnibpxfevhelaikqbiq.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbmlicHhmZXZoZWxhaWtxYmlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNTAyODgsImV4cCI6MjEwMjYyNjI4OH0.AnxqAF-TBY556gp2oPV0I5hfTjozaCMIHaeH7OhifiM';

const client = createClient(STAGING_URL, ANON_KEY);

async function run() {
  console.log("A testar login com credenciais de Staging...");
  const { data, error } = await client.auth.signInWithPassword({
    email: 'admin@staging.local',
    password: 'Password@123'
  });

  if (error) {
    console.error("❌ Erro de login:", error);
  } else {
    console.log("✅ Login bem-sucedido! User ID:", data.user?.id, "Email:", data.user?.email);
  }
}

run().catch(console.error);

