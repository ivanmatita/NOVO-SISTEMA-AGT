import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  FileText, 
  Plus, 
  Search, 
  Download, 
  Trash2, 
  Edit,
  CheckCircle, 
  Clock, 
  ChevronRight,
  ChevronLeft,
  ArrowLeft,
  Printer,
  ClipboardList,
  BadgeCheck,
  Layers,
  Filter,
  RefreshCw,
  UserPlus,
  FilePlus,
  FileText as FileTextIcon,
  Cloud,
  BarChart3,
  FileSpreadsheet,
  History,
  MoreHorizontal,
  Mail,
  Share2,
  Upload,
  X,
  Truck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Client, Product, Invoice, DashboardStats, InvoiceItem, Employee, Profession, WorkSite, WorkSiteMovement, IssuedDocument, Warehouse, Supplier } from './types';

// --- Helpers ---

const fetchJson = async (url: string, options?: RequestInit) => {
  const response = await fetch(url, options);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch ${url}: ${errorText || response.statusText}`);
  }
  return response.json();
};

const ALL_TAXES = [
  "IVA Isento Artigo 14º Nº2 a) do CIVA",
  "IVA Isento Artigo 14º Nº2 b) do CIVA",
  "IVA Isento Artigo 16º Nº1 a) do CIVA",
  "IVA Isento Artigo 16º Nº1 b) do CIVA",
  "IVA Isento Artigo 16º Nº1 c) do CIVA",
  "IVA Isento Artigo 16º Nº1 d) do CIVA",
  "IVA Isento Artigo 16º Nº1 e) do CIVA",
  "IVA - Regime Simplificado",
  "IVA - Regime de Exclusão",
  "IVA - 7%",
  "IVA 1% Reg Esp Cabinda",
  "IS Verba 22.1.1",
  "IS Verba 22.2",
  "IS Verba 22.1.5",
  "IS Verba 22.1.4",
  "IS Verba 22.1.3",
  "IS Verba 22.1.2",
  "IS Verba 23.3 1%",
  "IS Verba 16.2.1 0.2%",
  "IS Verba 16.1.4 0.1%",
  "IVA Isento Artigo 15º 1 a) do CIVA",
  "IVA Isento Artigo 15º 1 b) do CIVA",
  "IVA Isento Artigo 15º 1 c) do CIVA",
  "IVA Isento Artigo 15º 1 d) do CIVA",
  "IVA Isento Artigo 15º 1 e) do CIVA",
  "IVA Isento Artigo 15º 1 f) do CIVA",
  "IVA Isento Artigo 15º 1 g) do CIVA",
  "IVA Isento Artigo 15º 1 h) do CIVA",
  "IVA Isento Artigo 15º 1 i) do CIVA",
  "IVA Normal 14%",
  "Despacho Instrutivo Nº6",
  "Transmissão Não Sujeita - SME",
  "Transmissão Não Sujeita - SANIDADE",
  "Transmissão Não Sujeita - CAPITANIA",
  "IVA 2% - Reg Esp Cabinda",
  "IVA - 23%",
  "IVA - 5%",
  "IVA Isento Artigo 12º a) do CIVA",
  "IVA Isento Artigo 12º b) do CIVA",
  "IVA Isento Artigo 12º c) do CIVA",
  "IVA Isento Artigo 12º d) do CIVA",
  "IVA Isento Artigo 12º e) do CIVA",
  "IVA Isento Artigo 12º f) do CIVA",
  "IVA Isento Artigo 12º g) do CIVA",
  "IVA Isento Artigo 12º h) do CIVA",
  "IVA Isento Artigo 12º i) do CIVA",
  "IVA Isento Artigo 12º J) do CIVA",
  "IVA Isento Artigo 12º K) do CIVA",
  "IVA Isento Artigo 12º l) do CIVA",
  "IVA Isento Artigo 12º m)",
  "IVA Isento Artigo 12º n) do CIVA",
  "IVA Isento Artigo 12º o) do CIVA",
  "Transmissão de bens e serviço não sujeita",
  "IVA - Regime transitório",
  "IVA - Regime de não Sujeição"
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(value).replace('AOA', 'Kz');
};

// --- Components ---

const Sidebar = ({ activeTab, setActiveTab, fiscalYear, setFiscalYear }: { activeTab: string, setActiveTab: (t: string) => void, fiscalYear: string, setFiscalYear: (y: string) => void }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
    { id: 'pos', label: 'Ponto de Venda', icon: Printer },
    { id: 'invoices', label: 'Faturas', icon: FileText },
    { id: 'cashier', label: 'Caixa', icon: Printer },
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'suppliers', label: 'Fornecedores', icon: Truck },
    { id: 'products', label: 'Produtos', icon: Package },
    { id: 'financial', label: 'Financeiro', icon: Download },
    { id: 'hr', label: 'Recursos Humanos', icon: Users },
    { id: 'accounting', label: 'Contabilidade', icon: FileText },
    { id: 'specialized', label: 'Gestão Especializada', icon: LayoutDashboard },
    { id: 'settings', label: 'Configurações', icon: LayoutDashboard },
  ];

  return (
    <div className="w-64 bg-white text-zinc-600 h-screen fixed left-0 top-0 border-r border-zinc-200 flex flex-col overflow-y-auto shadow-sm">
      <div className="p-6 border-b border-zinc-100">
        <h1 className="text-[#003366] font-bold text-xl flex items-center gap-2">
          <div className="w-8 h-8 bg-[#003366] rounded-none flex items-center justify-center text-white">
            <FileText size={20} />
          </div>
          FaturaPronta
        </h1>
        <div className="mt-4">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Ano de Exercício</label>
          <select 
            value={fiscalYear} 
            onChange={(e) => setFiscalYear(e.target.value)}
            className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-2 py-1 text-xs text-zinc-700 focus:outline-none focus:border-[#003366]"
          >
            <option value="2024">2024</option>
            <option value="2025">2025</option>
            <option value="2026">2026</option>
          </select>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1 pb-8">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-none transition-all ${
              activeTab === item.id 
                ? 'bg-[#003366]/5 text-[#003366] border border-[#003366]/10 font-semibold' 
                : 'hover:bg-zinc-50 hover:text-zinc-900'
            }`}
          >
            <item.icon size={18} className={activeTab === item.id ? 'text-[#003366]' : 'text-zinc-400'} />
            <span className="text-sm">{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="p-4 border-t border-zinc-100 bg-white sticky bottom-0">
        <div className="bg-zinc-50 rounded-none p-4 border border-zinc-200">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Versão</p>
          <p className="text-xs text-zinc-600 font-medium">1.1.0 Enterprise</p>
        </div>
      </div>
    </div>
  );
};

const Breadcrumbs = ({ paths }: { paths: string[] }) => (
  <nav className="flex items-center gap-2 text-xs text-zinc-400 mb-4">
    {paths.map((path, idx) => (
      <React.Fragment key={idx}>
        <span className={idx === paths.length - 1 ? 'text-[#003366] font-medium' : 'hover:text-zinc-600 cursor-pointer'}>
          {path}
        </span>
        {idx < paths.length - 1 && <span className="text-zinc-300">/</span>}
      </React.Fragment>
    ))}
  </nav>
);

