import React, { useState } from 'react';
import { RefreshCw, Printer, Search, FileText, CheckSquare, Square } from 'lucide-react';

interface Props {
  purchases: any[];
  suppliers: any[];
  companyData?: any;
  fiscalYear: string;
  onRefresh: () => void;
  onViewPurchase: (doc: any) => void;
}

const fmtNum = (v?: number | string | null): string => {
  const n = typeof v === 'string' ? parseFloat(v) : (v ?? 0);
  if (isNaN(n)) return '0,00';
  return n.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtDate = (d?: string | null): string => {
  if (!d) return '—';
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return String(d);
    return dt.toLocaleDateString('pt-PT', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    }).replace(/\//g, '-');
  } catch { return String(d); }
};

export const ListaOrdenadaDocModule: React.FC<Props> = ({
  purchases = [],
  suppliers = [],
  companyData,
  fiscalYear,
  onRefresh,
  onViewPurchase
}) => {
  const [dateFrom, setDateFrom] = useState('2026-10-01');
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (id: string) => {
    setSelectedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Filter purchases by date range and search term
  const filteredDocs = purchases.filter(p => {
    const pDate = p.data_compra || p.data || p.date || p.created_at || '';
    if (dateFrom && pDate && pDate < dateFrom) return false;
    if (dateTo && pDate && pDate > dateTo + 'T23:59:59') return false;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const supName = (p.fornecedor_nome || p.supplier_name || '').toLowerCase();
      const docNo = (p.numero_compra || p.purchase_number || p.numero_documento || '').toLowerCase();
      const docType = (p.tipo_documento || p.document_type || '').toLowerCase();
      if (!supName.includes(term) && !docNo.includes(term) && !docType.includes(term)) {
        return false;
      }
    }
    return true;
  });

  // Calculate totals
  const totalValorNet = filteredDocs.reduce((sum, p) => {
    const total = Number(p.valor_total ?? p.total ?? 0);
    const iva = Number(p.valor_iva || p.iva || (p.items || []).reduce((s: number, it: any) => s + ((it.total || 0) * ((it.tax_rate || 0) / 100)), 0));
    return sum + Math.max(0, total - iva);
  }, 0);

  const totalIva = filteredDocs.reduce((sum, p) => {
    const iva = Number(p.valor_iva || p.iva || (p.items || []).reduce((s: number, it: any) => s + ((it.total || 0) * ((it.tax_rate || 0) / 100)), 0));
    return sum + iva;
  }, 0);

  const totalGross = filteredDocs.reduce((sum, p) => {
    return sum + Number(p.valor_total ?? p.total ?? 0);
  }, 0);

  const companyName = companyData?.name || companyData?.razao_social || 'YGSUNAC INDUSTRIA - PRESTAÇÃO DE SERVIÇO E COMERCIO GERAL, LDA';
  const emissionNow = `${new Date().toLocaleDateString('pt-PT').replace(/\//g, '-')} / ${new Date().toLocaleTimeString()}`;

  return (
    <div className="bg-white border border-zinc-300 p-6 shadow-sm space-y-4 print:p-0 print:border-0 font-sans">
      {/* Top Filter Bar (No print) */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-50 p-3 border border-zinc-200 no-print">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="text-[10px] font-black text-zinc-600 uppercase tracking-wider block mb-0.5">Data Inicial</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="bg-white border border-zinc-300 px-2 py-1 text-xs text-zinc-800 font-medium focus:outline-none focus:border-[#003366]"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-zinc-600 uppercase tracking-wider block mb-0.5">Data Final</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="bg-white border border-zinc-300 px-2 py-1 text-xs text-zinc-800 font-medium focus:outline-none focus:border-[#003366]"
            />
          </div>
          <div className="flex items-end gap-2 pt-4">
            <button
              onClick={onRefresh}
              className="p-1.5 bg-white hover:bg-zinc-100 border border-zinc-300 text-zinc-700 transition-colors shadow-xs"
              title="Actualizar dados"
            >
              <RefreshCw size={16} />
            </button>
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-white hover:bg-zinc-100 border border-zinc-300 text-xs font-bold text-zinc-700 flex items-center gap-1.5 shadow-xs"
            >
              <Printer size={15} />
              Imprimir
            </button>
          </div>
        </div>

        <div className="relative min-w-[240px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" size={15} />
          <input
            type="text"
            placeholder="Pesquisar fornecedor ou documento..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-zinc-300 text-xs text-zinc-800 focus:outline-none focus:border-[#003366]"
          />
        </div>
      </div>

      {/* Document Header matching the image reference */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4 border-b-2 border-zinc-300 pb-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#003366] text-white font-black text-lg flex items-center justify-center tracking-tighter shadow-sm">
              LYG
            </div>
            <div>
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Data de Emissão</div>
              <div className="text-xs font-bold text-zinc-800">{emissionNow}</div>
              <div className="text-[10px] font-mono text-zinc-500 mt-0.5">CC-271126</div>
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Período</div>
            <div className="text-xs font-bold text-zinc-800">
              De {fmtDate(dateFrom)} a {fmtDate(dateTo)}
            </div>
          </div>
        </div>

        <div className="text-right bg-zinc-50 p-3 border border-zinc-200 min-w-[320px]">
          <div className="text-xs font-black text-zinc-900 uppercase tracking-tight">
            {companyName}
          </div>
          <div className="text-sm font-black text-[#003366] uppercase tracking-wider mt-1 border-t border-zinc-200 pt-1">
            EXTRATO MENSAL DOCUMENTOS
          </div>
        </div>
      </div>

      {/* Table Section Header */}
      <div className="flex justify-between items-center text-xs font-bold text-zinc-700 pt-1">
        <div className="uppercase tracking-wide">Extrato Mensal de Documentos</div>
        <div className="text-[10px] text-zinc-500 italic font-medium">(**) Documento Não Aceite Fiscalmente</div>
      </div>

      {/* Ordered Document Table */}
      <div className="overflow-x-auto border border-zinc-300">
        <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-zinc-100 text-zinc-700 border-b-2 border-zinc-300 font-bold text-[11px] uppercase tracking-wider">
              <th className="py-2.5 px-3 border-r border-zinc-300 text-center w-12">No</th>
              <th className="py-2.5 px-3 border-r border-zinc-300">Data Valor</th>
              <th className="py-2.5 px-3 border-r border-zinc-300">Data</th>
              <th className="py-2.5 px-3 border-r border-zinc-300 text-center">Doc ID</th>
              <th className="py-2.5 px-3 border-r border-zinc-300">Doc No</th>
              <th className="py-2.5 px-3 border-r border-zinc-300">Fornecedor</th>
              <th className="py-2.5 px-3 border-r border-zinc-300 text-center w-12">Moeda</th>
              <th className="py-2.5 px-3 border-r border-zinc-300 text-right">Valor</th>
              <th className="py-2.5 px-3 border-r border-zinc-300 text-right">IVA</th>
              <th className="py-2.5 px-3 border-r border-zinc-300 text-right">Total</th>
              <th className="py-2.5 px-3 text-center w-10">Sel</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {filteredDocs.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-12 text-center text-zinc-400 italic uppercase font-bold tracking-widest bg-zinc-50/50">
                  Nenhum documento encontrado no período selecionado.
                </td>
              </tr>
            ) : (
              filteredDocs.map((p, index) => {
                const total = Number(p.valor_total ?? p.total ?? 0);
                const iva = Number(p.valor_iva || p.iva || (p.items || []).reduce((s: number, it: any) => s + ((it.total || 0) * ((it.tax_rate || 0) / 100)), 0));
                const valorNet = Math.max(0, total - iva);
                const docNoStr = p.numero_compra || p.purchase_number || p.numero_documento || `DOC-${p.id}`;
                const docTypeAbbr = (p.tipo_documento || p.document_type || 'FR').substring(0, 2).toUpperCase();
                const supplierName = p.fornecedor_nome || p.supplier_name || 'Fornecedor';
                const isSelected = !!selectedRows[p.id];
                const isNonFiscal = (p.status || '').toLowerCase() === 'nao_aceite' || (p.observacoes || '').includes('Não Aceite');

                return (
                  <tr
                    key={p.id || index}
                    onClick={() => onViewPurchase(p)}
                    className="hover:bg-blue-50/60 cursor-pointer transition-colors text-[11px] group"
                  >
                    <td className="py-2 px-3 border-r border-zinc-200 text-center font-bold text-zinc-500 font-mono">
                      {index + 1}
                    </td>
                    <td className="py-2 px-3 border-r border-zinc-200 text-zinc-700 font-medium">
                      {fmtDate(p.data_compra || p.data || p.date || p.created_at)}
                    </td>
                    <td className="py-2 px-3 border-r border-zinc-200 text-zinc-700 font-medium">
                      {fmtDate(p.data_compra || p.data || p.date || p.created_at)}
                    </td>
                    <td className="py-2 px-3 border-r border-zinc-200 text-center font-mono font-bold text-[#003366]">
                      {p.id ? String(p.id).substring(0, 6) : index + 1}
                    </td>
                    <td className="py-2 px-3 border-r border-zinc-200 font-black text-[#003366] uppercase tracking-tight font-mono">
                      {docTypeAbbr} {docNoStr}
                      {isNonFiscal && <span className="ml-1 text-[9px] text-amber-600 font-bold">(**)</span>}
                    </td>
                    <td className="py-2 px-3 border-r border-zinc-200 font-bold text-zinc-900 uppercase max-w-[260px] truncate" title={supplierName}>
                      {supplierName}
                    </td>
                    <td className="py-2 px-3 border-r border-zinc-200 text-center font-bold text-zinc-600">
                      AOA
                    </td>
                    <td className="py-2 px-3 border-r border-zinc-200 text-right font-mono text-zinc-800">
                      {fmtNum(valorNet)}
                    </td>
                    <td className="py-2 px-3 border-r border-zinc-200 text-right font-mono text-zinc-800">
                      {fmtNum(iva)}
                    </td>
                    <td className="py-2 px-3 border-r border-zinc-200 text-right font-mono font-black text-[#003366]">
                      {fmtNum(total)}
                    </td>
                    <td className="py-2 px-3 text-center" onClick={e => e.stopPropagation()}>
                      <button onClick={() => toggleRow(p.id)} className="text-zinc-500 hover:text-[#003366]">
                        {isSelected ? <CheckSquare size={15} className="text-[#003366]" /> : <Square size={15} />}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {filteredDocs.length > 0 && (
            <tfoot>
              <tr className="bg-zinc-100 font-black border-t-2 border-zinc-300 text-xs">
                <td colSpan={7} className="py-2.5 px-3 uppercase text-zinc-700">
                  Total Geral ({filteredDocs.length} documentos)
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-zinc-900">
                  {fmtNum(totalValorNet)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-zinc-900">
                  {fmtNum(totalIva)}
                </td>
                <td className="py-2.5 px-3 text-right font-mono text-[#003366] text-sm">
                  {fmtNum(totalGross)}
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};

export default ListaOrdenadaDocModule;
