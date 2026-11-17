/**
 * StockEntradasReport.tsx
 * Relatório de Entradas de Stock — apenas movimentos tipo 'entry'/'entrada'
 * Exclui COMPLETAMENTE documentos de venda (Fatura de Venda, Fatura-Recibo de Venda, etc.)
 */
import React, { useState, useMemo } from 'react';
import { FileDown, Filter, Search, Package, Calendar, ArrowUpCircle, TrendingUp } from 'lucide-react';
import { StockMovement } from '../../types';

interface StockEntradasReportProps {
  stockMovements: StockMovement[];
  products: any[];
  warehouses: any[];
  companyData?: any;
  fiscalYear?: number;
  onRefresh?: () => void;
}

const TIPOS_SAIDA_EXCLUIR = [
  'exit', 'saida', 'saída', 'venda', 'sale',
  'fatura_venda', 'factura_venda', 'fatura-venda',
  'nota_credito_venda', 'nota_debito_venda',
  'transfer_out', 'transferencia_saida',
  'adjustment_minus', 'ajuste_negativo',
];

const DOCUMENTOS_VENDA_EXCLUIR = [
  'fatura de venda', 'factura de venda',
  'fatura-recibo de venda', 'factura-recibo de venda',
  'recibo de venda', 'nota de crédito de venda',
  'nota de débito de venda', 'fatura venda',
  'invoice', 'sale', 'venda',
];

function isEntradaValida(m: StockMovement & any): boolean {
  const tipo = (m.type || m.tipo || '').toLowerCase().trim();
  const docOrigem = (m.documento_origem || m.document_type || m.tipo_documento || '').toLowerCase().trim();

  // Excluir qualquer tipo de saída
  if (TIPOS_SAIDA_EXCLUIR.some(t => tipo.includes(t))) return false;

  // Excluir documentos de venda
  if (DOCUMENTOS_VENDA_EXCLUIR.some(d => docOrigem.includes(d))) return false;

  // Aceitar apenas entradas
  return tipo === 'entry' || tipo === 'entrada' ||
    tipo === 'adjustment_plus' || tipo === 'ajuste_positivo' ||
    tipo === 'compra' || tipo === 'purchase' || tipo === 'initial';
}

