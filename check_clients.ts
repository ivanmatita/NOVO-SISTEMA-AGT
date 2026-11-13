import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  console.error("SERVICE ROLE KEY MISSING");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

async function check() {
  const { data, error, count } = await supabase
    .from('clientes')
    .select('*', { count: 'exact' });

  if (error) {
    console.error("Error fetching clientes with service_role:", error);
  } else {
    console.log(`Total clients in DB (bypassing RLS): ${count}`);
    console.log("Sample clients:", data?.slice(0, 5).map(c => ({ id: c.id, empresa_id: c.empresa_id, nome: c.nome })));
    
    const { data: companies } = await supabase.from('empresas').select('id, nome_empresa');
    console.log("Registered companies:", companies);
  }
}

check();
