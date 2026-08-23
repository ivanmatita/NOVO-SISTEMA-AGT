import { getEnvConfig, setCORS } from './_env.js';
import { authenticateRequest } from './_auth.js';

export default async function handler(req, res) {
  setCORS(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const auth = await authenticateRequest(req);
    const config = getEnvConfig(req);
    const authHeader = `Bearer ${config.serviceRoleKey}`;

    if (req.method === 'GET') {
      let url = `${config.supabaseUrl}/rest/v1/documentos?select=*&order=created_at.desc`;
      if (auth.empresa_id && !auth.isSuperAdmin) {
        url += `&empresa_id=eq.${auth.empresa_id}`;
      }
      const response = await fetch(url, {
        headers: {
          'apikey': config.serviceRoleKey,
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      return res.status(response.status).json(Array.isArray(data) ? data : []);
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      if (auth.empresa_id && !body.empresa_id) {
        body.empresa_id = auth.empresa_id;
      }
      const response = await fetch(`${config.supabaseUrl}/rest/v1/documentos`, {
        method: 'POST',
        headers: {
          'apikey': config.serviceRoleKey,
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      return res.status(response.status).json(data);
    }

    return res.status(405).json({ error: 'Método não permitido' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
