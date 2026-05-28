import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const anonKey = (process.env.VITE_SUPABASE_ANON_KEY || '').trim();

const supabase = createClient(url, anonKey);

async function run() {
  console.log("Checking target tables existence...");
  const { data: dataDocs, error: errorDocs } = await supabase.from('documentos_empresa').select('*').limit(1);
  console.log("documentos_empresa:", errorDocs ? `ERROR: ${errorDocs.message} [Code: ${errorDocs.code}]` : "EXISTS!");

  const { data: dataMedia, error: errorMedia } = await supabase.from('media_arquivos').select('*').limit(1);
  console.log("media_arquivos:", errorMedia ? `ERROR: ${errorMedia.message} [Code: ${errorMedia.code}]` : "EXISTS!");
}

run();
