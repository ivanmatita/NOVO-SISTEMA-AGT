import React, { useState, useMemo } from 'react';
import { Printer, Download, ArrowLeft, Filter, CheckCircle2 } from 'lucide-react';
import { Purchase, Supplier } from '../types';

interface ImpostoIndustrialRetencaoAnualProps {
  purchases: Purchase[];
  suppliers?: Supplier[];
  companyData?: any;
  fiscalYear?: string;
  onBack?: () => void;
}

export const ImpostoIndustrialRetencaoAnual: React.FC<ImpostoIndustrialRetencaoAnualProps> = ({
  purchases = [],
  suppliers = [],
  companyData,
  fiscalYear,
  onBack
}) => {
  const currentYear = fiscalYear || new Date().getFullYear().toString();
  const [filterYear, setFilterYear] = useState<string>(currentYear);
  const [filterMonth, setFilterMonth] = useState<string>('');
  const [retentionTaxRate, setRetentionTaxRate] = useState<number>(6.5);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-AO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val || 0);
  };

  // Filtrar compras reais da empresa por ano e mês
  const items = useMemo(() => {
    return (purchases || [])
      .filter((p: any) => {
        if (!p) return false;
        if (p.status === 'cancelled' || p.estado === 'ANULADO') return false;
        const pDate = new Date(p.date || p.data_compra || p.created_at);
        const matchYear = filterYear ? pDate.getFullYear().toString() === filterYear : true;
        const matchMonth = filterMonth ? (pDate.getMonth() + 1).toString() === filterMonth : true;
        return matchYear && matchMonth;
      })
      .map((p: any, idx: number) => {
        const supplier = (suppliers || []).find((s: any) => s.id === (p.supplier_id || p.fornecedor_id));
        const valorTotal = Number(p.total || p.valor_total || 0);
        const valorPago = Number(p.valor_pago ?? valorTotal);
        // Base sujeita a retenção: valor de serviços ou total da fatura
        const valorSujeito = Number(p.valor_incidencia || p.base_incidencia || valorPago);
        const taxa = Number(p.taxa_retencao || retentionTaxRate);
        const impostoRetido = Number(p.retencao_fonte || p.retencao_fonte_total || (valorSujeito * (taxa / 100)));
        const docDate = new Date(p.date || p.data_compra || p.created_at);
        const formattedDate = !isNaN(docDate.getTime()) ? docDate.toLocaleDateString('pt-PT') : '';

        return {
          num: idx + 1,
          nifAO: supplier?.nif || p.fornecedor_nif || '5000000000',
          nif: supplier?.nif || p.fornecedor_nif || '5000000000',
          prestador: supplier?.nome || supplier?.name || p.fornecedor_nome || 'Prestador de Serviços',
          conformidade: p.num_conformidade || '',
          sectorPetrolifero: p.sector_petrolifero ? 'Sim' : '',
          numFactura: p.purchase_number || p.numero_documento || `FAT-${String(idx + 1).padStart(4, '0')}`,
          dataEmissao: formattedDate,
          dataPagamento: formattedDate,
          valorTotal,
          valorPago,
          valorSujeito,
          taxa,
          impostoRetido
        };
      });
  }, [purchases, suppliers, filterYear, filterMonth, retentionTaxRate]);

  const totais = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        acc.valorTotal += item.valorTotal;
        acc.valorPago += item.valorPago;
        acc.valorSujeito += item.valorSujeito;
        acc.impostoRetido += item.impostoRetido;
        return acc;
      },
      { valorTotal: 0, valorPago: 0, valorSujeito: 0, impostoRetido: 0 }
    );
  }, [items]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    const headers = ['Nº', 'NIF AO', 'NIF', 'Prestador', '(a)', '(b)', 'Nº Factura', 'Data Emissão', 'Data Pagamento', 'Valor Total', 'Valor Pago', 'Valor Sujeito', 'Taxa (%)', 'Imposto Retido (Kz)'];
    const rows = items.map(item => [
      item.num,
      `"${item.nifAO}"`,
      `"${item.nif}"`,
      `"${item.prestador}"`,
      `"${item.conformidade}"`,
      `"${item.sectorPetrolifero}"`,
      `"${item.numFactura}"`,
      item.dataEmissao,
      item.dataPagamento,
      item.valorTotal.toFixed(2),
      item.valorPago.toFixed(2),
      item.valorSujeito.toFixed(2),
      item.taxa,
      item.impostoRetido.toFixed(2)
    ]);
    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Retencao_Fonte_Imposto_Industrial_${filterYear}.csv`;
    link.click();
  };

  const companyName = companyData?.nome_empresa || companyData?.name || 'EMPRESA';
  const companyNif = companyData?.nif || '5000000000';
  const companyLogo = companyData?.logo_url || companyData?.logo;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 print:p-0 print:max-w-none">
      {/* Top action toolbar - hidden in print */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-lg border border-zinc-200 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold rounded-md transition-colors"
            >
              <ArrowLeft size={16} /> Voltar à Contabilidade
            </button>
          )}
          <div>
            <h1 className="text-lg font-black text-[#003366] uppercase tracking-tight">
              Retenção na Fonte Anual — Imposto Industrial
            </h1>
            <p className="text-xs text-zinc-500">
              Artigo 67.º do Código do Imposto Industrial • Prestadores de Serviços e Fornecedores
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-zinc-50 px-3 py-1.5 rounded-md border border-zinc-200 text-xs">
            <Filter size={14} className="text-zinc-500" />
            <span className="font-bold text-zinc-600 uppercase text-[10px]">Exercício:</span>
            <select
              value={filterYear}
              onChange={e => setFilterYear(e.target.value)}
              className="bg-transparent font-bold text-[#003366] focus:outline-none cursor-pointer"
            >
              {['2023', '2024', '2025', '2026', '2027'].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-zinc-50 px-3 py-1.5 rounded-md border border-zinc-200 text-xs">
            <span className="font-bold text-zinc-600 uppercase text-[10px]">Mês:</span>
            <select
              value={filterMonth}
              onChange={e => setFilterMonth(e.target.value)}
              className="bg-transparent font-bold text-zinc-700 focus:outline-none cursor-pointer"
            >
              <option value="">Todos os Meses</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={String(m)}>
                  {new Date(2026, m - 1, 1).toLocaleString('pt-PT', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50 text-xs font-bold uppercase tracking-wider rounded-md shadow-xs transition-colors"
          >
            <Download size={16} /> Exportar CSV
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-[#003366] hover:bg-[#002244] text-white text-xs font-bold uppercase tracking-wider rounded-md shadow-sm transition-colors"
          >
            <Printer size={16} /> Imprimir Declaração
          </button>
        </div>
      </div>

      {/* Main Document Body matching media_1789226652532.png */}
      <div className="bg-white border border-zinc-300 shadow-sm p-6 sm:p-8 font-sans print:border-none print:shadow-none print:p-0">
        {/* Header box with 3 sections */}
        <div className="border border-blue-900 grid grid-cols-1 md:grid-cols-3 items-center py-4 px-6 mb-4">
          {/* Left section: System Branding / Clean Area (strictly NO Afrogest logo) */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-blue-50 border border-blue-200 flex items-center justify-center text-[#003366]">
              <CheckCircle2 size={24} className="text-[#003366]" />
            </div>
            <div>
              <span className="text-[11px] font-black text-[#003366] uppercase tracking-wider block">
                REPÚBLICA DE ANGOLA
              </span>
              <span className="text-[9px] text-zinc-500 font-medium uppercase tracking-widest block">
                ADMINISTRAÇÃO GERAL TRIBUTÁRIA
              </span>
            </div>
          </div>

          {/* Center section: Title */}
          <div className="text-center my-2 md:my-0">
            <h2 className="text-base font-bold text-[#003366] tracking-tight">
              Declaração de Retenção na Fonte
            </h2>
            <h1 className="text-lg font-black text-[#003366] uppercase tracking-wider mt-0.5">
              IMPOSTO INDUSTRIAL {filterYear}
            </h1>
          </div>

          {/* Right section: Company Logo & Name */}
          <div className="flex items-center justify-end gap-3">
            <div className="text-right">
              <span className="text-xs font-black text-[#003366] uppercase block line-clamp-1">
                {companyName}
              </span>
              <span className="text-[10px] text-zinc-500 font-mono block">
                NIF: {companyNif}
              </span>
            </div>
            {companyLogo ? (
              <img src={companyLogo} alt="Logo" className="w-12 h-12 object-contain rounded border border-zinc-200 p-0.5" />
            ) : (
              <div className="w-12 h-12 rounded bg-[#003366] text-white flex items-center justify-center text-sm font-black uppercase">
                {companyName.substring(0, 3)}
              </div>
            )}
          </div>
        </div>

        {/* Section 01: Identificação do Contribuinte */}
        <div className="mb-4">
          <div className="bg-[#1a4da6] text-white px-3 py-1 text-xs font-bold uppercase tracking-wider">
            01- IDENTIFICAÇÃO DO CONTRIBUINTE
          </div>
          <div className="border-x border-b border-zinc-300 p-3 bg-zinc-50/50 space-y-1 text-xs">
            <p className="font-bold text-zinc-800">
              <span className="text-zinc-500 font-medium">EMPRESA:</span> {companyName}
            </p>
            <p className="font-bold text-zinc-800 font-mono">
              <span className="text-zinc-500 font-medium font-sans">NIF:</span> {companyNif}
            </p>
          </div>
        </div>

        {/* Section 2: Listagem de Retenção a Fornecedores */}
        <div className="mb-4">
          <div className="bg-[#1a4da6] text-white px-3 py-1 text-xs font-bold uppercase tracking-wider">
            2 - LISTAGEM DE RETENÇÃO A FORNECEDORES
          </div>

          <div className="overflow-x-auto border-x border-b border-zinc-300">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-zinc-100 border-b border-zinc-300 text-zinc-700 font-bold">
                  <th className="p-2 border-r border-zinc-300 text-center w-10" rowSpan={2}>Nº</th>
                  <th className="p-2 border-r border-zinc-300 text-center whitespace-nowrap" rowSpan={2}>NIF AO</th>
                  <th className="p-2 border-r border-zinc-300 text-center whitespace-nowrap" rowSpan={2}>NIF</th>
                  <th className="p-2 border-r border-zinc-300 text-left" rowSpan={2}>Prestador</th>
                  <th className="p-2 border-r border-zinc-300 text-center w-8" rowSpan={2}>(a)</th>
                  <th className="p-2 border-r border-zinc-300 text-center w-8" rowSpan={2}>(b)</th>
                  <th className="p-2 border-r border-zinc-300 text-center bg-zinc-200/80 font-black text-[#003366]" colSpan={6}>
                    Dados da factura
                  </th>
                  <th className="p-2 border-r border-zinc-300 text-center w-16" rowSpan={2}>Taxa</th>
                  <th className="p-2 text-right w-28 font-black text-[#003366]" rowSpan={2}>Imposto Retido</th>
                </tr>
                <tr className="bg-zinc-100 border-b border-zinc-300 text-zinc-600 font-semibold text-[10px]">
                  <th className="p-1.5 border-r border-zinc-300 text-center">Nº</th>
                  <th className="p-1.5 border-r border-zinc-300 text-center whitespace-nowrap">Data Emissão</th>
                  <th className="p-1.5 border-r border-zinc-300 text-center whitespace-nowrap">Data Pagamento</th>
                  <th className="p-1.5 border-r border-zinc-300 text-right whitespace-nowrap">Valor Total</th>
                  <th className="p-1.5 border-r border-zinc-300 text-right whitespace-nowrap">Valor Pago</th>
                  <th className="p-1.5 border-r border-zinc-300 text-right whitespace-nowrap">Valor Sujeito</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="p-8 text-center text-zinc-400 italic text-xs">
                      Não existem registos de retenção na fonte a fornecedores para o exercício de {filterYear}.
                    </td>
                  </tr>
                ) : (
                  items.map((item, index) => (
                    <tr
                      key={index}
                      className={`border-b border-zinc-200 hover:bg-blue-50/40 transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-zinc-50/40'
                      }`}
                    >
                      <td className="p-2 border-r border-zinc-200 text-center font-mono text-zinc-500 font-bold">
                        {item.num}
                      </td>
                      <td className="p-2 border-r border-zinc-200 text-center font-mono text-xs text-zinc-600">
                        {item.nifAO}
                      </td>
                      <td className="p-2 border-r border-zinc-200 text-center font-mono text-xs text-zinc-600">
                        {item.nif}
                      </td>
                      <td className="p-2 border-r border-zinc-200 font-semibold text-zinc-800">
                        {item.prestador}
                      </td>
                      <td className="p-2 border-r border-zinc-200 text-center text-zinc-500">
                        {item.conformidade || '-'}
                      </td>
                      <td className="p-2 border-r border-zinc-200 text-center text-zinc-500">
                        {item.sectorPetrolifero || '-'}
                      </td>
                      <td className="p-2 border-r border-zinc-200 text-center font-mono font-bold text-[#003366]">
                        {item.numFactura}
                      </td>
                      <td className="p-2 border-r border-zinc-200 text-center text-zinc-600 whitespace-nowrap">
                        {item.dataEmissao}
                      </td>
                      <td className="p-2 border-r border-zinc-200 text-center text-zinc-600 whitespace-nowrap">
                        {item.dataPagamento}
                      </td>
                      <td className="p-2 border-r border-zinc-200 text-right font-mono text-zinc-700 whitespace-nowrap">
                        {formatCurrency(item.valorTotal)}
                      </td>
                      <td className="p-2 border-r border-zinc-200 text-right font-mono text-zinc-700 whitespace-nowrap">
                        {formatCurrency(item.valorPago)}
                      </td>
                      <td className="p-2 border-r border-zinc-200 text-right font-mono font-bold text-zinc-800 whitespace-nowrap">
                        {formatCurrency(item.valorSujeito)}
                      </td>
                      <td className="p-2 border-r border-zinc-200 text-center font-bold text-[#003366]">
                        {item.taxa}%
                      </td>
                      <td className="p-2 text-right font-mono font-black text-rose-700 whitespace-nowrap">
                        {formatCurrency(item.impostoRetido)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="bg-zinc-100 border-t-2 border-blue-900 font-bold text-zinc-800">
                  <td colSpan={9} className="p-3 text-right uppercase tracking-wider font-black text-[#003366]">
                    Totais Acumulados
                  </td>
                  <td className="p-3 text-right font-mono font-black border-r border-zinc-300 whitespace-nowrap">
                    {formatCurrency(totais.valorTotal)}
                  </td>
                  <td className="p-3 text-right font-mono font-black border-r border-zinc-300 whitespace-nowrap">
                    {formatCurrency(totais.valorPago)}
                  </td>
                  <td className="p-3 text-right font-mono font-black border-r border-zinc-300 whitespace-nowrap text-[#003366]">
                    {formatCurrency(totais.valorSujeito)}
                  </td>
                  <td className="p-3 text-center border-r border-zinc-300">
                    -
                  </td>
                  <td className="p-3 text-right font-mono font-black text-rose-700 whitespace-nowrap">
                    {formatCurrency(totais.impostoRetido)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Legend notes matching image bottom */}
        <div className="pt-2 pb-4 text-[10px] text-zinc-500 space-y-1">
          <p><strong className="text-zinc-700">(a)</strong> Nº da Declaração de Conformidade</p>
          <p><strong className="text-zinc-700">(b)</strong> Sector Petrolífero</p>
        </div>

        {/* Signatures section */}
        <div className="mt-8 pt-6 border-t border-zinc-300 grid grid-cols-2 gap-12 text-center text-xs">
          <div>
            <div className="border-t border-zinc-400 w-3/4 mx-auto pt-2">
              <p className="font-bold text-zinc-700 uppercase">O Técnico de Contas / Contabilista Certificado</p>
              <p className="text-[10px] text-zinc-400">Nº de Ordem / Assinatura</p>
            </div>
          </div>
          <div>
            <div className="border-t border-zinc-400 w-3/4 mx-auto pt-2">
              <p className="font-bold text-zinc-700 uppercase">A Administração / Gerência</p>
              <p className="text-[10px] text-zinc-400">Assinatura e Carimbo</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
