/**
 * api/invoices.js
 * Endpoint de Facturas e Documentos Fiscais
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
    if (req.method === 'GET') {
      let queryUrl = `${config.supabaseUrl}/rest/v1/documentos_emitidos?select=*&order=data_emissao.desc.nullslast,id.desc`;
      if (empresa_id && !auth.isSuperAdmin) {
        queryUrl += `&or=(empresa_id.eq.${empresa_id},empresa_id.is.null)`;
      }

      const response = await fetch(queryUrl, {
        headers: {
          'apikey': config.serviceRoleKey,
          'Authorization': `Bearer ${config.serviceRoleKey}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      return res.status(response.status).json(data || []);
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const payload = {
        ...body,
        empresa_id: body.empresa_id || empresa_id
      };

      const insertRes = await fetch(`${config.supabaseUrl}/rest/v1/documentos_emitidos`, {
        method: 'POST',
        headers: {
          'apikey': config.serviceRoleKey,
          'Authorization': `Bearer ${config.serviceRoleKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(payload)
      });
      const data = await insertRes.json();
      return res.status(insertRes.status).json(data);
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
