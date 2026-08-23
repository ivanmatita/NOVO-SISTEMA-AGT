/**
 * scripts/audit_supabase_staging_db.mjs
 * Script para auditar a base de dados Supabase Staging (sfnibpxfevhelaikqbiq)
 */

const STAGING_URL = "https://sfnibpxfevhelaikqbiq.supabase.co";
const STAGING_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbmlicHhmZXZoZWxhaWtxYmlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNTAyODgsImV4cCI6MjEwMjYyNjI4OH0.AnxqAF-TBY556gp2oPV0I5hfTjozaCMIHaeH7OhifiM";
const STAGING_SERVICE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbmlicHhmZXZoZWxhaWtxYmlxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzA1MDI4OCwiZXhwIjoyMTAyNjI2Mjg4fQ.4wVvNNMK8dUTUXsQ8LklD4OBHa-s02VPlY7H0gC0cbw";

async function testTable(table, key, name) {
  try {
    const res = await fetch(`${STAGING_URL}/rest/v1/${table}?select=*&limit=3`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });
    const data = await res.json();
    if (res.ok) {
      console.log(`✅ [${name}] Tabela '${table}': OK (${Array.isArray(data) ? data.length : 0} registos)`);
      return { ok: true, count: Array.isArray(data) ? data.length : 0, sample: data?.[0] };
    } else {
      console.log(`❌ [${name}] Tabela '${table}': HTTP ${res.status} - ${JSON.stringify(data)}`);
      return { ok: false, error: data };
    }
  } catch (e) {
    console.log(`❌ [${name}] Tabela '${table}': EXCEPTION - ${e.message}`);
    return { ok: false, error: e.message };
  }
}

async function auditStagingDB() {
  console.log('================================================================================');
  console.log(`🔍 AUDITORIA DO SUPABASE STAGING: ${STAGING_URL}`);
  console.log('================================================================================\n');

  const tables = [
    'clientes',
    'perfis',
    'empresas',
    'locais_trabalho',
    'exercicios_fiscais',
    'config_empresa',
    'colaboradores',
    'produtos',
    'series_fiscais',
    'caixas',
    'armazens',
    'documentos_emitidos',
    'contas_bancarias',
    'centro_custos'
  ];

  console.log('--- TESTE 1: LEITURA COM ANON KEY (Simulando Frontend/RLS) ---');
  for (const t of tables) {
    await testTable(t, STAGING_ANON, 'ANON');
  }

  console.log('\n--- TESTE 2: LEITURA COM SERVICE ROLE KEY (Simulando Backend Admin) ---');
  for (const t of tables) {
    await testTable(t, STAGING_SERVICE, 'ADMIN');
  }

  console.log('\n--- TESTE 3: AUDITORIA DE CLIENTES NO STAGING ---');
  const resClientes = await fetch(`${STAGING_URL}/rest/v1/clientes?select=id,nome,nif,empresa_id&limit=10`, {
    headers: { 'apikey': STAGING_SERVICE, 'Authorization': `Bearer ${STAGING_SERVICE}` }
  });
  const clientes = await resClientes.json();
  console.log('Clientes existentes no Staging:', clientes);

  console.log('\n--- TESTE 4: AUDITORIA DE EMPRESAS NO STAGING ---');
  const resEmp = await fetch(`${STAGING_URL}/rest/v1/empresas?select=id,nome,nif&limit=5`, {
    headers: { 'apikey': STAGING_SERVICE, 'Authorization': `Bearer ${STAGING_SERVICE}` }
  });
  const empresas = await resEmp.json();
  console.log('Empresas no Staging:', empresas);

  console.log('\n--- TESTE 5: AUDITORIA DE PERFIS NO STAGING ---');
  const resPerfis = await fetch(`${STAGING_URL}/rest/v1/perfis?select=id,email,nome,role,empresa_id&limit=5`, {
    headers: { 'apikey': STAGING_SERVICE, 'Authorization': `Bearer ${STAGING_SERVICE}` }
  });
  const perfis = await resPerfis.json();
  console.log('Perfis no Staging:', perfis);
}

auditStagingDB();
