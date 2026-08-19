import React, { useState, useEffect } from 'react';
import { 
  Building2, Users, CreditCard, ShieldAlert, Activity, 
  Search, Filter, Plus, Edit, Trash2, Key, Calendar, 
  BarChart2, AlertTriangle, CheckCircle, XCircle, Clock,
  MoreVertical, FileText, Download, UserCheck, ShieldCheck,
  TrendingUp, Wallet, ArrowUpCircle, ArrowDownCircle, Info, RefreshCw,
  LayoutDashboard, UserCog, PieChart as PieChartIcon, Mail, Send,
  AlertOctagon, CheckCircle2, History, ChevronRight, Eye, CornerDownRight,
  Sliders, MessageSquare, Lock, Unlock, Phone, MapPin, Globe, User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface Company {
  id: string;
  empresa_id?: string;
  nome_empresa: string;
  razao_social?: string;
  nome_comercial?: string;
  nif: string;
  email: string;
  telefone: string;
  endereco?: string;
  morada?: string;
  municipio: string;
  provincia: string;
  pais?: string;
  responsavel?: string;
  email_responsavel?: string;
  telefone_responsavel?: string;
  plano: string;
  status_licenca: string;
  status_empresa?: string;
  data_inicio?: string;
  data_fim: string;
  duracao_dias?: number;
  created_at: string;
  updated_at?: string;
  usuarios_count: number;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  empresa_id: string;
  empresas?: {
    nome_empresa: string;
    nif: string;
  };
  created_at: string;
  last_login?: string;
}

interface ActivityLog {
  id: string;
  usuario_email?: string;
  utilizador_id?: string;
  acao: string;
  descricao: string;
  modulo?: string;
  entidade?: string;
  empresa_id: string;
  ip_address?: string;
  created_at: string;
}

interface OcorrenciaCRM {
  id: string;
  empresa_id: string;
  titulo: string;
  tipo: string;
  prioridade: string;
  descricao: string;
  estado: string;
  responsavel_id?: string;
  criado_por: string;
  created_at: string;
}

export const CRMModule = ({ fetchJson, formatCurrency, formatDate, setActiveTab: setGlobalTab }: any) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [ocorrencias, setOcorrencias] = useState<OcorrenciaCRM[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filtering states
  const [filterPlano, setFilterPlano] = useState('todos');
  const [filterStatus, setFilterStatus] = useState('todos');

  // Selected Company for Deep Management
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companySubTab, setCompanySubTab] = useState('info');

  // Modals
  const [showEditCompanyModal, setShowEditCompanyModal] = useState(false);
  const [showActivateModal, setShowActivateModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [showOccurrenceModal, setShowOccurrenceModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showUserResetModal, setShowUserResetModal] = useState<UserProfile | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const companiesData = await fetchJson('/api/crm/companies');
      const statsData = await fetchJson('/api/crm/stats');
      setCompanies(companiesData || []);
      setStats(statsData);

      if (activeTab === 'usuarios' || selectedCompany) {
        const usersData = await fetchJson('/api/crm/users');
        setUsers(usersData || []);
      }

      if (activeTab === 'auditoria' || selectedCompany) {
        const logsData = await fetchJson('/api/crm/audit');
        setLogs(logsData || []);
      }

      if (selectedCompany) {
        const ocData = await fetchJson(`/api/crm/occurrences?empresa_id=${selectedCompany.id}`);
        setOcorrencias(ocData || []);
      }
    } catch (error) {
      console.error("Erro ao carregar dados CRM:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, selectedCompany?.id]);

  // Função Central Reutilizável de Cálculo de Licença
  const calcularLicenca = (comp: Company) => {
    const duracaoTotais = comp.duracao_dias || 30;
    const dataInicio = comp.data_inicio ? new Date(comp.data_inicio) : null;
    const dataFim = comp.data_fim ? new Date(comp.data_fim) : null;
    const agora = new Date();

    const isAtiva = comp.status_licenca === 'active' || comp.status_licenca === 'activa' || comp.status_licenca === 'ATIVA';
    const isPendente = comp.status_licenca === 'pendente' || comp.status_licenca === 'AGUARDANDO ATIVAÇÃO' || !dataInicio;

    let diasDecorridos = 0;
    let diasRestantes = 0;
    let percentualUtilizado = 0;

    if (dataInicio && dataFim) {
      diasDecorridos = Math.max(0, Math.ceil((agora.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24)));
      diasRestantes = Math.max(0, Math.ceil((dataFim.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24)));
      percentualUtilizado = Math.min(100, Math.max(0, (diasDecorridos / duracaoTotais) * 100));
    }

    let statusNormalizado = comp.status_licenca ? comp.status_licenca.toUpperCase() : 'PENDENTE';
    if (isAtiva && diasRestantes === 0 && dataFim && agora > dataFim) {
      statusNormalizado = 'EXPIRADA';
    }

    // Alertas de Vencimento
    let alertaNivel = 'normal';
    let alertaMensagem = `Licença válida. Restam ${diasRestantes} dias.`;

    if (statusNormalizado === 'EXPIRADA' || diasRestantes === 0) {
      alertaNivel = 'critico';
      alertaMensagem = 'Licença expirada. Efetue a renovação no CRM.';
    } else if (diasRestantes <= 3) {
      alertaNivel = 'urgente';
      alertaMensagem = `Urgente: a licença termina em ${diasRestantes} dia(s).`;
    } else if (diasRestantes <= 7) {
      alertaNivel = 'alerta';
      alertaMensagem = `Alerta: a licença termina em ${diasRestantes} dias.`;
    } else if (diasRestantes <= 15) {
      alertaNivel = 'aviso';
      alertaMensagem = `Aviso: a licença termina em ${diasRestantes} dias.`;
    }

    return {
      statusNormalizado,
      isAtiva,
      isPendente,
      diasTotais: duracaoTotais,
      diasDecorridos,
      diasRestantes,
      percentualUtilizado,
      dataInicioStr: dataInicio ? dataInicio.toLocaleDateString('pt-AO') : 'Pendente de Ativação',
      dataFimStr: dataFim ? dataFim.toLocaleDateString('pt-AO') : 'Pendente de Ativação',
      alertaNivel,
      alertaMensagem
    };
  };

  const toggleCompanyStatus = async (empresaId: string, currentStatus: string) => {
    const isCurrentlyActive = currentStatus === 'active' || currentStatus === 'activa' || currentStatus === 'ATIVA';
    const newStatus = isCurrentlyActive ? 'SUSPENSA' : 'ATIVA';
    try {
      const now = new Date();
      const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      await supabase.from('empresas').update({
        status_licenca: newStatus,
        updated_at: now.toISOString()
      }).eq('id', empresaId).catch(console.warn);

      await supabase.from('licencas_empresas').upsert({
        empresa_id: String(empresaId),
        status_licenca: newStatus,
        data_inicio: now.toISOString(),
        data_fim: endDate.toISOString(),
        ativado_por: 'SuperAdmin CRM'
      }, { onConflict: 'empresa_id' }).catch(console.warn);

      await fetchJson(`/api/crm/companies/${empresaId}/toggle-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      }).catch(console.warn);

      toast.success(`Estado da empresa atualizado para: ${newStatus}`);
      loadData();
    } catch (err) {
      console.error("Erro ao alterar estado:", err);
      toast.error("Falha ao alterar estado da empresa.");
    }
  };

  const COLORS = ['#003366', '#10b981', '#f59e0b', '#ef4444', '#6b7280'];

  const renderDashboard = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Empresas ERP', value: stats?.total || companies.length, icon: Building2, color: 'text-[#003366]' },
          { label: 'Licenças Ativas', value: stats?.active || companies.filter(c => c.status_licenca === 'activa' || c.status_licenca === 'active' || c.status_licenca === 'ATIVA').length, icon: ShieldCheck, color: 'text-emerald-600' },
          { label: 'Receita Total Licenciamento', value: formatCurrency(stats?.receitaTotal || 1500000), icon: Wallet, color: 'text-blue-600' },
          { label: 'Alertas Críticos / Expiração', value: stats?.vencidas || companies.filter(c => c.status_licenca === 'vencida' || c.status_licenca === 'EXPIRADA').length, icon: AlertTriangle, color: 'text-red-500' },
        ].map((card, i) => (
          <div key={i} className="bg-white border border-zinc-200 p-6 shadow-xs flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">{card.label}</p>
              <p className={`text-2xl font-black mt-2 ${card.color}`}>{card.value}</p>
            </div>
            <div className={`p-3 bg-zinc-50 ${card.color}`}>
              <card.icon size={24} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white border border-zinc-200 p-6 shadow-xs h-full">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-black text-[#003366] uppercase tracking-[0.2em] text-xs flex items-center gap-2">
              <TrendingUp size={16} /> Fluxo de Facturação CRM &amp; Subscrições
            </h3>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={[
                { month: 'Jan', value: 1200000 },
                { month: 'Fev', value: 1500000 },
                { month: 'Mar', value: 1800000 },
                { month: 'Abr', value: 2200000 },
                { month: 'Mai', value: 2500000 },
                { month: 'Jun', value: 2900000 },
              ]}>
                <defs>
                  <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#003366" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#003366" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis dataKey="month" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', borderRadius: '0' }}
                  labelStyle={{ fontWeight: '900', color: '#003366', textTransform: 'uppercase' }}
                />
                <Area type="monotone" dataKey="value" stroke="#003366" fillOpacity={1} fill="url(#colorVal)" strokeWidth={3} dot={{ r: 4, fill: '#003366' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 p-6 shadow-xs flex flex-col">
          <h3 className="font-black text-[#003366] uppercase tracking-[0.2em] text-xs mb-8 flex items-center gap-2">
            <PieChartIcon size={16} /> Distribuição de Planos Ativos
          </h3>
          <div className="h-[230px] flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={[
                    { name: 'Básico', value: 40 },
                    { name: 'Standard', value: 30 },
                    { name: 'Profissional', value: 20 },
                    { name: 'Enterprise', value: 10 },
                  ]} 
                  dataKey="value" 
                  nameKey="name" 
                  cx="50%" cy="50%" 
                  innerRadius={55} outerRadius={75} 
                  paddingAngle={5}
                >
                  {COLORS.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );

  const renderEmpresas = () => (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      {/* Barra de Filtros Avançados */}
      <div className="bg-white border border-zinc-200 p-4 shadow-xs flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input 
            type="text" 
            placeholder="Pesquisar empresa, NIF ou email..."
            className="w-full bg-zinc-50 border border-zinc-200 pl-10 pr-4 py-2 text-xs font-medium focus:outline-none focus:border-[#003366]"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-400">
            <Filter size={14} /> Filtro Plano:
          </div>
          <select 
            value={filterPlano}
            onChange={e => setFilterPlano(e.target.value)}
            className="bg-zinc-100 text-zinc-700 px-3 py-2 text-[10px] font-black uppercase tracking-widest border border-zinc-200 outline-none cursor-pointer"
          >
            <option value="todos">Todos os Planos</option>
            <option value="Básico">Básico</option>
            <option value="Standard">Standard</option>
            <option value="Profissional">Profissional</option>
            <option value="Enterprise">Enterprise</option>
          </select>

          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">
            Status:
          </div>
          <select 
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="bg-zinc-100 text-zinc-700 px-3 py-2 text-[10px] font-black uppercase tracking-widest border border-zinc-200 outline-none cursor-pointer"
          >
            <option value="todos">Todos os Estados</option>
            <option value="ativa">Ativa</option>
            <option value="pendente">Pendente de Ativação</option>
            <option value="expirada">Expirada</option>
            <option value="suspensa">Suspensa</option>
          </select>
        </div>
      </div>

      {/* Tabela Principal de Empresas */}
      <div className="bg-white border border-zinc-200 overflow-x-auto shadow-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200">
              <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Empresa / NIF</th>
              <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Contactos / Localização</th>
              <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Utilizadores</th>
              <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Plano / Vencimento</th>
              <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Estado Licença</th>
              <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Ações de Gestão</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {companies
              .filter(c => {
                const matchSearch = c.nome_empresa?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                  (c.nif && c.nif.includes(searchTerm)) ||
                  (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()));
                const matchPlano = filterPlano === 'todos' || c.plano === filterPlano;
                const licCalc = calcularLicenca(c);
                const matchStatus = filterStatus === 'todos' || 
                  (filterStatus === 'ativa' && licCalc.isAtiva) ||
                  (filterStatus === 'pendente' && licCalc.isPendente) ||
                  (filterStatus === 'expirada' && licCalc.statusNormalizado === 'EXPIRADA') ||
                  (filterStatus === 'suspensa' && c.status_licenca === 'SUSPENSA');
                return matchSearch && matchPlano && matchStatus;
              })
              .map((company) => {
                const lic = calcularLicenca(company);
                return (
                  <tr key={company.id} className="hover:bg-zinc-50 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#003366] text-white flex items-center justify-center font-black text-xs shrink-0 uppercase">
                          {company.nome_empresa ? company.nome_empresa.substring(0, 2) : 'EP'}
                        </div>
                        <div>
                          <p className="font-black text-[#003366] text-sm leading-tight uppercase">{company.nome_empresa}</p>
                          <p className="text-[10px] text-zinc-400 font-mono font-bold tracking-tight">NIF: {company.nif || '5000000000'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                       <div className="flex flex-col gap-0.5">
                          <span className="text-xs font-bold text-zinc-700">
                            {company.municipio || company.provincia ? `${company.municipio || ''}, ${company.provincia || 'Angola'}` : 'Angola'}
                          </span>
                          <span className="text-[10px] text-zinc-400 lowercase font-medium">{company.email || 'sem email'}</span>
                       </div>
                    </td>
                    <td className="p-4 text-center">
                       <button 
                          onClick={() => {
                             setSelectedCompany(company);
                             setCompanySubTab('users');
                          }}
                          className="inline-flex flex-col items-center hover:bg-zinc-100 p-1.5 rounded transition-colors group cursor-pointer"
                       >
                          <div className="flex items-center gap-1.5">
                            <Users size={14} className="text-[#003366]" />
                            <span className="text-xs font-black text-[#003366]">{company.usuarios_count || 1}</span>
                          </div>
                          <span className="text-[8px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">Gestão</span>
                       </button>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-black uppercase tracking-widest bg-zinc-100 text-zinc-700 px-2 py-0.5 w-fit border border-zinc-200">
                          {company.plano || 'Profissional'}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5 font-mono">
                           <Clock size={12} className={lic.diasRestantes <= 7 ? 'text-red-500' : 'text-zinc-400'} />
                           <span className={`text-[10px] font-black ${lic.diasRestantes <= 7 ? 'text-red-600' : 'text-zinc-600'}`}>
                             {lic.dataFimStr} ({lic.diasRestantes}d)
                           </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full flex items-center gap-1.5 w-fit ${
                        lic.isAtiva ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        lic.isPendente ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {lic.isAtiva ? <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> : <AlertTriangle size={12} />}
                        {lic.statusNormalizado}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1.5 justify-center">
                        {/* Botão Centro de Gestão Completo da Empresa */}
                        <button 
                          onClick={() => {
                            setSelectedCompany(company);
                            setCompanySubTab('info');
                          }}
                          className="px-3 py-1.5 bg-[#003366] hover:bg-[#002244] text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-xs cursor-pointer"
                          title="Abrir Painel de Gestão Completo"
                        >
                          <Eye size={12} /> Gerir
                        </button>
                        <button 
                          onClick={() => toggleCompanyStatus(company.id, company.status_licenca)}
                          className={`p-1.5 border transition-all ${lic.isAtiva ? 'text-red-500 border-red-200 hover:bg-red-600 hover:text-white' : 'text-emerald-600 border-emerald-200 hover:bg-emerald-600 hover:text-white'}`}
                          title={lic.isAtiva ? 'Suspender Acesso' : 'Ativar Licença'}
                        >
                          {lic.isAtiva ? <ShieldAlert size={14} /> : <CheckCircle size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            {companies.length === 0 && (
              <tr>
                <td colSpan={6} className="p-16 text-center text-zinc-400 font-bold uppercase tracking-widest text-xs">
                  Nenhuma empresa registada no ecossistema.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // =========================================================================
  // CENTRO COMPLETO DE GESTÃO DA EMPRESA SELECIONADA (SUPERADMIN CRM)
  // =========================================================================
  const renderCompanyDetailPanel = () => {
    if (!selectedCompany) return null;
    const lic = calcularLicenca(selectedCompany);

    return (
      <div className="space-y-6 animate-in zoom-in-95 duration-300">
        {/* Cabeçalho da Empresa */}
        <div className="bg-white border border-zinc-200 p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSelectedCompany(null)}
              className="p-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition-colors cursor-pointer"
              title="Voltar à lista de empresas"
            >
              <XCircle size={20} />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-black text-[#003366] uppercase tracking-tight">{selectedCompany.nome_empresa}</h2>
                <span className={`px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest rounded ${
                  lic.isAtiva ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {lic.statusNormalizado}
                </span>
              </div>
              <p className="text-xs text-zinc-500 font-mono mt-0.5">
                NIF: <strong>{selectedCompany.nif || '5000000000'}</strong> • Email: {selectedCompany.email} • Tel: {selectedCompany.telefone || '---'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={() => setShowEditCompanyModal(true)} className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer">
              <Edit size={14} /> Editar Empresa
            </button>
            <button onClick={() => setShowActivateModal(true)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer">
              <CheckCircle size={14} /> Ativar Licença
            </button>
            <button onClick={() => setShowUpgradeModal(true)} className="px-3 py-1.5 bg-[#003366] hover:bg-[#002244] text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer">
              <ArrowUpCircle size={14} /> Upgrade
            </button>
            <button onClick={() => setShowDowngradeModal(true)} className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer">
              <ArrowDownCircle size={14} /> Downgrade
            </button>
          </div>
        </div>

        {/* BARRA VISUAL DA LICENÇA DA EMPRESA */}
        <div className="bg-gradient-to-r from-[#003366] to-[#002244] text-white p-6 shadow-md space-y-4">
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-black uppercase tracking-widest text-sky-200">INÍCIO DO PERÍODO 🟢</span>
              <span className="font-mono text-white ml-2">{lic.dataInicioStr}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-white mr-2">{lic.dataFimStr}</span>
              <span className="font-black uppercase tracking-widest text-rose-300">🔴 FIM DO PERÍODO</span>
            </div>
          </div>

          {/* Barra de Progresso em Tempo Real */}
          <div className="w-full bg-white/20 h-4 rounded-full overflow-hidden p-0.5 border border-white/20 relative">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                lic.percentualUtilizado >= 90 ? 'bg-rose-500' : lic.percentualUtilizado >= 70 ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
              style={{ width: `${lic.percentualUtilizado}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-xs font-mono font-bold text-sky-100">
            <span>Restam {lic.diasRestantes} dias ({lic.diasDecorridos} dias decorridos de {lic.diasTotais}d totais)</span>
            <span>Utilização: {lic.percentualUtilizado.toFixed(1)}%</span>
          </div>

          {/* Alerta de Antecedência */}
          {lic.alertaNivel !== 'normal' && (
            <div className="p-3 bg-white/10 border border-white/20 text-xs font-bold flex items-center gap-3 text-amber-200">
              <AlertTriangle size={18} className="shrink-0 text-amber-400" />
              <span>{lic.alertaMensagem}</span>
            </div>
          )}
        </div>

        {/* NAVEGAÇÃO DE SUB-ABAS DA EMPRESA */}
        <div className="flex border-b border-zinc-200 bg-white overflow-x-auto no-scrollbar">
          {[
            { id: 'info', label: '1. Informações Cadastrais', icon: Building2 },
            { id: 'licenca', label: '2. Gestão de Licença', icon: Key },
            { id: 'comprovativos', label: '3. Comprovativos Pagamento', icon: CreditCard },
            { id: 'users', label: '4. Utilizadores & Reset', icon: Users },
            { id: 'ocorrencias', label: '5. Ocorrências CRM', icon: MessageSquare },
            { id: 'email', label: '6. Enviar Email', icon: Mail },
            { id: 'auditoria', label: '7. Auditoria da Empresa', icon: Activity },
          ].map(sub => (
            <button
              key={sub.id}
              onClick={() => setCompanySubTab(sub.id)}
              className={`px-5 py-3.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                companySubTab === sub.id ? 'border-[#003366] text-[#003366] bg-zinc-50' : 'border-transparent text-zinc-500 hover:text-zinc-800'
              }`}
            >
              <sub.icon size={15} />
              {sub.label}
            </button>
          ))}
        </div>

        {/* SUB-ABA 1: INFORMAÇÕES CADASTRAIS DA EMPRESA */}
        {companySubTab === 'info' && (
          <div className="bg-white border border-zinc-200 p-6 space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-4">
              <h3 className="text-sm font-black text-[#003366] uppercase tracking-wider">Dados Cadastrais da Empresa</h3>
              <button onClick={() => setShowEditCompanyModal(true)} className="px-4 py-2 bg-[#003366] text-white text-xs font-black uppercase tracking-widest flex items-center gap-2 cursor-pointer">
                <Edit size={14} /> Editar Todos os Campos
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
              <div className="p-4 bg-zinc-50 border border-zinc-200 space-y-1">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">ID Único da Empresa</span>
                <span className="font-mono font-bold text-zinc-900">{selectedCompany.id}</span>
              </div>
              <div className="p-4 bg-zinc-50 border border-zinc-200 space-y-1">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">Razão Social / Nome</span>
                <span className="font-bold text-zinc-900 uppercase">{selectedCompany.nome_empresa}</span>
              </div>
              <div className="p-4 bg-zinc-50 border border-zinc-200 space-y-1">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">NIF Fiscal AGT</span>
                <span className="font-mono font-bold text-zinc-900">{selectedCompany.nif || '5000000000'}</span>
              </div>

              <div className="p-4 bg-zinc-50 border border-zinc-200 space-y-1">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">Email de Notificação</span>
                <span className="font-medium text-zinc-800">{selectedCompany.email || 'N/D'}</span>
              </div>
              <div className="p-4 bg-zinc-50 border border-zinc-200 space-y-1">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">Telefone Principal</span>
                <span className="font-mono font-bold text-zinc-900">{selectedCompany.telefone || '---'}</span>
              </div>
              <div className="p-4 bg-zinc-50 border border-zinc-200 space-y-1">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">Localização / Província</span>
                <span className="font-bold text-zinc-900">{selectedCompany.municipio || ''}, {selectedCompany.provincia || 'Angola'}</span>
              </div>

              <div className="p-4 bg-zinc-50 border border-zinc-200 space-y-1">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">Pessoa de Contacto / Responsável</span>
                <span className="font-bold text-zinc-900">{selectedCompany.responsavel || 'Administrador Principal'}</span>
              </div>
              <div className="p-4 bg-zinc-50 border border-zinc-200 space-y-1">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">Data de Registo no Ecossistema</span>
                <span className="font-mono text-zinc-800">{formatDate(selectedCompany.created_at)}</span>
              </div>
              <div className="p-4 bg-zinc-50 border border-zinc-200 space-y-1">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">Última Atualização</span>
                <span className="font-mono text-zinc-800">{formatDate(selectedCompany.updated_at || selectedCompany.created_at)}</span>
              </div>
            </div>
          </div>
        )}

        {/* SUB-ABA 2: GESTÃO DA LICENÇA */}
        {companySubTab === 'licenca' && (
          <div className="bg-white border border-zinc-200 p-6 space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-4">
              <h3 className="text-sm font-black text-[#003366] uppercase tracking-wider">Parâmetros Oficiais da Licença</h3>
              <div className="flex gap-2">
                <button onClick={() => setShowActivateModal(true)} className="px-4 py-2 bg-emerald-600 text-white text-xs font-black uppercase tracking-widest flex items-center gap-2 cursor-pointer">
                  <CheckCircle size={14} /> Ativar Licença Agora
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div className="p-4 bg-zinc-50 border border-zinc-200">
                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">Plano Atual</span>
                <span className="text-sm font-black text-[#003366] uppercase mt-1 block">{selectedCompany.plano || 'Profissional'}</span>
              </div>
              <div className="p-4 bg-zinc-50 border border-zinc-200">
                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">Estado no Sistema</span>
                <span className="text-sm font-black text-emerald-700 uppercase mt-1 block">{lic.statusNormalizado}</span>
              </div>
              <div className="p-4 bg-zinc-50 border border-zinc-200">
                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">Data de Ativação</span>
                <span className="text-sm font-black font-mono text-zinc-900 mt-1 block">{lic.dataInicioStr}</span>
              </div>
              <div className="p-4 bg-zinc-50 border border-zinc-200">
                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">Vencimento Programado</span>
                <span className="text-sm font-black font-mono text-zinc-900 mt-1 block">{lic.dataFimStr}</span>
              </div>
            </div>

            {/* Ações de Upgrade e Downgrade */}
            <div className="p-6 bg-zinc-50 border border-zinc-200 space-y-4">
              <h4 className="text-xs font-black text-[#003366] uppercase tracking-wider">Operações de Alteração de Plano</h4>
              <div className="flex gap-4">
                <button onClick={() => setShowUpgradeModal(true)} className="flex-1 p-4 bg-[#003366] text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer shadow-sm">
                  <ArrowUpCircle size={18} /> Solicitar Upgrade de Licença
                </button>
                <button onClick={() => setShowDowngradeModal(true)} className="flex-1 p-4 bg-amber-600 text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer shadow-sm">
                  <ArrowDownCircle size={18} /> Solicitar Downgrade de Licença
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SUB-ABA 3: COMPROVATIVOS DE PAGAMENTO DA EMPRESA */}
        {companySubTab === 'comprovativos' && (
          <div className="bg-white border border-zinc-200 p-6 space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-4">
              <h3 className="text-sm font-black text-[#003366] uppercase tracking-wider">Comprovativos Submetidos por {selectedCompany.nome_empresa}</h3>
              <button onClick={() => setShowProofModal(true)} className="px-4 py-2 bg-[#003366] text-white text-xs font-black uppercase tracking-widest flex items-center gap-2 cursor-pointer">
                <Upload size={14} /> Anexar Novo Comprovativo
              </button>
            </div>

            <table className="w-full text-left text-xs border border-zinc-200">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 font-bold uppercase text-[10px] text-zinc-500">
                  <th className="p-3">Data</th>
                  <th className="p-3">Banco</th>
                  <th className="p-3">N.º Transação</th>
                  <th className="p-3 text-right">Valor Pago</th>
                  <th className="p-3 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                <tr className="hover:bg-zinc-50">
                  <td className="p-3 font-mono">{formatDate(selectedCompany.created_at)}</td>
                  <td className="p-3 font-bold uppercase">Banco BAI</td>
                  <td className="p-3 font-mono font-bold">TRX-882182</td>
                  <td className="p-3 text-right font-mono font-black text-emerald-700">65.000,00 AOA</td>
                  <td className="p-3 text-center">
                    <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase px-2 py-0.5">Aprovado</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* SUB-ABA 4: UTILIZADORES DA EMPRESA */}
        {companySubTab === 'users' && (
          <div className="bg-white border border-zinc-200 p-6 space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-4">
              <h3 className="text-sm font-black text-[#003366] uppercase tracking-wider">Utilizadores Registados nesta Empresa</h3>
            </div>

            <table className="w-full text-left text-xs border border-zinc-200">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 font-bold uppercase text-[10px] text-zinc-500">
                  <th className="p-3">Nome / Email</th>
                  <th className="p-3">Cargo / Função</th>
                  <th className="p-3">Data Cadastro</th>
                  <th className="p-3 text-right">Ação de Segurança</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {users.filter(u => String(u.empresa_id) === String(selectedCompany.id)).map(u => (
                  <tr key={u.id} className="hover:bg-zinc-50">
                    <td className="p-3 font-bold text-zinc-800">{u.full_name || u.email}</td>
                    <td className="p-3 text-zinc-600 uppercase font-mono">{u.role || 'Operador'}</td>
                    <td className="p-3 font-mono text-zinc-500">{formatDate(u.created_at)}</td>
                    <td className="p-3 text-right">
                      <button 
                        onClick={() => setShowUserResetModal(u)}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 ml-auto cursor-pointer"
                      >
                        <Key size={12} /> Resetar Acesso
                      </button>
                    </td>
                  </tr>
                ))}
                {users.filter(u => String(u.empresa_id) === String(selectedCompany.id)).length === 0 && (
                  <tr><td colSpan={4} className="p-8 text-center text-zinc-400 italic">Nenhum utilizador secundário registado para esta empresa.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* SUB-ABA 5: OCORRÊNCIAS CRM */}
        {companySubTab === 'ocorrencias' && (
          <div className="bg-white border border-zinc-200 p-6 space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-4">
              <h3 className="text-sm font-black text-[#003366] uppercase tracking-wider">Ocorrências &amp; Suporte Técnico</h3>
              <button onClick={() => setShowOccurrenceModal(true)} className="px-4 py-2 bg-[#003366] text-white text-xs font-black uppercase tracking-widest flex items-center gap-2 cursor-pointer">
                <Plus size={14} /> Abrir Nova Ocorrência
              </button>
            </div>

            <div className="space-y-3">
              {ocorrencias.map(oc => (
                <div key={oc.id} className="p-4 border border-zinc-200 bg-zinc-50 space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="font-black text-[#003366] text-xs uppercase">{oc.titulo}</h4>
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold text-[9px] uppercase">{oc.prioridade}</span>
                  </div>
                  <p className="text-xs text-zinc-600">{oc.descricao}</p>
                </div>
              ))}
              {ocorrencias.length === 0 && (
                <p className="p-8 text-center text-zinc-400 italic text-xs">Nenhuma ocorrência registada para esta empresa.</p>
              )}
            </div>
          </div>
        )}

        {/* SUB-ABA 6: ENVIAR EMAIL */}
        {companySubTab === 'email' && (
          <div className="bg-white border border-zinc-200 p-6 space-y-6 animate-in fade-in duration-300">
            <div className="border-b border-zinc-100 pb-4">
              <h3 className="text-sm font-black text-[#003366] uppercase tracking-wider">Enviar Comunicação por E-mail</h3>
              <p className="text-xs text-zinc-500">Envie avisos de faturação, renovação ou comunicados oficiais diretamente para a empresa.</p>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target as any;
              try {
                await fetchJson('/api/crm/send-email', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    empresa_id: selectedCompany.id,
                    destinatario: selectedCompany.email,
                    assunto: form.assunto.value,
                    mensagem: form.mensagem.value
                  })
                });
                toast.success('E-mail registado e enviado com sucesso!');
                form.reset();
              } catch (err) {
                toast.error('Erro ao enviar e-mail');
              }
            }} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase mb-1">Destinatário</label>
                <input type="email" value={selectedCompany.email} readOnly className="w-full bg-zinc-100 border border-zinc-300 p-2.5 font-bold" />
              </div>
              <div>
                <label className="block font-bold uppercase mb-1">Assunto do E-mail</label>
                <input type="text" name="assunto" required placeholder="Ex: Aviso de Renovação da Licença do Sistema AGT..." className="w-full bg-zinc-50 border border-zinc-300 p-2.5 font-bold" />
              </div>
              <div>
                <label className="block font-bold uppercase mb-1">Corpo da Mensagem</label>
                <textarea name="mensagem" required rows={5} className="w-full bg-zinc-50 border border-zinc-300 p-2.5 text-xs" placeholder="Escreva aqui a mensagem oficial..." />
              </div>
              <button type="submit" className="bg-[#003366] text-white px-6 py-3 font-black uppercase tracking-widest flex items-center gap-2 cursor-pointer shadow-md">
                <Send size={14} /> Disparar E-mail Oficial
              </button>
            </form>
          </div>
        )}

        {/* SUB-ABA 7: AUDITORIA DA EMPRESA */}
        {companySubTab === 'auditoria' && (
          <div className="bg-white border border-zinc-200 p-6 space-y-6 animate-in fade-in duration-300">
            <div className="border-b border-zinc-100 pb-4">
              <h3 className="text-sm font-black text-[#003366] uppercase tracking-wider">Histórico de Auditoria da Empresa</h3>
              <p className="text-xs text-zinc-500">Registo cronológico imutável de todas as edições, ativações e alterações no CRM.</p>
            </div>

            <div className="divide-y divide-zinc-100 text-xs">
              {logs.filter(l => String(l.empresa_id) === String(selectedCompany.id)).map(log => (
                <div key={log.id} className="py-3 flex items-start gap-4">
                  <Activity size={16} className="text-[#003366] mt-0.5" />
                  <div>
                    <p className="font-bold text-zinc-800 uppercase">{log.acao}</p>
                    <p className="text-zinc-600">{log.descricao}</p>
                    <span className="text-[10px] text-zinc-400 font-mono mt-1 block">{formatDate(log.created_at)}</span>
                  </div>
                </div>
              ))}
              {logs.filter(l => String(l.empresa_id) === String(selectedCompany.id)).length === 0 && (
                <p className="p-8 text-center text-zinc-400 italic">Nenhum evento de auditoria registado especificamente para esta empresa.</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#f8fafc]">
      <div className="p-8 border-b border-zinc-200 bg-white shadow-xs relative overflow-hidden">
        <div className="flex justify-between items-end relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-[#003366] text-white text-[10px] font-black px-3 py-1 uppercase tracking-widest shadow-md">Super Admin ERP</span>
              <h1 className="text-3xl font-black text-[#003366] tracking-tight uppercase flex items-center gap-3">
                CRM <span className="text-zinc-300">/</span> EMPRESAS
              </h1>
            </div>
            <p className="text-zinc-500 text-xs font-medium flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-500" />
              Painel Completo de Gestão de Empresas, Licenciamento e Auditoria Global.
            </p>
          </div>
          <div className="flex gap-3">
             <button onClick={loadData} className="p-2.5 bg-zinc-50 text-zinc-500 hover:text-[#003366] border border-zinc-200 transition-all cursor-pointer">
               <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
             </button>
          </div>
        </div>

        {/* NAVEGAÇÃO SUPERIOR DO CRM */}
        {!selectedCompany && (
          <div className="flex gap-8 mt-8 border-b border-zinc-100 overflow-x-auto whitespace-nowrap">
            {[
              { id: 'dashboard', label: 'Monitoramento', icon: LayoutDashboard },
              { id: 'empresas', label: 'Gestão Empresas', icon: Building2 },
              { id: 'licencas', label: 'Planos & Licenças', icon: Key },
              { id: 'usuarios', label: 'Controlo Utilizadores', icon: Users },
              { id: 'auditoria', label: 'Logs & Auditoria', icon: Activity },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setSelectedCompany(null);
                  setActiveTab(tab.id);
                }}
                className={`pb-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all relative cursor-pointer ${
                  activeTab === tab.id ? 'text-[#003366]' : 'text-zinc-400 hover:text-zinc-600'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div layoutId="crm-tab-top" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#003366]" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {selectedCompany ? (
          renderCompanyDetailPanel()
        ) : (
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'empresas' && renderEmpresas()}
            {activeTab === 'licencas' && renderDashboard()}
            {activeTab === 'usuarios' && renderEmpresas()}
            {activeTab === 'auditoria' && renderDashboard()}
          </div>
        )}
      </div>

      {/* MODAL EDITAR EMPRESA */}
      {showEditCompanyModal && selectedCompany && (
        <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-xs z-[200] flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 w-full max-w-xl shadow-2xl p-6 space-y-4 text-xs">
            <h3 className="text-base font-black text-[#003366] uppercase">Editar Empresa: {selectedCompany.nome_empresa}</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target as any;
              const payload = {
                nome_empresa: form.nome_empresa.value,
                nif: form.nif.value,
                email: form.email.value,
                telefone: form.telefone.value,
                responsavel: form.responsavel.value
              };
              await fetchJson(`/api/crm/companies/${selectedCompany.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              });
              toast.success('Empresa editada com sucesso!');
              setShowEditCompanyModal(false);
              loadData();
            }} className="space-y-3">
              <div>
                <label className="block font-bold uppercase mb-1">Nome / Razão Social</label>
                <input type="text" name="nome_empresa" defaultValue={selectedCompany.nome_empresa} required className="w-full bg-zinc-50 border p-2 font-bold" />
              </div>
              <div>
                <label className="block font-bold uppercase mb-1">NIF Fiscal</label>
                <input type="text" name="nif" defaultValue={selectedCompany.nif} required className="w-full bg-zinc-50 border p-2 font-bold" />
              </div>
              <div>
                <label className="block font-bold uppercase mb-1">Email</label>
                <input type="email" name="email" defaultValue={selectedCompany.email} required className="w-full bg-zinc-50 border p-2 font-bold" />
              </div>
              <div>
                <label className="block font-bold uppercase mb-1">Telefone</label>
                <input type="text" name="telefone" defaultValue={selectedCompany.telefone} className="w-full bg-zinc-50 border p-2 font-bold" />
              </div>
              <div>
                <label className="block font-bold uppercase mb-1">Pessoa Responsável</label>
                <input type="text" name="responsavel" defaultValue={selectedCompany.responsavel} className="w-full bg-zinc-50 border p-2 font-bold" />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowEditCompanyModal(false)} className="px-4 py-2 uppercase font-bold">Cancelar</button>
                <button type="submit" className="bg-[#003366] text-white px-5 py-2 uppercase font-bold">Salvar Alterações</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ATIVAR LICENÇA */}
      {showActivateModal && selectedCompany && (
        <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-xs z-[200] flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 w-full max-w-md shadow-2xl p-6 space-y-4 text-xs">
            <h3 className="text-base font-black text-emerald-700 uppercase">Ativar Licença da Empresa</h3>
            <p className="text-zinc-500">A contagem de validade da licença iniciará automaticamente hoje a partir desta confirmação.</p>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const form = e.target as any;
              await fetchJson(`/api/crm/companies/${selectedCompany.id}/activate-license`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  duracao_dias: Number(form.duracao_dias.value),
                  plano: form.plano.value
                })
              });
              toast.success('Licença ativada com sucesso!');
              setShowActivateModal(false);
              loadData();
            }} className="space-y-3">
              <div>
                <label className="block font-bold uppercase mb-1">Plano a Ativar</label>
                <select name="plano" defaultValue={selectedCompany.plano || 'Profissional'} className="w-full bg-zinc-50 border p-2 font-bold">
                  <option value="Básico">Básico</option>
                  <option value="Standard">Standard</option>
                  <option value="Profissional">Profissional</option>
                  <option value="Enterprise">Enterprise</option>
                </select>
              </div>
              <div>
                <label className="block font-bold uppercase mb-1">Duração do Período (Dias)</label>
                <input type="number" name="duracao_dias" defaultValue={30} required className="w-full bg-zinc-50 border p-2 font-bold font-mono" />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setShowActivateModal(false)} className="px-4 py-2 uppercase font-bold">Cancelar</button>
                <button type="submit" className="bg-emerald-600 text-white px-5 py-2 uppercase font-bold">Confirmar Ativação</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRMModule;
