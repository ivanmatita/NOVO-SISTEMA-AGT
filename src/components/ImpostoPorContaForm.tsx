import React from 'react';

const ImpostoPorContaForm = () => {
  return (
    <div className="p-8 bg-white border border-zinc-200 shadow-sm space-y-6">
      <h2 className="text-xl font-bold text-[#003366] mb-6">Imposto por Conta</h2>
      
      <div className="grid grid-cols-3 gap-4 border-2 border-zinc-800 p-2">
        <div className="col-span-1 border-r border-zinc-800 p-2">
          <h3 className="font-bold text-sm text-[#003366]">01- PERÍODO DA DECLARAÇÃO</h3>
          <div className="flex gap-2 mt-2">
            <input type="text" placeholder="Ano" className="border p-1 w-16" />
            <input type="text" placeholder="Mês" className="border p-1 w-16" />
          </div>
        </div>
        <div className="col-span-1 border-r border-zinc-800 p-2 flex items-center justify-center">
          <h3 className="font-bold text-lg text-zinc-800">APURAMENTO DO IMPOSTO</h3>
        </div>
        <div className="col-span-1 p-2">
          <h3 className="font-bold text-sm text-[#003366]">03- NÚMERO DE IDENTIFICAÇÃO FISCAL</h3>
          <input type="text" placeholder="NIF" className="border p-1 w-full mt-2" />
        </div>
      </div>

      <div className="border-2 border-zinc-800 p-2">
        <h3 className="font-bold text-sm text-[#003366]">04- IDENTIFICAÇÃO DO CONTRIBUINTE</h3>
        <input type="text" placeholder="Nome ou Designação Social" className="border p-1 w-full mt-2" />
      </div>

      <div className="border-2 border-zinc-800 p-2">
        <h3 className="font-bold text-sm text-[#003366]">05- RELACÇÃO DAS FACTURAS E DOCUMENTOS EQUIVALENTES GERADORES DE IMPOSTO</h3>
        <table className="w-full mt-4 text-sm border-collapse border border-zinc-800">
          <thead>
            <tr className="bg-zinc-100">
              <th className="border border-zinc-800 p-2">N ORDEM</th>
              <th className="border border-zinc-800 p-2">NIF</th>
              <th className="border border-zinc-800 p-2">NOME/EMPRESA</th>
              <th className="border border-zinc-800 p-2">TIPO DOC</th>
              <th className="border border-zinc-800 p-2">DADOS DOC</th>
              <th className="border border-zinc-800 p-2">Nº DOC</th>
              <th className="border border-zinc-800 p-2">VALOR FACTURA</th>
              <th className="border border-zinc-800 p-2">SUJEITO (a) TRIBUTÁVEL</th>
              <th className="border border-zinc-800 p-2">SUJEITO (b) TRIBUTÁVEL</th>
              <th className="border border-zinc-800 p-2">IMPOSTO GERADO</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-zinc-800">
              <td className="border border-zinc-800 p-2">&nbsp;</td>
              <td className="border border-zinc-800 p-2">&nbsp;</td>
              <td className="border border-zinc-800 p-2">&nbsp;</td>
              <td className="border border-zinc-800 p-2">&nbsp;</td>
              <td className="border border-zinc-800 p-2">&nbsp;</td>
              <td className="border border-zinc-800 p-2">&nbsp;</td>
              <td className="border border-zinc-800 p-2 text-right">0,00</td>
              <td className="border border-zinc-800 p-2 text-right">0,00</td>
              <td className="border border-zinc-800 p-2 text-right">0,00</td>
              <td className="border border-zinc-800 p-2 text-right">0,00</td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="bg-zinc-100 font-bold">
              <td colSpan={6} className="border border-zinc-800 p-2 text-right">TOTAL</td>
              <td className="border border-zinc-800 p-2 text-right">0,00</td>
              <td className="border border-zinc-800 p-2 text-right">0,00</td>
              <td className="border border-zinc-800 p-2 text-right">0,00</td>
              <td className="border border-zinc-800 p-2 text-right">0,00</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};

export default ImpostoPorContaForm;
