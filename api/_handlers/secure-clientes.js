/**
 * api/secure-clientes.js
 * Handler Serverless Seguro para Gestão de Clientes com Isolamento Rigoroso de Tenant.
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
    // incluindo Imatec Angola — cada empresa vê APENAS os seus próprios clientes
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
        let url = `${config.supabaseUrl}/rest/v1/clientes?id=eq.${clientId}&empresa_id=eq.${targetEmpresaId}&select=*&limit=1`;
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

      let url = `${config.supabaseUrl}/rest/v1/clientes?empresa_id=eq.${targetEmpresaId}&select=*&order=nome.asc`;

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
      // SEGURANÇA: empresa_id SEMPRE vem da sessão autenticada, nunca do body
      const companyId = targetEmpresaId;
      if (!companyId) {
        return res.status(400).json({ error: 'empresa_id é obrigatório para cadastrar cliente' });
      }

      const isAtivo = body.ativo !== undefined ? body.ativo : (body.activo !== undefined ? body.activo : (body.is_active !== undefined ? body.is_active : true));

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
        cidade: body.cidade || null,
        localidade: body.localidade || null,
        codigo_postal: body.codigo_postal || null,
        pais: body.pais || 'Angola',
        tipo_entidade: body.tipo_entidade || 'Empresa',
        tipo_cliente: body.tipo_cliente || 'Nacional',
        tipo: body.tipo || body.tipo_cliente || 'Nacional',
        saldo_inicial: Number(body.saldo_inicial || body.initial_balance || 0),
        initial_balance: Number(body.saldo_inicial || body.initial_balance || 0),
        ativo: isAtivo,
        activo: isAtivo,
        is_active: isAtivo,
        notas: body.notas || body.observacoes || null,
        observacoes: body.observacoes || body.notas || null,
        webpage: body.webpage || body.website || null,
        website: body.website || body.webpage || null,
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
        console.error('[API-SECURE-CLIENTES] Erro POST:', inserted);
        return res.status(400).json({ error: inserted.message || 'Erro ao criar cliente' });
      }
      return res.status(201).json(Array.isArray(inserted) ? inserted[0] : inserted);
    }

    // 4. PUT /api/secure-clientes/:id (Atualizar cliente)
    if (req.method === 'PUT') {
      const targetId = clientId || req.body?.id;
      if (!targetId) return res.status(400).json({ error: 'ID do cliente é obrigatório para atualização' });

      const body = req.body || {};
      const isAtivo = body.ativo !== undefined ? body.ativo : (body.activo !== undefined ? body.activo : (body.is_active !== undefined ? body.is_active : undefined));

      const payload = {
        updated_at: new Date().toISOString()
      };

      if (body.nome !== undefined) payload.nome = body.nome;
      if (body.nif !== undefined || body.contribuinte !== undefined) {
        payload.nif = (body.nif || body.contribuinte || '').trim() || null;
        payload.contribuinte = (body.contribuinte || body.nif || '').trim() || null;
      }
      if (body.email !== undefined) payload.email = body.email;
      if (body.telefone !== undefined) payload.telefone = body.telefone;
      if (body.endereco !== undefined || body.morada !== undefined) {
        payload.endereco = body.endereco || body.morada || null;
        payload.morada = body.morada || body.endereco || null;
      }
      if (body.provincia !== undefined) payload.provincia = body.provincia;
      if (body.municipio !== undefined) payload.municipio = body.municipio;
      if (body.cidade !== undefined) payload.cidade = body.cidade;
      if (body.pais !== undefined) payload.pais = body.pais;
      if (body.tipo_entidade !== undefined) payload.tipo_entidade = body.tipo_entidade;
      if (body.tipo_cliente !== undefined) payload.tipo_cliente = body.tipo_cliente;
      if (body.saldo_inicial !== undefined) payload.saldo_inicial = Number(body.saldo_inicial || 0);
      if (body.notas !== undefined || body.observacoes !== undefined) {
        payload.notas = body.notas || body.observacoes || null;
        payload.observacoes = body.observacoes || body.notas || null;
      }
      if (body.webpage !== undefined || body.website !== undefined) {
        payload.webpage = body.webpage || body.website || null;
        payload.website = body.website || body.webpage || null;
      }
      if (isAtivo !== undefined) {
        payload.ativo = isAtivo;
        payload.activo = isAtivo;
        payload.is_active = isAtivo;
      }

      let patchUrl = `${config.supabaseUrl}/rest/v1/clientes?id=eq.${targetId}&empresa_id=eq.${targetEmpresaId}`;

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
        console.error('[API-SECURE-CLIENTES] Erro PATCH:', updated);
        return res.status(400).json({ error: updated.message || 'Erro ao atualizar cliente' });
      }
      return res.status(200).json(Array.isArray(updated) ? updated[0] : updated);
    }

    return res.status(405).json({ error: 'Método não permitido' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
