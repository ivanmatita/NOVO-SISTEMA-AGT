/**
 * api/secure-clientes.js
 * Handler Serverless Seguro para Gestão de Clientes com Isolamento Rigoroso de Tenant.
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
    const clientId = pathParts.length >= 3 && pathParts[2] !== 'check-nif' ? pathParts[2] : null;
    const isCheckNif = pathname.includes('check-nif');

    // 1. Sub-rota: /api/secure-clientes/check-nif?nif=...
    if (isCheckNif) {
      const nif = parsedUrl.searchParams.get('nif') || req.query?.nif || '';
      const excludeId = parsedUrl.searchParams.get('excludeId') || req.query?.excludeId || '';

      if (!nif || !targetEmpresaId) {
        return res.status(200).json({ exists: false });
      }

      let checkUrl = `${config.supabaseUrl}/rest/v1/clientes?empresa_id=eq.${targetEmpresaId}&nif=eq.${encodeURIComponent(nif)}&select=id,nome,nif`;
      if (excludeId) {
        checkUrl += `&id=neq.${excludeId}`;
      }

      const checkRes = await fetch(checkUrl, {
        headers: {
          'apikey': config.serviceRoleKey,
          'Authorization': authHeader
        }
      });
      const checkList = await checkRes.json();
      if (Array.isArray(checkList) && checkList.length > 0) {
        return res.status(200).json({ exists: true, cliente: checkList[0] });
      }
      return res.status(200).json({ exists: false });
    }

    // 2. GET (Listar clientes isolados da empresa ou cliente por ID)
    if (req.method === 'GET') {
      if (clientId) {
        let url = `${config.supabaseUrl}/rest/v1/clientes?id=eq.${clientId}&select=*&limit=1`;
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
        return res.status(404).json({ error: 'Cliente não encontrado' });
      }

      if (!targetEmpresaId && !auth.isSuperAdmin) {
        return res.status(200).json([]);
      }

      let url = `${config.supabaseUrl}/rest/v1/clientes?select=*&order=nome.asc`;
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

    // 3. POST (Criar novo cliente)
    if (req.method === 'POST') {
      const body = req.body || {};
      const companyId = body.empresa_id || targetEmpresaId;
      if (!companyId) {
        return res.status(400).json({ error: 'empresa_id é obrigatório para cadastrar cliente' });
      }

      const payload = {
        empresa_id: companyId,
        nome: (body.nome || body.client_name || '').trim(),
        nif: (body.nif || body.contribuinte || '').trim() || null,
        contribuinte: (body.contribuinte || body.nif || '').trim() || null,
        email: body.email || null,
        telefone: body.telefone || null,
        endereco: body.endereco || body.morada || null,
        morada: body.morada || body.endereco || null,
        provincia: body.provincia || null,
        municipio: body.municipio || null,
        pais: body.pais || 'Angola',
        tipo_entidade: body.tipo_entidade || 'Empresa',
        tipo_cliente: body.tipo_cliente || 'Nacional',
        saldo_inicial: Number(body.saldo_inicial || 0),
        activo: body.activo !== undefined ? body.activo : true,
        ativo: body.ativo !== undefined ? body.ativo : true,
        is_active: true,
        notas: body.notas || body.observacoes || null,
        observacoes: body.observacoes || body.notas || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const insertRes = await fetch(`${config.supabaseUrl}/rest/v1/clientes`, {
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
        return res.status(400).json({ error: inserted.message || 'Erro ao criar cliente' });
      }
      return res.status(201).json(Array.isArray(inserted) ? inserted[0] : inserted);
    }

    // 4. PUT /api/secure-clientes/:id (Atualizar cliente)
    if (req.method === 'PUT') {
      const targetId = clientId || req.body?.id;
      if (!targetId) return res.status(400).json({ error: 'ID do cliente é obrigatório para atualização' });

      const body = req.body || {};
      const payload = {
        ...body,
        nif: (body.nif || body.contribuinte || '').trim() || null,
        contribuinte: (body.contribuinte || body.nif || '').trim() || null,
        endereco: body.endereco || body.morada || null,
        morada: body.morada || body.endereco || null,
        updated_at: new Date().toISOString()
      };
      delete payload.id;

      let patchUrl = `${config.supabaseUrl}/rest/v1/clientes?id=eq.${targetId}`;
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
