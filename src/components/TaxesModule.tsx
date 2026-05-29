import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Edit, Save, X, Percent, FileText, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export interface Tax {
  id: string; // Changed to string (UUID)
  empresa_id: string;
  nome: string;
  descricao: string | null;
  codigo_imposto: string | null;
  taxa: number;
  tipo_imposto: string;
  activo: boolean; // Changed to activo
  created_at?: string;
  updated_at?: string;
}

const TaxesModule = ({ onRefreshData }: { onRefreshData?: () => void }) => {
  const { user } = useAuth();
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingTax, setEditingTax] = useState<Tax | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    codigo_imposto: '',
    taxa: 0,
    tipo_imposto: 'IVA',
    activo: true
  });

  const fetchTaxes = async () => {
    if (!user?.empresa_id) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('impostos')
        .select('*')
        .eq('empresa_id', user.empresa_id)
        .order('nome', { ascending: true });
        
      if (fetchError) throw fetchError;
      setTaxes(data || []);
    } catch (err: any) {
      console.error('Error fetching taxes:', err);
      setError(err.message || 'Erro ao carregar os impostos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaxes();
    
    if (!user?.empresa_id) return;
    
    // Realtime subscription setup
    const subscription = supabase
      .channel('impostos_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'impostos', filter: `empresa_id=eq.${user.empresa_id}` }, 
        () => {
          fetchTaxes();
          if (onRefreshData) onRefreshData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user?.empresa_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.empresa_id) return;
    
    setLoading(true);
    setError(null);
    
    const impostoData = {
      ...formData,
      empresa_id: user.empresa_id,
      descricao: formData.descricao || null,
      codigo_imposto: formData.codigo_imposto || null,
      updated_at: new Date().toISOString()
    };
    
    try {
      if (editingTax) {
        const { error: updateError } = await supabase
          .from('impostos')
          .update(impostoData)
          .eq('id', editingTax.id)
          .eq('empresa_id', user.empresa_id); // Ensure RLS safety
          
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('impostos')
          .insert([impostoData]);
          
        if (insertError) throw insertError;
      }
      
      setShowModal(false);
      setEditingTax(null);
      resetForm();
      fetchTaxes();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      console.error('Error saving tax:', err);
      setError(err.message || 'Erro ao guardar imposto. Verifique os dados e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem a certeza que deseja excluir este imposto?')) return;
    
    setLoading(true);
    try {
      const { error: deleteError } = await supabase
        .from('impostos')
        .delete()
        .eq('id', id)
        .eq('empresa_id', user?.empresa_id);
        
      if (deleteError) throw deleteError;
      
      fetchTaxes();
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      console.error('Error deleting tax:', err);
      setError(err.message || 'Erro ao excluir imposto.');
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (tax: Tax) => {
    setError(null);
    setEditingTax(tax);
    setFormData({
      nome: tax.nome,
      descricao: tax.descricao || '',
      codigo_imposto: tax.codigo_imposto || '',
      taxa: tax.taxa,
      tipo_imposto: tax.tipo_imposto,
      activo: tax.activo
    });
    setShowModal(true);
  };
  
  const resetForm = () => {
    setFormData({ 
      nome: '', 
      descricao: '',
      codigo_imposto: '',
      taxa: 0, 
      tipo_imposto: 'IVA', 
      activo: true 
    });
    setError(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-[#003366] uppercase tracking-tight">Taxas e Impostos</h3>
          <p className="text-zinc-500 text-xs">Configure as taxas de IVA, Retenção e outros impostos da sua empresa</p>
        </div>
        <button
          onClick={() => {
            setEditingTax(null);
            resetForm();
            setShowModal(true);
          }}
          className="bg-[#003366] text-white px-6 py-2.5 text-xs font-bold uppercase tracking-wider shadow-sm hover:bg-[#002244] transition-all flex items-center gap-2"
        >
          <Plus size={16} /> Novo Imposto
        </button>
      </div>

      {error && !showModal && (
        <div className="bg-red-50 text-red-600 p-4 flex items-center gap-3 text-sm font-medium border border-red-200">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr>
              <th className="px-6 py-3 font-bold text-[#003366] uppercase tracking-wider text-[10px]">Nome</th>
              <th className="px-6 py-3 font-bold text-[#003366] uppercase tracking-wider text-[10px]">Código</th>
              <th className="px-6 py-3 font-bold text-[#003366] uppercase tracking-wider text-[10px]">Taxa (%)</th>
              <th className="px-6 py-3 font-bold text-[#003366] uppercase tracking-wider text-[10px]">Tipo</th>
              <th className="px-6 py-3 font-bold text-[#003366] uppercase tracking-wider text-[10px]">Estado</th>
              <th className="px-6 py-3 font-bold text-[#003366] uppercase tracking-wider text-[10px] text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200">
            {loading && taxes.length === 0 ? (
               <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 text-zinc-500">
                    <Loader2 className="animate-spin text-[#003366]" size={24} />
                    <span className="text-sm font-medium">A carregar impostos...</span>
                  </div>
                </td>
              </tr>
            ) : taxes.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-zinc-400 italic">Nenhum imposto configurado.</td>
              </tr>
            ) : (
              taxes.map((tax) => (
                <tr key={tax.id} className="hover:bg-zinc-50">
                  <td className="px-6 py-4">
                    <div className="font-bold text-zinc-800">{tax.nome}</div>
                    {tax.descricao && <div className="text-[10px] text-zinc-500 line-clamp-1">{tax.descricao}</div>}
                  </td>
                  <td className="px-6 py-4 text-zinc-600 font-mono text-xs">{tax.codigo_imposto || '-'}</td>
                  <td className="px-6 py-4 text-zinc-600 font-mono font-bold">{tax.taxa}%</td>
                  <td className="px-6 py-4 text-zinc-600 uppercase text-[10px] font-bold">{tax.tipo_imposto}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-[10px] font-bold uppercase ${tax.activo ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                      {tax.activo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(tax)} className="p-1.5 text-blue-600 hover:bg-blue-50 transition-colors" title="Editar">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDelete(tax.id)} className="p-1.5 text-red-600 hover:bg-red-50 transition-colors" title="Eliminar">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-zinc-100 flex justify-between items-center shadow-sm z-10 bg-white">
              <h3 className="text-xl font-bold text-[#003366] uppercase tracking-tight">
                {editingTax ? 'Editar Imposto' : 'Novo Imposto'}
              </h3>
              <button disabled={loading} onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="overflow-y-auto p-6 flex-1">
              {error && (
                <div className="mb-4 bg-red-50 text-red-600 p-3 flex items-start gap-2 text-sm font-medium border border-red-200">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              
              <form id="tax-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 col-span-2 sm:col-span-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Nome do Imposto *</label>
                    <input
                      type="text"
                      required
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      placeholder="Ex: IVA 14%"
                      className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2 text-sm focus:outline-none focus:border-[#003366]"
                    />
                  </div>
                  <div className="space-y-1 col-span-2 sm:col-span-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Código (Opcional)</label>
                    <input
                      type="text"
                      value={formData.codigo_imposto}
                      onChange={(e) => setFormData({ ...formData, codigo_imposto: e.target.value.toUpperCase() })}
                      placeholder="Ex: IVA14"
                      className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2 text-sm font-mono uppercase focus:outline-none focus:border-[#003366]"
                    />
                  </div>
                </div>
                
                <div className="space-y-1 block">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Descrição (Opcional)</label>
                  <textarea
                    rows={2}
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Breve descrição sobre a aplicação do imposto..."
                    className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2 text-sm focus:outline-none focus:border-[#003366] resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Taxa (%) *</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        required
                        value={formData.taxa}
                        onChange={(e) => setFormData({ ...formData, taxa: Number(e.target.value) })}
                        className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2 text-sm focus:outline-none focus:border-[#003366] pr-8 text-right font-mono"
                      />
                      <Percent className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Tipo *</label>
                    <select
                      value={formData.tipo_imposto}
                      onChange={(e) => setFormData({ ...formData, tipo_imposto: e.target.value })}
                      className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2 text-sm focus:outline-none focus:border-[#003366]"
                    >
                      <option value="IVA">IVA</option>
                      <option value="Imposto de Selo">Imposto de Selo</option>
                      <option value="Imposto Industrial">Imposto Industrial</option>
                      <option value="IRT">IRT - Rend. Trabalho</option>
                      <option value="Consumo">Imposto de Consumo</option>
                      <option value="Retencao">Retenção na Fonte</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 pt-3 pb-2 border-t border-zinc-100 mt-4">
                  <div 
                    className={`w-10 h-5 rounded-full p-1 cursor-pointer transition-colors ${formData.activo ? 'bg-[#003366]' : 'bg-zinc-300'}`}
                    onClick={() => setFormData({ ...formData, activo: !formData.activo })}
                  >
                    <div className={`bg-white w-3 h-3 rounded-full transition-transform ${formData.activo ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-sm text-zinc-800 font-bold cursor-pointer" onClick={() => setFormData({ ...formData, activo: !formData.activo })}>
                      Imposto {formData.activo ? 'Ativo' : 'Inativo'}
                    </label>
                    <span className="text-[10px] text-zinc-500">
                      {formData.activo ? 'Pode ser selecionado em cálculos' : 'Pausado, não aparecerá em novas faturas'}
                    </span>
                  </div>
                </div>
              </form>
            </div>
            
            <div className="p-6 border-t border-zinc-100 bg-zinc-50 flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={loading}
                className="px-6 py-2.5 bg-white border border-zinc-200 text-zinc-600 font-bold uppercase text-[10px] tracking-wider hover:bg-zinc-50 hover:text-zinc-900 transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="tax-form"
                disabled={loading}
                className="px-6 py-2.5 bg-[#003366] text-white font-bold uppercase text-[10px] tracking-wider hover:bg-[#002244] shadow-md shadow-blue-900/10 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    A processar...
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    {editingTax ? 'Atualizar Imposto' : 'Guardar Imposto'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxesModule;
