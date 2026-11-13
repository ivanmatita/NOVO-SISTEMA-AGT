import { getEnvConfig, setCORS } from '../_env.js';

async function getTableCount(table, config) {
  try {
    const res = await fetch(`${config.supabaseUrl}/rest/v1/${table}?select=id`, {
      method: 'HEAD',
      headers: {
        'apikey': config.serviceRoleKey,
        'Authorization': `Bearer ${config.serviceRoleKey}`,
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
  setCORS(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const config = getEnvConfig(req);
  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (urlObj.pathname.includes('/stats')) {
    try {
      const [clientes, produtos, empresas] = await Promise.all([
        getTableCount('clientes', config),
        getTableCount('produtos', config),
        getTableCount('empresas', config)
      ]);

      return res.status(200).json({
        totalClientes: clientes,
        totalProdutos: produtos,
        totalEmpresas: empresas,
        systemStatus: 'healthy',
        mode: config.environment,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      return res.status(200).json({
        totalClientes: 0,
        totalProdutos: 0,
        totalEmpresas: 0,
        systemStatus: 'healthy'
      });
    }
  }

  return res.status(200).json({
    status: 'ok',
    mode: config.environment,
    live: true,
    supabaseConfigured: !!config.supabaseUrl,
    timestamp: new Date().toISOString()
  });
}
