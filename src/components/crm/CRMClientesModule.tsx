import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Users, UserPlus, Search, Filter, ArrowLeft, Phone, Mail, 
  MapPin, Building2, FileText, CheckCircle, AlertCircle, Plus, 
  Trash2, Edit, ChevronRight, Eye, ShieldCheck, DollarSign, Calendar, Globe, Loader2,
  BarChart3, RefreshCw, Printer, Download, MessageSquare, Briefcase, FolderGit2, ShoppingCart, X,
  Receipt
} from 'lucide-react';
import { crmNegocioService } from '../../services/crmNegocioService';
import { validarNIFAGT, NifConsultaResult } from '../../services/agt/validarNIF';
import ClienteContaCorrenteModal from './ClienteContaCorrenteModal';
import toast from 'react-hot-toast';

interface CRMClientesModuleProps {
  user: any;
  companyData: any;
  onBack: () => void;
}

export const CRMClientesModule: React.FC<CRMClientesModuleProps> = ({ user, companyData, onBack }) => {
  // Navegação limpa e simplificada
  const [activeTab, setActiveTab] = useState<'lista' | 'dashboard' | 'novo' | 'perfil' | 'contactos' | 'interacoes' | 'atendimento' | 'segmentacao' | 'historico' | 'relatorios' | 'conta_corrente'>('lista');
  const [clientes, setClientes] = useState<any[]>([]);
  const [reclamacoes, setReclamacoes] = useState<any[]>([]);
  const [interacoes, setInteracoes] = useState<any[]>([]);
  const [oportunidades, setOportunidades] = useState<any[]>([]);
  const [projetos, setProjetos] = useState<any[]>([]);
  const [vendas, setVendas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCliente, setSelectedCliente] = useState<any | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [perfilTab, setPerfilTab] = useState<'geral' | 'contactos' | 'negocios' | 'vendas' | 'projetos' | 'atendimento' | 'documentos' | 'historico'>('geral');
  const [contaCorrenteCliente, setContaCorrenteCliente] = useState<any | null>(null);

  // NIF lookup state
  const [nifLoading, setNifLoading] = useState(false);
  const [nifResult, setNifResult] = useState<NifConsultaResult | null>(null);
  const nifDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLookedUpNif = useRef<string>('');

  // Form divided into 5 sections: Identificação, Contactos, Localização, Gestão Comercial e Outros Dados
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
    categoria: 'Standard',
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
      const [cls, recs, ints, ops, projs, vds] = await Promise.all([
        crmNegocioService.getClientes(empresaId),
        crmNegocioService.getReclamacoes(empresaId),
        crmNegocioService.getInteracoes(empresaId),
        crmNegocioService.getOportunidades(empresaId),
        crmNegocioService.getProjetos(empresaId),
        crmNegocioService.getVendasCrm(empresaId)
      ]);
      setClientes(cls);
      setReclamacoes(recs);
      setInteracoes(ints);
      setOportunidades(ops);
      setProjetos(projs);
      setVendas(vds);
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

  const handleOpenNewClient = () => {
    setSelectedCliente(null);
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
      categoria: 'Standard',
      setor_atividade: 'Comércio Geral',
      saldo_inicial: 0,
      responsavel: user?.full_name || 'Comercial',
      observacoes: '',
      ativo: true
    });
    setNifResult(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditClient = (c: any) => {
    setSelectedCliente(c);
    setFormData({
      nome: c.nome || '',
      email: c.email || '',
      contribuinte: c.contribuinte || c.nif || '',
      nif: c.nif || c.contribuinte || '',
      morada: c.morada || c.endereco || c.address || '',
      localidade: c.localidade || c.cidade || '',
      codigo_postal: c.codigo_postal || '',
      provincia: c.provincia || 'Luanda',
      municipio: c.municipio || 'Luanda',
      pais: c.pais || 'Angola',
      telefone: c.telefone || '',
      whatsapp: c.whatsapp || '',
      webpage: c.webpage || c.website || '',
      tipo_cliente: c.tipo_cliente || 'normal',
      categoria: c.categoria || 'Standard',
      setor_atividade: c.setor_atividade || 'Comércio Geral',
      saldo_inicial: c.saldo_inicial || c.initial_balance || 0,
      responsavel: c.responsavel || user?.full_name || 'Comercial',
      observacoes: c.observacoes || c.notas || '',
      ativo: c.ativo !== false && c.is_active !== false
    });
    setNifResult(null);
    setIsFormModalOpen(true);
  };

  const handleSaveClient = async (e: React.FormEvent, createAnother = false) => {
    e.preventDefault();
    if (!formData.nome || (!formData.contribuinte && !formData.nif)) {
      toast.error('Por favor preencha o Nome e o NIF / Contribuinte do cliente.');
      return;
    }
    // Prevent duplication
    const nifCheck = (formData.contribuinte || formData.nif).trim();
    const isDuplicate = clientes.some(c => (c.nif === nifCheck || c.contribuinte === nifCheck));
    if (isDuplicate && !selectedCliente) {
      toast.error(`Já existe um cliente registado com o NIF ${nifCheck}. Duplicação impedida.`);
      return;
    }

    try {
      // Filtrar apenas campos aceites pela tabela 'clientes' no banco Supabase
      const clientPayload: any = {
        empresa_id: empresaId,
        nome: formData.nome.trim(),
        nif: nifCheck,
        contribuinte: nifCheck,
        email: formData.email?.trim() || null,
        telefone: formData.telefone?.trim() || null,
        morada: formData.morada?.trim() || null,
        endereco: formData.morada?.trim() || null,
        localidade: formData.localidade?.trim() || null,
        codigo_postal: formData.codigo_postal?.trim() || null,
        provincia: formData.provincia || 'Luanda',
        municipio: formData.municipio || 'Luanda',
        pais: formData.pais || 'Angola',
        tipo_cliente: formData.tipo_cliente || 'normal',
        saldo_inicial: Number(formData.saldo_inicial) || 0,
        observacoes: formData.observacoes?.trim() || null,
        notas: formData.observacoes?.trim() || null,
        ativo: formData.ativo !== false,
        is_active: formData.ativo !== false
      };

      if (selectedCliente?.id) {
        await crmNegocioService.updateCliente(selectedCliente.id, clientPayload);
        toast.success('Cliente atualizado com sucesso!');
      } else {
        await crmNegocioService.createCliente(clientPayload);
        toast.success('Cliente cadastrado com sucesso!');
      }

      if (createAnother) {
        handleOpenNewClient();
      } else {
        setIsFormModalOpen(false);
      }
      loadData();
    } catch (err: any) {
      console.error('Erro ao guardar cliente:', err);
      toast.error('Erro ao guardar cliente: ' + (err.message || 'Erro desconhecido'));
    }
  };

  const handleArchiveClient = async (cliente: any) => {
    try {
      await crmNegocioService.updateCliente(cliente.id, { ativo: false });
      toast.success('Cliente arquivado com sucesso.');
      loadData();
    } catch (err) {
      toast.error('Erro ao arquivar cliente.');
    }
  };

  const handleRestoreClient = async (cliente: any) => {
    try {
      await crmNegocioService.updateCliente(cliente.id, { ativo: true });
      toast.success('Cliente restaurado com sucesso.');
      loadData();
    } catch (err) {
      toast.error('Erro ao restaurar cliente.');
    }
  };

  const filteredClientes = clientes.filter(c => 
    c.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.nif?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contribuinte?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.telefone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalClientes = clientes.length;
  const clientesAtivos = clientes.filter(c => c.ativo !== false).length;
  const clientesInativos = clientes.filter(c => c.ativo === false).length;

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* Header Limpo e Intuitivo */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-5 rounded-none border border-slate-200 shadow-xs gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={activeTab === 'lista' ? onBack : () => setActiveTab('lista')}
            className="p-2 rounded-none border border-slate-200 text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
            title="Voltar"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2 text-[#003366] font-black text-[11px] uppercase tracking-widest mb-0.5">
              <Users size={14} /> CRM • Gestão de Clientes
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              {activeTab === 'lista' && 'Diretório de Clientes'}
              {activeTab === 'dashboard' && 'Painel Geral'}
              {activeTab === 'novo' && (selectedCliente ? 'Editar Cliente' : 'Registar Novo Cliente')}
              {activeTab === 'perfil' && `Perfil: ${selectedCliente?.nome}`}
              {activeTab === 'atendimento' && 'Atendimento & Suporte'}
              {activeTab === 'conta_corrente' && `Conta Corrente: ${contaCorrenteCliente?.nome || 'Cliente'}`}
              {!['lista', 'dashboard', 'novo', 'perfil', 'atendimento', 'conta_corrente'].includes(activeTab) && 'Gestão de Clientes'}
            </h1>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => setActiveTab('lista')}
            className={`px-3 py-1.5 rounded-none text-xs font-bold transition-all ${activeTab === 'lista' ? 'bg-[#003366] text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
          >
            Clientes
          </button>
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1.5 rounded-none text-xs font-bold transition-all ${activeTab === 'dashboard' ? 'bg-[#003366] text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
          >
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('atendimento')}
            className={`px-3 py-1.5 rounded-none text-xs font-bold transition-all ${activeTab === 'atendimento' ? 'bg-[#003366] text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
          >
            Atendimento
          </button>
          <button 
            onClick={handleOpenNewClient}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider px-3.5 py-1.5 rounded-none transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ml-1"
          >
            <UserPlus size={15} /> Novo Cliente
          </button>
        </div>
      </div>

      {/* SECTION 1: DASHBOARD CLIENTES */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total de Clientes</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{totalClientes}</h3>
                <span className="text-[10px] text-emerald-600 font-bold mt-1 inline-flex items-center gap-1">Base sincronizada</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#003366] flex items-center justify-center">
                <Users size={24} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Clientes Ativos</p>
                <h3 className="text-2xl font-black text-emerald-600 mt-1">{clientesAtivos}</h3>
                <span className="text-[10px] text-emerald-600 font-bold mt-1 inline-flex items-center gap-1">Em atividade comercial</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <CheckCircle size={24} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Clientes Inativos</p>
                <h3 className="text-2xl font-black text-rose-600 mt-1">{clientesInativos}</h3>
                <span className="text-[10px] text-slate-400 font-bold mt-1 inline-flex items-center gap-1">Arquivados</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
                <AlertCircle size={24} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Interações Registadas</p>
                <h3 className="text-2xl font-black text-purple-600 mt-1">{interacoes.length}</h3>
                <span className="text-[10px] text-purple-600 font-bold mt-1 inline-flex items-center gap-1">Atendimento ativo</span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                <MessageSquare size={24} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">Ações Rápidas CRM</h3>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={handleOpenNewClient} className="p-4 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-xl text-left transition-all group cursor-pointer">
                  <UserPlus className="text-[#003366] mb-2 group-hover:scale-110 transition-transform" size={20} />
                  <h4 className="text-xs font-black text-slate-900">Novo Cliente</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Registo completo com validação NIF.</p>
                </button>
                <button onClick={() => setActiveTab('interacoes')} className="p-4 bg-slate-50 hover:bg-purple-50 border border-slate-200 rounded-xl text-left transition-all group">
                  <MessageSquare className="text-purple-700 mb-2 group-hover:scale-110 transition-transform" size={20} />
                  <h4 className="text-xs font-black text-slate-900">Registar Interação</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Chamadas, reuniões e notas.</p>
                </button>
                <button onClick={() => setActiveTab('atendimento')} className="p-4 bg-slate-50 hover:bg-amber-50 border border-slate-200 rounded-xl text-left transition-all group">
                  <AlertCircle className="text-amber-700 mb-2 group-hover:scale-110 transition-transform" size={20} />
                  <h4 className="text-xs font-black text-slate-900">Atendimento</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Reclamações e suporte.</p>
                </button>
                <button onClick={() => setActiveTab('relatorios')} className="p-4 bg-slate-50 hover:bg-emerald-50 border border-slate-200 rounded-xl text-left transition-all group">
                  <BarChart3 className="text-emerald-700 mb-2 group-hover:scale-110 transition-transform" size={20} />
                  <h4 className="text-xs font-black text-slate-900">Relatórios</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Estatísticas comerciais.</p>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">Últimos Clientes Registados</h3>
              <div className="space-y-3">
                {clientes.slice(0, 4).map(c => (
                  <div key={c.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center">
                    <div>
                      <div className="text-xs font-bold text-slate-900">{c.nome}</div>
                      <div className="text-[10px] text-slate-400">NIF: {c.nif || c.contribuinte || 'N/D'} • {c.provincia || 'Luanda'}</div>
                    </div>
                    <button onClick={() => { setSelectedCliente(c); setActiveTab('perfil'); }} className="text-xs font-black text-[#003366] hover:underline">Ver Perfil →</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: TODOS OS CLIENTES */}
      {activeTab === 'lista' && (
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
            <div className="flex items-center gap-3">
              <button onClick={() => window.print()} className="px-3 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 flex items-center gap-1.5"><Printer size={14} /> Imprimir</button>
              <div className="text-xs font-bold text-slate-500">Total: <span className="text-slate-900 font-black">{filteredClientes.length}</span></div>
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
                    <th className="p-4">Categoria</th>
                    <th className="p-4">Estado</th>
                    <th className="p-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {filteredClientes.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-900">{c.nome}</div>
                        <div className="text-[10px] text-slate-400">{c.email || 'Sem email'}</div>
                      </td>
                      <td className="p-4 font-mono font-bold text-slate-600">{c.nif || c.contribuinte || 'N/D'}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5"><Phone size={12} className="text-slate-400" /> {c.telefone || 'N/D'}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5"><MapPin size={12} className="text-slate-400" /> {c.municipio || c.provincia || 'Luanda'}</div>
                      </td>
                      <td className="p-4"><span className="bg-blue-50 text-[#003366] px-2.5 py-1 rounded-md text-[10px] font-bold">{c.tipo_cliente || 'Normal'}</span></td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${c.ativo !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                          {c.ativo !== false ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="p-3 text-center flex items-center justify-center gap-1.5 flex-wrap">
                        <button 
                          onClick={() => { setContaCorrenteCliente(c); setActiveTab('conta_corrente'); }}
                          className="w-7 h-7 flex items-center justify-center bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-none border border-emerald-300 transition-colors cursor-pointer"
                          title="Extrato de Conta Corrente (Abrir Página)"
                        >
                          <Receipt size={14} />
                        </button>
                        <button 
                          onClick={() => { setSelectedCliente(c); setActiveTab('perfil'); }} 
                          className="w-7 h-7 flex items-center justify-center bg-blue-50 text-[#003366] hover:bg-[#003366] hover:text-white rounded-none border border-blue-200 transition-colors cursor-pointer" 
                          title="Ver Perfil"
                        >
                          <Eye size={14} />
                        </button>
                        <button 
                          onClick={() => handleOpenEditClient(c)} 
                          className="w-7 h-7 flex items-center justify-center bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-none border border-slate-300 transition-colors cursor-pointer" 
                          title="Editar"
                        >
                          <Edit size={14} />
                        </button>
                        {c.ativo !== false ? (
                          <button 
                            onClick={() => handleArchiveClient(c)} 
                            className="w-7 h-7 flex items-center justify-center bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-none border border-rose-200 transition-colors cursor-pointer" 
                            title="Arquivar"
                          >
                            <Trash2 size={14} />
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleRestoreClient(c)} 
                            className="w-7 h-7 flex items-center justify-center bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-none border border-emerald-200 transition-colors cursor-pointer" 
                            title="Restaurar"
                          >
                            <RefreshCw size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredClientes.length === 0 && !loading && (
                    <tr>
                      <td colSpan={7} className="p-12 text-center text-slate-400 font-medium text-xs">Nenhum cliente encontrado.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: MODAL DE NOVO CLIENTE / EDITAR (Cantos quadrados no estilo padrão do sistema) */}
      {(isFormModalOpen || activeTab === 'novo') && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-none shadow-2xl max-w-2xl w-full border border-slate-300 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 bg-[#003366] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-none bg-white/10 flex items-center justify-center">
                  <UserPlus size={16} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-wide">
                    {selectedCliente ? 'Editar Cliente' : 'Registar Novo Cliente'}
                  </h3>
                  <p className="text-[10px] text-white/70">Preencha os dados do cliente de forma rápida e ajustada</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsFormModalOpen(false);
                  if (activeTab === 'novo') setActiveTab('lista');
                }}
                className="w-8 h-8 rounded-none bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Fechar"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={(e) => handleSaveClient(e, false)} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* NIF / Contribuinte */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    NIF / Contribuinte *
                  </label>
                  <div className="relative">
                    <input 
                      type="text" 
                      name="contribuinte"
                      required
                      value={formData.contribuinte}
                      onChange={handleChange}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-none text-xs font-mono font-bold focus:outline-none focus:border-[#003366] focus:bg-white transition-all"
                      placeholder="Ex: 5000..."
                    />
                    {nifLoading && (
                      <div className="absolute right-3 top-3 text-blue-600 flex items-center gap-1 text-[10px]">
                        <Loader2 size={13} className="animate-spin" />
                      </div>
                    )}
                  </div>
                  {nifResult && nifResult.exists && (
                    <p className="text-[10px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
                      <ShieldCheck size={12} /> NIF Válido AGT ({nifResult.estado || 'Ativo'})
                    </p>
                  )}
                </div>

                {/* Nome Completo */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Nome Completo / Razão Social *
                  </label>
                  <input 
                    type="text" 
                    name="nome"
                    required
                    value={formData.nome}
                    onChange={handleChange}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-none text-xs font-bold focus:outline-none focus:border-[#003366] focus:bg-white transition-all"
                    placeholder="Nome completo ou denominação social"
                  />
                </div>

                {/* Contacto Telefónico */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Contacto Telefónico
                  </label>
                  <input 
                    type="text" 
                    name="telefone"
                    value={formData.telefone}
                    onChange={handleChange}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-none text-xs font-mono focus:outline-none focus:border-[#003366] focus:bg-white transition-all"
                    placeholder="+244 9..."
                  />
                </div>

                {/* E-mail */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    E-mail institucional
                  </label>
                  <input 
                    type="email" 
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-none text-xs focus:outline-none focus:border-[#003366] focus:bg-white transition-all"
                    placeholder="comercial@exemplo.com"
                  />
                </div>

                {/* Tipo de Cliente */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Tipo de Cliente
                  </label>
                  <select 
                    name="tipo_cliente"
                    value={formData.tipo_cliente}
                    onChange={handleChange}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-none text-xs font-medium focus:outline-none focus:border-[#003366] focus:bg-white transition-all cursor-pointer"
                  >
                    <option value="normal">Normal</option>
                    <option value="vip">VIP</option>
                    <option value="corporativo">Corporativo</option>
                    <option value="revendedor">Revendedor</option>
                  </select>
                </div>

                {/* Saldo Inicial */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Saldo Inicial (Kz)
                  </label>
                  <input 
                    type="number" 
                    name="saldo_inicial"
                    value={formData.saldo_inicial}
                    onChange={handleChange}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-none text-xs font-mono focus:outline-none focus:border-[#003366] focus:bg-white transition-all"
                    placeholder="0.00"
                  />
                </div>

                {/* Morada / Endereço (Span 2) */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Morada / Endereço Completo
                  </label>
                  <input 
                    type="text" 
                    name="morada"
                    value={formData.morada}
                    onChange={handleChange}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-none text-xs focus:outline-none focus:border-[#003366] focus:bg-white transition-all"
                    placeholder="Rua, Bairro, Edifício..."
                  />
                </div>

                {/* Província */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Província
                  </label>
                  <input 
                    type="text" 
                    name="provincia"
                    value={formData.provincia}
                    onChange={handleChange}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-none text-xs focus:outline-none focus:border-[#003366] focus:bg-white transition-all"
                    placeholder="Luanda"
                  />
                </div>

                {/* Município */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Município
                  </label>
                  <input 
                    type="text" 
                    name="municipio"
                    value={formData.municipio}
                    onChange={handleChange}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-none text-xs focus:outline-none focus:border-[#003366] focus:bg-white transition-all"
                    placeholder="Luanda / Viana / Talatona..."
                  />
                </div>

                {/* Observações (Span 2) */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Observações / Notas Comerciais
                  </label>
                  <textarea 
                    name="observacoes"
                    rows={2}
                    value={formData.observacoes}
                    onChange={handleChange}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-none text-xs focus:outline-none focus:border-[#003366] focus:bg-white transition-all resize-none"
                    placeholder="Observações ou histórico do cliente..."
                  />
                </div>
              </div>

              {/* Botões com cantos quadrados */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button 
                  type="button" 
                  onClick={() => {
                    setIsFormModalOpen(false);
                    if (activeTab === 'novo') setActiveTab('lista');
                  }}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-none text-xs font-bold uppercase hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  onClick={(e) => handleSaveClient(e, true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-none text-xs font-bold uppercase transition-all shadow-xs cursor-pointer"
                >
                  Guardar e Novo
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2 bg-[#003366] hover:bg-[#002244] text-white rounded-none text-xs font-bold uppercase transition-all shadow-md cursor-pointer"
                >
                  {selectedCliente ? 'Atualizar Cliente' : 'Guardar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SECTION 4: PERFIL INDIVIDUAL (Com separadores) */}
      {activeTab === 'perfil' && selectedCliente && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black text-slate-900">{selectedCliente.nome}</h2>
                <span className="bg-blue-50 text-[#003366] px-3 py-1 rounded-full text-[10px] font-black uppercase">{selectedCliente.tipo_cliente || 'Normal'}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-mono">NIF: {selectedCliente.nif || selectedCliente.contribuinte || 'N/D'} • Responsável: {selectedCliente.responsavel || 'Comercial'}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleOpenEditClient(selectedCliente)} className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black uppercase transition-all cursor-pointer">Editar</button>
              <button onClick={() => setActiveTab('lista')} className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-black uppercase hover:bg-slate-50">Voltar à Lista</button>
            </div>
          </div>

          {/* Profile Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
            {[
              { id: 'geral', label: 'Dados Gerais' },
              { id: 'contactos', label: 'Contactos' },
              { id: 'negocios', label: 'Negócios' },
              { id: 'vendas', label: 'Vendas' },
              { id: 'projetos', label: 'Projetos' },
              { id: 'atendimento', label: 'Atendimento' },
              { id: 'documentos', label: 'Documentos' },
              { id: 'historico', label: 'Histórico' }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setPerfilTab(tab.id as any)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${perfilTab === tab.id ? 'bg-[#003366] text-white shadow-xs' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {perfilTab === 'geral' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100">Informação Geral</h3>
                <div className="space-y-2 text-xs font-medium text-slate-700">
                  <div><strong>Nome:</strong> {selectedCliente.nome}</div>
                  <div><strong>NIF:</strong> {selectedCliente.nif || selectedCliente.contribuinte}</div>
                  <div><strong>Telefone:</strong> {selectedCliente.telefone || 'N/D'}</div>
                  <div><strong>E-mail:</strong> {selectedCliente.email || 'N/D'}</div>
                  <div><strong>Morada:</strong> {selectedCliente.morada || selectedCliente.endereco || 'N/D'}</div>
                  <div><strong>Localidade:</strong> {selectedCliente.municipio || 'Luanda'}, {selectedCliente.provincia || 'Luanda'}</div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100">Indicadores Comerciais</h3>
                <div className="space-y-2 text-xs font-medium text-slate-700">
                  <div><strong>Setor:</strong> {selectedCliente.setor_atividade || 'Geral'}</div>
                  <div><strong>Estado:</strong> {selectedCliente.ativo !== false ? 'Ativo' : 'Inativo'}</div>
                  <div><strong>Data de Registo:</strong> {new Date(selectedCliente.created_at || Date.now()).toLocaleDateString()}</div>
                </div>
              </div>
            </div>
          )}

          {perfilTab === 'negocios' && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100">Oportunidades & Negócios Associados</h3>
              <div className="space-y-3">
                {oportunidades.filter(o => String(o.cliente_id) === String(selectedCliente.id)).map(o => (
                  <div key={o.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{o.nome} ({o.codigo})</div>
                      <div className="text-[10px] text-slate-500">Etapa: {o.etapa} • Probabilidade: {o.probabilidade}%</div>
                    </div>
                    <span className="font-black text-emerald-600">{new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(o.valor_estimado || 0)}</span>
                  </div>
                ))}
                {oportunidades.filter(o => String(o.cliente_id) === String(selectedCliente.id)).length === 0 && (
                  <p className="text-xs text-slate-400 py-6 text-center">Nenhum negócio associado a este cliente.</p>
                )}
              </div>
            </div>
          )}

          {perfilTab === 'vendas' && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100">Vendas & Orçamentos</h3>
              <div className="space-y-3">
                {vendas.filter(v => String(v.cliente_id) === String(selectedCliente.id)).map(v => (
                  <div key={v.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{v.numero}</div>
                      <div className="text-[10px] text-slate-500">Estado: {v.estado}</div>
                    </div>
                    <span className="font-black text-slate-900">{new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(v.total || 0)}</span>
                  </div>
                ))}
                {vendas.filter(v => String(v.cliente_id) === String(selectedCliente.id)).length === 0 && (
                  <p className="text-xs text-slate-400 py-6 text-center">Nenhuma venda registada para este cliente.</p>
                )}
              </div>
            </div>
          )}

          {perfilTab === 'projetos' && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100">Projetos Associados</h3>
              <div className="space-y-3">
                {projetos.filter(p => String(p.cliente_id) === String(selectedCliente.id)).map(p => (
                  <div key={p.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{p.nome} ({p.codigo})</div>
                      <div className="text-[10px] text-slate-500">Estado: {p.estado}</div>
                    </div>
                    <span className="font-black text-purple-700">{new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(p.orcamento || 0)}</span>
                  </div>
                ))}
                {projetos.filter(p => String(p.cliente_id) === String(selectedCliente.id)).length === 0 && (
                  <p className="text-xs text-slate-400 py-6 text-center">Nenhum projeto associado.</p>
                )}
              </div>
            </div>
          )}

          {perfilTab === 'atendimento' && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100">Reclamações & Suporte</h3>
              <div className="space-y-3">
                {reclamacoes.filter(r => String(r.cliente_id) === String(selectedCliente.id)).map(r => (
                  <div key={r.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center text-xs">
                    <div>
                      <div className="font-bold text-slate-900">{r.titulo}</div>
                      <div className="text-[10px] text-slate-500">{r.descricao}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800">{r.estado}</span>
                  </div>
                ))}
                {reclamacoes.filter(r => String(r.cliente_id) === String(selectedCliente.id)).length === 0 && (
                  <p className="text-xs text-slate-400 py-6 text-center">Nenhuma reclamação registada.</p>
                )}
              </div>
            </div>
          )}

          {perfilTab === 'documentos' && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 p-6 text-center text-xs text-slate-500">
              Nenhum documento anexo ao perfil do cliente.
            </div>
          )}

          {perfilTab === 'historico' && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-100">Histórico de Atividades</h3>
              {interacoes.filter(i => String(i.cliente_id) === String(selectedCliente.id)).map(i => (
                <div key={i.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                  <div className="font-bold text-slate-900">{i.assunto} ({i.tipo})</div>
                  <div className="text-[10px] text-slate-500 mt-1">{i.descricao}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECTION 5: CONTACTOS */}
      {activeTab === 'contactos' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-black text-slate-900 pb-2 border-b border-slate-100">Diretório Geral de Contactos</h2>
          <div className="space-y-3">
            {clientes.map(c => (
              <div key={c.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                <div>
                  <div className="font-bold text-slate-900">{c.nome}</div>
                  <div className="text-slate-500 mt-0.5">📞 {c.telefone || 'Sem telefone'} • ✉️ {c.email || 'Sem email'} • 📱 WhatsApp: {c.whatsapp || 'N/D'}</div>
                </div>
                <button onClick={() => { setSelectedCliente(c); setActiveTab('perfil'); }} className="px-3 py-1.5 bg-[#003366] text-white rounded font-bold">Ver Perfil</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 6: INTERAÇÕES */}
      {activeTab === 'interacoes' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <h2 className="text-lg font-black text-slate-900">Registo de Interações Comerciais (Chamadas, Reuniões, E-mails)</h2>
          </div>
          <div className="space-y-3">
            {interacoes.map(i => (
              <div key={i.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#003366]">{i.tipo}</span>
                    <h4 className="font-black text-slate-900">{i.assunto}</h4>
                  </div>
                  <p className="text-slate-600 mt-1">{i.descricao}</p>
                </div>
                <div className="text-right text-slate-400 text-[10px]">
                  <div>{new Date(i.created_at).toLocaleDateString()}</div>
                  <div className="font-bold text-slate-700">{i.responsavel || 'Comercial'}</div>
                </div>
              </div>
            ))}
            {interacoes.length === 0 && (
              <p className="text-xs text-slate-400 py-12 text-center">Nenhuma interação registada.</p>
            )}
          </div>
        </div>
      )}

      {/* SECTION 7: ATENDIMENTO */}
      {activeTab === 'atendimento' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-black text-slate-900 pb-2 border-b border-slate-100">Gestão de Atendimento e Reclamações</h2>
          <div className="space-y-3">
            {reclamacoes.map(r => (
              <div key={r.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-amber-700">{r.codigo}</span>
                    <h4 className="font-black text-slate-900">{r.titulo}</h4>
                  </div>
                  <p className="text-slate-600 mt-1">{r.descricao}</p>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-amber-50 text-amber-800 border border-amber-200">{r.estado}</span>
                  <div className="text-[10px] text-slate-400 mt-1">Prioridade: {r.prioridade}</div>
                </div>
              </div>
            ))}
            {reclamacoes.length === 0 && (
              <p className="text-xs text-slate-400 py-12 text-center">Nenhuma reclamação registada.</p>
            )}
          </div>
        </div>
      )}

      {/* SECTION 8: SEGMENTAÇÃO */}
      {activeTab === 'segmentacao' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-black text-slate-900 pb-2 border-b border-slate-100">Segmentação e Classificação de Clientes</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
              <h3 className="text-xs font-bold text-blue-900 uppercase">Clientes VIP / Premium</h3>
              <p className="text-2xl font-black text-[#003366] mt-2">{clientes.filter(c => c.tipo_cliente === 'vip').length}</p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <h3 className="text-xs font-bold text-emerald-900 uppercase">Clientes Corporativos</h3>
              <p className="text-2xl font-black text-emerald-700 mt-2">{clientes.filter(c => c.tipo_cliente === 'corporativo').length}</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
              <h3 className="text-xs font-bold text-purple-900 uppercase">Clientes Normais</h3>
              <p className="text-2xl font-black text-purple-700 mt-2">{clientes.filter(c => c.tipo_cliente === 'normal' || !c.tipo_cliente).length}</p>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 9: HISTÓRICO */}
      {activeTab === 'historico' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-black text-slate-900 pb-2 border-b border-slate-100">Histórico Geral de Atividades CRM</h2>
          <div className="space-y-3">
            {interacoes.map(i => (
              <div key={i.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <div className="font-bold text-slate-900">{i.assunto} — {new Date(i.created_at).toLocaleString()}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{i.descricao}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 10: RELATÓRIOS */}
      {activeTab === 'relatorios' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          <h2 className="text-lg font-black text-slate-900">Relatórios e Indicadores de Clientes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase">Resumo de Atividade</h3>
              <p className="text-xs text-slate-600">Total de Clientes no Sistema: <strong>{totalClientes}</strong></p>
              <p className="text-xs text-slate-600">Taxa de Clientes Ativos: <strong>{totalClientes > 0 ? Math.round((clientesAtivos / totalClientes) * 100) : 0}%</strong></p>
              <p className="text-xs text-slate-600">Total de Interações: <strong>{interacoes.length}</strong></p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase">Ações de Exportação</h3>
              <p className="text-xs text-slate-600">Pode imprimir ou exportar o diretório completo de clientes para relatórios corporativos.</p>
              <button onClick={() => window.print()} className="px-4 py-2 bg-[#003366] text-white rounded-lg text-xs font-bold flex items-center gap-1.5"><Printer size={14} /> Imprimir Relatório</button>
            </div>
          </div>
        </div>
      )}

      {/* PÁGINA DEDICADA DE CONTA CORRENTE DO CLIENTE (Não abre em frente como modal flutuante) */}
      {activeTab === 'conta_corrente' && contaCorrenteCliente && (
        <ClienteContaCorrenteModal
          cliente={contaCorrenteCliente}
          empresaId={empresaId}
          companyData={companyData}
          isOpen={true}
          mode="page"
          onClose={() => {
            setActiveTab('lista');
            setContaCorrenteCliente(null);
          }}
        />
      )}
    </div>
  );
};
