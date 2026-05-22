
import React, { useState } from 'react';
import { 
  Search, Filter, FileText, Download, Printer, ArrowLeft, 
  ShoppingCart, Calendar, TrendingUp, ChevronDown, MoreHorizontal
} from 'lucide-react';

interface PurchasesReportProps {
  purchases: any[];
  suppliers: any[];
  onBack?: () => void;
}

export const PurchasesReport = ({ purchases, suppliers, onBack }: PurchasesReportProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(val);
  };

  const filteredPurchases = purchases.filter(p => {
    const matchesSearch = (p.supplier_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (p.invoice_number || '').toLowerCase().includes(searchTerm.toLowerCase());
    const docDate = new Date(p.date || p.data_emissao || Date.now());
    const matchesStart = !dateFilter.start || docDate >= new Date(dateFilter.start);
    const matchesEnd = !dateFilter.end || docDate <= new Date(dateFilter.end);
    return matchesSearch && matchesStart && matchesEnd;
  });

  const totalPurchased = filteredPurchases.reduce((acc, p) => acc + (p.total || 0), 0);
  const totalItems = filteredPurchases.reduce((acc, p) => acc + (p.items_count || 0), 0);
  const averageTicket = filteredPurchases.length > 0 ? totalPurchased / filteredPurchases.length : 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-4">
          {onBack && (
            <button onClick={onBack} className="p-2 hover:bg-zinc-100 text-zinc-400 transition-colors">
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <h2 className="text-xl font-black text-[#003366] uppercase tracking-tighter">Relatório de Compras</h2>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Análise detalhada de aquisições e despesas</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePrint} className="bg-white border border-zinc-200 text-[#003366] px-4 py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-zinc-50 transition-all shadow-sm">
            <Printer size={14} /> Imprimir
          </button>
          <button className="bg-[#003366] text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all shadow-md">
            <Download size={14} /> Baixar PDF
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-zinc-200 p-6 shadow-sm border-l-4 border-l-emerald-500">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Total em Compras</p>
            <ShoppingCart size={16} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-[#003366]">{formatCurrency(totalPurchased)}</p>
          <div className="mt-2 flex items-center gap-1 text-[9px] font-bold text-emerald-600 uppercase tracking-tighter">
            <TrendingUp size={10} /> +12% vs mês anterior
          </div>
        </div>

        <div className="bg-white border border-zinc-200 p-6 shadow-sm border-l-4 border-l-blue-500">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Ticket Médio Compra</p>
            <FileText size={16} className="text-blue-500" />
          </div>
          <p className="text-2xl font-black text-[#003366]">{formatCurrency(averageTicket)}</p>
          <p className="mt-2 text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">Baseado em {filteredPurchases.length} documentos</p>
        </div>

        <div className="bg-white border border-zinc-200 p-6 shadow-sm border-l-4 border-l-amber-500">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Total de Itens</p>
            <Calendar size={16} className="text-amber-500" />
          </div>
          <p className="text-2xl font-black text-[#003366]">{totalItems} UN</p>
          <p className="mt-2 text-[9px] font-bold text-zinc-400 uppercase tracking-tighter">Volume de stock adquirido</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-zinc-200 p-6 no-print flex flex-wrap gap-4 items-end shadow-sm">
        <div className="flex-1 min-w-[280px] space-y-2">
          <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Procurar por Fornecedor ou Documento</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input 
              type="text" 
              placeholder="Ex: Fornecedor ABC ou FT-2024/001"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 px-10 py-2.5 text-xs font-bold focus:outline-none focus:border-[#003366] transition-all"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Data Inicial</label>
          <input 
            type="date" 
            value={dateFilter.start}
            onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
            className="bg-zinc-50 border border-zinc-200 px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#003366]"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Data Final</label>
          <input 
            type="date" 
            value={dateFilter.end}
            onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
            className="bg-zinc-50 border border-zinc-200 px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#003366]"
          />
        </div>
        <button className="bg-[#003366] text-white px-6 py-2.5 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-black transition-all shadow-sm h-[40px]">
          <Filter size={14} /> Aplicar Filtros
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-[#003366] text-white text-[9px] font-black uppercase tracking-widest border-b border-zinc-200">
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Fornecedor</th>
                <th className="px-6 py-4">Documento</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4 text-right">Itens</th>
                <th className="px-6 py-4 text-right">Base</th>
                <th className="px-6 py-4 text-right font-black">Total</th>
                <th className="px-6 py-4 text-center no-print">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-[11px]">
              {filteredPurchases.map((p, idx) => (
                <tr key={idx} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-zinc-500 uppercase">{new Date(p.date || p.data_emissao || Date.now()).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <div className="font-black text-[#003366] uppercase">{p.supplier_name || 'Fornecedor s/ Nome'}</div>
                    <div className="text-[9px] text-zinc-400 font-bold">NIF: {p.supplier_nif || '---'}</div>
                  </td>
                  <td className="px-6 py-4 font-mono font-black text-blue-600">{p.invoice_number || 'N/A'}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 bg-zinc-100 text-zinc-500 text-[9px] font-black uppercase tracking-widest border border-zinc-200">
                      {p.document_type || 'FACTURA'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-zinc-500">{p.items_count || 0}</td>
                  <td className="px-6 py-4 text-right font-bold text-zinc-500">{formatCurrency(p.base_value || 0)}</td>
                  <td className="px-6 py-4 text-right font-black text-[#003366]">{formatCurrency(p.total || 0)}</td>
                  <td className="px-6 py-4 text-center no-print">
                    <button className="p-1 hover:bg-zinc-100 text-zinc-400"><MoreHorizontal size={16} /></button>
                  </td>
                </tr>
              ))}
              {filteredPurchases.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center text-zinc-300 font-black uppercase tracking-widest">Nenhuma compra registada nos critérios selecionados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
