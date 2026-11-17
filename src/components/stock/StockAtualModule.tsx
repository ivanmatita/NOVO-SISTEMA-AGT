import React, { useState, useMemo, useEffect } from 'react';
import {
  ShoppingCart, Package, Building2, Calculator,
  Search, Filter, RefreshCw, Plus, ArrowRightLeft, SlidersHorizontal,
  FileText, Eye, AlertTriangle, CheckCircle2, ShieldAlert, Download,
  Layers, ChevronRight, Home, TrendingUp, TrendingDown, Clock, Box
} from 'lucide-react';
import { Product, Warehouse, StockMovement } from '../../types';
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
}) => {
  const { user } = useAuth();
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'positive' | 'negative' | 'low'>('all');
  const [loadingFresh, setLoadingFresh] = useState<boolean>(false);

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

      // Quantidade Inicial (da primeira movimentação de entrada ou do cadastro inicial)
      const sortedMovements = [...prodMovements].sort((a, b) => 
        new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
      );
      const firstEntry = sortedMovements.find(m => m.type === 'entry' || (m as any).tipo === 'entrada');
      const lastMovement = sortedMovements[sortedMovements.length - 1];

      // Quantidade Total de Entradas = Entradas + Ajustes Positivos
      const totalEntradas = entradasMov;
      const totalSaidas = saidasMov;

      // FÓRMULA OFICIAL EXIGIDA:
      // Quantidade disponível = Total de entradas - Total de saídas + Ajustamentos positivos - Ajustamentos negativos
      let qtdDisponivel = totalEntradas - totalSaidas + ajustesPositivos - ajustesNegativos;

      // Se não houver movimentos registrados ainda para este produto, utiliza o stock base cadastrado se o armazém coincidir
      const prodArmazemId = (prod as any).armazem_id || prod.warehouse_id;
      const matchesBaseWarehouse = wId === 'all' || String(prodArmazemId) === String(wId);

      if (prodMovements.length === 0) {
        if (matchesBaseWarehouse) {
          qtdDisponivel = Number(prod.stock_quantity ?? (prod as any).stock ?? (prod as any).stock_atual ?? 0);
        } else {
          qtdDisponivel = 0;
        }
      }

      // Custos e Valores
      const custoUnitario = Number(prod.cost_price || (prod as any).preco_compra || (prod as any).preco_custo || 0);
      const custoTotalAquisicao = totalEntradas * custoUnitario;
      const valorTotalStock = Math.max(0, qtdDisponivel) * custoUnitario;

      // Nome do Armazém correspondente
      const armazemObj = warehouses.find(w => String(w.id) === String(prodArmazemId || wId));
      const nomeArmazem = armazemObj ? armazemObj.name : (wId === 'all' ? (armazemObj?.name || 'Geral / Principal') : 'Armazém Selecionado');

      // Informações da Compra de Origem
      const docOrigem = (firstEntry as any)?.documento_origem || (firstEntry?.description?.includes('Compra') ? 'Factura Compra' : 'Registo Inicial');
      const docRef = firstEntry?.reference_id || (firstEntry as any)?.referencia || '—';
      const fornecedorNome = (firstEntry as any)?.fornecedor_nome || (firstEntry?.description?.split('-')[1]?.trim()) || 'Fornecedor Comercial';
      const dataEntrada = firstEntry?.created_at ? new Date(firstEntry.created_at).toLocaleDateString('pt-AO') : (prod.created_at ? new Date(prod.created_at).toLocaleDateString('pt-AO') : '—');
      const dataUltimaMov = lastMovement?.created_at ? new Date(lastMovement.created_at).toLocaleDateString('pt-AO') : dataEntrada;

      // Determinar se o produto tem relevância no armazém selecionado
      const hasPresenceInWarehouse = wId === 'all' || matchesBaseWarehouse || prodMovements.length > 0;

      return {
        product: prod,
        hasPresence: hasPresenceInWarehouse,
        codigo: prod.codigo || (prod as any).code || (prod as any).barcode || `ART-${String(prod.id).substring(0, 5).toUpperCase()}`,
        nome: prod.name || (prod as any).nome || 'Produto sem nome',
        categoria: prod.category || (prod as any).categoria || 'Geral',
        armazemNome: nomeArmazem,
        dataEntrada,
        docOrigem,
        docRef,
        fornecedorNome,
        qtdInicialEntrada: firstEntry ? Number(firstEntry.quantity || (firstEntry as any).quantidade || 0) : (matchesBaseWarehouse ? Number(prod.stock_quantity || 0) : 0),
        qtdTotalAdquirida: totalEntradas > 0 ? totalEntradas : (matchesBaseWarehouse ? Number(prod.stock_quantity || 0) : 0),
        qtdDisponivel,
        qtdVendidaSaida: totalSaidas,
        custoUnitario,
        custoTotalAquisicao,
        valorTotalStock,
        dataUltimaMov,
        tipoUltimaMov: lastMovement?.type === 'entry' ? 'Entrada' : (lastMovement?.type === 'exit' ? 'Saída' : (lastMovement?.type?.includes('adjustment') ? 'Ajuste' : 'Registo')),
        isLowStock: qtdDisponivel <= (prod.min_stock || 0) && qtdDisponivel > 0,
        isZeroOrNegative: qtdDisponivel <= 0,
        hasMovements: prodMovements.length > 0
      };
    }).filter(item => item.hasPresence);
  }, [products, stockMovements, warehouses, selectedWarehouseId]);

  // Filtragem de busca e status
  const filteredList = useMemo(() => {
    return consolidatedItems.filter(item => {
      // Busca por nome, código, fornecedor ou documento
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch = !q || 
        item.nome.toLowerCase().includes(q) ||
        item.codigo.toLowerCase().includes(q) ||
        item.categoria.toLowerCase().includes(q) ||
        item.docRef.toLowerCase().includes(q) ||
        item.fornecedorNome.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      // Filtro de status
      if (filterStatus === 'positive') return item.qtdDisponivel > 0;
      if (filterStatus === 'negative') return item.qtdDisponivel <= 0;
      if (filterStatus === 'low') return item.isLowStock;

      return true;
    });
  }, [consolidatedItems, searchTerm, filterStatus]);

  // Totais e Métricas em Tempo Real para o armazém selecionado
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

  return (
    <div className="space-y-6 font-sans">
      


      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 2. SELEÇÃO OBRIGATÓRIA DO ARMAZÉM & PAINEL DE CONTROLO DE STOCK           */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-zinc-200 p-5 rounded-xl shadow-xs space-y-4">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
          
          {/* Seletor de Armazém com Destaque Forte */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <label className="text-xs font-black text-[#003366] uppercase tracking-wider flex items-center gap-1.5 shrink-0">
              <Building2 size={16} className="text-blue-600" />
              <span>Armazém Seleccionado [Obrigatório]:</span>
            </label>
            <div className="relative">
              <select
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                className="bg-zinc-50 hover:bg-zinc-100/80 border-2 border-[#003366] text-[#003366] text-xs font-black uppercase tracking-wider px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer min-w-[240px]"
              >
                <option value="all">TODOS OS ARMAZÉNS (VISÃO GERAL)</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>
                    📦 {w.name?.toUpperCase()} {w.localidade ? `— ${w.localidade}` : ''}
                  </option>
                ))}
              </select>
            </div>
            {onManageWarehouses && (
              <button
                type="button"
                onClick={onManageWarehouses}
                className="px-3 py-2 text-xs font-bold text-zinc-600 hover:text-[#003366] bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
              >
                <Home size={14} />
                <span>Gerir Armazéns</span>
              </button>
            )}
          </div>

          {/* Botões de Ações Rápidas */}
          <div className="flex items-center gap-2 shrink-0">
            {onNavigateToPurchases && (
              <button
                type="button"
                onClick={onNavigateToPurchases}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider rounded-lg shadow-sm transition-all cursor-pointer"
              >
                <ShoppingCart size={14} />
                <span>Nova Compra</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleManualSync}
              disabled={loadingFresh}
              className="flex items-center gap-1.5 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold uppercase tracking-wider rounded-lg border border-zinc-200 transition-all cursor-pointer disabled:opacity-50"
              title="Actualizar dados de stock e movimentos"
            >
              <RefreshCw size={14} className={loadingFresh ? 'animate-spin text-blue-600' : ''} />
              <span>{loadingFresh ? 'A actualizar...' : 'Actualizar'}</span>
            </button>
          </div>

        </div>

        {/* ──────────────────────────────────────────────────────────────────────── */}
        {/* CARDS DE CÁLCULOS AUTOMÁTICOS EM TEMPO REAL                             */}
        {/* ──────────────────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          
          <div className="bg-blue-50/60 border border-blue-200 p-3.5 rounded-lg">
            <div className="text-[10px] font-bold text-blue-700 uppercase tracking-widest flex items-center gap-1 mb-1">
              <Box size={13} />
              <span>Artigos em Stock</span>
            </div>
            <div className="text-xl font-black text-[#003366]">
              {metrics.totalArtigos}
            </div>
            <div className="text-[10px] text-zinc-400 font-medium">Produtos registados</div>
          </div>

          <div className="bg-emerald-50/60 border border-emerald-200 p-3.5 rounded-lg">
            <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest flex items-center gap-1 mb-1">
              <TrendingUp size={13} />
              <span>Total Entradas</span>
            </div>
            <div className="text-xl font-black text-emerald-700">
              {metrics.totalEntradas.toLocaleString('pt-AO')}
            </div>
            <div className="text-[10px] text-zinc-400 font-medium">Compras &amp; Entradas</div>
          </div>

          <div className="bg-rose-50/60 border border-rose-200 p-3.5 rounded-lg">
            <div className="text-[10px] font-bold text-rose-700 uppercase tracking-widest flex items-center gap-1 mb-1">
              <TrendingDown size={13} />
              <span>Total Saídas</span>
            </div>
            <div className="text-xl font-black text-rose-700">
              {metrics.totalSaidas.toLocaleString('pt-AO')}
            </div>
            <div className="text-[10px] text-zinc-400 font-medium">Vendas &amp; Despachos</div>
          </div>

          <div className="bg-indigo-50/60 border border-indigo-200 p-3.5 rounded-lg">
            <div className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest flex items-center gap-1 mb-1">
              <Package size={13} />
              <span>Qtd Disponível</span>
            </div>
            <div className="text-xl font-black text-indigo-700">
              {metrics.totalQtdDisponivel.toLocaleString('pt-AO')}
            </div>
            <div className="text-[10px] text-zinc-400 font-medium">Stock Físico Real</div>
          </div>

          <div className="bg-zinc-900 text-white p-3.5 rounded-lg border border-zinc-800 col-span-2 sm:col-span-1">
            <div className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-1 mb-1">
              <Calculator size={13} className="text-emerald-400" />
              <span>Valor Total Stock</span>
            </div>
            <div className="text-lg font-black text-emerald-400 truncate">
              {formatKz(metrics.totalValorStock)}
            </div>
            <div className="text-[10px] text-zinc-400 font-medium">Qtd × Custo Unitário</div>
          </div>

        </div>

      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* 3. LISTAGEM DO STOCK ATUAL (15 COLUNAS COMPLETAS E REAIS)                  */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-zinc-200 rounded-xl shadow-xs overflow-hidden">
        
        {/* Barra de Filtros e Pesquisa da Tabela */}
        <div className="p-4 bg-zinc-50 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-3">
          
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={15} />
            <input
              type="text"
              placeholder="Pesquisar por Código, Nome, Fornecedor ou Doc..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-zinc-300 text-xs font-medium text-zinc-800 focus:outline-none focus:border-[#003366] rounded-lg shadow-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-md border transition-all ${
                filterStatus === 'all'
                  ? 'bg-[#003366] text-white border-[#003366]'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-100'
              }`}
            >
              Todos ({consolidatedItems.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('positive')}
              className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-md border transition-all ${
                filterStatus === 'positive'
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-100'
              }`}
            >
              Stock Positivo
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('low')}
              className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-md border transition-all ${
                filterStatus === 'low'
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-100'
              }`}
            >
              Stock Baixo
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('negative')}
              className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-md border transition-all ${
                filterStatus === 'negative'
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-100'
              }`}
            >
              Esgotado / Negativo
            </button>
          </div>

        </div>

        {/* Tabela de Dados Reais do Supabase */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#003366] text-white text-[10px] font-black uppercase tracking-wider whitespace-nowrap">
                <th className="py-3 px-3">Código</th>
                <th className="py-3 px-3">Nome do Produto</th>
                <th className="py-3 px-3">Categoria</th>
                <th className="py-3 px-3">Armazém</th>
                <th className="py-3 px-3">Data Entrada</th>
                <th className="py-3 px-3">Doc. Origem</th>
                <th className="py-3 px-3">Nº Doc / Ref</th>
                <th className="py-3 px-3">Fornecedor</th>
                <th className="py-3 px-3 text-right">Qtd Inicial</th>
                <th className="py-3 px-3 text-right">Qtd Adquirida</th>
                <th className="py-3 px-3 text-right">Qtd Vendida</th>
                <th className="py-3 px-3 text-right bg-[#002244]">Qtd Disponível</th>
                <th className="py-3 px-3 text-right">Custo Unit.</th>
                <th className="py-3 px-3 text-right">Custo Aquisição</th>
                <th className="py-3 px-3 text-right bg-[#002244]">Valor Stock</th>
                <th className="py-3 px-3 text-center">Última Mov.</th>
                <th className="py-3 px-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-zinc-700">
              {filteredList.map((item) => (
                <tr 
                  key={item.product.id}
                  className="hover:bg-blue-50/40 transition-colors"
                >
                  {/* 1. Código */}
                  <td className="py-2.5 px-3 font-mono font-bold text-zinc-500 whitespace-nowrap">
                    {item.codigo}
                  </td>

                  {/* 2. Nome do Produto */}
                  <td className="py-2.5 px-3 font-bold text-zinc-900 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="truncate max-w-[200px]" title={item.nome}>{item.nome}</span>
                      {item.isLowStock && (
                        <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-black uppercase rounded shrink-0">
                          Baixo
                        </span>
                      )}
                      {item.isZeroOrNegative && (
                        <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 text-[9px] font-black uppercase rounded shrink-0">
                          Esgotado
                        </span>
                      )}
                    </div>
                  </td>

                  {/* 3. Categoria */}
                  <td className="py-2.5 px-3 text-zinc-500 whitespace-nowrap">
                    {item.categoria}
                  </td>

                  {/* 4. Armazém */}
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 bg-zinc-100 text-[#003366] font-bold text-[10px] rounded border border-zinc-200">
                      {item.armazemNome}
                    </span>
                  </td>

                  {/* 5. Data de Entrada */}
                  <td className="py-2.5 px-3 text-zinc-500 whitespace-nowrap font-mono text-[11px]">
                    {item.dataEntrada}
                  </td>

                  {/* 6. Documento de Origem */}
                  <td className="py-2.5 px-3 text-zinc-600 whitespace-nowrap font-medium text-[11px]">
                    {item.docOrigem}
                  </td>

                  {/* 7. Nº Documento / Ref */}
                  <td className="py-2.5 px-3 font-mono font-bold text-zinc-700 whitespace-nowrap text-[11px]">
                    {item.docRef}
                  </td>

                  {/* 8. Fornecedor */}
                  <td className="py-2.5 px-3 text-zinc-600 whitespace-nowrap truncate max-w-[140px]" title={item.fornecedorNome}>
                    {item.fornecedorNome}
                  </td>

                  {/* 9. Qtd Inicial Entrada */}
                  <td className="py-2.5 px-3 text-right font-mono whitespace-nowrap text-zinc-500">
                    {item.qtdInicialEntrada.toLocaleString('pt-AO')}
                  </td>

                  {/* 10. Qtd Total Adquirida */}
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                    {item.qtdTotalAdquirida.toLocaleString('pt-AO')}
                  </td>

                  {/* 11. Qtd Vendida / Saída */}
                  <td className="py-2.5 px-3 text-right font-mono text-rose-600 whitespace-nowrap">
                    {item.qtdVendidaSaida.toLocaleString('pt-AO')}
                  </td>

                  {/* 12. Qtd Disponível Actual */}
                  <td className={`py-2.5 px-3 text-right font-mono font-black whitespace-nowrap text-xs ${
                    item.qtdDisponivel > 0 ? 'bg-emerald-50/60 text-emerald-700' : 'bg-rose-50/60 text-rose-700'
                  }`}>
                    {item.qtdDisponivel.toLocaleString('pt-AO')}
                  </td>

                  {/* 13. Custo Unitário */}
                  <td className="py-2.5 px-3 text-right font-mono whitespace-nowrap text-zinc-700">
                    {item.custoUnitario.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}
                  </td>

                  {/* 14. Custo Total Aquisição */}
                  <td className="py-2.5 px-3 text-right font-mono whitespace-nowrap text-zinc-500">
                    {item.custoTotalAquisicao.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}
                  </td>

                  {/* 15. Valor Total Stock */}
                  <td className="py-2.5 px-3 text-right font-mono font-black text-[#003366] bg-blue-50/40 whitespace-nowrap">
                    {item.valorTotalStock.toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz
                  </td>

                  {/* 16. Última Movimentação */}
                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                    <span className="text-[10px] text-zinc-500 font-mono block">{item.dataUltimaMov}</span>
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-tight">{item.tipoUltimaMov}</span>
                  </td>

                  {/* 17. Ações */}
                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      {onViewStockReport && (
                        <button
                          type="button"
                          onClick={() => onViewStockReport(item.product)}
                          className="p-1 bg-zinc-100 hover:bg-[#003366] text-zinc-600 hover:text-white rounded transition-colors"
                          title="Relatório de Stock"
                        >
                          <FileText size={13} />
                        </button>
                      )}
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
                      {onOpenTransfer && (
                        <button
                          type="button"
                          onClick={() => onOpenTransfer(item.product)}
                          className="p-1 bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white rounded transition-colors"
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
                  <td colSpan={17} className="py-16 text-center text-zinc-400 font-bold uppercase tracking-wider">
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

        {/* Rodapé da Tabela */}
        <div className="p-3 bg-zinc-50 border-t border-zinc-200 flex flex-wrap items-center justify-between text-xs text-zinc-500 font-medium">
          <div>
            A apresentar <strong className="text-zinc-800">{filteredList.length}</strong> de <strong className="text-zinc-800">{consolidatedItems.length}</strong> produtos registados.
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Fórmula: <strong className="text-zinc-700">Entradas - Saídas ± Ajustamentos = Disponível</strong></span>
            <span>Valor Total: <strong className="text-emerald-600 font-black">{formatKz(metrics.totalValorStock)}</strong></span>
          </div>
        </div>

      </div>

    </div>
  );
};
export default StockAtualModule;
