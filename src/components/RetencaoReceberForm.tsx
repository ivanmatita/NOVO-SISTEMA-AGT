import React, { useState } from 'react';
import { Invoice, Client } from '../types';
import { FileText, Download, Printer, Filter, ChevronDown } from 'lucide-react';

const RetencaoReceberForm = ({ invoices, clients }: { invoices: Invoice[], clients: Client[] }) => {
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());
  const [regimeIVA, setRegimeIVA] = useState<'Geral' | 'Caixa' | 'Transitório'>('Geral');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  };

  const retentionRate = 0.065;

  const retentions = (invoices || [])
    .filter(i => i.status !== 'anulado')
    .filter(i => {
      const d = new Date(i.date);
      const matchMonth = filterMonth ? (d.getMonth() + 1) === parseInt(filterMonth) : true;
      const matchYear = filterYear ? d.getFullYear() === parseInt(filterYear) : true;
      return matchMonth && matchYear;
    })
    .map((i, idx) => {
      const client = (clients || []).find(c => c.id === i.client_id);
      const impostoBase = i.total || 0;
      const impRetido = Number(i.retencao_fonte_total || (impostoBase * retentionRate));
      const notaCredito = 0;
      const impReceber = impRetido - notaCredito;
      const docDate = new Date(i.date);

      return {
        num: idx + 1,
        cliente: client?.name || 'Cliente Desconhecido',
        dataDoc: docDate.toLocaleDateString('pt-PT'),
        docNo: i.invoice_number,
        tipo: i.document_type || 'Fatura',
        taxa: 6.5,
        impostoBase,
        notaCredito,
        impReceber,
      };
    });

  const totalImpostoBase = retentions.reduce((s, r) => s + r.impostoBase, 0);
  const totalNotaCredito = retentions.reduce((s, r) => s + r.notaCredito, 0);
  const totalImpReceber = retentions.reduce((s, r) => s + r.impReceber, 0);

  const months = [
    { v: '1', l: 'Janeiro' }, { v: '2', l: 'Fevereiro' }, { v: '3', l: 'Março' },
    { v: '4', l: 'Abril' }, { v: '5', l: 'Maio' }, { v: '6', l: 'Junho' },
    { v: '7', l: 'Julho' }, { v: '8', l: 'Agosto' }, { v: '9', l: 'Setembro' },
    { v: '10', l: 'Outubro' }, { v: '11', l: 'Novembro' }, { v: '12', l: 'Dezembro' },
  ];
  const years = ['2023', '2024', '2025', '2026', '2027'];

  // Current period string
  const periodStr = filterMonth && filterYear
    ? `${months.find(m => m.v === filterMonth)?.l || ''} de ${filterYear}`
    : `Ano ${filterYear}`;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-zinc-800 flex items-center gap-3">
            <FileText size={24} className="text-[#003366]" />
            Retenção na Fonte — Clientes (a Receber)
          </h2>
          <p className="text-zinc-500 text-sm">Retenções na Fonte a Receber de Clientes • Taxa: 6,5%</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()} className="flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 hover:text-[#003366] hover:border-[#003366] hover:bg-blue-50 px-4 py-2 rounded-md text-sm font-bold uppercase tracking-wider transition-colors">
            <Printer size={18} /> Imprimir
          </button>
          <button className="flex items-center gap-2 bg-[#003366] text-white hover:bg-[#002244] px-4 py-2 rounded-md text-sm font-bold uppercase tracking-wider transition-colors">
            <Download size={18} /> Exportar Excel
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 bg-white border border-zinc-200 p-4 rounded-lg shadow-sm flex-wrap">
        <Filter size={16} className="text-zinc-500" />
        <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Filtrar por:</span>
        <div className="relative">
          <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
            className="appearance-none bg-zinc-50 border border-zinc-200 text-sm text-zinc-700 font-medium px-3 py-1.5 pr-8 rounded-md focus:outline-none focus:border-[#003366]">
            <option value="">Todos os Meses</option>
            {months.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-2 top-2 text-zinc-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
            className="appearance-none bg-zinc-50 border border-zinc-200 text-sm text-zinc-700 font-medium px-3 py-1.5 pr-8 rounded-md focus:outline-none focus:border-[#003366]">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-2 top-2 text-zinc-400 pointer-events-none" />
        </div>
        <span className="ml-auto text-xs text-zinc-400 font-medium">{retentions.length} documento(s) encontrado(s)</span>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-zinc-200 p-5 rounded-lg shadow-sm">
          <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Total Base Tributável</h3>
          <p className="text-xl font-black text-zinc-800">{formatCurrency(totalImpostoBase)} Kz</p>
        </div>
        <div className="bg-white border border-zinc-200 p-5 rounded-lg shadow-sm">
          <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Total Imposto a Receber (6,5%)</h3>
          <p className="text-xl font-black text-emerald-600">{formatCurrency(totalImpReceber)} Kz</p>
        </div>
        <div className="bg-white border border-zinc-200 p-5 rounded-lg shadow-sm">
          <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Nº de Documentos</h3>
          <p className="text-xl font-black text-zinc-800">{retentions.length}</p>
        </div>
      </div>

      {/* Main Declaration Document */}
      <div className="bg-white border border-zinc-300 shadow-md rounded-lg overflow-hidden print:shadow-none">
        {/* Document Title Bar */}
        <div className="bg-[#003366] text-white px-6 py-4 text-center">
          <p className="text-[10px] font-bold tracking-widest uppercase opacity-80">REPÚBLICA DE ANGOLA • MINISTÉRIO DAS FINANÇAS • AGT</p>
          <h2 className="text-lg font-black tracking-tight uppercase mt-1">RETENÇÕES NA FONTE A RECEBER DE CLIENTES</h2>
          <p className="text-[11px] opacity-70 mt-0.5">Período: {periodStr}</p>
        </div>

        {/* Section 01/02/03 - Three column header info */}
        <div className="grid grid-cols-3 border-b border-zinc-300">
          {/* 01 - Regime IVA */}
          <div className="border-r border-zinc-300">
            <div className="bg-[#003366] text-white px-4 py-2">
              <span className="text-[11px] font-black tracking-widest uppercase">01 — REGIME DO IVA</span>
            </div>
            <div className="px-4 py-3 space-y-2">
              {(['Geral', 'Caixa', 'Transitório'] as const).map(r => (
                <label key={r} className="flex items-center gap-2 cursor-pointer group">
                  <div
                    onClick={() => setRegimeIVA(r)}
                    className={`w-4 h-4 border-2 rounded-sm flex items-center justify-center transition-colors cursor-pointer ${regimeIVA === r ? 'bg-[#003366] border-[#003366]' : 'border-zinc-400 hover:border-[#003366]'}`}
                  >
                    {regimeIVA === r && <div className="w-2 h-2 bg-white rounded-sm" />}
                  </div>
                  <span className={`text-sm font-semibold ${regimeIVA === r ? 'text-[#003366]' : 'text-zinc-600'}`}>{r}</span>
                </label>
              ))}
            </div>
          </div>
          {/* 02 - Periodo */}
          <div className="border-r border-zinc-300">
            <div className="bg-[#003366] text-white px-4 py-2">
              <span className="text-[11px] font-black tracking-widest uppercase">02 — PERÍODO DA DECLARAÇÃO</span>
            </div>
            <div className="px-4 py-3">
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Mês</label>
                  <div className="mt-1 bg-zinc-50 border border-zinc-200 rounded px-3 py-2 text-sm font-semibold text-zinc-800">
                    {filterMonth ? months.find(m => m.v === filterMonth)?.l?.substring(0, 3) : '---'}
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Ano</label>
                  <div className="mt-1 bg-zinc-50 border border-zinc-200 rounded px-3 py-2 text-sm font-semibold text-zinc-800">
                    {filterYear}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* 03 - NIF boxes */}
          <div>
            <div className="bg-[#003366] text-white px-4 py-2">
              <span className="text-[11px] font-black tracking-widest uppercase">03 — N.º DE IDENTIFICAÇÃO FISCAL</span>
            </div>
            <div className="px-4 py-3">
              <div className="flex gap-1">
                {'000000000'.split('').map((_, i) => (
                  <div key={i} className="flex-1 bg-zinc-50 border border-zinc-300 rounded-sm h-9 flex items-center justify-center text-sm font-mono font-bold text-zinc-700">
                    {'-'}
                  </div>
                ))}
              </div>
              <p className="text-[9px] text-zinc-400 mt-1 text-center">Preencher com o NIF da empresa</p>
            </div>
          </div>
        </div>

        {/* Section 04: Company ID */}
        <div className="border-b border-zinc-200">
          <div className="bg-[#003366] text-white px-6 py-2">
            <span className="text-[11px] font-black tracking-widest uppercase">04 — IDENTIFICAÇÃO DO CONTRIBUINTE</span>
          </div>
          <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Denominação Social / Nome da Empresa</label>
              <div className="mt-1 bg-zinc-50 border border-zinc-200 rounded px-3 py-2 text-sm font-semibold text-zinc-800 min-h-[36px]">
                (Nome da Empresa)
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Endereço / Sede</label>
              <div className="mt-1 bg-zinc-50 border border-zinc-200 rounded px-3 py-2 text-sm font-semibold text-zinc-800 min-h-[36px]">
                (Endereço)
              </div>
            </div>
          </div>
        </div>

        {/* Section 09: Table of retentions */}
        <div>
          <div className="bg-[#003366] text-white px-6 py-2">
            <span className="text-[11px] font-black tracking-widest uppercase">09 — RETENÇÕES NA FONTE A RECEBER</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-zinc-100 border-b-2 border-[#003366]">
                  <th className="px-3 py-2.5 text-center border-r border-zinc-300 font-bold text-zinc-600 uppercase">Nº</th>
                  <th className="px-3 py-2.5 border-r border-zinc-300 font-bold text-zinc-600 uppercase">Cliente</th>
                  <th className="px-3 py-2.5 text-center border-r border-zinc-300 font-bold text-zinc-600 uppercase">Data Doc.</th>
                  <th className="px-3 py-2.5 text-center border-r border-zinc-300 font-bold text-zinc-600 uppercase">Doc. Nº</th>
                  <th className="px-3 py-2.5 text-center border-r border-zinc-300 font-bold text-zinc-600 uppercase">Tipo</th>
                  <th className="px-3 py-2.5 text-center border-r border-zinc-300 font-bold text-zinc-600 uppercase">Taxa (%)</th>
                  <th className="px-3 py-2.5 text-right border-r border-zinc-300 font-bold text-zinc-600 uppercase">Imposto<br/>Base (Kz)</th>
                  <th className="px-3 py-2.5 text-right border-r border-zinc-300 font-bold text-zinc-600 uppercase">Nota de<br/>Crédito (Kz)</th>
                  <th className="px-3 py-2.5 text-right font-bold text-zinc-600 uppercase">IMP. A<br/>RECEBER (Kz)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {retentions.map((r, idx) => (
                  <tr key={idx} className={`hover:bg-blue-50/30 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50/50'}`}>
                    <td className="px-3 py-2 text-center border-r border-zinc-200 font-mono font-bold text-zinc-500">{r.num}</td>
                    <td className="px-3 py-2 border-r border-zinc-200 font-semibold text-zinc-800 max-w-[160px] truncate">{r.cliente}</td>
                    <td className="px-3 py-2 text-center border-r border-zinc-200 text-zinc-600 whitespace-nowrap">{r.dataDoc}</td>
                    <td className="px-3 py-2 text-center border-r border-zinc-200 font-mono font-bold text-[#003366]">{r.docNo}</td>
                    <td className="px-3 py-2 text-center border-r border-zinc-200 text-zinc-600">{r.tipo}</td>
                    <td className="px-3 py-2 text-center border-r border-zinc-200 font-bold text-[#003366]">{r.taxa}%</td>
                    <td className="px-3 py-2 text-right border-r border-zinc-200 font-medium text-zinc-700 whitespace-nowrap">{formatCurrency(r.impostoBase)}</td>
                    <td className="px-3 py-2 text-right border-r border-zinc-200 text-zinc-500 whitespace-nowrap">{formatCurrency(r.notaCredito)}</td>
                    <td className="px-3 py-2 text-right font-bold text-emerald-600 whitespace-nowrap">{formatCurrency(r.impReceber)}</td>
                  </tr>
                ))}
                {retentions.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-zinc-400 italic text-sm">
                      Nenhum documento de venda com retenção encontrado para o período selecionado.
                    </td>
                  </tr>
                )}
              </tbody>
              {retentions.length > 0 && (
                <tfoot className="bg-[#003366] text-white">
                  <tr className="font-bold text-[11px]">
                    <td colSpan={6} className="px-4 py-3 text-right uppercase tracking-widest">TOTAIS:</td>
                    <td className="px-3 py-3 text-right border-r border-blue-400 whitespace-nowrap">{formatCurrency(totalImpostoBase)}</td>
                    <td className="px-3 py-3 text-right border-r border-blue-400 whitespace-nowrap">{formatCurrency(totalNotaCredito)}</td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">{formatCurrency(totalImpReceber)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Total Box */}
        {retentions.length > 0 && (
          <div className="border-t border-zinc-200 px-6 py-4 bg-zinc-50">
            <div className="flex justify-end">
              <div className="border-2 border-[#003366] rounded-lg overflow-hidden">
                <div className="bg-[#003366] text-white px-6 py-2 text-center">
                  <span className="text-[11px] font-black tracking-widest uppercase">Resumo de Valores</span>
                </div>
                <div className="px-6 py-4 grid grid-cols-3 gap-6 text-center">
                  <div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Base Tributável Total</p>
                    <p className="text-base font-black text-zinc-800 mt-1">{formatCurrency(totalImpostoBase)} Kz</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Notas de Crédito</p>
                    <p className="text-base font-black text-zinc-500 mt-1">{formatCurrency(totalNotaCredito)} Kz</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total a Receber</p>
                    <p className="text-lg font-black text-emerald-600 mt-1">{formatCurrency(totalImpReceber)} Kz</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Signature Area */}
        <div className="border-t border-zinc-200 px-6 py-6">
          <div className="grid grid-cols-2 gap-16">
            <div className="text-center">
              <div className="border-t border-zinc-400 pt-2 mt-8">
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Assinatura do Responsável</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-zinc-400 pt-2 mt-8">
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Data e Carimbo</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RetencaoReceberForm;
