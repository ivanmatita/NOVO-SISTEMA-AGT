/**
 * api/_handlers/stock-agents.js
 * Equipa Multiagente de IA para Gestão de Stock (IMATEC ERP)
 * Powered server-side by @google/genai (gemini-4-hydrogen)
 *
 * 9 Agentes Especializados:
 * 1. STOCK MANAGER AI
 * 2. STOCK ANALYST
 * 3. SMART PURCHASING AGENT
 * 4. STOCK ALERT AGENT
 * 5. PREDICTIVE STOCK AGENT
 * 6. EXPIRY CONTROL AGENT
 * 7. STOCK AUDITOR AGENT
 * 8. INVENTORY AGENT
 * 9. REPORTING AGENT
 */

import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI, Type } from '@google/genai';
import { getEnvConfig } from '../_env.js';

export const STOCK_AGENTS_CATALOG = [
  {
    id: 'STOCK MANAGER AI',
    role: 'Orquestrador Central de Stock',
    focus: 'Coordena a equipa de agentes, prioriza decisões operacionais e responde em linguagem natural ao gestor.',
  },
  {
    id: 'STOCK ANALYST',
    role: 'Analista de Rotatividade & Margens',
    focus: 'Avalia artigos com maior e menor saída, curvas ABC, imobilização financeira e rentabilidade.',
  },
  {
    id: 'SMART PURCHASING AGENT',
    role: 'Agente de Compras Inteligentes',
    focus: 'Sugere reposições e quantidades ideais com base no stock mínimo, máximo, procura e histórico.',
  },
  {
    id: 'STOCK ALERT AGENT',
    role: 'Vigilante de Rupturas & Excesso',
    focus: 'Monitoriza produtos esgotados, abaixo do mínimo ou com excesso de stock imobilizado.',
  },
  {
    id: 'PREDICTIVE STOCK AGENT',
    role: 'Previsão de Procura & Ruptura',
    focus: 'Calcula velocidade média diária de saída e estima dias até rutura de stock.',
  },
  {
    id: 'EXPIRY CONTROL AGENT',
    role: 'Controlo de Lotes & Validades',
    focus: 'Identifica lotes próximos de expirar ou expirados e sugere ação preventiva FEFO.',
  },
  {
    id: 'STOCK AUDITOR AGENT',
    role: 'Auditor de Inconsistências',
    focus: 'Audita divergências entre saldo de produto, somatório por armazém e movimentos registados.',
  },
  {
    id: 'INVENTORY AGENT',
    role: 'Especialista em Inventário Físico',
    focus: 'Analisa diferenças de contagem física vs sistema e recomenda contagens cíclicas prioritárias.',
  },
  {
    id: 'REPORTING AGENT',
    role: 'Síntese Executiva & Relatórios',
    focus: 'Redige sumários executivos de entradas, saídas, valorização e indicadores para a direção.',
  },
];

