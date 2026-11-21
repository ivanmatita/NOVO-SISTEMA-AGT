import { supabase } from '../lib/supabase';
import { fetchWithAuth } from '../lib/fetchWithAuth';
import type {
  Product,
  StockAgentActivity,
  StockAlert,
  StockBalance,
  StockCategory,
  StockInventory,
  StockInventoryItem,
  StockLot,
  StockMovement,
  StockPurchaseOrder,
  StockSettings,
  StockTransfer,
  UnitOfMeasure,
  Warehouse,
} from '../types';

export interface StockOverviewData {
  empresa_id: string;
  saldos: StockBalance[];
  categorias: StockCategory[];
  unidades: UnitOfMeasure[];
  lotes: StockLot[];
  transferencias: StockTransfer[];
  inventarios: StockInventory[];
  inventario_itens: StockInventoryItem[];
  ordens_compra: StockPurchaseOrder[];
  alertas: StockAlert[];
  configuracoes: StockSettings;
  agentes_atividades: StockAgentActivity[];
}

export interface MovementCalculationRow {
  product_id: string;
  product_name: string;
  sku: string;
  category: string;
  unit: string;
  warehouse_name: string;
  qtd_inicial: number;
  qtd_entradas: number;
  qtd_saidas: number;
  qtd_ajustes_pos: number;
  qtd_ajustes_neg: number;
  qtd_perdas: number;
  qtd_devolucoes: number;
  qtd_transf_in: number;
  qtd_transf_out: number;
  saldo_atual: number;
  reservado: number;
  disponivel: number;
  custo_unitario: number;
  custo_medio_cmp: number;
  preco_venda: number;
  valor_entradas: number;
  valor_saidas: number;
  valor_stock_custo: number;
  valor_stock_venda: number;
  margem_potencial: number;
}

export function isInboundMovement(m: StockMovement): boolean {
  const t = String(m.type || '').toLowerCase();
  const sub = String(m.subtipo || '').toLowerCase();
  if (t === 'entry' || t === 'entrada' || t === 'adjustment_plus') return true;
  if (t === 'return' && sub !== 'devolucao_fornecedor') return true;
  if (t === 'transfer' && sub === 'transferencia_entrada') return true;
  if (t === 'adjustment' && Number(m.current_stock || 0) >= Number(m.previous_stock || 0)) return true;
  return false;
}

export function isOutboundMovement(m: StockMovement): boolean {
  const t = String(m.type || '').toLowerCase();
  const sub = String(m.subtipo || '').toLowerCase();
  if (t === 'exit' || t === 'saida' || t === 'adjustment_minus' || t === 'loss') return true;
  if (t === 'return' && sub === 'devolucao_fornecedor') return true;
  if (t === 'transfer' && (sub === 'transferencia_saida' || !sub)) return true;
  if (t === 'adjustment' && Number(m.current_stock || 0) < Number(m.previous_stock || 0)) return true;
  return false;
}

