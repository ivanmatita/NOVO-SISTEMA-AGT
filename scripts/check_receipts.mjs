// Check receipts across documentos_emitidos in both environments
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
  for (const [env, ref] of [['STAGING', 'sfnibpxfevhelaikqbiq'], ['PROD', 'nawqfidnawokqaheqvar']]) {
    console.log(`\n=== [${env}: ${ref}] TIPOS DE DOCUMENTOS EMITIDOS ===`);
    const q1 = `
      SELECT tipo_documento, count(*), array_agg(DISTINCT estado) as estados, array_agg(DISTINCT ano) as anos
      FROM public.documentos_emitidos
      GROUP BY tipo_documento;
    `;
    const res1 = await sqlQuery(ref, q1);
    console.log("Tipos em documentos_emitidos:", res1.data);

    const q2 = `
      SELECT id, numero_documento, tipo_documento, cliente_nome, total, created_at, ano, is_certified
      FROM public.documentos_emitidos
      WHERE tipo_documento ILIKE '%recibo%' OR tipo_documento IN ('RC', 'FR', 'RE')
      LIMIT 10;
    `;
    const res2 = await sqlQuery(ref, q2);
    console.log("Amostra Recibos em documentos_emitidos:", res2.data);
  }
}

run().catch(console.error);

