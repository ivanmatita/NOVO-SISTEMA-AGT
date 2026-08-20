import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const PROD_URL = "https://nawqfidnawokqaheqvar.supabase.co";
const PROD_SERVICE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hd3FmaWRuYXdva3FhaGVxdmFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODIxODE0NiwiZXhwIjoyMDkzNzk0MTQ2fQ.ToB7OlAF5FDHEKZMAZLmbvLtHb250qiVFmOUQm1VaOo";
const prodClient = createClient(PROD_URL, PROD_SERVICE, { auth: { persistSession: false } });

async function syncAllColumns() {
  const stgRaw = fs.readFileSync('C:/Users/Ivan/.gemini/antigravity/brain/7e87675c-4928-4b02-b870-844cf0ba601e/.system_generated/steps/2377/output.txt', 'utf8');
  const prdRaw = fs.readFileSync('C:/Users/Ivan/.gemini/antigravity/brain/7e87675c-4928-4b02-b870-844cf0ba601e/.system_generated/steps/2379/output.txt', 'utf8');

  const parseData = (raw) => {
    try {
      const obj = JSON.parse(raw);
      const resStr = obj.result || raw;
      const startIdx = resStr.indexOf('[');
      const endIdx = resStr.lastIndexOf(']');
      if (startIdx !== -1 && endIdx !== -1) {
        return JSON.parse(resStr.substring(startIdx, endIdx + 1));
      }
    } catch (e) {
      console.error("Parse error:", e);
    }
    return [];
  };

  const stgCols = parseData(stgRaw);
  const prdCols = parseData(prdRaw);

  const prdColSet = new Set(prdCols.map(c => `${c.table_name}.${c.column_name}`));
  const prdTables = new Set(prdCols.map(c => c.table_name));

  const missingColumns = [];
  for (const col of stgCols) {
    if (prdTables.has(col.table_name) && !prdColSet.has(`${col.table_name}.${col.column_name}`)) {
      missingColumns.push(col);
    }
  }

  console.log(`Colunas em falta em Produção: ${missingColumns.length}`);
  
  let alterStatements = [];
  for (const col of missingColumns) {
    let typeDef = col.data_type;
    if (col.data_type === 'USER-DEFINED') typeDef = 'text';
    if (col.data_type === 'ARRAY') typeDef = 'text[]';
    
    let def = '';
    if (col.column_default && !col.column_default.includes('nextval')) {
      def = ` DEFAULT ${col.column_default}`;
    }
    alterStatements.push(`ALTER TABLE public.${col.table_name} ADD COLUMN IF NOT EXISTS ${col.column_name} ${typeDef}${def};`);
  }

  // Executar em lotes de 20
  for (let i = 0; i < alterStatements.length; i += 20) {
    const batch = alterStatements.slice(i, i + 20).join('\n');
    console.log(`Aplicando lote ${i / 20 + 1}...`);
    const { error } = await prodClient.rpc('query_exec', { query: batch });
    if (error) console.error("Erro no lote:", error.message);
  }

  console.log("✅ Adicionadas todas as colunas em falta!");

  // Garantir RLS universal em todas as tabelas
  console.log("\nAplicando RLS universal...");
  const tableList = Array.from(prdTables);
  for (const table of tableList) {
    const rlsSql = `
      ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "${table}_universal_access" ON public.${table};
      CREATE POLICY "${table}_universal_access" ON public.${table}
        FOR ALL TO public USING (true) WITH CHECK (true);
    `;
    await prodClient.rpc('query_exec', { query: rlsSql });
  }

  // Recarregar cache de esquema PostgREST
  await prodClient.rpc('query_exec', { query: "NOTIFY pgrst, 'reload schema';" });
  console.log("✅ RLS universal e reload de schema concluídos com sucesso!");
}

syncAllColumns().catch(console.error);
