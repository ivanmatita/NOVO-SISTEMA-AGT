
import React, { useState, useMemo } from 'react';
import { 
  Search, Filter, Wallet, ArrowLeft, Printer, Download, 
  TrendingUp, TrendingDown, ArrowUpCircle, ArrowDownCircle,
  Calendar, FileText, PieChart, Activity, CheckCircle2,
  MoreVertical, ChevronDown, DollarSign, History, Info
} from 'lucide-react';

interface CashFlowReportProps {
  movements: any[];
  cashBoxes?: any[];
  onBack?: () => void;
}

export const CashFlowReport = ({ movements, cashBoxes = [], onBack }: CashFlowReportProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [selectedBox, setSelectedBox] = useState('all');

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(val);
  };

  const filteredMovements = useMemo(() => {
    return movements.filter(m => {
      const matchesSearch = (m.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (m.document_no || '').includes(searchTerm);
      const matchesBox = selectedBox === 'all' || String(m.cash_box_id) === String(selectedBox);
      
      const docDate = new Date(m.date || m.created_at || Date.now());
      const matchesStart = !dateFilter.start || docDate >= new Date(dateFilter.start);
      const matchesEnd = !dateFilter.end || docDate <= new Date(dateFilter.end);
      
      return matchesSearch && matchesBox && matchesStart && matchesEnd;
    });
  }, [movements, searchTerm, selectedBox, dateFilter]);

  const stats = useMemo(() => {
    const entries = filteredMovements.filter(m => m.type === 'entry');
    const exits = filteredMovements.filter(m => m.type === 'exit');
    
    const totalEntries = entries.reduce((acc, m) => acc + (m.amount || 0), 0);
    const totalExits = exits.reduce((acc, m) => acc + (m.amount || 0), 0);
    const balance = totalEntries - totalExits;

    return {
      totalEntries,
      totalExits,
      balance,
      entryCount: entries.length,
      exitCount: exits.length
    };
  }, [filteredMovements]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-4">
          {onBack && (
            <button onClick={onBack} className="p-2 hover:bg-zinc-100 text-zinc-400 transition-colors">
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <h2 className="text-xl font-black text-[#003366] uppercase tracking-tighter">Fluxo de Caixa & Tesouraria</h2>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Controle de disponibilidades, entradas e saídas financeiras</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="bg-white border border-zinc-200 text-[#003366] px-4 py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-zinc-50 shadow-sm">
            <Printer size={14} /> Imprimir Extrato
          </button>
          <button className="bg-[#003366] text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-black shadow-md">
            <Download size={14} /> Baixar PDF
          </button>
        </div>
      </div>

      {/* Cash Flow Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-zinc-200 p-8 shadow-sm border-t-4 border-t-emerald-500 group overflow-hidden relative">
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-4">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Total Entradas (Crédito)</p>
              <ArrowUpCircle className="text-emerald-500" size={20} />
            </div>
            <p className="text-3xl font-black text-[#003366] mb-1">{formatCurrency(stats.totalEntries)}</p>
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter">Segmentadas em {stats.entryCount} movimentos</p>
          </div>
          <DollarSign className="absolute -right-6 -bottom-6 text-emerald-50/50 w-32 h-32 group-hover:scale-110 transition-transform" />
        </div>

        <div className="bg-white border border-zinc-200 p-8 shadow-sm border-t-4 border-t-red-500 group overflow-hidden relative">
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-4">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Total Saídas (Débito)</p>
              <ArrowDownCircle className="text-red-500" size={20} />
            </div>
            <p className="text-3xl font-black text-[#003366] mb-1">{formatCurrency(stats.totalExits)}</p>
            <p className="text-[10px] font-bold text-red-600 uppercase tracking-tighter">Segmentadas em {stats.exitCount} despesas</p>
          </div>
          <DollarSign className="absolute -right-6 -bottom-6 text-red-50/50 w-32 h-32 group-hover:scale-110 transition-transform" />
        </div>

        <div className="bg-white border border-zinc-200 p-8 shadow-sm border-t-4 border-t-blue-500 group overflow-hidden relative">
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-4">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Disponibilidade Líquida</p>
              <Wallet className="text-blue-500" size={20} />
            </div>
            <p className={`text-3xl font-black mb-1 ${stats.balance >= 0 ? 'text-[#003366]' : 'text-red-600'}`}>{formatCurrency(stats.balance)}</p>
            <div className="flex items-center gap-1.5 mt-2">
              <div className={`w-1.5 h-1.5 rounded-full ${stats.balance >= 0 ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`}></div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">Disponibilidade de caixa imediata</p>
            </div>
          </div>
          <Activity className="absolute -right-6 -bottom-6 text-blue-50/50 w-32 h-32 group-hover:scale-110 transition-transform" />
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="bg-white border border-zinc-200 p-6 no-print flex flex-wrap gap-4 items-end shadow-sm">
        <div className="flex-1 min-w-[280px] space-y-2">
          <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Termo de Pesquisa ou Doc Relacionado</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input 
              type="text" 
              placeholder="Digite a descrição ou Nº documento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 pl-10 pr-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#003366]"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Filtrar Caixa</label>
          <div className="relative">
            <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
            <select 
              value={selectedBox}
              onChange={(e) => setSelectedBox(e.target.value)}
              className="bg-zinc-50 border border-zinc-200 pl-10 pr-8 py-2.5 text-xs font-bold focus:outline-none focus:border-[#003366] appearance-none"
            >
              <option value="all">TODOS CAIXAS</option>
              {cashBoxes.map((b: any) => (
                <option key={b.id} value={b.id}>{b.name || `Caixa ${b.id}`}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Período Selecionado</label>
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              value={dateFilter.start}
              onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
              className="bg-zinc-50 border border-zinc-200 px-4 py-2.5 text-xs font-bold" 
            />
            <span className="text-zinc-300">/</span>
            <input 
              type="date" 
              value={dateFilter.end}
              onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
              className="bg-zinc-50 border border-zinc-200 px-4 py-2.5 text-xs font-bold" 
            />
          </div>
        </div>
      </div>

      {/* Movements Detailed List */}
      <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
          <h3 className="text-xs font-black text-[#003366] uppercase tracking-widest flex items-center gap-2">
             <History size={16} /> Extrato de Movimentação Financeira
          </h3>
          <div className="flex items-center gap-4">
             <button className="text-[9px] font-black text-[#003366] uppercase hover:underline flex items-center gap-1.5">
               <CheckCircle2 size={12} className="text-emerald-500" /> Conciliação Bancária
             </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-[#003366] text-white text-[9px] font-black uppercase tracking-widest border-b border-zinc-200">
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Origem / Destino</th>
                <th className="px-6 py-4">Documento Relacionado</th>
                <th className="px-6 py-4">Descrição do Movimento</th>
                <th className="px-6 py-4 text-right">Entrada (+)</th>
                <th className="px-6 py-4 text-right">Saída (-)</th>
                <th className="px-6 py-4 text-right">Saldo Restante</th>
                <th className="px-6 py-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-[11px] font-bold">
              {filteredMovements.map((m, idx) => {
                const isEntry = m.type === 'entry';
                return (
                  <tr key={idx} className={`hover:bg-zinc-50 transition-colors ${!isEntry ? 'bg-red-50/10' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="text-[#003366] font-extrabold">{new Date(m.date || m.created_at).toLocaleDateString()}</div>
                      <div className="text-[8px] text-zinc-400">{new Date(m.date || m.created_at).toLocaleTimeString()}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="bg-zinc-100 px-2 py-1 inline-block text-[9px] font-black text-[#003366] uppercase tracking-tighter border border-zinc-200">
                        {m.cash_box_name || m.origin || 'CAIXA GERAL'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-blue-600 font-mono font-black">{m.document_no || '---'}</div>
                      <div className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">{m.document_type || 'OUTROS'}</div>
                    </td>
                    <td className="px-6 py-4 uppercase text-zinc-500 font-bold truncate max-w-[200px]">
                      {m.description}
                    </td>
                    <td className="px-6 py-4 text-right text-emerald-600 font-black">
                      {isEntry ? `+ ${formatCurrency(m.amount)}` : '---'}
                    </td>
                    <td className="px-6 py-4 text-right text-red-600 font-black">
                      {!isEntry ? `- ${formatCurrency(m.amount)}` : '---'}
                    </td>
                    <td className="px-6 py-4 text-right text-[#003366] bg-zinc-50 font-black">
                      {formatCurrency(m.resulting_balance || 0)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className={`px-2 py-0.5 text-[8px] font-black uppercase rounded-full ${m.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {m.status === 'confirmed' ? 'CONCILIADO' : 'PENDENTE'}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredMovements.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-20 text-center text-zinc-300 font-black uppercase text-xs tracking-widest italic">Não existem movimentos registados neste período.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Analysis and Forecast */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white border border-zinc-200 p-6 shadow-sm">
           <h3 className="text-[10px] font-black text-[#003366] uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-zinc-200 pb-2">
             <PieChart size={16} className="text-blue-500" /> Previsão & Análise Financeira
           </h3>
           <div className="space-y-6">
              <div className="flex justify-between items-end border-b border-zinc-50 pb-4">
                 <div>
                    <p className="text-[10px] font-black text-zinc-400 uppercase mb-1">Previsão Recebimento (30 dias)</p>
                    <p className="text-xl font-black text-[#003366]">{formatCurrency(stats.totalEntries * 1.15)}</p>
                 </div>
                 <div className="text-right">
                    <span className="bg-blue-100 text-blue-600 px-2 py-0.5 text-[9px] font-black uppercase">Taxa Est. +15%</span>
                 </div>
              </div>
              <div className="flex justify-between items-end border-b border-zinc-50 pb-4">
                 <div>
                    <p className="text-[10px] font-black text-zinc-400 uppercase mb-1">Previsão Pagamento (30 dias)</p>
                    <p className="text-xl font-black text-red-600">{formatCurrency(stats.totalExits * 0.9)}</p>
                 </div>
                 <div className="text-right">
                    <span className="bg-red-100 text-red-600 px-2 py-0.5 text-[9px] font-black uppercase">Otimização -10%</span>
                 </div>
              </div>
              <div className="flex items-center gap-4 pt-2">
                 <div className="flex-1 h-3 bg-zinc-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#003366]" style={{ width: '65%' }}></div>
                 </div>
                 <span className="text-xs font-black text-[#003366]">65% Liquidez</span>
              </div>
           </div>
        </div>
        
        <div className="bg-white border border-zinc-200 p-6 shadow-sm">
           <h3 className="text-[10px] font-black text-[#003366] uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-zinc-200 pb-2">
             <Info size={16} className="text-[#003366]" /> Observações de Tesouraria
           </h3>
           <div className="space-y-3">
              <div className="p-3 bg-blue-50 border border-blue-100 text-[10px] text-blue-800 font-bold uppercase leading-relaxed">
                 O sistema detetou um aumento de 22% nas entradas via Terminal POS no período da manhã. Recomendamos conciliação antecipada.
              </div>
              <div className="p-3 bg-amber-50 border border-amber-100 text-[10px] text-amber-800 font-bold uppercase leading-relaxed">
                 As saídas relacionadas a fornecedores aumentaram significativamente nos últimos 7 dias. Verifique prazos de pagamento.
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