const Dashboard = ({ stats }: { stats: DashboardStats | null }) => {
  if (!stats) return <div className="p-8">Carregando...</div>;

  return (
    <div className="space-y-8">
      <header>
        <Breadcrumbs paths={['Home', 'Área Reservada', 'Painel']} />
        <h2 className="text-2xl font-bold text-[#003366] tracking-tight">Painel Executivo</h2>
        <p className="text-zinc-500 text-sm">Visão geral do desempenho financeiro e operacional.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Faturação Total', value: stats.totalInvoiced, type: 'currency' },
          { label: 'Saldo em Caixa', value: stats.cashBalance, type: 'currency', color: true },
          { label: 'Despesas Totais', value: stats.totalExpenses, type: 'currency' },
          { label: 'Clientes Ativos', value: stats.clientCount, type: 'number' },
        ].map((card, i) => (
          <div key={i} className="bg-white border border-zinc-200 p-6 rounded-none shadow-sm">
            <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider">{card.label}</p>
            <p className={`text-2xl font-bold mt-2 ${card.color ? (card.value >= 0 ? 'text-emerald-600' : 'text-red-600') : 'text-[#003366]'}`}>
              {card.type === 'currency' 
                ? formatCurrency(card.value as number)
                : card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white border border-zinc-200 rounded-none overflow-hidden shadow-sm">
          <div className="p-5 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
            <h3 className="font-bold text-[#003366]">Últimas Faturas</h3>
            <button className="text-[#003366] text-xs font-bold hover:underline">Ver todas</button>
          </div>
          <div className="divide-y divide-zinc-100">
            {stats.recentInvoices.map((inv) => (
              <div key={inv.id} className="p-4 hover:bg-zinc-50 transition-colors flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    inv.status === 'paid' ? 'bg-emerald-50 text-white' : 'bg-amber-500 text-white'
                  }`}>
                    {inv.status === 'paid' ? <CheckCircle size={14} /> : <Clock size={14} />}
                  </div>
                  <div>
                    <p className="text-zinc-800 font-bold text-sm">{inv.client_name}</p>
                    <p className="text-zinc-400 text-[10px] font-medium">{inv.invoice_number} • {new Date(inv.date).toLocaleDateString('pt-PT')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[#003366] font-bold text-sm">
                    {formatCurrency(inv.total)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-none p-8 flex flex-col items-center justify-center text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 bg-[#003366]/5 text-[#003366] rounded-full flex items-center justify-center">
            <LayoutDashboard size={32} />
          </div>
          <h3 className="text-xl font-bold text-[#003366]">Análise de Fluxo</h3>
          <p className="text-zinc-500 text-sm max-w-xs">
            O seu negócio cresceu 12% em relação ao mês passado. Mantenha o foco nas faturas pendentes.
          </p>
          <button className="bg-[#003366] hover:bg-[#002244] text-white px-6 py-2.5 rounded-none text-sm font-bold transition-all shadow-sm">
            Gerar Relatório Completo
          </button>
        </div>
      </div>
    </div>
  );
};

const HRModule = ({ onRefresh }: { onRefresh: () => void }) => {
  const [activeTab, setActiveTab] = useState('list');
  const [professions, setProfessions] = useState<Profession[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [localEmployees, setLocalEmployees] = useState<Employee[]>([]);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [salary, setSalary] = useState('');
  const [professionId, setProfessionId] = useState('');

  const fetchHRData = async () => {
    try {
      const [p, e] = await Promise.all([
        fetchJson('/api/professions'),
        fetchJson('/api/employees')
      ]);
      setProfessions(Array.isArray(p) ? p : []);
      setLocalEmployees(Array.isArray(e) ? e : []);
    } catch (err) {
      console.error('Error fetching HR data:', err);
    }
  };

  useEffect(() => { fetchHRData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name, 
        role, 
        profession_id: professionId ? Number(professionId) : null,
        salary: Number(salary), 
        hired_at: new Date().toISOString().split('T')[0] 
      })
    });
    setName(''); setRole(''); setSalary(''); setProfessionId(''); setShowForm(false);
    fetchHRData();
    onRefresh();
  };

  const tabs = [
    { id: 'list', label: 'Lista de Trabalhadores' },
    { id: 'professions', label: 'Profissões' },
    { id: 'contracts', label: 'Contratos' },
    { id: 'attendance', label: 'Efetividade' },
    { id: 'payroll', label: 'Processamento Salarial' },
    { id: 'absences', label: 'Férias & Subsídios' },
    { id: 'reports', label: 'Mapas & Relatórios' },
  ];

  return (
    <div className="space-y-8">
      <header>
        <Breadcrumbs paths={['Home', 'Área Reservada', 'Recursos Humanos']} />
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-[#003366] tracking-tight">Recursos Humanos</h2>
            <p className="text-zinc-500 text-sm">Gestão completa de capital humano e processamento.</p>
          </div>
          <button 
            onClick={() => setShowForm(true)}
            className="bg-[#003366] hover:bg-[#002244] text-white font-bold px-6 py-2.5 rounded-none flex items-center gap-2 transition-all shadow-sm text-sm"
          >
            <Plus size={18} />
            Admitir Funcionário
          </button>
        </div>
      </header>

      <div className="flex border-b border-zinc-200 overflow-x-auto no-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-3 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${
              activeTab === tab.id 
                ? 'border-[#003366] text-[#003366]' 
                : 'border-transparent text-zinc-400 hover:text-zinc-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {showForm && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-zinc-200 p-8 rounded-none shadow-sm mb-8"
          >
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Nome</label>
                <input placeholder="Nome completo" value={name} onChange={e => setName(e.target.value)} className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Cargo</label>
                <input placeholder="Cargo / Função" value={role} onChange={e => setRole(e.target.value)} className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Profissão</label>
                <select value={professionId} onChange={e => setProfessionId(e.target.value)} className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm">
                  <option value="">Selecionar Profissão</option>
                  {professions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Salário</label>
                <input placeholder="0.00" type="number" value={salary} onChange={e => setSalary(e.target.value)} className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" required />
              </div>
              <div className="md:col-span-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="text-zinc-500 hover:text-zinc-700 text-sm font-medium">Cancelar</button>
                <button type="submit" className="bg-[#003366] text-white font-bold px-6 py-2 rounded-none hover:bg-[#002244] transition-all text-sm">Guardar Funcionário</button>
              </div>
            </form>
          </motion.div>
        )}

        {activeTab === 'list' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.isArray(localEmployees) && localEmployees.map(emp => (
              <div key={emp.id} className="bg-white border border-zinc-200 p-6 rounded-none shadow-sm hover:border-[#003366]/30 transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-[#003366]/5 rounded-full flex items-center justify-center text-[#003366] font-bold text-xl border border-[#003366]/10">
                    {emp.name[0]}
                  </div>
                  <div className="flex gap-2">
                    <button className="text-zinc-300 hover:text-[#003366] transition-colors"><FileText size={16} /></button>
                    <button className="text-zinc-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                  </div>
                </div>
                <h3 className="text-[#003366] font-bold text-lg">{emp.name}</h3>
                <p className="text-emerald-600 text-sm font-medium">{emp.profession_name || emp.role}</p>
                <div className="mt-4 pt-4 border-t border-zinc-50 space-y-2">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    <span>Salário</span>
                    <span className="text-zinc-800">{formatCurrency(emp.salary)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    <span>Estado</span>
                    <span className={emp.status === 'active' ? 'text-emerald-600' : 'text-red-600'}>
                      {emp.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'professions' && (
          <div className="bg-white border border-zinc-200 rounded-none p-8 max-w-2xl shadow-sm">
            <h3 className="text-lg font-bold text-[#003366] mb-6">Registar Profissão</h3>
            <form className="flex gap-4" onSubmit={async (e) => {
              e.preventDefault();
              const name = (e.target as any).profession.value;
              await fetch('/api/professions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
              });
              (e.target as any).profession.value = '';
              fetchHRData();
            }}>
              <input 
                name="profession" type="text" placeholder="Nome da Profissão"
                className="flex-1 bg-white border border-zinc-300 rounded-none px-4 py-2 text-sm focus:outline-none focus:border-[#003366]"
                required
              />
              <button className="bg-[#003366] text-white px-6 py-2 rounded-none text-sm font-bold">Adicionar</button>
            </form>
            <div className="mt-8 space-y-2">
              {professions.map(p => (
                <div key={p.id} className="flex justify-between items-center p-3 bg-zinc-50 rounded-none border border-zinc-100">
                  <span className="text-sm text-zinc-700">{p.name}</span>
                  <button className="text-zinc-300 hover:text-red-500"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="bg-white border border-zinc-200 rounded-none overflow-hidden shadow-sm">
            <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
              <h3 className="font-bold text-[#003366]">Processar Efetividade</h3>
              <input type="date" className="bg-zinc-50 border border-zinc-200 rounded px-3 py-1 text-xs" />
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="bg-zinc-50 text-[10px] font-bold uppercase text-zinc-400">
                  <th className="px-6 py-4">Funcionário</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {Array.isArray(localEmployees) && localEmployees.map(emp => (
                  <tr key={emp.id} className="text-sm">
                    <td className="px-6 py-4 font-medium text-zinc-800">{emp.name}</td>
                    <td className="px-6 py-4">
                      <select className="bg-white border border-zinc-200 rounded px-2 py-1 text-xs">
                        <option>Presente</option>
                        <option>Ausente</option>
                        <option>Atraso</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-[#003366] text-xs font-bold">Confirmar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { label: 'Mapas de Imposto', icon: FileText },
              { label: 'Mapas de Férias', icon: FileText },
              { label: 'Extensão Laboral', icon: FileText },
              { label: 'Ordem de Transferência', icon: Download },
              { label: 'Recibos de Salário', icon: Printer },
            ].map((report, i) => (
              <button key={i} className="bg-white border border-zinc-200 p-6 rounded-none shadow-sm hover:border-[#003366] transition-all flex items-center gap-4 group">
                <div className="w-10 h-10 bg-[#003366]/5 text-[#003366] rounded-none flex items-center justify-center group-hover:bg-[#003366] group-hover:text-white transition-all">
                  <report.icon size={20} />
                </div>
                <span className="font-bold text-[#003366]">{report.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};


const DocumentActionsModal = ({ document, onClose }: { document: IssuedDocument, onClose: () => void }) => {
  const handleAction = (action: string) => {
    console.log(`Action ${action} for document ${document.numero_documento}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-none shadow-2xl p-6">
        <h3 className="font-bold text-[#003366] mb-4">Ações - {document.numero_documento}</h3>
        <div className="grid grid-cols-3 gap-4">
          <button onClick={() => handleAction('edit')} className="flex flex-col items-center gap-2 p-4 border border-zinc-200 hover:bg-zinc-50 text-xs font-bold text-[#003366]">
            <Edit size={20} /> Editar
          </button>
          {document.estado_documento !== 'anulado' && (
            <button onClick={() => handleAction('delete')} className="flex flex-col items-center gap-2 p-4 border border-zinc-200 hover:bg-zinc-50 text-xs font-bold text-red-600">
              <Trash2 size={20} /> Apagar
            </button>
          )}
          <button onClick={() => handleAction('email')} className="flex flex-col items-center gap-2 p-4 border border-zinc-200 hover:bg-zinc-50 text-xs font-bold text-[#003366]">
            <Mail size={20} /> Email
          </button>
          <button onClick={() => handleAction('share')} className="flex flex-col items-center gap-2 p-4 border border-zinc-200 hover:bg-zinc-50 text-xs font-bold text-[#003366]">
            <Share2 size={20} /> Partilhar
          </button>
          <button onClick={() => handleAction('print')} className="flex flex-col items-center gap-2 p-4 border border-zinc-200 hover:bg-zinc-50 text-xs font-bold text-[#003366]">
            <Printer size={20} /> Imprimir
          </button>
        </div>
        <button onClick={onClose} className="mt-6 w-full py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 font-bold text-sm">Fechar</button>
      </div>
    </div>
  );
};

const FinancialModule = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');

  const fetchTransactions = () => {
    fetchJson('/api/transactions').then(setTransactions).catch(err => console.error('Error fetching transactions:', err));
  };

  useEffect(() => { fetchTransactions(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description, amount: Number(amount), type, category: 'manual' })
    });
    setDescription(''); setAmount(''); setShowForm(false);
    fetchTransactions();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-[#003366] tracking-tight">Gestão Financeira</h2>
        <button onClick={() => setShowForm(true)} className="bg-[#003366] hover:bg-[#002244] text-white font-bold px-6 py-2.5 rounded-none flex items-center gap-2 transition-all shadow-sm text-sm">
          <Plus size={18} /> Nova Transação
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-zinc-200 p-8 rounded-none shadow-sm">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Descrição</label>
              <input placeholder="Ex: Pagamento Fornecedor" value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" required />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Valor</label>
              <input placeholder="0.00" type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" required />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Tipo</label>
              <select value={type} onChange={e => setType(e.target.value)} className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm">
                <option value="income">Receita</option>
                <option value="expense">Despesa</option>
              </select>
            </div>
            <div className="md:col-span-3 flex justify-end gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="text-zinc-500 hover:text-zinc-700 text-sm font-medium">Cancelar</button>
              <button type="submit" className="bg-[#003366] text-white font-bold px-6 py-2 rounded-none hover:bg-[#002244] transition-all text-sm">Registar Transação</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-zinc-200 rounded-none overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#003366] text-white text-[11px] uppercase tracking-wider font-bold">
              <th className="px-6 py-4">Data</th>
              <th className="px-6 py-4">Descrição</th>
              <th className="px-6 py-4">Tipo</th>
              <th className="px-6 py-4 text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {Array.isArray(transactions) && transactions.map(t => (
              <tr key={t.id} className="hover:bg-zinc-50 transition-colors text-xs text-zinc-600">
                <td className="px-6 py-4 text-zinc-400">{new Date(t.date).toLocaleDateString('pt-PT')}</td>
                <td className="px-6 py-4 font-medium text-zinc-800">{t.description}</td>
                <td className="px-6 py-4">
                  <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${t.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                    {t.type === 'income' ? 'Receita' : 'Despesa'}
                  </span>
                </td>
                <td className={`px-6 py-4 text-right font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const IssuedDocumentsList = ({ documents, onAction }: { documents: IssuedDocument[], onAction: (doc: IssuedDocument) => void }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-[#003366] tracking-tight">Documentos Emitidos</h2>
      </div>

      <div className="bg-white border border-zinc-200 rounded-none overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#003366] text-white text-[11px] uppercase tracking-wider font-bold">
              <th className="px-6 py-4">Data</th>
              <th className="px-6 py-4">Tipo</th>
              <th className="px-6 py-4">Número</th>
              <th className="px-6 py-4">Cliente</th>
              <th className="px-6 py-4 text-right">Valor</th>
              <th className="px-6 py-4 text-center">Estado</th>
              <th className="px-6 py-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {documents.map((doc) => (
              <tr key={doc.id} className="hover:bg-zinc-50 text-sm">
                <td className="px-6 py-4">{new Date(doc.data_emissao).toLocaleDateString()}</td>
                <td className="px-6 py-4 font-medium text-zinc-900">{doc.tipo_documento}</td>
                <td className="px-6 py-4 font-mono text-xs">{doc.numero_documento}</td>
                <td className="px-6 py-4">{doc.cliente_id}</td>
                <td className="px-6 py-4 text-right font-bold text-[#003366]">{formatCurrency(doc.contravalor)}</td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-none ${doc.estado_documento === 'ativo' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {doc.estado_documento}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <button onClick={() => onAction(doc)} className="text-zinc-400 hover:text-[#003366]"><MoreHorizontal size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const POSModule = ({ products, onRefresh }: { products: Product[], onRefresh: () => void }) => {
  const [cart, setCart] = useState<{product: Product, qty: number}[]>([]);
  const [search, setSearch] = useState('');
  const safeProducts = Array.isArray(products) ? products : [];

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.product.id === product.id);
    if (existing) {
      setCart(cart.map(item => item.product.id === product.id ? {...item, qty: item.qty + 1} : item));
    } else {
      setCart([...cart, { product, qty: 1 }]);
    }
  };

  const total = cart.reduce((sum, item) => sum + (item.product.price * item.qty), 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    await fetch('/api/pos/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ total, items: cart })
    });
    setCart([]);
    onRefresh();
    alert('Venda realizada com sucesso!');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-180px)]">
      <div className="lg:col-span-2 flex flex-col space-y-6">
        <header>
          <Breadcrumbs paths={['Home', 'Área Reservada', 'Ponto de Venda']} />
          <h2 className="text-2xl font-bold text-[#003366] tracking-tight">Ponto de Venda (POS)</h2>
        </header>
        
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input 
            type="text" placeholder="Pesquisar produtos..." 
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-white border border-zinc-200 rounded-none pl-12 pr-4 py-3 text-sm focus:outline-none focus:border-[#003366] shadow-sm"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto pr-2">
          {safeProducts.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).map(product => (
            <button 
              key={product.id}
              onClick={() => addToCart(product)}
              className="bg-white border border-zinc-200 p-4 rounded-none text-left hover:border-[#003366] transition-all shadow-sm group"
            >
              <div className="w-10 h-10 bg-[#003366]/5 text-[#003366] rounded-none flex items-center justify-center mb-3 group-hover:bg-[#003366] group-hover:text-white transition-all">
                <Package size={20} />
              </div>
              <p className="font-bold text-[#003366] text-sm truncate">{product.name}</p>
              <p className="text-emerald-600 font-bold mt-1">{formatCurrency(product.price)}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-none flex flex-col shadow-sm overflow-hidden">
        <div className="p-6 border-b border-zinc-100 bg-zinc-50/50">
          <h3 className="font-bold text-[#003366] flex items-center gap-2">
            <Printer size={18} />
            Carrinho de Vendas
          </h3>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {cart.map((item, i) => (
            <div key={i} className="flex justify-between items-center text-sm">
              <div className="flex-1">
                <p className="font-bold text-zinc-800">{item.product.name}</p>
                <p className="text-zinc-400 text-xs">{item.qty}x {formatCurrency(item.product.price)}</p>
              </div>
              <p className="font-bold text-[#003366]">{formatCurrency(item.product.price * item.qty)}</p>
            </div>
          ))}
          {cart.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-zinc-400 space-y-2 opacity-50">
              <Package size={48} />
              <p className="text-sm">Carrinho vazio</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-zinc-100 bg-zinc-50/50 space-y-4">
          <div className="flex justify-between items-end">
            <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider">Total a Pagar</p>
            <p className="text-3xl font-bold text-[#003366]">{formatCurrency(total)}</p>
          </div>
          <button 
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="w-full bg-[#003366] hover:bg-[#002244] disabled:bg-zinc-300 text-white font-bold py-4 rounded-none transition-all shadow-md flex items-center justify-center gap-2"
          >
            Finalizar Venda
          </button>
        </div>
      </div>
    </div>
  );
};

const SpecializedManagementModule = () => {
  return (
    <div className="space-y-8">
      <header>
        <Breadcrumbs paths={['Home', 'Área Reservada', 'Gestão Especializada']} />
        <h2 className="text-2xl font-bold text-[#003366] tracking-tight">Gestão Especializada</h2>
        <p className="text-zinc-500 text-sm">Módulos de gestão avançada para setores específicos.</p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Gestão de Inventário', desc: 'Controlo de stock e armazéns.' },
          { label: 'Gestão de Projetos', desc: 'Acompanhamento de tarefas e prazos.' },
          { label: 'Gestão de Frotas', desc: 'Manutenção e custos de veículos.' },
        ].map((m, i) => (
          <div key={i} className="bg-white border border-zinc-200 p-8 rounded-none shadow-sm space-y-4">
            <div className="w-12 h-12 bg-[#003366]/5 text-[#003366] rounded-none flex items-center justify-center">
              <LayoutDashboard size={24} />
            </div>
            <h3 className="font-bold text-[#003366] text-lg">{m.label}</h3>
            <p className="text-zinc-500 text-sm">{m.desc}</p>
            <button className="text-[#003366] text-xs font-bold hover:underline">Aceder Módulo →</button>
          </div>
        ))}
      </div>
    </div>
  );
};

const SettingsModule = ({ fiscalYear, setFiscalYear }: { fiscalYear: string, setFiscalYear: (y: string) => void }) => {
  return (
    <div className="space-y-8">
      <header>
        <Breadcrumbs paths={['Home', 'Área Reservada', 'Configurações']} />
        <h2 className="text-2xl font-bold text-[#003366] tracking-tight">Configurações do Sistema</h2>
      </header>
      <div className="bg-white border border-zinc-200 rounded-none shadow-sm divide-y divide-zinc-100">
        <div className="p-8 space-y-6">
          <h3 className="font-bold text-[#003366]">Geral</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Nome da Empresa</label>
              <input type="text" defaultValue="FaturaPronta Lda" className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-sm focus:outline-none focus:border-[#003366]" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Ano de Exercício</label>
              <select 
                value={fiscalYear} onChange={e => setFiscalYear(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-sm focus:outline-none focus:border-[#003366]"
              >
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
              </select>
            </div>
          </div>
        </div>
        <div className="p-8 space-y-6">
          <h3 className="font-bold text-[#003366]">Fiscalidade</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">NIF da Empresa</label>
              <input type="text" defaultValue="500123456" className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-sm focus:outline-none focus:border-[#003366]" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Moeda Base</label>
              <input type="text" defaultValue="Kwanza (Kz)" disabled className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-sm opacity-50 cursor-not-allowed" />
            </div>
          </div>
        </div>
        <div className="p-8 flex justify-end">
          <button className="bg-[#003366] text-white font-bold px-8 py-2.5 rounded-none text-sm shadow-sm">Guardar Alterações</button>
        </div>
      </div>
    </div>
  );
};

const CashierModule = () => {
  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState('');
  const [valor, setValor] = useState('');
  const [data, setData] = useState('');
  const [observacao, setObservacao] = useState('');
  const [caixas, setCaixas] = useState<any[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCaixas([...caixas, { id: Date.now(), nome, valor: Number(valor), data, observacao }]);
    setNome(''); setValor(''); setData(''); setObservacao(''); setShowForm(false);
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <Breadcrumbs paths={['Home', 'Área Reservada', 'Caixa']} />
          <h2 className="text-2xl font-bold text-[#003366] tracking-tight">Caixa Registadora</h2>
          <p className="text-zinc-500 text-sm">Gestão de vendas rápidas e fecho de caixa.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-[#003366] hover:bg-[#002244] text-white font-bold px-6 py-2.5 rounded-none flex items-center gap-2 transition-all shadow-sm text-sm">
          <Plus size={18} /> Criar Caixa
        </button>
      </header>

      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative w-full max-w-lg bg-white p-8 rounded-none shadow-2xl">
            <h3 className="font-bold text-[#003366] mb-6 text-xl">Nova Caixa</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Nome</label>
                <input type="text" value={nome} onChange={e => setNome(e.target.value)} required className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Valor de Inserção</label>
                <input type="number" step="0.01" value={valor} onChange={e => setValor(e.target.value)} required className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Data</label>
                <input type="date" value={data} onChange={e => setData(e.target.value)} required className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Observação</label>
                <textarea value={observacao} onChange={e => setObservacao(e.target.value)} className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowForm(false)} className="text-zinc-500 hover:text-zinc-700 text-sm font-medium">Cancelar</button>
                <button type="submit" className="bg-[#003366] text-white font-bold px-6 py-2 rounded-none hover:bg-[#002244] transition-all text-sm">Registar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white border border-zinc-200 rounded-none overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#003366] text-white text-[11px] uppercase tracking-wider font-bold">
              <th className="px-6 py-4">Nome</th>
              <th className="px-6 py-4">Valor</th>
              <th className="px-6 py-4">Data</th>
              <th className="px-6 py-4">Observação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {caixas.map(c => (
              <tr key={c.id} className="text-sm">
                <td className="px-6 py-4">{c.nome}</td>
                <td className="px-6 py-4">{formatCurrency(c.valor)}</td>
                <td className="px-6 py-4">{c.data}</td>
                <td className="px-6 py-4">{c.observacao}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const TaxSeriesModule = () => {
  const [taxes, setTaxes] = useState([
    { id: 1, date: '01-01-2019', layout: 'IVA - Regime Transitório', type: 'IVA', region: 'N/A', code: 'ISE', description: 'NA', rate: '0,00%', fixed: '0,00', cod: 'M00', motive: 'Regime Transitorio' },
    { id: 2, date: '01-01-2019', layout: 'IVA Normal 14%', type: 'IVA', region: 'N/A', code: 'NOR', description: 'NA', rate: '14,00%', fixed: '0,00', cod: '', motive: '' },
  ]);
  const [showImportModal, setShowImportModal] = useState(false);

  const removeTax = (id: number) => {
    setTaxes(taxes.filter(t => t.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-[#003366]">Tabela de Impostos</h2>
        <button onClick={() => setShowImportModal(true)} className="bg-[#003366] text-white px-4 py-2 rounded-none font-bold text-sm">Importar Taxa</button>
      </div>
      <table className="w-full bg-white border border-zinc-200">
        <thead>
          <tr className="bg-zinc-50 border-b border-zinc-200 text-left text-xs font-bold text-zinc-500 uppercase">
            <th className="p-3">Data Início</th>
            <th className="p-3">Layout</th>
            <th className="p-3">Tipo</th>
            <th className="p-3">Região</th>
            <th className="p-3">Código</th>
            <th className="p-3">Taxa</th>
            <th className="p-3">Motivo</th>
            <th className="p-3"></th>
          </tr>
        </thead>
        <tbody>
          {taxes.map(tax => (
            <tr key={tax.id} className="border-b border-zinc-100 text-sm">
              <td className="p-3">{tax.date}</td>
              <td className="p-3">{tax.layout}</td>
              <td className="p-3">{tax.type}</td>
              <td className="p-3">{tax.region}</td>
              <td className="p-3">{tax.code}</td>
              <td className="p-3">{tax.rate}</td>
              <td className="p-3">{tax.motive}</td>
              <td className="p-3 text-center">
                <button onClick={() => removeTax(tax.id)} className="text-red-500 hover:text-red-700">X</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4">
          <div className="bg-white p-6 w-full max-w-md max-h-[80vh] flex flex-col rounded-none shadow-2xl">
            <h3 className="font-bold text-[#003366] mb-4 flex items-center gap-2">
              <Plus size={18} />
              Selecionar Taxa para Importar
            </h3>
            <div className="flex-1 overflow-y-auto space-y-1 pr-2">
              {ALL_TAXES.map((taxName, idx) => (
                <button 
                  key={idx}
                  onClick={() => { 
                    const isIva = taxName.includes('IVA');
                    const isIsento = taxName.includes('Isento') || taxName.includes('Não Sujeita');
                    const rateMatch = taxName.match(/(\d+)%/);
                    const rate = rateMatch ? `${rateMatch[1]},00%` : (isIsento ? '0,00%' : '14,00%');
                    
                    setTaxes([...taxes, { 
                      id: Date.now(), 
                      date: new Date().toLocaleDateString('pt-PT'), 
                      layout: taxName, 
                      type: isIva ? 'IVA' : 'IS', 
                      region: 'N/A', 
                      code: isIsento ? 'ISE' : 'NOR', 
                      description: 'NA', 
                      rate: rate, 
                      fixed: '0,00', 
                      cod: isIsento ? 'M00' : '', 
                      motive: isIsento ? 'Isenção' : '' 
                    }]); 
                    setShowImportModal(false); 
                  }} 
                  className="w-full text-left p-3 hover:bg-zinc-50 border border-transparent hover:border-zinc-200 transition-all text-sm text-zinc-700 flex items-center justify-between group"
                >
                  <span>{taxName}</span>
                  <Plus size={14} className="text-zinc-300 group-hover:text-[#003366]" />
                </button>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t border-zinc-100">
              <button 
                onClick={() => setShowImportModal(false)} 
                className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-600 font-bold py-2.5 rounded-none transition-all text-sm"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AccountingModule = () => {
  return (
    <div className="space-y-8">
      <header>
        <Breadcrumbs paths={['Home', 'Área Reservada', 'Contabilidade']} />
        <h2 className="text-2xl font-bold text-[#003366] tracking-tight">Contabilidade</h2>
        <p className="text-zinc-500 text-sm">Relatórios fiscais, balancetes e exportação SAF-T.</p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-zinc-200 p-8 rounded-none space-y-4 shadow-sm">
          <h3 className="text-lg font-bold text-[#003366]">Exportação SAF-T (PT)</h3>
          <p className="text-zinc-500 text-sm">Gere o ficheiro XML para submissão à Autoridade Tributária.</p>
          <button className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 py-3 rounded-none font-bold transition-all border border-zinc-200">
            Gerar SAF-T Mensal
          </button>
        </div>
        <div className="bg-white border border-zinc-200 p-8 rounded-none space-y-4 shadow-sm">
          <h3 className="text-lg font-bold text-[#003366]">Balanço Patrimonial</h3>
          <p className="text-zinc-500 text-sm">Visualize a saúde financeira detalhada da sua empresa.</p>
          <button className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-700 py-3 rounded-none font-bold transition-all border border-zinc-200">
            Visualizar Balanço
          </button>
        </div>
      </div>
    </div>
  );
};

const InvoiceList = ({ 
  invoices, 
  clients, 
  workSites, 
  onNew, 
  onView, 
  onRegisterClient,
  onAddWorkSite,
  onUpdateWorkSite
}: { 
  invoices: Invoice[], 
  clients: Client[],
  workSites: WorkSite[],
  onNew: () => void, 
  onView: (id: number) => void, 
  onRegisterClient: () => void,
  onAddWorkSite: (site: Omit<WorkSite, 'id'>) => void,
  onUpdateWorkSite: (id: number, site: Omit<WorkSite, 'id'>) => void
}) => {
  const [activeSubTab, setActiveSubTab] = useState('emitidos');
  const [searchTerm, setSearchTerm] = useState('');
  const [serieFilter, setSerieFilter] = useState('Todas');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [typeFilter, setTypeFilter] = useState('Todos');
  const [showWorkSiteForm, setShowWorkSiteForm] = useState(false);
  const [selectedWorkSite, setSelectedWorkSite] = useState<WorkSite | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showManagementView, setShowManagementView] = useState(false);
  const [showMovementForm, setShowMovementForm] = useState(false);
  const [movements, setMovements] = useState<WorkSiteMovement[]>([]);

  const fetchMovements = async (workSiteId: number) => {
    try {
      const response = await fetch(`/api/work-sites/${workSiteId}/movements`);
      if (response.ok) {
        const data = await response.json();
        setMovements(data);
      }
    } catch (error) {
      console.error("Error fetching movements:", error);
    }
  };

  const handleActionClick = (site: WorkSite) => {
    setSelectedWorkSite(site);
    setShowActionMenu(true);
  };

  const handleViewManagement = async () => {
    if (selectedWorkSite) {
      await fetchMovements(selectedWorkSite.id);
      setShowActionMenu(false);
      setShowManagementView(true);
    }
  };

  const handleAssociateMovement = () => {
    setShowActionMenu(false);
    setShowMovementForm(true);
  };

  const handleAddMovement = async (movement: any) => {
    if (!selectedWorkSite) return;
    try {
      const response = await fetch(`/api/work-sites/${selectedWorkSite.id}/movements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(movement)
      });
      if (response.ok) {
        await fetchMovements(selectedWorkSite.id);
        setShowMovementForm(false);
      }
    } catch (error) {
      console.error("Error adding movement:", error);
    }
  };

  if (showManagementView && selectedWorkSite) {
    return (
      <WorkSiteManagement 
        workSite={selectedWorkSite} 
        movements={movements} 
        onBack={() => setShowManagementView(false)} 
      />
    );
  }

  const tabs = [
    { id: 'emitidos', label: 'Documentos emitidos', icon: ClipboardList },
    { id: 'recebidos', label: 'Documentos recebidos', icon: ClipboardList },
    { id: 'adesao', label: 'Detalhes da adesão', icon: BadgeCheck },
    { id: 'series', label: 'Séries de facturas', icon: FileTextIcon },
  ];

  const filteredInvoices = Array.isArray(invoices) ? invoices.filter(inv => {
    const matchesSearch = inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         inv.client_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'Todos' || 
                         (statusFilter === 'PAGO' && inv.status === 'paid') ||
                         (statusFilter === 'PENDENTE' && inv.status === 'pending');
    
    if (activeSubTab === 'recebidos') {
      return matchesSearch && (inv.document_type === 'Fatura Recibo' || inv.document_type === 'Recibo');
    }

    return matchesSearch && matchesStatus;
  }) : [];

  return (
    <div className="space-y-0 -mt-12 -mx-12">
      {/* Tabs Header */}
      <div className="bg-[#f5f5f7] border-b border-zinc-200 px-12 pt-8">
        <div className="flex gap-12">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-3 pb-4 px-1 text-sm transition-all relative ${
                activeSubTab === tab.id 
                  ? 'text-[#003366] font-bold border-b-2 border-[#003366]' 
                  : 'text-zinc-500 hover:text-zinc-700 font-medium'
              }`}
            >
              <tab.icon size={20} className={activeSubTab === tab.id ? 'text-[#003366]' : 'text-zinc-400'} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-8 space-y-6">
        {(activeSubTab === 'emitidos' || activeSubTab === 'recebidos') && (
          <>
            {/* Top Header Section */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-zinc-800">
                    {activeSubTab === 'emitidos' ? 'Documentos de Venda' : 'Documentos Recebidos'}
                  </h2>
                  <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                    <Cloud size={12} />
                    Cloud Sync
                  </span>
                </div>
                <p className="text-zinc-400 text-xs">
                  {activeSubTab === 'emitidos' 
                    ? 'Gestão de documentos certificados e faturas (Sincronizado com Supabase)'
                    : 'Lista de faturas recibos e recibos recebidos'}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {activeSubTab === 'emitidos' && (
                  <button 
                    onClick={onNew}
                    className="bg-[#2563eb] hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-none flex items-center gap-2 transition-all shadow-sm text-sm"
                  >
                    <Plus size={20} className="bg-white/20 rounded-none p-0.5" />
                    Nova Fatura
                  </button>
                )}
                <button className="bg-white border border-zinc-200 text-zinc-600 font-bold px-6 py-2.5 rounded-none flex items-center gap-2 hover:bg-zinc-50 transition-all shadow-sm text-sm">
                  <History size={18} className="text-zinc-400" />
                  Relatórios
                </button>
                <button className="bg-[#4f46e5] hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-none flex items-center gap-2 transition-all shadow-sm text-sm">
                  <BarChart3 size={18} />
                  Visão Geral do Negócio
                </button>
                <button className="bg-[#16a34a] hover:bg-green-700 text-white font-bold px-6 py-2.5 rounded-none flex items-center gap-2 transition-all shadow-sm text-sm">
                  <FileSpreadsheet size={18} />
                  Excel
                </button>
                {activeSubTab === 'emitidos' && (
                  <button 
                    onClick={onRegisterClient}
                    className="bg-white border border-zinc-200 text-zinc-600 font-bold px-6 py-2.5 rounded-none flex items-center gap-2 hover:bg-zinc-50 transition-all shadow-sm text-sm"
                  >
                    <UserPlus size={18} className="text-zinc-400" />
                    Registar cliente
                  </button>
                )}
                <button 
                  onClick={() => window.print()}
                  className="bg-white border border-zinc-200 text-zinc-600 font-bold px-6 py-2.5 rounded-none flex items-center gap-2 hover:bg-zinc-50 transition-all shadow-sm text-sm"
                >
                  <Printer size={18} className="text-zinc-400" />
                  Imprimir
                </button>
              </div>
            </div>

            {/* Filter Section */}
            <div className="bg-white border border-zinc-200 rounded-none shadow-sm flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px] space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Pesquisa Geral</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Cliente, Nº Doc..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-none text-sm focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="w-32 space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Série</label>
                <select 
                  value={serieFilter}
                  onChange={(e) => setSerieFilter(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                >
                  <option>Todas</option>
                </select>
              </div>

              <div className="w-32 space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Estado</label>
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                >
                  <option>Todos</option>
                  <option>PAGO</option>
                  <option>PENDENTE</option>
                </select>
              </div>

              <div className="w-32 space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Tipo</label>
                <select 
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                >
                  <option>Todos</option>
                </select>
              </div>

              <button 
                onClick={() => {
                  setSearchTerm('');
                  setSerieFilter('Todas');
                  setStatusFilter('Todos');
                  setTypeFilter('Todos');
                }}
                className="bg-zinc-100 text-zinc-600 font-bold px-4 py-2 rounded-none flex items-center gap-2 hover:bg-zinc-200 transition-all text-sm"
              >
                <Filter size={16} />
                Limpar
              </button>
            </div>

            {/* Table Section */}
            <div className="bg-white border border-zinc-200 rounded-none overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#334155] text-white text-[11px] uppercase tracking-wider font-bold">
                    <th className="px-6 py-4">Data</th>
                    <th className="px-6 py-4">Tipo</th>
                    <th className="px-6 py-4">Número</th>
                    <th className="px-6 py-4">Cliente / Ref</th>
                    <th className="px-6 py-4">Loja/Local</th>
                    <th className="px-6 py-4">Caixa</th>
                    <th className="px-6 py-4 text-right">Total</th>
                    <th className="px-6 py-4 text-center">Estado</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-zinc-50 transition-colors group text-xs text-zinc-600">
                      <td className="px-6 py-4">{new Date(inv.date).toLocaleDateString('pt-PT')}</td>
                      <td className="px-6 py-4 font-medium">Fatura/Recibo</td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => onView(inv.id)}
                          className="text-blue-600 hover:underline flex items-center gap-1 font-medium"
                        >
                          <Cloud size={12} className="text-zinc-300" />
                          {inv.invoice_number}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-zinc-800">{inv.client_name}</div>
                        <div className="text-[10px] text-zinc-400">Cliente Cloud</div>
                      </td>
                      <td className="px-6 py-4 text-zinc-400">-</td>
                      <td className="px-6 py-4 text-zinc-400">SOFTWARE</td>
                      <td className="px-6 py-4 text-right font-bold text-zinc-800">{formatCurrency(inv.total)}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                          inv.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                        }`}>
                          {inv.status === 'paid' ? 'PAGO' : 'PENDENTE'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button className="text-blue-500 hover:text-blue-700"><Printer size={16} /></button>
                          <button className="text-blue-400 hover:text-blue-600"><Upload size={16} /></button>
                          <button className="text-zinc-300 hover:text-zinc-500"><MoreHorizontal size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredInvoices.length === 0 && (
                <div className="p-20 text-center space-y-4">
                  <div className="text-zinc-200 flex justify-center">
                    <Search size={80} strokeWidth={1} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-zinc-700">Nenhum documento encontrado</h4>
                    <p className="text-zinc-400 text-sm">Tente ajustar os filtros para encontrar o que procura.</p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {activeSubTab === 'adesao' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-zinc-800">Locais de Trabalho</h3>
                <p className="text-zinc-400 text-xs">Gestão de obras e locais de prestação de serviços.</p>
              </div>
              <button 
                onClick={() => { setSelectedWorkSite(null); setShowWorkSiteForm(true); }}
                className="bg-[#003366] hover:bg-[#002244] text-white font-bold px-6 py-2.5 rounded-none flex items-center gap-2 transition-all shadow-sm text-sm"
              >
                <Plus size={18} />
                Adicionar local de trabalho
              </button>
            </div>

            <div className="bg-white border border-zinc-200 rounded-none overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#334155] text-white text-[11px] uppercase tracking-wider font-bold">
                    <th className="px-6 py-4">Cód / Título</th>
                    <th className="px-6 py-4">Cliente</th>
                    <th className="px-6 py-4">Período</th>
                    <th className="px-6 py-4">Localização</th>
                    <th className="px-6 py-4 text-center">Efectivos</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {workSites.map((site) => (
                    <tr key={site.id} className="hover:bg-zinc-50 transition-colors group text-xs text-zinc-600">
                      <td className="px-6 py-4">
                        <div className="font-bold text-[#003366]">{site.code}</div>
                        <div className="text-zinc-500">{site.title}</div>
                      </td>
                      <td className="px-6 py-4 font-medium text-zinc-800">{site.client_name}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span>{new Date(site.start_date).toLocaleDateString('pt-PT')}</span>
                          <ChevronRight size={12} className="text-zinc-300" />
                          <span>{new Date(site.end_date).toLocaleDateString('pt-PT')}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">{site.location}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="font-bold text-zinc-800">{site.total_staff}</div>
                        <div className="text-[10px] text-zinc-400">{site.staff_per_day}/dia</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleActionClick(site)}
                          className="text-zinc-300 hover:text-zinc-500"
                        >
                          <MoreHorizontal size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {workSites.length === 0 && (
                <div className="p-20 text-center space-y-4">
                  <div className="text-zinc-200 flex justify-center">
                    <Layers size={80} strokeWidth={1} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-zinc-700">Nenhum local de trabalho registado</h4>
                    <p className="text-zinc-400 text-sm">Clique em "Adicionar local de trabalho" para começar.</p>
                  </div>
                </div>
              )}
            </div>

            <AnimatePresence>
              {showActionMenu && selectedWorkSite && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowActionMenu(false)}
                    className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative w-full max-w-sm bg-white rounded-none shadow-2xl overflow-hidden"
                  >
                    <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
                      <h3 className="font-bold text-[#003366] text-sm">Ações: {selectedWorkSite.title}</h3>
                      <button onClick={() => setShowActionMenu(false)} className="text-zinc-400 hover:text-zinc-600">
                        <X size={18} />
                      </button>
                    </div>
                    <div className="p-2">
                      <button 
                        onClick={() => { setShowActionMenu(false); setShowWorkSiteForm(true); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-none bg-blue-50 flex items-center justify-center text-blue-600">
                          <FileTextIcon size={16} />
                        </div>
                        <span>Editar local de trabalho</span>
                      </button>
                      <button 
                        onClick={handleViewManagement}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-none bg-emerald-50 flex items-center justify-center text-emerald-600">
                          <BarChart3 size={16} />
                        </div>
                        <span>Ver gestão local de trabalho</span>
                      </button>
                      <button 
                        onClick={handleAssociateMovement}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-none bg-amber-50 flex items-center justify-center text-amber-600">
                          <History size={16} />
                        </div>
                        <span>Associar movimento</span>
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}

              {showMovementForm && selectedWorkSite && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowMovementForm(false)}
                    className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-lg bg-white rounded-none shadow-2xl overflow-hidden"
                  >
                    <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-[#003366] text-white">
                      <h3 className="font-bold flex items-center gap-2">
                        <History size={18} />
                        Associar Movimento: {selectedWorkSite.title}
                      </h3>
                      <button onClick={() => setShowMovementForm(false)} className="text-white/80 hover:text-white">
                        <X size={20} />
                      </button>
                    </div>
                    <div className="p-6">
                      <WorkSiteMovementForm 
                        onBack={() => setShowMovementForm(false)}
                        onSuccess={handleAddMovement}
                      />
                    </div>
                  </motion.div>
                </div>
              )}

              {showWorkSiteForm && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 md:p-12">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowWorkSiteForm(false)}
                    className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-4xl bg-white rounded-none shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
                  >
                    <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                      <h3 className="font-bold text-[#003366] flex items-center gap-2">
                        <Layers size={18} />
                        {selectedWorkSite ? 'Editar Local de Trabalho' : 'Adicionar Local de Trabalho'}
                      </h3>
                      <button 
                        onClick={() => setShowWorkSiteForm(false)}
                        className="p-2 hover:bg-zinc-200 rounded-full transition-colors text-zinc-400 hover:text-zinc-600"
                      >
                        <X size={20} />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-8">
                      <WorkSiteForm 
                        clients={clients} 
                        onBack={() => setShowWorkSiteForm(false)} 
                        initialData={selectedWorkSite}
                        onSuccess={(site) => {
                          if (selectedWorkSite) {
                            onUpdateWorkSite(selectedWorkSite.id, site);
                          } else {
                            onAddWorkSite(site);
                          }
                          setShowWorkSiteForm(false);
                        }}
                      />
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </div>
        )}

        {activeSubTab === 'series' && (
          <div className="bg-white border border-zinc-200 rounded-none p-8 shadow-sm">
            <TaxSeriesModule />
          </div>
        )}

        {activeSubTab !== 'emitidos' && activeSubTab !== 'recebidos' && activeSubTab !== 'adesao' && activeSubTab !== 'series' && (
          <div className="bg-white border border-zinc-200 rounded-none p-20 text-center space-y-4">
            <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-400 mx-auto">
              <ClipboardList size={32} />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-zinc-700">Secção em desenvolvimento</h4>
              <p className="text-zinc-400 text-sm">Esta funcionalidade estará disponível brevemente.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const CreateInvoice = ({ clients, products, workSites, onBack, onSuccess }: { clients: Client[], products: Product[], workSites: WorkSite[], onBack: () => void, onSuccess: () => void }) => {
  const [clientId, setClientId] = useState<number | ''>('');
  const [documentType, setDocumentType] = useState('Fatura');
  const [documentNumber, setDocumentNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [countryCode, setCountryCode] = useState('Angola');
  const [nif, setNif] = useState('');
  const [clientName, setClientName] = useState('');
  const [workSiteId, setWorkSiteId] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [vatWithholding, setVatWithholding] = useState<string>('0');
  const [exchangeRate, setExchangeRate] = useState<string>('1');
  const [currency, setCurrency] = useState<string>('Kwanza');
  const [counterValue, setCounterValue] = useState<string>('0');
  const [globalDiscount, setGlobalDiscount] = useState<string>('0');
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [serviceLocation, setServiceLocation] = useState('');
  const [items, setItems] = useState<Partial<InvoiceItem>[]>([]);
  const [cashBox, setCashBox] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [expandedDimensions, setExpandedDimensions] = useState<number | null>(null);

  const addItem = () => {
    setItems([...items, { 
      description: '', 
      quantity: 1, 
      unit_price: 0, 
      total: 0,
      tipologia: 'Mercadoria',
      desconto: 0,
      tipo_artigo: 'produto',
      comprimento: 0,
      largura: 0,
      altura: 0,
      tax: ALL_TAXES[0]
    }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'quantity' || field === 'unit_price' || field === 'desconto') {
      const q = field === 'quantity' ? value : (newItems[index].quantity || 0);
      const p = field === 'unit_price' ? value : (newItems[index].unit_price || 0);
      const d = field === 'desconto' ? value : (newItems[index].desconto || 0);
      newItems[index].total = (q * p) - d;
    }

    if (field === 'product_id' && value) {
      const prod = products.find(p => p.id === Number(value));
      if (prod) {
        newItems[index].description = prod.name;
        newItems[index].unit_price = prod.price;
        newItems[index].total = ((newItems[index].quantity || 1) * prod.price) - (newItems[index].desconto || 0);
      }
    }
    
    setItems(newItems);
  };

  const total = items.reduce((sum, item) => sum + (item.total || 0), 0);
  const vatAmount = total * 0.14;
  const finalTotal = total + vatAmount - Number(globalDiscount || 0);

  const handleSearchClient = () => {
    const client = clients.find(c => c.nif === nif);
    if (client) {
      setClientId(client.id);
      setClientName(client.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    let finalClientId = clientId;
    if (!finalClientId && clientName) {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: clientName, nif, email: '', address: '' })
      });
      if (res.ok) {
        const data = await res.json();
        finalClientId = data.id;
      }
    }

    if (!finalClientId) return;

    const res = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        client_id: finalClientId, 
        date, 
        due_date: dueDate,
        items,
        document_type: documentType,
        work_site_id: workSiteId,
        vat_withholding: parseFloat(vatWithholding),
        exchange_rate: parseFloat(exchangeRate),
        currency,
        counter_value: parseFloat(counterValue),
        global_discount: parseFloat(globalDiscount),
        service_date: serviceDate,
        service_location: serviceLocation,
        cash_box: cashBox,
        payment_method: paymentMethod
      })
    });

    if (res.ok) onSuccess();
  };

  return (
    <div className="space-y-8 bg-zinc-50/30 p-4 sm:p-8 min-h-screen">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 hover:bg-zinc-100 rounded-none text-zinc-400 transition-colors">
          <ChevronLeft size={24} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-zinc-100 flex items-center justify-center text-zinc-500">
            <FileText size={18} />
          </div>
          <h2 className="text-xl font-bold text-[#003366]">Informações do documento</h2>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Informações do documento */}
        <div className="bg-white border border-zinc-200 p-8 rounded-none shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-600">Tipo de documento <span className="text-red-500">*</span></label>
              <select 
                value={documentType} 
                onChange={(e) => setDocumentType(e.target.value)}
                required
                className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2.5 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm"
              >
                <option value="Fatura">Fatura</option>
                <option value="Fatura Recibo">Fatura Recibo</option>
                <option value="Recibo">Recibo</option>
                <option value="Fatura Pro-forma">Fatura Pro-forma</option>
                <option value="Orçamento">Orçamento</option>
                <option value="Nota de Crédito">Nota de Crédito</option>
                <option value="Nota de Débito">Nota de Débito</option>
                <option value="Guia de Remessa">Guia de Remessa</option>
                <option value="Guia de Entrada">Guia de Entrada</option>
                <option value="Fatura Global">Fatura Global</option>
                <option value="Aviso de Cobrança">Aviso de Cobrança</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-600">Local de trabalho</label>
              <select 
                value={workSiteId} 
                onChange={(e) => setWorkSiteId(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2.5 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm"
              >
                <option value="">Selecione o local</option>
                {workSites.map(ws => <option key={ws.id} value={ws.id}>{ws.title}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-600">Data de emissão</label>
              <input 
                type="date" 
                value={date} 
                disabled
                className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2.5 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-600">Data de vencimento</label>
              <input 
                type="date" 
                value={dueDate} 
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2.5 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-600">Cativação de IVA</label>
              <select 
                value={vatWithholding} 
                onChange={(e) => setVatWithholding(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2.5 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm"
              >
                <option value="0">Sem cativação</option>
                <option value="0.5">50%</option>
                <option value="1">100%</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-600">Câmbio</label>
              <input 
                type="number" 
                value={exchangeRate} 
                onChange={(e) => setExchangeRate(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2.5 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-600">Moeda</label>
              <select 
                value={currency} 
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2.5 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm"
              >
                <option value="Kwanza">Kwanza</option>
                <option value="USD">USD</option>
                <option value="Euro">Euro</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-600">Contravalor</label>
              <input 
                type="number" 
                value={counterValue} 
                onChange={(e) => setCounterValue(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2.5 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-600">Desconto global</label>
              <input 
                type="number" 
                value={globalDiscount} 
                onChange={(e) => setGlobalDiscount(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2.5 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm"
              />
            </div>
            {(documentType === 'Fatura Recibo' || documentType === 'Recibo') && (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-600">Selecionar caixa de recebimento</label>
                  <select 
                    value={cashBox} 
                    onChange={(e) => setCashBox(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2.5 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm"
                  >
                    <option value="">Selecione a caixa</option>
                    <option value="Caixa Geral">Caixa Geral</option>
                    <option value="Caixa POS">Caixa POS</option>
                    <option value="Banco">Banco</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-600">Selecionar forma de pagamento</label>
                  <select 
                    value={paymentMethod} 
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2.5 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm"
                  >
                    <option value="">Selecione o pagamento</option>
                    <option value="Numerário">Numerário</option>
                    <option value="Multicaixa">Multicaixa</option>
                    <option value="Transferência">Transferência</option>
                    <option value="Depósito">Depósito</option>
                  </select>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Section 2: Informações do adquirente */}
        <div className="bg-white border border-zinc-200 p-8 rounded-none shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-[#003366] border-b border-zinc-100 pb-4">Informações do adquirente</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-600">Código do país <span className="text-red-500">*</span></label>
              <select 
                value={countryCode} 
                onChange={(e) => setCountryCode(e.target.value)}
                required
                className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2.5 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm"
              >
                <option value="Angola">Angola</option>
                <option value="Portugal">Portugal</option>
                <option value="Brasil">Brasil</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-zinc-600">Selecionar cliente <span className="text-red-500">*</span></label>
              <select 
                value={clientId} 
                onChange={(e) => {
                  const id = e.target.value;
                  setClientId(id ? Number(id) : '');
                  const client = clients.find(c => c.id === Number(id));
                  if (client) {
                    setClientName(client.name);
                    setNif(client.nif);
                  } else {
                    setClientName('');
                    setNif('');
                  }
                }}
                required
                className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2.5 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm"
              >
                <option value="">Selecione um cliente</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.nif})</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-600">Data prestação de bens/serviços <span className="text-red-500">*</span></label>
              <input 
                type="date" 
                value={serviceDate} 
                onChange={(e) => setServiceDate(e.target.value)}
                required
                className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2.5 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold text-zinc-600">Local de prestação de bens/serviços <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                value={serviceLocation} 
                onChange={(e) => setServiceLocation(e.target.value)}
                placeholder="Informe o local da prestação de serviço"
                required
                className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2.5 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Bens e serviços */}
        <div className="bg-white border border-zinc-200 p-8 rounded-none shadow-sm space-y-6">
          <div className="flex justify-between items-center border-b border-zinc-100 pb-4">
            <h3 className="text-lg font-bold text-[#003366]">Bens e serviços</h3>
            <button 
              type="button"
              onClick={addItem}
              className="bg-[#003366] text-white px-6 py-2.5 font-bold flex items-center gap-2 hover:bg-[#002244] transition-all text-sm shadow-sm rounded-none"
            >
              <Plus size={18} /> Adicionar a lista
            </button>
          </div>
          
          <div className="space-y-4">
            {items.map((item, idx) => (
              <div key={idx} className="bg-zinc-50 p-4 border border-zinc-100 space-y-4">
                <div className="grid grid-cols-12 gap-4 items-end">
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Produto/Serviço</label>
                    <select 
                      value={item.product_id || ''} 
                      onChange={(e) => updateItem(idx, 'product_id', e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded-none px-3 py-2 text-xs text-zinc-800 focus:outline-none focus:border-[#003366]"
                    >
                      <option value="">Manual...</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-6 space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Descrição</label>
                    <input 
                      type="text" 
                      value={item.description} 
                      onChange={(e) => updateItem(idx, 'description', e.target.value)}
                      placeholder="Descrição do item"
                      required
                      className="w-full bg-white border border-zinc-200 rounded-none px-3 py-2 text-xs text-zinc-800 focus:outline-none focus:border-[#003366]"
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Tipologia</label>
                    <select 
                      value={item.tipologia || 'Mercadoria'} 
                      onChange={(e) => updateItem(idx, 'tipologia', e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded-none px-3 py-2 text-xs text-zinc-800 focus:outline-none focus:border-[#003366]"
                    >
                      <option value="Mercadoria">Mercadoria</option>
                      <option value="importação">Importação</option>
                      <option value="serviços no estrangeiro">Serviços no estrangeiro</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Tipo Artigo</label>
                    <select 
                      value={item.tipo_artigo || 'produto'} 
                      onChange={(e) => updateItem(idx, 'tipo_artigo', e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded-none px-3 py-2 text-xs text-zinc-800 focus:outline-none focus:border-[#003366]"
                    >
                      <option value="produto">Produto</option>
                      <option value="serviço">Serviço</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Taxa</label>
                    <select 
                      value={item.tax || ALL_TAXES[0]} 
                      onChange={(e) => updateItem(idx, 'tax', e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded-none px-3 py-2 text-xs text-zinc-800 focus:outline-none focus:border-[#003366]"
                    >
                      {ALL_TAXES.map((taxName, i) => (
                        <option key={i} value={taxName}>{taxName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-1 flex justify-end pb-1">
                    <button 
                      type="button" 
                      onClick={() => removeItem(idx)}
                      className="text-zinc-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-4 items-end">
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Qtd</label>
                    <input 
                      type="number" 
                      value={item.quantity} 
                      onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                      required
                      className="w-full bg-white border border-zinc-200 rounded-none px-3 py-2 text-xs text-zinc-800 focus:outline-none focus:border-[#003366]"
                    />
                  </div>
                  <div className="col-span-3 space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Preço Un.</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={item.unit_price} 
                      onChange={(e) => updateItem(idx, 'unit_price', Number(e.target.value))}
                      required
                      className="w-full bg-white border border-zinc-200 rounded-none px-3 py-2 text-xs text-zinc-800 focus:outline-none focus:border-[#003366]"
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Desconto</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={item.desconto || 0} 
                      onChange={(e) => updateItem(idx, 'desconto', Number(e.target.value))}
                      className="w-full bg-white border border-zinc-200 rounded-none px-3 py-2 text-xs text-zinc-800 focus:outline-none focus:border-[#003366]"
                    />
                  </div>
                  <div className="col-span-2 text-right pb-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase block mb-1">Total Item</label>
                    <p className="text-zinc-800 font-bold text-sm">
                      {formatCurrency(item.total || 0)}
                    </p>
                  </div>
                  <div className="col-span-3 flex items-center gap-2 pb-1">
                    <button 
                      type="button"
                      onClick={() => setExpandedDimensions(expandedDimensions === idx ? null : idx)}
                      className="p-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition-colors"
                      title="Dimensões"
                    >
                      <Layers size={16} />
                    </button>
                    <span className="text-[10px] text-zinc-400 font-medium">Dimensões</span>
                  </div>
                </div>

                {expandedDimensions === idx && (
                  <div className="grid grid-cols-3 gap-4 p-4 bg-white border border-zinc-200 animate-in fade-in slide-in-from-top-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase">Comprimento</label>
                      <input 
                        type="number" 
                        value={item.comprimento || 0} 
                        onChange={(e) => updateItem(idx, 'comprimento', Number(e.target.value))}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-3 py-2 text-xs text-zinc-800 focus:outline-none focus:border-[#003366]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase">Largura</label>
                      <input 
                        type="number" 
                        value={item.largura || 0} 
                        onChange={(e) => updateItem(idx, 'largura', Number(e.target.value))}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-3 py-2 text-xs text-zinc-800 focus:outline-none focus:border-[#003366]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase">Altura</label>
                      <input 
                        type="number" 
                        value={item.altura || 0} 
                        onChange={(e) => updateItem(idx, 'altura', Number(e.target.value))}
                        className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-3 py-2 text-xs text-zinc-800 focus:outline-none focus:border-[#003366]"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
            {items.length === 0 && (
              <div className="text-center py-12 text-zinc-400 border-2 border-dashed border-zinc-100 rounded-none text-sm bg-white">
                Nenhum item adicionado. Clique em "Adicionar a lista" para começar.
              </div>
            )}
          </div>

          <div className="flex justify-end pt-6">
            <div className="bg-zinc-50 p-6 space-y-4 border border-zinc-200 min-w-[320px]">
              <div className="flex justify-between text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                <span>Subtotal</span>
                <span>{formatCurrency(total)}</span>
              </div>
              {Number(globalDiscount) > 0 && (
                <div className="flex justify-between text-red-500 text-[10px] font-bold uppercase tracking-wider">
                  <span>Desconto Global</span>
                  <span>-{formatCurrency(Number(globalDiscount))}</span>
                </div>
              )}
              <div className="flex justify-between text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
                <span>IVA (14%)</span>
                <span>{formatCurrency(total * 0.14)}</span>
              </div>
              <div className="pt-4 border-t border-zinc-200 flex justify-between items-center">
                <span className="text-xs font-bold text-[#003366] uppercase tracking-widest">Total Final</span>
                <span className="text-3xl font-black text-[#003366]">{formatCurrency(finalTotal)}</span>
              </div>
              <div className="text-[9px] text-zinc-400 text-right italic mt-2">
                * Valores calculados em tempo real
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button 
            type="button" 
            onClick={onBack}
            className="px-8 py-3 rounded-none border border-zinc-300 text-zinc-700 font-bold hover:bg-zinc-50 transition-all text-sm shadow-sm"
          >
            Cancelar
          </button>
          <button 
            type="submit"
            disabled={items.length === 0}
            className="px-8 py-3 rounded-none bg-[#003366] text-white font-bold hover:bg-[#002244] disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm shadow-sm"
          >
            Emitir Documento
          </button>
        </div>
      </form>
    </div>
  );
};

const WorkSiteForm = ({ clients, onBack, onSuccess, initialData }: { clients: Client[], onBack: () => void, onSuccess: (site: Omit<WorkSite, 'id'>) => void, initialData?: WorkSite | null }) => {
  const [clientId, setClientId] = useState<number | ''>(initialData?.client_id || '');
  const [startDate, setStartDate] = useState(initialData?.start_date || '');
  const [endDate, setEndDate] = useState(initialData?.end_date || '');
  const [title, setTitle] = useState(initialData?.title || '');
  const [code, setCode] = useState(initialData?.code || '');
  const [staffPerDay, setStaffPerDay] = useState(initialData?.staff_per_day || 0);
  const [totalStaff, setTotalStaff] = useState(initialData?.total_staff || 0);
  const [location, setLocation] = useState(initialData?.location || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [contact, setContact] = useState(initialData?.contact || '');
  const [observations, setObservations] = useState(initialData?.observations || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      console.warn('Cannot submit WorkSiteForm: No client selected');
      return;
    }
    console.log('Submitting WorkSiteForm:', {
      client_id: Number(clientId),
      start_date: startDate,
      end_date: endDate,
      title,
      code,
      staff_per_day: staffPerDay,
      total_staff: totalStaff,
      location,
      description,
      contact,
      observations
    });
    onSuccess({
      client_id: Number(clientId),
      start_date: startDate,
      end_date: endDate,
      title,
      code,
      staff_per_day: staffPerDay,
      total_staff: totalStaff,
      location,
      description,
      contact,
      observations
    });
  };

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Seleccione um Cliente</label>
        <select 
          value={clientId} onChange={e => setClientId(Number(e.target.value))} required
          className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm"
        >
          <option value="">Selecionar Cliente...</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Titulo da Obra/Serviço</label>
        <input 
          type="text" value={title} onChange={e => setTitle(e.target.value)} required
          placeholder="Digite o título da obra ou serviço"
          className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Data de Abertura de Obra/Serviço</label>
        <input 
          type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required
          className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Data de Encerramento de Obra/Serviço</label>
        <input 
          type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required
          className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">COD de Obra/Serv</label>
        <input 
          type="text" value={code} onChange={e => setCode(e.target.value)} required
          placeholder="Código identificador da obra"
          className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total de Efectivos por Dia</label>
        <input 
          type="number" value={staffPerDay} onChange={e => setStaffPerDay(Number(e.target.value))} required
          placeholder="Número de trabalhadores diários"
          className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total de Efectivos</label>
        <input 
          type="number" value={totalStaff} onChange={e => setTotalStaff(Number(e.target.value))} required
          placeholder="Total de trabalhadores no projeto"
          className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Localização da Obra/Serviço</label>
        <input 
          type="text" value={location} onChange={e => setLocation(e.target.value)} required
          placeholder="Endereço ou coordenadas da obra"
          className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Contacto da Obra/Serviço</label>
        <input 
          type="text" value={contact} onChange={e => setContact(e.target.value)} required
          placeholder="Telefone ou responsável no local"
          className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Descrição da Obra/Serviço</label>
        <textarea 
          value={description} onChange={e => setDescription(e.target.value)} required
          placeholder="Breve descrição dos trabalhos a realizar"
          className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm min-h-[80px]"
        />
      </div>
      <div className="md:col-span-2 space-y-1">
        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Observações</label>
        <textarea 
          value={observations} onChange={e => setObservations(e.target.value)}
          placeholder="Notas adicionais ou restrições"
          className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm min-h-[80px]"
        />
      </div>
      <div className="md:col-span-2 flex justify-end gap-3">
        <button type="button" onClick={onBack} className="text-zinc-500 hover:text-zinc-700 text-sm font-medium">Cancelar</button>
        <button type="submit" className="bg-[#003366] text-white font-bold px-8 py-2.5 rounded-none hover:bg-[#002244] transition-all text-sm shadow-sm">
          {initialData ? 'Atualizar' : 'Registar'}
        </button>
      </div>
    </form>
  );
};

const WorkSiteMovementForm = ({ onBack, onSuccess }: { onBack: () => void, onSuccess: (movement: any) => void }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [docNo, setDocNo] = useState('');
  const [company, setCompany] = useState('');
  const [description, setDescription] = useState('');
  const [debit, setDebit] = useState<number>(0);
  const [credit, setCredit] = useState<number>(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSuccess({ date, doc_no: docNo, company, description, debit, credit });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-zinc-400 uppercase">Data</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full border border-zinc-300 rounded-none px-3 py-2 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-zinc-400 uppercase">Nº Documento</label>
          <input type="text" value={docNo} onChange={e => setDocNo(e.target.value)} placeholder="Ex: FT-2026/001" className="w-full border border-zinc-300 rounded-none px-3 py-2 text-sm" />
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-zinc-400 uppercase">Empresa/Entidade</label>
        <input type="text" value={company} onChange={e => setCompany(e.target.value)} placeholder="Nome da empresa" className="w-full border border-zinc-300 rounded-none px-3 py-2 text-sm" />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-zinc-400 uppercase">Descrição</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descrição do movimento" className="w-full border border-zinc-300 rounded-none px-3 py-2 text-sm min-h-[60px]" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-zinc-400 uppercase">Débito (Saída)</label>
          <input type="number" value={debit} onChange={e => setDebit(Number(e.target.value))} className="w-full border border-zinc-300 rounded-none px-3 py-2 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-zinc-400 uppercase">Crédito (Entrada)</label>
          <input type="number" value={credit} onChange={e => setCredit(Number(e.target.value))} className="w-full border border-zinc-300 rounded-none px-3 py-2 text-sm" />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-4">
        <button type="button" onClick={onBack} className="text-zinc-500 hover:text-zinc-700 text-sm font-medium">Cancelar</button>
        <button type="submit" className="bg-[#003366] text-white font-bold px-6 py-2 rounded-none hover:bg-[#002244] text-sm">Salvar Movimento</button>
      </div>
    </form>
  );
};

const WorkSiteManagement = ({ workSite, movements, onBack }: { workSite: WorkSite, movements: WorkSiteMovement[], onBack: () => void }) => {
  const totalDebit = movements.reduce((sum, m) => sum + m.debit, 0);
  const totalCredit = movements.reduce((sum, m) => sum + m.credit, 0);
  const currentBalance = movements.length > 0 ? movements[movements.length - 1].balance : 0;

  return (
    <div className="bg-white min-h-screen p-8 sm:p-12 space-y-10 max-w-6xl mx-auto shadow-2xl border border-zinc-100">
      {/* Report Header */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-8 border-b-2 border-[#003366] pb-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#003366] flex items-center justify-center text-white">
              <Layers size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-[#003366] tracking-tighter uppercase">Relatório de Gestão</h1>
              <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-[0.2em]">Local de Trabalho / Obra</p>
            </div>
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-zinc-800">{workSite.title}</h2>
            <p className="text-zinc-500 text-sm font-medium flex items-center gap-2">
              <span className="bg-zinc-100 px-2 py-0.5 text-[#003366] font-bold text-[10px]">{workSite.code}</span>
              <span>{workSite.location}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-12 gap-y-4 text-sm">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Data de Início</p>
            <p className="font-bold text-zinc-700">{new Date(workSite.start_date).toLocaleDateString('pt-PT')}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Data de Fim</p>
            <p className="font-bold text-zinc-700">{new Date(workSite.end_date).toLocaleDateString('pt-PT')}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Cliente Responsável</p>
            <p className="font-bold text-zinc-700">{workSite.client_name}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Contacto</p>
            <p className="font-bold text-zinc-700">{workSite.contact}</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-0 border border-zinc-200 divide-x divide-zinc-200">
        <div className="p-8 bg-zinc-50/50">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Total de Efectivos</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-zinc-800">{workSite.total_staff}</span>
            <span className="text-xs text-zinc-400 font-bold uppercase">Pessoas</span>
          </div>
          <p className="text-[10px] text-zinc-400 mt-1 font-bold italic">{workSite.staff_per_day} por dia</p>
        </div>
        <div className="p-8">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Total Débito</p>
          <p className="text-2xl font-black text-red-600">{formatCurrency(totalDebit)}</p>
        </div>
        <div className="p-8">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Total Crédito</p>
          <p className="text-2xl font-black text-emerald-600">{formatCurrency(totalCredit)}</p>
        </div>
        <div className="p-8 bg-[#003366] text-white">
          <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-2">Saldo de Obra</p>
          <p className="text-2xl font-black">{formatCurrency(currentBalance)}</p>
        </div>
      </div>

      {/* Movements Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-[#003366] uppercase tracking-widest flex items-center gap-2">
            <div className="w-1 h-4 bg-[#003366]"></div>
            Histórico de Movimentação Financeira
          </h3>
          <div className="flex gap-2 no-print">
            <button onClick={() => window.print()} className="p-2 border border-zinc-200 hover:bg-zinc-50 transition-colors text-zinc-500">
              <Printer size={18} />
            </button>
            <button onClick={onBack} className="px-4 py-2 bg-zinc-100 text-zinc-600 text-xs font-bold uppercase tracking-widest hover:bg-zinc-200 transition-colors">
              Voltar
            </button>
          </div>
        </div>

        <div className="border border-zinc-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-100 border-b border-zinc-200 text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Documento</th>
                <th className="px-6 py-4">Entidade</th>
                <th className="px-6 py-4">Descrição</th>
                <th className="px-6 py-4 text-right">Débito</th>
                <th className="px-6 py-4 text-right">Crédito</th>
                <th className="px-6 py-4 text-right bg-zinc-200/50">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-xs">
              {movements.map((m) => (
                <tr key={m.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-zinc-500">{new Date(m.date).toLocaleDateString('pt-PT')}</td>
                  <td className="px-6 py-4 font-bold text-zinc-800">{m.doc_no}</td>
                  <td className="px-6 py-4 text-zinc-600">{m.company}</td>
                  <td className="px-6 py-4 text-zinc-500 italic">{m.description}</td>
                  <td className="px-6 py-4 text-right text-red-600 font-bold">{m.debit > 0 ? formatCurrency(m.debit) : '-'}</td>
                  <td className="px-6 py-4 text-right text-emerald-600 font-bold">{m.credit > 0 ? formatCurrency(m.credit) : '-'}</td>
                  <td className="px-6 py-4 text-right font-black text-[#003366] bg-zinc-50/50">{formatCurrency(m.balance)}</td>
                </tr>
              ))}
              {movements.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center text-zinc-400 font-medium italic">
                    Nenhum registo de movimentação encontrado para este local.
                  </td>
                </tr>
              )}
            </tbody>
            {movements.length > 0 && (
              <tfoot>
                <tr className="bg-zinc-50 border-t-2 border-zinc-200 font-black text-xs">
                  <td colSpan={4} className="px-6 py-4 text-right uppercase tracking-widest text-zinc-400">Totais Acumulados</td>
                  <td className="px-6 py-4 text-right text-red-600">{formatCurrency(totalDebit)}</td>
                  <td className="px-6 py-4 text-right text-emerald-600">{formatCurrency(totalCredit)}</td>
                  <td className="px-6 py-4 text-right text-[#003366] bg-zinc-200/50">{formatCurrency(currentBalance)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Footer / Signature */}
      <div className="pt-20 grid grid-cols-2 gap-20 text-center">
        <div className="space-y-8">
          <div className="border-b border-zinc-300 pb-2"></div>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Responsável pela Obra</p>
        </div>
        <div className="space-y-8">
          <div className="border-b border-zinc-300 pb-2"></div>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Administração / Contabilidade</p>
        </div>
      </div>
      
      <div className="text-center pt-10">
        <p className="text-[9px] text-zinc-300 font-bold uppercase tracking-[0.3em]">Documento gerado em {new Date().toLocaleString('pt-PT')}</p>
      </div>
    </div>
  );
};

const InvoiceDetail = ({ id, onBack }: { id: number, onBack: () => void }) => {
  const [invoice, setInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    fetch(`/api/invoices/${id}`)
      .then(res => res.json())
      .then(data => setInvoice(data));
  }, [id]);

  if (!invoice) return <div className="p-8">Carregando...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-zinc-100 rounded-full text-zinc-400 hover:text-[#003366] transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-2xl font-bold text-[#003366] tracking-tight">Fatura {invoice.invoice_number}</h2>
        </div>
        <div className="flex gap-3">
          <button className="bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 px-4 py-2 rounded-none flex items-center gap-2 transition-all text-sm shadow-sm">
            <Printer size={18} /> Imprimir
          </button>
          <button className="bg-[#003366] hover:bg-[#002244] text-white font-bold px-4 py-2 rounded-none flex items-center gap-2 transition-all text-sm shadow-sm">
            <Download size={18} /> Baixar PDF
          </button>
        </div>
      </div>

      <div className="bg-white text-zinc-950 p-12 rounded-none shadow-2xl border border-zinc-100 space-y-12">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-black text-[#003366]">FaturaPronta</h1>
            <div className="mt-4 text-sm text-zinc-500">
              <p>Rua da Inovação, 123</p>
              <p>1000-001 Lisboa, Portugal</p>
              <p>NIF: 500 000 000</p>
            </div>
          </div>
          <div className="text-right">
            <h3 className="text-2xl font-bold uppercase tracking-tighter text-[#003366]">Fatura</h3>
            <p className="text-zinc-400 font-mono text-sm">{invoice.invoice_number}</p>
            <div className="mt-4 text-sm">
              <p><span className="font-bold text-zinc-700">Data:</span> {new Date(invoice.date).toLocaleDateString('pt-PT')}</p>
              {invoice.due_date && <p><span className="font-bold text-zinc-700">Vencimento:</span> {new Date(invoice.due_date).toLocaleDateString('pt-PT')}</p>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-12">
          <div>
            <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Faturado a:</h4>
            <div className="text-lg font-bold text-zinc-800">
              <p>{invoice.client_name}</p>
              <p className="text-sm font-normal text-zinc-500">{invoice.client_address}</p>
              <p className="text-sm font-normal text-zinc-500">NIF: {invoice.client_nif}</p>
              <p className="text-sm font-normal text-zinc-500">{invoice.client_email}</p>
            </div>
          </div>
        </div>

        <table className="w-full text-left">
          <thead>
            <tr className="border-b-2 border-zinc-100 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              <th className="py-4">Descrição</th>
              <th className="py-4 text-center">Qtd</th>
              <th className="py-4 text-right">Preço Un.</th>
              <th className="py-4 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50 text-sm">
            {invoice.items?.map((item, idx) => (
              <tr key={idx}>
                <td className="py-4 font-medium text-zinc-800">{item.description}</td>
                <td className="py-4 text-center text-zinc-500">{item.quantity}</td>
                <td className="py-4 text-right text-zinc-500">
                  {formatCurrency(item.unit_price)}
                </td>
                <td className="py-4 text-right font-bold text-zinc-800">
                  {formatCurrency(item.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end pt-8 border-t-2 border-zinc-100">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm text-zinc-500">
              <span>Subtotal</span>
              <span>{formatCurrency(invoice.total)}</span>
            </div>
            <div className="flex justify-between text-sm text-zinc-500">
              <span>IVA (0%)</span>
              <span>0,00 Kz</span>
            </div>
            <div className="flex justify-between text-2xl font-black pt-4 border-t border-zinc-100">
              <span className="text-zinc-800">Total</span>
              <span className="text-[#003366]">{formatCurrency(invoice.total)}</span>
            </div>
          </div>
        </div>

        <div className="pt-12 text-center text-[10px] text-zinc-400 uppercase tracking-widest">
          <p>Obrigado pela sua preferência!</p>
          <p className="mt-1">Processado por computador • FaturaPronta Software</p>
        </div>
      </div>
    </div>
  );
};

const ClientList = ({ clients, onRefresh }: { clients: Client[], onRefresh: () => void }) => {
  const [showForm, setShowForm] = useState(false);
  const [showContaCorrente, setShowContaCorrente] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [nif, setNif] = useState('');
  const [address, setAddress] = useState('');
  const [localidade, setLocalidade] = useState('');
  const [codigo_postal, setCodigoPostal] = useState('');
  const [provincia, setProvincia] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [pais, setPais] = useState('');
  const [telefone, setTelefone] = useState('');
  const [webpage, setWebpage] = useState('');
  const [tipo_cliente, setTipoCliente] = useState('normal');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting client:', { name, email, nif, address, localidade, codigo_postal, provincia, municipio, pais, telefone, webpage, tipo_cliente });
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, nif, address, localidade, codigo_postal, provincia, municipio, pais, telefone, webpage, tipo_cliente })
      });
      if (res.ok) {
        console.log('Client registered successfully');
        setName(''); setEmail(''); setNif(''); setAddress(''); setLocalidade(''); setCodigoPostal(''); setProvincia(''); setMunicipio(''); setPais(''); setTelefone(''); setWebpage(''); setTipoCliente('normal');
        setShowForm(false);
        onRefresh();
      } else {
        const err = await res.text();
        console.error('Failed to register client:', err);
      }
    } catch (error) {
      console.error('Error registering client:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-[#003366] tracking-tight">Clientes</h2>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowForm(true)}
            className="bg-[#003366] hover:bg-[#002244] text-white font-bold px-6 py-2.5 rounded-none flex items-center gap-2 transition-all shadow-sm text-sm"
          >
            <Plus size={18} />
            Novo Cliente
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <div className="bg-white border border-zinc-200 p-8 rounded-none shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Contribuinte</label>
                  <input type="text" value={nif} onChange={e => setNif(e.target.value)} className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" placeholder="NIF" />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Nome do Cliente</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" placeholder="Nome" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Morada</label>
                  <input type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" placeholder="Morada" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Localidade</label>
                  <input type="text" value={localidade} onChange={e => setLocalidade(e.target.value)} className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" placeholder="Localidade" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Código Postal</label>
                  <input type="text" value={codigo_postal} onChange={e => setCodigoPostal(e.target.value)} className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" placeholder="Código Postal" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Província</label>
                  <select value={provincia} onChange={e => setProvincia(e.target.value)} className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm">
                    <option value="">Selecione</option>
                    <option value="Luanda">Luanda</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Município</label>
                  <select value={municipio} onChange={e => setMunicipio(e.target.value)} className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm">
                    <option value="">Selecione</option>
                    <option value="Luanda">Luanda</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">País</label>
                  <select value={pais} onChange={e => setPais(e.target.value)} className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm">
                    <option value="AO">Angola</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Telefone</label>
                  <input type="text" value={telefone} onChange={e => setTelefone(e.target.value)} className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" placeholder="(+000) 000 000 000" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" placeholder="Email" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">WebPage</label>
                  <input type="text" value={webpage} onChange={e => setWebpage(e.target.value)} className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" placeholder="WebPage" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Tipo de Cliente</label>
                  <select value={tipo_cliente} onChange={e => setTipoCliente(e.target.value)} className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm">
                    <option value="nao_grupo">Cliente Não Grupo</option>
                    <option value="nacionais">Nacionais</option>
                    <option value="estrangeiro">Estrangeiro</option>
                    <option value="associados">Associados</option>
                    <option value="normal">Normal</option>
                  </select>
                </div>
                <div className="md:col-span-3 flex justify-end gap-3">
                  <button type="button" onClick={() => setShowForm(false)} className="text-zinc-500 hover:text-zinc-700 text-sm font-medium">Cancelar</button>
                  <button type="submit" className="bg-[#003366] text-white font-bold px-6 py-2 rounded-none hover:bg-[#002244] transition-all text-sm">Guardar Cliente</button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
        {showContaCorrente && selectedClient && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-8 rounded-none shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-[#003366]">Conta Corrente: {selectedClient.name}</h2>
                <button onClick={() => setShowContaCorrente(false)} className="text-zinc-500 hover:text-zinc-700">Fechar</button>
              </div>
              {/* Conta Corrente content */}
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-zinc-50 p-4 rounded-none border border-zinc-200">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase">Total Débito</p>
                    <p className="text-xl font-bold text-[#003366]">0,00</p>
                  </div>
                  <div className="bg-zinc-50 p-4 rounded-none border border-zinc-200">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase">Total Crédito</p>
                    <p className="text-xl font-bold text-[#003366]">0,00</p>
                  </div>
                  <div className="bg-zinc-50 p-4 rounded-none border border-zinc-200">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase">Saldo Atual</p>
                    <p className="text-xl font-bold text-[#003366]">0,00</p>
                  </div>
                </div>

                <table className="w-full text-sm text-left">
                  <thead className="text-zinc-400 uppercase text-[10px] border-b border-zinc-200">
                    <tr>
                      <th className="py-3">Data</th>
                      <th className="py-3">Documento</th>
                      <th className="py-3">Descrição</th>
                      <th className="py-3 text-right">Débito</th>
                      <th className="py-3 text-right">Crédito</th>
                      <th className="py-3 text-right">Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    <tr>
                      <td className="py-3 text-zinc-600">12/03/2026</td>
                      <td className="py-3 text-zinc-800 font-medium">FT 2026/001</td>
                      <td className="py-3 text-zinc-600">Venda de mercadoria</td>
                      <td className="py-3 text-right text-zinc-800">100,00</td>
                      <td className="py-3 text-right text-zinc-800">0,00</td>
                      <td className="py-3 text-right text-zinc-800 font-bold">100,00</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.map(client => (
          <div key={client.id} className="bg-white border border-zinc-200 p-6 rounded-none hover:border-[#003366]/30 transition-all group shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-zinc-50 rounded-full flex items-center justify-center text-[#003366] font-bold text-xl border border-zinc-100">
                {client.name[0]}
              </div>
              <div className="flex gap-2">
                <button className="text-zinc-300 hover:text-[#003366] transition-colors" title="Editar Cliente">
                  <Edit size={16} />
                </button>
                <button onClick={() => { setSelectedClient(client); setShowContaCorrente(true); }} className="text-zinc-300 hover:text-[#003366] transition-colors" title="Conta Corrente">
                  <FileText size={16} />
                </button>
                <button className="text-zinc-300 hover:text-[#003366] transition-colors" title="Envio Conta Corrente Email">
                  <Download size={16} />
                </button>
                <button className="text-zinc-300 hover:text-red-500 transition-colors" title="Eliminar">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <h3 className="text-[#003366] font-bold text-lg">{client.name}</h3>
            <p className="text-zinc-400 text-xs mt-1">{client.email || 'Sem email'}</p>
            <div className="mt-4 pt-4 border-t border-zinc-50 space-y-2">
              <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">NIF: <span className="text-zinc-600 ml-1">{client.nif || '---'}</span></p>
              <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Morada: <span className="text-zinc-600 ml-1 truncate block">{client.address || '---'}</span></p>
            </div>
          </div>
        ))}
        {clients.length === 0 && (
          <div className="col-span-full p-12 text-center text-zinc-400 text-sm">Nenhum cliente registado.</div>
        )}
      </div>
    </div>
  );
};

const WarehouseModule = ({ onRefresh }: { onRefresh: () => void }) => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [localidade, setLocalidade] = useState('');
  const [provincia, setProvincia] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [contacto, setContacto] = useState('');
  const [observacao, setObservacao] = useState('');

  useEffect(() => {
    fetch('/api/warehouses').then(r => r.json()).then(setWarehouses);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/warehouses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, localidade, provincia, responsavel, contacto, observacao })
    });
    if (res.ok) {
      setName(''); setLocalidade(''); setProvincia(''); setResponsavel(''); setContacto(''); setObservacao('');
      setShowForm(false);
      fetch('/api/warehouses').then(r => r.json()).then(setWarehouses);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-[#003366]">Armazéns</h3>
        <button 
          onClick={() => setShowForm(true)}
          className="bg-[#003366] text-white px-4 py-2 text-sm font-bold rounded-none hover:bg-[#002244]"
        >
          Criar Armazém
        </button>
      </div>

      <table className="w-full text-sm text-left">
        <thead className="text-zinc-400 uppercase text-[10px] border-b border-zinc-200">
          <tr>
            <th className="py-3">Nome</th>
            <th className="py-3">Localidade</th>
            <th className="py-3">Responsável</th>
            <th className="py-3">Contacto</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {warehouses.map(w => (
            <tr key={w.id}>
              <td className="py-3 font-semibold text-zinc-800">{w.name}</td>
              <td className="py-3 text-zinc-600">{w.localidade}</td>
              <td className="py-3 text-zinc-600">{w.responsavel}</td>
              <td className="py-3 text-zinc-600">{w.contacto}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-white p-8 rounded-none shadow-2xl"
          >
            <h3 className="font-bold text-[#003366] mb-6 text-xl">Novo Armazém</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="text" placeholder="Nome do armazém" value={name} onChange={e => setName(e.target.value)} required className="w-full border border-zinc-300 rounded-none px-4 py-2 text-sm" />
              <input type="text" placeholder="Localidade" value={localidade} onChange={e => setLocalidade(e.target.value)} className="w-full border border-zinc-300 rounded-none px-4 py-2 text-sm" />
              <input type="text" placeholder="Província" value={provincia} onChange={e => setProvincia(e.target.value)} className="w-full border border-zinc-300 rounded-none px-4 py-2 text-sm" />
              <input type="text" placeholder="Responsável" value={responsavel} onChange={e => setResponsavel(e.target.value)} className="w-full border border-zinc-300 rounded-none px-4 py-2 text-sm" />
              <input type="text" placeholder="Contacto" value={contacto} onChange={e => setContacto(e.target.value)} className="w-full border border-zinc-300 rounded-none px-4 py-2 text-sm" />
              <textarea placeholder="Observação" value={observacao} onChange={e => setObservacao(e.target.value)} className="w-full border border-zinc-300 rounded-none px-4 py-2 text-sm" />
              <div className="flex justify-end gap-4 mt-6">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-zinc-600">Cancelar</button>
                <button type="submit" className="bg-[#003366] text-white px-6 py-2 text-sm font-bold rounded-none">Registar</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

const SupplierModule = () => {
  const [activeTab, setActiveTab] = useState('suppliers');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [nif, setNif] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    fetch('/api/suppliers').then(r => r.json()).then(setSuppliers);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/suppliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, nif, email, phone, address })
    });
    if (res.ok) {
      setName(''); setNif(''); setEmail(''); setPhone(''); setAddress('');
      setShowForm(false);
      fetch('/api/suppliers').then(r => r.json()).then(setSuppliers);
    }
  };

  const tabs = [
    { id: 'suppliers', label: 'Fornecedores' },
    { id: 'purchases', label: 'Registar Compras' },
    { id: 'reports', label: 'Relatórios' },
    { id: 'statement', label: 'Extrato de Movimento' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[#003366] tracking-tight">Fornecedores</h2>
      
      <div className="flex gap-4 border-b border-zinc-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-2 text-sm font-bold ${activeTab === tab.id ? 'text-[#003366] border-b-2 border-[#003366]' : 'text-zinc-500 hover:text-zinc-800'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'suppliers' && (
        <>
          <div className="flex justify-end">
            <button 
              onClick={() => setShowForm(true)}
              className="bg-[#003366] text-white px-4 py-2 text-sm font-bold rounded-none hover:bg-[#002244]"
            >
              Registar Fornecedor
            </button>
          </div>
          <table className="w-full text-sm text-left">
            <thead className="text-zinc-400 uppercase text-[10px] border-b border-zinc-200">
              <tr>
                <th className="py-3">Nome</th>
                <th className="py-3">NIF</th>
                <th className="py-3">Email</th>
                <th className="py-3">Telefone</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {suppliers.map(s => (
                <tr key={s.id}>
                  <td className="py-3 font-semibold text-zinc-800">{s.name}</td>
                  <td className="py-3 text-zinc-600">{s.nif}</td>
                  <td className="py-3 text-zinc-600">{s.email}</td>
                  <td className="py-3 text-zinc-600">{s.phone}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-white p-8 rounded-none shadow-2xl"
          >
            <h3 className="font-bold text-[#003366] mb-6 text-xl">Registar Fornecedor</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="text" placeholder="Nome" value={name} onChange={e => setName(e.target.value)} required className="w-full border border-zinc-300 rounded-none px-4 py-2 text-sm" />
              <input type="text" placeholder="NIF" value={nif} onChange={e => setNif(e.target.value)} className="w-full border border-zinc-300 rounded-none px-4 py-2 text-sm" />
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full border border-zinc-300 rounded-none px-4 py-2 text-sm" />
              <input type="text" placeholder="Telefone" value={phone} onChange={e => setPhone(e.target.value)} className="w-full border border-zinc-300 rounded-none px-4 py-2 text-sm" />
              <input type="text" placeholder="Endereço" value={address} onChange={e => setAddress(e.target.value)} className="w-full border border-zinc-300 rounded-none px-4 py-2 text-sm" />
              <div className="flex justify-end gap-4 mt-6">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-zinc-600">Cancelar</button>
                <button type="submit" className="bg-[#003366] text-white px-6 py-2 text-sm font-bold rounded-none">Registar</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

const ProductList = ({ products, onRefresh }: { products: Product[], onRefresh: () => void }) => {
  const [activeTab, setActiveTab] = useState('stock');
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [referente, setReferente] = useState('');
  const [dataRegisto, setDataRegisto] = useState('');
  const [armazem, setArmazem] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState('');
  const [precoCompra, setPrecoCompra] = useState('');
  const [precoVenda, setPrecoVenda] = useState('');
  const [finalidade, setFinalidade] = useState('');
  const [tipologia, setTipologia] = useState('mercadoria');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting product:', { name, referente, dataRegisto, armazem, tipoDocumento, precoCompra, precoVenda, finalidade, tipologia });
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name, 
        referente, 
        data_registo: dataRegisto, 
        armazem, 
        tipo_documento: tipoDocumento, 
        preco_compra: parseFloat(precoCompra), 
        preco_venda: parseFloat(precoVenda), 
        finalidade, 
        tipologia, 
        unit: 'un' 
      })
    });
    if (res.ok) {
      console.log('Product added successfully');
      setName(''); setReferente(''); setDataRegisto(''); setArmazem(''); setTipoDocumento(''); setPrecoCompra(''); setPrecoVenda(''); setFinalidade(''); setTipologia('mercadoria');
      setShowForm(false);
      onRefresh();
    } else {
      const err = await res.text();
      console.error('Failed to add product:', err);
      alert('Erro ao guardar produto: ' + err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4 border-b border-zinc-200">
        {['stock', 'movement', 'price', 'associate', 'warehouse'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 text-sm font-bold ${activeTab === tab ? 'text-[#003366] border-b-2 border-[#003366]' : 'text-zinc-500 hover:text-zinc-800'}`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'warehouse' ? (
        <WarehouseModule onRefresh={onRefresh} />
      ) : (
        <>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-[#003366]">Produtos & Serviços</h3>
            <button 
              onClick={() => setShowForm(true)}
              className="bg-[#003366] text-white px-4 py-2 text-sm font-bold rounded-none hover:bg-[#002244]"
            >
              Novo Produto
            </button>
          </div>
          {showForm && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-full max-w-4xl bg-white p-8 rounded-none shadow-2xl max-h-[90vh] overflow-y-auto"
              >
                <h3 className="font-bold text-[#003366] mb-6 text-xl">Novo Produto / Serviço</h3>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Produto</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Referente</label>
                    <input type="text" value={referente} onChange={e => setReferente(e.target.value)} className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Data de Registo</label>
                    <input type="date" value={dataRegisto} onChange={e => setDataRegisto(e.target.value)} className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Selecionar Armazém</label>
                    <input type="text" value={armazem} onChange={e => setArmazem(e.target.value)} className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Selecionar Tipo de Documento</label>
                    <input type="text" value={tipoDocumento} onChange={e => setTipoDocumento(e.target.value)} className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Preço de Compra</label>
                    <input type="number" step="0.01" value={precoCompra} onChange={e => setPrecoCompra(e.target.value)} className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Preço de Venda</label>
                    <input type="number" step="0.01" value={precoVenda} onChange={e => setPrecoVenda(e.target.value)} required className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Unificar Finalidade</label>
                    <input type="text" value={finalidade} onChange={e => setFinalidade(e.target.value)} className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Tipologia</label>
                    <select value={tipologia} onChange={e => setTipologia(e.target.value)} className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm">
                      <option value="mercadoria">Mercadoria</option>
                      <option value="produto_stock">Produto Stock</option>
                      <option value="outro">Outro</option>
                      <option value="em_producao">Em Produção</option>
                    </select>
                  </div>
                  <div className="md:col-span-3 flex justify-end gap-3 mt-6">
                    <button type="button" onClick={() => setShowForm(false)} className="text-zinc-500 hover:text-zinc-700 text-sm font-medium">Cancelar</button>
                    <button type="submit" className="bg-[#003366] text-white font-bold px-6 py-2 rounded-none hover:bg-[#002244] transition-all text-sm">Guardar Item</button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </>
      )}

      <div className="bg-white border border-zinc-200 rounded-none overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#003366] text-white text-[11px] uppercase tracking-wider font-bold">
              <th className="px-6 py-4">Nome</th>
              <th className="px-6 py-4">Unidade</th>
              <th className="px-6 py-4">Preço Base</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {products.map((prod) => (
              <tr key={prod.id} className="hover:bg-zinc-50 transition-colors text-xs text-zinc-600">
                <td className="px-6 py-4 text-zinc-800 font-medium">{prod.name}</td>
                <td className="px-6 py-4 text-zinc-400">{prod.unit}</td>
                <td className="px-6 py-4 text-zinc-800 font-bold">
                  {formatCurrency(prod.price)}
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-zinc-300 hover:text-red-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && (
          <div className="p-12 text-center text-zinc-400 text-sm">Nenhum produto ou serviço catalogado.</div>
        )}
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [fiscalYear, setFiscalYear] = useState('2026');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [issuedDocuments, setIssuedDocuments] = useState<IssuedDocument[]>([]);
  const [workSites, setWorkSites] = useState<WorkSite[]>([]);
  const [viewingInvoiceId, setViewingInvoiceId] = useState<number | null>(null);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<IssuedDocument | null>(null);
  const [showActionsModal, setShowActionsModal] = useState(false);

  const fetchData = async () => {
    try {
      console.log('Fetching data...');
      const results = await Promise.allSettled([
        fetch('/api/stats').then(r => r.json()),
        fetch('/api/clients').then(r => r.json()),
        fetch('/api/products').then(r => r.json()),
        fetch('/api/invoices').then(r => r.json()),
        fetch('/api/issued-documents').then(r => r.json()),
        fetch('/api/work-sites').then(r => r.json())
      ]);

      const [s, c, p, i, d, w] = results.map(res => res.status === 'fulfilled' ? res.value : null);
      
      console.log('Data fetched results:', { s, c, p, i, d, w });
      
      if (s) setStats(s);
      setClients(Array.isArray(c) ? c : []);
      setProducts(Array.isArray(p) ? p : []);
      setInvoices(Array.isArray(i) ? i : []);
      setIssuedDocuments(Array.isArray(d) ? d : []);
      setWorkSites(Array.isArray(w) ? w : []);
      
      console.log('Data state updated');
    } catch (error) {
      console.error('Critical error in fetchData:', error);
    }
  };

  const handleAddWorkSite = async (site: Omit<WorkSite, 'id'>) => {
    console.log('Adding work site:', site);
    try {
      const res = await fetch('/api/work-sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(site)
      });
      if (res.ok) {
        console.log('Work site added successfully');
        await fetchData();
      } else {
        const err = await res.text();
        console.error('Failed to add work site:', err);
      }
    } catch (error) {
      console.error('Error adding work site:', error);
    }
  };

  const handleUpdateWorkSite = async (id: number, site: Omit<WorkSite, 'id'>) => {
    console.log('Updating work site:', id, site);
    try {
      const res = await fetch(`/api/work-sites/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(site)
      });
      if (res.ok) {
        console.log('Work site updated successfully');
        await fetchData();
      } else {
        const err = await res.text();
        console.error('Failed to update work site:', err);
      }
    } catch (error) {
      console.error('Error updating work site:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const renderContent = () => {
    if (viewingInvoiceId) {
      return <InvoiceDetail id={viewingInvoiceId} onBack={() => setViewingInvoiceId(null)} />;
    }

    switch (activeTab) {
      case 'dashboard': return <Dashboard stats={stats} />;
      case 'pos': return <POSModule products={products} onRefresh={fetchData} />;
      case 'invoices': return (
        <InvoiceList 
          invoices={invoices} 
          clients={clients}
          workSites={workSites}
          onNew={() => setIsCreatingInvoice(true)} 
          onView={setViewingInvoiceId}
          onRegisterClient={() => setActiveTab('clients')}
          onAddWorkSite={handleAddWorkSite}
          onUpdateWorkSite={handleUpdateWorkSite}
        />
      );
      case 'tax-settings': return <TaxSeriesModule />;
      case 'issued-documents': return (
        <IssuedDocumentsList 
          documents={issuedDocuments} 
          onAction={(doc) => {
            setSelectedDocument(doc);
            setShowActionsModal(true);
          }}
        />
      );
      case 'cashier': return <CashierModule />;
      case 'clients': return <ClientList clients={clients} onRefresh={fetchData} />;
      case 'suppliers': return <SupplierModule />;
      case 'products': return <ProductList products={products} onRefresh={fetchData} />;
      case 'financial': return <FinancialModule />;
      case 'hr': return <HRModule onRefresh={fetchData} />;
      case 'accounting': return <AccountingModule />;
      case 'specialized': return <SpecializedManagementModule />;
      case 'settings': return <SettingsModule fiscalYear={fiscalYear} setFiscalYear={setFiscalYear} />;
      default: return <Dashboard stats={stats} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7f9] text-zinc-800 font-sans selection:bg-[#003366]/10">
      <Sidebar activeTab={activeTab} setActiveTab={(t) => {
        setActiveTab(t);
        setViewingInvoiceId(null);
        setIsCreatingInvoice(false);
      }} fiscalYear={fiscalYear} setFiscalYear={setFiscalYear} />
      <main className="ml-64 p-12 min-h-screen">
        <motion.div
          key={activeTab + viewingInvoiceId}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {renderContent()}
        </motion.div>
      </main>

      {showActionsModal && selectedDocument && (
        <DocumentActionsModal 
          document={selectedDocument} 
          onClose={() => setShowActionsModal(false)} 
        />
      )}

      <AnimatePresence>
        {isCreatingInvoice && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-12">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreatingInvoice(false)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-5xl bg-white rounded-none shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <h3 className="font-bold text-[#003366] flex items-center gap-2">
                  <FilePlus size={18} />
                  Emitir Novo Documento
                </h3>
                <button 
                  onClick={() => setIsCreatingInvoice(false)}
                  className="p-2 hover:bg-zinc-200 rounded-full transition-colors text-zinc-400 hover:text-zinc-600"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8">
                <CreateInvoice 
                  clients={clients} 
                  products={products} 
                  workSites={workSites}
                  onBack={() => setIsCreatingInvoice(false)} 
                  onSuccess={() => {
                    setIsCreatingInvoice(false);
                    fetchData();
                    setActiveTab('invoices');
                  }}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
