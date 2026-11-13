// READ-ONLY AUDIT: Deep inspection of Auth, Storage, Functions, Triggers and Data in both environments
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
  console.log("=== COMPARAÇÃO PROFUNDA DE METADADOS ENTRE PRODUÇÃO E STAGING ===");

  for (const [envName, ref] of [['PRODUÇÃO', 'nawqfidnawokqaheqvar'], ['STAGING', 'sfnibpxfevhelaikqbiq']]) {
    console.log(`\n================== [${envName}: ${ref}] ==================`);
    
    // 1. Storage Buckets
    const bucketsRes = await sqlQuery(ref, "SELECT id, name, public, created_at FROM storage.buckets;");
    console.log(`Storage Buckets (${bucketsRes.data?.length || 0}):`, bucketsRes.data?.map(b => `${b.name} (public: ${b.public})`));

    // 2. Auth Users (Counts only)
    const authCount = await sqlQuery(ref, "SELECT count(*) as total_users, count(CASE WHEN email LIKE '%test%' OR email LIKE '%demo%' THEN 1 END) as test_users FROM auth.users;");
    console.log(`Auth Users:`, authCount.data?.[0]);

    // 3. Functions
    const fnRes = await sqlQuery(ref, `
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public'
      ORDER BY routine_name;
    `);
    console.log(`Funções em public (${fnRes.data?.length || 0}):`, fnRes.data?.map(f => f.routine_name).slice(0, 15));

    // 4. Triggers
    const trgRes = await sqlQuery(ref, `
      SELECT trigger_name, event_manipulation, event_object_table
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
      ORDER BY event_object_table, trigger_name;
    `);
    console.log(`Triggers em public (${trgRes.data?.length || 0})`);

    // 5. Contagem de Dados nas tabelas principais
    const countsQuery = `
      SELECT 
        (SELECT count(*) FROM public.empresas) as empresas_count,
        (SELECT count(*) FROM public.perfis) as perfis_count,
        (SELECT count(*) FROM public.clientes) as clientes_count,
        (SELECT count(*) FROM public.fornecedores) as fornecedores_count,
        (SELECT count(*) FROM public.produtos) as produtos_count,
        (SELECT count(*) FROM public.documentos_emitidos) as docs_count,
        (SELECT count(*) FROM public.series_fiscais) as series_count;
    `;
    const counts = await sqlQuery(ref, countsQuery);
    console.log(`Contagem de Registos Principais:`, counts.data?.[0]);

    // 6. Empresas em cada banco (Nomes/Indicadores para verificar dados reais vs teste)
    const empNames = await sqlQuery(ref, "SELECT id, nif, created_at, CASE WHEN nif LIKE '999%' OR nif LIKE '5000%' THEN 'TEST_NIF' ELSE 'OTHER_NIF' END as nif_type FROM public.empresas LIMIT 10;");
    console.log(`Amostra Empresas:`, empNames.data);
  }
}

run().catch(console.error);