export function computeProductMovementBreakdown(
  products: Product[],
  movements: StockMovement[],
  warehouses: Warehouse[],
  saldos: StockBalance[],
  filters?: { warehouseId?: string; category?: string; startDate?: string; endDate?: string; search?: string }
): MovementCalculationRow[] {
  const startMs = filters?.startDate ? new Date(`${filters.startDate}T00:00:00`).getTime() : null;
  const endMs = filters?.endDate ? new Date(`${filters.endDate}T23:59:59.999`).getTime() : null;
  const whFilter = filters?.warehouseId && filters.warehouseId !== 'all' ? String(filters.warehouseId) : null;
  const catFilter = filters?.category && filters.category !== 'all' ? String(filters.category).toLowerCase() : null;
  const search = (filters?.search || '').toLowerCase().trim();

  return products
    .filter((p) => {
      if (String(p.tipo || '').toLowerCase().includes('serv')) return false;
      if (whFilter) {
        const prodWh = String(p.armazem_id || p.warehouse_id || '');
        const hasSaldo = saldos.some((s) => String(s.product_id) === String(p.id) && String(s.armazem_id) === whFilter);
        if (prodWh !== whFilter && !hasSaldo) return false;
      }
      if (catFilter) {
        const pCat = String(p.category || p.categoria || '').toLowerCase();
        if (pCat !== catFilter) return false;
      }
      if (search) {
        const text = `${p.name || ''} ${p.nome || ''} ${p.sku || ''} ${p.referente || ''} ${p.barcode || ''}`.toLowerCase();
        if (!text.includes(search)) return false;
      }
      return true;
    })
    .map((p) => {
      const pid = String(p.id);
      const prodMovsAll = movements
        .filter((m) => String(m.product_id) === pid)
        .filter((m) => {
          if (!whFilter) return true;
          return (
            String(m.armazem_id || m.warehouse_id || '') === whFilter ||
            String(m.to_warehouse_id || m.armazem_destino_id || '') === whFilter
          );
        })
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      const prodMovsPeriod = prodMovsAll.filter((m) => {
        const ts = new Date(m.created_at).getTime();
        if (startMs && ts < startMs) return false;
        if (endMs && ts > endMs) return false;
        return true;
      });

      let qtdEntradas = 0;
      let valEntradas = 0;
      let qtdSaidas = 0;
      let valSaidas = 0;
      let qtdAdjPos = 0;
      let qtdAdjNeg = 0;
      let qtdPerdas = 0;
      let qtdDevolucoes = 0;
      let qtdTransfIn = 0;
      let qtdTransfOut = 0;

      for (const m of prodMovsPeriod) {
        const q = Number(m.quantity || 0);
        const unitP = Number(m.custo_unitario || m.unit_price || p.cost_price || 0);
        const lineVal = Number(m.valor_total || q * unitP);
        const t = String(m.type || '').toLowerCase();
        const sub = String(m.subtipo || '').toLowerCase();

        if (t === 'entry' || t === 'entrada') {
          qtdEntradas += q;
          valEntradas += lineVal;
        } else if (t === 'exit' || t === 'saida') {
          qtdSaidas += q;
          valSaidas += lineVal;
        } else if (t === 'adjustment_plus') {
          qtdAdjPos += q;
          valEntradas += lineVal;
        } else if (t === 'adjustment_minus') {
          qtdAdjNeg += q;
          valSaidas += lineVal;
        } else if (t === 'loss') {
          qtdPerdas += q;
          valSaidas += lineVal;
        } else if (t === 'return') {
          qtdDevolucoes += q;
          if (sub === 'devolucao_fornecedor') valSaidas += lineVal;
          else valEntradas += lineVal;
        } else if (t === 'transfer') {
          if (sub === 'transferencia_entrada' || (whFilter && String(m.to_warehouse_id || m.armazem_destino_id) === whFilter)) {
            qtdTransfIn += q;
          } else {
            qtdTransfOut += q;
          }
        }
      }

      const saldoWarehouse = whFilter
        ? saldos.find((s) => String(s.product_id) === pid && String(s.armazem_id) === whFilter)
        : null;

      const saldoAtual = saldoWarehouse
        ? Number(saldoWarehouse.quantidade_disponivel || 0)
        : Number(p.stock_quantity ?? p.stock ?? p.stock_atual ?? 0);
      const reservado = saldoWarehouse
        ? Number(saldoWarehouse.quantidade_reservada || 0)
        : Number(p.stock_reservado || 0);
      const disponivel = Math.max(0, Math.round((saldoAtual - reservado) * 1000) / 1000);

      // Stock inicial calculado por retrocesso a partir do saldo atual e variação líquida do período
      const netPeriod =
        qtdEntradas +
        qtdAdjPos +
        qtdTransfIn +
        (prodMovsPeriod.some((m) => m.type === 'return' && m.subtipo !== 'devolucao_fornecedor') ? qtdDevolucoes : 0) -
        qtdSaidas -
        qtdAdjNeg -
        qtdPerdas -
        qtdTransfOut;

      const qtdInicial = prodMovsPeriod.length > 0
        ? Math.max(0, Math.round((saldoAtual - netPeriod) * 1000) / 1000)
        : saldoAtual;

      const entryMovsAll = prodMovsAll.filter((m) => m.type === 'entry' || m.type === 'entrada');
      const totalEntryQty = entryMovsAll.reduce((s, m) => s + Number(m.quantity || 0), 0);
      const totalEntryCost = entryMovsAll.reduce((s, m) => s + Number(m.quantity || 0) * Number(m.custo_unitario || m.unit_price || 0), 0);
      const custoBase = Number(p.cost_price ?? p.preco_compra ?? 0);
      const custoMedioCmp = totalEntryQty > 0 ? totalEntryCost / totalEntryQty : (saldoWarehouse?.custo_medio || custoBase);
      const precoVenda = Number(p.price ?? p.preco_venda ?? 0);
      const valorStockCusto = saldoAtual * custoMedioCmp;
      const valorStockVenda = saldoAtual * precoVenda;

      const whObj = warehouses.find((w) => String(w.id) === String(whFilter || p.armazem_id || p.warehouse_id || ''));

      return {
        product_id: pid,
        product_name: p.name || p.nome || 'Produto',
        sku: p.sku || p.referente || p.barcode || '---',
        category: p.category || p.categoria || 'Geral',
        unit: p.unit || 'un',
        warehouse_name: whObj?.name || (whObj as any)?.nome || 'Geral',
        qtd_inicial: qtdInicial,
        qtd_entradas: qtdEntradas,
        qtd_saidas: qtdSaidas,
        qtd_ajustes_pos: qtdAdjPos,
        qtd_ajustes_neg: qtdAdjNeg,
        qtd_perdas: qtdPerdas,
        qtd_devolucoes: qtdDevolucoes,
        qtd_transf_in: qtdTransfIn,
        qtd_transf_out: qtdTransfOut,
        saldo_atual: saldoAtual,
        reservado,
        disponivel,
        custo_unitario: custoBase,
        custo_medio_cmp: Math.round(custoMedioCmp * 100) / 100,
        preco_venda: precoVenda,
        valor_entradas: Math.round(valEntradas * 100) / 100,
        valor_saidas: Math.round(valSaidas * 100) / 100,
        valor_stock_custo: Math.round(valorStockCusto * 100) / 100,
        valor_stock_venda: Math.round(valorStockVenda * 100) / 100,
        margem_potencial: Math.round((valorStockVenda - valorStockCusto) * 100) / 100,
      };
    });
}

