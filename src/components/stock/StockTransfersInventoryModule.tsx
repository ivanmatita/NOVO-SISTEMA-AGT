import React, { useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Layers,
  Plus,
  Save,
  XCircle,
} from 'lucide-react';
import type {
  Product,
  StockBalance,
  StockInventory,
  StockInventoryItem,
  StockLot,
  StockTransfer,
  Warehouse,
} from '../../types';
import { stockEnterpriseService } from '../../services/stockEnterpriseService';
import toast from 'react-hot-toast';

interface StockTransfersModuleProps {
  products: Product[];
  warehouses: Warehouse[];
  saldos: StockBalance[];
  transferencias: StockTransfer[];
  canTransfer: boolean;
  canApprove: boolean;
  onRefresh: () => void;
}

export const StockTransfersModule: React.FC<StockTransfersModuleProps> = ({
  products,
  warehouses,
  saldos,
  transferencias,
  canTransfer,
  canApprove,
  onRefresh,
}) => {
  const [productId, setProductId] = useState('');
  const [originId, setOriginId] = useState('');
  const [destId, setDestId] = useState('');
  const [qty, setQty] = useState('1');
  const [lote, setLote] = useState('');
  const [obs, setObs] = useState('');
  const [concluirDireto, setConcluirDireto] = useState(true);
  const [busy, setBusy] = useState(false);

  const physicalProducts = useMemo(
    () => products.filter((p) => !String(p.tipo || '').toLowerCase().includes('serv')),
    [products]
  );

  const originSaldo = useMemo(() => {
    if (!productId || !originId) return null;
    const s = saldos.find((x) => String(x.product_id) === productId && String(x.armazem_id) === originId);
    if (s) return Number(s.quantidade_disponivel || 0);
    const p = physicalProducts.find((x) => String(x.id) === productId);
    return p && String(p.armazem_id || p.warehouse_id || '') === originId ? Number(p.stock_quantity || 0) : 0;
  }, [productId, originId, saldos, physicalProducts]);

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !originId || !destId) {
      toast.error('Preencha produto, armazém de origem e armazém de destino.');
      return;
    }
    setBusy(true);
    try {
      await stockEnterpriseService.transferStock({
        action: 'create',
        product_id: productId,
        armazem_origem_id: originId,
        armazem_destino_id: destId,
        quantidade: Number(qty || 0),
        lote_codigo: lote.trim() || undefined,
        observacoes: obs.trim() || undefined,
        concluir_direto: concluirDireto,
      });
      toast.success(concluirDireto ? 'Transferência concluída e saldos atualizados!' : 'Transferência registada como pendente.');
      setQty('1');
      setLote('');
      setObs('');
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao criar transferência');
    } finally {
      setBusy(false);
    }
  };

  const handleAction = async (transferId: string, action: 'complete' | 'cancel') => {
    setBusy(true);
    try {
      await stockEnterpriseService.transferStock({ action, transfer_id: transferId });
      toast.success(action === 'complete' ? 'Transferência concluída!' : 'Transferência cancelada.');
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || 'Erro na operação');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {canTransfer && (
        <form onSubmit={handleCreateTransfer} className="bg-white border border-zinc-200 p-4 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
            <h3 className="text-sm font-black text-[#003366] uppercase tracking-tight flex items-center gap-2">
              <ArrowRightLeft size={16} /> Nova Transferência Entre Armazéns
            </h3>
            {originSaldo !== null && (
              <span className="text-xs font-bold text-[#003366] bg-blue-50 px-2.5 py-0.5">
                Disponível na Origem: {originSaldo}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="lg:col-span-2">
              <label className="text-[10px] font-bold uppercase text-zinc-500">Produto *</label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                required
                className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs font-bold"
              >
                <option value="">-- Selecione o produto --</option>
                {physicalProducts.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.name || p.nome} (Global: {p.stock_quantity} {p.unit})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-zinc-500">Armazém Origem *</label>
              <select
                value={originId}
                onChange={(e) => setOriginId(e.target.value)}
                required
                className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs font-bold"
              >
                <option value="">-- Origem --</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={String(w.id)}>
                    {w.name || (w as any).nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-zinc-500">Armazém Destino *</label>
              <select
                value={destId}
                onChange={(e) => setDestId(e.target.value)}
                required
                className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs font-bold"
              >
                <option value="">-- Destino --</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={String(w.id)}>
                    {w.name || (w as any).nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-zinc-500">Quantidade *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                required
                className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs font-black"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-zinc-500">Lote (Opcional)</label>
              <input
                value={lote}
                onChange={(e) => setLote(e.target.value)}
                placeholder="Ex: L-2026-01"
                className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs font-mono"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="text-[10px] font-bold uppercase text-zinc-500">Observações</label>
              <input
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                placeholder="Motivo ou guia de transporte..."
                className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs"
              />
            </div>

            <div className="lg:col-span-2 flex items-center justify-end gap-4 pt-4">
              <label className="flex items-center gap-1.5 text-xs font-bold text-zinc-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={concluirDireto}
                  onChange={(e) => setConcluirDireto(e.target.checked)}
                />
                <span>Concluir imediatamente (ou deixar pendente)</span>
              </label>

              <button
                type="submit"
                disabled={busy}
                className="bg-[#003366] hover:bg-[#002244] text-white px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowRightLeft size={13} /> {busy ? 'A processar...' : 'Registar Transferência'}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="bg-white border border-zinc-200 overflow-x-auto shadow-2xs">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-[#003366] text-white text-[10px] uppercase tracking-wider">
              <th className="px-3 py-2.5">Código</th>
              <th className="px-3 py-2.5">Data</th>
              <th className="px-3 py-2.5">Produto</th>
              <th className="px-3 py-2.5">Origem → Destino</th>
              <th className="px-3 py-2.5 text-right">Qtd</th>
              <th className="px-3 py-2.5">Estado</th>
              <th className="px-3 py-2.5">Responsável</th>
              <th className="px-3 py-2.5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {transferencias.map((t) => (
              <tr key={t.id} className="hover:bg-zinc-50">
                <td className="px-3 py-2 font-mono font-bold text-[#003366]">{t.codigo}</td>
                <td className="px-3 py-2 text-zinc-500">{new Date(t.created_at).toLocaleString('pt-PT')}</td>
                <td className="px-3 py-2 font-bold text-zinc-900">{t.product_name || 'Produto'}</td>
                <td className="px-3 py-2">
                  <span className="text-red-700 font-medium">{t.armazem_origem_nome}</span>
                  <span className="mx-1.5 text-zinc-400">→</span>
                  <span className="text-emerald-700 font-bold">{t.armazem_destino_nome}</span>
                </td>
                <td className="px-3 py-2 text-right font-black">{t.quantidade}</td>
                <td className="px-3 py-2">
                  <span
                    className={`px-2 py-0.5 text-[10px] font-black uppercase ${
                      t.estado === 'concluida'
                        ? 'bg-emerald-50 text-emerald-700'
                        : t.estado === 'pendente' || t.estado === 'aprovada'
                        ? 'bg-amber-50 text-amber-800'
                        : 'bg-zinc-100 text-zinc-500'
                    }`}
                  >
                    {t.estado}
                  </span>
                </td>
                <td className="px-3 py-2 text-zinc-500">{t.solicitado_por_nome || '---'}</td>
                <td className="px-3 py-2 text-right space-x-2">
                  {(t.estado === 'pendente' || t.estado === 'aprovada') && (
                    <>
                      {canApprove && (
                        <button
                          onClick={() => handleAction(t.id, 'complete')}
                          className="text-emerald-700 font-bold hover:underline cursor-pointer inline-flex items-center gap-1"
                        >
                          <CheckCircle2 size={13} /> Concluir
                        </button>
                      )}
                      <button
                        onClick={() => handleAction(t.id, 'cancel')}
                        className="text-red-600 font-bold hover:underline cursor-pointer inline-flex items-center gap-1"
                      >
                        <XCircle size={13} /> Cancelar
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {transferencias.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-zinc-400">
                  Nenhuma transferência entre armazéns registada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

interface StockInventoryLotsModuleProps {
  empresaId: string;
  products: Product[];
  warehouses: Warehouse[];
  inventarios: StockInventory[];
  inventarioItens: StockInventoryItem[];
  lotes: StockLot[];
  canCount: boolean;
  canReconcile: boolean;
  onRefresh: () => void;
}

export const StockInventoryLotsModule: React.FC<StockInventoryLotsModuleProps> = ({
  empresaId,
  products,
  warehouses,
  inventarios,
  inventarioItens,
  lotes,
  canCount,
  canReconcile,
  onRefresh,
}) => {
  const [subTab, setSubTab] = useState<'inventarios' | 'lotes'>('inventarios');
  const [titulo, setTitulo] = useState('');
  const [armazemId, setArmazemId] = useState('all');
  const [activeInvId, setActiveInvId] = useState<string | null>(inventarios[0]?.id || null);
  const [draftCounts, setDraftCounts] = useState<Record<string, string>>({});
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  // Form Lotes
  const [lotProdId, setLotProdId] = useState('');
  const [lotArmId, setLotArmId] = useState('');
  const [lotCode, setLotCode] = useState('');
  const [lotSerial, setLotSerial] = useState('');
  const [lotVal, setLotVal] = useState('');
  const [lotQty, setLotQty] = useState('1');

  const activeInv = useMemo(
    () => inventarios.find((i) => i.id === activeInvId) || inventarios[0] || null,
    [inventarios, activeInvId]
  );

  const activeItems = useMemo(
    () => (activeInv ? inventarioItens.filter((it) => it.inventario_id === activeInv.id) : []),
    [inventarioItens, activeInv]
  );

  const handleCreateInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await stockEnterpriseService.inventoryAction({
        action: 'create',
        titulo: titulo.trim() || `Inventário Geral ${new Date().toLocaleDateString('pt-PT')}`,
        armazem_id: armazemId,
      });
      toast.success(`Inventário criado com ${res.itens_count || 0} artigos.`);
      setTitulo('');
      if (res.inventario?.id) setActiveInvId(res.inventario.id);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao criar inventário');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveCounts = async () => {
    if (!activeInv) return;
    setBusy(true);
    try {
      const counts = activeItems.map((it) => ({
        id: it.id,
        stock_sistema: it.stock_sistema,
        custo_unitario: it.custo_unitario,
        stock_fisico:
          draftCounts[it.id] !== undefined
            ? draftCounts[it.id] === ''
              ? null
              : Number(draftCounts[it.id])
            : it.stock_fisico,
        justificativa: draftNotes[it.id] ?? it.justificativa ?? null,
      }));
      const res = await stockEnterpriseService.inventoryAction({
        action: 'save_counts',
        inventario_id: activeInv.id,
        counts,
      });
      toast.success(`Contagem guardada! Divergências detetadas: ${res.total_divergencias}`);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao guardar contagem');
    } finally {
      setBusy(false);
    }
  };

  const handleReconcile = async () => {
    if (!activeInv) return;
    if (!window.confirm(`Confirmar reconciliação oficial de ${activeInv.codigo}? As diferenças detetadas serão lançadas em movimentacoes_stock.`)) {
      return;
    }
    setBusy(true);
    try {
      const res = await stockEnterpriseService.inventoryAction({
        action: 'reconcile',
        inventario_id: activeInv.id,
      });
      toast.success(`Inventário reconciliado! ${res.adjusted || 0} ajustes de divergência aplicados.`);
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao reconciliar inventário');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateLot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lotProdId || (!lotCode.trim() && !lotSerial.trim())) {
      toast.error('Selecione o produto e informe o número do lote ou série.');
      return;
    }
    setBusy(true);
    try {
      await stockEnterpriseService.upsertLot(empresaId, {
        product_id: lotProdId,
        armazem_id: lotArmId || null,
        numero_lote: lotCode.trim() || null,
        numero_serie: lotSerial.trim() || null,
        data_validade: lotVal || null,
        quantidade_inicial: Number(lotQty || 0),
        quantidade_atual: Number(lotQty || 0),
        estado: 'ativo',
      });
      toast.success('Lote / Série registado!');
      setLotCode('');
      setLotSerial('');
      setLotVal('');
      setLotQty('1');
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao registar lote');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 bg-white border border-zinc-200 p-2">
        <button
          onClick={() => setSubTab('inventarios')}
          className={`px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
            subTab === 'inventarios' ? 'bg-[#003366] text-white' : 'text-zinc-600 hover:bg-zinc-100'
          }`}
        >
          <ClipboardCheck size={14} /> Inventário Físico & Reconciliação ({inventarios.length})
        </button>
        <button
          onClick={() => setSubTab('lotes')}
          className={`px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
            subTab === 'lotes' ? 'bg-[#003366] text-white' : 'text-zinc-600 hover:bg-zinc-100'
          }`}
        >
          <Layers size={14} /> Lotes, Números de Série & Validades ({lotes.length})
        </button>
      </div>

      {subTab === 'inventarios' ? (
        <div className="space-y-4">
          {canCount && (
            <form onSubmit={handleCreateInventory} className="bg-white border border-zinc-200 p-4 flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[220px]">
                <label className="text-[10px] font-bold uppercase text-zinc-500">Título do Inventário *</label>
                <input
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Contagem Mensal Armazém Central"
                  className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs font-medium"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-500">Armazém</label>
                <select
                  value={armazemId}
                  onChange={(e) => setArmazemId(e.target.value)}
                  className="bg-zinc-50 border border-zinc-200 p-2 text-xs font-bold"
                >
                  <option value="all">Todos os Armazéns</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={String(w.id)}>
                      {w.name || (w as any).nome}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={busy}
                className="bg-[#003366] hover:bg-[#002244] text-white px-4 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} /> Iniciar Inventário Físico
              </button>
            </form>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-zinc-200 p-3 space-y-2">
              <h4 className="text-[11px] font-black uppercase text-[#003366] border-b border-zinc-100 pb-1.5">
                Sessões de Inventário
              </h4>
              {inventarios.map((inv) => (
                <button
                  key={inv.id}
                  onClick={() => setActiveInvId(inv.id)}
                  className={`w-full text-left p-2.5 border text-xs cursor-pointer ${
                    activeInv?.id === inv.id
                      ? 'border-[#003366] bg-blue-50/50'
                      : 'border-zinc-200 hover:bg-zinc-50'
                  }`}
                >
                  <div className="flex justify-between font-bold text-[#003366]">
                    <span>{inv.codigo}</span>
                    <span className="uppercase text-[9px] px-1.5 py-0.5 bg-zinc-100 text-zinc-700">{inv.estado}</span>
                  </div>
                  <div className="font-bold text-zinc-800 truncate mt-0.5">{inv.titulo}</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">
                    {inv.armazem_nome} • {inv.total_itens} itens • {inv.total_divergencias} divergências
                  </div>
                </button>
              ))}
              {inventarios.length === 0 && <div className="text-xs text-zinc-400 py-6 text-center">Nenhum inventário criado.</div>}
            </div>

            <div className="lg:col-span-3 bg-white border border-zinc-200 p-4 space-y-3">
              {!activeInv ? (
                <div className="text-xs text-zinc-400 py-12 text-center">Selecione ou crie uma sessão de inventário.</div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3">
                    <div>
                      <h4 className="text-sm font-black text-[#003366] uppercase">
                        {activeInv.codigo} — {activeInv.titulo}
                      </h4>
                      <p className="text-[11px] text-zinc-500">
                        Armazém: {activeInv.armazem_nome} | Divergências: <strong>{activeInv.total_divergencias}</strong> | Impacto Financeiro:{' '}
                        <strong>{Number(activeInv.valor_diferenca || 0).toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz</strong>
                      </p>
                    </div>

                    {activeInv.estado !== 'reconciliado' && (
                      <div className="flex gap-2">
                        {canCount && (
                          <button
                            onClick={handleSaveCounts}
                            disabled={busy}
                            className="bg-zinc-800 hover:bg-zinc-900 text-white px-3 py-1.5 text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer"
                          >
                            <Save size={13} /> Guardar Contagem
                          </button>
                        )}
                        {canReconcile && (
                          <button
                            onClick={handleReconcile}
                            disabled={busy}
                            className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle2 size={13} /> Reconciliar Diferenças
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="overflow-x-auto max-h-[420px]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#003366] text-white text-[10px] uppercase">
                        <tr>
                          <th className="px-3 py-2">Produto / SKU</th>
                          <th className="px-3 py-2 text-right">Stock Sistema</th>
                          <th className="px-3 py-2 text-right">Contagem Física</th>
                          <th className="px-3 py-2 text-right">Diferença</th>
                          <th className="px-3 py-2 text-right">Impacto (Kz)</th>
                          <th className="px-3 py-2">Justificativa</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {activeItems.map((it) => {
                          const draftVal = draftCounts[it.id] !== undefined ? draftCounts[it.id] : it.stock_fisico === null ? '' : String(it.stock_fisico);
                          const diffNum = draftVal === '' ? 0 : Number(draftVal) - Number(it.stock_sistema || 0);
                          return (
                            <tr key={it.id} className="hover:bg-zinc-50">
                              <td className="px-3 py-2">
                                <div className="font-bold text-zinc-900">{it.product_name}</div>
                                <div className="text-[10px] text-zinc-400 font-mono">{it.sku || '---'}</div>
                              </td>
                              <td className="px-3 py-2 text-right font-bold">{it.stock_sistema}</td>
                              <td className="px-3 py-2 text-right">
                                {activeInv.estado === 'reconciliado' ? (
                                  <span className="font-black text-[#003366]">{it.stock_fisico ?? '---'}</span>
                                ) : (
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={draftVal}
                                    onChange={(e) => setDraftCounts({ ...draftCounts, [it.id]: e.target.value })}
                                    className="w-24 bg-zinc-50 border border-zinc-300 p-1 text-right font-bold"
                                  />
                                )}
                              </td>
                              <td className={`px-3 py-2 text-right font-black ${diffNum > 0 ? 'text-emerald-700' : diffNum < 0 ? 'text-red-600' : 'text-zinc-400'}`}>
                                {draftVal === '' ? '---' : `${diffNum > 0 ? '+' : ''}${diffNum}`}
                              </td>
                              <td className="px-3 py-2 text-right font-mono">
                                {(diffNum * Number(it.custo_unitario || 0)).toLocaleString('pt-AO', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-3 py-2">
                                {activeInv.estado === 'reconciliado' ? (
                                  <span className="text-zinc-500">{it.justificativa || '---'}</span>
                                ) : (
                                  <input
                                    value={draftNotes[it.id] ?? it.justificativa ?? ''}
                                    onChange={(e) => setDraftNotes({ ...draftNotes, [it.id]: e.target.value })}
                                    placeholder="Justificativa..."
                                    className="w-full bg-zinc-50 border border-zinc-200 p-1 text-xs"
                                  />
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Gestão de Lotes, Números de Série & Datas de Validade */
        <div className="space-y-4">
          {canCount && (
            <form onSubmit={handleCreateLot} className="bg-white border border-zinc-200 p-4 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold uppercase text-zinc-500">Produto *</label>
                <select
                  value={lotProdId}
                  onChange={(e) => setLotProdId(e.target.value)}
                  required
                  className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs font-bold"
                >
                  <option value="">-- Selecionar produto --</option>
                  {products.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.name || p.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-500">Armazém</label>
                <select value={lotArmId} onChange={(e) => setLotArmId(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs font-bold">
                  <option value="">-- Geral --</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={String(w.id)}>
                      {w.name || (w as any).nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-500">Nº Lote</label>
                <input value={lotCode} onChange={(e) => setLotCode(e.target.value)} placeholder="L-2026-A" className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs font-mono" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-500">Nº Série</label>
                <input value={lotSerial} onChange={(e) => setLotSerial(e.target.value)} placeholder="SN-00192" className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs font-mono" />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-500">Validade / Qtd</label>
                <div className="flex gap-1">
                  <input type="date" value={lotVal} onChange={(e) => setLotVal(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 p-1.5 text-xs" />
                  <input type="number" min="1" value={lotQty} onChange={(e) => setLotQty(e.target.value)} className="w-16 bg-zinc-50 border border-zinc-200 p-1.5 text-xs font-bold" />
                </div>
              </div>
              <div className="sm:col-span-3 lg:col-span-6 flex justify-end">
                <button type="submit" disabled={busy} className="bg-[#003366] text-white px-4 py-1.5 text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer">
                  <Plus size={13} /> Registar Lote / Série
                </button>
              </div>
            </form>
          )}

          <div className="bg-white border border-zinc-200 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#003366] text-white text-[10px] uppercase">
                <tr>
                  <th className="px-3 py-2">Produto</th>
                  <th className="px-3 py-2">Lote</th>
                  <th className="px-3 py-2">Nº Série</th>
                  <th className="px-3 py-2">Armazém</th>
                  <th className="px-3 py-2">Data Validade</th>
                  <th className="px-3 py-2 text-right">Qtd Atual</th>
                  <th className="px-3 py-2">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {lotes.map((l) => {
                  const prod = products.find((p) => String(p.id) === String(l.product_id));
                  const arm = warehouses.find((w) => String(w.id) === String(l.armazem_id || ''));
                  const daysLeft = l.data_validade
                    ? Math.ceil((new Date(l.data_validade).getTime() - Date.now()) / 86400000)
                    : null;
                  return (
                    <tr key={l.id} className="hover:bg-zinc-50">
                      <td className="px-3 py-2 font-bold text-zinc-900">{prod?.name || prod?.nome || 'Produto'}</td>
                      <td className="px-3 py-2 font-mono font-bold text-[#003366]">{l.numero_lote || '---'}</td>
                      <td className="px-3 py-2 font-mono text-zinc-600">{l.numero_serie || '---'}</td>
                      <td className="px-3 py-2 text-zinc-600">{arm?.name || (arm as any)?.nome || 'Geral'}</td>
                      <td className="px-3 py-2">
                        {l.data_validade ? (
                          <span
                            className={`inline-flex items-center gap-1 font-bold ${
                              daysLeft !== null && daysLeft <= 0
                                ? 'text-red-700'
                                : daysLeft !== null && daysLeft <= 30
                                ? 'text-amber-700'
                                : 'text-zinc-700'
                            }`}
                          >
                            <CalendarClock size={12} /> {l.data_validade}
                            {daysLeft !== null && ` (${daysLeft <= 0 ? 'Expirado' : `${daysLeft}d`})`}
                          </span>
                        ) : (
                          'Sem validade'
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-black">{l.quantidade_atual}</td>
                      <td className="px-3 py-2 uppercase text-[10px] font-bold">{l.estado}</td>
                    </tr>
                  );
                })}
                {lotes.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-zinc-400">
                      Nenhum lote ou número de série registado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
