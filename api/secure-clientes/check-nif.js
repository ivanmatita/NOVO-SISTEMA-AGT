/**
 * api/secure-clientes/check-nif.js
 * Verificação em tempo real de disponibilidade de NIF para a empresa autenticada.
 */

import { getEnvConfig, setCORS } from '../_env.js';
import { authenticateRequest } from '../_auth.js';

export default async function handler(req, res) {
  setCORS(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const config = getEnvConfig(req);
  const auth = await authenticateRequest(req);
  const empresa_id = auth.empresa_id || '11111111-0000-0000-0000-000000000001';

  try {
    let nif = req.query?.nif || '';
    let excludeId = req.query?.excludeId || req.query?.id || '';

    if (!nif && req.url) {
      try {
        const parsedUrl = new URL(req.url, `http://${req.headers?.host || 'localhost'}`);
        nif = parsedUrl.searchParams.get('nif') || '';
        excludeId = excludeId || parsedUrl.searchParams.get('excludeId') || parsedUrl.searchParams.get('id') || '';
      } catch (e) {}
    }

    nif = (nif || '').trim();

    if (!nif) {
      return res.status(400).json({
        success: false,
        code: 'BAD_REQUEST',
        message: 'NIF não fornecido.'
      });
    }

    // NIF genérico de consumidor final pode ser repetido
    if (nif === '999999999') {
      return res.status(200).json({
        success: true,
        available: true,
        isGeneric: true
      });
    }

    let queryUrl = `${config.supabaseUrl}/rest/v1/clientes?select=id,nome,nif&nif=eq.${encodeURIComponent(nif)}&empresa_id=eq.${empresa_id}`;
    if (excludeId) {
      queryUrl += `&id=neq.${excludeId}`;
    }
    queryUrl += `&limit=1`;

    const checkRes = await fetch(queryUrl, {
      headers: {
        'apikey': config.serviceRoleKey,
        'Authorization': `Bearer ${config.serviceRoleKey}`
      }
    });

    const results = await checkRes.json();

    if (Array.isArray(results) && results.length > 0) {
      return res.status(409).json({
        success: false,
        code: 'CLIENT_NIF_ALREADY_EXISTS',
        message: `Já existe um cliente registado com este NIF (${nif}) nesta empresa.`,
        existingClient: {
          id: results[0].id,
          nome: results[0].nome
        }
      });
    }

    return res.status(200).json({
      success: true,
      available: true,
      nif
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: err.message
    });
  }
}
