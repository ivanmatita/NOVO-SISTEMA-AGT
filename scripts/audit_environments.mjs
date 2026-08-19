// READ-ONLY AUDIT: Test connection and compare metadata of both Supabase projects
import { createClient } from '@supabase/supabase-js';

// Production Credentials
const PROD_URL = "https://nawqfidnawokqaheqvar.supabase.co";
const PROD_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hd3FmaWRuYXdva3FhaGVxdmFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMTgxNDYsImV4cCI6MjA5Mzc5NDE0Nn0.qFkIexxKcQDWax3pfhcgPMR3ZFIsE-gYWTS62i5Edgs";
const PROD_SERVICE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hd3FmaWRuYXdva3FhaGVxdmFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODIxODE0NiwiZXhwIjoyMDkzNzk0MTQ2fQ.ToB7OlAF5FDHEKZMAZLmbvLtHb250qiVFmOUQm1VaOo";

// Staging Credentials
const STAGING_URL = "https://sfnibpxfevhelaikqbiq.supabase.co";
const STAGING_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbmlicHhmZXZoZWxhaWtxYmlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNTAyODgsImV4cCI6MjEwMjYyNjI4OH0.AnxqAF-TBY556gp2oPV0I5hfTjozaCMIHaeH7OhifiM";
const STAGING_SERVICE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbmlicHhmZXZoZWxhaWtxYmlxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzA1MDI4OCwiZXhwIjoyMTAyNjI2Mjg4fQ.4wVvNNMK8dUTUXsQ8LklD4OBHa-s02VPlY7H0gC0cbw";

async function audit() {
  console.log("==================================================");
  console.log("🔍 AUDITORIA SOMENTE LEITURA — COMPARATIVO DE AMBIENTES");
  console.log("==================================================");

  console.log("\n--- TESTANDO LIGAÇÃO COM PRODUÇÃO (nawqfidnawokqaheqvar) ---");
  const prodClient = createClient(PROD_URL, PROD_SERVICE, { auth: { persistSession: false } });
  let prodConnected = false;
  let prodTables = [];
  try {
    const { data, error } = await prodClient.from('empresas').select('id, nome, nif').limit(5);
    if (error) {
      console.log("Produção query error:", error.message);
    } else {
      prodConnected = true;
      console.log(`✅ Produção conectada! ${data.length} empresas encontradas.`);
    }
  } catch (e) {
    console.log("❌ Falha de conexão Produção:", e.message);
  }

  console.log("\n--- TESTANDO LIGAÇÃO COM STAGING (sfnibpxfevhelaikqbiq) ---");
  const stagingClient = createClient(STAGING_URL, STAGING_SERVICE, { auth: { persistSession: false } });
  let stagingConnected = false;
  try {
    const { data, error } = await stagingClient.from('empresas').select('id, nome, nif').limit(5);
    if (error) {
      console.log("Staging query error:", error.message);
    } else {
      stagingConnected = true;
      console.log(`✅ Staging conectada! ${data.length} empresas encontradas.`);
    }
  } catch (e) {
    console.log("❌ Falha de conexão Staging:", e.message);
  }

  console.log("\n==================================================");
  console.log("📊 RESULTADO DA VERIFICAÇÃO DE PROJETOS SUPABASE:");
  console.log(`Produção Project ID: nawqfidnawokqaheqvar`);
  console.log(`Staging Project ID:  sfnibpxfevhelaikqbiq`);
  console.log(`URLs Diferentes:     ${PROD_URL !== STAGING_URL ? "SIM ✅" : "NÃO ❌"}`);
  console.log(`Chaves Diferentes:   ${PROD_ANON !== STAGING_ANON ? "SIM ✅" : "NÃO ❌"}`);
  console.log("==================================================");
}

audit().catch(console.error);

