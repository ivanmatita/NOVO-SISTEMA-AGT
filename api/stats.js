import { getAdminClient } from './_supabase.js';

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabase = getAdminClient(req);

  try {
    const [
      { count: totalClientes },
      { count: totalProdutos },
      { count: totalColaboradores },
      { count: totalDocumentos }
    ] = await Promise.all([
      supabase.from('clientes').select('*', { count: 'exact', head: true }),
      supabase.from('produtos').select('*', { count: 'exact', head: true }),
      supabase.from('colaboradores').select('*', { count: 'exact', head: true }),
      supabase.from('documentos_emitidos').select('*', { count: 'exact', head: true })
    ]);

    return res.status(200).json({
      totalClientes: totalClientes || 0,
      totalProdutos: totalProdutos || 0,
      totalColaboradores: totalColaboradores || 0,
      totalDocumentos: totalDocumentos || 0,
      systemStatus: 'healthy',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[API-STATS] Erro:', err.message);
    return res.status(200).json({
      totalClientes: 0,
      totalProdutos: 0,
      totalColaboradores: 0,
      totalDocumentos: 0,
      systemStatus: 'degraded'
    });
  }
}
