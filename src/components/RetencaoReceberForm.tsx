import React from 'react';

const RetencaoReceberForm = () => {
  return (
    <div className="p-8 bg-white border border-zinc-200 shadow-sm space-y-6">
      <h2 className="text-xl font-bold text-[#003366] mb-6">Retenção na Fonte a Receber</h2>
      
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
              <th className="p-2 text-left">Cliente</th>
              <th className="p-2 text-left">NIF</th>
              <th className="p-2 text-right">Base</th>
              <th className="p-2 text-right">Taxa</th>
              <th className="p-2 text-right">Valor</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="p-2">--/--/----</td>
              <td className="p-2">Exemplo Cliente</td>
              <td className="p-2">000000000</td>
              <td className="p-2 text-right">0,00</td>
              <td className="p-2 text-right">6,5%</td>
              <td className="p-2 text-right">0,00</td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="bg-zinc-100 font-bold">
              <td colSpan={5} className="p-2 text-right">TOTAL</td>
              <td className="p-2 text-right">0,00</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default RetencaoReceberForm;
