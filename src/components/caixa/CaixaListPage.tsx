/**
 * CaixaListPage.tsx
 * Página Principal da Gestão Financeira de Caixa.
 * Apresenta:
 * 1. KPIs de Saldo Calculado do Banco (Saldo Inicial, Entradas, Saídas, Transf. Rec., Transf. Env., Saldo Atual)
 * 2. Barra de Filtros (Caixa, Ano/Exercício, Período, Data Inicial, Data Final, Tipo, Moeda)
 * 3. Tabela compacta de Caixas e Bancos (SEM BOTÃO ELIMINAR)
 * 4. Tabela de Movimentos do Caixa selecionado com saldo progressivo
 * 5. Menu flutuante de Opções do Caixa (Editar, Conciliação, Associar, Pagar Salário, Pagar Imposto, Transferência, Relatórios, Movimentos)
 */

import React, { useState, useMemo } from 'react';
import {
  Wallet, Plus, RefreshCw, Filter, Search, MoreVertical,
  ArrowRightLeft, ShieldCheck, Link as LinkIcon, FileText,
  History, Calculator, Users, ArrowUpCircle, ArrowDownCircle,
  Eye, Edit2, CheckCircle2, ChevronRight, X, ShieldAlert,
  Calendar, DollarSign
} from 'lucide-react';
import { Caixa, CaixaMovement } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface Props {
  caixas: Caixa[];
  movements: CaixaMovement[];
  fiscalYear: string;
  selectedCaixaId: string | null;
  onSelectCaixa: (id: string) => void;
  onRefresh: () => void;
  onOpenNovoCaixa: () => void;
  onOpenEditarCaixa: (caixa: Caixa) => void;
  onOpenNovaOperacao: (type?: 'entrada' | 'saida') => void;
  onNavigateSection: (section: 'conciliacao' | 'transferencia' | 'associar' | 'relatorios' | 'movimentos' | 'salarios' | 'impostos') => void;
  canOperateCaixa: (caixaId: string) => boolean;
}

