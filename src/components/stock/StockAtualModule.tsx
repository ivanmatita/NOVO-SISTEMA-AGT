import React, { useState, useMemo, useEffect } from 'react';
import {
  ShoppingCart, Package, Building2, Calculator,
  Search, Filter, RefreshCw, Plus, ArrowRightLeft, SlidersHorizontal,
  FileText, Eye, AlertTriangle, CheckCircle2, ShieldAlert, Download,
  Layers, ChevronRight, ChevronLeft, Home, TrendingUp, TrendingDown, Clock, Box, Pencil
} from 'lucide-react';
import { Product, Warehouse, StockMovement } from '../../types';
import { StockEntradasReport } from './StockEntradasReport';
import { ProductIndividualStockReport } from './ProductIndividualStockReport';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

interface StockAtualModuleProps {
  products: Product[];
  stockMovements: StockMovement[];
  warehouses: Warehouse[];
  onRefresh: () => void;
  onNavigateToPurchases?: () => void;
  onManageWarehouses?: () => void;
  onOpenAdjustment?: (product: Product) => void;
  onOpenTransfer?: (product: Product) => void;
  onViewProductDetail?: (product: Product) => void;
  onViewStockReport?: (product: Product) => void;
  onEditProduct?: (product: Product) => void;
  onNewProduct?: () => void;
}

