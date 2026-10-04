/**
 * RelatorioFinanceiroCaixaPage.tsx
 * Página de Relatório Financeiro do Caixa.
 * Cálculos matemáticos reais do banco de dados:
 * SALDO INICIAL + ENTRADAS - SAÍDAS + TRANSF. RECEBIDAS - TRANSF. ENVIADAS = SALDO FINAL
 * Inclui botão de impressão limpo 🖨️ IMPRIMIR.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileSpreadsheet, ChevronLeft, Printer, RefreshCw,
  Filter, Calendar, TrendingUp, TrendingDown, ArrowRightLeft, DollarSign
} from 'lucide-react';
import { Caixa } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface Props {
  caixas: Caixa[];
  selectedCaixaId?: string | null;
  fiscalYear: string;
  onBack: () => void;
  companyData?: any;
}

export const RelatorioFinanceiroCaixaPage: React.FC<Props> = ({
  caixas,
  selectedCaixaId,
  fiscalYear,
  onBack,
  companyData
}) => {
  const { user } = useAuth();
  const [activeCaixaId, setActiveCaixaId] = useState<string>(
    selectedCaixaId || caixas[0]?.id || ''
  );
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [periodo, setPeriodo] = useState<string>('ano');
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const selectedCaixa = caixas.find(c => c.id === activeCaixaId);

  const fetchReportData = useCallback(async () => {
    if (!user?.empresa_id || !activeCaixaId) return;
    setLoading(true);
    try {
      let query = supabase
        .from('caixa_movimentacoes')
        .select('*')
        .eq('empresa_id', user.empresa_id)
        .eq('caixa_id', activeCaixaId)
        .order('data', { ascending: true });

      if (fiscalYear) {
        query = query.eq('ano', Number(fiscalYear));
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
      toast.error('Erro ao gerar relatório de caixa.');
    } finally {
      setLoading(false);
    }
  }, [user?.empresa_id, activeCaixaId, fiscalYear, dateFrom, dateTo]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Calculations
  const stats = useMemo(() => {
    const initial = Number(selectedCaixa?.initialBalance ?? 0);
    let entradas = 0;
    let saidas = 0;
    let transfRecebidas = 0;
    let transfEnviadas = 0;

    movements.forEach(m => {
      const val = Number(m.valor ?? m.amount ?? 0);
      const isTransf = m.tipo === 'transferencia' || m.type === 'transferencia';
      const isEntrada = m.type === 'entrada' || m.tipo === 'entrada';

      if (isTransf) {
        if (isEntrada) transfRecebidas += val;
        else transfEnviadas += val;
      } else {
        if (isEntrada) entradas += val;
        else saidas += val;
      }
    });

    const saldoFinal = initial + entradas - saidas + transfRecebidas - transfEnviadas;

    return {
      initial,
      entradas,
      saidas,
      transfRecebidas,
      transfEnviadas,
      saldoFinal
    };
  }, [selectedCaixa, movements]);

  const handlePrint = () => {
    window.print();
  };

  const fmtCurrency = (val: number) => {
    return val.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-4">
      {/* Header controls (hidden on print) */}
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3 bg-white border border-zinc-200 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 hover:bg-zinc-100 rounded text-zinc-500 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div className="w-10 h-10 bg-[#003366] text-white flex items-center justify-center">
            <FileSpreadsheet size={20} />
          </div>
          <div>
            <h2 className="text-base font-black text-[#003366] uppercase tracking-wider">
              Relatório Financeiro do Caixa
            </h2>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
              Demonstração analítica de fluxos e saldos consolidados
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
                {c.name} ({c.moeda || 'AOA'})
              </option>
            ))}
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 px-2 py-1.5 text-xs text-zinc-800"
            title="Data Inicial"
          />
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 px-2 py-1.5 text-xs text-zinc-800"
            title="Data Final"
          />

          <button
            onClick={fetchReportData}
            className="p-1.5 border border-zinc-200 text-zinc-500 hover:text-[#003366] bg-white"
            title="Actualizar"
          >
            <RefreshCw size={14} />
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#003366] hover:bg-[#002244] text-white text-xs font-black uppercase tracking-wider shadow-sm transition-all"
          >
            <Printer size={14} />
            Imprimir
          </button>
        </div>
      </div>

      {/* Printable Report Document */}
      <div className="bg-white border border-zinc-200 p-8 shadow-sm space-y-6 print:border-none print:shadow-none print:p-0">
        {/* Document Header */}
        <div className="border-b border-zinc-200 pb-4 flex justify-between items-start">
          <div>
            <h1 className="text-xl font-black text-[#003366] uppercase tracking-tight">
              {companyData?.nome_comercial || companyData?.name || 'IMATEC SOFTWARE'}
            </h1>
            <p className="text-xs text-zinc-500 font-bold uppercase mt-0.5">
              NIF: {companyData?.nif || '5000000000'} • {companyData?.cidade || 'Luanda, Angola'}
            </p>
            <h2 className="text-sm font-black text-zinc-800 uppercase tracking-wider mt-3">
              Relatório Financeiro de Caixa e Bancos
            </h2>
            <p className="text-xs text-zinc-600">
              Caixa: <strong>{selectedCaixa?.name}</strong> • Moeda: <strong>{selectedCaixa?.moeda || 'AOA'}</strong> • Exercício: <strong>{fiscalYear}</strong>
            </p>
          </div>
          <div className="text-right text-xs text-zinc-500">
            <p>Data de Emissão: {new Date().toLocaleDateString('pt-PT')}</p>
            <p>Hora: {new Date().toLocaleTimeString('pt-PT')}</p>
          </div>
        </div>

        {/* Financial Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="bg-zinc-50 border border-zinc-200 p-3">
            <span className="text-[9px] font-black uppercase tracking-wider text-zinc-400 block">Saldo Inicial</span>
            <span className="text-xs font-black text-zinc-700 font-mono mt-1 block">
              {fmtCurrency(stats.initial)}
            </span>
          </div>

          <div className="bg-emerald-50 border border-emerald-200 p-3">
            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 block">(+) Entradas</span>
            <span className="text-xs font-black text-emerald-800 font-mono mt-1 block">
              {fmtCurrency(stats.entradas)}
            </span>
          </div>

          <div className="bg-red-50 border border-red-200 p-3">
            <span className="text-[9px] font-black uppercase tracking-wider text-red-700 block">(-) Saídas</span>
            <span className="text-xs font-black text-red-800 font-mono mt-1 block">
              {fmtCurrency(stats.saidas)}
            </span>
          </div>

          <div className="bg-blue-50 border border-blue-200 p-3">
            <span className="text-[9px] font-black uppercase tracking-wider text-blue-700 block">(+) Transf. Rec.</span>
            <span className="text-xs font-black text-blue-800 font-mono mt-1 block">
              {fmtCurrency(stats.transfRecebidas)}
            </span>
          </div>

          <div className="bg-amber-50 border border-amber-200 p-3">
            <span className="text-[9px] font-black uppercase tracking-wider text-amber-700 block">(-) Transf. Env.</span>
            <span className="text-xs font-black text-amber-800 font-mono mt-1 block">
              {fmtCurrency(stats.transfEnviadas)}
            </span>
          </div>

          <div className="bg-[#003366] text-white p-3">
            <span className="text-[9px] font-black uppercase tracking-wider text-blue-200 block">(=) Saldo Final</span>
            <span className="text-xs font-black font-mono mt-1 block">
              {fmtCurrency(stats.saldoFinal)}
            </span>
          </div>
        </div>

        {/* Movements Ledger */}
        <div className="border border-zinc-200 overflow-hidden">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-[#003366] text-white text-[10px] font-black uppercase tracking-wider">
                <th className="p-2 border-r border-[#004488]">Data</th>
                <th className="p-2 border-r border-[#004488]">Tipo</th>
                <th className="p-2 border-r border-[#004488]">Documento / Ref.</th>
                <th className="p-2 border-r border-[#004488]">Descrição do Movimento</th>
                <th className="p-2 border-r border-[#004488] text-right">Entrada</th>
                <th className="p-2 border-r border-[#004488] text-right">Saída</th>
                <th className="p-2 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 text-[11px]">
              {loading && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-zinc-400">A carregar dados...</td>
                </tr>
              )}
              {!loading && movements.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-400 italic">Sem movimentos no período selecionado.</td>
                </tr>
              )}
              {(() => {
                let running = stats.initial;
                return movements.map((m, idx) => {
                  const val = Number(m.valor ?? m.amount ?? 0);
                  const isEntrada = m.type === 'entrada' || m.tipo === 'entrada';
                  if (isEntrada) running += val;
                  else running -= val;

                  return (
                    <tr key={m.id || idx} className="hover:bg-zinc-50">
                      <td className="p-2 border-r border-zinc-100 font-mono text-zinc-600">
                        {new Date(m.data || m.date || m.created_at).toLocaleDateString('pt-PT')}
                      </td>
                      <td className="p-2 border-r border-zinc-100 uppercase font-black text-[9px]">
                        {m.tipo || m.type}
                      </td>
                      <td className="p-2 border-r border-zinc-100 font-mono font-bold text-[#003366]">
                        {m.referencia || (m.documento_id ? String(m.documento_id).substring(0, 8) : '—')}
                      </td>
                      <td className="p-2 border-r border-zinc-100 text-zinc-800">
                        {m.descricao || m.description}
                      </td>
                      <td className="p-2 border-r border-zinc-100 text-right font-mono font-bold text-emerald-600">
                        {isEntrada ? fmtCurrency(val) : '—'}
                      </td>
                      <td className="p-2 border-r border-zinc-100 text-right font-mono font-bold text-red-600">
                        {!isEntrada ? fmtCurrency(val) : '—'}
                      </td>
                      <td className="p-2 text-right font-mono font-black text-zinc-900">
                        {fmtCurrency(running)}
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>

        {/* Footer Signature */}
        <div className="pt-8 border-t border-zinc-200 grid grid-cols-2 gap-12 text-center text-xs text-zinc-600">
          <div>
            <div className="border-b border-zinc-400 w-48 mx-auto mb-1" />
            <p className="font-bold">O Operador / Responsável</p>
          </div>
          <div>
            <div className="border-b border-zinc-400 w-48 mx-auto mb-1" />
            <p className="font-bold">A Direção Financeira</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RelatorioFinanceiroCaixaPage;
