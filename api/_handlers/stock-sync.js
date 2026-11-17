/**
 * api/_handlers/stock-sync.js
 * Handler para sincronização automática Stock ← Compras
 * Rota: POST /api/stock/sync-purchase
 * Idempotente: Uma compra só gera UMA entrada de stock (reference_id único)
 */

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ''
);

export default async function stockSyncHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verificar autenticação JWT
  const authHeader = req.headers?.authorization || '';
  const token = authHeader.replace('Bearer ', '').trim();
  
  if (!token) {
    return res.status(401).json({ error: 'Token de autenticação obrigatório.' });
  }

  // Validar token e obter user
  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const {
    empresa_id,
    purchaseId,
    numeroDocumento,
    tipoDocumento,
    fornecedorNome,
    dataDocumento,
    ano,
    itens = []
  } = body || {};

  if (!empresa_id) {
    return res.status(400).json({ error: 'empresa_id obrigatório.' });
  }
  if (!itens || itens.length === 0) {
    return res.status(400).json({ error: 'Nenhum item fornecido.' });
  }

  const results = [];
  const errors = [];

  for (const item of itens) {
    // Só processar itens com armazém selecionado
    if (!item.armazem_id && !item.warehouse_id) continue;
    
    const descricao = (item.descricao || item.name || '').trim();
    if (!descricao) continue;
    
    // Tipologia: só processar produtos (não serviços)
    const tipologia = (item.tipologia_custo || item.tipologia || '').toLowerCase();
    if (tipologia.includes('serviço') || tipologia.includes('servico')) continue;
    
    const quantidade = Number(item.quantidade || item.quantity || 0);
    if (quantidade <= 0) continue;
    
    const valorUnitario = Number(item.valor_unitario || item.unit_price || 0);
    const armazemId = item.armazem_id || item.warehouse_id;
    const referenceKey = `compra_${purchaseId || numeroDocumento}_${descricao.replace(/\s+/g, '_').slice(0, 30)}`;

    try {
      // 1. IDEMPOTÊNCIA: Verificar se já existe movimento para esta compra+item
      const { data: existingMovs } = await supabaseAdmin
        .from('movimentacoes_stock')
        .select('id')
        .eq('empresa_id', empresa_id)
        .eq('reference_id', referenceKey)
        .limit(1);
      
      if (existingMovs && existingMovs.length > 0) {
        results.push({ descricao, status: 'already_exists', skipped: true });
        continue;
      }

      // Verificar também em stock_movements (tabela alternativa)
      const { data: existingMovs2 } = await supabaseAdmin
        .from('stock_movements')
        .select('id')
        .eq('empresa_id', empresa_id)
        .eq('reference_id', referenceKey)
        .limit(1);
      
      if (existingMovs2 && existingMovs2.length > 0) {
        results.push({ descricao, status: 'already_exists_sm', skipped: true });
        continue;
      }

      // 2. Encontrar produto por nome/descrição
      let prodId = item.produto_id || item.product_id || null;
      let prevStock = 0;
      let newStock = 0;

      if (!prodId) {
        const cleanDesc = descricao.replace(/[,%]/g, ' ').trim();
        const { data: prods } = await supabaseAdmin
          .from('produtos')
          .select('id, name, nome, stock_quantity, stock, stock_atual, armazem_id, warehouse_id')
          .eq('empresa_id', empresa_id)
          .or(`name.ilike.%${cleanDesc}%,nome.ilike.%${cleanDesc}%`)
          .limit(1);
        
        if (prods && prods.length > 0) {
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
        if (prodData) {
          prevStock = Number(prodData.stock_quantity ?? prodData.stock ?? prodData.stock_atual ?? 0);
        }
      }

      newStock = prevStock + quantidade;

      // 3. Se produto encontrado, atualizar stock
      if (prodId) {
        await supabaseAdmin
          .from('produtos')
          .update({
            stock_quantity: newStock,
            stock: newStock,
            stock_atual: newStock,
            estoque_atual: newStock,
            cost_price: valorUnitario,
            preco_compra: valorUnitario,
            preco_custo: valorUnitario,
            armazem_id: armazemId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', prodId)
          .eq('empresa_id', empresa_id);
      } else {
        // Criar produto novo se não existir
        const { data: newProd } = await supabaseAdmin
          .from('produtos')
          .insert([{
            empresa_id,
            name: descricao,
            nome: descricao,
            stock_quantity: quantidade,
            stock: quantidade,
            stock_atual: quantidade,
            estoque_atual: quantidade,
            cost_price: valorUnitario,
            preco_compra: valorUnitario,
            preco_custo: valorUnitario,
            price: Math.round(valorUnitario * 1.3 * 100) / 100,
            preco_venda: Math.round(valorUnitario * 1.3 * 100) / 100,
            unit: item.unidade || 'UN',
            unidade: item.unidade || 'UN',
            armazem_id: armazemId,
            tipo: 'Produto',
            is_active: true,
            created_at: new Date().toISOString(),
          }])
          .select('id')
          .single();
        if (newProd) {
          prodId = newProd.id;
          prevStock = 0;
          newStock = quantidade;
        }
      }

      // 4. Registar movimento de entrada em movimentacoes_stock
      const movPayload = {
        empresa_id,
        product_id: prodId,
        produto_id: prodId,
        type: 'entry',
        tipo: 'entrada',
        quantity: quantidade,
        quantidade: quantidade,
        unit_price: valorUnitario,
        preco_unitario: valorUnitario,
        previous_stock: prevStock,
        current_stock: newStock,
        armazem_id: armazemId,
        warehouse_id: !isNaN(Number(armazemId)) ? Number(armazemId) : undefined,
        reference_id: referenceKey,
        referencia: referenceKey,
        description: `Entrada via Compra: ${numeroDocumento} - ${fornecedorNome || ''}`,
        descricao_movimento: `Entrada via Compra: ${numeroDocumento} - ${fornecedorNome || ''}`,
        fornecedor_nome: fornecedorNome || '',
        documento_origem: tipoDocumento || 'Compra',
        numero_documento: numeroDocumento || '',
        data_documento: dataDocumento || new Date().toISOString().slice(0, 10),
        ano: ano || new Date().getFullYear(),
        created_at: new Date().toISOString(),
      };

      // Remover campos undefined
      Object.keys(movPayload).forEach(k => movPayload[k] === undefined && delete movPayload[k]);

      const { error: movErr1 } = await supabaseAdmin
        .from('movimentacoes_stock')
        .insert([movPayload]);
      
      if (movErr1) {
        // Tentar tabela alternativa stock_movements
        const altPayload = {
          empresa_id,
          product_id: prodId,
          type: 'entry',
          quantity: quantidade,
          unit_price: valorUnitario,
          previous_stock: prevStock,
          current_stock: newStock,
          warehouse_id: !isNaN(Number(armazemId)) ? Number(armazemId) : null,
          reference_id: referenceKey,
          description: `Entrada via Compra: ${numeroDocumento} - ${fornecedorNome || ''}`,
          created_at: new Date().toISOString(),
        };
        await supabaseAdmin.from('stock_movements').insert([altPayload]);
      }

      results.push({ descricao, prodId, quantidade, armazemId, prevStock, newStock, status: 'ok' });

    } catch (itemErr) {
      console.error('[stock-sync] Erro no item:', descricao, itemErr);
      errors.push({ descricao, error: String(itemErr?.message || itemErr) });
    }
  }

  return res.status(200).json({
    success: true,
    processed: results.length,
    errors: errors.length,
    results,
    errors_detail: errors,
  });
}
