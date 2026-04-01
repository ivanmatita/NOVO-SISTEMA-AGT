import React from 'react';
import { Invoice } from '../types';

const CalculosImpostosForm = ({ invoices }: { invoices: Invoice[] }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(value).replace('Kz', '').trim();
  };

  const totalSales = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const iva = totalSales * 0.14;
  const irt = totalSales * 0.065;
  const is = totalSales * 0.01;
  const totalImpostos = iva + irt + is;

  const impostosList = [
    { name: 'IVA', base: totalSales, rate: '14%', value: iva },
    { name: 'IRT', base: totalSales, rate: '6,5%', value: irt },
    { name: 'IS', base: totalSales, rate: '1%', value: is },
  ];

  return (
    <div className="p-8 bg-white border border-zinc-200 shadow-sm space-y-6">
      <h2 className="text-xl font-bold text-[#003366] mb-6">Cálculos de Impostos</h2>
      
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
        <h3 className="font-bold text-sm text-[#003366]">TABELA DE IMPOSTOS</h3>
        <table className="w-full mt-4 text-sm">
          <thead>
            <tr className="bg-zinc-100">
              <th className="p-2 text-left">Imposto</th>
              <th className="p-2 text-right">Base</th>
              <th className="p-2 text-right">Taxa</th>
              <th className="p-2 text-right">Valor</th>
            </tr>
          </thead>
          <tbody>
            {impostosList.map((imposto, idx) => (
              <tr key={idx} className="border-b">
                <td className="p-2">{imposto.name}</td>
                <td className="p-2 text-right">{formatCurrency(imposto.base)}</td>
                <td className="p-2 text-right">{imposto.rate}</td>
                <td className="p-2 text-right">{formatCurrency(imposto.value)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-zinc-100 font-bold">
              <td colSpan={3} className="p-2 text-right">TOTAL</td>
              <td className="p-2 text-right text-red-600">{formatCurrency(totalImpostos)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default CalculosImpostosForm;
