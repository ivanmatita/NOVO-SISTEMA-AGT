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
  const { data: perfis, error } = await supabase
    .from('perfis')
    .select('*');

  if (error) {
    console.error("Error fetching perfis:", error);
  } else {
    console.log("Profiles in DB:", perfis.map(p => ({ id: p.id, empresa_id: p.empresa_id, email: p.email })));
  }
}

check();
