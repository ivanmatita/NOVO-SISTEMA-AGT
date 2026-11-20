import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FileSpreadsheet, RefreshCw, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface ValorizacaoRow {
  id: string;
  data: string;
  doc_numero: string;
  fornecedor: string;
  data_validade: string;
  descricao: string;
  numero_serie: string;
  quantidade: number;
  unidade: string;
  v_unit: number;
  total: number;
  total_stock?: number;
}

interface StockValorizacaoStockModuleProps {
  products: any[];
  stockMovements: any[];
  warehouses: any[];
  saldos?: any[];
  onRefresh?: () => void;
}

const fmtDate = (d: string) => {
  if (!d) return '-';
  try {
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2, '0')}-${String(dt.getMonth() + 1).padStart(2, '0')}-${dt.getFullYear()}`;
  } catch {
    return d;
  }
};

const fmtKz = (v: number) =>
  Number(v || 0).toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const StockValorizacaoStockModule: React.FC<StockValorizacaoStockModuleProps> = ({
  products = [],
  stockMovements = [],
  saldos = [],
  onRefresh,
}) => {
  const { user } = useAuth();
  const empresaId = String(user?.empresa_id || (user as any)?.company_id || '');

  const [rows, setRows] = useState<ValorizacaoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  /* ── FIFO valuation from stock movements ── */
  const computeFIFO = useCallback(
    (entradas: any[], saidas: any[], productMap: Map<string, any>): ValorizacaoRow[] => {
      // Group entradas by product
      const byProduct = new Map<string, any[]>();
      for (const e of entradas) {
        const pid = String(e.produto_id || e.product_id || '');
        if (!byProduct.has(pid)) byProduct.set(pid, []);
        byProduct.get(pid)!.push(e);
      }

      // Calculate exits per product
      const exitsQty = new Map<string, number>();
      for (const s of saidas) {
        const pid = String(s.produto_id || s.product_id || '');
        exitsQty.set(pid, (exitsQty.get(pid) || 0) + Number(s.quantidade || s.quantity || 0));
      }

      const result: ValorizacaoRow[] = [];
      let runningTotal = 0;

      byProduct.forEach((lots, pid) => {
        // Sort oldest first (FIFO)
        lots.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());

        let consumed = exitsQty.get(pid) || 0;
        const prod = productMap.get(pid);

        for (const lot of lots) {
          const lotQty = Number(lot.quantidade || lot.quantity || 0);
          if (consumed >= lotQty) {
            consumed -= lotQty;
            continue; // fully consumed
          }
          const remaining = lotQty - consumed;
          consumed = 0;
          const vUnit = Number(lot.preco_unitario || lot.custo_unitario || lot.unit_price || prod?.cost_price || 0);
          const total = remaining * vUnit;
          runningTotal += total;

          result.push({
            id: lot.id,
            data: lot.data_movimento || lot.created_at || '',
            doc_numero: lot.documento_referencia || lot.referencia || lot.doc_number || '-',
            fornecedor: lot.fornecedor_nome || lot.supplier_name || '-',
            data_validade: lot.data_validade || '',
            descricao: prod?.name || lot.produto_nome || lot.descricao || '-',
            numero_serie: lot.numero_serie || lot.lote_numero || lot.batch_number || '-',
            quantidade: remaining,
            unidade: prod?.unit || 'Un',
            v_unit: vUnit,
            total,
            total_stock: runningTotal,
          });
        }
      });

      return result.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    },
    []
  );

  const fetchData = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const productMap = new Map(products.map((p: any) => [String(p.id), p]));

      // Fetch entries
      let qE = supabase
        .from('movimentacoes_stock')
        .select('*')
        .eq('empresa_id', empresaId)
        .in('tipo', ['entrada', 'entry'])
        .order('created_at', { ascending: true });
      if (dateFrom) qE = qE.gte('created_at', dateFrom);
      if (dateTo) qE = qE.lte('created_at', dateTo + 'T23:59:59');

      // Fetch exits
      const qS = supabase
        .from('movimentacoes_stock')
        .select('produto_id,quantidade,quantity')
        .eq('empresa_id', empresaId)
        .in('tipo', ['saida', 'exit', 'saída']);

      const [entRes, saiRes] = await Promise.all([qE, qS]);

      const entradas = entRes.data || [];
      const saidas = saiRes.data || [];

      if (entradas.length > 0) {
        setRows(computeFIFO(entradas, saidas, productMap));
      } else {
        // Fallback: build from prop
        const propEntradas = stockMovements.filter((m: any) => {
          const t = (m.tipo || m.type || '').toLowerCase();
          return t === 'entrada' || t === 'entry';
        });
        const propSaidas = stockMovements.filter((m: any) => {
          const t = (m.tipo || m.type || '').toLowerCase();
          return t === 'saida' || t === 'exit' || t === 'saída';
        });
        setRows(computeFIFO(propEntradas, propSaidas, productMap));
      }
    } catch (err) {
      console.warn('[Valorizacao] fetch error:', err);
      // Fallback from props
      const productMap = new Map(products.map((p: any) => [String(p.id), p]));
      const propEntradas = stockMovements.filter((m: any) => {
        const t = (m.tipo || m.type || '').toLowerCase();
        return t === 'entrada' || t === 'entry';
      });
      const propSaidas = stockMovements.filter((m: any) => {
        const t = (m.tipo || m.type || '').toLowerCase();
        return t === 'saida' || t === 'exit' || t === 'saída';
      });
      setRows(computeFIFO(propEntradas, propSaidas, productMap));
    } finally {
      setLoading(false);
    }
  }, [empresaId, products, stockMovements, computeFIFO, dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalGeral = useMemo(() => rows.reduce((s, r) => s + r.total, 0), [rows]);
  const totalStock = useMemo(() => (rows.length > 0 ? rows[rows.length - 1].total_stock || totalGeral : 0), [rows, totalGeral]);

  const handleExportCSV = () => {
    const headers = 'Data,Doc Nº,Fornecedor,DataValidade,Descrição,Numero Serie,Qtd/Unit,V. Unit,Total,Total Stock\n';
    const csvRows = rows.map((r) =>
      [
        fmtDate(r.data),
        r.doc_numero,
        r.fornecedor,
        fmtDate(r.data_validade),
        r.descricao,
        r.numero_serie,
        `${r.quantidade} ${r.unidade}`,
        fmtKz(r.v_unit),
        fmtKz(r.total),
        fmtKz(r.total_stock || 0),
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    );
    const blob = new Blob([headers + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `valorizacao_stock_FIFO_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const thCls = 'px-2 py-1.5 text-left text-[10px] font-bold text-zinc-700 whitespace-nowrap';

  return (
    <div className="bg-white border border-zinc-200 shadow-sm">
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Calendar size={13} className="text-zinc-400" />
            <label className="text-[10px] text-zinc-500">De:</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border border-zinc-300 text-[11px] px-2 py-0.5 focus:outline-none ml-1"
            />
          </div>
          <div className="flex items-center gap-1">
            <label className="text-[10px] text-zinc-500">Até:</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border border-zinc-300 text-[11px] px-2 py-0.5 focus:outline-none ml-1"
            />
          </div>
          <button
            onClick={fetchData}
            className="p-1 bg-zinc-100 hover:bg-zinc-200 cursor-pointer"
            title="Atualizar"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin text-blue-600' : 'text-zinc-600'} />
          </button>
        </div>
        {/* Excel button top-right like image */}
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-[11px] font-bold cursor-pointer"
          title="Exportar para Excel/CSV"
        >
          <FileSpreadsheet size={13} />
          Excel
        </button>
      </div>

      {/* Title bar */}
      <div className="bg-zinc-200 border-b border-zinc-300 px-3 py-1.5">
        <span className="text-[11px] font-bold text-zinc-800">Valorização de Stocks (FIFO)</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-300">
              <th className={thCls} rowSpan={2}>Data</th>
              <th className={thCls} rowSpan={2}>Doc Nº</th>
              <th className={thCls} rowSpan={2}>Fornecedor</th>
              <th className={thCls} rowSpan={2}>DataValidade</th>
              <th className={thCls} rowSpan={2}>Descrição</th>
              <th className={thCls} rowSpan={2}>Numero Serie</th>
              <th
                colSpan={3}
                className="px-2 py-1 text-center text-[10px] font-bold text-[#003366] border-b border-zinc-300"
              >
                Valor Total de Stock
              </th>
              <th
                className="px-2 py-1 text-right text-[10px] font-bold text-zinc-700 whitespace-nowrap"
                rowSpan={2}
              >
                Total Stock
              </th>
            </tr>
            <tr className="bg-zinc-50 border-b border-zinc-300">
              <th className={thCls}>Qld / Unit</th>
              <th className={thCls}>V. Unit</th>
              <th className={thCls}>Total</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="text-center py-8 text-xs text-zinc-500">
                  <RefreshCw size={16} className="animate-spin mx-auto mb-1 text-blue-500" />
                  A calcular valorização FIFO...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-8 text-zinc-400 text-xs italic">
                  Sem dados de valorização de stock. Registe entradas de stock para ver a valorização FIFO.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr key={row.id + idx} className="hover:bg-blue-50 transition-colors border-b border-zinc-100">
                  <td className="px-2 py-1 text-[11px] text-zinc-700 whitespace-nowrap">{fmtDate(row.data)}</td>
                  <td className="px-2 py-1 text-[11px] text-blue-700 font-medium whitespace-nowrap">{row.doc_numero}</td>
                  <td className="px-2 py-1 text-[11px] text-zinc-700 whitespace-nowrap">{row.fornecedor}</td>
                  <td className="px-2 py-1 text-[11px] text-zinc-700 whitespace-nowrap">{fmtDate(row.data_validade)}</td>
                  <td className="px-2 py-1 text-[11px] text-blue-600 whitespace-nowrap">{row.descricao}</td>
                  <td className="px-2 py-1 text-[11px] text-zinc-500 whitespace-nowrap">{row.numero_serie}</td>
                  <td className="px-2 py-1 text-[11px] text-zinc-700 whitespace-nowrap">{row.quantidade} {row.unidade}</td>
                  <td className="px-2 py-1 text-[11px] text-zinc-700 whitespace-nowrap text-right">{fmtKz(row.v_unit)}</td>
                  <td className="px-2 py-1 text-[11px] text-zinc-700 whitespace-nowrap text-right">{fmtKz(row.total)}</td>
                  <td className="px-2 py-1 text-[11px] font-bold text-[#003366] whitespace-nowrap text-right">
                    {fmtKz(row.total_stock || 0)}
                  </td>
                </tr>
              ))
            )}

            {/* Total row */}
            {rows.length > 0 && (
              <tr className="bg-zinc-100 border-t-2 border-zinc-400">
                <td colSpan={6} className="px-2 py-1.5 text-[11px] font-black text-zinc-800">
                  TOTAL GERAL
                </td>
                <td className="px-2 py-1.5 text-[11px] font-black text-zinc-800 text-right">—</td>
                <td className="px-2 py-1.5 text-[11px] font-black text-zinc-800 text-right">—</td>
                <td className="px-2 py-1.5 text-[11px] font-black text-[#003366] text-right">{fmtKz(totalGeral)} Kz</td>
                <td className="px-2 py-1.5 text-[11px] font-black text-[#003366] text-right">{fmtKz(totalStock)} Kz</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer note */}
      <div className="px-4 py-2 bg-zinc-50 border-t border-zinc-200">
        <p className="text-[10px] text-zinc-500">
          Método FIFO — Os lotes mais antigos são os primeiros a ser descontados pelas saídas registadas.
          Total de {rows.length} lote(s) em stock valorizado.
        </p>
      </div>
    </div>
  );
};
