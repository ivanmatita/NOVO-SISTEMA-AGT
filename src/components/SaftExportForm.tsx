import React, { useState } from 'react';
import { Invoice, Purchase } from '../types';
import { exportToExcel } from '../lib/exportUtils';

const SaftExportForm = ({ invoices = [], purchases = [] }: { invoices?: Invoice[], purchases?: Purchase[] }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saftType, setSaftType] = useState('faturas');

  const certifiedInvoices = (invoices || []).filter(inv => inv.is_certified);
  const completedPurchases = (purchases || []).filter(pur => pur.status === 'completed');

  const dataToDisplay = saftType === 'faturas' ? certifiedInvoices : completedPurchases;

  const summary = dataToDisplay.reduce((acc: any, item: any) => {
    const type = item.document_type || item.tipo_documento || (saftType === 'faturas' ? 'Fatura' : 'Fatura de Compra');
    if (!acc[type]) {
      acc[type] = { count: 0, total: 0 };
    }
    acc[type].count += 1;
    acc[type].total += item.total || item.counter_value || 0;
    return acc;
  }, {});

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(value).replace('Kz', '').trim();
  };

  const handleExcelExport = () => {
    const data = dataToDisplay.map((item: any) => ({
      'Data': new Date(item.date || item.data_emissao).toLocaleDateString(),
      'Número': item.invoice_number || item.numero_documento,
      'Documento': item.document_type || (saftType === 'faturas' ? 'Factura' : 'Compra'),
      'Total': item.total || item.counter_value || 0,
      'IVA': item.vat_amount || 0,
      'Status': item.status || 'Certificado'
    }));
    exportToExcel(data, `Exportacao_Detalhada_${saftType}_${new Date().toISOString().split('T')[0]}.xlsx`, 'Relatorio');
  };

  return (
    <div className="p-8 bg-white border border-zinc-200 shadow-sm space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-[#003366] uppercase tracking-tighter">Ficheiro Auditoria Tributária (SAF-T AO)</h2>
        <div className="bg-blue-50 text-[#003366] px-3 py-1 text-[10px] font-black uppercase tracking-widest border border-blue-100 italic">
          Apenas Documentos Certificados AGT
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-zinc-200 p-4 bg-zinc-50/30">
          <h3 className="font-bold text-[10px] text-zinc-400 uppercase tracking-widest mb-2">Periodo de Início</h3>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border border-zinc-200 p-2 w-full text-xs font-bold text-zinc-600 focus:outline-none focus:border-[#003366]" />
        </div>
        <div className="border border-zinc-200 p-4 bg-zinc-50/30">
          <h3 className="font-bold text-[10px] text-zinc-400 uppercase tracking-widest mb-2">Periodo Final</h3>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border border-zinc-200 p-2 w-full text-xs font-bold text-zinc-600 focus:outline-none focus:border-[#003366]" />
        </div>
        <div className="border border-zinc-200 p-4 bg-zinc-50/30">
          <h3 className="font-bold text-[10px] text-zinc-400 uppercase tracking-widest mb-2">Estrutura de Dados</h3>
          <select value={saftType} onChange={e => setSaftType(e.target.value)} className="border border-zinc-200 p-2 w-full text-xs font-bold text-zinc-600 focus:outline-none focus:border-[#003366]">
            <option value="faturas">Vendas (Invoices & Receipts)</option>
            <option value="compras">Aquisições (Purchase Documents)</option>
          </select>
        </div>
      </div>

      <div className="border border-zinc-200 overflow-hidden">
        <div className="bg-zinc-50 p-4 border-b border-zinc-200 flex justify-between items-center">
          <h3 className="font-bold text-xs text-[#003366] uppercase tracking-widest">Resumo de Movimentos Auditados</h3>
          <span className="text-[10px] font-bold text-zinc-400 uppercase">Valores em Kz (AOA)</span>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-100/50 border-b border-zinc-100 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
              <th className="px-6 py-4">Tipo de Documento Fiscal</th>
              <th className="px-6 py-4 text-center">Volume (Qtd)</th>
              <th className="px-6 py-4 text-right">Valor Total Ilíquido</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 text-[11px] font-bold text-zinc-700">
            {Object.keys(summary).map((type) => (
              <tr key={type} className="hover:bg-zinc-50 transition-colors">
                <td className="px-6 py-4 uppercase">{type}</td>
                <td className="px-6 py-4 text-center text-[#003366]">{summary[type].count}</td>
                <td className="px-6 py-4 text-right font-black">{formatCurrency(summary[type].total)}</td>
              </tr>
            ))}
            {Object.keys(summary).length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-12 text-center text-zinc-400 italic font-medium uppercase tracking-widest">Nenhum movimento certificado encontrado no período.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex gap-4">
         <button className="flex-1 bg-[#003366] text-white px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-[#002244] transition-all">
           Gerar XML SAF-T AO
         </button>
         <button onClick={handleExcelExport} className="flex-1 border border-emerald-600 text-emerald-600 px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-emerald-50 transition-all">
           Exportar Excel Detalhado
         </button>
      </div>
    </div>
  );
};


export default SaftExportForm;