export const StockEntradasReport: React.FC<StockEntradasReportProps> = ({
  stockMovements,
  products,
  warehouses,
  companyData,
  fiscalYear,
  onRefresh,
}) => {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchProduct, setSearchProduct] = useState('');
  const [filterWarehouse, setFilterWarehouse] = useState('all');
  const [filterTipo, setFilterTipo] = useState('all');

  // Filtrar apenas entradas válidas
  const entradas = useMemo(() => {
    return (stockMovements || []).filter(m => isEntradaValida(m as any));
  }, [stockMovements]);

  const filtered = useMemo(() => {
    return entradas.filter(m => {
      const mov = m as any;
      // Filtro por data
      if (dateFrom) {
        const movDate = new Date(m.created_at || mov.data_documento || '');
        if (movDate < new Date(dateFrom)) return false;
      }
      if (dateTo) {
        const movDate = new Date(m.created_at || mov.data_documento || '');
        if (movDate > new Date(dateTo + 'T23:59:59')) return false;
      }
      // Filtro por produto
      if (searchProduct.trim()) {
        const q = searchProduct.toLowerCase();
        const prodId = String(m.product_id || mov.produto_id || '');
        const prod = products.find(p => String(p.id) === prodId);
        const nome = (prod?.name || prod?.nome || mov.descricao || m.description || '').toLowerCase();
        if (!nome.includes(q)) return false;
      }
      // Filtro por armazém
      if (filterWarehouse !== 'all') {
        const wId = String(mov.armazem_id || m.warehouse_id || '');
        if (wId !== String(filterWarehouse)) return false;
      }
      // Filtro por tipo
      if (filterTipo !== 'all') {
        const tipo = (m.type || mov.tipo || '').toLowerCase();
        if (!tipo.includes(filterTipo)) return false;
      }
      return true;
    });
  }, [entradas, dateFrom, dateTo, searchProduct, filterWarehouse, filterTipo, products]);

  const totalQty = filtered.reduce((s, m) => s + Number((m as any).quantity || (m as any).quantidade || 0), 0);
  const totalVal = filtered.reduce((s, m) => {
    const qty = Number((m as any).quantity || (m as any).quantidade || 0);
    const price = Number((m as any).unit_price || (m as any).preco_unitario || 0);
    return s + qty * price;
  }, 0);

  const getProductName = (m: any) => {
    const id = String(m.product_id || m.produto_id || '');
    const prod = products.find(p => String(p.id) === id);
    return prod?.name || prod?.nome || m.description || m.descricao_movimento || '—';
  };

  const getWarehouseName = (m: any) => {
    const wId = String(m.armazem_id || m.warehouse_id || '');
    const w = warehouses.find(wh => String(wh.id) === wId);
    return w?.name || w?.nome || (wId ? `Arm. ${wId}` : '—');
  };

  const handleExportPDF = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    const rows = filtered.map(m => {
      const mov = m as any;
      const qty = Number(mov.quantity || mov.quantidade || 0);
      const price = Number(mov.unit_price || mov.preco_unitario || 0);
      return `<tr>
        <td>${new Date(m.created_at || mov.data_documento || '').toLocaleDateString('pt-PT')}</td>
        <td>${getProductName(mov)}</td>
        <td>${mov.referencia || mov.reference_id || '—'}</td>
        <td>${getWarehouseName(mov)}</td>
        <td>${mov.tipo || mov.type || '—'}</td>
        <td>${mov.numero_documento || mov.referencia || '—'}</td>
        <td>${mov.fornecedor_nome || '—'}</td>
        <td style="text-align:right">${qty}</td>
        <td style="text-align:right">${price.toFixed(2)}</td>
        <td style="text-align:right">${(qty * price).toFixed(2)}</td>
      </tr>`;
    }).join('');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Relatório Entradas Stock</title>
    <style>body{font-family:sans-serif;font-size:11px;margin:20px}table{width:100%;border-collapse:collapse}
    th{background:#003366;color:#fff;padding:6px 4px;font-size:9px}td{padding:5px 4px;border-bottom:1px solid #eee}
    h1{color:#003366;font-size:16px}.total{margin-top:12px;text-align:right;font-weight:bold}</style></head>
    <body><h1>${companyData?.nome || 'IMATEC'} — Relatório de Entradas de Stock</h1>
    <p>Exercício: ${fiscalYear || new Date().getFullYear()} | Registos: ${filtered.length}</p>
    <table><thead><tr><th>Data</th><th>Produto</th><th>Referência</th><th>Armazém</th><th>Tipo</th>
    <th>Documento</th><th>Fornecedor</th><th>Qtd</th><th>Custo Unit.</th><th>Total</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <div class="total">Total Quantidade: ${totalQty} | Total Valor: ${totalVal.toFixed(2)} AOA</div>
    </body></html>`);
    win.document.close();
    win.print();
  };

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Entradas', value: filtered.length, icon: <Package size={18} className="text-blue-500" />, color: 'blue' },
          { label: 'Total Quantidade', value: totalQty.toLocaleString('pt-AO'), icon: <TrendingUp size={18} className="text-green-500" />, color: 'green' },
          { label: 'Valor Total (AOA)', value: totalVal.toLocaleString('pt-AO', { minimumFractionDigits: 2 }), icon: <ArrowUpCircle size={18} className="text-purple-500" />, color: 'purple' },
        ].map((kpi, i) => (
          <div key={i} className="bg-white border border-zinc-200 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
            <div className={`bg-${kpi.color}-50 p-2 rounded-lg`}>{kpi.icon}</div>
            <div>
              <p className="text-xs text-zinc-500 font-medium">{kpi.label}</p>
              <p className="font-bold text-zinc-900 text-sm">{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1 min-w-[140px]">
            <label className="text-xs font-bold text-zinc-400 uppercase">Data Início</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#003366]" />
          </div>
          <div className="flex flex-col gap-1 min-w-[140px]">
            <label className="text-xs font-bold text-zinc-400 uppercase">Data Fim</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#003366]" />
          </div>
          <div className="flex-1 min-w-[180px] flex flex-col gap-1">
            <label className="text-xs font-bold text-zinc-400 uppercase">Produto</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input type="text" placeholder="Pesquisar produto..." value={searchProduct}
                onChange={e => setSearchProduct(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#003366]" />
            </div>
          </div>
          <div className="flex flex-col gap-1 min-w-[150px]">
            <label className="text-xs font-bold text-zinc-400 uppercase">Armazém</label>
            <select value={filterWarehouse} onChange={e => setFilterWarehouse(e.target.value)}
              className="border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#003366]">
              <option value="all">Todos</option>
              {warehouses.map(w => <option key={w.id} value={String(w.id)}>{w.name || w.nome}</option>)}
            </select>
          </div>
          <button onClick={handleExportPDF}
            className="bg-[#003366] text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 hover:bg-[#002244] transition shadow-sm uppercase tracking-wider">
            <FileDown size={14} /> PDF
          </button>
          {onRefresh && (
            <button onClick={onRefresh}
              className="bg-zinc-100 text-zinc-700 text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 hover:bg-zinc-200 transition uppercase tracking-wider">
              <Filter size={14} /> Atualizar
            </button>
          )}
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-[#003366] to-[#004488] text-white text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Data</th>
                <th className="px-4 py-3 text-left">Produto</th>
                <th className="px-4 py-3 text-left">Armazém</th>
                <th className="px-4 py-3 text-left">Tipo</th>
                <th className="px-4 py-3 text-left">Documento</th>
                <th className="px-4 py-3 text-left">Fornecedor</th>
                <th className="px-4 py-3 text-right">Qtd</th>
                <th className="px-4 py-3 text-right">Custo Unit.</th>
                <th className="px-4 py-3 text-right">Valor Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-zinc-400">
                    <Package size={32} className="mx-auto mb-2 opacity-30" />
                    <p>Nenhuma entrada de stock encontrada com os filtros aplicados.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((m, i) => {
                  const mov = m as any;
                  const qty = Number(mov.quantity || mov.quantidade || 0);
                  const price = Number(mov.unit_price || mov.preco_unitario || 0);
                  return (
                    <tr key={m.id || i} className="hover:bg-blue-50/40 transition-colors text-xs">
                      <td className="px-4 py-3 text-zinc-600 whitespace-nowrap">
                        {new Date(m.created_at || mov.data_documento || '').toLocaleDateString('pt-PT')}
                      </td>
                      <td className="px-4 py-3 font-medium text-zinc-900">{getProductName(mov)}</td>
                      <td className="px-4 py-3 text-zinc-600">{getWarehouseName(mov)}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-bold uppercase">
                          {mov.tipo || mov.type || 'Entrada'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-500">{mov.numero_documento || mov.referencia || mov.reference_id || '—'}</td>
                      <td className="px-4 py-3 text-zinc-500">{mov.fornecedor_nome || '—'}</td>
                      <td className="px-4 py-3 text-right font-bold text-green-700">{qty}</td>
                      <td className="px-4 py-3 text-right font-mono text-zinc-700">{price.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-bold text-zinc-900">{(qty * price).toFixed(2)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="bg-zinc-50 border-t-2 border-zinc-200 font-bold text-xs">
                  <td colSpan={6} className="px-4 py-3 text-zinc-600 uppercase tracking-wider">TOTAIS ({filtered.length} registos)</td>
                  <td className="px-4 py-3 text-right text-green-700">{totalQty}</td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3 text-right text-zinc-900">{totalVal.toFixed(2)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};

export default StockEntradasReport;
