/**
 * api/_handlers/stock-sync.js
 * Handler para sincronização automática Stock ← Compras
 * Rota: POST /api/stock/sync-purchase
 * Idempotente: Uma compra só gera UMA entrada de stock (reference_id único)
 */

import { createClient } from '@supabase/supabase-js';
import { getEnvConfig } from '../_env.js';

const PROD_URL = 'https://nawqfidnawokqaheqvar.supabase.co';
const PROD_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hd3FmaWRuYXdva3FhaGVxdmFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMTgxNDYsImV4cCI6MjA5Mzc5NDE0Nn0.qFkIexxKcQDWax3pfhcgPMR3ZFIsE-gYWTS62i5Edgs';
const PROD_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hd3FmaWRuYXdva3FhaGVxdmFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODIxODE0NiwiZXhwIjoyMDkzNzk0MTQ2fQ.ToB7OlAF5FDHEKZMAZLmbvLtHb250qiVFmOUQm1VaOo';
const STAGING_URL = 'https://sfnibpxfevhelaikqbiq.supabase.co';
const STAGING_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbmlicHhmZXZoZWxhaWtxYmlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNTAyODgsImV4cCI6MjEwMjYyNjI4OH0.AnxqAF-TBY556gp2oPV0I5hfTjozaCMIHaeH7OhifiM';
const STAGING_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbmlicHhmZXZoZWxhaWtxYmlxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzA1MDI4OCwiZXhwIjoyMTAyNjI2Mjg4fQ.4wVvNNMK8dUTUXsQ8LklD4OBHa-s02VPlY7H0gC0cbw';

