import React, { useMemo, useState } from 'react';
import {
  Calculator,
  Download,
  FileSpreadsheet,
  FileText,
  Layers,
  Printer,
  TrendingUp,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Product, StockBalance, StockMovement, Warehouse } from '../../types';
import {
  computeProductMovementBreakdown,
  isInboundMovement,
} from '../../services/stockEnterpriseService';
import { StockEntradasReport } from './StockEntradasReport';

interface StockDetailedReportsModuleProps {
  products: Product[];
  stockMovements: StockMovement[];
  warehouses: Warehouse[];
  saldos: StockBalance[];
  companyData?: any;
  fiscalYear: number;
  onRefresh: () => void;
}

const formatKz = (val: number) =>
  Number(val || 0).toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Kz';

export const StockDetailedReportsModule: React.FC<StockDetailedReportsModuleProps> = ({
  products,
  stockMovements,
  warehouses,
  saldos,
  companyData,
  fiscalYear,
  onRefresh,
}) => {
  const [reportTab, setReportTab] = useState<'entradas_saidas' | 'valorizacao' | 'legado_entradas'>('entradas_saidas');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => (p.category || p.categoria) && set.add(String(p.category || p.categoria)));
    return Array.from(set).sort();
  }, [products]);

  const breakdownRows = useMemo(
    () =>
      computeProductMovementBreakdown(products, stockMovements, warehouses, saldos, {
        warehouseId: warehouseFilter,
        category: categoryFilter,
        startDate,
        endDate,
        search,
      }),
    [products, stockMovements, warehouses, saldos, warehouseFilter, categoryFilter, startDate, endDate, search]
  );

  // Curva ABC baseada no Valor Stock Custo
  const abcRows = useMemo(() => {
    const sorted = [...breakdownRows].sort((a, b) => b.valor_stock_custo - a.valor_stock_custo);
    const totalVal = sorted.reduce((s, r) => s + r.valor_stock_custo, 0) || 1;
    let accum = 0;
    return sorted.map((r) => {
      accum += r.valor_stock_custo;
      const pctAccum = (accum / totalVal) * 100;
      const classe = pctAccum <= 80 ? 'A' : pctAccum <= 95 ? 'B' : 'C';
      return {
        ...r,
        participacaoPct: Math.round((r.valor_stock_custo / totalVal) * 1000) / 10,
        classeAbc: classe,
      };
    });
  }, [breakdownRows]);

  const filteredMovements = useMemo(() => {
    const startMs = startDate ? new Date(`${startDate}T00:00:00`).getTime() : null;
    const endMs = endDate ? new Date(`${endDate}T23:59:59.999`).getTime() : null;
    const pidSet = new Set(breakdownRows.map((r) => r.product_id));
    return stockMovements.filter((m) => {
      if (m.product_id && !pidSet.has(String(m.product_id))) return false;
      const ts = new Date(m.created_at).getTime();
      if (startMs && ts < startMs) return false;
      if (endMs && ts > endMs) return false;
      return true;
    });
  }, [stockMovements, breakdownRows, startDate, endDate]);

  const totals = useMemo(() => {
    return breakdownRows.reduce(
      (acc, r) => ({
        inicial: acc.inicial + r.qtd_inicial,
        entradas: acc.entradas + r.qtd_entradas,
        valEntradas: acc.valEntradas + r.valor_entradas,
        saidas: acc.saidas + r.qtd_saidas,
        valSaidas: acc.valSaidas + r.valor_saidas,
        ajustesPos: acc.ajustesPos + r.qtd_ajustes_pos,
        ajustesNeg: acc.ajustesNeg + r.qtd_ajustes_neg,
        perdas: acc.perdas + r.qtd_perdas,
        devolucoes: acc.devolucoes + r.qtd_devolucoes,
        saldo: acc.saldo + r.saldo_atual,
        reservado: acc.reservado + r.reservado,
        disponivel: acc.disponivel + r.disponivel,
        valCusto: acc.valCusto + r.valor_stock_custo,
        valVenda: acc.valVenda + r.valor_stock_venda,
        margem: acc.margem + r.margem_potencial,
      }),
      {
        inicial: 0,
        entradas: 0,
        valEntradas: 0,
        saidas: 0,
        valSaidas: 0,
        ajustesPos: 0,
        ajustesNeg: 0,
        perdas: 0,
        devolucoes: 0,
        saldo: 0,
        reservado: 0,
        disponivel: 0,
        valCusto: 0,
        valVenda: 0,
        margem: 0,
      }
    );
  }, [breakdownRows]);

  const handleExportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const empNome = companyData?.nome || companyData?.name || 'IMATEC ERP';
    const empNif = companyData?.nif || '---';

    doc.setFillColor(0, 51, 102);
    doc.rect(0, 0, 297, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(`${empNome.toUpperCase()} — RELATÓRIO DETALHADO DE MOVIMENTOS E CÁLCULOS DE STOCK`, 14, 10);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `NIF: ${empNif} | Período: ${startDate || 'Início'} a ${endDate || 'Hoje'} | Emitido em: ${new Date().toLocaleString('pt-PT')}`,
      14,
      17
    );

    autoTable(doc, {
      startY: 28,
      head: [[
        'Produto',
        'Armazém',
        'Ini.',
        'Entradas',
        'Val. Entradas',
        'Saídas',
        'Val. Saídas',
        'Aj./Perd.',
        'Saldo',
        'CMP',
        'Valor Custo',
        'Valor Venda',
      ]],
      body: breakdownRows.map((r) => [
        r.product_name,
        r.warehouse_name,
        r.qtd_inicial,
        `+${r.qtd_entradas}`,
        formatKz(r.valor_entradas),
        `-${r.qtd_saidas}`,
        formatKz(r.valor_saidas),
        `+${r.qtd_ajustes_pos}/-${r.qtd_ajustes_neg + r.qtd_perdas}`,
        `${r.saldo_atual} ${r.unit}`,
        formatKz(r.custo_medio_cmp),
        formatKz(r.valor_stock_custo),
        formatKz(r.valor_stock_venda),
      ]),
      foot: [[
        'TOTAIS GERAIS',
        '',
        totals.inicial,
        `+${totals.entradas}`,
        formatKz(totals.valEntradas),
        `-${totals.saidas}`,
        formatKz(totals.valSaidas),
        `+${totals.ajustesPos}/-${totals.ajustesNeg + totals.perdas}`,
        totals.saldo,
        '',
        formatKz(totals.valCusto),
        formatKz(totals.valVenda),
      ]],
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [241, 245, 249], textColor: [0, 51, 102], fontStyle: 'bold' },
    });

    doc.addPage();
    doc.setFontSize(11);
    doc.setTextColor(0, 51, 102);
    doc.text('DIÁRIO ANALÍTICO DE ENTRADAS E SAÍDAS NO STOCK', 14, 14);
    autoTable(doc, {
      startY: 20,
      head: [['Data', 'Produto', 'Natureza', 'Qtd', 'Unitário', 'Total', 'Anterior', 'Atual', 'Documento / Motivo']],
      body: filteredMovements.slice(0, 250).map((m) => {
        const prod = products.find((p) => String(p.id) === String(m.product_id));
        const inbound = isInboundMovement(m);
        const unitP = Number(m.custo_unitario || m.unit_price || 0);
        return [
          new Date(m.created_at).toLocaleString('pt-PT'),
          m.product_name || prod?.name || prod?.nome || 'Produto',
          inbound ? `ENTRADA (${m.subtipo || m.type})` : `SAÍDA (${m.subtipo || m.type})`,
          `${inbound ? '+' : '-'}${m.quantity}`,
          formatKz(unitP),
          formatKz(Number(m.valor_total || Number(m.quantity || 0) * unitP)),
          m.previous_stock,
          m.current_stock,
          `${m.numero_documento || m.reference_id || ''} ${m.description || ''}`.trim().slice(0, 48),
        ];
      }),
      styles: { fontSize: 7, cellPadding: 1.8 },
      headStyles: { fillColor: [0, 51, 102], textColor: 255 },
    });

    doc.save(`Relatorio_Stock_Completo_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();
    const s1 = XLSX.utils.json_to_sheet(
      breakdownRows.map((r) => ({
        Produto: r.product_name,
        SKU: r.sku,
        Categoria: r.category,
        Armazém: r.warehouse_name,
        Unidade: r.unit,
        'Qtd Inicial': r.qtd_inicial,
        'Entradas (+)': r.qtd_entradas,
        'Valor Entradas (Kz)': r.valor_entradas,
        'Saídas (-)': r.qtd_saidas,
        'Valor Saídas (Kz)': r.valor_saidas,
        'Ajustes (+)': r.qtd_ajustes_pos,
        'Ajustes (-)': r.qtd_ajustes_neg,
        Perdas: r.qtd_perdas,
        Devoluções: r.qtd_devolucoes,
        'Transf. Entrada': r.qtd_transf_in,
        'Transf. Saída': r.qtd_transf_out,
        'Saldo Atual': r.saldo_atual,
        Reservado: r.reservado,
        Disponível: r.disponivel,
        'CMP (Kz)': r.custo_medio_cmp,
        'Valor Stock Custo (Kz)': r.valor_stock_custo,
        'Valor Stock Venda (Kz)': r.valor_stock_venda,
        'Margem Potencial (Kz)': r.margem_potencial,
      }))
    );
    const s2 = XLSX.utils.json_to_sheet(
      filteredMovements.map((m) => {
        const prod = products.find((p) => String(p.id) === String(m.product_id));
        const inbound = isInboundMovement(m);
        const unitP = Number(m.custo_unitario || m.unit_price || 0);
        return {
          Data: new Date(m.created_at).toLocaleString('pt-PT'),
          Produto: m.product_name || prod?.name || prod?.nome || 'Produto',
          Direção: inbound ? 'ENTRADA' : 'SAÍDA',
          Tipo: m.type,
          Subtipo: m.subtipo || m.type,
          Quantidade: m.quantity,
          'Unitário (Kz)': unitP,
          'Total (Kz)': Number(m.valor_total || Number(m.quantity || 0) * unitP),
          'Stock Anterior': m.previous_stock,
          'Stock Atual': m.current_stock,
          Documento: m.numero_documento || m.reference_id || '',
          Descrição: m.description || '',
          Utilizador: m.created_by_nome || m.created_by_username || '',
        };
      })
    );
    const s3 = XLSX.utils.json_to_sheet(
      saldos.map((s) => {
        const prod = products.find((p) => String(p.id) === String(s.product_id));
        const arm = warehouses.find((w) => String(w.id) === String(s.armazem_id));
        return {
          Produto: prod?.name || prod?.nome || s.product_id,
          Armazém: arm?.name || (arm as any)?.nome || s.armazem_id,
          Disponível: s.quantidade_disponivel,
          Reservado: s.quantidade_reservada,
          'Custo Médio (Kz)': s.custo_medio,
        };
      })
    );
    XLSX.utils.book_append_sheet(wb, s1, 'Resumo_Calculos_Stock');
    XLSX.utils.book_append_sheet(wb, s2, 'Movimentos_Entradas_Saidas');
    XLSX.utils.book_append_sheet(wb, s3, 'Saldos_Armazens');
    XLSX.writeFile(wb, `Relatorio_Enterprise_Stock_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-zinc-200 p-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setReportTab('entradas_saidas')}
            className={`px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
              reportTab === 'entradas_saidas' ? 'bg-[#003366] text-white' : 'bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
            }`}
          >
            <Calculator size={13} /> Mapa de Entradas, Saídas & Cálculos
          </button>
          <button
            onClick={() => setReportTab('valorizacao')}
            className={`px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
              reportTab === 'valorizacao' ? 'bg-[#003366] text-white' : 'bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
            }`}
          >
            <TrendingUp size={13} /> Valorização Financeira & Curva ABC
          </button>
          <button
            onClick={() => setReportTab('legado_entradas')}
            className={`px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
              reportTab === 'legado_entradas' ? 'bg-[#003366] text-white' : 'bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
            }`}
          >
            <FileText size={13} /> Mapa Oficial de Entradas (A4)
          </button>
        </div>

        {reportTab !== 'legado_entradas' && (
          <div className="flex items-center gap-2">
            <button onClick={handleExportPDF} className="bg-[#003366] hover:bg-[#002244] text-white px-3 py-1.5 text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer">
              <Printer size={13} /> Exportar PDF
            </button>
            <button onClick={handleExportExcel} className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 text-xs font-bold uppercase flex items-center gap-1.5 cursor-pointer">
              <FileSpreadsheet size={13} /> Exportar Excel
            </button>
          </div>
        )}
      </div>

      {reportTab === 'legado_entradas' ? (
        <StockEntradasReport
          products={products}
          stockMovements={stockMovements}
          warehouses={warehouses}
          companyData={companyData}
          fiscalYear={fiscalYear}
          onRefresh={onRefresh}
        />
      ) : (
        <>
          {/* Filtros de Relatório */}
          <div className="bg-white border border-zinc-200 p-3 flex flex-wrap items-center gap-2">
            <select value={warehouseFilter} onChange={(e) => setWarehouseFilter(e.target.value)} className="bg-zinc-50 border border-zinc-200 px-2.5 py-1.5 text-xs font-bold">
              <option value="all">Todos os Armazéns</option>
              {warehouses.map((w) => (
                <option key={w.id} value={String(w.id)}>{w.name || (w as any).nome}</option>
              ))}
            </select>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="bg-zinc-50 border border-zinc-200 px-2.5 py-1.5 text-xs font-bold">
              <option value="all">Todas Categorias</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-zinc-50 border border-zinc-200 px-2 py-1 text-xs" />
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-zinc-50 border border-zinc-200 px-2 py-1 text-xs" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrar produto / SKU..."
              className="bg-zinc-50 border border-zinc-200 px-2.5 py-1.5 text-xs flex-1 min-w-[180px]"
            />
          </div>

          {reportTab === 'entradas_saidas' ? (
            <div className="space-y-4">
              {/* Totalizadores */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                <div className="bg-white border border-zinc-200 p-3">
                  <div className="text-[10px] font-black uppercase text-zinc-400">Qtd Inicial</div>
                  <div className="text-base font-black text-zinc-800">{totals.inicial}</div>
                </div>
                <div className="bg-white border border-emerald-200 bg-emerald-50/30 p-3">
                  <div className="text-[10px] font-black uppercase text-emerald-700">Entradas (+)</div>
                  <div className="text-base font-black text-emerald-700">+{totals.entradas}</div>
                  <div className="text-[10px] font-bold text-emerald-800">{formatKz(totals.valEntradas)}</div>
                </div>
                <div className="bg-white border border-red-200 bg-red-50/30 p-3">
                  <div className="text-[10px] font-black uppercase text-red-700">Saídas (-)</div>
                  <div className="text-base font-black text-red-700">-{totals.saidas}</div>
                  <div className="text-[10px] font-bold text-red-800">{formatKz(totals.valSaidas)}</div>
                </div>
                <div className="bg-white border border-zinc-200 p-3">
                  <div className="text-[10px] font-black uppercase text-zinc-400">Saldo Final</div>
                  <div className="text-base font-black text-[#003366]">{totals.saldo}</div>
                  <div className="text-[10px] text-zinc-500">Disp: {totals.disponivel} | Res: {totals.reservado}</div>
                </div>
                <div className="bg-white border border-zinc-200 p-3">
                  <div className="text-[10px] font-black uppercase text-zinc-400">Valor Stock (Custo)</div>
                  <div className="text-sm font-black text-[#003366] mt-0.5">{formatKz(totals.valCusto)}</div>
                </div>
                <div className="bg-white border border-zinc-200 p-3">
                  <div className="text-[10px] font-black uppercase text-zinc-400">Valor Venda / Margem</div>
                  <div className="text-xs font-black text-emerald-700 mt-0.5">{formatKz(totals.valVenda)}</div>
                  <div className="text-[10px] text-zinc-500">Margem: {formatKz(totals.margem)}</div>
                </div>
              </div>

              {/* Tabela Detalhada por Produto (Entradas + Saídas + Cálculos) */}
              <div className="bg-white border border-zinc-200 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#003366] text-white text-[10px] uppercase">
                    <tr>
                      <th className="px-3 py-2">Produto / SKU</th>
                      <th className="px-3 py-2">Armazém</th>
                      <th className="px-3 py-2 text-right">Inicial</th>
                      <th className="px-3 py-2 text-right">Entradas</th>
                      <th className="px-3 py-2 text-right">Val. Entradas</th>
                      <th className="px-3 py-2 text-right">Saídas</th>
                      <th className="px-3 py-2 text-right">Val. Saídas</th>
                      <th className="px-3 py-2 text-right">Aj.+ / Aj.- / Perda</th>
                      <th className="px-3 py-2 text-right">Saldo</th>
                      <th className="px-3 py-2 text-right">CMP</th>
                      <th className="px-3 py-2 text-right">Val. Custo</th>
                      <th className="px-3 py-2 text-right">Margem Est.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {breakdownRows.map((r) => (
                      <tr key={r.product_id} className="hover:bg-zinc-50">
                        <td className="px-3 py-2">
                          <div className="font-bold text-zinc-900">{r.product_name}</div>
                          <div className="text-[10px] text-zinc-400 font-mono">{r.sku}</div>
                        </td>
                        <td className="px-3 py-2 text-zinc-600">{r.warehouse_name}</td>
                        <td className="px-3 py-2 text-right">{r.qtd_inicial}</td>
                        <td className="px-3 py-2 text-right font-bold text-emerald-700">+{r.qtd_entradas}</td>
                        <td className="px-3 py-2 text-right text-emerald-700">{formatKz(r.valor_entradas)}</td>
                        <td className="px-3 py-2 text-right font-bold text-red-600">-{r.qtd_saidas}</td>
                        <td className="px-3 py-2 text-right text-red-600">{formatKz(r.valor_saidas)}</td>
                        <td className="px-3 py-2 text-right font-mono text-[11px]">
                          +{r.qtd_ajustes_pos} / -{r.qtd_ajustes_neg} / {r.qtd_perdas}
                        </td>
                        <td className="px-3 py-2 text-right font-black text-[#003366]">{r.saldo_atual} {r.unit}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatKz(r.custo_medio_cmp)}</td>
                        <td className="px-3 py-2 text-right font-bold">{formatKz(r.valor_stock_custo)}</td>
                        <td className="px-3 py-2 text-right font-bold text-emerald-700">{formatKz(r.margem_potencial)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-zinc-100 font-black text-xs text-[#003366]">
                    <tr>
                      <td colSpan={2} className="px-3 py-2.5 uppercase">Totais Consolidados</td>
                      <td className="px-3 py-2.5 text-right">{totals.inicial}</td>
                      <td className="px-3 py-2.5 text-right text-emerald-700">+{totals.entradas}</td>
                      <td className="px-3 py-2.5 text-right text-emerald-700">{formatKz(totals.valEntradas)}</td>
                      <td className="px-3 py-2.5 text-right text-red-700">-{totals.saidas}</td>
                      <td className="px-3 py-2.5 text-right text-red-700">{formatKz(totals.valSaidas)}</td>
                      <td className="px-3 py-2.5 text-right">+{totals.ajustesPos} / -{totals.ajustesNeg + totals.perdas}</td>
                      <td className="px-3 py-2.5 text-right">{totals.saldo}</td>
                      <td className="px-3 py-2.5 text-right">---</td>
                      <td className="px-3 py-2.5 text-right">{formatKz(totals.valCusto)}</td>
                      <td className="px-3 py-2.5 text-right text-emerald-700">{formatKz(totals.margem)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Diário de Movimentos de Entrada e Saída */}
              <div className="bg-white border border-zinc-200 overflow-x-auto">
                <div className="px-3 py-2 bg-zinc-50 border-b border-zinc-200 text-xs font-black uppercase text-[#003366]">
                  Extrato Cronológico de Entradas & Saídas ({filteredMovements.length} registos)
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-100 text-[10px] uppercase font-black text-zinc-600">
                    <tr>
                      <th className="px-3 py-2">Data</th>
                      <th className="px-3 py-2">Produto</th>
                      <th className="px-3 py-2">Movimento</th>
                      <th className="px-3 py-2 text-right">Qtd</th>
                      <th className="px-3 py-2 text-right">Unitário</th>
                      <th className="px-3 py-2 text-right">Total</th>
                      <th className="px-3 py-2 text-center">Ant. → Atual</th>
                      <th className="px-3 py-2">Documento / Descrição</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredMovements.slice(0, 150).map((m) => {
                      const prod = products.find((p) => String(p.id) === String(m.product_id));
                      const inbound = isInboundMovement(m);
                      const unitP = Number(m.custo_unitario || m.unit_price || 0);
                      const totP = Number(m.valor_total || Number(m.quantity || 0) * unitP);
                      return (
                        <tr key={m.id} className="hover:bg-zinc-50">
                          <td className="px-3 py-2 text-zinc-500 whitespace-nowrap">{new Date(m.created_at).toLocaleString('pt-PT')}</td>
                          <td className="px-3 py-2 font-bold text-zinc-900">{m.product_name || prod?.name || prod?.nome || 'Produto'}</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 text-[10px] font-black uppercase ${inbound ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                              {inbound ? 'ENTRADA' : 'SAÍDA'} ({m.subtipo || m.type})
                            </span>
                          </td>
                          <td className={`px-3 py-2 text-right font-black ${inbound ? 'text-emerald-700' : 'text-red-600'}`}>
                            {inbound ? '+' : '-'}{m.quantity}
                          </td>
                          <td className="px-3 py-2 text-right font-mono">{formatKz(unitP)}</td>
                          <td className="px-3 py-2 text-right font-bold">{formatKz(totP)}</td>
                          <td className="px-3 py-2 text-center font-mono text-[11px]">
                            {m.previous_stock} → <strong>{m.current_stock}</strong>
                          </td>
                          <td className="px-3 py-2 text-zinc-500">{m.numero_documento || m.reference_id ? `[${m.numero_documento || m.reference_id}] ` : ''}{m.description || '---'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Valorização Financeira & Curva ABC */
            <div className="bg-white border border-zinc-200 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#003366] text-white text-[10px] uppercase">
                  <tr>
                    <th className="px-3 py-2">Classe ABC</th>
                    <th className="px-3 py-2">Produto</th>
                    <th className="px-3 py-2 text-right">Saldo Atual</th>
                    <th className="px-3 py-2 text-right">Custo Unit. Compra</th>
                    <th className="px-3 py-2 text-right">CMP Ponderado</th>
                    <th className="px-3 py-2 text-right">Preço Venda</th>
                    <th className="px-3 py-2 text-right">Valor Stock (Custo)</th>
                    <th className="px-3 py-2 text-right">Valor Stock (Venda)</th>
                    <th className="px-3 py-2 text-right">% Participação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {abcRows.map((r) => (
                    <tr key={r.product_id} className="hover:bg-zinc-50">
                      <td className="px-3 py-2">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-black ${
                            r.classeAbc === 'A'
                              ? 'bg-emerald-100 text-emerald-800'
                              : r.classeAbc === 'B'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-zinc-100 text-zinc-600'
                          }`}
                        >
                          Classe {r.classeAbc}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-bold text-zinc-900">{r.product_name}</td>
                      <td className="px-3 py-2 text-right font-bold">{r.saldo_atual} {r.unit}</td>
                      <td className="px-3 py-2 text-right font-mono">{formatKz(r.custo_unitario)}</td>
                      <td className="px-3 py-2 text-right font-mono">{formatKz(r.custo_medio_cmp)}</td>
                      <td className="px-3 py-2 text-right font-mono">{formatKz(r.preco_venda)}</td>
                      <td className="px-3 py-2 text-right font-black text-[#003366]">{formatKz(r.valor_stock_custo)}</td>
                      <td className="px-3 py-2 text-right font-bold text-emerald-700">{formatKz(r.valor_stock_venda)}</td>
                      <td className="px-3 py-2 text-right font-bold">{r.participacaoPct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};
