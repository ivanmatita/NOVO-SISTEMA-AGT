import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { FileText, Plus, Trash2, Save, AlertCircle } from 'lucide-react';

export const SecretariaDigitalManager = () => {
  const { user } = useAuth();
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newDoc, setNewDoc] = useState({ titulo: '', categoria: '', descricao: '' });

  useEffect(() => {
    if (user?.empresa_id) {
      loadDocs();
    }
  }, [user?.empresa_id]);

  const loadDocs = async () => {
    if (!user?.empresa_id) return;
    const { data, error } = await supabase
      .from('secretaria_digital')
      .select('*')
      .eq('empresa_id', user.empresa_id);
    
    if (data) setDocs(data);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.empresa_id) return;
    setLoading(true);
    const { error } = await supabase
      .from('secretaria_digital')
      .insert([{ ...newDoc, empresa_id: user.empresa_id, status: 'pendente' }]);
    
    if (error) {
        console.error('Erro ao inserir documento:', error);
        alert('Erro ao guardar documento: ' + error.message);
    } else {
      setNewDoc({ titulo: '', categoria: '', descricao: '' });
      loadDocs();
    }
    setLoading(false);
  };

  return (
    <div className="bg-white p-6 border border-zinc-200 space-y-6">
      <h3 className="text-lg font-black text-[#003366] uppercase flex items-center gap-2">
        <FileText size={20} /> Secretaria Digital
      </h3>

      <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div>
          <label className="text-[10px] font-bold text-zinc-400 uppercase">Título</label>
          <input required value={newDoc.titulo} onChange={e => setNewDoc({...newDoc, titulo: e.target.value})} className="w-full border border-zinc-200 p-2 text-sm" />
        </div>
        <div>
          <label className="text-[10px] font-bold text-zinc-400 uppercase">Categoria</label>
          <input value={newDoc.categoria} onChange={e => setNewDoc({...newDoc, categoria: e.target.value})} className="w-full border border-zinc-200 p-2 text-sm" />
        </div>
        <div className="col-span-1">
          <label className="text-[10px] font-bold text-zinc-400 uppercase">Descrição</label>
          <input value={newDoc.descricao} onChange={e => setNewDoc({...newDoc, descricao: e.target.value})} className="w-full border border-zinc-200 p-2 text-sm" />
        </div>
        <button disabled={loading} className="bg-[#003366] text-white py-2 text-xs font-bold uppercase flex items-center justify-center gap-2 hover:bg-blue-900">
          <Plus size={14} /> Adicionar
        </button>
      </form>

      <div className="border border-zinc-200">
        {docs.map(doc => (
          <div key={doc.id} className="flex items-center justify-between p-4 border-b border-zinc-100">
            <div>
              <p className="text-sm font-bold">{doc.titulo}</p>
              <p className="text-[10px] text-zinc-500 uppercase">{doc.categoria} - Status: {doc.status}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
