/**
 * MovimentosCaixaPage.tsx
 * Página de Movimentos de Caixa detalhados.
 * Mostra todos os movimentos financeiros reais do Caixa selecionado.
 * Suporta filtros por Tipo (Entrada, Saída, Transferência), Período, Data e Pesquisa.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  History, ChevronLeft, RefreshCw, Search, Filter,
  ArrowUpCircle, ArrowDownCircle, ArrowRightLeft, FileText, ChevronDown
} from 'lucide-react';
import { Caixa, CaixaMovement } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface Props {
  caixas: Caixa[];
  selectedCaixaId?: string | null;
  fiscalYear: string;
  onBack: () => void;
}

export const MovimentosCaixaPage: React.FC<Props> = ({
  caixas,
  selectedCaixaId,
  fiscalYear,
  onBack
}) => {
  const { user } = useAuth();
  const [activeCaixaId, setActiveCaixaId] = useState<string>(
    selectedCaixaId || caixas[0]?.id || ''
  );
  const [filterType, setFilterType] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const selectedCaixa = caixas.find(c => c.id === activeCaixaId);

  const fetchMovements = useCallback(async () => {
    if (!user?.empresa_id || !activeCaixaId) return;
    setLoading(true);
    try {
      let query = supabase
        .from('caixa_movimentacoes')
        .select('*')
        .eq('empresa_id', user.empresa_id)
        .eq('caixa_id', activeCaixaId)
        .order('data', { ascending: false });

      if (fiscalYear) {
        query = query.eq('ano', Number(fiscalYear));
      }
      if (filterType !== 'todos') {
        if (filterType === 'transferencia') {
          query = query.eq('tipo', 'transferencia');
        } else {
          query = query.eq('type', filterType);
        }
      }
      if (dateFrom) {
        query = query.gte('data', dateFrom);
      }
      if (dateTo) {
        query = query.lte('data', dateTo);
      }

      const { data, error } = await query;
      if (error) throw error;
      setMovements(data || []);
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao carregar movimentos do caixa.');
    } finally {
      setLoading(false);
    }
  }, [user?.empresa_id, activeCaixaId, fiscalYear, filterType, dateFrom, dateTo]);

  useEffect(() => {
    fetchMovements();
  }, [fetchMovements]);

  const filtered = movements.filter(m => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (m.descricao || m.description || '').toLowerCase().includes(term) ||
      (m.referencia || '').toLowerCase().includes(term) ||
      (m.documento_id || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-zinc-200 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 hover:bg-zinc-100 rounded text-zinc-500 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div className="w-10 h-10 bg-[#003366] text-white flex items-center justify-center">
            <History size={20} />
          </div>
          <div>
            <h2 className="text-base font-black text-[#003366] uppercase tracking-wider">
              Movimentos do Caixa: {selectedCaixa?.name}
            </h2>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
              Extrato completo de entradas, saídas e transferências
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={activeCaixaId}
            onChange={e => setActiveCaixaId(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 px-3 py-1.5 text-xs font-bold text-zinc-800 focus:outline-none focus:border-[#003366]"
          >
            {caixas.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            onClick={fetchMovements}
            className="p-1.5 border border-zinc-200 text-zinc-500 hover:text-[#003366] bg-white"
            title="Actualizar"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-zinc-200 p-3 flex flex-wrap items-center gap-3 shadow-sm">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Pesquisar por descrição, referência..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 text-xs text-zinc-800 focus:outline-none focus:border-[#003366]"
          />
        </div>

        {/* Type Filter */}
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="bg-zinc-50 border border-zinc-200 px-2 py-1.5 text-xs font-bold text-zinc-700 focus:outline-none focus:border-[#003366]"
        >
          <option value="todos">Todos os Tipos</option>
          <option value="entrada">Apenas Entradas (+)</option>
          <option value="saida">Apenas Saídas (-)</option>
          <option value="transferencia">Transferências</option>
        </select>

        {/* Dates */}
        <input
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          className="bg-zinc-50 border border-zinc-200 px-2 py-1.5 text-xs text-zinc-800"
          title="Data De"
        />
        <input
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          className="bg-zinc-50 border border-zinc-200 px-2 py-1.5 text-xs text-zinc-800"
          title="Data Até"
        />
      </div>

      {/* Movements Table */}
      <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-[#003366] text-white text-[10px] font-black uppercase tracking-wider">
                <th className="px-3 py-2.5 text-center w-14">MovID</th>
                <th className="px-3 py-2.5">Data</th>
                <th className="px-3 py-2.5">Data Valor</th>
                <th className="px-3 py-2.5">Caixa</th>
                <th className="px-3 py-2.5">Tipo Movimento</th>
                <th className="px-3 py-2.5">Documento / Ref.</th>
                <th className="px-3 py-2.5">Descrição</th>
                <th className="px-3 py-2.5 text-right">Entrada</th>
                <th className="px-3 py-2.5 text-right">Saída</th>
                <th className="px-3 py-2.5">Utilizador</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-[11px]">
              {loading && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-zinc-400 font-bold uppercase text-xs">
                    A carregar movimentos...
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-zinc-400 text-xs font-bold uppercase tracking-widest italic">
                    Nenhum movimento encontrado.
                  </td>
                </tr>
              )}
              {!loading && filtered.map((m) => {
                const val = Number(m.valor ?? m.amount ?? 0);
                const isEntrada = m.type === 'entrada' || m.tipo === 'entrada';

                return (
                  <tr key={m.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-3 py-2 text-center font-mono font-bold text-zinc-500 text-[10px]" title={m.id}>
                      {String(m.id).substring(0, 8)}
                    </td>
                    <td className="px-3 py-2 text-zinc-600">
                      {new Date(m.data || m.date || m.created_at).toLocaleDateString('pt-PT')}
                    </td>
                    <td className="px-3 py-2 text-zinc-500 font-bold">
                      {m.data_valor ? new Date(m.data_valor).toLocaleDateString('pt-PT') : new Date(m.data || m.date || m.created_at).toLocaleDateString('pt-PT')}
                    </td>
                    <td className="px-3 py-2 font-bold text-[#003366] uppercase">
                      {selectedCaixa?.name}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-black uppercase ${
                        isEntrada ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {isEntrada ? <ArrowUpCircle size={10} /> : <ArrowDownCircle size={10} />}
                        {m.tipo || m.type}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono font-bold text-[#003366]">
                      {m.referencia || (m.documento_id ? String(m.documento_id).substring(0, 8) : '—')}
                    </td>
                    <td className="px-3 py-2 font-medium text-zinc-800 max-w-sm truncate" title={m.descricao || m.description}>
                      {m.descricao || m.description || 'Movimento financeiro'}
                    </td>
                    <td className="px-3 py-2 text-right font-black font-mono text-emerald-600">
                      {isEntrada ? val.toLocaleString('pt-PT', { minimumFractionDigits: 2 }) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-black font-mono text-red-600">
                      {!isEntrada ? val.toLocaleString('pt-PT', { minimumFractionDigits: 2 }) : '—'}
                    </td>
                    <td className="px-3 py-2 text-zinc-500 text-[10px]">
                      {m.created_by_nome || m.created_by_username || 'Sistema'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MovimentosCaixaPage;
