import React, { useState, useEffect } from 'react';
import { 
  Building2, Users, CreditCard, ShieldAlert, Activity, 
  Search, Filter, Plus, Edit, Trash2, Key, Calendar, 
  BarChart2, AlertTriangle, CheckCircle, XCircle, Clock,
  MoreVertical, FileText, Download, UserCheck, ShieldCheck,
  TrendingUp, Wallet, ArrowUpCircle, Info, RefreshCw,
  LayoutDashboard, UserCog, PieChart as PieChartIcon
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';

interface LicenseStats {
  total: number;
  active: number;
  vencidas: number;
  pendentes: number;
  bloqueadas: number;
  receitaTotal: number;
}

interface Company {
  id: string;
  empresa_id?: string;
  nome_empresa: string;
  nif: string;
  email: string;
  telefone: string;
  municipio: string;
  provincia: string;
  plano: string;
  status_licenca: string;
  data_fim: string;
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
  usuario_email: string;
  acao: string;
  descricao: string;
  entidade: string;
  empresa_id: string;
  ip_address: string;
  created_at: string;
}

export const CRMModule = ({ fetchJson, formatCurrency, formatDate, setActiveTab: setGlobalTab }: any) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const companiesData = await fetchJson('/api/crm/companies');
      const statsData = await fetchJson('/api/crm/stats');
      setCompanies(companiesData || []);
      setStats(statsData);

      if (activeTab === 'usuarios') {
        const usersData = await fetchJson('/api/crm/users');
        setUsers(usersData || []);
      }

      if (activeTab === 'auditoria') {
        const logsData = await fetchJson('/api/crm/logs');
        setLogs(logsData || []);
      }
    } catch (error) {
      console.error("Erro ao carregar dados CRM:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const toggleCompanyStatus = async (empresaId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' || currentStatus === 'activa' ? 'bloqueada' : 'active';
    try {
      await fetchJson(`/api/crm/companies/${empresaId}/toggle-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      loadData();
    } catch (err) {
      alert("Erro ao alterar estado da empresa");
    }
  };

  const COLORS = ['#1a4da6', '#10b981', '#f59e0b', '#ef4444', '#6b7280'];

  const renderDashboard = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Empresas', value: stats?.total || 0, icon: Building2, color: 'text-blue-600' },
          { label: 'Utilizadores Totais', value: stats?.usuariosTotais || 0, icon: Users, color: 'text-indigo-600' },
          { label: 'Receita Licenças', value: formatCurrency(stats?.receitaTotal || 0), icon: Wallet, color: 'text-[#003366]' },
          { label: 'Alertas Críticos', value: stats?.vencidas || 0, icon: AlertTriangle, color: 'text-red-500' },
        ].map((card, i) => (
          <div key={i} className="bg-white border border-zinc-200 p-6 rounded-none shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">{card.label}</p>
              <p className={`text-2xl font-black mt-2 ${card.color}`}>{card.value}</p>
            </div>
            <div className={`p-3 bg-zinc-50 rounded-none ${card.color}`}>
              <card.icon size={24} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white border border-zinc-200 p-6 rounded-none shadow-sm h-full">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-black text-[#003366] uppercase tracking-[0.2em] text-sm flex items-center gap-2">
              <TrendingUp size={18} /> Fluxo de Facturação CRM
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
              ]}>
                <defs>
                  <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1a4da6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#1a4da6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis dataKey="month" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', borderRadius: '0' }}
                  labelStyle={{ fontWeight: '900', color: '#003366', textTransform: 'uppercase' }}
                />
                <Area type="monotone" dataKey="value" stroke="#1a4da6" fillOpacity={1} fill="url(#colorVal)" strokeWidth={3} dot={{ r: 4, fill: '#1a4da6' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 p-6 rounded-none shadow-sm flex flex-col">
          <h3 className="font-black text-[#003366] uppercase tracking-[0.2em] text-sm mb-8 flex items-center gap-2">
            <PieChartIcon size={18} /> Distribuição de Planos
          </h3>
          <div className="h-[250px] flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={[
                    { name: 'Básico', value: 40 },
                    { name: 'Standard', value: 30 },
                    { name: 'Profissional', value: 15 },
                    { name: 'Enterprise', value: 10 },
                  ]} 
                  dataKey="value" 
                  nameKey="name" 
                  cx="50%" cy="50%" 
                  innerRadius={60} outerRadius={80} 
                  paddingAngle={5}
                >
                  {COLORS.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {['Básico', 'Standard', 'Profissional', 'Enterprise'].map((label, i) => (
              <div key={label} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2" style={{ backgroundColor: COLORS[i] }}></div>
                  <span className="font-medium text-zinc-500">{label}</span>
                </div>
                <span className="font-black text-[#003366]">
                  {i === 0 ? '40%' : i === 1 ? '30%' : i === 2 ? '15%' : '10%'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderEmpresas = () => (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white border border-zinc-200 p-4 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input 
            type="text" 
            placeholder="Pesquisar empresa, NIF ou email..."
            className="w-full bg-zinc-50 border border-zinc-200 pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-[#003366]"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 mr-2">
            <Filter size={14} /> Ordenar por:
          </div>
          <select className="bg-zinc-100 text-zinc-600 px-4 py-2 text-[10px] font-black uppercase tracking-widest border-none outline-none cursor-pointer">
            <option>Data de Registo</option>
            <option>Nome (A-Z)</option>
            <option>Estado Licença</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-zinc-200 overflow-x-auto shadow-sm transition-all">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200">
              <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Identificação Empresa</th>
              <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Contacto / Localização</th>
              <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Utilizadores</th>
              <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Plano / Vencimento</th>
              <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Estado Sistema</th>
              <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Ações de Controlo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {companies
              .filter(c => 
                c.nome_empresa?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                (c.nif && c.nif.includes(searchTerm)) ||
                (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
              )
              .map((company) => (
              <tr key={company.id} className="hover:bg-zinc-50 transition-colors group">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#003366]/5 flex items-center justify-center border border-[#003366]/10 shrink-0 group-hover:bg-[#003366] group-hover:text-white transition-all">
                      <Building2 size={20} className="group-hover:text-white transition-colors" />
                    </div>
                    <div>
                      <p className="font-black text-[#003366] text-sm leading-tight uppercase">{company.nome_empresa}</p>
                      <p className="text-[10px] text-zinc-400 font-bold tracking-[0.2em]">{company.nif || 'NIF NÃO DEFINIDO'}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                   <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-zinc-600">
                        {company.municipio || company.provincia ? `${company.municipio || ''}${company.municipio && company.provincia ? ', ' : ''}${company.provincia || ''}` : 'Localização Pendente'}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-medium lowercase italic">{company.email || 'sem email'}</span>
                      <span className="text-[10px] text-zinc-400 font-bold font-mono tracking-tighter">{company.telefone || '---'}</span>
                   </div>
                </td>
                <td className="p-4 text-center">
                   <button 
                      onClick={() => {
                         setActiveTab('usuarios');
                         setSearchTerm(company.nome_empresa || company.nif || '');
                      }}
                      className="inline-flex flex-col items-center hover:bg-zinc-100 p-2 rounded transition-colors group cursor-pointer"
                      title={`Gerir Utilizadores da Empresa ${company.nome_empresa}`}
                   >
                      <div className="flex items-center gap-2">
                        <Users size={14} className="text-[#1a4da6] group-hover:scale-110 transition-transform" />
                        <span className="text-sm font-black text-[#003366]">{company.usuarios_count || 0}</span>
                      </div>
                      <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mt-1">Activos</span>
                   </button>
                </td>
                <td className="p-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-black uppercase tracking-widest bg-zinc-100 text-zinc-600 px-2 py-0.5 w-fit border border-zinc-200">
                      {company.plano || 'Standard'}
                    </span>
                    <div className="flex items-center gap-1.5 mt-1">
                       <Clock size={12} className={new Date(company.data_fim) < new Date() ? 'text-red-500' : 'text-zinc-400'} />
                       <span className={`text-[10px] font-black tracking-tight ${new Date(company.data_fim) < new Date() ? 'text-red-600' : 'text-zinc-500'}`}>
                         {formatDate(company.data_fim)}
                       </span>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full flex items-center gap-2 w-fit ${
                    company.status_licenca === 'active' || company.status_licenca === 'activa' 
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                      : 'bg-red-50 text-red-600 border border-red-100'
                  }`}>
                    {company.status_licenca === 'active' || company.status_licenca === 'activa' ? (
                      <><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Activa</>
                    ) : (
                      <><div className="w-1.5 h-1.5 rounded-full bg-red-500" /> Suspensa</>
                    )}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex gap-2 justify-center">
                    <button 
                      onClick={() => toggleCompanyStatus(company.empresa_id || company.id, company.status_licenca)}
                      className={`w-10 h-10 flex items-center justify-center transition-all bg-zinc-50 border border-zinc-100 ${company.status_licenca === 'active' || company.status_licenca === 'activa' ? 'text-red-400 hover:bg-red-500 hover:text-white' : 'text-emerald-400 hover:bg-emerald-500 hover:text-white'}`}
                      title={company.status_licenca === 'active' || company.status_licenca === 'activa' ? 'Suspender Acesso' : 'Restaurar Acesso'}
                    >
                      {company.status_licenca === 'active' || company.status_licenca === 'activa' ? <ShieldAlert size={18} /> : <CheckCircle size={18} />}
                    </button>
                    <button 
                      className="w-10 h-10 flex items-center justify-center bg-zinc-50 border border-zinc-100 text-zinc-400 hover:bg-[#003366] hover:text-white transition-all shadow-sm" 
                      title="Painel de Controlo da Empresa"
                      onClick={() => {
                         if (setGlobalTab) {
                           setGlobalTab('dashboard'); // Redireciona para o dashboard geral
                         }
                      }}
                    >
                      <LayoutDashboard size={18} />
                    </button>
                    <button 
                      className="w-10 h-10 flex items-center justify-center bg-zinc-50 border border-zinc-100 text-zinc-400 hover:bg-amber-500 hover:text-white transition-all shadow-sm" 
                      title="Editar Licença e Plano"
                      onClick={() => setActiveTab('licencas')}
                    >
                      <Key size={18} />
                    </button>
                    <button 
                      className="w-10 h-10 flex items-center justify-center bg-zinc-50 border border-zinc-100 text-zinc-400 hover:bg-[#1a4da6] hover:text-white transition-all shadow-sm" 
                      title="Controlo de Utilizadores"
                      onClick={() => {
                         setActiveTab('usuarios');
                         setSearchTerm(company.nome_empresa || company.nif || '');
                      }}
                    >
                      <UserCog size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {companies.length === 0 && (
              <tr>
                <td colSpan={6} className="p-20 text-center">
                   <div className="flex flex-col items-center gap-4">
                      <Building2 size={40} className="text-zinc-200" />
                      <div>
                         <p className="text-sm font-black text-zinc-400 uppercase tracking-widest">Nenhuma empresa registada</p>
                         <p className="text-xs text-zinc-300 mt-2">O banco de dados de empresas do Supabase está vazio.</p>
                      </div>
                   </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderUsuarios = () => (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
       <div className="bg-white border border-zinc-200 p-4 shadow-sm flex justify-between items-center">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
              type="text" 
              placeholder="Pesquisar utilizador..."
              className="w-full bg-zinc-50 border border-zinc-200 pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-[#003366]"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
       </div>

       <div className="bg-white border border-zinc-200 overflow-x-auto shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200">
              <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Utilizador</th>
              <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Empresa Vinculada</th>
              <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Cargo / Permissão</th>
              <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Criado em</th>
              <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {users
              .filter(u => 
                 u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
                 u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                 u.empresas?.nome_empresa?.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((u) => (
              <tr key={u.id} className="hover:bg-zinc-50 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black text-xs uppercase">
                      {u.full_name ? u.full_name.substring(0, 1) : u.email.substring(0, 1)}
                    </div>
                    <div>
                      <p className="font-bold text-zinc-800 text-sm leading-tight">{u.full_name || 'Utilizador'}</p>
                      <p className="text-[10px] text-zinc-400 font-medium tracking-tight uppercase">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4 font-black text-[#003366] text-[10px] uppercase tracking-wider">
                  {u.empresas?.nome_empresa || 'Sem Empresa'}
                </td>
                <td className="p-4">
                   <span className="text-[9px] font-black uppercase tracking-widest bg-zinc-100 text-zinc-600 px-2 py-0.5">
                      {u.role || 'Utilizador'}
                   </span>
                </td>
                <td className="p-4 text-xs text-zinc-500 font-medium">
                   {formatDate(u.created_at)}
                </td>
                <td className="p-4 text-right">
                   <div className="flex gap-2 justify-end">
                     <button onClick={() => alert(`A abrir painel de edição do utilizador ${u.email}...`)} className="w-8 h-8 flex items-center justify-center bg-zinc-50 border border-zinc-100 text-zinc-400 hover:bg-[#003366] hover:text-white transition-all shadow-sm" title="Editar Utilizador">
                        <UserCog size={14} />
                     </button>
                     <button onClick={() => alert(`Foi enviado um e-mail com instruções para redefinição da senha para ${u.email}.`)} className="w-8 h-8 flex items-center justify-center bg-zinc-50 border border-zinc-100 text-zinc-400 hover:bg-amber-500 hover:text-white transition-all shadow-sm" title="Reset Senha">
                        <Key size={14} />
                     </button>
                     <button onClick={() => alert(`Acesso do utilizador ${u.email} bloqueado/desbloqueado com sucesso.`)} className="w-8 h-8 flex items-center justify-center bg-zinc-50 border border-zinc-100 text-zinc-400 hover:bg-red-500 hover:text-white transition-all shadow-sm" title="Bloquear Acesso">
                        <ShieldAlert size={14} />
                     </button>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
       </div>
    </div>
  );

  const renderLicencas = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
       {[
         { name: 'Básico', price: 15000, color: 'border-zinc-200' },
         { name: 'Standard', price: 35000, color: 'border-blue-200 shadow-blue-50' },
         { name: 'Profissional', price: 75000, color: 'border-[#003366] ring-1 ring-[#003366]' },
       ].map(plan => (
         <div key={plan.name} className={`bg-white border p-8 rounded-none flex flex-col ${plan.color}`}>
            <h4 className="text-sm font-black uppercase tracking-widest text-[#003366] mb-2">{plan.name}</h4>
            <div className="flex items-baseline gap-1 mb-8">
               <span className="text-3xl font-black text-zinc-900">{formatCurrency(plan.price)}</span>
               <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">/ mês</span>
            </div>
            <ul className="space-y-4 mb-10 flex-1">
               {['5 Utilizadores', 'Facturação Ilimitada', 'Módulo RH Básico', 'Suporte Prioritário'].map(feat => (
                  <li key={feat} className="flex items-center gap-3 text-xs text-zinc-600 font-medium">
                     <CheckCircle size={14} className="text-emerald-500" /> {feat}
                  </li>
               ))}
            </ul>
            <button onClick={() => alert(`A abrir configurações de edição para o plano: ${plan.name}`)} className="w-full bg-[#003366] text-white py-3 text-xs font-black uppercase tracking-widest hover:bg-[#002244] shadow-lg">Editar Plano</button>
         </div>
       ))}
    </div>
  );

  const renderPagamentos = () => (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
       <div className="bg-white border border-zinc-200 shadow-sm overflow-x-auto">
          <table className="w-full text-left border-collapse">
             <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200">
                   <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Comprovativo</th>
                   <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Empresa</th>
                   <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Valor</th>
                   <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Data Envio</th>
                   <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Status</th>
                   <th className="p-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Gestão</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-zinc-100">
                {companies.filter(c => c.plano).map(c => (
                   <tr key={c.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="p-4">
                         <div className="w-10 h-10 bg-zinc-100 flex items-center justify-center border border-zinc-200">
                            <FileText size={16} className="text-zinc-400" />
                         </div>
                      </td>
                      <td className="p-4 font-black text-[#003366] text-xs uppercase">{c.nome_empresa}</td>
                      <td className="p-4 font-black text-zinc-800 text-xs">25.000,00 Kz</td>
                      <td className="p-4 text-xs font-medium text-zinc-500">{formatDate(c.updated_at || c.created_at)}</td>
                      <td className="p-4 text-center">
                         <span className="bg-amber-100 text-amber-700 text-[9px] font-black uppercase tracking-widest px-2 py-0.5">Pendente</span>
                      </td>
                      <td className="p-4 text-right">
                         <div className="flex gap-2 justify-end">
                            <button onClick={() => alert(`Comprovativo aprovado com sucesso para a empresa: ${c.nome_empresa}`)} className="bg-emerald-600 text-white p-1.5 shadow-sm hover:bg-emerald-700" title="Aprovar"><CheckCircle size={14} /></button>
                            <button onClick={() => alert(`Comprovativo rejeitado e notificação enviada para: ${c.email || c.nome_empresa}`)} className="bg-red-600 text-white p-1.5 shadow-sm hover:bg-red-700" title="Rejeitar"><XCircle size={14} /></button>
                         </div>
                      </td>
                   </tr>
                ))}
             </tbody>
          </table>
       </div>
    </div>
  );

  const renderAuditoria = () => (
    <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
       <div className="flex justify-between items-center mb-6">
          <h3 className="font-black text-[#003366] uppercase tracking-widest text-sm flex items-center gap-2">
             <Activity size={18} /> Auditoria Global e Logs de Actividade
          </h3>
       </div>

       <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex gap-4 overflow-x-auto whitespace-nowrap">
             {['Tudo', 'Logins', 'Vendas', 'RH', 'Financeiro', 'Configurações'].map(filter => (
                <button key={filter} className={`text-[10px] font-black uppercase tracking-widest px-4 py-1.5 border transition-all ${filter === 'Tudo' ? 'bg-[#003366] text-white border-[#003366]' : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300'}`}>
                   {filter}
                </button>
             ))}
          </div>
          <div className="divide-y divide-zinc-100">
             {logs.map(log => (
                <div key={log.id} className="p-4 flex items-start gap-4 hover:bg-zinc-50 transition-colors group">
                   <div className="p-2 bg-zinc-100 text-zinc-400 group-hover:bg-[#003366]/5 group-hover:text-[#003366]">
                      <Activity size={16} />
                   </div>
                   <div className="flex-1">
                      <div className="flex justify-between">
                         <p className="text-xs font-bold text-zinc-800 uppercase tracking-tight">{log.acao}</p>
                         <span className="text-[10px] text-zinc-400 font-medium">{formatDate(log.created_at)}</span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">{log.descricao}</p>
                      <div className="flex gap-4 mt-2">
                         <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                            <Users size={10} /> {log.usuario_email}
                         </span>
                         <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                            <Info size={10} /> {log.ip_address || '0.0.0.0'}
                         </span>
                      </div>
                   </div>
                </div>
             ))}
             {logs.length === 0 && (
                <div className="p-12 text-center text-zinc-400 italic text-sm">
                   Nenhum registo de auditoria encontrado.
                </div>
             )}
          </div>
       </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[#f8fafc]">
      <div className="p-8 border-b border-zinc-200 bg-white shadow-sm relative overflow-hidden">
        {/* Background Accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#003366]/5 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#1a4da6]/5 rounded-full -ml-32 -mb-32 blur-3xl" />

        <div className="flex justify-between items-end relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-[#1a4da6] text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-blue-900/20">Super Admin</span>
              <h1 className="text-4xl font-black text-[#003366] tracking-tighter uppercase italic flex items-center gap-3">
                CRM <span className="text-zinc-300">/</span> EMPRESAS
              </h1>
            </div>
            <p className="text-zinc-500 text-sm font-medium flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-500" />
              Painel de Gestão e Monitoramento Global do Ecossistema ERP.
            </p>
          </div>
          <div className="flex gap-4">
             <button onClick={loadData} className="group p-3 bg-zinc-50 text-zinc-400 hover:text-[#1a4da6] border border-zinc-200 transition-all hover:shadow-md">
               <RefreshCw size={20} className={loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} />
             </button>
             <button 
               onClick={() => {
                 setGlobalTab('login');
                 alert('Redirecionando para a área de registo de nova empresa. (Por favor, crie uma nova conta de empresa)');
               }}
               className="bg-[#003366] text-white px-8 py-3 text-xs font-black uppercase tracking-[0.2em] shadow-xl hover:bg-[#002244] transition-all flex items-center gap-3">
                <Plus size={18} /> Registar Empresa
             </button>
          </div>
        </div>

        <div className="flex gap-10 mt-10 border-b border-zinc-100 overflow-x-auto whitespace-nowrap">
          {[
            { id: 'dashboard', label: 'Monitoramento', icon: LayoutDashboard },
            { id: 'empresas', label: 'Gestão Empresas', icon: Building2 },
            { id: 'licencas', label: 'Planos & Licenças', icon: Key },
            { id: 'usuarios', label: 'Controlo Utilizadores', icon: Users },
            { id: 'auditoria', label: 'Logs & Auditoria', icon: Activity },
            { id: 'pagamentos', label: 'Comprovativos Pagamento', icon: CreditCard },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-4 text-[11px] font-black uppercase tracking-[0.25em] flex items-center gap-3 transition-all relative ${
                activeTab === tab.id ? 'text-[#1a4da6]' : 'text-zinc-400 hover:text-zinc-600'
              }`}
            >
              <tab.icon size={16} className={activeTab === tab.id ? 'text-[#1a4da6]' : 'text-zinc-400 group-hover:text-zinc-600'} />
              {tab.label}
              {activeTab === tab.id && (
                <motion.div layoutId="crm-tab" className="absolute bottom-0 left-0 right-0 h-1 bg-[#1a4da6]" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-400 gap-6">
             <div className="w-16 h-16 border-4 border-zinc-100 border-t-[#1a4da6] rounded-full animate-spin shadow-inner" />
             <div className="text-center">
                <p className="font-black uppercase tracking-[0.3em] text-sm text-[#003366]">Sincronizando Ecossistema</p>
                <p className="text-[10px] font-bold text-zinc-500 uppercase mt-2 opacity-50 tracking-widest">A aguardar resposta do Supabase Admin</p>
             </div>
          </div>
        ) : (
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'empresas' && renderEmpresas()}
            {activeTab === 'usuarios' && renderUsuarios()}
            {activeTab === 'auditoria' && renderAuditoria()}
            {activeTab === 'licencas' && renderLicencas()}
            {activeTab === 'pagamentos' && renderPagamentos()}
          </div>
        )}
      </div>
    </div>
  );
};

