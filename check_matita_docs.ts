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
  const email = "matitaivan7@gmail.com";
  
  // 1. Get user profile
  const { data: profile } = await supabase.from('perfis').select('*').eq('email', email).maybeSingle();
  console.log("User Profile:", profile);
  
  if (profile) {
      // 2. Count docs for this company
      const { count } = await supabase
        .from('documentos_emitidos')
        .select('id', { count: 'exact' })
        .eq('empresa_id', profile.empresa_id);
      
      console.log(`Documents for company ${profile.empresa_id}: ${count}`);
      
      // 3. Count total docs in DB
      const { count: total } = await supabase
        .from('documentos_emitidos')
        .select('id', { count: 'exact' });
      
      console.log(`Total documents in DB: ${total}`);
      
      if (total && total > 0 && (!count || count === 0)) {
          console.log("WARNING: Current user has NO documents found, but DB has documents.");
          const { data: sample } = await supabase.from('documentos_emitidos').select('empresa_id').limit(5);
          console.log("Sample empresa_ids in documents_emitidos:", sample?.map(s => s.empresa_id));
      }
  }
}

check();
