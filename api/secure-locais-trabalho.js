/**
 * api/secure-locais-trabalho.js
 * Handler Serverless Seguro para Gestão de Locais de Trabalho com Isolamento de Tenant.
 */

import { getEnvConfig, setCORS } from './_env.js';
import { authenticateRequest } from './_auth.js';

export default async function handler(req, res) {
  setCORS(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const auth = await authenticateRequest(req);
    const config = getEnvConfig(req);
    const authHeader = `Bearer ${config.serviceRoleKey}`;

    const parsedUrl = new URL(req.url || '', `http://${req.headers?.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;
    const queryEmpresaId = parsedUrl.searchParams.get('empresa_id') || req.query?.empresa_id;
    const targetEmpresaId = queryEmpresaId || auth.empresa_id;

    const pathParts = pathname.split('/').filter(Boolean);
    const localId = pathParts.length >= 3 ? pathParts[2] : null;

    // 1. GET
    if (req.method === 'GET') {
      if (localId) {
        let url = `${config.supabaseUrl}/rest/v1/locais_trabalho?id=eq.${localId}&select=*&limit=1`;
        if (targetEmpresaId && !auth.isSuperAdmin) {
          url += `&empresa_id=eq.${targetEmpresaId}`;
        }
        const response = await fetch(url, {
          headers: {
            'apikey': config.serviceRoleKey,
            'Authorization': authHeader
          }
        });
        const list = await response.json();
        if (Array.isArray(list) && list.length > 0) {
          return res.status(200).json(list[0]);
        }
        return res.status(404).json({ error: 'Local de trabalho não encontrado' });
      }

      if (!targetEmpresaId && !auth.isSuperAdmin) {
        return res.status(200).json([]);
      }

      let url = `${config.supabaseUrl}/rest/v1/locais_trabalho?select=*&order=nome.asc`;
      if (targetEmpresaId && !auth.isSuperAdmin) {
        url += `&empresa_id=eq.${targetEmpresaId}`;
      }

      const response = await fetch(url, {
        headers: {
          'apikey': config.serviceRoleKey,
          'Authorization': authHeader
        }
      });
      const data = await response.json();
      return res.status(200).json(Array.isArray(data) ? data : []);
    }

    // 2. POST
    if (req.method === 'POST') {
      const body = req.body || {};
      const companyId = body.empresa_id || targetEmpresaId;
      if (!companyId) {
        return res.status(400).json({ error: 'empresa_id obrigatório' });
      }

      const payload = {
        empresa_id: companyId,
        nome: (body.nome || body.name || '').trim(),
        endereco: body.endereco || body.address || null,
        cidade: body.cidade || body.city || null,
        provincia: body.provincia || null,
        municipio: body.municipio || null,
        pais: body.pais || 'Angola',
        telefone: body.telefone || body.phone || null,
        email: body.email || null,
        responsavel: body.responsavel || body.manager || null,
        ativo: body.ativo !== undefined ? body.ativo : true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const insertRes = await fetch(`${config.supabaseUrl}/rest/v1/locais_trabalho`, {
        method: 'POST',
        headers: {
          'apikey': config.serviceRoleKey,
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify([payload])
      });
      const inserted = await insertRes.json();
      if (!insertRes.ok) {
        return res.status(400).json({ error: inserted.message || 'Erro ao criar local de trabalho' });
      }
      return res.status(201).json(Array.isArray(inserted) ? inserted[0] : inserted);
    }

    // 3. PUT
    if (req.method === 'PUT') {
      const targetId = localId || req.body?.id;
      if (!targetId) return res.status(400).json({ error: 'ID do local obrigatório' });

      const body = req.body || {};
      const payload = { ...body, updated_at: new Date().toISOString() };
      delete payload.id;

      let patchUrl = `${config.supabaseUrl}/rest/v1/locais_trabalho?id=eq.${targetId}`;
      if (targetEmpresaId && !auth.isSuperAdmin) {
        patchUrl += `&empresa_id=eq.${targetEmpresaId}`;
      }

      const patchRes = await fetch(patchUrl, {
        method: 'PATCH',
        headers: {
          'apikey': config.serviceRoleKey,
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(payload)
      });
      const updated = await patchRes.json();
      return res.status(200).json(Array.isArray(updated) ? updated[0] : updated);
    }

    return res.status(405).json({ error: 'Método não permitido' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
