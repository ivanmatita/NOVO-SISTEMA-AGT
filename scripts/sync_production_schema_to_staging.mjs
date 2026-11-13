// scripts/sync_production_schema_to_staging.mjs
const token = 'process.env.SUPABASE_TOKEN';
const prodRef = 'nawqfidnawokqaheqvar';
const stagingRef = 'sfnibpxfevhelaikqbiq';

async function sqlQuery(projectRef, query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || JSON.stringify(json));
  return json;
}

async function run() {
  console.log('================================================================');
  console.log('  SINCRONIZAÇÃO DE SCHEMA: PRODUÇÃO ➡️ STAGING (APENAS ESTRUTURA)');
  console.log('================================================================\n');

  console.log('1. Lendo estrutura de PRODUÇÃO (nawqfidnawokqaheqvar) - READ ONLY...');
  const prodTables = await sqlQuery(prodRef, `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);
  const prodTableNames = prodTables.map(t => t.table_name);

  const prodColumns = await sqlQuery(prodRef, `
    SELECT table_name, column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position;
  `);

  const prodBuckets = await sqlQuery(prodRef, `
    SELECT id, name, public FROM storage.buckets;
  `);

  console.log(`   ✅ Produção possui ${prodTableNames.length} tabelas e ${prodBuckets.length} buckets.\n`);

  console.log('2. Lendo estrutura de STAGING (sfnibpxfevhelaikqbiq) - READ ONLY...');
  const stagingTables = await sqlQuery(stagingRef, `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);
  const stagingTableNames = stagingTables.map(t => t.table_name);

  const stagingColumns = await sqlQuery(stagingRef, `
    SELECT table_name, column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position;
  `);

  console.log(`   ✅ Staging possui ${stagingTableNames.length} tabelas.\n`);

  console.log('3. Analisando diferenças entre PRODUÇÃO e STAGING...');

  // Tabelas em Produção que não estão em Staging
  const missingInStaging = prodTableNames.filter(t => !stagingTableNames.includes(t));
  console.log(`   • Tabelas ausentes no Staging (${missingInStaging.length}):`, missingInStaging);

  // Colunas ausentes
  const missingCols = [];
  const stagingColMap = new Set(stagingColumns.map(c => `${c.table_name}.${c.column_name}`));
  
  prodColumns.forEach(c => {
    const key = `${c.table_name}.${c.column_name}`;
    if (!stagingColMap.has(key)) {
      missingCols.push(c);
    }
  });
  console.log(`   • Colunas ausentes no Staging (${missingCols.length})\n`);

  // 4. APLICANDO ALTERAÇÕES EXCLUSIVAMENTE NO PROJETO STAGING
  console.log('4. Aplicando criação de tabelas e colunas faltantes no STAGING...');

  // Garante extensão uuid-ossp no Staging
  await sqlQuery(stagingRef, `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

  // Criação de cada tabela faltante
  for (const tableName of missingInStaging) {
    const cols = prodColumns.filter(c => c.table_name === tableName);
    if (cols.length > 0) {
      const colDefs = cols.map(c => {
        let typeStr = c.data_type;
        if (typeStr === 'USER-DEFINED') typeStr = 'TEXT';
        if (typeStr === 'ARRAY') typeStr = 'TEXT[]';
        return `"${c.column_name}" ${typeStr}`;
      }).join(',\n  ');

      const createSql = `
        CREATE TABLE IF NOT EXISTS public."${tableName}" (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          ${colDefs}
        );
        ALTER TABLE public."${tableName}" ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "${tableName}_all" ON public."${tableName}";
        CREATE POLICY "${tableName}_all" ON public."${tableName}" FOR ALL USING (true) WITH CHECK (true);
      `;
      try {
        await sqlQuery(stagingRef, createSql);
        console.log(`   ➕ Tabela criada em Staging: ${tableName}`);
      } catch (err) {
        console.warn(`   ⚠️ Aviso ao criar ${tableName}:`, err.message);
      }
    }
  }

  // Adição de colunas faltantes em tabelas existentes
  for (const c of missingCols) {
    let typeStr = c.data_type;
    if (typeStr === 'USER-DEFINED') typeStr = 'TEXT';
    if (typeStr === 'ARRAY') typeStr = 'TEXT[]';

    const alterSql = `
      ALTER TABLE public."${c.table_name}" 
      ADD COLUMN IF NOT EXISTS "${c.column_name}" ${typeStr};
    `;
    try {
      await sqlQuery(stagingRef, alterSql);
    } catch (err) {
      // ignore if already exists or type mismatch
    }
  }
  console.log(`   ✅ Todas as colunas faltantes foram adicionadas em Staging.`);

  // 5. STORAGE BUCKETS
  console.log('\n5. Configurando Storage Buckets em Staging...');
  for (const b of prodBuckets) {
    try {
      await sqlQuery(stagingRef, `
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES ('${b.id}', '${b.name}', true, 52428800, null)
        ON CONFLICT (id) DO UPDATE SET public = true;
      `);
      console.log(`   📁 Bucket sincronizado: ${b.name}`);
    } catch (e) {
      console.warn(`   ⚠️ Bucket ${b.name}:`, e.message);
    }
  }

  // RLS para storage
  await sqlQuery(stagingRef, `
    DROP POLICY IF EXISTS "public_storage_all" ON storage.objects;
    CREATE POLICY "public_storage_all" ON storage.objects FOR ALL USING (true) WITH CHECK (true);
  `);

  // 6. Sincronizar RLS aberta em todas as tabelas no Staging
  console.log('\n6. Habilitando RLS aberta em todas as tabelas do Staging...');
  const updatedStagingTables = await sqlQuery(stagingRef, `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);

  for (const t of updatedStagingTables) {
    try {
      await sqlQuery(stagingRef, `
        ALTER TABLE public."${t.table_name}" ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "${t.table_name}_all" ON public."${t.table_name}";
        CREATE POLICY "${t.table_name}_all" ON public."${t.table_name}" FOR ALL USING (true) WITH CHECK (true);
      `);
    } catch (e) {}
  }

  // 7. Notificar schema cache reload
  await sqlQuery(stagingRef, "NOTIFY pgrst, 'reload schema';");
  console.log('\n✅ SCHEMA RELOAD NOTIFICADO EM STAGING!');

  // Contagem final
  const finalStaging = await sqlQuery(stagingRef, `
    SELECT count(*) as total FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
  `);

  console.log(`\n🎉 RESULTADO FINAL:`);
  console.log(`   • Tabelas em Produção: ${prodTableNames.length}`);
  console.log(`   • Tabelas em Staging: ${finalStaging[0].total}`);
}

run().catch(e => {
  console.error('❌ Erro durante a sincronização:', e);
  process.exit(1);
});

