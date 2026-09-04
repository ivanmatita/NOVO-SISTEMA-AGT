/**
 * api/secure-fornecedores.js
 * Handler Serverless Seguro para Gestão de Fornecedores com Isolamento Rigoroso de Tenant.
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
    
    // ISOLAMENTO TENANT ABSOLUTO: empresa_id SEMPRE da sessão autenticada
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
    const fornecedorId = pathParts.length >= 3 && pathParts[2] !== 'check-nif' ? pathParts[2] : null;
    const isCheckNif = pathname.includes('check-nif');

    // 1. Sub-rota: /api/secure-fornecedores/check-nif?nif=...
    if (isCheckNif) {
      const nif = parsedUrl.searchParams.get('nif') || req.query?.nif || '';
      const excludeId = parsedUrl.searchParams.get('excludeId') || req.query?.excludeId || '';

      if (!nif || nif === '999999999' || nif === '0' || !targetEmpresaId) {
        return res.status(200).json({ exists: false });
      }

      let checkUrl = `${config.supabaseUrl}/rest/v1/fornecedores?empresa_id=eq.${targetEmpresaId}&nif=eq.${encodeURIComponent(nif)}&select=id,nome,nif`;
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
        return res.status(200).json({ exists: true, fornecedor: checkList[0] });
      }
      return res.status(200).json({ exists: false });
    }

    // 2. GET (Listar fornecedores da empresa ou fornecedor por ID)
    if (req.method === 'GET') {
      if (fornecedorId) {
        let url = `${config.supabaseUrl}/rest/v1/fornecedores?id=eq.${fornecedorId}&empresa_id=eq.${targetEmpresaId}&select=*&limit=1`;
        const response = await fetch(url, {
          headers: {
            'apikey': config.serviceRoleKey,
            'Authorization': authHeader
          }
        });
        const list = await response.json();
        if (Array.isArray(list) && list.length > 0) {
          const s = list[0];
          return res.status(200).json({
            ...s,
            name: s.nome || s.name || '',
            endereco: s.morada || s.endereco || '',
            address: s.morada || s.address || ''
          });
        }
        return res.status(404).json({ error: 'Fornecedor não encontrado' });
      }

      let url = `${config.supabaseUrl}/rest/v1/fornecedores?empresa_id=eq.${targetEmpresaId}&select=*&order=nome.asc`;

      const response = await fetch(url, {
        headers: {
          'apikey': config.serviceRoleKey,
          'Authorization': authHeader
        }
      });
      const data = await response.json();
      const list = Array.isArray(data) ? data : [];
      return res.status(200).json(list.map(s => ({
        ...s,
        name: s.nome || s.name || '',
        endereco: s.morada || s.endereco || '',
        address: s.morada || s.address || ''
      })));
    }

    // 3. POST (Criar novo fornecedor)
    if (req.method === 'POST') {
      const body = req.body || {};
      const companyId = targetEmpresaId;
      if (!companyId) {
        return res.status(400).json({ error: 'empresa_id é obrigatório para cadastrar fornecedor' });
      }

      const isAtivo = body.activo !== undefined ? body.activo : (body.ativo !== undefined ? body.ativo : true);

      // SCHEMA SEGURO: Apenas colunas existentes na tabela public.fornecedores (morada, etc.)
      const payload = {
        empresa_id: companyId,
        nome: (body.nome || body.name || '').trim(),
        nif: (body.nif || '').trim() || null,
        email: body.email || null,
        telefone: body.telefone || body.phone || null,
        morada: body.morada || body.endereco || body.address || null,
        provincia: body.provincia || null,
        municipio: body.municipio || null,
        localidade: body.localidade || body.cidade || null,
        codigo_postal: body.codigo_postal || null,
        pais: body.pais || 'Angola',
        sigla_banco: body.sigla_banco || body.siglas_banco || null,
        iban: body.iban || null,
        tipo_fornecedor: body.tipo_fornecedor || 'Geral',
        webpage: body.webpage || body.website || null,
        notas: body.notas || null,
        activo: isAtivo,
        ativo: isAtivo,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const insertRes = await fetch(`${config.supabaseUrl}/rest/v1/fornecedores`, {
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
        console.error('[API-SECURE-FORNECEDORES] Erro POST:', inserted);
        return res.status(400).json({ error: inserted.message || 'Erro ao criar fornecedor' });
      }
      const createdItem = Array.isArray(inserted) ? inserted[0] : inserted;
      return res.status(201).json({
        ...createdItem,
        name: createdItem.nome || createdItem.name || '',
        endereco: createdItem.morada || createdItem.endereco || '',
        address: createdItem.morada || createdItem.address || ''
      });
    }

    // 4. PUT /api/secure-fornecedores/:id (Atualizar fornecedor)
    if (req.method === 'PUT') {
      const targetId = fornecedorId || req.body?.id;
      if (!targetId) return res.status(400).json({ error: 'ID do fornecedor é obrigatório para atualização' });

      const body = req.body || {};
      const payload = {
        updated_at: new Date().toISOString()
      };

      if (body.nome !== undefined) payload.nome = body.nome;
      if (body.nif !== undefined) payload.nif = (body.nif || '').trim() || null;
      if (body.email !== undefined) payload.email = body.email;
      if (body.telefone !== undefined) payload.telefone = body.telefone;
      if (body.morada !== undefined || body.endereco !== undefined || body.address !== undefined) {
        payload.morada = body.morada || body.endereco || body.address || null;
      }
      if (body.provincia !== undefined) payload.provincia = body.provincia;
      if (body.municipio !== undefined) payload.municipio = body.municipio;
      if (body.localidade !== undefined) payload.localidade = body.localidade;
      if (body.codigo_postal !== undefined) payload.codigo_postal = body.codigo_postal;
      if (body.pais !== undefined) payload.pais = body.pais;
      if (body.sigla_banco !== undefined) payload.sigla_banco = body.sigla_banco;
      if (body.iban !== undefined) payload.iban = body.iban;
      if (body.tipo_fornecedor !== undefined) payload.tipo_fornecedor = body.tipo_fornecedor;
      if (body.webpage !== undefined) payload.webpage = body.webpage;
      if (body.notas !== undefined) payload.notas = body.notas;
      if (body.activo !== undefined) {
        payload.activo = body.activo;
        payload.ativo = body.activo;
      }
      if (body.ativo !== undefined) {
        payload.ativo = body.ativo;
        payload.activo = body.ativo;
      }

      let patchUrl = `${config.supabaseUrl}/rest/v1/fornecedores?id=eq.${targetId}&empresa_id=eq.${targetEmpresaId}`;

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
        console.error('[API-SECURE-FORNECEDORES] Erro PATCH:', updated);
        return res.status(400).json({ error: updated.message || 'Erro ao atualizar fornecedor' });
      }
      const updatedItem = Array.isArray(updated) ? updated[0] : updated;
      return res.status(200).json({
        ...updatedItem,
        name: updatedItem.nome || updatedItem.name || '',
        endereco: updatedItem.morada || updatedItem.endereco || '',
        address: updatedItem.morada || updatedItem.address || ''
      });
    }

    return res.status(405).json({ error: 'Método não permitido' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
