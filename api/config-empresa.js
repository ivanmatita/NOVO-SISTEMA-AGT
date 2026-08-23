import { getEnvConfig, setCORS } from './_env.js';

export default async function handler(req, res) {
  setCORS(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const config = getEnvConfig(req);
    const authHeader = req.headers.authorization || `Bearer ${config.serviceRoleKey}`;

    if (req.method === 'GET') {
      const response = await fetch(`${config.supabaseUrl}/rest/v1/configuracoes_empresa?select=*&limit=1`, {
        headers: {
          'apikey': config.serviceRoleKey,
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        return res.status(200).json(data[0]);
      }
      return res.status(200).json({});
    }

    if (req.method === 'POST') {
      const response = await fetch(`${config.supabaseUrl}/rest/v1/configuracoes_empresa`, {
        method: 'POST',
        headers: {
          'apikey': config.serviceRoleKey,
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(req.body || {})
      });
      const data = await response.json();
      return res.status(response.status).json(data);
    }

    return res.status(405).json({ error: 'Método não permitido' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
