// Apply migration to Staging Supabase in sequential safe chunks
const token = 'process.env.SUPABASE_TOKEN';
const stagingRef = 'sfnibpxfevhelaikqbiq';

async function sql(label, query) {
  console.log(`\n--- ${label} ---`);
  const res = await fetch(`https://api.supabase.com/v1/projects/${stagingRef}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  const json = await res.json();
  if (!res.ok || (Array.isArray(json) && json.some && json.message)) {
    console.error(`❌ FAIL [${label}]:`, json.message || json);
    return false;
  }
  console.log(`✅ OK [${label}]`, Array.isArray(json) ? `(${json.length} rows)` : '');
  return true;
}

async function run() {
  // STEP 1: Fix the broken sync_armazens_fields trigger that refs company_id
  await sql("Fix sync_armazens_fields trigger", `
    CREATE OR REPLACE FUNCTION public.sync_armazens_fields()
    RETURNS TRIGGER LANGUAGE plpgsql AS $$
    BEGIN
      IF NEW.name IS NOT NULL AND NEW.nome IS NULL THEN NEW.nome := NEW.name;
      ELSIF NEW.nome IS NOT NULL AND NEW.name IS NULL THEN NEW.name := NEW.nome; END IF;

      IF NEW.description IS NOT NULL AND NEW.descricao IS NULL THEN NEW.descricao := NEW.description;
      ELSIF NEW.descricao IS NOT NULL AND NEW.description IS NULL THEN NEW.description := NEW.descricao; END IF;

      IF NEW.location IS NOT NULL AND NEW.localizacao IS NULL THEN NEW.localizacao := NEW.location;
      ELSIF NEW.localizacao IS NOT NULL AND NEW.location IS NULL THEN NEW.location := NEW.localizacao; END IF;

      RETURN NEW;
    END;
    $$;
  `);

  // STEP 2: Harmonize empresas
  await sql("Empresas: sync nome_empresa", `
    UPDATE public.empresas SET nome_empresa = nome 
    WHERE nome_empresa IS NULL OR nome_empresa = '';
  `);

  await sql("Empresas: drop old insert policy", `
    DROP POLICY IF EXISTS "empresas_insert_policy" ON public.empresas;
    DROP POLICY IF EXISTS "empresas_insert_authenticated" ON public.empresas;
  `);

  await sql("Empresas: create insert policy", `
    CREATE POLICY "empresas_insert_authenticated" ON public.empresas 
    FOR INSERT TO authenticated WITH CHECK (true);
  `);

  await sql("Empresas: drop old update policy", `
    DROP POLICY IF EXISTS "empresas_update_policy" ON public.empresas;
    DROP POLICY IF EXISTS "empresas_update_authenticated" ON public.empresas;
  `);

  await sql("Empresas: create update policy", `
    CREATE POLICY "empresas_update_authenticated" ON public.empresas 
    FOR UPDATE TO authenticated USING (true);
  `);

  // STEP 3: Harmonize produtos
  await sql("Produtos: add preco_venda column", `
    ALTER TABLE public.produtos ADD COLUMN IF NOT EXISTS preco_venda numeric;
  `);
  await sql("Produtos: sync preco -> preco_venda", `
    UPDATE public.produtos SET preco_venda = preco WHERE preco_venda IS NULL AND preco IS NOT NULL;
  `);
  await sql("Produtos: sync preco_venda -> preco", `
    UPDATE public.produtos SET preco = preco_venda WHERE preco IS NULL AND preco_venda IS NOT NULL;
  `);

  // STEP 4: Harmonize armazens
  await sql("Armazens: add codigo column", `
    ALTER TABLE public.armazens ADD COLUMN IF NOT EXISTS codigo text;
  `);
  await sql("Armazens: populate codigo", `
    UPDATE public.armazens SET codigo = 'ARM-' || substring(id::text, 1, 4) WHERE codigo IS NULL;
  `);

  // STEP 5: Harmonize caixas
  await sql("Caixas: add codigo column", `
    ALTER TABLE public.caixas ADD COLUMN IF NOT EXISTS codigo text;
  `);
  await sql("Caixas: sync codigo_caixa -> codigo", `
    UPDATE public.caixas SET codigo = COALESCE(codigo_caixa, 'CX-01') WHERE codigo IS NULL;
  `);
  await sql("Caixas: sync codigo -> codigo_caixa", `
    UPDATE public.caixas SET codigo_caixa = codigo WHERE codigo_caixa IS NULL;
  `);

  // STEP 6: Harmonize colaboradores
  await sql("Colaboradores: add salario_base column", `
    ALTER TABLE public.colaboradores ADD COLUMN IF NOT EXISTS salario_base numeric;
  `);
  await sql("Colaboradores: sync salario -> salario_base", `
    UPDATE public.colaboradores SET salario_base = salario WHERE salario_base IS NULL AND salario IS NOT NULL;
  `);
  await sql("Colaboradores: sync salario_base -> salario", `
    UPDATE public.colaboradores SET salario = salario_base WHERE salario IS NULL AND salario_base IS NOT NULL;
  `);

  // STEP 7: Harmonize hr_processamentos
  await sql("HR Processamentos: add status column", `
    ALTER TABLE public.hr_processamentos ADD COLUMN IF NOT EXISTS status text;
  `);
  await sql("HR Processamentos: sync estado -> status", `
    UPDATE public.hr_processamentos SET status = estado WHERE status IS NULL AND estado IS NOT NULL;
  `);

  // STEP 8: Harmonize exercicios_fiscais
  await sql("Exercicios Fiscais: add estado column", `
    ALTER TABLE public.exercicios_fiscais ADD COLUMN IF NOT EXISTS estado text;
  `);
  await sql("Exercicios Fiscais: populate estado from fechado", `
    UPDATE public.exercicios_fiscais SET estado = CASE WHEN fechado = true THEN 'fechado' ELSE 'aberto' END 
    WHERE estado IS NULL;
  `);

  // STEP 9: Populate Categorias
  await sql("Categorias: insert defaults for empresa Alpha", `
    INSERT INTO public.categorias (id, empresa_id, nome, created_at)
    SELECT gen_random_uuid(), '11111111-0000-0000-0000-000000000001'::uuid, c.nome, NOW()
    FROM (VALUES ('Alimentação & Bebidas'), ('Serviços & Consultoria'), ('Informática & Eletrónicos'), ('Material de Escritório'), ('Geral')) AS c(nome)
    WHERE NOT EXISTS (SELECT 1 FROM public.categorias WHERE empresa_id = '11111111-0000-0000-0000-000000000001');
  `);

  // STEP 10: RLS policies per table
  const tables = [
    'clientes', 'fornecedores', 'produtos', 'categorias', 'armazens',
    'caixas', 'series_fiscais', 'documentos_emitidos',
    'colaboradores', 'hr_processamentos',
    'locais_trabalho', 'exercicios_fiscais', 'licencas_empresas', 'compras',
    'caixa_movimentacoes', 'impostos',
  ];

  for (const tbl of tables) {
    await sql(`RLS: enable on ${tbl}`, `ALTER TABLE public.${tbl} ENABLE ROW LEVEL SECURITY;`);
    await sql(`RLS: drop old ${tbl}_authenticated_all`, `DROP POLICY IF EXISTS "${tbl}_authenticated_all" ON public.${tbl};`);
    await sql(`RLS: create ${tbl}_authenticated_all`, `
      CREATE POLICY "${tbl}_authenticated_all" ON public.${tbl}
      FOR ALL TO authenticated
      USING (
        empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = auth.uid())
        OR (SELECT is_superadmin FROM public.perfis WHERE id = auth.uid()) = true
        OR (SELECT role FROM public.perfis WHERE id = auth.uid()) = 'superadmin'
      )
      WITH CHECK (
        empresa_id = (SELECT empresa_id FROM public.perfis WHERE id = auth.uid())
        OR (SELECT is_superadmin FROM public.perfis WHERE id = auth.uid()) = true
        OR (SELECT role FROM public.perfis WHERE id = auth.uid()) = 'superadmin'
      );
    `);
  }

  console.log("\n=== MIGRATION COMPLETA ===");
}

run().catch(console.error);

