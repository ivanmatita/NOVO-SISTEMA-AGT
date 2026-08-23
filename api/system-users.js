/**
 * api/system-users.js
 * Endpoint de Utilizadores do Sistema
 */

import { getEnvConfig, setCORS } from './_env.js';
import { authenticateRequest } from './_auth.js';

export default async function handler(req, res) {
  setCORS(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const config = getEnvConfig(req);
  const auth = await authenticateRequest(req);
  const empresa_id = auth.empresa_id || '11111111-0000-0000-0000-000000000001';

  try {
    let queryUrl = `${config.supabaseUrl}/rest/v1/perfis?select=id,email,nome,role,empresa_id,ativo,created_at`;
    if (empresa_id && !auth.isSuperAdmin) {
      queryUrl += `&or=(empresa_id.eq.${empresa_id},empresa_id.is.null)`;
    }

    const response = await fetch(queryUrl, {
      headers: {
        'apikey': config.serviceRoleKey,
        'Authorization': `Bearer ${config.serviceRoleKey}`
      }
    });

    const data = await response.json();
    return res.status(response.status).json(data || []);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