export default async function stockSyncHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cfg = getEnvConfig(req);
  const authHeader = req.headers?.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  if (!token) {
    return res.status(401).json({ error: 'Token de autenticação obrigatório.' });
  }

  const primary = cfg.isStaging
    ? { url: STAGING_URL, anon: STAGING_ANON_KEY, sr: STAGING_SERVICE_ROLE_KEY }
    : { url: PROD_URL, anon: PROD_ANON_KEY, sr: PROD_SERVICE_ROLE_KEY };
  const fallback = cfg.isStaging
    ? { url: PROD_URL, anon: PROD_ANON_KEY, sr: PROD_SERVICE_ROLE_KEY }
    : { url: STAGING_URL, anon: STAGING_ANON_KEY, sr: STAGING_SERVICE_ROLE_KEY };

  let target = primary;
  let authRes = await fetch(`${primary.url}/auth/v1/user`, {
    headers: { apikey: primary.anon, Authorization: `Bearer ${token}` },
  });

  if (!authRes.ok) {
    const fbRes = await fetch(`${fallback.url}/auth/v1/user`, {
      headers: { apikey: fallback.anon, Authorization: `Bearer ${token}` },
    });
    if (fbRes.ok) {
      authRes = fbRes;
      target = fallback;
    }
  }

  if (!authRes.ok) {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
  const user = await authRes.json();
  if (!user?.id) {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }

  const supabaseAdmin = createClient(target.url, target.sr, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const {
    empresa_id: requestedEmpresaId,
    purchaseId,
    numeroDocumento,
    tipoDocumento,
    fornecedorNome,
    dataDocumento,
    ano,
    itens = []
  } = body || {};

  let perfil = null;
  const byId = await supabaseAdmin.from('perfis').select('*').eq('id', user.id).maybeSingle();
  perfil = byId.data || null;
  if (!perfil) {
    const byUid = await supabaseAdmin.from('perfis').select('*').eq('user_id', user.id).maybeSingle();
    perfil = byUid.data || null;
  }
  if (!perfil && user.email) {
    const byEmail = await supabaseAdmin.from('perfis').select('*').eq('email', user.email).maybeSingle();
    perfil = byEmail.data || null;
  }

  let owned = null;
  const ownByAuth = await supabaseAdmin.from('empresas').select('id').eq('auth_user_id', user.id).maybeSingle();
  owned = ownByAuth.data || null;
  if (!owned && user.email) {
    const ownByEmail = await supabaseAdmin.from('empresas').select('id').eq('email', user.email).maybeSingle();
    owned = ownByEmail.data || null;
  }

  const resolvedTenant = perfil?.empresa_id || perfil?.company_id || owned?.id || null;
  const isSuper = Boolean(
    perfil?.is_super_admin ||
    String(perfil?.role || '').toLowerCase() === 'superadmin' ||
    String(perfil?.role || '').toLowerCase() === 'super_admin'
  );
  const empresa_id = isSuper && requestedEmpresaId ? requestedEmpresaId : resolvedTenant;

  if (!empresa_id) {
    return res.status(403).json({ error: 'Empresa não associada à conta autenticada.' });
  }
  if (!isSuper && requestedEmpresaId && String(requestedEmpresaId) !== String(empresa_id)) {
    return res.status(403).json({ error: 'Acesso negado: violação de isolamento multi-empresa.' });
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
    
    const valorCusto = Number(item.valor_custo ?? item.valor_unitario ?? item.unit_price ?? 0);
    const valorUnitario = Number(item.valor_unitario ?? item.unit_price ?? valorCusto);
    const valorVenda = Number(item.valor_venda ?? 0);
    const refProduto = String(item.referencia_produto || item.referencia || item.sku || '').trim();
    const tipoArtigo = item.tipo_artigo || 'Produto';
    const dataValidade = item.data_validade || null;
    const rubricaItem = item.rubrica || item.rubrica_label || null;
    const ordemItem = item.ordem || null;
    const posicaoItem = item.posicao || null;
    const centroCustoId = item.centro_custo_id || null;
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

      // 2. Encontrar produto por ID, referência ou nome/descrição
      let prodId = item.produto_id || item.product_id || null;
      let prevStock = 0;
      let newStock = 0;

      if (!prodId && refProduto) {
        const cleanRef = refProduto.replace(/[,%]/g, '').trim();
        const { data: byRefProds } = await supabaseAdmin
          .from('produtos')
          .select('id, stock_quantity, stock, stock_atual')
          .eq('empresa_id', empresa_id)
          .or(`referente.eq.${cleanRef},sku.eq.${cleanRef},codigo.eq.${cleanRef}`)
          .limit(1);
        if (byRefProds && byRefProds.length > 0) {
          prodId = byRefProds[0].id;
          prevStock = Number(byRefProds[0].stock_quantity ?? byRefProds[0].stock ?? byRefProds[0].stock_atual ?? 0);
        }
      }

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
      } else if (prevStock === 0) {
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

      // 3. Se produto encontrado, atualizar stock e metadados opcionais
      if (prodId) {
        const updateFields = {
          stock_quantity: newStock,
          stock: newStock,
          stock_atual: newStock,
          cost_price: valorCusto || valorUnitario,
          preco_compra: valorCusto || valorUnitario,
          preco_custo: valorCusto || valorUnitario,
          armazem_id: armazemId,
          updated_at: new Date().toISOString(),
        };
        if (valorVenda > 0) {
          updateFields.price = valorVenda;
          updateFields.preco_venda = valorVenda;
        }
        if (refProduto) {
          updateFields.referente = refProduto;
          updateFields.sku = refProduto;
          updateFields.codigo = refProduto;
        }
        if (tipoArtigo) updateFields.tipo_artigo = tipoArtigo;
        if (dataValidade) updateFields.data_validade = dataValidade;
        if (rubricaItem) updateFields.rubrica = rubricaItem;
        if (ordemItem) updateFields.ordem = ordemItem;
        if (posicaoItem) updateFields.posicao = posicaoItem;
        if (centroCustoId) updateFields.centro_custo_id = centroCustoId;

        const { error: updErr } = await supabaseAdmin
          .from('produtos')
          .update(updateFields)
          .eq('id', prodId)
          .eq('empresa_id', empresa_id);
        if (updErr) {
          const coreUpdate = {
            stock_quantity: newStock,
            stock: newStock,
            stock_atual: newStock,
            cost_price: valorCusto || valorUnitario,
            preco_compra: valorCusto || valorUnitario,
            preco_custo: valorCusto || valorUnitario,
            armazem_id: armazemId,
            updated_at: new Date().toISOString(),
            ...(valorVenda > 0 ? { price: valorVenda, preco_venda: valorVenda } : {}),
            ...(refProduto ? { referente: refProduto, sku: refProduto, codigo: refProduto } : {}),
            ...(dataValidade ? { data_validade: dataValidade } : {}),
          };
          await supabaseAdmin
            .from('produtos')
            .update(coreUpdate)
            .eq('id', prodId)
            .eq('empresa_id', empresa_id);
        }
      } else {
        // Criar produto novo se não existir
        const computedSale = valorVenda > 0 ? valorVenda : Math.round((valorCusto || valorUnitario) * 1.3 * 100) / 100;
        const insertPayload = {
          empresa_id,
          name: descricao,
          nome: descricao,
          referente: refProduto || null,
          sku: refProduto || null,
          codigo: refProduto || null,
          stock_quantity: quantidade,
          stock: quantidade,
          stock_atual: quantidade,
          cost_price: valorCusto || valorUnitario,
          preco_compra: valorCusto || valorUnitario,
          preco_custo: valorCusto || valorUnitario,
          price: computedSale,
          preco_venda: computedSale,
          unit: item.unidade || 'UN',
          unidade: item.unidade || 'UN',
          armazem_id: armazemId,
          tipo_artigo: tipoArtigo,
          tipologia: item.tipologia_custo || item.tipologia || 'Existência de Inventário',
          data_validade: dataValidade,
          rubrica: rubricaItem,
          ordem: ordemItem,
          posicao: posicaoItem,
          centro_custo_id: centroCustoId,
          origem: 'COMPRA',
          active: true,
          ativo: true,
          created_at: new Date().toISOString(),
        };
        let { data: newProd, error: insProdErr } = await supabaseAdmin
          .from('produtos')
          .insert([insertPayload])
          .select('id')
          .single();
        if (insProdErr) {
          const coreInsert = {
            empresa_id,
            name: descricao,
            nome: descricao,
            referente: refProduto || null,
            sku: refProduto || null,
            codigo: refProduto || null,
            stock_quantity: quantidade,
            stock: quantidade,
            stock_atual: quantidade,
            cost_price: valorCusto || valorUnitario,
            preco_compra: valorCusto || valorUnitario,
            preco_custo: valorCusto || valorUnitario,
            price: computedSale,
            preco_venda: computedSale,
            unit: item.unidade || 'UN',
            unidade: item.unidade || 'UN',
            armazem_id: armazemId,
            tipologia: item.tipologia_custo || item.tipologia || 'Existência de Inventário',
            active: true,
            ativo: true,
            created_at: new Date().toISOString(),
          };
          const retry = await supabaseAdmin.from('produtos').insert([coreInsert]).select('id').single();
          newProd = retry.data;
        }
        if (newProd) {
          prodId = newProd.id;
          prevStock = 0;
          newStock = quantidade;
        }
      }

      // 3.5. Sincronizar saldo por armazém em stock_saldos
      if (prodId && armazemId) {
        const armKey = String(armazemId);
        const { data: existingSaldo } = await supabaseAdmin
          .from('stock_saldos')
          .select('*')
          .eq('empresa_id', empresa_id)
          .eq('product_id', prodId)
          .eq('armazem_id', armKey)
          .maybeSingle();

        const curDisp = Number(existingSaldo?.quantidade_disponivel || 0);
        const nextDisp = curDisp + quantidade;
        if (existingSaldo) {
          await supabaseAdmin
            .from('stock_saldos')
            .update({
              quantidade_disponivel: nextDisp,
              custo_medio: valorUnitario > 0 ? valorUnitario : existingSaldo.custo_medio,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingSaldo.id);
        } else {
          await supabaseAdmin.from('stock_saldos').insert([{
            empresa_id,
            product_id: prodId,
            armazem_id: armKey,
            quantidade_disponivel: nextDisp,
            quantidade_reservada: 0,
            custo_medio: valorUnitario,
            updated_at: new Date().toISOString(),
          }]);
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
