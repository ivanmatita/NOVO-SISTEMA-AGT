/**
 * api/invoices.js
 * Handler Serverless Unificado para Emissão, Consulta e Gestão de Documentos Fiscais.
 * 100% Compatível com a tabela 'documentos_emitidos' no Supabase com isolamento de tenant.
 */

import { getEnvConfig, setCORS } from './_env.js';
import { authenticateRequest } from './_auth.js';

function getDocTypeAbbr(type) {
  if (!type) return 'FT';
  const t = type.toUpperCase().trim();
  if (t === 'FATURA' || t === 'FT') return 'FT';
  if (t === 'FATURA RECIBO' || t === 'FATURA-RECIBO' || t === 'FR') return 'FR';
  if (t === 'FATURA PROFORMA' || t === 'FATURA-PROFORMA' || t === 'FP' || t === 'PROFORMA' || t === 'PP') return 'FP';
  if (t === 'RECIBO' || t === 'RC') return 'RC';
  if (t === 'NOTA DE CRÉDITO' || t === 'NOTA DE CREDITO' || t === 'NC') return 'NC';
  if (t === 'NOTA DE DÉBITO' || t === 'NOTA DE DEBITO' || t === 'ND') return 'ND';
  if (t === 'GUIA DE TRANSPORTE' || t === 'GT') return 'GT';
  if (t === 'GUIA DE REMESSA' || t === 'GR') return 'GR';
  if (t === 'ORÇAMENTO' || t === 'ORCAMENTO' || t === 'OR') return 'OR';
  if (t === 'PROPOSTA COMERCIAL' || t === 'PC') return 'PC';
  if (t === 'CONSULTA DE MESA' || t === 'CM') return 'CM';
  return type.substring(0, 3).toUpperCase();
}

