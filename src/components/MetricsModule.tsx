import React, { useState, useEffect } from 'react';
import { Settings, Plus, X, Edit, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import toast, { Toaster } from 'react-hot-toast';

export interface Metric {
  id: string;
  sigla: string;
  descricao: string;
  observacoes: string;
  empresa_id: string;
  created_at: string;
}

export const fetchMetrics = async (empresaId: string) => {
  if (!empresaId) return [];
  try {
    const { data, error } = await supabase
      .from('metrics')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('activo', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('Erro ao buscar métricas:', e);
    return [];
  }
};

export const MetricsModule = ({ onRefreshData }: { onRefreshData?: () => void }) => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [sigla, setSigla] = useState('');
  const [descricao, setDescricao] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const loadMetrics = async () => {
    if (!user?.empresa_id) return;
    setLoading(true);
    const data = await fetchMetrics(user.empresa_id);
    setMetrics(data || []);
    if (onRefreshData) onRefreshData();
    setLoading(false);
  };

  useEffect(() => {
    if (!user?.empresa_id) return;

    loadMetrics();

    // --- Realtime Implementation ---
    const channel = supabase
      .channel(`metrics-${user.empresa_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'metrics',
          filter: `empresa_id=eq.${user.empresa_id}`
        },
        () => {
          loadMetrics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.empresa_id]);

  const handleOpenModal = (metric?: Metric) => {
    if (metric) {
      setEditingId(metric.id);
      setSigla(metric.sigla);
      setDescricao(metric.descricao);
      setObservacoes(metric.observacoes || '');
    } else {
      setEditingId(null);
      setSigla('');
      setDescricao('');
      setObservacoes('');
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.empresa_id) {
        toast.error("Utilizador não autenticado ou empresa desconhecida.");
        return;
    }
    
    setIsSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from('metrics')
          .update({
            sigla,
            descricao,
            observacoes
          })
          .eq('id', editingId)
          .eq('empresa_id', user.empresa_id);
          
        if (error) throw error;
        toast.success("Métrica atualizada com sucesso!");
      } else {
        const { error } = await supabase
          .from('metrics')
          .insert([{
            empresa_id: user.empresa_id,
            sigla,
            descricao,
            observacoes
          }]);
          
        if (error) throw error;
        toast.success("Métrica registada com sucesso!");
      }
      
      setIsModalOpen(false);
      loadMetrics();
    } catch (err: any) {
      console.error('Error saving metric:', err);
      toast.error(`Erro ao guardar métrica: ${err.message || 'Erro desconhecido'}`);
    } finally {
        setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!user?.empresa_id || !confirm('Tem a certeza que deseja eliminar esta métrica?')) return;
    try {
      const { error } = await supabase
        .from('metrics')
        .update({ activo: false })
        .eq('id', id)
        .eq('empresa_id', user.empresa_id);
      
      if (error) throw error;
      toast.success("Métrica eliminada com sucesso!");
      loadMetrics();
    } catch (err: any) {
      console.error('Error deleting metric:', err);
      toast.error(`Erro ao eliminar métrica: ${err.message || 'Erro desconhecido'}`);
    }
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-zinc-800 flex items-center gap-3">
            <Settings size={24} className="text-[#003366]" />
            Métricas (Configuração)
          </h2>
          <p className="text-zinc-500 text-sm">Gerencie as métricas globais do sistema</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-[#003366] text-white px-6 py-2.5 font-bold text-xs uppercase tracking-widest hover:bg-[#002244] shadow-lg flex items-center gap-2"
        >
          <Plus size={18} /> Registar Métrica
        </button>
      </div>

      <div className="bg-white border border-zinc-200 rounded-none shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#003366] text-white text-[11px] uppercase tracking-wider font-bold">
              <th className="px-6 py-4">Sigla</th>
              <th className="px-6 py-4">Descrição</th>
              <th className="px-6 py-4">Observações</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {loading ? (
              <tr><td colSpan={4} className="p-12 text-center text-zinc-400 italic">Carregando métricas...</td></tr>
            ) : metrics.length === 0 ? (
              <tr><td colSpan={4} className="p-12 text-center text-zinc-400 italic">Nenhuma métrica registada.</td></tr>
            ) : metrics.map((m) => (
              <tr key={m.id} className="hover:bg-zinc-50 transition-colors text-sm">
                <td className="px-6 py-4 font-mono text-xs font-bold text-[#003366]">{m.sigla}</td>
                <td className="px-6 py-4 font-bold text-zinc-900">{m.descricao}</td>
                <td className="px-6 py-4 text-zinc-600 max-w-xs truncate">{m.observacoes || '---'}</td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => handleOpenModal(m)}
                    className="text-zinc-400 hover:text-[#003366] mr-3"
                  >
                    <Edit size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(m.id)}
                    className="text-zinc-400 hover:text-red-500"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-none shadow-2xl p-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-[#003366] text-xl uppercase tracking-tight">
                  {editingId ? 'Editar Métrica' : 'Registar Métrica'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Sigla <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    required 
                    value={sigla} 
                    onChange={e => setSigla(e.target.value)} 
                    className="w-full border border-zinc-200 bg-zinc-50 rounded-none px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366] font-bold" 
                    placeholder="Ex: MTR-01" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Descrição <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    required 
                    value={descricao} 
                    onChange={e => setDescricao(e.target.value)} 
                    className="w-full border border-zinc-200 bg-zinc-50 rounded-none px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366]" 
                    placeholder="Descrição da métrica" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Observações</label>
                  <textarea 
                    value={observacoes} 
                    onChange={e => setObservacoes(e.target.value)} 
                    className="w-full border border-zinc-200 bg-zinc-50 rounded-none px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366] min-h-[100px]" 
                    placeholder="Notas adicionais importantes..." 
                  />
                </div>
                
                <button 
                    type="submit" 
                    disabled={isSaving}
                    className="w-full bg-[#003366] text-white font-bold py-3 shadow-lg uppercase text-xs tracking-widest mt-4 disabled:opacity-50"
                >
                  {isSaving ? 'Guardando...' : (editingId ? 'Atualizar Métrica' : 'Registar Métrica')}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
