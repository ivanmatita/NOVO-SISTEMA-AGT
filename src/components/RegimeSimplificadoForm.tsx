import React, { useState } from 'react';

const RegimeSimplificadoForm = () => {
  const [ano, setAno] = useState('2026');
  const [mes, setMes] = useState('03');

  return (
    <div className="p-8 bg-white border border-zinc-200 shadow-sm space-y-6">
      <h2 className="text-xl font-bold text-[#003366] mb-6">Regime Simplificado</h2>
      
      <div className="grid grid-cols-3 gap-4 border border-zinc-300 p-4">
        <div>
          <h3 className="font-bold text-sm text-[#003366]">02- PERÍODO DA DECLARAÇÃO</h3>
          <div className="flex gap-2 mt-2">
            <input type="text" value={ano} onChange={e => setAno(e.target.value)} placeholder="Ano" className="border p-1 w-16" />
            <input type="text" value={mes} onChange={e => setMes(e.target.value)} placeholder="Mês" className="border p-1 w-16" />
          </div>
        </div>
        <div>
          <h3 className="font-bold text-sm text-[#003366]">03- NIF</h3>
          <input type="text" placeholder="NIF" className="border p-1 w-full mt-2" />
        </div>
        <div>
          <h3 className="font-bold text-sm text-[#003366]">04- IDENTIFICAÇÃO</h3>
          <input type="text" placeholder="Nome ou Designação Social" className="border p-1 w-full mt-2" />
        </div>
      </div>

      <div className="border border-zinc-300 p-4">
        <h3 className="font-bold text-sm text-[#003366] mb-4">06- SECTOR DE ACTIVIDADE</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-100">
              <th className="p-2 text-left">Operação</th>
              <th className="p-2 text-left">Código</th>
              <th className="p-2 text-right">Taxa</th>
              <th className="p-2 text-right">Imposto</th>
            </tr>
          </thead>
          <tbody>
            {[
              { label: '1º INDÚSTRIA', code: 'INDUSTRIAT', taxa: '7%' },
              { label: '2º COMERCIO', code: 'COMERCIOT', taxa: '7%' },
              { label: '3º PRESTAÇÃO DE SERVIÇOS', code: 'SERVICOST', taxa: '7%' },
              { label: '4º SERVIÇOS CONTRATADOS A PRESTADORES NÃO RESIDENTES', code: 'ESTRANGEIROST', taxa: '7%' },
              { label: '5º OUTROS', code: 'OUTROST', taxa: '7%' },
            ].map((op, idx) => (
              <tr key={idx} className="border-b">
                <td className="p-2">{op.label}</td>
                <td className="p-2">{op.code}</td>
                <td className="p-2 text-right">{op.taxa}</td>
                <td className="p-2 text-right">0,00</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border border-zinc-300 p-4">
        <h3 className="font-bold text-sm text-[#003366] mb-4">07- IVA A PAGAR - REGIME TRANSITÓRIO</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-100">
              <th className="p-2 text-left">Descrição</th>
              <th className="p-2 text-left">Código</th>
              <th className="p-2 text-right">Taxa</th>
              <th className="p-2 text-right">Imposto</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-2">TOTAL DE RECEBIMENTOS DAS FACTURAS EMITIDAS ENQUANTO O SUJEITO PASSIVO ESTEVE ENQUADRADO NO REGIME TRANSITÓRIO</td>
              <td className="p-2">TRANSITORIOT</td>
              <td className="p-2 text-right">3%</td>
              <td className="p-2 text-right">0,00</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="border border-zinc-300 p-4">
        <h3 className="font-bold text-sm text-[#003366] mb-4">07- IMPOSTO DEVIDO DAS OPERAÇÕES ISENTAS DE IVA</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-100">
              <th className="p-2 text-left">Descrição</th>
              <th className="p-2 text-left">Código</th>
              <th className="p-2 text-right">Taxa</th>
              <th className="p-2 text-right">Imposto</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-2">Total de Recebimentos de Operações Isentas de IVA</td>
              <td className="p-2">ISENTAST</td>
              <td className="p-2 text-right">7%</td>
              <td className="p-2 text-right">0,00</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RegimeSimplificadoForm;
