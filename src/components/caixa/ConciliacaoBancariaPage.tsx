/**
 * ConciliacaoBancariaPage.tsx
 * Página dedicada de Conciliação Bancária de Caixa.
 * Interface profissional com lista compacta e formulário lateral de conciliação.
 * Estados: CONCILIADO | PENDENTE | DIFERENÇA.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck, ChevronLeft, RefreshCw, CheckCircle2,
  Clock, AlertTriangle, FileText, Check, X, Search, Filter
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
  canOperateCaixa: (caixaId: string) => boolean;
}

export const ConciliacaoBancariaPage: React.FC<Props> = ({
  caixas,
  selectedCaixaId,
  fiscalYear,
  onBack,
  canOperateCaixa
}) => {
  const { user } = useAuth();
  const [activeCaixaId, setActiveCaixaId] = useState<string>(
    selectedCaixaId || caixas[0]?.id || ''
  );
  const [movements, setMovements] = useState<any[]>([]);
  const [conciliations, setConciliations] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedMov, setSelectedMov] = useState<any | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    conta_bancaria: '',
    movimento_bancario_ref: '',
    data_conciliacao: new Date().toISOString().split('T')[0],
    valor_extrato: '',
    justificativa: '',
    observacao: ''
  });
  const [saving, setSaving] = useState(false);

  const selectedCaixa = caixas.find(c => c.id === activeCaixaId);

  const fetchConciliationsData = useCallback(async () => {
    if (!user?.empresa_id || !activeCaixaId) return;
    setLoading(true);
    try {
      // 1. Fetch movements for this caixa
      const { data: movData, error: movErr } = await supabase
        .from('caixa_movimentacoes')
        .select('*')
        .eq('empresa_id', user.empresa_id)
        .eq('caixa_id', activeCaixaId)
        .order('data', { ascending: false });

      if (movErr) throw movErr;

      // 2. Fetch existing conciliations
      const { data: concData, error: concErr } = await supabase
        .from('caixa_conciliacoes')
        .select('*')
        .eq('empresa_id', user.empresa_id)
        .eq('caixa_id', activeCaixaId);

      if (concErr) throw concErr;

      const cMap = new Map<string, any>();
      (concData || []).forEach(c => {
        cMap.set(c.movimento_id, c);
      });
      setConciliations(cMap);

      // Compute progressive balance
      let currentBal = Number(selectedCaixa?.initialBalance ?? 0);
      const reversed = [...(movData || [])].reverse();
      const withBal = reversed.map(m => {
        const val = Number(m.valor ?? m.amount ?? 0);
        const isEntrada = m.type === 'entrada' || m.tipo === 'entrada';
        if (isEntrada) currentBal += val;
        else currentBal -= val;
        return { ...m, saldo_calc: currentBal };
      }).reverse();

      setMovements(withBal);
    } catch (err: any) {
      console.error('Erro ao carregar conciliações:', err);
      toast.error('Erro ao carregar dados de conciliação.');
    } finally {
      setLoading(false);
    }
  }, [user?.empresa_id, activeCaixaId, selectedCaixa]);

  useEffect(() => {
    fetchConciliationsData();
  }, [fetchConciliationsData]);

  const handleOpenConciliar = (m: any) => {
    const existing = conciliations.get(m.id);
    setSelectedMov(m);
    setFormData({
      conta_bancaria: existing?.conta_bancaria || selectedCaixa?.account || '',
      movimento_bancario_ref: existing?.movimento_bancario_ref || m.referencia || '',
      data_conciliacao: existing?.data_conciliacao || new Date().toISOString().split('T')[0],
      valor_extrato: existing ? String(existing.valor_extrato) : String(m.valor ?? m.amount ?? 0),
      justificativa: existing?.justificativa || '',
      observacao: existing?.observacao || ''
    });
  };

  const handleSaveConciliacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMov || !user?.empresa_id) return;

    if (!canOperateCaixa(activeCaixaId)) {
      toast.error('Este utilizador não possui permissão para realizar conciliações neste Caixa.');
      return;
    }

    const valMov = Number(selectedMov.valor ?? selectedMov.amount ?? 0);
    const valExtrato = parseFloat(formData.valor_extrato);
    if (isNaN(valExtrato)) {
      toast.error('Informe um valor de extrato válido.');
      return;
    }

    const diff = Math.round((valExtrato - valMov) * 100) / 100;
    let estado = 'CONCILIADO';
    if (diff !== 0) {
      if (!formData.justificativa.trim()) {
        toast.error('Existe uma diferença entre o valor do sistema e o extrato bancário. Indique obrigatoriamente a justificativa.');
        return;
      }
      estado = 'DIFERENCA';
    }

    setSaving(true);
    try {
      // Upsert into caixa_conciliacoes
      const existing = conciliations.get(selectedMov.id);
      if (existing?.id) {
        const { error } = await supabase
          .from('caixa_conciliacoes')
          .update({
            conta_bancaria: formData.conta_bancaria,
            movimento_bancario_ref: formData.movimento_bancario_ref,
            data_conciliacao: formData.data_conciliacao,
            valor_movimento: valMov,
            valor_extrato: valExtrato,
            diferenca: diff,
            estado_conciliacao: estado,
            justificativa: formData.justificativa,
            observacao: formData.observacao,
            utilizador_id: user.id
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('caixa_conciliacoes')
          .insert([{
            empresa_id: user.empresa_id,
            caixa_id: activeCaixaId,
            movimento_id: selectedMov.id,
            documento_ref: selectedMov.referencia || selectedMov.documento_id,
            conta_bancaria: formData.conta_bancaria,
            movimento_bancario_ref: formData.movimento_bancario_ref,
            data_conciliacao: formData.data_conciliacao,
            valor_movimento: valMov,
            valor_extrato: valExtrato,
            diferenca: diff,
            estado_conciliacao: estado,
            justificativa: formData.justificativa,
            observacao: formData.observacao,
            utilizador_id: user.id
          }]);

        if (error) throw error;
      }

      toast.success(estado === 'CONCILIADO' ? 'Movimento conciliado com sucesso!' : 'Conciliação com diferença registada com justificativa.');
      setSelectedMov(null);
      await fetchConciliationsData();
    } catch (err: any) {
      console.error('Erro ao guardar conciliação:', err);
      toast.error(`Falha ao registar conciliação: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-zinc-200 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 hover:bg-zinc-100 rounded text-zinc-500 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div className="w-10 h-10 bg-[#003366] text-white flex items-center justify-center">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h2 className="text-base font-black text-[#003366] uppercase tracking-wider">
              Conciliação Bancária
            </h2>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
              Validação entre movimentos de caixa e extratos bancários
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Caixa selector */}
          <select
            value={activeCaixaId}
            onChange={e => setActiveCaixaId(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-800 focus:outline-none focus:border-[#003366]"
          >
            {caixas.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} {c.account ? `(${c.account})` : ''}
              </option>
            ))}
          </select>

          <button
            onClick={fetchConciliationsData}
            className="p-2 border border-zinc-200 text-zinc-500 hover:text-[#003366] hover:border-[#003366] transition-all bg-white"
            title="Recarregar"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between text-xs">
          <span className="font-bold text-zinc-600">
            {movements.length} movimento(s) registados para este Caixa/Banco
          </span>
          <div className="flex items-center gap-4 text-[10px] font-black uppercase">
            <span className="flex items-center gap-1 text-emerald-700">
              <CheckCircle2 size={12} /> Conciliados: {Array.from(conciliations.values()).filter(c => c.estado_conciliacao === 'CONCILIADO').length}
            </span>
            <span className="flex items-center gap-1 text-amber-700">
              <AlertTriangle size={12} /> Diferenças: {Array.from(conciliations.values()).filter(c => c.estado_conciliacao === 'DIFERENCA').length}
            </span>
            <span className="flex items-center gap-1 text-zinc-400">
              <Clock size={12} /> Pendentes: {movements.length - conciliations.size}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-[#003366] text-white text-[10px] font-black uppercase tracking-wider">
                <th className="px-3 py-2.5">Data</th>
                <th className="px-3 py-2.5">Documento</th>
                <th className="px-3 py-2.5">Descrição</th>
                <th className="px-3 py-2.5 text-right">Valor</th>
                <th className="px-3 py-2.5 text-right">Entrada</th>
                <th className="px-3 py-2.5 text-right">Saída</th>
                <th className="px-3 py-2.5 text-right">Saldo</th>
                <th className="px-3 py-2.5">Mov. Bancário</th>
                <th className="px-3 py-2.5 text-center">Estado</th>
                <th className="px-3 py-2.5 text-right">Diferença</th>
                <th className="px-3 py-2.5">Data Conciliação</th>
                <th className="px-3 py-2.5 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-[11px]">
              {loading && (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-zinc-400 font-bold uppercase text-xs">
                    A carregar movimentos...
                  </td>
                </tr>
              )}
              {!loading && movements.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center text-zinc-400 text-xs font-bold uppercase tracking-widest italic">
                    Nenhum movimento registado neste caixa.
                  </td>
                </tr>
              )}
              {!loading && movements.map((m) => {
                const val = Number(m.valor ?? m.amount ?? 0);
                const isEntrada = m.type === 'entrada' || m.tipo === 'entrada';
                const conc = conciliations.get(m.id);
                const estado = conc?.estado_conciliacao || 'PENDENTE';

                return (
                  <tr key={m.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-3 py-2 text-zinc-600">
                      {new Date(m.data || m.date || m.created_at).toLocaleDateString('pt-PT')}
                    </td>
                    <td className="px-3 py-2 font-mono font-bold text-[#003366]">
                      {m.referencia || (m.documento_id ? String(m.documento_id).substring(0, 8) : '—')}
                    </td>
                    <td className="px-3 py-2 text-zinc-800 max-w-xs truncate" title={m.descricao || m.description}>
                      {m.descricao || m.description || 'Movimento financeiro'}
                    </td>
                    <td className="px-3 py-2 text-right font-black font-mono">
                      {val.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2 text-right font-black font-mono text-emerald-600">
                      {isEntrada ? val.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-black font-mono text-red-600">
                      {!isEntrada ? val.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-black font-mono text-[#003366]">
                      {Number(m.saldo_calc || 0).toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2 text-zinc-500 font-mono text-[10px]">
                      {conc?.movimento_bancario_ref || '—'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                        estado === 'CONCILIADO' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        estado === 'DIFERENCA' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-zinc-100 text-zinc-500'
                      }`}>
                        {estado === 'CONCILIADO' && <CheckCircle2 size={10} />}
                        {estado === 'DIFERENCA' && <AlertTriangle size={10} />}
                        {estado === 'PENDENTE' && <Clock size={10} />}
                        {estado}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-[10px]">
                      {conc ? Number(conc.diferenca).toLocaleString('pt-PT', { minimumFractionDigits: 2 }) : '—'}
                    </td>
                    <td className="px-3 py-2 text-zinc-500 text-[10px]">
                      {conc?.data_conciliacao ? new Date(conc.data_conciliacao).toLocaleDateString('pt-PT') : '—'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => handleOpenConciliar(m)}
                        className="px-2.5 py-1 bg-[#003366] hover:bg-[#002244] text-white text-[10px] font-black uppercase tracking-wider transition-all"
                      >
                        {conc ? 'Rever' : 'Conciliar'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Conciliação */}
      {selectedMov && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white border border-zinc-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
              <div className="flex items-center gap-2 text-[#003366]">
                <ShieldCheck size={18} />
                <h3 className="text-xs font-black uppercase tracking-wider">Registar Conciliação Bancária</h3>
              </div>
              <button onClick={() => setSelectedMov(null)} className="text-zinc-400 hover:text-zinc-600"><X size={16} /></button>
            </div>

            <div className="bg-zinc-50 p-3 border border-zinc-200 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Documento:</span>
                <span className="font-mono font-bold text-[#003366]">{selectedMov.referencia || selectedMov.documento_id || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Descrição:</span>
                <span className="font-bold text-zinc-800">{selectedMov.descricao || selectedMov.description}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Valor do Sistema:</span>
                <span className="font-mono font-black text-zinc-900">
                  {Number(selectedMov.valor ?? selectedMov.amount ?? 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} {selectedCaixa?.moeda || 'AOA'}
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveConciliacao} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">Conta Bancária / IBAN</label>
                <input
                  type="text"
                  value={formData.conta_bancaria}
                  onChange={e => setFormData(f => ({ ...f, conta_bancaria: e.target.value }))}
                  className="w-full bg-zinc-50 border border-zinc-200 px-3 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-[#003366]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">Ref. Movimento Bancário</label>
                  <input
                    type="text"
                    placeholder="Ex: EXT-2026-09"
                    value={formData.movimento_bancario_ref}
                    onChange={e => setFormData(f => ({ ...f, movimento_bancario_ref: e.target.value }))}
                    className="w-full bg-zinc-50 border border-zinc-200 px-3 py-1.5 text-xs font-mono text-zinc-800 focus:outline-none focus:border-[#003366]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">Valor no Extrato *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.valor_extrato}
                    onChange={e => setFormData(f => ({ ...f, valor_extrato: e.target.value }))}
                    className="w-full bg-zinc-50 border border-zinc-200 px-3 py-1.5 text-xs font-black text-zinc-900 focus:outline-none focus:border-[#003366]"
                  />
                </div>
              </div>

              {/* Difference Preview */}
              {(() => {
                const valMov = Number(selectedMov.valor ?? selectedMov.amount ?? 0);
                const valExt = parseFloat(formData.valor_extrato) || 0;
                const diff = Math.round((valExt - valMov) * 100) / 100;
                if (diff !== 0) {
                  return (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                      <div className="flex items-center gap-1 font-bold">
                        <AlertTriangle size={14} className="text-amber-700" />
                        Diferença apurada: {diff.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} {selectedCaixa?.moeda || 'AOA'}
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-wider block text-amber-900">
                          Justificativa Obrigatória da Diferença *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Taxa de comissão bancária deduzida pelo banco..."
                          value={formData.justificativa}
                          onChange={e => setFormData(f => ({ ...f, justificativa: e.target.value }))}
                          className="w-full bg-white border border-amber-300 px-2 py-1 text-xs text-zinc-800 focus:outline-none"
                        />
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-1.5 font-bold">
                    <CheckCircle2 size={14} /> Valores concordantes (Diferença: 0,00)
                  </div>
                );
              })()}

              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">Observações Adicionais</label>
                <textarea
                  rows={2}
                  value={formData.observacao}
                  onChange={e => setFormData(f => ({ ...f, observacao: e.target.value }))}
                  className="w-full bg-zinc-50 border border-zinc-200 px-3 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-[#003366] resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setSelectedMov(null)}
                  className="px-4 py-1.5 text-xs font-black uppercase tracking-wider border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-1.5 bg-[#003366] hover:bg-[#002244] text-white text-xs font-black uppercase tracking-wider shadow disabled:opacity-50"
                >
                  {saving ? 'A Registar...' : 'Registar Conciliação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConciliacaoBancariaPage;
