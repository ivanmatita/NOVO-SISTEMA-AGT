import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const query = `
    ALTER TABLE tabela_impostos ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true;
    UPDATE tabela_impostos SET ativo = true WHERE ativo IS NULL;
  `;
  const { data, error } = await supabaseAdmin.auth.users; // fake it
  // I must execute via the REST api by adding it to a test_server route temporarily!
}
run();
