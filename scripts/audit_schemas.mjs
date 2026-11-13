// READ-ONLY SCHEMA AUDIT: Compare tables, columns, RLS, policies, functions, storage in both projects
const token = 'process.env.SUPABASE_TOKEN';

async function sqlQuery(projectRef, query) {
  try {
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    const json = await res.json();
    if (!res.ok) return { error: json.message || JSON.stringify(json) };
    return { data: json };
  } catch (e) {
    return { error: e.message };
  }
}

async function run() {
  console.log("--- AUDITORIA DE PROJETOS SUPABASE VIA MANAGEMENT API ---");
  const listRes = await fetch("https://api.supabase.com/v1/projects", {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const projects = await listRes.json();
  console.log("Projetos disponíveis na organização:");
  if (Array.isArray(projects)) {
    projects.forEach(p => {
      console.log(`- ID: ${p.id} | Nome: ${p.name} | Região: ${p.region} | Estado: ${p.status}`);
    });
  } else {
    console.log("Resposta:", projects);
  }

  console.log("\n--- AUDITANDO BANCO STAGING (sfnibpxfevhelaikqbiq) ---");
  const stagingTablesQuery = `
    SELECT table_name, 
           (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name AND table_schema = 'public') as column_count,
           (SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relname = t.table_name AND n.nspname = 'public') as rls_enabled
    FROM information_schema.tables t
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `;
  const stagingRes = await sqlQuery('sfnibpxfevhelaikqbiq', stagingTablesQuery);
  console.log(`Tabelas Staging (${stagingRes.data?.length || 0}):`);
  if (stagingRes.data) {
    stagingRes.data.forEach(row => {
      console.log(`  - ${row.table_name.padEnd(30)} | Colunas: ${String(row.column_count).padStart(2)} | RLS: ${row.rls_enabled ? 'ATIVO' : 'DESATIVADO'}`);
    });
  } else {
    console.log("Erro Staging:", stagingRes.error);
  }

  console.log("\n--- AUDITANDO BANCO PRODUÇÃO (nawqfidnawokqaheqvar) ---");
  const prodRes = await sqlQuery('nawqfidnawokqaheqvar', stagingTablesQuery);
  console.log(`Tabelas Produção (${prodRes.data?.length || 0}):`);
  if (prodRes.data) {
    prodRes.data.forEach(row => {
      console.log(`  - ${row.table_name.padEnd(30)} | Colunas: ${String(row.column_count).padStart(2)} | RLS: ${row.rls_enabled ? 'ATIVO' : 'DESATIVADO'}`);
    });
  } else {
    console.log("Erro Produção:", prodRes.error);
  }

  // Políticas RLS em Staging
  const stagingPoliciesQuery = `
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
    FROM pg_policies
    WHERE schemaname = 'public'
    ORDER BY tablename, policyname;
  `;
  const stgPol = await sqlQuery('sfnibpxfevhelaikqbiq', stagingPoliciesQuery);
  console.log(`\nPolíticas RLS em Staging: ${stgPol.data?.length || 0} policies`);

  const prodPol = await sqlQuery('nawqfidnawokqaheqvar', stagingPoliciesQuery);
  console.log(`Políticas RLS em Produção: ${prodPol.data?.length || 0} policies`);
}

run().catch(console.error);

