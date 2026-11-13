// Apply corrected RLS policies to Staging (using role = 'superadmin', no is_superadmin)
const token = 'process.env.SUPABASE_TOKEN';
const stagingRef = 'sfnibpxfevhelaikqbiq';

async function sql(label, query) {
  process.stdout.write(`\n--- ${label} ---\n`);
  const res = await fetch(`https://api.supabase.com/v1/projects/${stagingRef}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  const json = await res.json();
  if (!res.ok || json.message) {
    console.error(`❌ FAIL [${label}]:`, json.message || json);
    return false;
  }
  console.log(`✅ OK [${label}]`);
  return true;
}

const tables = [
  'clientes', 'fornecedores', 'produtos', 'categorias', 'armazens',
  'caixas', 'series_fiscais', 'documentos_emitidos',
  'colaboradores', 'hr_processamentos',
  'locais_trabalho', 'exercicios_fiscais', 'licencas_empresas', 'compras',
  'caixa_movimentacoes', 'impostos',
];

async function run() {
  for (const tbl of tables) {
    // Drop old policies (both naming conventions)
    await sql(`RLS drop old: ${tbl}`, `
      DROP POLICY IF EXISTS "${tbl}_authenticated_all" ON public.${tbl};
      DROP POLICY IF EXISTS "${tbl}_isolation" ON public.${tbl};
      DROP POLICY IF EXISTS "${tbl}_all_access" ON public.${tbl};
    `);

    // Create clean policy using only role check (no is_superadmin)
    await sql(`RLS create: ${tbl}`, `
      CREATE POLICY "${tbl}_authenticated_all" ON public.${tbl}
      FOR ALL TO authenticated
      USING (
        empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = auth.uid() LIMIT 1)
        OR (SELECT role FROM public.perfis WHERE id = auth.uid() LIMIT 1) = 'superadmin'
      )
      WITH CHECK (
        empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = auth.uid() LIMIT 1)
        OR (SELECT role FROM public.perfis WHERE id = auth.uid() LIMIT 1) = 'superadmin'
      );
    `);
  }

  // Also handle the perfis table separately (uses id = auth.uid())
  await sql("RLS drop old: perfis", `
    DROP POLICY IF EXISTS "perfis_authenticated_all" ON public.perfis;
    DROP POLICY IF EXISTS "perfis_isolation" ON public.perfis;
    DROP POLICY IF EXISTS "perfis_all_access" ON public.perfis;
  `);
  await sql("RLS create: perfis", `
    CREATE POLICY "perfis_authenticated_all" ON public.perfis
    FOR ALL TO authenticated
    USING (
      id = auth.uid()
      OR empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = auth.uid() LIMIT 1)
      OR (SELECT role FROM public.perfis WHERE id = auth.uid() LIMIT 1) = 'superadmin'
    )
    WITH CHECK (
      id = auth.uid()
      OR empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = auth.uid() LIMIT 1)
      OR (SELECT role FROM public.perfis WHERE id = auth.uid() LIMIT 1) = 'superadmin'
    );
  `);

  console.log("\n=== RLS POLICIES APLICADAS COM SUCESSO ===");
}

run().catch(console.error);

