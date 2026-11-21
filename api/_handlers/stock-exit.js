/**
 * api/_handlers/stock-exit.js
 * Handler para saída automática de stock após emissão de venda
 * Rota: POST /api/stock/exit-sale
 * Idempotente: Um documento de venda só gera UMA saída de stock
 */

import { createClient } from '@supabase/supabase-js';
import { getEnvConfig } from '../_env.js';

function getAdminForRequest(req) {
  const cfg = getEnvConfig(req);
  return createClient(cfg.supabaseUrl, cfg.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

export default async function stockExitHandler(req, res) {
  const supabaseAdmin = getAdminForRequest(req);
  if (req.method === 'POST' && req.url?.includes('/exit-sale')) {
    return handleExitSale(req, res, supabaseAdmin);
  }
  if (req.method === 'GET' && req.url?.includes('/check-stock')) {
    return handleCheckStock(req, res, supabaseAdmin);
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

// Verificar stock disponível antes da venda
async function handleCheckStock(req, res, supabaseAdmin) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const empresa_id = url.searchParams.get('empresa_id');
  const product_id = url.searchParams.get('product_id');
  const armazem_id = url.searchParams.get('armazem_id');
  const quantidade = Number(url.searchParams.get('quantidade') || 1);

  if (!empresa_id || !product_id) {
    return res.status(400).json({ error: 'empresa_id e product_id obrigatórios.' });
  }

  const { data: prod } = await supabaseAdmin
    .from('produtos')
    .select('id, name, nome, stock_quantity, stock, stock_atual')
    .eq('id', product_id)
    .eq('empresa_id', empresa_id)
    .single();

  if (!prod) return res.status(404).json({ error: 'Produto não encontrado.' });

  const disponivel = Number(prod.stock_quantity ?? prod.stock ?? prod.stock_atual ?? 0);
  const suficiente = disponivel >= quantidade;

  return res.status(200).json({
    product_id,
    name: prod.name || prod.nome,
    disponivel,
    solicitado: quantidade,
    suficiente,
    message: suficiente
      ? `Stock suficiente: ${disponivel} unidades disponíveis.`
      : `Stock insuficiente no armazém. Disponível: ${disponivel} unidades.`
  });
}

// Registar saída automática após venda
async function handleExitSale(req, res, supabaseAdmin) {
  // Verificar autenticação JWT
  const authHeader = req.headers?.authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Token obrigatório.' });

  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Token inválido.' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const {
    empresa_id: requestedEmpresaId, documentId, numeroDocumento, tipoDocumento,
    clienteNome, dataDocumento, ano, itens = []
  } = body || {};

  // Verificar isolamento multi-tenant
  const { data: perfil } = await supabaseAdmin
    .from('perfis')
    .select('empresa_id, company_id, role, is_super_admin')
    .or(`id.eq.${user.id},user_id.eq.${user.id},email.eq.${user.email}`)
    .maybeSingle();
  const { data: owned } = await supabaseAdmin
    .from('empresas')
    .select('id')
    .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
    .maybeSingle();

  const resolvedTenant = perfil?.empresa_id || perfil?.company_id || owned?.id || null;
  const isSuper = Boolean(perfil?.is_super_admin || String(perfil?.role || '').toLowerCase() === 'superadmin');
  const empresa_id = isSuper && requestedEmpresaId ? requestedEmpresaId : resolvedTenant;

  if (!empresa_id) return res.status(403).json({ error: 'Empresa não associada à sessão.' });
  if (!isSuper && requestedEmpresaId && String(requestedEmpresaId) !== String(empresa_id)) {
    return res.status(403).json({ error: 'Acesso negado: violação multi-empresa.' });
  }
  if (!itens.length) return res.status(400).json({ error: 'Nenhum item.' });

  const results = [];
  const errors = [];
  const insuficientes = [];

  for (const item of itens) {
    const descricao = (item.descricao || item.description || item.name || '').trim();
    if (!descricao) continue;

    // Excluir serviços
    const tipologia = (item.tipologia || item.tipo || item.tipo_produto || '').toLowerCase();
    if (tipologia.includes('serviç') || tipologia.includes('servic') || item.is_service) continue;

    const quantidade = Number(item.quantidade || item.quantity || 0);
    if (quantidade <= 0) continue;

    const valorUnitario = Number(item.valor_unitario || item.unit_price || 0);
    const armazemId = item.armazem_id || item.warehouse_id;
    const itemProdKey = item.product_id || item.produto_id || '';
    const referenceKey = `venda_${documentId || numeroDocumento}_${itemProdKey ? `${String(itemProdKey).slice(0, 12)}_` : ''}${descricao.replace(/\s+/g, '_').slice(0, 28)}`;

    try {
      // 1. IDEMPOTÊNCIA — Verificar se já existe saída para este documento+item
      const { data: existing } = await supabaseAdmin
        .from('movimentacoes_stock')
        .select('id')
        .eq('empresa_id', empresa_id)
        .eq('reference_id', referenceKey)
        .limit(1);
      
      if (existing?.length > 0) {
        results.push({ descricao, status: 'already_exists', skipped: true });
        continue;
      }

      // 2. Encontrar produto
      let prodId = item.product_id || item.produto_id || null;
      let prevStock = 0;
      let prodCost = valorUnitario;

      if (!prodId) {
        const cleanDesc = descricao.replace(/[,%]/g, ' ').trim();
        const { data: prods } = await supabaseAdmin
          .from('produtos')
          .select('id, name, nome, stock_quantity, stock, stock_atual, cost_price, preco_compra')
          .eq('empresa_id', empresa_id)
          .or(`name.ilike.%${cleanDesc}%,nome.ilike.%${cleanDesc}%`)
          .limit(1);
        if (prods?.length > 0) {
          prodId = prods[0].id;
          prevStock = Number(prods[0].stock_quantity ?? prods[0].stock ?? prods[0].stock_atual ?? 0);
          prodCost = Number(prods[0].cost_price ?? prods[0].preco_compra ?? valorUnitario);
        }
      } else {
        const { data: prodData } = await supabaseAdmin
          .from('produtos')
          .select('id, stock_quantity, stock, stock_atual, cost_price, preco_compra')
          .eq('id', prodId)
          .eq('empresa_id', empresa_id)
          .single();
        if (prodData) {
          prevStock = Number(prodData.stock_quantity ?? prodData.stock ?? prodData.stock_atual ?? 0);
          prodCost = Number(prodData.cost_price ?? prodData.preco_compra ?? valorUnitario);
        }
      }

      // 3. Verificar stock suficiente
      if (prevStock < quantidade) {
        insuficientes.push({ descricao, disponivel: prevStock, solicitado: quantidade });
        errors.push({ descricao, error: `Stock insuficiente. Disponível: ${prevStock}, Solicitado: ${quantidade}` });
        continue;
      }

      const newStock = prevStock - quantidade;

      // 4. Atualizar stock do produto e stock_saldos
      if (prodId) {
        await supabaseAdmin
          .from('produtos')
          .update({
            stock_quantity: newStock,
            stock: newStock,
            stock_atual: newStock,
            estoque_atual: newStock,
            updated_at: new Date().toISOString(),
          })
          .eq('id', prodId)
          .eq('empresa_id', empresa_id);

        if (armazemId) {
          const { data: saldoRow } = await supabaseAdmin
            .from('stock_saldos')
            .select('id, quantidade_disponivel')
            .eq('empresa_id', empresa_id)
            .eq('product_id', prodId)
            .eq('armazem_id', String(armazemId))
            .maybeSingle();
          if (saldoRow) {
            await supabaseAdmin
              .from('stock_saldos')
              .update({
                quantidade_disponivel: Math.max(0, Number(saldoRow.quantidade_disponivel || 0) - quantidade),
                updated_at: new Date().toISOString(),
              })
              .eq('id', saldoRow.id);
          }
        }
      }

      // 5. Registar movimento de SAÍDA
      const movPayload = {
        empresa_id,
        product_id: prodId,
        produto_id: prodId,
        type: 'exit',
        tipo: 'saida',
        quantity: quantidade,
        quantidade: quantidade,
        unit_price: valorUnitario,
        preco_unitario: valorUnitario,
        previous_stock: prevStock,
        current_stock: newStock,
        armazem_id: armazemId || null,
        reference_id: referenceKey,
        referencia: referenceKey,
        description: `Saída via Venda: ${numeroDocumento} - ${clienteNome || ''}`,
        descricao_movimento: `Saída via Venda: ${numeroDocumento} - ${clienteNome || ''}`,
        cliente_nome: clienteNome || '',
        documento_origem: tipoDocumento || 'Fatura',
        numero_documento: numeroDocumento || '',
        data_documento: dataDocumento || new Date().toISOString().slice(0, 10),
        ano: ano || new Date().getFullYear(),
        created_at: new Date().toISOString(),
      };

      Object.keys(movPayload).forEach(k => movPayload[k] === undefined && delete movPayload[k]);

      const { error: movErr } = await supabaseAdmin
        .from('movimentacoes_stock')
        .insert([movPayload]);

      if (movErr) {
        // Fallback
        await supabaseAdmin.from('stock_movements').insert([{
          empresa_id, product_id: prodId, type: 'exit', quantity: quantidade,
          unit_price: valorUnitario, previous_stock: prevStock, current_stock: newStock,
          reference_id: referenceKey, created_at: new Date().toISOString(),
        }]);
      }

      results.push({ descricao, prodId, quantidade, prevStock, newStock, status: 'ok' });
    } catch (err) {
      errors.push({ descricao, error: String(err?.message || err) });
    }
  }

  return res.status(200).json({
    success: insuficientes.length === 0,
    processed: results.length,
    errors: errors.length,
    insuficientes,
    results,
    errors_detail: errors,
  });
}
