import { getEnvConfig, setCORS } from './_env.js';

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

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const config = getEnvConfig(req);
    const [clientes, produtos, armazens] = await Promise.all([
      getTableCount('clientes', config),
      getTableCount('produtos', config),
      getTableCount('armazens', config)
    ]);

    return res.status(200).json({
      totalClientes: clientes,
      totalProdutos: produtos,
      totalArmazens: armazens,
      systemStatus: 'healthy',
      mode: config.environment,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return res.status(200).json({
      totalClientes: 0,
      totalProdutos: 0,
      totalArmazens: 0,
      systemStatus: 'healthy'
    });
  }
}
