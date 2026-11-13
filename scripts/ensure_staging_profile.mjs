// Check and ensure profile for admin@staging.local in Staging
import { createClient } from '@supabase/supabase-js';

const STAGING_URL = 'https://sfnibpxfevhelaikqbiq.supabase.co';
const SERVICE_ROLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbmlicHhmZXZoZWxhaWtxYmlxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzA1MDI4OCwiZXhwIjoyMTAyNjI2Mjg4fQ.4wVvNNMK8dUTUXsQ8LklD4OBHa-s02VPlY7H0gC0cbw';

const supabase = createClient(STAGING_URL, SERVICE_ROLE);

async function run() {
  const { data: users } = await supabase.auth.admin.listUsers();
  const adminUser = users?.users?.find(u => u.email === 'admin@staging.local');
  if (!adminUser) return console.log("User not found");

  const { data: empresas } = await supabase.from('empresas').select('id, nome_empresa').limit(1);
  const empresaId = empresas?.[0]?.id || '00000000-0000-0000-0000-000000000001';

  console.log("Empresa de teste encontrada:", empresas?.[0]);

  const profilePayload = {
    id: adminUser.id,
    user_id: adminUser.id,
    email: adminUser.email,
    nome: 'Administrador Staging',
    nome_completo: 'Administrador Homologação AGT',
    role: 'superadmin',
    tipo_usuario: 'superadmin',
    tipo_perfil: 'superadmin',
    is_superadmin: true,
    empresa_id: empresaId,
    ativo: true,
    created_at: new Date().toISOString()
  };

  await supabase.from('perfis').upsert(profilePayload, { onConflict: 'id' });
  await supabase.from('system_users').upsert(profilePayload, { onConflict: 'id' });
  console.log("✅ Perfil de Superadmin atualizado com sucesso no Staging!");
}

run().catch(console.error);

