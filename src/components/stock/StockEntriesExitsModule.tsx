import React, { useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Calculator,
  CheckCircle2,
  Download,
  History,
  PackageMinus,
  PackagePlus,
  QrCode,
  Search,
  ShieldAlert,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import type { Product, StockBalance, StockMovement, Warehouse } from '../../types';
import {
  computeProductMovementBreakdown,
  isInboundMovement,
  isOutboundMovement,
  stockEnterpriseService,
} from '../../services/stockEnterpriseService';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import toast from 'react-hot-toast';

interface StockEntriesExitsModuleProps {
  mode: 'entradas' | 'saidas' | 'movimentos';
  products: Product[];
  stockMovements: StockMovement[];
  warehouses: Warehouse[];
  saldos: StockBalance[];
  canOperate: boolean;
  onRefresh: () => void;
}

const formatKz = (val: number) =>
  Number(val || 0).toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Kz';

export const StockEntriesExitsModule: React.FC<StockEntriesExitsModuleProps> = ({
  mode,
  products,
  stockMovements,
  warehouses,
  saldos,
  canOperate,
  onRefresh,
}) => {
  const [selectedProdId, setSelectedProdId] = useState<string>('');
  const [armazemId, setArmazemId] = useState<string>(warehouses[0]?.id ? String(warehouses[0].id) : '');
  const [subtipo, setSubtipo] = useState<string>(
    mode === 'entradas' ? 'compra' : 'venda_manual'
  );
  const [quantity, setQuantity] = useState<string>('1');
  const [unitPrice, setUnitPrice] = useState<string>('');
  const [docOrigem, setDocOrigem] = useState<string>(mode === 'entradas' ? 'Fatura Fornecedor' : 'Guia de Saída');
  const [numDoc, setNumDoc] = useState<string>('');
  const [partnerName, setPartnerName] = useState<string>('');
  const [loteCodigo, setLoteCodigo] = useState<string>('');
  const [serialNumber, setSerialNumber] = useState<string>('');
  const [dataValidade, setDataValidade] = useState<string>('');
  const [motivo, setMotivo] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Filtros de movimentos
  const [search, setSearch] = useState('');
  const [whFilter, setWhFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'entradas' | 'saidas' | 'transfer' | 'perdas'>(
    mode === 'entradas' ? 'entradas' : mode === 'saidas' ? 'saidas' : 'all'
  );
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [movementViewMode, setMovementViewMode] = useState<'resumo_calculos' | 'diario'>('resumo_calculos');
  const [scannerOpen, setScannerOpen] = useState(false);

  const physicalProducts = useMemo(
    () => products.filter((p) => !String(p.tipo || '').toLowerCase().includes('serv')),
    [products]
  );

  const selectedProduct = useMemo(
    () => physicalProducts.find((p) => String(p.id) === String(selectedProdId)) || null,
    [physicalProducts, selectedProdId]
  );

  const handleProductSelect = (pid: string) => {
    setSelectedProdId(pid);
    const prod = physicalProducts.find((p) => String(p.id) === pid);
    if (prod) {
      setUnitPrice(String(mode === 'entradas' ? prod.cost_price || prod.preco_compra || 0 : prod.price || prod.preco_venda || 0));
      if (!armazemId && (prod.armazem_id || prod.warehouse_id)) {
        setArmazemId(String(prod.armazem_id || prod.warehouse_id));
      }
    }
  };

  const handleBarcodeDetected = (code: string) => {
    const clean = code.trim().toLowerCase();
    const matched = physicalProducts.find(
      (p) =>
        String(p.barcode || '').toLowerCase() === clean ||
        String(p.sku || '').toLowerCase() === clean ||
        String(p.referente || '').toLowerCase() === clean
    );
    if (matched) {
      handleProductSelect(String(matched.id));
      toast.success(`Produto selecionado: ${matched.name || matched.nome}`);
    } else {
      setSearch(code);
      toast('Código lido no filtro de pesquisa: ' + code);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      toast.error('Selecione um produto.');
      return;
    }
    const qty = Number(quantity || 0);
    if (qty <= 0) {
      toast.error('Introduza uma quantidade superior a 0.');
      return;
    }

    let opType: 'entry' | 'exit' | 'adjustment_plus' | 'adjustment_minus' | 'loss' | 'return' = 'entry';
    if (mode === 'entradas') {
      if (subtipo === 'devolucao_cliente') opType = 'return';
      else if (subtipo === 'ajuste_positivo') opType = 'adjustment_plus';
      else opType = 'entry';
    } else {
      if (subtipo === 'perda' || subtipo === 'dano' || subtipo === 'validade_expirada') opType = 'loss';
      else if (subtipo === 'devolucao_fornecedor') opType = 'return';
      else if (subtipo === 'ajuste_negativo') opType = 'adjustment_minus';
      else opType = 'exit';
    }

    setSubmitting(true);
    try {
      await stockEnterpriseService.executeOperation({
        product_id: selectedProduct.id,
        armazem_id: armazemId || null,
        type: opType,
        subtipo,
        quantity: qty,
        unit_price: Number(unitPrice || 0),
        motivo: motivo.trim() || `${mode === 'entradas' ? 'Entrada' : 'Saída'} (${subtipo})`,
        description: `${mode === 'entradas' ? 'Entrada' : 'Saída'} [${subtipo}]${numDoc ? ` Doc: ${numDoc}` : ''}${motivo ? ` - ${motivo}` : ''}`,
        documento_origem: docOrigem,
        numero_documento: numDoc.trim() || undefined,
        fornecedor_nome: mode === 'entradas' ? partnerName.trim() || undefined : undefined,
        cliente_nome: mode === 'saidas' ? partnerName.trim() || undefined : undefined,
        lote_codigo: loteCodigo.trim() || undefined,
        serial_number: serialNumber.trim() || undefined,
        data_validade: dataValidade || undefined,
      });

      toast.success(mode === 'entradas' ? 'Entrada de stock registada com sucesso!' : 'Saída de stock registada com sucesso!');
      setQuantity('1');
      setNumDoc('');
      setMotivo('');
      setLoteCodigo('');
      setSerialNumber('');
      setDataValidade('');
      onRefresh();
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao registar operação de stock');
    } finally {
      setSubmitting(false);
    }
  };

  // Movimentos filtrados para listagem diário
  const filteredMovements = useMemo(() => {
    const startMs = startDate ? new Date(`${startDate}T00:00:00`).getTime() : null;
    const endMs = endDate ? new Date(`${endDate}T23:59:59.999`).getTime() : null;
    const q = search.toLowerCase().trim();

    return stockMovements.filter((m) => {
      const ts = new Date(m.created_at).getTime();
      if (startMs && ts < startMs) return false;
      if (endMs && ts > endMs) return false;
      if (whFilter !== 'all') {
        const w1 = String(m.armazem_id || m.warehouse_id || '');
        const w2 = String(m.to_warehouse_id || m.armazem_destino_id || '');
        if (w1 !== whFilter && w2 !== whFilter) return false;
      }
      if (typeFilter === 'entradas' && !isInboundMovement(m)) return false;
      if (typeFilter === 'saidas' && !isOutboundMovement(m)) return false;
      if (typeFilter === 'transfer' && m.type !== 'transfer') return false;
      if (typeFilter === 'perdas' && m.type !== 'loss' && m.subtipo !== 'perda' && m.subtipo !== 'dano') return false;
      if (q) {
        const prod = products.find((p) => String(p.id) === String(m.product_id));
        const txt = `${m.product_name || prod?.name || prod?.nome || ''} ${m.description || ''} ${m.numero_documento || ''} ${m.reference_id || ''} ${m.lote_codigo || ''}`.toLowerCase();
        if (!txt.includes(q)) return false;
      }
      return true;
    });
  }, [stockMovements, products, startDate, endDate, whFilter, typeFilter, search]);

  // Cálculos detalhados de entradas e saídas por produto
  const breakdownRows = useMemo(
    () =>
      computeProductMovementBreakdown(physicalProducts, stockMovements, warehouses, saldos, {
        warehouseId: whFilter,
        startDate,
        endDate,
        search,
      }),
    [physicalProducts, stockMovements, warehouses, saldos, whFilter, startDate, endDate, search]
  );

  const totals = useMemo(() => {
    return breakdownRows.reduce(
      (acc, r) => ({
        inicial: acc.inicial + r.qtd_inicial,
        entradas: acc.entradas + r.qtd_entradas,
        valEntradas: acc.valEntradas + r.valor_entradas,
        saidas: acc.saidas + r.qtd_saidas,
        valSaidas: acc.valSaidas + r.valor_saidas,
        ajustesPos: acc.ajustesPos + r.qtd_ajustes_pos,
        ajustesNeg: acc.ajustesNeg + r.qtd_ajustes_neg,
        perdas: acc.perdas + r.qtd_perdas,
        devolucoes: acc.devolucoes + r.qtd_devolucoes,
        saldo: acc.saldo + r.saldo_atual,
        valorCusto: acc.valorCusto + r.valor_stock_custo,
        valorVenda: acc.valorVenda + r.valor_stock_venda,
      }),
      {
        inicial: 0,
        entradas: 0,
        valEntradas: 0,
        saidas: 0,
        valSaidas: 0,
        ajustesPos: 0,
        ajustesNeg: 0,
        perdas: 0,
        devolucoes: 0,
        saldo: 0,
        valorCusto: 0,
        valorVenda: 0,
      }
    );
  }, [breakdownRows]);

  const handleExportMovementsExcel = () => {
    const wb = XLSX.utils.book_new();
    const sheetCalc = XLSX.utils.json_to_sheet(
      breakdownRows.map((r) => ({
        Produto: r.product_name,
        SKU: r.sku,
        Categoria: r.category,
        Armazém: r.warehouse_name,
        Unidade: r.unit,
        'Stock Inicial': r.qtd_inicial,
        'Qtd Entradas': r.qtd_entradas,
        'Valor Entradas (Kz)': r.valor_entradas,
        'Qtd Saídas': r.qtd_saidas,
        'Valor Saídas (Kz)': r.valor_saidas,
        'Ajustes (+)': r.qtd_ajustes_pos,
        'Ajustes (-)': r.qtd_ajustes_neg,
        'Perdas/Danos': r.qtd_perdas,
        Devoluções: r.qtd_devolucoes,
        'Transf. Entrada': r.qtd_transf_in,
        'Transf. Saída': r.qtd_transf_out,
        'Saldo Atual': r.saldo_atual,
        Reservado: r.reservado,
        Disponível: r.disponivel,
        'Custo Médio CMP (Kz)': r.custo_medio_cmp,
        'Valor Stock Custo (Kz)': r.valor_stock_custo,
        'Valor Stock Venda (Kz)': r.valor_stock_venda,
        'Margem Potencial (Kz)': r.margem_potencial,
      }))
    );
    const sheetMovs = XLSX.utils.json_to_sheet(
      filteredMovements.map((m) => {
        const prod = products.find((p) => String(p.id) === String(m.product_id));
        const inbound = isInboundMovement(m);
        return {
          Data: new Date(m.created_at).toLocaleString('pt-PT'),
          Produto: m.product_name || prod?.name || prod?.nome || 'Produto',
          Natureza: inbound ? 'ENTRADA (+)' : 'SAÍDA (-)',
          Tipo: m.type,
          Subtipo: m.subtipo || m.type,
          Quantidade: m.quantity,
          'Preço/Custo Unit. (Kz)': Number(m.custo_unitario || m.unit_price || 0),
          'Valor Total (Kz)': Number(m.valor_total || Number(m.quantity || 0) * Number(m.custo_unitario || m.unit_price || 0)),
          'Stock Anterior': m.previous_stock,
          'Stock Resultante': m.current_stock,
          Armazém: m.warehouse_name || warehouses.find((w) => String(w.id) === String(m.armazem_id || m.warehouse_id || ''))?.name || 'Geral',
          Lote: m.lote_codigo || '',
          Documento: m.numero_documento || m.reference_id || '',
          Descrição: m.description || '',
          Utilizador: m.created_by_nome || m.created_by_username || '',
        };
      })
    );
    XLSX.utils.book_append_sheet(wb, sheetCalc, 'Calculos_Entrada_Saida');
    XLSX.utils.book_append_sheet(wb, sheetMovs, 'Movimentos_Diario');
    XLSX.writeFile(wb, `Movimentos_Stock_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-4">
      {(mode === 'entradas' || mode === 'saidas') && (
        <div className="bg-white border border-zinc-200 p-4 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 pb-3 mb-4">
            <div className="flex items-center gap-2">
              {mode === 'entradas' ? (
                <PackagePlus size={18} className="text-emerald-600" />
              ) : (
                <PackageMinus size={18} className="text-red-600" />
              )}
              <div>
                <h3 className="text-sm font-black text-[#003366] uppercase tracking-tight">
                  {mode === 'entradas'
                    ? 'Registo de Entrada de Mercadorias & Recebimentos'
                    : 'Registo de Saída, Consumo, Perda ou Devolução'}
                </h3>
                <p className="text-[11px] text-zinc-400">
                  {mode === 'entradas'
                    ? 'Atualiza automaticamente saldo por armazém, Custo Médio Ponderado (CMP), lote/validade e histórico.'
                    : 'Valida stock disponível, abate do armazém/lote e grava movimento auditável com cálculos.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setScannerOpen(true)}
              className="bg-zinc-100 hover:bg-zinc-200 text-[#003366] px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <QrCode size={14} /> Ler Código Barras / QR
            </button>
          </div>

          {!canOperate ? (
            <div className="bg-amber-50 border border-amber-200 p-4 text-xs text-amber-900 flex items-center gap-2">
              <ShieldAlert size={16} />
              <span>O seu perfil tem apenas acesso de consulta/auditoria e não pode registar entradas ou saídas.</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label className="text-[10px] font-bold uppercase text-zinc-500">Produto *</label>
                <select
                  value={selectedProdId}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  required
                  className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs font-bold focus:outline-none focus:border-[#003366]"
                >
                  <option value="">-- Selecione o produto --</option>
                  {physicalProducts.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.name || p.nome} (Stock: {p.stock_quantity} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-500">Armazém *</label>
                <select
                  value={armazemId}
                  onChange={(e) => setArmazemId(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs font-bold focus:outline-none focus:border-[#003366]"
                >
                  <option value="">-- Armazém Geral --</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={String(w.id)}>
                      {w.name || (w as any).nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-500">Natureza / Tipo *</label>
                <select
                  value={subtipo}
                  onChange={(e) => setSubtipo(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs font-bold focus:outline-none focus:border-[#003366]"
                >
                  {mode === 'entradas' ? (
                    <>
                      <option value="compra">Entrada de Compra / Recebimento</option>
                      <option value="devolucao_cliente">Devolução de Cliente (+)</option>
                      <option value="producao">Entrada de Produção / Fabrico</option>
                      <option value="ajuste_positivo">Ajuste Positivo / Sobra</option>
                    </>
                  ) : (
                    <>
                      <option value="venda_manual">Saída de Venda / Expedição</option>
                      <option value="consumo_interno">Consumo Interno / Requisição</option>
                      <option value="perda">Perda / Quebra de Stock</option>
                      <option value="dano">Produto Danificado / Avaria</option>
                      <option value="validade_expirada">Abate por Validade Expirada</option>
                      <option value="devolucao_fornecedor">Devolução a Fornecedor (-)</option>
                      <option value="ajuste_negativo">Ajuste Negativo</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-500">Quantidade *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                  className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs font-black focus:outline-none focus:border-[#003366]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-500">
                  {mode === 'entradas' ? 'Custo Unitário (Kz)' : 'Valor/Custo Unitário (Kz)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs font-bold focus:outline-none focus:border-[#003366]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-500">Documento Origem</label>
                <input
                  value={docOrigem}
                  onChange={(e) => setDocOrigem(e.target.value)}
                  placeholder="Ex: Fatura, Guia Remessa"
                  className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs focus:outline-none focus:border-[#003366]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-500">Nº Documento</label>
                <input
                  value={numDoc}
                  onChange={(e) => setNumDoc(e.target.value)}
                  placeholder="Ex: FT-2026/001"
                  className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs font-mono focus:outline-none focus:border-[#003366]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-500">
                  {mode === 'entradas' ? 'Fornecedor' : 'Cliente / Destino'}
                </label>
                <input
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  placeholder={mode === 'entradas' ? 'Nome do fornecedor' : 'Cliente ou departamento'}
                  className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs focus:outline-none focus:border-[#003366]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-500">Lote / Série</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    value={loteCodigo}
                    onChange={(e) => setLoteCodigo(e.target.value)}
                    placeholder="Lote"
                    className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs font-mono focus:outline-none focus:border-[#003366]"
                  />
                  <input
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="Nº Série"
                    className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs font-mono focus:outline-none focus:border-[#003366]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-500">Validade (Opcional)</label>
                <input
                  type="date"
                  value={dataValidade}
                  onChange={(e) => setDataValidade(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs focus:outline-none focus:border-[#003366]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-500">Motivo / Observações</label>
                <input
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Justificação operacional..."
                  className="w-full bg-zinc-50 border border-zinc-200 p-2 text-xs focus:outline-none focus:border-[#003366]"
                />
              </div>

              <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-100">
                <div className="text-xs text-zinc-600">
                  Total calculado:{' '}
                  <strong className="text-[#003366]">
                    {formatKz(Number(quantity || 0) * Number(unitPrice || 0))}
                  </strong>
                  {selectedProduct && (
                    <span className="ml-3 text-zinc-500">
                      Stock Atual: <strong>{selectedProduct.stock_quantity} {selectedProduct.unit}</strong> →{' '}
                      Previsto:{' '}
                      <strong className={mode === 'entradas' ? 'text-emerald-700' : 'text-red-700'}>
                        {mode === 'entradas'
                          ? Number(selectedProduct.stock_quantity) + Number(quantity || 0)
                          : Number(selectedProduct.stock_quantity) - Number(quantity || 0)}{' '}
                        {selectedProduct.unit}
                      </strong>
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className={`${
                    mode === 'entradas' ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-red-700 hover:bg-red-800'
                  } text-white px-5 py-2 text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer`}
                >
                  <CheckCircle2 size={14} />
                  <span>{submitting ? 'A processar...' : mode === 'entradas' ? 'Confirmar Entrada' : 'Confirmar Saída'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Resumo Financeiro + Cálculos de Entradas e Saídas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
        <div className="bg-white border border-zinc-200 p-3">
          <div className="text-[10px] font-black uppercase text-zinc-400">Stock Inicial (Período)</div>
          <div className="text-lg font-black text-zinc-800">{totals.inicial.toLocaleString('pt-PT')}</div>
        </div>
        <div className="bg-white border border-emerald-200 bg-emerald-50/30 p-3">
          <div className="text-[10px] font-black uppercase text-emerald-700">Total Entradas</div>
          <div className="text-lg font-black text-emerald-700">+{totals.entradas.toLocaleString('pt-PT')}</div>
          <div className="text-[10px] font-bold text-emerald-800 truncate">{formatKz(totals.valEntradas)}</div>
        </div>
        <div className="bg-white border border-red-200 bg-red-50/30 p-3">
          <div className="text-[10px] font-black uppercase text-red-700">Total Saídas</div>
          <div className="text-lg font-black text-red-700">-{totals.saidas.toLocaleString('pt-PT')}</div>
          <div className="text-[10px] font-bold text-red-800 truncate">{formatKz(totals.valSaidas)}</div>
        </div>
        <div className="bg-white border border-zinc-200 p-3">
          <div className="text-[10px] font-black uppercase text-zinc-400">Ajustes (+ / -)</div>
          <div className="text-sm font-black text-zinc-800 mt-1">
            <span className="text-emerald-700">+{totals.ajustesPos}</span> /{' '}
            <span className="text-red-600">-{totals.ajustesNeg}</span>
          </div>
          <div className="text-[10px] text-zinc-500">Perdas: {totals.perdas}</div>
        </div>
        <div className="bg-white border border-zinc-200 p-3">
          <div className="text-[10px] font-black uppercase text-zinc-400">Saldo Final Stock</div>
          <div className="text-lg font-black text-[#003366]">{totals.saldo.toLocaleString('pt-PT')}</div>
        </div>
        <div className="bg-white border border-zinc-200 p-3">
          <div className="text-[10px] font-black uppercase text-zinc-400">Valor Stock (Custo)</div>
          <div className="text-sm font-black text-[#003366] mt-1 truncate">{formatKz(totals.valorCusto)}</div>
          <div className="text-[10px] text-emerald-700 font-bold truncate">Venda: {formatKz(totals.valorVenda)}</div>
        </div>
      </div>

      {/* Filtros + Seletor de Vista (Cálculos por Produto vs Diário Movimento-a-Movimento) */}
      <div className="bg-white border border-zinc-200 p-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex border border-zinc-200 bg-zinc-50 p-0.5">
            <button
              type="button"
              onClick={() => setMovementViewMode('resumo_calculos')}
              className={`px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                movementViewMode === 'resumo_calculos' ? 'bg-[#003366] text-white' : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <Calculator size={13} /> Cálculos Entrada/Saída por Produto
            </button>
            <button
              type="button"
              onClick={() => setMovementViewMode('diario')}
              className={`px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                movementViewMode === 'diario' ? 'bg-[#003366] text-white' : 'text-zinc-600 hover:bg-zinc-100'
              }`}
            >
              <History size={13} /> Diário de Movimentos ({filteredMovements.length})
            </button>
          </div>

          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-2 text-zinc-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar produto, doc, lote..."
              className="pl-8 pr-2 py-1.5 bg-zinc-50 border border-zinc-200 text-xs w-48 focus:outline-none focus:border-[#003366]"
            />
          </div>

          <select
            value={whFilter}
            onChange={(e) => setWhFilter(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 px-2 py-1.5 text-xs font-bold"
          >
            <option value="all">Todos Armazéns</option>
            {warehouses.map((w) => (
              <option key={w.id} value={String(w.id)}>
                {w.name || (w as any).nome}
              </option>
            ))}
          </select>

          {movementViewMode === 'diario' && (
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="bg-zinc-50 border border-zinc-200 px-2 py-1.5 text-xs font-bold"
            >
              <option value="all">Todos Movimentos</option>
              <option value="entradas">Apenas Entradas (+)</option>
              <option value="saidas">Apenas Saídas (-)</option>
              <option value="transfer">Transferências</option>
              <option value="perdas">Perdas / Danos</option>
            </select>
          )}

          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 px-2 py-1 text-xs"
            title="Data Inicial"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 px-2 py-1 text-xs"
            title="Data Final"
          />
        </div>

        <button
          type="button"
          onClick={handleExportMovementsExcel}
          className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
        >
          <Download size={13} /> Excel Completo
        </button>
      </div>

      {/* Tabela 1: Cálculos Detalhados de Entrada e Saída por Produto */}
      {movementViewMode === 'resumo_calculos' ? (
        <div className="bg-white border border-zinc-200 overflow-x-auto shadow-2xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#003366] text-white text-[10px] font-black uppercase tracking-wider">
                <th className="px-3 py-2.5">Produto / SKU</th>
                <th className="px-3 py-2.5">Armazém</th>
                <th className="px-3 py-2.5 text-right">Qtd Inicial</th>
                <th className="px-3 py-2.5 text-right text-emerald-200">Entradas (+)</th>
                <th className="px-3 py-2.5 text-right text-emerald-200">Val. Entradas</th>
                <th className="px-3 py-2.5 text-right text-rose-200">Saídas (-)</th>
                <th className="px-3 py-2.5 text-right text-rose-200">Val. Saídas</th>
                <th className="px-3 py-2.5 text-right">Ajustes / Perdas</th>
                <th className="px-3 py-2.5 text-right">Saldo Atual</th>
                <th className="px-3 py-2.5 text-right">Disp. / Res.</th>
                <th className="px-3 py-2.5 text-right">CMP (Kz)</th>
                <th className="px-3 py-2.5 text-right">Valor Stock (Kz)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {breakdownRows.map((r) => (
                <tr key={r.product_id} className="hover:bg-zinc-50">
                  <td className="px-3 py-2">
                    <div className="font-bold text-zinc-900">{r.product_name}</div>
                    <div className="text-[10px] text-zinc-400 font-mono">{r.sku} • {r.category}</div>
                  </td>
                  <td className="px-3 py-2 text-zinc-600">{r.warehouse_name}</td>
                  <td className="px-3 py-2 text-right font-mono">{r.qtd_inicial}</td>
                  <td className="px-3 py-2 text-right font-black text-emerald-700">+{r.qtd_entradas}</td>
                  <td className="px-3 py-2 text-right text-emerald-700 font-medium">{formatKz(r.valor_entradas)}</td>
                  <td className="px-3 py-2 text-right font-black text-red-600">-{r.qtd_saidas}</td>
                  <td className="px-3 py-2 text-right text-red-600 font-medium">{formatKz(r.valor_saidas)}</td>
                  <td className="px-3 py-2 text-right text-[11px]">
                    <span className="text-emerald-700">+{r.qtd_ajustes_pos}</span> /{' '}
                    <span className="text-red-600">-{r.qtd_ajustes_neg + r.qtd_perdas}</span>
                  </td>
                  <td className="px-3 py-2 text-right font-black text-[#003366]">
                    {r.saldo_atual} <span className="text-[10px] font-normal text-zinc-400">{r.unit}</span>
                  </td>
                  <td className="px-3 py-2 text-right text-[11px]">
                    <span className="text-emerald-700 font-bold">{r.disponivel}</span> /{' '}
                    <span className="text-amber-700">{r.reservado}</span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{formatKz(r.custo_medio_cmp)}</td>
                  <td className="px-3 py-2 text-right font-black text-[#003366]">{formatKz(r.valor_stock_custo)}</td>
                </tr>
              ))}
              {breakdownRows.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-4 py-10 text-center text-zinc-400">
                    Nenhum produto encontrado para os filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Tabela 2: Diário Movimento-a-Movimento (Entradas & Saídas detalhadas) */
        <div className="bg-white border border-zinc-200 overflow-x-auto shadow-2xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#003366] text-white text-[10px] font-black uppercase tracking-wider">
                <th className="px-3 py-2.5">Data / Hora</th>
                <th className="px-3 py-2.5">Produto</th>
                <th className="px-3 py-2.5">Tipo / Subtipo</th>
                <th className="px-3 py-2.5">Armazém</th>
                <th className="px-3 py-2.5 text-right">Qtd</th>
                <th className="px-3 py-2.5 text-right">Custo/Preço</th>
                <th className="px-3 py-2.5 text-right">Valor Total</th>
                <th className="px-3 py-2.5 text-center">Ant. → Atual</th>
                <th className="px-3 py-2.5">Doc / Lote</th>
                <th className="px-3 py-2.5">Descrição / Utilizador</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredMovements.map((m) => {
                const prod = products.find((p) => String(p.id) === String(m.product_id));
                const inbound = isInboundMovement(m);
                const unitVal = Number(m.custo_unitario || m.unit_price || 0);
                const totalVal = Number(m.valor_total || Number(m.quantity || 0) * unitVal);
                const whName =
                  m.warehouse_name ||
                  warehouses.find((w) => String(w.id) === String(m.armazem_id || m.warehouse_id || ''))?.name ||
                  'Geral';
                return (
                  <tr key={m.id} className="hover:bg-zinc-50">
                    <td className="px-3 py-2 text-zinc-500 whitespace-nowrap">
                      {new Date(m.created_at).toLocaleString('pt-PT')}
                    </td>
                    <td className="px-3 py-2 font-bold text-zinc-900">
                      {m.product_name || prod?.name || prod?.nome || 'Produto'}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-black uppercase ${
                          m.type === 'transfer'
                            ? 'bg-blue-50 text-blue-700'
                            : inbound
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {inbound ? <ArrowDownLeft size={11} /> : <ArrowUpRight size={11} />}
                        {m.subtipo || m.type}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-zinc-600">
                      {whName}
                      {m.to_warehouse_name ? ` → ${m.to_warehouse_name}` : ''}
                    </td>
                    <td className={`px-3 py-2 text-right font-black ${inbound ? 'text-emerald-700' : 'text-red-600'}`}>
                      {inbound ? '+' : '-'}{m.quantity}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{formatKz(unitVal)}</td>
                    <td className="px-3 py-2 text-right font-bold text-[#003366]">{formatKz(totalVal)}</td>
                    <td className="px-3 py-2 text-center font-mono text-[11px]">
                      <span className="text-zinc-400">{m.previous_stock}</span> →{' '}
                      <strong className="text-[#003366]">{m.current_stock}</strong>
                    </td>
                    <td className="px-3 py-2 font-mono text-[10px] text-zinc-500">
                      {m.numero_documento || m.reference_id || '---'}
                      {m.lote_codigo ? ` | Lote: ${m.lote_codigo}` : ''}
                    </td>
                    <td className="px-3 py-2 text-zinc-500">
                      <div className="truncate max-w-xs">{m.description || '---'}</div>
                      <div className="text-[10px] text-zinc-400">{m.created_by_nome || m.created_by_username || ''}</div>
                    </td>
                  </tr>
                );
              })}
              {filteredMovements.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-zinc-400">
                    Nenhum movimento registado para estes filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <BarcodeScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={handleBarcodeDetected}
      />
    </div>
  );
};
