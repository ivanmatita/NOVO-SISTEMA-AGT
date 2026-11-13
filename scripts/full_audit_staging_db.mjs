// Full comparative database audit: Production vs Staging (READ-ONLY)
const token = 'process.env.SUPABASE_TOKEN';
const prodRef = 'nawqfidnawokqaheqvar';
const stagingRef = 'sfnibpxfevhelaikqbiq';

async function sql(projectRef, query) {
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
  console.log("=== INICIANDO AUDITORIA COMPARATIVA COMPLETA (READ-ONLY) ===");

  // 1. Tables list
  const qTables = `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `;
  const prodTablesRes = await sql(prodRef, qTables);
  const stagingTablesRes = await sql(stagingRef, qTables);

  const prodTables = (prodTablesRes.data || []).map(r => r.table_name);
  const stagingTables = (stagingTablesRes.data || []).map(r => r.table_name);

  console.log(`\n📊 Total Tabelas - Produção: ${prodTables.length} | Staging: ${stagingTables.length}`);
  const missingTablesInStaging = prodTables.filter(t => !stagingTables.includes(t));
  console.log("❌ Tabelas existentes em Produção mas AUSENTES em Staging:", missingTablesInStaging);

  // 2. Columns comparison for shared tables
  const qColumns = `
    SELECT table_name, column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position;
  `;
  const prodColsRes = await sql(prodRef, qColumns);
  const stagingColsRes = await sql(stagingRef, qColumns);

  const prodColsByTable = {};
  for (const c of (prodColsRes.data || [])) {
    if (!prodColsByTable[c.table_name]) prodColsByTable[c.table_name] = [];
    prodColsByTable[c.table_name].push(c.column_name);
  }

  const stagingColsByTable = {};
  for (const c of (stagingColsRes.data || [])) {
    if (!stagingColsByTable[c.table_name]) stagingColsByTable[c.table_name] = [];
    stagingColsByTable[c.table_name].push(c.column_name);
  }

  const missingColumns = [];
  for (const [table, cols] of Object.entries(prodColsByTable)) {
    if (stagingColsByTable[table]) {
      const missing = cols.filter(col => !stagingColsByTable[table].includes(col));
      if (missing.length > 0) {
        missingColumns.push({ table, missing });
      }
    }
  }
  console.log("\n❌ Colunas existentes em Produção mas AUSENTES em Staging:", missingColumns);

  // 3. RLS and Policies in Staging
  const qRls = `
    SELECT c.relname as table_name, c.relrowsecurity as rls_enabled
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname;
  `;
  const rlsRes = await sql(stagingRef, qRls);
  console.log("\n🛡️ RLS nas tabelas de Staging:", rlsRes.data);

  const qPolicies = `
    SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
    ORDER BY tablename, policyname;
  `;
  const policiesRes = await sql(stagingRef, qPolicies);
  console.log(`\n🛡️ Total de Policies em Staging: ${(policiesRes.data || []).length}`);
  const policiesByTable = {};
  for (const p of (policiesRes.data || [])) {
    if (!policiesByTable[p.tablename]) policiesByTable[p.tablename] = [];
    policiesByTable[p.tablename].push({ name: p.policyname, cmd: p.cmd, roles: p.roles });
  }
  console.log("Policies por tabela em Staging:", JSON.stringify(policiesByTable, null, 2));

  // 4. Staging Data counts in key tables
  const keyTables = [
    'empresas', 'perfis', 'system_users', 'clientes', 'fornecedores', 
    'produtos', 'categorias', 'armazens', 'caixas', 'series_fiscais', 
    'documentos_emitidos', 'itens_documento', 'recibos', 'pagamentos', 
    'employees', 'payroll_records', 'local_trabalho', 'exercicios_fiscais'
  ];
  
  console.log("\n📈 Contagem de dados em tabelas chave no Staging:");
  for (const t of keyTables) {
    if (stagingTables.includes(t)) {
      const countRes = await sql(stagingRef, `SELECT count(*) as count FROM public.${t};`);
      console.log(`  - ${t}: ${countRes.data?.[0]?.count ?? 'ERRO'}`);
    } else {
      console.log(`  - ${t}: TABELA AUSENTE`);
    }
  }

  // 5. Empresa and Admin user in Staging
  const adminProfileRes = await sql(stagingRef, `
    SELECT p.id, p.email, p.nome, p.empresa_id, p.role, p.is_superadmin, e.nome_empresa, e.nif
    FROM public.perfis p
    LEFT JOIN public.empresas e ON e.id = p.empresa_id;
  `);
  console.log("\n👤 Perfis e Empresas vinculadas em Staging:", adminProfileRes.data);
}

run().catch(console.error);

