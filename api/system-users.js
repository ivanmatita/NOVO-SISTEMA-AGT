import { getEnvConfig, setCORS } from './_env.js';
import { authenticateRequest } from './_auth.js';

export default async function handler(req, res) {
  setCORS(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

    const auth = await authenticateRequest(req);
    if (!auth.authenticated) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const config = getEnvConfig(req);
    const authHeader = `Bearer ${config.serviceRoleKey}`;

    if (req.method === 'GET') {
      if (!auth.empresa_id) {
        return res.status(200).json([]);
      }

      let url = `${config.supabaseUrl}/rest/v1/perfis?empresa_id=eq.${auth.empresa_id}&select=*&order=nome.asc`;
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

    return res.status(405).json({ error: 'Método não permitido' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
