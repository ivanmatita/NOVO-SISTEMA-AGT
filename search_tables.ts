import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/rest\/v1\/?$/, '');
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceKey) {
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

async function check() {
  const { data, error } = await supabase.rpc('get_tables' as any);
  if (error) {
     // If RPC is missing, we try to use postgrest schema info if possible
     // Or just try common names
     const common = ['documentos', 'notas_fiscais', 'invoices', 'faturas', 'vendas'];
     for (const c of common) {
         const { count } = await supabase.from(c).select('id', { count: 'exact', head: true });
         if (count !== null) console.log(`Found table ${c} with ${count} rows`);
     }
  } else {
     console.log("Tables:", data);
  }
}

check();
