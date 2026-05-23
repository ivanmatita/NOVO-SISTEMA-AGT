import React, { useState, useEffect } from 'react';
import { X, Ban, Trash2, Edit, Save, Plus, AlertCircle, TrendingDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Employee, EmployeePenalty } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export const EmployeeFinesModal = ({ 
  employee, 
  onClose,
  onRefresh 
}: { 
  employee: Employee; 
  onClose: () => void;
  onRefresh?: () => void;
}) => {
  const { user } = useAuth();
  const [penalties, setPenalties] = useState<EmployeePenalty[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingPenalty, setEditingPenalty] = useState<EmployeePenalty | null>(null);
  
  const [formData, setFormData] = useState({
    type: 'multa' as 'multa' | 'penalizacao',
    date: new Date().toISOString().split('T')[0],
    reason: '',
    observation: '',
    ordered_by: '',
    amount: '' as string | number
  });

  useEffect(() => {
    fetchPenalties();
  }, [employee.id]);

  const fetchPenalties = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('employee_penalties')
        .select('*')
        .eq('employee_id', employee.id)
        .order('date', { ascending: false });

      if (error) throw error;
      setPenalties(data || []);
    } catch (err) {
      console.error('Error fetching penalties:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.reason || !formData.amount || !formData.ordered_by) {
      alert('Preencha os campos obrigatórios.');
      return;
    }

    try {
      setSubmitting(true);
      const parts = formData.date.split('-'); 
      const year = parts[0];
      const monthPart = parts[1];
      const month = `${monthPart}/${year}`; // MM/YYYY format

      const penaltyData = {
        employee_id: employee.id,
        type: formData.type,
        date: formData.date,
        reason: formData.reason,
        observation: formData.observation,
        ordered_by: formData.ordered_by,
        amount: Number(formData.amount),
        month: month,
        empresa_id: user?.empresa_id
      };

      if (editingPenalty) {
        const { error } = await supabase
          .from('employee_penalties')
          .update(penaltyData)
          .eq('id', editingPenalty.id);
        if (error) throw error;
        alert('Registo disciplinar atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('employee_penalties')
          .insert([penaltyData]);
        if (error) throw error;
        alert('Multa/Penalização registada com sucesso! O valor será descontado no processamento do mês ' + month);
      }

      setFormData({ 
        type: 'multa', 
        date: new Date().toISOString().split('T')[0], 
        reason: '', 
        observation: '', 
        ordered_by: '', 
        amount: '' 
      });
      setEditingPenalty(null);
      fetchPenalties();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error saving penalty:', err);
      alert('Erro ao registar.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string | number) => {
    if (!confirm('Eliminar este registo permanentemente?')) return;
    try {
      const { error } = await supabase
        .from('employee_penalties')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchPenalties();
    } catch (err) {
      console.error('Error deleting penalty:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-zinc-200"
      >
        <div className="bg-red-600 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Ban size={20} />
            <div>
              <h3 className="font-extrabold uppercase tracking-widest text-xs">Multas e Penalizações Disciplinares</h3>
              <p className="text-[10px] text-white/70 uppercase font-bold mt-0.5">{employee.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-white/10 p-1.5 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="bg-zinc-50 border border-zinc-200 p-8 space-y-8 shadow-sm mb-10">
             <div className="flex items-center gap-3 border-b border-zinc-100 pb-4">
                <div className="w-1.5 h-6 bg-red-600" />
                <h4 className="text-sm font-black text-red-600 uppercase tracking-tighter">
                  {editingPenalty ? 'Editar Registo Disciplinar' : 'Novo Registo de Multa ou Penalização'}
                </h4>
             </div>

             <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Selecionar tipo</label>
                  <select 
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full border border-zinc-200 p-3 text-xs font-bold uppercase focus:border-red-600 outline-none bg-white"
                  >
                    <option value="multa">multa</option>
                    <option value="penalizacao">penalização</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Data</label>
                  <input 
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full border border-zinc-200 p-3 text-xs font-bold uppercase focus:border-red-600 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Mandante</label>
                  <input 
                    type="text"
                    placeholder="Quem ordenou a medida?"
                    value={formData.ordered_by}
                    onChange={e => setFormData({ ...formData, ordered_by: e.target.value })}
                    className="w-full border border-zinc-200 p-3 text-xs font-bold uppercase focus:border-red-600 outline-none"
                  />
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Motivo da penalização ou multa</label>
                  <input 
                    type="text"
                    required
                    placeholder="Ex: Falta não justificada, Atraso reiterado, Má conduta..."
                    value={formData.reason}
                    onChange={e => setFormData({ ...formData, reason: e.target.value })}
                    className="w-full border border-zinc-200 p-3 text-xs font-bold uppercase focus:border-red-600 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Valor descontado</label>
                  <input 
                    type="number"
                    required
                    value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full border border-zinc-200 p-3 text-xs font-black text-red-600 focus:border-red-600 outline-none"
                    placeholder="0.00"
                  />
                </div>

                <div className="md:col-span-3 space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Observação</label>
                  <textarea 
                    value={formData.observation}
                    onChange={e => setFormData({ ...formData, observation: e.target.value })}
                    className="w-full border border-zinc-200 p-3 text-xs font-medium focus:border-red-600 outline-none h-24 resize-none"
                    placeholder="Descreva o incidente ou justificação legal da medida aplicada..."
                  />
                </div>

                <div className="md:col-span-3 flex justify-end gap-3 pt-4 border-t border-zinc-100">
                  {editingPenalty && (
                    <button 
                      type="button" 
                      onClick={() => { setEditingPenalty(null); setFormData({ type: 'multa', date: new Date().toISOString().split('T')[0], reason: '', observation: '', ordered_by: '', amount: '' }); }}
                      className="px-8 py-3 border border-zinc-200 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:bg-zinc-100 transition-colors"
                    >
                      Cancelar Edição
                    </button>
                  )}
                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="px-10 py-3 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-700 transition-all disabled:opacity-50 shadow-lg"
                  >
                    {submitting ? 'Aguarde...' : editingPenalty ? 'Salvar' : 'registar'}
                  </button>
                </div>
             </form>
          </div>

          <div className="space-y-6">
             <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                <h4 className="text-xs font-black text-zinc-800 uppercase tracking-tight flex items-center gap-2">
                  <TrendingDown size={14} className="text-red-500" /> Histórico Disciplinar e de Descontos
                </h4>
                <div className="bg-red-50 text-red-600 px-3 py-1 text-[9px] font-black uppercase tracking-widest border border-red-100">
                  Total Descontos: {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(penalties.reduce((sum, p) => sum + Number(p.amount), 0))}
                </div>
             </div>

             {loading ? (
                <div className="p-10 text-center text-zinc-400">Consultando base de dados...</div>
             ) : penalties.length === 0 ? (
                <div className="p-16 text-center text-zinc-300 font-bold uppercase text-xs tracking-widest border-2 border-dashed border-zinc-50">
                  Nenhuma multa ou penalização registada para este colaborador.
                </div>
             ) : (
                <div className="overflow-x-auto">
                   <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead>
                        <tr className="bg-zinc-100 text-zinc-500 text-[9px] font-black uppercase tracking-widest">
                          <th className="px-6 py-4 border-b border-zinc-200">Tipo</th>
                          <th className="px-6 py-4 border-b border-zinc-200">Data</th>
                          <th className="px-6 py-4 border-b border-zinc-200">Mês Desconto</th>
                          <th className="px-6 py-4 border-b border-zinc-200">Motivo</th>
                          <th className="px-6 py-4 border-b border-zinc-200 text-right">Valor</th>
                          <th className="px-6 py-4 border-b border-zinc-200 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {penalties.map((p) => (
                          <tr key={p.id} className="hover:bg-zinc-50 transition-colors text-[11px]">
                            <td className="px-6 py-4">
                              <span className={`font-black uppercase tracking-tighter ${p.type === 'multa' ? 'text-red-600' : 'text-amber-600'}`}>
                                {p.type === 'multa' ? 'Multa' : 'Penalização'}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-bold text-zinc-500">{new Date(p.date).toLocaleDateString('pt-AO')}</td>
                            <td className="px-6 py-4 font-black text-[#003366]">{p.month}</td>
                            <td className="px-6 py-4">
                              <p className="font-bold text-zinc-900 uppercase truncate max-w-[200px]">{p.reason}</p>
                              <p className="text-[9px] text-zinc-400">Por: {p.ordered_by}</p>
                            </td>
                            <td className="px-6 py-4 text-right font-black text-red-600">
                               -{new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(p.amount)}
                            </td>
                            <td className="px-6 py-4 text-center">
                               <div className="flex items-center justify-center gap-1">
                                  <button 
                                    onClick={() => {
                                      setEditingPenalty(p);
                                      setFormData({
                                        type: p.type,
                                        date: p.date,
                                        reason: p.reason,
                                        observation: p.observation || '',
                                        ordered_by: p.ordered_by,
                                        amount: p.amount
                                      });
                                    }}
                                    className="p-2 text-zinc-400 hover:text-amber-600 hover:bg-zinc-50 transition-colors"
                                  >
                                    <Edit size={16} />
                                  </button>
                                  <button 
                                    onClick={() => handleDelete(p.id)}
                                    className="p-2 text-zinc-400 hover:text-red-600 hover:bg-zinc-50 transition-colors"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                               </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                   </table>
                </div>
             )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
