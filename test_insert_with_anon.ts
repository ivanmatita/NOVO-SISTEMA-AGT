import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const rawUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const url = rawUrl
  .replace(/\/rest\/v1\/?$/, "")
  .replace(/\/auth\/v1\/?$/, "")
  .replace(/\/$/, "");
const anonKey = (process.env.VITE_SUPABASE_ANON_KEY || '').trim();

const supabase = createClient(url, anonKey);

async function run() {
  console.log("Testing insert as ANON user (RLS test)...");
  // Let's try to query first
  const { data: selectDocs, error: selectErr } = await supabase
    .from('documentos_empresa')
    .select('*');
  console.log("SELECT error (if any):", selectErr);

  // Let's try to insert a document
  const { data: insertDocs, error: insertErr } = await supabase
    .from('documentos_empresa')
    .insert([{
      empresa_id: '7923151c-9cfd-4cff-909d-6a9b74e3d52f', // match company_id from perfis
      titulo_documento: 'Documento Teste RLS',
      descricao: 'Teste',
      ativo: true
    }]);
  console.log("INSERT result/error:", insertDocs, insertErr);
}

run();
