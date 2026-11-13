/**
 * TransferenciaCaixasPage.tsx
 * Página dedicada de Transferências entre Caixas.
 * Contém Lista histórica de Transferências e Formulário de Nova Transferência Atómica.
 * Conexão direta ao banco via Supabase e RPC transferir_entre_caixas.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowRightLeft, Plus, ChevronLeft, RefreshCw, Send,
  AlertCircle, CheckCircle2, ShieldAlert, Calendar, DollarSign
} from 'lucide-react';
import { Caixa, CaixaMovement } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface Props {
  caixas: Caixa[];
  selectedCaixaId?: string | null;
  onBack: () => void;
  onTransferSuccess: () => void;
  canOperateCaixa: (caixaId: string) => boolean;
  transferirCaixas: (params: any) => Promise<any>;
}

export const TransferenciaCaixasPage: React.FC<Props> = ({
  caixas,
  selectedCaixaId,
  onBack,
  onTransferSuccess,
  canOperateCaixa,
  transferirCaixas
}) => {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    data: new Date().toISOString().split('T')[0],
    from_caixa_id: selectedCaixaId || (caixas[0]?.id ?? ''),
    to_caixa_id: '',
    valor: '',
    moeda: 'AOA',
    descricao: '',
    referencia: '',
    observacao: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Load transfers list from caixa_movimentacoes
  const fetchTransfers = useCallback(async () => {
    if (!user?.empresa_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('caixa_movimentacoes')
        .select('*')
        .eq('empresa_id', user.empresa_id)
        .eq('tipo', 'transferencia')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group paired transfers by documento_id / referencia
      const map = new Map<string, any>();
      (data || []).forEach(m => {
        const key = m.documento_id || m.referencia || m.id;
        if (!map.has(key)) {
          map.set(key, {
            id: key,
            referencia: m.referencia || 'TRANSF',
            data: m.data || m.date || m.created_at,
            valor: Number(m.valor ?? m.amount ?? 0),
            moeda: m.moeda || 'AOA',
            descricao: m.descricao || m.description || '',
            utilizador: m.created_by_nome || m.created_by_username || 'Sistema',
            from_caixa_id: m.type === 'saida' ? m.caixa_id : m.target_caixa_id,
            to_caixa_id: m.type === 'entrada' ? m.caixa_id : m.target_caixa_id,
            status: 'Concluído'
          });
        } else {
          const item = map.get(key);
          if (m.type === 'saida') item.from_caixa_id = m.caixa_id;
          if (m.type === 'entrada') item.to_caixa_id = m.caixa_id;
        }
      });

      setTransfers(Array.from(map.values()));
    } catch (err: any) {
      console.error('Erro ao carregar transferências:', err);
      toast.error('Não foi possível carregar a lista de transferências.');
    } finally {
      setLoading(false);
    }
  }, [user?.empresa_id]);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(formData.valor);

    if (formData.from_caixa_id === formData.to_caixa_id) {
      toast.error('O Caixa de Origem deve ser diferente do Caixa de Destino.');
      return;
    }

    if (isNaN(amount) || amount <= 0) {
      toast.error('O valor deve ser superior a zero.');
      return;
    }

    if (!canOperateCaixa(formData.from_caixa_id)) {
      toast.error('Este utilizador não possui permissão para realizar movimentos neste Caixa de origem.');
      return;
    }

    const fromCaixa = caixas.find(c => c.id === formData.from_caixa_id);
    if (fromCaixa && Number(fromCaixa.currentBalance) < amount) {
      toast.error(`Saldo insuficiente no caixa de origem (Saldo: ${Number(fromCaixa.currentBalance).toLocaleString('pt-PT')} ${fromCaixa.moeda || 'AOA'}).`);
      return;
    }

    setSubmitting(true);
    try {
      const desc = formData.descricao.trim() || `Transferência de fundos`;
      await transferirCaixas({
        fromCaixaId: formData.from_caixa_id,
        toCaixaId: formData.to_caixa_id,
        amount,
        moeda: formData.moeda,
        description: desc
      });

      toast.success('Transferência intercaixa realizada com sucesso!');
      setShowForm(false);
      setFormData({
        data: new Date().toISOString().split('T')[0],
        from_caixa_id: selectedCaixaId || (caixas[0]?.id ?? ''),
        to_caixa_id: '',
        valor: '',
        moeda: 'AOA',
        descricao: '',
        referencia: '',
        observacao: ''
      });
      await fetchTransfers();
      onTransferSuccess();
    } catch (err: any) {
      console.error('Erro na transferência:', err);
      toast.error(`Falha na transferência: ${err.message || 'Erro de execução no banco'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const getCaixaName = (id?: string) => {
    if (!id) return '—';
    const c = caixas.find(cx => cx.id === id);
    return c ? c.name : id;
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-zinc-200 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 hover:bg-zinc-100 rounded text-zinc-500 transition-colors"
            title="Voltar"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="w-10 h-10 bg-[#003366] text-white flex items-center justify-center">
            <ArrowRightLeft size={20} />
          </div>
          <div>
            <h2 className="text-base font-black text-[#003366] uppercase tracking-wider">
              Transferência Entre Caixas
            </h2>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
              Movimentação atómica de fundos com referência partilhada
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchTransfers}
            className="p-2 border border-zinc-200 text-zinc-500 hover:text-[#003366] hover:border-[#003366] transition-all bg-white"
            title="Recarregar"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-[#003366] hover:bg-[#002244] text-white text-xs font-black uppercase tracking-wider transition-all shadow-sm"
          >
            <Plus size={14} />
            {showForm ? 'Fechar Formulário' : 'Nova Transferência'}
          </button>
        </div>
      </div>

      {/* Form Section */}
      {showForm && (
        <div className="bg-white border border-zinc-200 shadow-sm p-6 max-w-3xl mx-auto animate-in fade-in duration-200">
          <div className="flex items-center gap-2 border-b border-zinc-100 pb-3 mb-5">
            <Send size={16} className="text-[#003366]" />
            <h3 className="text-xs font-black text-[#003366] uppercase tracking-wider">
              Formulário de Transferência Intercaixa
            </h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">
                  Caixa de Origem (Saída) *
                </label>
                <select
                  required
                  value={formData.from_caixa_id}
                  onChange={e => setFormData(f => ({ ...f, from_caixa_id: e.target.value }))}
                  className="w-full bg-zinc-50 border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-800 focus:outline-none focus:border-[#003366]"
                >
                  <option value="">Selecione o caixa de origem</option>
                  {caixas.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Saldo: {Number(c.currentBalance).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} {c.moeda || 'AOA'})
                    </option>
                  ))}
                </select>
                {formData.from_caixa_id && !canOperateCaixa(formData.from_caixa_id) && (
                  <p className="text-[9px] text-red-500 font-bold flex items-center gap-1 mt-1">
                    <ShieldAlert size={12} /> Utilizador sem permissão neste caixa.
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">
                  Caixa de Destino (Entrada) *
                </label>
                <select
                  required
                  value={formData.to_caixa_id}
                  onChange={e => setFormData(f => ({ ...f, to_caixa_id: e.target.value }))}
                  className="w-full bg-zinc-50 border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-800 focus:outline-none focus:border-[#003366]"
                >
                  <option value="">Selecione o caixa de destino</option>
                  {caixas.map(c => (
                    <option key={c.id} value={c.id} disabled={c.id === formData.from_caixa_id}>
                      {c.name} {c.id === formData.from_caixa_id ? '(Origem)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">
                  Valor da Transferência *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0,00"
                    value={formData.valor}
                    onChange={e => setFormData(f => ({ ...f, valor: e.target.value }))}
                    className="w-full bg-zinc-50 border border-zinc-200 pl-8 pr-3 py-2 text-xs font-black text-zinc-900 focus:outline-none focus:border-[#003366]"
                  />
                  <DollarSign size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">
                  Data da Transferência
                </label>
                <input
                  type="date"
                  value={formData.data}
                  onChange={e => setFormData(f => ({ ...f, data: e.target.value }))}
                  className="w-full bg-zinc-50 border border-zinc-200 px-3 py-2 text-xs text-zinc-800 focus:outline-none focus:border-[#003366]"
                />
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">
                  Descrição / Motivo
                </label>
                <input
                  type="text"
                  placeholder="Ex: Reforço de caixa operacional da Loja"
                  value={formData.descricao}
                  onChange={e => setFormData(f => ({ ...f, descricao: e.target.value }))}
                  className="w-full bg-zinc-50 border border-zinc-200 px-3 py-2 text-xs text-zinc-800 focus:outline-none focus:border-[#003366]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-xs font-black uppercase tracking-wider border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-2 bg-[#003366] hover:bg-[#002244] text-white text-xs font-black uppercase tracking-wider shadow-md disabled:opacity-50"
              >
                {submitting ? 'A Processar...' : 'Confirmar Transferência'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Transfers Table */}
      <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 bg-[#003366] text-white flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
            <ArrowRightLeft size={14} /> Histórico de Transferências Registadas
          </h3>
          <span className="text-[10px] text-blue-200 font-bold uppercase">
            {transfers.length} registo(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-zinc-100 text-zinc-600 text-[10px] font-black uppercase tracking-wider border-b border-zinc-200">
                <th className="px-3 py-2 text-center w-24">Referência</th>
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Caixa Origem</th>
                <th className="px-3 py-2">Caixa Destino</th>
                <th className="px-3 py-2 text-right">Valor</th>
                <th className="px-3 py-2 text-center">Moeda</th>
                <th className="px-3 py-2">Descrição</th>
                <th className="px-3 py-2 text-center">Estado</th>
                <th className="px-3 py-2">Utilizador</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-zinc-400 font-bold uppercase text-xs">
                    A carregar transferências...
                  </td>
                </tr>
              )}
              {!loading && transfers.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-zinc-400 text-xs font-bold uppercase tracking-widest italic">
                    Nenhuma transferência entre caixas registada.
                  </td>
                </tr>
              )}
              {!loading && transfers.map((t, idx) => (
                <tr key={t.id || idx} className="hover:bg-blue-50/30 transition-colors text-[11px]">
                  <td className="px-3 py-2 text-center font-mono font-bold text-[#003366]">
                    {t.referencia}
                  </td>
                  <td className="px-3 py-2 text-zinc-600">
                    {new Date(t.data).toLocaleDateString('pt-PT')}
                  </td>
                  <td className="px-3 py-2 font-bold text-red-700">
                    {getCaixaName(t.from_caixa_id)}
                  </td>
                  <td className="px-3 py-2 font-bold text-emerald-700">
                    {getCaixaName(t.to_caixa_id)}
                  </td>
                  <td className="px-3 py-2 text-right font-black text-zinc-900 font-mono">
                    {t.valor.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className="px-1.5 py-0.5 bg-zinc-100 text-zinc-600 text-[9px] font-black uppercase">
                      {t.moeda}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-zinc-600 max-w-xs truncate">
                    {t.descricao}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-black uppercase">
                      <CheckCircle2 size={10} /> Concluída
                    </span>
                  </td>
                  <td className="px-3 py-2 text-zinc-500 text-[10px]">
                    {t.utilizador}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TransferenciaCaixasPage;
