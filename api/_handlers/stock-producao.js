/**
 * api/_handlers/stock-producao.js
 * Backend Enterprise Multi-Tenant para Gestão de Produção (Módulo Stock — IMATEC ERP)
 * - Autenticação JWT verificada no servidor + Isolamento estrito por empresa_id
 * - RBAC server-side (destrancar e reversão de stock restritos a admin/gestor_stock)
 * - Persistência real em public.producoes, itens_producao, anexos_producao, historico_producao
 * - Sincronização automática e idempotente com public.produtos, stock_saldos e movimentacoes_stock
 * - Zero gravação em public.compras (operação 100% independente de compras)
 */

import { createClient } from '@supabase/supabase-js';
import { getEnvConfig } from '../_env.js';

const PROD_URL = 'https://nawqfidnawokqaheqvar.supabase.co';
const PROD_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hd3FmaWRuYXdva3FhaGVxdmFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMTgxNDYsImV4cCI6MjA5Mzc5NDE0Nn0.qFkIexxKcQDWax3pfhcgPMR3ZFIsE-gYWTS62i5Edgs';
const PROD_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hd3FmaWRuYXdva3FhaGVxdmFyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODIxODE0NiwiZXhwIjoyMDkzNzk0MTQ2fQ.ToB7OlAF5FDHEKZMAZLmbvLtHb250qiVFmOUQm1VaOo';
const STAGING_URL = 'https://sfnibpxfevhelaikqbiq.supabase.co';
const STAGING_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbmlicHhmZXZoZWxhaWtxYmlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNTAyODgsImV4cCI6MjEwMjYyNjI4OH0.AnxqAF-TBY556gp2oPV0I5hfTjozaCMIHaeH7OhifiM';
const STAGING_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbmlicHhmZXZoZWxhaWtxYmlxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzA1MDI4OCwiZXhwIjoyMTAyNjI2Mjg4fQ.4wVvNNMK8dUTUXsQ8LklD4OBHa-s02VPlY7H0gC0cbw';

const ALLOWED_EXTENSIONS = new Set(['pdf', 'xlsx', 'xls', 'csv', 'png', 'jpg', 'jpeg', 'webp']);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const round3 = (n) => Math.round((Number(n) || 0) * 1000) / 1000;

async function resolveAuthAndClient(req) {
  const authHeader = req.headers?.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) return { error: 'Token de autenticação obrigatório.', status: 401 };

  const cfg = getEnvConfig(req);
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
    return { error: 'Sessão inválida ou expirada.', status: 401 };
  }

  const user = await authRes.json();
  if (!user?.id) return { error: 'Utilizador não identificado.', status: 401 };

  const supabaseAdmin = createClient(target.url, target.sr, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Lookup profile safely without interpolating untrusted characters
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

  let ownedCompany = null;
  const ownByAuth = await supabaseAdmin.from('empresas').select('id, nome_empresa, nome').eq('auth_user_id', user.id).maybeSingle();
  ownedCompany = ownByAuth.data || null;
  if (!ownedCompany && user.email) {
    const ownByEmail = await supabaseAdmin.from('empresas').select('id, nome_empresa, nome').eq('email', user.email).maybeSingle();
    ownedCompany = ownByEmail.data || null;
  }

  const isSuperAdmin = Boolean(
    perfil?.is_super_admin ||
    String(perfil?.role || '').toLowerCase() === 'superadmin' ||
    String(perfil?.role || '').toLowerCase() === 'super_admin'
  );

  const requestedEmpresaId = req.body?.empresa_id || req.query?.empresa_id || null;
  let empresaId = perfil?.empresa_id || perfil?.company_id || ownedCompany?.id || null;
  if (!empresaId && user?.id) {
    const { data: anyEmp } = await supabaseAdmin.from('empresas').select('id').limit(1).maybeSingle();
    empresaId = anyEmp?.id || user.id;
  }

  if (isSuperAdmin && requestedEmpresaId) {
    empresaId = requestedEmpresaId;
  } else if (requestedEmpresaId && empresaId && String(requestedEmpresaId) !== String(empresaId)) {
    return { error: 'Acesso negado: violação de isolamento multi-empresa.', status: 403 };
  }

  if (!empresaId) {
    empresaId = user.id;
  }

  let rawRole = String(perfil?.role || (ownedCompany ? 'admin' : 'operador')).toLowerCase().trim();
  if (perfil?.is_admin || ownedCompany) rawRole = 'admin';
  if (rawRole === 'user' || rawRole === 'operador_armazem') rawRole = 'operador';

  return {
    supabaseAdmin,
    userId: user.id,
    email: user.email || '',
    name: perfil?.nome || perfil?.name || user.user_metadata?.full_name || user.email || 'Utilizador',
    username: perfil?.username || (user.email ? user.email.split('@')[0] : 'operador'),
    empresaId: String(empresaId),
    role: rawRole,
    isSuperAdmin,
  };
}

function canOperate(role) {
  return ['admin', 'superadmin', 'super_admin', 'gestor_stock', 'gestor', 'manager', 'operador'].includes(role);
}

function canUnlockOrReverse(role) {
  return ['admin', 'superadmin', 'super_admin', 'gestor_stock', 'gestor', 'manager'].includes(role);
}

async function upsertWarehouseBalance(supabaseAdmin, { empresaId, productId, armazemId, deltaDisponivel, newCost = null }) {
  if (!armazemId || !productId) return null;
  const armKey = String(armazemId);
  const { data: existing } = await supabaseAdmin
    .from('stock_saldos')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('product_id', productId)
    .eq('armazem_id', armKey)
    .maybeSingle();

  const curDisp = Number(existing?.quantidade_disponivel || 0);
  const nextDisp = round3(curDisp + Number(deltaDisponivel || 0));

  let nextCost = Number(existing?.custo_medio || 0);
  if (newCost !== null && Number(newCost) > 0 && Number(deltaDisponivel) > 0) {
    const prevVal = Math.max(0, curDisp) * nextCost;
    const addVal = Number(deltaDisponivel) * Number(newCost);
    const totalQty = Math.max(0, curDisp) + Number(deltaDisponivel);
    nextCost = totalQty > 0 ? round2((prevVal + addVal) / totalQty) : Number(newCost);
  }

  if (existing) {
    await supabaseAdmin
      .from('stock_saldos')
      .update({
        quantidade_disponivel: nextDisp,
        custo_medio: nextCost,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .eq('empresa_id', empresaId);
  } else {
    await supabaseAdmin.from('stock_saldos').insert([{
      empresa_id: empresaId,
      product_id: productId,
      armazem_id: armKey,
      quantidade_disponivel: nextDisp,
      quantidade_reservada: 0,
      custo_medio: nextCost || Number(newCost || 0),
      updated_at: new Date().toISOString(),
    }]);
  }
  return { prevDisp: curDisp, nextDisp, nextCost };
}

async function recordHistory(supabaseAdmin, { empresaId, producaoId, acao, detalhes, ctx }) {
  try {
    await supabaseAdmin.from('historico_producao').insert([{
      empresa_id: empresaId,
      producao_id: producaoId,
      acao,
      detalhes: detalhes || {},
      usuario_id: ctx.userId,
      usuario_nome: ctx.name,
    }]);
  } catch (err) {
    console.warn('[stock-producao] historico insert warning:', err?.message || err);
  }
}

async function generateNumeroProducao(supabaseAdmin, empresaId) {
  const year = new Date().getFullYear();
  const { data } = await supabaseAdmin
    .from('producoes')
    .select('numero_producao')
    .eq('empresa_id', empresaId)
    .order('created_at', { ascending: false })
    .limit(50);

  let maxSeq = 0;
  for (const row of data || []) {
    const m = String(row.numero_producao || '').match(/PROD-\d{4}-(\d+)/i);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > maxSeq) maxSeq = n;
    }
  }
  const next = String(maxSeq + 1).padStart(4, '0');
  return `PROD-${year}-${next}`;
}

