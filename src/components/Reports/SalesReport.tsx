/**
 * SalesReport.tsx
 * Relatorio de Vendas - layout classico conforme referencia visual relatorio de venda.PNG
 * Toolbar com botoes redondos, painel filtros esquerdo, secoes: Mais Vendidos, Vendidos, Devolvidos, Movimentos
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText, Printer, Download, RefreshCw, Bell, AlignLeft,
  Package, RotateCcw, FileSpreadsheet, Calendar, AlertCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { IssuedDocument } from '../../types';

interface SalesReportProps {
  issuedDocuments?: IssuedDocument[];
  onBack?: () => void;
  warehouses?: any[];
  user?: any;
  companyData?: any;
  fiscalYear?: string | number;
  series?: any[];
  activeTaxes?: any[];
}

export const SalesReport: React.FC<SalesReportProps> = ({
  issuedDocuments: passedDocs = [],
  onBack,
  warehouses = [],
  user,
  companyData,
  fiscalYear,
  series = [],
  activeTaxes = [],
}) => {
  const empresaId = companyData?.id || user?.empresa_id || user?.company_id;
  const companyName = companyData?.name || companyData?.nome || user?.company_name || 'Empresa';
  const userName = user?.name || user?.email || '';

  const today = new Date();
  const thisYear = fiscalYear ? String(fiscalYear) : String(today.getFullYear());

  const [startDate, setStartDate] = useState(`${thisYear}-01-01`);
  const [endDate, setEndDate] = useState(today.toISOString().slice(0, 10));
  const [selectedDocType, setSelectedDocType] = useState('all');
  const [selectedSerie, setSelectedSerie] = useState('all');
  const [selectedWarehouse, setSelectedWarehouse] = useState('all');
  const [selectedArtigo, setSelectedArtigo] = useState('');
  const [selectedOperador, setSelectedOperador] = useState('all');
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      if (empresaId) {
        const { data, error } = await supabase
          .from('documentos_emitidos')
          .select('id, invoice_number, numero_documento, data_emissao, created_at, total, valor_total, imposto, iva_total, status, tipo_documento, document_type, client_name, items, serie, warehouse_id, user_id, operador')
          .eq('empresa_id', empresaId)
          .gte('data_emissao', startDate + 'T00:00:00')
          .lte('data_emissao', endDate + 'T23:59:59')
          .order('data_emissao', { ascending: false });
        if (!error && Array.isArray(data)) {
          setDocs(data);
        } else {
          setDocs(passedDocs as any[]);
        }
      } else {
        setDocs(passedDocs as any[]);
      }
    } catch (e) {
      setDocs(passedDocs as any[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDocs(); }, [startDate, endDate, empresaId]);

  const filteredDocs = useMemo(() => {
    return docs.filter(d => {
      if (selectedDocType !== 'all') {
        const dt = (d.tipo_documento || d.document_type || '').toUpperCase();
        if (dt !== selectedDocType.toUpperCase()) return false;
      }
      if (selectedSerie !== 'all' && d.serie !== selectedSerie) return false;
      if (selectedWarehouse !== 'all' && String(d.warehouse_id) !== String(selectedWarehouse)) return false;
      if (selectedArtigo) {
        const items = Array.isArray(d.items) ? d.items : [];
        const match = items.some((i: any) =>
          (i.description||i.name||'').toLowerCase().includes(selectedArtigo.toLowerCase())
        );
        if (!match) return false;
      }
      if (selectedOperador !== 'all' && String(d.user_id || d.operador) !== String(selectedOperador)) return false;
      return true;
    });
  }, [docs, selectedDocType, selectedSerie, selectedWarehouse, selectedArtigo, selectedOperador]);

  // Only real sales docs (exclude NC / anulado)
  const salesDocs = useMemo(() => filteredDocs.filter(d => {
    const dt = (d.tipo_documento || d.document_type || '').toUpperCase();
    return !dt.includes('CRÉDITO') && !dt.includes('CREDITO') && dt !== 'NC' && d.status !== 'anulado' && d.status !== 'ANULADO';
  }), [filteredDocs]);

  // NC docs = devolvidos
  const ncDocs = useMemo(() => filteredDocs.filter(d => {
    const dt = (d.tipo_documento || d.document_type || '').toUpperCase();
    return dt.includes('CRÉDITO') || dt.includes('CREDITO') || dt === 'NC';
  }), [filteredDocs]);

  // Product aggregation
  const productSales = useMemo(() => {
    const map: Record<string, { name: string; qty: number; total: number }> = {};
    salesDocs.forEach(d => {
      const items = Array.isArray(d.items) ? d.items : [];
      items.forEach((item: any) => {
        const name = item.description || item.name || item.produto || 'Artigo';
        if (!map[name]) map[name] = { name, qty: 0, total: 0 };
        map[name].qty += Number(item.quantity || item.quantidade || 0);
        map[name].total += Number(item.total || item.subtotal || (item.unit_price || 0) * (item.quantity || 0));
      });
    });
    return Object.values(map).sort((a, b) => b.qty - a.qty);
  }, [salesDocs]);

  const topProducts = productSales.slice(0, 5);
  const totalVendas = salesDocs.reduce((s, d) => s + Number(d.total || d.valor_total || 0), 0);
  const totalDevolucoes = ncDocs.reduce((s, d) => s + Number(d.total || d.valor_total || 0), 0);

  const fmt = (v: number) => v.toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatDate = (d: any) => {
    const dt = new Date(d.data_emissao || d.created_at || '');
    return isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('pt-AO');
  };

  const exportCSV = () => {
    const header = ['Data','Ref Interna','Empresa','Documento','Descricao','Entrada','Saida','Unit','V.Unit','Sub.Total','Imposto'];
    const rows = filteredDocs.map(d => {
      const dt = (d.tipo_documento || d.document_type || '').toUpperCase();
      const isNC = dt.includes('CREDITO') || dt === 'NC';
      const total = Number(d.total || d.valor_total || 0);
      const imp = Number(d.imposto || d.iva_total || 0);
      return [
        formatDate(d),
        d.invoice_number || d.numero_documento || '',
        companyName,
        dt,
        d.client_name || '',
        isNC ? '' : total.toFixed(2),
        isNC ? total.toFixed(2) : '',
        '',
        '',
        (total - imp).toFixed(2),
        imp.toFixed(2),
      ];
    });
    const csv = [header, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `relatorio_vendas_${startDate}_${endDate}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const toolbarBtn = (icon: React.ReactNode, label: string, onClick?: () => void, active = false) => (
    <button
      onClick={onClick}
      title={label}
      className="flex flex-col items-center gap-0.5 p-0 group"
    >
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shadow-sm border transition-all ${
        active
          ? 'bg-[#003366] border-[#003366] text-white'
          : 'bg-gradient-to-b from-white to-zinc-100 border-zinc-300 text-[#003366] hover:from-zinc-100 hover:to-zinc-200'
      }`}>
        {icon}
      </div>
      <span className="text-[8px] font-bold uppercase tracking-widest text-zinc-500 group-hover:text-[#003366] transition-colors">{label}</span>
    </button>
  );

  const uniqueSeries = Array.from(new Set(docs.map(d => d.serie).filter(Boolean)));
  const uniqueOperadores = Array.from(new Set(docs.map(d => d.user_id || d.operador).filter(Boolean)));
  const docTypes = Array.from(new Set(docs.map(d => (d.tipo_documento || d.document_type || '').toUpperCase()).filter(Boolean)));

  return (
    <div className="min-h-screen bg-zinc-100 print:bg-white">
      {/* Toolbar */}
      <div className="bg-white border-b border-zinc-200 shadow-sm print:hidden">
        <div className="flex items-center gap-1 px-4 py-2 border-b border-zinc-100">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#003366] mr-3 flex items-center gap-1">
            <FileText size={14}/> Relatorio de Vendas
          </span>
          <span className="text-[10px] text-zinc-400 font-semibold">{companyName}</span>
          {userName && <span className="text-[10px] text-zinc-300 font-semibold ml-2">| {userName}</span>}
        </div>
        <div className="flex items-end gap-4 px-4 py-2">
          {toolbarBtn(<AlignLeft size={15}/>, 'D', undefined, selectedDocType==='all')}
          {toolbarBtn(<Package size={15}/>, 'S', undefined)}
          {toolbarBtn(<Package size={15}/>, 'Armazem', undefined)}
          {toolbarBtn(<Calendar size={15}/>, 'A', undefined)}
          {toolbarBtn(<FileSpreadsheet size={15}/>, 'XLSX', exportCSV)}
          <div className="flex items-center gap-1 ml-1">
            <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Periodo:</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] focus:outline-none focus:border-[#003366]"/>
            <span className="text-zinc-400 text-[10px]">a</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] focus:outline-none focus:border-[#003366]"/>
          </div>
          {toolbarBtn(<Printer size={15}/>, 'Imprimir', () => window.print())}
          {toolbarBtn(<Bell size={15}/>, 'Alerta', undefined)}
          {toolbarBtn(<RefreshCw size={15}/>, 'Actualizar', fetchDocs)}
          {onBack && toolbarBtn(<RotateCcw size={15}/>, 'Voltar', onBack)}
        </div>
      </div>

      <div className="flex gap-0">
        {/* Left filter panel */}
        <div className="w-48 shrink-0 bg-white border-r border-zinc-200 min-h-[calc(100vh-100px)] print:hidden p-3 space-y-4">
          <div>
            <div className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">Periodo</div>
            <div className="flex flex-col gap-1">
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-[10px] focus:outline-none focus:border-[#003366]"/>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-[10px] focus:outline-none focus:border-[#003366]"/>
            </div>
          </div>
          <div>
            <div className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">Documentos</div>
            <select value={selectedDocType} onChange={e => setSelectedDocType(e.target.value)} className="w-full border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-[10px] focus:outline-none focus:border-[#003366]">
              <option value="all">Todos</option>
              {docTypes.map(dt => <option key={dt} value={dt}>{dt}</option>)}
            </select>
          </div>
          <div>
            <div className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">Serie</div>
            <select value={selectedSerie} onChange={e => setSelectedSerie(e.target.value)} className="w-full border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-[10px] focus:outline-none focus:border-[#003366]">
              <option value="all">Todas</option>
              {uniqueSeries.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <div className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">Armazem</div>
            <select value={selectedWarehouse} onChange={e => setSelectedWarehouse(e.target.value)} className="w-full border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-[10px] focus:outline-none focus:border-[#003366]">
              <option value="all">Todos</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <div className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">Artigos</div>
            <input value={selectedArtigo} onChange={e => setSelectedArtigo(e.target.value)} placeholder="Filtrar artigo..." className="w-full border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-[10px] focus:outline-none focus:border-[#003366]"/>
          </div>
          <div>
            <div className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">C.Custos</div>
            <input disabled placeholder="—" className="w-full border border-zinc-100 bg-zinc-50 px-2 py-1.5 text-[10px] text-zinc-300"/>
          </div>
          <div>
            <div className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">Operador</div>
            <select value={selectedOperador} onChange={e => setSelectedOperador(e.target.value)} className="w-full border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-[10px] focus:outline-none focus:border-[#003366]">
              <option value="all">Todos</option>
              {uniqueOperadores.map(o => <option key={o} value={o}>{String(o).slice(0,16)}</option>)}
            </select>
          </div>
          <button onClick={fetchDocs} className="w-full bg-[#003366] hover:bg-[#002244] text-white py-2 text-[9px] font-black uppercase tracking-widest transition-all mt-2">
            Pesquisar
          </button>
        </div>

        {/* Main content */}
        <div className="flex-1 p-4 space-y-4">
          {loading && (
            <div className="flex items-center gap-2 text-xs text-zinc-400 italic p-4">
              <RefreshCw size={13} className="animate-spin"/> A carregar dados...
            </div>
          )}

          {/* Produtos Mais Vendidos */}
          {topProducts.length > 0 && (
            <section className="bg-white border border-zinc-200 shadow-sm">
              <div className="bg-zinc-100 border-b border-zinc-200 px-4 py-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#003366]">Produtos Mais Vendidos</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 text-[9px] font-black uppercase tracking-widest text-zinc-500 border-b border-zinc-100">
                      <th className="px-4 py-2">#</th>
                      <th className="px-4 py-2">Produto</th>
                      <th className="px-4 py-2 text-right">Qtd Vendida</th>
                      <th className="px-4 py-2 text-right">Total (AOA)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {topProducts.map((p, i) => (
                      <tr key={i} className="text-xs hover:bg-zinc-50">
                        <td className="px-4 py-2 text-zinc-400 font-mono">{i+1}</td>
                        <td className="px-4 py-2 font-semibold text-zinc-700">{p.name}</td>
                        <td className="px-4 py-2 text-right font-mono">{p.qty.toLocaleString('pt-AO')}</td>
                        <td className="px-4 py-2 text-right font-bold text-[#003366]">{fmt(p.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Produtos Vendidos */}
          <section className="bg-white border border-zinc-200 shadow-sm">
            <div className="bg-zinc-100 border-b border-zinc-200 px-4 py-2 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#003366]">Produtos Vendidos</span>
              <span className="text-[10px] font-bold text-zinc-500">{salesDocs.length} doc(s)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 text-[9px] font-black uppercase tracking-widest text-zinc-500 border-b border-zinc-100">
                    <th className="px-3 py-2">Data</th>
                    <th className="px-3 py-2">Referencia</th>
                    <th className="px-3 py-2">Cliente</th>
                    <th className="px-3 py-2">Tipo Doc</th>
                    <th className="px-3 py-2 text-right">Imposto</th>
                    <th className="px-3 py-2 text-right">Total (AOA)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {salesDocs.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-6 text-center text-xs text-zinc-400 italic">Sem documentos no periodo seleccionado.</td></tr>
                  ) : salesDocs.map(d => (
                    <tr key={d.id} className="text-xs hover:bg-zinc-50">
                      <td className="px-3 py-2 text-zinc-500">{formatDate(d)}</td>
                      <td className="px-3 py-2 font-mono text-zinc-700">{d.invoice_number||d.numero_documento||'—'}</td>
                      <td className="px-3 py-2 text-zinc-700">{d.client_name||'—'}</td>
                      <td className="px-3 py-2 text-zinc-500">{(d.tipo_documento||d.document_type||'').toUpperCase()}</td>
                      <td className="px-3 py-2 text-right font-mono text-zinc-500">{fmt(Number(d.imposto||d.iva_total||0))}</td>
                      <td className="px-3 py-2 text-right font-bold text-[#003366]">{fmt(Number(d.total||d.valor_total||0))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-zinc-50 font-bold text-xs border-t border-zinc-200">
                    <td colSpan={5} className="px-3 py-2 text-right uppercase tracking-widest text-[9px] text-zinc-500">Total Vendas:</td>
                    <td className="px-3 py-2 text-right text-[#003366]">{fmt(totalVendas)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          {/* Produtos Devolvidos */}
          {ncDocs.length > 0 && (
            <section className="bg-white border border-zinc-200 shadow-sm">
              <div className="bg-red-50 border-b border-red-100 px-4 py-2 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-red-700">Produtos Devolvidos (NC)</span>
                <span className="text-[10px] font-bold text-red-500">{ncDocs.length} doc(s)</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 text-[9px] font-black uppercase tracking-widest text-zinc-500 border-b border-zinc-100">
                      <th className="px-3 py-2">Data</th>
                      <th className="px-3 py-2">Referencia</th>
                      <th className="px-3 py-2">Cliente</th>
                      <th className="px-3 py-2 text-right">Total (AOA)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {ncDocs.map(d => (
                      <tr key={d.id} className="text-xs hover:bg-red-50">
                        <td className="px-3 py-2 text-zinc-500">{formatDate(d)}</td>
                        <td className="px-3 py-2 font-mono text-zinc-700">{d.invoice_number||d.numero_documento||'—'}</td>
                        <td className="px-3 py-2 text-zinc-700">{d.client_name||'—'}</td>
                        <td className="px-3 py-2 text-right font-bold text-red-600">{fmt(Number(d.total||d.valor_total||0))}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-red-50 font-bold text-xs border-t border-red-100">
                      <td colSpan={3} className="px-3 py-2 text-right uppercase tracking-widest text-[9px] text-red-500">Total Devolucoes:</td>
                      <td className="px-3 py-2 text-right text-red-600">{fmt(totalDevolucoes)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>
          )}

          {/* Movimentos */}
          <section className="bg-white border border-zinc-200 shadow-sm">
            <div className="bg-zinc-100 border-b border-zinc-200 px-4 py-2 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#003366]">Movimentos</span>
              <button onClick={exportCSV} className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 hover:text-emerald-700 uppercase tracking-widest">
                <Download size={12}/> Exportar CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#003366] text-white text-[9px] font-black uppercase tracking-widest">
                    <th className="px-3 py-2">Data</th>
                    <th className="px-3 py-2">Ref Interna</th>
                    <th className="px-3 py-2">Empresa</th>
                    <th className="px-3 py-2">Documento</th>
                    <th className="px-3 py-2">Descricao</th>
                    <th className="px-3 py-2 text-right">Entrada</th>
                    <th className="px-3 py-2 text-right">Saida</th>
                    <th className="px-3 py-2">Unit</th>
                    <th className="px-3 py-2 text-right">V.Unit</th>
                    <th className="px-3 py-2 text-right">Sub.Total</th>
                    <th className="px-3 py-2 text-right">Imposto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredDocs.length === 0 ? (
                    <tr><td colSpan={11} className="px-4 py-6 text-center text-xs text-zinc-400 italic">Sem movimentos no periodo seleccionado.</td></tr>
                  ) : filteredDocs.map(d => {
                    const dt = (d.tipo_documento || d.document_type || '').toUpperCase();
                    const isNC = dt.includes('CREDITO') || dt === 'NC';
                    const total = Number(d.total || d.valor_total || 0);
                    const imp = Number(d.imposto || d.iva_total || 0);
                    const sub = total - imp;
                    return (
                      <tr key={d.id} className={`text-xs hover:bg-zinc-50 ${isNC?'text-red-700 bg-red-50/30':''}`}>
                        <td className="px-3 py-2">{formatDate(d)}</td>
                        <td className="px-3 py-2 font-mono">{d.invoice_number||d.numero_documento||'—'}</td>
                        <td className="px-3 py-2 max-w-[100px] truncate" title={companyName}>{companyName}</td>
                        <td className="px-3 py-2">{dt}</td>
                        <td className="px-3 py-2 max-w-[120px] truncate" title={d.client_name||''}>{d.client_name||'—'}</td>
                        <td className="px-3 py-2 text-right font-mono text-emerald-700">{!isNC?fmt(total):''}</td>
                        <td className="px-3 py-2 text-right font-mono text-red-600">{isNC?fmt(total):''}</td>
                        <td className="px-3 py-2 text-zinc-400">AOA</td>
                        <td className="px-3 py-2 text-right font-mono">{fmt(sub > 0 ? sub : total)}</td>
                        <td className="px-3 py-2 text-right font-mono">{fmt(sub)}</td>
                        <td className="px-3 py-2 text-right font-mono text-zinc-500">{fmt(imp)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end px-4 py-3 border-t border-zinc-100 bg-zinc-50">
              <button onClick={() => window.print()} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white bg-[#003366] hover:bg-[#002244] px-4 py-2 transition-all">
                <Printer size={13}/> Imprimir Lista
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          .print\\:bg-white { background: white !important; }
          body { font-size: 10px; }
        }
      `}</style>
    </div>
  );
};

export default SalesReport;
