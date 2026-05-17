import React, { useState } from 'react';
import { Home, Plus, History, X, Edit, Trash2 } from 'lucide-react';
import { useWarehouses } from '../hooks/useWarehouses';
import { Warehouse } from '../types';

export const WarehouseModule = ({ onRefresh }: { onRefresh?: () => void }) => {
  const { warehouses, loading, createWarehouse, updateWarehouse, deleteWarehouse } = useWarehouses();
  const [showForm, setShowForm] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      localidade: formData.get('localidade') as string,
      provincia: formData.get('provincia') as string,
      responsavel: formData.get('responsavel') as string,
      contacto: formData.get('contacto') as string,
    };
    
    try {
      if (editingWarehouse) {
        await updateWarehouse(editingWarehouse.id, data);
        alert('Armazém atualizado com sucesso!');
      } else {
        await createWarehouse(data);
        alert('Armazém criado com sucesso!');
      }
      if (onRefresh) onRefresh();
      setShowForm(false);
      setEditingWarehouse(null);
    } catch (err: any) {
      alert('Erro ao guardar armazém: ' + err.message);
    }
  };

  const handleEdit = (warehouse: Warehouse) => {
    setEditingWarehouse(warehouse);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem a certeza que deseja eliminar este armazém?')) return;
    try {
      await deleteWarehouse(id);
      alert('Armazém eliminado com sucesso!');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert('Erro ao eliminar armazém: ' + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 border border-zinc-200 shadow-sm">
        <div>
          <h3 className="text-lg font-bold text-[#003366] uppercase tracking-tight flex items-center gap-2">
            <Home size={20} /> Gestão de Armazéns
          </h3>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mt-1">Configure os locais de armazenamento da sua empresa.</p>
        </div>
        <button 
          onClick={() => {
            setEditingWarehouse(null);
            setShowForm(true);
          }}
          className="bg-[#003366] text-white px-6 py-2.5 text-[10px] font-black uppercase tracking-widest hover:bg-[#002244] transition-all shadow-sm flex items-center gap-2"
        >
          <Plus size={16} /> Novo Armazém
        </button>
      </div>

      <div className="bg-white border border-zinc-200">
        <div className="p-4 bg-zinc-50 border-b border-zinc-200">
          <h4 className="text-[11px] font-black text-[#003366] uppercase tracking-widest flex items-center gap-2">
            <History size={14} /> Lista de Armazéns Registados
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#003366] text-white">
              <tr className="uppercase text-[10px] tracking-wider">
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">Localidade</th>
                <th className="px-6 py-4">Responsável</th>
                <th className="px-6 py-4">Contacto</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {warehouses.map(w => (
                <tr key={w.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-zinc-400">#{w.id}</td>
                  <td className="px-6 py-4 font-black text-[#003366] uppercase">{w.name}</td>
                  <td className="px-6 py-4 text-zinc-600 font-bold">{w.localidade || '---'}</td>
                  <td className="px-6 py-4 text-zinc-500">{w.responsavel || '---'}</td>
                  <td className="px-6 py-4 text-zinc-500 font-mono italic">{w.contacto || '---'}</td>
                  <td className="px-6 py-4 text-right font-bold space-x-3">
                    <button onClick={() => handleEdit(w)} className="text-blue-600 hover:text-blue-900 transition-colors"><Edit size={14} className="inline mr-1" /> Editar</button>
                    <button onClick={() => handleDelete(w.id)} className="text-red-500 hover:text-red-700 transition-colors"><Trash2 size={14} className="inline mr-1" /> Eliminar</button>
                  </td>
                </tr>
              ))}
              {warehouses.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-400 italic">Nenhum armazém encontrado.</td>
                </tr>
              )}
              {loading && warehouses.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-400 italic">Carregando armazéns...</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md p-8 rounded-none shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-4">
              <h3 className="text-lg font-bold text-[#003366] uppercase tracking-tight">{editingWarehouse ? 'Editar Armazém' : 'Novo Armazém'}</h3>
              <button type="button" onClick={() => setShowForm(false)} className="text-zinc-400 hover:text-zinc-600"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Nome do Armazém</label>
                <input name="name" defaultValue={editingWarehouse?.name || ''} required className="w-full bg-zinc-50 border border-zinc-200 p-3 text-sm focus:outline-none focus:border-[#003366] font-bold" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Localidade</label>
                  <input name="localidade" defaultValue={editingWarehouse?.localidade || ''} className="w-full bg-zinc-50 border border-zinc-200 p-3 text-sm focus:outline-none focus:border-[#003366] font-medium" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Província</label>
                  <input name="provincia" defaultValue={editingWarehouse?.provincia || ''} className="w-full bg-zinc-50 border border-zinc-200 p-3 text-sm focus:outline-none focus:border-[#003366] font-medium" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Responsável</label>
                <input name="responsavel" defaultValue={editingWarehouse?.responsavel || ''} className="w-full bg-zinc-50 border border-zinc-200 p-3 text-sm focus:outline-none focus:border-[#003366] font-medium" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Contacto</label>
                <input name="contacto" defaultValue={editingWarehouse?.contacto || ''} className="w-full bg-zinc-50 border border-zinc-200 p-3 text-sm focus:outline-none focus:border-[#003366] font-medium" />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 text-xs font-bold text-zinc-500 uppercase tracking-widest">Cancelar</button>
                <button type="submit" className="bg-[#003366] text-white px-8 py-2.5 text-xs font-bold uppercase tracking-widest hover:bg-[#002244] shadow-lg transition-all">Salvar Armazém</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
