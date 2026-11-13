/**
 * AssociarMovimentosPage.tsx
 * Página de Associação de Movimentos de Caixa a Documentos.
 * Permite associar movimentos não categorizados ou manuais a:
 * - Venda (Fatura, Fatura-Recibo, Recibo)
 * - Compra (Fatura de Compra, Fatura Recibo)
 * - Pagamento de Salário
 * - Pagamento de Imposto
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Link as LinkIcon, ChevronLeft, RefreshCw, CheckCircle2,
  FileText, Search, ShoppingBag, ShoppingCart, Users, Calculator, ArrowRight
} from 'lucide-react';
import { Caixa, CaixaMovement } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface Props {
  caixas: Caixa[];
  selectedCaixaId?: string | null;
  onBack: () => void;
  canOperateCaixa: (caixaId: string) => boolean;
}

export const AssociarMovimentosPage: React.FC<Props> = ({
  caixas,
  selectedCaixaId,
  onBack,
  canOperateCaixa
}) => {
  const { user } = useAuth();
  const [activeCaixaId, setActiveCaixaId] = useState<string>(
    selectedCaixaId || caixas[0]?.id || ''
  );
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMov, setSelectedMov] = useState<any | null>(null);

  // Association form target state
  const [docType, setDocType] = useState<'venda' | 'compra' | 'salario' | 'imposto'>('venda');
  const [targetDocs, setTargetDocs] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [observacao, setObservacao] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchUnlinkedMovements = useCallback(async () => {
    if (!user?.empresa_id || !activeCaixaId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('caixa_movimentacoes')
        .select('*')
        .eq('empresa_id', user.empresa_id)
        .eq('caixa_id', activeCaixaId)
        .order('data', { ascending: false });

      if (error) throw error;
      setMovements(data || []);
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao carregar movimentos.');
    } finally {
      setLoading(false);
    }
  }, [user?.empresa_id, activeCaixaId]);

  useEffect(() => {
    fetchUnlinkedMovements();
  }, [fetchUnlinkedMovements]);

  // Load target documents when modal opens or docType changes
  useEffect(() => {
    if (!selectedMov || !user?.empresa_id) return;
    const loadTargets = async () => {
      setLoadingDocs(true);
      try {
        if (docType === 'venda') {
          const { data } = await supabase
            .from('invoices')
            .select('id, invoice_number, client_name, total, date')
            .eq('empresa_id', user.empresa_id)
            .order('created_at', { ascending: false })
            .limit(30);
          setTargetDocs(data || []);
        } else if (docType === 'compra') {
          const { data } = await supabase
            .from('compras')
            .select('id, numero_documento, purchase_number, fornecedor_nome, supplier_name, valor_total, total, data_compra')
            .eq('empresa_id', user.empresa_id)
            .order('created_at', { ascending: false })
            .limit(30);
          setTargetDocs(data || []);
        } else if (docType === 'salario') {
          const { data } = await supabase
            .from('employees')
            .select('id, name, salary')
            .eq('empresa_id', user.empresa_id)
            .limit(30);
          setTargetDocs(data || []);
        } else if (docType === 'imposto') {
          const { data } = await supabase
            .from('tax_payments')
            .select('id, tax_type, amount, payment_date')
            .eq('empresa_id', user.empresa_id)
            .limit(30);
          setTargetDocs(data || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingDocs(false);
      }
    };
    loadTargets();
  }, [docType, selectedMov, user?.empresa_id]);

  const handleSaveAssociation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMov || !selectedDocId) {
      toast.error('Selecione o documento de destino.');
      return;
    }

    if (!canOperateCaixa(activeCaixaId)) {
      toast.error('Este utilizador não possui permissão para alterar movimentos neste Caixa.');
      return;
    }

    setSaving(true);
    try {
      let refText = '';
      const chosenDoc = targetDocs.find(d => String(d.id) === String(selectedDocId));
      if (docType === 'venda') {
        refText = `Venda: ${chosenDoc?.invoice_number || selectedDocId}`;
      } else if (docType === 'compra') {
        refText = `Compra: ${chosenDoc?.numero_documento || chosenDoc?.purchase_number || selectedDocId}`;
      } else if (docType === 'salario') {
        refText = `Salário: ${chosenDoc?.name || selectedDocId}`;
      } else if (docType === 'imposto') {
        refText = `Imposto: ${chosenDoc?.tax_type || selectedDocId}`;
      }

      const { error } = await supabase
        .from('caixa_movimentacoes')
        .update({
          documento_id: selectedDocId,
          referencia: refText,
          descricao: observacao ? `${selectedMov.descricao || ''} (${observacao})` : selectedMov.descricao
        })
        .eq('id', selectedMov.id);

      if (error) throw error;

      toast.success('Movimento associado com sucesso!');
      setSelectedMov(null);
      setSelectedDocId('');
      setObservacao('');
      await fetchUnlinkedMovements();
    } catch (err: any) {
      console.error(err);
      toast.error(`Erro ao associar: ${err.message}`);
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
            <LinkIcon size={20} />
          </div>
          <div>
            <h2 className="text-base font-black text-[#003366] uppercase tracking-wider">
              Associar Movimentos a Documentos
            </h2>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
              Vinculação de movimentos financeiros às entidades e documentos de origem
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={activeCaixaId}
            onChange={e => setActiveCaixaId(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-800 focus:outline-none focus:border-[#003366]"
          >
            {caixas.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            onClick={fetchUnlinkedMovements}
            className="p-2 border border-zinc-200 text-zinc-500 hover:text-[#003366] hover:border-[#003366] transition-all bg-white"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-[#003366] text-white text-[10px] font-black uppercase tracking-wider">
                <th className="px-3 py-2.5">Data</th>
                <th className="px-3 py-2.5">Tipo</th>
                <th className="px-3 py-2.5">Descrição</th>
                <th className="px-3 py-2.5 text-right">Valor</th>
                <th className="px-3 py-2.5">Documento Atual</th>
                <th className="px-3 py-2.5 text-center">Estado da Associação</th>
                <th className="px-3 py-2.5 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-[11px]">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-400 font-bold uppercase text-xs">
                    A carregar movimentos...
                  </td>
                </tr>
              )}
              {!loading && movements.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-zinc-400 text-xs font-bold uppercase tracking-widest italic">
                    Nenhum movimento registado neste caixa.
                  </td>
                </tr>
              )}
              {!loading && movements.map((m) => {
                const val = Number(m.valor ?? m.amount ?? 0);
                const isLinked = !!(m.documento_id || (m.referencia && !m.referencia.startsWith('MANUAL')));

                return (
                  <tr key={m.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-3 py-2 text-zinc-600">
                      {new Date(m.data || m.date || m.created_at).toLocaleDateString('pt-PT')}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-1.5 py-0.5 text-[9px] font-black uppercase ${
                        (m.type === 'entrada' || m.tipo === 'entrada') ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {m.type || m.tipo}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-medium text-zinc-800 max-w-sm truncate">
                      {m.descricao || m.description || 'Movimento financeiro'}
                    </td>
                    <td className="px-3 py-2 text-right font-black font-mono">
                      {val.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} {m.moeda || 'AOA'}
                    </td>
                    <td className="px-3 py-2 font-mono text-[10px] text-[#003366] font-bold">
                      {m.referencia || m.documento_id || '—'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                        isLinked ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {isLinked ? 'Associado' : 'Pendente'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => {
                          setSelectedMov(m);
                          setSelectedDocId('');
                          setObservacao('');
                        }}
                        className="px-2.5 py-1 bg-[#003366] hover:bg-[#002244] text-white text-[10px] font-black uppercase tracking-wider transition-all"
                      >
                        Associar
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Associação */}
      {selectedMov && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white border border-zinc-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
              <div className="flex items-center gap-2 text-[#003366]">
                <LinkIcon size={18} />
                <h3 className="text-xs font-black uppercase tracking-wider">Associar Movimento a Documento</h3>
              </div>
              <button onClick={() => setSelectedMov(null)} className="text-zinc-400 hover:text-zinc-600">×</button>
            </div>

            <div className="bg-zinc-50 p-3 border border-zinc-200 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Movimento:</span>
                <span className="font-bold text-zinc-800">{selectedMov.descricao || selectedMov.description}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Valor:</span>
                <span className="font-mono font-black text-zinc-900">
                  {Number(selectedMov.valor ?? selectedMov.amount ?? 0).toLocaleString('pt-PT', { minimumFractionDigits: 2 })} {selectedMov.moeda || 'AOA'}
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveAssociation} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block mb-1.5">
                  Tipo de Documento Relacionado
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'venda', label: 'Venda', icon: ShoppingBag },
                    { id: 'compra', label: 'Compra', icon: ShoppingCart },
                    { id: 'salario', label: 'Salário', icon: Users },
                    { id: 'imposto', label: 'Imposto', icon: Calculator }
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => { setDocType(t.id as any); setSelectedDocId(''); }}
                      className={`flex flex-col items-center justify-center p-2.5 border text-xs font-bold transition-all ${
                        docType === t.id ? 'bg-[#003366] text-white border-[#003366]' : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                      }`}
                    >
                      <t.icon size={14} className="mb-1" />
                      <span className="text-[10px] uppercase font-black">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">
                  Selecione o Documento Registado no ERP *
                </label>
                {loadingDocs ? (
                  <div className="p-3 text-center text-xs text-zinc-400">A carregar documentos...</div>
                ) : (
                  <select
                    required
                    value={selectedDocId}
                    onChange={e => setSelectedDocId(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-800 focus:outline-none focus:border-[#003366]"
                  >
                    <option value="">Selecione o documento</option>
                    {targetDocs.map(d => (
                      <option key={d.id} value={d.id}>
                        {docType === 'venda' && `${d.invoice_number || d.id} — ${d.client_name || 'Cliente'} (${Number(d.total).toLocaleString('pt-PT')} AOA)`}
                        {docType === 'compra' && `${d.numero_documento || d.purchase_number || d.id} — ${d.fornecedor_nome || d.supplier_name || 'Fornecedor'} (${Number(d.valor_total || d.total || 0).toLocaleString('pt-PT')} AOA)`}
                        {docType === 'salario' && `${d.name} — Salário Base: ${Number(d.salary || 0).toLocaleString('pt-PT')} AOA`}
                        {docType === 'imposto' && `${d.tax_type} — Valor: ${Number(d.amount || 0).toLocaleString('pt-PT')} AOA`}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">Observação / Justificativa</label>
                <input
                  type="text"
                  placeholder="Nota da associação..."
                  value={observacao}
                  onChange={e => setObservacao(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 px-3 py-1.5 text-xs text-zinc-800 focus:outline-none focus:border-[#003366]"
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
                  {saving ? 'A Guardar...' : 'Confirmar Associação'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssociarMovimentosPage;
