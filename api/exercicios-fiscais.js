import { getEnvConfig, setCORS } from './_env.js';

export default async function handler(req, res) {
  setCORS(res);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const config = getEnvConfig(req);
    const authHeader = req.headers.authorization || `Bearer ${config.serviceRoleKey}`;
    
    if (req.method === 'GET') {
      const response = await fetch(`${config.supabaseUrl}/rest/v1/exercicios_fiscais?select=*&order=ano.desc`, {
        headers: {
          'apikey': config.serviceRoleKey,
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      return res.status(response.status).json(data);
    }

    if (req.method === 'POST') {
      const response = await fetch(`${config.supabaseUrl}/rest/v1/exercicios_fiscais`, {
        method: 'POST',
        headers: {
          'apikey': config.serviceRoleKey,
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(req.body)
      });
      const data = await response.json();
      return res.status(response.status).json(data);
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
