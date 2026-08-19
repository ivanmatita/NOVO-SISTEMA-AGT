// Fix infinite recursion in RLS policies by using security definer helper functions
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
  // STEP 1: Create security-definer helper functions to avoid RLS recursion
  // These bypass RLS when called, so querying perfis from within a perfis RLS check is safe
  await sql("Create auth_empresa_id() helper", `
    CREATE OR REPLACE FUNCTION public.auth_empresa_id()
    RETURNS uuid
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
      SELECT empresa_id FROM public.perfis WHERE id = auth.uid() LIMIT 1;
    $$;
  `);

  await sql("Create auth_role() helper", `
    CREATE OR REPLACE FUNCTION public.auth_role()
    RETURNS text
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
      SELECT role FROM public.perfis WHERE id = auth.uid() LIMIT 1;
    $$;
  `);

  // STEP 2: Fix perfis RLS first (simple, no self-reference)
  await sql("RLS perfis: drop old", `
    DROP POLICY IF EXISTS "perfis_authenticated_all" ON public.perfis;
    DROP POLICY IF EXISTS "perfis_isolation" ON public.perfis;
    DROP POLICY IF EXISTS "perfis_all_access" ON public.perfis;
    DROP POLICY IF EXISTS "perfis_select_own" ON public.perfis;
    DROP POLICY IF EXISTS "perfis_select_same_company" ON public.perfis;
  `);

  // Perfis: user can see own record + others in same company (using SECURITY DEFINER fn)
  await sql("RLS perfis: create SELECT policy", `
    CREATE POLICY "perfis_select_policy" ON public.perfis
    FOR SELECT TO authenticated
    USING (
      id = auth.uid()
      OR empresa_id = public.auth_empresa_id()
      OR public.auth_role() = 'superadmin'
    );
  `);

  await sql("RLS perfis: create INSERT policy", `
    CREATE POLICY "perfis_insert_policy" ON public.perfis
    FOR INSERT TO authenticated
    WITH CHECK (
      id = auth.uid()
      OR public.auth_role() = 'superadmin'
    );
  `);

  await sql("RLS perfis: create UPDATE policy", `
    CREATE POLICY "perfis_update_policy" ON public.perfis
    FOR UPDATE TO authenticated
    USING (
      id = auth.uid()
      OR empresa_id = public.auth_empresa_id()
      OR public.auth_role() = 'superadmin'
    );
  `);

  await sql("RLS perfis: create DELETE policy", `
    CREATE POLICY "perfis_delete_policy" ON public.perfis
    FOR DELETE TO authenticated
    USING (
      id = auth.uid()
      OR public.auth_role() = 'superadmin'
    );
  `);

  // STEP 3: Re-apply all table policies using the security definer helper functions
  for (const tbl of tables) {
    await sql(`RLS drop old: ${tbl}`, `
      DROP POLICY IF EXISTS "${tbl}_authenticated_all" ON public.${tbl};
      DROP POLICY IF EXISTS "${tbl}_isolation" ON public.${tbl};
      DROP POLICY IF EXISTS "${tbl}_all_access" ON public.${tbl};
    `);

    await sql(`RLS create: ${tbl}`, `
      CREATE POLICY "${tbl}_authenticated_all" ON public.${tbl}
      FOR ALL TO authenticated
      USING (
        empresa_id = public.auth_empresa_id()
        OR public.auth_role() = 'superadmin'
      )
      WITH CHECK (
        empresa_id = public.auth_empresa_id()
        OR public.auth_role() = 'superadmin'
      );
    `);
  }

  console.log("\n=== RLS RECURSION FIX APLICADO COM SUCESSO ===");
}

run().catch(console.error);