function getAdminForRequest(req) {
  const cfg = getEnvConfig(req);
  return createClient(cfg.supabaseUrl, cfg.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !String(apiKey).trim()) {
    const err = new Error('Chave GEMINI_API_KEY não configurada no servidor.');
    err.code = 'MISSING_GEMINI_KEY';
    throw err;
  }
  return new GoogleGenAI({
    apiKey: String(apiKey).trim(),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
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
  if (!authRes.ok) return { error: 'Sessão inválida ou expirada.', status: 401 };

  const user = await authRes.json();
  if (!user?.id) return { error: 'Utilizador não autenticado.', status: 401 };

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

  if (!empresaId) return { error: 'Empresa não associada à conta autenticada.', status: 403 };

  let role = String(perfil?.role || (ownedCompany ? 'admin' : 'operador')).toLowerCase().trim();
  if (perfil?.is_admin || ownedCompany) role = 'admin';

  return {
    userId: user.id,
    email: user.email,
    name: perfil?.nome || perfil?.name || user.user_metadata?.full_name || user.email,
    empresaId: String(empresaId),
    role,
  };
}

function canRunAgents(role) {
  return ['admin', 'superadmin', 'super_admin', 'gestor_stock', 'gestor', 'manager', 'operador', 'auditor'].includes(role);
}

function canConfirmActions(role) {
  return ['admin', 'superadmin', 'super_admin', 'gestor_stock', 'gestor', 'manager'].includes(role);
}

async function buildTenantStockSnapshot(supabaseAdmin, empresaId) {
  const [prodRes, movRes, saldoRes, loteRes, alertRes, invRes, ocRes, whRes, fornRes, cfgRes] = await Promise.all([
    supabaseAdmin.from('produtos').select('*').eq('empresa_id', empresaId).limit(400),
    supabaseAdmin.from('movimentacoes_stock').select('*').eq('empresa_id', empresaId).order('created_at', { ascending: false }).limit(300),
    supabaseAdmin.from('stock_saldos').select('*').eq('empresa_id', empresaId),
    supabaseAdmin.from('stock_lotes').select('*').eq('empresa_id', empresaId),
    supabaseAdmin.from('stock_alertas').select('*').eq('empresa_id', empresaId).eq('estado', 'ativo'),
    supabaseAdmin.from('stock_inventarios').select('*').eq('empresa_id', empresaId).order('created_at', { ascending: false }).limit(20),
    supabaseAdmin.from('stock_ordens_compra').select('*').eq('empresa_id', empresaId).order('created_at', { ascending: false }).limit(30),
    supabaseAdmin.from('armazens').select('*').eq('empresa_id', empresaId),
    supabaseAdmin.from('fornecedores').select('id, name, nome, nif, telefone, email').eq('empresa_id', empresaId).limit(100),
    supabaseAdmin.from('stock_configuracoes').select('*').eq('empresa_id', empresaId).maybeSingle(),
  ]);

  const allProducts = Array.isArray(prodRes.data) ? prodRes.data : [];
  const physicalProducts = allProducts.filter((p) => !String(p.tipo || '').toLowerCase().includes('serv'));
  const movements = Array.isArray(movRes.data) ? movRes.data : [];
  const saldos = Array.isArray(saldoRes.data) ? saldoRes.data : [];
  const lotes = Array.isArray(loteRes.data) ? loteRes.data : [];
  const alertas = Array.isArray(alertRes.data) ? alertRes.data : [];
  const inventarios = Array.isArray(invRes.data) ? invRes.data : [];
  const ordensCompra = Array.isArray(ocRes.data) ? ocRes.data : [];
  const warehouses = Array.isArray(whRes.data) ? whRes.data : [];
  const fornecedores = Array.isArray(fornRes.data) ? fornRes.data : [];

  const now = Date.now();
  const daysExpiry = Number(cfgRes.data?.dias_alerta_validade || 30);
  const daysNoMove = Number(cfgRes.data?.dias_sem_movimento || 60);

  const productMetrics = physicalProducts.map((p) => {
    const qty = Number(p.stock_quantity ?? p.stock ?? p.stock_atual ?? 0);
    const min = Number(p.min_stock ?? p.stock_minimo ?? 0);
    const max = Number(p.stock_maximo ?? 0);
    const cost = Number(p.cost_price ?? p.preco_compra ?? 0);
    const price = Number(p.price ?? p.preco_venda ?? 0);
    const pMovs = movements.filter((m) => String(m.product_id) === String(p.id));
    const exit30 = pMovs
      .filter((m) => ['exit', 'saida'].includes(String(m.type || '').toLowerCase()) && now - new Date(m.created_at).getTime() <= 30 * 86400000)
      .reduce((acc, m) => acc + Number(m.quantity || 0), 0);
    const entry30 = pMovs
      .filter((m) => ['entry', 'entrada'].includes(String(m.type || '').toLowerCase()) && now - new Date(m.created_at).getTime() <= 30 * 86400000)
      .reduce((acc, m) => acc + Number(m.quantity || 0), 0);
    const lastMoveAt = pMovs[0]?.created_at || p.updated_at || p.created_at;
    const daysIdle = lastMoveAt ? Math.floor((now - new Date(lastMoveAt).getTime()) / 86400000) : 999;
    const dailyVelocity = exit30 / 30;
    const estimatedDaysToStockout = dailyVelocity > 0 ? Math.round((qty / dailyVelocity) * 10) / 10 : null;
    const sumSaldos = saldos
      .filter((s) => String(s.product_id) === String(p.id))
      .reduce((acc, s) => acc + Number(s.quantidade_disponivel || 0), 0);

    return {
      id: p.id,
      name: p.name || p.nome,
      sku: p.sku || p.referente || p.barcode || '',
      category: p.category || p.categoria || 'Geral',
      qty,
      min,
      max,
      cost,
      price,
      inventory_value_cost: Math.round(qty * cost * 100) / 100,
      entry30,
      exit30,
      daily_velocity: Math.round(dailyVelocity * 100) / 100,
      estimated_days_to_stockout: estimatedDaysToStockout,
      days_idle: daysIdle,
      warehouse_balance_sum: sumSaldos,
      balance_mismatch: saldos.some((s) => String(s.product_id) === String(p.id)) && Math.abs(qty - sumSaldos) > 0.01,
      data_validade: p.data_validade || null,
    };
  });

  const expiringLots = lotes
    .filter((l) => l.data_validade && Number(l.quantidade_atual || 0) > 0)
    .map((l) => {
      const daysLeft = Math.ceil((new Date(l.data_validade).getTime() - now) / 86400000);
      return {
        id: l.id,
        product_id: l.product_id,
        numero_lote: l.numero_lote || l.numero_serie,
        data_validade: l.data_validade,
        quantidade_atual: l.quantidade_atual,
        days_left: daysLeft,
      };
    })
    .filter((l) => l.days_left <= daysExpiry)
    .slice(0, 25);

  const summary = {
    total_products: productMetrics.length,
    total_units: productMetrics.reduce((s, p) => s + Math.max(0, p.qty), 0),
    total_cost_value_kz: Math.round(productMetrics.reduce((s, p) => s + Math.max(0, p.inventory_value_cost), 0) * 100) / 100,
    out_of_stock_count: productMetrics.filter((p) => p.qty <= 0).length,
    critical_stock_count: productMetrics.filter((p) => p.qty > 0 && p.min > 0 && p.qty <= p.min).length,
    stagnant_count: productMetrics.filter((p) => p.qty > 0 && p.days_idle >= daysNoMove).length,
    mismatch_count: productMetrics.filter((p) => p.balance_mismatch).length,
    expiring_lots_count: expiringLots.length,
    active_alerts_count: alertas.length,
    pending_inventories_count: inventarios.filter((i) => i.estado !== 'reconciliado' && i.estado !== 'cancelado').length,
    open_purchase_orders_count: ordensCompra.filter((o) => !['recebida', 'cancelada'].includes(o.estado)).length,
    warehouses_count: warehouses.length,
    suppliers_count: fornecedores.length,
  };

  return {
    summary,
    warehouses: warehouses.map((w) => ({ id: w.id, name: w.name || w.nome })),
    suppliers: fornecedores.slice(0, 30),
    critical_products: productMetrics.filter((p) => p.qty <= 0 || (p.min > 0 && p.qty <= p.min)).slice(0, 40),
    top_moved: [...productMetrics].sort((a, b) => b.exit30 + b.entry30 - (a.exit30 + a.entry30)).slice(0, 20),
    stagnant_products: productMetrics.filter((p) => p.qty > 0 && p.days_idle >= daysNoMove).slice(0, 25),
    mismatches: productMetrics.filter((p) => p.balance_mismatch).slice(0, 20),
    expiring_lots: expiringLots,
    inventories: inventarios.slice(0, 10),
    recent_movements: movements.slice(0, 30).map((m) => ({
      date: m.created_at,
      product_name: m.product_name || m.description,
      type: m.type,
      quantity: m.quantity,
      unit_price: m.custo_unitario || m.unit_price,
    })),
  };
}

export default async function stockAgentsHandler(req, res) {
  const supabaseAdmin = getAdminForRequest(req);
  const urlPath = (req.originalUrl || req.url || '').split('?')[0];

  try {
    const ctx = await resolveAuthContext(req, supabaseAdmin);
    if (ctx.error) return res.status(ctx.status || 401).json({ error: ctx.error });

    // GET /api/stock/agents — lista de agentes e histórico recente
    if (req.method === 'GET') {
      const { data: logs } = await supabaseAdmin
        .from('agentes_ia_atividades')
        .select('*')
        .eq('empresa_id', ctx.empresaId)
        .order('created_at', { ascending: false })
        .limit(80);
      return res.status(200).json({ agents: STOCK_AGENTS_CATALOG, atividades: logs || [] });
    }

    // 1. POST /api/stock/agents/run — Executa 1 agente ou toda a equipa dos 9 agentes com Gemini
    if (req.method === 'POST' && urlPath.endsWith('/run')) {
      if (!canRunAgents(ctx.role)) {
        return res.status(403).json({ error: 'Perfil Consulta não pode executar agentes IA.' });
      }

      const targetAgent = String(req.body?.agent_name || 'all').trim();
      const targets = targetAgent === 'all'
        ? STOCK_AGENTS_CATALOG
        : STOCK_AGENTS_CATALOG.filter((a) => a.id === targetAgent);

      if (!targets.length) {
        return res.status(400).json({ error: `Agente desconhecido: ${targetAgent}` });
      }

      let ai;
      try {
        ai = getGeminiClient();
      } catch (keyErr) {
        await supabaseAdmin.from('agentes_ia_atividades').insert([{
          empresa_id: ctx.empresaId,
          agente_nome: targetAgent === 'all' ? 'STOCK MANAGER AI' : targetAgent,
          tipo_evento: 'erro',
          titulo: 'Falha de configuração do modelo IA',
          resumo: keyErr.message,
          severidade: 'critico',
          requer_confirmacao: false,
          estado_confirmacao: 'n/a',
        }]);
        return res.status(503).json({ error: keyErr.message });
      }

      const snapshot = await buildTenantStockSnapshot(supabaseAdmin, ctx.empresaId);

      const prompt = `Você é a equipa multiagente de Gestão de Stock do IMATEC ERP em Angola (moeda Kz).
Analise os dados REAIS abaixo da empresa (NUNCA invente produtos, IDs ou números fora dos dados fornecidos) e gere um relatório estruturado para CADA agente pedido nesta lista:
${targets.map((t) => `- ${t.id} (${t.role}): ${t.focus}`).join('\n')}

DADOS REAIS DO STOCK DA EMPRESA:
${JSON.stringify(snapshot)}

Regras estritas:
1. Baseie cada conclusão apenas nos dados JSON fornecidos acima. Se houver 0 ocorrências num domínio (ex: 0 lotes a expirar), declare claramente que está conforme e saudável.
2. Para o agente SMART PURCHASING AGENT, se houver critical_products (qty <= min ou qty <= 0), pode propor uma ação sugerida de tipo "criar_requisicao_compra" com os product_id reais e quantidades recomendadas (requer_confirmacao=true). Nunca execute ações automaticamente.
3. Para STOCK AUDITOR AGENT, se houver mismatches, proponha "auditar_saldos" com requer_confirmacao=true.
4. Responda estritamente em Português (Angola/Portugal) técnico, claro e objetivo.`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          systemInstruction: 'Responde estritamente com JSON válido seguindo o schema solicitado, sem markdown nem texto fora do JSON.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reports: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    agente_nome: { type: Type.STRING },
                    tipo_evento: { type: Type.STRING, description: 'analise | alerta | recomendacao' },
                    titulo: { type: Type.STRING },
                    resumo: { type: Type.STRING },
                    severidade: { type: Type.STRING, description: 'info | aviso | critico | sucesso' },
                    requer_confirmacao: { type: Type.BOOLEAN },
                    acao_sugerida: {
                      type: Type.OBJECT,
                      properties: {
                        tipo: { type: Type.STRING, description: 'criar_requisicao_compra | auditar_saldos | contagem_ciclica | nenhuma' },
                        justificativa: { type: Type.STRING },
                        itens: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              product_id: { type: Type.STRING },
                              product_name: { type: Type.STRING },
                              quantidade: { type: Type.NUMBER },
                              custo_unitario: { type: Type.NUMBER },
                            },
                          },
                        },
                      },
                    },
                    metricas_chave: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                  },
                },
              },
            },
          },
        },
      });

      const rawText = (response.text || '{}').trim();
      let parsed;
      try {
        parsed = JSON.parse(rawText);
      } catch (parseErr) {
        return res.status(502).json({ error: 'Resposta inválida do modelo Gemini.', detail: rawText.slice(0, 300) });
      }

      const reports = Array.isArray(parsed?.reports) ? parsed.reports : [];
      const rowsToInsert = reports.map((r) => {
        const hasAction = Boolean(
          r.requer_confirmacao &&
          r.acao_sugerida?.tipo &&
          r.acao_sugerida.tipo !== 'nenhuma' &&
          (r.acao_sugerida.tipo !== 'criar_requisicao_compra' || (r.acao_sugerida.itens || []).length > 0)
        );
        const validSev = ['info', 'aviso', 'critico', 'sucesso'].includes(r.severidade) ? r.severidade : 'info';
        const validEvt = ['analise', 'alerta', 'recomendacao'].includes(r.tipo_evento) ? r.tipo_evento : 'analise';
        return {
          empresa_id: ctx.empresaId,
          agente_nome: r.agente_nome || targets[0].id,
          tipo_evento: validEvt,
          titulo: String(r.titulo || 'Análise de Stock').slice(0, 200),
          resumo: String(r.resumo || ''),
          detalhes: {
            metricas_chave: r.metricas_chave || [],
            snapshot_summary: snapshot.summary,
          },
          severidade: validSev,
          requer_confirmacao: hasAction,
          estado_confirmacao: hasAction ? 'pendente' : 'n/a',
          acao_sugerida: hasAction ? r.acao_sugerida : null,
          created_at: new Date().toISOString(),
        };
      });

      let inserted = [];
      if (rowsToInsert.length > 0) {
        const { data: insData, error: insErr } = await supabaseAdmin
          .from('agentes_ia_atividades')
          .insert(rowsToInsert)
          .select('*');
        if (insErr) throw insErr;
        inserted = insData || [];
      }

      return res.status(200).json({
        success: true,
        executed_agents: targets.length,
        atividades: inserted,
      });
    }

    // 2. POST /api/stock/agents/chat — Conversar com o STOCK MANAGER AI sobre os dados reais
    if (req.method === 'POST' && urlPath.endsWith('/chat')) {
      if (!canRunAgents(ctx.role)) {
        return res.status(403).json({ error: 'Perfil sem permissão para consultar o assistente de stock.' });
      }
      const message = String(req.body?.message || '').trim();
      if (!message) return res.status(400).json({ error: 'Mensagem obrigatória.' });

      const ai = getGeminiClient();
      const snapshot = await buildTenantStockSnapshot(supabaseAdmin, ctx.empresaId);

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Pergunta do utilizador (${ctx.name}): "${message}"

DADOS REAIS DO STOCK DA EMPRESA:
${JSON.stringify(snapshot)}`,
        config: {
          systemInstruction:
            'Você é o STOCK MANAGER AI do IMATEC ERP. Responda em Português objetivo com números exatos dos dados fornecidos. Nunca invente valores que não existam nos dados. Se não houver stock crítico ou movimentos, informe com clareza.',
        },
      });

      const reply = (response.text || '').trim();
      await supabaseAdmin.from('agentes_ia_atividades').insert([{
        empresa_id: ctx.empresaId,
        agente_nome: 'STOCK MANAGER AI',
        tipo_evento: 'chat',
        titulo: `Consulta: ${message.slice(0, 110)}`,
        resumo: reply,
        detalhes: { pergunta: message, user_id: ctx.userId, user_name: ctx.name },
        severidade: 'info',
        requer_confirmacao: false,
        estado_confirmacao: 'n/a',
        created_at: new Date().toISOString(),
      }]);

      return res.status(200).json({ success: true, reply });
    }

    // 3. POST /api/stock/agents/confirm — Aprovar ou Rejeitar sugestão de agente (Human-in-the-loop)
    if (req.method === 'POST' && urlPath.endsWith('/confirm')) {
      if (!canConfirmActions(ctx.role)) {
        return res.status(403).json({ error: 'Apenas Administrador ou Gestor de Stock pode aprovar sugestões da IA.' });
      }

      const { atividade_id, decisao } = req.body || {};
      if (!atividade_id || !['aprovado', 'rejeitado'].includes(decisao)) {
        return res.status(400).json({ error: 'atividade_id e decisao (aprovado|rejeitado) obrigatórios.' });
      }

      const { data: act } = await supabaseAdmin
        .from('agentes_ia_atividades')
        .select('*')
        .eq('id', atividade_id)
        .eq('empresa_id', ctx.empresaId)
        .single();

      if (!act) return res.status(404).json({ error: 'Recomendação não encontrada.' });
      if (act.estado_confirmacao !== 'pendente') {
        return res.status(409).json({ error: `Esta recomendação já foi processada (${act.estado_confirmacao}).` });
      }

      let createdOrder = null;
      if (decisao === 'aprovado' && act.acao_sugerida?.tipo === 'criar_requisicao_compra') {
        const rawItems = Array.isArray(act.acao_sugerida.itens) ? act.acao_sugerida.itens : [];
        const cleanItems = rawItems
          .filter((i) => Number(i.quantidade || 0) > 0)
          .map((i) => {
            const q = Number(i.quantidade || 1);
            const c = Number(i.custo_unitario || 0);
            return {
              product_id: i.product_id || null,
              product_name: i.product_name || 'Produto',
              quantidade: q,
              custo_unitario: c,
              total: Math.round(q * c * 100) / 100,
            };
          });

        if (cleanItems.length > 0) {
          const subtotal = cleanItems.reduce((s, it) => s + it.total, 0);
          const { data: orderData, error: orderErr } = await supabaseAdmin
            .from('stock_ordens_compra')
            .insert([{
              empresa_id: ctx.empresaId,
              codigo: `REQ-IA-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`,
              tipo: 'requisicao',
              estado: 'aprovada',
              prioridade: 'alta',
              origem: 'agente_ia',
              itens: cleanItems,
              subtotal,
              imposto: 0,
              total: subtotal,
              observacoes: `Gerada por ${act.agente_nome}: ${act.acao_sugerida.justificativa || act.titulo}`,
              solicitado_por: ctx.userId,
              solicitado_por_nome: `${act.agente_nome} (Aprovado por ${ctx.name})`,
              aprovado_por: ctx.userId,
              aprovado_por_nome: ctx.name,
              aprovado_em: new Date().toISOString(),
              created_at: new Date().toISOString(),
            }])
            .select('*')
            .single();

          if (orderErr) throw orderErr;
          createdOrder = orderData;
        }
      }

      const { error: updErr } = await supabaseAdmin
        .from('agentes_ia_atividades')
        .update({
          estado_confirmacao: decisao,
          executado_por: ctx.userId,
          executado_por_nome: ctx.name,
          executado_em: new Date().toISOString(),
        })
        .eq('id', atividade_id)
        .eq('empresa_id', ctx.empresaId);

      if (updErr) throw updErr;

      await supabaseAdmin.from('agentes_ia_atividades').insert([{
        empresa_id: ctx.empresaId,
        agente_nome: act.agente_nome,
        tipo_evento: 'decisao_humana',
        titulo: `Decisão Humana (${decisao.toUpperCase()}): ${act.titulo}`,
        resumo: createdOrder
          ? `Requisição de compra ${createdOrder.codigo} criada após aprovação de ${ctx.name}.`
          : `Sugestão marcada como ${decisao} por ${ctx.name}.`,
        severidade: decisao === 'aprovado' ? 'sucesso' : 'info',
        requer_confirmacao: false,
        estado_confirmacao: 'n/a',
        executado_por: ctx.userId,
        executado_por_nome: ctx.name,
        executado_em: new Date().toISOString(),
        created_at: new Date().toISOString(),
      }]);

      return res.status(200).json({ success: true, decisao, created_order: createdOrder });
    }

    return res.status(404).json({ error: 'Rota de agentes de stock não encontrada.' });
  } catch (err) {
    console.error('[stock-agents] Erro:', err);
    const statusCode = err?.status || (err?.code === 'MISSING_GEMINI_KEY' ? 503 : 500);
    return res.status(statusCode).json({
      error: err?.message || 'Erro interno nos agentes de stock.',
    });
  }
}
