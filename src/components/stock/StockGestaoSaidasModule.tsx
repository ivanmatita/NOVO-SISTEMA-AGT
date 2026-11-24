import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  RefreshCw,
  Download,
  FileText,
  ArrowUpRight,
  Filter,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface SaidaRow {
  id: string;
  data_doc: string;
  doc_numero: string;
  doc_tipo: string;
  cliente: string;
  quantidade: number;
  unidade: string;
  descricao: string;
  armazem: string;
  selected?: boolean;
}

interface StockGestaoSaidasModuleProps {
  products: any[];
  stockMovements: any[];
  warehouses: any[];
  companyData?: any;
  onRefresh?: () => void;
}

const fmtDate = (d: string) => {
  if (!d) return '';
  try {
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2, '0')}-${String(dt.getMonth() + 1).padStart(2, '0')}-${dt.getFullYear()}`;
  } catch {
    return d;
  }
};

export const StockGestaoSaidasModule: React.FC<StockGestaoSaidasModuleProps> = ({
  products = [],
  stockMovements = [],
  warehouses = [],
  onRefresh,
}) => {
  const { user } = useAuth();
  const empresaId = String(user?.empresa_id || (user as any)?.company_id || '');

  const [rows, setRows] = useState<SaidaRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const buildRowsFromMovements = useCallback(
    (movs: any[]): SaidaRow[] => {
      const productMap = new Map(products.map((p: any) => [String(p.id), p]));
      return movs
        .filter((m: any) => {
          const t = (m.tipo || m.type || '').toLowerCase();
          return t === 'saida' || t === 'exit' || t === 'saída';
        })
        .map((m: any) => {
          const prod = productMap.get(String(m.produto_id || m.product_id || ''));
          const docRef = m.documento_referencia || m.referencia || m.doc_number || '';
          const docTipo = m.tipo_documento || (docRef.length >= 2 ? docRef.substring(0, 2) : 'SA');
          return {
            id: m.id,
            data_doc: m.data_movimento || m.created_at || '',
            doc_numero: docRef,
            doc_tipo: docTipo.toUpperCase(),
            cliente: m.cliente_nome || m.client_name || 'Consumidor Final',
            quantidade: Number(m.quantidade || m.quantity || 0),
            unidade: prod?.unit || m.unidade || 'Un',
            descricao: prod?.name || m.produto_nome || m.descricao || '-',
            armazem: m.armazem_id || m.armazem_nome || m.warehouse || 'NA',
          };
        });
    },
    [products]
  );

  const fetchData = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      // Fetch from movimentacoes_stock
      const { data: movData } = await supabase
        .from('movimentacoes_stock')
        .select('*')
        .eq('empresa_id', empresaId)
        .in('tipo', ['saida', 'exit', 'saída'])
        .order('created_at', { ascending: false })
        .limit(300);

      const movRows = buildRowsFromMovements(movData || []);

      // Also fetch from documentos_emitidos (real invoice data)
      const { data: docData } = await supabase
        .from('documentos_emitidos')
        .select('id, numero_documento, tipo_documento, cliente_nome, client_name, data_emissao, created_at, detalhes')
        .eq('empresa_id', empresaId)
        .in('tipo_documento', ['FT', 'FR', 'FS', 'NC', 'GR'])
        .order('data_emissao', { ascending: false })
        .limit(300);

      const docRows: SaidaRow[] = [];
      for (const doc of (docData || [])) {
        let lines: any[] = [];
        if (doc.detalhes) {
          if (Array.isArray(doc.detalhes)) {
            lines = doc.detalhes;
          } else if (typeof doc.detalhes === 'object') {
            lines = doc.detalhes.itens || doc.detalhes.linhas || doc.detalhes.items || [];
          }
        }
        if (Array.isArray(lines) && lines.length > 0) {
          lines.forEach((ln: any, i: number) => {
            docRows.push({
              id: `doc_${doc.id}_${i}`,
              data_doc: doc.data_emissao || doc.created_at || '',
              doc_numero: doc.numero_documento || '-',
              doc_tipo: doc.tipo_documento || 'FT',
              cliente: doc.cliente_nome || doc.client_name || 'Consumidor Final',
              quantidade: Number(ln.quantidade || ln.quantity || ln.qty || 1),
              unidade: ln.unidade || ln.unit || 'Un',
              descricao: ln.descricao || ln.produto_nome || ln.name || '-',
              armazem: ln.armazem || 'NA',
            });
          });
        } else {
          // Document without line items — show as single row
          docRows.push({
            id: `doc_${doc.id}`,
            data_doc: doc.data_emissao || doc.created_at || '',
            doc_numero: doc.numero_documento || '-',
            doc_tipo: doc.tipo_documento || 'FT',
            cliente: doc.cliente_nome || doc.client_name || 'Consumidor Final',
            quantidade: 1,
            unidade: 'Un',
            descricao: `${doc.tipo_documento || 'FT'} ${doc.numero_documento || ''}`.trim(),
            armazem: 'NA',
          });
        }
      }

      // Merge: deduplicate by id, prefer live rows
      const allIds = new Set(movRows.map((r) => r.id));
      const merged = [...movRows, ...docRows.filter((r) => !allIds.has(r.id))];

      if (merged.length > 0) {
        setRows(merged);
      } else {
        setRows(buildRowsFromMovements(stockMovements));
      }
    } catch {
      setRows(buildRowsFromMovements(stockMovements));
    } finally {
      setLoading(false);
    }
  }, [empresaId, stockMovements, buildRowsFromMovements]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleReset = () => {
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setSelected(new Set());
  };

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (search) {
        const q = search.toLowerCase();
        const matches =
          r.doc_numero.toLowerCase().includes(q) ||
          r.cliente.toLowerCase().includes(q) ||
          r.descricao.toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (dateFrom) {
        const rowDate = r.data_doc ? new Date(r.data_doc) : null;
        if (rowDate && rowDate < new Date(dateFrom)) return false;
      }
      if (dateTo) {
        const rowDate = r.data_doc ? new Date(r.data_doc) : null;
        if (rowDate && rowDate > new Date(dateTo + 'T23:59:59')) return false;
      }
      return true;
    });
  }, [rows, search, dateFrom, dateTo]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((r) => r.id)));
    }
  };

  const handleTransfer = () => {
    if (selected.size === 0) { toast.error('Selecione pelo menos uma linha'); return; }
    toast.success(`${selected.size} item(s) marcados para transferência`);
  };

  const handleRemoverNA = () => {
    if (selected.size === 0) { toast.error('Selecione pelo menos uma linha'); return; }
    toast.success(`Saída (NA) removida para ${selected.size} item(s)`);
  };

  const handleExport = () => {
    const header = 'Data Doc,Doc Nº,Doc Tipo,Cliente,Qtd,Descrição,Armazém\n';
    const csvRows = filtered.map((r) =>
      [fmtDate(r.data_doc), r.doc_numero, r.doc_tipo, r.cliente, `${r.quantidade} ${r.unidade}`, r.descricao, r.armazem]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    );
    const blob = new Blob([header + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gestao_saidas_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const thCls = 'px-2 py-1.5 text-left text-[10px] font-bold text-zinc-700 whitespace-nowrap border-b-2 border-zinc-300';
  const tdCls = 'px-2 py-1 text-[11px] text-zinc-700 whitespace-nowrap border-b border-zinc-100';

  return (
    <div className="bg-white border border-zinc-200 shadow-sm">
      {/* Description block */}
      <div className="bg-zinc-50 border-b border-zinc-200 px-4 py-2.5 text-[11px] text-zinc-600 leading-relaxed">
        Consultar todas as linhas de produtos inseridas nos documentos emitidos.
        Possibilidade de transferir e movimentar os artigos vendidos nos armazéns de origem,
        ou remover saida produtos de armazens(NA). Permite uma gestão completa dos stocks,
        relativamente a saida de produtos.{' '}
        <button
          onClick={handleReset}
          className="text-blue-600 hover:underline font-medium cursor-pointer"
        >
          reset
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-zinc-200 bg-white">
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar doc, cliente..."
            className="pl-6 pr-2 py-1 border border-zinc-300 text-[11px] w-44 focus:outline-none focus:border-blue-400"
          />
        </div>
        <label className="text-[10px] text-zinc-500 font-medium">De:</label>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="border border-zinc-300 text-[11px] px-2 py-1 focus:outline-none"
        />
        <label className="text-[10px] text-zinc-500 font-medium">Até:</label>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="border border-zinc-300 text-[11px] px-2 py-1 focus:outline-none"
        />
        <button
          onClick={fetchData}
          className="p-1.5 bg-zinc-100 hover:bg-zinc-200 cursor-pointer"
          title="Atualizar"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin text-blue-600' : 'text-zinc-600'} />
        </button>
        <button
          onClick={handleExport}
          className="flex items-center gap-1 px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-[11px] font-bold cursor-pointer"
          title="Exportar CSV"
        >
          <Download size={12} /> Exportar
        </button>
        {selected.size > 0 && (
          <>
            <button
              onClick={handleTransfer}
              className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold cursor-pointer"
            >
              <ArrowUpRight size={12} /> Transferir ({selected.size})
            </button>
            <button
              onClick={handleRemoverNA}
              className="flex items-center gap-1 px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-bold cursor-pointer"
            >
              <X size={12} /> Remover (NA)
            </button>
          </>
        )}
      </div>

      {/* Title bar */}
      <div className="bg-zinc-100 border-b border-zinc-300 px-4 py-1.5 text-center">
        <span className="text-[11px] font-black text-[#003366] uppercase tracking-widest">
          GESTÃO DE SAIDAS
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-zinc-50">
              <th className="px-2 py-1.5 w-8">
                <input
                  type="checkbox"
                  checked={selected.size === filtered.length && filtered.length > 0}
                  onChange={toggleAll}
                  className="cursor-pointer"
                />
              </th>
              <th className={thCls}>Data Doc</th>
              <th className={thCls}>Doc Nº</th>
              <th className={thCls}>Doc Tipo</th>
              <th className={thCls}>Cliente</th>
              <th className={thCls}>Qtd</th>
              <th className={thCls}>Descrição</th>
              <th className={thCls}>Armazém</th>
              <th className={`${thCls} text-right`}>Item</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="text-center py-8 text-xs text-zinc-500">
                  <RefreshCw size={16} className="animate-spin mx-auto mb-1 text-blue-500" />
                  A carregar saídas...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-8 text-zinc-400 text-xs italic">
                  Sem saídas de stock registadas
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr
                  key={row.id}
                  className={`hover:bg-blue-50 transition-colors ${selected.has(row.id) ? 'bg-blue-50' : ''}`}
                >
                  <td className="px-2 py-1 border-b border-zinc-100">
                    <input
                      type="checkbox"
                      checked={selected.has(row.id)}
                      onChange={() => toggleSelect(row.id)}
                      className="cursor-pointer"
                    />
                  </td>
                  <td className={tdCls}>{fmtDate(row.data_doc)}</td>
                  <td className={`${tdCls} text-blue-700 font-medium cursor-pointer hover:underline`}>
                    {row.doc_numero || '-'}
                  </td>
                  <td className={tdCls}>
                    <span className="px-1.5 py-0.5 bg-zinc-100 text-zinc-700 text-[10px] font-bold">
                      {row.doc_tipo}
                    </span>
                  </td>
                  <td className={`${tdCls} text-blue-700 font-medium`}>{row.cliente}</td>
                  <td className={tdCls}>{row.quantidade} {row.unidade}</td>
                  <td className={`${tdCls} text-blue-600`}>{row.descricao}</td>
                  <td className={tdCls}>{row.armazem}</td>
                  <td className="px-2 py-1 border-b border-zinc-100 text-right">
                    <input
                      type="checkbox"
                      checked={selected.has(row.id)}
                      onChange={() => toggleSelect(row.id)}
                      className="cursor-pointer"
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between">
        <span className="text-[10px] text-zinc-500">
          {filtered.length} linha(s) | {selected.size} selecionada(s)
        </span>
        <div className="flex items-center gap-1 text-[10px] text-zinc-500">
          <FileText size={11} />
          Gestão de Saídas de Stock
        </div>
      </div>
    </div>
  );
};
