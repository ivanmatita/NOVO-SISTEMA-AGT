import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { FileText, Plus, Trash2, Save, AlertCircle } from 'lucide-react';

export const EmpresaDocumentosManager = () => {
  const { user } = useAuth();
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newDoc, setNewDoc] = useState({ nome_documento: '', tipo_documento: '' });

  useEffect(() => {
    if (user?.empresa_id) {
      loadDocs();
    }
  }, [user?.empresa_id]);

  const loadDocs = async () => {
    const { data, error } = await supabase
      .from('empresa_documentos')
      .select('*, media_arquivos(url)')
      .eq('empresa_id', user?.empresa_id);
    
    if (data) setDocs(data);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.empresa_id) {
        alert('Erro: Empresa não identificada. Por favor, inicie sessão novamente.');
        return;
    }
    setLoading(true);
    const { error } = await supabase
      .from('empresa_documentos')
      .insert([{ ...newDoc, empresa_id: user.empresa_id }]);
    
    if (error) {
        console.error('Erro ao inserir documento:', error);
        alert('Erro ao guardar documento: ' + error.message);
    } else {
      setNewDoc({ nome_documento: '', tipo_documento: '' });
      loadDocs();
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja apagar este documento?')) return;
    await supabase.from('empresa_documentos').delete().eq('id', id);
    loadDocs();
  };

  return (
    <div className="bg-white p-6 border border-zinc-200 space-y-6">
      <h3 className="text-lg font-black text-[#003366] uppercase flex items-center gap-2">
        <FileText size={20} /> Gestão de Documentos da Empresa
      </h3>

      <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div>
          <label className="text-[10px] font-bold text-zinc-400 uppercase">Nome</label>
          <input required value={newDoc.nome_documento} onChange={e => setNewDoc({...newDoc, nome_documento: e.target.value})} className="w-full border border-zinc-200 p-2 text-sm" />
        </div>
        <div>
          <label className="text-[10px] font-bold text-zinc-400 uppercase">Tipo</label>
          <input required value={newDoc.tipo_documento} onChange={e => setNewDoc({...newDoc, tipo_documento: e.target.value})} className="w-full border border-zinc-200 p-2 text-sm" />
        </div>
        <button disabled={loading} className="bg-[#003366] text-white py-2 text-xs font-bold uppercase flex items-center justify-center gap-2 hover:bg-blue-900">
          <Plus size={14} /> Adicionar
        </button>
      </form>

      <div className="border border-zinc-200">
        {docs.map(doc => (
          <div key={doc.id} className="flex items-center justify-between p-4 border-b border-zinc-100">
            <div>
              <p className="text-sm font-bold">{doc.nome_documento}</p>
              <p className="text-[10px] text-zinc-500 uppercase">{doc.tipo_documento}</p>
            </div>
            <button onClick={() => handleDelete(doc.id)} className="text-red-500 hover:text-red-700">
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
