import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';

export function ClientForm() {
  const { user } = useAuth();
  
  const [formData, setFormData] = useState({
    contribuinte: '',
    name: '',
    morada: '',
    localidade: '',
    codigo_postal: '',
    provincia: '',
    municipio: '',
    pais: 'Angola',
    telefone: '',
    email: '',
    estado_nif: '',
    webpage: '',
    tipo_cliente: '',
    saldo_inicial: 0
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const criarCliente = async (data: typeof formData) => {
    try {
      if (!user?.company_id) {
        throw new Error("Sessão expirada ou empresa não identificada.");
      }

      // Basic validation
      if (!data.name || !data.contribuinte) {
        throw new Error("Nome do Cliente e Contribuinte são obrigatórios.");
      }
      
      if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        throw new Error("Email inválido.");
      }

      const { error } = await supabase
        .from('clientes')
        .insert([{
          contribuinte: data.contribuinte,
          name: data.name,
          morada: data.morada,
          localidade: data.localidade,
          codigo_postal: data.codigo_postal,
          provincia: data.provincia,
          municipio: data.municipio,
          pais: data.pais,
          telefone: data.telefone,
          email: data.email,
          estado_nif: data.estado_nif,
          webpage: data.webpage,
          tipo_cliente: data.tipo_cliente,
          saldo_inicial: data.saldo_inicial,
          company_id: user.company_id
        }]);

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      console.error('Erro ao criar cliente:', err);
      return { success: false, error: err.message };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const result = await criarCliente(formData);

    if (result.success) {
      setMessage({ type: 'success', text: 'Cliente salvo com sucesso!' });
      setFormData({
        contribuinte: '',
        name: '',
        morada: '',
        localidade: '',
        codigo_postal: '',
        provincia: '',
        municipio: '',
        pais: 'Angola',
        telefone: '',
        email: '',
        estado_nif: '',
        webpage: '',
        tipo_cliente: '',
        saldo_inicial: 0
      });
    } else {
      setMessage({ type: 'error', text: result.error || 'Ocorreu um erro ao salvar o cliente.' });
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Novo Cliente</h2>
      
      {message && (
        <div className={`p-4 mb-4 rounded ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { label: 'Contribuinte', name: 'contribuinte', type: 'text', required: true },
          { label: 'Nome Cliente', name: 'name', type: 'text', required: true },
          { label: 'Email', name: 'email', type: 'email' },
          { label: 'Telefone', name: 'telefone', type: 'text' },
          { label: 'Morada', name: 'morada', type: 'text' },
          { label: 'Localidade', name: 'localidade', type: 'text' },
          { label: 'Código Postal', name: 'codigo_postal', type: 'text' },
          { label: 'Província', name: 'provincia', type: 'text' },
          { label: 'Município', name: 'municipio', type: 'text' },
          { label: 'País', name: 'pais', type: 'text' },
          { label: 'Estado NIF', name: 'estado_nif', type: 'text' },
          { label: 'Webpage', name: 'webpage', type: 'url' },
          { label: 'Tipo Cliente', name: 'tipo_cliente', type: 'text' },
          { label: 'Saldo Inicial', name: 'saldo_inicial', type: 'number' },
        ].map(field => (
          <div key={field.name} className={field.name === 'morada' ? 'md:col-span-2' : ''}>
            <label className="block text-sm font-medium text-gray-700">{field.label}</label>
            <input
              type={field.type}
              name={field.name}
              value={formData[field.name as keyof typeof formData]}
              onChange={handleChange}
              required={field.required}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        ))}

        <button
          type="submit"
          disabled={loading}
          className="md:col-span-2 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
        >
          {loading ? 'Salvando...' : 'Salvar Cliente'}
        </button>
      </form>
    </div>
  );
}
