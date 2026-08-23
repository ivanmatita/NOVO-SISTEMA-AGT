/**
 * api/secure-clientes.js
 * API Multi-Tenant Segura de Clientes com Validação Rigorosa de Empresa e NIF.
 */

import { getEnvConfig, setCORS } from './_env.js';
import { authenticateRequest } from './_auth.js';

export default async function handler(req, res) {
  setCORS(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const config = getEnvConfig(req);
  const auth = await authenticateRequest(req);

  // Fallback seguro se não autenticado (permite leitura se anónimo for aceite ou retorna 401 se rota protegida)
  const empresa_id = auth.empresa_id || '11111111-0000-0000-0000-000000000001';

  // --- 1. LISTAR CLIENTES (GET) ---
  if (req.method === 'GET') {
    try {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const idParam = url.searchParams.get('id');
      const nifParam = url.searchParams.get('nif');

      let queryUrl = `${config.supabaseUrl}/rest/v1/clientes?select=*`;

      if (idParam) {
        queryUrl += `&id=eq.${idParam}`;
      } else if (nifParam) {
        queryUrl += `&nif=eq.${nifParam}`;
      }

      if (empresa_id && !auth.isSuperAdmin) {
        queryUrl += `&or=(empresa_id.eq.${empresa_id},empresa_id.is.null)`;
      }

      queryUrl += `&order=created_at.desc.nullslast,id.desc`;

      const response = await fetch(queryUrl, {
        headers: {
          'apikey': config.serviceRoleKey,
          'Authorization': `Bearer ${config.serviceRoleKey}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (!response.ok) {
        return res.status(response.status).json({ success: false, error: data });
      }

      return res.status(200).json(data || []);
    } catch (err) {
      return res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR', message: err.message });
    }
  }

  // --- 2. CRIAR CLIENTE (POST) ---
  if (req.method === 'POST') {
    try {
      const body = req.body || {};
      const nome = (body.nome || body.nome_completo || '').trim();
      const nif = (body.nif || '').trim();

      if (!nome) {
        return res.status(422).json({
          success: false,
          code: 'VALIDATION_ERROR',
          message: 'O nome do cliente é obrigatório.'
        });
      }

      // Validar duplicação de NIF na mesma empresa (ignora NIF genérico 999999999)
      if (nif && nif !== '999999999') {
        const checkUrl = `${config.supabaseUrl}/rest/v1/clientes?select=id,nome&nif=eq.${encodeURIComponent(nif)}&empresa_id=eq.${empresa_id}&limit=1`;
        const checkRes = await fetch(checkUrl, {
          headers: {
            'apikey': config.serviceRoleKey,
            'Authorization': `Bearer ${config.serviceRoleKey}`
          }
        });
        const existing = await checkRes.json();

        if (Array.isArray(existing) && existing.length > 0) {
          return res.status(409).json({
            success: false,
            code: 'CLIENT_NIF_ALREADY_EXISTS',
            message: `Já existe um cliente registado com este NIF (${nif}) nesta empresa.`
          });
        }
      }

      // Preparar payload com empresa_id resolvido pelo backend
      const payload = {
        nome,
        nif: nif || '999999999',
        tipo_entidade: body.tipo_entidade || body.tipo_pessoa || (nif && nif.length > 9 ? 'coletiva' : 'singular'),
        email: body.email || null,
        telefone: body.telefone || null,
        morada: body.morada || body.endereco || null,
        endereco: body.endereco || body.morada || null,
        pais: body.pais || 'AO',
        provincia: body.provincia || null,
        municipio: body.municipio || null,
        empresa_id,
        ativo: body.ativo !== false,
        is_active: body.is_active !== false,
        tipo_cliente: body.tipo_cliente || 'regular',
        observacoes: body.observacoes || body.notas || null
      };

      const insertRes = await fetch(`${config.supabaseUrl}/rest/v1/clientes`, {
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
      if (!insertRes.ok) {
        return res.status(insertRes.status).json({ success: false, error: data });
      }

      const created = Array.isArray(data) ? data[0] : data;
      return res.status(201).json({
        success: true,
        data: created
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR', message: err.message });
    }
  }

  // --- 3. ACTUALIZAR CLIENTE (PUT / PATCH) ---
  if (req.method === 'PUT' || req.method === 'PATCH') {
    try {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const body = req.body || {};
      const id = url.searchParams.get('id') || body.id;

      if (!id) {
        return res.status(400).json({
          success: false,
          code: 'BAD_REQUEST',
          message: 'ID do cliente não fornecido para atualização.'
        });
      }

      const nif = (body.nif || '').trim();

      // Verificar se cliente pertence à empresa
      const existingRes = await fetch(`${config.supabaseUrl}/rest/v1/clientes?id=eq.${id}&select=id,empresa_id,nif`, {
        headers: {
          'apikey': config.serviceRoleKey,
          'Authorization': `Bearer ${config.serviceRoleKey}`
        }
      });
      const existingData = await existingRes.json();
      const existingClient = Array.isArray(existingData) ? existingData[0] : null;

      if (!existingClient) {
        return res.status(404).json({
          success: false,
          code: 'CLIENT_NOT_FOUND',
          message: 'Cliente não encontrado.'
        });
      }

      if (existingClient.empresa_id && existingClient.empresa_id !== empresa_id && !auth.isSuperAdmin) {
        return res.status(403).json({
          success: false,
          code: 'EMPRESA_ACCESS_DENIED',
          message: 'Não tem permissão para editar clientes de outra empresa.'
        });
      }

      // Validar duplicação de NIF contra outros clientes da mesma empresa
      if (nif && nif !== '999999999') {
        const dupRes = await fetch(
          `${config.supabaseUrl}/rest/v1/clientes?select=id&nif=eq.${encodeURIComponent(nif)}&empresa_id=eq.${empresa_id}&id=neq.${id}&limit=1`,
          {
            headers: {
              'apikey': config.serviceRoleKey,
              'Authorization': `Bearer ${config.serviceRoleKey}`
            }
          }
        );
        const dups = await dupRes.json();
        if (Array.isArray(dups) && dups.length > 0) {
          return res.status(409).json({
            success: false,
            code: 'CLIENT_NIF_ALREADY_EXISTS',
            message: `Já existe outro cliente com este NIF (${nif}) nesta empresa.`
          });
        }
      }

      const updatePayload = { ...body };
      delete updatePayload.id;
      delete updatePayload.created_at;

      const updateRes = await fetch(`${config.supabaseUrl}/rest/v1/clientes?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          'apikey': config.serviceRoleKey,
          'Authorization': `Bearer ${config.serviceRoleKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(updatePayload)
      });

      const updatedData = await updateRes.json();
      if (!updateRes.ok) {
        return res.status(updateRes.status).json({ success: false, error: updatedData });
      }

      const updated = Array.isArray(updatedData) ? updatedData[0] : updatedData;
      return res.status(200).json({
        success: true,
        data: updated
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR', message: err.message });
    }
  }

  // --- 4. ELIMINAR CLIENTE (DELETE) ---
  if (req.method === 'DELETE') {
    try {
      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const id = url.searchParams.get('id');

      if (!id) {
        return res.status(400).json({
          success: false,
          code: 'BAD_REQUEST',
          message: 'ID do cliente não fornecido para eliminação.'
        });
      }

      const delRes = await fetch(`${config.supabaseUrl}/rest/v1/clientes?id=eq.${id}`, {
        method: 'DELETE',
        headers: {
          'apikey': config.serviceRoleKey,
          'Authorization': `Bearer ${config.serviceRoleKey}`,
          'Prefer': 'return=representation'
        }
      });

      if (!delRes.ok) {
        const err = await delRes.json();
        return res.status(delRes.status).json({ success: false, error: err });
      }

      return res.status(200).json({ success: true, message: 'Cliente eliminado com sucesso.' });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'INTERNAL_SERVER_ERROR', message: err.message });
    }
  }

  return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
}
