import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const PROD_URL = "https://nawqfidnawokqaheqvar.supabase.co";
const PROD_SERVICE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hd3FmaWRuYXdva3FhaGVxdmFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODIxODE0NiwiZXhwIjoyMDkzNzk0MTQ2fQ.ToB7OlAF5FDHEKZMAZLmbvLtHb250qiVFmOUQm1VaOo";
const prodClient = createClient(PROD_URL, PROD_SERVICE, { auth: { persistSession: false } });

// Definir query_exec que suporta múltiplos comandos
async function apply() {
  console.log("=== CRIANDO FUNÇÃO EXECUTE_RAW_SQL ===");
  // Criar uma função no PostgreSQL que executa um bloco SQL completo usando DO $$ BEGIN ... END $$
  await prodClient.rpc('query_exec', {
    query: `
      CREATE OR REPLACE FUNCTION public.execute_raw_sql(sql_code text)
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        EXECUTE sql_code;
      END;
      $$;
    `
  });

  const sql = fs.readFileSync('scripts/all_missing_parity.sql', 'utf8');
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 5);

  console.log(`Total de comandos a executar: ${statements.length}`);

  let success = 0;
  let errors = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i] + ';';
    try {
      const { error } = await prodClient.rpc('query_exec', { query: stmt });
      if (error) {
        // Tentar direto
        console.warn(`[${i+1}/${statements.length}] Falha em query_exec: ${error.message}`);
        errors++;
      } else {
        success++;
      }
    } catch (e) {
      errors++;
    }

    if ((i + 1) % 50 === 0 || i === statements.length - 1) {
      console.log(`Progresso: ${i + 1}/${statements.length} (Sucesso: ${success}, Erros: ${errors})`);
    }
  }

  // Notificar reload schema
  await prodClient.rpc('query_exec', { query: "NOTIFY pgrst, 'reload schema';" });
  console.log(`\n🏁 Concluído! Sucesso: ${success}, Erros: ${errors}`);
}

apply().catch(console.error);
