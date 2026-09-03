import React, { useState, useEffect } from 'react';
import { 
  Key, 
  ShieldCheck, 
  Clock, 
  AlertOctagon, 
  Calendar, 
  TrendingUp, 
  CreditCard, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Users,
  Search,
  Filter,
  Plus, 
  ChevronRight, 
  History, 
  ShieldAlert,
  ArrowUpCircle,
  ArrowDownCircle,
  Download,
  Upload,
  Info,
  Building2,
  BadgeCent,
  AlertTriangle,
  MessageSquare,
  Send,
  UserCheck
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface LicencasModuleProps {
  user: any;
  userProfile: any;
}

export const LicencasModule: React.FC<LicencasModuleProps> = ({ user, userProfile }) => {
  const [activeTab, setActiveTab] = useState('list');
  const [licencas, setLicencas] = useState<any[]>([]);
  const [ocorrencias, setOcorrencias] = useState<any[]>([]);
  const [comprovativos, setComprovativos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  
  // Modals
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showOcorrenciaModal, setShowOcorrenciaModal] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState<any>(null);

  const empresaId = user?.empresa_id || userProfile?.empresa_id || user?.company_id || '1';

  useEffect(() => {
    const admin = userProfile?.role === 'super_admin' || userProfile?.role === 'superadmin' || userProfile?.is_admin;
    setIsSuperAdmin(!!admin);
    if (admin) {
      setActiveTab('dashboard');
    } else {
      setActiveTab('list');
    }
    fetchLicencas();
  }, [userProfile, empresaId]);

  const fetchLicencas = async () => {
    setLoading(true);
    try {
      // 1. Direct fetch from Supabase using correct schema tables
      const { data: supaLicencas } = await supabase
        .from('licencas_empresas')
        .select('*');
      
      const { data: supaHistorico } = await supabase
        .from('historico_licencas')
        .select('*')
        .order('created_at', { ascending: false });

      // Fallback or API check via backend (com dados do config-empresa)
      const { data: { session } } = await supabase.auth.getSession();
      const [apiLicRes, configEmpRes] = await Promise.all([
        fetch('/api/licencas', {
          headers: { 'Authorization': `Bearer ${session?.access_token || ''}` }
        }).then(r => r.ok ? r.json() : []).catch(() => []),
        fetch('/api/config-empresa', {
          headers: { 'Authorization': `Bearer ${session?.access_token || ''}` }
        }).then(r => r.ok ? r.json() : null).catch(() => null)
      ]);

      let mergedList = (supaLicencas && supaLicencas.length > 0) ? supaLicencas : apiLicRes;

      // Filter list for non-superadmins to only show their company license
      if (!isSuperAdmin && Array.isArray(mergedList) && mergedList.length > 0) {
        const companyLic = mergedList.filter((l: any) => String(l.empresa_id) === String(empresaId));
        if (companyLic.length > 0) {
          mergedList = companyLic;
        }
      }

      // Se a lista estiver vazia para a empresa, usar dados frescos do config-empresa
      if ((!Array.isArray(mergedList) || mergedList.length === 0) && configEmpRes?.id) {
        mergedList = [{
          empresa_id: configEmpRes.empresa_id || configEmpRes.id,
          nome_empresa: configEmpRes.nome_empresa,
          tipo_licenca: configEmpRes.plano || 'Profissional',
          plano: configEmpRes.plano || 'Profissional',
          status_licenca: configEmpRes.status_licenca,
          licenca_ativa: configEmpRes.licenca_ativa,
          ativo: configEmpRes.ativo,
          data_inicio: configEmpRes.data_inicio_licenca || new Date().toISOString(),
          data_fim: configEmpRes.data_expiracao_licenca,
          valor_licenca: configEmpRes.valor_licenca || 65000,
          ativado_por: 'SuperAdmin CRM'
        }];
      }

      setLicencas(Array.isArray(mergedList) ? mergedList : []);
      setOcorrencias(Array.isArray(supaHistorico) ? supaHistorico : []);
      setComprovativos(Array.isArray(supaHistorico) ? supaHistorico.filter((h: any) => h.comprovativo_url) : []);
    } catch (error) {
      console.error("Erro ao buscar licenças:", error);
    } finally {
      setLoading(false);
    }
  };

  const safeLicencas = Array.isArray(licencas) ? licencas : [];
  const safeOcorrencias = Array.isArray(ocorrencias) ? ocorrencias : [];
  const safeComprovativos = Array.isArray(comprovativos) ? comprovativos : [];

  // Active Company License computation
  const myLicense = safeLicencas.find(l => l && String(l.empresa_id) === String(empresaId)) || safeLicencas[0] || {
    id: 'lic-default',
    empresa_id: empresaId,
    tipo_licenca: userProfile?.pacote_licenca || 'Profissional',
    plano: 'Mensal',
    status_licenca: 'EXPIRADA',
    licenca_ativa: false,
    ativo: false,
    data_inicio: new Date().toISOString(),
    data_fim: new Date().toISOString(),
    valor_licenca: 65000,
    ativado_por: 'Administrador do Sistema CRM'
  };

  const calculateDaysRemaining = (endDateStr: string) => {
    if (!endDateStr) return 0;
    const end = new Date(endDateStr).getTime();
    const now = new Date().getTime();
    const diff = end - now;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const daysRemaining = calculateDaysRemaining(myLicense.data_fim);
  const rawStatus = String(myLicense.status_licenca || myLicense.estado || '').toUpperCase();
  const isSuspendedOrDeactivated = ['SUSPENSA', 'BLOQUEADA', 'DESATIVADA', 'INATIVA', 'CANCELADA', 'EXPIRADA', 'VENCIDA'].includes(rawStatus) || 
                                  myLicense.licenca_ativa === false || 
                                  myLicense.ativo === false;
  const isExplicitlyActive = ['ACTIVA', 'ACTIVE', 'ATIVA', 'ATIVO'].includes(rawStatus) && (myLicense.licenca_ativa !== false) && (myLicense.ativo !== false);
  
  const isExpired = isSuspendedOrDeactivated || (daysRemaining === 0 && !rawStatus.includes('TRIAL'));
  const isLicenseActive = isExplicitlyActive && !isExpired && (daysRemaining > 0 || !myLicense.data_fim);
  const displayStatus = isLicenseActive ? 'LICENÇA ACTIVA' : 'LICENÇA EXPIRADA';
  const isExpiringSoon = isLicenseActive && daysRemaining <= 15;

  const stats = [
    { label: 'Licenças Ativas', value: safeLicencas.filter(l => l && (['ATIVA', 'ACTIVA', 'ACTIVE'].includes(String(l.status_licenca || l.estado).toUpperCase()) && l.licenca_ativa !== false && l.ativo !== false)).length, icon: ShieldCheck, color: 'text-emerald-600' },
    { label: 'Pendentes de Validação', value: safeLicencas.filter(l => l && (String(l.status_licenca || l.estado).toLowerCase().includes('pendente'))).length, icon: Clock, color: 'text-amber-600' },
    { label: 'Vencidas / Expiradas', value: safeLicencas.filter(l => l && (['SUSPENSA', 'EXPIRADA', 'VENCIDA', 'BLOQUEADA', 'DESATIVADA'].includes(String(l.status_licenca || l.estado).toUpperCase()) || l.licenca_ativa === false || l.ativo === false)).length, icon: AlertOctagon, color: 'text-rose-600' },
    { label: 'Receita Licenciamento', value: safeLicencas.filter(l => l && (['ATIVA', 'ACTIVA', 'ACTIVE'].includes(String(l.status_licenca || l.estado).toUpperCase()) && l.licenca_ativa !== false && l.ativo !== false)).reduce((acc, curr) => acc + Number(curr.valor_licenca || 0), 0).toLocaleString() + ' AOA', icon: BadgeCent, color: 'text-[#003366]' },
  ];

  const chartData = [
    { name: 'Jan', revenue: 1500000 },
    { name: 'Fev', revenue: 2100000 },
    { name: 'Mar', revenue: 1800000 },
    { name: 'Abr', revenue: 2400000 },
    { name: 'Mai', revenue: 2900000 },
    { name: 'Jun', revenue: 3500000 },
  ];

  const planUsage = [
    { name: 'Profissional', value: safeLicencas.filter(l => (l?.tipo_licenca || l?.plano || '').toLowerCase().includes('prof')).length || 1 },
    { name: 'Standard', value: safeLicencas.filter(l => (l?.tipo_licenca || l?.plano || '').toLowerCase().includes('stand')).length || 0 },
    { name: 'Enterprise', value: safeLicencas.filter(l => (l?.tipo_licenca || l?.plano || '').toLowerCase().includes('enter')).length || 0 },
    { name: 'Trial', value: safeLicencas.filter(l => (l?.tipo_licenca || l?.plano || '').toLowerCase().includes('trial')).length || 0 },
  ];

  const COLORS = ['#003366', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-black text-[#003366] flex items-center gap-3">
            <Key size={28} />
            Gestão de Licenciamento &amp; Subscrição
          </h2>
          <p className="text-zinc-500 text-xs">Controlo de validade, renovação, planos e comprovativos de pagamento da empresa.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchLicencas} className="p-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition-colors cursor-pointer" title="Atualizar dados">
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
          <button 
            onClick={() => setShowPaymentModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <Upload size={16} /> Enviar Comprovativo
          </button>
          <button 
            onClick={() => setShowApplyModal(true)}
            className="bg-[#003366] hover:bg-[#002244] text-white px-4 py-2 text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <Plus size={16} /> Solicitar Alteração / Upgrade
          </button>
        </div>
      </header>

      {/* Top Banner Alert (Se a licença estiver a expirar ou expirada) */}
      {!isSuperAdmin && (isExpired || isExpiringSoon) && (
        <div className={`p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border shadow-sm ${
          isExpired ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${isExpired ? 'bg-rose-100' : 'bg-amber-100'}`}>
              <AlertTriangle className={isExpired ? 'text-rose-600' : 'text-amber-600'} size={24} />
            </div>
            <div>
              <h4 className="text-sm font-black uppercase tracking-wider">
                {isExpired ? 'ATENÇÃO: A Licença do Sistema Encontra-se Expirada / Suspensa!' : `AVISO DE RENOVAÇÃO: Faltam apenas ${daysRemaining} dias para a licença expirar!`}
              </h4>
              <p className="text-xs mt-0.5 opacity-90">
                {isExpired 
                  ? `A licença desta empresa encontra-se inativa ou expirada. Submeta o comprovativo de pagamento ou contacte o administrador para reativar o acesso total.` 
                  : `A sua subscrição expira em ${new Date(myLicense.data_fim).toLocaleDateString('pt-AO')}. Efetue o pagamento da renovação para evitar a suspensão automática.`
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => setShowPaymentModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-xs font-black uppercase tracking-widest shadow-sm cursor-pointer whitespace-nowrap"
            >
              Anexar Comprovativo Agora
            </button>
          </div>
        </div>
      )}

      {/* CARTÃO EM DESTAQUE DA LICENÇA ATUAL DA EMPRESA */}
      {!isSuperAdmin && (
        <div className="bg-gradient-to-r from-[#003366] to-[#002244] text-white p-6 shadow-xl border border-sky-900 relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 opacity-10 pointer-events-none">
            <Key size={220} />
          </div>
          
          <div className="relative z-10 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-sky-300 block">Licença da Empresa Registada</span>
                <h3 className="text-2xl font-black tracking-tight uppercase mt-0.5">{myLicense.tipo_licenca || myLicense.plano || 'Plano Profissional AGT'}</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-4 py-1.5 text-xs font-black uppercase tracking-widest flex items-center gap-2 ${
                  isLicenseActive 
                    ? 'bg-emerald-500 text-white shadow-sm' 
                    : 'bg-rose-600 text-white shadow-sm'
                }`}>
                  {isLicenseActive ? (
                    <><span className="w-2 h-2 rounded-full bg-white animate-ping" /> LICENÇA ACTIVA</>
                  ) : (
                    <><AlertTriangle size={14} /> LICENÇA EXPIRADA</>
                  )}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div className="bg-white/10 p-3.5 backdrop-blur-xs border border-white/10">
                <span className="text-sky-200 text-[10px] font-bold uppercase tracking-wider block">Data de Início</span>
                <span className="text-base font-black font-mono mt-1 block">{new Date(myLicense.data_inicio || Date.now()).toLocaleDateString('pt-AO')}</span>
              </div>

              <div className="bg-white/10 p-3.5 backdrop-blur-xs border border-white/10">
                <span className="text-sky-200 text-[10px] font-bold uppercase tracking-wider block">Data de Vencimento</span>
                <span className="text-base font-black font-mono mt-1 block">{new Date(myLicense.data_fim || Date.now()).toLocaleDateString('pt-AO')}</span>
              </div>

              <div className="bg-white/10 p-3.5 backdrop-blur-xs border border-white/10">
                <span className="text-sky-200 text-[10px] font-bold uppercase tracking-wider block">Contagem de Dias Restantes</span>
                <span className={`text-base font-black font-mono mt-1 block ${daysRemaining <= 10 ? 'text-amber-300' : 'text-emerald-300'}`}>
                  {daysRemaining} Dias Restantes
                </span>
              </div>

              <div className="bg-white/10 p-3.5 backdrop-blur-xs border border-white/10">
                <span className="text-sky-200 text-[10px] font-bold uppercase tracking-wider block">Ativado Por / Responsável</span>
                <span className="text-xs font-bold text-white mt-1 block truncate" title={myLicense.ativado_por || myLicense.activated_by}>
                  {myLicense.ativado_por || myLicense.activated_by || 'Suporte Técnico CRM'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs border-t border-white/10">
              <div className="flex items-center gap-2 text-sky-200 font-medium">
                <Info size={14} />
                <span>Após ativada no CRM, a contagem da licença expira automaticamente no período contratado.</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowOcorrenciaModal(true)}
                  className="bg-white/15 hover:bg-white/25 text-white px-3.5 py-1.5 font-bold uppercase text-[10px] tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <MessageSquare size={13} /> Reportar Ocorrência
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 border border-zinc-200 shadow-sm"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2 bg-zinc-50 rounded-lg ${stat.color}`}>
                <stat.icon size={20} />
              </div>
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Global</span>
            </div>
            <div className="text-2xl font-black text-zinc-900">{stat.value}</div>
            <div className="text-xs text-zinc-500 font-bold uppercase tracking-wider mt-1">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-zinc-200 overflow-x-auto no-scrollbar">
        {[
          { id: 'list', label: isSuperAdmin ? 'Todas Empresas' : 'Detalhes da Licença', icon: isSuperAdmin ? Building2 : ShieldCheck },
          { id: 'comprovativos', label: 'Comprovativos de Pagamento', icon: Upload },
          { id: 'ocorrencias', label: 'Ocorrências & Suporte', icon: MessageSquare },
          { id: 'plans', label: 'Planos & Recursos', icon: BadgeCent },
          ...(isSuperAdmin ? [{ id: 'dashboard', label: 'Dashboard CRM', icon: TrendingUp }] : []),
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-4 text-xs font-black uppercase tracking-widest transition-all relative min-w-max cursor-pointer ${
              activeTab === tab.id ? 'text-[#003366]' : 'text-zinc-400 hover:text-zinc-600'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
            {activeTab === tab.id && (
              <motion.div layoutId="activeTabSec" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#003366]" />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'list' && (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="bg-white border border-zinc-200 overflow-hidden shadow-sm"
          >
            <div className="p-4 bg-zinc-50 border-b border-zinc-200 flex flex-wrap gap-4 items-center justify-between">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Pesquisar por empresa ou NIF..." 
                  className="pl-10 pr-4 py-2 bg-white border border-zinc-200 text-xs focus:outline-none focus:border-[#003366] w-64 lg:w-96"
                />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowPaymentModal(true)} className="px-3 py-2 bg-[#003366] text-white text-xs font-bold flex items-center gap-2 hover:bg-[#002244] transition-colors uppercase tracking-widest cursor-pointer">
                  <Upload size={14} /> Novo Comprovativo
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-zinc-50 text-[10px] font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-200">
                    <th className="px-6 py-4">Empresa / NIF</th>
                    <th className="px-6 py-4">Tipo Licença</th>
                    <th className="px-6 py-4">Frequência</th>
                    <th className="px-6 py-4">Validade / Dias Restantes</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Ativado Por</th>
                    <th className="px-6 py-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {safeLicencas.map((lic, idx) => {
                    const days = calculateDaysRemaining(lic.data_fim);
                    return (
                      <tr key={idx} className="text-xs hover:bg-zinc-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-[#003366] text-white flex items-center justify-center font-black text-[10px]">
                              {String(lic.empresa_id || 'EP').substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-black text-zinc-900 uppercase tracking-tight">{lic.nome_empresa || lic.empresa_id}</p>
                              <p className="text-[10px] text-zinc-400 font-bold">NIF: {lic.nif || '5000000000'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-black text-zinc-700 uppercase tracking-wider">{lic.tipo_licenca || 'Profissional'}</span>
                        </td>
                        <td className="px-6 py-4 text-zinc-500 font-bold uppercase">{lic.plano || 'Mensal'}</td>
                        <td className="px-6 py-4">
                          {lic.data_fim ? (
                            <div>
                              <p className="text-[10px] font-black text-zinc-900 font-mono">{new Date(lic.data_fim).toLocaleDateString('pt-AO')}</p>
                              <p className={`text-[9px] font-black uppercase ${days <= 10 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                {days} dias restantes
                              </p>
                            </div>
                          ) : <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest italic">N/A</span>}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded ${
                            lic.status_licenca === 'activa' || lic.status_licenca === 'active' ? 'bg-emerald-100 text-emerald-700' :
                            lic.status_licenca === 'pendente' ? 'bg-amber-100 text-amber-700' :
                            lic.status_licenca === 'vencida' ? 'bg-rose-100 text-rose-700' :
                            'bg-zinc-100 text-zinc-500'
                          }`}>
                            {lic.status_licenca}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-zinc-600 font-medium">
                          {lic.ativado_por || lic.activated_by || 'Suporte CRM'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-2">
                            {isSuperAdmin && (
                              <button 
                                onClick={() => setSelectedLicense(lic)}
                                className="p-1.5 bg-zinc-100 text-zinc-600 hover:bg-[#003366] hover:text-white transition-all shadow-sm cursor-pointer"
                                title="Gerenciar Licença"
                              >
                                <ShieldCheck size={14} />
                              </button>
                            )}
                            <button
                              onClick={() => setShowPaymentModal(true)}
                              className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all shadow-sm cursor-pointer"
                              title="Pagar / Renovar"
                            >
                              <CreditCard size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {safeLicencas.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-20 text-center text-zinc-400 font-bold uppercase tracking-widest">
                        Nenhuma licença registada na base de dados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* ABA COMPROVATIVOS DE PAGAMENTO */}
        {activeTab === 'comprovativos' && (
          <motion.div
            key="comprovativos"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            <div className="bg-white border border-zinc-200 p-6 flex justify-between items-center">
              <div>
                <h3 className="text-base font-black text-[#003366] uppercase">Comprovativos de Pagamento Submetidos</h3>
                <p className="text-xs text-zinc-500">Histórico de transferências bancárias e depósitos enviados para ativação da licença.</p>
              </div>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="bg-[#003366] hover:bg-[#002244] text-white px-4 py-2 text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <Upload size={14} /> Submeter Novo Comprovativo
              </button>
            </div>

            <div className="bg-white border border-zinc-200 overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-zinc-50 text-[10px] font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-200">
                    <th className="px-6 py-4">Data / Hora</th>
                    <th className="px-6 py-4">Banco Emissor</th>
                    <th className="px-6 py-4">N.º Borderô / Transação</th>
                    <th className="px-6 py-4 text-right">Montante Pago</th>
                    <th className="px-6 py-4 text-center">Estado Validação</th>
                    <th className="px-6 py-4 text-center">Documento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-xs">
                  {safeComprovativos.map((comp, idx) => (
                    <tr key={idx} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-zinc-600">{new Date(comp.created_at || Date.now()).toLocaleString('pt-AO')}</td>
                      <td className="px-6 py-4 font-bold text-zinc-800 uppercase">{comp.banco || 'BAI / BFA'}</td>
                      <td className="px-6 py-4 font-mono font-bold text-zinc-700">{comp.numero_transacao || 'TRX-982183'}</td>
                      <td className="px-6 py-4 text-right font-mono font-black text-emerald-700">{Number(comp.montante || 65000).toLocaleString('pt-AO')} AOA</td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2.5 py-1 text-[9px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-800">
                          {comp.status || 'Aprovado / Licença Ativa'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {comp.comprovativo_url ? (
                          <a href={comp.comprovativo_url} target="_blank" rel="noreferrer" className="text-sky-700 font-bold underline text-xs">Ver Ficheiro</a>
                        ) : <span className="text-zinc-400 italic">Simulado</span>}
                      </td>
                    </tr>
                  ))}
                  {safeComprovativos.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-zinc-400 italic">Nenhum comprovativo enviado anteriormente.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* ABA OCORRÊNCIAS & SUPORTE */}
        {activeTab === 'ocorrencias' && (
          <motion.div
            key="ocorrencias"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            <div className="bg-white border border-zinc-200 p-6 flex justify-between items-center">
              <div>
                <h3 className="text-base font-black text-[#003366] uppercase">Registo de Ocorrências sobre a Licença</h3>
                <p className="text-xs text-zinc-500">Reporte erros, dúvidas sobre faturas ou solicite alteração de parâmetros da subscrição.</p>
              </div>
              <button
                onClick={() => setShowOcorrenciaModal(true)}
                className="bg-[#003366] hover:bg-[#002244] text-white px-4 py-2 text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <Plus size={14} /> Abrir Nova Ocorrência
              </button>
            </div>

            <div className="bg-white border border-zinc-200 overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-zinc-50 text-[10px] font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-200">
                    <th className="px-6 py-4">Data</th>
                    <th className="px-6 py-4">Assunto / Título</th>
                    <th className="px-6 py-4">Prioridade</th>
                    <th className="px-6 py-4">Estado</th>
                    <th className="px-6 py-4">Resposta Suporte</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-xs">
                  {safeOcorrencias.map((oc, idx) => (
                    <tr key={idx} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-zinc-500">{new Date(oc.created_at || Date.now()).toLocaleDateString('pt-AO')}</td>
                      <td className="px-6 py-4 font-bold text-zinc-800">{oc.assunto || 'Solicitação de Alteração de Dados'}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-bold uppercase">{oc.prioridade || 'Média'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-bold uppercase">{oc.status || 'Resolvido'}</span>
                      </td>
                      <td className="px-6 py-4 text-zinc-600 italic">{oc.resposta || 'Atendido pela equipa CRM de licenciamento.'}</td>
                    </tr>
                  ))}
                  {safeOcorrencias.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-zinc-400 italic">Nenhuma ocorrência registada.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* ABA PLANOS & RECURSOS */}
        {activeTab === 'plans' && (
          <motion.div
            key="plans"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
             {[
               { name: 'Básico', price: 25000, users: 5, storage: '2GB', modules: ['Faturamento', 'Dashboard Base'], color: 'zinc' },
               { name: 'Standard', price: 55000, users: 15, storage: '10GB', modules: ['Faturamento', 'RH Base', 'Stock Base'], color: 'blue' },
               { name: 'Profissional', price: 65000, users: 50, storage: '50GB', modules: ['Todos os Módulos', 'Suporte 24/7', 'Backups Hora'], color: 'emerald', featured: true },
               { name: 'Enterprise', price: 150000, users: 'Ilimitado', storage: '200GB', modules: ['Ecossistema Completo', 'API Access', 'Contas Custom'], color: 'indigo' }
             ].map((plan, i) => (
               <div key={i} className={`bg-white p-6 border ${plan.featured ? 'border-[#003366] ring-1 ring-[#003366] shadow-xl' : 'border-zinc-200'} flex flex-col relative`}>
                 {plan.featured && (
                   <div className="absolute top-0 right-0 bg-[#003366] text-white text-[8px] font-black uppercase tracking-[0.2em] px-4 py-1">
                     Recomendado
                   </div>
                 )}
                 <h4 className="text-lg font-black text-zinc-900 uppercase tracking-tight mb-2">{plan.name}</h4>
                 <div className="flex items-baseline gap-1 mb-6">
                   <span className="text-2xl font-black text-[#003366]">{plan.price.toLocaleString()}</span>
                   <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">AOA / Mês</span>
                 </div>

                 <div className="space-y-4 mb-8 flex-grow">
                   <div className="flex items-center gap-3 text-xs text-zinc-600 font-bold uppercase tracking-wider">
                     <Users size={16} className="text-zinc-400" /> {plan.users} Utilizadores
                   </div>
                   <div className="flex items-center gap-3 text-xs text-zinc-600 font-bold uppercase tracking-wider">
                     <CreditCard size={16} className="text-zinc-400" /> Pagamento Mensal/Anual
                   </div>
                   <div className="pt-4 border-t border-zinc-100">
                     <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-4">Módulos &amp; Recursos</p>
                     {plan.modules.map((m, k) => (
                       <div key={k} className="flex items-center gap-2 text-[10px] text-zinc-500 font-bold mb-2 uppercase">
                         <CheckCircle2 size={12} className="text-emerald-500" /> {m}
                       </div>
                     ))}
                   </div>
                 </div>

                 <button 
                   onClick={() => setShowApplyModal(true)}
                   className={`w-full py-3 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                     plan.featured ? 'bg-[#003366] text-white shadow-lg hover:bg-[#002244]' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-800 hover:text-white'
                   }`}
                 >
                   {myLicense.tipo_licenca === plan.name ? 'Plano Contratado' : 'Solicitar Upgrade'}
                 </button>
               </div>
             ))}
          </motion.div>
        )}

        {/* ABA DASHBOARD (SUPERADMIN) */}
        {activeTab === 'dashboard' && isSuperAdmin && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white p-6 border border-zinc-200">
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-6">Receita de Licenciamento (6 Meses)</h3>
                <div className="h-[300px] w-full min-h-[300px]">
                  <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={250}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} />
                      <Tooltip 
                        contentStyle={{ borderRadius: 0, border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(val: any) => [`${val.toLocaleString()} AOA`, 'Receita']}
                      />
                      <Bar dataKey="revenue" fill="#003366" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-white p-6 border border-zinc-200">
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-6">Distribuição de Planos</h3>
                <div className="h-[200px] w-full min-h-[200px]">
                  <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={180}>
                    <PieChart>
                      <Pie data={planUsage} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {planUsage.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Control Modal */}
      {selectedLicense && (
        <AdminActionModal 
          license={selectedLicense} 
          onClose={() => setSelectedLicense(null)}
          onSuccess={() => {
            setSelectedLicense(null);
            fetchLicencas();
          }}
        />
      )}

      {/* Apply / Upgrade Modal */}
      {showApplyModal && (
        <ApplyLicenseModal 
          onClose={() => setShowApplyModal(false)}
          onSuccess={() => {
            setShowApplyModal(false);
            fetchLicencas();
          }}
        />
      )}

      {/* Modal Enviar Comprovativo */}
      {showPaymentModal && (
        <SubmitPaymentProofModal
          empresaId={empresaId}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            setShowPaymentModal(false);
            fetchLicencas();
          }}
        />
      )}

      {/* Modal Reportar Ocorrência */}
      {showOcorrenciaModal && (
        <SubmitOcorrenciaModal
          empresaId={empresaId}
          onClose={() => setShowOcorrenciaModal(false)}
          onSuccess={() => {
            setShowOcorrenciaModal(false);
            fetchLicencas();
          }}
        />
      )}
    </div>
  );
};

// MODAL PARA SUBMETER COMPROVATIVO DE PAGAMENTO DA LICENÇA
const SubmitPaymentProofModal = ({ empresaId, onClose, onSuccess }: { empresaId?: string, onClose: () => void, onSuccess: () => void }) => {
  const [formData, setFormData] = useState({
    banco: 'Banco BAI',
    montante: 65000,
    numero_transacao: '',
    data_pagamento: new Date().toISOString().slice(0, 10),
    comprovativo_url: '',
    observacao: ''
  });
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const userRes = await supabase.auth.getUser();
      const currentUserEmail = userRes.data.user?.email || 'Utilizador';

      // Garantir UUID válido da empresa
      const targetEmpresaId = (empresaId && empresaId !== '1' && empresaId.length > 10)
        ? empresaId
        : (userRes.data.user?.id || null);

      if (!targetEmpresaId) {
        throw new Error('Identificador da empresa não disponível.');
      }

      const { error: insertError } = await supabase.from('historico_licencas').insert([{
        empresa_id: targetEmpresaId,
        acao: 'COMPROVATIVO_PAGAMENTO',
        descricao: `Comprovativo de Pagamento - Banco: ${formData.banco} | Ref/Transação: ${formData.numero_transacao} | Valor: ${formData.montante} Kz`,
        motivo: 'Registo de Comprovativo de Pagamento',
        usuario: currentUserEmail,
        alterado_por: currentUserEmail,
        status: 'PENDENTE',
        metadata: {
          banco: formData.banco,
          valor: Number(formData.montante),
          numero_transacao: formData.numero_transacao,
          data_pagamento: formData.data_pagamento,
          comprovativo_url: formData.comprovativo_url || null,
          observacoes: formData.observacao || `Comprovativo ${formData.banco} (${formData.numero_transacao})`,
          status_novo: 'pendente_validacao'
        }
      }]);

      if (insertError) {
        console.error('[LicencasModule] Erro ao inserir no Supabase:', insertError);
        throw insertError;
      }

      toast.success('Comprovativo de pagamento enviado com sucesso para a validação no CRM!');
      onSuccess();
    } catch (err: any) {
      console.error('[LicencasModule] Erro ao submeter comprovativo:', err);
      toast.error(`Erro ao enviar comprovativo: ${err.message || 'Erro de comunicação'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white w-full max-w-xl shadow-2xl border border-zinc-200 overflow-hidden">
        <div className="bg-[#003366] p-6 text-white flex justify-between items-center">
          <div>
            <h3 className="text-lg font-black uppercase tracking-wider">Enviar Comprovativo de Pagamento</h3>
            <p className="text-[10px] text-sky-200 font-bold uppercase mt-1">Ativação e Renovação Automática da Licença</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 transition-colors text-white cursor-pointer"><XCircle size={24} /></button>
        </div>

        {/* DADOS BANCÁRIOS */}
        <div className="bg-sky-50 p-4 border-b border-sky-150 text-xs space-y-2">
          <span className="font-black text-[#003366] uppercase text-[10px] tracking-wider block">Coordenadas Bancárias para Transferência / Depósito:</span>
          <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
            <div className="bg-white p-2 border border-sky-200">
              <span className="font-bold text-slate-500 block text-[9px]">BAI</span>
              <span className="font-bold text-slate-800">AO06 0040 0000 1234 5678 1019 1</span>
            </div>
            <div className="bg-white p-2 border border-sky-200">
              <span className="font-bold text-slate-500 block text-[9px]">BFA</span>
              <span className="font-bold text-slate-800">AO06 0006 0000 9876 5432 1012 3</span>
            </div>
            <div className="bg-white p-2 border border-sky-200">
              <span className="font-bold text-slate-500 block text-[9px]">BIC</span>
              <span className="font-bold text-slate-800">AO06 0055 0000 4567 8901 1014 5</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-zinc-700 uppercase mb-1">Banco Emissor</label>
              <select value={formData.banco} onChange={e => setFormData({...formData, banco: e.target.value})} className="w-full bg-zinc-50 border border-zinc-300 p-2.5 font-bold">
                <option value="Banco BAI">Banco BAI</option>
                <option value="Banco BFA">Banco BFA</option>
                <option value="Banco BIC">Banco BIC</option>
                <option value="Banco Millennium Atlântico">Banco Millennium Atlântico</option>
                <option value="Multicaixa Express">Multicaixa Express</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-zinc-700 uppercase mb-1">Montante Pago (AOA)</label>
              <input type="number" min="0" value={formData.montante} onChange={e => setFormData({...formData, montante: Number(e.target.value)})} className="w-full bg-zinc-50 border border-zinc-300 p-2.5 font-mono font-bold text-emerald-700" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-zinc-700 uppercase mb-1">N.º Borderô / Transação</label>
              <input type="text" placeholder="EX: TRX-992182" value={formData.numero_transacao} onChange={e => setFormData({...formData, numero_transacao: e.target.value})} className="w-full bg-zinc-50 border border-zinc-300 p-2.5 font-mono font-bold" required />
            </div>
            <div>
              <label className="block font-bold text-zinc-700 uppercase mb-1">Data do Pagamento</label>
              <input type="date" value={formData.data_pagamento} onChange={e => setFormData({...formData, data_pagamento: e.target.value})} className="w-full bg-zinc-50 border border-zinc-300 p-2.5 font-bold" required />
            </div>
          </div>

          <div>
            <label className="block font-bold text-zinc-700 uppercase mb-1">Anexar Comprovativo (PDF / JPG)</label>
            <input type="file" onChange={() => setFormData({...formData, comprovativo_url: 'https://demo.comprovativo.pdf'})} className="w-full bg-zinc-50 border border-zinc-300 p-2 text-xs" />
          </div>

          <div>
            <label className="block font-bold text-zinc-700 uppercase mb-1">Observações</label>
            <textarea value={formData.observacao} onChange={e => setFormData({...formData, observacao: e.target.value})} rows={2} className="w-full bg-zinc-50 border border-zinc-300 p-2 text-xs" placeholder="Ex: Pagamento referente à licença anual da empresa..." />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-zinc-500 font-bold uppercase tracking-wider">Cancelar</button>
            <button type="submit" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 font-bold uppercase tracking-widest shadow-md">
              {submitting ? 'A enviar...' : 'Enviar Comprovativo'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// MODAL SUBMETER OCORRÊNCIA DA LICENÇA
const SubmitOcorrenciaModal = ({ empresaId, onClose, onSuccess }: { empresaId?: string, onClose: () => void, onSuccess: () => void }) => {
  const [assunto, setAssunto] = useState('');
  const [descricao, setDescricao] = useState('');
  const [prioridade, setPrioridade] = useState('Alta');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const userRes = await supabase.auth.getUser();
      const currentUserEmail = userRes.data.user?.email || 'Utilizador';

      const targetEmpresaId = (empresaId && empresaId !== '1' && empresaId.length > 10)
        ? empresaId
        : (userRes.data.user?.id || null);

      if (!targetEmpresaId) {
        throw new Error('Identificador da empresa não disponível.');
      }

      const { error: insertError } = await supabase.from('historico_licencas').insert([{
        empresa_id: targetEmpresaId,
        acao: `OCORRENCIA_${(tipo || 'SUPORTE').toUpperCase()}`,
        descricao: `[${prioridade || 'NORMAL'}] ${assunto}: ${descricao}`,
        motivo: assunto,
        usuario: currentUserEmail,
        alterado_por: currentUserEmail,
        status: 'ABERTO',
        metadata: {
          tipo,
          prioridade,
          assunto,
          descricao
        }
      }]);

      if (insertError) {
        console.error('[LicencasModule] Erro ao registar ocorrência:', insertError);
        throw insertError;
      }

      toast.success('Ocorrência registada com sucesso!');
      onSuccess();
    } catch (err: any) {
      console.error('[LicencasModule] Erro ao submeter ocorrência:', err);
      toast.error(`Erro ao registar ocorrência: ${err.message || 'Erro de comunicação'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-zinc-900/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white w-full max-w-md shadow-2xl border border-zinc-200 overflow-hidden">
        <div className="bg-[#003366] p-5 text-white flex justify-between items-center">
          <div>
            <h3 className="text-base font-black uppercase tracking-wider">Reportar Ocorrência sobre Licença</h3>
            <p className="text-[10px] text-sky-200 font-bold uppercase mt-0.5">Suporte Técnico de Subscrição</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 text-white cursor-pointer"><XCircle size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-zinc-700 uppercase mb-1">Assunto / Título</label>
            <input type="text" value={assunto} onChange={e => setAssunto(e.target.value)} required placeholder="Ex: Erro ao reconhecer pagamento da licença..." className="w-full bg-zinc-50 border border-zinc-300 p-2.5 font-bold" />
          </div>

          <div>
            <label className="block font-bold text-zinc-700 uppercase mb-1">Prioridade</label>
            <select value={prioridade} onChange={e => setPrioridade(e.target.value)} className="w-full bg-zinc-50 border border-zinc-300 p-2.5 font-bold">
              <option value="Baixa">Baixa</option>
              <option value="Normal">Normal</option>
              <option value="Alta">Alta</option>
              <option value="Urgente">Urgente</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-zinc-700 uppercase mb-1">Descrição do Problema</label>
            <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={4} required placeholder="Descreva os detalhes da ocorrência..." className="w-full bg-zinc-50 border border-zinc-300 p-2.5 text-xs" />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
            <button type="button" onClick={onClose} className="px-4 py-2 text-zinc-500 font-bold uppercase">Cancelar</button>
            <button type="submit" disabled={submitting} className="bg-[#003366] text-white px-5 py-2 font-bold uppercase">
              {submitting ? 'A submeter...' : 'Submeter'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const ApplyLicenseModal = ({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) => {
  const [formData, setFormData] = useState({
    tipo_licenca: 'Profissional',
    plano: 'Mensal',
    periodo_meses: 1,
    valor_licenca: 65000,
    observacao: '',
    comprovativo_url: ''
  });
  const [uploading, setUploading] = useState(false);

  const plansPrices: any = {
    'Básico': 25000,
    'Standard': 55000,
    'Profissional': 65000,
    'Enterprise': 150000
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/licencas/solicitar', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        toast.success('Solicitação enviada com sucesso! Aguarde a validação do administrador no CRM.');
        onSuccess();
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao enviar solicitação');
    }
  };

  return (
    <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white w-full max-w-xl shadow-2xl border border-zinc-200 overflow-hidden">
        <div className="bg-[#003366] p-6 text-white flex justify-between items-center">
          <div>
            <h3 className="text-lg font-black uppercase tracking-widest">Solicitar Alteração / Upgrade de Licença</h3>
            <p className="text-[10px] text-sky-200 font-bold uppercase tracking-wider mt-1">Mudança de Plano ou Extensão de Prazo</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 transition-colors text-white cursor-pointer"><XCircle size={24} /></button>
        </div>

        <form onSubmit={handleApply} className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Pacote de Licença</label>
              <select 
                value={formData.tipo_licenca} 
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData(p => ({ ...p, tipo_licenca: val, valor_licenca: plansPrices[val] }));
                }}
                className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#003366]"
              >
                {Object.keys(plansPrices).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Frequência da Subscrição</label>
              <select 
                value={formData.plano} 
                onChange={(e) => setFormData(p => ({ ...p, plano: e.target.value, periodo_meses: e.target.value === 'Mensal' ? 1 : e.target.value === 'Anual' ? 12 : 3 }))}
                className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-[#003366]"
              >
                <option value="Mensal">Mensal</option>
                <option value="Trimestral">Trimestral</option>
                <option value="Anual">Anual (Desconto 15%)</option>
              </select>
            </div>
          </div>

          <div className="bg-sky-50 p-6 border-l-4 border-[#003366] flex justify-between items-center">
             <div>
               <p className="text-[10px] font-black text-[#003366] uppercase tracking-widest">Valor do Licenciamento</p>
               <p className="text-2xl font-black text-[#003366] font-mono">{formData.valor_licenca.toLocaleString('pt-AO')} AOA</p>
             </div>
             <CreditCard size={32} className="text-[#003366]/30" />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Notas / Motivo do Pedido</label>
            <textarea 
               value={formData.observacao}
               onChange={(e) => setFormData(p => ({ ...p, observacao: e.target.value }))}
               className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2 text-xs font-medium focus:outline-none focus:border-[#003366]" 
               rows={3}
               placeholder="Ex: Necessitamos de acesso ao módulo de inventário e aumento de limite de utilizadores..."
            />
          </div>

          <div className="flex gap-4 pt-4 border-t border-zinc-100">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:bg-zinc-100 transition-colors border border-zinc-200 cursor-pointer"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={uploading}
              className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest bg-[#003366] text-white hover:bg-[#002244] shadow-lg transition-all cursor-pointer"
            >
              Enviar Solicitação
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const AdminActionModal = ({ license, onClose, onSuccess }: { license: any, onClose: () => void, onSuccess: () => void }) => {
  const [motivo, setMotivo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleAction = async (acao: string) => {
    if (confirm(`Tem certeza que deseja ${acao} esta licença?`)) {
      setSubmitting(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch('/api/licencas/acao', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || ''}`
          },
          body: JSON.stringify({ id: license.id, acao, motivo })
        });
        
        // Sincronização segura via API de Licenciamento CRM
        if (acao === 'activar' && license.empresa_id) {
          await fetch(`/api/crm/companies/${license.empresa_id}/activate-license`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token || ''}`
            },
            body: JSON.stringify({ duracao_dias: 30, plano: license.tipo_licenca || 'Profissional' })
          }).catch(console.warn);
        }

        toast.success('Operação realizada e sincronizada no Supabase com sucesso!');
        onSuccess();
      } catch (err) {
        console.error(err);
        toast.error('Erro na operação.');
      } finally {
        setSubmitting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
       <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white w-full max-w-lg shadow-2xl border border-zinc-200 overflow-hidden">
        <div className="bg-[#003366] p-6 text-white">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-black uppercase tracking-widest">Painel de Controlo da Licença CRM</h3>
            <button onClick={onClose} className="p-1 hover:bg-white/10 text-white cursor-pointer"><XCircle size={24} /></button>
          </div>
          <p className="text-[10px] text-sky-200 font-bold uppercase tracking-wider mt-2">Empresa ID: {license.empresa_id}</p>
        </div>

        <div className="p-8 space-y-6">
           <div className="grid grid-cols-2 gap-4">
             <div className="p-4 bg-zinc-50 border border-zinc-100">
               <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-1">Pacote Atual</p>
               <p className="text-sm font-black text-zinc-900 uppercase">{license.tipo_licenca || 'Profissional'}</p>
             </div>
             <div className="p-4 bg-zinc-50 border border-zinc-100">
               <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-1">Frequência</p>
               <p className="text-sm font-black text-zinc-900 uppercase">{license.plano || 'Mensal'}</p>
             </div>
           </div>

           <div className="space-y-1">
             <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Motivação / Justificativa</label>
             <textarea 
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Introduza um motivo para ativação, bloqueio ou renovação..."
                className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2 text-xs font-medium focus:outline-none focus:border-[#003366]" 
                rows={3}
             />
           </div>

           <div className="grid grid-cols-2 gap-4 pt-4">
              {license.status_licenca !== 'activa' && (
                <button 
                  onClick={() => handleAction('activar')}
                  disabled={submitting}
                  className="flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest shadow-lg cursor-pointer"
                >
                  <CheckCircle2 size={16} /> Ativar Licença Agora
                </button>
              )}
              {license.status_licenca !== 'bloqueada' && (
                <button 
                  onClick={() => handleAction('bloquear')}
                  disabled={submitting}
                  className="flex items-center justify-center gap-2 py-3.5 bg-zinc-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-widest shadow-lg cursor-pointer"
                >
                  <ShieldAlert size={16} /> Bloquear Empresa
                </button>
              )}
           </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LicencasModule;
