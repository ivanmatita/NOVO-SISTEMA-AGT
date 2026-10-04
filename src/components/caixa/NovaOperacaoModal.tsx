/**
 * NovaOperacaoModal.tsx
 * Modal para registar Entrada ou Saída avulsa de Caixa.
 * Valida autorização do utilizador no Caixa selecionado.
 */

import React, { useState } from 'react';
import { X, ArrowUpCircle, ArrowDownCircle, ShieldAlert } from 'lucide-react';
import { Caixa } from '../../types';
import { toast } from 'react-hot-toast';

interface Props {
  caixas: Caixa[];
  defaultCaixaId?: string;
  defaultType?: 'entrada' | 'saida';
  onClose: () => void;
  onSave: (data: { caixaId: string; type: 'entrada' | 'saida'; amount: number; description: string; moeda: string }) => Promise<void>;
  canOperateCaixa: (caixaId: string) => boolean;
}

export const NovaOperacaoModal: React.FC<Props> = ({
  caixas,
  defaultCaixaId,
  defaultType = 'entrada',
  onClose,
  onSave,
  canOperateCaixa
}) => {
  const [caixaId, setCaixaId] = useState(defaultCaixaId || caixas[0]?.id || '');
  const [type, setType] = useState<'entrada' | 'saida'>(defaultType);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedCaixa = caixas.find(c => c.id === caixaId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      toast.error('Informe um valor válido superior a zero.');
      return;
    }
    if (!description.trim()) {
      toast.error('A descrição do movimento é obrigatória.');
      return;
    }

    if (!canOperateCaixa(caixaId)) {
      toast.error('Este utilizador não possui permissão para realizar movimentos neste Caixa.');
      return;
    }

    if (type === 'saida' && selectedCaixa && Number(selectedCaixa.currentBalance) < val) {
      toast.error(`Saldo insuficiente no caixa selecionado (Saldo: ${Number(selectedCaixa.currentBalance).toLocaleString('pt-PT')} ${selectedCaixa.moeda || 'AOA'}).`);
      return;
    }

    setSaving(true);
    try {
      await onSave({
        caixaId,
        type,
        amount: val,
        description,
        moeda: selectedCaixa?.moeda || 'AOA'
      });
      toast.success(type === 'entrada' ? 'Entrada registada com sucesso!' : 'Saída registada com sucesso!');
      onClose();
    } catch (err: any) {
      toast.error(`Falha ao registar movimento: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const isAllowed = caixaId ? canOperateCaixa(caixaId) : true;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white border border-zinc-200 shadow-2xl max-w-md w-full p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2 text-[#003366]">
            {type === 'entrada' ? (
              <ArrowUpCircle size={20} className="text-emerald-600" />
            ) : (
              <ArrowDownCircle size={20} className="text-red-600" />
            )}
            <h3 className="text-xs font-black uppercase tracking-wider">
              {type === 'entrada' ? 'Registar Entrada de Caixa' : 'Registar Saída de Caixa'}
            </h3>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Caixa selector */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">Caixa de Destino/Origem *</label>
            <select
              required
              value={caixaId}
              onChange={e => setCaixaId(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-800 focus:outline-none focus:border-[#003366]"
            >
              {caixas.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} (Saldo: {Number(c.currentBalance).toLocaleString('pt-PT')} {c.moeda || 'AOA'})
                </option>
              ))}
            </select>
            {!isAllowed && (
              <p className="text-[9px] text-red-500 font-bold flex items-center gap-1 mt-1">
                <ShieldAlert size={12} /> Utilizador sem autorização neste Caixa.
              </p>
            )}
          </div>

          {/* Type toggler */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType('entrada')}
              className={`py-2 text-xs font-black uppercase tracking-wider border transition-all ${
                type === 'entrada' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-zinc-50 text-zinc-600 border-zinc-200'
              }`}
            >
              (+) Entrada
            </button>
            <button
              type="button"
              onClick={() => setType('saida')}
              className={`py-2 text-xs font-black uppercase tracking-wider border transition-all ${
                type === 'saida' ? 'bg-red-600 text-white border-red-600' : 'bg-zinc-50 text-zinc-600 border-zinc-200'
              }`}
            >
              (-) Saída
            </button>
          </div>

          {/* Valor */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">Valor *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              placeholder="0,00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 px-3 py-2 text-sm font-black text-zinc-900 focus:outline-none focus:border-[#003366]"
            />
          </div>

          {/* Descrição */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">Descrição do Movimento *</label>
            <input
              type="text"
              required
              placeholder="Ex: Suprimento inicial, Despesa de expediente..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 px-3 py-2 text-xs text-zinc-800 focus:outline-none focus:border-[#003366]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-black uppercase tracking-wider border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !isAllowed}
              className="px-6 py-2 bg-[#003366] hover:bg-[#002244] text-white text-xs font-black uppercase tracking-wider shadow disabled:opacity-50"
            >
              {saving ? 'A Registar...' : 'Confirmar Operação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NovaOperacaoModal;
