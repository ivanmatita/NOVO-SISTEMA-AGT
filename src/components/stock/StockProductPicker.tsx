/**
 * StockProductPicker.tsx
 * Modal de seleção de produtos do stock para formulários de venda
 * Mostra apenas produtos com quantidade disponível > 0
 */
import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, Package, Warehouse, ChevronRight, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface StockProduct {
  id: string;
  name: string;
  nome?: string;
  referencia?: string;
  reference?: string;
  descricao?: string;
  description?: string;
  codigo_barras?: string;
  barcode?: string;
  armazem_id?: string | number;
  armazem_nome?: string;
  warehouse_id?: string | number;
  stock_quantity?: number;
  stock?: number;
  stock_atual?: number;
  price?: number;
  preco_venda?: number;
  unit?: string;
  unidade?: string;
  tipo?: string;
  taxa_iva?: number;
  iva_rate?: number;
}

interface StockProductPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (product: StockProduct) => void;
  warehouses?: Array<{ id: string | number; name?: string; nome?: string }>;
  selectedWarehouseId?: string;
}

export const StockProductPicker: React.FC<StockProductPickerProps> = ({
  isOpen,
  onClose,
  onSelect,
  warehouses = [],
  selectedWarehouseId,
}) => {
  const { user } = useAuth();
  const [products, setProducts] = useState<StockProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterWarehouse, setFilterWarehouse] = useState(selectedWarehouseId || 'all');

  useEffect(() => {
    if (isOpen) {
      loadProducts();
      setSearchTerm('');
    }
  }, [isOpen]);

  const loadProducts = async () => {
    if (!user?.empresa_id && !user?.company_id) return;
    const empresaId = user.empresa_id || user.company_id;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('produtos')
        .select('id, name, nome, referencia, reference, descricao, description, codigo_barras, barcode, armazem_id, warehouse_id, stock_quantity, stock, stock_atual, estoque_atual, price, preco_venda, unit, unidade, tipo, taxa_iva, iva_rate')
        .eq('empresa_id', empresaId)
        .eq('is_active', true)
        .order('name', { ascending: true });
      
      if (!error && data) {
        // Só produtos com stock > 0
        const withStock = data.filter(p => {
          const qty = Number(p.stock_quantity ?? p.stock ?? p.stock_atual ?? (p as any).estoque_atual ?? 0);
          return qty > 0;
        });
        setProducts(withStock);
      }
    } catch (err) {
      console.error('[StockProductPicker] Erro ao carregar:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    let list = products;
    if (filterWarehouse !== 'all') {
      list = list.filter(p => String(p.armazem_id || p.warehouse_id) === String(filterWarehouse));
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(p =>
        (p.name || p.nome || '').toLowerCase().includes(q) ||
        (p.referencia || p.reference || '').toLowerCase().includes(q) ||
        (p.codigo_barras || p.barcode || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [products, searchTerm, filterWarehouse]);

  const getStock = (p: StockProduct) =>
    Number(p.stock_quantity ?? p.stock ?? p.stock_atual ?? (p as any).estoque_atual ?? 0);
  
  const getPrice = (p: StockProduct) =>
    Number(p.price ?? p.preco_venda ?? 0);

  const getWarehouseName = (p: StockProduct) => {
    const wId = p.armazem_id || p.warehouse_id;
    if (!wId) return '—';
    const w = warehouses.find(wh => String(wh.id) === String(wId));
    return w ? (w.name || w.nome || `Armazém ${wId}`) : `Arm. ${wId}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 max-h-[85vh] flex flex-col border border-zinc-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-gradient-to-r from-[#003366] to-[#004488] rounded-t-xl">
          <div className="flex items-center gap-3">
            <Package className="text-white" size={22} />
            <div>
              <h2 className="text-white font-bold text-base">Seleccionar Produto do Stock</h2>
              <p className="text-blue-200 text-xs">Produtos com stock disponível</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition">
            <X size={20} />
          </button>
        </div>

        {/* Filtros */}
        <div className="px-4 py-3 border-b border-zinc-100 flex flex-wrap gap-3 bg-zinc-50">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input
              type="text"
              placeholder="Pesquisar por nome, referência ou código de barras..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:border-[#003366] bg-white"
              autoFocus
            />
          </div>
          {warehouses.length > 0 && (
            <select
              value={filterWarehouse}
              onChange={e => setFilterWarehouse(e.target.value)}
              className="px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:border-[#003366] bg-white min-w-[160px]"
            >
              <option value="all">Todos os Armazéns</option>
              {warehouses.map(w => (
                <option key={w.id} value={String(w.id)}>{w.name || w.nome}</option>
              ))}
            </select>
          )}
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-zinc-400">
              <div className="animate-spin w-8 h-8 border-2 border-[#003366] border-t-transparent rounded-full mr-3" />
              <span>A carregar produtos...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
              <Package size={40} className="mb-3 opacity-30" />
              <p className="font-medium">Nenhum produto disponível</p>
              <p className="text-xs mt-1">Sem stock ou sem correspondência com a pesquisa</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 sticky top-0">
                <tr className="text-xs font-bold text-zinc-500 uppercase tracking-wider border-b border-zinc-200">
                  <th className="px-4 py-3 text-left">Produto</th>
                  <th className="px-4 py-3 text-left">Armazém</th>
                  <th className="px-4 py-3 text-right">Disponível</th>
                  <th className="px-4 py-3 text-right">Preço Venda</th>
                  <th className="px-4 py-3 text-left">Unidade</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.map(p => (
                  <tr
                    key={p.id}
                    onClick={() => { onSelect(p); onClose(); }}
                    className="hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-zinc-900">{p.name || p.nome}</p>
                      {(p.referencia || p.reference) && (
                        <p className="text-xs text-zinc-400">Ref: {p.referencia || p.reference}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 text-xs">{getWarehouseName(p)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold ${getStock(p) > 5 ? 'text-green-600' : 'text-amber-600'}`}>
                        {getStock(p)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-700">
                      {getPrice(p).toLocaleString('pt-AO', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">{p.unit || p.unidade || 'UN'}</td>
                    <td className="px-4 py-3">
                      <ChevronRight size={16} className="text-zinc-300" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-100 bg-zinc-50 rounded-b-xl flex items-center justify-between">
          <span className="text-xs text-zinc-400">{filtered.length} produto(s) disponíveis</span>
          <button onClick={onClose} className="text-sm text-zinc-500 hover:text-zinc-700 font-medium px-3 py-1 rounded">Cancelar</button>
        </div>
      </div>
    </div>
  );
};

export default StockProductPicker;
