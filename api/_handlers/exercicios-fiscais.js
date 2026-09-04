import { getEnvConfig, setCORS } from '../_env.js';
import { authenticateRequest } from '../_auth.js';

export default async function handler(req, res) {
  setCORS(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const auth = await authenticateRequest(req);
    if (!auth.authenticated) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const config = getEnvConfig(req);
    const authHeader = `Bearer ${config.serviceRoleKey}`;

    const parsedUrl = new URL(req.url || '', `http://${req.headers?.host || 'localhost'}`);
    const targetEmpresaId = auth.empresa_id;

    if (!targetEmpresaId) {
      return res.status(400).json({ error: 'Empresa não identificada na sessão' });
    }

    if (req.method === 'GET') {
      let url = `${config.supabaseUrl}/rest/v1/exercicios_fiscais?empresa_id=eq.${targetEmpresaId}&select=*&order=ano.desc`;

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
      const companyId = auth.empresa_id;

      const payload = {
        ...body,
        empresa_id: companyId
      };

      const response = await fetch(`${config.supabaseUrl}/rest/v1/exercicios_fiscais`, {
        method: 'POST',
        headers: {
          'apikey': config.serviceRoleKey,
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      return res.status(response.status).json(data);
    }

    return res.status(405).json({ error: 'Método não permitido' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
