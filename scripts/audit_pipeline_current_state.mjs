// Audit current pipeline architecture and state
import fs from 'fs';
import path from 'path';

const token = process.env.SUPABASE_TOKEN;
const refStaging = 'sfnibpxfevhelaikqbiq';
const refProd = 'nawqfidnawokqaheqvar';

async function sql(ref, query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  return await r.json();
}

async function run() {
  console.log('=== 1. AUDITORIA DO SUPABASE STAGING ===');
  const stagingTables = await sql(refStaging, `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;`);
  console.log(`Total tabelas em Staging: ${Array.isArray(stagingTables) ? stagingTables.length : 'Erro'}`);

  const stagingMigrationTable = await sql(refStaging, `
    SELECT tablename FROM pg_tables WHERE tablename LIKE '%migration%' OR tablename LIKE '%schema_version%';
  `);
  console.log('Tabelas de migration em Staging:', stagingMigrationTable);

  console.log('\n=== 2. AUDITORIA DO SUPABASE PRODUÇÃO ===');
  const prodTables = await sql(refProd, `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;`);
  console.log(`Total tabelas em Produção: ${Array.isArray(prodTables) ? prodTables.length : 'Erro'}`);

  const prodMigrationTable = await sql(refProd, `
    SELECT tablename FROM pg_tables WHERE tablename LIKE '%migration%' OR tablename LIKE '%schema_version%';
  `);
  console.log('Tabelas de migration em Produção:', prodMigrationTable);

  console.log('\n=== 3. AUDITORIA DE WORKFLOWS GITHUB E MIGRATIONS LOCAIS ===');
  const hasWorkflows = fs.existsSync('.github/workflows');
  console.log('Diretório .github/workflows existe:', hasWorkflows);
  if (hasWorkflows) {
    console.log('Workflows:', fs.readdirSync('.github/workflows'));
  }

  const hasMigrations = fs.existsSync('supabase/migrations');
  console.log('Diretório supabase/migrations existe:', hasMigrations);
  if (hasMigrations) {
    console.log('Migrations:', fs.readdirSync('supabase/migrations'));
  }

  console.log('\n=== 4. AUDITORIA DE MANIFESTOS / RELEASES ===');
  const hasManifest = fs.existsSync('release-manifest.json');
  console.log('release-manifest.json existe:', hasManifest);

  console.log('\n=== AUDITORIA COMPLETA CONCLUÍDA ===');
}

run().catch(console.error);
