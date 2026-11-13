
import React, { useState, useMemo } from 'react';
import { 
  Search, Filter, Package, ArrowLeft, Printer, Download, 
  TrendingUp, Activity, BarChart2, ShieldAlert, Warehouse,
  Calendar, Info, ArrowUpRight, ArrowDownRight, ClipboardList,
  FileSpreadsheet
} from 'lucide-react';
import { exportToPDF, exportToExcel, handlePrint } from '../../lib/exportUtils';

interface InventoryReportProps {
  products: any[];
  stockMovements: any[];
  warehouses: any[];
  onBack?: () => void;
}

export const InventoryReport = ({ products, stockMovements, warehouses, onBack }: InventoryReportProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(val);
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (p.barcode || '').includes(searchTerm);
      const matchesWarehouse = selectedWarehouse === 'all' || String(p.warehouse_id) === String(selectedWarehouse);
      return matchesSearch && matchesWarehouse;
    });
  }, [products, searchTerm, selectedWarehouse]);

  const stats = useMemo(() => {
    const totalCostValue = filteredProducts.reduce((acc, p) => acc + (p.stock_quantity * (p.cost_price || 0)), 0);
    const totalSaleValue = filteredProducts.reduce((acc, p) => acc + (p.stock_quantity * (p.sale_price || 0)), 0);
    const totalItems = filteredProducts.reduce((acc, p) => acc + p.stock_quantity, 0);
    const lowStockItems = filteredProducts.filter(p => p.stock_quantity <= (p.min_stock || 0)).length;

    return {
      totalCostValue,
      totalSaleValue,
      totalItems,
      lowStockItems,
      potentialProfit: totalSaleValue - totalCostValue
    };
  }, [filteredProducts]);

  const handleExcelExport = () => {
    const data = filteredProducts.map(p => ({
      'Produto': p.name,
      'Barcode': p.barcode || '---',
      'Armazém': p.warehouse_name || 'PADRÃO',
      'Quantity': p.stock_quantity,
      'Unit': p.unit || 'UN',
      'Preço Custo': p.cost_price || 0,
      'Preço Venda': p.sale_price || 0,
      'Custo Total': p.stock_quantity * (p.cost_price || 0),
      'Venda Total': p.stock_quantity * (p.sale_price || 0)
    }));
    exportToExcel(data, `Inventario_${selectedDate}.xlsx`, 'Stock');
  };

  return (
    <div id="inventory-report-content" className="space-y-8 animate-in fade-in duration-500 pb-20 print-area ring-0 border-0 outline-none">
      <div className="flex items-center justify-between no-print">
        <div className="flex items-center gap-4">
          {onBack && (
            <button onClick={onBack} className="p-2 hover:bg-zinc-100 text-zinc-400 transition-colors">
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <h2 className="text-xl font-black text-[#003366] uppercase tracking-tighter">Resumo de Stock & Inventário</h2>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Visão geral de ativos, previsões e discrepâncias</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handlePrint('inventory-report-content')} className="bg-white border border-zinc-200 text-[#003366] px-4 py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-zinc-50 shadow-sm">
            <Printer size={14} /> Imprimir Inventário
          </button>
          <button onClick={handleExcelExport} className="bg-emerald-600 text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-700 shadow-md">
            <FileSpreadsheet size={14} /> Baixar Excel
          </button>
          <button onClick={() => exportToPDF('inventory-report-content', `Inventario_${selectedDate}.pdf`)} className="bg-[#003366] text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-black shadow-md">
            <Download size={14} /> Baixar PDF
          </button>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-zinc-200 p-6 shadow-sm relative overflow-hidden group">
          <div className="relative z-10">
            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Custo Total em Stock</p>
            <p className="text-2xl font-black text-[#003366]">{formatCurrency(stats.totalCostValue)}</p>
            <p className="mt-2 text-[9px] font-bold text-zinc-400 uppercase">Capital Imobilizado</p>
          </div>
          <BarChart2 className="absolute -right-4 -bottom-4 text-zinc-50 w-24 h-24 transition-transform group-hover:scale-110" />
        </div>

        <div className="bg-white border border-zinc-200 p-6 shadow-sm relative overflow-hidden group">
          <div className="relative z-10">
            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Previsão de Venda</p>
            <p className="text-2xl font-black text-emerald-600">{formatCurrency(stats.totalSaleValue)}</p>
            <p className="mt-2 text-[9px] font-bold text-zinc-400 uppercase">Valor potencial de mercado</p>
          </div>
          <TrendingUp className="absolute -right-4 -bottom-4 text-emerald-50 w-24 h-24 transition-transform group-hover:scale-110" />
        </div>

        <div className="bg-white border border-zinc-200 p-6 shadow-sm relative overflow-hidden group">
          <div className="relative z-10">
            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Margem de Lucro Est.</p>
            <p className="text-2xl font-black text-blue-600">{formatCurrency(stats.potentialProfit)}</p>
            <p className="mt-2 text-[9px] font-bold text-zinc-400 uppercase">Diferença de Valores</p>
          </div>
          <ArrowUpRight className="absolute -right-4 -bottom-4 text-blue-50 w-24 h-24 transition-transform group-hover:scale-110" />
        </div>

        <div className="bg-white border border-zinc-200 p-6 shadow-sm relative overflow-hidden group">
          <div className="relative z-10">
            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Alertas de Stock Baixo</p>
            <p className="text-2xl font-black text-red-600">{stats.lowStockItems} Artigos</p>
            <p className="mt-2 text-[9px] font-bold text-zinc-400 uppercase">Abaixo do stock mínimo</p>
          </div>
          <ShieldAlert className="absolute -right-4 -bottom-4 text-red-50 w-24 h-24 transition-transform group-hover:scale-110" />
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-zinc-200 p-6 no-print flex flex-wrap gap-6 items-end shadow-sm">
        <div className="flex-1 min-w-[280px] space-y-2">
          <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Pesquisas por Produto ou Barcode</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input 
              type="text" 
              placeholder="Digite o nome do produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 px-10 py-2.5 text-xs font-bold focus:outline-none focus:border-[#003366] transition-all"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Filtrar por Armazém</label>
          <div className="relative">
            <Warehouse className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
            <select 
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="bg-zinc-50 border border-zinc-200 pl-10 pr-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#003366] appearance-none min-w-[200px]"
            >
              <option value="all">TODOS ARMAZÉNS</option>
              {warehouses.map((w: any) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Data de Referência</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-zinc-50 border border-zinc-200 pl-10 pr-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#003366]" 
            />
          </div>
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-[#003366] text-white text-[9px] font-black uppercase tracking-widest border-b border-zinc-200">
                <th className="px-6 py-4">Produto / Descrição</th>
                <th className="px-6 py-4">Armazém</th>
                <th className="px-6 py-4 text-center">Quant. Stock</th>
                <th className="px-6 py-4 text-right">Preço Custo</th>
                <th className="px-6 py-4 text-right">Preço Venda</th>
                <th className="px-6 py-4 text-right">V. Custo Total</th>
                <th className="px-6 py-4 text-right font-black">Previsão Venda</th>
                <th className="px-6 py-4 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-[11px] font-bold">
              {filteredProducts.map((p, idx) => {
                const totalCost = p.stock_quantity * (p.cost_price || 0);
                const totalSale = p.stock_quantity * (p.sale_price || 0);
                const isLow = p.stock_quantity <= (p.min_stock || 0);

                return (
                  <tr key={idx} className="hover:bg-zinc-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-black text-[#003366] uppercase group-hover:text-blue-600 transition-colors">{p.name}</div>
                      <div className="text-[9px] text-zinc-400 flex items-center gap-1 font-mono">
                        <ClipboardList size={10} /> {p.barcode || '---'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-zinc-500 uppercase text-[10px] flex items-center gap-1">
                        <Warehouse size={10} /> {p.warehouse_name || 'PADRÃO'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-0.5 rounded-sm ${isLow ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                        {p.stock_quantity} {p.unit || 'UN'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-zinc-500 font-mono">{formatCurrency(p.cost_price || 0)}</td>
                    <td className="px-6 py-4 text-right text-zinc-500 font-mono">{formatCurrency(p.sale_price || 0)}</td>
                    <td className="px-6 py-4 text-right text-zinc-600">{formatCurrency(totalCost)}</td>
                    <td className="px-6 py-4 text-right font-black text-[#003366] bg-zinc-50/30">{formatCurrency(totalSale)}</td>
                    <td className="px-6 py-4 text-center">
                      <div className={`w-2 h-2 rounded-full mx-auto ${p.stock_quantity > 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-20 text-center text-zinc-300 font-black uppercase text-xs tracking-widest">Nenhum dado de inventário disponível.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Occurrences / Movements summary */}
      <div className="bg-white border border-zinc-200 p-6 shadow-sm">
        <h3 className="text-[10px] font-black text-[#003366] uppercase tracking-widest mb-6 flex items-center gap-2 border-b border-zinc-200 pb-2">
          <Activity size={16} /> Descrição de Ocorrência em Stock (Últimos Movimentos)
        </h3>
        <div className="space-y-4">
           {stockMovements.slice(0, 5).map((m, i) => (
             <div key={i} className="flex items-center gap-4 p-3 border-l-2 border-l-blue-600 bg-zinc-50/50">
               <div className={`p-2 rounded-none ${m.type === 'entry' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                 {m.type === 'entry' ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
               </div>
               <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-black text-[#003366] uppercase">{m.description || `Movimentação de ${m.type === 'entry' ? 'Entrada' : 'Saída'}`}</p>
                    <p className="text-[9px] font-bold text-zinc-400">{new Date(m.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    <p className="text-[10px] text-zinc-500">Documento: <span className="font-bold text-zinc-700">{m.document_no || 'Manual'}</span></p>
                    <p className="text-[10px] text-zinc-500">Alteração: <span className={`font-black ${m.type === 'entry' ? 'text-emerald-600' : 'text-red-600'}`}>{m.type === 'entry' ? '+' : '-'}{m.quantity} UN</span></p>
                  </div>
               </div>
             </div>
           ))}
           {stockMovements.length === 0 && <p className="text-center py-10 text-zinc-300 font-bold uppercase text-[9px]">Não há ocorrências registadas.</p>}
        </div>
      </div>
    </div>
  );
};
