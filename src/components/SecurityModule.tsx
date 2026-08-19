import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  Shield,
  Users,
  MapPin,
  Calendar,
  AlertTriangle,
  FileText,
  TrendingUp,
  Plus,
  Search,
  Lock,
  Zap,
  Printer,
  Download,
  Truck,
  Edit2,
  Trash2,
  X,
  Clock,
  CheckCircle2,
  RefreshCw,
  BarChart2,
  Eye,
  Phone,
  Mail,
  CreditCard,
  Star,
  Clipboard,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Settings,
  Activity,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────
interface SecurityModuleProps {
  occurrences: any[];
  armory: any[];
  roster: any[];
  employees: any[];
  workSites: any[];
  onRefresh: () => void;
  empresaId?: string;
  user?: any;
  companyData?: any;
  onNavigate?: (tab: string) => void;
  onEmitirFatura?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const fmt = (v: number) => v.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA', minimumFractionDigits: 0, maximumFractionDigits: 0 });

async function apiPost(url: string, body: any) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function apiDelete(url: string) {
  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const cleanDate = (d: any): string | null => (d && typeof d === 'string' && d.trim() !== '') ? d.trim() : null;
const cleanNum = (n: any, fallback: number | null = null): number | null => (n !== '' && n !== null && n !== undefined && !isNaN(Number(n))) ? Number(n) : fallback;
const cleanUUID = (id: any): string | null => (id && typeof id === 'string' && id.trim() !== '' && id.length > 10) ? id.trim() : null;

// ─────────────────────────────────────────────────────────────────────────────
// CAMPO REUTILIZÁVEL
// ─────────────────────────────────────────────────────────────────────────────
const Field = ({ label, children, half }: { label: string; children: React.ReactNode; half?: boolean }) => (
  <div className={half ? 'col-span-1' : 'col-span-2'}>
    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-1">{label}</label>
    {children}
  </div>
);

const Input = ({ ...props }) => (
  <input {...props} className="w-full border border-zinc-300 bg-zinc-50 p-2.5 text-xs font-bold focus:outline-none focus:border-[#003366] focus:ring-1 focus:ring-[#003366]/20 transition-all" />
);

const Select = ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) => (
  <select {...props} className="w-full border border-zinc-300 bg-zinc-50 p-2.5 text-xs font-bold focus:outline-none focus:border-[#003366] transition-all">
    {children}
  </select>
);

const Textarea = ({ ...props }) => (
  <textarea {...props} className="w-full border border-zinc-300 bg-zinc-50 p-2.5 text-xs font-medium focus:outline-none focus:border-[#003366] resize-none transition-all" />
);

// ─────────────────────────────────────────────────────────────────────────────
// TABS
// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
  { id: 'guards', label: 'Vigilantes', icon: Users },
  { id: 'sites', label: 'Postos / Clientes', icon: MapPin },
  { id: 'roster', label: 'Escalas', icon: Calendar },
  { id: 'armory', label: 'Armaria', icon: Lock },
  { id: 'patrol', label: 'Patrulhas & Viaturas', icon: Truck },
  { id: 'incidents', label: 'Ocorrências', icon: AlertTriangle },
  { id: 'reports', label: 'Relatórios', icon: FileText },
];

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
const SecurityModule: React.FC<SecurityModuleProps> = ({
  occurrences = [], armory = [], roster = [], employees = [], workSites = [], onRefresh, empresaId,
  user, companyData, onNavigate, onEmitirFatura
}) => {
  const [activeTab, setActiveTab] = useState('dashboard');

  // Modal states
  const [showGuardModal, setShowGuardModal] = useState(false);
  const [showSiteModal, setShowSiteModal] = useState(false);
  const [showRosterModal, setShowRosterModal] = useState(false);
  const [showArmoryModal, setShowArmoryModal] = useState(false);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Local state for SGP-specific data (guards, sites loaded from security endpoints)
  const [guards, setGuards] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [loadingGuards, setLoadingGuards] = useState(false);
  const [loadingSites, setLoadingSites] = useState(false);

  const eid = empresaId || (employees[0]?.empresa_id) || (armory[0]?.empresa_id) || '';

  const fetchGuards = useCallback(async () => {
    if (!eid) return;
    setLoadingGuards(true);
    try {
      const { data } = await supabase
        .from('seg_vigilantes')
        .select('*')
        .eq('empresa_id', eid)
        .is('deleted_at', null)
        .order('nome');
      setGuards(Array.isArray(data) ? data : []);
    } catch { setGuards([]); } finally { setLoadingGuards(false); }
  }, [eid]);

  const fetchSites = useCallback(async () => {
    if (!eid) return;
    setLoadingSites(true);
    try {
      const { data } = await supabase
        .from('seg_postos')
        .select('*')
        .eq('empresa_id', eid)
        .is('deleted_at', null)
        .order('nome');
      setSites(Array.isArray(data) ? data : []);
    } catch { setSites([]); } finally { setLoadingSites(false); }
  }, [eid]);

  useEffect(() => {
    fetchGuards();
    fetchSites();
  }, [fetchGuards, fetchSites]);

  const handleRefreshAll = () => {
    fetchGuards();
    fetchSites();
    onRefresh();
  };

  // KPIs
  const totalGuards = guards.length || employees.length;
  const activeGuards = guards.filter((g: any) => g.status === 'ativo').length || employees.filter((e: any) => e.status === 'active').length;
  const activeSites = sites.length || workSites.length;
  const totalIncidents = occurrences.length;
  const criticalIncidents = occurrences.filter((o: any) => o.severidade === 'Crítica' || o.severity === 'Crítica').length;
  const totalArmory = armory.length;
  const availableArmory = armory.filter((a: any) => a.status === 'disponivel').length;
  const activeRosters = roster.length;

  const handleDelete = async (table: string, id: string, label: string) => {
    if (!window.confirm(`Apagar "${label}"?`)) return;
    const tableMap: Record<string, string> = {
      guards: 'seg_vigilantes',
      sites: 'seg_postos',
      roster: 'seg_escalas',
      armory: 'seg_armaria',
      occurrences: 'seg_ocorrencias',
    };
    const supabaseTable = tableMap[table] || table;
    try {
      const { error } = await supabase.from(supabaseTable).update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      fetchGuards();
      fetchSites();
      onRefresh();
    } catch (err: any) { alert('Erro ao apagar: ' + (err?.message || 'desconhecido')); }
  };

  const sevCounts = { 'Baixa': 0, 'Média': 0, 'Alta': 0, 'Crítica': 0 };
  occurrences.forEach((o: any) => {
    const s = o.severidade || o.severity || 'Média';
    if (s in sevCounts) (sevCounts as any)[s]++;
  });
  const pieData = Object.entries(sevCounts).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  const pieColors = ['#22c55e', '#f59e0b', '#ef4444', '#7c3aed'];

  const monthlyData = (() => {
    const m: Record<string, { name: string; ocorrencias: number; escalas: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const name = d.toLocaleDateString('pt-PT', { month: 'short' });
      m[key] = { name, ocorrencias: 0, escalas: 0 };
    }
    occurrences.forEach((o: any) => {
      const k = (o.created_at || '').substring(0, 7);
      if (m[k]) m[k].ocorrencias++;
    });
    roster.forEach((r: any) => {
      const k = (r.data_servico || r.created_at || '').substring(0, 7);
      if (m[k]) m[k].escalas++;
    });
    return Object.values(m);
  })();

  const openEdit = (item: any, modal: string) => {
    setEditingItem(item);
    if (modal === 'guard') setShowGuardModal(true);
    if (modal === 'site') setShowSiteModal(true);
    if (modal === 'roster') setShowRosterModal(true);
    if (modal === 'armory') setShowArmoryModal(true);
    if (modal === 'incident') setShowIncidentModal(true);
  };



  return (
    <div className="space-y-0">
      {/* HEADER */}
      <header className="flex justify-between items-center bg-white px-6 py-4 border-b border-zinc-200 shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#003366] flex items-center justify-center">
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-lg font-black text-[#003366] tracking-tight uppercase">Gestão de Segurança Privada</h2>
            <p className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">SGP — Sistema Integrado de Gestão Operacional</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefreshAll}
            className="p-2 border border-zinc-200 text-zinc-500 hover:text-[#003366] hover:bg-zinc-50 transition-all"
            title="Atualizar dados"
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={() => {
              if (onEmitirFatura) onEmitirFatura();
              else if (onNavigate) onNavigate('invoices');
            }}
            className="bg-emerald-600 border border-emerald-700 text-white px-4 py-2 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 hover:bg-emerald-700 transition-all shadow-sm"
          >
            <FileText size={14} /> Emitir Fatura
          </button>
          <button
            onClick={() => window.print()}
            className="bg-zinc-100 border border-zinc-300 text-zinc-700 px-3 py-2 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 hover:bg-zinc-200 transition-all"
          >
            <Printer size={14} /> Imprimir
          </button>
          <button
            onClick={() => { setEditingItem(null); setShowIncidentModal(true); }}
            className="bg-[#003366] text-white px-4 py-2 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow hover:bg-[#002244] transition-all"
          >
            <Plus size={14} /> Nova Ocorrência
          </button>
        </div>
      </header>

      {/* TABS */}
      <div className="flex border-b border-zinc-200 bg-white overflow-x-auto no-scrollbar">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3.5 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider whitespace-nowrap border-b-2 transition-all ${
              activeTab === tab.id
                ? 'border-[#003366] text-[#003366] bg-blue-50/40'
                : 'border-transparent text-zinc-400 hover:text-zinc-800 hover:bg-zinc-50'
            }`}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* CONTEÚDO */}
      <div className="p-6 space-y-6 bg-zinc-50 min-h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {activeTab === 'dashboard' && (
              <DashboardTab
                totalGuards={totalGuards} activeGuards={activeGuards} activeSites={activeSites}
                totalIncidents={totalIncidents} criticalIncidents={criticalIncidents}
                totalArmory={totalArmory} availableArmory={availableArmory} activeRosters={activeRosters}
                pieData={pieData} pieColors={pieColors} monthlyData={monthlyData}
                occurrences={occurrences} roster={roster}
                onAddGuard={() => { setEditingItem(null); setShowGuardModal(true); }}
                onAddSite={() => { setEditingItem(null); setShowSiteModal(true); }}
                onAddIncident={() => { setEditingItem(null); setShowIncidentModal(true); }}
              />
            )}
            {activeTab === 'guards' && (
              <GuardsTab
                guards={guards.length > 0 ? guards : employees}
                loading={loadingGuards}
                onAdd={() => { setEditingItem(null); setShowGuardModal(true); }}
                onEdit={(g: any) => openEdit(g, 'guard')}
                onDelete={(g: any) => handleDelete('guards', g.id, g.nome || g.name)}
              />
            )}
            {activeTab === 'sites' && (
              <SitesTab
                sites={sites.length > 0 ? sites : workSites}
                guards={guards.length > 0 ? guards : employees}
                loading={loadingSites}
                onAdd={() => { setEditingItem(null); setShowSiteModal(true); }}
                onEdit={(s: any) => openEdit(s, 'site')}
                onDelete={(s: any) => handleDelete('sites', s.id, s.nome || s.name)}
              />
            )}
            {activeTab === 'roster' && (
              <RosterTab
                roster={roster}
                guards={guards.length > 0 ? guards : employees}
                sites={sites.length > 0 ? sites : workSites}
                onAdd={() => { setEditingItem(null); setShowRosterModal(true); }}
                onEdit={(r: any) => openEdit(r, 'roster')}
                onDelete={(r: any) => handleDelete('roster', r.id, `Escala ${r.turno}`)}
                onRefresh={onRefresh}
              />
            )}
            {activeTab === 'armory' && (
              <ArmoryTab
                armory={armory}
                guards={guards.length > 0 ? guards : employees}
                onAdd={() => { setEditingItem(null); setShowArmoryModal(true); }}
                onEdit={(a: any) => openEdit(a, 'armory')}
                onDelete={(a: any) => handleDelete('armory', a.id, a.modelo || a.model)}
                onRefresh={onRefresh}
              />
            )}
            {activeTab === 'patrol' && <PatrolTab />}
            {activeTab === 'incidents' && (
              <IncidentsTab
                occurrences={occurrences}
                guards={guards.length > 0 ? guards : employees}
                sites={sites.length > 0 ? sites : workSites}
                onAdd={() => { setEditingItem(null); setShowIncidentModal(true); }}
                onEdit={(o: any) => openEdit(o, 'incident')}
                onDelete={(o: any) => handleDelete('occurrences', o.id, o.titulo || o.title)}
              />
            )}
            {activeTab === 'reports' && (
              <ReportsTab
                occurrences={occurrences} roster={roster} armory={armory}
                guards={guards.length > 0 ? guards : employees}
                sites={sites.length > 0 ? sites : workSites}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* MODALS */}
      {showGuardModal && (
        <GuardModal
          initialData={editingItem}
          empresaId={eid}
          sites={sites.length > 0 ? sites : workSites}
          onClose={() => { setShowGuardModal(false); setEditingItem(null); }}
          onSuccess={() => { setShowGuardModal(false); setEditingItem(null); fetchGuards(); onRefresh(); }}
        />
      )}
      {showSiteModal && (
        <SiteModal
          initialData={editingItem}
          empresaId={eid}
          guards={guards.length > 0 ? guards : employees}
          onClose={() => { setShowSiteModal(false); setEditingItem(null); }}
          onSuccess={() => { setShowSiteModal(false); setEditingItem(null); fetchSites(); onRefresh(); }}
        />
      )}
      {showRosterModal && (
        <RosterModal
          initialData={editingItem}
          empresaId={eid}
          guards={guards.length > 0 ? guards : employees}
          sites={sites.length > 0 ? sites : workSites}
          onClose={() => { setShowRosterModal(false); setEditingItem(null); }}
          onSuccess={() => { setShowRosterModal(false); setEditingItem(null); onRefresh(); }}
        />
      )}
      {showArmoryModal && (
        <ArmoryModal
          initialData={editingItem}
          empresaId={eid}
          onClose={() => { setShowArmoryModal(false); setEditingItem(null); }}
          onSuccess={() => { setShowArmoryModal(false); setEditingItem(null); onRefresh(); }}
        />
      )}
      {showIncidentModal && (
        <IncidentModal
          initialData={editingItem}
          empresaId={eid}
          guards={guards.length > 0 ? guards : employees}
          sites={sites.length > 0 ? sites : workSites}
          onClose={() => { setShowIncidentModal(false); setEditingItem(null); }}
          onSuccess={() => { setShowIncidentModal(false); setEditingItem(null); onRefresh(); }}
        />
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD TAB
// ─────────────────────────────────────────────────────────────────────────────
const KPICard = ({ label, value, sub, icon: Icon, color, bg }: any) => (
  <div className="bg-white border border-zinc-200 p-5 flex items-center justify-between hover:shadow-md transition-all">
    <div>
      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-black text-zinc-900 mt-1">{value}</p>
      {sub && <p className="text-[10px] text-zinc-500 font-semibold mt-0.5">{sub}</p>}
    </div>
    <div className={`w-12 h-12 ${bg} flex items-center justify-center`}>
      <Icon size={22} className={color} />
    </div>
  </div>
);

const DashboardTab = ({
  totalGuards, activeGuards, activeSites, totalIncidents, criticalIncidents,
  totalArmory, availableArmory, activeRosters,
  pieData, pieColors, monthlyData, occurrences, roster,
  onAddGuard, onAddSite, onAddIncident,
}: any) => (
  <div className="space-y-6">
    {/* KPIs */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <KPICard label="Efetivo Total" value={totalGuards} sub={`${activeGuards} ativos`} icon={Users} color="text-blue-600" bg="bg-blue-50" />
      <KPICard label="Postos Protegidos" value={activeSites} sub="Locais ativos" icon={MapPin} color="text-emerald-600" bg="bg-emerald-50" />
      <KPICard label="Ocorrências" value={totalIncidents} sub={`${criticalIncidents} críticas`} icon={AlertTriangle} color="text-amber-600" bg="bg-amber-50" />
      <KPICard label="Armaria" value={`${availableArmory}/${totalArmory}`} sub="Meios disponíveis" icon={Lock} color="text-purple-600" bg="bg-purple-50" />
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Monthly chart */}
      <div className="lg:col-span-2 bg-white border border-zinc-200 p-5 shadow-sm">
        <h3 className="text-xs font-black text-zinc-800 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Activity size={16} className="text-[#003366]" /> Evolução Mensal
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
            <YAxis fontSize={10} axisLine={false} tickLine={false} />
            <Tooltip />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
            <Line type="monotone" dataKey="ocorrencias" stroke="#ef4444" strokeWidth={2} dot={false} name="Ocorrências" />
            <Line type="monotone" dataKey="escalas" stroke="#003366" strokeWidth={2} dot={false} name="Escalas" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Right panels */}
      <div className="space-y-4">
        {/* Severity pie */}
        <div className="bg-white border border-zinc-200 p-5 shadow-sm">
          <h3 className="text-xs font-black text-zinc-800 uppercase tracking-wider mb-3">Ocorrências por Severidade</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value">
                  {pieData.map((_: any, i: number) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                </Pie>
                <Tooltip formatter={(v: any) => [v, 'Ocorrências']} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[140px] flex items-center justify-center text-zinc-400 text-xs">Sem dados</div>
          )}
        </div>

        {/* Alert status */}
        <div className="bg-[#003366] p-5 text-white relative overflow-hidden shadow-md">
          <Zap className="absolute -bottom-5 -right-5 text-white/5" size={120} />
          <h3 className="text-[10px] font-black uppercase tracking-wider mb-2">Estado Operacional</h3>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
            <p className="text-[10px] font-black uppercase">OPERAÇÃO NORMAL</p>
          </div>
          <p className="text-[10px] text-blue-200 leading-relaxed mb-3">
            {activeRosters} escalas ativas. {criticalIncidents > 0 ? `${criticalIncidents} ocorrência(s) crítica(s) pendente(s).` : 'Nenhuma ocorrência crítica.'}
          </p>
          <button
            onClick={() => alert('Alerta Geral emitido para todos os postos!')}
            className="w-full bg-white text-[#003366] py-2 text-[10px] font-black uppercase tracking-widest hover:bg-zinc-100 transition-colors"
          >
            Emitir Alerta Geral
          </button>
        </div>
      </div>
    </div>

    {/* Quick Actions */}
    <div className="bg-white border border-zinc-200 p-5">
      <h3 className="text-xs font-black text-zinc-800 uppercase tracking-wider mb-4">Ações Rápidas</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Novo Vigilante', icon: Users, action: onAddGuard, color: 'bg-blue-600' },
          { label: 'Novo Posto', icon: MapPin, action: onAddSite, color: 'bg-emerald-600' },
          { label: 'Registar Ocorrência', icon: AlertTriangle, action: onAddIncident, color: 'bg-red-600' },
          { label: 'Imprimir Relatório', icon: Printer, action: () => window.print(), color: 'bg-zinc-700' },
        ].map((a, i) => (
          <button
            key={i}
            onClick={a.action}
            className={`${a.color} text-white p-4 flex flex-col items-center gap-2 text-[10px] font-black uppercase tracking-wider hover:opacity-90 transition-all shadow`}
          >
            <a.icon size={18} />
            {a.label}
          </button>
        ))}
      </div>
    </div>

    {/* Recent incidents */}
    {occurrences.length > 0 && (
      <div className="bg-white border border-zinc-200">
        <div className="px-5 py-3 border-b border-zinc-100 flex justify-between items-center">
          <h3 className="text-xs font-black text-zinc-800 uppercase tracking-wider">Ocorrências Recentes</h3>
          <span className="text-[10px] text-zinc-400 font-bold">{occurrences.length} total</span>
        </div>
        <div className="divide-y divide-zinc-50">
          {occurrences.slice(0, 5).map((inc: any, i: number) => (
            <div key={i} className="px-5 py-3 flex items-center justify-between hover:bg-zinc-50">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${
                  inc.severidade === 'Crítica' ? 'bg-purple-600' :
                  inc.severidade === 'Alta' ? 'bg-red-500' :
                  inc.severidade === 'Média' ? 'bg-amber-500' : 'bg-emerald-500'
                }`} />
                <div>
                  <p className="text-xs font-bold text-zinc-900">{inc.titulo || inc.title}</p>
                  <p className="text-[10px] text-zinc-400">{new Date(inc.created_at || Date.now()).toLocaleDateString('pt-PT')}</p>
                </div>
              </div>
              <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-zinc-100 text-zinc-600">{inc.severidade || 'Média'}</span>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// GUARDS TAB
// ─────────────────────────────────────────────────────────────────────────────
const GuardsTab = ({ guards, loading, onAdd, onEdit, onDelete }: any) => {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const filtered = guards.filter((g: any) => {
    const name = (g.nome || g.name || '').toLowerCase();
    const nif = (g.nif || '').toLowerCase();
    const matchSearch = name.includes(search.toLowerCase()) || nif.includes(search.toLowerCase());
    const matchStatus = !filterStatus || g.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-4">
      <div className="bg-white border border-zinc-200 p-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
            <input
              type="text"
              placeholder="Pesquisar vigilante..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-zinc-300 text-xs font-medium focus:outline-none focus:border-[#003366] w-56"
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="border border-zinc-300 px-3 py-2 text-xs font-bold focus:outline-none"
          >
            <option value="">Todos os estados</option>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
            <option value="active">Ativo (legado)</option>
          </select>
        </div>
        <button onClick={onAdd} className="bg-[#003366] text-white px-4 py-2 text-[10px] font-black uppercase flex items-center gap-2 shadow hover:bg-[#002244] transition-all">
          <Plus size={14} /> Novo Vigilante
        </button>
      </div>

      <div className="bg-white border border-zinc-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-16 text-center text-zinc-400 text-xs">A carregar...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-100 text-[10px] font-black text-zinc-500 uppercase border-b border-zinc-200 tracking-wider">
                  <th className="px-4 py-3">Vigilante / Matrícula</th>
                  <th className="px-4 py-3">NIF</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Contacto</th>
                  <th className="px-4 py-3 text-center">Porte Arma</th>
                  <th className="px-4 py-3">Posto Alocado</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filtered.length === 0 ? (
                  <tr><td colSpan={8} className="px-6 py-12 text-center text-zinc-400 italic">Nenhum vigilante encontrado.</td></tr>
                ) : filtered.map((g: any, i: number) => (
                  <tr key={g.id || i} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-bold text-zinc-900">{g.nome || g.name}</p>
                      <p className="text-[10px] text-zinc-400 font-mono">{g.matricula || `MAT-${101 + i}`}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-zinc-600">{g.nif || '—'}</td>
                    <td className="px-4 py-3 text-zinc-600">{g.categoria || g.role || 'Vigilante'}</td>
                    <td className="px-4 py-3 text-zinc-500">{g.telefone || g.phone || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 text-[9px] font-black uppercase ${g.porte_arma ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
                        {g.porte_arma ? 'Sim' : 'Não'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{g.posto_nome || g.site_name || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-full ${
                        (g.status === 'ativo' || g.status === 'active') ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'
                      }`}>
                        {g.status === 'ativo' || g.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right flex justify-end gap-1">
                      <button onClick={() => onEdit(g)} className="p-1.5 text-zinc-400 hover:text-[#003366] hover:bg-blue-50 transition-all" title="Editar"><Edit2 size={13} /></button>
                      <button onClick={() => onDelete(g)} className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-all" title="Eliminar"><Trash2 size={13} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {filtered.length > 0 && (
          <div className="px-4 py-2 bg-zinc-50 border-t border-zinc-100 text-[10px] text-zinc-400 font-bold">
            {filtered.length} vigilante(s)
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SITES TAB
// ─────────────────────────────────────────────────────────────────────────────
const SitesTab = ({ sites, guards, loading, onAdd, onEdit, onDelete }: any) => (
  <div className="space-y-4">
    <div className="bg-white border border-zinc-200 p-4 flex justify-between items-center">
      <h3 className="text-xs font-black text-zinc-800 uppercase tracking-wider">Postos de Proteção e Clientes</h3>
      <button onClick={onAdd} className="bg-[#003366] text-white px-4 py-2 text-[10px] font-black uppercase flex items-center gap-2 shadow hover:bg-[#002244] transition-all">
        <Plus size={14} /> Novo Posto
      </button>
    </div>
    {loading ? (
      <div className="py-16 text-center text-zinc-400 text-xs bg-white border border-zinc-200">A carregar...</div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sites.length === 0 ? (
          <div className="col-span-3 py-16 text-center text-zinc-400 italic bg-white border border-dashed border-zinc-200">
            Nenhum posto registado.
          </div>
        ) : sites.map((s: any, i: number) => {
          const efetivo = guards.filter((g: any) => g.posto_id === s.id || g.site_id === s.id).length;
          return (
            <div key={s.id || i} className="bg-white border border-zinc-200 p-5 hover:border-[#003366] hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-black text-zinc-900 uppercase">{s.nome || s.name}</h4>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase mt-0.5 flex items-center gap-1">
                    <MapPin size={10} /> {s.localizacao || s.location || 'Luanda'}
                  </p>
                </div>
                <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-emerald-100 text-emerald-700">Ativo</span>
              </div>
              {(s.cliente_nome || s.client_name) && (
                <p className="text-[10px] text-zinc-500 font-semibold mb-2">
                  Cliente: <span className="text-zinc-700">{s.cliente_nome || s.client_name}</span>
                </p>
              )}
              {s.tipo_posto && (
                <p className="text-[10px] text-zinc-500 font-semibold mb-2">
                  Tipo: <span className="text-zinc-700">{s.tipo_posto}</span>
                </p>
              )}
              <div className="border-t border-zinc-100 pt-3 mt-3 flex justify-between items-center">
                <div className="flex items-center gap-1 text-xs text-zinc-600 font-bold">
                  <Users size={13} className="text-zinc-400" />
                  <span>{efetivo || s.efetivo || 0} vigilante(s)</span>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={() => onEdit(s)} className="p-1.5 text-zinc-400 hover:text-[#003366] hover:bg-blue-50 transition-all"><Edit2 size={13} /></button>
                  <button onClick={() => onDelete(s)} className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-all"><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// ROSTER TAB
// ─────────────────────────────────────────────────────────────────────────────
const RosterTab = ({ roster, guards, sites, onAdd, onEdit, onDelete, onRefresh }: any) => {
  const [filterDate, setFilterDate] = useState('');
  const [filterTurno, setFilterTurno] = useState('');

  const filtered = roster.filter((r: any) => {
    const matchDate = !filterDate || r.data_servico === filterDate;
    const matchTurno = !filterTurno || r.turno === filterTurno;
    return matchDate && matchTurno;
  });

  return (
    <div className="space-y-4">
      <div className="bg-white border border-zinc-200 p-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="border border-zinc-300 px-3 py-2 text-xs font-bold focus:outline-none"
          />
          <select
            value={filterTurno}
            onChange={e => setFilterTurno(e.target.value)}
            className="border border-zinc-300 px-3 py-2 text-xs font-bold focus:outline-none"
          >
            <option value="">Todos os turnos</option>
            <option value="Dia (07h-19h)">Dia</option>
            <option value="Noite (19h-07h)">Noite</option>
            <option value="24h">24 Horas</option>
          </select>
          {(filterDate || filterTurno) && (
            <button onClick={() => { setFilterDate(''); setFilterTurno(''); }} className="text-xs text-zinc-400 hover:text-zinc-700 font-bold flex items-center gap-1">
              <X size={12} /> Limpar
            </button>
          )}
        </div>
        <button onClick={onAdd} className="bg-[#003366] text-white px-4 py-2 text-[10px] font-black uppercase flex items-center gap-2 shadow hover:bg-[#002244] transition-all">
          <Plus size={14} /> Nova Escala
        </button>
      </div>

      <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-100 text-[10px] font-black text-zinc-500 uppercase border-b border-zinc-200 tracking-wider">
                <th className="px-4 py-3">Turno</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Posto</th>
                <th className="px-4 py-3">Vigilante</th>
                <th className="px-4 py-3">Hora Entrada</th>
                <th className="px-4 py-3">Hora Saída</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-12 text-center text-zinc-400 italic">Nenhuma escala encontrada.</td></tr>
              ) : filtered.map((r: any, i: number) => (
                <tr key={r.id || i} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-4 py-3 font-bold text-[#003366]">{r.turno || 'Dia'}</td>
                  <td className="px-4 py-3 font-mono text-zinc-600">{r.data_servico || '—'}</td>
                  <td className="px-4 py-3 text-zinc-700">{r.posto_nome || r.site_name || '—'}</td>
                  <td className="px-4 py-3 font-semibold text-zinc-900">{r.vigilante_nome || r.guard_name || '—'}</td>
                  <td className="px-4 py-3 font-mono text-zinc-500">{r.hora_entrada || '—'}</td>
                  <td className="px-4 py-3 font-mono text-zinc-500">{r.hora_saida || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 text-[9px] font-black uppercase ${
                      r.status === 'confirmado' ? 'bg-emerald-100 text-emerald-700' :
                      r.status === 'falta' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {r.status || 'Escalado'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right flex justify-end gap-1">
                    <button onClick={() => onEdit(r)} className="p-1.5 text-zinc-400 hover:text-[#003366] hover:bg-blue-50 transition-all"><Edit2 size={13} /></button>
                    <button onClick={() => onDelete(r)} className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-all"><Trash2 size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-4 py-2 bg-zinc-50 border-t border-zinc-100 text-[10px] text-zinc-400 font-bold">
            {filtered.length} escala(s)
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ARMORY TAB
// ─────────────────────────────────────────────────────────────────────────────
const ArmoryTab = ({ armory, guards, onAdd, onEdit, onDelete, onRefresh }: any) => {
  const [movimentoItem, setMovimentoItem] = useState<any>(null);
  const [empSel, setEmpSel] = useState('');
  const [movAction, setMovAction] = useState<'IN' | 'OUT'>('OUT');

  const handleMovimento = async () => {
    if (!empSel) { alert('Selecione um vigilante.'); return; }
    try {
      await apiPost('/api/security/armory-logs', {
        item_id: movimentoItem.id,
        employee_id: empSel,
        action: movAction,
        condition: 'Bom',
        empresa_id: movimentoItem.empresa_id,
      });
      setMovimentoItem(null);
      setEmpSel('');
      onRefresh();
    } catch { alert('Erro ao registar movimento.'); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-zinc-200 p-4 flex justify-between items-center">
        <h3 className="text-xs font-black text-zinc-800 uppercase tracking-wider">Inventário de Armaria & Meios Operacionais</h3>
        <button onClick={onAdd} className="bg-[#003366] text-white px-4 py-2 text-[10px] font-black uppercase flex items-center gap-2 shadow hover:bg-[#002244] transition-all">
          <Plus size={14} /> Novo Equipamento
        </button>
      </div>

      <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-100 text-[10px] font-black text-zinc-500 uppercase border-b border-zinc-200 tracking-wider">
                <th className="px-4 py-3 text-left">Equipamento / Modelo</th>
                <th className="px-4 py-3 text-left">Nº Série</th>
                <th className="px-4 py-3 text-left">Tipo</th>
                <th className="px-4 py-3 text-left">Calibre</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-left">Responsável</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {armory.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-zinc-400 italic">Nenhum equipamento registado.</td></tr>
              ) : armory.map((item: any, i: number) => (
                <tr key={item.id || i} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-bold text-[#003366] font-mono">{item.modelo || item.model}</p>
                    <p className="text-[10px] text-zinc-400">Armaria</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-zinc-600">{item.numero_serie || item.serial_number || '—'}</td>
                  <td className="px-4 py-3 text-zinc-600">{item.tipo || item.type || '—'}</td>
                  <td className="px-4 py-3 text-zinc-600">{item.calibre || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 text-[9px] font-black uppercase ${
                      item.status === 'disponivel' ? 'bg-emerald-100 text-emerald-700' :
                      item.status === 'em_uso' ? 'bg-blue-100 text-blue-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {item.status === 'disponivel' ? 'Disponível' : item.status === 'em_uso' ? 'Em Uso' : item.status || 'Disponível'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{item.responsavel_nome || '—'}</td>
                  <td className="px-4 py-3 text-right flex justify-end gap-1">
                    <button
                      onClick={() => { setMovimentoItem(item); setEmpSel(''); setMovAction(item.status === 'disponivel' ? 'OUT' : 'IN'); }}
                      className="bg-[#003366] text-white px-2.5 py-1 text-[9px] font-black uppercase hover:bg-[#002244] transition-all"
                    >
                      Mov.
                    </button>
                    <button onClick={() => onEdit(item)} className="p-1.5 text-zinc-400 hover:text-[#003366] hover:bg-blue-50 transition-all"><Edit2 size={13} /></button>
                    <button onClick={() => onDelete(item)} className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-all"><Trash2 size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Movimento Modal */}
      {movimentoItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 w-full max-w-sm shadow-2xl border border-zinc-200">
            <h4 className="font-black text-sm uppercase text-[#003366] mb-4 flex items-center gap-2">
              <Activity size={16} /> Movimento: {movimentoItem.modelo || movimentoItem.model}
            </h4>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase block mb-1">Tipo de Movimento</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['OUT', 'IN'] as const).map(a => (
                    <button
                      key={a}
                      onClick={() => setMovAction(a)}
                      className={`py-2 text-[10px] font-black uppercase transition-all ${
                        movAction === a
                          ? (a === 'OUT' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white')
                          : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                      }`}
                    >
                      {a === 'OUT' ? '📤 Levantamento' : '📥 Devolução'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase block mb-1">Vigilante</label>
                <select
                  value={empSel}
                  onChange={e => setEmpSel(e.target.value)}
                  className="w-full border border-zinc-300 p-2 text-xs font-bold bg-zinc-50"
                >
                  <option value="">Selecionar vigilante</option>
                  {guards.map((g: any) => <option key={g.id} value={g.id}>{g.nome || g.name}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={handleMovimento} className={`flex-1 ${movAction === 'OUT' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white py-2.5 text-[10px] font-black uppercase transition-all`}>
                  Confirmar {movAction === 'OUT' ? 'Levantamento' : 'Devolução'}
                </button>
                <button onClick={() => setMovimentoItem(null)} className="px-4 py-2 text-zinc-500 font-bold text-xs hover:bg-zinc-50 border border-zinc-200 transition-all">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PATROL TAB (Static placeholder with real structure)
// ─────────────────────────────────────────────────────────────────────────────
const PatrolTab = () => {
  const viaturas = [
    { plate: 'LD-45-21-GP', model: 'Toyota Hilux 4x4', zone: 'Talatona/Camama', fuel: 85, status: 'Em Patrulha', km: 45230 },
    { plate: 'LD-12-88-GP', model: 'Mitsubishi L200', zone: 'Viana/Cacuaco', fuel: 32, status: 'Abastecimento', km: 38900 },
    { plate: 'LD-90-11-GP', model: 'Toyota Land Cruiser', zone: 'Baixa/Ilha', fuel: 95, status: 'Pronta', km: 12400 },
  ];
  return (
    <div className="space-y-6">
      <div className="bg-white border border-zinc-200 p-5">
        <h3 className="text-xs font-black text-zinc-800 uppercase tracking-wider mb-4 flex items-center gap-2"><Truck size={16} className="text-[#003366]" /> Frota de Patrulha</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {viaturas.map((v, i) => (
            <div key={i} className="border border-zinc-200 p-4 hover:border-[#003366] transition-all">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-mono font-bold text-[#003366]">{v.plate}</p>
                  <p className="text-[10px] text-zinc-500 font-semibold mt-0.5">{v.model}</p>
                </div>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 ${
                  v.status === 'Em Patrulha' ? 'bg-emerald-100 text-emerald-700' :
                  v.status === 'Abastecimento' ? 'bg-amber-100 text-amber-700' :
                  'bg-blue-100 text-blue-700'
                }`}>{v.status}</span>
              </div>
              <p className="text-[10px] text-zinc-500 flex items-center gap-1 mb-2"><MapPin size={10} /> {v.zone}</p>
              <p className="text-[10px] text-zinc-500 mb-2">KM: <span className="font-bold text-zinc-700">{v.km.toLocaleString()}</span></p>
              <div>
                <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                  <span>Combustível</span>
                  <span className="font-bold">{v.fuel}%</span>
                </div>
                <div className="w-full bg-zinc-100 h-2 overflow-hidden rounded-full">
                  <div
                    className={`h-full rounded-full ${v.fuel > 50 ? 'bg-emerald-500' : v.fuel > 20 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${v.fuel}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rondas */}
      <div className="bg-white border border-zinc-200 p-5">
        <h3 className="text-xs font-black text-zinc-800 uppercase tracking-wider mb-4 flex items-center gap-2"><Clock size={16} className="text-[#003366]" /> Rondas Programadas (Hoje)</h3>
        <div className="space-y-2">
          {[
            { hora: '06:00', zona: 'Talatona - Sector A', status: 'Concluída', guard: 'A. Manuel' },
            { hora: '10:00', zona: 'Viana - Posto 3', status: 'Em Curso', guard: 'J. Fonseca' },
            { hora: '14:00', zona: 'Baixa - Banco ANB', status: 'Pendente', guard: 'M. Santos' },
            { hora: '18:00', zona: 'Luanda Sul - Zona B', status: 'Pendente', guard: 'F. Costa' },
          ].map((r, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-zinc-50 border border-zinc-100">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] font-bold text-zinc-500">{r.hora}</span>
                <div>
                  <p className="text-xs font-bold text-zinc-800">{r.zona}</p>
                  <p className="text-[10px] text-zinc-400">{r.guard}</p>
                </div>
              </div>
              <span className={`text-[9px] font-black uppercase px-2 py-0.5 ${
                r.status === 'Concluída' ? 'bg-emerald-100 text-emerald-700' :
                r.status === 'Em Curso' ? 'bg-blue-100 text-blue-700' :
                'bg-zinc-100 text-zinc-500'
              }`}>{r.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// INCIDENTS TAB
// ─────────────────────────────────────────────────────────────────────────────
const IncidentsTab = ({ occurrences, guards, sites, onAdd, onEdit, onDelete }: any) => {
  const [filterSev, setFilterSev] = useState('');
  const [search, setSearch] = useState('');

  const filtered = occurrences.filter((o: any) => {
    const t = (o.titulo || o.title || '').toLowerCase();
    const matchSearch = !search || t.includes(search.toLowerCase());
    const matchSev = !filterSev || o.severidade === filterSev;
    return matchSearch && matchSev;
  });

  const sevColors: Record<string, string> = {
    Baixa: 'border-emerald-500 bg-emerald-50/50',
    Média: 'border-amber-500 bg-amber-50/50',
    Alta: 'border-red-500 bg-red-50/50',
    Crítica: 'border-purple-600 bg-purple-50/50',
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-zinc-200 p-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
            <input
              type="text"
              placeholder="Pesquisar ocorrência..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-zinc-300 text-xs font-medium focus:outline-none focus:border-[#003366] w-48"
            />
          </div>
          <select
            value={filterSev}
            onChange={e => setFilterSev(e.target.value)}
            className="border border-zinc-300 px-3 py-2 text-xs font-bold focus:outline-none"
          >
            <option value="">Todas as severidades</option>
            <option value="Baixa">Baixa</option>
            <option value="Média">Média</option>
            <option value="Alta">Alta</option>
            <option value="Crítica">Crítica</option>
          </select>
        </div>
        <button onClick={onAdd} className="bg-[#003366] text-white px-4 py-2 text-[10px] font-black uppercase flex items-center gap-2 shadow hover:bg-[#002244] transition-all">
          <Plus size={14} /> Registar Ocorrência
        </button>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-zinc-400 italic bg-white border border-dashed border-zinc-200">Nenhuma ocorrência encontrada.</div>
        ) : filtered.map((inc: any, i: number) => {
          const sev = inc.severidade || inc.severity || 'Média';
          return (
            <div key={inc.id || i} className={`border-l-4 p-5 border border-zinc-200 ${sevColors[sev] || ''} bg-white`}>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h5 className="font-black text-zinc-900 uppercase text-sm">{inc.titulo || inc.title}</h5>
                    <span className={`px-2 py-0.5 text-[9px] font-black uppercase ${
                      sev === 'Crítica' ? 'bg-purple-600 text-white' :
                      sev === 'Alta' ? 'bg-red-600 text-white' :
                      sev === 'Média' ? 'bg-amber-100 text-amber-800' :
                      'bg-emerald-100 text-emerald-800'
                    }`}>
                      {sev}
                    </span>
                  </div>
                  <div className="flex gap-4 text-[10px] text-zinc-500 font-bold uppercase mb-2">
                    {(inc.site_id || inc.posto_nome) && <span className="flex items-center gap-1"><MapPin size={10} /> {inc.posto_nome || 'Posto'}</span>}
                    {(inc.guard_id || inc.vigilante_nome) && <span className="flex items-center gap-1"><Users size={10} /> {inc.vigilante_nome || 'Vigilante'}</span>}
                    <span className="flex items-center gap-1"><Clock size={10} /> {new Date(inc.created_at || Date.now()).toLocaleString('pt-PT')}</span>
                  </div>
                  <p className="text-xs text-zinc-600 leading-relaxed">{inc.descricao || inc.description}</p>
                  {inc.medidas_tomadas && (
                    <p className="text-[10px] text-zinc-500 mt-2 italic">Medidas: {inc.medidas_tomadas}</p>
                  )}
                </div>
                <div className="flex gap-1 ml-4">
                  <button onClick={() => onEdit(inc)} className="p-1.5 text-zinc-400 hover:text-[#003366] hover:bg-blue-50 transition-all"><Edit2 size={13} /></button>
                  <button onClick={() => onDelete(inc)} className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-all"><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// REPORTS TAB
// ─────────────────────────────────────────────────────────────────────────────
const ReportsTab = ({ occurrences, roster, armory, guards, sites }: any) => {
  const totalGuardsCost = guards.length * 150000;
  const totalIncidents = occurrences.length;
  const resolvedIncidents = occurrences.filter((o: any) => o.status === 'resolvido').length;

  const printReport = (type: string) => {
    const w = window.open('', '_blank');
    if (!w) return;
    let html = `
      <html><head><title>SGP - ${type}</title>
      <style>body{font-family:Arial,sans-serif;font-size:11px;color:#1a1a1a;padding:24px}
      h1{font-size:16px;font-weight:900;text-transform:uppercase;color:#003366;border-bottom:2px solid #003366;padding-bottom:8px}
      table{width:100%;border-collapse:collapse;margin-top:12px}
      th{background:#003366;color:white;padding:6px 8px;text-align:left;font-size:9px;text-transform:uppercase}
      td{padding:5px 8px;border-bottom:1px solid #e5e7eb;font-size:10px}
      tr:nth-child(even){background:#f9fafb}
      </style></head><body>
      <div style="text-align:right;font-size:9px;color:#999">Emitido: ${new Date().toLocaleString('pt-PT')}</div>
      <h1>${type}</h1>
    `;
    if (type === 'Relatório de Ocorrências') {
      html += `<table><tr><th>Título</th><th>Severidade</th><th>Data</th><th>Descrição</th></tr>`;
      occurrences.forEach((o: any) => {
        html += `<tr><td>${o.titulo || o.title || ''}</td><td>${o.severidade || ''}</td><td>${new Date(o.created_at || Date.now()).toLocaleDateString('pt-PT')}</td><td>${o.descricao || ''}</td></tr>`;
      });
      html += '</table>';
    } else if (type === 'Escala de Serviço') {
      html += `<table><tr><th>Turno</th><th>Data</th><th>Posto</th><th>Vigilante</th><th>Estado</th></tr>`;
      roster.forEach((r: any) => {
        html += `<tr><td>${r.turno || ''}</td><td>${r.data_servico || ''}</td><td>${r.posto_nome || ''}</td><td>${r.vigilante_nome || ''}</td><td>${r.status || 'Escalado'}</td></tr>`;
      });
      html += '</table>';
    } else if (type === 'Inventário de Armaria') {
      html += `<table><tr><th>Modelo</th><th>Nº Série</th><th>Tipo</th><th>Estado</th></tr>`;
      armory.forEach((a: any) => {
        html += `<tr><td>${a.modelo || a.model || ''}</td><td>${a.numero_serie || ''}</td><td>${a.tipo || ''}</td><td>${a.status || ''}</td></tr>`;
      });
      html += '</table>';
    }
    html += '</body></html>';
    w.document.write(html);
    w.document.close();
    w.print();
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-zinc-200 p-4 text-center">
          <p className="text-2xl font-black text-[#003366]">{totalIncidents}</p>
          <p className="text-[10px] text-zinc-500 font-bold uppercase">Total Ocorrências</p>
        </div>
        <div className="bg-white border border-zinc-200 p-4 text-center">
          <p className="text-2xl font-black text-emerald-600">{resolvedIncidents}</p>
          <p className="text-[10px] text-zinc-500 font-bold uppercase">Resolvidas</p>
        </div>
        <div className="bg-white border border-zinc-200 p-4 text-center">
          <p className="text-2xl font-black text-blue-600">{roster.length}</p>
          <p className="text-[10px] text-zinc-500 font-bold uppercase">Escalas Ativas</p>
        </div>
        <div className="bg-white border border-zinc-200 p-4 text-center">
          <p className="text-lg font-black text-zinc-800">{fmt(totalGuardsCost)}</p>
          <p className="text-[10px] text-zinc-500 font-bold uppercase">Custo Est. Mensal</p>
        </div>
      </div>

      {/* Report buttons */}
      <div className="bg-white border border-zinc-200 p-5">
        <h3 className="text-xs font-black text-zinc-800 uppercase tracking-wider mb-4">Gerar Relatórios</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { title: 'Relatório de Ocorrências', desc: 'Lista completa de todas as ocorrências registadas', icon: AlertTriangle },
            { title: 'Escala de Serviço', desc: 'Mapa de escalas e alocação de vigilantes', icon: Calendar },
            { title: 'Inventário de Armaria', desc: 'Estado atual de todos os meios e equipamentos', icon: Lock },
            { title: 'Ficha de Efetivo', desc: 'Listagem de vigilantes e categorias', icon: Users },
            { title: 'Mapa de Postos', desc: 'Todos os postos e locais protegidos', icon: MapPin },
            { title: 'Relatório Mensal SGP', desc: 'Consolidado mensal de toda a atividade', icon: TrendingUp },
          ].map((r, i) => (
            <div
              key={i}
              onClick={() => printReport(r.title)}
              className="flex items-center gap-3 p-4 border border-zinc-200 hover:border-[#003366] hover:bg-blue-50/30 cursor-pointer transition-all group"
            >
              <div className="w-9 h-9 bg-zinc-100 group-hover:bg-[#003366] flex items-center justify-center transition-all">
                <r.icon size={16} className="text-zinc-500 group-hover:text-white transition-all" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-zinc-900 group-hover:text-[#003366] transition-colors">{r.title}</p>
                <p className="text-[10px] text-zinc-400">{r.desc}</p>
              </div>
              <Download size={14} className="text-zinc-300 group-hover:text-[#003366] transition-all" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MODAL BASE
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// MODAL BASE
// ─────────────────────────────────────────────────────────────────────────────
const ModalBase = ({ title, icon: Icon, onClose, children, onSubmit, submitting, maxWidth = 'max-w-2xl', gridCols = 'grid-cols-2' }: any) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-3 overflow-y-auto">
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`bg-white w-full ${maxWidth} shadow-2xl border border-zinc-200 my-auto max-h-[92vh] flex flex-col`}
    >
      <div className="flex justify-between items-center px-5 py-3 border-b border-zinc-100 bg-[#003366] text-white shrink-0">
        <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
          <Icon size={15} /> {title}
        </h3>
        <button onClick={onClose} className="p-1 text-white/70 hover:text-white hover:bg-white/10 transition-all rounded">
          <X size={16} />
        </button>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col flex-1 overflow-hidden">
        <div className={`p-4 md:p-5 grid ${gridCols} gap-2.5 overflow-y-auto flex-1`}>
          {children}
        </div>
        <div className="flex justify-end gap-2.5 px-5 py-3 border-t border-zinc-100 bg-zinc-50 shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold uppercase text-zinc-500 hover:text-zinc-800 transition-colors">Cancelar</button>
          <button
            type="submit"
            disabled={submitting}
            className="bg-[#003366] text-white px-6 py-2 text-xs font-black uppercase tracking-wider shadow hover:bg-[#002244] transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
            {submitting ? 'A guardar...' : 'Guardar Registo'}
          </button>
        </div>
      </form>
    </motion.div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// GUARD MODAL
// ─────────────────────────────────────────────────────────────────────────────
const GuardModal = ({ initialData, empresaId, sites, onClose, onSuccess }: any) => {
  const [form, setForm] = useState({
    nome: initialData?.nome || initialData?.name || '',
    nif: initialData?.nif || '',
    matricula: initialData?.matricula || `MAT-${Math.floor(100 + Math.random() * 900)}`,
    bi_numero: initialData?.bi_numero || '',
    data_nascimento: initialData?.data_nascimento || '',
    telefone: initialData?.telefone || initialData?.phone || '',
    email: initialData?.email || '',
    morada: initialData?.morada || initialData?.address || '',
    categoria: initialData?.categoria || initialData?.role || 'Vigilante Operacional',
    numero_cartao_profissional: initialData?.numero_cartao_profissional || '',
    validade_cartao: initialData?.validade_cartao || '',
    porte_arma: initialData?.porte_arma ?? false,
    posto_id: initialData?.posto_id || initialData?.site_id || '',
    salario_base: initialData?.salario_base || '',
    data_admissao: initialData?.data_admissao || new Date().toISOString().split('T')[0],
    status: initialData?.status || 'ativo',
    observacoes: initialData?.observacoes || '',
  });
  const [submitting, setSubmitting] = useState(false);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const activeEmpresaId = empresaId || '11111111-0000-0000-0000-000000000001';
      const payload = {
        ...form,
        empresa_id: activeEmpresaId,
        data_nascimento: cleanDate(form.data_nascimento),
        validade_cartao: cleanDate(form.validade_cartao),
        data_admissao: cleanDate(form.data_admissao) || new Date().toISOString().split('T')[0],
        posto_id: cleanUUID(form.posto_id),
        salario_base: cleanNum(form.salario_base, 0),
        porte_arma: Boolean(form.porte_arma),
      };
      let error;
      if (initialData?.id) {
        ({ error } = await supabase.from('seg_vigilantes').update(payload).eq('id', initialData.id));
      } else {
        ({ error } = await supabase.from('seg_vigilantes').insert([payload]));
      }
      if (error) { alert('Erro ao guardar vigilante: ' + error.message); return; }
      onSuccess();
    } catch (err: any) { alert('Erro ao guardar vigilante: ' + (err?.message || 'desconhecido')); } finally { setSubmitting(false); }
  };

  return (
    <ModalBase 
      title={initialData?.id ? 'Editar Vigilante' : 'Novo Vigilante'} 
      icon={Users} 
      onClose={onClose} 
      onSubmit={handleSubmit} 
      submitting={submitting}
      maxWidth="max-w-5xl"
      gridCols="grid-cols-1 md:grid-cols-3"
    >
      <div className="md:col-span-2">
        <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-wider mb-1">Nome Completo *</label>
        <Input required value={form.nome} onChange={(e: any) => set('nome', e.target.value)} placeholder="Nome completo do vigilante" />
      </div>
      <div>
        <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-wider mb-1">Matrícula</label>
        <Input value={form.matricula} onChange={(e: any) => set('matricula', e.target.value)} placeholder="MAT-001" />
      </div>

      <div>
        <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-wider mb-1">Nº Bilhete de Identidade (BI)</label>
        <Input value={form.bi_numero} onChange={(e: any) => set('bi_numero', e.target.value)} placeholder="000000000LA000" />
      </div>
      <div>
        <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-wider mb-1">NIF</label>
        <Input value={form.nif} onChange={(e: any) => set('nif', e.target.value)} placeholder="NIF do vigilante" />
      </div>
      <div>
        <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-wider mb-1">Data de Nascimento</label>
        <Input type="date" value={form.data_nascimento} onChange={(e: any) => set('data_nascimento', e.target.value)} />
      </div>

      <div>
        <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-wider mb-1">Telefone</label>
        <Input type="tel" value={form.telefone} onChange={(e: any) => set('telefone', e.target.value)} placeholder="+244 9XX XXX XXX" />
      </div>
      <div>
        <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-wider mb-1">E-mail</label>
        <Input type="email" value={form.email} onChange={(e: any) => set('email', e.target.value)} placeholder="email@empresa.ao" />
      </div>
      <div>
        <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-wider mb-1">Categoria / Cargo</label>
        <Select value={form.categoria} onChange={(e: any) => set('categoria', e.target.value)}>
          <option value="Vigilante Operacional">Vigilante Operacional</option>
          <option value="Vigilante Sénior">Vigilante Sénior</option>
          <option value="Chefe de Grupo">Chefe de Grupo</option>
          <option value="Supervisor">Supervisor de Posto</option>
          <option value="Controlador">Controlador</option>
          <option value="Coordenador">Coordenador Operacional</option>
        </Select>
      </div>

      <div>
        <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-wider mb-1">Nº Cartão Profissional</label>
        <Input value={form.numero_cartao_profissional} onChange={(e: any) => set('numero_cartao_profissional', e.target.value)} placeholder="CP-000000" />
      </div>
      <div>
        <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-wider mb-1">Validade do Cartão</label>
        <Input type="date" value={form.validade_cartao} onChange={(e: any) => set('validade_cartao', e.target.value)} />
      </div>
      <div>
        <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-wider mb-1">Posto Alocado</label>
        <Select value={form.posto_id} onChange={(e: any) => set('posto_id', e.target.value)}>
          <option value="">Sem posto definido</option>
          {sites.map((s: any) => <option key={s.id} value={s.id}>{s.nome || s.name}</option>)}
        </Select>
      </div>

      <div>
        <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-wider mb-1">Salário Base (AOA)</label>
        <Input type="number" value={form.salario_base} onChange={(e: any) => set('salario_base', e.target.value)} placeholder="150000" />
      </div>
      <div>
        <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-wider mb-1">Data de Admissão</label>
        <Input type="date" value={form.data_admissao} onChange={(e: any) => set('data_admissao', e.target.value)} />
      </div>
      <div>
        <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-wider mb-1">Estado</label>
        <Select value={form.status} onChange={(e: any) => set('status', e.target.value)}>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
          <option value="suspenso">Suspenso</option>
          <option value="ferias">De Férias</option>
        </Select>
      </div>

      <div className="md:col-span-2">
        <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-wider mb-1">Morada Completa</label>
        <Input value={form.morada} onChange={(e: any) => set('morada', e.target.value)} placeholder="Endereço completo" />
      </div>
      <div className="flex items-center gap-2.5 p-2 bg-zinc-50 border border-zinc-200 h-[38px] mt-auto">
        <input
          type="checkbox"
          id="porte_arma"
          checked={form.porte_arma}
          onChange={e => set('porte_arma', e.target.checked)}
          className="w-4 h-4 accent-[#003366]"
        />
        <label htmlFor="porte_arma" className="text-xs font-bold text-zinc-700 cursor-pointer">Autorizado para Porte de Arma</label>
      </div>

      <div className="md:col-span-3">
        <label className="block text-[9px] font-black text-zinc-500 uppercase tracking-wider mb-1">Observações</label>
        <Textarea rows={2} value={form.observacoes} onChange={(e: any) => set('observacoes', e.target.value)} placeholder="Notas adicionais sobre o vigilante..." />
      </div>
    </ModalBase>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SITE MODAL
// ─────────────────────────────────────────────────────────────────────────────
const SiteModal = ({ initialData, empresaId, guards, onClose, onSuccess }: any) => {
  const [form, setForm] = useState({
    nome: initialData?.nome || initialData?.name || '',
    localizacao: initialData?.localizacao || initialData?.location || '',
    morada_completa: initialData?.morada_completa || '',
    cliente_nome: initialData?.cliente_nome || initialData?.client_name || '',
    cliente_nif: initialData?.cliente_nif || '',
    cliente_telefone: initialData?.cliente_telefone || '',
    tipo_posto: initialData?.tipo_posto || 'Institucional',
    efetivo_minimo: initialData?.efetivo_minimo || '1',
    turno_servico: initialData?.turno_servico || 'Diurno',
    valor_mensal: initialData?.valor_mensal || '',
    responsavel_id: initialData?.responsavel_id || '',
    status: initialData?.status || 'ativo',
    instrucoes_especiais: initialData?.instrucoes_especiais || '',
    data_inicio_contrato: initialData?.data_inicio_contrato || '',
    data_fim_contrato: initialData?.data_fim_contrato || '',
  });
  const [submitting, setSubmitting] = useState(false);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const activeEmpresaId = empresaId || '11111111-0000-0000-0000-000000000001';
      const payload = {
        ...form,
        empresa_id: activeEmpresaId,
        numero_efetivos_necessarios: cleanNum(form.numero_efetivos_necessarios, 1),
        valor_mensal_contrato: cleanNum(form.valor_mensal_contrato, 0),
        data_inicio_contrato: cleanDate(form.data_inicio_contrato),
        data_fim_contrato: cleanDate(form.data_fim_contrato),
        responsavel_id: cleanUUID(form.responsavel_id),
      };
      let error;
      if (initialData?.id) {
        ({ error } = await supabase.from('seg_postos').update(payload).eq('id', initialData.id));
      } else {
        ({ error } = await supabase.from('seg_postos').insert([payload]));
      }
      if (error) { alert('Erro ao guardar posto: ' + error.message); return; }
      onSuccess();
    } catch (err: any) { alert('Erro ao guardar posto: ' + (err?.message || 'desconhecido')); } finally { setSubmitting(false); }
  };

  return (
    <ModalBase title={initialData?.id ? 'Editar Posto' : 'Novo Posto / Cliente'} icon={MapPin} onClose={onClose} onSubmit={handleSubmit} submitting={submitting}>
      <Field label="Nome do Posto">
        <Input required value={form.nome} onChange={(e: any) => set('nome', e.target.value)} placeholder="Ex: Banco BFA - Agência Talatona" />
      </Field>
      <Field label="Localização / Município" half>
        <Select value={form.localizacao} onChange={(e: any) => set('localizacao', e.target.value)}>
          <option value="">Selecionar...</option>
          {['Luanda','Talatona','Viana','Cacuaco','Cazenga','Belas','Kilamba','Maianga','Ingombota','Sambizanga'].map(l => <option key={l} value={l}>{l}</option>)}
        </Select>
      </Field>
      <Field label="Tipo de Posto" half>
        <Select value={form.tipo_posto} onChange={(e: any) => set('tipo_posto', e.target.value)}>
          <option value="Institucional">Institucional</option>
          <option value="Bancário">Bancário</option>
          <option value="Industrial">Industrial</option>
          <option value="Residencial">Residencial/Condomínio</option>
          <option value="Comercial">Comercial</option>
          <option value="Escolar">Estabelecimento de Ensino</option>
          <option value="Hospitalar">Unidade de Saúde</option>
        </Select>
      </Field>
      <Field label="Morada Completa">
        <Input value={form.morada_completa} onChange={(e: any) => set('morada_completa', e.target.value)} placeholder="Rua, bairro, nº" />
      </Field>
      <Field label="Nome do Cliente" half>
        <Input required value={form.cliente_nome} onChange={(e: any) => set('cliente_nome', e.target.value)} placeholder="Empresa/Entidade cliente" />
      </Field>
      <Field label="NIF do Cliente" half>
        <Input value={form.cliente_nif} onChange={(e: any) => set('cliente_nif', e.target.value)} placeholder="NIF" />
      </Field>
      <Field label="Telefone do Cliente" half>
        <Input type="tel" value={form.cliente_telefone} onChange={(e: any) => set('cliente_telefone', e.target.value)} placeholder="+244 9XX XXX XXX" />
      </Field>
      <Field label="Efetivo Mínimo" half>
        <Input type="number" min="1" value={form.efetivo_minimo} onChange={(e: any) => set('efetivo_minimo', e.target.value)} />
      </Field>
      <Field label="Turno de Serviço" half>
        <Select value={form.turno_servico} onChange={(e: any) => set('turno_servico', e.target.value)}>
          <option value="Diurno">Diurno (07h-19h)</option>
          <option value="Noturno">Noturno (19h-07h)</option>
          <option value="24h">24 Horas</option>
          <option value="Rotativo">Rotativo</option>
        </Select>
      </Field>
      <Field label="Valor Mensal Contrato (AOA)" half>
        <Input type="number" value={form.valor_mensal} onChange={(e: any) => set('valor_mensal', e.target.value)} placeholder="0" />
      </Field>
      <Field label="Supervisor Responsável" half>
        <Select value={form.responsavel_id} onChange={(e: any) => set('responsavel_id', e.target.value)}>
          <option value="">Sem supervisor</option>
          {guards.map((g: any) => <option key={g.id} value={g.id}>{g.nome || g.name}</option>)}
        </Select>
      </Field>
      <Field label="Início do Contrato" half>
        <Input type="date" value={form.data_inicio_contrato} onChange={(e: any) => set('data_inicio_contrato', e.target.value)} />
      </Field>
      <Field label="Fim do Contrato" half>
        <Input type="date" value={form.data_fim_contrato} onChange={(e: any) => set('data_fim_contrato', e.target.value)} />
      </Field>
      <Field label="Instruções Especiais">
        <Textarea rows={2} value={form.instrucoes_especiais} onChange={(e: any) => set('instrucoes_especiais', e.target.value)} placeholder="Instruções específicas para este posto..." />
      </Field>
    </ModalBase>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ROSTER MODAL
// ─────────────────────────────────────────────────────────────────────────────
const RosterModal = ({ initialData, empresaId, guards, sites, onClose, onSuccess }: any) => {
  const [form, setForm] = useState({
    turno: initialData?.turno || 'Dia (07h-19h)',
    data_servico: initialData?.data_servico || new Date().toISOString().split('T')[0],
    hora_entrada: initialData?.hora_entrada || '07:00',
    hora_saida: initialData?.hora_saida || '19:00',
    posto_id: initialData?.posto_id || '',
    vigilante_id: initialData?.vigilante_id || '',
    status: initialData?.status || 'escalado',
    substituicao: initialData?.substituicao ?? false,
    observacoes: initialData?.observacoes || '',
  });
  const [submitting, setSubmitting] = useState(false);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const activeEmpresaId = empresaId || '11111111-0000-0000-0000-000000000001';
      const selectedGuard = guards.find((g: any) => g.id === form.vigilante_id);
      const selectedSite = sites.find((s: any) => s.id === form.posto_id);
      const payload = {
        ...form,
        empresa_id: activeEmpresaId,
        data_servico: cleanDate(form.data_servico) || new Date().toISOString().split('T')[0],
        posto_id: cleanUUID(form.posto_id),
        vigilante_id: cleanUUID(form.vigilante_id),
        vigilante_nome: selectedGuard?.nome || selectedGuard?.name || '',
        posto_nome: selectedSite?.nome || selectedSite?.name || '',
      };
      let error;
      if (initialData?.id) {
        ({ error } = await supabase.from('seg_escalas').update(payload).eq('id', initialData.id));
      } else {
        ({ error } = await supabase.from('seg_escalas').insert([payload]));
      }
      if (error) { alert('Erro ao guardar escala: ' + error.message); return; }
      onSuccess();
    } catch (err: any) { alert('Erro ao guardar escala: ' + (err?.message || 'desconhecido')); } finally { setSubmitting(false); }
  };

  return (
    <ModalBase title={initialData?.id ? 'Editar Escala' : 'Nova Escala de Serviço'} icon={Calendar} onClose={onClose} onSubmit={handleSubmit} submitting={submitting}>
      <Field label="Turno de Serviço">
        <Select value={form.turno} onChange={(e: any) => {
          const t = e.target.value;
          set('turno', t);
          if (t === 'Dia (07h-19h)') { set('hora_entrada', '07:00'); set('hora_saida', '19:00'); }
          else if (t === 'Noite (19h-07h)') { set('hora_entrada', '19:00'); set('hora_saida', '07:00'); }
          else if (t === '24h') { set('hora_entrada', '07:00'); set('hora_saida', '07:00'); }
        }}>
          <option value="Dia (07h-19h)">Dia (07h-19h)</option>
          <option value="Noite (19h-07h)">Noite (19h-07h)</option>
          <option value="24h">24 Horas Contínuas</option>
        </Select>
      </Field>
      <Field label="Data de Serviço" half>
        <Input type="date" required value={form.data_servico} onChange={(e: any) => set('data_servico', e.target.value)} />
      </Field>
      <Field label="Hora Entrada" half>
        <Input type="time" value={form.hora_entrada} onChange={(e: any) => set('hora_entrada', e.target.value)} />
      </Field>
      <Field label="Hora Saída" half>
        <Input type="time" value={form.hora_saida} onChange={(e: any) => set('hora_saida', e.target.value)} />
      </Field>
      <Field label="Posto" half>
        <Select required value={form.posto_id} onChange={(e: any) => set('posto_id', e.target.value)}>
          <option value="">Selecionar posto</option>
          {sites.map((s: any) => <option key={s.id} value={s.id}>{s.nome || s.name}</option>)}
        </Select>
      </Field>
      <Field label="Vigilante" half>
        <Select required value={form.vigilante_id} onChange={(e: any) => set('vigilante_id', e.target.value)}>
          <option value="">Selecionar vigilante</option>
          {guards.map((g: any) => <option key={g.id} value={g.id}>{g.nome || g.name}</option>)}
        </Select>
      </Field>
      <Field label="Estado" half>
        <Select value={form.status} onChange={(e: any) => set('status', e.target.value)}>
          <option value="escalado">Escalado</option>
          <option value="confirmado">Confirmado</option>
          <option value="falta">Falta</option>
          <option value="substituido">Substituído</option>
        </Select>
      </Field>
      <div className="col-span-1 flex items-center gap-3 p-3 bg-zinc-50 border border-zinc-200">
        <input
          type="checkbox"
          id="substituicao"
          checked={form.substituicao}
          onChange={e => set('substituicao', e.target.checked)}
          className="w-4 h-4 accent-[#003366]"
        />
        <label htmlFor="substituicao" className="text-xs font-bold text-zinc-700">Escala de Substituição</label>
      </div>
      <Field label="Observações">
        <Textarea rows={2} value={form.observacoes} onChange={(e: any) => set('observacoes', e.target.value)} placeholder="Notas adicionais sobre esta escala..." />
      </Field>
    </ModalBase>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ARMORY MODAL
// ─────────────────────────────────────────────────────────────────────────────
const ArmoryModal = ({ initialData, empresaId, onClose, onSuccess }: any) => {
  const [form, setForm] = useState({
    modelo: initialData?.modelo || initialData?.model || '',
    numero_serie: initialData?.numero_serie || initialData?.serial_number || '',
    tipo: initialData?.tipo || initialData?.type || 'Arma de Fogo',
    calibre: initialData?.calibre || '',
    fabricante: initialData?.fabricante || '',
    ano_fabricacao: initialData?.ano_fabricacao || '',
    estado_conservacao: initialData?.estado_conservacao || 'Bom',
    licenca_numero: initialData?.licenca_numero || '',
    licenca_validade: initialData?.licenca_validade || '',
    quantidade_municao: initialData?.quantidade_municao || '0',
    status: initialData?.status || 'disponivel',
    localizacao_armaria: initialData?.localizacao_armaria || '',
    observacoes: initialData?.observacoes || '',
  });
  const [submitting, setSubmitting] = useState(false);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        empresa_id: empresaId,
        ano_fabricacao: cleanNum(form.ano_fabricacao),
        licenca_validade: cleanDate(form.licenca_validade),
        quantidade_municao: cleanNum(form.quantidade_municao, 0),
      };
      let error;
      if (initialData?.id) {
        ({ error } = await supabase.from('seg_armaria').update(payload).eq('id', initialData.id));
      } else {
        ({ error } = await supabase.from('seg_armaria').insert([payload]));
      }
      if (error) { alert('Erro ao guardar equipamento: ' + error.message); return; }
      onSuccess();
    } catch (err: any) { alert('Erro ao guardar equipamento: ' + (err?.message || 'desconhecido')); } finally { setSubmitting(false); }
  };

  return (
    <ModalBase title={initialData?.id ? 'Editar Equipamento' : 'Novo Equipamento de Armaria'} icon={Lock} onClose={onClose} onSubmit={handleSubmit} submitting={submitting}>
      <Field label="Modelo / Equipamento" half>
        <Input required value={form.modelo} onChange={(e: any) => set('modelo', e.target.value)} placeholder="Ex: Pistola Glock 17" />
      </Field>
      <Field label="Tipo" half>
        <Select value={form.tipo} onChange={(e: any) => set('tipo', e.target.value)}>
          <option value="Arma de Fogo">Arma de Fogo</option>
          <option value="Arma Branca">Arma Branca</option>
          <option value="Equipamento Tático">Equipamento Tático</option>
          <option value="Comunicação">Rádio / Comunicação</option>
          <option value="Proteção">Colete / Proteção</option>
          <option value="Algemas">Algemas</option>
          <option value="Outro">Outro</option>
        </Select>
      </Field>
      <Field label="Número de Série" half>
        <Input required value={form.numero_serie} onChange={(e: any) => set('numero_serie', e.target.value)} placeholder="SN-000000" />
      </Field>
      <Field label="Calibre" half>
        <Input value={form.calibre} onChange={(e: any) => set('calibre', e.target.value)} placeholder="Ex: 9mm" />
      </Field>
      <Field label="Fabricante" half>
        <Input value={form.fabricante} onChange={(e: any) => set('fabricante', e.target.value)} placeholder="Ex: Glock, Smith & Wesson" />
      </Field>
      <Field label="Ano de Fabrico" half>
        <Input type="number" value={form.ano_fabricacao} onChange={(e: any) => set('ano_fabricacao', e.target.value)} placeholder="2020" />
      </Field>
      <Field label="Estado de Conservação" half>
        <Select value={form.estado_conservacao} onChange={(e: any) => set('estado_conservacao', e.target.value)}>
          <option value="Excelente">Excelente</option>
          <option value="Bom">Bom</option>
          <option value="Regular">Regular</option>
          <option value="Manutenção">Em Manutenção</option>
          <option value="Inutilizado">Inutilizado</option>
        </Select>
      </Field>
      <Field label="Qtd. Munições" half>
        <Input type="number" min="0" value={form.quantidade_municao} onChange={(e: any) => set('quantidade_municao', e.target.value)} />
      </Field>
      <Field label="Nº Licença" half>
        <Input value={form.licenca_numero} onChange={(e: any) => set('licenca_numero', e.target.value)} placeholder="LIC-000000" />
      </Field>
      <Field label="Validade da Licença" half>
        <Input type="date" value={form.licenca_validade} onChange={(e: any) => set('licenca_validade', e.target.value)} />
      </Field>
      <Field label="Localização na Armaria">
        <Input value={form.localizacao_armaria} onChange={(e: any) => set('localizacao_armaria', e.target.value)} placeholder="Ex: Cofre A, Prateleira 1" />
      </Field>
      <Field label="Estado">
        <Select value={form.status} onChange={(e: any) => set('status', e.target.value)}>
          <option value="disponivel">Disponível</option>
          <option value="em_uso">Em Uso</option>
          <option value="manutencao">Em Manutenção</option>
          <option value="inutilizado">Inutilizado</option>
        </Select>
      </Field>
      <Field label="Observações">
        <Textarea rows={2} value={form.observacoes} onChange={(e: any) => set('observacoes', e.target.value)} placeholder="Observações adicionais..." />
      </Field>
    </ModalBase>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// INCIDENT MODAL
// ─────────────────────────────────────────────────────────────────────────────
const IncidentModal = ({ initialData, empresaId, guards, sites, onClose, onSuccess }: any) => {
  const [form, setForm] = useState({
    titulo: initialData?.titulo || initialData?.title || '',
    tipo_ocorrencia: initialData?.tipo_ocorrencia || 'Intrusão',
    severidade: initialData?.severidade || initialData?.severity || 'Média',
    site_id: initialData?.site_id || '',
    guard_id: initialData?.guard_id || '',
    data_ocorrencia: initialData?.data_ocorrencia || new Date().toISOString().split('T')[0],
    hora_ocorrencia: initialData?.hora_ocorrencia || new Date().toTimeString().substring(0, 5),
    descricao: initialData?.descricao || initialData?.description || '',
    medidas_tomadas: initialData?.medidas_tomadas || '',
    envolveu_policia: initialData?.envolveu_policia ?? false,
    envolveu_feridos: initialData?.envolveu_feridos ?? false,
    status: initialData?.status || 'aberto',
    danos_estimados: initialData?.danos_estimados || '',
    numero_relatorio: initialData?.numero_relatorio || `OC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
  });
  const [submitting, setSubmitting] = useState(false);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const activeEmpresaId = empresaId || '11111111-0000-0000-0000-000000000001';
      const selectedGuard = guards.find((g: any) => g.id === form.guard_id);
      const selectedSite = sites.find((s: any) => s.id === form.site_id);
      const payload = {
        ...form,
        empresa_id: activeEmpresaId,
        site_id: cleanUUID(form.site_id),
        guard_id: cleanUUID(form.guard_id),
        data_ocorrencia: cleanDate(form.data_ocorrencia) || new Date().toISOString().split('T')[0],
        danos_estimados: cleanNum(form.danos_estimados, 0),
        vigilante_nome: selectedGuard?.nome || selectedGuard?.name || '',
        posto_nome: selectedSite?.nome || selectedSite?.name || '',
      };
      let error;
      if (initialData?.id) {
        ({ error } = await supabase.from('seg_ocorrencias').update(payload).eq('id', initialData.id));
      } else {
        ({ error } = await supabase.from('seg_ocorrencias').insert([payload]));
      }
      if (error) { alert('Erro ao guardar ocorrência: ' + error.message); return; }
      onSuccess();
    } catch (err: any) { alert('Erro ao guardar ocorrência: ' + (err?.message || 'desconhecido')); } finally { setSubmitting(false); }
  };

  return (
    <ModalBase title={initialData?.id ? 'Editar Ocorrência' : 'Registar Ocorrência'} icon={AlertTriangle} onClose={onClose} onSubmit={handleSubmit} submitting={submitting}>
      <Field label="Nº Relatório" half>
        <Input value={form.numero_relatorio} onChange={(e: any) => set('numero_relatorio', e.target.value)} />
      </Field>
      <Field label="Tipo de Ocorrência" half>
        <Select value={form.tipo_ocorrencia} onChange={(e: any) => set('tipo_ocorrencia', e.target.value)}>
          <option>Intrusão</option>
          <option>Roubo</option>
          <option>Tentativa de Roubo</option>
          <option>Vandalismo</option>
          <option>Incêndio</option>
          <option>Acidente</option>
          <option>Altercação</option>
          <option>Suspeito</option>
          <option>Falsa Ocorrência</option>
          <option>Outro</option>
        </Select>
      </Field>
      <Field label="Título da Ocorrência">
        <Input required value={form.titulo} onChange={(e: any) => set('titulo', e.target.value)} placeholder="Título descritivo da ocorrência" />
      </Field>
      <Field label="Severidade" half>
        <Select value={form.severidade} onChange={(e: any) => set('severidade', e.target.value)}>
          <option value="Baixa">Baixa</option>
          <option value="Média">Média</option>
          <option value="Alta">Alta</option>
          <option value="Crítica">Crítica</option>
        </Select>
      </Field>
      <Field label="Estado" half>
        <Select value={form.status} onChange={(e: any) => set('status', e.target.value)}>
          <option value="aberto">Aberto</option>
          <option value="em_investigacao">Em Investigação</option>
          <option value="resolvido">Resolvido</option>
          <option value="encerrado">Encerrado</option>
        </Select>
      </Field>
      <Field label="Posto / Local" half>
        <Select required value={form.site_id} onChange={(e: any) => set('site_id', e.target.value)}>
          <option value="">Selecionar posto</option>
          {sites.map((s: any) => <option key={s.id} value={s.id}>{s.nome || s.name}</option>)}
        </Select>
      </Field>
      <Field label="Vigilante Envolvido" half>
        <Select value={form.guard_id} onChange={(e: any) => set('guard_id', e.target.value)}>
          <option value="">Nenhum (ou não aplicável)</option>
          {guards.map((g: any) => <option key={g.id} value={g.id}>{g.nome || g.name}</option>)}
        </Select>
      </Field>
      <Field label="Data da Ocorrência" half>
        <Input type="date" required value={form.data_ocorrencia} onChange={(e: any) => set('data_ocorrencia', e.target.value)} />
      </Field>
      <Field label="Hora da Ocorrência" half>
        <Input type="time" value={form.hora_ocorrencia} onChange={(e: any) => set('hora_ocorrencia', e.target.value)} />
      </Field>
      <Field label="Danos Estimados (AOA)" half>
        <Input type="number" value={form.danos_estimados} onChange={(e: any) => set('danos_estimados', e.target.value)} placeholder="0" />
      </Field>
      <div className="col-span-2 grid grid-cols-2 gap-3">
        {[
          { key: 'envolveu_policia', label: '🚔 Envolveu as Autoridades Policiais' },
          { key: 'envolveu_feridos', label: '🚑 Envolveu Feridos' },
        ].map(c => (
          <div key={c.key} className="flex items-center gap-3 p-3 bg-zinc-50 border border-zinc-200">
            <input
              type="checkbox"
              id={c.key}
              checked={(form as any)[c.key]}
              onChange={e => set(c.key, e.target.checked)}
              className="w-4 h-4 accent-red-600"
            />
            <label htmlFor={c.key} className="text-xs font-bold text-zinc-700">{c.label}</label>
          </div>
        ))}
      </div>
      <Field label="Descrição Detalhada">
        <Textarea required rows={3} value={form.descricao} onChange={(e: any) => set('descricao', e.target.value)} placeholder="Descreva o que aconteceu em detalhe..." />
      </Field>
      <Field label="Medidas Tomadas">
        <Textarea rows={2} value={form.medidas_tomadas} onChange={(e: any) => set('medidas_tomadas', e.target.value)} placeholder="Descreva as ações imediatas tomadas..." />
      </Field>
    </ModalBase>
  );
};

export default SecurityModule;
