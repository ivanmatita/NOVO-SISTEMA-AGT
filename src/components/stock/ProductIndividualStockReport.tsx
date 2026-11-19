import React, { useState, useMemo } from 'react';
import {
  ArrowLeft, Printer, Download, Search, Filter, Calendar,
  Package, Building2, TrendingUp, TrendingDown, ArrowRightLeft,
  SlidersHorizontal, CheckCircle2, AlertTriangle, FileText
} from 'lucide-react';
import { Product, Warehouse, StockMovement } from '../../types';

interface ProductIndividualStockReportProps {
  product: Product;
  stockMovements: StockMovement[];
  warehouses: Warehouse[];
  onBack: () => void;
  onEditProduct?: (product: Product) => void;
  onOpenAdjustment?: (product: Product) => void;
}

export const ProductIndividualStockReport: React.FC<ProductIndividualStockReportProps> = ({
  product,
  stockMovements,
  warehouses,
  onBack,
  onEditProduct,
  onOpenAdjustment
}) => {
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');
  const [tipoFiltro, setTipoFiltro] = useState<string>('all');
  const [armazemFiltro, setArmazemFiltro] = useState<string>('all');
  const [busca, setBusca] = useState<string>('');

  // Identificação do Armazém vinculado
  const prodArmazemId = (product as any).armazem_id || product.warehouse_id;
  const armazemOriginal = warehouses.find(w => String(w.id) === String(prodArmazemId));
  const armazemNome = armazemOriginal ? armazemOriginal.name : 'Armazém Geral / Principal';

  // Informações básicas do produto
  const nomeProduto = product.name || (product as any).nome || 'Artigo';
  const codigoProduto = product.codigo || (product as any).code || (product as any).barcode || `ART-${String(product.id).substring(0, 5).toUpperCase()}`;
  const refComercial = (product as any).referencia || (product as any).reference || '—';
  const categoriaProduto = product.category || (product as any).categoria || 'Geral';
  const unidadeMedida = product.unit || (product as any).unidade || 'UN';
  const precoCusto = Number(product.cost_price || (product as any).preco_compra || (product as any).preco_custo || 0);
  const precoVenda = Number(product.price || (product as any).preco_venda || 0);
  const stockMin = Number(product.min_stock || 0);
  const stockMax = Number(product.max_stock || 0);

  // Filtrar todos os movimentos pertencentes a este produto ordenados cronologicamente
  const allProductMovements = useMemo(() => {
    return (stockMovements || [])
      .filter(m => String(m.product_id) === String(product.id) || String((m as any).produto_id) === String(product.id))
      .sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
  }, [stockMovements, product.id]);

  // Cálculos consolidados de totais
  const { totalEntradas, totalSaidas, ajustesPos, ajustesNeg, qtdInicial, saldoAtual, movementsWithBalance } = useMemo(() => {
    let saldoProgressivo = 0;
    let tEntradas = 0;
    let tSaidas = 0;
    let aPos = 0;
    let aNeg = 0;

    // Se houver stock base registado no produto e não houver movimentos de entrada
    const stockBase = Number(product.stock_quantity || (product as any).stock || 0);
    const firstMov = allProductMovements[0];
    const qtdIni = firstMov ? (Number(firstMov.quantity || (firstMov as any).quantidade || 0)) : stockBase;

    const listWithBal = allProductMovements.map(m => {
      const qtd = Number(m.quantity || (m as any).quantidade || 0);
      const tipo = m.type || (m as any).tipo;

      if (tipo === 'entry' || tipo === 'entrada') {
        tEntradas += qtd;
        saldoProgressivo += qtd;
      } else if (tipo === 'exit' || tipo === 'saida') {
        tSaidas += qtd;
        saldoProgressivo -= qtd;
      } else if (tipo === 'adjustment_plus' || tipo === 'ajuste_positivo') {
        aPos += qtd;
        saldoProgressivo += qtd;
      } else if (tipo === 'adjustment_minus' || tipo === 'ajuste_negativo') {
        aNeg += qtd;
        saldoProgressivo -= qtd;
      } else if (tipo === 'transfer' || tipo === 'transferencia') {
        // Se transferiu para fora
        tSaidas += qtd;
        saldoProgressivo -= qtd;
      }

      return {
        ...m,
        saldoApos: (m as any).current_stock ?? saldoProgressivo
      };
    });

    const saldoCalculado = allProductMovements.length > 0 
      ? (listWithBal[listWithBal.length - 1]?.saldoApos ?? (tEntradas - tSaidas + aPos - aNeg))
      : stockBase;

    return {
      totalEntradas: tEntradas,
      totalSaidas: tSaidas,
      ajustesPos: aPos,
      ajustesNeg: aNeg,
      qtdInicial: qtdIni,
      saldoAtual: saldoCalculado,
      movementsWithBalance: listWithBal.reverse() // mais recentes primeiro para visualização
    };
  }, [allProductMovements, product.stock_quantity]);

  // Filtragem dos movimentos na tabela
  const filteredMovements = useMemo(() => {
    return movementsWithBalance.filter(m => {
      const dt = m.created_at ? new Date(m.created_at) : null;
      if (dataInicio && dt) {
        const start = new Date(dataInicio);
        start.setHours(0, 0, 0, 0);
        if (dt < start) return false;
      }
      if (dataFim && dt) {
        const end = new Date(dataFim);
        end.setHours(23, 59, 59, 999);
        if (dt > end) return false;
      }

      const tipo = (m.type || (m as any).tipo || '').toLowerCase();
      if (tipoFiltro === 'entry' && !tipo.includes('entr') && tipo !== 'entry') return false;
      if (tipoFiltro === 'exit' && !tipo.includes('said') && tipo !== 'exit') return false;
      if (tipoFiltro === 'adjustment' && !tipo.includes('ajust') && !tipo.includes('adjust')) return false;
      if (tipoFiltro === 'transfer' && !tipo.includes('transf')) return false;

      if (armazemFiltro !== 'all') {
        const armId = (m as any).armazem_id || m.warehouse_id;
        if (String(armId) !== String(armazemFiltro)) return false;
      }

      if (busca) {
        const q = busca.toLowerCase();
        const desc = (m.description || (m as any).descricao || '').toLowerCase();
        const doc = ((m as any).documento_origem || (m as any).reference_id || '').toLowerCase();
        const user = ((m as any).created_by_nome || (m as any).created_by_username || '').toLowerCase();
        if (!desc.includes(q) && !doc.includes(q) && !user.includes(q)) return false;
      }

      return true;
    });
  }, [movementsWithBalance, dataInicio, dataFim, tipoFiltro, armazemFiltro, busca]);

  // Exportação CSV
  const handleExportCSV = () => {
    const headers = ['Data/Hora', 'Tipo de Movimento', 'Documento Origem', 'Referencia', 'Qtd Movimentada', 'Saldo Apos', 'Utilizador', 'Observacoes'];
    const rows = filteredMovements.map(m => [
      m.created_at ? new Date(m.created_at).toLocaleString('pt-AO') : '—',
      m.type || (m as any).tipo || 'Movimento',
      (m as any).documento_origem || 'Interno',
      m.reference_id || (m as any).referencia || '—',
      m.quantity || (m as any).quantidade || 0,
      m.saldoApos ?? '—',
      (m as any).created_by_nome || (m as any).created_by_username || 'Sistema',
      (m.description || (m as any).descricao || '').replace(/"/g, '""')
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(r => r.map(c => `"${c}"`).join(';'))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Relatorio_Stock_${codigoProduto}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const valorTotalStock = Math.max(0, saldoAtual) * precoCusto;

  return (
    <div className="space-y-6 bg-zinc-50 min-h-screen p-2 sm:p-6 text-zinc-900 animate-in fade-in duration-200">
      
      {/* Barra de Navegação Superior da Página Independente */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-2 bg-zinc-100 hover:bg-[#003366] text-zinc-700 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
            title="Voltar à lista do Stock Atual"
          >
            <ArrowLeft size={16} />
            <span>Voltar ao Stock Atual</span>
          </button>
          
          <div className="border-l border-zinc-200 pl-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-[#003366] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {codigoProduto}
              </span>
              <h1 className="text-base sm:text-lg font-black text-zinc-900 tracking-tight">
                {nomeProduto}
              </h1>
            </div>
            <p className="text-[11px] text-zinc-500 font-medium mt-0.5">
              Armazém: <strong className="text-zinc-700">{armazemNome}</strong> | Categoria: <strong className="text-zinc-700">{categoriaProduto}</strong> | Unidade: <strong className="text-zinc-700">{unidadeMedida}</strong>
            </p>
          </div>
        </div>

        {/* Botões Operacionais de Ação */}
        <div className="flex items-center gap-2 flex-wrap">
          {onEditProduct && (
            <button
              type="button"
              onClick={() => onEditProduct(product)}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-[#003366] border border-blue-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              <FileText size={14} />
              <span>Editar Artigo</span>
            </button>
          )}

          {onOpenAdjustment && (
            <button
              type="button"
              onClick={() => onOpenAdjustment(product)}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              <SlidersHorizontal size={14} />
              <span>Ajuste (+/-)</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
            title="Exportar para Excel (CSV)"
          >
            <Download size={14} />
            <span>Exportar CSV</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#003366] hover:bg-[#002244] text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
            title="Imprimir Relatório do Artigo"
          >
            <Printer size={14} />
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {/* Cartões de Resumo e Indicadores do Produto */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-zinc-200 shadow-2xs">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Qtd Inicial</span>
          <span className="text-lg font-black font-mono text-zinc-700">{qtdInicial.toLocaleString('pt-AO')}</span>
          <span className="text-[10px] text-zinc-400 block mt-0.5">{unidadeMedida}</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-zinc-200 shadow-2xs">
          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Total Entradas</span>
          <span className="text-lg font-black font-mono text-emerald-700">+{totalEntradas.toLocaleString('pt-AO')}</span>
          <span className="text-[10px] text-emerald-600/80 block mt-0.5">Compras + Registo</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-zinc-200 shadow-2xs">
          <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">Total Saídas</span>
          <span className="text-lg font-black font-mono text-rose-700">-{totalSaidas.toLocaleString('pt-AO')}</span>
          <span className="text-[10px] text-rose-600/80 block mt-0.5">Vendas + Transf.</span>
        </div>

        <div className={`p-3.5 rounded-xl border shadow-2xs ${
          saldoAtual <= 0 
            ? 'bg-rose-50 border-rose-200 text-rose-900' 
            : saldoAtual <= stockMin 
              ? 'bg-amber-50 border-amber-200 text-amber-900' 
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
        }`}>
          <span className="text-[10px] font-black uppercase tracking-wider block">Saldo Atual em Stock</span>
          <span className="text-xl font-black font-mono">{saldoAtual.toLocaleString('pt-AO')}</span>
          <span className="text-[10px] font-bold block mt-0.5">
            {saldoAtual <= 0 ? '⚠️ Esgotado' : saldoAtual <= stockMin ? '⚠️ Stock Baixo' : '✓ Stock Confortável'}
          </span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-zinc-200 shadow-2xs">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Stock Min / Max</span>
          <span className="text-sm font-bold font-mono text-zinc-800 block mt-1">
            Min: {stockMin} | Max: {stockMax > 0 ? stockMax : '∞'}
          </span>
          <span className="text-[10px] text-zinc-400 block mt-0.5">Limites de segurança</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-zinc-200 shadow-2xs">
          <span className="text-[10px] font-bold text-[#003366] uppercase tracking-wider block">Valor Total Stock</span>
          <span className="text-sm sm:text-base font-black font-mono text-[#003366] block mt-1">
            {valorTotalStock.toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz
          </span>
          <span className="text-[10px] text-zinc-400 block mt-0.5">
            Custo: {precoCusto.toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz
          </span>
        </div>
      </div>

      {/* Barra de Filtros de Movimentos */}
      <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Data Início */}
          <div className="flex items-center gap-1.5 text-xs">
            <Calendar size={14} className="text-zinc-400" />
            <span className="font-bold text-zinc-600">De:</span>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-800 focus:outline-none focus:border-[#003366]"
            />
          </div>

          {/* Data Fim */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-bold text-zinc-600">Até:</span>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-800 focus:outline-none focus:border-[#003366]"
            />
          </div>

          {/* Tipo de Movimento */}
          <div className="flex items-center gap-1.5 text-xs">
            <Filter size={14} className="text-zinc-400" />
            <span className="font-bold text-zinc-600">Tipo:</span>
            <select
              value={tipoFiltro}
              onChange={(e) => setTipoFiltro(e.target.value)}
              className="px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-bold text-zinc-800 focus:outline-none focus:border-[#003366] cursor-pointer"
            >
              <option value="all">Todos os Movimentos</option>
              <option value="entry">Entradas (Compras/Registo)</option>
              <option value="exit">Saídas (Vendas)</option>
              <option value="adjustment">Ajustamentos (+/-)</option>
              <option value="transfer">Transferências</option>
            </select>
          </div>

          {/* Armazém */}
          {warehouses.length > 1 && (
            <div className="flex items-center gap-1.5 text-xs">
              <Building2 size={14} className="text-zinc-400" />
              <select
                value={armazemFiltro}
                onChange={(e) => setArmazemFiltro(e.target.value)}
                className="px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-bold text-zinc-800 focus:outline-none focus:border-[#003366] cursor-pointer"
              >
                <option value="all">Todos os Armazéns</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Busca por texto */}
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Pesquisar documento, observações..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-medium text-zinc-800 focus:outline-none focus:border-[#003366]"
          />
        </div>
      </div>

      {/* Tabela de Movimentos Detalhada */}
      <div className="bg-white border border-zinc-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-3 bg-zinc-50 border-b border-zinc-200 flex justify-between items-center text-xs font-bold text-zinc-700">
          <span>Histórico Detalhado de Movimentações ({filteredMovements.length})</span>
          <span className="text-[11px] text-zinc-500 font-normal">
            Ordenado das mais recentes para as mais antigas
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#003366] text-white text-[10px] font-black uppercase tracking-wider whitespace-nowrap">
                <th className="py-3 px-3">Data e Hora</th>
                <th className="py-3 px-3">Tipo de Movimento</th>
                <th className="py-3 px-3">Doc. Origem / Referência</th>
                <th className="py-3 px-3 text-right">Qtd Movimentada</th>
                <th className="py-3 px-3 text-right bg-[#002244]">Saldo Após</th>
                <th className="py-3 px-3">Utilizador Responsável</th>
                <th className="py-3 px-3">Observações / Descrição</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-zinc-700">
              {filteredMovements.map((mov, idx) => {
                const tipo = mov.type || (mov as any).tipo;
                const isEntrada = tipo === 'entry' || tipo === 'entrada' || tipo === 'adjustment_plus' || tipo === 'ajuste_positivo';
                const qtd = Number(mov.quantity || (mov as any).quantidade || 0);
                const docOrigem = (mov as any).documento_origem || (tipo?.includes('entry') ? 'Factura de Compra' : tipo?.includes('exit') ? 'Venda / Factura' : 'Registo Manual');
                const docRef = mov.reference_id || (mov as any).referencia || '—';
                const usuario = (mov as any).created_by_nome || (mov as any).created_by_username || 'Sistema';

                return (
                  <tr key={mov.id || idx} className="hover:bg-blue-50/30 transition-colors">
                    {/* Data e Hora */}
                    <td className="py-2.5 px-3 font-mono text-[11px] text-zinc-600 whitespace-nowrap">
                      {mov.created_at ? new Date(mov.created_at).toLocaleString('pt-AO') : '—'}
                    </td>

                    {/* Tipo de Movimento */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wide inline-flex items-center gap-1 ${
                        isEntrada 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : tipo === 'transfer' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-rose-100 text-rose-800'
                      }`}>
                        {isEntrada ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                        {tipo === 'entry' ? 'Entrada (Compra)' : tipo === 'exit' ? 'Saída (Venda)' : tipo === 'adjustment_plus' ? 'Ajuste (+)' : tipo === 'adjustment_minus' ? 'Ajuste (-)' : tipo}
                      </span>
                    </td>

                    {/* Doc Origem / Referência */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="font-bold text-zinc-800 block text-[11px]">{docOrigem}</span>
                      <span className="font-mono text-[10px] text-zinc-400">{docRef}</span>
                    </td>

                    {/* Qtd Movimentada */}
                    <td className={`py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap ${
                      isEntrada ? 'text-emerald-700' : 'text-rose-700'
                    }`}>
                      {isEntrada ? `+${qtd.toLocaleString('pt-AO')}` : `-${qtd.toLocaleString('pt-AO')}`}
                    </td>

                    {/* Saldo Após Movimento */}
                    <td className="py-2.5 px-3 text-right font-mono font-black text-zinc-900 bg-blue-50/30 whitespace-nowrap">
                      {Number(mov.saldoApos ?? 0).toLocaleString('pt-AO')}
                    </td>

                    {/* Utilizador Responsável */}
                    <td className="py-2.5 px-3 text-zinc-600 font-medium whitespace-nowrap text-[11px]">
                      {usuario}
                    </td>

                    {/* Observações */}
                    <td className="py-2.5 px-3 text-zinc-500 max-w-xs truncate text-[11px]" title={mov.description || (mov as any).descricao}>
                      {mov.description || (mov as any).descricao || '—'}
                    </td>
                  </tr>
                );
              })}

              {filteredMovements.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400 font-medium">
                    Nenhuma movimentação encontrada para os filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
