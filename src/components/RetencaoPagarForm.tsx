import React, { useState } from 'react';
import { Purchase, Supplier } from '../types';
import { FileText, Download, Printer, Filter, ChevronDown } from 'lucide-react';

const RetencaoPagarForm = ({ purchases, suppliers }: { purchases: Purchase[], suppliers: Supplier[] }) => {
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  };

  const retentionRate = 0.065;

  const retentions = (purchases || [])
    .filter(p => p.status !== 'cancelled')
    .filter(p => {
      const d = new Date(p.date);
      const matchMonth = filterMonth ? (d.getMonth() + 1) === parseInt(filterMonth) : true;
      const matchYear = filterYear ? d.getFullYear() === parseInt(filterYear) : true;
      return matchMonth && matchYear;
    })
    .map((p, idx) => {
      const supplier = (suppliers || []).find(s => s.id === p.supplier_id);
      const valorTotal = p.total || 0;
      const valorPago = valorTotal; // assume paid
      const valorSujeito = valorPago;
      const impostoRetido = Number((p as any).retencao_fonte_total || (p as any).retencao_fonte || (valorSujeito * retentionRate));
      const taxa = 6.5;
      const docDate = new Date(p.date);

      return {
        num: idx + 1,
        nifAO: supplier?.nif || 'N/A',
        nif: supplier?.nif || 'N/A',
        prestador: supplier?.name || 'Fornecedor Desconhecido',
        tipoA: 'S', // serviços
        tipoB: 'N', // não residente
        docNo: p.purchase_number || `COMP-${p.id ? String(p.id).substring(0, 8) : ''}`,
        dataEmissao: docDate.toLocaleDateString('pt-PT'),
        dataPagamento: docDate.toLocaleDateString('pt-PT'),
        valorTotal,
        valorPago,
        valorSujeito,
        taxa,
        impostoRetido,
      };
    });

  const totalValorTotal = retentions.reduce((s, r) => s + r.valorTotal, 0);
  const totalValorPago = retentions.reduce((s, r) => s + r.valorPago, 0);
  const totalValorSujeito = retentions.reduce((s, r) => s + r.valorSujeito, 0);
  const totalImpostoRetido = retentions.reduce((s, r) => s + r.impostoRetido, 0);

  const months = [
    { v: '1', l: 'Janeiro' }, { v: '2', l: 'Fevereiro' }, { v: '3', l: 'Março' },
    { v: '4', l: 'Abril' }, { v: '5', l: 'Maio' }, { v: '6', l: 'Junho' },
    { v: '7', l: 'Julho' }, { v: '8', l: 'Agosto' }, { v: '9', l: 'Setembro' },
    { v: '10', l: 'Outubro' }, { v: '11', l: 'Novembro' }, { v: '12', l: 'Dezembro' },
  ];
  const years = ['2023', '2024', '2025', '2026', '2027'];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-zinc-800 flex items-center gap-3">
            <FileText size={24} className="text-[#003366]" />
            Retenção na Fonte — Fornecedores (a Pagar)
          </h2>
          <p className="text-zinc-500 text-sm">Declaração de Retenção na Fonte • Imposto Industrial • Taxa: 6,5%</p>
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
      <div className="flex items-center gap-4 bg-white border border-zinc-200 p-4 rounded-lg shadow-sm">
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
          <p className="text-xl font-black text-zinc-800">{formatCurrency(totalValorSujeito)} Kz</p>
        </div>
        <div className="bg-white border border-zinc-200 p-5 rounded-lg shadow-sm">
          <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Total Imposto Retido (6,5%)</h3>
          <p className="text-xl font-black text-red-600">{formatCurrency(totalImpostoRetido)} Kz</p>
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
          <h2 className="text-lg font-black tracking-tight uppercase mt-1">DECLARAÇÃO DE RETENÇÃO NA FONTE — IMPOSTO INDUSTRIAL</h2>
          <p className="text-[11px] opacity-70 mt-0.5">Artigo 67.º do Código do Imposto Industrial</p>
        </div>

        {/* Section 01: Contributor Identification */}
        <div className="border-b border-zinc-200">
          <div className="bg-[#003366] text-white px-6 py-2">
            <span className="text-[11px] font-black tracking-widest uppercase">01 — IDENTIFICAÇÃO DO CONTRIBUINTE (Retentor)</span>
          </div>
          <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Denominação Social / Nome da Empresa</label>
              <div className="mt-1 bg-zinc-50 border border-zinc-200 rounded px-3 py-2 text-sm font-semibold text-zinc-800 min-h-[36px]">
                (Nome da Empresa)
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Número de Identificação Fiscal (NIF)</label>
              <div className="mt-1 bg-zinc-50 border border-zinc-200 rounded px-3 py-2 text-sm font-semibold text-zinc-800 font-mono min-h-[36px]">
                (NIF)
              </div>
            </div>
          </div>
        </div>

        {/* Section 02: Listing of Retentions */}
        <div>
          <div className="bg-[#003366] text-white px-6 py-2">
            <span className="text-[11px] font-black tracking-widest uppercase">02 — LISTAGEM DE RETENÇÃO A FORNECEDORES</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-zinc-100 border-b-2 border-[#003366]">
                  <th className="px-2 py-2 text-center border-r border-zinc-300 font-bold text-zinc-600 uppercase" rowSpan={2}>Nº</th>
                  <th className="px-2 py-2 text-center border-r border-zinc-300 font-bold text-zinc-600 uppercase" rowSpan={2}>NIF AO</th>
                  <th className="px-2 py-2 text-center border-r border-zinc-300 font-bold text-zinc-600 uppercase" rowSpan={2}>NIF</th>
                  <th className="px-2 py-2 text-center border-r border-zinc-300 font-bold text-zinc-600 uppercase" rowSpan={2}>Prestador de<br/>Serviços</th>
                  <th className="px-2 py-2 text-center border-r border-zinc-300 font-bold text-zinc-600 uppercase" rowSpan={2}>(a)</th>
                  <th className="px-2 py-2 text-center border-r border-zinc-300 font-bold text-zinc-600 uppercase" rowSpan={2}>(b)</th>
                  <th className="px-2 py-2 text-center border-r border-zinc-300 font-bold text-zinc-600 uppercase bg-zinc-200" colSpan={6}>DADOS DA FACTURA</th>
                  <th className="px-2 py-2 text-center border-r border-zinc-300 font-bold text-zinc-600 uppercase" rowSpan={2}>Taxa<br/>(%)</th>
                  <th className="px-2 py-2 text-center font-bold text-zinc-600 uppercase" rowSpan={2}>Imposto<br/>Retido (Kz)</th>
                </tr>
                <tr className="bg-zinc-100 border-b border-zinc-300">
                  <th className="px-2 py-1.5 text-center border-r border-zinc-300 font-bold text-zinc-500 uppercase">Nº</th>
                  <th className="px-2 py-1.5 text-center border-r border-zinc-300 font-bold text-zinc-500 uppercase">Data<br/>Emissão</th>
                  <th className="px-2 py-1.5 text-center border-r border-zinc-300 font-bold text-zinc-500 uppercase">Data<br/>Pagamento</th>
                  <th className="px-2 py-1.5 text-center border-r border-zinc-300 font-bold text-zinc-500 uppercase">Valor<br/>Total (Kz)</th>
                  <th className="px-2 py-1.5 text-center border-r border-zinc-300 font-bold text-zinc-500 uppercase">Valor<br/>Pago (Kz)</th>
                  <th className="px-2 py-1.5 text-center border-r border-zinc-300 font-bold text-zinc-500 uppercase">Valor Sujeito<br/>a Ret. (Kz)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {retentions.map((r, idx) => (
                  <tr key={idx} className={`hover:bg-blue-50/30 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-zinc-50/50'}`}>
                    <td className="px-2 py-2 text-center border-r border-zinc-200 font-mono font-bold text-zinc-500">{r.num}</td>
                    <td className="px-2 py-2 text-center border-r border-zinc-200 font-mono text-xs text-zinc-600">{r.nifAO}</td>
                    <td className="px-2 py-2 text-center border-r border-zinc-200 font-mono text-xs text-zinc-600">{r.nif}</td>
                    <td className="px-2 py-2 border-r border-zinc-200 font-semibold text-zinc-800 max-w-[160px] truncate">{r.prestador}</td>
                    <td className="px-2 py-2 text-center border-r border-zinc-200 text-zinc-500">{r.tipoA}</td>
                    <td className="px-2 py-2 text-center border-r border-zinc-200 text-zinc-500">{r.tipoB}</td>
                    <td className="px-2 py-2 text-center border-r border-zinc-200 font-mono text-[#003366] font-bold">{r.docNo}</td>
                    <td className="px-2 py-2 text-center border-r border-zinc-200 text-zinc-600 whitespace-nowrap">{r.dataEmissao}</td>
                    <td className="px-2 py-2 text-center border-r border-zinc-200 text-zinc-600 whitespace-nowrap">{r.dataPagamento}</td>
                    <td className="px-2 py-2 text-right border-r border-zinc-200 font-medium text-zinc-700 whitespace-nowrap">{formatCurrency(r.valorTotal)}</td>
                    <td className="px-2 py-2 text-right border-r border-zinc-200 font-medium text-zinc-700 whitespace-nowrap">{formatCurrency(r.valorPago)}</td>
                    <td className="px-2 py-2 text-right border-r border-zinc-200 font-semibold text-zinc-800 whitespace-nowrap">{formatCurrency(r.valorSujeito)}</td>
                    <td className="px-2 py-2 text-center border-r border-zinc-200 font-bold text-[#003366]">{r.taxa}%</td>
                    <td className="px-2 py-2 text-right font-bold text-red-600 whitespace-nowrap">{formatCurrency(r.impostoRetido)}</td>
                  </tr>
                ))}
                {retentions.length === 0 && (
                  <tr>
                    <td colSpan={14} className="px-4 py-10 text-center text-zinc-400 italic text-sm">
                      Nenhum documento de compra com retenção encontrado para o período selecionado.
                    </td>
                  </tr>
                )}
              </tbody>
              {retentions.length > 0 && (
                <tfoot className="bg-[#003366] text-white">
                  <tr className="font-bold text-[11px]">
                    <td colSpan={9} className="px-3 py-3 text-right uppercase tracking-widest">TOTAIS ACUMULADOS:</td>
                    <td className="px-2 py-3 text-right border-r border-blue-400 whitespace-nowrap">{formatCurrency(totalValorTotal)}</td>
                    <td className="px-2 py-3 text-right border-r border-blue-400 whitespace-nowrap">{formatCurrency(totalValorPago)}</td>
                    <td className="px-2 py-3 text-right border-r border-blue-400 whitespace-nowrap">{formatCurrency(totalValorSujeito)}</td>
                    <td className="px-2 py-3 text-center border-r border-blue-400">6,5%</td>
                    <td className="px-2 py-3 text-right whitespace-nowrap">{formatCurrency(totalImpostoRetido)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Footer Notes */}
        <div className="border-t border-zinc-200 px-6 py-4 bg-zinc-50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[10px] text-zinc-500">
            <div>
              <p className="font-black text-zinc-700 mb-2 uppercase tracking-widest text-[10px]">Notas / Alíneas:</p>
              <p><span className="font-bold text-zinc-700">(a) Tipo de Serviço:</span> S = Serviços Prestados | T = Trabalho Dependente</p>
              <p><span className="font-bold text-zinc-700">(b) Residência:</span> N = Não Residente | R = Residente</p>
            </div>
            <div>
              <p className="font-black text-zinc-700 mb-2 uppercase tracking-widest text-[10px]">Prazo de Entrega:</p>
              <p>As retenções na fonte devem ser entregues à AGT até ao último dia útil do mês seguinte àquele em que foram efectuadas.</p>
            </div>
          </div>
        </div>

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

export default RetencaoPagarForm;
