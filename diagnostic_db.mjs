import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnostic() {
  console.log('--- Database Diagnostic ---');
  
  const tables = ['empresas', 'companies', 'fornecedores', 'caixas', 'compras', 'documentos_emitidos', 'clientes'];
  
  for (const table of tables) {
    try {
      const { data, error, status } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`Table '${table}': ERROR ${status} - ${error.message}`);
      } else {
        console.log(`Table '${table}': OK (Rows: ${data.length})`);
        if (data.length > 0) {
          console.log(`  Columns available: ${Object.keys(data[0]).join(', ')}`);
        } else {
          // If empty, try to get columns via another way or just report OK
          console.log(`  Table exists but has no data to inspect columns.`);
        }
      }
    } catch (err) {
      console.log(`Table '${table}': UNCAUGHT ERROR`);
    }
  }
}

diagnostic();
