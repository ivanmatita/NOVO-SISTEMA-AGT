import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

if (!serviceKey) {
  console.error("SERVICE ROLE KEY MISSING");
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

const tablesToCheck = [
  'documentos_empresa',
  'secretaria_digital',
  'cartas',
  'media_arquivos',
  'documentos_emitidos',
  'empresas',
  'colaboradores',
  'tabela_impostos',
  'alertas_tarefas',
  'perfis'
];

async function check() {
  console.log("=== CHECKING TABLES EXISTENCE ===");
  for (const table of tablesToCheck) {
    const { error } = await supabase.from(table).select('count', { count: 'exact', head: true }).limit(1);
    if (error) {
      if (error.code === 'PGRST125' || error.message.includes('not find')) {
        console.log(`❌ Table [${table}]: DOES NOT EXIST (Error code ${error.code}: ${error.message})`);
      } else {
        console.log(`⚠️ Table [${table}]: EXISTS but has query issue (Error code ${error.code}: ${error.message})`);
      }
    } else {
      console.log(`✅ Table [${table}]: EXISTS AND IS ACCESSIBLE!`);
    }
  }
}

check();
