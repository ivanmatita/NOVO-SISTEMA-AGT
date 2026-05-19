import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Edit, Save, X, Percent, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Tax {
  id: number;
  nome: string;
  taxa: number;
  tipo: string;
  ativo: boolean;
  empresa_id: string;
}

const TaxesModule = ({ onRefreshData }: { onRefreshData?: () => void }) => {
  const { user } = useAuth();
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingTax, setEditingTax] = useState<Tax | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    taxa: 0,
    tipo: 'IVA',
    ativo: true
  });

  const fetchTaxes = async () => {
    if (!user?.empresa_id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tabela_impostos')
        .select('*')
        .eq('empresa_id', user.empresa_id)
        .order('nome', { ascending: true });
      if (error) throw error;
      setTaxes(data || []);
    } catch (err) {
      console.error('Error fetching taxes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaxes();
  }, [user?.empresa_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.empresa_id) return;
    setLoading(true);
    try {
      if (editingTax) {
        const { error } = await supabase
          .from('tabela_impostos')
          .update(formData)
          .eq('id', editingTax.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('tabela_impostos')
          .insert([{ ...formData, empresa_id: user.empresa_id }]);
        if (error) throw error;
      }
      setShowModal(false);
      setEditingTax(null);
      setFormData({ nome: '', taxa: 0, tipo: 'IVA', ativo: true });
      fetchTaxes();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Error saving tax:', err);
      alert('Erro ao guardar taxa');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Tem a certeza que deseja excluir esta taxa?')) return;
    try {
      const { error } = await supabase
        .from('tabela_impostos')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchTaxes();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Error deleting tax:', err);
      alert('Erro ao excluir taxa');
    }
  };

  const openEdit = (tax: Tax) => {
    setEditingTax(tax);
    setFormData({
      nome: tax.nome,
      taxa: tax.taxa,
      tipo: tax.tipo,
      ativo: tax.ativo
    });
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-[#003366] uppercase tracking-tight">Taxas e Impostos</h3>
          <p className="text-zinc-500 text-xs">Configure as taxas de IVA, Retenção e outros impostos</p>
        </div>
        <button
          onClick={() => {
            setEditingTax(null);
            setFormData({ nome: '', taxa: 0, tipo: 'IVA', ativo: true });
            setShowModal(true);
          }}
          className="bg-[#003366] text-white px-6 py-2.5 text-xs font-bold uppercase tracking-wider shadow-sm hover:bg-[#002244] transition-all flex items-center gap-2"
        >
          <Plus size={16} /> Nova Taxa
        </button>
      </div>

      <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr>
              <th className="px-6 py-3 font-bold text-[#003366] uppercase tracking-wider text-[10px]">Nome</th>
              <th className="px-6 py-3 font-bold text-[#003366] uppercase tracking-wider text-[10px]">Taxa (%)</th>
              <th className="px-6 py-3 font-bold text-[#003366] uppercase tracking-wider text-[10px]">Tipo</th>
              <th className="px-6 py-3 font-bold text-[#003366] uppercase tracking-wider text-[10px]">Estado</th>
              <th className="px-6 py-3 font-bold text-[#003366] uppercase tracking-wider text-[10px] text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {taxes.map((tax) => (
              <tr key={tax.id} className="hover:bg-zinc-50">
                <td className="px-6 py-4 font-bold text-zinc-800">{tax.nome}</td>
                <td className="px-6 py-4 text-zinc-600 font-mono">{tax.taxa}%</td>
                <td className="px-6 py-4 text-zinc-600 uppercase text-[10px] font-bold">{tax.tipo}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-[10px] font-bold uppercase ${tax.ativo ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                    {tax.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => openEdit(tax)} className="p-1.5 text-blue-600 hover:bg-blue-50 transition-colors">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDelete(tax.id)} className="p-1.5 text-red-600 hover:bg-red-50 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {taxes.length === 0 && !loading && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-zinc-400 italic">Nenhuma taxa configurada.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-[#003366] uppercase tracking-tight">
                {editingTax ? 'Editar Taxa' : 'Nova Taxa'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-zinc-600">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Nome da Taxa</label>
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: IVA 14%"
                  className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2 text-sm focus:outline-none focus:border-[#003366]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Percentagem (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.taxa}
                    onChange={(e) => setFormData({ ...formData, taxa: Number(e.target.value) })}
                    className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2 text-sm focus:outline-none focus:border-[#003366]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Tipo de Imposto</label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2 text-sm focus:outline-none focus:border-[#003366]"
                  >
                    <option value="IVA">IVA</option>
                    <option value="Consumo">Imposto de Consumo</option>
                    <option value="Retencao">Retenção na Fonte</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="ativo"
                  checked={formData.ativo}
                  onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                  className="w-4 h-4 text-[#003366] focus:ring-[#003366]"
                />
                <label htmlFor="ativo" className="text-sm text-zinc-600 font-bold">Taxa Ativa</label>
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-zinc-100 text-zinc-500 font-bold py-3 uppercase text-[10px] tracking-wider hover:bg-zinc-200 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-[#003366] text-white font-bold py-3 uppercase text-[10px] tracking-wider hover:bg-[#002244] shadow-lg shadow-blue-900/10 transition-all"
                >
                  {loading ? 'A processar...' : (editingTax ? 'Guardar Alterações' : 'Criar Taxa')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxesModule;
