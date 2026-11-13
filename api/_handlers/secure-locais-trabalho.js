/**
 * api/secure-locais-trabalho.js
 * Handler Serverless Seguro para Gestão de Locais de Trabalho com Isolamento de Tenant.
 */

import { getEnvConfig, setCORS } from '../_env.js';
import { authenticateRequest, validateCompanyLicense } from '../_auth.js';

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
    const pathname = parsedUrl.pathname;
    
    // ISOLAMENTO TENANT ABSOLUTO: empresa_id SEMPRE da sessão autenticada, em TODAS as empresas
    // incluindo Imatec Angola — cada empresa vê APENAS os seus próprios locais de trabalho
    const targetEmpresaId = auth.empresa_id;

    if (!targetEmpresaId) {
      return res.status(400).json({ error: 'Empresa não identificada na sessão' });
    }

    // VALIDAÇÃO DE LICENÇA ATIVA PARA OPERAÇÕES DE ESCRITA (MODO SOMENTE LEITURA)
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const licValidation = await validateCompanyLicense(targetEmpresaId, config);
      if (!licValidation.valid && !auth.isSuperAdmin) {
        return res.status(403).json({
          error: licValidation.message || 'Operação de escrita bloqueada: A licença da sua empresa não está ativa. O sistema está em Modo Somente Leitura.',
          code: 'LICENSE_READ_ONLY',
          status_licenca: licValidation.status,
          readOnly: true
        });
      }
    }

    const pathParts = pathname.split('/').filter(Boolean);
    const localId = pathParts.length >= 3 ? pathParts[2] : null;

    // 1. GET
    if (req.method === 'GET') {
      if (localId) {
        let url = `${config.supabaseUrl}/rest/v1/locais_trabalho?id=eq.${localId}&empresa_id=eq.${targetEmpresaId}&select=*&limit=1`;
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

      let url = `${config.supabaseUrl}/rest/v1/locais_trabalho?empresa_id=eq.${targetEmpresaId}&select=*&order=nome.asc`;

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
      // SEGURANÇA: empresa_id SEMPRE da sessão autenticada, nunca do body
      const companyId = targetEmpresaId;
      if (!companyId) {
        return res.status(400).json({ error: 'empresa_id obrigatório' });
      }

      const startDate = body.start_date && String(body.start_date).trim() ? String(body.start_date).trim() : null;
      const endDate = body.end_date && String(body.end_date).trim() ? String(body.end_date).trim() : null;

      const payload = {
        empresa_id: companyId,
        nome: (body.nome || body.name || '').trim(),
        endereco: body.endereco || body.morada || body.address || null,
        morada: body.morada || body.endereco || body.address || null,
        cidade: body.cidade || body.city || null,
        provincia: body.provincia || null,
        municipio: body.municipio || null,
        localizacao: body.localizacao || body.endereco || null,
        pais: body.pais || body.country || 'Angola',
        telefone: body.telefone || body.phone || null,
        email: body.email || null,
        responsavel: body.responsavel || body.manager || null,
        descricao: body.descricao || body.description || null,
        observacoes: body.observacoes || null,
        client_id: body.client_id ? String(body.client_id) : null,
        client_name: body.client_name || null,
        start_date: startDate,
        end_date: endDate,
        code: body.code || null,
        staff_per_day: Number(body.staff_per_day || 0),
        total_staff: Number(body.total_staff || 0),
        status: body.status || 'ativo',
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
        console.error('[API-SECURE-LOCAIS] Erro POST:', inserted);
        return res.status(400).json({ error: inserted.message || 'Erro ao criar local de trabalho' });
      }
      return res.status(201).json(Array.isArray(inserted) ? inserted[0] : inserted);
    }

    // 3. PUT
    if (req.method === 'PUT') {
      const targetId = localId || req.body?.id;
      if (!targetId) return res.status(400).json({ error: 'ID do local obrigatório' });

      const body = req.body || {};
      const payload = { updated_at: new Date().toISOString() };

      if (body.nome !== undefined) payload.nome = body.nome;
      if (body.endereco !== undefined || body.morada !== undefined) {
        payload.endereco = body.endereco || body.morada || null;
        payload.morada = body.morada || body.endereco || null;
      }
      if (body.cidade !== undefined) payload.cidade = body.cidade;
      if (body.provincia !== undefined) payload.provincia = body.provincia;
      if (body.municipio !== undefined) payload.municipio = body.municipio;
      if (body.localizacao !== undefined) payload.localizacao = body.localizacao;
      if (body.pais !== undefined) payload.pais = body.pais;
      if (body.telefone !== undefined) payload.telefone = body.telefone;
      if (body.email !== undefined) payload.email = body.email;
      if (body.responsavel !== undefined) payload.responsavel = body.responsavel;
      if (body.descricao !== undefined) payload.descricao = body.descricao;
      if (body.observacoes !== undefined) payload.observacoes = body.observacoes;
      if (body.client_id !== undefined) payload.client_id = body.client_id ? String(body.client_id) : null;
      if (body.client_name !== undefined) payload.client_name = body.client_name;
      if (body.start_date !== undefined) payload.start_date = body.start_date ? String(body.start_date).trim() : null;
      if (body.end_date !== undefined) payload.end_date = body.end_date ? String(body.end_date).trim() : null;
      if (body.code !== undefined) payload.code = body.code;
      if (body.staff_per_day !== undefined) payload.staff_per_day = Number(body.staff_per_day || 0);
      if (body.total_staff !== undefined) payload.total_staff = Number(body.total_staff || 0);
      if (body.status !== undefined) payload.status = body.status;
      if (body.ativo !== undefined) payload.ativo = body.ativo;

      let patchUrl = `${config.supabaseUrl}/rest/v1/locais_trabalho?id=eq.${targetId}&empresa_id=eq.${targetEmpresaId}`;

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
      if (!patchRes.ok) {
        console.error('[API-SECURE-LOCAIS] Erro PATCH:', updated);
        return res.status(400).json({ error: updated.message || 'Erro ao atualizar local de trabalho' });
      }
      return res.status(200).json(Array.isArray(updated) ? updated[0] : updated);
    }

    // 4. DELETE
    if (req.method === 'DELETE') {
      const targetId = localId || req.body?.id;
      if (!targetId) return res.status(400).json({ error: 'ID do local obrigatório' });

      let deleteUrl = `${config.supabaseUrl}/rest/v1/locais_trabalho?id=eq.${targetId}&empresa_id=eq.${targetEmpresaId}`;

      const delRes = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'apikey': config.serviceRoleKey,
          'Authorization': authHeader
        }
      });
      if (!delRes.ok) {
        const errJson = await delRes.json().catch(() => ({}));
        return res.status(400).json({ error: errJson.message || 'Erro ao remover local de trabalho' });
      }
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Método não permitido' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
