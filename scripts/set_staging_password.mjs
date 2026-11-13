// Ensure admin@staging.local exists and has a known test password in Staging
import { createClient } from '@supabase/supabase-js';

const STAGING_URL = 'https://sfnibpxfevhelaikqbiq.supabase.co';
const SERVICE_ROLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbmlicHhmZXZoZWxhaWtxYmlxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzA1MDI4OCwiZXhwIjoyMTAyNjI2Mjg4fQ.4wVvNNMK8dUTUXsQ8LklD4OBHa-s02VPlY7H0gC0cbw';

const supabase = createClient(STAGING_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  const email = 'admin@staging.local';
  const password = 'Password@123';

  console.log("A atualizar utilizador no Supabase Staging Auth...");
  const { data: listData } = await supabase.auth.admin.listUsers();
  const existing = listData?.users?.find(u => u.email === email);

  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true
    });
    if (error) console.error("Erro ao atualizar password:", error);
    else console.log("✅ Utilizador admin@staging.local atualizado com sucesso no Staging!");
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    if (error) console.error("Erro ao criar utilizador:", error);
    else console.log("✅ Utilizador admin@staging.local criado com sucesso no Staging!");
  }
}

run().catch(console.error);

