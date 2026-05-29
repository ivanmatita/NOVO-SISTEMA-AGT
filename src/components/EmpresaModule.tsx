import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Building2, Save, Upload } from 'lucide-react';
import { SecretariaDigitalManager } from './SecretariaDigitalManager';

export const EmpresaModule = ({ onUpdate }: { onUpdate: () => void }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome_empresa: '',
    nif: '',
    email: '',
    telefone: '',
    endereco: '',
    provincia: '',
    municipio: '',
  });

  useEffect(() => {
    if (user?.empresa_id) {
      loadCompanyData();
    }
  }, [user?.empresa_id]);

  const loadCompanyData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/config-empresa', {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setFormData({
          nome_empresa: data.nome_empresa || '',
          nif: data.nif || '',
          email: data.email || '',
          telefone: data.telefone || '',
          endereco: data.endereco || data.address || '',
          provincia: data.provincia || '',
          municipio: data.municipio || '',
        });
      }
    } catch (error) {
      console.error("Erro ao carregar dados unificados da empresa:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/config-empresa', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}` 
        },
        body: JSON.stringify(formData)
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao atualizar');
      }

      alert('Dados da empresa atualizados com sucesso!');
      onUpdate();
    } catch (err: any) {
      alert('Erro ao atualizar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 border border-zinc-200">
        <h3 className="text-lg font-black text-[#003366] uppercase tracking-tight flex items-center gap-2 mb-6">
          <Building2 size={20} /> Documento e Dados da Empresa
        </h3>
        
        <form onSubmit={handleUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-zinc-400">Nome da Empresa</label>
              <input value={formData.nome_empresa} onChange={e => setFormData({...formData, nome_empresa: e.target.value})} className="w-full border border-zinc-200 p-2 text-sm" />
           </div>
           <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-zinc-400">NIF</label>
              <input value={formData.nif} onChange={e => setFormData({...formData, nif: e.target.value})} className="w-full border border-zinc-200 p-2 text-sm" />
           </div>
           <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-zinc-400">Email</label>
              <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full border border-zinc-200 p-2 text-sm" />
           </div>
           <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-zinc-400">Telefone</label>
              <input value={formData.telefone} onChange={e => setFormData({...formData, telefone: e.target.value})} className="w-full border border-zinc-200 p-2 text-sm" />
           </div>
           <div className="col-span-full space-y-1">
              <label className="text-[10px] font-black uppercase text-zinc-400">Endereço</label>
              <input value={formData.endereco} onChange={e => setFormData({...formData, endereco: e.target.value})} className="w-full border border-zinc-200 p-2 text-sm" />
           </div>
           
           <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-zinc-400">Província</label>
              <input value={formData.provincia} onChange={e => setFormData({...formData, provincia: e.target.value})} className="w-full border border-zinc-200 p-2 text-sm" placeholder="Ex: Luanda" />
           </div>
           <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-zinc-400">Município</label>
              <input value={formData.municipio} onChange={e => setFormData({...formData, municipio: e.target.value})} className="w-full border border-zinc-200 p-2 text-sm" placeholder="Ex: Belas" />
           </div>
           <button type="submit" disabled={loading} className="col-span-full bg-[#003366] text-white py-4 font-black text-xs uppercase hover:bg-blue-900 flex items-center justify-center gap-2 shadow-xl shadow-blue-900/20 transition-all">
             <Save size={14} /> {loading ? 'A guardar...' : 'Guardar Dados'}
           </button>
        </form>
      </div>

      <SecretariaDigitalManager />
    </div>
  );
};
