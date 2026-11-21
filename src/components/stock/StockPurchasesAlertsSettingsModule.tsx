import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Building2,
  CheckCircle2,
  PackageCheck,
  Plus,
  RefreshCw,
  Save,
  Settings,
  ShoppingCart,
  Trash2,
  XCircle,
} from 'lucide-react';
import type {
  Product,
  StockAlert,
  StockPurchaseOrder,
  StockPurchaseOrderItem,
  StockSettings,
  Supplier,
  Warehouse,
} from '../../types';
import { stockEnterpriseService } from '../../services/stockEnterpriseService';
import toast from 'react-hot-toast';

const formatKz = (val: number) =>
  Number(val || 0).toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Kz';

/* ============================================================================
   1. REQUISIÇÕES & ORDENS DE COMPRA (/stock/compras)
   ============================================================================ */
interface StockPurchasesModuleProps {
  empresaId: string;
  userId?: string;
  userName?: string;
  products: Product[];
  warehouses: Warehouse[];
  suppliers: Supplier[];
  ordensCompra: StockPurchaseOrder[];
  comprasExistentes?: any[];
  canManage: boolean;
  canApprove: boolean;
  onRefresh: () => void;
}

export const StockPurchasesModule: React.FC<StockPurchasesModuleProps> = ({
  empresaId,
  userId,
  userName,
  products,
  warehouses,
  suppliers,
  ordensCompra,
  comprasExistentes = [],
  canManage,
  canApprove,
  onRefresh,
}) => {
  const [tipo, setTipo] = useState<'requisicao' | 'ordem_compra'>('ordem_compra');
  const [fornecedorId, setFornecedorId] = useState('');
  const [armazemId, setArmazemId] = useState(warehouses[0]?.id ? String(warehouses[0].id) : '');
  const [prioridade, setPrioridade] = useState<'baixa' | 'normal' | 'alta' | 'urgente'>('normal');
  const [dataPrevista, setDataPrevista] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [itens, setItens] = useState<StockPurchaseOrderItem[]>([]);
  const [pickProdId, setPickProdId] = useState('');
  const [pickQty, setPickQty] = useState('10');
  const [pickCost, setPickCost] = useState('');
  const [busy, setBusy] = useState(false);

  const criticalProducts = useMemo(
    () =>
      products.filter((p) => {
        if (String(p.tipo || '').toLowerCase().includes('serv')) return false;
        const q = Number(p.stock_quantity || 0);
        const min = Number(p.min_stock ?? p.stock_minimo ?? 0);
        return q <= 0 || (min > 0 && q <= min);
      }),
    [products]
  );

  const handleAddItem = () => {
    const prod = products.find((p) => String(p.id) === pickProdId);
    if (!prod) return;
    const q = Number(pickQty || 1);
    const c = Number(pickCost !== '' ? pickCost : prod.cost_price || prod.preco_compra || 0);
    setItens((prev) => [
      ...prev,
      {
        product_id: String(prod.id),
        product_name: prod.name || prod.nome || 'Produto',
        sku: prod.sku || prod.referente || undefined,
        quantidade: q,
        custo_unitario: c,
        unidade: prod.unit || 'un',
        total: Math.round(q * c * 100) / 100,
      },
    ]);
    setPickProdId('');
    setPickQty('10');
    setPickCost('');
  };

  const handleLoadCriticalItems = () => {
    if (criticalProducts.length === 0) {
      toast('Nenhum produto em rutura ou stock crítico.');
      return;
    }
    const autoItems: StockPurchaseOrderItem[] = criticalProducts.slice(0, 15).map((p) => {
      const target = Math.max(Number(p.stock_maximo || 0), Number(p.min_stock || 10) * 2, 10);
      const q = Math.max(1, target - Math.max(0, Number(p.stock_quantity || 0)));
      const c = Number(p.cost_price || p.preco_compra || 0);
      return {
        product_id: String(p.id),
        product_name: p.name || p.nome || 'Produto',
        sku: p.sku || p.referente || undefined,
        quantidade: q,
        custo_unitario: c,
        unidade: p.unit || 'un',
        total: Math.round(q * c * 100) / 100,
      };
    });
    setItens(autoItems);
    setPrioridade('alta');
    toast.success(`${autoItems.length} itens críticos adicionados para reposição.`);
  };

  const totalOrder = useMemo(() => itens.reduce((s, it) => s + Number(it.total || 0), 0), [itens]);

  const handleSaveOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (itens.length === 0) {
      toast.error('Adicione pelo menos 1 produto à requisição / ordem de compra.');
      return;
    }
    setBusy(true);
    try {
      const sup = suppliers.find((s) => String(s.id) === fornecedorId);
      const arm = warehouses.find((w) => String(w.id) === armazemId);
      await stockEnterpriseService.upsertPurchaseOrder(empresaId, {
        tipo,
        fornecedor_id: sup ? String(sup.id) : null,
        fornecedor_nome: sup?.name || sup?.nome || 'Fornecedor a definir',
        armazem_id: arm ? String(arm.id) : null,
        armazem_nome: arm?.name || (arm as any)?.nome || 'Armazém Geral',
        estado: 'pendente_aprovacao',
        prioridade,
        origem: 'manual',
        itens,
        subtotal: totalOrder,
        imposto: 0,
        total: totalOrder,
        data_prevista: dataPrevista || null,
        observacoes: observacoes.trim() || null,
        solicitado_por: userId || null,
        solicitado_por_nome: userName || 'Operador',
      });
      toast.success('Requisição / Ordem de Compra registada!');
      setItens([]);
      setObservacoes('');
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao guardar ordem de compra');
    } finally {
      setBusy(false);
    }
  };

  const handleOrderTransition = async (order: StockPurchaseOrder, nextState: StockPurchaseOrder['estado']) => {
    setBusy(true);
    try {
      if (nextState === 'recebida') {
        if (!window.confirm(`Confirmar recebimento físico da ordem ${order.codigo} no stock?`)) {
          setBusy(false);
          return;
        }
        for (const it of order.itens || []) {
          if (!it.product_id) continue;
          await stockEnterpriseService.executeOperation({
            product_id: it.product_id,
            armazem_id: order.armazem_id || null,
            type: 'entry',
            subtipo: 'compra',
            quantity: Number(it.quantidade || 0),
            unit_price: Number(it.custo_unitario || 0),
            documento_origem: 'Ordem de Compra',
            numero_documento: order.codigo,
            fornecedor_nome: order.fornecedor_nome || undefined,
            description: `Recebimento Ordem de Compra ${order.codigo} (${order.fornecedor_nome || ''})`,
          });
        }
      }
      await stockEnterpriseService.upsertPurchaseOrder(empresaId, {
        id: order.id,
        codigo: order.codigo,
        estado: nextState,
        aprovado_por: nextState === 'aprovada' ? userId || null : order.aprovado_por,
        aprovado_por_nome: nextState === 'aprovada' ? userName || 'Gestor' : order.aprovado_por_nome,
        aprovado_em: nextState === 'aprovada' ? new Date().toISOString() : order.aprovado_em,
        recebido_em: nextState === 'recebida' ? new Date().toISOString() : order.recebido_em,
      });
      toast.success(nextState === 'recebida' ? 'Mercadoria recebida e lançada no stock!' : `Ordem atualizada para ${nextState}.`);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao atualizar ordem');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {canManage && (
        <form onSubmit={handleSaveOrder} className="bg-white border border-zinc-200 p-4 space-y-3 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-2.5">
            <h3 className="text-sm font-black text-[#003366] uppercase tracking-tight flex items-center gap-2">
              <ShoppingCart size={16} /> Nova Requisição / Ordem de Compra
            </h3>
            <button
              type="button"
              onClick={handleLoadCriticalItems}
              className="bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 px-3 py-1 text-xs font-bold cursor-pointer"
            >
              + Preencher Stock Crítico ({criticalProducts.length})
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase text-zinc-500">Tipo</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value as any)} className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs font-bold">
                <option value="ordem_compra">Ordem de Compra</option>
                <option value="requisicao">Requisição Interna</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-zinc-500">Fornecedor</label>
              <select value={fornecedorId} onChange={(e) => setFornecedorId(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs font-bold">
                <option value="">-- Selecionar Fornecedor --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={String(s.id)}>
                    {s.name || s.nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-zinc-500">Armazém Destino</label>
              <select value={armazemId} onChange={(e) => setArmazemId(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs font-bold">
                <option value="">-- Armazém Geral --</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={String(w.id)}>
                    {w.name || (w as any).nome}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-zinc-500">Prioridade</label>
              <select value={prioridade} onChange={(e) => setPrioridade(e.target.value as any)} className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs font-bold">
                <option value="baixa">Baixa</option>
                <option value="normal">Normal</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-zinc-500">Data Prevista Entrega</label>
              <input type="date" value={dataPrevista} onChange={(e) => setDataPrevista(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs" />
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-2 bg-zinc-50 border border-zinc-200 p-2.5">
            <div className="flex-1 min-w-[200px]">
              <label className="text-[10px] font-bold uppercase text-zinc-500">Adicionar Produto</label>
              <select
                value={pickProdId}
                onChange={(e) => {
                  setPickProdId(e.target.value);
                  const p = products.find((x) => String(x.id) === e.target.value);
                  if (p) setPickCost(String(p.cost_price || p.preco_compra || 0));
                }}
                className="w-full bg-white border border-zinc-200 p-1.5 text-xs font-bold"
              >
                <option value="">-- Escolher produto --</option>
                {products.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.name || p.nome} (Atual: {p.stock_quantity})
                  </option>
                ))}
              </select>
            </div>
            <div className="w-24">
              <label className="text-[10px] font-bold uppercase text-zinc-500">Qtd</label>
              <input type="number" min="1" value={pickQty} onChange={(e) => setPickQty(e.target.value)} className="w-full bg-white border border-zinc-200 p-1.5 text-xs font-bold" />
            </div>
            <div className="w-32">
              <label className="text-[10px] font-bold uppercase text-zinc-500">Custo Unit. (Kz)</label>
              <input type="number" step="0.01" value={pickCost} onChange={(e) => setPickCost(e.target.value)} className="w-full bg-white border border-zinc-200 p-1.5 text-xs font-bold" />
            </div>
            <button type="button" onClick={handleAddItem} className="bg-[#003366] text-white px-3 py-1.5 text-xs font-bold uppercase flex items-center gap-1 cursor-pointer">
              <Plus size={13} /> Incluir
            </button>
          </div>

          {itens.length > 0 && (
            <div className="border border-zinc-200 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-100 text-[10px] uppercase font-black text-zinc-600">
                  <tr>
                    <th className="px-3 py-1.5">Produto</th>
                    <th className="px-3 py-1.5 text-right">Qtd</th>
                    <th className="px-3 py-1.5 text-right">Custo Unit.</th>
                    <th className="px-3 py-1.5 text-right">Subtotal</th>
                    <th className="px-3 py-1.5 text-right">Remover</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {itens.map((it, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-1.5 font-bold">{it.product_name}</td>
                      <td className="px-3 py-1.5 text-right">{it.quantidade} {it.unidade}</td>
                      <td className="px-3 py-1.5 text-right">{formatKz(it.custo_unitario)}</td>
                      <td className="px-3 py-1.5 text-right font-bold">{formatKz(it.total)}</td>
                      <td className="px-3 py-1.5 text-right">
                        <button type="button" onClick={() => setItens((prev) => prev.filter((_, i) => i !== idx))} className="text-red-600 cursor-pointer">
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            <input
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Observações / condições de pagamento..."
              className="flex-1 min-w-[240px] bg-zinc-50 border border-zinc-200 p-2 text-xs"
            />
            <div className="text-xs font-black text-[#003366]">Total Estimado: {formatKz(totalOrder)}</div>
            <button type="submit" disabled={busy || itens.length === 0} className="bg-[#003366] text-white px-4 py-2 text-xs font-bold uppercase cursor-pointer">
              {busy ? 'A guardar...' : 'Emitir Ordem / Requisição'}
            </button>
          </div>
        </form>
      )}

      {/* Lista de Ordens e Requisições */}
      <div className="bg-white border border-zinc-200 overflow-x-auto">
        <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200 text-xs font-black uppercase text-[#003366] flex justify-between">
          <span>Ordens de Compra & Requisições de Reposição ({ordensCompra.length})</span>
          <span className="text-zinc-500 font-bold">Compras Faturadas no ERP: {comprasExistentes.length}</span>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-[#003366] text-white text-[10px] uppercase">
            <tr>
              <th className="px-3 py-2">Código</th>
              <th className="px-3 py-2">Tipo / Origem</th>
              <th className="px-3 py-2">Fornecedor</th>
              <th className="px-3 py-2">Armazém</th>
              <th className="px-3 py-2 text-center">Itens</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2 text-right">Fluxo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {ordensCompra.map((o) => (
              <tr key={o.id} className="hover:bg-zinc-50">
                <td className="px-3 py-2 font-mono font-bold text-[#003366]">{o.codigo}</td>
                <td className="px-3 py-2 uppercase text-[10px] font-bold">
                  {o.tipo} <span className="text-zinc-400">({o.origem})</span>
                </td>
                <td className="px-3 py-2 font-bold text-zinc-800">{o.fornecedor_nome || '---'}</td>
                <td className="px-3 py-2 text-zinc-600">{o.armazem_nome || 'Geral'}</td>
                <td className="px-3 py-2 text-center font-bold">{(o.itens || []).length}</td>
                <td className="px-3 py-2 text-right font-black text-[#003366]">{formatKz(o.total)}</td>
                <td className="px-3 py-2">
                  <span
                    className={`px-2 py-0.5 text-[10px] font-black uppercase ${
                      o.estado === 'recebida'
                        ? 'bg-emerald-50 text-emerald-700'
                        : o.estado === 'aprovada' || o.estado === 'encomendada'
                        ? 'bg-blue-50 text-blue-700'
                        : o.estado === 'cancelada'
                        ? 'bg-zinc-100 text-zinc-500'
                        : 'bg-amber-50 text-amber-800'
                    }`}
                  >
                    {o.estado}
                  </span>
                </td>
                <td className="px-3 py-2 text-right space-x-2">
                  {(o.estado === 'rascunho' || o.estado === 'pendente_aprovacao') && canApprove && (
                    <button onClick={() => handleOrderTransition(o, 'aprovada')} className="text-blue-700 font-bold hover:underline cursor-pointer">
                      Aprovar
                    </button>
                  )}
                  {(o.estado === 'aprovada' || o.estado === 'encomendada') && canManage && (
                    <button onClick={() => handleOrderTransition(o, 'recebida')} className="text-emerald-700 font-bold hover:underline cursor-pointer inline-flex items-center gap-1">
                      <PackageCheck size={13} /> Receber Stock
                    </button>
                  )}
                  {!['recebida', 'cancelada'].includes(o.estado) && canApprove && (
                    <button onClick={() => handleOrderTransition(o, 'cancelada')} className="text-red-600 font-bold hover:underline cursor-pointer">
                      Cancelar
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {ordensCompra.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-zinc-400">
                  Nenhuma requisição ou ordem de compra registada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ============================================================================
   2. FORNECEDORES INTEGRADOS AO STOCK (/stock/fornecedores)
   ============================================================================ */
export const StockSuppliersModule: React.FC<{
  suppliers: Supplier[];
  comprasExistentes?: any[];
  ordensCompra: StockPurchaseOrder[];
  onGoToOrders: () => void;
}> = ({ suppliers, comprasExistentes = [], ordensCompra, onGoToOrders }) => {
  const rows = useMemo(() => {
    return suppliers.map((s) => {
      const sName = String(s.name || s.nome || '').toLowerCase();
      const sPurchases = comprasExistentes.filter(
        (c) => String(c.fornecedor_id || c.supplier_id || '') === String(s.id) || String(c.fornecedor_nome || c.supplier_name || '').toLowerCase() === sName
      );
      const totalBought = sPurchases.reduce((acc, c) => acc + Number(c.valor_total || c.total_geral || c.total || 0), 0);
      const openOrders = ordensCompra.filter(
        (o) => String(o.fornecedor_id || '') === String(s.id) && !['recebida', 'cancelada'].includes(o.estado)
      ).length;
      return { supplier: s, purchaseCount: sPurchases.length, totalBought, openOrders };
    });
  }, [suppliers, comprasExistentes, ordensCompra]);

  return (
    <div className="bg-white border border-zinc-200 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3">
        <div>
          <h3 className="text-sm font-black text-[#003366] uppercase tracking-tight flex items-center gap-2">
            <Building2 size={16} /> Fornecedores & Histórico de Abastecimento ({suppliers.length})
          </h3>
          <p className="text-[11px] text-zinc-400">Integração direta com o cadastro oficial de fornecedores, compras e ordens de reposição.</p>
        </div>
        <button onClick={onGoToOrders} className="bg-[#003366] text-white px-3 py-1.5 text-xs font-bold uppercase cursor-pointer">
          + Nova Ordem de Compra
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#003366] text-white text-[10px] uppercase">
            <tr>
              <th className="px-3 py-2">Fornecedor</th>
              <th className="px-3 py-2">NIF</th>
              <th className="px-3 py-2">Contacto / Email</th>
              <th className="px-3 py-2">Localidade</th>
              <th className="px-3 py-2 text-center">Compras ERP</th>
              <th className="px-3 py-2 text-center">Ordens Abertas</th>
              <th className="px-3 py-2 text-right">Volume Comprado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map(({ supplier: s, purchaseCount, totalBought, openOrders }) => (
              <tr key={s.id} className="hover:bg-zinc-50">
                <td className="px-3 py-2 font-bold text-zinc-900">{s.name || s.nome}</td>
                <td className="px-3 py-2 font-mono text-zinc-600">{s.nif || '---'}</td>
                <td className="px-3 py-2 text-zinc-600">{s.telefone || s.phone || s.email || '---'}</td>
                <td className="px-3 py-2 text-zinc-500">{s.provincia || s.localidade || '---'}</td>
                <td className="px-3 py-2 text-center font-bold">{purchaseCount}</td>
                <td className="px-3 py-2 text-center font-bold text-indigo-700">{openOrders}</td>
                <td className="px-3 py-2 text-right font-black text-[#003366]">{formatKz(totalBought)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-400">
                  Nenhum fornecedor registado na empresa.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ============================================================================
   3. ALERTAS INTELIGENTES (/stock/alertas)
   ============================================================================ */
export const StockAlertsModule: React.FC<{
  empresaId: string;
  userId?: string;
  alertas: StockAlert[];
  onScanAlerts: () => Promise<void>;
  onRefresh: () => void;
  onCreateOrderFromAlert: () => void;
}> = ({ empresaId, userId, alertas, onScanAlerts, onRefresh, onCreateOrderFromAlert }) => {
  const [filterEstado, setFilterEstado] = useState<'ativo' | 'all'>('ativo');
  const [scanning, setScanning] = useState(false);

  const visible = useMemo(
    () => (filterEstado === 'all' ? alertas : alertas.filter((a) => a.estado === 'ativo')),
    [alertas, filterEstado]
  );

  const handleScan = async () => {
    setScanning(true);
    try {
      await onScanAlerts();
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="bg-white border border-zinc-200 p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3">
        <div>
          <h3 className="text-sm font-black text-[#003366] uppercase tracking-tight flex items-center gap-2">
            <Bell size={16} /> Central de Alertas de Stock Crítico, Validades & Rupturas
          </h3>
          <p className="text-[11px] text-zinc-400">Monitorização automática baseada em mínimos, validades e rotatividade real.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value as any)}
            className="bg-zinc-50 border border-zinc-200 px-2.5 py-1.5 text-xs font-bold"
          >
            <option value="ativo">Alertas Ativos ({alertas.filter((a) => a.estado === 'ativo').length})</option>
            <option value="all">Todos ({alertas.length})</option>
          </select>
          <button
            onClick={handleScan}
            disabled={scanning}
            className="bg-[#003366] text-white px-3 py-1.5 text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw size={13} className={scanning ? 'animate-spin' : ''} /> {scanning ? 'A analisar...' : 'Executar Varredura'}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {visible.map((a) => (
          <div
            key={a.id}
            className={`p-3 border flex flex-wrap items-center justify-between gap-3 ${
              a.severidade === 'critica'
                ? 'border-red-300 bg-red-50/40'
                : a.severidade === 'alta'
                ? 'border-amber-300 bg-amber-50/40'
                : 'border-zinc-200 bg-zinc-50/40'
            }`}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle
                size={18}
                className={
                  a.severidade === 'critica'
                    ? 'text-red-600 mt-0.5'
                    : a.severidade === 'alta'
                    ? 'text-amber-600 mt-0.5'
                    : 'text-blue-600 mt-0.5'
                }
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-zinc-900">{a.titulo}</span>
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-white border border-zinc-200">
                    {a.tipo} • {a.severidade}
                  </span>
                </div>
                <p className="text-xs text-zinc-600 mt-0.5">{a.mensagem}</p>
                <div className="text-[10px] text-zinc-400 mt-0.5">{new Date(a.created_at).toLocaleString('pt-PT')}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {(a.tipo === 'esgotado' || a.tipo === 'stock_critico') && a.estado === 'ativo' && (
                <button
                  onClick={onCreateOrderFromAlert}
                  className="bg-[#003366] text-white px-2.5 py-1 text-[11px] font-bold uppercase cursor-pointer"
                >
                  Requisitar Compra
                </button>
              )}
              {a.estado === 'ativo' && (
                <>
                  <button
                    onClick={async () => {
                      await stockEnterpriseService.updateAlertStatus(empresaId, a.id, 'resolvido', userId);
                      toast.success('Alerta marcado como resolvido.');
                      onRefresh();
                    }}
                    className="text-emerald-700 hover:bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-bold cursor-pointer inline-flex items-center gap-1"
                  >
                    <CheckCircle2 size={12} /> Resolver
                  </button>
                  <button
                    onClick={async () => {
                      await stockEnterpriseService.updateAlertStatus(empresaId, a.id, 'ignorado', userId);
                      onRefresh();
                    }}
                    className="text-zinc-500 hover:bg-zinc-100 border border-zinc-200 px-2 py-1 text-[11px] font-bold cursor-pointer inline-flex items-center gap-1"
                  >
                    <XCircle size={12} /> Ignorar
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
        {visible.length === 0 && (
          <div className="py-12 text-center text-xs text-zinc-400">
            Nenhum alerta encontrado. Clique em "Executar Varredura" para verificar o inventário atual.
          </div>
        )}
      </div>
    </div>
  );
};

/* ============================================================================
   4. CONFIGURAÇÕES DO MÓDULO STOCK (/stock/configuracoes)
   ============================================================================ */
export const StockSettingsModule: React.FC<{
  settings: StockSettings;
  canConfigure: boolean;
  onRefresh: () => void;
}> = ({ settings, canConfigure, onRefresh }) => {
  const [form, setForm] = useState<StockSettings>(settings);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await stockEnterpriseService.saveSettings(form);
      toast.success('Configurações de stock guardadas!');
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao guardar configurações');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="bg-white border border-zinc-200 p-5 space-y-4 max-w-3xl">
      <div className="border-b border-zinc-100 pb-3">
        <h3 className="text-sm font-black text-[#003366] uppercase tracking-tight flex items-center gap-2">
          <Settings size={16} /> Regras de Valorização, Segurança e Alertas de Stock
        </h3>
        <p className="text-[11px] text-zinc-400">Parâmetros aplicáveis estritamente à sua empresa.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div>
          <label className="text-[10px] font-bold uppercase text-zinc-500">Método Padrão de Valorização</label>
          <select
            value={form.metodo_valorizacao}
            disabled={!canConfigure}
            onChange={(e) => setForm({ ...form, metodo_valorizacao: e.target.value as any })}
            className="w-full bg-zinc-50 border border-zinc-200 p-2 font-bold mt-1"
          >
            <option value="CMP">CMP — Custo Médio Ponderado</option>
            <option value="FIFO">FIFO / PEPS — Primeiro a Entrar, Primeiro a Sair</option>
            <option value="LIFO">LIFO / UEPS — Último a Entrar, Primeiro a Sair</option>
            <option value="POPM">POPM — Preço Médio Ponderado</option>
            <option value="PIPO">PIPO — Preço da Última Compra</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase text-zinc-500">Antecedência Alerta Validade (Dias)</label>
          <input
            type="number"
            min="1"
            disabled={!canConfigure}
            value={form.dias_alerta_validade}
            onChange={(e) => setForm({ ...form, dias_alerta_validade: Number(e.target.value) })}
            className="w-full bg-zinc-50 border border-zinc-200 p-2 font-bold mt-1"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase text-zinc-500">Dias p/ Alerta Produto Sem Movimento</label>
          <input
            type="number"
            min="1"
            disabled={!canConfigure}
            value={form.dias_sem_movimento}
            onChange={(e) => setForm({ ...form, dias_sem_movimento: Number(e.target.value) })}
            className="w-full bg-zinc-50 border border-zinc-200 p-2 font-bold mt-1"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold uppercase text-zinc-500">Frequência Análise Agentes IA (Minutos)</label>
          <input
            type="number"
            min="5"
            disabled={!canConfigure}
            value={form.agentes_frequencia_minutos}
            onChange={(e) => setForm({ ...form, agentes_frequencia_minutos: Number(e.target.value) })}
            className="w-full bg-zinc-50 border border-zinc-200 p-2 font-bold mt-1"
          />
        </div>
      </div>

      <div className="space-y-2.5 pt-2 border-t border-zinc-100 text-xs font-bold text-zinc-700">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            disabled={!canConfigure}
            checked={form.bloquear_venda_sem_stock}
            onChange={(e) => setForm({ ...form, bloquear_venda_sem_stock: e.target.checked })}
          />
          <span>Bloquear faturação/POS quando não houver stock disponível suficiente</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            disabled={!canConfigure}
            checked={form.permitir_stock_negativo}
            onChange={(e) => setForm({ ...form, permitir_stock_negativo: e.target.checked })}
          />
          <span>Permitir saldo de stock negativo em operações manuais</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            disabled={!canConfigure}
            checked={form.aprovar_transferencias}
            onChange={(e) => setForm({ ...form, aprovar_transferencias: e.target.checked })}
          />
          <span>Exigir aprovação de Gestor antes de concluir transferências entre armazéns</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            disabled={!canConfigure}
            checked={form.aprovar_inventarios}
            onChange={(e) => setForm({ ...form, aprovar_inventarios: e.target.checked })}
          />
          <span>Exigir confirmação humana explícita para reconciliar divergências de inventário</span>
        </label>
      </div>

      {canConfigure && (
        <div className="pt-3 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-[#003366] hover:bg-[#002244] text-white px-5 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
          >
            <Save size={14} /> {saving ? 'A guardar...' : 'Guardar Configurações'}
          </button>
        </div>
      )}
    </form>
  );
};
