// scripts/fix_compras_columns_types.mjs
const token = 'process.env.SUPABASE_TOKEN';
const stagingRef = 'sfnibpxfevhelaikqbiq';

async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${stagingRef}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || JSON.stringify(json));
  return json;
}

async function run() {
  console.log('=== CONVERTENDO COLUNAS DE COMPRAS PARA TEXT FLEXÍVEL ===\n');

  await sql(`
    ALTER TABLE public.compras DROP CONSTRAINT IF EXISTS compras_fornecedor_id_fkey;
    ALTER TABLE public.compras DROP CONSTRAINT IF EXISTS compras_caixa_id_fkey;
    ALTER TABLE public.compras DROP CONSTRAINT IF EXISTS compras_supplier_id_fkey;
    
    ALTER TABLE public.compras ALTER COLUMN caixa_id TYPE TEXT USING caixa_id::text;
    ALTER TABLE public.compras ALTER COLUMN caixa TYPE TEXT USING caixa::text;
    ALTER TABLE public.compras ALTER COLUMN supplier_id TYPE TEXT USING supplier_id::text;
    ALTER TABLE public.compras ALTER COLUMN fornecedor_id TYPE TEXT USING fornecedor_id::text;
  `);

  console.log('✅ Colunas convertidas para TEXT flexível.');
  await sql("NOTIFY pgrst, 'reload schema';");
}

run().catch(e => { console.error('Erro:', e); process.exit(1); });