export const StockAtualModule: React.FC<StockAtualModuleProps> = ({
  products,
  stockMovements,
  warehouses,
  onRefresh,
  onNavigateToPurchases,
  onManageWarehouses,
  onOpenAdjustment,
  onOpenTransfer,
  onViewProductDetail,
  onViewStockReport,
  onEditProduct,
  onNewProduct,
}) => {
  const { user } = useAuth();
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'positive' | 'negative' | 'low'>('all');
  const [loadingFresh, setLoadingFresh] = useState<boolean>(false);
  const [selectedProductForReport, setSelectedProductForReport] = useState<Product | null>(null);
  
  // Paginação
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Armazém selecionado atualmente (ou todos)
  const currentWarehouse = useMemo(() => {
    if (selectedWarehouseId === 'all') return null;
    return warehouses.find(w => String(w.id) === String(selectedWarehouseId)) || null;
  }, [selectedWarehouseId, warehouses]);

  // Sincronização e recarga automática quando o evento global disparar
  useEffect(() => {
    const handleRefreshEvent = () => {
      if (onRefresh) onRefresh();
    };
    window.addEventListener('refresh_stock', handleRefreshEvent);
    return () => window.removeEventListener('refresh_stock', handleRefreshEvent);
  }, [onRefresh]);

  // Resetar paginação ao filtrar ou pesquisar
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, selectedWarehouseId, pageSize]);

  // Função para verificar se um movimento pertence ao armazém selecionado
  const movementMatchesWarehouse = (m: StockMovement, wId: string) => {
    if (wId === 'all') return true;
    const movArmId = (m as any).armazem_id || m.warehouse_id;
    return String(movArmId) === String(wId);
  };

  // Cálculo consolidado de produtos e quantidades reais por armazém
  const consolidatedItems = useMemo(() => {
    const wId = selectedWarehouseId;

    return products.map((prod) => {
      // Filtrar movimentos deste produto para o armazém selecionado
      const prodMovements = (stockMovements || []).filter(m => 
        (String(m.product_id) === String(prod.id) || String((m as any).produto_id) === String(prod.id)) &&
        movementMatchesWarehouse(m, wId)
      );

      // Total de Entradas
      const entradasMov = prodMovements
        .filter(m => m.type === 'entry' || (m as any).tipo === 'entrada')
        .reduce((sum, m) => sum + Number(m.quantity || (m as any).quantidade || 0), 0);

      // Total de Saídas (Vendas + Transferências de Saída)
      const saidasMov = prodMovements
        .filter(m => m.type === 'exit' || (m as any).tipo === 'saida')
        .reduce((sum, m) => sum + Number(m.quantity || (m as any).quantidade || 0), 0);

      // Ajustamentos Positivos
      const ajustesPositivos = prodMovements
        .filter(m => m.type === 'adjustment_plus' || (m as any).tipo === 'ajuste_positivo')
        .reduce((sum, m) => sum + Number(m.quantity || (m as any).quantidade || 0), 0);

      // Ajustamentos Negativos
      const ajustesNegativos = prodMovements
        .filter(m => m.type === 'adjustment_minus' || (m as any).tipo === 'ajuste_negativo')
        .reduce((sum, m) => sum + Number(m.quantity || (m as any).quantidade || 0), 0);

      // Quantidade Inicial
      const sortedMovements = [...prodMovements].sort((a, b) => 
        new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
      );
      const firstEntry = sortedMovements.find(m => m.type === 'entry' || (m as any).tipo === 'entrada');
      const lastMovement = sortedMovements[sortedMovements.length - 1];

      const totalEntradas = entradasMov;
      const totalSaidas = saidasMov;

      // FÓRMULA OFICIAL EXIGIDA:
      // Quantidade disponível = Total de entradas - Total de saídas + Ajustamentos positivos - Ajustamentos negativos
      const prodArmazemId = (prod as any).armazem_id || prod.warehouse_id;
      const matchesBaseWarehouse = wId === 'all' || String(prodArmazemId) === String(wId);

      let stockBase = 0;
      if (entradasMov === 0 && matchesBaseWarehouse) {
        stockBase = Number(
          prod.stock_quantity ??
          (prod as any).stock ??
          (prod as any).stock_atual ??
          (prod as any).estoque_atual ??
          0
        );
      }

      let qtdDisponivel = stockBase + entradasMov - totalSaidas + ajustesPositivos - ajustesNegativos;

      if (prodMovements.length === 0 && !matchesBaseWarehouse) {
        qtdDisponivel = 0;
      }

      // Custos e Valores
      const custoUnitario = Number(prod.cost_price || (prod as any).preco_compra || (prod as any).preco_custo || 0);
      const precoVenda = Number(prod.price || (prod as any).preco_venda || 0);
      const valorTotalStock = Math.max(0, qtdDisponivel) * custoUnitario;

      // Nome do Armazém correspondente
      const armazemObj = warehouses.find(w => String(w.id) === String(prodArmazemId || wId));
      const nomeArmazem = armazemObj ? armazemObj.name : (wId === 'all' ? (armazemObj?.name || 'Geral / Principal') : 'Armazém Selecionado');

      const docRef = firstEntry?.reference_id || (firstEntry as any)?.referencia || '—';
      const fornecedorNome = (firstEntry as any)?.fornecedor_nome || (firstEntry?.description?.split('-')[1]?.trim()) || 'Fornecedor Comercial';

      const hasPresenceInWarehouse = wId === 'all' || matchesBaseWarehouse || prodMovements.length > 0 || qtdDisponivel > 0;

      const stockMin = Number(prod.min_stock || 0);
      const stockMax = Number((prod as any).max_stock || 0);

      const isLowStock = qtdDisponivel <= stockMin && qtdDisponivel > 0;
      const isZeroOrNegative = qtdDisponivel <= 0;

      return {
        product: prod,
        hasPresence: hasPresenceInWarehouse,
        codigo: (prod as any).codigo || (prod as any).code || (prod as any).barcode || `ART-${String(prod.id).substring(0, 5).toUpperCase()}`,
        referencia: (prod as any).referencia || (prod as any).reference || '',
        nome: prod.name || (prod as any).nome || 'Produto sem nome',
        descricao: (prod as any).description || (prod as any).descricao || '—',
        categoria: prod.category || (prod as any).categoria || 'Geral',
        unidade: prod.unit || (prod as any).unidade || 'UN',
        armazemNome: nomeArmazem,
        qtdDisponivel,
        stockMin,
        stockMax,
        precoVenda,
        custoUnitario,
        valorTotalStock,
        qtdTotalAdquirida: totalEntradas > 0 ? totalEntradas : (matchesBaseWarehouse ? Number(prod.stock_quantity || 0) : 0),
        qtdVendidaSaida: totalSaidas,
        isLowStock,
        isZeroOrNegative,
        docRef,
        fornecedorNome
      };
    }).filter(item => item.hasPresence);
  }, [products, stockMovements, warehouses, selectedWarehouseId]);

  // Filtragem de busca e status
  const filteredList = useMemo(() => {
    return consolidatedItems.filter(item => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q || 
        item.nome.toLowerCase().includes(q) ||
        item.descricao.toLowerCase().includes(q) ||
        item.codigo.toLowerCase().includes(q) ||
        item.referencia.toLowerCase().includes(q) ||
        item.categoria.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (filterStatus === 'positive') return item.qtdDisponivel > 0;
      if (filterStatus === 'negative') return item.qtdDisponivel <= 0;
      if (filterStatus === 'low') return item.isLowStock;

      return true;
    });
  }, [consolidatedItems, searchTerm, filterStatus]);

  // Paginação
  const totalPages = Math.ceil(filteredList.length / pageSize) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredList.slice(start, start + pageSize);
  }, [filteredList, currentPage, pageSize]);

  // Totais e Métricas em Tempo Real
  const metrics = useMemo(() => {
    const totalQtdDisponivel = consolidatedItems.reduce((acc, it) => acc + Math.max(0, it.qtdDisponivel), 0);
    const totalValorStock = consolidatedItems.reduce((acc, it) => acc + Math.max(0, it.valorTotalStock), 0);
    const totalEntradas = consolidatedItems.reduce((acc, it) => acc + it.qtdTotalAdquirida, 0);
    const totalSaidas = consolidatedItems.reduce((acc, it) => acc + it.qtdVendidaSaida, 0);
    const totalArtigos = consolidatedItems.length;

    return {
      totalQtdDisponivel,
      totalValorStock,
      totalEntradas,
      totalSaidas,
      totalArtigos
    };
  }, [consolidatedItems]);

  const formatKz = (val: number) => {
    return val.toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' Kz';
  };

  const handleManualSync = async () => {
    setLoadingFresh(true);
    try {
      if (onRefresh) await onRefresh();
      toast.success('Stock e movimentos actualizados com sucesso!');
    } catch {
      toast.error('Erro ao actualizar dados de stock.');
    } finally {
      setLoadingFresh(false);
    }
  };

  // Se o utilizador clicou no relatório de um produto individual, exibe página independente
  if (selectedProductForReport) {
    return (
      <ProductIndividualStockReport
        product={selectedProductForReport}
        stockMovements={stockMovements}
        warehouses={warehouses}
        onBack={() => setSelectedProductForReport(null)}
        onEditProduct={onEditProduct}
        onOpenAdjustment={onOpenAdjustment}
      />
    );
  }

  return (
    <div className="space-y-3 font-sans">

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 1. BARRA DE CONTROLO COMPACTA & SELEÇÃO DE ARMAZÉM                         */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-zinc-200 rounded-xl shadow-xs p-3 space-y-2.5">
        
        {/* Linha 1: Armazém, Filtros Rápidos, Pesquisa e Ações */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          
          {/* Seletor de Armazém e Filtros */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 bg-blue-50/80 border border-blue-200 px-3 py-1.5 rounded-lg text-xs font-bold text-[#003366] shrink-0">
              <Building2 size={15} className="text-blue-600 shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-900 shrink-0">Armazém:</span>
              <select
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                className="bg-transparent text-xs font-black text-[#003366] uppercase tracking-wider focus:outline-none cursor-pointer pr-1"
              >
                <option value="all">TODOS OS ARMAZÉNS</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>
                    📦 {w.name?.toUpperCase()} {w.localidade ? `— ${w.localidade}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtros de Estado */}
            <div className="flex items-center gap-1 bg-zinc-100 p-0.5 rounded-lg border border-zinc-200">
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer ${
                  filterStatus === 'all'
                    ? 'bg-white text-[#003366] shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Todos ({consolidatedItems.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('positive')}
                className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer ${
                  filterStatus === 'positive'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Disponível
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('low')}
                className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer ${
                  filterStatus === 'low'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Baixo
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('negative')}
                className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded transition-all cursor-pointer ${
                  filterStatus === 'negative'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Esgotado
              </button>
            </div>
          </div>

          {/* Pesquisa e Botões de Ação */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" size={13} />
              <input
                type="text"
                placeholder="Pesquisar código, artigo, descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 text-xs font-medium text-zinc-800 focus:outline-none focus:border-[#003366] focus:bg-white rounded-lg shadow-2xs transition-colors"
              />
            </div>

            {onNewProduct && (
              <button
                type="button"
                onClick={onNewProduct}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#003366] hover:bg-[#002244] text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-2xs transition-all cursor-pointer shrink-0"
              >
                <Plus size={13} />
                <span>Novo Artigo</span>
              </button>
            )}

            {onNavigateToPurchases && (
              <button
                type="button"
                onClick={onNavigateToPurchases}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-2xs transition-all cursor-pointer shrink-0"
                title="Aceder à Gestão de Compras"
              >
                <ShoppingCart size={13} />
                <span>Nova Compra</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleManualSync}
              disabled={loadingFresh}
              className="p-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-lg transition-colors cursor-pointer shrink-0"
              title="Sincronizar dados com o Supabase"
            >
              <RefreshCw size={14} className={loadingFresh ? 'animate-spin text-blue-600' : ''} />
            </button>
          </div>

        </div>

        {/* Linha 2: Resumo Rápido de Métricas em Cards Compactos */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-zinc-100 text-xs">
          <div className="bg-zinc-50/70 p-2 rounded-lg border border-zinc-200/60 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Artigos em Stock</span>
              <strong className="text-sm font-black text-zinc-800 font-mono">{metrics.totalArtigos}</strong>
            </div>
            <Package size={18} className="text-zinc-400" />
          </div>

          <div className="bg-emerald-50/50 p-2 rounded-lg border border-emerald-200/60 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider block">Total Disponível</span>
              <strong className="text-sm font-black text-emerald-700 font-mono">{metrics.totalQtdDisponivel.toLocaleString('pt-AO')} un</strong>
            </div>
            <TrendingUp size={18} className="text-emerald-500" />
          </div>

          <div className="bg-rose-50/50 p-2 rounded-lg border border-rose-200/60 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-rose-600 font-bold uppercase tracking-wider block">Total Saídas</span>
              <strong className="text-sm font-black text-rose-700 font-mono">{metrics.totalSaidas.toLocaleString('pt-AO')} un</strong>
            </div>
            <TrendingDown size={18} className="text-rose-500" />
          </div>

          <div className="bg-blue-50/50 p-2 rounded-lg border border-blue-200/60 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-blue-700 font-bold uppercase tracking-wider block">Valor Total Stock</span>
              <strong className="text-sm font-black text-blue-900 font-mono">{formatKz(metrics.totalValorStock)}</strong>
            </div>
            <Calculator size={18} className="text-blue-500" />
          </div>
        </div>

      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 2. TABELA PRINCIPAL DE STOCK ATUAL COM AS COLUNAS EXIGIDAS                */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-zinc-200 rounded-xl shadow-xs overflow-hidden">
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#003366] text-white text-[10px] font-black uppercase tracking-wider whitespace-nowrap">
                <th className="py-3 px-3">Nome do Produto</th>
                <th className="py-3 px-3">Descrição</th>
                <th className="py-3 px-3">Código / Ref.</th>
                <th className="py-3 px-3">Categoria</th>
                <th className="py-3 px-3 text-center">Unidade</th>
                <th className="py-3 px-3">Armazém</th>
                <th className="py-3 px-3 text-right bg-[#002244]">Qtd Actual</th>
                <th className="py-3 px-3 text-right">Stock Mín.</th>
                <th className="py-3 px-3 text-right">Stock Máx.</th>
                <th className="py-3 px-3 text-right">Preço Venda</th>
                <th className="py-3 px-3 text-right bg-[#002244]">Valor Total Stock</th>
                <th className="py-3 px-3 text-center">Estado</th>
                <th className="py-3 px-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-zinc-700">
              {paginatedList.map((item) => (
                <tr 
                  key={item.product.id}
                  className="hover:bg-blue-50/40 transition-colors"
                >
                  {/* 1. Nome do Produto */}
                  <td className="py-2.5 px-3 font-bold text-zinc-900 whitespace-nowrap">
                    <span className="truncate max-w-[220px] block" title={item.nome}>
                      {item.nome}
                    </span>
                  </td>

                  {/* 2. Descrição */}
                  <td className="py-2.5 px-3 text-zinc-500 whitespace-nowrap">
                    <span className="truncate max-w-[200px] block text-[11px]" title={item.descricao}>
                      {item.descricao}
                    </span>
                  </td>

                  {/* 3. Código ou referência comercial */}
                  <td className="py-2.5 px-3 font-mono font-bold text-zinc-600 whitespace-nowrap text-[11px]">
                    <div>{item.codigo}</div>
                    {item.referencia && item.referencia !== item.codigo && (
                      <span className="text-[10px] text-zinc-400 font-normal block">{item.referencia}</span>
                    )}
                  </td>

                  {/* 4. Categoria */}
                  <td className="py-2.5 px-3 text-zinc-600 whitespace-nowrap text-[11px]">
                    {item.categoria}
                  </td>

                  {/* 5. Unidade de medida */}
                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                    <span className="px-1.5 py-0.5 bg-zinc-100 text-zinc-700 font-mono text-[10px] font-bold rounded">
                      {item.unidade}
                    </span>
                  </td>

                  {/* 6. Armazém */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 bg-zinc-100 text-[#003366] font-bold text-[10px] rounded border border-zinc-200">
                      {item.armazemNome}
                    </span>
                  </td>

                  {/* 7. Quantidade Actual */}
                  <td className={`py-2.5 px-3 text-right font-mono font-black whitespace-nowrap text-xs ${
                    item.qtdDisponivel > 0 ? 'bg-emerald-50/70 text-emerald-800' : 'bg-rose-50/70 text-rose-800'
                  }`}>
                    {item.qtdDisponivel.toLocaleString('pt-AO')}
                  </td>

                  {/* 8. Stock mínimo */}
                  <td className="py-2.5 px-3 text-right font-mono text-zinc-500 whitespace-nowrap text-[11px]">
                    {item.stockMin}
                  </td>

                  {/* 9. Stock máximo */}
                  <td className="py-2.5 px-3 text-right font-mono text-zinc-500 whitespace-nowrap text-[11px]">
                    {item.stockMax > 0 ? item.stockMax : '—'}
                  </td>

                  {/* 10. Preço de venda */}
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-zinc-800 whitespace-nowrap">
                    {item.precoVenda.toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz
                  </td>

                  {/* 11. Valor total do stock */}
                  <td className="py-2.5 px-3 text-right font-mono font-black text-[#003366] bg-blue-50/40 whitespace-nowrap">
                    {item.valorTotalStock.toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz
                  </td>

                  {/* 12. Estado do stock */}
                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                    {item.isZeroOrNegative ? (
                      <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-black uppercase rounded">
                        Esgotado
                      </span>
                    ) : item.isLowStock ? (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-black uppercase rounded">
                        Baixo
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase rounded">
                        Normal
                      </span>
                    )}
                  </td>

                  {/* 13. Ações */}
                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      {/* Botão de Editar Produto Obrigatório */}
                      {onEditProduct && (
                        <button
                          type="button"
                          onClick={() => onEditProduct(item.product)}
                          className="p-1 bg-blue-50 hover:bg-[#003366] text-[#003366] hover:text-white rounded transition-colors"
                          title="Editar Artigo"
                        >
                          <Pencil size={13} />
                        </button>
                      )}

                      {/* Botão de Relatório Individual */}
                      <button
                        type="button"
                        onClick={() => setSelectedProductForReport(item.product)}
                        className="p-1 bg-zinc-100 hover:bg-[#003366] text-zinc-600 hover:text-white rounded transition-colors"
                        title="Ver Relatório Detalhado do Artigo"
                      >
                        <FileText size={13} />
                      </button>

                      {/* Ajuste de Stock */}
                      {onOpenAdjustment && (
                        <button
                          type="button"
                          onClick={() => onOpenAdjustment(item.product)}
                          className="p-1 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded transition-colors"
                          title="Ajuste de Stock (+/-)"
                        >
                          <SlidersHorizontal size={13} />
                        </button>
                      )}

                      {/* Transferência entre Armazéns */}
                      {onOpenTransfer && (
                        <button
                          type="button"
                          onClick={() => onOpenTransfer(item.product)}
                          className="p-1 bg-purple-50 hover:bg-purple-600 text-purple-700 hover:text-white rounded transition-colors"
                          title="Transferência entre Armazéns"
                        >
                          <ArrowRightLeft size={13} />
                        </button>
                      )}
                    </div>
                  </td>

                </tr>
              ))}

              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={13} className="py-16 text-center text-zinc-400 font-bold uppercase tracking-wider">
                    <Box size={36} className="mx-auto text-zinc-300 mb-2" />
                    <span>Nenhum produto com entradas registadas para o armazém seleccionado.</span>
                    <p className="text-xs text-zinc-400 font-normal mt-1 lowercase first-letter:uppercase">
                      Registe compras com este armazém para visualizar as entradas de stock imediatamente.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Rodapé da Tabela com Paginação */}
        <div className="p-3 bg-zinc-50 border-t border-zinc-200 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-500 font-medium">
          <div className="flex items-center gap-3">
            <span>
              A apresentar <strong className="text-zinc-800">{paginatedList.length}</strong> de <strong className="text-zinc-800">{filteredList.length}</strong> produtos filtrados.
            </span>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span>Itens por página:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-white border border-zinc-300 rounded px-1.5 py-0.5 text-xs text-zinc-800 focus:outline-none cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {/* Controles de Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Página Anterior"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-2 text-[11px] font-bold text-zinc-700">
                Página {currentPage} de {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                title="Próxima Página"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}

          <div className="flex items-center gap-4 text-[11px]">
            <span>Fórmula: <strong className="text-zinc-700">Entradas - Saídas ± Ajustes = Actual</strong></span>
            <span>Valor Total: <strong className="text-emerald-600 font-black">{formatKz(metrics.totalValorStock)}</strong></span>
          </div>
        </div>

      </div>

    </div>
  );
};
export default StockAtualModule;