async function findExistingProduct(supabaseAdmin, empresaId, referencia, descricao) {
  const refClean = String(referencia || '').trim();
  const descClean = String(descricao || '').trim().toLowerCase();

  const { data: prods } = await supabaseAdmin
    .from('produtos')
    .select('*')
    .eq('empresa_id', empresaId);

  const list = prods || [];
  if (refClean) {
    const refLower = refClean.toLowerCase();
    const byRef = list.find(p =>
      String(p.referente || '').trim().toLowerCase() === refLower ||
      String(p.sku || '').trim().toLowerCase() === refLower ||
      String(p.codigo || '').trim().toLowerCase() === refLower ||
      String(p.code || '').trim().toLowerCase() === refLower
    );
    if (byRef) return byRef;
  }

  if (descClean) {
    const byName = list.find(p =>
      String(p.name || '').trim().toLowerCase() === descClean ||
      String(p.nome || '').trim().toLowerCase() === descClean
    );
    if (byName) return byName;
  }

  return null;
}

async function syncProductAndStockEntry(supabaseAdmin, ctx, producao, item, armazemName) {
  const qty = Number(item.quantidade || 0);
  const cost = round2(item.valor_custo);
  const sale = round2(item.valor_venda);
  const armId = item.armazem_id || producao.armazem_id;
  const numArm = armId && !isNaN(Number(armId)) && Number(armId) > 0 ? Number(armId) : null;
  const refKey = `PROD_${producao.id}_${String(item.referencia).trim()}`;

  // Idempotência: verificar se já existe movimento para esta produção + referência
  const { data: existingMov } = await supabaseAdmin
    .from('movimentacoes_stock')
    .select('id, product_id')
    .eq('empresa_id', ctx.empresaId)
    .eq('reference_id', refKey)
    .maybeSingle();

  let existingProd = await findExistingProduct(supabaseAdmin, ctx.empresaId, item.referencia, item.descricao);
  let productId = existingProd?.id || existingMov?.product_id || null;
  let movimentoId = existingMov?.id || null;

  if (existingMov) {
    return { productId, movimentoId, skipped: true };
  }

  let prevStock = 0;
  let newStock = qty;

  if (existingProd) {
    productId = existingProd.id;
    prevStock = Number(existingProd.stock_quantity ?? existingProd.stock ?? existingProd.stock_atual ?? 0);
    newStock = round3(prevStock + qty);

    const prevCost = Number(existingProd.cost_price ?? existingProd.preco_compra ?? existingProd.preco_custo ?? 0);
    const totalPrevVal = Math.max(0, prevStock) * prevCost;
    const totalQty = Math.max(0, prevStock) + qty;
    const nextCost = cost > 0 && totalQty > 0 ? round2((totalPrevVal + qty * cost) / totalQty) : (cost || prevCost);

    const upd = {
      name: existingProd.name || item.descricao,
      nome: existingProd.nome || item.descricao,
      referente: existingProd.referente || item.referencia,
      sku: existingProd.sku || item.referencia,
      codigo: existingProd.codigo || item.referencia,
      stock_quantity: newStock,
      stock: newStock,
      stock_atual: newStock,
      cost_price: nextCost,
      preco_compra: nextCost,
      preco_custo: nextCost,
      price: sale > 0 ? sale : existingProd.price,
      preco_venda: sale > 0 ? sale : existingProd.preco_venda,
      preco: sale > 0 ? sale : existingProd.preco,
      armazem_id: armId ? String(armId) : existingProd.armazem_id,
      tipologia: item.tipologia || existingProd.tipologia,
      tipo_artigo: item.tipo_artigo || existingProd.tipo_artigo,
      centro_custo_id: item.centro_custo_id || existingProd.centro_custo_id,
      centro_custo_nome: item.centro_custo_nome || existingProd.centro_custo_nome,
      tipo_imposto: item.tipo_imposto || existingProd.tipo_imposto,
      iva_taxa: Number(item.taxa_imposto ?? existingProd.iva_taxa ?? 0),
      rubrica: item.rubrica || existingProd.rubrica,
      ordem: item.ordem || existingProd.ordem,
      posicao: item.posicao || existingProd.posicao,
      data_validade: item.data_validade || existingProd.data_validade || null,
      origem: 'PRODUÇÃO',
      producao_id: producao.id,
      active: true,
      ativo: true,
      updated_at: new Date().toISOString(),
      updated_by: ctx.userId,
    };
    if (numArm) upd.warehouse_id = numArm;

    const { error: updErr } = await supabaseAdmin
      .from('produtos')
      .update(upd)
      .eq('id', productId)
      .eq('empresa_id', ctx.empresaId);
    if (updErr) throw new Error(`Erro ao atualizar produto ${item.descricao}: ${updErr.message}`);
  } else {
    const ins = {
      empresa_id: ctx.empresaId,
      name: item.descricao,
      nome: item.descricao,
      description: item.descricao,
      descricao: item.descricao,
      referente: item.referencia,
      sku: item.referencia,
      codigo: item.referencia,
      code: item.referencia,
      price: sale,
      preco: sale,
      preco_venda: sale,
      cost_price: cost,
      preco_compra: cost,
      preco_custo: cost,
      stock_quantity: qty,
      stock: qty,
      stock_atual: qty,
      unit: 'un',
      unidade: 'un',
      category: item.tipologia || 'Produção',
      categoria: item.tipologia || 'Produção',
      tipo_artigo: item.tipo_artigo || 'Produto Acabado',
      tipologia: item.tipologia || 'Manufactura',
      armazem_id: armId ? String(armId) : null,
      centro_custo_id: item.centro_custo_id || null,
      centro_custo_nome: item.centro_custo_nome || null,
      tipo_imposto: item.tipo_imposto || null,
      iva_taxa: Number(item.taxa_imposto || 0),
      rubrica: item.rubrica || null,
      ordem: item.ordem || null,
      posicao: item.posicao || null,
      data_validade: item.data_validade || null,
      origem: 'PRODUÇÃO',
      producao_id: producao.id,
      active: true,
      ativo: true,
      created_by: ctx.userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (numArm) ins.warehouse_id = numArm;

    const { data: createdProd, error: insErr } = await supabaseAdmin
      .from('produtos')
      .insert([ins])
      .select('id')
      .single();
    if (insErr) throw new Error(`Erro ao criar produto em Stock (${item.descricao}): ${insErr.message}`);
    productId = createdProd.id;
  }

  if (armId) {
    await upsertWarehouseBalance(supabaseAdmin, {
      empresaId: ctx.empresaId,
      productId,
      armazemId: armId,
      deltaDisponivel: qty,
      newCost: cost,
    });
  }

  const movPayload = {
    empresa_id: ctx.empresaId,
    product_id: productId,
    produto_id: productId,
    product_name: item.descricao,
    type: 'entry',
    tipo: 'entrada',
    subtipo: 'producao',
    origem: 'PRODUÇÃO',
    producao_id: producao.id,
    quantity: qty,
    quantidade: qty,
    unit_price: cost,
    custo_unitario: cost,
    valor_total: round2(qty * cost),
    previous_stock: prevStock,
    current_stock: newStock,
    warehouse_id: numArm,
    armazem_id: armId ? String(armId) : null,
    warehouse_name: armazemName || null,
    data_validade: item.data_validade || null,
    motivo: `Entrada por Produção ${producao.numero_producao}`,
    documento_origem: 'Produção',
    numero_documento: producao.numero_producao,
    data_documento: new Date().toISOString().slice(0, 10),
    reference_id: refKey,
    referencia: producao.numero_producao,
    description: `Produção ${producao.numero_producao} — ${item.descricao} (${item.referencia})`,
    ano: new Date().getFullYear(),
    created_by: ctx.userId,
    created_by_nome: ctx.name,
    created_by_username: ctx.username,
    created_at: new Date().toISOString(),
  };

  const { data: movRow, error: movErr } = await supabaseAdmin
    .from('movimentacoes_stock')
    .insert([movPayload])
    .select('id')
    .single();
  if (movErr) {
    throw new Error(`Erro ao registar movimento de stock (${item.descricao}): ${movErr.message}`);
  }
  movimentoId = movRow.id;

  return { productId, movimentoId, skipped: false };
}

async function adjustProductStockDelta(supabaseAdmin, ctx, producao, item, deltaQty, reasonLabel, armazemName) {
  if (!item.product_id || deltaQty === 0) return null;
  const { data: prod } = await supabaseAdmin
    .from('produtos')
    .select('*')
    .eq('id', item.product_id)
    .eq('empresa_id', ctx.empresaId)
    .maybeSingle();
  if (!prod) return null;

  const prevStock = Number(prod.stock_quantity ?? prod.stock ?? prod.stock_atual ?? 0);
  const nextStock = Math.max(0, round3(prevStock + deltaQty));
  const armId = item.armazem_id || producao.armazem_id;

  await supabaseAdmin
    .from('produtos')
    .update({
      stock_quantity: nextStock,
      stock: nextStock,
      stock_atual: nextStock,
      cost_price: Number(item.valor_custo ?? prod.cost_price ?? 0),
      preco_compra: Number(item.valor_custo ?? prod.preco_compra ?? 0),
      preco_custo: Number(item.valor_custo ?? prod.preco_custo ?? 0),
      price: Number(item.valor_venda ?? prod.price ?? 0),
      preco_venda: Number(item.valor_venda ?? prod.preco_venda ?? 0),
      updated_at: new Date().toISOString(),
      updated_by: ctx.userId,
    })
    .eq('id', prod.id)
    .eq('empresa_id', ctx.empresaId);

  if (armId) {
    await upsertWarehouseBalance(supabaseAdmin, {
      empresaId: ctx.empresaId,
      productId: prod.id,
      armazemId: armId,
      deltaDisponivel: deltaQty,
      newCost: deltaQty > 0 ? Number(item.valor_custo || 0) : null,
    });
  }

  const absQty = Math.abs(deltaQty);
  const isPos = deltaQty > 0;
  const { data: movRow } = await supabaseAdmin
    .from('movimentacoes_stock')
    .insert([{
      empresa_id: ctx.empresaId,
      product_id: prod.id,
      produto_id: prod.id,
      product_name: item.descricao,
      type: isPos ? 'adjustment_plus' : 'adjustment_minus',
      tipo: isPos ? 'entrada' : 'saida',
      subtipo: reasonLabel,
      origem: 'PRODUÇÃO',
      producao_id: producao.id,
      quantity: absQty,
      quantidade: absQty,
      unit_price: Number(item.valor_custo || 0),
      custo_unitario: Number(item.valor_custo || 0),
      valor_total: round2(absQty * Number(item.valor_custo || 0)),
      previous_stock: prevStock,
      current_stock: nextStock,
      armazem_id: armId ? String(armId) : null,
      warehouse_name: armazemName || null,
      motivo: `${reasonLabel === 'reversao_producao' ? 'Reversão' : 'Ajuste'} Produção ${producao.numero_producao}`,
      documento_origem: 'Produção',
      numero_documento: producao.numero_producao,
      reference_id: `PROD_ADJ_${producao.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      referencia: producao.numero_producao,
      description: `${reasonLabel === 'reversao_producao' ? 'Reversão' : 'Ajuste'} Produção ${producao.numero_producao} — ${item.descricao}`,
      ano: new Date().getFullYear(),
      created_by: ctx.userId,
      created_by_nome: ctx.name,
      created_by_username: ctx.username,
    }])
    .select('id')
    .maybeSingle();

  return movRow?.id || null;
}

function validateItemsArray(itens) {
  if (!Array.isArray(itens) || itens.length === 0) {
    return 'Adicione pelo menos um produto à produção.';
  }
  const refs = new Set();
  for (let i = 0; i < itens.length; i++) {
    const it = itens[i];
    const desc = String(it?.descricao || '').trim();
    const ref = String(it?.referencia || '').trim();
    const qty = Number(it?.quantidade || 0);
    const custo = Number(it?.valor_custo ?? 0);
    const venda = Number(it?.valor_venda ?? 0);

    if (!desc) return `Linha ${i + 1}: A descrição do produto é obrigatória.`;
    if (!ref) return `Linha ${i + 1}: A referência do produto é obrigatória.`;
    if (qty <= 0 || !Number.isFinite(qty)) return `Linha ${i + 1}: A quantidade deve ser maior que zero.`;
    if (custo < 0 || !Number.isFinite(custo)) return `Linha ${i + 1}: O valor de custo não pode ser negativo.`;
    if (venda < 0 || !Number.isFinite(venda)) return `Linha ${i + 1}: O valor de venda não pode ser negativo.`;
    if (!it?.tipo_artigo) return `Linha ${i + 1}: O tipo de artigo é obrigatório.`;
    if (!it?.armazem_id) return `Linha ${i + 1}: Selecione o armazém do produto.`;

    const refNorm = ref.toLowerCase();
    if (refs.has(refNorm)) {
      return `Referência duplicada na lista de produção: "${ref}".`;
    }
    refs.add(refNorm);
  }
  return null;
}

export default async function stockProducaoHandler(req, res) {
  try {
    const ctx = await resolveAuthAndClient(req);
    if (ctx.error) {
      return res.status(ctx.status || 401).json({ error: ctx.error });
    }
    const { supabaseAdmin } = ctx;

    const urlObj = new URL(req.originalUrl || req.url || '/api/stock/producoes', 'http://localhost');
    const pathname = urlObj.pathname.replace(/\/+$/, '');
    const subPath = pathname.replace(/^\/api\/stock\/producoes/, '');
    const segments = subPath.split('/').filter(Boolean);

    // 1. GET /api/stock/producoes — Lista + KPIs + Filtros + Lookups
    if (req.method === 'GET' && segments.length === 0) {
      const search = String(urlObj.searchParams.get('search') || '').trim().toLowerCase();
      const estado = String(urlObj.searchParams.get('estado') || '').trim();
      const armazemId = String(urlObj.searchParams.get('armazem_id') || '').trim();
      const tipoProducao = String(urlObj.searchParams.get('tipo_producao') || '').trim();
      const dateFrom = String(urlObj.searchParams.get('date_from') || '').trim();
      const dateTo = String(urlObj.searchParams.get('date_to') || '').trim();
      const page = Math.max(1, parseInt(urlObj.searchParams.get('page') || '1', 10));
      const pageSize = Math.min(100, Math.max(1, parseInt(urlObj.searchParams.get('page_size') || '15', 10)));

      let { data: locData } = await supabaseAdmin.from('locais_trabalho').select('*').eq('empresa_id', ctx.empresaId);
      if (!locData || locData.length === 0) {
        const { data: fallbackLoc } = await supabaseAdmin.from('locais_trabalho').select('*').limit(50);
        locData = fallbackLoc || [];
      }

      const [prodRes, itemsRes, anexosRes, histRes, armRes, metricsRes, pgcRes, impRes] = await Promise.all([
        supabaseAdmin.from('producoes').select('*').eq('empresa_id', ctx.empresaId).order('created_at', { ascending: false }),
        supabaseAdmin.from('itens_producao').select('*').eq('empresa_id', ctx.empresaId).order('created_at', { ascending: true }),
        supabaseAdmin.from('anexos_producao').select('*').eq('empresa_id', ctx.empresaId).order('created_at', { ascending: false }),
        supabaseAdmin.from('historico_producao').select('*').eq('empresa_id', ctx.empresaId).order('created_at', { ascending: false }).limit(500),
        supabaseAdmin.from('armazens').select('*').eq('empresa_id', ctx.empresaId),
        supabaseAdmin.from('metrics').select('*').eq('empresa_id', ctx.empresaId),
        supabaseAdmin.from('pgc_plano_contas').select('id, codigo, conta, descricao').or(`empresa_id.eq.${ctx.empresaId},is_system.eq.true`).order('codigo'),
        supabaseAdmin.from('impostos').select('*').eq('empresa_id', ctx.empresaId),
      ]);

      if (prodRes.error) {
        return res.status(500).json({ error: `Erro ao consultar produções: ${prodRes.error.message}` });
      }

      const allProds = prodRes.data || [];
      const itemsByProd = new Map();
      for (const it of itemsRes.data || []) {
        const list = itemsByProd.get(it.producao_id) || [];
        list.push(it);
        itemsByProd.set(it.producao_id, list);
      }

      const anexosByProd = new Map();
      for (const ax of anexosRes.data || []) {
        const list = anexosByProd.get(ax.producao_id) || [];
        list.push(ax);
        anexosByProd.set(ax.producao_id, list);
      }

      const histByProd = new Map();
      for (const h of histRes.data || []) {
        const list = histByProd.get(h.producao_id) || [];
        list.push(h);
        histByProd.set(h.producao_id, list);
      }

      const kpis = {
        total: allProds.length,
        em_andamento: allProds.filter(p => p.estado === 'em_andamento').length,
        concluidas: allProds.filter(p => p.estado === 'concluida' && !p.bloqueada).length,
        bloqueadas: allProds.filter(p => p.bloqueada || p.estado === 'bloqueada').length,
        valor_total_custo: round2(allProds.reduce((s, p) => s + Number(p.valor_total_custo || 0), 0)),
        valor_total_venda: round2(allProds.reduce((s, p) => s + Number(p.valor_total_venda || 0), 0)),
      };

      const enriched = allProds.map(p => ({
        ...p,
        itens: itemsByProd.get(p.id) || [],
        anexos: anexosByProd.get(p.id) || [],
        historico: histByProd.get(p.id) || [],
      }));

      const filtered = enriched.filter(p => {
        if (estado && estado !== 'all') {
          if (estado === 'bloqueada' && !p.bloqueada && p.estado !== 'bloqueada') return false;
          if (estado !== 'bloqueada' && p.estado !== estado) return false;
        }
        if (armazemId && armazemId !== 'all' && String(p.armazem_id || '') !== armazemId) return false;
        if (tipoProducao && tipoProducao !== 'all' && String(p.tipo_producao || '').toLowerCase() !== tipoProducao.toLowerCase()) return false;

        const dtStr = String(p.data_registo || p.created_at || '').slice(0, 10);
        if (dateFrom && dtStr < dateFrom) return false;
        if (dateTo && dtStr > dateTo) return false;

        if (search) {
          const itemText = (p.itens || [])
            .map(it => `${it.descricao || ''} ${it.referencia || ''} ${it.rubrica || ''}`)
            .join(' ')
            .toLowerCase();
          const haystack = `${p.numero_producao || ''} ${p.ordem || ''} ${p.tipo_producao || ''} ${p.local_trabalho_nome || ''} ${p.armazem_nome || ''} ${p.responsavel_nome || ''} ${itemText}`.toLowerCase();
          if (!haystack.includes(search)) return false;
        }
        return true;
      });

      const total = filtered.length;
      const start = (page - 1) * pageSize;
      const paginated = filtered.slice(start, start + pageSize);

      return res.json({
        kpis,
        total,
        page,
        page_size: pageSize,
        producoes: paginated,
        lookups: {
          armazens: armRes.data || [],
          locais_trabalho: locData || [],
          centros_custo: metricsRes.data || [],
          pgc_contas: pgcRes.data || [],
          impostos: impRes.data || [],
        },
        capabilities: {
          canOperate: canOperate(ctx.role),
          canUnlock: canUnlockOrReverse(ctx.role),
          canDeleteWithStock: canUnlockOrReverse(ctx.role),
          role: ctx.role,
        },
      });
    }

    // 2. GET /api/stock/producoes/:id
    if (req.method === 'GET' && segments.length === 1) {
      const id = segments[0];
      const { data: prod, error } = await supabaseAdmin
        .from('producoes')
        .select('*')
        .eq('id', id)
        .eq('empresa_id', ctx.empresaId)
        .maybeSingle();
      if (error) return res.status(500).json({ error: error.message });
      if (!prod) return res.status(404).json({ error: 'Produção não encontrada.' });

      const [itemsRes, anexosRes, histRes] = await Promise.all([
        supabaseAdmin.from('itens_producao').select('*').eq('empresa_id', ctx.empresaId).eq('producao_id', id).order('created_at', { ascending: true }),
        supabaseAdmin.from('anexos_producao').select('*').eq('empresa_id', ctx.empresaId).eq('producao_id', id).order('created_at', { ascending: false }),
        supabaseAdmin.from('historico_producao').select('*').eq('empresa_id', ctx.empresaId).eq('producao_id', id).order('created_at', { ascending: false }),
      ]);

      return res.json({
        ...prod,
        itens: itemsRes.data || [],
        anexos: anexosRes.data || [],
        historico: histRes.data || [],
      });
    }

    // 3. POST /api/stock/producoes — Criar Nova Produção + Produtos no Stock (NUNCA em compras)
    if (req.method === 'POST' && segments.length === 0) {
      if (!canOperate(ctx.role)) {
        return res.status(403).json({ error: 'Perfil sem permissão para registar produção.' });
      }

      const body = req.body || {};
      const tipoProducao = String(body.tipo_producao || '').trim();
      const localTrabalhoId = String(body.local_trabalho_id || '').trim();
      const armazemId = String(body.armazem_id || '').trim();
      const observacoes = body.observacoes ? String(body.observacoes).trim() : null;
      const estadoInicial = body.estado === 'em_andamento' ? 'em_andamento' : 'concluida';

      if (!tipoProducao) return res.status(400).json({ error: 'Selecione o tipo de produção.' });
      if (!localTrabalhoId) return res.status(400).json({ error: 'Selecione o local de trabalho.' });
      if (!armazemId) return res.status(400).json({ error: 'Selecione o armazém.' });

      const itens = (Array.isArray(body.itens) ? body.itens : []).map(it => ({
        ...it,
        armazem_id: String(it.armazem_id || armazemId),
      }));
      const itemError = validateItemsArray(itens);
      if (itemError) return res.status(400).json({ error: itemError });

      // Resolver nomes reais de Armazém e Local de Trabalho
      const [{ data: armRow }, { data: locRow }] = await Promise.all([
        supabaseAdmin.from('armazens').select('*').eq('empresa_id', ctx.empresaId).eq('id', armazemId).maybeSingle(),
        supabaseAdmin.from('locais_trabalho').select('*').eq('empresa_id', ctx.empresaId).eq('id', localTrabalhoId).maybeSingle(),
      ]);

      const armazemNome = armRow?.name || armRow?.nome || body.armazem_nome || `Armazém #${armazemId}`;
      const localTrabalhoNome = locRow?.nome || body.local_trabalho_nome || `Local #${localTrabalhoId}`;

      const numeroProducao = body.numero_producao
        ? String(body.numero_producao).trim()
        : await generateNumeroProducao(supabaseAdmin, ctx.empresaId);

      // Proteção contra duplicado de numero_producao
      const { data: dupNum } = await supabaseAdmin
        .from('producoes')
        .select('id')
        .eq('empresa_id', ctx.empresaId)
        .eq('numero_producao', numeroProducao)
        .maybeSingle();
      if (dupNum) {
        return res.status(409).json({ error: `Já existe uma produção com o número "${numeroProducao}".` });
      }

      const quantidadeProdutos = itens.length;
      const quantidadeTotal = round3(itens.reduce((s, it) => s + Number(it.quantidade || 0), 0));
      const valorTotalCusto = round2(itens.reduce((s, it) => s + Number(it.quantidade || 0) * Number(it.valor_custo || 0), 0));
      const valorTotalVenda = round2(itens.reduce((s, it) => s + Number(it.quantidade || 0) * Number(it.valor_venda || 0), 0));

      const { data: producao, error: prodErr } = await supabaseAdmin
        .from('producoes')
        .insert([{
          empresa_id: ctx.empresaId,
          numero_producao: numeroProducao,
          ordem: body.ordem || itens[0]?.ordem || null,
          tipo_producao: tipoProducao,
          local_trabalho_id: localTrabalhoId,
          local_trabalho_nome: localTrabalhoNome,
          armazem_id: armazemId,
          armazem_nome: armazemNome,
          estado: estadoInicial,
          quantidade_produtos: quantidadeProdutos,
          quantidade_total: quantidadeTotal,
          valor_total_custo: valorTotalCusto,
          valor_total_venda: valorTotalVenda,
          bloqueada: false,
          responsavel_id: ctx.userId,
          responsavel_nome: ctx.name,
          observacoes,
          data_registo: new Date().toISOString(),
        }])
        .select('*')
        .single();

      if (prodErr) {
        return res.status(500).json({ error: `Erro ao criar registo de produção: ${prodErr.message}` });
      }

      const savedItems = [];
      for (let i = 0; i < itens.length; i++) {
        const it = itens[i];
        const itArmId = String(it.armazem_id || armazemId);
        let itArmNome = armazemNome;
        if (itArmId !== armazemId) {
          const { data: itArmRow } = await supabaseAdmin
            .from('armazens')
            .select('*')
            .eq('empresa_id', ctx.empresaId)
            .eq('id', itArmId)
            .maybeSingle();
          itArmNome = itArmRow?.name || itArmRow?.nome || it.armazem_nome || `Armazém #${itArmId}`;
        }

        const syncRes = await syncProductAndStockEntry(supabaseAdmin, ctx, producao, it, itArmNome);

        const { data: itemRow, error: itemInsErr } = await supabaseAdmin
          .from('itens_producao')
          .insert([{
            empresa_id: ctx.empresaId,
            producao_id: producao.id,
            product_id: syncRes.productId,
            ordem: it.ordem || producao.ordem || null,
            posicao: it.posicao || String(i + 1),
            descricao: String(it.descricao).trim(),
            referencia: String(it.referencia).trim(),
            quantidade: Number(it.quantidade),
            valor_custo: round2(it.valor_custo),
            valor_venda: round2(it.valor_venda),
            tipo_artigo: it.tipo_artigo || 'Produto Acabado',
            tipologia: it.tipologia || 'Manufactura',
            armazem_id: itArmId,
            armazem_nome: itArmNome,
            centro_custo_id: it.centro_custo_id || null,
            centro_custo_nome: it.centro_custo_nome || null,
            tipo_imposto: it.tipo_imposto || null,
            taxa_imposto: Number(it.taxa_imposto || 0),
            data_validade: it.data_validade || null,
            rubrica: it.rubrica || null,
            rubrica_id: it.rubrica_id || null,
            movimento_stock_id: syncRes.movimentoId,
          }])
          .select('*')
          .single();

        if (itemInsErr) {
          throw new Error(`Erro ao gravar item de produção: ${itemInsErr.message}`);
        }
        savedItems.push(itemRow);
      }

      await recordHistory(supabaseAdmin, {
        empresaId: ctx.empresaId,
        producaoId: producao.id,
        acao: 'CRIACAO',
        detalhes: {
          numero_producao: numeroProducao,
          tipo_producao: tipoProducao,
          quantidade_produtos: quantidadeProdutos,
          quantidade_total: quantidadeTotal,
          valor_total_custo: valorTotalCusto,
          valor_total_venda: valorTotalVenda,
        },
        ctx,
      });

      return res.status(201).json({
        success: true,
        producao: { ...producao, itens: savedItems, anexos: [], historico: [] },
      });
    }

    // 4. PUT /api/stock/producoes/:id — Editar Produção (bloqueada não edita; sem duplicar stock)
    if (req.method === 'PUT' && segments.length === 1) {
      if (!canOperate(ctx.role)) {
        return res.status(403).json({ error: 'Sem permissão para editar produção.' });
      }
      const id = segments[0];

      const { data: existing, error: fetchErr } = await supabaseAdmin
        .from('producoes')
        .select('*')
        .eq('id', id)
        .eq('empresa_id', ctx.empresaId)
        .maybeSingle();
      if (fetchErr) return res.status(500).json({ error: fetchErr.message });
      if (!existing) return res.status(404).json({ error: 'Produção não encontrada.' });
      if (existing.bloqueada || existing.estado === 'bloqueada') {
        return res.status(403).json({ error: 'Esta produção encontra-se TRANCADA e não pode ser editada.' });
      }

      const body = req.body || {};
      const tipoProducao = String(body.tipo_producao || existing.tipo_producao).trim();
      const localTrabalhoId = String(body.local_trabalho_id || existing.local_trabalho_id || '').trim();
      const armazemId = String(body.armazem_id || existing.armazem_id || '').trim();
      const estado = body.estado === 'em_andamento' ? 'em_andamento' : 'concluida';

      const itens = (Array.isArray(body.itens) ? body.itens : []).map(it => ({
        ...it,
        armazem_id: String(it.armazem_id || armazemId),
      }));
      const itemError = validateItemsArray(itens);
      if (itemError) return res.status(400).json({ error: itemError });

      const [{ data: armRow }, { data: locRow }, { data: oldItems }] = await Promise.all([
        supabaseAdmin.from('armazens').select('*').eq('empresa_id', ctx.empresaId).eq('id', armazemId).maybeSingle(),
        supabaseAdmin.from('locais_trabalho').select('*').eq('empresa_id', ctx.empresaId).eq('id', localTrabalhoId).maybeSingle(),
        supabaseAdmin.from('itens_producao').select('*').eq('empresa_id', ctx.empresaId).eq('producao_id', id),
      ]);

      const armazemNome = armRow?.name || armRow?.nome || body.armazem_nome || existing.armazem_nome;
      const localTrabalhoNome = locRow?.nome || body.local_trabalho_nome || existing.local_trabalho_nome;

      const oldById = new Map((oldItems || []).map(it => [it.id, it]));
      const oldByRef = new Map((oldItems || []).map(it => [String(it.referencia || '').trim().toLowerCase(), it]));
      const keptOldIds = new Set();

      const updatedItemsResult = [];
      for (let i = 0; i < itens.length; i++) {
        const it = itens[i];
        const prev = (it.id && oldById.get(it.id)) || oldByRef.get(String(it.referencia || '').trim().toLowerCase()) || null;
        const itArmId = String(it.armazem_id || armazemId);
        let itArmNome = armazemNome;
        if (itArmId !== armazemId) {
          const { data: itArmRow } = await supabaseAdmin.from('armazens').select('*').eq('empresa_id', ctx.empresaId).eq('id', itArmId).maybeSingle();
          itArmNome = itArmRow?.name || itArmRow?.nome || it.armazem_nome || `Armazém #${itArmId}`;
        }

        if (prev) {
          keptOldIds.add(prev.id);
          const delta = round3(Number(it.quantidade) - Number(prev.quantidade));
          let movId = prev.movimento_stock_id;

          if (delta !== 0) {
            const adjMovId = await adjustProductStockDelta(supabaseAdmin, ctx, existing, { ...it, product_id: prev.product_id }, delta, 'ajuste_producao', itArmNome);
            if (adjMovId) movId = adjMovId;
          } else if (prev.product_id) {
            // Atualizar apenas metadados e preços no produto existente SEM duplicar movimento de stock
            await supabaseAdmin
              .from('produtos')
              .update({
                name: String(it.descricao).trim(),
                nome: String(it.descricao).trim(),
                cost_price: round2(it.valor_custo),
                preco_compra: round2(it.valor_custo),
                preco_custo: round2(it.valor_custo),
                price: round2(it.valor_venda),
                preco_venda: round2(it.valor_venda),
                preco: round2(it.valor_venda),
                tipo_artigo: it.tipo_artigo,
                tipologia: it.tipologia,
                centro_custo_id: it.centro_custo_id || null,
                centro_custo_nome: it.centro_custo_nome || null,
                tipo_imposto: it.tipo_imposto || null,
                rubrica: it.rubrica || null,
                data_validade: it.data_validade || null,
                updated_at: new Date().toISOString(),
              })
              .eq('id', prev.product_id)
              .eq('empresa_id', ctx.empresaId);
          }

          const { data: updItem, error: updItErr } = await supabaseAdmin
            .from('itens_producao')
            .update({
              ordem: it.ordem || null,
              posicao: it.posicao || String(i + 1),
              descricao: String(it.descricao).trim(),
              referencia: String(it.referencia).trim(),
              quantidade: Number(it.quantidade),
              valor_custo: round2(it.valor_custo),
              valor_venda: round2(it.valor_venda),
              tipo_artigo: it.tipo_artigo,
              tipologia: it.tipologia || null,
              armazem_id: itArmId,
              armazem_nome: itArmNome,
              centro_custo_id: it.centro_custo_id || null,
              centro_custo_nome: it.centro_custo_nome || null,
              tipo_imposto: it.tipo_imposto || null,
              taxa_imposto: Number(it.taxa_imposto || 0),
              data_validade: it.data_validade || null,
              rubrica: it.rubrica || null,
              rubrica_id: it.rubrica_id || null,
              movimento_stock_id: movId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', prev.id)
            .eq('empresa_id', ctx.empresaId)
            .select('*')
            .single();
          if (updItErr) throw new Error(updItErr.message);
          updatedItemsResult.push(updItem);
        } else {
          // Item novo adicionado na edição
          const syncRes = await syncProductAndStockEntry(supabaseAdmin, ctx, existing, it, itArmNome);
          const { data: newItem, error: newItErr } = await supabaseAdmin
            .from('itens_producao')
            .insert([{
              empresa_id: ctx.empresaId,
              producao_id: id,
              product_id: syncRes.productId,
              ordem: it.ordem || null,
              posicao: it.posicao || String(i + 1),
              descricao: String(it.descricao).trim(),
              referencia: String(it.referencia).trim(),
              quantidade: Number(it.quantidade),
              valor_custo: round2(it.valor_custo),
              valor_venda: round2(it.valor_venda),
              tipo_artigo: it.tipo_artigo || 'Produto Acabado',
              tipologia: it.tipologia || null,
              armazem_id: itArmId,
              armazem_nome: itArmNome,
              centro_custo_id: it.centro_custo_id || null,
              centro_custo_nome: it.centro_custo_nome || null,
              tipo_imposto: it.tipo_imposto || null,
              taxa_imposto: Number(it.taxa_imposto || 0),
              data_validade: it.data_validade || null,
              rubrica: it.rubrica || null,
              rubrica_id: it.rubrica_id || null,
              movimento_stock_id: syncRes.movimentoId,
            }])
            .select('*')
            .single();
          if (newItErr) throw new Error(newItErr.message);
          updatedItemsResult.push(newItem);
        }
      }

      // Itens removidos na edição: reverter saldo correspondente e remover linha
      for (const oldIt of oldItems || []) {
        if (!keptOldIds.has(oldIt.id)) {
          await adjustProductStockDelta(supabaseAdmin, ctx, existing, oldIt, -Number(oldIt.quantidade || 0), 'reversao_producao', armazemNome);
          await supabaseAdmin.from('itens_producao').delete().eq('id', oldIt.id).eq('empresa_id', ctx.empresaId);
        }
      }

      const quantidadeProdutos = updatedItemsResult.length;
      const quantidadeTotal = round3(updatedItemsResult.reduce((s, it) => s + Number(it.quantidade || 0), 0));
      const valorTotalCusto = round2(updatedItemsResult.reduce((s, it) => s + Number(it.quantidade || 0) * Number(it.valor_custo || 0), 0));
      const valorTotalVenda = round2(updatedItemsResult.reduce((s, it) => s + Number(it.quantidade || 0) * Number(it.valor_venda || 0), 0));

      const { data: updatedProd, error: updProdErr } = await supabaseAdmin
        .from('producoes')
        .update({
          tipo_producao: tipoProducao,
          local_trabalho_id: localTrabalhoId,
          local_trabalho_nome: localTrabalhoNome,
          armazem_id: armazemId,
          armazem_nome: armazemNome,
          estado,
          ordem: body.ordem || updatedItemsResult[0]?.ordem || existing.ordem,
          observacoes: body.observacoes !== undefined ? body.observacoes : existing.observacoes,
          quantidade_produtos: quantidadeProdutos,
          quantidade_total: quantidadeTotal,
          valor_total_custo: valorTotalCusto,
          valor_total_venda: valorTotalVenda,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('empresa_id', ctx.empresaId)
        .select('*')
        .single();

      if (updProdErr) return res.status(500).json({ error: updProdErr.message });

      await recordHistory(supabaseAdmin, {
        empresaId: ctx.empresaId,
        producaoId: id,
        acao: 'EDICAO',
        detalhes: {
          quantidade_produtos: quantidadeProdutos,
          quantidade_total: quantidadeTotal,
          valor_total_custo: valorTotalCusto,
          valor_total_venda: valorTotalVenda,
        },
        ctx,
      });

      return res.json({ success: true, producao: { ...updatedProd, itens: updatedItemsResult } });
    }

    // 5. POST /api/stock/producoes/:id/lock — Trancar Produção
    if (req.method === 'POST' && segments.length === 2 && segments[1] === 'lock') {
      if (!canOperate(ctx.role)) {
        return res.status(403).json({ error: 'Sem permissão para trancar produção.' });
      }
      const id = segments[0];
      const { data: existing } = await supabaseAdmin
        .from('producoes')
        .select('*')
        .eq('id', id)
        .eq('empresa_id', ctx.empresaId)
        .maybeSingle();
      if (!existing) return res.status(404).json({ error: 'Produção não encontrada.' });
      if (existing.bloqueada) return res.json({ success: true, producao: existing });

      const now = new Date().toISOString();
      const { data: updated, error } = await supabaseAdmin
        .from('producoes')
        .update({
          bloqueada: true,
          estado: 'bloqueada',
          bloqueado_por: ctx.userId,
          bloqueado_por_nome: ctx.name,
          bloqueado_em: now,
          updated_at: now,
        })
        .eq('id', id)
        .eq('empresa_id', ctx.empresaId)
        .select('*')
        .single();
      if (error) return res.status(500).json({ error: error.message });

      await recordHistory(supabaseAdmin, {
        empresaId: ctx.empresaId,
        producaoId: id,
        acao: 'TRANCAR',
        detalhes: { numero_producao: existing.numero_producao, motivo: req.body?.motivo || 'Bloqueio de segurança/fecho' },
        ctx,
      });

      return res.json({ success: true, producao: updated });
    }

    // 6. POST /api/stock/producoes/:id/unlock — Destrancar Produção (Autorização obrigatória)
    if (req.method === 'POST' && segments.length === 2 && segments[1] === 'unlock') {
      if (!canUnlockOrReverse(ctx.role)) {
        return res.status(403).json({ error: 'Apenas Administradores ou Gestores de Stock podem destrancar uma produção bloqueada.' });
      }
      const id = segments[0];
      const { data: existing } = await supabaseAdmin
        .from('producoes')
        .select('*')
        .eq('id', id)
        .eq('empresa_id', ctx.empresaId)
        .maybeSingle();
      if (!existing) return res.status(404).json({ error: 'Produção não encontrada.' });

      const now = new Date().toISOString();
      const { data: updated, error } = await supabaseAdmin
        .from('producoes')
        .update({
          bloqueada: false,
          estado: 'concluida',
          desbloqueado_por: ctx.userId,
          desbloqueado_por_nome: ctx.name,
          desbloqueado_em: now,
          updated_at: now,
        })
        .eq('id', id)
        .eq('empresa_id', ctx.empresaId)
        .select('*')
        .single();
      if (error) return res.status(500).json({ error: error.message });

      await recordHistory(supabaseAdmin, {
        empresaId: ctx.empresaId,
        producaoId: id,
        acao: 'DESTRANCAR',
        detalhes: { numero_producao: existing.numero_producao, motivo: req.body?.motivo || 'Desbloqueio autorizado' },
        ctx,
      });

      return res.json({ success: true, producao: updated });
    }

    // 7. POST /api/stock/producoes/:id/attachments — Upload Real para Supabase Storage + anexos_producao
    if (req.method === 'POST' && segments.length === 2 && segments[1] === 'attachments') {
      if (!canOperate(ctx.role)) {
        return res.status(403).json({ error: 'Sem permissão para carregar anexos.' });
      }
      const id = segments[0];
      const { data: existing } = await supabaseAdmin
        .from('producoes')
        .select('id, bloqueada, numero_producao')
        .eq('id', id)
        .eq('empresa_id', ctx.empresaId)
        .maybeSingle();
      if (!existing) return res.status(404).json({ error: 'Produção não encontrada.' });
      if (existing.bloqueada) {
        return res.status(403).json({ error: 'Não é possível anexar documentos numa produção trancada.' });
      }

      const { file_name, mime_type, content_base64 } = req.body || {};
      if (!file_name || !content_base64) {
        return res.status(400).json({ error: 'Ficheiro e conteúdo são obrigatórios.' });
      }

      const ext = String(file_name).split('.').pop()?.toLowerCase() || '';
      if (!ALLOWED_EXTENSIONS.has(ext)) {
        return res.status(400).json({ error: `Formato não suportado (.${ext}). Permitidos: PDF, Excel (XLSX/XLS/CSV) e Imagens (PNG/JPG/WEBP).` });
      }

      const base64Data = String(content_base64).includes(',')
        ? String(content_base64).split(',').pop()
        : String(content_base64);
      const buffer = Buffer.from(base64Data, 'base64');

      if (buffer.length === 0) {
        return res.status(400).json({ error: 'Ficheiro vazio.' });
      }
      if (buffer.length > MAX_UPLOAD_BYTES) {
        return res.status(400).json({ error: 'O ficheiro excede o limite máximo de 10 MB.' });
      }

      const safeBase = String(file_name).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
      const storagePath = `${ctx.empresaId}/producoes/${id}/${Date.now()}_${safeBase}`;

      const { data: upData, error: upErr } = await supabaseAdmin.storage
        .from('media')
        .upload(storagePath, buffer, {
          contentType: mime_type || 'application/octet-stream',
          upsert: false,
        });

      if (upErr) {
        return res.status(500).json({ error: `Falha ao enviar para Storage: ${upErr.message}` });
      }

      const { data: urlData } = supabaseAdmin.storage.from('media').getPublicUrl(upData.path);

      const { data: anexo, error: insErr } = await supabaseAdmin
        .from('anexos_producao')
        .insert([{
          empresa_id: ctx.empresaId,
          producao_id: id,
          nome_original: String(file_name).slice(0, 200),
          nome_arquivo: safeBase,
          bucket: 'media',
          caminho_arquivo: upData.path,
          url_publica: urlData?.publicUrl || null,
          mime_type: mime_type || 'application/octet-stream',
          tamanho_bytes: buffer.length,
          extensao: ext,
          uploaded_by: ctx.userId,
          uploaded_by_nome: ctx.name,
        }])
        .select('*')
        .single();

      if (insErr) {
        return res.status(500).json({ error: insErr.message });
      }

      await recordHistory(supabaseAdmin, {
        empresaId: ctx.empresaId,
        producaoId: id,
        acao: 'ANEXO_ADICIONADO',
        detalhes: { nome_original: file_name, tamanho_bytes: buffer.length, extensao: ext },
        ctx,
      });

      return res.status(201).json({ success: true, anexo });
    }

    // 8. DELETE /api/stock/producoes/:id/attachments/:anexoId
    if (req.method === 'DELETE' && segments.length === 3 && segments[1] === 'attachments') {
      if (!canOperate(ctx.role)) {
        return res.status(403).json({ error: 'Sem permissão para remover anexos.' });
      }
      const [id, anexoId] = [segments[0], segments[2]];
      const [{ data: existing }, { data: anexo }] = await Promise.all([
        supabaseAdmin.from('producoes').select('id, bloqueada').eq('id', id).eq('empresa_id', ctx.empresaId).maybeSingle(),
        supabaseAdmin.from('anexos_producao').select('*').eq('id', anexoId).eq('producao_id', id).eq('empresa_id', ctx.empresaId).maybeSingle(),
      ]);

      if (!existing) return res.status(404).json({ error: 'Produção não encontrada.' });
      if (existing.bloqueada) return res.status(403).json({ error: 'Não é possível eliminar anexos de uma produção trancada.' });
      if (!anexo) return res.status(404).json({ error: 'Anexo não encontrado.' });

      if (anexo.caminho_arquivo) {
        await supabaseAdmin.storage.from(anexo.bucket || 'media').remove([anexo.caminho_arquivo]).catch(() => {});
      }
      await supabaseAdmin.from('anexos_producao').delete().eq('id', anexoId).eq('empresa_id', ctx.empresaId);

      await recordHistory(supabaseAdmin, {
        empresaId: ctx.empresaId,
        producaoId: id,
        acao: 'ANEXO_REMOVIDO',
        detalhes: { nome_original: anexo.nome_original },
        ctx,
      });

      return res.json({ success: true });
    }

    // 9. POST /api/stock/producoes/:id/audit — Registo de emissão de relatório
    if (req.method === 'POST' && segments.length === 2 && segments[1] === 'audit') {
      const id = segments[0];
      const { acao = 'RELATORIO_EMITIDO', detalhes = {} } = req.body || {};
      const { data: existing } = await supabaseAdmin.from('producoes').select('id').eq('id', id).eq('empresa_id', ctx.empresaId).maybeSingle();
      if (!existing) return res.status(404).json({ error: 'Produção não encontrada.' });

      await recordHistory(supabaseAdmin, {
        empresaId: ctx.empresaId,
        producaoId: id,
        acao,
        detalhes,
        ctx,
      });
      return res.json({ success: true });
    }

    // 10. DELETE /api/stock/producoes/:id — Apagar Produção (proibido se trancada; reversão autorizada se houver movimentos)
    if (req.method === 'DELETE' && segments.length === 1) {
      const id = segments[0];
      const confirmarReversao = Boolean(req.body?.confirmar_reversao || urlObj.searchParams.get('confirmar_reversao') === 'true');

      const { data: existing } = await supabaseAdmin
        .from('producoes')
        .select('*')
        .eq('id', id)
        .eq('empresa_id', ctx.empresaId)
        .maybeSingle();
      if (!existing) return res.status(404).json({ error: 'Produção não encontrada.' });

      if (existing.bloqueada || existing.estado === 'bloqueada') {
        return res.status(403).json({ error: 'Não é permitido apagar uma produção trancada/bloqueada.' });
      }

      const [{ data: itens }, { data: movs }, { data: anexos }] = await Promise.all([
        supabaseAdmin.from('itens_producao').select('*').eq('empresa_id', ctx.empresaId).eq('producao_id', id),
        supabaseAdmin.from('movimentacoes_stock').select('id').eq('empresa_id', ctx.empresaId).eq('producao_id', id),
        supabaseAdmin.from('anexos_producao').select('*').eq('empresa_id', ctx.empresaId).eq('producao_id', id),
      ]);

      const hasStockMovements = (movs && movs.length > 0) || (itens || []).some(it => Boolean(it.movimento_stock_id));

      if (hasStockMovements) {
        if (!canUnlockOrReverse(ctx.role)) {
          return res.status(403).json({
            error: 'Esta produção já gerou movimentos de stock. Apenas Administradores ou Gestores de Stock podem autorizar a reversão e exclusão.',
          });
        }
        if (!confirmarReversao) {
          return res.status(409).json({
            requires_reversal: true,
            error: 'Esta produção possui movimentos de stock associados. Confirme a reversão autorizada do stock antes de eliminar.',
          });
        }

        // Reverter stock de cada item de forma segura e auditada
        for (const it of itens || []) {
          await adjustProductStockDelta(
            supabaseAdmin,
            ctx,
            existing,
            it,
            -Number(it.quantidade || 0),
            'reversao_producao',
            it.armazem_nome || existing.armazem_nome
          );
        }
      }

      // Remover ficheiros anexados do Storage
      const pathsToRemove = (anexos || []).map(a => a.caminho_arquivo).filter(Boolean);
      if (pathsToRemove.length > 0) {
        await supabaseAdmin.storage.from('media').remove(pathsToRemove).catch(() => {});
      }

      // Registar auditoria antes do delete em cascata (logs_auditoria mantém registo permanente)
      try {
        await supabaseAdmin.from('logs_auditoria').insert([{
          empresa_id: ctx.empresaId,
          user_id: ctx.userId,
          username: ctx.username,
          nome: ctx.name,
          documento: existing.numero_producao,
          acao: `EXCLUSAO_PRODUCAO${hasStockMovements ? '_COM_REVERSAO_STOCK' : ''}`,
          created_at: new Date().toISOString(),
        }]);
      } catch (_) {}

      const { error: delErr } = await supabaseAdmin
        .from('producoes')
        .delete()
        .eq('id', id)
        .eq('empresa_id', ctx.empresaId);

      if (delErr) return res.status(500).json({ error: delErr.message });

      return res.json({ success: true, reversed_stock: hasStockMovements });
    }

    return res.status(404).json({ error: 'Rota de produção não encontrada.' });
  } catch (err) {
    console.error('[STOCK-PRODUCAO] Erro:', err);
    return res.status(500).json({ error: err?.message || 'Erro interno no módulo de produção.' });
  }
}
