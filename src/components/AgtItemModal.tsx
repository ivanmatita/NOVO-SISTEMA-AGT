import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ArrowLeft, Plus, Package, ChevronDown, Search, X, Maximize2 } from 'lucide-react';
import { StockProductPicker } from './stock/StockProductPicker';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface AgtItemData {
  id?: string | number;
  product_id?: string | number;
  tipo_operacao?: string;
  quantity: number;
  description: string;
  referencia?: string;
  unidade_medida?: string;
  warehouse_id?: string | number;
  armazem_id?: string | number;
  tipo_artigo?: string;
  unit_price: number;
  desconto?: number;
  preco_com_desconto?: number;
  valor_credito?: number;
  has_imposto: boolean;
  imposto_tab?: 'impostos' | 'retencoes';
  tipo_imposto?: string;
  tem_isencao: boolean;
  codigo_imposto?: string;
  taxa_imposto: number;
  valor_imposto: number;
  total: number;
  tax_applied_label?: string;
}

interface AgtItemModalProps {
  isOpen: boolean;
  initialItem?: AgtItemData | null;
  products?: any[];
  activeTaxes?: any[];
  warehouses?: any[];
  onClose: () => void;
  onSave: (item: AgtItemData) => void;
}

export const AgtItemModal: React.FC<AgtItemModalProps> = ({
  isOpen,
  initialItem,
  products = [],
  activeTaxes = [],
  warehouses = [],
  onClose,
  onSave
}) => {
  const { user } = useAuth();
  const [tipoOperacao, setTipoOperacao] = useState(initialItem?.tipo_operacao || 'IS (1%)');
  const [quantity, setQuantity] = useState<number>(initialItem?.quantity || 1);
  const [description, setDescription] = useState(initialItem?.description || '');
  const [unidadeMedida, setUnidadeMedida] = useState(initialItem?.unidade_medida || 'QUANTIDADE (Qtd)');
  const [unitPrice, setUnitPrice] = useState<number>(initialItem?.unit_price || 0);
  const [desconto, setDesconto] = useState<number>(initialItem?.desconto || 0);
  const [valorCredito, setValorCredito] = useState<number>(initialItem?.valor_credito || 0);
  const [hasImposto, setHasImposto] = useState<boolean>(initialItem?.has_imposto ?? true);
  const [activeTab, setActiveTab] = useState<'impostos' | 'retencoes'>('impostos');
  const [tipoImposto, setTipoImposto] = useState(initialItem?.tipo_imposto || 'IS');
  const [temIsencao, setTemIsencao] = useState<boolean>(initialItem?.tem_isencao || false);
  const [codigoImposto, setCodigoImposto] = useState(initialItem?.codigo_imposto || 'IS_1');
  const [taxaImposto, setTaxaImposto] = useState<number>(initialItem?.taxa_imposto ?? 1);
  const [showStockPicker, setShowStockPicker] = useState<boolean>(false);
  const [isStockDropdownOpen, setIsStockDropdownOpen] = useState<boolean>(false);
  const [stockSearch, setStockSearch] = useState<string>('');
  const [stockWarehouseFilter, setStockWarehouseFilter] = useState<string>('all');
  const [stockProducts, setStockProducts] = useState<any[]>([]);
  const [loadingStock, setLoadingStock] = useState<boolean>(false);
  const [selectedStockLabel, setSelectedStockLabel] = useState<string>('');
  const [selectedProductId, setSelectedProductId] = useState<string | number | undefined>(initialItem?.product_id);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | number | undefined>((initialItem as any)?.warehouse_id);
  const [referencia, setReferencia] = useState<string>(initialItem?.referencia || '');
  const stockDropdownRef = useRef<HTMLDivElement>(null);

  const mapUnitToSelectOption = (rawUnit?: string): string => {
    const u = String(rawUnit || '').trim().toLowerCase();
    if (!u) return 'QUANTIDADE (Qtd)';
    if (u.includes('unidade') || u === 'un' || u === 'und' || u === 'uni') return 'UNIDADE (Un)';
    if (u.includes('kilograma') || u.includes('quilo') || u === 'kg') return 'KILOGRAMA (Kg)';
    if (u.includes('metro') || u === 'm' || u === 'mt') return 'METRO (m)';
    if (u.includes('caixa') || u === 'cx') return 'CAIXA (Cx)';
    if (u.includes('hora') || u === 'h' || u === 'hr') return 'HORAS (h)';
    if (u.includes('serv')) return 'SERVIÇO (Serv)';
    const exactMatch = [
      'QUANTIDADE (Qtd)',
      'UNIDADE (Un)',
      'KILOGRAMA (Kg)',
      'METRO (m)',
      'CAIXA (Cx)',
      'HORAS (h)',
      'SERVIÇO (Serv)'
    ].find(opt => opt.toLowerCase() === u);
    return exactMatch || 'QUANTIDADE (Qtd)';
  };

  useEffect(() => {
    if (initialItem) {
      setTipoOperacao(initialItem.tipo_operacao || 'IS (1%)');
      setQuantity(initialItem.quantity || 1);
      setDescription(initialItem.description || '');
      setUnidadeMedida(mapUnitToSelectOption(initialItem.unidade_medida));
      setUnitPrice(initialItem.unit_price || 0);
      setDesconto(initialItem.desconto || 0);
      setValorCredito(initialItem.valor_credito || 0);
      setHasImposto(initialItem.has_imposto ?? true);
      setTipoImposto(initialItem.tipo_imposto || 'IS');
      setTemIsencao(initialItem.tem_isencao || false);
      setCodigoImposto(initialItem.codigo_imposto || 'IS_1');
      setTaxaImposto(initialItem.taxa_imposto ?? 1);
      setSelectedProductId(initialItem.product_id);
      setSelectedWarehouseId((initialItem as any).warehouse_id);
      setReferencia(initialItem.referencia || '');
      setSelectedStockLabel(initialItem.product_id ? (initialItem.description || '') : '');
      setIsStockDropdownOpen(false);
    } else {
      handleClear();
    }
  }, [initialItem, isOpen]);

  // Fechar dropdown ao clicar fora ou pressionar Escape
  useEffect(() => {
    if (!isStockDropdownOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (stockDropdownRef.current && !stockDropdownRef.current.contains(event.target as Node)) {
        setIsStockDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsStockDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isStockDropdownOpen]);

  // Carregar produtos do stock do Supabase + prop products quando abrir modal ou dropdown
  useEffect(() => {
    if (!isOpen) return;
    const activeProps = (Array.isArray(products) ? products : []).filter(
      (p: any) => p && p.is_active !== false && p.ativo !== false
    );
    if (activeProps.length > 0) {
      setStockProducts(activeProps);
    }

    const empresaId = user?.empresa_id || (user as any)?.company_id;
    if (!empresaId) return;

    let cancelled = false;
    const fetchStock = async () => {
      setLoadingStock(true);
      try {
        let { data, error } = await supabase
          .from('produtos')
          .select('id, name, nome, referente, codigo, code, barcode, descricao, description, armazem_id, warehouse_id, stock_quantity, stock, stock_atual, estoque_atual, price, preco, preco_venda, unit, unidade, tipo, iva_taxa, taxa_imposto, codigo_imposto, motivo_isencao, tax_id, is_active, ativo')
          .eq('empresa_id', empresaId)
          .order('name', { ascending: true });

        if (error?.code === '42703') {
          const fallbackRes = await supabase
            .from('produtos')
            .select('*')
            .eq('empresa_id', empresaId)
            .order('name', { ascending: true });
          data = fallbackRes.data;
          error = fallbackRes.error;
        }

        if (!cancelled && !error && Array.isArray(data)) {
          const filteredRows = data.filter((p: any) => p.is_active !== false && p.ativo !== false);
          setStockProducts(filteredRows.length > 0 ? filteredRows : activeProps);
        }
      } catch (err) {
        console.warn('[AgtItemModal] Fallback para produtos em memória:', err);
      } finally {
        if (!cancelled) setLoadingStock(false);
      }
    };

    fetchStock();
    return () => { cancelled = true; };
  }, [isOpen, user?.empresa_id]);

  const getProductStockQty = (p: any) =>
    Number(p.stock_quantity ?? p.stock ?? p.stock_atual ?? p.estoque_atual ?? 0);

  const getProductSalePrice = (p: any) =>
    Number(p.price ?? p.preco_venda ?? p.preco ?? 0);

  const getProductWarehouseName = (p: any) => {
    const wId = p.armazem_id || p.warehouse_id;
    if (!wId) return '';
    const found = warehouses.find((w: any) => String(w.id) === String(wId));
    return found ? (found.name || found.nome || '') : '';
  };

  const filteredStockProducts = useMemo(() => {
    let list = [...stockProducts];
    if (stockWarehouseFilter !== 'all') {
      list = list.filter(p => String(p.armazem_id || p.warehouse_id) === String(stockWarehouseFilter));
    }
    if (stockSearch.trim()) {
      const q = stockSearch.trim().toLowerCase();
      list = list.filter(p =>
        String(p.name || p.nome || '').toLowerCase().includes(q) ||
        String(p.referente || p.codigo || p.code || p.referencia || p.reference || '').toLowerCase().includes(q) ||
        String(p.barcode || p.codigo_barras || '').toLowerCase().includes(q) ||
        String(p.descricao || p.description || '').toLowerCase().includes(q)
      );
    }
    // Produtos com stock > 0 aparecem primeiro
    return list.sort((a, b) => {
      const sa = getProductStockQty(a);
      const sb = getProductStockQty(b);
      if ((sa > 0) !== (sb > 0)) return sb > 0 ? 1 : -1;
      return String(a.name || a.nome || '').localeCompare(String(b.name || b.nome || ''), 'pt');
    });
  }, [stockProducts, stockSearch, stockWarehouseFilter]);

  const handleClear = () => {
    setTipoOperacao('IS (1%)');
    setQuantity(1);
    setDescription('');
    setUnidadeMedida('QUANTIDADE (Qtd)');
    setUnitPrice(0);
    setDesconto(0);
    setValorCredito(0);
    setHasImposto(true);
    setActiveTab('impostos');
    setTipoImposto('IS');
    setTemIsencao(false);
    setCodigoImposto('IS_1');
    setTaxaImposto(1);
    setSelectedProductId(undefined);
    setSelectedWarehouseId(undefined);
    setReferencia('');
    setSelectedStockLabel('');
    setStockSearch('');
    setIsStockDropdownOpen(false);
  };

  const handleSelectStockProduct = (prod: any) => {
    const prodName = prod.name || prod.nome || '';
    const prodDesc = prod.descricao || prod.description || '';
    const finalDesc = prodDesc && prodDesc.toLowerCase() !== prodName.toLowerCase()
      ? `${prodName} - ${prodDesc}`.slice(0, 200)
      : prodName.slice(0, 200);
    const prodRef = prod.referente || prod.referencia || prod.reference || prod.codigo || prod.code || '';

    setDescription(finalDesc);
    setUnitPrice(getProductSalePrice(prod));
    setUnidadeMedida(mapUnitToSelectOption(prod.unit || prod.unidade));
    setQuantity(1);
    setSelectedProductId(prod.id);
    setSelectedWarehouseId(prod.warehouse_id || prod.armazem_id);
    setReferencia(prodRef);
    setSelectedStockLabel(prodRef ? `${prodName} (${prodRef})` : prodName);

    // Mapear imposto do produto se configurado
    const matchedTax = prod.tax_id
      ? activeTaxes.find((t: any) => String(t.id) === String(prod.tax_id))
      : undefined;
    const rawRate = matchedTax?.taxa ?? prod.taxa_imposto ?? prod.iva_taxa;
    if (rawRate !== undefined && rawRate !== null && rawRate !== '') {
      const rateNum = Number(rawRate);
      if (rateNum === 14) {
        setHasImposto(true);
        setTemIsencao(false);
        setTipoImposto('IVA');
        setTaxaImposto(14);
        setCodigoImposto('IVA_14');
        setTipoOperacao('IVA (14%)');
      } else if (rateNum === 7) {
        setHasImposto(true);
        setTemIsencao(false);
        setTipoImposto('IVA');
        setTaxaImposto(7);
        setCodigoImposto('IVA_7');
        setTipoOperacao('IVA (7%)');
      } else if (rateNum === 1) {
        setHasImposto(true);
        setTemIsencao(false);
        setTipoImposto('IS');
        setTaxaImposto(1);
        setCodigoImposto('IS_1');
        setTipoOperacao('IS (1%)');
      } else if (rateNum === 0) {
        setHasImposto(true);
        setTemIsencao(true);
        setTipoImposto('NS');
        setTaxaImposto(0);
        setCodigoImposto(prod.motivo_isencao || 'M00');
        setTipoOperacao('Isenção Artigo 12.º');
      }
    }

    setIsStockDropdownOpen(false);
    setShowStockPicker(false);
  };

  if (!isOpen) return null;

  // Calculos
  const precoComDesconto = Math.max(0, unitPrice * (1 - (desconto / 100)));
  const subtotalSemImposto = precoComDesconto * quantity;
  const currentTaxa = hasImposto ? (temIsencao ? 0 : taxaImposto) : 0;
  const valorImpostoCalculado = (subtotalSemImposto * currentTaxa) / 100;
  const totalItem = subtotalSemImposto + valorImpostoCalculado;

  const getTaxLabel = () => {
    if (!hasImposto) return 'Sem imposto';
    if (temIsencao) return 'Isento (0%)';
    if (tipoImposto === 'IS') return `IS (${taxaImposto}%)`;
    if (tipoImposto === 'IVA') return `IVA (${taxaImposto}%)`;
    return `${tipoImposto} (${taxaImposto}%)`;
  };

  const handleSelectTipoImposto = (tipo: string) => {
    setTipoImposto(tipo);
    if (tipo === 'IS') {
      setTaxaImposto(1);
      setCodigoImposto('IS_1');
    } else if (tipo === 'IVA') {
      setTaxaImposto(14);
      setCodigoImposto('IVA_14');
    } else {
      setTaxaImposto(0);
      setCodigoImposto('ISENTO');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      alert('Por favor insira a descrição do produto ou serviço.');
      return;
    }

    const item: AgtItemData = {
      id: initialItem?.id,
      product_id: selectedProductId || initialItem?.product_id,
      tipo_operacao: tipoOperacao,
      quantity: Number(quantity) || 1,
      description: description.trim(),
      referencia: referencia || initialItem?.referencia,
      unidade_medida: unidadeMedida,
      warehouse_id: selectedWarehouseId,
      armazem_id: selectedWarehouseId,
      tipo_artigo: selectedProductId ? 'produto' : 'servico',
      unit_price: Number(unitPrice) || 0,
      desconto: Number(desconto) || 0,
      preco_com_desconto: precoComDesconto,
      valor_credito: Number(valorCredito) || 0,
      has_imposto: hasImposto,
      imposto_tab: activeTab,
      tipo_imposto: tipoImposto,
      tem_isencao: temIsencao,
      codigo_imposto: codigoImposto,
      taxa_imposto: currentTaxa,
      valor_imposto: valorImpostoCalculado,
      total: totalItem,
      tax_applied_label: getTaxLabel()
    };

    onSave(item);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[300] flex justify-end items-stretch bg-zinc-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col border-l border-zinc-200 animate-in slide-in-from-right duration-200">
        
        {/* Header matching FORM 2.PNG */}
        <div className="p-6 border-b border-zinc-200 flex justify-between items-center bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="text-zinc-600 hover:text-zinc-900 transition-colors p-1"
            >
              <ArrowLeft size={22} />
            </button>
            <h2 className="text-xl font-bold text-[#0f2a4a] tracking-tight">
              {initialItem ? 'Editar Bem ou Serviço' : 'Adicionar Bem ou Serviço'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClear}
              className="px-6 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-sm font-semibold rounded-none transition-colors"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-6 py-2 bg-[#0f2a4a] hover:bg-[#001f3f] text-white text-sm font-bold rounded-none shadow-md transition-colors"
            >
              Adicionar
            </button>
          </div>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6 flex-1 overflow-y-auto text-zinc-800">
          
          {/* Row 1: Tipo de Operação & Quantidade */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-700">
                Tipo de Operação <span className="text-red-500">*</span>
              </label>
              <select
                value={tipoOperacao}
                onChange={(e) => {
                  setTipoOperacao(e.target.value);
                  if (e.target.value.includes('IVA')) {
                    handleSelectTipoImposto('IVA');
                  } else if (e.target.value.includes('IS')) {
                    handleSelectTipoImposto('IS');
                  }
                }}
                className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2.5 text-sm text-zinc-800 focus:outline-none focus:border-[#0f2a4a]"
              >
                <option value="IS (1%)">IS (1%) - Imposto de Selo</option>
                <option value="IVA (14%)">IVA (14%) - Taxa Geral</option>
                <option value="IVA (7%)">IVA (7%) - Taxa Reduzida</option>
                <option value="Isenção Artigo 12.º">Isenção Artigo 12.º (Lei do IVA)</option>
                <option value="Prestação de Serviços">Prestação de Serviços</option>
                <option value="Transmissão de Bens">Transmissão de Bens</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-700">
                Quantidade <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0.01"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(0, Number(e.target.value)))}
                className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2.5 text-sm font-semibold text-zinc-800 focus:outline-none focus:border-[#0f2a4a]"
                required
              />
            </div>
          </div>

          {/* Row 2: Campo Buscar do Stock (com seta que abre lista de stock) + Descrição */}
          <div className="space-y-4">
            <div className="space-y-1.5 relative" ref={stockDropdownRef}>
              <label className="text-xs font-bold text-zinc-700 flex items-center gap-1.5">
                <Package size={13} className="text-emerald-700" />
                <span>Buscar do Stock</span>
              </label>

              <div className="flex items-stretch">
                <button
                  type="button"
                  onClick={() => setIsStockDropdownOpen(prev => !prev)}
                  className="flex-1 flex items-center justify-between bg-emerald-50/60 hover:bg-emerald-50 border border-emerald-300 rounded-none px-4 py-2.5 text-sm text-left transition-colors cursor-pointer"
                  aria-expanded={isStockDropdownOpen}
                  title="Clique para abrir a lista de produtos do stock"
                >
                  <span className={selectedStockLabel ? 'font-semibold text-emerald-950 truncate' : 'text-zinc-500 truncate'}>
                    {selectedStockLabel || 'Selecionar produto do stock...'}
                  </span>
                  <span className="flex items-center gap-2 ml-2 shrink-0">
                    {selectedStockLabel && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStockLabel('');
                          setSelectedProductId(undefined);
                          setSelectedWarehouseId(undefined);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedStockLabel('');
                            setSelectedProductId(undefined);
                            setSelectedWarehouseId(undefined);
                          }
                        }}
                        className="p-0.5 text-zinc-400 hover:text-zinc-700"
                        title="Limpar seleção de stock"
                      >
                        <X size={14} />
                      </span>
                    )}
                    <ChevronDown
                      size={18}
                      className={`text-emerald-700 transition-transform duration-150 ${isStockDropdownOpen ? 'rotate-180' : ''}`}
                    />
                  </span>
                </button>
              </div>

              {/* Lista Dropdown do Stock */}
              {isStockDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-zinc-300 shadow-xl flex flex-col max-h-80">
                  <div className="p-2.5 border-b border-zinc-200 bg-zinc-50 flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[160px]">
                      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="text"
                        value={stockSearch}
                        onChange={(e) => setStockSearch(e.target.value)}
                        placeholder="Filtrar produto, código ou referência..."
                        className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border border-zinc-300 rounded-none focus:outline-none focus:border-[#0f2a4a]"
                        autoFocus
                      />
                    </div>
                    {warehouses.length > 0 && (
                      <select
                        value={stockWarehouseFilter}
                        onChange={(e) => setStockWarehouseFilter(e.target.value)}
                        className="px-2 py-1.5 text-xs bg-white border border-zinc-300 rounded-none focus:outline-none focus:border-[#0f2a4a]"
                      >
                        <option value="all">Todos Armazéns</option>
                        {warehouses.map((w: any) => (
                          <option key={w.id} value={String(w.id)}>{w.name || w.nome}</option>
                        ))}
                      </select>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setIsStockDropdownOpen(false);
                        setShowStockPicker(true);
                      }}
                      className="px-2 py-1.5 text-[11px] font-bold text-[#0f2a4a] bg-white border border-zinc-300 hover:bg-zinc-100 flex items-center gap-1"
                      title="Abrir vista completa de stock"
                    >
                      <Maximize2 size={12} />
                      <span>Expandir</span>
                    </button>
                  </div>

                  <div className="overflow-y-auto divide-y divide-zinc-100 max-h-60">
                    {loadingStock && filteredStockProducts.length === 0 ? (
                      <div className="p-6 text-center text-xs text-zinc-500">
                        A carregar produtos do stock...
                      </div>
                    ) : filteredStockProducts.length === 0 ? (
                      <div className="p-6 text-center text-xs text-zinc-400">
                        Nenhum produto encontrado no stock.
                      </div>
                    ) : (
                      filteredStockProducts.map((prod: any) => {
                        const qty = getProductStockQty(prod);
                        const priceVal = getProductSalePrice(prod);
                        const whName = getProductWarehouseName(prod);
                        const refVal = prod.referente || prod.codigo || prod.code || prod.referencia || '';
                        const isSelected = selectedProductId && String(selectedProductId) === String(prod.id);

                        return (
                          <button
                            key={prod.id}
                            type="button"
                            onClick={() => handleSelectStockProduct(prod)}
                            className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                              isSelected ? 'bg-emerald-50 border-l-4 border-l-emerald-600' : 'hover:bg-blue-50/70'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-bold text-zinc-900 truncate">
                                {prod.name || prod.nome || 'Sem nome'}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-500 mt-0.5">
                                {refVal && <span>Ref: {refVal}</span>}
                                {whName && <span>• {whName}</span>}
                                <span>• {prod.unit || prod.unidade || 'Un'}</span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-xs font-mono font-bold text-[#0f2a4a]">
                                {priceVal.toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kz
                              </div>
                              <div className={`text-[11px] font-bold ${qty > 5 ? 'text-emerald-600' : qty > 0 ? 'text-amber-600' : 'text-red-500'}`}>
                                Stock: {qty}
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-700">
                Descrição <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <textarea
                  rows={3}
                  maxLength={200}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Informe a descrição do produto ou serviço..."
                  className="w-full bg-white border border-zinc-300 rounded-none p-4 text-sm text-zinc-800 focus:outline-none focus:border-[#0f2a4a] resize-none"
                  required
                />
                <span className="absolute bottom-2 right-3 text-[11px] text-zinc-400 font-mono">
                  {description.length}/200
                </span>
              </div>
            </div>
          </div>

          {/* Row 3: Unidade de medida & Preço unitário */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-700">
                Unidade de medida <span className="text-red-500">*</span>
              </label>
              <select
                value={unidadeMedida}
                onChange={(e) => setUnidadeMedida(e.target.value)}
                className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2.5 text-sm text-zinc-800 focus:outline-none focus:border-[#0f2a4a]"
              >
                <option value="QUANTIDADE (Qtd)">QUANTIDADE (Qtd)</option>
                <option value="UNIDADE (Un)">UNIDADE (Un)</option>
                <option value="KILOGRAMA (Kg)">KILOGRAMA (Kg)</option>
                <option value="METRO (m)">METRO (m)</option>
                <option value="CAIXA (Cx)">CAIXA (Cx)</option>
                <option value="HORAS (h)">HORAS (h)</option>
                <option value="SERVIÇO (Serv)">SERVIÇO (Serv)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-700">
                Preço unitário (sem impostos e descontos) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                value={unitPrice || ''}
                onChange={(e) => setUnitPrice(Math.max(0, Number(e.target.value)))}
                placeholder="Informe o preço unitário (sem impostos e descon..."
                className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2.5 text-sm font-semibold text-zinc-800 focus:outline-none focus:border-[#0f2a4a]"
                required
              />
            </div>
          </div>

          {/* Row 4: Preço unitário com descontos & Valor do crédito */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-700">
                Preço unitário com descontos (sem imposto)
              </label>
              <input
                type="text"
                readOnly
                value={`${precoComDesconto.toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kz`}
                className="w-full bg-zinc-100 border border-zinc-200 rounded-none px-4 py-2.5 text-sm font-semibold text-zinc-600 cursor-not-allowed"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-700">
                Valor do crédito
              </label>
              <input
                type="number"
                step="any"
                value={valorCredito || ''}
                onChange={(e) => setValorCredito(Number(e.target.value))}
                placeholder="0.00"
                className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2.5 text-sm text-zinc-800 focus:outline-none focus:border-[#0f2a4a]"
              />
            </div>
          </div>

          {/* Row 5: Toggle Imposto */}
          <div className="pt-2 flex items-center gap-4">
            <button
              type="button"
              onClick={() => setHasImposto(!hasImposto)}
              className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 flex items-center ${
                hasImposto ? 'bg-[#0f2a4a]' : 'bg-zinc-300'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                  hasImposto ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
            <div>
              <p className="text-sm font-bold text-zinc-800">Imposto</p>
              <p className="text-xs text-zinc-400">Clique aqui para remover os impostos</p>
            </div>
          </div>

          {/* Section: Impostos / Retenções Tabs */}
          {hasImposto && (
            <div className="space-y-6 pt-4 border-t border-zinc-200">
              
              {/* Tab Header */}
              <div className="flex border-b border-zinc-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('impostos')}
                  className={`pb-3 px-4 text-sm font-bold flex items-center gap-2 transition-colors relative ${
                    activeTab === 'impostos'
                      ? 'text-[#0f2a4a] border-b-2 border-[#0f2a4a]'
                      : 'text-zinc-400 hover:text-zinc-600'
                  }`}
                >
                  Impostos
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('retencoes')}
                  className={`pb-3 px-4 text-sm font-bold flex items-center gap-2 transition-colors relative ${
                    activeTab === 'retencoes'
                      ? 'text-[#0f2a4a] border-b-2 border-[#0f2a4a]'
                      : 'text-zinc-400 hover:text-zinc-600'
                  }`}
                >
                  Retenções
                </button>
              </div>

              {activeTab === 'impostos' && (
                <div className="space-y-6">
                  
                  {/* Tipo de Imposto & Isenção */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-700">
                        Tipo de imposto <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={tipoImposto}
                        onChange={(e) => handleSelectTipoImposto(e.target.value)}
                        className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2.5 text-sm text-zinc-800 focus:outline-none focus:border-[#0f2a4a]"
                      >
                        <option value="IS">IS - Imposto de Selo</option>
                        <option value="IVA">IVA - Imposto sobre o Valor Acrescentado</option>
                        <option value="NS">NS - Não Sujeito</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-700">Tem isenção</label>
                      <div className="flex items-center gap-6 pt-2">
                        <label className="flex items-center gap-2 text-sm text-zinc-800 cursor-pointer font-medium">
                          <input
                            type="radio"
                            name="isencao"
                            checked={!temIsencao}
                            onChange={() => setTemIsencao(false)}
                            className="w-4 h-4 text-[#0f2a4a] focus:ring-[#0f2a4a]"
                          />
                          Não
                        </label>
                        <label className="flex items-center gap-2 text-sm text-zinc-800 cursor-pointer font-medium">
                          <input
                            type="radio"
                            name="isencao"
                            checked={temIsencao}
                            onChange={() => setTemIsencao(true)}
                            className="w-4 h-4 text-[#0f2a4a] focus:ring-[#0f2a4a]"
                          />
                          Sim
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Código de imposto & Taxa fixo */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-700">
                        Código de imposto, Rubrica IS, Código Pautal <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={codigoImposto}
                        onChange={(e) => {
                          setCodigoImposto(e.target.value);
                          if (e.target.value === 'IS_1') setTaxaImposto(1);
                          if (e.target.value === 'IVA_14') setTaxaImposto(14);
                          if (e.target.value === 'IVA_7') setTaxaImposto(7);
                          if (e.target.value === 'ISENTO') setTaxaImposto(0);
                        }}
                        className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2.5 text-sm text-zinc-800 focus:outline-none focus:border-[#0f2a4a]"
                      >
                        <option value="IS_1">IS (1%) - Recibos e Facturas</option>
                        <option value="IVA_14">IVA (14%) - Taxa Geral AGT</option>
                        <option value="IVA_7">IVA (7%) - Taxa Reduzida</option>
                        <option value="M00">M00 - Registo de Isenção Artigo 12.º</option>
                        <option value="M02">M02 - Transmissão de Bens Isenta</option>
                        <option value="M04">M04 - Prestação de Serviços Isenta</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-zinc-700">Taxa/Valor fixo</label>
                      <input
                        type="number"
                        value={taxaImposto}
                        onChange={(e) => setTaxaImposto(Number(e.target.value))}
                        className="w-full bg-zinc-100 border border-zinc-200 rounded-none px-4 py-2.5 text-sm font-semibold text-zinc-700"
                        readOnly={temIsencao}
                      />
                    </div>
                  </div>

                  {/* Valor do Imposto */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-700">Valor do imposto</label>
                    <input
                      type="text"
                      readOnly
                      value={`${valorImpostoCalculado.toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kz`}
                      className="w-full bg-zinc-100 border border-zinc-200 rounded-none px-4 py-2.5 text-sm font-semibold text-zinc-700 cursor-not-allowed"
                    />
                  </div>

                  {/* Botão Adicionar Imposto */}
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => alert(`Imposto ${getTaxLabel()} aplicado com sucesso.`)}
                      className="border border-[#0f2a4a] text-[#0f2a4a] hover:bg-[#0f2a4a] hover:text-white px-5 py-2 font-bold text-xs flex items-center gap-2 rounded-none transition-colors"
                    >
                      <Plus size={16} /> Adicionar imposto
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'retencoes' && (
                <div className="p-4 bg-zinc-50 border border-zinc-200 text-xs text-zinc-600 space-y-2">
                  <p className="font-bold text-[#0f2a4a]">Retenções na Fonte (IRT / II)</p>
                  <p>Sem retenção adicional configurada para este artigo.</p>
                </div>
              )}
            </div>
          )}
        </form>
      </div>

      {/* Modal de Seleção de Produtos do Stock */}
      {showStockPicker && (
        <StockProductPicker
          isOpen={showStockPicker}
          onClose={() => setShowStockPicker(false)}
          onSelect={handleSelectStockProduct}
          warehouses={warehouses}
          products={stockProducts}
        />
      )}
    </div>
  );
};
