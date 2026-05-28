import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const rawUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const url = rawUrl
  .replace(/\/rest\/v1\/?$/, '')
  .replace(/\/auth\/v1\/?$/, '')
  .replace(/\/$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(url, key);

async function inspectPerfis() {
  const { data, error } = await supabase
    .from('perfis')
    .select('id, email, username, nome, role')
    .limit(100);

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Perfis with potential issues:");
    data.forEach(p => {
      console.log(`- ID: ${p.id}, Email: ${p.email}, Username: [${p.username}], Nome: [${p.nome}], Role: [${p.role}]`);
    });
  }
}

inspectPerfis();
