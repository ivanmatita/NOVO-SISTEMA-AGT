import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Users, UserPlus, Search, Filter, ArrowLeft, Phone, Mail, 
  MapPin, Building2, FileText, CheckCircle, AlertCircle, Plus, 
  Trash2, Edit, ChevronRight, Eye, ShieldCheck, DollarSign, Calendar, Globe, Loader2
} from 'lucide-react';
import { crmNegocioService } from '../../services/crmNegocioService';
import { validarNIFAGT, NifConsultaResult } from '../../services/agt/validarNIF';
import toast from 'react-hot-toast';

interface CRMClientesModuleProps {
  user: any;
  companyData: any;
  onBack: () => void;
}

export const CRMClientesModule: React.FC<CRMClientesModuleProps> = ({ user, companyData, onBack }) => {
  const [activeSection, setActiveSection] = useState<'lista' | 'novo' | 'detalhe' | 'reclamacoes' | 'segmentacao'>('lista');
  const [clientes, setClientes] = useState<any[]>([]);
  const [reclamacoes, setReclamacoes] = useState<any[]>([]);
  const [interacoes, setInteracoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCliente, setSelectedCliente] = useState<any | null>(null);

  // NIF lookup state
  const [nifLoading, setNifLoading] = useState(false);
  const [nifResult, setNifResult] = useState<NifConsultaResult | null>(null);
  const nifDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLookedUpNif = useRef<string>('');

  // Comprehensive Client Form State matching System ClientForm
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    contribuinte: '',
    nif: '',
    morada: '',
    localidade: '',
    codigo_postal: '',
    provincia: 'Luanda',
    municipio: 'Luanda',
    pais: 'Angola',
    telefone: '',
    whatsapp: '',
    webpage: '',
    tipo_cliente: 'normal',
    setor_atividade: 'Comércio Geral',
    saldo_inicial: 0,
    responsavel: user?.full_name || 'Comercial',
    observacoes: '',
    ativo: true
  });

  const empresaId = user?.empresa_id || companyData?.id;

  useEffect(() => {
    if (empresaId) {
      loadData();
    }
  }, [empresaId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cls, recs, ints] = await Promise.all([
        crmNegocioService.getClientes(empresaId),
        crmNegocioService.getReclamacoes(empresaId),
        crmNegocioService.getInteracoes(empresaId)
      ]);
      setClientes(cls);
      setReclamacoes(recs);
      setInteracoes(ints);
    } catch (err) {
      console.error('Erro ao carregar dados de clientes:', err);
      toast.error('Erro ao carregar diretório de clientes.');
    } finally {
      setLoading(false);
    }
  };

  const triggerNifLookup = useCallback((nif: string) => {
    if (nifDebounceRef.current) clearTimeout(nifDebounceRef.current);
    if (!nif || nif.length < 6) {
      setNifResult(null);
      setNifLoading(false);
      return;
    }
    if (nif === lastLookedUpNif.current) return;
    setNifResult(null);
    nifDebounceRef.current = setTimeout(async () => {
      setNifLoading(true);
      lastLookedUpNif.current = nif;
      try {
        const result = await validarNIFAGT(nif);
        setNifResult(result);
        if (result.exists) {
          setFormData(prev => ({
            ...prev,
            nome: result.nome && (!prev.nome || prev.nome === lastLookedUpNif.current) ? result.nome : prev.nome || result.nome
          }));
        }
      } catch (e: any) {
        setNifResult({ exists: false, error: e?.message || 'Erro ao consultar AGT' });
      } finally {
        setNifLoading(false);
      }
    }, 800);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : (type === 'number' ? parseFloat(value) || 0 : value);
    setFormData(prev => ({ ...prev, [name]: val }));
    if (name === 'contribuinte' || name === 'nif') {
      const nifVal = String(value);
      setFormData(prev => ({ ...prev, contribuinte: nifVal, nif: nifVal }));
      triggerNifLookup(nifVal);
    }
  };

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome || (!formData.contribuinte && !formData.nif)) {
      toast.error('Por favor preencha o Nome e o NIF / Contribuinte do cliente.');
      return;
    }
    try {
      const clientPayload = {
        ...formData,
        nif: formData.contribuinte || formData.nif,
        contribuinte: formData.contribuinte || formData.nif,
        endereco: formData.morada,
        empresa_id: empresaId,
        ativo: formData.ativo
      };
      await crmNegocioService.createCliente(clientPayload);
      toast.success('Cliente cadastrado com sucesso no sistema e CRM!');
      setFormData({
        nome: '',
        email: '',
        contribuinte: '',
        nif: '',
        morada: '',
        localidade: '',
        codigo_postal: '',
        provincia: 'Luanda',
        municipio: 'Luanda',
        pais: 'Angola',
        telefone: '',
        whatsapp: '',
        webpage: '',
        tipo_cliente: 'normal',
        setor_atividade: 'Comércio Geral',
        saldo_inicial: 0,
        responsavel: user?.full_name || 'Comercial',
        observacoes: '',
        ativo: true
      });
      setActiveSection('lista');
      loadData();
    } catch (err: any) {
      console.error('Erro ao criar cliente:', err);
      toast.error('Erro ao criar cliente: ' + (err.message || 'Erro desconhecido'));
    }
  };

  const filteredClientes = clientes.filter(c => 
    c.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.nif?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contribuinte?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.telefone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={activeSection === 'lista' ? onBack : () => setActiveSection('lista')}
            className="p-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-all"
            title="Voltar"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2 text-[#003366] font-black text-xs uppercase tracking-widest mb-1">
              <Users size={16} /> CRM Clientes & Contas Comerciais
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {activeSection === 'lista' && 'Diretório Unificado de Clientes'}
              {activeSection === 'novo' && 'Registar Novo Cliente (Formulário Oficial AGT)'}
              {activeSection === 'detalhe' && `Perfil Comercial: ${selectedCliente?.nome}`}
              {activeSection === 'reclamacoes' && 'Gestão de Reclamações e Atendimento'}
              {activeSection === 'segmentacao' && 'Segmentação e Classificação de Clientes'}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {activeSection === 'lista' && (
            <>
              <button 
                onClick={() => setActiveSection('segmentacao')}
                className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-lg transition-all shadow-xs flex items-center gap-2"
              >
                <Filter size={16} /> Segmentação
              </button>
              <button 
                onClick={() => setActiveSection('reclamacoes')}
                className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-lg transition-all shadow-xs flex items-center gap-2"
              >
                <AlertCircle size={16} /> Reclamações ({reclamacoes.length})
              </button>
              <button 
                onClick={() => setActiveSection('novo')}
                className="bg-[#003366] hover:bg-[#002244] text-white text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-lg transition-all shadow-md flex items-center gap-2"
              >
                <UserPlus size={16} /> Novo Cliente
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content Sections */}
      {activeSection === 'lista' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-3 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Pesquisar por nome, NIF, contribuinte ou telefone..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-[#003366]"
              />
            </div>
            <div className="text-xs font-bold text-slate-500">
              Total Sincronizado: <span className="text-slate-900 font-black">{filteredClientes.length}</span> clientes ativos
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-600 border-b border-slate-200">
                    <th className="p-4">Cliente / Razão Social</th>
                    <th className="p-4">NIF / Contribuinte</th>
                    <th className="p-4">Contacto</th>
                    <th className="p-4">Localização</th>
                    <th className="p-4">Tipo / Setor</th>
                    <th className="p-4">Estado</th>
                    <th className="p-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {filteredClientes.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-900">{c.nome || c.name}</div>
                        <div className="text-[10px] text-slate-400">{c.email || 'Sem email'}</div>
                      </td>
                      <td className="p-4 font-mono font-bold text-slate-600">{c.nif || c.contribuinte || 'N/D'}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5"><Phone size={12} className="text-slate-400" /> {c.telefone || 'N/D'}</div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400"><Building2 size={12} /> {c.whatsapp || 'Sem whatsapp'}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5"><MapPin size={12} className="text-slate-400" /> {c.municipio || c.provincia || 'Luanda'}</div>
                      </td>
                      <td className="p-4">
                        <span className="bg-blue-50 text-[#003366] px-2.5 py-1 rounded-md text-[10px] font-bold">{c.tipo_cliente || 'Normal'}</span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${c.ativo !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                          {c.ativo !== false ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => { setSelectedCliente(c); setActiveSection('detalhe'); }}
                          className="p-2 bg-blue-50 text-[#003366] hover:bg-[#003366] hover:text-white rounded-lg transition-all font-bold text-xs inline-flex items-center gap-1 shadow-xs"
                        >
                          <Eye size={14} /> Perfil CRM
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredClientes.length === 0 && !loading && (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-400 font-medium text-xs">
                        Nenhum cliente encontrado no sistema.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSection === 'novo' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-black text-slate-900">Registar Novo Cliente (Formulário Oficial AGT & CRM)</h2>
              <p className="text-xs text-slate-500">Preencha os dados fiscais e de contacto para validação automática.</p>
            </div>
            <button onClick={() => setActiveSection('lista')} className="text-xs font-bold text-slate-500 hover:text-slate-900">Cancelar</button>
          </div>

          <form onSubmit={handleCreateClient} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">NIF / Contribuinte *</label>
                <div className="relative">
                  <input 
                    type="text" 
                    name="contribuinte"
                    required
                    value={formData.contribuinte}
                    onChange={handleChange}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold focus:outline-none focus:border-[#003366]"
                    placeholder="Introduza o NIF..."
                  />
                  {nifLoading && (
                    <div className="absolute right-3 top-3 text-blue-600 flex items-center gap-1 text-[10px]">
                      <Loader2 size={14} className="animate-spin" /> A validar AGT...
                    </div>
                  )}
                </div>
                {nifResult && nifResult.exists && (
                  <p className="text-[10px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
                    <ShieldCheck size={12} /> NIF Válido ({nifResult.estado || 'Ativo'})
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nome / Razão Social *</label>
                <input 
                  type="text" 
                  name="nome"
                  required
                  value={formData.nome}
                  onChange={handleChange}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:border-[#003366]"
                  placeholder="Nome completo ou denominação social"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">E-mail</label>
                <input 
                  type="email" 
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:border-[#003366]"
                  placeholder="exemplo@dominio.com"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Telefone Principal</label>
                <input 
                  type="text" 
                  name="telefone"
                  value={formData.telefone}
                  onChange={handleChange}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:border-[#003366]"
                  placeholder="+244 923 000 000"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">WhatsApp</label>
                <input 
                  type="text" 
                  name="whatsapp"
                  value={formData.whatsapp}
                  onChange={handleChange}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:border-[#003366]"
                  placeholder="+244 923 000 000"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tipo de Cliente</label>
                <select 
                  name="tipo_cliente"
                  value={formData.tipo_cliente}
                  onChange={handleChange}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:border-[#003366]"
                >
                  <option value="normal">Normal</option>
                  <option value="vip">VIP / Premium</option>
                  <option value="corporativo">Corporativo</option>
                  <option value="revendedor">Revendedor</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Província</label>
                <input 
                  type="text" 
                  name="provincia"
                  value={formData.provincia}
                  onChange={handleChange}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:border-[#003366]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Município</label>
                <input 
                  type="text" 
                  name="municipio"
                  value={formData.municipio}
                  onChange={handleChange}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:border-[#003366]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Morada / Endereço Completo</label>
              <input 
                type="text" 
                name="morada"
                value={formData.morada}
                onChange={handleChange}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:border-[#003366]"
                placeholder="Rua, Número, Bairro, Cidade"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Observações / Notas Comerciais</label>
              <textarea 
                name="observacoes"
                rows={3}
                value={formData.observacoes}
                onChange={handleChange}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:border-[#003366]"
                placeholder="Notas sobre preferências, histórico ou condições especiais..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button 
                type="button" 
                onClick={() => setActiveSection('lista')}
                className="px-6 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-black uppercase hover:bg-slate-50 transition-all"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="px-6 py-2.5 bg-[#003366] text-white rounded-lg text-xs font-black uppercase hover:bg-[#002244] transition-all shadow-md"
              >
                Guardar Cliente
              </button>
            </div>
          </form>
        </div>
      )}

      {activeSection === 'detalhe' && selectedCliente && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black text-slate-900">{selectedCliente.nome || selectedCliente.name}</h2>
                <span className="bg-blue-50 text-[#003366] px-3 py-1 rounded-full text-[10px] font-black uppercase">{selectedCliente.tipo_cliente || 'Normal'}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-mono">NIF: {selectedCliente.nif || selectedCliente.contribuinte || 'N/D'} • Setor: {selectedCliente.setor_atividade || 'Comércio'}</p>
            </div>
            <button onClick={() => setActiveSection('lista')} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-black uppercase hover:bg-slate-50">
              Voltar à Lista
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100">Dados Cadastrais</h3>
              <div className="space-y-2 text-xs font-medium text-slate-700">
                <div className="flex items-center gap-2"><Phone size={14} className="text-[#003366]" /> <span>{selectedCliente.telefone || 'Sem telefone'}</span></div>
                <div className="flex items-center gap-2"><Mail size={14} className="text-[#003366]" /> <span>{selectedCliente.email || 'Sem email'}</span></div>
                <div className="flex items-center gap-2"><MapPin size={14} className="text-[#003366]" /> <span>{selectedCliente.morada || selectedCliente.endereco || 'Sem endereço'}, {selectedCliente.municipio || 'Luanda'}</span></div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm md:col-span-2 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100">Histórico de Interações & Reclamações</h3>
              <div className="space-y-3">
                {interacoes.filter(i => i.cliente_id === selectedCliente.id).map(i => (
                  <div key={i.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center">
                    <div>
                      <div className="text-xs font-bold text-slate-900">{i.assunto}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{i.descricao}</div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">{new Date(i.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
                {interacoes.filter(i => i.cliente_id === selectedCliente.id).length === 0 && (
                  <p className="text-xs text-slate-400 py-6 text-center">Nenhuma interação registada para este cliente.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSection === 'segmentacao' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-black text-slate-900 pb-2 border-b border-slate-100">Segmentação e Análise de Clientes</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
              <h3 className="text-xs font-bold text-blue-900 uppercase">Clientes VIP / Premium</h3>
              <p className="text-2xl font-black text-[#003366] mt-2">{clientes.filter(c => c.tipo_cliente === 'vip').length}</p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <h3 className="text-xs font-bold text-emerald-900 uppercase">Clientes Ativos</h3>
              <p className="text-2xl font-black text-emerald-700 mt-2">{clientes.filter(c => c.ativo !== false).length}</p>
            </div>
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
              <h3 className="text-xs font-bold text-amber-900 uppercase">Total Geral</h3>
              <p className="text-2xl font-black text-amber-700 mt-2">{clientes.length}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
