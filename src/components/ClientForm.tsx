import React, { useState, useEffect } from 'react';
import { Users, Search, X, Check, AlertCircle, ShoppingBag } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';

interface ClientFormProps {
  initialData?: any;
  onSuccess: () => void;
  onBack: () => void;
  isSupplier?: boolean;
}

export function ClientForm({ initialData, onSuccess, onBack, isSupplier }: ClientFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contribuinte: '',
    morada: '',
    localidade: '',
    codigo_postal: '',
    provincia: '',
    municipio: '',
    pais: 'Angola',
    telefone: '',
    webpage: '',
    tipo_cliente: 'normal',
    saldo_inicial: 0
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        email: initialData.email || '',
        contribuinte: initialData.contribuinte || '',
        morada: initialData.morada || '',
        localidade: initialData.localidade || '',
        codigo_postal: initialData.codigo_postal || '',
        provincia: initialData.provincia || '',
        municipio: initialData.municipio || '',
        pais: initialData.pais || 'Angola',
        telefone: initialData.telefone || '',
        webpage: initialData.webpage || '',
        tipo_cliente: initialData.tipo_cliente || 'normal',
        saldo_inicial: initialData.saldo_inicial || 0
      });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (!user?.company_id) {
        throw new Error("Sessão expirada. Por favor, faça login novamente.");
      }

      const clientData = {
        ...formData,
        company_id: user.company_id,
        tipo_entidade: isSupplier ? 'Fornecedor' : 'Cliente'
      };

      const endpoint = isSupplier ? '/api/suppliers' : '/api/clients';

      if (initialData?.id) {
        const res = await fetch(`${endpoint}/${initialData.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(clientData)
        });
        if (!res.ok) throw new Error(await res.text());
        setMessage({ type: 'success', text: isSupplier ? 'Fornecedor atualizado com sucesso!' : 'Cliente atualizado com sucesso!' });
      } else {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(clientData)
        });
        if (!res.ok) throw new Error(await res.text());
        setMessage({ type: 'success', text: isSupplier ? 'Fornecedor registado com sucesso!' : 'Cliente registado com sucesso!' });
      }

      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err: any) {
      console.error('Erro ao salvar cliente/fornecedor:', err);
      setMessage({ type: 'error', text: err.message || 'Ocorreu um erro ao salvar.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-0 overflow-hidden flex flex-col">
      <div className="shrink-0 p-6 border-b border-zinc-100 bg-zinc-50/50 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#003366] text-white flex items-center justify-center">
            {isSupplier ? <ShoppingBag size={20} /> : <Users size={20} />}
          </div>
          <div>
            <h3 className="text-xl font-black text-[#003366] uppercase tracking-tight">
              {initialData ? (isSupplier ? 'Editar Fornecedor' : 'Editar Cliente') : (isSupplier ? 'Registar Novo Fornecedor' : 'Registar Novo Cliente')}
            </h3>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">{isSupplier ? 'Módulo de Gestão de Fornecedores' : 'Módulo de Gestão de Contas de Clientes'}</p>
          </div>
        </div>
        <button type="button" onClick={onBack} className="text-zinc-400 hover:text-red-500 transition-colors">
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 max-h-[70vh]">
        {message && (
          <div className={`mb-6 p-4 flex items-center gap-3 border ${
            message.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-800'
          } animate-in fade-in slide-in-from-top-2`}>
            {message.type === 'success' ? <Check size={20} /> : <AlertCircle size={20} />}
            <span className="text-sm font-bold uppercase tracking-wide">{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Contribuinte (NIF) *</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                name="contribuinte"
                value={formData.contribuinte} 
                onChange={handleChange} 
                className="flex-1 bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm font-bold" 
                placeholder="Ex: 5000..." 
                required
              />
              <button 
                type="button"
                onClick={() => {
                  if (formData.contribuinte) {
                    window.open(`https://portaldocontribuinte.minfin.gov.ao/consultar-nif-do-contribuinte?nif=${formData.contribuinte}`, '_blank');
                  } else {
                    alert('Por favor, insira um NIF para pesquisar.');
                  }
                }}
                className="bg-zinc-100 hover:bg-zinc-200 text-[#003366] px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all border border-zinc-200 flex items-center gap-1 shadow-sm active:scale-95"
              >
                <Search size={14} /> Pesquisar
              </button>
            </div>
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Nome Completo / Designação Social *</label>
            <input 
              type="text" 
              name="name"
              value={formData.name} 
              onChange={handleChange} 
              required 
              className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm font-bold" 
              placeholder="Ex: Empresa de Serviços Lda" 
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Email</label>
            <input 
              type="email" 
              name="email"
              value={formData.email} 
              onChange={handleChange} 
              className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" 
              placeholder="cliente@exemplo.com" 
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Telefone</label>
            <input 
              type="text" 
              name="telefone"
              value={formData.telefone} 
              onChange={handleChange} 
              className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" 
              placeholder="+244 9... / 222..." 
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">País</label>
            <input 
              type="text" 
              name="pais"
              value={formData.pais} 
              onChange={handleChange} 
              className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm font-bold" 
              placeholder="Angola" 
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Província</label>
            <input 
              type="text" 
              name="provincia"
              value={formData.provincia} 
              onChange={handleChange} 
              className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" 
              placeholder="Luanda" 
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Município</label>
            <input 
              type="text" 
              name="municipio"
              value={formData.municipio} 
              onChange={handleChange} 
              className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" 
              placeholder="Belas" 
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Localidade</label>
            <input 
              type="text" 
              name="localidade"
              value={formData.localidade} 
              onChange={handleChange} 
              className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" 
              placeholder="Talatona" 
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Morada Principal</label>
            <input 
              type="text" 
              name="morada"
              value={formData.morada} 
              onChange={handleChange} 
              className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" 
              placeholder="Rua, Edifício, Andar..." 
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Código Postal</label>
            <input 
              type="text" 
              name="codigo_postal"
              value={formData.codigo_postal} 
              onChange={handleChange} 
              className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm italic" 
              placeholder="0000-000" 
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Tipo de Cliente (SFT)</label>
            <select 
              name="tipo_cliente"
              value={formData.tipo_cliente} 
              onChange={handleChange} 
              required 
              className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm font-bold uppercase"
            >
              <option value="normal">Cliente Normal</option>
              <option value="grupo_nacional">Cliente Grupo Nacional</option>
              <option value="subsidiarias">Cliente Subsidiárias</option>
              <option value="associados">Cliente Associados</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Saldo Inicial de Crédito</label>
            <input 
              type="number" 
              step="0.01" 
              name="saldo_inicial"
              value={formData.saldo_inicial} 
              onChange={handleChange} 
              className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-emerald-700 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 font-black text-sm" 
              placeholder="0.00" 
              disabled={!!initialData}
            />
          </div>
        </form>
      </div>

      <div className="shrink-0 p-6 border-t border-zinc-100 bg-zinc-50 flex justify-end gap-3">
        <button 
          type="button" 
          onClick={onBack} 
          className="px-8 py-2.5 text-xs font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-800 transition-all active:scale-95"
        >
          Anular Operação
        </button>
        <button 
          onClick={handleSubmit}
          disabled={loading}
          className="bg-[#003366] text-white px-10 py-2.5 text-xs font-black uppercase tracking-[0.2em] shadow-xl hover:bg-[#002244] transition-all disabled:opacity-50 active:scale-95"
        >
          {loading ? 'Processando...' : initialData ? 'Validar Alterações' : (isSupplier ? 'Submeter Novo Fornecedor' : 'Submeter Novo Cliente')}
        </button>
      </div>
    </div>
  );
}
