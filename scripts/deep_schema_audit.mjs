import { createClient } from '@supabase/supabase-js';

const PROD_URL = "https://nawqfidnawokqaheqvar.supabase.co";
const PROD_SERVICE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hd3FmaWRuYXdva3FhaGVxdmFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODIxODE0NiwiZXhwIjoyMDkzNzk0MTQ2fQ.ToB7OlAF5FDHEKZMAZLmbvLtHb250qiVFmOUQm1VaOo";

const STAGING_URL = "https://sfnibpxfevhelaikqbiq.supabase.co";
const STAGING_SERVICE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbmlicHhmZXZoZWxhaWtxYmlxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzA1MDI4OCwiZXhwIjoyMTAyNjI2Mjg4fQ.4wVvNNMK8dUTUXsQ8LklD4OBHa-s02VPlY7H0gC0cbw";

const prodClient = createClient(PROD_URL, PROD_SERVICE, { auth: { persistSession: false } });
const stagingClient = createClient(STAGING_URL, STAGING_SERVICE, { auth: { persistSession: false } });

const targetTables = [
  'empresas',
  'perfis',
  'system_users',
  'clientes',
  'fornecedores',
  'produtos',
  'colaboradores',
  'locais_trabalho',
  'documentos',
  'invoices',
  'licencas_empresas',
  'licencas_empresa',
  'config_empresa',
  'pos_user_configs',
  'caixas',
  'armazens',
  'exercicios_fiscais'
];

async function inspectTable(client, envName, tableName) {
  try {
    const { data, error } = await client.from(tableName).select('*').limit(1);
    if (error) {
      return { envName, tableName, status: 'ERROR', message: error.message };
    }
    const sample = (data && data.length > 0) ? data[0] : null;
    const columns = sample ? Object.keys(sample) : [];
    
    // Contar total de registos
    const { count, error: countErr } = await client.from(tableName).select('*', { count: 'exact', head: true });
    return { 
      envName, 
      tableName, 
      status: 'OK', 
      rowCount: count ?? 0, 
      columns,
      sample
    };
  } catch (err) {
    return { envName, tableName, status: 'EXCEPTION', message: err.message };
  }
}

async function run() {
  console.log("==================================================");
  console.log("🔍 AUDITORIA PROFUNDA DE TABELAS: STAGING VS PRODUÇÃO");
  console.log("==================================================\n");

  for (const table of targetTables) {
    console.log(`\n==================== TABELA: [${table}] ====================`);
    const stg = await inspectTable(stagingClient, 'STAGING', table);
    const prd = await inspectTable(prodClient, 'PRODUÇÃO', table);

    console.log(`STAGING:  Status=${stg.status} | Total Registos=${stg.rowCount ?? stg.message}`);
    if (stg.status === 'OK' && stg.columns.length > 0) {
      console.log(`  Colunas em Staging (${stg.columns.length}):`, stg.columns.join(', '));
    }

    console.log(`PRODUÇÃO: Status=${prd.status} | Total Registos=${prd.rowCount ?? prd.message}`);
    if (prd.status === 'OK' && prd.columns.length > 0) {
      console.log(`  Colunas em Produção (${prd.columns.length}):`, prd.columns.join(', '));
    }

    if (stg.status === 'OK' && prd.status === 'OK') {
      const stgCols = new Set(stg.columns);
      const prdCols = new Set(prd.columns);

      const missingInProd = stg.columns.filter(c => !prdCols.has(c));
      const missingInStg = prd.columns.filter(c => !stgCols.has(c));

      if (missingInProd.length > 0) {
        console.log(`  ⚠️ COLUNAS EM STAGING AUSENTES EM PRODUÇÃO:`, missingInProd.join(', '));
      }
      if (missingInStg.length > 0) {
        console.log(`  ℹ️ Colunas em Produção ausentes em Staging:`, missingInStg.join(', '));
      }
      if (missingInProd.length === 0 && missingInStg.length === 0 && stg.columns.length > 0) {
        console.log(`  ✅ Nomes de Colunas Idênticos.`);
      }
    }
  }
}

run().catch(console.error);
