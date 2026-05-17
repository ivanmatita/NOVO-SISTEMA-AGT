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
  console.log("--- Checking documentos_emitidos ---");
  const { data: orphans, count } = await supabase
    .from('documentos_emitidos')
    .select('id, numero_documento, empresa_id', { count: 'exact' })
    .filter('empresa_id', 'is', null);
    
  console.log(`Orphan documents (NULL empresa_id): ${count}`);
  
  if (count && count > 0) {
     console.log("Sample orphan IDs:", orphans?.slice(0, 5).map(r => r.id));
     // If we had a way to know who created them, we'd fix them here.
     // For safety, we just report them.
  }

  // Check if any documents belong to companies that don't exist
  const { data: allDocs } = await supabase.from('documentos_emitidos').select('empresa_id');
  const uniqueCompIds = [...new Set(allDocs?.map(d => d.empresa_id).filter(id => id))];
  
  for (const cid of uniqueCompIds) {
      const { data: comp } = await supabase.from('empresas').select('id').eq('id', cid).maybeSingle();
      if (!comp) {
          console.warn(`WARNING: Document(s) found for non-existent company ID: ${cid}`);
      }
  }
}

check();
