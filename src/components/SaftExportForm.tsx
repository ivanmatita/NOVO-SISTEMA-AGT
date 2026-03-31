import React, { useState } from 'react';

const SaftExportForm = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saftType, setSaftType] = useState('faturas');

  return (
    <div className="p-8 bg-white border border-zinc-200 shadow-sm space-y-6">
      <h2 className="text-xl font-bold text-[#003366] mb-6">Ficheiro SAFT</h2>
      
      <div className="grid grid-cols-3 gap-4">
        <div className="border p-4">
          <h3 className="font-bold text-sm text-[#003366]">DATA INICIAL</h3>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border p-1 w-full mt-2" />
        </div>
        <div className="border p-4">
          <h3 className="font-bold text-sm text-[#003366]">DATA FINAL</h3>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border p-1 w-full mt-2" />
        </div>
        <div className="border p-4">
          <h3 className="font-bold text-sm text-[#003366]">TIPO DE FICHEIRO</h3>
          <select value={saftType} onChange={e => setSaftType(e.target.value)} className="border p-1 w-full mt-2">
            <option value="faturas">SAFT Faturas</option>
            <option value="compras">SAFT Compras</option>
          </select>
        </div>
      </div>

      <button className="bg-[#003366] text-white px-6 py-2 rounded-none font-bold text-sm">
        Pesquisar Movimentos
      </button>

      <div className="border p-4">
        <h3 className="font-bold text-sm text-[#003366]">RESUMO DOS MOVIMENTOS</h3>
        <table className="w-full mt-4 text-sm">
          <thead>
            <tr className="bg-zinc-100">
              <th className="p-2 text-left">Tipo de Documento</th>
              <th className="p-2 text-right">Quantidade</th>
              <th className="p-2 text-right">Valor Total</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="p-2">Exemplo Documento</td>
              <td className="p-2 text-right">0</td>
              <td className="p-2 text-right">0,00</td>
            </tr>
          </tbody>
        </table>
      </div>

      <button className="bg-green-600 text-white px-6 py-2 rounded-none font-bold text-sm">
        Download SAFT
      </button>
    </div>
  );
};

export default SaftExportForm;
