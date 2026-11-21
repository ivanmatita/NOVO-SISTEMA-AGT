import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  BarChart3,
  Boxes,
  CalendarClock,
  CheckCircle2,
  Clock,
  DollarSign,
  Filter,
  Package,
  PackageX,
  RefreshCw,
  ShoppingCart,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  Product,
  StockAlert,
  StockBalance,
  StockCategory,
  StockLot,
  StockMovement,
  StockPurchaseOrder,
  StockSettings,
  StockSubRoute,
  StockTransfer,
  Warehouse,
} from '../../types';
import { isInboundMovement, isOutboundMovement } from '../../services/stockEnterpriseService';

interface StockDashboardModuleProps {
  products: Product[];
  stockMovements: StockMovement[];
  warehouses: Warehouse[];
  saldos: StockBalance[];
  lotes: StockLot[];
  transferencias: StockTransfer[];
  ordensCompra: StockPurchaseOrder[];
  alertas: StockAlert[];
  categorias: StockCategory[];
  settings: StockSettings;
  purchases?: any[];
  onNavigate: (subRoute: StockSubRoute) => void;
  onScanAlerts: () => Promise<void>;
  onRefresh: () => void;
}

const formatKz = (val: number) =>
  Number(val || 0).toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Kz';

export const StockDashboardModule: React.FC<StockDashboardModuleProps> = ({
  products,
  stockMovements,
  warehouses,
  saldos,
  lotes,
  transferencias,
  ordensCompra,
  alertas,
  categorias,
  settings,
  purchases = [],
  onNavigate,
  onScanAlerts,
  onRefresh,
}) => {
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [productSearch, setProductSearch] = useState<string>('');
  const [periodDays, setPeriodDays] = useState<number>(30);
  const [scanningAlerts, setScanningAlerts] = useState(false);

  const physicalProducts = useMemo(() => {
    return products.filter((p) => {
      if (String(p.tipo || '').toLowerCase().includes('serv')) return false;
      if (warehouseFilter !== 'all') {
        const prodWh = String(p.armazem_id || p.warehouse_id || '');
        const hasSaldo = saldos.some(
          (s) => String(s.product_id) === String(p.id) && String(s.armazem_id) === warehouseFilter
        );
        if (prodWh !== warehouseFilter && !hasSaldo) return false;
      }
      if (categoryFilter !== 'all') {
        const cat = String(p.category || p.categoria || '').toLowerCase();
        if (cat !== categoryFilter.toLowerCase()) return false;
      }
      if (productSearch.trim()) {
        const q = productSearch.toLowerCase().trim();
        const text = `${p.name || ''} ${p.nome || ''} ${p.sku || ''} ${p.referente || ''} ${p.barcode || ''}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [products, saldos, warehouseFilter, categoryFilter, productSearch]);

  const filteredProductIds = useMemo(() => new Set(physicalProducts.map((p) => String(p.id))), [physicalProducts]);

  const filteredMovements = useMemo(() => {
    const cutoff = Date.now() - periodDays * 24 * 60 * 60 * 1000;
    return stockMovements.filter((m) => {
      if (m.product_id && !filteredProductIds.has(String(m.product_id))) return false;
      if (warehouseFilter !== 'all') {
        const w1 = String(m.armazem_id || m.warehouse_id || '');
        const w2 = String(m.to_warehouse_id || m.armazem_destino_id || '');
        if (w1 !== warehouseFilter && w2 !== warehouseFilter) return false;
      }
      if (periodDays > 0 && new Date(m.created_at).getTime() < cutoff) return false;
      return true;
    });
  }, [stockMovements, filteredProductIds, warehouseFilter, periodDays]);

  const metrics = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const expiryLimitDays = Number(settings?.dias_alerta_validade || 30);
    const idleLimitDays = Number(settings?.dias_sem_movimento || 60);
    const nowMs = Date.now();

    let totalQty = 0;
    let totalReservado = 0;
    let totalValorCusto = 0;
    let totalValorVenda = 0;
    let criticalCount = 0;
    let outOfStockCount = 0;
    let expiringSoonCount = 0;

    const getProdQty = (p: Product) => {
      if (warehouseFilter !== 'all') {
        const s = saldos.find(
          (x) => String(x.product_id) === String(p.id) && String(x.armazem_id) === warehouseFilter
        );
        if (s) return Number(s.quantidade_disponivel || 0);
      }
      return Number(p.stock_quantity ?? p.stock ?? p.stock_atual ?? 0);
    };

    const lastMoveByProd = new Map<string, number>();
    for (const m of stockMovements) {
      if (!m.product_id) continue;
      const pid = String(m.product_id);
      const t = new Date(m.created_at).getTime();
      if (!lastMoveByProd.has(pid) || t > (lastMoveByProd.get(pid) || 0)) {
        lastMoveByProd.set(pid, t);
      }
    }

    const stagnantProducts: { product: Product; qty: number; daysIdle: number }[] = [];

    for (const p of physicalProducts) {
      const qty = getProdQty(p);
      const res = Number(p.stock_reservado || 0);
      const min = Number(p.min_stock ?? p.stock_minimo ?? 0);
      const cost = Number(p.cost_price ?? p.preco_compra ?? 0);
      const sale = Number(p.price ?? p.preco_venda ?? 0);

      totalQty += qty;
      totalReservado += res;
      totalValorCusto += Math.max(0, qty) * cost;
      totalValorVenda += Math.max(0, qty) * sale;

      if (qty <= 0) outOfStockCount++;
      else if (min > 0 && qty <= min) criticalCount++;

      if (p.data_validade) {
        const diffDays = Math.ceil((new Date(p.data_validade).getTime() - nowMs) / (1000 * 60 * 60 * 24));
        if (diffDays <= expiryLimitDays) expiringSoonCount++;
      }

      const lastTs = lastMoveByProd.get(String(p.id)) || (p.created_at ? new Date(p.created_at).getTime() : nowMs);
      const daysIdle = Math.floor((nowMs - lastTs) / (1000 * 60 * 60 * 24));
      if (qty > 0 && daysIdle >= idleLimitDays) {
        stagnantProducts.push({ product: p, qty, daysIdle });
      }
    }

    // Lotes próximos de expirar
    for (const l of lotes) {
      if (!l.data_validade || Number(l.quantidade_atual || 0) <= 0) continue;
      if (!filteredProductIds.has(String(l.product_id))) continue;
      const diffDays = Math.ceil((new Date(l.data_validade).getTime() - nowMs) / (1000 * 60 * 60 * 24));
      if (diffDays <= expiryLimitDays) expiringSoonCount++;
    }

    let entriesTodayQty = 0;
    let exitsTodayQty = 0;
    const movCountByProd = new Map<string, { name: string; unit: string; entries: number; exits: number; ops: number }>();

    for (const m of stockMovements) {
      if (m.product_id && !filteredProductIds.has(String(m.product_id))) continue;
      const mDay = m.created_at ? new Date(m.created_at).toISOString().slice(0, 10) : '';
      const q = Number(m.quantity || 0);
      if (mDay === todayStr) {
        if (isInboundMovement(m)) entriesTodayQty += q;
        else if (isOutboundMovement(m)) exitsTodayQty += q;
      }

      const pid = String(m.product_id || m.product_name || '');
      if (pid) {
        const prodObj = physicalProducts.find((x) => String(x.id) === pid);
        const cur = movCountByProd.get(pid) || {
          name: m.product_name || prodObj?.name || prodObj?.nome || 'Produto',
          unit: prodObj?.unit || 'un',
          entries: 0,
          exits: 0,
          ops: 0,
        };
        if (isInboundMovement(m)) cur.entries += q;
        else if (isOutboundMovement(m)) cur.exits += q;
        cur.ops += 1;
        movCountByProd.set(pid, cur);
      }
    }

    const mostMoved = Array.from(movCountByProd.entries())
      .map(([id, data]) => ({ id, ...data, totalVolume: data.entries + data.exits }))
      .sort((a, b) => b.totalVolume - a.totalVolume)
      .slice(0, 6);

    const pendingTransfers = transferencias.filter((t) => t.estado === 'pendente' || t.estado === 'aprovada').length;
    const pendingPurchases =
      ordensCompra.filter((o) => !['recebida', 'cancelada'].includes(o.estado)).length +
      purchases.filter((c) => String(c.estado || c.status || '').toLowerCase() === 'pendente').length;

    const activeAlerts = alertas.filter((a) => a.estado === 'ativo').length;

    return {
      totalProducts: physicalProducts.length,
      totalQty,
      totalReservado,
      totalDisponivel: Math.max(0, totalQty - totalReservado),
      totalValorCusto,
      totalValorVenda,
      criticalCount,
      outOfStockCount,
      expiringSoonCount,
      entriesTodayQty,
      exitsTodayQty,
      pendingTransfers,
      pendingPurchases,
      activeAlerts,
      mostMoved,
      stagnantProducts: stagnantProducts.sort((a, b) => b.daysIdle - a.daysIdle).slice(0, 6),
    };
  }, [physicalProducts, stockMovements, saldos, lotes, transferencias, ordensCompra, comprasSafe(purchases), alertas, settings, warehouseFilter, filteredProductIds]);

  // Gráfico diário: Entradas vs Saídas (últimos 14 dias)
  const dailyChartData = useMemo(() => {
    const days: { date: string; label: string; Entradas: number; Saidas: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const iso = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
      days.push({ date: iso, label, Entradas: 0, Saidas: 0 });
    }
    const dayMap = new Map(days.map((d) => [d.date, d]));
    for (const m of filteredMovements) {
      const iso = m.created_at ? new Date(m.created_at).toISOString().slice(0, 10) : '';
      const row = dayMap.get(iso);
      if (!row) continue;
      const q = Number(m.quantity || 0);
      if (isInboundMovement(m)) row.Entradas += q;
      else if (isOutboundMovement(m)) row.Saidas += q;
    }
    return days;
  }, [filteredMovements]);

  // Evolução mensal do inventário (últimos 6 meses)
  const monthlyChartData = useMemo(() => {
    const months: { key: string; mes: string; ValorEntradas: number; ValorSaidas: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const mes = d.toLocaleDateString('pt-PT', { month: 'short', year: '2-digit' }).toUpperCase();
      months.push({ key, mes, ValorEntradas: 0, ValorSaidas: 0 });
    }
    const mMap = new Map(months.map((m) => [m.key, m]));
    for (const m of stockMovements) {
      if (m.product_id && !filteredProductIds.has(String(m.product_id))) continue;
      const key = m.created_at ? new Date(m.created_at).toISOString().slice(0, 7) : '';
      const row = mMap.get(key);
      if (!row) continue;
      const val = Number(m.valor_total || Number(m.quantity || 0) * Number(m.custo_unitario || m.unit_price || 0));
      if (isInboundMovement(m)) row.ValorEntradas += val;
      else if (isOutboundMovement(m)) row.ValorSaidas += val;
    }
    return months;
  }, [stockMovements, filteredProductIds]);

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    categorias.forEach((c) => c.nome && set.add(c.nome));
    products.forEach((p) => (p.category || p.categoria) && set.add(String(p.category || p.categoria)));
    return Array.from(set).sort();
  }, [categorias, products]);

  const handleScanAlertsClick = async () => {
    setScanningAlerts(true);
    try {
      await onScanAlerts();
    } finally {
      setScanningAlerts(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Barra de Filtros Multi-Critério */}
      <div className="bg-white border border-zinc-200 p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="flex items-center gap-1.5 text-xs font-black text-[#003366] uppercase tracking-wider mr-1">
            <Filter size={14} /> Filtros:
          </div>
          <select
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 px-2.5 py-1.5 text-xs font-bold text-zinc-700 focus:outline-none focus:border-[#003366]"
          >
            <option value="all">Todos os Armazéns ({warehouses.length})</option>
            {warehouses.map((w) => (
              <option key={w.id} value={String(w.id)}>
                {w.name || (w as any).nome}
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 px-2.5 py-1.5 text-xs font-bold text-zinc-700 focus:outline-none focus:border-[#003366]"
          >
            <option value="all">Todas Categorias</option>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={periodDays}
            onChange={(e) => setPeriodDays(Number(e.target.value))}
            className="bg-zinc-50 border border-zinc-200 px-2.5 py-1.5 text-xs font-bold text-zinc-700 focus:outline-none focus:border-[#003366]"
          >
            <option value={7}>Últimos 7 dias</option>
            <option value={30}>Últimos 30 dias</option>
            <option value={90}>Últimos 90 dias</option>
            <option value={365}>Últimos 12 meses</option>
            <option value={0}>Todo o Histórico</option>
          </select>

          <input
            type="text"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            placeholder="Filtrar produto, SKU ou código..."
            className="bg-zinc-50 border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-800 focus:outline-none focus:border-[#003366] min-w-[200px]"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleScanAlertsClick}
            disabled={scanningAlerts}
            className="bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 px-3 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
          >
            <AlertTriangle size={13} />
            <span>{scanningAlerts ? 'A verificar...' : 'Auditar Alertas'}</span>
          </button>
          <button
            onClick={() => onNavigate('agentes-ia')}
            className="bg-[#003366] hover:bg-[#002244] text-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles size={13} />
            <span>Central 9 Agentes IA</span>
          </button>
          <button
            onClick={onRefresh}
            title="Atualizar dados em tempo real"
            className="p-1.5 border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 text-zinc-600 cursor-pointer"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Grelha Principal de Indicadores KPI (10 Cartões Densos e Reais) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <button
          onClick={() => onNavigate('produtos')}
          className="text-left bg-white border border-zinc-200 p-3.5 hover:border-[#003366] transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-[10px] font-black uppercase text-zinc-400 tracking-wider">
            <span>Produtos Cadastrados</span>
            <Package size={14} className="text-[#003366]" />
          </div>
          <div className="text-xl font-black text-[#003366] mt-1">{metrics.totalProducts}</div>
          <div className="text-[10px] text-zinc-500 mt-0.5 font-medium">Catálogo físico ativo</div>
        </button>

        <div className="bg-white border border-zinc-200 p-3.5">
          <div className="flex items-center justify-between text-[10px] font-black uppercase text-zinc-400 tracking-wider">
            <span>Qtd Total em Stock</span>
            <Boxes size={14} className="text-blue-600" />
          </div>
          <div className="text-xl font-black text-zinc-900 mt-1">
            {metrics.totalQty.toLocaleString('pt-PT', { maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-zinc-500 mt-0.5 font-medium">
            Disp: <strong className="text-emerald-700">{metrics.totalDisponivel.toLocaleString('pt-PT')}</strong> | Res:{' '}
            <strong className="text-amber-700">{metrics.totalReservado.toLocaleString('pt-PT')}</strong>
          </div>
        </div>

        <button
          onClick={() => onNavigate('relatorios')}
          className="text-left bg-white border border-zinc-200 p-3.5 hover:border-[#003366] transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-[10px] font-black uppercase text-zinc-400 tracking-wider">
            <span>Valor Inventário (Custo)</span>
            <DollarSign size={14} className="text-emerald-600" />
          </div>
          <div className="text-base font-black text-[#003366] mt-1 truncate" title={formatKz(metrics.totalValorCusto)}>
            {formatKz(metrics.totalValorCusto)}
          </div>
          <div className="text-[10px] text-emerald-700 mt-0.5 font-bold truncate">
            Venda: {formatKz(metrics.totalValorVenda)}
          </div>
        </button>

        <button
          onClick={() => onNavigate('alertas')}
          className="text-left bg-white border border-amber-200 bg-amber-50/30 p-3.5 hover:border-amber-500 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-[10px] font-black uppercase text-amber-700 tracking-wider">
            <span>Stock Crítico / Esgotado</span>
            <AlertTriangle size={14} className="text-amber-600" />
          </div>
          <div className="text-xl font-black text-amber-800 mt-1">
            {metrics.criticalCount} <span className="text-xs font-bold text-red-600">/ {metrics.outOfStockCount} zero</span>
          </div>
          <div className="text-[10px] text-amber-700 mt-0.5 font-medium">
            {metrics.activeAlerts} alertas ativos no painel
          </div>
        </button>

        <button
          onClick={() => onNavigate('alertas')}
          className="text-left bg-white border border-zinc-200 p-3.5 hover:border-rose-400 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-[10px] font-black uppercase text-zinc-400 tracking-wider">
            <span>Próximos de Expirar</span>
            <CalendarClock size={14} className="text-rose-600" />
          </div>
          <div className="text-xl font-black text-rose-700 mt-1">{metrics.expiringSoonCount}</div>
          <div className="text-[10px] text-zinc-500 mt-0.5 font-medium">
            Janela: {settings?.dias_alerta_validade || 30} dias
          </div>
        </button>

        <button
          onClick={() => onNavigate('entradas')}
          className="text-left bg-white border border-zinc-200 p-3.5 hover:border-emerald-500 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-[10px] font-black uppercase text-zinc-400 tracking-wider">
            <span>Entradas do Dia</span>
            <ArrowDownLeft size={14} className="text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-700 mt-1">
            +{metrics.entriesTodayQty.toLocaleString('pt-PT', { maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-zinc-500 mt-0.5 font-medium">Unidades recebidas hoje</div>
        </button>

        <button
          onClick={() => onNavigate('saidas')}
          className="text-left bg-white border border-zinc-200 p-3.5 hover:border-red-500 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-[10px] font-black uppercase text-zinc-400 tracking-wider">
            <span>Saídas do Dia</span>
            <ArrowUpRight size={14} className="text-red-600" />
          </div>
          <div className="text-xl font-black text-red-700 mt-1">
            -{metrics.exitsTodayQty.toLocaleString('pt-PT', { maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-zinc-500 mt-0.5 font-medium">Vendas, consumo e perdas</div>
        </button>

        <button
          onClick={() => onNavigate('transferencias')}
          className="text-left bg-white border border-zinc-200 p-3.5 hover:border-blue-500 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-[10px] font-black uppercase text-zinc-400 tracking-wider">
            <span>Transferências Pendentes</span>
            <ArrowRightLeft size={14} className="text-blue-600" />
          </div>
          <div className="text-xl font-black text-[#003366] mt-1">{metrics.pendingTransfers}</div>
          <div className="text-[10px] text-zinc-500 mt-0.5 font-medium">Entre armazéns</div>
        </button>

        <button
          onClick={() => onNavigate('compras')}
          className="text-left bg-white border border-zinc-200 p-3.5 hover:border-indigo-500 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-[10px] font-black uppercase text-zinc-400 tracking-wider">
            <span>Compras Pendentes</span>
            <ShoppingCart size={14} className="text-indigo-600" />
          </div>
          <div className="text-xl font-black text-indigo-700 mt-1">{metrics.pendingPurchases}</div>
          <div className="text-[10px] text-zinc-500 mt-0.5 font-medium">Ordens e requisições</div>
        </button>

        <button
          onClick={() => onNavigate('movimentos')}
          className="text-left bg-white border border-zinc-200 p-3.5 hover:border-[#003366] transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-[10px] font-black uppercase text-zinc-400 tracking-wider">
            <span>Sem Movimentação</span>
            <PackageX size={14} className="text-zinc-500" />
          </div>
          <div className="text-xl font-black text-zinc-800 mt-1">{metrics.stagnantProducts.length}</div>
          <div className="text-[10px] text-zinc-500 mt-0.5 font-medium">
            Parados &ge; {settings?.dias_sem_movimento || 60}d
          </div>
        </button>
      </div>

      {/* Gráficos Analíticos (Entradas vs Saídas + Evolução Mensal) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-zinc-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-black uppercase text-[#003366] tracking-wider flex items-center gap-1.5">
                <BarChart3 size={14} /> Fluxo Diário: Entradas vs Saídas (14 Dias)
              </h3>
              <p className="text-[11px] text-zinc-400">Quantidades movimentadas por dia no período selecionado</p>
            </div>
            <button
              onClick={() => onNavigate('relatorios')}
              className="text-[11px] font-bold text-[#003366] hover:underline cursor-pointer"
            >
              Ver Relatório Completo →
            </button>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Entradas" fill="#059669" radius={[2, 2, 0, 0]} />
                <Bar dataKey="Saidas" fill="#dc2626" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-black uppercase text-[#003366] tracking-wider flex items-center gap-1.5">
                <TrendingUp size={14} /> Evolução Mensal Financeira do Inventário (6 Meses)
              </h3>
              <p className="text-[11px] text-zinc-400">Valor monetário (Kz) de entradas e saídas mensais</p>
            </div>
          </div>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(val: any) => formatKz(Number(val))} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="ValorEntradas" name="Entradas (Kz)" stroke="#003366" fill="#003366" fillOpacity={0.18} />
                <Area type="monotone" dataKey="ValorSaidas" name="Saídas (Kz)" stroke="#d97706" fill="#d97706" fillOpacity={0.14} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Painéis Inferiores: Top Movimentados, Produtos Estagnados, Últimas Operações */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Mais Movimentados */}
        <div className="bg-white border border-zinc-200 p-4">
          <h3 className="text-xs font-black uppercase text-[#003366] tracking-wider mb-3 border-b border-zinc-100 pb-2">
            Produtos Mais Movimentados
          </h3>
          {metrics.mostMoved.length === 0 ? (
            <div className="text-xs text-zinc-400 py-8 text-center">Sem movimentações registadas para estes filtros.</div>
          ) : (
            <div className="space-y-2">
              {metrics.mostMoved.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-xs py-1.5 border-b border-zinc-50 last:border-0">
                  <div className="truncate pr-2">
                    <div className="font-bold text-zinc-800 truncate">{item.name}</div>
                    <div className="text-[10px] text-zinc-400">{item.ops} operações registadas</div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-emerald-700 font-bold">+{item.entries}</span>
                    <span className="text-zinc-300 mx-1">/</span>
                    <span className="text-red-600 font-bold">-{item.exits}</span>
                    <span className="text-[10px] text-zinc-400 ml-1">{item.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sem Movimentação */}
        <div className="bg-white border border-zinc-200 p-4">
          <h3 className="text-xs font-black uppercase text-[#003366] tracking-wider mb-3 border-b border-zinc-100 pb-2">
            Produtos Sem Movimentação (Capital Parado)
          </h3>
          {metrics.stagnantProducts.length === 0 ? (
            <div className="text-xs text-emerald-700 py-8 text-center flex flex-col items-center gap-1">
              <CheckCircle2 size={20} />
              <span>Nenhum produto parado acima de {settings?.dias_sem_movimento || 60} dias.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {metrics.stagnantProducts.map(({ product, qty, daysIdle }) => (
                <div key={product.id} className="flex items-center justify-between text-xs py-1.5 border-b border-zinc-50 last:border-0">
                  <div className="truncate pr-2">
                    <div className="font-bold text-zinc-800 truncate">{product.name || product.nome}</div>
                    <div className="text-[10px] text-zinc-400">Stock: {qty} {product.unit || 'un'}</div>
                  </div>
                  <span className="px-2 py-0.5 bg-zinc-100 text-zinc-700 font-bold text-[10px] shrink-0">
                    {daysIdle} dias parado
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Últimas Operações */}
        <div className="bg-white border border-zinc-200 p-4">
          <div className="flex items-center justify-between mb-3 border-b border-zinc-100 pb-2">
            <h3 className="text-xs font-black uppercase text-[#003366] tracking-wider flex items-center gap-1.5">
              <Clock size={13} /> Últimas Operações de Stock
            </h3>
            <button onClick={() => onNavigate('movimentos')} className="text-[10px] font-bold text-[#003366] hover:underline cursor-pointer">
              Ver tudo
            </button>
          </div>
          {filteredMovements.length === 0 ? (
            <div className="text-xs text-zinc-400 py-8 text-center">Nenhum movimento recente.</div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {filteredMovements.slice(0, 10).map((m) => {
                const prod = products.find((p) => String(p.id) === String(m.product_id));
                const inbound = isInboundMovement(m);
                return (
                  <div key={m.id} className="flex items-center justify-between text-xs py-1.5 border-b border-zinc-50 last:border-0">
                    <div className="truncate pr-2">
                      <div className="font-bold text-zinc-800 truncate">{m.product_name || prod?.name || prod?.nome || 'Artigo'}</div>
                      <div className="text-[10px] text-zinc-400 truncate">
                        {new Date(m.created_at).toLocaleString('pt-PT')} • {m.description || m.type}
                      </div>
                    </div>
                    <span className={`font-black shrink-0 ${inbound ? 'text-emerald-700' : 'text-red-600'}`}>
                      {inbound ? '+' : '-'}{m.quantity}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function comprasSafe(arr: any[]) {
  return Array.isArray(arr) ? arr : [];
}