export default async function handler(req, res) {
  setCORS(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const auth = await authenticateRequest(req);
    const config = getEnvConfig(req);
    const authHeader = `Bearer ${config.serviceRoleKey}`;

    // Extrair ID da rota (ex: /api/invoices/uuid ou /api/invoices/uuid/void)
    let pathname = '';
    let queryEmpresaId = req.query?.empresa_id || '';
    let queryYear = req.query?.year || req.query?.ano || '';

    try {
      const parsedUrl = new URL(req.url || '', `http://${req.headers?.host || 'localhost'}`);
      pathname = parsedUrl.pathname;
      if (!queryEmpresaId) queryEmpresaId = parsedUrl.searchParams.get('empresa_id') || '';
      if (!queryYear) queryYear = parsedUrl.searchParams.get('year') || parsedUrl.searchParams.get('ano') || '';
    } catch (e) {
      pathname = req.url || '';
    }

    const pathParts = pathname.split('/').filter(Boolean);
    // pathParts: ['api', 'invoices'] ou ['api', 'invoices', ':id'] ou ['api', 'invoices', ':id', 'void']
    const docId = pathParts.length >= 3 && pathParts[2] !== 'invoices' ? pathParts[2] : null;
    const subAction = pathParts.length >= 4 ? pathParts[3] : null;

    const targetEmpresaId = queryEmpresaId || auth.empresa_id;

    // 1. GET (Listar documentos ou Obter um documento específico)
    if (req.method === 'GET') {
      if (docId) {
        let url = `${config.supabaseUrl}/rest/v1/documentos_emitidos?id=eq.${docId}&select=*&limit=1`;
        if (targetEmpresaId && !auth.isSuperAdmin) {
          url += `&empresa_id=eq.${targetEmpresaId}`;
        }
        const response = await fetch(url, {
          headers: {
            'apikey': config.serviceRoleKey,
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          }
        });
        const list = await response.json();
        if (Array.isArray(list) && list.length > 0) {
          return res.status(200).json(list[0]);
        }
        return res.status(404).json({ error: 'Documento não encontrado' });
      }

      // Listar todos os documentos da empresa
      let url = `${config.supabaseUrl}/rest/v1/documentos_emitidos?select=*&order=created_at.desc`;
      if (targetEmpresaId && !auth.isSuperAdmin) {
        url += `&empresa_id=eq.${targetEmpresaId}`;
      }
      if (queryYear) {
        url += `&data_emissao=gte.${queryYear}-01-01T00:00:00Z&data_emissao=lte.${queryYear}-12-31T23:59:59Z`;
      }

      const response = await fetch(url, {
        headers: {
          'apikey': config.serviceRoleKey,
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      return res.status(200).json(Array.isArray(data) ? data : []);
    }

    // 2. POST /api/invoices (Emitir novo documento ou acções sub-rotas)
    if (req.method === 'POST') {
      // Sub-rota: Anular documento (/api/invoices/:id/void)
      if (docId && (subAction === 'void' || subAction === 'anular')) {
        const motivo = req.body?.reason || req.body?.motivo_anulacao || 'Anulado pelo operador';
        const patchRes = await fetch(`${config.supabaseUrl}/rest/v1/documentos_emitidos?id=eq.${docId}`, {
          method: 'PATCH',
          headers: {
            'apikey': config.serviceRoleKey,
            'Authorization': authHeader,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            estado: 'anulado',
            status: 'anulado',
            documento_anulado: true,
            motivo_anulacao: motivo,
            anulado_por: auth.user?.id || null,
            anulado_at: new Date().toISOString(),
            data_anulacao: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        });
        const updated = await patchRes.json();
        return res.status(200).json(Array.isArray(updated) ? updated[0] : updated);
      }

      // Sub-rota: Certificar documento (/api/invoices/:id/certify)
      if (docId && (subAction === 'certify' || subAction === 'certificar')) {
        const patchRes = await fetch(`${config.supabaseUrl}/rest/v1/documentos_emitidos?id=eq.${docId}`, {
          method: 'PATCH',
          headers: {
            'apikey': config.serviceRoleKey,
            'Authorization': authHeader,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({
            is_certified: true,
            estado_certificacao: 'certificado',
            certified_at: new Date().toISOString(),
            certificado_por: auth.user?.id || null,
            updated_at: new Date().toISOString()
          })
        });
        const updated = await patchRes.json();
        return res.status(200).json(Array.isArray(updated) ? updated[0] : updated);
      }

      // Emissão de Novo Documento
      const body = req.body || {};
      const companyId = body.empresa_id || targetEmpresaId;
      if (!companyId) {
        return res.status(400).json({ error: 'empresa_id não identificado na emissão do documento' });
      }

      const docTypeRaw = body.document_type || body.tipo_documento || 'Fatura';
      const docTypeAbbr = getDocTypeAbbr(docTypeRaw);
      const year = new Date(body.date || body.data_emissao || Date.now()).getFullYear();
      const seriesRef = (body.series_reference || body.serie || 'A').toUpperCase();

      // Gerar ou utilizar número de documento fornecido
      let invoiceNumber = body.invoice_number || body.numero_documento || '';
      if (!invoiceNumber) {
        // Obter próximo número sequencial da tabela documentos_emitidos
        const countRes = await fetch(
          `${config.supabaseUrl}/rest/v1/documentos_emitidos?empresa_id=eq.${companyId}&tipo_documento=eq.${docTypeAbbr}&select=id`,
          {
            headers: {
              'apikey': config.serviceRoleKey,
              'Authorization': authHeader
            }
          }
        );
        const prevList = await countRes.json();
        const nextSeq = (Array.isArray(prevList) ? prevList.length : 0) + 1;
        invoiceNumber = `${docTypeAbbr} ${seriesRef}${year}/${nextSeq}`;
      }

      const totalVal = Number(body.total || body.valor_total || 0);
      const impostoVal = Number(body.imposto || body.vat_withholding || body.iva_total || 0);
      const clientName = (body.client_name || body.cliente_nome || 'Consumidor Final').trim();
      const clientNif = (body.client_nif || body.cliente_nif || body.nif || '999999999').trim();

      const newDocId = body.id || crypto.randomUUID();
      const nowIso = new Date().toISOString();

      const payload = {
        id: newDocId,
        empresa_id: companyId,
        tipo_documento: docTypeAbbr,
        document_type: docTypeAbbr,
        numero_documento: invoiceNumber,
        documento_formatado: invoiceNumber,
        invoice_number: invoiceNumber,
        cliente_id: body.cliente_id ? Number(body.cliente_id) || null : null,
        cliente_nome: clientName,
        client_name: clientName,
        cliente_nif: clientNif,
        client_nif: clientNif,
        cliente_email: body.client_email || body.cliente_email || null,
        total: totalVal,
        valor_total: totalVal,
        subtotal: Number(body.counter_value || totalVal - impostoVal),
        imposto: impostoVal,
        iva_total: impostoVal,
        estado: 'emitido',
        status: 'emitido',
        data_emissao: body.date || body.data_emissao || nowIso,
        data_vencimento: body.due_date || body.data_vencimento || null,
        serie: seriesRef,
        ano: year,
        forma_pagamento: body.payment_method || 'Pronto Pagamento',
        payment_method: body.payment_method || 'Pronto Pagamento',
        moeda: body.currency || body.moeda || 'AOA',
        cash_box: body.cash_box || null,
        serie_id: body.series_id || body.serie_id || null,
        documento_origem_id: body.documento_origem_id || null,
        numero_documento_origem: body.numero_documento_origem || null,
        valor_extenso: body.total_in_words || null,
        detalhes: {
          items: body.items || [],
          payment_method: body.payment_method,
          series_id: body.series_id,
          work_site_id: body.work_site_id,
          global_discount: body.global_discount,
          retencao_fonte_total: body.retencao_fonte_total,
          service_location: body.service_location
        },
        items: body.items || [],
        itens: body.items || [],
        criado_por: auth.user?.id || body.criado_por || null,
        created_by: auth.user?.id || null,
        created_at: nowIso,
        updated_at: nowIso,
        is_certified: false,
        is_draft: false,
        is_final: true,
        documento_anulado: false
      };

      const insertRes = await fetch(`${config.supabaseUrl}/rest/v1/documentos_emitidos`, {
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
        console.error('[API-INVOICES] Erro ao inserir documento:', inserted);
        return res.status(400).json({ error: inserted.message || 'Erro ao emitir documento fiscal' });
      }

      const resultDoc = Array.isArray(inserted) ? inserted[0] : inserted;
      return res.status(201).json(resultDoc);
    }

    // 3. PUT /api/invoices/:id (Atualizar documento)
    if (req.method === 'PUT') {
      const targetId = docId || req.body?.id;
      if (!targetId) return res.status(400).json({ error: 'ID do documento obrigatório para atualização' });

      const body = req.body || {};
      const updatePayload = {
        ...body,
        updated_at: new Date().toISOString()
      };
      delete updatePayload.id;

      const patchRes = await fetch(`${config.supabaseUrl}/rest/v1/documentos_emitidos?id=eq.${targetId}`, {
        method: 'PATCH',
        headers: {
          'apikey': config.serviceRoleKey,
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(updatePayload)
      });
      const updated = await patchRes.json();
      return res.status(200).json(Array.isArray(updated) ? updated[0] : updated);
    }

    // 4. DELETE /api/invoices/:id
    if (req.method === 'DELETE') {
      if (!docId) return res.status(400).json({ error: 'ID do documento obrigatório' });
      // Documentos fiscais são anulados, não deletados fisicamente
      await fetch(`${config.supabaseUrl}/rest/v1/documentos_emitidos?id=eq.${docId}`, {
        method: 'PATCH',
        headers: {
          'apikey': config.serviceRoleKey,
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ estado: 'anulado', documento_anulado: true, updated_at: new Date().toISOString() })
      });
      return res.status(200).json({ success: true, message: 'Documento anulado com sucesso' });
    }

    return res.status(405).json({ error: 'Método não permitido' });
  } catch (err) {
    console.error('[API-INVOICES] Erro inesperado:', err);
    return res.status(500).json({ error: err.message });
  }
}
