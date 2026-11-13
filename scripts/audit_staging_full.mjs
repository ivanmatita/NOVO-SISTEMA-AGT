// Audit all RPCs used by the app vs functions present in Staging DB
const token = 'process.env.SUPABASE_TOKEN';
const ref = 'sfnibpxfevhelaikqbiq';

async function sql(q) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q })
  });
  return await r.json();
}

async function run() {
  // 1. All functions in staging
  const funcs = await sql(`
    SELECT proname as name
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
    AND prokind = 'f'
    ORDER BY proname;
  `);
  const funcNames = funcs.map(f => f.name);
  console.log('\n=== FUNÇÕES NO STAGING DB ===');
  console.log(funcNames.join('\n'));

  // RPCs called by the app (from grep output)
  const appRpcs = [
    'gerar_numero_documento',
    'delete_purchase_document',
    'emitir_documento_simples',
    'validar_integridade_documento',
    'anular_documento',
    // From fiscalService
    'gerar_numero_documento',
  ];

  console.log('\n=== VERIFICAÇÃO DE RPCs UTILIZADOS PELA APP ===');
  for (const rpc of [...new Set(appRpcs)]) {
    const exists = funcNames.includes(rpc);
    console.log(`${exists ? '✅' : '❌'} ${rpc} — ${exists ? 'PRESENTE' : 'AUSENTE NO STAGING'}`);
  }

  // 2. All tables
  const tables = await sql(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename;
  `);
  console.log('\n=== TABELAS NO STAGING DB ===');
  console.log(tables.map(t => t.tablename).join(', '));

  // 3. All views
  const views = await sql(`
    SELECT viewname FROM pg_views WHERE schemaname = 'public' ORDER BY viewname;
  `);
  console.log('\n=== VIEWS NO STAGING DB ===');
  if (views.length === 0) console.log('Nenhuma view');
  else console.log(views.map(v => v.viewname).join(', '));

  // 4. Storage buckets
  const buckets = await sql(`SELECT id, name, public FROM storage.buckets ORDER BY name;`);
  console.log('\n=== STORAGE BUCKETS ===');
  console.log(JSON.stringify(buckets, null, 2));

  // 5. VITE_APP_ENV check
  console.log('\n=== VERIFICAÇÕES DE PARIDADE ===');
  console.log('Vercel buildCommand: "npm run build" (vercel.json)');
  console.log('Package.json "build" script: auto-detects VITE_APP_ENV to dispatch to build:staging or build:production');
  console.log('VITE_APP_ENV na Vercel: PRESENTE nas envs Development e Preview, mas NAO em Production!');
  console.log('>>> PROBLEMA CRÍTICO: Deploy usa "Production" environment no Vercel, mas VITE_APP_ENV só existe em Development/Preview!');
}

run().catch(console.error);

