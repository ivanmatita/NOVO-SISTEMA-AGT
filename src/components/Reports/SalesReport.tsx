
import React, { useState, useMemo } from 'react';
import { 
  Search, Filter, FileText, Download, Printer, ArrowLeft, 
  TrendingUp, TrendingDown, Package, Layers, Calendar, 
  FileCheck, ShieldCheck, Warehouse, History, MoreHorizontal,
  ChevronDown, RotateCcw, BarChart3, PieChart, FileSpreadsheet
} from 'lucide-react';
import { IssuedDocument } from '../../types';
import { exportToPDF, exportToExcel, handlePrint } from '../../lib/exportUtils';

interface SalesReportProps {
  issuedDocuments: IssuedDocument[];
  onBack?: () => void;
  warehouses?: any[];
}

export const SalesReport = ({ issuedDocuments, onBack, warehouses = [] }: SalesReportProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [selectedWarehouse, setSelectedWarehouse] = useState('all');
  const [selectedDocType, setSelectedDocType] = useState('all');
  const [selectedArticleType, setSelectedArticleType] = useState('all');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(val);
  };

  const filteredDocs = useMemo(() => {
    return issuedDocuments.filter(doc => {
      const matchesSearch = (doc.client_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (doc.invoice_number || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const docDate = new Date(doc.date || doc.data_emissao || Date.now());
      const matchesStart = !dateFilter.start || docDate >= new Date(dateFilter.start);
      const matchesEnd = !dateFilter.end || docDate <= new Date(dateFilter.end);
      
      const matchesWarehouse = selectedWarehouse === 'all' || String((doc as any).warehouse_id) === String(selectedWarehouse);
      const matchesDocType = selectedDocType === 'all' || doc.document_type === selectedDocType;
      
      // Artificial logic for article type if not present in doc
      const docItems = (doc as any).items || [];
      const matchesArticleType = selectedArticleType === 'all' || docItems.some((i: any) => i.article_type === selectedArticleType);

      return matchesSearch && matchesStart && matchesEnd && matchesWarehouse && matchesDocType && matchesArticleType;
    });
  }, [issuedDocuments, searchTerm, dateFilter, selectedWarehouse, selectedDocType, selectedArticleType]);

  const stats = useMemo(() => {
    const active = filteredDocs.filter(d => d.status !== 'anulado' && d.document_type !== 'NC');
    const returns = filteredDocs.filter(d => d.document_type === 'NC');
    const cancelled = filteredDocs.filter(d => d.status === 'anulado');

    const totalSold = active.reduce((acc, doc) => acc + (doc.counter_value || doc.total || 0), 0);
    const totalReturns = returns.reduce((acc, doc) => acc + (doc.total || 0), 0);
    const totalCancelled = cancelled.reduce((acc, doc) => acc + (doc.total || 0), 0);
    const totalVat = active.reduce((acc, doc) => acc + (doc.vat_amount || 0), 0);
    
    return {
      totalSold,
      totalReturns,
      totalCancelled,
      totalVat,
      netRevenue: totalSold - totalReturns - totalVat,
      count: active.length,
      returnCount: returns.length
    };
  }, [filteredDocs]);

  const productPerformance = useMemo(() => {
    const productMap = new Map();
    filteredDocs.forEach((doc: any) => {
      if (doc.status === 'anulado') return;
      const items = doc.items || [];
      items.forEach((item: any) => {
        const current = productMap.get(item.product_name) || { qty: 0, total: 0 };
        const isReturn = doc.document_type === 'NC';
        productMap.set(item.product_name, {
          qty: current.qty + (isReturn ? -item.quantity : item.quantity),
          total: current.total + (isReturn ? -item.total : item.total)
        });
      });
    });

    const sorted = Array.from(productMap.entries()).map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.qty - a.qty);

    return {
      bestSellers: sorted.slice(0, 5),
      worstSellers: sorted.filter(p => p.qty > 0).slice(-5).reverse()
    };
  }, [filteredDocs]);

  const handleExcelExport = () => {
    const data = filteredDocs.map(doc => ({
      'Data': new Date(doc.date || doc.data_emissao || Date.now()).toLocaleDateString(),
      'Número': doc.invoice_number || doc.numero_documento,
      'Cliente': doc.client_name || 'Consumidor Final',
      'Tipo': doc.document_type || 'VENDA',
      'Incidência': (doc.counter_value || doc.total || 0) - (doc.vat_amount || 0),
      'IVA': doc.vat_amount || 0,
      'Desconto': doc.global_discount || 0,
      'Total': doc.counter_value || doc.total || 0,
      'Estado': doc.status || 'Ativo'
    }));
    exportToExcel(data, `Vendas_${new Date().toISOString().split('T')[0]}.xlsx`, 'Vendas');
  };

  return (
    <div id="sales-report-content" className="space-y-8 animate-in fade-in duration-500 pb-20 print-area">
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-4">
          {onBack && (
            <button onClick={onBack} className="p-2 hover:bg-zinc-100 text-zinc-400 transition-colors">
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <h2 className="text-xl font-black text-[#003366] uppercase tracking-tighter">Relatório de Vendas Completo</h2>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Análise multidimensionl de faturamento, impostos e devoluções</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handlePrint('sales-report-content')} className="bg-white border border-zinc-200 text-[#003366] px-4 py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-zinc-50 shadow-sm">
            <Printer size={14} /> Imprimir Relatório
          </button>
          <button onClick={handleExcelExport} className="bg-emerald-600 text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-700 shadow-md">
            <FileSpreadsheet size={14} /> Baixar Excel
          </button>
          <button onClick={() => exportToPDF('sales-report-content', `Relatorio_Vendas_${new Date().toISOString().split('T')[0]}.pdf`)} className="bg-[#003366] text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-black shadow-md">
            <Download size={14} /> Exportar Completo
          </button>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-zinc-200 p-6 shadow-sm border-b-4 border-b-blue-600">
          <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Vendas Brutas (FT/FR)</p>
          <p className="text-2xl font-black text-[#003366]">{formatCurrency(stats.totalSold)}</p>
          <p className="mt-2 text-[9px] font-bold text-zinc-400 uppercase">{stats.count} documentos emitidos</p>
        </div>
        <div className="bg-white border border-zinc-200 p-6 shadow-sm border-b-4 border-b-red-600">
          <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Devoluções (NC)</p>
          <p className="text-2xl font-black text-red-600">{formatCurrency(stats.totalReturns)}</p>
          <p className="mt-2 text-[9px] font-bold text-zinc-400 uppercase">{stats.returnCount} notas de crédito</p>
        </div>
        <div className="bg-white border border-zinc-200 p-6 shadow-sm border-b-4 border-b-amber-500">
          <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">IVA Liquidado</p>
          <p className="text-2xl font-black text-amber-600">{formatCurrency(stats.totalVat)}</p>
          <p className="mt-2 text-[9px] font-bold text-zinc-400 uppercase">Imposto retido p/ estado</p>
        </div>
        <div className="bg-white border border-zinc-200 p-6 shadow-sm border-b-4 border-b-emerald-500">
          <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Receita Líquida Est.</p>
          <p className="text-2xl font-black text-emerald-600">{formatCurrency(stats.netRevenue)}</p>
          <p className="mt-2 text-[9px] font-bold text-zinc-400 uppercase">Faturamento - Devoluções - IVA</p>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="bg-white border border-zinc-200 p-6 no-print shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
          <div className="lg:col-span-2 space-y-2">
            <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Pesquisa Global</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
              <input 
                type="text" 
                placeholder="Nº Documento, Nome do Cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 pl-10 pr-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#003366]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Armazém de Saída</label>
            <div className="relative">
              <Warehouse className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
              <select 
                value={selectedWarehouse}
                onChange={(e) => setSelectedWarehouse(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 pl-10 pr-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#003366] appearance-none"
              >
                <option value="all">TODOS ARMAZÉNS</option>
                {warehouses.map((w: any) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Tipo de Documento</label>
            <div className="relative">
              <FileCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
              <select 
                value={selectedDocType}
                onChange={(e) => setSelectedDocType(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 pl-10 pr-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#003366] appearance-none"
              >
                <option value="all">TODOS TIPOS</option>
                <option value="FT">FACTURA (FT)</option>
                <option value="FR">FACTURA RECIBO (FR)</option>
                <option value="NC">NOTA DE CRÉDITO (NC)</option>
                <option value="RE">RECIBO (RE)</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Tipo de Artigo</label>
            <div className="relative">
              <Layers className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
              <select 
                value={selectedArticleType}
                onChange={(e) => setSelectedArticleType(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 pl-10 pr-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#003366] appearance-none"
              >
                <option value="all">TODOS ARTIGOS</option>
                <option value="product">PRODUTOS (STOCK)</option>
                <option value="service">SERVIÇOS</option>
                <option value="other">OUTROS</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 pt-4 border-t border-zinc-100">
           <div className="flex items-center gap-2">
             <Calendar size={14} className="text-zinc-400" />
             <input 
               type="date" 
               value={dateFilter.start}
               onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
               className="bg-zinc-50 border border-zinc-200 px-3 py-2 text-[10px] font-bold"
             />
             <span className="text-zinc-300">até</span>
             <input 
               type="date" 
               value={dateFilter.end}
               onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
               className="bg-zinc-50 border border-zinc-200 px-3 py-2 text-[10px] font-bold"
             />
           </div>
           <button className="text-[10px] font-black text-[#003366] uppercase hover:underline">Limpar Filtros</button>
        </div>
      </div>

      {/* Top Products analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 no-print">
        <div className="bg-white border border-zinc-200 p-6 shadow-sm bg-gradient-to-br from-white to-blue-50/30">
          <h3 className="text-[10px] font-black text-[#003366] uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-zinc-200 pb-2">
            <TrendingUp size={16} className="text-emerald-500" /> Produtos Mais Vendidos (Top 5)
          </h3>
          <div className="space-y-4">
            {productPerformance.bestSellers.map((p, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-[#003366] flex items-center justify-center font-black text-xs shrink-0">{i+1}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black uppercase text-[#003366] truncate">{p.name}</p>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-[9px] font-bold text-zinc-400 uppercase">{p.qty} Unidades Vendidas</p>
                    <p className="text-[10px] font-black text-emerald-600">{formatCurrency(p.total)}</p>
                  </div>
                  <div className="w-full h-1 bg-zinc-100 mt-1.5 overflow-hidden">
                    <div 
                      className="h-full bg-blue-600" 
                      style={{ width: `${(p.total / productPerformance.bestSellers[0].total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-zinc-200 p-6 shadow-sm bg-gradient-to-br from-white to-red-50/30">
          <h3 className="text-[10px] font-black text-[#003366] uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-zinc-200 pb-2">
            <TrendingDown size={16} className="text-red-500" /> Produtos Menos Vendidos (Top 5)
          </h3>
          <div className="space-y-4">
            {productPerformance.worstSellers.map((p, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center font-black text-xs shrink-0">{i+1}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black uppercase text-zinc-700 truncate">{p.name}</p>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-[9px] font-bold text-zinc-400 uppercase">{p.qty} Unidades</p>
                    <p className="text-[10px] font-black text-red-600">{formatCurrency(p.total)}</p>
                  </div>
                  <div className="w-full h-1 bg-zinc-100 mt-1.5 overflow-hidden">
                    <div 
                      className="h-full bg-red-400" 
                      style={{ width: `${(p.total / (productPerformance.worstSellers[productPerformance.worstSellers.length-1]?.total || 1)) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
            {productPerformance.worstSellers.length === 0 && <p className="text-center py-10 text-zinc-300 font-bold uppercase text-[9px]">Dados insuficientes</p>}
          </div>
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white border border-zinc-200 shadow-xl">
        <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
          <h3 className="text-xs font-black text-[#003366] uppercase tracking-widest flex items-center gap-2">
             <History size={16} /> Histórico de Movimentação Completa
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1100px]">
             <thead>
               <tr className="bg-[#003366] text-white text-[9px] uppercase tracking-widest font-black border-b border-zinc-200">
                 <th className="px-6 py-4">Data/Hora</th>
                 <th className="px-6 py-4">Documento</th>
                 <th className="px-6 py-4">Cliente / Terminal</th>
                 <th className="px-6 py-4">Armazém</th>
                 <th className="px-6 py-4 text-right">Incidência</th>
                 <th className="px-6 py-4 text-right">IVA</th>
                 <th className="px-6 py-4 text-center">Estado</th>
                 <th className="px-6 py-4 text-right font-black">Total / Diferença</th>
                 <th className="px-6 py-4 text-center no-print">Ações</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-zinc-50 text-[11px] font-medium">
               {filteredDocs.map((doc: any, idx) => (
                 <tr key={idx} className={`hover:bg-zinc-50 transition-all ${doc.document_type === 'NC' ? 'bg-red-50/30' : ''}`}>
                   <td className="px-6 py-4">
                     <div className="text-[#003366] font-bold">{new Date(doc.date || doc.data_emissao).toLocaleDateString()}</div>
                     <div className="text-[8px] text-zinc-400">{new Date(doc.date || doc.data_emissao).toLocaleTimeString()}</div>
                   </td>
                   <td className="px-6 py-4">
                     <span className={`px-1.5 py-0.5 text-[8px] font-black border uppercase mb-1 inline-block ${
                       doc.document_type === 'NC' ? 'bg-red-600 text-white border-red-700' : 
                       doc.document_type === 'RE' ? 'bg-emerald-600 text-white border-emerald-700' :
                       'bg-blue-600 text-white border-blue-700'
                     }`}>
                       {doc.document_type || 'VENDA'}
                     </span>
                     <div className="font-black text-[#003366] uppercase">{doc.invoice_number || doc.numero_documento}</div>
                   </td>
                   <td className="px-6 py-4">
                      <div className="text-zinc-900 font-extrabold uppercase line-clamp-1">{doc.client_name || 'Consumidor Final'}</div>
                      <div className="text-[9px] text-zinc-400 font-bold uppercase tracking-tighter">Terminal: {doc.pos_terminal || 'POS_01'}</div>
                   </td>
                   <td className="px-6 py-4">
                     <div className="font-bold text-zinc-500 uppercase">{doc.warehouse_name || 'ARMAZÉM PRINCIPAL'}</div>
                   </td>
                   <td className="px-6 py-4 text-right font-bold text-zinc-600">{formatCurrency((doc.counter_value || doc.total || 0) - (doc.vat_amount || 0))}</td>
                   <td className="px-6 py-4 text-right font-bold text-amber-600">{formatCurrency(doc.vat_amount || 0)}</td>
                   <td className="px-6 py-4 text-center">
                     <div className={`px-2 py-0.5 text-[8px] font-black uppercase rounded-full inline-block ${
                        doc.status === 'anulado' ? 'bg-red-100 text-red-700' :
                        doc.document_type === 'NC' ? 'bg-orange-100 text-orange-700' :
                        'bg-emerald-100 text-emerald-700'
                     }`}>
                        {doc.status || 'FINALIZADO'}
                     </div>
                   </td>
                   <td className="px-6 py-4 text-right">
                      <div className={`font-black text-[12px] ${doc.document_type === 'NC' ? 'text-red-600' : 'text-[#003366]'}`}>
                        {doc.document_type === 'NC' ? '-' : ''}{formatCurrency(doc.counter_value || doc.total || 0)}
                      </div>
                   </td>
                   <td className="px-6 py-4 text-center no-print outline-none border-none">
                      <button className="p-1 hover:bg-zinc-100 text-zinc-400 transition-colors"><MoreHorizontal size={14} /></button>
                   </td>
                 </tr>
               ))}
               {filteredDocs.length === 0 && (
                 <tr>
                   <td colSpan={9} className="px-6 py-24 text-center">
                     <BarChart3 size={40} className="mx-auto text-zinc-100 mb-4" />
                     <p className="text-zinc-300 font-black uppercase text-xs tracking-widest italic">Nenhum dado analítico encontrado para esta segmentação.</p>
                   </td>
                 </tr>
               )}
             </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
