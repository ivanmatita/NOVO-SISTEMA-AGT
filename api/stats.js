const SUPABASE_URL = "https://nawqfidnawokqaheqvar.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hd3FmaWRuYXdva3FhaGVxdmFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMTgxNDYsImV4cCI6MjA5Mzc5NDE0Nn0.qFkIexxKcQDWax3pfhcgPMR3ZFIsE-gYWTS62i5Edgs";

async function getTableCount(table) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=id`, {
      method: 'HEAD',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'count=exact'
      }
    });
    const range = res.headers.get('content-range');
    if (range && range.includes('/')) {
      return parseInt(range.split('/')[1], 10) || 0;
    }
    return 0;
  } catch (e) {
    return 0;
  }
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const [clientes, produtos, colaboradores] = await Promise.all([
      getTableCount('clientes'),
      getTableCount('produtos'),
      getTableCount('colaboradores')
    ]);

    return res.status(200).json({
      totalClientes: clientes,
      totalProdutos: produtos,
      totalColaboradores: colaboradores,
      systemStatus: 'healthy',
      mode: 'production',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return res.status(200).json({
      totalClientes: 0,
      totalProdutos: 0,
      totalColaboradores: 0,
      systemStatus: 'healthy'
    });
  }
}