export const stockEnterpriseService = {
  async getOverview(): Promise<StockOverviewData> {
    const res = await fetchWithAuth('/api/stock/overview');
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || 'Erro ao carregar visão geral de stock');
    }
    return res.json();
  },

  async executeOperation(payload: {
    product_id: string | number;
    armazem_id?: string | number | null;
    type: 'entry' | 'exit' | 'adjustment_plus' | 'adjustment_minus' | 'loss' | 'return';
    subtipo?: string;
    quantity: number;
    unit_price?: number;
    motivo?: string;
    description?: string;
    documento_origem?: string;
    numero_documento?: string;
    fornecedor_nome?: string;
    cliente_nome?: string;
    data_documento?: string;
    lote_codigo?: string;
    serial_number?: string;
    data_validade?: string;
    observacoes?: string;
  }) {
    const res = await fetchWithAuth('/api/stock/operation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'Erro ao executar movimento de stock');
    return data;
  },

  async transferStock(payload: {
    action: 'create' | 'complete' | 'cancel';
    transfer_id?: string;
    product_id?: string | number;
    armazem_origem_id?: string | number;
    armazem_destino_id?: string | number;
    quantidade?: number;
    lote_codigo?: string;
    observacoes?: string;
    concluir_direto?: boolean;
  }) {
    const res = await fetchWithAuth('/api/stock/transfer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'Erro ao processar transferência');
    return data;
  },

  async inventoryAction(payload: any) {
    const res = await fetchWithAuth('/api/stock/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'Erro ao processar inventário');
    return data;
  },

  async scanAlerts() {
    const res = await fetchWithAuth('/api/stock/alerts/scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'Erro ao verificar alertas de stock');
    return data;
  },

  async saveSettings(settings: Partial<StockSettings>) {
    const res = await fetchWithAuth('/api/stock/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'Erro ao guardar configurações');
    return data;
  },

  // CRUD Direto RLS-Protegido para Categorias, Unidades, Lotes, Ordens de Compra e Alertas
  async upsertCategory(empresaId: string, payload: Partial<StockCategory>) {
    const row = {
      empresa_id: empresaId,
      nome: payload.nome,
      name: payload.nome,
      descricao: payload.descricao || null,
      parent_id: payload.parent_id || null,
      codigo: payload.codigo || null,
      ativo: payload.ativo !== false,
      updated_at: new Date().toISOString(),
    };
    if (payload.id) {
      const { error } = await supabase.from('categorias').update(row).eq('id', payload.id).eq('empresa_id', empresaId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('categorias').insert([row]);
      if (error) throw error;
    }
  },

  async deleteCategory(empresaId: string, id: string) {
    const { error } = await supabase.from('categorias').delete().eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;
  },

  async upsertUnit(empresaId: string, payload: Partial<UnitOfMeasure>) {
    const row = {
      empresa_id: empresaId,
      sigla: String(payload.sigla || '').trim().toLowerCase(),
      nome: String(payload.nome || '').trim(),
      fator_conversao: Number(payload.fator_conversao || 1),
      unidade_base: payload.unidade_base || null,
      permite_fracao: payload.permite_fracao !== false,
      ativo: payload.ativo !== false,
      updated_at: new Date().toISOString(),
    };
    if (payload.id) {
      const { error } = await supabase.from('unidades_medida').update(row).eq('id', payload.id).eq('empresa_id', empresaId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('unidades_medida').insert([row]);
      if (error) throw error;
    }
  },

  async deleteUnit(empresaId: string, id: string) {
    const { error } = await supabase.from('unidades_medida').delete().eq('id', id).eq('empresa_id', empresaId);
    if (error) throw error;
  },

  async upsertLot(empresaId: string, payload: Partial<StockLot>) {
    const row = {
      empresa_id: empresaId,
      product_id: payload.product_id,
      armazem_id: payload.armazem_id ? String(payload.armazem_id) : null,
      numero_lote: payload.numero_lote || null,
      numero_serie: payload.numero_serie || null,
      data_fabrico: payload.data_fabrico || null,
      data_validade: payload.data_validade || null,
      quantidade_inicial: Number(payload.quantidade_inicial || 0),
      quantidade_atual: Number(payload.quantidade_atual ?? payload.quantidade_inicial ?? 0),
      custo_unitario: Number(payload.custo_unitario || 0),
      fornecedor_nome: payload.fornecedor_nome || null,
      estado: payload.estado || 'ativo',
      observacoes: payload.observacoes || null,
      updated_at: new Date().toISOString(),
    };
    if (payload.id) {
      const { error } = await supabase.from('stock_lotes').update(row).eq('id', payload.id).eq('empresa_id', empresaId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('stock_lotes').insert([row]);
      if (error) throw error;
    }
  },

  async upsertPurchaseOrder(empresaId: string, payload: Partial<StockPurchaseOrder>) {
    const row = {
      ...payload,
      empresa_id: empresaId,
      codigo: payload.codigo || `OC-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`,
      updated_at: new Date().toISOString(),
    };
    if (payload.id) {
      const { data, error } = await supabase.from('stock_ordens_compra').update(row).eq('id', payload.id).eq('empresa_id', empresaId).select('*').single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase.from('stock_ordens_compra').insert([row]).select('*').single();
      if (error) throw error;
      return data;
    }
  },

  async updateAlertStatus(empresaId: string, alertId: string, estado: StockAlert['estado'], userId?: string) {
    const { error } = await supabase
      .from('stock_alertas')
      .update({
        estado,
        resolvido_por: estado === 'resolvido' ? userId || null : null,
        resolvido_em: estado === 'resolvido' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', alertId)
      .eq('empresa_id', empresaId);
    if (error) throw error;
  },
};
