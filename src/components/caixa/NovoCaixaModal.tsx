/**
 * NovoCaixaModal.tsx
 * Modal para registar novo Caixa/Banco.
 * Permite definir utilizadores autorizados desde a criação.
 */

import React, { useState } from 'react';
import { X, Plus, Shield, UserCheck, Search } from 'lucide-react';
import { Caixa } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

interface Props {
  profiles: Array<{ id: string; name: string; role?: string; email?: string }>;
  onClose: () => void;
  onCreate: (caixaData: any, permittedUserIds: string[]) => Promise<void>;
}

export const NovoCaixaModal: React.FC<Props> = ({
  profiles,
  onClose,
  onCreate
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    codigo_caixa: '',
    account: '',
    initialBalance: '',
    responsible: user?.username || user?.email || '',
    moeda: 'AOA',
    obs: ''
  });

  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(
    user ? [user.id] : []
  );
  const [userSearch, setUserSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const toggleUser = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('O nome do caixa é obrigatório.');
      return;
    }

    const initBal = parseFloat(formData.initialBalance) || 0;
    const finalCode = formData.codigo_caixa.trim() || `CX-${Math.floor(100 + Math.random() * 900)}`;

    setSaving(true);
    try {
      await onCreate({
        name: formData.name,
        codigo_caixa: finalCode,
        account: formData.account,
        responsible: formData.responsible,
        initialBalance: initBal,
        currentBalance: initBal,
        obs: formData.obs,
        user: user?.id,
        moeda: formData.moeda,
        status: 'aberto',
        activo: true
      }, selectedUserIds);

      toast.success('Novo Caixa registado com sucesso!');
      onClose();
    } catch (err: any) {
      toast.error(`Erro ao registar caixa: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const filteredProfiles = profiles.filter(p => {
    if (!userSearch) return true;
    const term = userSearch.toLowerCase();
    return (p.name || '').toLowerCase().includes(term) || (p.email || '').toLowerCase().includes(term);
  });

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white border border-zinc-200 shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 bg-[#003366] text-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/10 flex items-center justify-center text-white">
              <Plus size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider">Registar Novo Caixa / Banco</h3>
              <p className="text-[10px] text-blue-200 uppercase tracking-widest">Configuração financeira de tesouraria</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded transition-colors text-white">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">Nome do Caixa *</label>
              <input
                type="text"
                required
                placeholder="Ex: Caixa Central, Caixa Balcão 1, Banco BFA..."
                value={formData.name}
                onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                className="w-full bg-zinc-50 border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-800 focus:outline-none focus:border-[#003366]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">Código do Caixa</label>
              <input
                type="text"
                placeholder="Ex: CX-01 (ou vazio para gerar automático)"
                value={formData.codigo_caixa}
                onChange={e => setFormData(f => ({ ...f, codigo_caixa: e.target.value }))}
                className="w-full bg-zinc-50 border border-zinc-200 px-3 py-2 text-xs font-mono font-bold text-zinc-800 focus:outline-none focus:border-[#003366]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">Número de Conta / IBAN</label>
              <input
                type="text"
                placeholder="Ex: AO06.0000.0000.0000.0"
                value={formData.account}
                onChange={e => setFormData(f => ({ ...f, account: e.target.value }))}
                className="w-full bg-zinc-50 border border-zinc-200 px-3 py-2 text-xs font-mono text-zinc-800 focus:outline-none focus:border-[#003366]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">Moeda Principal</label>
              <select
                value={formData.moeda}
                onChange={e => setFormData(f => ({ ...f, moeda: e.target.value }))}
                className="w-full bg-zinc-50 border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-800 focus:outline-none focus:border-[#003366]"
              >
                <option value="AOA">AOA — Kwanza Angolano</option>
                <option value="USD">USD — Dólar Americano</option>
                <option value="EUR">EUR — Euro</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">Saldo Inicial / Abertura</label>
              <input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={formData.initialBalance}
                onChange={e => setFormData(f => ({ ...f, initialBalance: e.target.value }))}
                className="w-full bg-zinc-50 border border-zinc-200 px-3 py-2 text-xs font-black font-mono text-zinc-900 focus:outline-none focus:border-[#003366]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">Responsável</label>
              <input
                type="text"
                value={formData.responsible}
                onChange={e => setFormData(f => ({ ...f, responsible: e.target.value }))}
                className="w-full bg-zinc-50 border border-zinc-200 px-3 py-2 text-xs text-zinc-800 focus:outline-none focus:border-[#003366]"
              />
            </div>
          </div>

          {/* Secção: Utilizadores com Permissão */}
          <div>
            <div className="flex items-center justify-between border-b border-zinc-100 pb-1 mb-2">
              <div>
                <h4 className="text-[10px] font-black text-[#003366] uppercase tracking-widest flex items-center gap-1.5">
                  <UserCheck size={14} /> Utilizadores com Permissão
                </h4>
                <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider mt-0.5">
                  Selecione quem poderá movimentar este Caixa
                </p>
              </div>
            </div>

            <div className="border border-zinc-200 max-h-36 overflow-y-auto divide-y divide-zinc-100 bg-white">
              {filteredProfiles.map(p => {
                const isChecked = selectedUserIds.includes(p.id);
                return (
                  <label key={p.id} className="flex items-center gap-3 px-3 py-2 text-xs cursor-pointer hover:bg-zinc-50">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleUser(p.id)}
                      className="w-4 h-4 text-[#003366] rounded-none border-zinc-300 focus:ring-[#003366]"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-zinc-800">{p.name}</span>
                      {p.email && <span className="text-[10px] text-zinc-400 ml-2">({p.email})</span>}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">Observações</label>
            <textarea
              rows={2}
              value={formData.obs}
              onChange={e => setFormData(f => ({ ...f, obs: e.target.value }))}
              className="w-full bg-zinc-50 border border-zinc-200 px-3 py-2 text-xs text-zinc-800 focus:outline-none focus:border-[#003366] resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-black uppercase tracking-wider border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-[#003366] hover:bg-[#002244] text-white text-xs font-black uppercase tracking-wider shadow-md disabled:opacity-50"
            >
              {saving ? 'A Registar...' : 'Registar Caixa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NovoCaixaModal;
