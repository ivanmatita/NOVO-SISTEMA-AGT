import React, { useState } from 'react';
import { Plus, Bell, AlertCircle, Trash2, CheckCircle, Clock } from 'lucide-react';
import { useAlertas, AlertaTarefa } from '../hooks/useAlertas';
import { motion, AnimatePresence } from 'motion/react';

export const AlertasModule = () => {
  const { alertas, loading, deleteAlerta, createAlerta, updateAlerta } = useAlertas();
  const [showModal, setShowModal] = useState(false);
  const [editingAlertaId, setEditingAlertaId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'Alerta',
    description: '',
    responsible: '',
    start_date: '',
    end_date: '',
    advance_time: '',
    obs: ''
  });

  const handleOpenModal = (alerta?: AlertaTarefa) => {
    if (alerta) {
      setEditingAlertaId(alerta.id);
      setFormData({
        name: alerta.name || '',
        type: alerta.type || 'Alerta',
        description: alerta.description || '',
        responsible: alerta.responsible || '',
        start_date: alerta.start_date ? new Date(alerta.start_date).toISOString().split('T')[0] : '',
        end_date: alerta.end_date ? new Date(alerta.end_date).toISOString().split('T')[0] : '',
        advance_time: alerta.advance_time || '',
        obs: alerta.obs || ''
      });
    } else {
      setEditingAlertaId(null);
      setFormData({
        name: '',
        type: 'Alerta',
        description: '',
        responsible: '',
        start_date: '',
        end_date: '',
        advance_time: '',
        obs: ''
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAlertaId) {
        await updateAlerta(
          editingAlertaId,
          formData.name,
          formData.type,
          formData.description,
          formData.responsible,
          formData.start_date,
          formData.end_date,
          formData.advance_time,
          formData.obs
        );
      } else {
        await createAlerta(
          formData.name,
          formData.type,
          formData.description,
          formData.responsible,
          formData.start_date,
          formData.end_date,
          formData.advance_time,
          formData.obs
        );
      }
      setShowModal(false);
    } catch (err) {
      alert('Erro ao guardar alerta.');
    }
  };

  const getTipoStyle = (tipo: string) => {
    if (!tipo) return 'bg-blue-100 text-blue-700 border-blue-200';
    const lowerTipo = tipo.toLowerCase();
    if (lowerTipo.includes('crítico') || lowerTipo.includes('danger')) return 'bg-red-100 text-red-700 border-red-200';
    if (lowerTipo.includes('aviso') || lowerTipo.includes('warning')) return 'bg-amber-100 text-amber-700 border-amber-200';
    if (lowerTipo.includes('sucesso') || lowerTipo.includes('success')) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    return 'bg-blue-100 text-blue-700 border-blue-200';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center bg-white p-6 border border-zinc-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#003366] flex items-center justify-center text-white rounded-lg">
            <Bell size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-[#003366] uppercase tracking-tight">Gestão de Alertas Operacionais</h2>
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Monitorização em tempo real e notificações do sistema</p>
          </div>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-[#F27D26] text-white px-6 py-3 text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-[#d96a1a] transition-all shadow-lg"
        >
          <Plus size={16} /> Emitir Novo Alerta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stats Summary */}
        <div className="bg-white p-6 border border-zinc-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Total de Alertas</p>
            <h3 className="text-3xl font-black text-[#003366]">{alertas.length}</h3>
          </div>
          <Bell className="text-zinc-200" size={40} />
        </div>
        <div className="bg-white p-6 border border-zinc-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Alertas Críticos</p>
            <h3 className="text-3xl font-black text-red-600">{alertas.filter(a => a.type?.toLowerCase().includes('crítico')).length}</h3>
          </div>
          <AlertCircle className="text-zinc-200" size={40} />
        </div>
        <div className="bg-white p-6 border border-zinc-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Alertas de Aviso</p>
            <h3 className="text-3xl font-black text-amber-500">{alertas.filter(a => a.type?.toLowerCase().includes('aviso')).length}</h3>
          </div>
          <Clock className="text-zinc-200" size={40} />
        </div>
      </div>

      <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
        <div className="bg-zinc-50 border-b border-zinc-200 p-4">
          <h3 className="text-xs font-black text-[#003366] uppercase tracking-widest">Fila de Notificações</h3>
        </div>
        
        {loading ? (
          <div className="p-12 text-center text-zinc-400 font-bold uppercase tracking-widest animate-pulse">Carregando Alertas...</div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {alertas.length === 0 ? (
              <div className="p-12 text-center text-zinc-400 italic">Nenhum alerta registado para a sua empresa.</div>
            ) : (
              alertas.map(alerta => (
                <div key={alerta.id} className="p-4 flex gap-4 transition-colors bg-white hover:bg-zinc-50 cursor-pointer" onClick={() => handleOpenModal(alerta)}>
                  <div className={`w-1 h-full absolute left-0 ${alerta.type?.toLowerCase().includes('crítico') ? 'bg-red-500' : 'bg-blue-500'}`} />
                  
                  <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${getTipoStyle(alerta.type)}`}>
                    {alerta.type?.toLowerCase().includes('crítico') ? <AlertCircle size={20} /> : <Bell size={20} />}
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between">
                      <h4 className="font-black text-sm uppercase tracking-tight text-[#003366]">
                        {alerta.name}
                      </h4>
                      <span className="text-[10px] font-bold text-zinc-400">{new Date(alerta.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-zinc-600">{alerta.description}</p>
                    
                    <div className="pt-2 flex flex-wrap gap-4">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${getTipoStyle(alerta.type)}`}>
                        {alerta.type}
                      </span>
                      {alerta.responsible && (
                        <span className="text-[9px] font-black uppercase text-zinc-400">
                          Responsável: {alerta.responsible}
                        </span>
                      )}
                      {alerta.start_date && (
                        <span className="text-[9px] font-black uppercase text-zinc-400">
                          Início: {new Date(alerta.start_date).toLocaleDateString()}
                        </span>
                      )}
                      {alerta.end_date && (
                        <span className="text-[9px] font-black uppercase text-zinc-400">
                          Fim: {new Date(alerta.end_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 items-start" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => deleteAlerta(alerta.id)}
                      className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                      title="Eliminar"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Modal Form */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-zinc-200 p-8 shadow-2xl relative overflow-hidden max-w-md w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-[#F27D26]" />
              <h3 className="font-black text-[#003366] mb-6 flex items-center gap-2 uppercase tracking-tight">
                {editingAlertaId ? 'Editar Alerta' : 'Emitir Novo Alerta'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Nome do Alerta</label>
                  <input 
                    type="text" 
                    required 
                    className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366]" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Tipo</label>
                    <select 
                      className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366]"
                      value={formData.type}
                      onChange={e => setFormData({...formData, type: e.target.value})}
                    >
                      <option value="Informação">Informação</option>
                      <option value="Aviso">Aviso</option>
                      <option value="Crítico">Crítico</option>
                      <option value="Sucesso">Sucesso</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Responsável</label>
                    <input 
                      type="text" 
                      className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366]" 
                      value={formData.responsible}
                      onChange={e => setFormData({...formData, responsible: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Descrição</label>
                  <textarea 
                    className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366] h-20" 
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Data Inicial</label>
                    <input 
                      type="date" 
                      className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366]" 
                      value={formData.start_date}
                      onChange={e => setFormData({...formData, start_date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Data Final</label>
                    <input 
                      type="date" 
                      className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366]" 
                      value={formData.end_date}
                      onChange={e => setFormData({...formData, end_date: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Tempo de Avanço</label>
                    <input 
                      type="text" 
                      placeholder="Ex: 2 dias"
                      className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366]" 
                      value={formData.advance_time}
                      onChange={e => setFormData({...formData, advance_time: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Observação</label>
                  <textarea 
                    className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366] h-16" 
                    value={formData.obs}
                    onChange={e => setFormData({...formData, obs: e.target.value})}
                  />
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-zinc-100 text-zinc-600 py-3 text-[10px] font-black uppercase tracking-widest">Cancelar</button>
                  <button type="submit" className="flex-1 bg-[#003366] text-white py-3 px-8 text-[10px] font-black uppercase tracking-widest shadow-lg">Guardar Alerta</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
