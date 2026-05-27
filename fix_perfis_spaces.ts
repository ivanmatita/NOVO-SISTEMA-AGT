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

async function fixPerfis() {
  const { data, error } = await supabase
    .from('perfis')
    .select('id, email, username, nome');

  if (error) {
    console.error("Error fetching perfis:", error);
    return;
  }

  console.log(`Checking ${data.length} profiles...`);
  let fixedCount = 0;

  for (const p of data) {
    let needsFix = false;
    let newUsername = p.username;
    let newNome = p.nome;

    // 1. Trim spaces
    if (p.username && p.username !== p.username.trim()) {
      newUsername = p.username.trim();
      needsFix = true;
    }
    if (p.nome && p.nome !== p.nome.trim()) {
      newNome = p.nome.trim();
      needsFix = true;
    }

    // 2. Set username if null (fallback to email prefix)
    if (!newUsername && p.email) {
      newUsername = p.email.split('@')[0];
      needsFix = true;
    }

    if (needsFix) {
      console.log(`Fixing user ${p.id} (${p.email}): Username [${p.username}] -> [${newUsername}], Nome [${p.nome}] -> [${newNome}]`);
      const { error: updateError } = await supabase
        .from('perfis')
        .update({
          username: newUsername,
          nome: newNome
        })
        .eq('id', p.id);
      
      if (updateError) {
        console.error(`Failed to update ${p.id}:`, updateError);
      } else {
        fixedCount++;
      }
    }
  }

  console.log(`Fixed ${fixedCount} profiles.`);
}

fixPerfis();
