// Inspect table schemas for the required modules
const token = process.env.SUPABASE_TOKEN || 'process.env.SUPABASE_TOKEN';
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
  const tables = [
    'config_empresa', 'configuracoes_graficas', 'professions',
    'hr_contratos', 'documentos_empresa', 'media_arquivos',
    'diarios_contabeis', 'pgc_plano_contas', 'lancamentos_contabeis',
    'metrics'
  ];

  for (const t of tables) {
    const cols = await sql(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = '${t}'
      ORDER BY ordinal_position;
    `);
    console.log(`\n=== TABELA: ${t} ===`);
    if (Array.isArray(cols)) {
      console.log(cols.map(c => `${c.column_name} (${c.data_type})`).join(', '));
    } else {
      console.log('Erro ou tabela inexistente:', cols);
    }
  }
}

run().catch(console.error);

