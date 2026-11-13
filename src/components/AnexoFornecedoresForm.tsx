import React, { useState } from 'react';
import { Purchase, Supplier } from '../types';
import { Printer, Download, FileSpreadsheet } from 'lucide-react';

interface AnexoFornecedoresFormProps {
  purchases: Purchase[];
  suppliers: Supplier[];
  companyData?: any;
  selectedYear?: string;
  selectedMonth?: string;
}

const AnexoFornecedoresForm: React.FC<AnexoFornecedoresFormProps> = ({
  purchases = [],
  suppliers = [],
  companyData,
  selectedYear,
  selectedMonth,
}) => {
  const ano = selectedYear || '2026';
  const mes = selectedMonth || '14';
  const nif = companyData?.nif || '5000509329';
  const companyName = companyData?.name || companyData?.nome_empresa || 'COGE-FOCUS - PRESTAÇÃO DE SERVIÇOS, LDA';

  const [localMonth, setLocalMonth] = useState(mes);

  const monthNames = [
    'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
    'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
  ];

  const getMonthName = (m: string) => {
    const num = Number(m);
    if (num >= 1 && num <= 12) return monthNames[num - 1];
    if (num === 14) return 'MÊS 14 (AJUSTE)';
    return 'MÊS COMPLEMENTAR';
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  };

  // Filter purchases for the selected month/year locally
  const displayPurchases = purchases.filter(p => {
    if (!p.date) return false;
    const parts = p.date.split('-');
    if (parts.length < 2) return false;
    // If localMonth is 14 (annual adjustments), we show all purchases of that year
    if (localMonth === '14') {
      return parts[0] === ano;
    }
    return parts[0] === ano && parts[1] === localMonth;
  });

  // Calculate totals
  let totalFactura = 0;
  let totalTributavel = 0;
  let totalIvaSuportado = 0;
  let totalIvaDedutivel = 0;
  let totalIvaCativo = 0;

  const rowsData = displayPurchases.map((p, idx) => {
    const gross = Number(p.total || 0);
    const items = Array.isArray(p.items) ? p.items : [];

    let baseVal = 0;
    let vatVal = 0;
    if (items.length > 0) {
      baseVal = items.reduce((s, item) => s + (Number(item.quantity || 0) * Number(item.unit_price || 0)), 0);
      // Ensure baseVal doesn't exceed gross
      if (baseVal > gross) baseVal = gross / 1.14;
      vatVal = gross - baseVal;
    } else {
      baseVal = gross / 1.14;
      vatVal = gross - baseVal;
    }

    const docType = (p.document_type || p.tipo_documento || 'Fatura').trim().toUpperCase();
    const docTypeCode = docType.includes('SIMPLIFICADA') || docType === 'FS' ? 'FS'
      : docType.includes('RECIBO') || docType === 'RC' || docType === 'FR' ? 'RC'
      : 'FT';

    const supNif = String((p as any).supplier_nif || (p as any).nif || '999999999').replace(/[^0-9A-Z]/g, '');
    const inAngola = supNif.length === 9 || supNif.startsWith('5') ? 'SIM' : 'NÃO';

    const hasRetention = Number((p as any).retencao_fonte || (p as any).retencao_fonte_total || 0);
    const cativoVal = hasRetention > 0 ? hasRetention : 0;
    const cativoPct = cativoVal > 0 ? Math.round((cativoVal / vatVal) * 100) : 0;

    // Deductible VAT
    const dedutivelPct = 100; // Standard 100% deductible
    const dedutivelVal = vatVal;

    // Accumulate totals
    totalFactura += gross;
    totalTributavel += baseVal;
    totalIvaSuportado += vatVal;
    totalIvaDedutivel += dedutivelVal;
    totalIvaCativo += cativoVal;

    // Typology and target line
    const isService = docType.includes('SERVIÇO') || items.some(i => String(i.description || '').toUpperCase().includes('SERVIÇO'));
    const tipologia = isService ? 'SERVIÇOS' : 'OUTROS BENS';
    const campoDestino = isService ? '22' : '21'; // Line 22 for services, Line 21 for equipment/goods in Modelo 1

    return {
      index: idx + 1,
      inAngola,
      nif: supNif,
      name: p.supplier_name || 'Fornecedor Desconhecido',
      docType: docTypeCode,
      date: p.date,
      docNum: p.purchase_number || `COMP-${p.id}`,
      gross,
      baseVal,
      vatVal,
      dedutivelPct,
      dedutivelVal,
      cativoPct,
      cativoVal,
      tipologia,
      campoDestino,
      movId: String(p.id).substring(0, 8).toUpperCase(),
    };
  });

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = [
      'No ORDEM', 'NIF em Angola?', 'NIF', 'NOME/FIRMA', 'TIPO DOCUMENTO',
      'DATA DOCUMENTO', 'NUMERO DOCUMENTO', 'VALOR FACTURA', 'VALOR TRIBUTAVEL',
      'IVA SUPORTADO', 'IVA DEDUTIVEL %', 'IVA DEDUTIVEL VALOR', 'IVA CATIVO %',
      'IVA CATIVO VALOR', 'TIPOLOGIA', 'CAMPO DESTINO', 'MovID'
    ];

    const rows = rowsData.map(r => [
      r.index, r.inAngola, r.nif, r.name, r.docType,
      r.date, r.docNum, r.gross.toFixed(2), r.baseVal.toFixed(2),
      r.vatVal.toFixed(2), r.dedutivelPct, r.dedutivelVal.toFixed(2),
      r.cativoPct, r.cativoVal.toFixed(2), r.tipologia, r.campoDestino, r.movId
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF"
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Anexo_Fornecedores_${ano}_${localMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Top gray header mimicking the image */}
      <div className="bg-[#f1f5f9] border border-zinc-300 px-6 py-3 flex justify-between items-center text-xs font-bold text-zinc-700 select-none no-print">
        <span className="text-zinc-600 font-extrabold uppercase tracking-wide text-xs">Anexo Fornecedores — Regime Exclusão</span>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 uppercase tracking-widest text-[10px]">Período Contabilístico:</span>
            <select
              value={localMonth}
              onChange={e => setLocalMonth(e.target.value)}
              className="border border-zinc-300 bg-white px-3 py-1 text-xs font-black uppercase text-[#003366] focus:outline-none focus:border-[#003366] cursor-pointer"
            >
              {monthNames.map((name, i) => (
                <option key={i} value={String(i + 1).padStart(2, '0')}>
                  {name}
                </option>
              ))}
              <option value="14">MÊS 14 (AJUSTE)</option>
            </select>
          </div>

          {/* Green circular buttons matching image */}
          <div className="flex gap-2.5">
            <button
              onClick={handlePrint}
              title="Imprimir Documento"
              className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 text-white flex items-center justify-center hover:shadow-lg transition-all border border-green-700/30 hover:scale-105 active:scale-95 animate-none"
            >
              <Printer size={15} />
            </button>
            <button
              onClick={handleExportCSV}
              title="Exportar para Excel"
              className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-600 to-green-700 text-white flex items-center justify-center hover:shadow-lg transition-all border border-green-800/30 hover:scale-105 active:scale-95 font-black text-[10px] tracking-tighter"
            >
              XLSX
            </button>
            <button
              title="Ferramentas de Ajuste"
              className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-600 to-zinc-700 text-white flex items-center justify-center hover:shadow-lg transition-all border border-zinc-800/30 hover:scale-105 active:scale-95 font-bold text-xs"
            >
              ⚙️
            </button>
          </div>
        </div>
      </div>

      {/* Main printable form box with increased readability */}
      <div className="bg-white p-8 border border-zinc-400 max-w-[1550px] w-full mx-auto text-xs font-sans leading-relaxed shadow-md printable-area">

        {/* Title */}
        <div className="border border-zinc-400 mb-4 p-4 text-center bg-zinc-50">
          <h1 className="text-[#003366] text-xl font-black uppercase tracking-widest leading-none">
            ANEXO DE FORNECEDORES
          </h1>
          <p className="text-blue-500 text-xs font-bold uppercase tracking-wider mt-1">
            Aquisição de Bens e Serviços
          </p>
        </div>

        {/* Section 01: Period & NIF */}
        <div className="grid grid-cols-12 border border-zinc-400 mb-4 bg-zinc-50">
          {/* Section title left */}
          <div className="col-span-7 border-r border-zinc-400 flex flex-col justify-between">
            <div className="bg-[#003366] text-white font-extrabold px-3 py-1.5 uppercase tracking-wide text-xs border-b border-zinc-400">
              01 - PERÍODO DE TRIBUTAÇÃO E NÚMEROS DE IDENTIFICAÇÃO FISCAL
            </div>
            <div className="p-3 flex gap-6 items-center">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-zinc-600 uppercase text-xs">Ano:</span>
                <div className="flex border border-zinc-400 bg-white">
                  {String(ano).split('').map((char, idx) => (
                    <div key={idx} className="w-6 h-7 flex items-center justify-center border-r border-zinc-400 last:border-r-0 font-mono font-bold text-sm text-zinc-900 bg-white">
                      {char}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="font-bold text-zinc-600 uppercase text-xs">Mês:</span>
                <div className="flex border border-zinc-400 bg-white">
                  {String(localMonth).split('').map((char, idx) => (
                    <div key={idx} className="w-6 h-7 flex items-center justify-center border-r border-zinc-400 last:border-r-0 font-mono font-bold text-sm text-zinc-900 bg-white">
                      {char}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex-1 flex flex-col items-center border-l border-zinc-200 pl-4">
                <span className="font-black text-zinc-900 text-xs uppercase border-b border-zinc-800 w-full text-center pb-0.5">
                  {getMonthName(localMonth)}
                </span>
                <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider mt-0.5">
                  (Mês por extenso)
                </span>
              </div>
            </div>
          </div>

          {/* NIF Block right */}
          <div className="col-span-5 flex flex-col justify-between">
            <div className="bg-[#003366] text-white font-extrabold px-3 py-1.5 uppercase tracking-wide text-xs border-b border-zinc-400">
              NIF
            </div>
            <div className="p-3 flex justify-center items-center">
              <div className="flex border border-zinc-400 bg-white">
                {Array.from({ length: 14 }).map((_, idx) => {
                  const padded = String(nif).replace(/[^0-9A-Z]/g, '').padStart(14, ' ');
                  return (
                    <div key={idx} className="w-5.5 h-7 flex items-center justify-center border-r border-zinc-400 last:border-r-0 font-mono font-black text-sm text-zinc-800 bg-white">
                      {padded[idx] === ' ' ? '' : padded[idx]}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Section 02: Taxpayer Name */}
        <div className="border border-zinc-400 mb-4 bg-zinc-50">
          <div className="bg-[#003366] text-white font-extrabold px-3 py-1.5 uppercase tracking-wide text-xs border-b border-zinc-400">
            02 - NOME, DESIGN/SOCIAL DO SUJEITO PASSIVO DO REPRESENTANTE LEGAL
          </div>
          <div className="p-3 flex items-center gap-3">
            <span className="font-bold text-zinc-500 uppercase text-xs shrink-0">Nome/Designação:</span>
            <div className="flex-1 border-b border-zinc-400 pb-0.5 font-black uppercase text-zinc-900 text-sm">
              {companyName}
            </div>
          </div>
        </div>

        {/* Section 03: Table */}
        <div className="border border-zinc-400 overflow-x-auto">
          <div className="bg-[#003366] text-white font-extrabold px-3 py-2 uppercase tracking-wide text-xs border-b border-zinc-400">
            03 - OPERAÇÕES EFECTUADAS COM FORNECEDORES SUJEITAS A IVA
          </div>

          <table className="w-full text-[11.5px] border-collapse font-bold uppercase tracking-tight">
            <thead>
              <tr className="bg-zinc-100 text-zinc-700 border-b border-zinc-400 text-center font-extrabold text-[9.5px]">
                <th className="p-2 border-r border-zinc-300" rowSpan={2}>No Ordem</th>
                <th className="p-2 border-r border-zinc-300" rowSpan={2}>NIF em Angola?</th>
                <th className="p-2 border-r border-zinc-300">Número de Identificação Fiscal</th>
                <th className="p-2 border-r border-zinc-300 text-left" rowSpan={2}>Nome/Firma</th>
                <th className="p-2 border-r border-zinc-300" rowSpan={2}>Tipo Doc</th>
                <th className="p-2 border-r border-zinc-300" rowSpan={2}>Data Doc</th>
                <th className="p-2 border-r border-zinc-300" rowSpan={2}>Número Doc</th>
                <th className="p-2 border-r border-zinc-300 text-right" rowSpan={2}>Valor da Factura</th>
                <th className="p-2 border-r border-zinc-300 text-right" rowSpan={2}>Valor Tributável</th>
                <th className="p-2 border-r border-zinc-300 text-right" rowSpan={2}>IVA Suportado</th>
                <th className="p-1.5 border-r border-zinc-300" colSpan={2}>IVA Dedutível</th>
                <th className="p-1.5 border-r border-zinc-300" colSpan={2}>IVA Cativo</th>
                <th className="p-2 border-r border-zinc-300" rowSpan={2}>Tipologia</th>
                <th className="p-2 border-r border-zinc-300" rowSpan={2}>Destino</th>
                <th className="p-2" rowSpan={2}>MovID</th>
              </tr>
              <tr className="bg-zinc-50 text-zinc-600 border-b border-zinc-400 text-center font-bold text-[9px]">
                <th className="p-1.5 border-r border-zinc-300">%</th>
                <th className="p-1.5 border-r border-zinc-300 text-right">Valor</th>
                <th className="p-1.5 border-r border-zinc-300">%</th>
                <th className="p-1.5 border-r border-zinc-300 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {rowsData.map((row, index) => (
                <tr key={index} className="hover:bg-zinc-50">
                  <td className="p-2 border-r border-zinc-200 text-center text-zinc-500 font-mono">{row.index}</td>
                  <td className="p-2 border-r border-zinc-200 text-center text-[#003366]">{row.inAngola}</td>
                  <td className="p-2 border-r border-zinc-200 text-center font-mono text-zinc-700">{row.nif}</td>
                  <td className="p-2 border-r border-zinc-200 text-left text-zinc-900 max-w-[260px] truncate">{row.name}</td>
                  <td className="p-2 border-r border-zinc-200 text-center font-bold text-[#003366]">{row.docType}</td>
                  <td className="p-2 border-r border-zinc-200 text-center font-mono text-zinc-500">{row.date}</td>
                  <td className="p-2 border-r border-zinc-200 text-center font-mono text-zinc-800">{row.docNum}</td>
                  <td className="p-2 border-r border-zinc-200 text-right font-mono font-black text-zinc-800">{formatCurrency(row.gross)}</td>
                  <td className="p-2 border-r border-zinc-200 text-right font-mono text-zinc-600">{formatCurrency(row.baseVal)}</td>
                  <td className="p-2 border-r border-zinc-200 text-right font-mono text-blue-600">{formatCurrency(row.vatVal)}</td>

                  {/* IVA Dedutivel */}
                  <td className="p-1.5 border-r border-zinc-200 text-center text-zinc-500 font-mono">{row.dedutivelPct}%</td>
                  <td className="p-1.5 border-r border-zinc-200 text-right font-mono text-blue-600">{formatCurrency(row.dedutivelVal)}</td>

                  {/* IVA Cativo */}
                  <td className="p-1.5 border-r border-zinc-200 text-center text-zinc-500 font-mono">{row.cativoPct > 0 ? `${row.cativoPct}%` : '0%'}</td>
                  <td className="p-1.5 border-r border-zinc-200 text-right font-mono text-amber-700">{formatCurrency(row.cativoVal)}</td>

                  <td className="p-2 border-r border-zinc-200 text-center text-zinc-500 text-[9px]">{row.tipologia}</td>
                  <td className="p-2 border-r border-zinc-200 text-center font-bold text-[#003366]">{row.campoDestino}</td>
                  <td className="p-2 text-center font-mono text-[9px] text-zinc-400">{row.movId}</td>
                </tr>
              ))}

              {rowsData.length === 0 && (
                <tr>
                  <td colSpan={17} className="p-10 text-center text-zinc-300 italic font-bold">
                    Nenhuma operação com fornecedores no período selecionado
                  </td>
                </tr>
              )}
            </tbody>

            {/* Totals row mimicking image */}
            <tfoot className="bg-zinc-50 border-t border-zinc-400 font-black text-[#003366]">
              <tr className="border-b border-zinc-400 text-[11px]">
                <td colSpan={7} className="p-3 text-right uppercase tracking-wider font-extrabold pr-4 border-r border-zinc-300">
                  TOTAL
                </td>
                <td className="p-3 text-right border-r border-zinc-300 font-mono font-black text-zinc-900">
                  {formatCurrency(totalFactura)}
                </td>
                <td className="p-3 text-right border-r border-zinc-300 font-mono font-black">
                  {formatCurrency(totalTributavel)}
                </td>
                <td className="p-3 text-right border-r border-zinc-300 font-mono font-black text-blue-600">
                  {formatCurrency(totalIvaSuportado)}
                </td>
                <td className="p-1.5 border-r border-zinc-200"></td>
                <td className="p-3 text-right border-r border-zinc-300 font-mono font-black text-blue-600">
                  {formatCurrency(totalIvaDedutivel)}
                </td>
                <td className="p-1.5 border-r border-zinc-200"></td>
                <td className="p-3 text-right border-r border-zinc-300 font-mono font-black text-amber-700">
                  {formatCurrency(totalIvaCativo)}
                </td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AnexoFornecedoresForm;
