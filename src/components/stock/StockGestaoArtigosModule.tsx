import React, { useMemo, useState } from 'react';
import { Search, Calendar, Filter, RefreshCw, FileText, Download } from 'lucide-react';
import type { Product, StockMovement, Warehouse } from '../../types';
import { exportToExcel } from '../../lib/exportUtils';

interface StockGestaoArtigosModuleProps {
  products: Product[];
  stockMovements: StockMovement[];
  warehouses: Warehouse[];
  companyData?: any;
  onRefresh?: () => void;
}

const fmtKz = (v: number) =>
  Number(v || 0).toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Kz';

export const StockGestaoArtigosModule: React.FC<StockGestaoArtigosModuleProps> = ({
  products = [],
  stockMovements = [],
  warehouses = [],
  companyData,
  onRefresh,
}) => {
  const [dateFrom, setDateFrom] = useState('2026-11-01');
  const [dateTo, setDateTo] = useState('2026-11-23');
  const [selectedArmazem, setSelectedArmazem] = useState('Todos');
  const [selectedProduct, setSelectedProduct] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');

  // Cruzamento de dados de artigos com movimentos de stock
  const rows = useMemo(() => {
    return products.map((prod, idx) => {
      // Filtrar movimentos deste produto no período
      const movs = stockMovements.filter((m) => {
        const pId = String(m.product_id || (m as any).produto_id || '');
        if (pId !== String(prod.id)) return false;
        const d = String(m.created_at || '').slice(0, 10);
        if (dateFrom && d < dateFrom) return false;
        if (dateTo && d > dateTo) return false;
        if (selectedArmazem !== 'Todos') {
          const wId = String(m.warehouse_id || m.armazem_id || '');
          if (wId !== selectedArmazem) return false;
        }
        return true;
      });

      const totalEntradas = movs
        .filter((m) => m.type === 'entry' || (m as any).tipo === 'entrada')
        .reduce((sum, m) => sum + Number(m.quantity || (m as any).quantidade || 0), 0);

      const totalSaidas = movs
        .filter((m) => m.type === 'exit' || (m as any).tipo === 'saida')
        .reduce((sum, m) => sum + Number(m.quantity || (m as any).quantidade || 0), 0);

      const arm = warehouses.find((w) => String(w.id) === String(prod.warehouse_id || (prod as any).armazem_id));
      const armName = arm?.name || (arm as any)?.nome || (prod.warehouse_id ? `Armazém #${prod.warehouse_id}` : 'Geral');

      return {
        pos: idx + 1,
        data: String(prod.data_registo || prod.created_at || '2026-11-20').slice(0, 10),
        numSerie: (prod as any).numero_serie || prod.barcode || `SER-${String(prod.id).slice(0, 6).toUpperCase()}`,
        empresa: companyData?.nome_empresa || companyData?.nome || 'IMATEC',
        documento: (prod as any).documento || `DOC-${String(prod.id).slice(0, 8)}`,
        artigo: prod.name || (prod as any).nome || prod.referente || 'Artigo sem nome',
        entrada: totalEntradas,
        saida: totalSaidas,
        unit: prod.unit || (prod as any).unidade || 'Un',
        grupo: (prod as any).categoria || prod.category || 'Geral',
        vCompra: Number(prod.cost_price || (prod as any).preco_custo || 0),
        vVenda: Number(prod.price || (prod as any).preco_venda || (prod as any).preco || 0),
        armazem: armName,
      };
    });
  }, [products, stockMovements, warehouses, companyData, dateFrom, dateTo, selectedArmazem]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (selectedProduct !== 'Todos' && r.artigo !== selectedProduct) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        if (
          !r.artigo.toLowerCase().includes(q) &&
          !r.numSerie.toLowerCase().includes(q) &&
          !r.documento.toLowerCase().includes(q) &&
          !r.grupo.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [rows, selectedProduct, searchTerm]);

  const handleExportExcel = () => {
    const dataToExport = filteredRows.map((r) => ({
      Pos: r.pos,
      Data: r.data,
      'Nº de Série': r.numSerie,
      Empresa: r.empresa,
      Documento: r.documento,
      Artigo: r.artigo,
      'Stock Entrada': r.entrada,
      'Stock Saída': r.saida,
      Unidade: r.unit,
      Grupo: r.grupo,
      'V. Compra': r.vCompra,
      'V. Venda': r.vVenda,
      Armazém: r.armazem,
    }));
    exportToExcel(dataToExport, `Gestao_de_Artigos_${dateFrom}_${dateTo}.xlsx`, 'Artigos');
  };

  return (
    <div className="space-y-4 bg-white border border-zinc-200 p-4 shadow-xs">
      {/* BANNER IDENTICO À IMAGEM 1: GESTÃO DE ARTIGOS */}
      <div className="bg-gradient-to-r from-zinc-200 via-zinc-100 to-zinc-50 border border-zinc-300 px-4 py-2 flex items-center justify-between rounded-t-sm shadow-xs">
        <h2 className="text-sm font-black text-zinc-800 uppercase tracking-widest flex items-center gap-2">
          <FileText size={16} className="text-[#003366]" /> GESTÃO DE ARTIGOS
        </h2>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="p-1 text-zinc-600 hover:text-zinc-900 cursor-pointer"
              title="Atualizar"
            >
              <RefreshCw size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
            title="Exportar para Excel"
          >
            <Download size={12} /> Excel
          </button>
        </div>
      </div>

      {/* BARRA DE FILTROS IDENTICA: PERIODO, ARMAZENS, SELECÇÃO */}
      <div className="flex flex-wrap items-center gap-6 text-xs text-zinc-700 bg-zinc-50/60 p-3 border border-zinc-200">
        <div className="flex items-center gap-2">
          <span className="font-bold text-zinc-600">Período:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="bg-white border border-zinc-300 px-2 py-1 text-xs focus:outline-none focus:border-[#003366]"
          />
          <span className="text-zinc-400">a</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="bg-white border border-zinc-300 px-2 py-1 text-xs focus:outline-none focus:border-[#003366]"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="font-bold text-zinc-600">Armazéns:</span>
          <select
            value={selectedArmazem}
            onChange={(e) => setSelectedArmazem(e.target.value)}
            className="bg-white border border-zinc-300 px-2.5 py-1 text-xs font-semibold focus:outline-none focus:border-[#003366]"
          >
            <option value="Todos">Todos</option>
            {warehouses.map((w) => (
              <option key={w.id} value={String(w.id)}>
                {w.name || (w as any).nome}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-bold text-zinc-600">Selecção:</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filtrar por artigo, grupo ou série..."
            className="bg-white border border-zinc-300 px-2.5 py-1 text-xs w-60 focus:outline-none focus:border-[#003366]"
          />
        </div>
      </div>

      {/* TABELA IDENTICA À IMAGEM 1 COM CABEÇALHOS AGRUPADOS: STOCK E VALOR UNITARIO S/ IMPOSTO */}
      <div className="overflow-x-auto border border-zinc-300">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-zinc-100 text-zinc-700 font-bold border-b border-zinc-300 text-[11px]">
              <th rowSpan={2} className="p-2 border-r border-zinc-300">Data</th>
              <th rowSpan={2} className="p-2 border-r border-zinc-300">Nº de Série</th>
              <th rowSpan={2} className="p-2 border-r border-zinc-300">Empresa</th>
              <th rowSpan={2} className="p-2 border-r border-zinc-300">Documento</th>
              <th rowSpan={2} className="p-2 border-r border-zinc-300">Artigo</th>
              <th colSpan={5} className="p-1.5 text-center border-r border-b border-zinc-300 bg-zinc-200/70">
                Stock
              </th>
              <th colSpan={2} className="p-1.5 text-center border-r border-b border-zinc-300 bg-zinc-200/70">
                Valor Unitário s/imposto
              </th>
              <th rowSpan={2} className="p-2">Armazém</th>
            </tr>
            <tr className="bg-zinc-50 text-zinc-600 text-[10px] uppercase font-bold border-b border-zinc-300">
              <th className="p-1.5 text-right border-r border-zinc-300">Entrada</th>
              <th className="p-1.5 text-right border-r border-zinc-300">Saída</th>
              <th className="p-1.5 text-center border-r border-zinc-300">Unit</th>
              <th className="p-1.5 border-r border-zinc-300">Grupo</th>
              <th className="p-1.5 text-center border-r border-zinc-300">Pos</th>
              <th className="p-1.5 text-right border-r border-zinc-300">V.Compra</th>
              <th className="p-1.5 text-right border-r border-zinc-300">V.Venda</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 text-zinc-800">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={13} className="py-12 text-center text-zinc-400 italic">
                  Nenhum artigo encontrado para o período e filtros selecionados.
                </td>
              </tr>
            ) : (
              filteredRows.map((r, idx) => (
                <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                  <td className="p-2 whitespace-nowrap border-r border-zinc-200 text-zinc-600">{r.data}</td>
                  <td className="p-2 whitespace-nowrap border-r border-zinc-200 font-mono font-semibold text-zinc-900">{r.numSerie}</td>
                  <td className="p-2 whitespace-nowrap border-r border-zinc-200 text-zinc-700">{r.empresa}</td>
                  <td className="p-2 whitespace-nowrap border-r border-zinc-200 font-mono text-zinc-600">{r.documento}</td>
                  <td className="p-2 font-bold text-zinc-900 border-r border-zinc-200">{r.artigo}</td>
                  <td className="p-2 text-right font-mono font-semibold text-emerald-700 border-r border-zinc-200">{r.entrada || '—'}</td>
                  <td className="p-2 text-right font-mono font-semibold text-amber-700 border-r border-zinc-200">{r.saida || '—'}</td>
                  <td className="p-2 text-center border-r border-zinc-200 text-zinc-500">{r.unit}</td>
                  <td className="p-2 border-r border-zinc-200 text-zinc-600">{r.grupo}</td>
                  <td className="p-2 text-center font-mono text-zinc-400 border-r border-zinc-200">{r.pos}</td>
                  <td className="p-2 text-right font-mono text-zinc-700 border-r border-zinc-200">{fmtKz(r.vCompra)}</td>
                  <td className="p-2 text-right font-mono font-bold text-[#003366] border-r border-zinc-200">{fmtKz(r.vVenda)}</td>
                  <td className="p-2 text-zinc-700 font-medium">{r.armazem}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StockGestaoArtigosModule;
