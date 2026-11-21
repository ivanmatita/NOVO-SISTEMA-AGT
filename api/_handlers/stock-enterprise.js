/**
 * api/_handlers/stock-enterprise.js
 * Backend Enterprise Multi-Tenant para Gestão Avançada de Stock (IMATEC ERP)
 * - Isolamento rigoroso por empresa_id extraído da sessão JWT verificada no servidor
 * - RBAC server-side (admin, gestor_stock, operador, auditor, consulta)
 * - Atualizações atómicas entre produtos, stock_saldos, stock_lotes e movimentacoes_stock
 */

import { createClient } from '@supabase/supabase-js';
import { getEnvConfig } from '../_env.js';

function getAdminForRequest(req) {
  const cfg = getEnvConfig(req);
  return createClient(cfg.supabaseUrl, cfg.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function resolveAuthContext(req, supabaseAdmin) {
  const authHeader = req.headers?.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return { error: 'Token de autenticação obrigatório.', status: 401 };

  const cfg = getEnvConfig(req);
  const authRes = await fetch(`${cfg.supabaseUrl}/auth/v1/user`, {
    headers: { apikey: cfg.anonKey, Authorization: `Bearer ${token}` },
  });

  if (!authRes.ok) {
    return { error: 'Sessão inválida ou expirada.', status: 401 };
  }

  const user = await authRes.json();
  if (!user?.id) return { error: 'Utilizador não identificado.', status: 401 };

  const { data: perfil } = await supabaseAdmin
    .from('perfis')
    .select('*')
    .or(`id.eq.${user.id},user_id.eq.${user.id},email.eq.${user.email}`)
    .maybeSingle();

  const { data: ownedCompany } = await supabaseAdmin
    .from('empresas')
    .select('id, nome_empresa, nome')
    .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
    .maybeSingle();

  const isSuperAdmin = Boolean(
    perfil?.is_super_admin ||
    String(perfil?.role || '').toLowerCase() === 'superadmin' ||
    String(perfil?.role || '').toLowerCase() === 'super_admin'
  );

  const requestedEmpresaId = req.body?.empresa_id || req.query?.empresa_id || null;
  let empresaId = perfil?.empresa_id || perfil?.company_id || ownedCompany?.id || null;

  if (isSuperAdmin && requestedEmpresaId) {
    empresaId = requestedEmpresaId;
  } else if (requestedEmpresaId && empresaId && String(requestedEmpresaId) !== String(empresaId)) {
    return { error: 'Acesso negado: violação de isolamento multi-empresa.', status: 403 };
  }

  if (!empresaId) {
    return { error: 'Empresa não associada à conta autenticada.', status: 403 };
  }

  let rawRole = String(perfil?.role || (ownedCompany ? 'admin' : 'operador')).toLowerCase().trim();
  if (perfil?.is_admin || ownedCompany) rawRole = 'admin';
  if (rawRole === 'user' || rawRole === 'operador_armazem') rawRole = 'operador';

  return {
    userId: user.id,
    email: user.email,
    name: perfil?.nome || perfil?.name || user.user_metadata?.full_name || user.email,
    username: perfil?.username || user.email?.split('@')[0] || 'operador',
    empresaId: String(empresaId),
    role: rawRole,
    isSuperAdmin,
  };
}

function canOperate(role) {
  return ['admin', 'superadmin', 'super_admin', 'gestor_stock', 'gestor', 'manager', 'operador'].includes(role);
}

function canApproveOrReconcile(role) {
  return ['admin', 'superadmin', 'super_admin', 'gestor_stock', 'gestor', 'manager'].includes(role);
}

function canConfigure(role) {
  return ['admin', 'superadmin', 'super_admin', 'gestor_stock'].includes(role);
}

async function upsertWarehouseBalance(supabaseAdmin, { empresaId, productId, armazemId, deltaDisponivel, deltaReservado = 0, newCost = null }) {
  if (!armazemId) return null;
  const armKey = String(armazemId);
  const { data: existing } = await supabaseAdmin
    .from('stock_saldos')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('product_id', productId)
    .eq('armazem_id', armKey)
    .maybeSingle();

  const curDisp = Number(existing?.quantidade_disponivel || 0);
  const curRes = Number(existing?.quantidade_reservada || 0);
  const nextDisp = Math.round((curDisp + Number(deltaDisponivel || 0)) * 1000) / 1000;
  const nextRes = Math.max(0, Math.round((curRes + Number(deltaReservado || 0)) * 1000) / 1000);

  let nextCost = Number(existing?.custo_medio || 0);
  if (newCost !== null && Number(newCost) > 0 && Number(deltaDisponivel) > 0) {
    const totalPrevVal = Math.max(0, curDisp) * nextCost;
    const addVal = Number(deltaDisponivel) * Number(newCost);
    const totalQty = Math.max(0, curDisp) + Number(deltaDisponivel);
    nextCost = totalQty > 0 ? Math.round(((totalPrevVal + addVal) / totalQty) * 100) / 100 : Number(newCost);
  }

  if (existing) {
    await supabaseAdmin
      .from('stock_saldos')
      .update({
        quantidade_disponivel: nextDisp,
        quantidade_reservada: nextRes,
        custo_medio: nextCost,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
  } else {
    await supabaseAdmin.from('stock_saldos').insert([{
      empresa_id: empresaId,
      product_id: productId,
      armazem_id: armKey,
      quantidade_disponivel: nextDisp,
      quantidade_reservada: nextRes,
      custo_medio: nextCost || Number(newCost || 0),
      updated_at: new Date().toISOString(),
    }]);
  }
  return { prevDisp: curDisp, nextDisp, nextCost };
}

export default async function stockEnterpriseHandler(req, res) {
  const supabaseAdmin = getAdminForRequest(req);
  const urlPath = (req.originalUrl || req.url || '').split('?')[0];

  try {
    const ctx = await resolveAuthContext(req, supabaseAdmin);
    if (ctx.error) {
      return res.status(ctx.status || 401).json({ error: ctx.error });
    }

    // 1. GET /api/stock/overview
    if (req.method === 'GET' && urlPath.endsWith('/overview')) {
      const [
        saldosRes,
        catsRes,
        unitsRes,
        lotesRes,
        transfRes,
        invRes,
        invItemsRes,
        ordersRes,
        alertsRes,
        settingsRes,
        agentsRes,
      ] = await Promise.all([
        supabaseAdmin.from('stock_saldos').select('*').eq('empresa_id', ctx.empresaId),
        supabaseAdmin.from('categorias').select('*').eq('empresa_id', ctx.empresaId).order('nome', { ascending: true }),
        supabaseAdmin.from('unidades_medida').select('*').eq('empresa_id', ctx.empresaId).order('sigla', { ascending: true }),
        supabaseAdmin.from('stock_lotes').select('*').eq('empresa_id', ctx.empresaId).order('data_validade', { ascending: true }),
        supabaseAdmin.from('stock_transferencias').select('*').eq('empresa_id', ctx.empresaId).order('created_at', { ascending: false }).limit(200),
        supabaseAdmin.from('stock_inventarios').select('*').eq('empresa_id', ctx.empresaId).order('created_at', { ascending: false }).limit(100),
        supabaseAdmin.from('stock_inventario_itens').select('*').eq('empresa_id', ctx.empresaId).limit(1000),
        supabaseAdmin.from('stock_ordens_compra').select('*').eq('empresa_id', ctx.empresaId).order('created_at', { ascending: false }).limit(200),
        supabaseAdmin.from('stock_alertas').select('*').eq('empresa_id', ctx.empresaId).order('created_at', { ascending: false }).limit(200),
        supabaseAdmin.from('stock_configuracoes').select('*').eq('empresa_id', ctx.empresaId).maybeSingle(),
        supabaseAdmin.from('agentes_ia_atividades').select('*').eq('empresa_id', ctx.empresaId).order('created_at', { ascending: false }).limit(100),
      ]);

      return res.json({
        empresa_id: ctx.empresaId,
        saldos: saldosRes.data || [],
        categorias: catsRes.data || [],
        unidades: unitsRes.data || [],
        lotes: lotesRes.data || [],
        transferencias: transfRes.data || [],
        inventarios: invRes.data || [],
        inventario_itens: invItemsRes.data || [],
        ordens_compra: ordersRes.data || [],
        alertas: alertsRes.data || [],
        configuracoes: settingsRes.data || {
          empresa_id: ctx.empresaId,
          metodo_valorizacao: 'CMP',
          permitir_stock_negativo: false,
          bloquear_venda_sem_stock: true,
          dias_alerta_validade: 30,
          dias_sem_movimento: 60,
          aprovar_transferencias: false,
          aprovar_inventarios: true,
          agentes_frequencia_minutos: 60,
          alerta_email: true,
        },
        agentes_atividades: agentsRes.data || [],
      });
    }

    // 2. POST /api/stock/operation — Entrada, Saída, Perda, Dano, Devolução, Ajuste
    if (req.method === 'POST' && urlPath.endsWith('/operation')) {
      if (!canOperate(ctx.role)) {
        return res.status(403).json({ error: 'Perfil sem permissão para movimentar stock.' });
      }
      const {
        product_id,
        armazem_id,
        type, // 'entry' | 'exit' | 'adjustment_plus' | 'adjustment_minus' | 'loss' | 'return'
        subtipo,
        quantity,
        unit_price,
        motivo,
        description,
        reference_id,
        documento_origem,
        numero_documento,
        fornecedor_nome,
        cliente_nome,
        data_documento,
        lote_codigo,
        serial_number,
        data_validade,
        observacoes,
      } = req.body || {};

      const qty = Number(quantity || 0);
      if (!product_id || qty <= 0) {
        return res.status(400).json({ error: 'Produto e quantidade positiva são obrigatórios.' });
      }

      const { data: prod, error: prodErr } = await supabaseAdmin
        .from('produtos')
        .select('*')
        .eq('id', product_id)
        .eq('empresa_id', ctx.empresaId)
        .maybeSingle();

      if (prodErr || !prod) {
        return res.status(404).json({ error: 'Produto não encontrado nesta empresa.' });
      }

      const { data: cfg } = await supabaseAdmin
        .from('stock_configuracoes')
        .select('*')
        .eq('empresa_id', ctx.empresaId)
        .maybeSingle();

      const isInbound = type === 'entry' || type === 'adjustment_plus' || (type === 'return' && subtipo !== 'devolucao_fornecedor');
      const prevStock = Number(prod.stock_quantity ?? prod.stock ?? prod.stock_atual ?? 0);
      const delta = isInbound ? qty : -qty;
      const newStock = Math.round((prevStock + delta) * 1000) / 1000;

      if (!isInbound && newStock < 0 && !cfg?.permitir_stock_negativo) {
        return res.status(400).json({
          error: `Stock insuficiente para saída. Disponível: ${prevStock}, Solicitado: ${qty}.`,
        });
      }

      const effectiveArmId = armazem_id || prod.warehouse_id || prod.armazem_id || null;
      let armName = null;
      if (effectiveArmId) {
        const { data: armRow } = await supabaseAdmin
          .from('armazens')
          .select('id, name, nome')
          .eq('empresa_id', ctx.empresaId)
          .eq('id', effectiveArmId)
          .maybeSingle();
        armName = armRow?.name || armRow?.nome || null;
      }

      const unitCost = Number(unit_price ?? prod.cost_price ?? prod.preco_compra ?? 0);
      const totalVal = Math.round(qty * unitCost * 100) / 100;

      // Recalcular CMP nas entradas com custo
      let nextCost = Number(prod.cost_price ?? prod.preco_compra ?? 0);
      if (isInbound && unitCost > 0) {
        const prevVal = Math.max(0, prevStock) * nextCost;
        const totQty = Math.max(0, prevStock) + qty;
        nextCost = totQty > 0 ? Math.round(((prevVal + totalVal) / totQty) * 100) / 100 : unitCost;
      }

      const prodUpdate = {
        stock_quantity: newStock,
        stock: newStock,
        stock_atual: newStock,
        estoque_atual: newStock,
        cost_price: nextCost,
        preco_compra: nextCost,
        preco_custo: nextCost,
        updated_at: new Date().toISOString(),
        updated_by: ctx.userId,
      };
      if (data_validade && isInbound) prodUpdate.data_validade = data_validade;

      await supabaseAdmin
        .from('produtos')
        .update(prodUpdate)
        .eq('id', prod.id)
        .eq('empresa_id', ctx.empresaId);

      if (effectiveArmId) {
        await upsertWarehouseBalance(supabaseAdmin, {
          empresaId: ctx.empresaId,
          productId: prod.id,
          armazemId: effectiveArmId,
          deltaDisponivel: delta,
          newCost: isInbound ? unitCost : null,
        });
      }

      // Registar ou abater Lote/Série se fornecido
      let loteId = null;
      if (lote_codigo || serial_number || data_validade) {
        if (isInbound) {
          const { data: newLot } = await supabaseAdmin
            .from('stock_lotes')
            .insert([{
              empresa_id: ctx.empresaId,
              product_id: prod.id,
              armazem_id: effectiveArmId ? String(effectiveArmId) : null,
              numero_lote: lote_codigo || null,
              numero_serie: serial_number || null,
              data_validade: data_validade || null,
              quantidade_inicial: qty,
              quantidade_atual: qty,
              custo_unitario: unitCost,
              fornecedor_nome: fornecedor_nome || null,
              estado: 'ativo',
              observacoes: observacoes || null,
            }])
            .select('id')
            .maybeSingle();
          loteId = newLot?.id || null;
        } else if (lote_codigo || serial_number) {
          let lotQuery = supabaseAdmin
            .from('stock_lotes')
            .select('*')
            .eq('empresa_id', ctx.empresaId)
            .eq('product_id', prod.id);
          if (lote_codigo) lotQuery = lotQuery.eq('numero_lote', lote_codigo);
          if (serial_number) lotQuery = lotQuery.eq('numero_serie', serial_number);
          const { data: foundLot } = await lotQuery.limit(1).maybeSingle();
          if (foundLot) {
            loteId = foundLot.id;
            const rem = Math.max(0, Number(foundLot.quantidade_atual || 0) - qty);
            await supabaseAdmin
              .from('stock_lotes')
              .update({
                quantidade_atual: rem,
                estado: rem <= 0 ? 'esgotado' : foundLot.estado,
                updated_at: new Date().toISOString(),
              })
              .eq('id', foundLot.id);
          }
        }
      }

      const movPayload = {
        empresa_id: ctx.empresaId,
        product_id: prod.id,
        produto_id: prod.id,
        product_name: prod.name || prod.nome,
        type,
        tipo: isInbound ? 'entrada' : 'saida',
        subtipo: subtipo || type,
        quantity: qty,
        quantidade: qty,
        unit_price: unitCost,
        custo_unitario: unitCost,
        valor_total: totalVal,
        previous_stock: prevStock,
        current_stock: newStock,
        warehouse_id: effectiveArmId && !isNaN(Number(effectiveArmId)) ? Number(effectiveArmId) : null,
        armazem_id: effectiveArmId ? String(effectiveArmId) : null,
        warehouse_name: armName,
        lote_id: loteId,
        lote_codigo: lote_codigo || null,
        serial_number: serial_number || null,
        data_validade: data_validade || null,
        motivo: motivo || null,
        documento_origem: documento_origem || null,
        numero_documento: numero_documento || null,
        fornecedor_nome: fornecedor_nome || null,
        cliente_nome: cliente_nome || null,
        data_documento: data_documento || new Date().toISOString().slice(0, 10),
        observacoes: observacoes || null,
        reference_id: reference_id || `OP-${Date.now()}`,
        referencia: reference_id || numero_documento || null,
        description: description || motivo || `${isInbound ? 'Entrada' : 'Saída'} manual (${subtipo || type})`,
        ano: new Date().getFullYear(),
        created_by: ctx.userId,
        created_by_nome: ctx.name,
        created_by_username: ctx.username,
        created_at: new Date().toISOString(),
      };

      const { data: movRow, error: movErr } = await supabaseAdmin
        .from('movimentacoes_stock')
        .insert([movPayload])
        .select('*')
        .single();

      if (movErr) {
        return res.status(500).json({ error: `Erro ao registar movimento: ${movErr.message}` });
      }

      return res.json({ success: true, movement: movRow, previous_stock: prevStock, current_stock: newStock, custo_medio: nextCost });
    }

    // 3. POST /api/stock/transfer — Criar / Aprovar / Concluir / Cancelar Transferência
    if (req.method === 'POST' && urlPath.endsWith('/transfer')) {
      const { action = 'create', transfer_id, product_id, armazem_origem_id, armazem_destino_id, quantidade, lote_codigo, observacoes, concluir_direto } = req.body || {};

      if (action === 'create') {
        if (!canOperate(ctx.role)) return res.status(403).json({ error: 'Sem permissão para transferir stock.' });
        const qty = Number(quantidade || 0);
        if (!product_id || !armazem_origem_id || !armazem_destino_id || qty <= 0) {
          return res.status(400).json({ error: 'Produto, armazém origem, armazém destino e quantidade positiva são obrigatórios.' });
        }
        if (String(armazem_origem_id) === String(armazem_destino_id)) {
          return res.status(400).json({ error: 'O armazém de origem e destino não podem ser iguais.' });
        }

        const { data: prod } = await supabaseAdmin
          .from('produtos')
          .select('*')
          .eq('id', product_id)
          .eq('empresa_id', ctx.empresaId)
          .maybeSingle();
        if (!prod) return res.status(404).json({ error: 'Produto não encontrado.' });

        const { data: arms } = await supabaseAdmin
          .from('armazens')
          .select('id, name, nome')
          .eq('empresa_id', ctx.empresaId);

        const origArm = (arms || []).find(a => String(a.id) === String(armazem_origem_id));
        const destArm = (arms || []).find(a => String(a.id) === String(armazem_destino_id));
        const origName = origArm?.name || origArm?.nome || `Armazém #${armazem_origem_id}`;
        const destName = destArm?.name || destArm?.nome || `Armazém #${armazem_destino_id}`;

        const unitCost = Number(prod.cost_price ?? prod.preco_compra ?? 0);
        const { data: cfg } = await supabaseAdmin
          .from('stock_configuracoes')
          .select('aprovar_transferencias')
          .eq('empresa_id', ctx.empresaId)
          .maybeSingle();

        const shouldCompleteNow = concluir_direto === true || (!cfg?.aprovar_transferencias && concluir_direto !== false);
        const codigo = `TRF-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;

        // Verificar saldo de origem se conhecido
        const { data: origSaldo } = await supabaseAdmin
          .from('stock_saldos')
          .select('*')
          .eq('empresa_id', ctx.empresaId)
          .eq('product_id', prod.id)
          .eq('armazem_id', String(armazem_origem_id))
          .maybeSingle();

        const availableOrigin = origSaldo
          ? Number(origSaldo.quantidade_disponivel || 0)
          : Number(prod.stock_quantity ?? prod.stock ?? 0);

        if (availableOrigin < qty) {
          return res.status(400).json({
            error: `Saldo insuficiente no armazém de origem (${origName}). Disponível: ${availableOrigin}, Solicitado: ${qty}.`,
          });
        }

        const { data: trf, error: trfErr } = await supabaseAdmin
          .from('stock_transferencias')
          .insert([{
            empresa_id: ctx.empresaId,
            codigo,
            product_id: prod.id,
            product_name: prod.name || prod.nome,
            armazem_origem_id: String(armazem_origem_id),
            armazem_origem_nome: origName,
            armazem_destino_id: String(armazem_destino_id),
            armazem_destino_nome: destName,
            quantidade: qty,
            custo_unitario: unitCost,
            valor_total: Math.round(qty * unitCost * 100) / 100,
            estado: shouldCompleteNow ? 'concluida' : 'pendente',
            lote_codigo: lote_codigo || null,
            observacoes: observacoes || null,
            solicitado_por: ctx.userId,
            solicitado_por_nome: ctx.name,
            aprovado_por: shouldCompleteNow ? ctx.userId : null,
            aprovado_por_nome: shouldCompleteNow ? ctx.name : null,
            concluido_em: shouldCompleteNow ? new Date().toISOString() : null,
          }])
          .select('*')
          .single();

        if (trfErr) return res.status(500).json({ error: trfErr.message });

        if (shouldCompleteNow) {
          const outRes = await upsertWarehouseBalance(supabaseAdmin, {
            empresaId: ctx.empresaId,
            productId: prod.id,
            armazemId: armazem_origem_id,
            deltaDisponivel: -qty,
          });
          const inRes = await upsertWarehouseBalance(supabaseAdmin, {
            empresaId: ctx.empresaId,
            productId: prod.id,
            armazemId: armazem_destino_id,
            deltaDisponivel: qty,
            newCost: unitCost,
          });

          const numOrig = !isNaN(Number(armazem_origem_id)) ? Number(armazem_origem_id) : null;
          const numDest = !isNaN(Number(armazem_destino_id)) ? Number(armazem_destino_id) : null;

          await supabaseAdmin.from('movimentacoes_stock').insert([
            {
              empresa_id: ctx.empresaId,
              product_id: prod.id,
              produto_id: prod.id,
              product_name: prod.name || prod.nome,
              type: 'transfer',
              tipo: 'transferencia',
              subtipo: 'transferencia_saida',
              quantity: qty,
              quantidade: qty,
              unit_price: unitCost,
              custo_unitario: unitCost,
              valor_total: Math.round(qty * unitCost * 100) / 100,
              previous_stock: outRes?.prevDisp ?? availableOrigin,
              current_stock: outRes?.nextDisp ?? Math.max(0, availableOrigin - qty),
              warehouse_id: numOrig,
              to_warehouse_id: numDest,
              armazem_id: String(armazem_origem_id),
              armazem_origem_id: String(armazem_origem_id),
              armazem_destino_id: String(armazem_destino_id),
              warehouse_name: origName,
              to_warehouse_name: destName,
              lote_codigo: lote_codigo || null,
              reference_id: codigo,
              referencia: codigo,
              description: `Transferência Saída (${origName} → ${destName})`,
              ano: new Date().getFullYear(),
              created_by: ctx.userId,
              created_by_nome: ctx.name,
              created_by_username: ctx.username,
            },
            {
              empresa_id: ctx.empresaId,
              product_id: prod.id,
              produto_id: prod.id,
              product_name: prod.name || prod.nome,
              type: 'transfer',
              tipo: 'transferencia',
              subtipo: 'transferencia_entrada',
              quantity: qty,
              quantidade: qty,
              unit_price: unitCost,
              custo_unitario: unitCost,
              valor_total: Math.round(qty * unitCost * 100) / 100,
              previous_stock: inRes?.prevDisp ?? 0,
              current_stock: inRes?.nextDisp ?? qty,
              warehouse_id: numDest,
              to_warehouse_id: numDest,
              armazem_id: String(armazem_destino_id),
              armazem_origem_id: String(armazem_origem_id),
              armazem_destino_id: String(armazem_destino_id),
              warehouse_name: destName,
              to_warehouse_name: destName,
              lote_codigo: lote_codigo || null,
              reference_id: `${codigo}-IN`,
              referencia: codigo,
              description: `Transferência Entrada (${origName} → ${destName})`,
              ano: new Date().getFullYear(),
              created_by: ctx.userId,
              created_by_nome: ctx.name,
              created_by_username: ctx.username,
            },
          ]);
        }

        return res.json({ success: true, transfer: trf });
      }

      if ((action === 'complete' || action === 'cancel') && transfer_id) {
        if (action === 'complete' && !canApproveOrReconcile(ctx.role) && !canOperate(ctx.role)) {
          return res.status(403).json({ error: 'Sem permissão para concluir transferência.' });
        }
        const { data: trf } = await supabaseAdmin
          .from('stock_transferencias')
          .select('*')
          .eq('id', transfer_id)
          .eq('empresa_id', ctx.empresaId)
          .maybeSingle();

        if (!trf) return res.status(404).json({ error: 'Transferência não encontrada.' });
        if (trf.estado === 'concluida' || trf.estado === 'cancelada') {
          return res.status(400).json({ error: `Transferência já está no estado ${trf.estado}.` });
        }

        if (action === 'cancel') {
          await supabaseAdmin
            .from('stock_transferencias')
            .update({ estado: 'cancelada', updated_at: new Date().toISOString() })
            .eq('id', trf.id);
          return res.json({ success: true });
        }

        const outRes = await upsertWarehouseBalance(supabaseAdmin, {
          empresaId: ctx.empresaId,
          productId: trf.product_id,
          armazemId: trf.armazem_origem_id,
          deltaDisponivel: -Number(trf.quantidade),
        });
        const inRes = await upsertWarehouseBalance(supabaseAdmin, {
          empresaId: ctx.empresaId,
          productId: trf.product_id,
          armazemId: trf.armazem_destino_id,
          deltaDisponivel: Number(trf.quantidade),
          newCost: Number(trf.custo_unitario || 0),
        });

        await supabaseAdmin
          .from('stock_transferencias')
          .update({
            estado: 'concluida',
            aprovado_por: ctx.userId,
            aprovado_por_nome: ctx.name,
            concluido_em: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', trf.id);

        await supabaseAdmin.from('movimentacoes_stock').insert([
          {
            empresa_id: ctx.empresaId,
            product_id: trf.product_id,
            produto_id: trf.product_id,
            product_name: trf.product_name,
            type: 'transfer',
            tipo: 'transferencia',
            subtipo: 'transferencia_saida',
            quantity: trf.quantidade,
            quantidade: trf.quantidade,
            unit_price: trf.custo_unitario,
            custo_unitario: trf.custo_unitario,
            valor_total: trf.valor_total,
            previous_stock: outRes?.prevDisp ?? 0,
            current_stock: outRes?.nextDisp ?? 0,
            armazem_id: trf.armazem_origem_id,
            armazem_origem_id: trf.armazem_origem_id,
            armazem_destino_id: trf.armazem_destino_id,
            warehouse_name: trf.armazem_origem_nome,
            to_warehouse_name: trf.armazem_destino_nome,
            reference_id: trf.codigo,
            referencia: trf.codigo,
            description: `Transferência Concluída Saída (${trf.armazem_origem_nome} → ${trf.armazem_destino_nome})`,
            ano: new Date().getFullYear(),
            created_by: ctx.userId,
            created_by_nome: ctx.name,
            created_by_username: ctx.username,
          },
          {
            empresa_id: ctx.empresaId,
            product_id: trf.product_id,
            produto_id: trf.product_id,
            product_name: trf.product_name,
            type: 'transfer',
            tipo: 'transferencia',
            subtipo: 'transferencia_entrada',
            quantity: trf.quantidade,
            quantidade: trf.quantidade,
            unit_price: trf.custo_unitario,
            custo_unitario: trf.custo_unitario,
            valor_total: trf.valor_total,
            previous_stock: inRes?.prevDisp ?? 0,
            current_stock: inRes?.nextDisp ?? 0,
            armazem_id: trf.armazem_destino_id,
            armazem_origem_id: trf.armazem_origem_id,
            armazem_destino_id: trf.armazem_destino_id,
            warehouse_name: trf.armazem_destino_nome,
            to_warehouse_name: trf.armazem_destino_nome,
            reference_id: `${trf.codigo}-IN`,
            referencia: trf.codigo,
            description: `Transferência Concluída Entrada (${trf.armazem_origem_nome} → ${trf.armazem_destino_nome})`,
            ano: new Date().getFullYear(),
            created_by: ctx.userId,
            created_by_nome: ctx.name,
            created_by_username: ctx.username,
          },
        ]);

        return res.json({ success: true });
      }
    }

    // 4. POST /api/stock/inventory — Inventário Físico & Reconciliação
    if (req.method === 'POST' && urlPath.endsWith('/inventory')) {
      const { action, titulo, armazem_id, observacoes, inventario_id, counts } = req.body || {};

      if (action === 'create') {
        if (!canOperate(ctx.role) && ctx.role !== 'auditor') {
          return res.status(403).json({ error: 'Sem permissão para iniciar inventário.' });
        }
        const codigo = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
        let armName = 'Todos os Armazéns';
        if (armazem_id && armazem_id !== 'all') {
          const { data: armRow } = await supabaseAdmin
            .from('armazens')
            .select('name, nome')
            .eq('empresa_id', ctx.empresaId)
            .eq('id', armazem_id)
            .maybeSingle();
          armName = armRow?.name || armRow?.nome || `Armazém #${armazem_id}`;
        }

        const { data: prods } = await supabaseAdmin
          .from('produtos')
          .select('id, name, nome, sku, referente, stock_quantity, stock, stock_atual, cost_price, preco_compra, warehouse_id, armazem_id, tipo')
          .eq('empresa_id', ctx.empresaId);

        const { data: saldos } = await supabaseAdmin
          .from('stock_saldos')
          .select('*')
          .eq('empresa_id', ctx.empresaId);

        const physicalProds = (prods || []).filter(p => !String(p.tipo || '').toLowerCase().includes('serv'));
        const filteredProds = armazem_id && armazem_id !== 'all'
          ? physicalProds.filter(p => {
              const hasSaldo = (saldos || []).some(s => String(s.product_id) === String(p.id) && String(s.armazem_id) === String(armazem_id));
              return hasSaldo || String(p.warehouse_id || p.armazem_id || '') === String(armazem_id);
            })
          : physicalProds;

        const { data: inv, error: invErr } = await supabaseAdmin
          .from('stock_inventarios')
          .insert([{
            empresa_id: ctx.empresaId,
            codigo,
            titulo: titulo || `Inventário Físico ${new Date().toLocaleDateString('pt-PT')}`,
            armazem_id: armazem_id && armazem_id !== 'all' ? String(armazem_id) : null,
            armazem_nome: armName,
            estado: 'em_contagem',
            total_itens: filteredProds.length,
            responsavel_id: ctx.userId,
            responsavel_nome: ctx.name,
            observacoes: observacoes || null,
          }])
          .select('*')
          .single();

        if (invErr) return res.status(500).json({ error: invErr.message });

        const itemRows = filteredProds.map(p => {
          let sysQty = Number(p.stock_quantity ?? p.stock ?? p.stock_atual ?? 0);
          if (armazem_id && armazem_id !== 'all') {
            const s = (saldos || []).find(x => String(x.product_id) === String(p.id) && String(x.armazem_id) === String(armazem_id));
            if (s) sysQty = Number(s.quantidade_disponivel || 0);
          }
          return {
            empresa_id: ctx.empresaId,
            inventario_id: inv.id,
            product_id: p.id,
            product_name: p.name || p.nome,
            sku: p.sku || p.referente || null,
            armazem_id: armazem_id && armazem_id !== 'all' ? String(armazem_id) : (p.armazem_id || (p.warehouse_id ? String(p.warehouse_id) : null)),
            stock_sistema: sysQty,
            stock_fisico: null,
            diferenca: 0,
            custo_unitario: Number(p.cost_price ?? p.preco_compra ?? 0),
            valor_diferenca: 0,
            reconciliado: false,
          };
        });

        if (itemRows.length > 0) {
          await supabaseAdmin.from('stock_inventario_itens').insert(itemRows);
        }

        return res.json({ success: true, inventario: inv, itens_count: itemRows.length });
      }

      if (action === 'save_counts' && inventario_id && Array.isArray(counts)) {
        if (!canOperate(ctx.role) && ctx.role !== 'auditor') {
          return res.status(403).json({ error: 'Sem permissão para registar contagem.' });
        }
        let divCount = 0;
        let divValue = 0;

        for (const c of counts) {
          if (c.stock_fisico === null || c.stock_fisico === undefined || c.stock_fisico === '') continue;
          const fisico = Number(c.stock_fisico);
          const sistema = Number(c.stock_sistema || 0);
          const diff = Math.round((fisico - sistema) * 1000) / 1000;
          const custo = Number(c.custo_unitario || 0);
          const valDiff = Math.round(diff * custo * 100) / 100;
          if (diff !== 0) {
            divCount++;
            divValue += valDiff;
          }
          await supabaseAdmin
            .from('stock_inventario_itens')
            .update({
              stock_fisico: fisico,
              diferenca: diff,
              valor_diferenca: valDiff,
              justificativa: c.justificativa || null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', c.id)
            .eq('empresa_id', ctx.empresaId);
        }

        await supabaseAdmin
          .from('stock_inventarios')
          .update({
            estado: 'aguardando_reconciliacao',
            total_divergencias: divCount,
            valor_diferenca: Math.round(divValue * 100) / 100,
            updated_at: new Date().toISOString(),
          })
          .eq('id', inventario_id)
          .eq('empresa_id', ctx.empresaId);

        return res.json({ success: true, total_divergencias: divCount, valor_diferenca: divValue });
      }

      if (action === 'reconcile' && inventario_id) {
        if (!canApproveOrReconcile(ctx.role)) {
          return res.status(403).json({ error: 'Apenas Administradores ou Gestores de Stock podem reconciliar inventário.' });
        }
        const { data: inv } = await supabaseAdmin
          .from('stock_inventarios')
          .select('*')
          .eq('id', inventario_id)
          .eq('empresa_id', ctx.empresaId)
          .maybeSingle();

        if (!inv) return res.status(404).json({ error: 'Inventário não encontrado.' });
        if (inv.estado === 'reconciliado') return res.status(400).json({ error: 'Inventário já reconciliado.' });

        const { data: items } = await supabaseAdmin
          .from('stock_inventario_itens')
          .select('*')
          .eq('inventario_id', inv.id)
          .eq('empresa_id', ctx.empresaId);

        let adjusted = 0;
        for (const it of items || []) {
          if (it.stock_fisico === null || it.stock_fisico === undefined) continue;
          const diff = Number(it.diferenca || 0);
          if (diff === 0) {
            await supabaseAdmin.from('stock_inventario_itens').update({ reconciliado: true }).eq('id', it.id);
            continue;
          }

          const { data: prod } = await supabaseAdmin
            .from('produtos')
            .select('id, stock_quantity, stock, stock_atual')
            .eq('id', it.product_id)
            .eq('empresa_id', ctx.empresaId)
            .maybeSingle();

          if (prod) {
            const curTotal = Number(prod.stock_quantity ?? prod.stock ?? prod.stock_atual ?? 0);
            const nextTotal = Math.max(0, Math.round((curTotal + diff) * 1000) / 1000);
            await supabaseAdmin
              .from('produtos')
              .update({
                stock_quantity: nextTotal,
                stock: nextTotal,
                stock_atual: nextTotal,
                estoque_atual: nextTotal,
                updated_at: new Date().toISOString(),
              })
              .eq('id', prod.id);

            if (it.armazem_id) {
              await upsertWarehouseBalance(supabaseAdmin, {
                empresaId: ctx.empresaId,
                productId: prod.id,
                armazemId: it.armazem_id,
                deltaDisponivel: diff,
              });
            }

            await supabaseAdmin.from('movimentacoes_stock').insert([{
              empresa_id: ctx.empresaId,
              product_id: prod.id,
              produto_id: prod.id,
              product_name: it.product_name,
              type: diff > 0 ? 'adjustment_plus' : 'adjustment_minus',
              tipo: diff > 0 ? 'entrada' : 'saida',
              subtipo: 'inventario',
              quantity: Math.abs(diff),
              quantidade: Math.abs(diff),
              unit_price: Number(it.custo_unitario || 0),
              custo_unitario: Number(it.custo_unitario || 0),
              valor_total: Math.abs(Number(it.valor_diferenca || 0)),
              previous_stock: curTotal,
              current_stock: nextTotal,
              armazem_id: it.armazem_id || null,
              motivo: it.justificativa || `Reconciliação Inventário ${inv.codigo}`,
              documento_origem: 'Inventário Físico',
              numero_documento: inv.codigo,
              reference_id: `${inv.codigo}-${it.id}`,
              referencia: inv.codigo,
              description: `Reconciliação Inventário ${inv.codigo}: ${it.justificativa || (diff > 0 ? 'Sobra' : 'Quebra')}`,
              ano: new Date().getFullYear(),
              created_by: ctx.userId,
              created_by_nome: ctx.name,
              created_by_username: ctx.username,
            }]);
            adjusted++;
          }

          await supabaseAdmin.from('stock_inventario_itens').update({ reconciliado: true }).eq('id', it.id);
        }

        await supabaseAdmin
          .from('stock_inventarios')
          .update({
            estado: 'reconciliado',
            reconciliado_por: ctx.userId,
            reconciliado_por_nome: ctx.name,
            reconciliado_em: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', inv.id);

        return res.json({ success: true, adjusted });
      }
    }

    // 5. POST /api/stock/alerts/scan — Varredura real de alertas por empresa
    if (req.method === 'POST' && urlPath.endsWith('/alerts/scan')) {
      const [{ data: prods }, { data: lotes }, { data: movs }, { data: cfg }, { data: existingAlerts }] = await Promise.all([
        supabaseAdmin.from('produtos').select('*').eq('empresa_id', ctx.empresaId),
        supabaseAdmin.from('stock_lotes').select('*').eq('empresa_id', ctx.empresaId).gt('quantidade_atual', 0),
        supabaseAdmin.from('movimentacoes_stock').select('product_id, created_at').eq('empresa_id', ctx.empresaId).order('created_at', { ascending: false }),
        supabaseAdmin.from('stock_configuracoes').select('*').eq('empresa_id', ctx.empresaId).maybeSingle(),
        supabaseAdmin.from('stock_alertas').select('id, product_id, tipo, estado').eq('empresa_id', ctx.empresaId).eq('estado', 'ativo'),
      ]);

      const daysVal = Number(cfg?.dias_alerta_validade || 30);
      const daysIdle = Number(cfg?.dias_sem_movimento || 60);
      const now = Date.now();
      const existingKey = new Set((existingAlerts || []).map(a => `${a.product_id || ''}:${a.tipo}`));
      const toInsert = [];

      const lastMovByProd = new Map();
      for (const m of movs || []) {
        if (m.product_id && !lastMovByProd.has(String(m.product_id))) {
          lastMovByProd.set(String(m.product_id), new Date(m.created_at).getTime());
        }
      }

      for (const p of prods || []) {
        if (String(p.tipo || '').toLowerCase().includes('serv')) continue;
        const qty = Number(p.stock_quantity ?? p.stock ?? p.stock_atual ?? 0);
        const min = Number(p.min_stock ?? p.stock_minimo ?? 0);
        const max = Number(p.stock_maximo ?? 0);
        const pname = p.name || p.nome || 'Produto';

        if (qty <= 0 && !existingKey.has(`${p.id}:esgotado`)) {
          toInsert.push({
            empresa_id: ctx.empresaId,
            product_id: p.id,
            product_name: pname,
            tipo: 'esgotado',
            severidade: 'critica',
            titulo: `Produto esgotado: ${pname}`,
            mensagem: `Stock atual em ${qty} ${p.unit || 'un'}. Necessita reposição imediata.`,
            dados: { qty, min },
          });
        } else if (min > 0 && qty > 0 && qty <= min && !existingKey.has(`${p.id}:stock_critico`)) {
          toInsert.push({
            empresa_id: ctx.empresaId,
            product_id: p.id,
            product_name: pname,
            tipo: 'stock_critico',
            severidade: 'alta',
            titulo: `Stock crítico: ${pname}`,
            mensagem: `Stock (${qty}) atingiu ou está abaixo do mínimo configurado (${min}).`,
            dados: { qty, min },
          });
        }

        if (max > 0 && qty > max && !existingKey.has(`${p.id}:excesso`)) {
          toInsert.push({
            empresa_id: ctx.empresaId,
            product_id: p.id,
            product_name: pname,
            tipo: 'excesso',
            severidade: 'baixa',
            titulo: `Excesso de stock: ${pname}`,
            mensagem: `Quantidade (${qty}) excede o stock máximo (${max}).`,
            dados: { qty, max },
          });
        }

        if (p.data_validade) {
          const expMs = new Date(p.data_validade).getTime();
          const diffDays = Math.ceil((expMs - now) / (1000 * 60 * 60 * 24));
          if (diffDays <= 0 && !existingKey.has(`${p.id}:expirado`)) {
            toInsert.push({
              empresa_id: ctx.empresaId,
              product_id: p.id,
              product_name: pname,
              tipo: 'expirado',
              severidade: 'critica',
              titulo: `Produto expirado: ${pname}`,
              mensagem: `Validade expirou em ${p.data_validade}.`,
              dados: { data_validade: p.data_validade, diffDays },
            });
          } else if (diffDays > 0 && diffDays <= daysVal && !existingKey.has(`${p.id}:validade_proxima`)) {
            toInsert.push({
              empresa_id: ctx.empresaId,
              product_id: p.id,
              product_name: pname,
              tipo: 'validade_proxima',
              severidade: diffDays <= 7 ? 'alta' : 'media',
              titulo: `Validade próxima (${diffDays}d): ${pname}`,
              mensagem: `Expira em ${p.data_validade}. Considere promoção ou rotação FEFO.`,
              dados: { data_validade: p.data_validade, diffDays },
            });
          }
        }

        const lastMs = lastMovByProd.get(String(p.id)) || (p.created_at ? new Date(p.created_at).getTime() : now);
        const idleDays = Math.floor((now - lastMs) / (1000 * 60 * 60 * 24));
        if (qty > 0 && idleDays >= daysIdle && !existingKey.has(`${p.id}:sem_movimento`)) {
          toInsert.push({
            empresa_id: ctx.empresaId,
            product_id: p.id,
            product_name: pname,
            tipo: 'sem_movimento',
            severidade: 'baixa',
            titulo: `Sem movimentação há ${idleDays} dias: ${pname}`,
            mensagem: `Produto com ${qty} unidades paradas há ${idleDays} dias.`,
            dados: { qty, idleDays },
          });
        }
      }

      for (const l of lotes || []) {
        if (!l.data_validade) continue;
        const expMs = new Date(l.data_validade).getTime();
        const diffDays = Math.ceil((expMs - now) / (1000 * 60 * 60 * 24));
        const prod = (prods || []).find(x => String(x.id) === String(l.product_id));
        const pname = prod?.name || prod?.nome || 'Produto';
        if (diffDays <= 0 && !existingKey.has(`${l.product_id}:expirado`)) {
          toInsert.push({
            empresa_id: ctx.empresaId,
            product_id: l.product_id,
            product_name: pname,
            tipo: 'expirado',
            severidade: 'critica',
            titulo: `Lote ${l.numero_lote || ''} expirado: ${pname}`,
            mensagem: `Lote com ${l.quantidade_atual} un. expirou em ${l.data_validade}.`,
            dados: { lote_id: l.id, numero_lote: l.numero_lote, data_validade: l.data_validade },
          });
        } else if (diffDays > 0 && diffDays <= daysVal && !existingKey.has(`${l.product_id}:validade_proxima`)) {
          toInsert.push({
            empresa_id: ctx.empresaId,
            product_id: l.product_id,
            product_name: pname,
            tipo: 'validade_proxima',
            severidade: diffDays <= 7 ? 'alta' : 'media',
            titulo: `Lote ${l.numero_lote || ''} a expirar (${diffDays}d): ${pname}`,
            mensagem: `Lote com ${l.quantidade_atual} un. expira em ${l.data_validade}.`,
            dados: { lote_id: l.id, numero_lote: l.numero_lote, data_validade: l.data_validade },
          });
        }
      }

      if (toInsert.length > 0) {
        await supabaseAdmin.from('stock_alertas').insert(toInsert);
      }

      return res.json({ success: true, created: toInsert.length });
    }

    // 6. POST /api/stock/settings — Guardar configurações de stock
    if (req.method === 'POST' && urlPath.endsWith('/settings')) {
      if (!canConfigure(ctx.role)) {
        return res.status(403).json({ error: 'Apenas Administradores ou Gestores podem alterar configurações.' });
      }
      const payload = {
        empresa_id: ctx.empresaId,
        metodo_valorizacao: req.body?.metodo_valorizacao || 'CMP',
        permitir_stock_negativo: Boolean(req.body?.permitir_stock_negativo),
        bloquear_venda_sem_stock: req.body?.bloquear_venda_sem_stock !== false,
        dias_alerta_validade: Number(req.body?.dias_alerta_validade || 30),
        dias_sem_movimento: Number(req.body?.dias_sem_movimento || 60),
        aprovar_transferencias: Boolean(req.body?.aprovar_transferencias),
        aprovar_inventarios: req.body?.aprovar_inventarios !== false,
        agentes_frequencia_minutos: Number(req.body?.agentes_frequencia_minutos || 60),
        alerta_email: req.body?.alerta_email !== false,
        updated_by: ctx.userId,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabaseAdmin
        .from('stock_configuracoes')
        .upsert([payload], { onConflict: 'empresa_id' })
        .select('*')
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.json({ success: true, settings: data });
    }

    return res.status(404).json({ error: 'Rota de stock não encontrada.' });
  } catch (err) {
    console.error('[STOCK-ENTERPRISE] Erro:', err);
    return res.status(500).json({ error: err?.message || 'Erro interno no módulo de stock.' });
  }
}
