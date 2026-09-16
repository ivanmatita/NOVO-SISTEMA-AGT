/**
 * StockSalesReport.tsx
 * Relatorio de Stock e Vendas Classico
 * Layout identico a imagem de referencia media_1789589254724.png:
 * - Botoes circulares 3D verdes no topo (D, S, Armazem, A, XLSX, JAN, Imprimir, Alertas)
 * - Box "Filtros" arredondada no canto superior esquerdo
 * - "Listagem emitida em DD-MM-AAAA" no canto superior direito
 * - Tabela "Produtos Mais Vendidos" no topo direito
 * - Nome do Operador / Empresa em destaque preto
 * - Tabela "Produtos Vendidos" com totais
 * - Tabela "Produtos Devolvidos" com totais
 * - Tabela "Movimentos" (#, Data, Ref Interna, Empresa, Documento, Descricao, Entrada, Saida, unit, V.Unit, Sub.Total, Imposto)
 * - Linha de Total e "Fim de Listagem"
 */

import React, { useState, useMemo } from 'react';
import { Home, Printer, FileSpreadsheet, Bell, RefreshCw } from 'lucide-react';
import { IssuedDocument, Product, StockMovement } from '../../types';

interface StockSalesReportProps {
  issuedDocuments?: IssuedDocument[];
  products?: Product[];
  stockMovements?: StockMovement[];
  warehouses?: any[];
  user?: any;
  companyData?: any;
  fiscalYear?: string | number;
  onRefresh?: () => void;
}

