import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Users, Search, X, Check, AlertCircle, ShoppingBag,
  Landmark, CreditCard, Activity, Loader2, ShieldCheck, ShieldX,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { clienteService, Cliente } from '../services/clienteService';
import { fornecedorService, Fornecedor } from '../services/fornecedorService';
import { validarNIFAGT, NifConsultaResult } from '../services/agt/validarNIF';

interface ClientFormProps {
  initialData?: any;
  onSuccess: () => void;
  onBack: () => void;
  isSupplier?: boolean;
}

export function ClientForm({ initialData, onSuccess, onBack, isSupplier }: ClientFormProps) {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // NIF lookup state
  const [nifLoading, setNifLoading] = useState(false);
  const [nifResult, setNifResult] = useState<NifConsultaResult | null>(null);
  const nifDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLookedUpNif = useRef<string>('');

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
    saldo_inicial: 0,
    // Supplier specific fields
    sigla_banco: '',
    iban: '',
    tipo_fornecedor: 'Nacional',
    activo: true
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || initialData.nome || '',
        email: initialData.email || '',
        contribuinte: initialData.contribuinte || initialData.nif || '',
        morada: initialData.morada || initialData.endereco || initialData.morada || '',
        localidade: initialData.localidade || '',
        codigo_postal: initialData.codigo_postal || '',
        provincia: initialData.provincia || '',
        municipio: initialData.municipio || '',
        pais: initialData.pais || 'Angola',
        telefone: initialData.telefone || '',
        webpage: initialData.webpage || '',
        tipo_cliente: initialData.tipo_cliente || 'normal',
        saldo_inicial: initialData.saldo_inicial || 0,
        sigla_banco: initialData.sigla_banco || '',
        iban: initialData.iban || '',
        tipo_fornecedor: initialData.tipo_fornecedor || 'Nacional',
        activo: initialData.activo !== undefined ? initialData.activo : true
      });
    }
  }, [initialData]);

  /** Debounced auto-lookup triggered when NIF changes */
  const triggerNifLookup = useCallback((nif: string) => {
    // Clear any pending lookup
    if (nifDebounceRef.current) clearTimeout(nifDebounceRef.current);

    // Reset state when NIF is cleared or too short
    if (!nif || nif.length < 6) {
      setNifResult(null);
      setNifLoading(false);
      return;
    }

    // Don't re-lookup the same NIF
    if (nif === lastLookedUpNif.current) return;

    setNifResult(null);

    // Debounce: wait 800ms after the user stops typing
    nifDebounceRef.current = setTimeout(async () => {
      setNifLoading(true);
      lastLookedUpNif.current = nif;
      try {
        const result = await validarNIFAGT(nif);
        setNifResult(result);

        if (result.exists) {
          // Auto-fill Name if currently empty or matches a previous lookup
          setFormData(prev => ({
            ...prev,
            name: result.nome && (!prev.name || prev.name === lastLookedUpNif.current)
              ? result.nome
              : prev.name || result.nome || prev.name,
            activo: result.estado
              ? result.estado.toLowerCase().includes('activo') ||
                result.estado.toLowerCase().includes('ativo')
              : prev.activo,
          }));
        }
      } catch (e: any) {
        setNifResult({ exists: false, error: e?.message || 'Erro ao consultar AGT' });
      } finally {
        setNifLoading(false);
      }
    }, 800);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));

    // Trigger NIF lookup when the NIF field changes
    if (name === 'contribuinte') {
      triggerNifLookup(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (!user?.empresa_id) {
        throw new Error("Sessão inválida ou empresa não associada.");
      }

      if (isSupplier) {
        const supplierData: any = {
          nome: formData.name,
          email: formData.email,
          telefone: formData.telefone,
          morada: formData.morada,
          empresa_id: user.empresa_id,
          nif: formData.contribuinte,
          localidade: formData.localidade,
          codigo_postal: formData.codigo_postal,
          provincia: formData.provincia,
          municipio: formData.municipio,
          pais: formData.pais,
          webpage: formData.webpage,
          sigla_banco: formData.sigla_banco,
          iban: formData.iban,
          tipo_fornecedor: formData.tipo_fornecedor,
          activo: formData.activo
        };

        if (initialData?.id) {
          await fornecedorService.updateFornecedor(initialData.id, supplierData);
        } else {
          await fornecedorService.createFornecedor(supplierData);
        }
      } else {
        const clientData: Cliente = {
          nome: formData.name,
          email: formData.email,
          telefone: formData.telefone,
          endereco: formData.morada,
          empresa_id: user.empresa_id,
          contribuinte: formData.contribuinte,
          nif: formData.contribuinte,
          localidade: formData.localidade,
          codigo_postal: formData.codigo_postal,
          provincia: formData.provincia,
          municipio: formData.municipio,
          pais: formData.pais,
          webpage: formData.webpage,
          tipo_cliente: formData.tipo_cliente,
          saldo_inicial: formData.saldo_inicial,
          tipo_entidade: 'Cliente'
        };

        if (initialData?.id) {
          await clienteService.updateCliente(initialData.id, clientData);
        } else {
          await clienteService.createCliente(clientData);
        }
      }

      setMessage({ type: 'success', text: isSupplier ? 'Fornecedor guardado com sucesso!' : 'Cliente guardado com sucesso!' });
      
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err: any) {
      console.error('[ClientForm] Erro ao salvar:', err);
      setMessage({ type: 'error', text: err.message || 'Ocorreu um erro ao salvar.' });
    } finally {
      setLoading(false);
    }
  };

  // NIF status badge component rendered inline
  const NifStatusBadge = () => {
    if (nifLoading) {
      return (
        <div className="flex items-center gap-1.5 mt-1.5 text-[10px] font-bold text-[#003366] animate-pulse">
          <Loader2 size={11} className="animate-spin" />
          <span>A consultar a AGT...</span>
        </div>
      );
    }
    if (!nifResult) return null;
    if (!nifResult.exists) {
      return (
        <div className="flex items-center gap-1.5 mt-1.5 text-[10px] font-bold text-red-600">
          <ShieldX size={11} />
          <span>{nifResult.error || 'NIF não encontrado'}</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1.5 mt-1.5 text-[10px] font-bold text-emerald-700">
        <ShieldCheck size={11} />
        <span>
          NIF válido · <span className="text-[#003366]">{nifResult.estado}</span>
        </span>
      </div>
    );
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
          {/* ── NIF Field ── */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Identificação (NIF) *</label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input 
                  type="text" 
                  name="contribuinte"
                  value={formData.contribuinte} 
                  onChange={handleChange} 
                  className={`w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm font-bold ${
                    initialData && formData.contribuinte !== '999999999' ? 'opacity-70 cursor-not-allowed bg-zinc-100' : ''
                  } ${nifResult?.exists ? 'border-emerald-400' : ''} ${nifResult && !nifResult.exists && !nifLoading ? 'border-red-400' : ''}`}
                  placeholder="Ex: 5000..." 
                  required
                  readOnly={!!(initialData && formData.contribuinte !== '999999999')}
                />
                {nifLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 size={14} className="animate-spin text-[#003366]" />
                  </div>
                )}
              </div>
              <button 
                type="button"
                onClick={() => {
                  if (formData.contribuinte) {
                    lastLookedUpNif.current = '';
                    triggerNifLookup(formData.contribuinte);
                  }
                }}
                disabled={nifLoading || !formData.contribuinte}
                className="bg-zinc-100 hover:bg-zinc-200 text-[#003366] px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all border border-zinc-200 flex items-center gap-1 shadow-sm active:scale-95 disabled:opacity-50"
              >
                {nifLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} NIF
              </button>
            </div>
            <NifStatusBadge />
          </div>

          {/* ── Name Field ── */}
          <div className="space-y-1 md:col-span-2">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Nome do {isSupplier ? 'Fornecedor' : 'Cliente'} *</label>
            <div className="relative">
              <input 
                type="text" 
                name="name"
                value={formData.name} 
                onChange={handleChange} 
                required 
                className={`w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm font-bold ${
                  nifResult?.exists && nifResult.nome ? 'border-emerald-300 bg-emerald-50/30' : ''
                }`}
                placeholder="Ex: Empresa de Serviços Lda" 
              />
              {nifResult?.exists && nifResult.nome && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <ShieldCheck size={14} className="text-emerald-600" />
                </div>
              )}
            </div>
            {nifResult?.exists && nifResult.nome && (
              <p className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                <Check size={9} /> Preenchido automaticamente pela AGT
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Email institucional</label>
            <input 
              type="email" 
              name="email"
              value={formData.email} 
              onChange={handleChange} 
              className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" 
              placeholder="comercial@exemplo.com" 
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Contacto Telefónico</label>
            <input 
              type="text" 
              name="telefone"
              value={formData.telefone} 
              onChange={handleChange} 
              className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm font-mono" 
              placeholder="+244 9..." 
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">País de Origem</label>
            <select 
              name="pais"
              value={formData.pais} 
              onChange={handleChange} 
              className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm font-bold"
            >
              <option value="Angola">Angola</option>
              <option value="Portugal">Portugal</option>
              <option value="Brasil">Brasil</option>
              <option value="Outro">Outro</option>
            </select>
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
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Morada / Sede Social</label>
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
              className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" 
              placeholder="0000-000" 
            />
          </div>

          <div className="space-y-6 md:col-span-3 border-t border-zinc-100 pt-6 mt-6">
             <div className="flex items-center gap-3 mb-4">
                <Landmark size={20} className="text-[#003366]" />
                <h4 className="text-sm font-black text-[#003366] uppercase tracking-widest">Informações Financeiras</h4>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                    <Activity size={12} /> Sigla / Banco
                  </label>
                  <input 
                    type="text" 
                    name="sigla_banco"
                    value={formData.sigla_banco} 
                    onChange={handleChange} 
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm font-bold" 
                    placeholder="Ex: BFA, BAI, BCI..." 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                    <CreditCard size={12} /> IBAN Bancário
                  </label>
                  <input 
                    type="text" 
                    name="iban"
                    value={formData.iban} 
                    onChange={handleChange} 
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm font-mono" 
                    placeholder="AO06 0000..." 
                  />
                </div>
             </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Tipo de {isSupplier ? 'Fornecedor' : 'Cliente'}</label>
            <select 
              name={isSupplier ? "tipo_fornecedor" : "tipo_cliente"}
              value={isSupplier ? formData.tipo_fornecedor : formData.tipo_cliente} 
              onChange={handleChange} 
              className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm font-bold uppercase"
            >
              {isSupplier ? (
                <>
                  <option value="Nacional">Fornecedor Nacional</option>
                  <option value="Estrangeiro">Fornecedor Estrangeiro</option>
                  <option value="Serviços">Prestador de Serviços</option>
                </>
              ) : (
                <>
                  <option value="normal">Cliente Normal</option>
                  <option value="grupo_nacional">Cliente Grupo Nacional</option>
                </>
              )}
            </select>
          </div>

          {/* ── Estado de Actividade ── auto-filled from AGT */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              Estado de Actividade
              {nifResult?.exists && nifResult.estado && (
                <span className="text-emerald-600 flex items-center gap-0.5">
                  <ShieldCheck size={9} /> AGT
                </span>
              )}
            </label>
            <select 
              name="activo"
              value={formData.activo ? 'true' : 'false'} 
              onChange={(e) => setFormData(prev => ({ ...prev, activo: e.target.value === 'true' }))} 
              className={`w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm font-bold uppercase ${
                nifResult?.exists && nifResult.estado ? 'border-emerald-300 bg-emerald-50/30' : ''
              }`}
            >
              <option value="true">Activo / Operacional</option>
              <option value="false">Inactivo / Suspenso</option>
            </select>
            {nifResult?.exists && nifResult.estado && (
              <p className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                <Check size={9} /> Estado: <strong>{nifResult.estado}</strong> (AGT)
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Saldo Inicial / Pendente</label>
            <input 
              type="number" 
              name="saldo_inicial"
              value={formData.saldo_inicial} 
              onChange={handleChange} 
              className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm font-bold text-right" 
              placeholder="0,00" 
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
          Cancelar
        </button>
        <button 
          onClick={handleSubmit}
          disabled={loading || authLoading}
          className="bg-[#003366] text-white px-10 py-2.5 text-xs font-black uppercase tracking-[0.2em] shadow-xl hover:bg-[#002244] transition-all disabled:opacity-50 active:scale-95"
        >
          {loading ? 'A processar...' : initialData ? 'Confirmar Alterações' : 'Guardar Registo'}
        </button>
      </div>
    </div>
  );
}
