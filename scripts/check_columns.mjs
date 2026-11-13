// Check exact column names of tables in Staging
const token = 'process.env.SUPABASE_TOKEN';
const stagingRef = 'sfnibpxfevhelaikqbiq';

async function sql(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${stagingRef}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  return await res.json();
}

async function run() {
  const tables = [
    'produtos', 'armazens', 'caixas', 'documentos_emitidos', 
    'colaboradores', 'hr_processamentos', 'exercicios_fiscais',
    'empresas', 'recibos', 'documentos_relacionados', 'itens_documento',
    'pos_user_configs', 'licencas_empresas', 'logs_auditoria'
  ];

  for (const t of tables) {
    const cols = await sql(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = '${t}'
      ORDER BY ordinal_position;
    `);
    console.log(`\n=== TABELA: ${t} ===`);
    console.log(cols.map(c => `${c.column_name} (${c.data_type})`));
  }
}

run().catch(console.error);