export const StockSalesReport: React.FC<StockSalesReportProps> = ({
  issuedDocuments = [],
  products = [],
  stockMovements = [],
  warehouses = [],
  user,
  companyData,
  fiscalYear,
  onRefresh,
}) => {
  const today = new Date();
  const todayFormatted = today.toLocaleDateString('pt-AO');
  const todayIso = today.toISOString().slice(0, 10);
  const thisYear = fiscalYear ? String(fiscalYear) : String(today.getFullYear());

  const [startDate, setStartDate] = useState(`${thisYear}-01-01`);
  const [endDate, setEndDate] = useState(todayIso);
  const [selectedDocType, setSelectedDocType] = useState('all');
  const [selectedSerie, setSelectedSerie] = useState('all');
  const [selectedWarehouse, setSelectedWarehouse] = useState('all');
  const [selectedArtigo, setSelectedArtigo] = useState('all');
  const [selectedOperador, setSelectedOperador] = useState('all');
  const [showDocTypeMenu, setShowDocTypeMenu] = useState(false);

  const displayName = (user?.nome || user?.name || user?.username || companyData?.name || companyData?.nome_empresa || 'IVAN JOSÃ‰ LUCAS MATITA').toUpperCase();

  // Filtrar documentos emitidos no perÃ­odo selecionado
  const filteredDocs = useMemo(() => {
    return (issuedDocuments || []).filter(d => {
      const docDate = (d.data_emissao || (d as any).created_at || '').slice(0, 10);
      if (startDate && docDate && docDate < startDate) return false;
      if (endDate && docDate && docDate > endDate) return false;

      const dt = ((d as any).tipo_documento || d.document_type || '').toUpperCase();
      if (selectedDocType !== 'all' && dt !== selectedDocType.toUpperCase()) return false;
      if (selectedSerie !== 'all' && d.serie && d.serie !== selectedSerie) return false;
      if (selectedWarehouse !== 'all' && (d as any).warehouse_id && String((d as any).warehouse_id) !== String(selectedWarehouse)) return false;
      if (selectedOperador !== 'all') {
        const op = String((d as any).user_id || (d as any).operador || '');
        if (op !== selectedOperador) return false;
      }
      return true;
    });
  }, [issuedDocuments, startDate, endDate, selectedDocType, selectedSerie, selectedWarehouse, selectedOperador]);

  // Vendas (FT, FR, VD, etc. excluindo NC e anuladas)
  const salesDocs = useMemo(() => {
    return filteredDocs.filter(d => {
      const dt = ((d as any).tipo_documento || d.document_type || '').toUpperCase();
      const isNC = dt.includes('CREDITO') || dt.includes('CRÃ‰DITO') || dt === 'NC';
      const isAnulado = d.status === 'anulado' || d.status === 'ANULADO';
      return !isNC && !isAnulado;
    });
  }, [filteredDocs]);

  // Devolucoes (Notas de Credito)
  const ncDocs = useMemo(() => {
    return filteredDocs.filter(d => {
      const dt = ((d as any).tipo_documento || d.document_type || '').toUpperCase();
      return dt.includes('CREDITO') || dt.includes('CRÃ‰DITO') || dt === 'NC';
    });
  }, [filteredDocs]);

  // Agrupamento de Produtos Vendidos
  const produtosVendidosMap = useMemo(() => {
    const map: Record<string, { code: string; desc: string; qty: number; unit: string; unitPrice: number; total: number }> = {};
    salesDocs.forEach(d => {
      const items = Array.isArray(d.items) ? d.items : [];
      items.forEach((item: any) => {
        const desc = item.description || item.name || item.produto || 'Artigo';
        const code = item.code || item.codigo || item.barcode || '0000';
        const unit = item.unit || item.unidade || 'Un';
        const qty = Number(item.quantity || item.quantidade || 0);
        const unitPrice = Number(item.unit_price || item.preco_unitario || (qty > 0 ? (item.total || item.subtotal || 0) / qty : 0));
        const total = Number(item.total || item.subtotal || (unitPrice * qty));

        if (!map[desc]) {
          map[desc] = { code, desc, qty: 0, unit, unitPrice, total: 0 };
        }
        map[desc].qty += qty;
        map[desc].total += total;
        if (unitPrice > 0) map[desc].unitPrice = unitPrice;
      });
    });
    return Object.values(map);
  }, [salesDocs]);

  // Produtos Mais Vendidos (Top 5 ordenados por quantidade)
  const produtosMaisVendidos = useMemo(() => {
    return [...produtosVendidosMap].sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [produtosVendidosMap]);

  // Agrupamento de Produtos Devolvidos
  const produtosDevolvidosMap = useMemo(() => {
    const map: Record<string, { code: string; desc: string; qty: number; unit: string; unitPrice: number; total: number }> = {};
    ncDocs.forEach(d => {
      const items = Array.isArray(d.items) ? d.items : [];
      items.forEach((item: any) => {
        const desc = item.description || item.name || item.produto || 'Artigo';
        const code = item.code || item.codigo || item.barcode || '0000';
        const unit = item.unit || item.unidade || 'Un';
        const qty = Number(item.quantity || item.quantidade || 0);
        const unitPrice = Number(item.unit_price || item.preco_unitario || 0);
        const total = Number(item.total || item.subtotal || (unitPrice * qty));

        if (!map[desc]) {
          map[desc] = { code, desc, qty: 0, unit, unitPrice, total: 0 };
        }
        map[desc].qty += qty;
        map[desc].total += total;
      });
    });
    return Object.values(map);
  }, [ncDocs]);

  // Movimentos detalhados linha a linha
  const movimentosDetalhados = useMemo(() => {
    const list: Array<{
      data: string;
      refInterna: string;
      empresa: string;
      documento: string;
      descricao: string;
      entrada: string;
      saida: string;
      unit: string;
      vUnit: number;
      subTotal: number;
      imposto: number;
    }> = [];

    filteredDocs.forEach(d => {
      const dt = ((d as any).tipo_documento || d.document_type || '').toUpperCase();
      const isNC = dt.includes('CREDITO') || dt.includes('CRÃ‰DITO') || dt === 'NC';
      const docNum = d.numero_documento || d.invoice_number || `${dt} ${d.serie || ''}/${d.id || ''}`;
      const clientOrCompany = d.client_name || companyData?.name || companyData?.nome_empresa || 'AGS & MT MINING';
      const docDate = (d.data_emissao || (d as any).created_at || '').slice(0, 10);
      const items = Array.isArray(d.items) ? d.items : [];

      if (items.length > 0) {
        items.forEach((item: any) => {
          const qty = Number(item.quantity || item.quantidade || 0);
          const unitPrice = Number(item.unit_price || item.preco_unitario || 0);
          const subTotal = Number(item.total || item.subtotal || (unitPrice * qty));
          const imp = Number(item.tax_amount || item.imposto || 0);

          list.push({
            data: docDate,
            refInterna: item.code || item.codigo || item.barcode || '0000',
            empresa: clientOrCompany,
            documento: docNum,
            descricao: item.description || item.name || item.produto || 'Artigo',
            entrada: isNC ? `${qty} ${item.unit || 'Un'}` : '',
            saida: !isNC ? `${qty} ${item.unit || 'Un'}` : '',
            unit: item.unit || item.unidade || 'Un',
            vUnit: unitPrice,
            subTotal: subTotal,
            imposto: imp,
          });
        });
      } else {
        const tot = Number(d.total || (d as any).valor_total || 0);
        const imp = Number(d.imposto || (d as any).iva_total || 0);
        list.push({
          data: docDate,
          refInterna: '0000',
          empresa: clientOrCompany,
          documento: docNum,
          descricao: `Documento ${docNum}`,
          entrada: isNC ? '1' : '',
          saida: !isNC ? '1' : '',
          unit: 'Un',
          vUnit: tot,
          subTotal: tot,
          imposto: imp,
        });
      }
    });

    return list;
  }, [filteredDocs, companyData]);

  // Totais somados
  const totalVendidos = produtosVendidosMap.reduce((acc, p) => acc + p.total, 0);
  const totalDevolvidos = produtosDevolvidosMap.reduce((acc, p) => acc + p.total, 0);
  const totalSubTotalMovimentos = movimentosDetalhados.reduce((acc, m) => acc + m.subTotal, 0);
  const totalImpostoMovimentos = movimentosDetalhados.reduce((acc, m) => acc + m.imposto, 0);

  const fmt = (val: number) => {
    return val.toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleExportXLSX = () => {
    const header = ['Data', 'Ref Interna', 'Empresa', 'Documento', 'Descricao', 'Entrada', 'Saida', 'unit', 'V.Unit', 'Sub.Total', 'Imposto'];
    const rows = movimentosDetalhados.map((m) => [
      m.data,
      m.refInterna,
      m.empresa,
      m.documento,
      m.descricao,
      m.entrada,
      m.saida,
      m.unit,
      m.vUnit.toFixed(2),
      m.subTotal.toFixed(2),
      m.imposto.toFixed(2),
    ]);
    const csv = [header, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_vendas_stock_${todayIso}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-[#f0f2f5] min-h-screen p-4 font-sans text-zinc-800 select-none print:p-0 print:bg-white">
      {/* Top Header: RelatÃ³rio de Vendas */}
      <div className="text-center mb-3">
        <h1 className="text-sm md:text-base font-bold italic tracking-wide text-zinc-800">
          RelatÃ³rio de Vendas
        </h1>
      </div>

      {/* 3D Round Green Buttons Toolbar */}
      <div className="flex items-center justify-center gap-3 mb-6 relative print:hidden">
        {/* Botao D com Tooltip */}
        <div className="relative group flex flex-col items-center">
          <button
            onClick={() => setShowDocTypeMenu(!showDocTypeMenu)}
            className="w-10 h-10 rounded-full bg-gradient-to-b from-[#b7e4a8] via-[#52b788] to-[#2d6a4f] shadow-[0_4px_6px_rgba(0,0,0,0.25),inset_0_1px_2px_rgba(255,255,255,0.8)] border border-[#2d6a4f] flex items-center justify-center text-white font-extrabold text-sm hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            title="Seleccione Tipo de Documento"
          >
            <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] text-[#1b4332] text-base font-black">D</span>
          </button>
          <div className="absolute -bottom-7 bg-[#20c997] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-md pointer-events-none whitespace-nowrap z-30 border border-[#0ca678]">
            Seleccione Tipo de Documento
          </div>
          {showDocTypeMenu && (
            <div className="absolute top-12 left-0 bg-white border border-zinc-300 shadow-xl rounded p-2 z-40 text-xs flex flex-col gap-1 min-w-[140px]">
              <button onClick={() => { setSelectedDocType('all'); setShowDocTypeMenu(false); }} className="text-left px-2 py-1 hover:bg-zinc-100 font-bold">Todos</button>
              <button onClick={() => { setSelectedDocType('FR'); setShowDocTypeMenu(false); }} className="text-left px-2 py-1 hover:bg-zinc-100">Fatura-Recibo (FR)</button>
              <button onClick={() => { setSelectedDocType('FT'); setShowDocTypeMenu(false); }} className="text-left px-2 py-1 hover:bg-zinc-100">Fatura (FT)</button>
              <button onClick={() => { setSelectedDocType('VD'); setShowDocTypeMenu(false); }} className="text-left px-2 py-1 hover:bg-zinc-100">Venda a Dinheiro (VD)</button>
              <button onClick={() => { setSelectedDocType('NC'); setShowDocTypeMenu(false); }} className="text-left px-2 py-1 hover:bg-zinc-100">Nota de CrÃ©dito (NC)</button>
            </div>
          )}
        </div>

        {/* Botao S */}
        <button
          onClick={() => {
            const series = Array.from(new Set(issuedDocuments.map(d => d.serie).filter(Boolean)));
            if (series.length > 0) {
              const nextIdx = (series.indexOf(selectedSerie) + 1) % (series.length + 1);
              setSelectedSerie(nextIdx === series.length ? 'all' : series[nextIdx]);
            }
          }}
          className="w-10 h-10 rounded-full bg-gradient-to-b from-[#b7e4a8] via-[#52b788] to-[#2d6a4f] shadow-[0_4px_6px_rgba(0,0,0,0.25),inset_0_1px_2px_rgba(255,255,255,0.8)] border border-[#2d6a4f] flex items-center justify-center text-white font-extrabold text-sm hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          title={`SÃ©rie: ${selectedSerie}`}
        >
          <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] text-[#1b4332] text-base font-black">S</span>
        </button>

        {/* Botao Armazem */}
        <button
          onClick={() => {
            if (warehouses.length > 0) {
              const currentIdx = warehouses.findIndex(w => String(w.id) === String(selectedWarehouse));
              const next = currentIdx + 1 >= warehouses.length ? 'all' : String(warehouses[currentIdx + 1].id);
              setSelectedWarehouse(next);
            }
          }}
          className="w-10 h-10 rounded-full bg-gradient-to-b from-[#b7e4a8] via-[#52b788] to-[#2d6a4f] shadow-[0_4px_6px_rgba(0,0,0,0.25),inset_0_1px_2px_rgba(255,255,255,0.8)] border border-[#2d6a4f] flex items-center justify-center text-[#1b4332] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          title={`ArmazÃ©m: ${selectedWarehouse === 'all' ? 'Todos' : selectedWarehouse}`}
        >
          <Home size={18} className="stroke-[2.5]" />
        </button>

        {/* Botao A (Artigos) */}
        <button
          onClick={() => setSelectedArtigo(selectedArtigo === 'all' ? '' : 'all')}
          className="w-10 h-10 rounded-full bg-gradient-to-b from-[#b7e4a8] via-[#52b788] to-[#2d6a4f] shadow-[0_4px_6px_rgba(0,0,0,0.25),inset_0_1px_2px_rgba(255,255,255,0.8)] border border-[#2d6a4f] flex items-center justify-center text-white font-extrabold text-sm hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          title="Filtro de Artigos"
        >
          <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] text-[#1b4332] text-base font-black">A</span>
        </button>

        {/* Botao XLSX */}
        <button
          onClick={handleExportXLSX}
          className="w-10 h-10 rounded-full bg-gradient-to-b from-[#b7e4a8] via-[#52b788] to-[#2d6a4f] shadow-[0_4px_6px_rgba(0,0,0,0.25),inset_0_1px_2px_rgba(255,255,255,0.8)] border border-[#2d6a4f] flex items-center justify-center text-[#1b4332] font-black text-[10px] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          title="Exportar para Excel (XLSX)"
        >
          XLSX
        </button>

        {/* Botao JAN */}
        <button
          onClick={() => {
            setStartDate(`${thisYear}-01-01`);
            setEndDate(todayIso);
          }}
          className="w-10 h-10 rounded-full bg-gradient-to-b from-[#b7e4a8] via-[#52b788] to-[#2d6a4f] shadow-[0_4px_6px_rgba(0,0,0,0.25),inset_0_1px_2px_rgba(255,255,255,0.8)] border border-[#2d6a4f] flex items-center justify-center text-[#1b4332] font-black text-[10px] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          title="Ano / PerÃ­odo Completo"
        >
          JAN
        </button>

        {/* Botao Imprimir */}
        <button
          onClick={() => window.print()}
          className="w-10 h-10 rounded-full bg-gradient-to-b from-[#b7e4a8] via-[#52b788] to-[#2d6a4f] shadow-[0_4px_6px_rgba(0,0,0,0.25),inset_0_1px_2px_rgba(255,255,255,0.8)] border border-[#2d6a4f] flex items-center justify-center text-[#1b4332] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          title="Imprimir RelatÃ³rio"
        >
          <Printer size={18} className="stroke-[2.5]" />
        </button>

        {/* Botao Alerta com + */}
        <button
          onClick={onRefresh}
          className="w-10 h-10 rounded-full bg-gradient-to-b from-[#b7e4a8] via-[#52b788] to-[#2d6a4f] shadow-[0_4px_6px_rgba(0,0,0,0.25),inset_0_1px_2px_rgba(255,255,255,0.8)] border border-[#2d6a4f] flex items-center justify-center text-[#1b4332] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          title="Atualizar / Alertas"
        >
          <Bell size={18} className="stroke-[2.5]" />
        </button>
      </div>

      {/* Main Container */}
      <div className="bg-white border border-zinc-300 p-6 shadow-sm max-w-[1300px] mx-auto text-xs">
        {/* Top Row: Filtros Box (Left) & Produtos Mais Vendidos (Right) */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-6">
          {/* Box Filtros */}
          <div className="border border-zinc-800 rounded-lg p-3 w-full md:w-80 bg-white shadow-sm">
            <div className="text-[11px] font-bold text-zinc-900 border-b border-zinc-200 pb-1 mb-2">
              Filtros
            </div>
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between items-center text-sky-800 font-semibold">
                <span className="text-sky-800">Periodo</span>
                <span>:</span>
                <span className="font-mono text-zinc-800">{startDate} a {endDate}</span>
              </div>
              <div className="flex justify-between items-center text-sky-800 font-semibold">
                <span className="text-sky-800">Documentos</span>
                <span>:</span>
                <span className="text-zinc-800 font-normal">{selectedDocType === 'all' ? 'Todos' : selectedDocType}</span>
              </div>
              <div className="flex justify-between items-center text-sky-800 font-semibold">
                <span className="text-sky-800">SÃ©rie</span>
                <span>:</span>
                <span className="text-zinc-800 font-normal">{selectedSerie === 'all' ? 'Todas' : selectedSerie}</span>
              </div>
              <div className="flex justify-between items-center text-sky-800 font-semibold">
                <span className="text-sky-800">ArmazÃ©m</span>
                <span>:</span>
                <span className="text-zinc-800 font-normal">
                  {selectedWarehouse === 'all' ? 'Todos' : warehouses.find(w => String(w.id) === String(selectedWarehouse))?.name || selectedWarehouse}
                </span>
              </div>
              <div className="flex justify-between items-center text-sky-800 font-semibold">
                <span className="text-sky-800">Artigos</span>
                <span>:</span>
                <span className="text-zinc-800 font-normal">Todos</span>
              </div>
              <div className="flex justify-between items-center text-sky-800 font-semibold">
                <span className="text-sky-800">C.Custos</span>
                <span>:</span>
                <span className="text-zinc-800 font-normal">Todos</span>
              </div>
              <div className="flex justify-between items-center text-sky-800 font-semibold">
                <span className="text-sky-800">Operador</span>
                <span>:</span>
                <span className="text-zinc-800 font-normal">{selectedOperador === 'all' ? 'Todos' : selectedOperador}</span>
              </div>
            </div>
          </div>

          {/* Right Top Area: Listagem emitida em + Produtos Mais Vendidos */}
          <div className="flex-1 w-full flex flex-col items-end">
            <div className="text-[10px] text-zinc-600 mb-2 font-medium">
              Listagem emitida em {todayFormatted}
            </div>

            <div className="w-full max-w-xl">
              <div className="text-[11px] font-bold text-zinc-900 mb-1">
                Produtos Mais Vendidos
              </div>
              <table className="w-full text-[11px] border-b border-zinc-300">
                <thead>
                  <tr className="border-b border-zinc-800 text-left font-bold text-zinc-800">
                    <th className="py-1 w-20">CÃ³digo</th>
                    <th className="py-1">DescriÃ§Ã£o</th>
                    <th className="py-1 text-right w-24">Quantidade</th>
                    <th className="py-1 text-right w-28">PreÃ§o UnitÃ¡rio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 font-medium text-zinc-700">
                  {produtosMaisVendidos.length > 0 ? (
                    produtosMaisVendidos.map((p, i) => (
                      <tr key={i} className="hover:bg-zinc-50">
                        <td className="py-1 font-mono text-zinc-600">{p.code}</td>
                        <td className="py-1 truncate max-w-[220px]" title={p.desc}>{p.desc}</td>
                        <td className="py-1 text-right font-mono">{p.qty} {p.unit}</td>
                        <td className="py-1 text-right font-mono">{fmt(p.unitPrice)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-3 text-center text-zinc-400 italic">
                        Nenhum produto faturado no perÃ­odo.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* User / Operator / Company Large Bold Title */}
        <div className="mb-6">
          <h2 className="text-xl md:text-2xl font-black text-black tracking-wide uppercase">
            {displayName}
          </h2>
        </div>

        {/* Section: Produtos Vendidos */}
        <div className="mb-6">
          <div className="text-[11px] font-bold text-zinc-900 mb-1">
            Produtos Vendidos
          </div>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-zinc-800 text-left font-bold text-zinc-800">
                <th className="py-1 w-28">CÃ³digo Produto</th>
                <th className="py-1">DescriÃ§Ã£o</th>
                <th className="py-1 text-right w-24">Quantidade</th>
                <th className="py-1 text-center w-16">unid</th>
                <th className="py-1 text-right w-28">PreÃ§o UnitÃ¡rio</th>
                <th className="py-1 text-right w-32">Valor Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-medium text-zinc-700">
              {produtosVendidosMap.length > 0 ? (
                produtosVendidosMap.map((p, i) => (
                  <tr key={i} className="hover:bg-zinc-50">
                    <td className="py-1 font-mono text-zinc-600">{p.code}</td>
                    <td className="py-1 font-semibold text-zinc-800">{p.desc}</td>
                    <td className="py-1 text-right font-mono">{p.qty}</td>
                    <td className="py-1 text-center">{p.unit}</td>
                    <td className="py-1 text-right font-mono">{fmt(p.unitPrice)}</td>
                    <td className="py-1 text-right font-mono font-bold text-zinc-900">{fmt(p.total)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-3 text-center text-zinc-400 italic">
                    Sem registos de vendas no perÃ­odo.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-zinc-800 font-bold">
                <td colSpan={5} className="py-2 text-right text-zinc-800">Total</td>
                <td className="py-2 text-right font-mono text-zinc-900 text-xs font-black">{fmt(totalVendidos)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Section: Produtos Devolvidos */}
        <div className="mb-6">
          <div className="text-[11px] font-bold text-zinc-900 mb-1">
            Produtos Devolvidos
          </div>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-zinc-800 text-left font-bold text-zinc-800">
                <th className="py-1 w-28">CÃ³digo</th>
                <th className="py-1">DescriÃ§Ã£o</th>
                <th className="py-1 text-right w-24">Quantidade</th>
                <th className="py-1 text-center w-16">unid</th>
                <th className="py-1 text-right w-28">PreÃ§o UnitÃ¡rio</th>
                <th className="py-1 text-right w-32">Valor Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-medium text-zinc-700">
              {produtosDevolvidosMap.length > 0 ? (
                produtosDevolvidosMap.map((p, i) => (
                  <tr key={i} className="hover:bg-zinc-50">
                    <td className="py-1 font-mono text-zinc-600">{p.code}</td>
                    <td className="py-1 font-semibold text-zinc-800">{p.desc}</td>
                    <td className="py-1 text-right font-mono">{p.qty}</td>
                    <td className="py-1 text-center">{p.unit}</td>
                    <td className="py-1 text-right font-mono">{fmt(p.unitPrice)}</td>
                    <td className="py-1 text-right font-mono font-bold text-zinc-900">{fmt(p.total)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-2 text-center text-zinc-400 italic">
                    Sem devoluÃ§Ãµes no perÃ­odo.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-zinc-800 font-bold">
                <td colSpan={5} className="py-2 text-right text-zinc-800">Total</td>
                <td className="py-2 text-right font-mono text-zinc-900 text-xs font-black">{fmt(totalDevolvidos)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Section: Movimentos */}
        <div className="mb-4">
          <div className="text-center font-bold text-zinc-800 text-[11px] mb-2">
            Movimentos
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-left font-bold text-zinc-800">
                  <th className="py-1.5 px-2 w-8">#</th>
                  <th className="py-1.5 px-2 w-20">Data</th>
                  <th className="py-1.5 px-2 w-20">RefÂª Interna</th>
                  <th className="py-1.5 px-2">Empresa</th>
                  <th className="py-1.5 px-2 w-28">Documento</th>
                  <th className="py-1.5 px-2">DescriÃ§Ã£o</th>
                  <th className="py-1.5 px-2 text-center w-16">Entrada</th>
                  <th className="py-1.5 px-2 text-center w-16">Saida</th>
                  <th className="py-1.5 px-2 text-center w-12">unit</th>
                  <th className="py-1.5 px-2 text-right w-24">V.Unit</th>
                  <th className="py-1.5 px-2 text-right w-24">Sub.Total</th>
                  <th className="py-1.5 px-2 text-right w-20">Imposto</th>
                  <th className="py-1.5 px-2 text-center w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {movimentosDetalhados.length > 0 ? (
                  movimentosDetalhados.map((m, idx) => (
                    <tr
                      key={idx}
                      className={`hover:bg-blue-50/60 transition-colors ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-[#f4f7f9]'
                      }`}
                    >
                      <td className="py-1.5 px-2 font-mono text-zinc-500">{idx + 1}</td>
                      <td className="py-1.5 px-2 font-mono text-zinc-600">{m.data}</td>
                      <td className="py-1.5 px-2 font-mono text-zinc-600">{m.refInterna}</td>
                      <td className="py-1.5 px-2 font-semibold text-zinc-800 truncate max-w-[150px]">{m.empresa}</td>
                      <td className="py-1.5 px-2 font-mono text-zinc-700">{m.documento}</td>
                      <td className="py-1.5 px-2 text-zinc-800 truncate max-w-[200px]" title={m.descricao}>{m.descricao}</td>
                      <td className="py-1.5 px-2 text-center font-mono text-emerald-600">{m.entrada}</td>
                      <td className="py-1.5 px-2 text-center font-mono text-red-600">{m.saida}</td>
                      <td className="py-1.5 px-2 text-center text-zinc-500">{m.unit}</td>
                      <td className="py-1.5 px-2 text-right font-mono">{fmt(m.vUnit)}</td>
                      <td className="py-1.5 px-2 text-right font-mono font-bold text-zinc-900">{fmt(m.subTotal)}</td>
                      <td className="py-1.5 px-2 text-right font-mono text-zinc-600">{fmt(m.imposto)}</td>
                      <td className="py-1.5 px-2 text-center">
                        <input type="checkbox" readOnly className="h-3 w-3 accent-zinc-500 rounded-none cursor-default" />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={13} className="py-4 text-center text-zinc-400 italic">
                      Nenhum movimento encontrado para os critÃ©rios selecionados.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-zinc-800 font-bold bg-zinc-50">
                  <td colSpan={10} className="py-2 px-2 text-right text-zinc-900 text-xs">Total</td>
                  <td className="py-2 px-2 text-right font-mono text-zinc-900 text-xs font-black">{fmt(totalSubTotalMovimentos)}</td>
                  <td className="py-2 px-2 text-right font-mono text-zinc-900 text-xs font-black">{fmt(totalImpostoMovimentos)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="flex justify-end mt-4 text-[10px] text-zinc-500 font-semibold italic">
            Fim de Listagem
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockSalesReport;
