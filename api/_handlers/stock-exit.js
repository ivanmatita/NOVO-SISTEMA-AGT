/**
 * api/_handlers/stock-exit.js
 * Handler para saída automática de stock após emissão de venda
 * Rota: POST /api/stock/exit-sale
 * Idempotente: Um documento de venda só gera UMA saída de stock
 */

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ''
);

export default async function stockExitHandler(req, res) {
  if (req.method === 'POST' && req.url?.includes('/exit-sale')) {
    return handleExitSale(req, res);
  }
  if (req.method === 'GET' && req.url?.includes('/check-stock')) {
    return handleCheckStock(req, res);
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

// Verificar stock disponível antes da venda
async function handleCheckStock(req, res) {
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
async function handleExitSale(req, res) {
  // Verificar autenticação JWT
  const authHeader = req.headers?.authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return res.status(401).json({ error: 'Token obrigatório.' });

  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Token inválido.' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const {
    empresa_id, documentId, numeroDocumento, tipoDocumento,
    clienteNome, dataDocumento, ano, itens = []
  } = body || {};

  if (!empresa_id) return res.status(400).json({ error: 'empresa_id obrigatório.' });
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
    const referenceKey = `venda_${documentId || numeroDocumento}_${descricao.replace(/\s+/g, '_').slice(0, 30)}`;

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

      if (!prodId) {
        const cleanDesc = descricao.replace(/[,%]/g, ' ').trim();
        const { data: prods } = await supabaseAdmin
          .from('produtos')
          .select('id, name, nome, stock_quantity, stock, stock_atual')
          .eq('empresa_id', empresa_id)
          .or(`name.ilike.%${cleanDesc}%,nome.ilike.%${cleanDesc}%`)
          .limit(1);
        if (prods?.length > 0) {
          prodId = prods[0].id;
          prevStock = Number(prods[0].stock_quantity ?? prods[0].stock ?? prods[0].stock_atual ?? 0);
        }
      } else {
        const { data: prodData } = await supabaseAdmin
          .from('produtos')
          .select('id, stock_quantity, stock, stock_atual')
          .eq('id', prodId)
          .eq('empresa_id', empresa_id)
          .single();
        if (prodData) prevStock = Number(prodData.stock_quantity ?? prodData.stock ?? prodData.stock_atual ?? 0);
      }

      // 3. Verificar stock suficiente
      if (prevStock < quantidade) {
        insuficientes.push({ descricao, disponivel: prevStock, solicitado: quantidade });
        errors.push({ descricao, error: `Stock insuficiente. Disponível: ${prevStock}, Solicitado: ${quantidade}` });
        continue;
      }

      const newStock = prevStock - quantidade;

      // 4. Atualizar stock do produto
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
