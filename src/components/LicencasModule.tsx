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
  BadgeCent
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';

interface LicencasModuleProps {
  user: any;
  userProfile: any;
}

const LicencasModule: React.FC<LicencasModuleProps> = ({ user, userProfile }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [licencas, setLicencas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState<any>(null);

  useEffect(() => {
    setIsSuperAdmin(userProfile?.role === 'super_admin' || userProfile?.role === 'superadmin');
    fetchLicencas();
  }, [userProfile]);

  const fetchLicencas = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/licencas', {
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLicencas(data);
      }
    } catch (error) {
      console.error("Erro ao buscar licenças:", error);
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    { label: 'Licenças Ativas', value: licencas.filter(l => l.status_licenca === 'activa').length, icon: ShieldCheck, color: 'text-emerald-600' },
    { label: 'Pendentes', value: licencas.filter(l => l.status_licenca === 'pendente').length, icon: Clock, color: 'text-amber-600' },
    { label: 'Vencidas/Bloqueadas', value: licencas.filter(l => l.status_licenca === 'vencida' || l.status_licenca === 'bloqueada').length, icon: AlertOctagon, color: 'text-red-600' },
    { label: 'Valor Total (Mês)', value: licencas.filter(l => l.status_licenca === 'activa').reduce((acc, curr) => acc + Number(curr.valor_licenca || 0), 0).toLocaleString() + ' AOA', icon: BadgeCent, color: 'text-blue-600' },
  ];

  const chartData = [
    { name: 'Jan', revenue: 1500000 },
    { name: 'Fev', revenue: 2100000 },
    { name: 'Mar', revenue: 1800000 },
    { name: 'Abr', revenue: 2400000 },
    { name: 'Mai', revenue: 2900000 },
  ];

  const planUsage = [
    { name: 'Básico', value: licencas.filter(l => l.tipo_licenca === 'Básico').length },
    { name: 'Professional', value: licencas.filter(l => l.tipo_licenca === 'Profissional').length },
    { name: 'Enterprise', value: licencas.filter(l => l.tipo_licenca === 'Enterprise').length },
  ].filter(p => p.value > 0);

  const COLORS = ['#003366', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-black text-[#003366] flex items-center gap-3">
            <Key size={28} />
            Gestão de Licenciamento
          </h2>
          <p className="text-zinc-500 text-sm">Controlo de validade, planos e permissões do ecossistema.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchLicencas} className="p-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition-colors">
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
          {!isSuperAdmin && (
            <button 
              onClick={() => setShowApplyModal(true)}
              className="bg-[#003366] text-white px-4 py-2 text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-md hover:bg-[#002244] transition-all"
            >
              <Plus size={16} /> Solicitar Upgrade
            </button>
          )}
        </div>
      </header>

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
          { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
          { id: 'list', label: isSuperAdmin ? 'Todas Empresas' : 'Minhas Licenças', icon: isSuperAdmin ? Building2 : ShieldCheck },
          { id: 'history', label: 'Histórico Completo', icon: History },
          { id: 'plans', label: 'Planos & Recursos', icon: BadgeCent },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-4 text-xs font-black uppercase tracking-widest transition-all relative min-w-max ${
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
        {activeTab === 'dashboard' && (
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
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
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

              <div className="bg-white p-6 border border-zinc-200">
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-6">Alertas Críticos</h3>
                <div className="space-y-3">
                  {licencas.filter(l => l.status_licenca === 'vencida').map((l, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-red-50 border-l-4 border-red-500">
                      <div className="flex items-center gap-3">
                        <ShieldAlert className="text-red-600" size={18} />
                        <div>
                          <p className="text-xs font-black text-red-900 uppercase">Empresa Vencida: {l.empresa_id}</p>
                          <p className="text-[10px] text-red-600 font-bold uppercase">Expira em: {new Date(l.data_fim).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <button className="text-[10px] font-black text-red-700 underline uppercase tracking-widest">Resolver</button>
                    </div>
                  ))}
                  {licencas.filter(l => l.status_licenca === 'pendente').map((l, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-amber-50 border-l-4 border-amber-500">
                      <div className="flex items-center gap-3">
                        <Clock className="text-amber-600" size={18} />
                        <div>
                          <p className="text-xs font-black text-amber-900 uppercase">Activação Pendente: {l.empresa_id}</p>
                          <p className="text-[10px] text-amber-600 font-bold uppercase">Solicitado por: {l.usuario_solicitante}</p>
                        </div>
                      </div>
                      <button className="text-[10px] font-black text-amber-700 underline uppercase tracking-widest">Analisar</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white p-6 border border-zinc-200">
                <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-6">Distribuição de Planos</h3>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={planUsage}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {planUsage.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2">
                  {planUsage.map((p, i) => (
                    <div key={i} className="flex justify-between items-center text-xs">
                      <span className="flex items-center gap-2 font-bold text-zinc-500 uppercase tracking-widest">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        {p.name}
                      </span>
                      <span className="font-black text-zinc-900">{p.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-zinc-200">
                <div className="p-4 border-b border-zinc-100 flex justify-between items-center">
                  <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Últimas Atividades</h3>
                  <History size={14} className="text-zinc-400" />
                </div>
                <div className="divide-y divide-zinc-50">
                  {licencas.flatMap(l => l.historico_licencas || []).slice(0, 5).map((log, k) => (
                    <div key={k} className="p-4 hover:bg-zinc-50 transition-colors">
                      <div className="flex items-center gap-3 mb-1">
                        <div className={`p-1.5 rounded-full ${
                          log.acao === 'Solicitação' ? 'bg-amber-100 text-amber-600' :
                          log.acao === 'Ativação' ? 'bg-emerald-100 text-emerald-600' :
                          'bg-red-100 text-red-600'
                        }`}>
                          {log.acao === 'Ativação' ? <CheckCircle2 size={12} /> : log.acao === 'Solicitação' ? <Clock size={12} /> : <AlertOctagon size={12} />}
                        </div>
                        <span className="text-[10px] font-black text-zinc-900 uppercase tracking-widest">{log.acao}</span>
                        <span className="text-[8px] text-zinc-400 ml-auto font-bold uppercase">{new Date(log.data_evento).toLocaleDateString()}</span>
                      </div>
                      <p className="text-[10px] text-zinc-500 font-medium leading-relaxed">{log.descricao}</p>
                    </div>
                  ))}
                </div>
                <button className="w-full py-3 text-[10px] font-black text-[#003366] uppercase tracking-[0.2em] border-t border-zinc-100 hover:bg-zinc-50 transition-colors">
                  Ver Todo o Log
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'list' && (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="bg-white border border-zinc-200 overflow-hidden"
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
                <button className="px-3 py-2 bg-white border border-zinc-200 text-xs font-bold text-zinc-600 flex items-center gap-2 hover:bg-zinc-50 transition-colors uppercase tracking-widest">
                  <Filter size={14} /> Filtros
                </button>
                <button className="px-3 py-2 bg-white border border-zinc-200 text-xs font-bold text-zinc-600 flex items-center gap-2 hover:bg-zinc-50 transition-colors uppercase tracking-widest">
                  <Download size={14} /> Exportar
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-zinc-50 text-[10px] font-black text-zinc-500 uppercase tracking-widest border-b border-zinc-200">
                    <th className="px-6 py-4">Empresa / ID</th>
                    <th className="px-6 py-4">Tipo Licença</th>
                    <th className="px-6 py-4">Plano</th>
                    <th className="px-6 py-4">Validade</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Valor</th>
                    <th className="px-6 py-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {licencas.map((lic, idx) => (
                    <tr key={idx} className="text-xs hover:bg-zinc-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-[#003366] text-white flex items-center justify-center font-black text-[10px]">
                            {lic.empresa_id.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-black text-zinc-900 uppercase tracking-tight">{lic.empresa_id}</p>
                            <p className="text-[10px] text-zinc-400 font-bold">Desde: {new Date(lic.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-black text-zinc-600 uppercase tracking-wider">{lic.tipo_licenca}</span>
                      </td>
                      <td className="px-6 py-4 text-zinc-500 font-bold uppercase">{lic.plano}</td>
                      <td className="px-6 py-4">
                        {lic.data_fim ? (
                          <div>
                            <p className="text-[10px] font-black text-zinc-900">{new Date(lic.data_fim).toLocaleDateString()}</p>
                            <p className="text-[8px] font-bold text-zinc-400 uppercase">
                              {Math.max(0, Math.ceil((new Date(lic.data_fim).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} dias restantes
                            </p>
                          </div>
                        ) : <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest italic">N/A</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded ${
                          lic.status_licenca === 'activa' ? 'bg-emerald-100 text-emerald-600' :
                          lic.status_licenca === 'pendente' ? 'bg-amber-100 text-amber-600' :
                          lic.status_licenca === 'vencida' ? 'bg-red-100 text-red-600' :
                          'bg-zinc-100 text-zinc-500'
                        }`}>
                          {lic.status_licenca}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-black text-zinc-900">
                        {Number(lic.valor_licenca).toLocaleString()} AOA
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => setSelectedLicense(lic)}
                            className="p-1.5 bg-zinc-100 text-zinc-600 hover:bg-[#003366] hover:text-white transition-all shadow-sm"
                            title="Gerenciar Licença"
                          >
                            <ShieldCheck size={14} />
                          </button>
                          {lic.comprovativo_url && (
                            <a 
                              href={lic.comprovativo_url}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 bg-zinc-100 text-zinc-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                              title="Ver Comprovativo"
                            >
                              <FileText size={14} />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {licencas.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-20 text-center text-zinc-400 font-bold uppercase tracking-widest">
                        Nenhuma licença encontrada na base de dados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === 'plans' && (
          <motion.div
            key="plans"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
             {[
               { name: 'Básico', price: 25000, users: 5, storage: '2GB', modules: ['Faturamento', 'Dashboard Base'], color: 'zinc' },
               { name: 'Standard', price: 55000, users: 15, storage: '10GB', modules: ['Faturamento', 'RH Base', 'Stock Base'], color: 'blue' },
               { name: 'Profissional', price: 120000, users: 50, storage: '50GB', modules: ['Todos os Módulos', 'Suporte 24/7', 'Backups Hora'], color: 'emerald', featured: true },
               { name: 'Enterprise', price: 250000, users: 'Ilimitado', storage: '200GB', modules: ['Ecossistema Completo', 'API Access', 'Contas Custom'], color: 'indigo' }
             ].map((plan, i) => (
               <div key={i} className={`bg-white p-8 border ${plan.featured ? 'border-[#003366] ring-1 ring-[#003366] shadow-xl' : 'border-zinc-200'} flex flex-col relative`}>
                 {plan.featured && (
                   <div className="absolute top-0 right-0 bg-[#003366] text-white text-[8px] font-black uppercase tracking-[0.2em] px-4 py-1">
                     Recomendado
                   </div>
                 )}
                 <h4 className="text-xl font-black text-zinc-900 uppercase tracking-tight mb-2">{plan.name}</h4>
                 <div className="flex items-baseline gap-1 mb-6">
                   <span className="text-3xl font-black text-[#003366]">{plan.price.toLocaleString()}</span>
                   <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">AOA / Mês</span>
                 </div>

                 <div className="space-y-4 mb-10 flex-grow">
                   <div className="flex items-center gap-3 text-xs text-zinc-600 font-bold uppercase tracking-wider">
                     <Users size={16} className="text-zinc-400" /> {plan.users} Utilizadores
                   </div>
                   <div className="flex items-center gap-3 text-xs text-zinc-600 font-bold uppercase tracking-wider">
                     <CreditCard size={16} className="text-zinc-400" /> Pagamento Mensal/Anual
                   </div>
                   <div className="pt-4 border-t border-zinc-100">
                     <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-4">Módulos & Recursos</p>
                     {plan.modules.map((m, k) => (
                       <div key={k} className="flex items-center gap-2 text-[10px] text-zinc-500 font-bold mb-2 uppercase">
                         <CheckCircle2 size={12} className="text-emerald-500" /> {m}
                       </div>
                     ))}
                   </div>
                 </div>

                 <button className={`w-full py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                   plan.featured ? 'bg-[#003366] text-white shadow-lg' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-800 hover:text-white'
                 }`}>
                   {userProfile?.pacote_licenca === plan.name ? 'Plano Atual' : 'Contratar Agora'}
                 </button>
               </div>
             ))}
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

      {/* Apply Modal */}
      {showApplyModal && (
        <ApplyLicenseModal 
          onClose={() => setShowApplyModal(false)}
          onSuccess={() => {
            setShowApplyModal(false);
            fetchLicencas();
          }}
        />
      )}
    </div>
  );
};

const ApplyLicenseModal = ({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) => {
  const [formData, setFormData] = useState({
    tipo_licenca: 'Básico',
    plano: 'Mensal',
    periodo_meses: 1,
    valor_licenca: 25000,
    observacao: '',
    comprovativo_url: ''
  });
  const [uploading, setUploading] = useState(false);

  const plansPrices: any = {
    'Básico': 25000,
    'Standard': 55000,
    'Profissional': 120000,
    'Enterprise': 250000
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/licencas/solicitar', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        alert('Solicitação enviada! Aguarde a validação do administrador.');
        onSuccess();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage.from('documents').upload(`proofs/${fileName}`, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(data.path);
      setFormData(prev => ({ ...prev, comprovativo_url: publicUrl }));
    } catch (err) {
      console.error(err);
      alert('Erro no upload');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-xl shadow-2xl border border-zinc-200 overflow-hidden"
      >
        <div className="bg-[#003366] p-6 text-white flex justify-between items-center">
          <div>
            <h3 className="text-lg font-black uppercase tracking-widest">Solicitar Licença</h3>
            <p className="text-[10px] text-blue-200 font-bold uppercase tracking-wider mt-1">Upgrade ou Renovação de Plano</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 transition-colors">
            <XCircle size={24} />
          </button>
        </div>

        <form onSubmit={handleApply} className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Pacote</label>
              <select 
                value={formData.tipo_licenca} 
                onChange={(e) => {
                  const val = e.target.value;
                  setFormData(p => ({ ...p, tipo_licenca: val, valor_licenca: plansPrices[val] }));
                }}
                className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2 text-xs font-bold focus:outline-none focus:border-[#003366]"
              >
                {Object.keys(plansPrices).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Frequência</label>
              <select 
                value={formData.plano} 
                onChange={(e) => setFormData(p => ({ ...p, plano: e.target.value, periodo_meses: e.target.value === 'Mensal' ? 1 : e.target.value === 'Anual' ? 12 : 3 }))}
                className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2 text-xs font-bold focus:outline-none focus:border-[#003366]"
              >
                <option value="Mensal">Mensal</option>
                <option value="Trimestral">Trimestral</option>
                <option value="Anual">Anual</option>
              </select>
            </div>
          </div>

          <div className="bg-blue-50 p-6 border-l-4 border-[#003366] flex justify-between items-center">
             <div>
               <p className="text-[10px] font-black text-[#003366] uppercase tracking-widest">Valor a Pagar</p>
               <p className="text-2xl font-black text-[#003366]">{formData.valor_licenca.toLocaleString()} AOA</p>
             </div>
             <CreditCard size={32} className="text-[#003366]/20" />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Anexar Comprovativo (PDF/PNG/JPG)</label>
            <div className="flex gap-4">
              <label className="flex-1 border-2 border-dashed border-zinc-200 p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-zinc-50 transition-colors">
                <Upload size={24} className="text-zinc-400" />
                <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">
                  {uploading ? 'A enviar...' : formData.comprovativo_url ? 'Alterar Ficheiro' : 'Escolher Ficheiro'}
                </span>
                <input type="file" className="hidden" onChange={handleFileUpload} accept="application/pdf,image/*" />
              </label>
              {formData.comprovativo_url && (
                <div className="w-24 h-24 bg-zinc-100 border border-zinc-200 flex items-center justify-center relative group">
                  <CheckCircle2 size={32} className="text-emerald-500" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <XCircle size={20} className="text-white cursor-pointer" onClick={() => setFormData(p => ({...p, comprovativo_url: ''}))} />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Notas / Observação</label>
            <textarea 
               value={formData.observacao}
               onChange={(e) => setFormData(p => ({ ...p, observacao: e.target.value }))}
               className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2 text-xs font-medium focus:outline-none focus:border-[#003366]" 
               rows={3}
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:bg-zinc-100 transition-colors border border-zinc-200"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={uploading}
              className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest bg-[#003366] text-white hover:bg-[#002244] shadow-lg transition-all"
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
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({ id: license.id, acao, motivo })
        });
        if (res.ok) {
          alert('Operação realizada com sucesso!');
          onSuccess();
        } else {
          const err = await res.json();
          alert('Erro: ' + (err.error || 'Falha na operação'));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setSubmitting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
       <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-lg shadow-2xl border border-zinc-200 overflow-hidden"
      >
        <div className="bg-[#003366] p-6 text-white">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-black uppercase tracking-widest">Painel de Controlo de Licença</h3>
            <button onClick={onClose} className="p-1 hover:bg-white/10">
              <XCircle size={24} />
            </button>
          </div>
          <p className="text-[10px] text-blue-200 font-bold uppercase tracking-wider mt-2">Empresa ID: {license.empresa_id}</p>
        </div>

        <div className="p-8 space-y-6">
           <div className="grid grid-cols-2 gap-4">
             <div className="p-4 bg-zinc-50 border border-zinc-100">
               <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-1">Pacote Atual</p>
               <p className="text-sm font-black text-zinc-900 uppercase">{license.tipo_licenca}</p>
             </div>
             <div className="p-4 bg-zinc-50 border border-zinc-100">
               <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-1">Frequência</p>
               <p className="text-sm font-black text-zinc-900 uppercase">{license.plano}</p>
             </div>
           </div>

           {license.status_licenca === 'pendente' && license.comprovativo_url && (
              <div className="p-4 bg-emerald-50 border border-emerald-100 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                   <FileText className="text-emerald-600" />
                   <p className="text-[10px] font-black text-emerald-900 uppercase tracking-widest">Comprovativo Disponível</p>
                 </div>
                 <a href={license.comprovativo_url} target="_blank" rel="noreferrer" className="text-[9px] font-black text-white bg-emerald-600 px-3 py-1 uppercase tracking-widest shadow-sm">Ver Documento</a>
              </div>
           )}

           <div className="space-y-1">
             <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Motivação / Justificativa</label>
             <textarea 
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Introduza um motivo para bloqueio ou cancelamento..."
                className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2 text-xs font-medium focus:outline-none focus:border-[#003366]" 
                rows={3}
             />
           </div>

           <div className="grid grid-cols-2 gap-4 pt-4">
              {license.status_licenca !== 'activa' && (
                <button 
                  onClick={() => handleAction('activar')}
                  disabled={submitting}
                  className="flex items-center justify-center gap-2 py-4 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-lg hover:bg-emerald-700 transition-all"
                >
                  <CheckCircle2 size={16} /> Activar Agora
                </button>
              )}
              {license.status_licenca !== 'bloqueada' && (
                <button 
                  onClick={() => handleAction('bloquear')}
                  disabled={submitting}
                  className="flex items-center justify-center gap-2 py-4 bg-zinc-900 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-lg hover:bg-black transition-all"
                >
                  <ShieldAlert size={16} /> Bloquear Empresa
                </button>
              )}
              <button 
                onClick={() => handleAction('cancelar')}
                disabled={submitting}
                className="col-span-2 py-3 text-red-600 border border-red-200 text-[10px] font-black uppercase tracking-widest hover:bg-red-50 transition-all"
              >
                Cancelar Licenciamento
              </button>
           </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LicencasModule;
