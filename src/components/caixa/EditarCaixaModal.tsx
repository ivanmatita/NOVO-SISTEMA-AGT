/**
 * EditarCaixaModal.tsx
 * Modal de edição de Caixa com funcionalidade de:
 * "UTILIZADORES COM PERMISSÃO"
 * Permite selecionar quais utilizadores da empresa atual têm autorização para movimentar este Caixa.
 * Salva no banco de dados real na tabela `caixas_utilizadores`.
 */

import React, { useState, useEffect } from 'react';
import { X, Save, Shield, UserCheck, AlertCircle, Check, Search } from 'lucide-react';
import { Caixa } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

interface Props {
  caixa: Caixa;
  profiles: Array<{ id: string; name: string; role?: string; email?: string }>;
  onClose: () => void;
  onSave: (caixaId: string, updates: Partial<Caixa>, permittedUserIds: string[]) => Promise<void>;
}

export const EditarCaixaModal: React.FC<Props> = ({
  caixa,
  profiles,
  onClose,
  onSave
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: caixa.name || '',
    codigo_caixa: caixa.codigo_caixa || '',
    account: caixa.account || '',
    responsible: caixa.responsible || '',
    moeda: caixa.moeda || 'AOA',
    status: caixa.status || 'aberto',
    activo: caixa.activo !== false,
    obs: caixa.obs || ''
  });

  // Selected users with permission
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(
    caixa.permitted_users || []
  );
  const [userSearch, setUserSearch] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (caixa.permitted_users) {
      setSelectedUserIds(caixa.permitted_users);
    }
  }, [caixa]);

  const toggleUser = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const selectAll = () => {
    setSelectedUserIds(profiles.map(p => p.id));
  };

  const deselectAll = () => {
    setSelectedUserIds([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('O nome do caixa é obrigatório.');
      return;
    }

    setSaving(true);
    try {
      await onSave(caixa.id, formData, selectedUserIds);
      toast.success('Caixa e permissões atualizados com sucesso!');
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar caixa:', err);
      toast.error(`Erro ao guardar: ${err.message || 'Falha no banco de dados'}`);
    } finally {
      setSaving(false);
    }
  };

  const filteredProfiles = profiles.filter(p => {
    if (!userSearch) return true;
    const term = userSearch.toLowerCase();
    return (p.name || '').toLowerCase().includes(term) || (p.email || '').toLowerCase().includes(term) || (p.role || '').toLowerCase().includes(term);
  });

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white border border-zinc-200 shadow-2xl max-w-2xl w-full flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#003366] text-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/10 flex items-center justify-center text-white">
              <Shield size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider">Editar Caixa / Banco</h3>
              <p className="text-[10px] text-blue-200 uppercase tracking-widest">{caixa.name} ({caixa.codigo_caixa || 'Sem código'})</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded transition-colors text-white">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Dados Gerais */}
          <div>
            <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 border-b border-zinc-100 pb-1">
              1. Identificação e Contas
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">Nome do Caixa *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-zinc-50 border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-800 focus:outline-none focus:border-[#003366]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">Código do Caixa</label>
                <input
                  type="text"
                  value={formData.codigo_caixa}
                  onChange={e => setFormData(f => ({ ...f, codigo_caixa: e.target.value }))}
                  className="w-full bg-zinc-50 border border-zinc-200 px-3 py-2 text-xs font-mono font-bold text-zinc-800 focus:outline-none focus:border-[#003366]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">Nº de Conta / IBAN</label>
                <input
                  type="text"
                  value={formData.account}
                  onChange={e => setFormData(f => ({ ...f, account: e.target.value }))}
                  className="w-full bg-zinc-50 border border-zinc-200 px-3 py-2 text-xs font-mono text-zinc-800 focus:outline-none focus:border-[#003366]"
                  placeholder="Ex: AO06.0000.0000.0000.0"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">Moeda</label>
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
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">Responsável Principal</label>
                <input
                  type="text"
                  value={formData.responsible}
                  onChange={e => setFormData(f => ({ ...f, responsible: e.target.value }))}
                  className="w-full bg-zinc-50 border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-800 focus:outline-none focus:border-[#003366]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">Estado</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData(f => ({ ...f, status: e.target.value as any }))}
                  className="w-full bg-zinc-50 border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-800 focus:outline-none focus:border-[#003366]"
                >
                  <option value="aberto">Aberto / Operacional</option>
                  <option value="fechado">Fechado</option>
                </select>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <input
                type="checkbox"
                id="caixa_activo_chk"
                checked={formData.activo}
                onChange={e => setFormData(f => ({ ...f, activo: e.target.checked }))}
                className="w-4 h-4 text-[#003366] border-zinc-300 focus:ring-[#003366]"
              />
              <label htmlFor="caixa_activo_chk" className="text-xs font-bold text-zinc-700 cursor-pointer">
                Caixa Ativo no Sistema (se desmarcado, fica inativo sem apagar movimentos)
              </label>
            </div>
          </div>

          {/* Secção: UTILIZADORES COM PERMISSÃO */}
          <div>
            <div className="flex items-center justify-between border-b border-zinc-100 pb-1 mb-2">
              <div>
                <h4 className="text-[10px] font-black text-[#003366] uppercase tracking-widest flex items-center gap-1.5">
                  <UserCheck size={14} /> 2. Utilizadores com Permissão
                </h4>
                <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider mt-0.5">
                  Apenas os utilizadores assinalados poderão realizar movimentos neste Caixa
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-[9px] font-black uppercase text-[#003366] hover:underline"
                >
                  Todos
                </button>
                <span className="text-zinc-300">|</span>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="text-[9px] font-black uppercase text-zinc-500 hover:underline"
                >
                  Nenhum
                </button>
              </div>
            </div>

            {/* User Search */}
            <div className="relative mb-2">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Pesquisar utilizador da empresa..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 text-xs text-zinc-800 focus:outline-none focus:border-[#003366]"
              />
            </div>

            {/* Checkbox List */}
            <div className="border border-zinc-200 max-h-48 overflow-y-auto divide-y divide-zinc-100 bg-white">
              {filteredProfiles.length === 0 && (
                <div className="p-4 text-center text-xs text-zinc-400 italic">
                  Nenhum utilizador encontrado.
                </div>
              )}
              {filteredProfiles.map(p => {
                const isChecked = selectedUserIds.includes(p.id);
                return (
                  <label
                    key={p.id}
                    className={`flex items-center gap-3 px-3 py-2 text-xs cursor-pointer transition-colors ${
                      isChecked ? 'bg-blue-50/50' : 'hover:bg-zinc-50'
                    }`}
                  >
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
                    {p.role && (
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 bg-zinc-100 text-zinc-600">
                        {p.role}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
            <div className="mt-1 text-[9px] text-zinc-400 font-bold uppercase tracking-wider">
              {selectedUserIds.length} utilizador(es) selecionado(s) com permissão activa
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-1">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-wider block">Observações</label>
            <textarea
              rows={2}
              value={formData.obs}
              onChange={e => setFormData(f => ({ ...f, obs: e.target.value }))}
              className="w-full bg-zinc-50 border border-zinc-200 px-3 py-2 text-xs text-zinc-800 focus:outline-none focus:border-[#003366] resize-none"
              placeholder="Notas ou instruções do caixa..."
            />
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
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
              className="flex items-center gap-2 px-6 py-2 bg-[#003366] hover:bg-[#002244] text-white text-xs font-black uppercase tracking-wider shadow-md disabled:opacity-50"
            >
              <Save size={14} />
              {saving ? 'A Guardar...' : 'Guardar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditarCaixaModal;
