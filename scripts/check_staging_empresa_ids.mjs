// Check empresa_id across all staging tables
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
    'empresas', 'perfis', 'clientes', 'fornecedores', 'produtos', 
    'categorias', 'armazens', 'caixas', 'series_fiscais', 
    'documentos_emitidos', 'colaboradores', 'hr_processamentos',
    'locais_trabalho', 'exercicios_fiscais', 'licencas_empresas',
    'compras', 'caixa_movimentacoes', 'impostos'
  ];

  console.log("=== EMPRESA_ID DE CADA TABELA EM STAGING ===");
  for (const t of tables) {
    const res = await sql(`SELECT DISTINCT empresa_id, count(*) as count FROM public."${t}" GROUP BY empresa_id;`);
    console.log(`\nTabela [${t}]:`, res);
  }
}

run().catch(console.error);