export const CaixaListPage: React.FC<Props> = ({
  caixas,
  movements,
  fiscalYear,
  selectedCaixaId,
  onSelectCaixa,
  onRefresh,
  onOpenNovoCaixa,
  onOpenEditarCaixa,
  onOpenNovaOperacao,
  onNavigateSection,
  canOperateCaixa
}) => {
  const { user } = useAuth();

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCurrency, setActiveCurrency] = useState('ALL');
  const [filterType, setFilterType] = useState('todos');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');

  // Floating options drawer for selected Caixa
  const [activeCaixaMenu, setActiveCaixaMenu] = useState<Caixa | null>(null);

  const currentCaixa = useMemo(() => {
    if (!selectedCaixaId && caixas.length > 0) return caixas[0];
    return caixas.find(c => c.id === selectedCaixaId) || caixas[0] || null;
  }, [caixas, selectedCaixaId]);

  // Filter movements for the current selected Caixa and period
  const filteredMovements = useMemo(() => {
    if (!currentCaixa) return [];

    return movements.filter(m => {
      const cId = String(m.caixaId || (m as any).caixa_id || '');
      const tId = String(m.targetCaixaId || (m as any).target_caixa_id || '');
      const matchesCaixa = cId === currentCaixa.id || tId === currentCaixa.id;
      if (!matchesCaixa) return false;

      // Currency
      if (activeCurrency !== 'ALL') {
        const mCurr = (m.moeda === 'Kwanza' || !m.moeda) ? 'AOA' : m.moeda;
        if (mCurr !== activeCurrency) return false;
      }

      // Type
      if (filterType !== 'todos') {
        if (filterType === 'entrada' && !(m.type === 'entrada' || (m as any).tipo === 'entrada')) return false;
        if (filterType === 'saida' && !(m.type === 'saida' || (m as any).tipo === 'saida')) return false;
        if (filterType === 'transferencia' && !(m.type === 'transferencia' || (m as any).tipo === 'transferencia')) return false;
      }

      // Date range
      const mDate = m.date || (m as any).data || '';
      if (dateFrom && mDate < dateFrom) return false;
      if (dateTo && mDate > dateTo) return false;
      if (selectedMonth && !mDate.startsWith(selectedMonth)) return false;

      // Search
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const desc = (m.description || (m as any).descricao || '').toLowerCase();
        const ref = (m.referencia || '').toLowerCase();
        if (!desc.includes(term) && !ref.includes(term)) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.date || (b as any).data || 0).getTime() - new Date(a.date || (a as any).data || 0).getTime());
  }, [currentCaixa, movements, activeCurrency, filterType, dateFrom, dateTo, selectedMonth, searchTerm]);

  // Real Mathematical KPI Calculations
  const kpiStats = useMemo(() => {
    if (!currentCaixa) {
      return { initial: 0, entradas: 0, saidas: 0, transfRec: 0, transfEnv: 0, saldoAtual: 0 };
    }

    const initial = Number(currentCaixa.initialBalance || 0);
    let entradas = 0;
    let saidas = 0;
    let transfRec = 0;
    let transfEnv = 0;

    filteredMovements.forEach(m => {
      const val = Number(m.amount ?? (m as any).valor ?? 0);
      const isTransf = m.type === 'transferencia' || (m as any).tipo === 'transferencia';
      const isEntrada = m.type === 'entrada' || (m as any).tipo === 'entrada';

      if (isTransf) {
        if (isEntrada) transfRec += val;
        else transfEnv += val;
      } else {
        if (isEntrada) entradas += val;
        else saidas += val;
      }
    });

    const saldoAtual = initial + entradas - saidas + transfRec - transfEnv;

    return {
      initial,
      entradas,
      saidas,
      transfRec,
      transfEnv,
      saldoAtual
    };
  }, [currentCaixa, filteredMovements]);

  // Compute progressive balance on movements
  const movementsWithProgressiveBalance = useMemo(() => {
    if (!currentCaixa) return [];

    let running = Number(currentCaixa.initialBalance || 0);
    const chronological = [...filteredMovements].reverse();
    const result = chronological.map(m => {
      const val = Number(m.amount ?? (m as any).valor ?? 0);
      const isEntrada = m.type === 'entrada' || (m as any).tipo === 'entrada';
      if (isEntrada) running += val;
      else running -= val;
      return { ...m, progressive_balance: running };
    });

    return result.reverse();
  }, [currentCaixa, filteredMovements]);

  const fmtCurrency = (val: number, moeda?: string) => {
    return `${val.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${moeda || currentCaixa?.moeda || 'AOA'}`;
  };

  const isCurrentCaixaAllowed = currentCaixa ? canOperateCaixa(currentCaixa.id) : true;

  return (
    <div className="space-y-4">
      {/* ---------------------------------------------------------------- */}
      {/* Top Header Bar */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-zinc-200 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#003366] text-white flex items-center justify-center shadow">
            <Wallet size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-[#003366] uppercase tracking-tight">
                Gestão Financeira de Caixa
              </h2>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider border border-emerald-200">
                Exercício {fiscalYear}
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">
              Controlo em tempo real de fluxos monetários, vendas, compras e bancos
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onRefresh}
            className="p-2 border border-zinc-200 text-zinc-500 hover:text-[#003366] hover:border-[#003366] transition-all bg-white"
            title="Actualizar dados do banco"
          >
            <RefreshCw size={14} />
          </button>

          <button
            onClick={() => onOpenNovaOperacao('entrada')}
            disabled={!isCurrentCaixaAllowed}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-black uppercase tracking-wider shadow-sm disabled:opacity-40"
          >
            <ArrowUpCircle size={14} /> Entrada
          </button>

          <button
            onClick={() => onOpenNovaOperacao('saida')}
            disabled={!isCurrentCaixaAllowed}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-700 hover:bg-red-800 text-white text-[11px] font-black uppercase tracking-wider shadow-sm disabled:opacity-40"
          >
            <ArrowDownCircle size={14} /> Saída
          </button>

          <button
            onClick={() => onNavigateSection('transferencia')}
            disabled={!isCurrentCaixaAllowed}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-black uppercase tracking-wider shadow-sm disabled:opacity-40"
          >
            <ArrowRightLeft size={14} /> Transferência
          </button>

          <button
            onClick={onOpenNovoCaixa}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#003366] hover:bg-[#002244] text-white text-[11px] font-black uppercase tracking-wider shadow-sm"
          >
            <Plus size={14} /> Novo Caixa
          </button>
        </div>
      </div>

      {/* Permission Warning Banner if user is not authorized on current caixa */}
      {!isCurrentCaixaAllowed && currentCaixa && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} className="text-amber-700 flex-shrink-0" />
            <span className="font-bold">
              Este utilizador não possui permissão para realizar movimentos neste Caixa ({currentCaixa.name}). O modo está limitado a consulta.
            </span>
          </div>
          <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-amber-200 text-amber-900">
            Apenas Leitura
          </span>
        </div>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Real Calculated KPIs (Matching Requirement Section 10) */}
      {/* ---------------------------------------------------------------- */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-white border border-zinc-200 p-3 shadow-sm">
          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block">
            Saldo Inicial
          </span>
          <span className="text-xs font-black text-zinc-700 font-mono mt-1 block">
            {fmtCurrency(kpiStats.initial)}
          </span>
          <span className="text-[9px] text-zinc-400 font-medium">Abertura de tesouraria</span>
        </div>

        <div className="bg-white border border-zinc-200 p-3 shadow-sm">
          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-700 block">
            (+) Entradas
          </span>
          <span className="text-xs font-black text-emerald-700 font-mono mt-1 block">
            {fmtCurrency(kpiStats.entradas)}
          </span>
          <span className="text-[9px] text-zinc-400 font-medium">Vendas e recebimentos</span>
        </div>

        <div className="bg-white border border-zinc-200 p-3 shadow-sm">
          <span className="text-[9px] font-black uppercase tracking-widest text-red-700 block">
            (-) Saídas
          </span>
          <span className="text-xs font-black text-red-700 font-mono mt-1 block">
            {fmtCurrency(kpiStats.saidas)}
          </span>
          <span className="text-[9px] text-zinc-400 font-medium">Compras e despesas</span>
        </div>

        <div className="bg-white border border-zinc-200 p-3 shadow-sm">
          <span className="text-[9px] font-black uppercase tracking-widest text-blue-700 block">
            (+) Transf. Recebidas
          </span>
          <span className="text-xs font-black text-blue-700 font-mono mt-1 block">
            {fmtCurrency(kpiStats.transfRec)}
          </span>
          <span className="text-[9px] text-zinc-400 font-medium">Outros caixas</span>
        </div>

        <div className="bg-white border border-zinc-200 p-3 shadow-sm">
          <span className="text-[9px] font-black uppercase tracking-widest text-amber-700 block">
            (-) Transf. Enviadas
          </span>
          <span className="text-xs font-black text-amber-700 font-mono mt-1 block">
            {fmtCurrency(kpiStats.transfEnv)}
          </span>
          <span className="text-[9px] text-zinc-400 font-medium">Para outros caixas</span>
        </div>

        <div className="bg-[#003366] text-white p-3 shadow-sm">
          <span className="text-[9px] font-black uppercase tracking-widest text-blue-200 block">
            (=) Saldo Atual
          </span>
          <span className="text-sm font-black font-mono mt-1 block">
            {fmtCurrency(kpiStats.saldoAtual)}
          </span>
          <span className="text-[9px] text-blue-200 font-bold uppercase">
            {currentCaixa?.name || 'Caixa'}
          </span>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Filter Bar (Matching Requirement Section 11) */}
      {/* ---------------------------------------------------------------- */}
      <div className="bg-white border border-zinc-200 p-3 flex flex-wrap items-center gap-3 shadow-sm">
        {/* Caixa Selector */}
        <div className="min-w-[180px]">
          <select
            value={currentCaixa?.id || ''}
            onChange={e => onSelectCaixa(e.target.value)}
            className="w-full bg-zinc-50 border border-zinc-200 px-3 py-1.5 text-xs font-black text-[#003366] focus:outline-none focus:border-[#003366]"
          >
            {caixas.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.codigo_caixa || 'CX'}) — {Number(c.currentBalance).toLocaleString('pt-PT')} {c.moeda || 'AOA'}
              </option>
            ))}
          </select>
        </div>

        {/* Currency Tabs */}
        <div className="flex border border-zinc-200 text-[10px] font-black">
          {['ALL', 'AOA', 'USD', 'EUR'].map(curr => (
            <button
              key={curr}
              onClick={() => setActiveCurrency(curr)}
              className={`px-3 py-1.5 transition-all ${
                activeCurrency === curr ? 'bg-[#003366] text-white' : 'bg-white text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              {curr === 'ALL' ? 'Todas' : curr}
            </button>
          ))}
        </div>

        {/* Type Filter */}
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="bg-zinc-50 border border-zinc-200 px-2 py-1.5 text-xs font-bold text-zinc-700 focus:outline-none"
        >
          <option value="todos">Todos os Movimentos</option>
          <option value="entrada">Entradas (+)</option>
          <option value="saida">Saídas (-)</option>
          <option value="transferencia">Transferências</option>
        </select>

        {/* Dates */}
        <div className="flex items-center gap-1.5 text-xs">
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 px-2 py-1 text-xs text-zinc-800"
            title="Data Inicial"
          />
          <span className="text-zinc-400 text-xs">a</span>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 px-2 py-1 text-xs text-zinc-800"
            title="Data Final"
          />
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[160px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Pesquisar movimento, ref..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 text-xs text-zinc-800 focus:outline-none focus:border-[#003366]"
          />
        </div>

        {(searchTerm || dateFrom || dateTo || filterType !== 'todos' || activeCurrency !== 'ALL') && (
          <button
            onClick={() => {
              setSearchTerm('');
              setActiveCurrency('ALL');
              setFilterType('todos');
              setDateFrom('');
              setDateTo('');
            }}
            className="px-2 py-1 text-[10px] font-bold text-zinc-500 hover:text-red-600 uppercase"
          >
            Limpar
          </button>
        )}
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Caixas e Bancos Overview Table (Compact, NO DELETE BUTTON) */}
      {/* ---------------------------------------------------------------- */}
      <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
          <h3 className="text-xs font-black text-[#003366] uppercase tracking-wider flex items-center gap-1.5">
            <Wallet size={14} /> Caixas e Contas Bancárias da Empresa
          </h3>
          <span className="text-[10px] text-zinc-500 font-bold uppercase">
            {caixas.length} caixa(s) ativo(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-[#003366] text-white text-[10px] font-black uppercase tracking-wider">
                <th className="px-3 py-2 text-center w-12 border-r border-[#004488]">Ln</th>
                <th className="px-3 py-2 text-center w-20 border-r border-[#004488]">Código</th>
                <th className="px-3 py-2 border-r border-[#004488]">Caixa / Banco</th>
                <th className="px-3 py-2 text-center border-r border-[#004488]">Moeda</th>
                <th className="px-3 py-2 border-r border-[#004488]">Nº Conta / IBAN</th>
                <th className="px-3 py-2 border-r border-[#004488]">Responsável</th>
                <th className="px-3 py-2 text-right border-r border-[#004488]">Saldo Inicial</th>
                <th className="px-3 py-2 text-right border-r border-[#004488]">Saldo Atual</th>
                <th className="px-3 py-2 text-center border-r border-[#004488]">Permissões</th>
                <th className="px-3 py-2 text-center border-r border-[#004488]">Status</th>
                <th className="px-3 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-[11px]">
              {caixas.map((cx, idx) => {
                const isSelected = cx.id === currentCaixa?.id;
                const isOperable = canOperateCaixa(cx.id);
                const hasPermsConfigured = cx.permitted_users && cx.permitted_users.length > 0;

                return (
                  <tr
                    key={cx.id}
                    onClick={() => onSelectCaixa(cx.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50/70 border-l-4 border-l-[#003366]' : 'hover:bg-zinc-50'
                    }`}
                  >
                    <td className="px-3 py-2 text-center text-zinc-400 font-mono text-[10px] border-r border-zinc-100">
                      {idx + 1}
                    </td>
                    <td className="px-3 py-2 text-center font-mono font-bold text-zinc-700 border-r border-zinc-100">
                      {cx.codigo_caixa || 'CX'}
                    </td>
                    <td className="px-3 py-2 font-black text-[#003366] uppercase border-r border-zinc-100">
                      {cx.name}
                      {isSelected && (
                        <span className="ml-2 text-[9px] font-bold text-blue-600 bg-blue-100 px-1.5 py-0.2">
                          ATIVO
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center font-bold text-zinc-600 border-r border-zinc-100">
                      {cx.moeda || 'AOA'}
                    </td>
                    <td className="px-3 py-2 font-mono text-[10px] text-zinc-500 border-r border-zinc-100">
                      {cx.account || '—'}
                    </td>
                    <td className="px-3 py-2 text-zinc-700 border-r border-zinc-100">
                      {cx.responsible || '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-zinc-600 border-r border-zinc-100">
                      {Number(cx.initialBalance || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-black text-zinc-900 border-r border-zinc-100">
                      {Number(cx.currentBalance || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2 text-center border-r border-zinc-100">
                      <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                        hasPermsConfigured ? 'bg-blue-50 text-blue-700' : 'bg-zinc-100 text-zinc-500'
                      }`}>
                        {hasPermsConfigured ? `${cx.permitted_users?.length} Utilizador(es)` : 'Global'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center border-r border-zinc-100">
                      <span className={`px-2 py-0.5 text-[9px] font-black uppercase ${
                        cx.status === 'aberto' ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'
                      }`}>
                        {cx.status || 'aberto'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveCaixaMenu(cx);
                        }}
                        className="inline-flex items-center justify-center w-7 h-7 bg-[#003366] text-white hover:bg-[#002244] shadow-sm transition-all"
                        title="Opções do Caixa"
                      >
                        <MoreVertical size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Movements Table of Selected Caixa (Compact, Real Ledger) */}
      {/* ---------------------------------------------------------------- */}
      <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-[#003366] text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History size={15} />
            <h3 className="text-xs font-black uppercase tracking-wider">
              Movimentos Registados: {currentCaixa?.name}
            </h3>
          </div>
          <span className="text-[10px] text-blue-200 font-bold uppercase">
            {movementsWithProgressiveBalance.length} movimento(s) no período
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-zinc-100 text-zinc-600 text-[10px] font-black uppercase tracking-wider border-b border-zinc-200">
                <th className="px-3 py-2 text-center w-14 border-r border-zinc-200">MovID</th>
                <th className="px-3 py-2 border-r border-zinc-200">Data</th>
                <th className="px-3 py-2 border-r border-zinc-200">Data Valor</th>
                <th className="px-3 py-2 border-r border-zinc-200">Caixa</th>
                <th className="px-3 py-2 border-r border-zinc-200">Tipo Movimento</th>
                <th className="px-3 py-2 border-r border-zinc-200">Documento / Ref.</th>
                <th className="px-3 py-2 border-r border-zinc-200">Descrição</th>
                <th className="px-3 py-2 text-right border-r border-zinc-200">Entrada (+)</th>
                <th className="px-3 py-2 text-right border-r border-zinc-200">Saída (-)</th>
                <th className="px-3 py-2 text-right border-r border-zinc-200">Saldo</th>
                <th className="px-3 py-2">Utilizador</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-[11px]">
              {movementsWithProgressiveBalance.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-zinc-400 text-xs font-bold uppercase tracking-widest italic">
                    Nenhum movimento registado para os filtros selecionados.
                  </td>
                </tr>
              )}
              {movementsWithProgressiveBalance.map((m, idx) => {
                const val = Number(m.amount ?? (m as any).valor ?? 0);
                const isEntrada = m.type === 'entrada' || (m as any).tipo === 'entrada';
                const isTransf = m.type === 'transferencia' || (m as any).tipo === 'transferencia';
                const movId = m.id ? String(m.id).substring(0, 8).toUpperCase() : `M${idx + 1}`;

                return (
                  <tr key={m.id || idx} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-3 py-2 text-center font-mono font-bold text-zinc-500 text-[10px] border-r border-zinc-100" title={m.id}>
                      {movId}
                    </td>
                    <td className="px-3 py-2 text-zinc-600 border-r border-zinc-100">
                      {new Date(m.date || (m as any).data || 0).toLocaleDateString('pt-PT')}
                    </td>
                    <td className="px-3 py-2 text-zinc-500 font-bold border-r border-zinc-100">
                      {(m as any).data_valor ? new Date((m as any).data_valor).toLocaleDateString('pt-PT') : new Date(m.date || (m as any).data || 0).toLocaleDateString('pt-PT')}
                    </td>
                    <td className="px-3 py-2 font-bold text-[#003366] uppercase border-r border-zinc-100">
                      {currentCaixa?.name}
                    </td>
                    <td className="px-3 py-2 border-r border-zinc-100">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-black uppercase ${
                        isTransf ? 'bg-blue-100 text-blue-800' :
                        isEntrada ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {isTransf ? <ArrowRightLeft size={10} /> : isEntrada ? <ArrowUpCircle size={10} /> : <ArrowDownCircle size={10} />}
                        {isTransf ? 'Transferência' : isEntrada ? 'Entrada' : 'Saída'}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono font-bold text-[#003366] border-r border-zinc-100">
                      {m.referencia || (m.documento_id ? String(m.documento_id).substring(0, 8) : '—')}
                    </td>
                    <td className="px-3 py-2 font-medium text-zinc-800 max-w-sm truncate border-r border-zinc-100" title={m.description || (m as any).descricao}>
                      {m.description || (m as any).descricao || 'Movimento'}
                    </td>
                    <td className="px-3 py-2 text-right font-black font-mono text-emerald-600 border-r border-zinc-100">
                      {isEntrada ? val.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-black font-mono text-red-600 border-r border-zinc-100">
                      {!isEntrada ? val.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-mono font-black text-zinc-900 border-r border-zinc-100">
                      {Number((m as any).progressive_balance || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2 text-zinc-500 text-[10px]">
                      {(m as any).created_by_nome || (m as any).created_by_username || 'Sistema'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Opções do Caixa (Floating Sidebar Drawer, Matching Section 13) */}
      {/* ---------------------------------------------------------------- */}
      {activeCaixaMenu && (
        <>
          <div
            className="fixed inset-0 z-[140] bg-black/30 backdrop-blur-[1px] animate-in fade-in duration-150"
            onClick={() => setActiveCaixaMenu(null)}
          />
          <div className="fixed right-0 top-0 bottom-0 z-[150] w-80 bg-white border-l border-zinc-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#003366] text-white">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-200 block">Opções do Caixa</span>
                <span className="text-xs font-black truncate block mt-0.5">{activeCaixaMenu.name}</span>
              </div>
              <button
                onClick={() => setActiveCaixaMenu(null)}
                className="p-1 hover:bg-white/20 rounded transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Summary */}
            <div className="p-4 bg-zinc-50 border-b border-zinc-200">
              <span className="text-[9px] font-black uppercase text-zinc-400 block tracking-wider">Saldo Atual</span>
              <span className="text-base font-black text-[#003366] font-mono block">
                {Number(activeCaixaMenu.currentBalance || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} {activeCaixaMenu.moeda || 'AOA'}
              </span>
              <span className="text-[10px] text-zinc-500 font-bold block mt-1">
                Responsável: {activeCaixaMenu.responsible || '—'}
              </span>
            </div>

            {/* Actions List (EXACTLY 8 OPTIONS, NO DELETE BUTTON) */}
            <div className="flex-1 overflow-y-auto py-1">
              {[
                {
                  id: 'editar',
                  label: 'Editar',
                  desc: 'Alterar dados e utilizadores com permissão',
                  icon: Edit2,
                  color: 'text-blue-600',
                  action: () => onOpenEditarCaixa(activeCaixaMenu)
                },
                {
                  id: 'conciliacao',
                  label: 'Conciliação Bancária',
                  desc: 'Validar movimentos e extratos bancários',
                  icon: ShieldCheck,
                  color: 'text-emerald-600',
                  action: () => onNavigateSection('conciliacao')
                },
                {
                  id: 'associar',
                  label: 'Associar',
                  desc: 'Vincular movimento a vendas, compras ou despesas',
                  icon: LinkIcon,
                  color: 'text-indigo-600',
                  action: () => onNavigateSection('associar')
                },
                {
                  id: 'salario',
                  label: 'Pagar Salário',
                  desc: 'Liquidação de salários processados no ERP',
                  icon: Users,
                  color: 'text-purple-600',
                  action: () => onNavigateSection('salarios')
                },
                {
                  id: 'imposto',
                  label: 'Pagar Imposto',
                  desc: 'Histórico de pagamentos de impostos',
                  icon: Calculator,
                  color: 'text-red-600',
                  action: () => onNavigateSection('impostos')
                },
                {
                  id: 'transferencia',
                  label: 'Transferência',
                  desc: 'Transferir fundos para outro caixa',
                  icon: ArrowRightLeft,
                  color: 'text-amber-600',
                  action: () => onNavigateSection('transferencia')
                },
                {
                  id: 'relatorios',
                  label: 'Relatórios',
                  desc: 'Relatório financeiro analítico de caixa',
                  icon: FileText,
                  color: 'text-teal-600',
                  action: () => onNavigateSection('relatorios')
                },
                {
                  id: 'movimentos',
                  label: 'Movimentos',
                  desc: 'Histórico detalhado deste caixa',
                  icon: History,
                  color: 'text-zinc-700',
                  action: () => onNavigateSection('movimentos')
                },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => {
                    opt.action();
                    setActiveCaixaMenu(null);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50/50 transition-colors text-left border-b border-zinc-50 last:border-0 group"
                >
                  <div className={`w-8 h-8 flex items-center justify-center ${opt.color} bg-zinc-100 group-hover:bg-white rounded-none border border-zinc-200 flex-shrink-0 transition-colors`}>
                    <opt.icon size={15} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-black text-zinc-800 group-hover:text-[#003366] transition-colors">{opt.label}</div>
                    <div className="text-[9px] text-zinc-400 uppercase tracking-wide truncate">{opt.desc}</div>
                  </div>
                </button>
              ))}
            </div>

            <div className="p-3 bg-zinc-50 border-t border-zinc-100 text-center">
              <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">
                IMATEC SOFTWARE • GESTÃO DE CAIXA
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CaixaListPage;
