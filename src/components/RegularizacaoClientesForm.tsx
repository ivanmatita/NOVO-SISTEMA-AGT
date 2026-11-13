import React, { useState } from 'react';
import { Invoice, Client } from '../types';
import { Printer, Download } from 'lucide-react';

interface RegularizacaoClientesFormProps {
  invoices: Invoice[];
  clients: Client[];
  companyData?: any;
  selectedYear?: string;
  selectedMonth?: string;
}

const RegularizacaoClientesForm: React.FC<RegularizacaoClientesFormProps> = ({
  invoices = [],
  clients = [],
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

  // Filter regularizations: Credit Notes (NC) OR canceled documents of allowed types for the selected month/year locally
  const displayRegularizations = invoices.filter(inv => {
    if (!inv.date) return false;
    const parts = inv.date.split('-');
    if (parts.length < 2) return false;

    // Period check
    const isSamePeriod = localMonth === '14'
      ? parts[0] === ano
      : parts[0] === ano && parts[1] === localMonth;

    if (!isSamePeriod) return false;

    const docType = (inv.document_type || inv.tipo_documento || '').trim().toUpperCase();

    // Check if Credit Note
    const isCreditNote = docType.includes('NOTA DE CRÉDITO') || docType === 'NC';

    // Check if document is canceled
    const isCanceled = inv.is_anulado ||
                       inv.status === 'anulado' ||
                       inv.estado_documento === 'anulado' ||
                       inv.documento_anulado === true;

    // Allowed document types: Faturas, fatura recibo, recibo, nota de credito, nota de debito
    const isAllowedType =
      docType.includes('FATURA') ||
      docType.includes('FACTURA') ||
      docType.includes('RECIBO') ||
      docType === 'FT' ||
      docType === 'FR' ||
      docType === 'RC' ||
      docType === 'NC' ||
      docType === 'ND' ||
      docType.includes('NOTA DE CRÉDITO') ||
      docType.includes('NOTA DE DÉBITO');

    if (!isAllowedType) return false;

    // Regularization is either an active credit note or any canceled document of allowed types
    return isCreditNote || isCanceled;
  });

  // Calculate totals
  let totalIvaLiquidado = 0;

  const rowsData = displayRegularizations.map((inv, idx) => {
    const gross = Number(inv.total || 0);
    const tax = Number(inv.imposto || (inv as any).vat_amount || 0) || (gross - (gross / 1.14));
    const baseVal = gross - tax;

    const docTypeRaw = (inv.document_type || inv.tipo_documento || 'FT').trim().toUpperCase();
    
    // Short type code mapping
    let docTypeCode = 'FT';
    if (docTypeRaw.includes('NOTA DE CRÉDITO') || docTypeRaw === 'NC') docTypeCode = 'NC';
    else if (docTypeRaw.includes('NOTA DE DÉBITO') || docTypeRaw === 'ND') docTypeCode = 'ND';
    else if (docTypeRaw.includes('FATURA RECIBO') || docTypeRaw.includes('FACTURA RECIBO') || docTypeRaw === 'FR') docTypeCode = 'FR';
    else if (docTypeRaw.includes('RECIBO') || docTypeRaw === 'RC') docTypeCode = 'RC';
    else if (docTypeRaw.includes('FATURA') || docTypeRaw.includes('FACTURA') || docTypeRaw === 'FT') docTypeCode = 'FT';

    const clientNif = String(inv.client_nif || '999999999').replace(/[^0-9A-Z]/g, '');

    totalIvaLiquidado += tax;

    // Reference period
    const refPeriod = inv.date.substring(0, 7); // YYYY-MM
    const linhaDestino = '40'; // Line 40 is standard for client regularizations (Modelo 1)

    const isCanceled = inv.is_anulado ||
                       inv.status === 'anulado' ||
                       inv.estado_documento === 'anulado' ||
                       inv.documento_anulado === true;

    // Operation description indicating whether it is a credit note or a canceled document
    const operacao = isCanceled 
      ? `ANULAÇÃO DE ${docTypeCode} (REF. ${inv.invoice_number || inv.numero_documento})` 
      : `REGULARIZAÇÃO DE VENDAS (${docTypeCode})`;

    return {
      index: idx + 1,
      operacao,
      nif: clientNif,
      name: inv.client_name || 'Consumidor Final',
      docType: docTypeCode,
      date: inv.date.split('T')[0],
      docNum: inv.invoice_number || inv.numero_documento || `DOC-${inv.id}`,
      gross,
      baseVal,
      tax,
      refPeriod,
      linhaDestino,
      movId: String(inv.id).substring(0, 8).toUpperCase(),
    };
  });

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = [
      'No ORDEM', 'OPERAÇÕES', 'NIF', 'NOME/FIRMA', 'TIPO DOCUMENTO',
      'DATA DOCUMENTO', 'NUMERO DOCUMENTO', 'VALOR FACTURA', 'VALOR TRIBUTAVEL',
      'IVA LIQUIDADO', 'PERIODO REFERENCIA', 'LINHA DESTINO', 'MovID'
    ];

    const rows = rowsData.map(r => [
      r.index, r.operacao, r.nif, r.name, r.docType,
      r.date, r.docNum, r.gross.toFixed(2), r.baseVal.toFixed(2),
      r.tax.toFixed(2), r.refPeriod, r.linhaDestino, r.movId
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF"
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Anexo_Regularizacoes_Clientes_${ano}_${localMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Top gray header mimicking the image */}
      <div className="bg-[#f1f5f9] border border-zinc-300 px-6 py-3 flex justify-between items-center text-xs font-bold text-zinc-700 select-none no-print">
        <span className="text-zinc-600 font-extrabold uppercase tracking-wide text-xs">Anexo Regularizações Clientes — Modelo 7</span>

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
            ANEXO CLIENTES - MODELO 7
          </h1>
          <p className="text-blue-500 text-xs font-bold uppercase tracking-wider mt-1">
            Regularizações
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
            03 - REGULARIZAÇÕES DE IVA LIQUIDADO
          </div>

          <table className="w-full text-[11.5px] border-collapse font-bold uppercase tracking-tight">
            <thead>
              <tr className="bg-zinc-100 text-zinc-700 border-b border-zinc-400 text-center font-extrabold text-[9.5px]">
                <th className="p-2.5 border-r border-zinc-300">No Ordem</th>
                <th className="p-2.5 border-r border-zinc-300 text-left">Operações</th>
                <th className="p-2.5 border-r border-zinc-300">Número de Identificação Fiscal</th>
                <th className="p-2.5 border-r border-zinc-300 text-left">Nome/Firma</th>
                <th className="p-2.5 border-r border-zinc-300">Tipo Doc</th>
                <th className="p-2.5 border-r border-zinc-300">Data Doc</th>
                <th className="p-2.5 border-r border-zinc-300">Número Doc</th>
                <th className="p-2.5 border-r border-zinc-300 text-right">Valor da Factura ou Doc Equiv.</th>
                <th className="p-2.5 border-r border-zinc-300 text-right">Valor Tributável</th>
                <th className="p-2.5 border-r border-zinc-300 text-right">IVA Liquidado</th>
                <th className="p-2.5 border-r border-zinc-300">Período de Ref.</th>
                <th className="p-2.5 border-r border-zinc-300">Linha Modelo</th>
                <th className="p-2.5">MovID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {rowsData.map((row, index) => (
                <tr key={index} className="hover:bg-zinc-50">
                  <td className="p-2 border-r border-zinc-200 text-center text-zinc-500 font-mono">{row.index}</td>
                  <td className="p-2 border-r border-zinc-200 text-left text-zinc-800">{row.operacao}</td>
                  <td className="p-2 border-r border-zinc-200 text-center font-mono text-zinc-700">{row.nif}</td>
                  <td className="p-2 border-r border-zinc-200 text-left text-zinc-900 max-w-[260px] truncate">{row.name}</td>
                  <td className="p-2 border-r border-zinc-200 text-center font-bold text-red-700">{row.docType}</td>
                  <td className="p-2 border-r border-zinc-200 text-center font-mono text-zinc-500">{row.date}</td>
                  <td className="p-2 border-r border-zinc-200 text-center font-mono text-zinc-800">{row.docNum}</td>
                  <td className="p-2 border-r border-zinc-200 text-right font-mono font-black text-zinc-800">{formatCurrency(row.gross)}</td>
                  <td className="p-2 border-r border-zinc-200 text-right font-mono text-zinc-600">{formatCurrency(row.baseVal)}</td>
                  <td className="p-2 border-r border-zinc-200 text-right font-mono text-blue-600">{formatCurrency(row.tax)}</td>
                  <td className="p-2 border-r border-zinc-200 text-center font-mono text-zinc-500">{row.refPeriod}</td>
                  <td className="p-2 border-r border-zinc-200 text-center font-bold text-[#003366]">{row.linhaDestino}</td>
                  <td className="p-2 text-center font-mono text-[9px] text-zinc-400">{row.movId}</td>
                </tr>
              ))}

              {rowsData.length === 0 && (
                <tr>
                  <td colSpan={13} className="p-10 text-center text-zinc-300 italic font-bold">
                    Nenhuma regularização de clientes no período selecionado
                  </td>
                </tr>
              )}
            </tbody>

            {/* Totals row matching image 2 */}
            <tfoot className="bg-zinc-50 border-t border-zinc-400 font-black text-[#003366]">
              <tr className="border-b border-zinc-400 text-[11px]">
                <td colSpan={9} className="p-3 text-right uppercase tracking-wider font-extrabold pr-4 border-r border-zinc-300">
                  Total IVA Regularizado
                </td>
                <td className="p-3 text-right border-r border-zinc-300 font-mono font-black text-blue-600">
                  {formatCurrency(totalIvaLiquidado)}
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

export default RegularizacaoClientesForm;
