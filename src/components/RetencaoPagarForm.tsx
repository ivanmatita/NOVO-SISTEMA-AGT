import React from 'react';
import { Purchase, Supplier } from '../types';

const RetencaoPagarForm = ({ purchases, suppliers }: { purchases: Purchase[], suppliers: Supplier[] }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(value).replace('Kz', '').trim();
  };

  // Assuming a default withholding tax of 6.5% for services
  const retentionRate = 0.065;

  const retentions = purchases.map(p => {
    const supplier = suppliers.find(s => s.id === p.supplier_id);
    const base = p.total;
    const value = base * retentionRate;
    return {
      date: new Date(p.date).toLocaleDateString('pt-PT'),
      supplierName: supplier?.name || 'Desconhecido',
      nif: supplier?.nif || 'N/A',
      base,
      rate: '6,5%',
      value
    };
  });

  const totalRetention = retentions.reduce((sum, r) => sum + r.value, 0);

  return (
    <div className="p-8 bg-white border border-zinc-200 shadow-sm space-y-6">
      <h2 className="text-xl font-bold text-[#003366] mb-6">Retenção na Fonte a Pagar</h2>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="border p-4">
          <h3 className="font-bold text-sm text-[#003366]">IDENTIFICAÇÃO DO CONTRIBUINTE</h3>
          <input type="text" placeholder="Nome ou Designação Social" className="border p-1 w-full mt-2" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="border p-4">
            <h3 className="font-bold text-sm text-[#003366]">NIF</h3>
            <input type="text" placeholder="NIF" className="border p-1 w-full mt-2" />
          </div>
          <div className="border p-4">
            <h3 className="font-bold text-sm text-[#003366]">PERÍODO</h3>
            <input type="text" placeholder="Mês/Ano" className="border p-1 w-full mt-2" />
          </div>
        </div>
      </div>

      <div className="border p-4">
        <h3 className="font-bold text-sm text-[#003366]">LISTA DE RETENÇÕES</h3>
        <table className="w-full mt-4 text-sm">
          <thead>
            <tr className="bg-zinc-100">
              <th className="p-2 text-left">Data</th>
              <th className="p-2 text-left">Fornecedor</th>
              <th className="p-2 text-left">NIF</th>
              <th className="p-2 text-right">Base</th>
              <th className="p-2 text-right">Taxa</th>
              <th className="p-2 text-right">Valor</th>
            </tr>
          </thead>
          <tbody>
            {retentions.map((r, idx) => (
              <tr key={idx} className="border-b">
                <td className="p-2">{r.date}</td>
                <td className="p-2">{r.supplierName}</td>
                <td className="p-2">{r.nif}</td>
                <td className="p-2 text-right">{formatCurrency(r.base)}</td>
                <td className="p-2 text-right">{r.rate}</td>
                <td className="p-2 text-right">{formatCurrency(r.value)}</td>
              </tr>
            ))}
            {retentions.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-zinc-500 italic">Nenhuma retenção encontrada.</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-zinc-100 font-bold">
              <td colSpan={5} className="p-2 text-right">TOTAL</td>
              <td className="p-2 text-right text-red-600">{formatCurrency(totalRetention)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default RetencaoPagarForm;
