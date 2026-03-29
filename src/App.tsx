import React, { useState, useEffect } from 'react';
import PrintA4 from './components/PrintA4';
import { QRCodeCanvas } from 'qrcode.react';
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
  Check,
  Truck,
  Copy,
  XCircle,
  FileCode,
  FileDown,
  Send,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Tag,
  Wallet,
  BookOpen,
  Calculator,
  Settings,
  Calendar,
  Home,
  Link as LinkIcon,
  ShoppingCart,
  Database,
  FileJson,
  Book,
  MessageCircle,
  ShoppingBag,
  Store,
  Utensils,
  Wine,
  PlusCircle,
  ArrowRightLeft,
  UserCheck,
  AlertTriangle,
  Building2,
  FileBox,
  Paperclip,
  AlertCircle,
  MoreVertical,
  Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Client, Product, Invoice, DashboardStats, InvoiceItem, Employee, Profession, WorkSite, WorkSiteMovement, IssuedDocument, Warehouse, Supplier, FiscalSeries, CostCenter, POSPoint, CashSession, SystemUser, Purchase, PurchaseItem, POSArea } from './types';

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

const formatCurrency = (value: number | null | undefined) => {
  const val = value || 0;
  return new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(val).replace('AOA', 'Kz');
};

const calculateIRT = (salary: number | null | undefined) => {
  const s = salary || 0;
  if (s <= 100000) return 0;
  if (s <= 150000) return (s - 100000) * 0.13;
  if (s <= 200000) return 6500 + (s - 150000) * 0.16;
  if (s <= 300000) return 14500 + (s - 200000) * 0.18;
  if (s <= 500000) return 32500 + (s - 300000) * 0.19;
  if (s <= 1000000) return 70500 + (s - 500000) * 0.20;
  if (s <= 1500000) return 170500 + (s - 1000000) * 0.21;
  if (s <= 2000000) return 275500 + (s - 1500000) * 0.22;
  if (s <= 5000000) return 385500 + (s - 2000000) * 0.23;
  if (s <= 10000000) return 1075500 + (s - 5000000) * 0.24;
  return 2275500 + (s - 10000000) * 0.25;
};

const PrintP89 = ({ sale, clientName }: { sale: any, clientName?: string }) => {
  return (
    <div className="w-[80mm] bg-white p-4 text-black font-mono text-[10px] leading-tight">
      <div className="text-center mb-4">
        <h2 className="font-bold text-sm uppercase">FaturaPronta POS</h2>
        <p>NIF: 5000123456</p>
        <p>Rua Direita de Luanda, 123</p>
        <p>Tel: +244 923 000 000</p>
      </div>
      
      <div className="border-b border-dashed border-black mb-2 pb-2">
        <p>Data: {sale.date}</p>
        <p>Venda #: {sale.id}</p>
        <p>Operador: Admin</p>
        {clientName && <p>Cliente: {clientName}</p>}
      </div>
      
      <table className="w-full mb-2">
        <thead>
          <tr className="border-b border-dashed border-black">
            <th className="text-left py-1">Item</th>
            <th className="text-center py-1">Qtd</th>
            <th className="text-right py-1">Total</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(sale.items) && sale.items.map((item: any, i: number) => (
            <tr key={i}>
              <td className="py-1">{item.product.name}</td>
              <td className="text-center py-1">{item.qty}</td>
              <td className="text-right py-1">{formatCurrency(item.product.price * item.qty)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <div className="border-t border-dashed border-black pt-2 space-y-1">
        <div className="flex justify-between font-bold text-xs">
          <span>TOTAL</span>
          <span>{formatCurrency(sale.total)}</span>
        </div>
        <div className="flex justify-between">
          <span>Pago ({sale.payment_method})</span>
          <span>{formatCurrency(sale.total + (sale.change || 0))}</span>
        </div>
        <div className="flex justify-between">
          <span>Troco</span>
          <span>{formatCurrency(sale.change || 0)}</span>
        </div>
      </div>
      
      <div className="text-center mt-6 text-[8px]">
        <p>Obrigado pela sua preferência!</p>
        <p>Processado por computador</p>
      </div>
    </div>
  );
};

// --- Components ---

const Sidebar = ({ activeTab, setActiveTab, fiscalYear, setFiscalYear, onToggle }: { 
  activeTab: string, 
  setActiveTab: (t: string) => void, 
  fiscalYear: string, 
  setFiscalYear: (y: string) => void,
  onToggle: () => void
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
    { id: 'pos', label: 'Ponto de Venda', icon: Printer },
    { id: 'invoices', label: 'Faturas', icon: FileText },
    { id: 'cashier', label: 'Caixa', icon: Printer },
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'suppliers', label: 'Fornecedores', icon: Truck },
    { id: 'products', label: 'Produtos', icon: Package },
    { id: 'financial', label: 'Financeiro', icon: Download },
    { id: 'secretary', label: 'Secretária', icon: Layers },
    { id: 'hr', label: 'Recursos Humanos', icon: Users },
    { id: 'accounting', label: 'Contabilidade', icon: FileText },
    { id: 'specialized', label: 'Gestão Especializada', icon: LayoutDashboard },
    { id: 'settings', label: 'Configurações', icon: LayoutDashboard },
  ];

  return (
    <div className="w-64 bg-white text-zinc-600 h-screen sticky top-0 border-r border-zinc-200 flex flex-col overflow-y-auto shadow-sm shrink-0">
      <div className="p-6 border-b border-zinc-100 relative">
        <button 
          onClick={onToggle}
          className="absolute -right-3 top-6 bg-white border border-zinc-200 rounded-full p-1 text-[#003366] hover:bg-zinc-50 shadow-md z-10"
          title="Ocultar Barra Lateral"
        >
          <ChevronLeft size={16} />
        </button>
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
            {Array.isArray(stats.recentInvoices) && stats.recentInvoices.map((inv) => (
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

const INSS_PROFESSIONS = [
  "Administrador de Empresas", "Advogado", "Agente de Viagens", "Agricultor", "Ajudante de Cozinha", "Almoxarife", 
  "Analista de Sistemas", "Arquitecto", "Arquivista", "Assistente Administrativo", "Assistente Social", "Auditor", 
  "Auxiliar de Enfermagem", "Auxiliar de Escritório", "Auxiliar de Limpeza", "Auxiliar de Manutenção", "Bancário", 
  "Barbeiro", "Bibliotecário", "Biólogo", "Bombeiro", "Caixa", "Canalizador", "Carpinteiro", "Chef de Cozinha", 
  "Cobrador", "Comercial", "Contabilista", "Copeiro", "Costureira", "Cozinheiro", "Desenhador", "Digitador", 
  "Director Comercial", "Director de Recursos Humanos", "Director Financeiro", "Director Geral", "Director Técnico", 
  "Economista", "Electricista de Auto", "Electricista de Instalações", "Empregada Doméstica", "Enfermeiro Geral", 
  "Enfermeiro Especialista", "Engenheiro Civil", "Engenheiro de Minas", "Engenheiro de Petróleos", 
  "Engenheiro de Telecomunicações", "Engenheiro Electrotécnico", "Engenheiro Informático", "Engenheiro Mecânico", 
  "Engenheiro Químico", "Escriturário", "Estatístico", "Farmacêutico", "Fiel de Armazém", "Fisioterapeuta", 
  "Fotógrafo", "Geólogo", "Gerente de Loja", "Gestor de Projectos", "Guarda-Nocturno", "Informático", "Inspector", 
  "Instrumentista", "Jardineiro", "Jornalista", "Juiz", "Laborante", "Mecânico de Auto", "Mecânico de Pesados", 
  "Médico Especialista", "Médico Geral", "Mensageiro", "Mestre de Obras", "Montador", "Motorista de Ligeiros", 
  "Motorista de Pesados", "Nutricionista", "Oficial Administrativo", "Operador de Caixa", "Operador de Computadores", 
  "Operador de Máquinas", "Padeiro", "Pastelheiro", "Pedreiro", "Pintor", "Porteiro", "Professor do Ensino Primário", 
  "Professor do Ensino Secundário", "Professor Universitário", "Psicólogo", "Recepcionista", "Redactor", "Reparador", 
  "Secretária Executiva", "Secretária de Direcção", "Serralheiro", "Servente", "Sociólogo", "Soldador", 
  "Técnico de Contabilidade", "Técnico de Diagnóstico", "Técnico de Informática", "Técnico de Laboratório", 
  "Técnico de Marketing", "Técnico de Recursos Humanos", "Técnico de Seguros", "Técnico de Som", "Técnico de Vendas", 
  "Tesoureiro", "Topógrafo", "Traductor", "Vendedor", "Veterinário", "Vigilante", "Zelador"
];

const HRModule = ({ onRefresh }: { onRefresh: () => void }) => {
  const [activeTab, setActiveTab] = useState('list');
  const [professions, setProfessions] = useState<Profession[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showProfessionForm, setShowProfessionForm] = useState(false);
  const [showInssList, setShowInssList] = useState(false);
  const [inssProfession, setInssProfession] = useState('');
  const [companyProfession, setCompanyProfession] = useState('');
  const [baseSalary, setBaseSalary] = useState('');
  const [inssSearch, setInssSearch] = useState('');
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
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

  const handleDeleteProfession = async (id: number) => {
    if (!confirm('Tem a certeza que deseja eliminar esta profissão?')) return;
    try {
      await fetch(`/api/professions/${id}`, { method: 'DELETE' });
      fetchHRData();
    } catch (err) {
      console.error('Error deleting profession:', err);
    }
  };

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
    { id: 'professions', label: 'Criar Profissão' },
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
                <select 
                  value={professionId} 
                  onChange={e => {
                    const pid = e.target.value;
                    setProfessionId(pid);
                    const prof = professions.find(p => p.id === Number(pid));
                    if (prof && prof.base_salary) {
                      setSalary(String(prof.base_salary));
                    }
                  }} 
                  className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm"
                >
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
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-[#003366]">Gestão de Profissões</h3>
            </div>

            {!showProfessionForm ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button 
                  onClick={() => setShowProfessionForm(true)}
                  className="bg-white border-2 border-dashed border-zinc-200 p-12 flex flex-col items-center gap-4 hover:border-[#003366] hover:text-[#003366] transition-all group"
                >
                  <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center group-hover:bg-[#003366]/5 transition-colors">
                    <Plus size={32} className="text-[#003366]" />
                  </div>
                  <span className="font-bold uppercase tracking-widest text-xs">Registar Profissão</span>
                </button>
                
                <button 
                  onClick={() => setShowProfessionForm(false)}
                  className="bg-white border border-zinc-200 p-12 flex flex-col items-center gap-4 hover:border-[#003366] hover:text-[#003366] transition-all group"
                >
                  <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center group-hover:bg-[#003366]/5 transition-colors">
                    <FileText size={32} className="text-[#003366]" />
                  </div>
                  <span className="font-bold uppercase tracking-widest text-xs">Listar Profissões</span>
                </button>
              </div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-zinc-200 p-8 rounded-none shadow-sm space-y-6 relative"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1 relative">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Profissão INSS</label>
                    <div 
                      onClick={() => setShowInssList(true)}
                      className="w-full bg-zinc-50 border border-zinc-300 rounded-none px-4 py-2.5 text-zinc-800 cursor-pointer text-sm flex justify-between items-center"
                    >
                      <span>{inssProfession || 'Selecionar da Lista INSS'}</span>
                      <Search size={14} className="text-zinc-400" />
                    </div>
                    
                    {showInssList && (
                      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <motion.div 
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="bg-white w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col rounded-none shadow-2xl"
                        >
                          <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-[#003366] text-white">
                            <h4 className="font-bold">Lista de Profissões INSS (Angola)</h4>
                            <button onClick={() => setShowInssList(false)} className="hover:bg-white/10 p-1"><X size={20} /></button>
                          </div>
                          <div className="p-4 border-b border-zinc-100 bg-zinc-50">
                            <div className="relative">
                              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                              <input 
                                type="text"
                                placeholder="Pesquisar profissão..."
                                value={inssSearch}
                                onChange={e => setInssSearch(e.target.value)}
                                className="w-full bg-white border border-zinc-200 rounded-none pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-[#003366]"
                                autoFocus
                              />
                            </div>
                          </div>
                          <div className="overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {INSS_PROFESSIONS.filter(p => p.toLowerCase().includes(inssSearch.toLowerCase())).map(p => (
                              <button 
                                key={p}
                                onClick={() => {
                                  setInssProfession(p);
                                  setShowInssList(false);
                                  setInssSearch('');
                                }}
                                className="text-left p-3 hover:bg-zinc-50 border border-zinc-100 text-sm text-zinc-700 transition-colors"
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Profissão Empresa</label>
                    <input 
                      type="text" 
                      value={companyProfession}
                      onChange={e => setCompanyProfession(e.target.value)}
                      placeholder="Ex: Técnico Especialista"
                      className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-sm focus:outline-none focus:border-[#003366]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Salário Base</label>
                    <input 
                      type="number" 
                      value={baseSalary}
                      onChange={e => setBaseSalary(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-sm focus:outline-none focus:border-[#003366]"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                  <button 
                    onClick={() => setShowProfessionForm(false)}
                    className="text-zinc-500 hover:text-zinc-700 text-sm font-medium"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={async () => {
                      if (!inssProfession || !companyProfession || !baseSalary) {
                        alert('Por favor preencha todos os campos');
                        return;
                      }
                      await fetch('/api/professions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                          name: companyProfession,
                          inss_profession: inssProfession,
                          base_salary: Number(baseSalary)
                        })
                      });
                      setInssProfession('');
                      setCompanyProfession('');
                      setBaseSalary('');
                      setShowProfessionForm(false);
                      fetchHRData();
                    }}
                    className="bg-[#003366] text-white px-8 py-2 rounded-none text-sm font-bold hover:bg-[#002244] shadow-sm flex items-center gap-2"
                  >
                    <Check size={16} />
                    Registar
                  </button>
                </div>
              </motion.div>
            )}

            <div className="bg-white border border-zinc-200 rounded-none overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#003366] text-white text-[10px] uppercase tracking-wider font-bold">
                    <th className="px-6 py-4">Profissão Empresa</th>
                    <th className="px-6 py-4">Profissão INSS</th>
                    <th className="px-6 py-4 text-right">Salário Base</th>
                    <th className="px-6 py-4 text-right">INSS Trab. (3%)</th>
                    <th className="px-6 py-4 text-right">INSS Emp. (8%)</th>
                    <th className="px-6 py-4 text-right">Custo Total</th>
                    <th className="px-6 py-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {professions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-zinc-400 italic">
                        Nenhuma profissão registada.
                      </td>
                    </tr>
                  ) : professions.map(p => (
                    <tr key={p.id} className="hover:bg-zinc-50 transition-colors text-sm">
                      <td className="px-6 py-4 font-bold text-[#003366]">{p.name}</td>
                      <td className="px-6 py-4 text-zinc-500">{p.inss_profession || '---'}</td>
                      <td className="px-6 py-4 text-right font-medium text-zinc-900">{formatCurrency(p.base_salary || 0)}</td>
                      <td className="px-6 py-4 text-right text-red-500">-{formatCurrency((p.base_salary || 0) * 0.03)}</td>
                      <td className="px-6 py-4 text-right text-zinc-500">+{formatCurrency((p.base_salary || 0) * 0.08)}</td>
                      <td className="px-6 py-4 text-right font-black text-[#003366]">{formatCurrency((p.base_salary || 0) * 1.08)}</td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => handleDeleteProfession(p.id)}
                          className="text-zinc-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
          <div className="space-y-6">
            {!selectedReport ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { id: 'remunerations', label: 'Mapa de Remunerações', icon: Calculator },
                  { id: 'inss', label: 'Mapas de INSS', icon: ShieldCheck },
                  { id: 'irt', label: 'Mapas de IRT', icon: Wallet },
                  { id: 'vacations', label: 'Mapas de Férias', icon: Calendar },
                  { id: 'receipts', label: 'Recibos de Salário', icon: Printer },
                ].map((report) => (
                  <button 
                    key={report.id} 
                    onClick={() => setSelectedReport(report.id)}
                    className="bg-white border border-zinc-200 p-8 rounded-none shadow-sm hover:border-[#003366] transition-all flex flex-col items-center gap-4 group"
                  >
                    <div className="w-16 h-16 bg-[#003366]/5 text-[#003366] rounded-full flex items-center justify-center group-hover:bg-[#003366] group-hover:text-white transition-all">
                      <report.icon size={32} />
                    </div>
                    <span className="font-bold text-[#003366] uppercase tracking-widest text-xs">{report.label}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <button 
                    onClick={() => setSelectedReport(null)}
                    className="flex items-center gap-2 text-zinc-500 hover:text-[#003366] transition-colors font-bold text-sm"
                  >
                    <ArrowLeft size={16} />
                    Voltar aos Relatórios
                  </button>
                  <div className="flex gap-2">
                    <button className="bg-white border border-zinc-200 px-4 py-2 text-xs font-bold flex items-center gap-2 hover:bg-zinc-50">
                      <Printer size={14} /> Imprimir
                    </button>
                    <button className="bg-[#003366] text-white px-4 py-2 text-xs font-bold flex items-center gap-2 hover:bg-[#002244]">
                      <Download size={14} /> Exportar
                    </button>
                  </div>
                </div>

                {selectedReport === 'remunerations' && (
                  <div className="bg-white border border-zinc-200 rounded-none overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-zinc-100 bg-zinc-50 flex justify-between items-center">
                      <h3 className="font-bold text-[#003366]">Mapa de Remunerações - {new Date().toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[#003366] text-white text-[10px] uppercase tracking-wider font-bold">
                            <th className="px-6 py-4">Funcionário</th>
                            <th className="px-6 py-4">Cargo</th>
                            <th className="px-6 py-4 text-right">Salário Base</th>
                            <th className="px-6 py-4 text-right">INSS (3%)</th>
                            <th className="px-6 py-4 text-right">IRT</th>
                            <th className="px-6 py-4 text-right">Salário Líquido</th>
                            <th className="px-6 py-4 text-right">INSS Emp. (8%)</th>
                            <th className="px-6 py-4 text-right">Custo Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {localEmployees.map(emp => {
                            const inss3 = emp.salary * 0.03;
                            const inss8 = emp.salary * 0.08;
                            const irt = calculateIRT(emp.salary);
                            const net = emp.salary - inss3 - irt;
                            const total = emp.salary + inss8;
                            return (
                              <tr key={emp.id} className="hover:bg-zinc-50 transition-colors text-xs">
                                <td className="px-6 py-4 font-bold text-[#003366]">{emp.name}</td>
                                <td className="px-6 py-4 text-zinc-500">{emp.role}</td>
                                <td className="px-6 py-4 text-right font-medium">{formatCurrency(emp.salary)}</td>
                                <td className="px-6 py-4 text-right text-red-500">{formatCurrency(inss3)}</td>
                                <td className="px-6 py-4 text-right text-red-500">{formatCurrency(irt)}</td>
                                <td className="px-6 py-4 text-right font-bold text-emerald-600">{formatCurrency(net)}</td>
                                <td className="px-6 py-4 text-right text-zinc-500">{formatCurrency(inss8)}</td>
                                <td className="px-6 py-4 text-right font-black text-[#003366]">{formatCurrency(total)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-zinc-50 font-bold text-xs">
                            <td colSpan={2} className="px-6 py-4 text-[#003366]">TOTAIS</td>
                            <td className="px-6 py-4 text-right">{formatCurrency(localEmployees.reduce((sum, e) => sum + e.salary, 0))}</td>
                            <td className="px-6 py-4 text-right text-red-500">{formatCurrency(localEmployees.reduce((sum, e) => sum + e.salary * 0.03, 0))}</td>
                            <td className="px-6 py-4 text-right text-red-500">{formatCurrency(localEmployees.reduce((sum, e) => sum + calculateIRT(e.salary), 0))}</td>
                            <td className="px-6 py-4 text-right text-emerald-600">{formatCurrency(localEmployees.reduce((sum, e) => {
                              const inss3 = e.salary * 0.03;
                              const irt = calculateIRT(e.salary);
                              return sum + (e.salary - inss3 - irt);
                            }, 0))}</td>
                            <td className="px-6 py-4 text-right text-zinc-500">{formatCurrency(localEmployees.reduce((sum, e) => sum + e.salary * 0.08, 0))}</td>
                            <td className="px-6 py-4 text-right text-[#003366]">{formatCurrency(localEmployees.reduce((sum, e) => sum + e.salary * 1.08, 0))}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
                
                {selectedReport !== 'remunerations' && (
                  <div className="p-12 text-center text-zinc-400 italic bg-white border border-zinc-200">
                    Relatório em desenvolvimento...
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};


const DocumentActionsModal = ({ document, onClose, onAction }: { 
  document: IssuedDocument, 
  onClose: () => void,
  onAction: (action: string, doc: IssuedDocument) => void
}) => {
  const handleAction = (action: string) => {
    onAction(action, document);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-none shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-zinc-100 bg-zinc-50 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-[#003366] text-lg">{document.numero_documento}</h3>
            <p className="text-zinc-500 text-sm font-bold">{formatCurrency(document.contravalor)}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200 rounded-full transition-colors text-zinc-400">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-8 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            <button onClick={() => handleAction('edit')} className="flex flex-col items-center gap-3 p-6 border border-zinc-100 hover:bg-zinc-50 hover:border-[#003366]/20 transition-all group">
              <Edit size={24} className="text-zinc-400 group-hover:text-[#003366]" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 group-hover:text-[#003366] text-center">Editar Documento</span>
            </button>

            {!document.is_certified && (
              <button onClick={() => handleAction('delete')} className="flex flex-col items-center gap-3 p-6 border border-zinc-100 hover:bg-red-50 hover:border-red-200 transition-all group">
                <Trash2 size={24} className="text-zinc-400 group-hover:text-red-600" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 group-hover:text-red-600 text-center">Apagar Documento</span>
              </button>
            )}

            <button onClick={() => handleAction('email')} className="flex flex-col items-center gap-3 p-6 border border-zinc-100 hover:bg-zinc-50 transition-all group">
              <Mail size={24} className="text-zinc-400 group-hover:text-[#003366]" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 group-hover:text-[#003366] text-center">Enviar por Email</span>
            </button>

            <button onClick={() => handleAction('whatsapp')} className="flex flex-col items-center gap-3 p-6 border border-zinc-100 hover:bg-zinc-50 transition-all group">
              <Share2 size={24} className="text-zinc-400 group-hover:text-[#003366]" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 group-hover:text-[#003366] text-center">Partilhar Whatsapp</span>
            </button>

            <button onClick={() => handleAction('clone')} className="flex flex-col items-center gap-3 p-6 border border-zinc-100 hover:bg-zinc-50 transition-all group">
              <Copy size={24} className="text-zinc-400 group-hover:text-[#003366]" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 group-hover:text-[#003366] text-center">Clonar Documento</span>
            </button>

            <button onClick={() => handleAction('print_a4')} className="flex flex-col items-center gap-3 p-6 border border-zinc-100 hover:bg-zinc-50 transition-all group">
              <Printer size={24} className="text-zinc-400 group-hover:text-[#003366]" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 group-hover:text-[#003366] text-center">Imprimir A4</span>
            </button>

            <button onClick={() => handleAction('export_pdf')} className="flex flex-col items-center gap-3 p-6 border border-zinc-100 hover:bg-zinc-50 transition-all group">
              <FileDown size={24} className="text-zinc-400 group-hover:text-[#003366]" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 group-hover:text-[#003366] text-center">Exportar PDF</span>
            </button>

            <button onClick={() => handleAction('print_p24')} className="flex flex-col items-center gap-3 p-6 border border-zinc-100 hover:bg-zinc-50 transition-all group">
              <Printer size={24} className="text-zinc-400 group-hover:text-[#003366]" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 group-hover:text-[#003366] text-center">Imprimir P24</span>
            </button>

            <button onClick={() => handleAction('print_p24xl')} className="flex flex-col items-center gap-3 p-6 border border-zinc-100 hover:bg-zinc-50 transition-all group">
              <Printer size={24} className="text-zinc-400 group-hover:text-[#003366]" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 group-hover:text-[#003366] text-center">Imprimir P24-XL</span>
            </button>

            <button onClick={() => handleAction('print_p80')} className="flex flex-col items-center gap-3 p-6 border border-zinc-100 hover:bg-zinc-50 transition-all group">
              <Printer size={24} className="text-zinc-400 group-hover:text-[#003366]" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 group-hover:text-[#003366] text-center">Imprimir P80</span>
            </button>

            <button onClick={() => handleAction('cancel')} className="flex flex-col items-center gap-3 p-6 border border-zinc-100 hover:bg-zinc-50 transition-all group">
              <XCircle size={24} className="text-zinc-400 group-hover:text-red-600" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 group-hover:text-red-600 text-center">Anular Documento</span>
            </button>

            <button onClick={() => handleAction('delivery_guide')} className="flex flex-col items-center gap-3 p-6 border border-zinc-100 hover:bg-zinc-50 transition-all group">
              <Truck size={24} className="text-zinc-400 group-hover:text-[#003366]" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 group-hover:text-[#003366] text-center">Guia de Entrega</span>
            </button>

            <button onClick={() => handleAction('credit_note')} className="flex flex-col items-center gap-3 p-6 border border-zinc-100 hover:bg-zinc-50 transition-all group">
              <FileText size={24} className="text-zinc-400 group-hover:text-[#003366]" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 group-hover:text-[#003366] text-center">Nota de Crédito</span>
            </button>

            {(document.tipo_documento || '').toLowerCase().includes('fatura') && (
              <button onClick={() => handleAction('receipt')} className="flex flex-col items-center gap-3 p-6 border border-zinc-100 hover:bg-zinc-50 transition-all group">
                <CheckCircle size={24} className="text-zinc-400 group-hover:text-[#003366]" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 group-hover:text-[#003366] text-center">Emitir Recibo</span>
              </button>
            )}

            {document.moeda !== 'Kwanza' && (
              <button onClick={() => handleAction('draft')} className="flex flex-col items-center gap-3 p-6 border border-zinc-100 hover:bg-zinc-50 transition-all group">
                <FileCode size={24} className="text-zinc-400 group-hover:text-[#003366]" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 group-hover:text-[#003366] text-center">Draft</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const CertifyModal = ({ document, onConfirm, onClose }: { 
  document: IssuedDocument, 
  onConfirm: () => void, 
  onClose: () => void 
}) => {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-md bg-white rounded-none shadow-2xl p-8 text-center"
      >
        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <BadgeCheck size={32} className="text-amber-600" />
        </div>
        <h3 className="text-xl font-bold text-[#003366] mb-2">Certificar Documento</h3>
        <p className="text-zinc-500 text-sm mb-8">
          A certificação do documento <span className="font-bold text-zinc-800">{document.numero_documento}</span> é um processo <span className="text-red-600 font-bold uppercase">irreversível</span>. 
          Após a certificação, o documento será trancado e não poderá ser editado ou apagado.
        </p>
        <div className="flex flex-col gap-3">
          <button 
            onClick={onConfirm}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-none transition-all shadow-md"
          >
            Confirmar Certificação
          </button>
          <button 
            onClick={onClose}
            className="w-full py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 font-bold rounded-none transition-all"
          >
            Cancelar
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const ProfitLossReport = ({ fiscalYear }: { fiscalYear: string }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson(`/api/reports/profit-loss?year=${fiscalYear}`)
      .then(setData)
      .catch(err => console.error('Error fetching profit-loss report:', err))
      .finally(() => setLoading(false));
  }, [fiscalYear]);

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const formatValue = (val: number) => {
    return val.toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (loading) return <div className="p-12 text-center text-zinc-400 italic">Carregando relatório...</div>;

  const totals = data.reduce((acc, curr) => {
    Object.keys(curr).forEach(key => {
      if (key !== 'month') {
        acc[key] = (acc[key] || 0) + curr[key];
      }
    });
    return acc;
  }, {} as any);

  // Calculations for the footer
  const a = totals.facturacaoSImposto || 0;
  const b = totals.fornecedoresSImposto || 0;
  const c = totals.salarios || 0;
  const d = totals.inss || 0;
  const impPrevisional = (a - b - c - d) * 0.25;

  return (
    <div className="bg-white p-8 space-y-8 overflow-x-auto">
      <div className="flex justify-between items-start border-b border-zinc-200 pb-4">
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-zinc-800">C & V - COMERCIO GERAL E PRESTAÇÃO DE SERVIÇOS, LDA</h2>
          <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold">Movimentos Gerais Gestão Proveitos/Custos (Ordenados por Data Valor )</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-zinc-500">Exercício de {fiscalYear}</p>
          <div className="flex gap-2 mt-2">
            <button className="p-1.5 hover:bg-zinc-100 rounded-none border border-zinc-200 text-zinc-400">
              <FileSpreadsheet size={16} />
            </button>
            <button className="p-1.5 hover:bg-zinc-100 rounded-none border border-zinc-200 text-zinc-400">
              <FileDown size={16} />
            </button>
            <button className="p-1.5 bg-blue-50 text-blue-600 rounded-none border border-blue-100">
              <AlertCircle size={16} />
            </button>
          </div>
        </div>
      </div>

      <table className="w-full text-[10px] border-collapse">
        <thead>
          <tr className="border-b border-zinc-200">
            <th className="text-left py-2 font-bold text-zinc-600">Proveitos</th>
            {months.map(m => <th key={m} className="text-right py-2 px-1 font-bold text-zinc-600">{m}</th>)}
            <th className="text-right py-2 px-1 font-bold text-zinc-600">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          <tr>
            <td className="py-2 font-medium text-zinc-700">Facturação S/ imposto (a)</td>
            {data.map(d => <td key={d.month} className="text-right py-2 px-1 text-zinc-500">{formatValue(d.facturacaoSImposto)}</td>)}
            <td className="text-right py-2 px-1 font-bold text-zinc-700">{formatValue(totals.facturacaoSImposto)}</td>
          </tr>
          <tr>
            <td className="py-2 font-medium text-zinc-700">Imposto Recebido</td>
            {data.map(d => <td key={d.month} className="text-right py-2 px-1 text-zinc-500">{formatValue(d.impostoRecebido)}</td>)}
            <td className="text-right py-2 px-1 font-bold text-zinc-700">{formatValue(totals.impostoRecebido)}</td>
          </tr>
          <tr className="bg-zinc-50/50">
            <td className="py-2 font-bold text-zinc-800">Facturação c/ imposto</td>
            {data.map(d => <td key={d.month} className="text-right py-2 px-1 text-zinc-600 font-medium">{formatValue(d.facturacaoCImposto)}</td>)}
            <td className="text-right py-2 px-1 font-black text-zinc-900">{formatValue(totals.facturacaoCImposto)}</td>
          </tr>

          <tr><td colSpan={14} className="py-4"></td></tr>
          <tr className="border-b border-zinc-200">
            <th className="text-left py-2 font-bold text-zinc-600">Custos</th>
            {months.map(m => <th key={m} className="py-2"></th>)}
            <th></th>
          </tr>
          <tr>
            <td className="py-2 font-medium text-zinc-700">Custos Aceites S/ Imposto</td>
            {data.map(d => <td key={d.month} className="text-right py-2 px-1 text-zinc-500">{formatValue(d.custosAceites)}</td>)}
            <td className="text-right py-2 px-1 font-bold text-zinc-700">{formatValue(totals.custosAceites)}</td>
          </tr>
          <tr>
            <td className="py-2 font-medium text-zinc-700">Fornecedores S/ imposto(b)</td>
            {data.map(d => <td key={d.month} className="text-right py-2 px-1 text-zinc-500">{formatValue(d.fornecedoresSImposto)}</td>)}
            <td className="text-right py-2 px-1 font-bold text-zinc-700">{formatValue(totals.fornecedoresSImposto)}</td>
          </tr>
          <tr>
            <td className="py-2 font-medium text-zinc-700">Iva Suportado</td>
            {data.map(d => <td key={d.month} className="text-right py-2 px-1 text-zinc-500">{formatValue(d.ivaSuportado)}</td>)}
            <td className="text-right py-2 px-1 font-bold text-zinc-700">{formatValue(totals.ivaSuportado)}</td>
          </tr>
          <tr>
            <td className="py-2 font-medium text-zinc-700 italic text-blue-800">Salarios(c)</td>
            {data.map(d => <td key={d.month} className="text-right py-2 px-1 text-blue-800 italic">{formatValue(d.salarios)}</td>)}
            <td className="text-right py-2 px-1 font-bold text-blue-900 italic">{formatValue(totals.salarios)}</td>
          </tr>
          <tr>
            <td className="py-2 font-medium text-zinc-700 italic text-blue-800">INSS 8%(d)</td>
            {data.map(d => <td key={d.month} className="text-right py-2 px-1 text-blue-800 italic">{formatValue(d.inss)}</td>)}
            <td className="text-right py-2 px-1 font-bold text-blue-900 italic">{formatValue(totals.inss)}</td>
          </tr>
          <tr className="bg-zinc-50/50 border-t border-zinc-200">
            <td className="py-2 font-bold text-zinc-800">Totais</td>
            {data.map(d => <td key={d.month} className="text-right py-2 px-1 text-zinc-600 font-medium">{formatValue(d.totaisCustos)}</td>)}
            <td className="text-right py-2 px-1 font-black text-zinc-900">{formatValue(totals.totaisCustos)}</td>
          </tr>

          <tr><td colSpan={14} className="py-4"></td></tr>
          <tr className="bg-zinc-100 border-y border-zinc-200">
            <td className="py-3 font-black text-zinc-900 uppercase">Margem</td>
            {data.map(d => <td key={d.month} className="text-right py-3 px-1 font-black text-zinc-900">{formatValue(d.margem)}</td>)}
            <td className="text-right py-3 px-1 font-black text-zinc-900">{formatValue(totals.margem)}</td>
          </tr>
        </tbody>
      </table>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8 border-t border-zinc-100">
        <div className="space-y-4">
          <p className="text-[9px] text-zinc-400 leading-relaxed italic">
            Obs: Imposto Industrial Previsional (Pode diferir do imposto real a pagar. Não contempla os impostos já pagos e considera as facturas não aceites fiscalmente)
          </p>
          <p className="text-[9px] text-zinc-400 leading-relaxed italic">
            O Imposto previsional Contab pode diferir do imposto real a pagar . Não contempla os impostos já pagos e considera apenas os custos aceites fiscalmente.
          </p>
          <div className="pt-8">
            <h4 className="text-[10px] font-black text-zinc-800 uppercase tracking-widest">GRAFICO COMPARATIVO DE RECEITAS MENSAIS E ACUMULADAS</h4>
            <div className="h-32 bg-zinc-50 border border-dashed border-zinc-200 mt-2 flex items-center justify-center text-[10px] text-zinc-400 italic">
              Espaço reservado para o gráfico comparativo
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center text-[10px] text-zinc-600">
            <span>Imp Previsional Gestão (a-b-c-d)*25%</span>
            <span className="font-bold text-zinc-900">{formatValue(impPrevisional)}</span>
          </div>
          <div className="flex justify-between items-center text-[10px] text-zinc-600">
            <span>Imp Previsional Contab (a-b-c-d)*25%</span>
            <span className="font-bold text-zinc-900">{formatValue(impPrevisional)}</span>
          </div>
          <div className="text-right pt-8">
            <p className="text-[9px] text-zinc-400">{new Date().toLocaleDateString('pt-PT')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const FinancialModule = () => {
  const [activeSubTab, setActiveSubTab] = useState('menu');
  const [issuedDocuments, setIssuedDocuments] = useState<IssuedDocument[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');

  const fetchIssuedDocuments = () => {
    setLoading(true);
    fetchJson('/api/issued-documents')
      .then(setIssuedDocuments)
      .catch(err => console.error('Error fetching issued documents:', err))
      .finally(() => setLoading(false));
  };

  const fetchTransactions = () => {
    setLoading(true);
    fetchJson('/api/transactions')
      .then(setTransactions)
      .catch(err => console.error('Error fetching transactions:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (activeSubTab === 'sales-reports') {
      fetchIssuedDocuments();
    } else if (activeSubTab === 'other-movements' || activeSubTab === 'cost-revenue') {
      fetchTransactions();
    }
  }, [activeSubTab]);

  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description, amount: Number(amount), type, category: 'manual' })
    });
    setDescription(''); setAmount(''); setShowForm(false);
    fetchTransactions();
  };

  const menuItems = [
    { id: 'profit-loss-report', label: 'Relatório Gestão Proveitos/Custos', icon: FileText, description: 'Análise detalhada de proveitos e custos mensais' },
    { id: 'sales-reports', label: 'Relatórios de Vendas', icon: BarChart3, description: 'Movimentos de faturas, devoluções e anulações' },
    { id: 'cost-revenue', label: 'Mapas Custos Proveitos', icon: TrendingUp, description: 'Análise de rentabilidade e margens' },
    { id: 'annual-movement', label: 'Mapas Movimento Anual', icon: History, description: 'Evolução financeira ao longo do ano' },
    { id: 'supplier-maps', label: 'Mapas Fornecedores', icon: Truck, description: 'Movimentação e pendentes de fornecedores' },
    { id: 'other-movements', label: 'Outras Movimento', icon: Layers, description: 'Registos financeiros diversos' },
  ];

  if (activeSubTab === 'menu') {
    return (
      <div className="space-y-8">
        <header>
          <Breadcrumbs paths={['Home', 'Gestão Financeira']} />
          <h2 className="text-2xl font-bold text-[#003366] tracking-tight">Gestão Financeira</h2>
          <p className="text-zinc-500 text-sm">Selecione uma secção para visualizar relatórios e mapas financeiros.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSubTab(item.id)}
              className="bg-white border border-zinc-200 p-8 rounded-none shadow-sm hover:border-[#003366] hover:shadow-md transition-all text-left group"
            >
              <div className="w-12 h-12 bg-zinc-50 text-[#003366] flex items-center justify-center mb-6 group-hover:bg-[#003366] group-hover:text-white transition-colors">
                <item.icon size={24} />
              </div>
              <h3 className="font-bold text-zinc-900 mb-2">{item.label}</h3>
              <p className="text-zinc-400 text-xs leading-relaxed">{item.description}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setActiveSubTab('menu')}
          className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-400"
        >
          <ChevronLeft size={24} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-[#003366] tracking-tight">
            {menuItems.find(i => i.id === activeSubTab)?.label}
          </h2>
          <Breadcrumbs paths={['Home', 'Gestão Financeira', menuItems.find(i => i.id === activeSubTab)?.label || '']} />
        </div>
      </div>

      {activeSubTab === 'profit-loss-report' && (
        <ProfitLossReport fiscalYear="2024" />
      )}

      {activeSubTab === 'sales-reports' && (
        <div className="space-y-6">
          <div className="bg-white border border-zinc-200 p-6 rounded-none shadow-sm flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Data Início</label>
              <input type="date" className="bg-zinc-50 border border-zinc-200 rounded-none px-3 py-2 text-xs focus:outline-none focus:border-[#003366]" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Data Fim</label>
              <input type="date" className="bg-zinc-50 border border-zinc-200 rounded-none px-3 py-2 text-xs focus:outline-none focus:border-[#003366]" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Tipo Documento</label>
              <select className="bg-zinc-50 border border-zinc-200 rounded-none px-3 py-2 text-xs focus:outline-none focus:border-[#003366]">
                <option value="">Todos</option>
                <option value="FT">Fatura</option>
                <option value="FR">Fatura Recibo</option>
                <option value="RE">Recibo</option>
                <option value="NC">Nota de Crédito</option>
              </select>
            </div>
            <button className="bg-[#003366] text-white px-6 py-2 text-xs font-bold hover:bg-[#002244] transition-all flex items-center gap-2">
              <Filter size={14} /> Filtrar
            </button>
            <button className="bg-zinc-100 text-zinc-600 px-6 py-2 text-xs font-bold hover:bg-zinc-200 transition-all flex items-center gap-2 ml-auto">
              <FileDown size={14} /> Baixar PDF
            </button>
          </div>

          <div className="bg-white border border-zinc-200 rounded-none overflow-hidden shadow-sm overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1200px]">
              <thead>
                <tr className="bg-[#003366] text-white text-[10px] uppercase tracking-wider font-bold">
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Documento</th>
                  <th className="px-4 py-3">Cliente</th>
                  <th className="px-4 py-3">Tipo Artigo</th>
                  <th className="px-4 py-3">Qtd</th>
                  <th className="px-4 py-3">Impostos</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3">Rota</th>
                  <th className="px-4 py-3 text-right">Diferença</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {loading ? (
                  <tr><td colSpan={10} className="p-12 text-center text-zinc-400 italic">Carregando dados...</td></tr>
                ) : issuedDocuments.length === 0 ? (
                  <tr><td colSpan={10} className="p-12 text-center text-zinc-400 italic">Nenhum movimento encontrado.</td></tr>
                ) : issuedDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-zinc-50 text-[11px] transition-colors">
                    <td className="px-4 py-3 text-zinc-500">{new Date(doc.data_emissao).toLocaleDateString('pt-PT')}</td>
                    <td className="px-4 py-3 font-medium text-zinc-900">
                      <div>{doc.numero_documento}</div>
                      <div className="text-[9px] text-zinc-400 uppercase">
                        {doc.tipo_documento === 'NC' ? 'Devolução (Nota de Crédito)' : doc.tipo_documento}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{doc.client_name || '---'}</td>
                    <td className="px-4 py-3 text-zinc-500">Serviço/Produto</td>
                    <td className="px-4 py-3 text-zinc-500">1</td>
                    <td className="px-4 py-3 text-zinc-400 text-[9px]">IVA 14%</td>
                    <td className="px-4 py-3 text-right font-bold text-[#003366]">{formatCurrency(doc.contravalor)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 text-[9px] font-bold uppercase ${doc.estado_documento === 'ativo' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {doc.estado_documento}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400">Padrão</td>
                    <td className="px-4 py-3 text-right text-zinc-400">0,00 Kz</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'cost-revenue' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-zinc-200 p-6 rounded-none shadow-sm">
              <h3 className="text-sm font-bold text-[#003366] uppercase tracking-wider mb-4">Resumo de Proveitos</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 text-sm">Vendas de Produtos</span>
                  <span className="font-bold text-emerald-600">{formatCurrency(transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0))}</span>
                </div>
                <div className="border-t border-zinc-100 pt-4 flex justify-between items-center font-bold">
                  <span className="text-zinc-900">Total Proveitos</span>
                  <span className="text-[#003366]">{formatCurrency(transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0))}</span>
                </div>
              </div>
            </div>
            <div className="bg-white border border-zinc-200 p-6 rounded-none shadow-sm">
              <h3 className="text-sm font-bold text-[#003366] uppercase tracking-wider mb-4">Resumo de Custos</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 text-sm">Despesas Operacionais</span>
                  <span className="font-bold text-red-600">{formatCurrency(transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0))}</span>
                </div>
                <div className="border-t border-zinc-100 pt-4 flex justify-between items-center font-bold">
                  <span className="text-zinc-900">Total Custos</span>
                  <span className="text-red-600">{formatCurrency(transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0))}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white border border-zinc-200 p-6 rounded-none shadow-sm">
            <h3 className="text-sm font-bold text-[#003366] uppercase tracking-wider mb-4">Resultado Líquido</h3>
            <div className="flex items-center gap-4">
              <div className="text-3xl font-bold text-[#003366]">
                {formatCurrency(transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0) - transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0))}
              </div>
              <div className="text-xs text-zinc-400 uppercase font-bold tracking-widest">Margem Operacional</div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'annual-movement' && (
        <div className="space-y-6">
          <div className="bg-white border border-zinc-200 p-6 rounded-none shadow-sm">
            <h3 className="text-sm font-bold text-[#003366] uppercase tracking-wider mb-6">Movimento Anual por Mês</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'].map((month, idx) => (
                <div key={idx} className="bg-zinc-50 border border-zinc-200 p-4 rounded-none">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">{month}</p>
                  <p className="text-sm font-bold text-[#003366]">0,00 Kz</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'supplier-maps' && (
        <div className="space-y-6">
          <div className="bg-white border border-zinc-200 p-6 rounded-none shadow-sm flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Fornecedor</label>
              <select className="bg-zinc-50 border border-zinc-200 rounded-none px-3 py-2 text-xs focus:outline-none focus:border-[#003366]">
                <option value="">Todos</option>
              </select>
            </div>
            <button className="bg-[#003366] text-white px-6 py-2 text-xs font-bold hover:bg-[#002244] transition-all flex items-center gap-2">
              <Filter size={14} /> Filtrar
            </button>
          </div>

          <div className="bg-white border border-zinc-200 rounded-none overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#003366] text-white text-[10px] uppercase tracking-wider font-bold">
                  <th className="px-6 py-4">Fornecedor</th>
                  <th className="px-6 py-4">Total Compras</th>
                  <th className="px-6 py-4">Total Pago</th>
                  <th className="px-6 py-4 text-right">Saldo Pendente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                <tr><td colSpan={4} className="p-12 text-center text-zinc-400 italic">Nenhum movimento de fornecedor encontrado.</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeSubTab === 'other-movements' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-[#003366] uppercase tracking-wider">Registos Financeiros Manuais</h3>
            <button onClick={() => setShowForm(true)} className="bg-[#003366] hover:bg-[#002244] text-white font-bold px-4 py-2 rounded-none flex items-center gap-2 transition-all shadow-sm text-xs">
              <Plus size={14} /> Nova Transação
            </button>
          </div>

          {showForm && (
            <div className="bg-white border border-zinc-200 p-8 rounded-none shadow-sm">
              <form onSubmit={handleTransactionSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                {loading ? (
                  <tr><td colSpan={4} className="p-12 text-center text-zinc-400 italic">Carregando...</td></tr>
                ) : transactions.length === 0 ? (
                  <tr><td colSpan={4} className="p-12 text-center text-zinc-400 italic">Nenhum registo encontrado.</td></tr>
                ) : transactions.map(t => (
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
      )}
    </div>
  );
};

const IssuedDocumentsList = ({ documents, onAction, onCertify }: { 
  documents: IssuedDocument[], 
  onAction: (doc: IssuedDocument) => void,
  onCertify: (doc: IssuedDocument) => void
}) => {
  const [showActionsModal, setShowActionsModal] = useState<IssuedDocument | null>(null);

  return (
    <div className="bg-white border border-zinc-200 rounded-none overflow-x-auto shadow-sm">
      <table className="w-full text-left border-collapse min-w-[1200px]">
        <thead>
          <tr className="bg-[#003366] text-white text-[11px] uppercase tracking-wider font-bold">
            <th className="px-6 py-4">Data Emissão</th>
            <th className="px-6 py-4">Vencimento</th>
            <th className="px-6 py-4">Tipo</th>
            <th className="px-6 py-4">Número</th>
            <th className="px-6 py-4">Cliente</th>
            <th className="px-6 py-4">Local de Trabalho</th>
            <th className="px-6 py-4">Pagamento</th>
            <th className="px-6 py-4">Caixa</th>
            <th className="px-6 py-4 text-right">Valor</th>
            <th className="px-6 py-4 text-center">Estado</th>
            <th className="px-6 py-4 text-center">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {documents.map((doc) => (
            <tr key={doc.id} className="hover:bg-zinc-50 text-sm border-b border-zinc-50">
              <td className="px-6 py-4 text-zinc-900 font-medium whitespace-nowrap">
                {new Date(doc.data_emissao || doc.date || '').toLocaleDateString()}
              </td>
              <td className="px-6 py-4 text-zinc-700 whitespace-nowrap">
                {doc.due_date ? new Date(doc.due_date).toLocaleDateString() : (doc.data_vencimento ? new Date(doc.data_vencimento).toLocaleDateString() : 'N/A')}
              </td>
              <td className="px-6 py-4 font-bold text-zinc-900 whitespace-nowrap">
                <div>{doc.tipo_documento || doc.document_type}</div>
                {doc.series_name && <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{doc.series_name}</div>}
              </td>
              <td className="px-6 py-4 font-mono text-xs text-zinc-600 font-bold whitespace-nowrap">{doc.numero_documento || doc.invoice_number}</td>
              <td className="px-6 py-4 text-zinc-900 font-bold min-w-[150px]">{doc.client_name || doc.cliente_id || doc.client_id}</td>
              <td className="px-6 py-4 text-zinc-700 font-medium">{doc.local_trabalho || doc.work_site_id || 'N/A'}</td>
              <td className="px-6 py-4 text-zinc-900 uppercase text-[10px] font-black">{doc.payment_method || 'N/A'}</td>
              <td className="px-6 py-4 text-zinc-700 text-[10px] font-bold">{doc.cash_box || 'N/A'}</td>
              <td className="px-6 py-4 text-right font-black text-[#003366] text-base whitespace-nowrap">
                {formatCurrency(doc.contravalor || doc.total || 0)}
              </td>
              <td className="px-6 py-4 text-center">
                <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-none ${(doc.estado_documento || doc.status) === 'ativo' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                  {doc.estado_documento || doc.status || 'ativo'}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center justify-center gap-3">
                  <button 
                    onClick={() => onAction(doc)} 
                    title="Imprimir"
                    className="text-zinc-400 hover:text-[#003366] transition-colors"
                  >
                    <Printer size={16} />
                  </button>
                  <button 
                    onClick={() => onCertify(doc)}
                    disabled={doc.is_certified}
                    title={doc.is_certified ? "Documento Certificado" : "Certificar Documento"}
                    className={`transition-colors ${doc.is_certified ? 'text-emerald-500 cursor-default' : 'text-zinc-400 hover:text-emerald-500'}`}
                  >
                    <BadgeCheck size={18} />
                  </button>
                  <button 
                    onClick={() => setShowActionsModal(doc)} 
                    title="Mais Ações"
                    className="text-zinc-400 hover:text-[#003366] transition-colors"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {documents.length === 0 && (
        <div className="p-12 text-center text-zinc-400 text-sm">Nenhum documento emitido encontrado.</div>
      )}

      {/* Actions Modal */}
      <AnimatePresence>
        {showActionsModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" 
              onClick={() => setShowActionsModal(null)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white p-8 rounded-none shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-[#003366] text-xl uppercase tracking-tight">Ações do Documento</h3>
                <button onClick={() => setShowActionsModal(null)} className="text-zinc-400 hover:text-zinc-600">
                  <X size={20} />
                </button>
              </div>
              
              <div className="grid grid-cols-1 gap-2 max-h-[60vh] overflow-y-auto pr-2">
                <button 
                  onClick={() => { onAction(showActionsModal); setShowActionsModal(null); }}
                  className="w-full flex items-center gap-4 p-4 hover:bg-zinc-50 transition-colors border border-zinc-100 group"
                >
                  <div className="w-10 h-10 bg-zinc-100 text-[#003366] flex items-center justify-center group-hover:bg-[#003366] group-hover:text-white transition-colors">
                    <Printer size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-zinc-900 text-sm">Imprimir Documento</p>
                    <p className="text-xs text-zinc-500">Gerar versão PDF A4 para impressão.</p>
                  </div>
                </button>

                <button 
                  onClick={() => { onCertify(showActionsModal); setShowActionsModal(null); }}
                  disabled={showActionsModal.is_certified}
                  className={`w-full flex items-center gap-4 p-4 transition-colors border border-zinc-100 group ${showActionsModal.is_certified ? 'opacity-50 cursor-not-allowed' : 'hover:bg-zinc-50'}`}
                >
                  <div className={`w-10 h-10 flex items-center justify-center transition-colors ${showActionsModal.is_certified ? 'bg-emerald-100 text-emerald-600' : 'bg-zinc-100 text-[#003366] group-hover:bg-emerald-600 group-hover:text-white'}`}>
                    <BadgeCheck size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-zinc-900 text-sm">Certificar Documento</p>
                    <p className="text-xs text-zinc-500">Assinar digitalmente o documento (AGT).</p>
                  </div>
                </button>

                <button 
                  onClick={() => { /* Send Email logic */ setShowActionsModal(null); }}
                  className="w-full flex items-center gap-4 p-4 hover:bg-zinc-50 transition-colors border border-zinc-100 group"
                >
                  <div className="w-10 h-10 bg-zinc-100 text-[#003366] flex items-center justify-center group-hover:bg-[#003366] group-hover:text-white transition-colors">
                    <Mail size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-zinc-900 text-sm">Enviar por Email</p>
                    <p className="text-xs text-zinc-500">Enviar documento diretamente ao cliente.</p>
                  </div>
                </button>

                <button 
                  onClick={() => { /* WhatsApp logic */ setShowActionsModal(null); }}
                  className="w-full flex items-center gap-4 p-4 hover:bg-zinc-50 transition-colors border border-zinc-100 group"
                >
                  <div className="w-10 h-10 bg-zinc-100 text-[#003366] flex items-center justify-center group-hover:bg-[#25D366] group-hover:text-white transition-colors">
                    <MessageCircle size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-zinc-900 text-sm">Enviar por WhatsApp</p>
                    <p className="text-xs text-zinc-500">Partilhar link do documento via WhatsApp.</p>
                  </div>
                </button>

                <button 
                  onClick={() => { /* Cancel logic */ setShowActionsModal(null); }}
                  className="w-full flex items-center gap-4 p-4 hover:bg-zinc-50 transition-colors border border-zinc-100 group"
                >
                  <div className="w-10 h-10 bg-zinc-100 text-red-600 flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-colors">
                    <XCircle size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-zinc-900 text-sm">Anular Documento</p>
                    <p className="text-xs text-zinc-500">Cancelar e emitir nota de crédito.</p>
                  </div>
                </button>

                <button 
                  onClick={() => { /* Clone logic */ setShowActionsModal(null); }}
                  className="w-full flex items-center gap-4 p-4 hover:bg-zinc-50 transition-colors border border-zinc-100 group"
                >
                  <div className="w-10 h-10 bg-zinc-100 text-[#003366] flex items-center justify-center group-hover:bg-[#003366] group-hover:text-white transition-colors">
                    <Copy size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-zinc-900 text-sm">Duplicar / Clonar</p>
                    <p className="text-xs text-zinc-500">Criar novo documento baseado neste.</p>
                  </div>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const POSManagementView = ({ title, icon: Icon, onBack }: { title: string, icon: any, onBack: () => void }) => {
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="bg-white min-h-screen p-8 sm:p-12 space-y-10 max-w-6xl mx-auto shadow-2xl border border-zinc-100">
      <div className="flex flex-col md:flex-row justify-between items-start gap-8 border-b-2 border-[#003366] pb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-[#003366] flex items-center justify-center text-white shadow-lg">
            <Icon size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#003366] tracking-tighter uppercase">{title}</h1>
            <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-[0.2em]">Gestão de Ponto de Venda</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowForm(true)}
            className="bg-[#003366] text-white px-6 py-3 text-xs font-bold uppercase tracking-widest shadow-lg hover:bg-[#002244] transition-all flex items-center gap-2"
          >
            <Plus size={16} /> Novo Registro
          </button>
          <button onClick={onBack} className="bg-zinc-100 text-zinc-600 px-6 py-3 text-xs font-bold uppercase tracking-widest hover:bg-zinc-200 transition-all">
            Voltar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-50 p-6 border border-zinc-200">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Total Registros</p>
          <p className="text-2xl font-bold text-[#003366]">12</p>
        </div>
        <div className="bg-zinc-50 p-6 border border-zinc-200">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Última Atividade</p>
          <p className="text-2xl font-bold text-emerald-600">Hoje</p>
        </div>
        <div className="bg-zinc-50 p-6 border border-zinc-200">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Status Geral</p>
          <p className="text-2xl font-bold text-[#003366]">Operacional</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
              type="text" 
              placeholder="Pesquisar registros..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-zinc-200 text-sm focus:outline-none focus:border-[#003366] transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="bg-white border border-zinc-200 overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#003366] text-white text-[11px] uppercase tracking-wider font-bold">
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Referência</th>
                <th className="px-6 py-4">Descrição</th>
                <th className="px-6 py-4 text-right">Valor / Info</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {[1, 2, 3].map(i => (
                <tr key={i} className="hover:bg-zinc-50 text-sm">
                  <td className="px-6 py-4 text-zinc-500">{new Date().toLocaleDateString()}</td>
                  <td className="px-6 py-4 font-bold text-zinc-900">REG-00{i}</td>
                  <td className="px-6 py-4 text-zinc-600">Registro de atividade para {title}</td>
                  <td className="px-6 py-4 text-right font-bold text-[#003366]">---</td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-zinc-400 hover:text-[#003366] transition-colors"><MoreHorizontal size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-lg shadow-2xl overflow-hidden relative">
              <div className="bg-[#003366] p-6 text-white flex justify-between items-center">
                <h3 className="font-black uppercase tracking-widest text-sm">Novo Registro: {title}</h3>
                <button onClick={() => setShowForm(false)}><X size={20} /></button>
              </div>
              <form className="p-8 space-y-6" onSubmit={e => { e.preventDefault(); setShowForm(false); }}>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Data</label>
                    <input type="date" required className="w-full bg-zinc-50 border border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:border-[#003366]" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Tipo</label>
                    <select className="w-full bg-zinc-50 border border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:border-[#003366]">
                      <option>Normal</option>
                      <option>Urgente</option>
                      <option>Informativo</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Descrição Detalhada</label>
                  <textarea required className="w-full bg-zinc-50 border border-zinc-200 px-4 py-3 text-sm focus:outline-none focus:border-[#003366] h-32" placeholder="Descreva o registro..."></textarea>
                </div>
                <div className="bg-blue-50 p-4 border border-blue-100">
                  <p className="text-[10px] font-bold text-blue-600 uppercase mb-2">Cálculos / Valores</p>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-blue-700">Total Estimado:</span>
                    <span className="font-black text-blue-800">{formatCurrency(0)}</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-zinc-100 text-zinc-600 py-4 font-bold text-xs uppercase tracking-widest">Cancelar</button>
                  <button type="submit" className="flex-2 bg-[#003366] text-white py-4 px-8 font-bold text-xs uppercase tracking-widest shadow-lg">Salvar Registro</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const POSModule = ({ products, onRefresh }: { products: Product[], onRefresh: () => void }) => {
  const [activeArea, setActiveArea] = useState<POSArea | 'dashboard'>('dashboard');
  const [cart, setCart] = useState<{product: Product, qty: number, discount: number}[]>([]);
  const [search, setSearch] = useState('');
  const [series, setSeries] = useState<FiscalSeries[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [posPoints, setPosPoints] = useState<POSPoint[]>([]);
  const [sessions, setSessions] = useState<CashSession[]>([]);
  
  const [selectedSeries, setSelectedSeries] = useState('');
  const [selectedCostCenter, setSelectedCostCenter] = useState('');
  const [selectedPOS, setSelectedPOS] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [globalDiscount, setGlobalDiscount] = useState(0);
  
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showPOSModal, setShowPOSModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showDiscountModal, setShowDiscountModal] = useState<{index: number} | null>(null);
  const [initialBalance, setInitialBalance] = useState('');
  const [lastSale, setLastSale] = useState<any>(null);
  const [lastSaleClientName, setLastSaleClientName] = useState<string>('');

  const safeProducts = Array.isArray(products) ? products : [];
  const activeSession = Array.isArray(sessions) ? sessions.find(s => s.status === 'open') : null;

  const fetchData = async () => {
    try {
      const [s, cc, pp, sess] = await Promise.all([
        fetchJson('/api/fiscal-series'),
        fetchJson('/api/cost-centers'),
        fetchJson('/api/pos-points'),
        fetchJson('/api/cash/sessions')
      ]);
      setSeries(Array.isArray(s) ? s : []);
      setCostCenters(Array.isArray(cc) ? cc : []);
      setPosPoints(Array.isArray(pp) ? pp : []);
      setSessions(Array.isArray(sess) ? sess : []);
      if (Array.isArray(pp) && pp.length > 0 && !selectedPOS) setSelectedPOS(pp[0].id.toString());
      if (Array.isArray(s) && s.length > 0 && !selectedSeries) setSelectedSeries(s[0].id.toString());
    } catch (err) {
      console.error('Error fetching POS data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.product.id === product.id);
    if (existing) {
      setCart(cart.map(item => item.product.id === product.id ? {...item, qty: item.qty + 1} : item));
    } else {
      setCart([...cart, { product, qty: 1, discount: 0 }]);
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.qty), 0);
  const itemDiscounts = cart.reduce((sum, item) => sum + (item.discount), 0);
  const total = subtotal - itemDiscounts - globalDiscount;
  const change = parseFloat(amountPaid) > total ? parseFloat(amountPaid) - total : 0;

  const handleCheckout = async (clientId: number = 1, clientName: string = 'Consumidor Final') => {
    if (cart.length === 0) return;
    if (!activeSession) {
      alert('Por favor, abra o caixa primeiro.');
      return;
    }
    
    try {
      // 1. Create POS Sale
      const posRes = await fetch('/api/pos/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          total, 
          items: cart,
          series_id: selectedSeries,
          cost_center_id: selectedCostCenter,
          pos_point_id: selectedPOS,
          session_id: activeSession.id,
          discount: globalDiscount + itemDiscounts,
          payment_method: paymentMethod
        })
      });
      
      if (!posRes.ok) throw new Error('Erro ao registrar venda POS');
      const posData = await posRes.json();

      // 2. Create Invoice (Integration)
      const invRes = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          date: new Date().toISOString().split('T')[0],
          due_date: new Date().toISOString().split('T')[0],
          document_type: 'Fatura Recibo',
          series_id: selectedSeries,
          payment_method: paymentMethod,
          total: total,
          items: cart.map(item => ({
            product_id: item.product.id,
            description: item.product.name,
            quantity: item.qty,
            unit_price: item.product.price,
            discount: item.discount / item.qty,
            tax_rate: 14 // Default IVA
          }))
        })
      });

      if (invRes.ok) {
        setLastSale({
          id: posData.id,
          date: new Date().toLocaleString(),
          items: cart,
          total,
          payment_method: paymentMethod,
          change
        });
        setLastSaleClientName(clientName);
        setCart([]);
        setAmountPaid('');
        setGlobalDiscount(0);
        onRefresh();
        // Auto-print logic would go here
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao processar checkout');
    }
  };

  const handleOpenSession = async () => {
    const res = await fetch('/api/cash/open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        initial_balance: parseFloat(initialBalance) || 0,
        pos_point_id: selectedPOS
      })
    });
    if (res.ok) {
      setShowSessionModal(false);
      fetchData();
    }
  };

  const handleCloseSession = async () => {
    if (!activeSession) return;
    const res = await fetch(`/api/cash/close/${activeSession.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ final_balance: total }) // Simplified
    });
    if (res.ok) {
      fetchData();
      alert('Caixa fechado com sucesso!');
    }
  };

  const handleAddPOS = async (name: string, location: string) => {
    const res = await fetch('/api/pos-points', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, location })
    });
    if (res.ok) {
      setShowPOSModal(false);
      fetchData();
    }
  };

  if (activeArea !== 'dashboard' && activeArea !== 'vendas normal' && activeArea !== 'lojas' && activeArea !== 'restaurante' && activeArea !== 'bar') {
    const item = [
      { id: 'stock', label: 'Ver Stock', icon: Package },
      { id: 'fechos', label: 'Ver Fechos', icon: History },
      { id: 'utilizador', label: 'Perfil Utilizador', icon: UserCheck },
      { id: 'caixas', label: 'Caixas Movimento', icon: Wallet },
      { id: 'ocorrencia', label: 'Adicionar Ocorrência', icon: AlertTriangle },
      { id: 'transferir', label: 'Transferir Vendas', icon: ArrowRightLeft },
    ].find(i => i.id === activeArea);

    if (item) {
      return <POSManagementView title={item.label} icon={item.icon} onBack={() => setActiveArea('dashboard')} />;
    }
  }

  if (activeArea === 'dashboard') {
    const dashboardItems = [
      { id: 'vendas normal', label: 'Venda Normal', icon: ShoppingBag, color: 'bg-blue-500' },
      { id: 'lojas', label: 'Lojas', icon: Store, color: 'bg-emerald-500' },
      { id: 'restaurante', label: 'Restaurante', icon: Utensils, color: 'bg-orange-500' },
      { id: 'bar', label: 'Bar', icon: Wine, color: 'bg-purple-500' },
      { id: 'abertura', label: 'Abertura de Caixa', icon: CheckCircle, color: 'bg-teal-500', action: () => setShowSessionModal(true) },
      { id: 'movimento', label: 'Movimento Diário', icon: TrendingUp, color: 'bg-indigo-500', action: () => setShowReportModal(true) },
      { id: 'adicionar_pos', label: 'Adicionar POS', icon: PlusCircle, color: 'bg-pink-500', action: () => setShowPOSModal(true) },
      { id: 'transferir', label: 'Transferir Vendas', icon: ArrowRightLeft, color: 'bg-amber-500' },
      { id: 'fecho', label: 'Fecho de Caixa', icon: XCircle, color: 'bg-red-500', action: handleCloseSession },
      { id: 'stock', label: 'Ver Stock', icon: Package, color: 'bg-slate-500' },
      { id: 'fechos', label: 'Ver Fechos', icon: History, color: 'bg-cyan-500' },
      { id: 'utilizador', label: 'Perfil Utilizador', icon: UserCheck, color: 'bg-violet-500' },
      { id: 'caixas', label: 'Caixas Movimento', icon: Wallet, color: 'bg-lime-500' },
      { id: 'ocorrencia', label: 'Adicionar Ocorrência', icon: AlertTriangle, color: 'bg-rose-500' },
    ];

    return (
      <div className="p-8 bg-[#f8fafc] min-h-[calc(100vh-120px)] -mt-12 -mx-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-black text-[#003366] tracking-tight">Terminal de Vendas</h1>
              <p className="text-zinc-500 font-medium">Selecione uma área ou funcionalidade para começar</p>
            </div>
            <div className="flex items-center gap-4">
              <div className={`px-4 py-2 rounded-none font-bold text-sm ${activeSession ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                {activeSession ? `Caixa Aberto: ${activeSession.pos_point_name || 'Geral'}` : 'Caixa Fechado'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {dashboardItems.map((item) => (
              <motion.button
                key={item.id}
                whileHover={{ scale: 1.02, translateY: -4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => item.action ? item.action() : setActiveArea(item.id as POSArea)}
                className="bg-white p-6 shadow-sm border border-zinc-200 flex flex-col items-center justify-center gap-4 group transition-all hover:shadow-md hover:border-[#003366]/20"
              >
                <div className={`${item.color} p-4 text-white shadow-lg group-hover:scale-110 transition-transform`}>
                  <item.icon size={32} />
                </div>
                <span className="font-black text-zinc-800 uppercase text-xs tracking-wider">{item.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Modals */}
        <AnimatePresence>
          {lastSale && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white shadow-2xl p-8 max-w-sm w-full relative">
                <button onClick={() => setLastSale(null)} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600"><X size={24} /></button>
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle size={32} />
                  </div>
                  <h3 className="text-xl font-black text-[#003366] mb-2">Venda Concluída!</h3>
                  <p className="text-zinc-500 text-sm mb-6">O documento foi emitido e registrado.</p>
                  
                  <div className="w-full bg-zinc-50 p-4 border border-zinc-200 mb-6">
                    <PrintP89 sale={lastSale} clientName={lastSaleClientName} />
                  </div>

                  <div className="flex gap-3 w-full">
                    <button 
                      onClick={() => { window.print(); }}
                      className="flex-1 bg-[#003366] text-white p-3 font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                      <Printer size={16} /> Imprimir
                    </button>
                    <button 
                      onClick={() => setLastSale(null)}
                      className="flex-1 bg-zinc-100 text-zinc-700 p-3 font-bold text-xs uppercase tracking-widest"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {showSessionModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-md shadow-2xl">
                <div className="bg-[#003366] p-6 text-white flex justify-between items-center">
                  <h3 className="font-black uppercase tracking-widest text-sm">Abertura de Caixa</h3>
                  <button onClick={() => setShowSessionModal(false)}><X size={20} /></button>
                </div>
                <div className="p-8 space-y-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-zinc-400 mb-2">Ponto de Venda</label>
                    <select value={selectedPOS} onChange={e => setSelectedPOS(e.target.value)} className="w-full bg-zinc-50 border-2 border-zinc-100 p-4 font-bold focus:border-[#003366] outline-none transition-all">
                      {posPoints.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-zinc-400 mb-2">Saldo Inicial (Kz)</label>
                    <input type="number" value={initialBalance} onChange={e => setInitialBalance(e.target.value)} className="w-full bg-zinc-50 border-2 border-zinc-100 p-4 font-bold focus:border-[#003366] outline-none transition-all" placeholder="0.00" />
                  </div>
                  <button onClick={handleOpenSession} className="w-full bg-[#003366] text-white p-4 font-black uppercase tracking-widest hover:bg-[#004080] transition-all shadow-lg">Confirmar Abertura</button>
                </div>
              </motion.div>
            </div>
          )}

          {showPOSModal && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-md shadow-2xl">
                <div className="bg-[#003366] p-6 text-white flex justify-between items-center">
                  <h3 className="font-black uppercase tracking-widest text-sm">Novo Ponto de Venda</h3>
                  <button onClick={() => setShowPOSModal(false)}><X size={20} /></button>
                </div>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  handleAddPOS(formData.get('name') as string, formData.get('location') as string);
                }} className="p-8 space-y-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-zinc-400 mb-2">Nome do Ponto</label>
                    <input name="name" required className="w-full bg-zinc-50 border-2 border-zinc-100 p-4 font-bold focus:border-[#003366] outline-none transition-all" placeholder="Ex: Caixa Central" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-zinc-400 mb-2">Localização</label>
                    <input name="location" className="w-full bg-zinc-50 border-2 border-zinc-100 p-4 font-bold focus:border-[#003366] outline-none transition-all" placeholder="Ex: Piso 1" />
                  </div>
                  <button type="submit" className="w-full bg-[#003366] text-white p-4 font-black uppercase tracking-widest hover:bg-[#004080] transition-all shadow-lg">Salvar Ponto de Venda</button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] -mt-12 -mx-12">
      {/* POS Header/Toolbar */}
      <div className="bg-[#003366] text-white p-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-6">
          <button onClick={() => setActiveArea('dashboard')} className="flex items-center gap-2 hover:text-blue-300 transition-colors">
            <ArrowLeft size={18} />
            <span className="font-bold uppercase text-xs tracking-widest">Voltar</span>
          </button>
          
          <div className="h-6 w-px bg-white/10" />
          
          <div className="flex items-center gap-2">
            <LayoutDashboard size={18} className="text-blue-300" />
            <h2 className="font-bold tracking-tight uppercase text-sm">{activeArea}</h2>
          </div>
          
          <div className="h-6 w-px bg-white/10 hidden md:block" />
          
          <div className="hidden md:flex items-center gap-4 text-xs">
            <div className="flex flex-col">
              <span className="text-blue-300 font-bold uppercase text-[9px]">Série</span>
              <select 
                value={selectedSeries} 
                onChange={e => setSelectedSeries(e.target.value)}
                className="bg-transparent border-none focus:ring-0 font-bold p-0 cursor-pointer"
              >
                {series.map(s => <option key={s.id} value={s.id} className="text-zinc-800">{s.description}</option>)}
              </select>
            </div>
            
            <div className="flex flex-col">
              <span className="text-blue-300 font-bold uppercase text-[9px]">Centro de Custo</span>
              <select 
                value={selectedCostCenter} 
                onChange={e => setSelectedCostCenter(e.target.value)}
                className="bg-transparent border-none focus:ring-0 font-bold p-0 cursor-pointer"
              >
                <option value="" className="text-zinc-800">Geral</option>
                {costCenters.map(cc => <option key={cc.id} value={cc.id} className="text-zinc-800">{cc.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end mr-4">
            <span className="text-[10px] text-blue-300 font-bold uppercase tracking-widest">Operador</span>
            <span className="text-xs font-black">Admin</span>
          </div>
          
          <button 
            onClick={() => setShowReportModal(true)}
            className="bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-bold flex items-center gap-2 transition-all"
          >
            <BarChart3 size={14} /> Relatório
          </button>
          
          {activeSession ? (
            <button 
              onClick={handleCloseSession}
              className="bg-red-500 hover:bg-red-600 px-4 py-1.5 text-xs font-bold flex items-center gap-2 transition-all shadow-lg"
            >
              <X size={14} /> Fechar Caixa
            </button>
          ) : (
            <button 
              onClick={() => setShowSessionModal(true)}
              className="bg-emerald-500 hover:bg-emerald-600 px-4 py-1.5 text-xs font-bold flex items-center gap-2 transition-all shadow-lg"
            >
              <CheckCircle size={14} /> Abrir Caixa
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 overflow-hidden">
        {/* Products Section */}
        <div className="lg:col-span-2 flex flex-col bg-[#f8fafc] border-r border-zinc-200">
          <div className="p-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
              <input 
                type="text" placeholder="Pesquisar por nome ou código de barras..." 
                value={search} onChange={e => setSearch(e.target.value)}
                className="w-full bg-white border border-zinc-200 rounded-none pl-12 pr-4 py-4 text-lg focus:outline-none focus:border-[#003366] shadow-sm"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              {['Todos', 'Mercadoria', 'Serviços', 'Produtos'].map(cat => (
                <button key={cat} className="px-4 py-2 bg-white border border-zinc-200 text-xs font-bold text-zinc-600 hover:bg-zinc-50 whitespace-nowrap">
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 content-start">
            {safeProducts.filter(p => (p.name || '').toLowerCase().includes((search || '').toLowerCase())).map(product => (
              <button 
                key={product.id}
                onClick={() => addToCart(product)}
                className="bg-white border border-zinc-200 p-0 rounded-none text-left hover:border-[#003366] hover:shadow-md transition-all group relative overflow-hidden flex flex-col"
              >
                <div className="aspect-square w-full bg-zinc-100 relative overflow-hidden">
                  {product.image ? (
                    <img 
                      src={product.image} 
                      alt={product.name} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-300">
                      <Package size={40} />
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-[#003366] text-white px-2 py-0.5 text-[10px] font-bold shadow-lg">
                    {formatCurrency(product.price)}
                  </div>
                </div>
                <div className="p-3 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="font-bold text-[#003366] text-xs line-clamp-2 uppercase tracking-tight leading-tight">{product.name}</p>
                    <p className="text-[9px] text-zinc-400 font-bold mt-1 uppercase tracking-widest">{product.tipologia || 'Geral'}</p>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[9px] font-bold text-zinc-500 bg-zinc-100 px-1.5 py-0.5">UN: {product.unit}</span>
                    <div className="w-6 h-6 bg-[#003366] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                      <Plus size={14} />
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Cart/Checkout Section */}
        <div className="flex flex-col bg-white shadow-xl">
          <div className="p-4 border-b border-zinc-100 bg-zinc-50 flex justify-between items-center">
            <h3 className="font-bold text-[#003366] text-sm flex items-center gap-2">
              <ClipboardList size={16} /> Detalhes da Venda
            </h3>
            <button onClick={() => setCart([])} className="text-red-500 hover:text-red-700 text-[10px] font-bold uppercase">Limpar</button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {cart.map((item, i) => (
              <div key={i} className="p-4 border-b border-zinc-50 hover:bg-zinc-50 transition-colors group">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <p className="font-bold text-zinc-800 text-sm">{item.product.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <button 
                        onClick={() => {
                          const newQty = Math.max(1, item.qty - 1);
                          setCart(cart.map((c, idx) => idx === i ? { ...c, qty: newQty } : c));
                        }}
                        className="w-6 h-6 border border-zinc-200 flex items-center justify-center hover:bg-white"
                      >-</button>
                      <span className="text-xs font-bold w-8 text-center">{item.qty}</span>
                      <button 
                        onClick={() => {
                          setCart(cart.map((c, idx) => idx === i ? { ...c, qty: item.qty + 1 } : c));
                        }}
                        className="w-6 h-6 border border-zinc-200 flex items-center justify-center hover:bg-white"
                      >+</button>
                      <span className="text-zinc-400 text-[10px] ml-2">x {formatCurrency(item.product.price)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#003366]">{formatCurrency(item.product.price * item.qty)}</p>
                    <div className="flex items-center gap-2 justify-end">
                      <button 
                        onClick={() => setShowDiscountModal({ index: i })}
                        className="text-emerald-500 hover:text-emerald-700 text-[10px] font-bold"
                      >
                        {item.discount > 0 ? `-${formatCurrency(item.discount)}` : 'Desconto'}
                      </button>
                      <button 
                        onClick={() => setCart(cart.filter((_, idx) => idx !== i))}
                        className="text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {cart.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-zinc-300 p-12 text-center space-y-4">
                <div className="w-20 h-20 bg-zinc-50 rounded-full flex items-center justify-center">
                  <Package size={40} />
                </div>
                <p className="text-sm font-medium">Selecione produtos para começar a venda</p>
              </div>
            )}
          </div>

          <div className="p-6 bg-zinc-50 border-t border-zinc-200 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-zinc-500">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-zinc-500">
                <span>Desconto Global</span>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    value={globalDiscount}
                    onChange={e => setGlobalDiscount(parseFloat(e.target.value) || 0)}
                    className="w-20 bg-white border border-zinc-200 px-2 py-1 text-right focus:outline-none focus:border-[#003366]"
                  />
                </div>
              </div>
              <div className="flex justify-between font-black text-xl text-[#003366] pt-2 border-t border-zinc-200">
                <span>TOTAL</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {['cash', 'card', 'transfer'].map(m => (
                  <button 
                    key={m}
                    onClick={() => setPaymentMethod(m)}
                    className={`py-2 text-[10px] font-bold uppercase border ${paymentMethod === m ? 'bg-[#003366] text-white border-[#003366]' : 'bg-white text-zinc-500 border-zinc-200'}`}
                  >
                    {m === 'cash' ? 'Dinheiro' : m === 'card' ? 'Cartão' : 'Transf.'}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Valor Pago</label>
                  <input 
                    type="number" 
                    placeholder="0.00"
                    value={amountPaid}
                    onChange={e => setAmountPaid(e.target.value)}
                    className="w-full bg-white border border-zinc-200 px-3 py-2 font-bold text-[#003366] focus:outline-none focus:border-[#003366]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Troco</label>
                  <div className="w-full bg-zinc-100 border border-zinc-200 px-3 py-2 font-bold text-emerald-600">
                    {formatCurrency(change)}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => handleCheckout()}
                disabled={cart.length === 0}
                className="col-span-2 bg-[#003366] hover:bg-[#002244] disabled:bg-zinc-300 text-white font-bold py-4 rounded-none transition-all shadow-lg flex items-center justify-center gap-2 text-lg"
              >
                <CheckCircle size={24} /> Emitir Documento
              </button>
              <button className="bg-white border border-zinc-200 text-zinc-600 font-bold py-2 text-xs flex items-center justify-center gap-2 hover:bg-zinc-50">
                <Printer size={14} /> Imprimir
              </button>
              <button className="bg-white border border-zinc-200 text-zinc-600 font-bold py-2 text-xs flex items-center justify-center gap-2 hover:bg-zinc-50">
                <Download size={14} /> Baixar PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showSessionModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-zinc-900/80 backdrop-blur-sm">
          <div className="bg-white rounded-none shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6 border-b border-zinc-100 bg-zinc-50 flex justify-between items-center">
              <h3 className="font-bold text-[#003366]">Abertura de Caixa</h3>
              <button onClick={() => setShowSessionModal(false)}><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Fundo de Maneio Inicial</label>
                <input 
                  type="number" 
                  value={initialBalance}
                  onChange={e => setInitialBalance(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 px-4 py-3 text-lg font-bold text-[#003366] focus:outline-none focus:border-[#003366]"
                  placeholder="0.00"
                />
              </div>
              <button 
                onClick={handleOpenSession}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 shadow-lg"
              >
                Confirmar Abertura
              </button>
            </div>
          </div>
        </div>
      )}

      {showPOSModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-zinc-900/80 backdrop-blur-sm">
          <div className="bg-white rounded-none shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6 border-b border-zinc-100 bg-zinc-50 flex justify-between items-center">
              <h3 className="font-bold text-[#003366]">Novo Ponto de Venda</h3>
              <button onClick={() => setShowPOSModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const target = e.target as any;
              handleAddPOS(target.name.value, target.location.value);
            }} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Nome do Terminal</label>
                <input name="name" required className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2 text-sm focus:outline-none focus:border-[#003366]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Localização</label>
                <input name="location" required className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2 text-sm focus:outline-none focus:border-[#003366]" />
              </div>
              <button type="submit" className="w-full bg-[#003366] text-white font-bold py-3 shadow-lg">Registar Terminal</button>
            </form>
          </div>
        </div>
      )}

      {showDiscountModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-zinc-900/80 backdrop-blur-sm">
          <div className="bg-white rounded-none shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6 border-b border-zinc-100 bg-zinc-50 flex justify-between items-center">
              <h3 className="font-bold text-[#003366]">Aplicar Desconto no Item</h3>
              <button onClick={() => setShowDiscountModal(null)}><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Valor do Desconto</label>
                <input 
                  type="number" 
                  autoFocus
                  className="w-full bg-zinc-50 border border-zinc-200 px-4 py-3 text-lg font-bold text-[#003366] focus:outline-none focus:border-[#003366]"
                  placeholder="0.00"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = parseFloat((e.target as HTMLInputElement).value) || 0;
                      setCart(cart.map((c, idx) => idx === showDiscountModal.index ? { ...c, discount: val } : c));
                      setShowDiscountModal(null);
                    }
                  }}
                />
              </div>
              <p className="text-[10px] text-zinc-400">Pressione Enter para confirmar</p>
            </div>
          </div>
        </div>
      )}

      {showReportModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-zinc-900/80 backdrop-blur-sm">
          <div className="bg-white rounded-none shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="p-6 border-b border-zinc-100 bg-zinc-50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#003366] text-white flex items-center justify-center">
                  <BarChart3 size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-[#003366]">Relatório de Vendas POS</h3>
                  <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Sessão: {activeSession?.id || 'N/A'}</p>
                </div>
              </div>
              <button onClick={() => setShowReportModal(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-8">
              <div className="grid grid-cols-3 gap-6">
                <div className="bg-zinc-50 p-5 border border-zinc-100 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                    <TrendingUp size={48} />
                  </div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Total Vendas</p>
                  <p className="text-2xl font-black text-[#003366]">{formatCurrency(activeSession?.total_sales || 0)}</p>
                </div>
                <div className="bg-zinc-50 p-5 border border-zinc-100 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Tag size={48} />
                  </div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Total Descontos</p>
                  <p className="text-2xl font-black text-red-500">{formatCurrency(activeSession?.total_discounts || 0)}</p>
                </div>
                <div className="bg-zinc-50 p-5 border border-zinc-100 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Wallet size={48} />
                  </div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Saldo Atual</p>
                  <p className="text-2xl font-black text-emerald-600">{formatCurrency((activeSession?.initial_balance || 0) + (activeSession?.total_sales || 0))}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Histórico de Sessões</p>
                  <span className="text-[10px] font-bold text-[#003366] bg-[#003366]/5 px-2 py-0.5">Últimas 5 sessões</span>
                </div>
                <div className="border border-zinc-100 divide-y divide-zinc-100">
                  {sessions.slice(0, 5).map(s => (
                    <div key={s.id} className="p-4 flex justify-between items-center hover:bg-zinc-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-2 h-2 rounded-full ${s.status === 'open' ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-300'}`} />
                        <div>
                          <p className="font-bold text-zinc-700 text-sm">{new Date(s.opened_at).toLocaleString('pt-PT')}</p>
                          <p className="text-[10px] text-zinc-400 font-medium">
                            Status: <span className={s.status === 'open' ? 'text-emerald-600 font-bold' : 'text-zinc-500'}>
                              {s.status === 'open' ? 'Aberta' : 'Fechada'}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-[#003366]">{formatCurrency(s.total_sales)}</p>
                        <p className="text-[9px] text-zinc-400 font-bold uppercase">Total Bruto</p>
                      </div>
                    </div>
                  ))}
                  {sessions.length === 0 && (
                    <div className="p-8 text-center text-zinc-400 text-sm italic">Nenhuma sessão anterior encontrada.</div>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button 
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#003366] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#002244] transition-all shadow-lg"
                >
                  <Printer size={14} /> Imprimir Relatório
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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

const UsersSettings = () => {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [profession, setProfession] = useState('');
  const [date, setDate] = useState('');
  const [permissionArea, setPermissionArea] = useState('');
  const [contact, setContact] = useState('');
  const [address, setAddress] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/system-users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/system-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          profession,
          date,
          permission_area: permissionArea,
          contact,
          address
        })
      });
      if (res.ok) {
        fetchUsers();
        setShowForm(false);
        setName(''); setProfession(''); setDate(''); setPermissionArea(''); setContact(''); setAddress('');
      }
    } catch (error) {
      console.error('Error creating user:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-[#003366]">Utilizadores do Sistema</h3>
        <button 
          onClick={() => setShowForm(true)}
          className="bg-[#003366] text-white px-4 py-2 text-sm font-bold rounded-none hover:bg-[#002244]"
        >
          Criar Utilizador
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-2xl bg-white p-8 rounded-none shadow-2xl"
          >
            <h3 className="font-bold text-[#003366] mb-6 text-xl">Novo Utilizador</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Nome</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Profissão</label>
                <input type="text" value={profession} onChange={e => setProfession(e.target.value)} className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Data</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Área de Permissão</label>
                <select value={permissionArea} onChange={e => setPermissionArea(e.target.value)} className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm">
                  <option value="">Selecionar Área</option>
                  <option value="admin">Administrador</option>
                  <option value="faturacao">Faturação</option>
                  <option value="rh">Recursos Humanos</option>
                  <option value="financeiro">Financeiro</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Contacto</label>
                <input type="text" value={contact} onChange={e => setContact(e.target.value)} className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Morada</label>
                <input type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" />
              </div>
              <div className="md:col-span-2 flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowForm(false)} className="text-zinc-500 hover:text-zinc-700 text-sm font-medium">Cancelar</button>
                <button type="submit" className="bg-[#003366] text-white font-bold px-6 py-2 rounded-none hover:bg-[#002244] transition-all text-sm">Registar</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <div className="bg-white border border-zinc-200 rounded-none overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#003366] text-white text-[11px] uppercase tracking-wider font-bold">
              <th className="px-6 py-4">Nome</th>
              <th className="px-6 py-4">Profissão</th>
              <th className="px-6 py-4">Área</th>
              <th className="px-6 py-4">Contacto</th>
              <th className="px-6 py-4">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-zinc-50 text-sm">
                <td className="px-6 py-4 font-bold text-[#003366]">{user.name}</td>
                <td className="px-6 py-4 text-zinc-600">{user.profession}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-zinc-100 text-zinc-600 text-[10px] font-bold uppercase rounded-none">
                    {user.permission_area}
                  </span>
                </td>
                <td className="px-6 py-4 text-zinc-500">{user.contact}</td>
                <td className="px-6 py-4 text-zinc-400">{user.date}</td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-zinc-400 italic">Nenhum utilizador registado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const SecretaryModule = () => {
  const [activeSection, setActiveSection] = useState('docs');
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const sections = [
    { id: 'docs', label: 'Documento da Empresa', icon: Building2 },
    { id: 'letters', label: 'Cartas', icon: Mail },
    { id: 'archives', label: 'Arquivos', icon: FileBox },
    { id: 'attachments', label: 'Anexos', icon: Paperclip },
  ];

  const renderSectionContent = () => {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-[#003366]">{sections.find(s => s.id === activeSection)?.label}</h3>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowForm(!showForm)}
              className="bg-[#003366] text-white px-4 py-2 text-sm font-bold flex items-center gap-2 shadow-md hover:bg-[#002244] transition-all"
            >
              {showForm ? <X size={16} /> : <Plus size={16} />} 
              {showForm ? 'Fechar Formulário' : 'Novo Registro'}
            </button>
            <button className="bg-white border border-zinc-200 text-zinc-600 px-4 py-2 text-sm font-bold flex items-center gap-2 hover:bg-zinc-50 transition-all">
              <Filter size={16} /> Filtrar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-zinc-100 bg-zinc-50 flex justify-between items-center">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Lista de Registros</span>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                  <input 
                    type="text" 
                    placeholder="Pesquisar..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-1.5 bg-white border border-zinc-200 text-xs focus:outline-none focus:border-[#003366] w-64" 
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest border-b border-zinc-100">
                      <th className="px-6 py-4">Referência</th>
                      <th className="px-6 py-4">Data</th>
                      <th className="px-6 py-4">Descrição</th>
                      <th className="px-6 py-4">Estado</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {[1, 2, 3, 4, 5].map(i => (
                      <tr key={i} className="text-sm hover:bg-zinc-50 transition-colors group">
                        <td className="px-6 py-4 font-bold text-[#003366]">REF-2026-00{i}</td>
                        <td className="px-6 py-4 text-zinc-500">{new Date().toLocaleDateString('pt-PT')}</td>
                        <td className="px-6 py-4 text-zinc-600">Registro de exemplo para {activeSection}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase rounded-full">Ativo</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-1 text-zinc-400 hover:text-[#003366]"><Eye size={16} /></button>
                            <button className="p-1 text-zinc-400 hover:text-red-500"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-zinc-100 bg-zinc-50 flex justify-between items-center">
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Total: 5 registros</span>
                <div className="flex gap-2">
                  <button className="p-1 border border-zinc-200 bg-white text-zinc-400 disabled:opacity-50" disabled><ChevronLeft size={16} /></button>
                  <button className="p-1 border border-zinc-200 bg-white text-zinc-400 disabled:opacity-50" disabled><ChevronRight size={16} /></button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white border border-zinc-200 p-8 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
              <h4 className="font-bold text-[#003366] mb-4 flex items-center gap-2 uppercase tracking-tight">
                <AlertCircle size={18} className="text-emerald-500" /> Informações Úteis
              </h4>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Esta seção permite gerir todos os documentos relacionados com <span className="font-bold text-[#003366]">{sections.find(s => s.id === activeSection)?.label}</span>. 
              </p>
              <ul className="mt-4 space-y-2">
                <li className="flex items-start gap-2 text-xs text-zinc-500">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 shrink-0" />
                  <span>Mantenha os arquivos organizados por data.</span>
                </li>
                <li className="flex items-start gap-2 text-xs text-zinc-500">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 shrink-0" />
                  <span>Anexe documentos digitalizados para consulta rápida.</span>
                </li>
                <li className="flex items-start gap-2 text-xs text-zinc-500">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mt-1.5 shrink-0" />
                  <span>Use referências claras para facilitar a pesquisa.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showForm && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white border border-zinc-200 p-8 shadow-2xl relative overflow-hidden max-w-lg w-full"
              >
                <button 
                  onClick={() => setShowForm(false)}
                  className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  <X size={24} />
                </button>
                <div className="absolute top-0 left-0 w-1 h-full bg-[#003366]" />
                <h4 className="font-bold text-[#003366] mb-6 flex items-center gap-2 uppercase tracking-tight">
                  <PlusCircle size={18} /> Novo Registro: {sections.find(s => s.id === activeSection)?.label}
                </h4>
                <form className="space-y-5" onSubmit={e => { e.preventDefault(); setShowForm(false); }}>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Título do Documento</label>
                    <input type="text" required className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366] transition-all" placeholder="Ex: Contrato de Arrendamento" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Data de Emissão</label>
                    <input type="date" required className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366] transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Observações / Notas</label>
                    <textarea className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366] h-32 transition-all" placeholder="Descreva os detalhes importantes..."></textarea>
                  </div>
                  <div className="pt-4 flex gap-3">
                    <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-zinc-100 text-zinc-600 py-3 text-xs font-bold uppercase tracking-widest hover:bg-zinc-200 transition-all">Cancelar</button>
                    <button type="submit" className="flex-2 bg-[#003366] text-white py-3 px-8 text-xs font-bold uppercase tracking-widest shadow-lg hover:bg-[#002244] transition-all">Guardar Registro</button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <header>
        <Breadcrumbs paths={['Home', 'Área Reservada', 'Secretária']} />
        <h2 className="text-2xl font-bold text-[#003366] tracking-tight">Secretária Digital</h2>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {sections.map(section => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`p-6 border transition-all flex flex-col items-center gap-3 group ${
              activeSection === section.id 
                ? 'bg-[#003366] border-[#003366] text-white shadow-xl scale-105 z-10' 
                : 'bg-white border-zinc-200 text-zinc-600 hover:border-[#003366] hover:text-[#003366]'
            }`}
          >
            <section.icon size={32} className={activeSection === section.id ? 'text-white' : 'text-zinc-400 group-hover:text-[#003366]'} />
            <span className="text-sm font-bold uppercase tracking-wider">{section.label}</span>
          </button>
        ))}
      </div>

      <div className="pt-4">
        {renderSectionContent()}
      </div>
    </div>
  );
};

const SettingsModule = ({ 
  fiscalYear, 
  setFiscalYear,
  companyName,
  setCompanyName,
  companyNif,
  setCompanyNif,
  companyAddress,
  setCompanyAddress,
  companyLogo,
  setCompanyLogo,
  companyFooter,
  setCompanyFooter
}: { 
  fiscalYear: string, 
  setFiscalYear: (y: string) => void,
  companyName: string,
  setCompanyName: (v: string) => void,
  companyNif: string,
  setCompanyNif: (v: string) => void,
  companyAddress: string,
  setCompanyAddress: (v: string) => void,
  companyLogo: string,
  setCompanyLogo: (v: string) => void,
  companyFooter: string,
  setCompanyFooter: (v: string) => void
}) => {
  const [activeTab, setActiveTab] = useState('geral');

  return (
    <div className="space-y-8">
      <header>
        <Breadcrumbs paths={['Home', 'Área Reservada', 'Configurações']} />
        <h2 className="text-2xl font-bold text-[#003366] tracking-tight">Configurações do Sistema</h2>
      </header>

      <div className="flex gap-4 border-b border-zinc-200">
        <button 
          onClick={() => setActiveTab('geral')}
          className={`pb-2 text-sm font-bold ${activeTab === 'geral' ? 'text-[#003366] border-b-2 border-[#003366]' : 'text-zinc-500 hover:text-zinc-800'}`}
        >
          Geral
        </button>
        <button 
          onClick={() => setActiveTab('utilizadores')}
          className={`pb-2 text-sm font-bold ${activeTab === 'utilizadores' ? 'text-[#003366] border-b-2 border-[#003366]' : 'text-zinc-500 hover:text-zinc-800'}`}
        >
          Utilizadores
        </button>
      </div>

      {activeTab === 'geral' ? (
        <div className="bg-white border border-zinc-200 rounded-none shadow-sm divide-y divide-zinc-100">
          <div className="p-8 space-y-6">
            <h3 className="font-bold text-[#003366]">Geral</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Nome da Empresa</label>
                <input 
                  type="text" 
                  value={companyName} 
                  onChange={e => setCompanyName(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-sm focus:outline-none focus:border-[#003366]" 
                />
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
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">URL do Logotipo</label>
                <div className="flex gap-4">
                  <input 
                    type="text" 
                    value={companyLogo} 
                    onChange={e => setCompanyLogo(e.target.value)}
                    placeholder="https://exemplo.com/logo.png"
                    className="flex-1 bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-sm focus:outline-none focus:border-[#003366]" 
                  />
                  {companyLogo && (
                    <div className="w-10 h-10 bg-zinc-100 border border-zinc-200 flex items-center justify-center overflow-hidden">
                      <img src={companyLogo} alt="Logo Preview" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Endereço</label>
                <input 
                  type="text" 
                  value={companyAddress} 
                  onChange={e => setCompanyAddress(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-sm focus:outline-none focus:border-[#003366]" 
                />
              </div>
            </div>
          </div>
          <div className="p-8 space-y-6">
            <h3 className="font-bold text-[#003366]">Fiscalidade & Rodapé</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">NIF da Empresa</label>
                <input 
                  type="text" 
                  value={companyNif} 
                  onChange={e => setCompanyNif(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-sm focus:outline-none focus:border-[#003366]" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Texto do Rodapé</label>
                <input 
                  type="text" 
                  value={companyFooter} 
                  onChange={e => setCompanyFooter(e.target.value)}
                  placeholder="Ex: Processado por computador • FaturaPronta Software"
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-sm focus:outline-none focus:border-[#003366]" 
                />
              </div>
            </div>
          </div>
          <div className="p-8 flex justify-end">
            <button className="bg-[#003366] text-white font-bold px-8 py-2.5 rounded-none text-sm shadow-sm">Guardar Alterações</button>
          </div>
        </div>
      ) : (
        <UsersSettings />
      )}
    </div>
  );
};

const CashierModule = ({ issuedDocuments = [] }: { issuedDocuments?: IssuedDocument[] }) => {
  const [activeSubTab, setActiveSubTab] = useState('sessions');
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [initialBalance, setInitialBalance] = useState('');
  const [posPointId, setPosPointId] = useState('');
  const [selectedSession, setSelectedSession] = useState<any>(null);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cash/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/cash/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initial_balance: Number(initialBalance), pos_point_id: posPointId ? Number(posPointId) : null })
      });
      if (res.ok) {
        setInitialBalance(''); setPosPointId(''); setShowForm(false);
        fetchSessions();
      }
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const handleCloseSession = async (id: number, finalBalance: number) => {
    try {
      const res = await fetch(`/api/cash/close/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ final_balance: finalBalance })
      });
      if (res.ok) {
        fetchSessions();
        if (selectedSession?.id === id) setSelectedSession(null);
      }
    } catch (error) {
      console.error('Error closing session:', error);
    }
  };

  const menuItems = [
    { id: 'sessions', label: 'Sessões de Caixa', icon: History, description: 'Gestão de aberturas e fechos de caixa' },
    { id: 'movements', label: 'Movimento', icon: TrendingUp, description: 'Documentos associados ao caixa selecionado' },
    { id: 'reports', label: 'Relatórios de Caixa', icon: BarChart3, description: 'Resumo de todos os movimentos e tipos' },
    { id: 'reconciliation', label: 'Conciliação de Caixa', icon: Layers, description: 'Verificação e ajuste de saldos' },
  ];

  if (activeSubTab === 'sessions') {
    return (
      <div className="space-y-8">
        <header className="flex justify-between items-center">
          <div>
            <Breadcrumbs paths={['Home', 'Caixa', 'Sessões']} />
            <h2 className="text-2xl font-bold text-[#003366] tracking-tight">Sessões de Caixa</h2>
            <p className="text-zinc-500 text-sm">Controlo de abertura e fecho de caixa.</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setActiveSubTab('movements')} className="text-zinc-500 hover:text-[#003366] font-bold px-4 py-2 text-sm transition-all border border-zinc-200">
              Ver Movimentos
            </button>
            <button onClick={() => setShowForm(true)} className="bg-[#003366] hover:bg-[#002244] text-white font-bold px-6 py-2.5 rounded-none flex items-center gap-2 transition-all shadow-sm text-sm">
              <Plus size={18} /> Abrir Caixa
            </button>
          </div>
        </header>

        {showForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
            <div className="relative w-full max-w-lg bg-white p-8 rounded-none shadow-2xl">
              <h3 className="font-bold text-[#003366] mb-6 text-xl">Abrir Nova Sessão</h3>
              <form onSubmit={handleCreateSession} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Saldo Inicial</label>
                  <input type="number" step="0.01" value={initialBalance} onChange={e => setInitialBalance(e.target.value)} required className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button type="button" onClick={() => setShowForm(false)} className="text-zinc-500 hover:text-zinc-700 text-sm font-medium">Cancelar</button>
                  <button type="submit" className="bg-[#003366] text-white font-bold px-6 py-2 rounded-none hover:bg-[#002244] transition-all text-sm">Abrir Caixa</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="bg-white border border-zinc-200 rounded-none overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#003366] text-white text-[11px] uppercase tracking-wider font-bold">
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Abertura</th>
                <th className="px-6 py-4">Fecho</th>
                <th className="px-6 py-4">Saldo Inicial</th>
                <th className="px-6 py-4">Saldo Final</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {sessions.map(s => (
                <tr key={s.id} className="text-sm hover:bg-zinc-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs">#{s.id}</td>
                  <td className="px-6 py-4">{new Date(s.opened_at).toLocaleString()}</td>
                  <td className="px-6 py-4">{s.closed_at ? new Date(s.closed_at).toLocaleString() : '-'}</td>
                  <td className="px-6 py-4 font-bold">{formatCurrency(s.initial_balance)}</td>
                  <td className="px-6 py-4">{s.final_balance ? formatCurrency(s.final_balance) : '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-[10px] font-bold uppercase ${s.status === 'open' ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-600'}`}>
                      {s.status === 'open' ? 'Aberto' : 'Fechado'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => { setSelectedSession(s); setActiveSubTab('movements'); }}
                        className="p-2 text-zinc-400 hover:text-[#003366] transition-colors"
                        title="Ver Movimentos"
                      >
                        <TrendingUp size={16} />
                      </button>
                      {s.status === 'open' && (
                        <button 
                          onClick={() => {
                            const final = prompt('Insira o saldo final para fechar o caixa:');
                            if (final) handleCloseSession(s.id, Number(final));
                          }}
                          className="p-2 text-zinc-400 hover:text-red-600 transition-colors"
                          title="Fechar Caixa"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-400 italic">Nenhuma sessão de caixa encontrada.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (activeSubTab === 'movements') {
    const sessionDocs = selectedSession 
      ? issuedDocuments.filter(d => d.cash_box === selectedSession.id.toString())
      : issuedDocuments;

    return (
      <div className="space-y-8">
        <header className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button onClick={() => setActiveSubTab('sessions')} className="p-2 hover:bg-zinc-100 transition-colors">
              <ChevronLeft size={20} />
            </button>
            <div>
              <Breadcrumbs paths={['Home', 'Caixa', 'Movimentos']} />
              <h2 className="text-2xl font-bold text-[#003366] tracking-tight">
                Movimentos {selectedSession ? `(Sessão #${selectedSession.id})` : ''}
              </h2>
              <p className="text-zinc-500 text-sm">Documentos e valores registados no caixa.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setActiveSubTab('reports')} className="text-[#003366] font-bold px-4 py-2 text-sm border border-[#003366]">
              Relatórios
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-zinc-200 p-6 shadow-sm">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Total Movimentado</p>
            <p className="text-2xl font-bold text-[#003366]">
              {formatCurrency(sessionDocs.reduce((sum, d) => sum + (d.contravalor || 0), 0))}
            </p>
          </div>
          <div className="bg-white border border-zinc-200 p-6 shadow-sm">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Documentos</p>
            <p className="text-2xl font-bold text-[#003366]">{sessionDocs.length}</p>
          </div>
          <div className="bg-white border border-zinc-200 p-6 shadow-sm">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Saldo Estimado</p>
            <p className="text-2xl font-bold text-emerald-600">
              {formatCurrency((selectedSession?.initial_balance || 0) + sessionDocs.reduce((sum, d) => sum + (d.contravalor || 0), 0))}
            </p>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-none overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#003366] text-white text-[11px] uppercase tracking-wider font-bold">
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Documento</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Valor</th>
                <th className="px-6 py-4">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {sessionDocs.map(d => (
                <tr key={d.id} className="text-sm hover:bg-zinc-50 transition-colors">
                  <td className="px-6 py-4">{new Date(d.data_emissao).toLocaleDateString()}</td>
                  <td className="px-6 py-4 font-bold">{d.numero_documento}</td>
                  <td className="px-6 py-4">{d.client_name}</td>
                  <td className="px-6 py-4 font-bold">{formatCurrency(d.contravalor)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-[10px] font-bold uppercase ${d.is_certified ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-600'}`}>
                      {d.is_certified ? 'Certificado' : 'Pendente'}
                    </span>
                  </td>
                </tr>
              ))}
              {sessionDocs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-400 italic">Nenhum movimento registado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (activeSubTab === 'reports') {
    return (
      <div className="space-y-8">
        <header className="flex items-center gap-4">
          <button onClick={() => setActiveSubTab('sessions')} className="p-2 hover:bg-zinc-100 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div>
            <Breadcrumbs paths={['Home', 'Caixa', 'Relatórios']} />
            <h2 className="text-2xl font-bold text-[#003366] tracking-tight">Relatórios de Caixa</h2>
            <p className="text-zinc-500 text-sm">Resumo detalhado de todos os movimentos.</p>
          </div>
        </header>

        <div className="bg-white border border-zinc-200 p-8 rounded-none shadow-sm">
          <div className="flex justify-between items-center mb-8 border-b border-zinc-100 pb-4">
            <h3 className="text-sm font-bold text-[#003366] uppercase tracking-widest flex items-center gap-3">
              <FileText size={18} /> Relatórios de Caixa
            </h3>
            <button className="bg-zinc-100 text-zinc-600 px-6 py-2 text-xs font-bold hover:bg-zinc-200 transition-all flex items-center gap-2">
              <FileDown size={14} /> Exportar PDF
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-zinc-50 p-6 border border-zinc-200">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Total Entradas</p>
              <p className="text-2xl font-black text-emerald-600">{formatCurrency(issuedDocuments.reduce((acc, doc) => acc + (doc.contravalor || 0), 0))}</p>
            </div>
            <div className="bg-zinc-50 p-6 border border-zinc-200">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Total Saídas</p>
              <p className="text-2xl font-black text-red-600">{formatCurrency(0)}</p>
            </div>
            <div className="bg-zinc-50 p-6 border border-zinc-200">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Saldo Consolidado</p>
              <p className="text-2xl font-black text-[#003366]">{formatCurrency(issuedDocuments.reduce((acc, doc) => acc + (doc.contravalor || 0), 0))}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-[#003366] text-white text-[10px] uppercase tracking-wider font-bold">
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Documento</th>
                  <th className="px-4 py-3">Descrição</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {issuedDocuments.map((doc) => (
                  <tr key={doc.id} className="hover:bg-zinc-50 text-[11px] transition-colors">
                    <td className="px-4 py-3 text-zinc-500">{new Date(doc.data_emissao).toLocaleDateString('pt-PT')}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 font-bold uppercase text-[9px]">Entrada</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-zinc-900">{doc.numero_documento}</td>
                    <td className="px-4 py-3 text-zinc-600">{doc.tipo_documento} - {doc.client_name}</td>
                    <td className="px-4 py-3 text-right font-bold text-[#003366]">{formatCurrency(doc.contravalor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (activeSubTab === 'reconciliation') {
    return (
      <div className="space-y-8">
        <header className="flex items-center gap-4">
          <button onClick={() => setActiveSubTab('sessions')} className="p-2 hover:bg-zinc-100 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <div>
            <Breadcrumbs paths={['Home', 'Caixa', 'Conciliação']} />
            <h2 className="text-2xl font-bold text-[#003366] tracking-tight">Conciliação de Caixa</h2>
            <p className="text-zinc-500 text-sm">Verifique a integridade dos valores em caixa.</p>
          </div>
        </header>

        <div className="bg-white border border-zinc-200 p-8 rounded-none shadow-sm">
          <div className="flex justify-between items-center mb-8 border-b border-zinc-100 pb-4">
            <h3 className="text-sm font-bold text-[#003366] uppercase tracking-widest flex items-center gap-3">
              <ShieldCheck size={18} /> Conciliação de Caixa
            </h3>
          </div>

          <div className="max-w-2xl mx-auto bg-zinc-50 p-8 border border-zinc-200 space-y-6">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Saldo do Sistema</label>
                <p className="text-xl font-black text-[#003366]">{formatCurrency(issuedDocuments.reduce((acc, doc) => acc + (doc.contravalor || 0), 0))}</p>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Saldo Físico (Contado)</label>
                <input 
                  type="number" 
                  className="w-full bg-white border border-zinc-200 rounded-none px-4 py-2 text-sm font-bold text-[#003366] focus:outline-none focus:border-[#003366]"
                  placeholder="0,00 Kz"
                />
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t border-zinc-200">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Observações da Conciliação</label>
              <textarea 
                className="w-full bg-white border border-zinc-200 rounded-none px-4 py-2 text-xs focus:outline-none focus:border-[#003366] min-h-[100px]"
                placeholder="Descreva qualquer divergência encontrada..."
              ></textarea>
            </div>

            <div className="flex justify-end pt-4">
              <button className="bg-[#003366] text-white px-8 py-3 text-xs font-bold hover:bg-[#002244] transition-all uppercase tracking-widest shadow-sm">
                Finalizar Conciliação
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
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
  const [activeSubTab, setActiveSubTab] = useState<string | null>(null);

  const sections = [
    { id: 'daily-movements', label: 'Movimento Diário', icon: <History size={24} />, description: 'Registo cronológico de todos os movimentos contabilísticos diários.' },
    { id: 'general-regime', label: 'Regime Geral', icon: <BadgeCheck size={24} />, description: 'Contabilidade para empresas enquadradas no regime geral de tributação.' },
    { id: 'simplified-regime', label: 'Regime Simplificado', icon: <Layers size={24} />, description: 'Gestão simplificada para empresas com volume de negócios reduzido.' },
    { id: 'exclusion-regime', label: 'Regime de Exclusão', icon: <XCircle size={24} />, description: 'Controlo de entidades isentas ou excluídas do regime de IVA.' },
    { id: 'accounting-calculations', label: 'Cálculos Contabilísticos', icon: <Calculator size={24} />, description: 'Processamento de amortizações, provisões e apuramentos fiscais.' },
    { id: 'accounting-maps', label: 'Mapas Contabilísticos', icon: <FileText size={24} />, description: 'Emissão de balancetes, balanços e demonstrações de resultados.' },
    { id: 'movement-maps', label: 'Mapas de Movimento', icon: <TrendingUp size={24} />, description: 'Análise gráfica e tabular dos fluxos financeiros da empresa.' },
    { id: 'pgc', label: 'PGC', icon: <Book size={24} />, description: 'Consulta e gestão do Plano Geral de Contas angolano.' },
    { id: 'accounting-settings', label: 'Configurações Contábeis', icon: <Settings size={24} />, description: 'Definição de parâmetros fiscais, anos e moedas de relato.' },
    { id: 'annual-declarations', label: 'Declarações Anuais', icon: <Calendar size={24} />, description: 'Preparação e submissão de modelos fiscais anuais (M1, M2).' },
    { id: 'saft', label: 'Ficheiro SAFT', icon: <FileCode size={24} />, description: 'Exportação do ficheiro de auditoria tributária para a AGT.' },
  ];

  if (!activeSubTab) {
    return (
      <div className="space-y-8">
        <header>
          <Breadcrumbs paths={['Home', 'Área Reservada', 'Contabilidade']} />
          <h2 className="text-3xl font-black text-[#003366] tracking-tight uppercase">Contabilidade</h2>
          <p className="text-zinc-500 text-sm">Selecione uma secção para gerir a contabilidade da sua empresa.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSubTab(section.id)}
              className="group bg-white border border-zinc-200 p-8 text-left hover:border-[#003366] hover:shadow-xl transition-all flex flex-col items-center text-center space-y-4"
            >
              <div className="text-[#003366] group-hover:scale-110 transition-transform duration-300">
                {section.icon}
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-[#003366] uppercase tracking-tight">{section.label}</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">{section.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeSubTab) {
      case 'daily-movements':
        return (
          <div className="space-y-6">
            <div className="bg-white border border-zinc-200 p-8 rounded-none shadow-sm">
              <h3 className="text-sm font-bold text-[#003366] uppercase tracking-widest mb-6 flex items-center gap-3">
                <History size={18} /> Movimento Diário Contabilístico
              </h3>
              <div className="p-12 text-center text-zinc-400 italic bg-zinc-50 border border-dashed border-zinc-200">
                Nenhum movimento registado para o dia de hoje.
              </div>
            </div>
          </div>
        );
      case 'general-regime':
        return (
          <div className="space-y-6">
            <div className="bg-white border border-zinc-200 p-8 rounded-none shadow-sm">
              <h3 className="text-sm font-bold text-[#003366] uppercase tracking-widest mb-6 flex items-center gap-3">
                <BadgeCheck size={18} /> Contabilidade - Regime Geral
              </h3>
              <p className="text-zinc-500 text-sm mb-8">Gestão e apuramento de impostos para empresas no regime geral.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 border border-zinc-100 bg-zinc-50">
                  <h4 className="font-bold text-zinc-900 mb-2">Apuramento de IVA</h4>
                  <p className="text-xs text-zinc-500 mb-4">Cálculo detalhado do IVA a pagar ou a recuperar.</p>
                  <button className="text-[#003366] text-xs font-bold uppercase tracking-widest hover:underline">Processar</button>
                </div>
                <div className="p-6 border border-zinc-100 bg-zinc-50">
                  <h4 className="font-bold text-zinc-900 mb-2">Demonstração de Resultados</h4>
                  <p className="text-xs text-zinc-500 mb-4">Relatório de proveitos e custos do período.</p>
                  <button className="text-[#003366] text-xs font-bold uppercase tracking-widest hover:underline">Gerar Relatório</button>
                </div>
              </div>
            </div>
          </div>
        );
      case 'simplified-regime':
        return (
          <div className="space-y-6">
            <div className="bg-white border border-zinc-200 p-8 rounded-none shadow-sm">
              <h3 className="text-sm font-bold text-[#003366] uppercase tracking-widest mb-6 flex items-center gap-3">
                <Layers size={18} /> Contabilidade - Regime Simplificado
              </h3>
              <p className="text-zinc-500 text-sm mb-8">Acompanhamento simplificado de custos e proveitos.</p>
              <div className="p-12 text-center text-zinc-400 italic bg-zinc-50 border border-dashed border-zinc-200">
                Módulo configurado para empresas com faturação anual inferior ao limite legal.
              </div>
            </div>
          </div>
        );
      case 'exclusion-regime':
        return (
          <div className="space-y-6">
            <div className="bg-white border border-zinc-200 p-8 rounded-none shadow-sm">
              <h3 className="text-sm font-bold text-[#003366] uppercase tracking-widest mb-6 flex items-center gap-3">
                <XCircle size={18} /> Contabilidade - Regime de Exclusão
              </h3>
              <p className="text-zinc-500 text-sm mb-8">Gestão de isenções e regimes especiais de exclusão de IVA.</p>
              <div className="p-12 text-center text-zinc-400 italic bg-zinc-50 border border-dashed border-zinc-200">
                Nenhum dado disponível para este regime.
              </div>
            </div>
          </div>
        );
      case 'accounting-calculations':
        return (
          <div className="space-y-6">
            <div className="bg-white border border-zinc-200 p-8 rounded-none shadow-sm">
              <h3 className="text-sm font-bold text-[#003366] uppercase tracking-widest mb-6 flex items-center gap-3">
                <Calculator size={18} /> Cálculos Contabilísticos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 border border-zinc-100 bg-zinc-50 space-y-3">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase">Amortizações</p>
                  <p className="text-lg font-bold text-[#003366]">0,00 Kz</p>
                  <button className="text-[10px] font-bold text-[#003366] uppercase">Calcular</button>
                </div>
                <div className="p-4 border border-zinc-100 bg-zinc-50 space-y-3">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase">Provisões</p>
                  <p className="text-lg font-bold text-[#003366]">0,00 Kz</p>
                  <button className="text-[10px] font-bold text-[#003366] uppercase">Calcular</button>
                </div>
                <div className="p-4 border border-zinc-100 bg-zinc-50 space-y-3">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase">Impostos Estimados</p>
                  <p className="text-lg font-bold text-[#003366]">0,00 Kz</p>
                  <button className="text-[10px] font-bold text-[#003366] uppercase">Calcular</button>
                </div>
              </div>
            </div>
          </div>
        );
      case 'accounting-maps':
        return (
          <div className="space-y-6">
            <div className="bg-white border border-zinc-200 p-8 rounded-none shadow-sm">
              <h3 className="text-sm font-bold text-[#003366] uppercase tracking-widest mb-6 flex items-center gap-3">
                <FileText size={18} /> Mapas Contabilísticos
              </h3>
              <div className="space-y-4">
                {['Balancete de Verificação', 'Balanço Patrimonial', 'Demonstração de Resultados', 'Mapa de Origem e Aplicação de Fundos'].map((map) => (
                  <div key={map} className="flex justify-between items-center p-4 border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                    <span className="text-sm text-zinc-700">{map}</span>
                    <button className="text-[#003366] p-2 hover:bg-zinc-100 rounded-none">
                      <Download size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'movement-maps':
        return (
          <div className="space-y-6">
            <div className="bg-white border border-zinc-200 p-8 rounded-none shadow-sm">
              <h3 className="text-sm font-bold text-[#003366] uppercase tracking-widest mb-6 flex items-center gap-3">
                <TrendingUp size={18} /> Mapas de Movimento
              </h3>
              <p className="text-zinc-500 text-sm mb-8">Análise de fluxos financeiros e variações patrimoniais.</p>
              <div className="h-64 bg-zinc-50 border border-dashed border-zinc-200 flex items-center justify-center text-zinc-400 italic">
                Gráficos de movimento em processamento...
              </div>
            </div>
          </div>
        );
      case 'pgc':
        return (
          <div className="space-y-6">
            <div className="bg-white border border-zinc-200 p-8 rounded-none shadow-sm">
              <h3 className="text-sm font-bold text-[#003366] uppercase tracking-widest mb-6 flex items-center gap-3">
                <Book size={18} /> Plano Geral de Contas (PGC)
              </h3>
              <div className="flex gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                  <input type="text" placeholder="Pesquisar conta (ex: 31, 43...)" className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 text-sm focus:outline-none focus:border-[#003366]" />
                </div>
              </div>
              <div className="space-y-2">
                {[
                  { code: '1', name: 'Meios Disponíveis' },
                  { code: '2', name: 'Contas a Receber e a Pagar' },
                  { code: '3', name: 'Existências' },
                  { code: '4', name: 'Imobilizações' },
                  { code: '5', name: 'Capital Próprio' },
                  { code: '6', name: 'Proveitos e Ganhos por Natureza' },
                  { code: '7', name: 'Custos e Perdas por Natureza' },
                  { code: '8', name: 'Resultados' },
                ].map((item) => (
                  <div key={item.code} className="flex gap-4 p-3 border border-zinc-100 hover:border-[#003366] transition-colors cursor-pointer">
                    <span className="font-bold text-[#003366] w-8">{item.code}</span>
                    <span className="text-sm text-zinc-700">{item.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'accounting-settings':
        return (
          <div className="space-y-6">
            <div className="bg-white border border-zinc-200 p-8 rounded-none shadow-sm">
              <h3 className="text-sm font-bold text-[#003366] uppercase tracking-widest mb-6 flex items-center gap-3">
                <Settings size={18} /> Configurações Contábeis
              </h3>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Ano Fiscal Ativo</label>
                    <select className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2 text-sm focus:outline-none focus:border-[#003366]">
                      <option>2026</option>
                      <option>2025</option>
                      <option>2024</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Moeda de Relato</label>
                    <select className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2 text-sm focus:outline-none focus:border-[#003366]">
                      <option>Kwanza (AOA)</option>
                      <option>Euro (EUR)</option>
                      <option>Dólar (USD)</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="auto-post" className="w-4 h-4 accent-[#003366]" />
                  <label htmlFor="auto-post" className="text-sm text-zinc-700">Lançamento automático de faturas na contabilidade</label>
                </div>
                <button className="bg-[#003366] text-white px-8 py-3 text-xs font-bold uppercase tracking-widest hover:bg-[#002244] transition-all">
                  Guardar Configurações
                </button>
              </div>
            </div>
          </div>
        );
      case 'annual-declarations':
        return (
          <div className="space-y-6">
            <div className="bg-white border border-zinc-200 p-8 rounded-none shadow-sm">
              <h3 className="text-sm font-bold text-[#003366] uppercase tracking-widest mb-6 flex items-center gap-3">
                <Calendar size={18} /> Declarações Anuais
              </h3>
              <div className="space-y-4">
                <div className="p-6 border border-zinc-100 bg-zinc-50 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-zinc-900">Modelo 1 - Imposto Industrial</h4>
                    <p className="text-xs text-zinc-500">Declaração anual de rendimentos.</p>
                  </div>
                  <button className="bg-[#003366] text-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest">Preparar</button>
                </div>
                <div className="p-6 border border-zinc-100 bg-zinc-50 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-zinc-900">Modelo 2 - Retenções na Fonte</h4>
                    <p className="text-xs text-zinc-500">Resumo anual de retenções efetuadas.</p>
                  </div>
                  <button className="bg-[#003366] text-white px-4 py-2 text-[10px] font-bold uppercase tracking-widest">Preparar</button>
                </div>
              </div>
            </div>
          </div>
        );
      case 'saft':
        return (
          <div className="space-y-6">
            <div className="bg-white border border-zinc-200 p-8 rounded-none shadow-sm">
              <h3 className="text-sm font-bold text-[#003366] uppercase tracking-widest mb-6 flex items-center gap-3">
                <FileCode size={18} /> Ficheiro SAF-T (AO)
              </h3>
              <p className="text-zinc-500 text-sm mb-8">Gere o ficheiro XML para submissão à AGT conforme a legislação angolana.</p>
              <div className="max-w-md space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Período</label>
                  <select className="w-full bg-zinc-50 border border-zinc-200 px-4 py-2 text-sm focus:outline-none focus:border-[#003366]">
                    <option>Março 2026</option>
                    <option>Fevereiro 2026</option>
                    <option>Janeiro 2026</option>
                    <option>Ano Completo 2025</option>
                  </select>
                </div>
                <button className="w-full bg-[#003366] text-white py-4 text-xs font-bold uppercase tracking-widest hover:bg-[#002244] transition-all flex items-center justify-center gap-3">
                  <Download size={18} /> Gerar e Descarregar SAF-T
                </button>
                <p className="text-[10px] text-zinc-400 text-center italic">
                  O ficheiro será validado automaticamente antes do download.
                </p>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex items-center gap-4">
        <button onClick={() => setActiveSubTab(null)} className="p-2 hover:bg-zinc-100 transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div>
          <Breadcrumbs paths={['Home', 'Área Reservada', 'Contabilidade', sections.find(s => s.id === activeSubTab)?.label || '']} />
          <h2 className="text-2xl font-bold text-[#003366] tracking-tight">
            {sections.find(s => s.id === activeSubTab)?.label}
          </h2>
          <p className="text-zinc-500 text-sm">Gestão contabilística e fiscal integrada.</p>
        </div>
      </header>

      <motion.div
        key={activeSubTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {renderContent()}
      </motion.div>
    </div>
  );
};

const FiscalSeriesModule = () => {
  const [series, setSeries] = useState<FiscalSeries[]>([]);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ description: '', user_id: '', type: 'normal' as const });
  const [editingSeries, setEditingSeries] = useState<FiscalSeries | null>(null);
  const [showActions, setShowActions] = useState<number | null>(null);

  const fetchSeries = async () => {
    const data = await fetchJson('/api/fiscal-series');
    setSeries(data);
  };

  const fetchUsers = async () => {
    const data = await fetchJson('/api/system-users');
    setSystemUsers(data);
  };

  useEffect(() => {
    fetchSeries();
    fetchUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingSeries ? 'PUT' : 'POST';
    const url = editingSeries ? `/api/fiscal-series/${editingSeries.id}` : '/api/fiscal-series';
    
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...formData,
        user_id: parseInt(formData.user_id),
        is_active: editingSeries ? editingSeries.is_active : true
      })
    });

    if (res.ok) {
      setShowForm(false);
      setEditingSeries(null);
      setFormData({ description: '', user_id: '', type: 'normal' });
      fetchSeries();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-[#003366]">Séries Fiscais</h2>
          <p className="text-zinc-500 text-sm">Gestão de séries de faturação e numeração.</p>
        </div>
        <button 
          onClick={() => {
            setEditingSeries(null);
            setFormData({ description: '', user_id: '', type: 'normal' });
            setShowForm(true);
          }}
          className="bg-[#003366] text-white px-6 py-2.5 rounded-none font-bold text-sm flex items-center gap-2 shadow-sm"
        >
          <Plus size={18} />
          Criar Série
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative w-full max-w-lg bg-white p-8 rounded-none shadow-2xl">
            <h3 className="font-bold text-[#003366] mb-6 text-xl">{editingSeries ? 'Editar Série' : 'Nova Série'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Descrição</label>
                <input 
                  type="text" 
                  value={formData.description} 
                  onChange={e => setFormData({ ...formData, description: e.target.value })} 
                  required 
                  className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Utilizador Responsável</label>
                <select 
                  value={formData.user_id} 
                  onChange={e => setFormData({ ...formData, user_id: e.target.value })} 
                  required 
                  className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm"
                >
                  <option value="">Selecionar Utilizador</option>
                  {systemUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Tipo</label>
                <select 
                  value={formData.type} 
                  onChange={e => setFormData({ ...formData, type: e.target.value as any })} 
                  required 
                  className="w-full bg-white border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm"
                >
                  <option value="normal">Normal</option>
                  <option value="manual_recovery">Recuperação Manual</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowForm(false)} className="text-zinc-500 hover:text-zinc-700 text-sm font-medium">Cancelar</button>
                <button type="submit" className="bg-[#003366] text-white font-bold px-6 py-2 rounded-none hover:bg-[#002244] transition-all text-sm">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white border border-zinc-200 rounded-none shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
              <th className="px-6 py-4">Descrição</th>
              <th className="px-6 py-4">Utilizador</th>
              <th className="px-6 py-4">Tipo</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {series.map(s => (
              <tr key={s.id} className="hover:bg-zinc-50 transition-colors text-sm text-zinc-600">
                <td className="px-6 py-4 font-medium text-zinc-800">{s.description}</td>
                <td className="px-6 py-4">{s.user_name || 'N/A'}</td>
                <td className="px-6 py-4 capitalize">{s.type.replace('_', ' ')}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-[10px] font-bold uppercase ${s.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {s.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right relative">
                  <button 
                    onClick={() => setShowActions(showActions === s.id ? null : s.id)}
                    className="p-2 hover:bg-zinc-100 rounded-full transition-colors"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                  {showActions === s.id && (
                    <div className="absolute right-6 top-12 w-48 bg-white border border-zinc-200 shadow-xl z-10 py-1">
                      <button 
                        onClick={() => {
                          setEditingSeries(s);
                          setFormData({ description: s.description, user_id: s.user_id.toString(), type: s.type });
                          setShowForm(true);
                          setShowActions(null);
                        }}
                        className="w-full text-left px-4 py-2 text-xs hover:bg-zinc-50 flex items-center gap-2"
                      >
                        <Edit size={14} /> Editar
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const InvoiceList = ({ 
  invoices, 
  issuedDocuments,
  clients, 
  workSites, 
  employees,
  onNew, 
  onView, 
  onRegisterClient,
  onAddWorkSite,
  onUpdateWorkSite,
  onAction,
  onCertify
}: { 
  invoices: Invoice[], 
  issuedDocuments: IssuedDocument[],
  clients: Client[],
  workSites: WorkSite[],
  employees: Employee[],
  onNew: () => void, 
  onView: (id: number) => void, 
  onRegisterClient: () => void,
  onAddWorkSite: (site: Omit<WorkSite, 'id'>) => void,
  onUpdateWorkSite: (id: number, site: Omit<WorkSite, 'id'>) => void,
  onAction: (doc: IssuedDocument) => void,
  onCertify: (doc: IssuedDocument) => void
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
        invoices={issuedDocuments}
        onBack={() => setShowManagementView(false)} 
      />
    );
  }

  const tabs = [
    { id: 'emitidos', label: 'Documentos emitidos', icon: ClipboardList },
    { id: 'recebidos', label: 'Documentos recebidos', icon: ClipboardList },
    { id: 'adesao', label: 'Detalhes da adesão', icon: BadgeCheck },
    { id: 'series', label: 'Séries de facturas', icon: FileTextIcon },
    { id: 'fiscal-series', label: 'Série Fiscal', icon: BadgeCheck },
  ];

  const filteredInvoices = Array.isArray(invoices) ? invoices.filter(inv => {
    const matchesSearch = (inv.invoice_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (inv.client_name || '').toLowerCase().includes(searchTerm.toLowerCase());
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
        {activeSubTab === 'fiscal-series' && <FiscalSeriesModule />}
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
            {activeSubTab === 'emitidos' && (
              <IssuedDocumentsList 
                documents={issuedDocuments} 
                onAction={onAction}
                onCertify={onCertify}
              />
            )}

            {activeSubTab === 'recebidos' && (
              <div className="bg-white border border-zinc-200 rounded-none overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#003366] text-white text-[11px] uppercase tracking-wider font-bold">
                      <th className="px-6 py-4">Data</th>
                      <th className="px-6 py-4">Vencimento</th>
                      <th className="px-6 py-4">Tipo</th>
                      <th className="px-6 py-4">Número</th>
                      <th className="px-6 py-4">Fornecedor/Cliente</th>
                      <th className="px-6 py-4">Pagamento</th>
                      <th className="px-6 py-4 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {issuedDocuments
                      .filter(doc => 
                        (doc.tipo_documento || '').toLowerCase().includes('fatura recibo') || 
                        (doc.tipo_documento || '').toLowerCase().includes('recibo') ||
                        (doc.tipo_documento || '').toLowerCase().includes('fatura-recibo')
                      )
                      .map((doc) => (
                        <tr key={doc.id} className="hover:bg-zinc-50 text-sm border-b border-zinc-50">
                          <td className="px-6 py-4 text-zinc-900 font-medium whitespace-nowrap">{new Date(doc.data_emissao).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-zinc-700 whitespace-nowrap">{doc.due_date ? new Date(doc.due_date).toLocaleDateString() : (doc.data_vencimento ? new Date(doc.data_vencimento).toLocaleDateString() : 'N/A')}</td>
                          <td className="px-6 py-4 font-bold text-zinc-900 whitespace-nowrap">{doc.tipo_documento}</td>
                          <td className="px-6 py-4 font-mono text-xs text-zinc-600 font-bold whitespace-nowrap">{doc.numero_documento}</td>
                          <td className="px-6 py-4 text-zinc-900 font-bold">{doc.client_name || doc.cliente_id}</td>
                          <td className="px-6 py-4 text-zinc-900 uppercase text-[10px] font-black">{doc.payment_method || 'N/A'}</td>
                          <td className="px-6 py-4 text-right font-black text-[#003366] text-base whitespace-nowrap">{formatCurrency(doc.contravalor)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {issuedDocuments.filter(doc => 
                  (doc.tipo_documento || '').toLowerCase().includes('fatura recibo') || 
                  (doc.tipo_documento || '').toLowerCase().includes('recibo') ||
                  (doc.tipo_documento || '').toLowerCase().includes('fatura-recibo')
                ).length === 0 && (
                  <div className="p-12 text-center text-zinc-400 text-sm">Nenhum documento recebido encontrado.</div>
                )}
              </div>
            )}
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

const CreateInvoice = ({ clients, products, workSites, fiscalSeries, onBack, onSuccess }: { 
  clients: Client[], 
  products: Product[], 
  workSites: WorkSite[], 
  fiscalSeries: FiscalSeries[],
  onBack: () => void, 
  onSuccess: () => void 
}) => {
  const [clientId, setClientId] = useState<number | ''>('');
  const [documentType, setDocumentType] = useState('Fatura');
  const [seriesId, setSeriesId] = useState<number | ''>('');
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

    if (!finalClientId) {
      alert('Por favor, selecione um cliente ou digite o nome de um novo cliente.');
      return;
    }

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
        payment_method: paymentMethod,
        series_id: seriesId
      })
    });

    if (res.ok) {
      onSuccess();
    } else {
      const errorData = await res.json().catch(() => ({ error: 'Erro desconhecido ao emitir documento' }));
      console.error('Erro ao emitir documento:', errorData);
      alert('Erro ao emitir documento: ' + (errorData.error || 'Erro desconhecido'));
    }
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
              <label className="text-xs font-bold text-zinc-600">Série</label>
              <select 
                value={seriesId} 
                onChange={(e) => setSeriesId(e.target.value ? Number(e.target.value) : '')} 
                required
                className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2.5 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm"
              >
                <option value="">Selecionar Série</option>
                {fiscalSeries.filter(s => s.is_active).map(s => (
                  <option key={s.id} value={s.id}>{s.description}</option>
                ))}
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

const WorkSiteManagement = ({ workSite, movements, invoices = [], onBack }: { 
  workSite: WorkSite, 
  movements: WorkSiteMovement[], 
  invoices?: IssuedDocument[],
  onBack: () => void 
}) => {
  const [activeTab, setActiveTab] = useState<'finance' | 'invoices'>('finance');
  const totalDebit = movements.reduce((sum, m) => sum + m.debit, 0);
  const totalCredit = movements.reduce((sum, m) => sum + m.credit, 0);
  const currentBalance = movements.length > 0 ? movements[movements.length - 1].balance : 0;
  const siteInvoices = invoices.filter(inv => Number(inv.work_site_id) === workSite.id);

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

      {/* Tabs */}
      <div className="flex gap-4 border-b border-zinc-200 no-print">
        <button 
          onClick={() => setActiveTab('finance')}
          className={`pb-4 px-4 text-xs font-bold uppercase tracking-widest transition-all relative ${
            activeTab === 'finance' ? 'text-[#003366]' : 'text-zinc-400 hover:text-zinc-600'
          }`}
        >
          Movimentação Financeira
          {activeTab === 'finance' && <motion.div layoutId="activeTabWork" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#003366]" />}
        </button>
        <button 
          onClick={() => setActiveTab('invoices')}
          className={`pb-4 px-4 text-xs font-bold uppercase tracking-widest transition-all relative ${
            activeTab === 'invoices' ? 'text-[#003366]' : 'text-zinc-400 hover:text-zinc-600'
          }`}
        >
          Documentos Emitidos
          {activeTab === 'invoices' && <motion.div layoutId="activeTabWork" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#003366]" />}
        </button>
      </div>

      {activeTab === 'finance' ? (
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
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-[#003366] uppercase tracking-widest flex items-center gap-2">
              <div className="w-1 h-4 bg-[#003366]"></div>
              Documentos Emitidos no Local
            </h3>
            <div className="flex gap-2 no-print">
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
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-xs">
                {siteInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-zinc-50 text-sm">
                    <td className="px-6 py-4 text-zinc-500">{new Date(inv.data_emissao).toLocaleDateString('pt-PT')}</td>
                    <td className="px-6 py-4 font-bold text-zinc-900">{inv.numero_documento}</td>
                    <td className="px-6 py-4 text-zinc-600">{inv.client_name}</td>
                    <td className="px-6 py-4 text-right font-black text-[#003366]">{formatCurrency(inv.contravalor)}</td>
                  </tr>
                ))}
                {siteInvoices.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-20 text-center text-zinc-400 font-medium italic">
                      Nenhum documento emitido para este local.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

const InvoiceDetail = ({ 
  id, 
  onBack,
  companyName,
  companyNif,
  companyAddress,
  companyLogo,
  companyFooter
}: { 
  id: number, 
  onBack: () => void,
  companyName: string,
  companyNif: string,
  companyAddress: string,
  companyLogo: string,
  companyFooter: string
}) => {
  const [invoice, setInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    fetch(`/api/invoices/${id}`)
      .then(res => res.json())
      .then(data => setInvoice(data));
  }, [id]);

  if (!invoice) return <div className="p-8">Carregando...</div>;

  // Calculate VAT summary
  const vatSummary = invoice.items?.reduce((acc: any, item: any) => {
    const rate = item.tax_rate || 0;
    if (!acc[rate]) {
      acc[rate] = { base: 0, vat: 0 };
    }
    acc[rate].base += item.total / (1 + rate / 100);
    acc[rate].vat += item.total - (item.total / (1 + rate / 100));
    return acc;
  }, {});

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
          <div className="flex items-start gap-6">
            {companyLogo ? (
              <img src={companyLogo} alt="Logo" className="w-24 h-24 object-contain" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-24 h-24 bg-[#003366] flex items-center justify-center text-white font-black text-2xl">
                FP
              </div>
            )}
            <div>
              <h1 className="text-3xl font-black text-[#003366]">{companyName}</h1>
              <div className="mt-2 text-sm text-zinc-500">
                <p>{companyAddress}</p>
                <p>NIF: {companyNif}</p>
              </div>
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
          <div className="flex justify-end">
            <QRCodeCanvas 
              value={`Invoice:${invoice.invoice_number}|Total:${invoice.total}|Date:${invoice.date}`} 
              size={100}
              level="H"
            />
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

        <div className="grid grid-cols-2 gap-8 pt-8 border-t-2 border-zinc-100">
          <div>
            <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4">Resumo de IVA</h4>
            <table className="w-full text-[10px] text-left">
              <thead>
                <tr className="border-b border-zinc-100 text-zinc-400">
                  <th className="pb-2">Taxa</th>
                  <th className="pb-2 text-right">Base</th>
                  <th className="pb-2 text-right">IVA</th>
                </tr>
              </thead>
              <tbody className="text-zinc-600">
                {Object.entries(vatSummary || {}).map(([rate, values]: [string, any]) => (
                  <tr key={rate}>
                    <td className="py-1">IVA {rate}%</td>
                    <td className="py-1 text-right">{formatCurrency(values.base)}</td>
                    <td className="py-1 text-right">{formatCurrency(values.vat)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm text-zinc-500">
                <span>Subtotal</span>
                <span>{formatCurrency(invoice.total - (Object.values(vatSummary || {}).reduce((acc: number, v: any) => acc + v.vat, 0) as number))}</span>
              </div>
              <div className="flex justify-between text-sm text-zinc-500">
                <span>Total IVA</span>
                <span>{formatCurrency(Object.values(vatSummary || {}).reduce((acc: number, v: any) => acc + v.vat, 0) as number)}</span>
              </div>
              <div className="flex justify-between text-2xl font-black pt-4 border-t border-zinc-100">
                <span className="text-zinc-800">Total</span>
                <span className="text-[#003366]">{formatCurrency(invoice.total)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-12 text-center text-[10px] text-zinc-400 uppercase tracking-widest border-t border-zinc-50">
          <p>Obrigado pela sua preferência!</p>
          <p className="mt-1">{companyFooter}</p>
        </div>
      </div>
    </div>
  );
};

const ClientAccount = ({ client, documents, onBack }: { 
  client: Client, 
  documents: IssuedDocument[], 
  onBack: () => void 
}) => {
  const clientDocs = documents.filter(doc => doc.cliente_id === client.id);
  
  const movements = clientDocs.map(doc => {
    // FT = Fatura (Debit)
    // FR = Fatura-Recibo (Debit & Credit)
    // RE = Recibo (Credit)
    // NC = Nota de Crédito (Credit)
    // ND = Nota de Débito (Debit)
    const isCredit = ['RE', 'NC', 'FR', 'Recibo', 'Fatura Recibo'].includes(doc.tipo_documento);
    const isDebit = ['FT', 'ND', 'FR', 'Fatura', 'Fatura Recibo'].includes(doc.tipo_documento);
    
    return {
      ...doc,
      debito: isDebit ? doc.contravalor : 0,
      credito: isCredit ? doc.contravalor : 0
    };
  });

  const totalDebito = movements.reduce((acc, m) => acc + m.debito, 0);
  const totalCredito = movements.reduce((acc, m) => acc + m.credito, 0);
  const saldoAtual = totalDebito - totalCredito;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="p-2 hover:bg-zinc-100 rounded-full transition-colors text-zinc-400">
          <ChevronLeft size={24} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-[#003366] tracking-tight">Conta Corrente</h2>
          <p className="text-zinc-500 font-medium">{client.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 border border-zinc-200 shadow-sm">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Total Débito</p>
          <p className="text-2xl font-bold text-[#003366]">{formatCurrency(totalDebito)}</p>
        </div>
        <div className="bg-white p-6 border border-zinc-200 shadow-sm">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Total Crédito</p>
          <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalCredito)}</p>
        </div>
        <div className="bg-white p-6 border border-zinc-200 shadow-sm">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Saldo Atual</p>
          <p className="text-2xl font-bold text-[#003366]">{formatCurrency(saldoAtual)}</p>
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-none overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#003366] text-white text-[11px] uppercase tracking-wider font-bold">
              <th className="px-6 py-4">Data</th>
              <th className="px-6 py-4">Documento</th>
              <th className="px-6 py-4">Tipo</th>
              <th className="px-6 py-4 text-right">Débito</th>
              <th className="px-6 py-4 text-right">Crédito</th>
              <th className="px-6 py-4 text-right">Saldo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {movements.map((m, idx) => {
              const runningSaldo = movements.slice(0, idx + 1).reduce((acc, curr) => acc + (curr.debito - curr.credito), 0);
              return (
                <tr key={m.id} className="hover:bg-zinc-50 text-sm">
                  <td className="px-6 py-4 text-zinc-500">{new Date(m.data_emissao).toLocaleDateString()}</td>
                  <td className="px-6 py-4 font-medium text-zinc-900">{m.numero_documento}</td>
                  <td className="px-6 py-4 text-zinc-600">{m.tipo_documento}</td>
                  <td className="px-6 py-4 text-right text-zinc-900">{m.debito > 0 ? formatCurrency(m.debito) : '-'}</td>
                  <td className="px-6 py-4 text-right text-emerald-600">{m.credito > 0 ? formatCurrency(m.credito) : '-'}</td>
                  <td className="px-6 py-4 text-right font-bold text-[#003366]">{formatCurrency(runningSaldo)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {movements.length === 0 && (
          <div className="p-12 text-center text-zinc-400 text-sm">Nenhum movimento encontrado para este cliente.</div>
        )}
      </div>
    </div>
  );
};

const ClientList = ({ clients, onRefresh, onViewAccount }: { 
  clients: Client[], 
  onRefresh: () => void,
  onViewAccount: (client: Client) => void
}) => {
  const [showForm, setShowForm] = useState(false);
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
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#003366] text-white flex items-center justify-center shadow-lg">
            <Users size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#003366] tracking-tight">Gestão de Clientes</h2>
            <p className="text-zinc-400 text-xs font-medium uppercase tracking-widest">Registo e consulta de contas correntes</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => {
              setSelectedClient(null);
              setName(''); setEmail(''); setNif(''); setAddress(''); setLocalidade(''); setCodigoPostal(''); setProvincia(''); setMunicipio(''); setPais(''); setTelefone(''); setWebpage(''); setTipoCliente('normal');
              setShowForm(true);
            }}
            className="bg-[#003366] hover:bg-[#002244] text-white font-bold px-6 py-2.5 rounded-none flex items-center gap-2 transition-all shadow-sm text-sm"
          >
            <Plus size={18} />
            Novo Cliente
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForm(false)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-none shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <h3 className="font-bold text-[#003366] flex items-center gap-2 uppercase tracking-widest text-xs">
                  <Users size={16} />
                  {selectedClient ? 'Editar Cliente' : 'Registar Novo Cliente'}
                </h3>
                <button 
                  onClick={() => setShowForm(false)}
                  className="p-2 hover:bg-zinc-200 rounded-full transition-colors text-zinc-400 hover:text-zinc-600"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8">
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Contribuinte</label>
                    <input type="text" value={nif} onChange={e => setNif(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" placeholder="NIF" />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Nome do Cliente</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" placeholder="Nome" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Morada</label>
                    <input type="text" value={address} onChange={e => setAddress(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" placeholder="Morada" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Localidade</label>
                    <input type="text" value={localidade} onChange={e => setLocalidade(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" placeholder="Localidade" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Código Postal</label>
                    <input type="text" value={codigo_postal} onChange={e => setCodigoPostal(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" placeholder="Código Postal" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Província</label>
                    <input type="text" value={provincia} onChange={e => setProvincia(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" placeholder="Província" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Município</label>
                    <input type="text" value={municipio} onChange={e => setMunicipio(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" placeholder="Município" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">País</label>
                    <input type="text" value={pais} onChange={e => setPais(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" placeholder="País" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Telefone</label>
                    <input type="text" value={telefone} onChange={e => setTelefone(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" placeholder="Telefone" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Email</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" placeholder="Email" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Webpage</label>
                    <input type="text" value={webpage} onChange={e => setWebpage(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" placeholder="Webpage" />
                  </div>
                  <div className="flex justify-end md:col-span-3 gap-4 pt-4 border-t border-zinc-100 mt-4">
                    <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 text-sm font-bold text-zinc-500 hover:bg-zinc-100 transition-all">Cancelar</button>
                    <button type="submit" className="bg-[#003366] text-white px-8 py-2 text-sm font-bold shadow-lg hover:bg-[#002244] transition-all">
                      {selectedClient ? 'Atualizar Dados' : 'Registar Cliente'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-white border border-zinc-200 rounded-none overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#003366] text-white text-[11px] uppercase tracking-wider font-bold">
              <th className="px-6 py-4">NIF</th>
              <th className="px-6 py-4">Nome</th>
              <th className="px-6 py-4">Localidade</th>
              <th className="px-6 py-4">Telefone</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {clients.map((client) => (
              <tr key={client.id} className="hover:bg-zinc-50 text-sm transition-colors">
                <td className="px-6 py-4 font-mono text-xs text-zinc-400">{client.nif || 'N/A'}</td>
                <td className="px-6 py-4">
                  <div className="font-bold text-zinc-800">{client.name}</div>
                  <div className="text-[10px] text-zinc-400">{client.email}</div>
                </td>
                <td className="px-6 py-4 text-zinc-600">{client.localidade || 'N/A'}</td>
                <td className="px-6 py-4 text-zinc-600">{client.telefone || 'N/A'}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button 
                      onClick={() => onViewAccount(client)}
                      className="text-[#003366] hover:bg-[#003366] hover:text-white px-3 py-1 text-xs font-bold border border-[#003366] transition-all"
                    >
                      Conta Corrente
                    </button>
                    <button className="text-zinc-400 hover:text-zinc-600 p-1">
                      <MoreHorizontal size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {clients.length === 0 && (
          <div className="p-12 text-center text-zinc-400 text-sm italic">Nenhum cliente registado.</div>
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

const CreatePurchase = ({ suppliers, products, onBack, onSuccess }: { 
  suppliers: Supplier[], 
  products: Product[], 
  onBack: () => void, 
  onSuccess: () => void 
}) => {
  const [supplierId, setSupplierId] = useState<number | ''>('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<Partial<PurchaseItem>[]>([]);

  const addItem = () => {
    setItems([...items, { 
      product_id: 0,
      description: '', 
      quantity: 1, 
      unit_price: 0, 
      total: 0
    }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof PurchaseItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'quantity' || field === 'unit_price') {
      const q = field === 'quantity' ? value : (newItems[index].quantity || 0);
      const p = field === 'unit_price' ? value : (newItems[index].unit_price || 0);
      newItems[index].total = q * p;
    }

    if (field === 'product_id' && value) {
      const prod = products.find(p => p.id === Number(value));
      if (prod) {
        newItems[index].description = prod.name;
        newItems[index].unit_price = prod.preco_compra || 0;
        newItems[index].total = (newItems[index].quantity || 1) * (prod.preco_compra || 0);
      }
    }
    
    setItems(newItems);
  };

  const total = items.reduce((sum, item) => sum + (item.total || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0 || !supplierId) return;

    const res = await fetch('/api/purchases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        supplier_id: supplierId, 
        date, 
        items 
      })
    });

    if (res.ok) {
      onSuccess();
    } else {
      alert('Erro ao registar compra');
    }
  };

  return (
    <div className="space-y-8 bg-white border border-zinc-200 p-8 rounded-none shadow-sm">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-zinc-100 rounded-none text-zinc-400">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-xl font-bold text-[#003366]">Registar Nova Compra</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-600 uppercase">Fornecedor</label>
            <select 
              value={supplierId} 
              onChange={(e) => setSupplierId(Number(e.target.value))}
              required
              className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2.5 text-sm"
            >
              <option value="">Selecionar Fornecedor</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-600 uppercase">Data da Compra</label>
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2.5 text-sm"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-[#003366] text-sm uppercase tracking-wider">Itens da Compra</h3>
            <button 
              type="button" 
              onClick={addItem}
              className="text-[#003366] text-xs font-bold flex items-center gap-1 hover:underline"
            >
              <Plus size={14} /> Adicionar Item
            </button>
          </div>

          <div className="border border-zinc-200 rounded-none overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-50 text-zinc-400 uppercase text-[10px] font-bold">
                <tr>
                  <th className="px-4 py-3">Produto</th>
                  <th className="px-4 py-3">Qtd</th>
                  <th className="px-4 py-3">Preço Unit.</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-2">
                      <select 
                        value={item.product_id} 
                        onChange={(e) => updateItem(idx, 'product_id', e.target.value)}
                        className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm"
                      >
                        <option value="0">Selecionar Produto</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <input 
                        type="number" 
                        value={item.quantity} 
                        onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                        className="w-16 bg-transparent border-none focus:ring-0 p-0 text-sm"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input 
                        type="number" 
                        step="0.01"
                        value={item.unit_price} 
                        onChange={(e) => updateItem(idx, 'unit_price', Number(e.target.value))}
                        className="w-24 bg-transparent border-none focus:ring-0 p-0 text-sm"
                      />
                    </td>
                    <td className="px-4 py-2 font-bold text-zinc-800">
                      {formatCurrency(item.total || 0)}
                    </td>
                    <td className="px-4 py-2">
                      <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-between items-center pt-6 border-t border-zinc-100">
          <div className="text-2xl font-black text-[#003366]">
            Total: {formatCurrency(total)}
          </div>
          <div className="flex gap-4">
            <button type="button" onClick={onBack} className="px-6 py-2 text-sm font-bold text-zinc-500">Cancelar</button>
            <button type="submit" className="bg-[#003366] text-white px-8 py-2 text-sm font-bold rounded-none shadow-lg">Registar Compra</button>
          </div>
        </div>
      </form>
    </div>
  );
};

const PurchaseActionsModal = ({ purchase, onClose, onAction }: { 
  purchase: Purchase, 
  onClose: () => void,
  onAction: (action: string, p: Purchase) => void
}) => {
  const handleAction = (action: string) => {
    onAction(action, purchase);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-none shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-zinc-100 bg-zinc-50 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-[#003366] text-lg">{purchase.purchase_number}</h3>
            <p className="text-zinc-500 text-sm font-bold">{formatCurrency(purchase.total)}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200 rounded-full transition-colors text-zinc-400">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-8 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            <button onClick={() => handleAction('print')} className="flex flex-col items-center gap-3 p-6 border border-zinc-100 hover:bg-zinc-50 transition-all group">
              <Printer size={24} className="text-zinc-400 group-hover:text-[#003366]" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 group-hover:text-[#003366] text-center">Imprimir Compra</span>
            </button>

            <button onClick={() => handleAction('email')} className="flex flex-col items-center gap-3 p-6 border border-zinc-100 hover:bg-zinc-50 transition-all group">
              <Mail size={24} className="text-zinc-400 group-hover:text-[#003366]" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 group-hover:text-[#003366] text-center">Enviar Fornecedor</span>
            </button>

            <button onClick={() => handleAction('pay')} className="flex flex-col items-center gap-3 p-6 border border-zinc-100 hover:bg-emerald-50 hover:border-emerald-200 transition-all group">
              <Wallet size={24} className="text-zinc-400 group-hover:text-emerald-600" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 group-hover:text-emerald-600 text-center">Registar Pagamento</span>
            </button>

            <button onClick={() => handleAction('receive')} className="flex flex-col items-center gap-3 p-6 border border-zinc-100 hover:bg-blue-50 hover:border-blue-200 transition-all group">
              <Truck size={24} className="text-zinc-400 group-hover:text-blue-600" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 group-hover:text-blue-600 text-center">Receber Mercadoria</span>
            </button>

            <button onClick={() => handleAction('cancel')} className="flex flex-col items-center gap-3 p-6 border border-zinc-100 hover:bg-red-50 hover:border-red-200 transition-all group">
              <XCircle size={24} className="text-zinc-400 group-hover:text-red-600" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 group-hover:text-red-600 text-center">Anular Compra</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const PurchasesModule = ({ suppliers, products }: { suppliers: Supplier[], products: Product[] }) => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSubTab, setActiveSubTab] = useState('historico');
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

  const fetchPurchases = async () => {
    const data = await fetchJson('/api/purchases');
    setPurchases(data);
  };

  useEffect(() => {
    fetchPurchases();
  }, []);

  if (isCreating) {
    return (
      <CreatePurchase 
        suppliers={suppliers} 
        products={products} 
        onBack={() => setIsCreating(false)} 
        onSuccess={() => {
          setIsCreating(false);
          fetchPurchases();
        }} 
      />
    );
  }

  const tabs = [
    { id: 'historico', label: 'Histórico de Compras', icon: History },
    { id: 'pendentes', label: 'Compras Pendentes', icon: Clock },
    { id: 'fornecedores', label: 'Fornecedores', icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#003366] text-white flex items-center justify-center shadow-lg">
            <ShoppingCart size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#003366] tracking-tight">Gestão de Compras</h2>
            <p className="text-zinc-400 text-xs font-medium uppercase tracking-widest">Controlo de entrada de mercadorias e fornecedores</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setIsCreating(true)}
            className="bg-[#003366] hover:bg-[#002244] text-white font-bold px-6 py-2.5 rounded-none flex items-center gap-2 transition-all shadow-sm text-sm"
          >
            <Plus size={18} />
            Registar Compra
          </button>
        </div>
      </div>

      <div className="flex gap-8 border-b border-zinc-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`flex items-center gap-2 pb-4 text-xs font-bold uppercase tracking-widest transition-all relative ${
              activeSubTab === tab.id 
                ? 'text-[#003366]' 
                : 'text-zinc-400 hover:text-zinc-600'
            }`}
          >
            <tab.icon size={16} className={activeSubTab === tab.id ? 'text-[#003366]' : 'text-zinc-400'} />
            {tab.label}
            {activeSubTab === tab.id && (
              <motion.div 
                layoutId="activeSubTabPurchases"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#003366]" 
              />
            )}
          </button>
        ))}
      </div>

      <div className="bg-white border border-zinc-200 rounded-none shadow-sm flex flex-wrap gap-4 items-end p-4">
        <div className="flex-1 min-w-[200px] space-y-1.5">
          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Pesquisar Compra</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
              type="text" 
              placeholder="Fornecedor, Nº Compra..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-none text-sm focus:outline-none focus:border-[#003366] transition-all"
            />
          </div>
        </div>
        <button className="bg-zinc-100 text-zinc-600 font-bold px-4 py-2 rounded-none flex items-center gap-2 hover:bg-zinc-200 transition-all text-sm">
          <Filter size={16} />
          Filtrar
        </button>
      </div>

      <div className="bg-white border border-zinc-200 rounded-none overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#003366] text-white text-[11px] uppercase tracking-wider font-bold">
              <th className="px-6 py-4">Data</th>
              <th className="px-6 py-4">Vencimento</th>
              <th className="px-6 py-4">Nº Compra</th>
              <th className="px-6 py-4">Fornecedor</th>
              <th className="px-6 py-4">Pagamento</th>
              <th className="px-6 py-4 text-right">Total</th>
              <th className="px-6 py-4 text-center">Estado</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {purchases
              .filter(p => 
                p.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                p.purchase_number.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map(p => (
                <tr key={p.id} className="hover:bg-zinc-50 transition-colors text-sm border-b border-zinc-50">
                  <td className="px-6 py-4 text-zinc-900 font-bold">{new Date(p.date).toLocaleDateString('pt-PT')}</td>
                  <td className="px-6 py-4 text-red-600 font-bold">
                    {p.due_date ? new Date(p.due_date).toLocaleDateString('pt-PT') : '-'}
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-[#003366]">{p.purchase_number}</td>
                  <td className="px-6 py-4 font-bold text-zinc-900">{p.supplier_name}</td>
                  <td className="px-6 py-4 text-zinc-600 font-medium uppercase text-[10px]">{p.payment_method || 'N/A'}</td>
                  <td className="px-6 py-4 text-right font-black text-[#003366]">{formatCurrency(p.total)}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-none ${
                      p.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 
                      p.status === 'cancelled' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      {p.status === 'completed' ? 'Concluída' : p.status === 'cancelled' ? 'Cancelada' : 'Pendente'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button className="p-2 text-zinc-400 hover:text-[#003366] transition-colors"><Printer size={16} /></button>
                      <button 
                        onClick={() => setSelectedPurchase(p)}
                        className="p-2 text-zinc-400 hover:text-[#003366] transition-colors"
                      >
                        <MoreHorizontal size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {purchases.length === 0 && (
          <div className="p-12 text-center text-zinc-400 text-sm italic">Nenhuma compra registada.</div>
        )}
      </div>

      {selectedPurchase && (
        <PurchaseActionsModal 
          purchase={selectedPurchase}
          onClose={() => setSelectedPurchase(null)}
          onAction={(action) => {
            console.log('Action:', action, 'on purchase:', selectedPurchase.purchase_number);
          }}
        />
      )}
    </div>
  );
};

const SupplierModule = ({ products }: { products: Product[] }) => {
  const [activeSubTab, setActiveSubTab] = useState<string | null>(null);
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

  const sections = [
    { id: 'suppliers-list', label: 'Gestão de Fornecedores', icon: <Users size={24} />, description: 'Registo e consulta de todos os fornecedores da empresa.' },
    { id: 'purchases-list', label: 'Registo de Compras', icon: <ShoppingCart size={24} />, description: 'Lançamento de faturas de compra e entrada de stock.' },
    { id: 'current-accounts', label: 'Contas Correntes', icon: <FileText size={24} />, description: 'Consulta de saldos e movimentos por fornecedor.' },
    { id: 'payments', label: 'Pagamentos', icon: <Wallet size={24} />, description: 'Registo de pagamentos efetuados a fornecedores.' },
    { id: 'orders', label: 'Encomendas', icon: <Truck size={24} />, description: 'Gestão de pedidos de compra e ordens de fornecimento.' },
    { id: 'reports', label: 'Relatórios de Compras', icon: <BarChart3 size={24} />, description: 'Análise detalhada de compras e despesas por período.' },
  ];

  if (!activeSubTab) {
    return (
      <div className="space-y-8">
        <header>
          <Breadcrumbs paths={['Home', 'Área Reservada', 'Fornecedores']} />
          <h2 className="text-3xl font-black text-[#003366] tracking-tight uppercase">Fornecedores & Compras</h2>
          <p className="text-zinc-500 text-sm">Selecione uma secção para gerir os seus fornecedores e compras.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSubTab(section.id)}
              className="group bg-white border border-zinc-200 p-8 text-left hover:border-[#003366] hover:shadow-xl transition-all flex flex-col items-center text-center space-y-4"
            >
              <div className="text-[#003366] group-hover:scale-110 transition-transform duration-300">
                {section.icon}
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-[#003366] uppercase tracking-tight">{section.label}</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">{section.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeSubTab) {
      case 'suppliers-list':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-[#003366] uppercase tracking-tight flex items-center gap-3">
                <Users size={24} /> Lista de Fornecedores
              </h3>
              <button 
                onClick={() => setShowForm(true)}
                className="bg-[#003366] text-white px-6 py-2.5 text-sm font-bold rounded-none hover:bg-[#002244] transition-all flex items-center gap-2"
              >
                <Plus size={18} /> Registar Fornecedor
              </button>
            </div>
            <div className="bg-white border border-zinc-200 rounded-none overflow-x-auto shadow-sm">
              <table className="w-full text-sm text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-[#003366] text-white text-[11px] uppercase tracking-wider font-bold">
                    <th className="px-6 py-4">Nome</th>
                    <th className="px-6 py-4">NIF</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Telefone</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {suppliers.map(s => (
                    <tr key={s.id} className="hover:bg-zinc-50 transition-colors border-b border-zinc-50">
                      <td className="px-6 py-4 font-bold text-zinc-900">{s.name}</td>
                      <td className="px-6 py-4 text-zinc-700 font-mono font-bold">{s.nif}</td>
                      <td className="px-6 py-4 text-zinc-700">{s.email}</td>
                      <td className="px-6 py-4 text-zinc-700 font-bold">{s.phone}</td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-zinc-400 hover:text-[#003366]"><MoreHorizontal size={18} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {suppliers.length === 0 && (
                <div className="p-12 text-center text-zinc-400 italic">Nenhum fornecedor registado.</div>
              )}
            </div>
          </div>
        );
      case 'purchases-list':
        return <PurchasesModule suppliers={suppliers} products={products} />;
      default:
        return (
          <div className="p-12 text-center text-zinc-400 italic bg-white border border-zinc-200">
            Módulo em desenvolvimento...
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <button 
        onClick={() => setActiveSubTab(null)}
        className="flex items-center gap-2 text-[#003366] font-bold text-xs uppercase tracking-widest hover:underline mb-4"
      >
        <ArrowLeft size={14} /> Voltar ao Menu
      </button>
      
      {renderContent()}

      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-white p-8 rounded-none shadow-2xl"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-[#003366] text-xl uppercase tracking-tight">Registar Fornecedor</h3>
              <button onClick={() => setShowForm(false)} className="text-zinc-400 hover:text-zinc-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Nome da Empresa / Fornecedor</label>
                <input type="text" placeholder="Ex: Angola Trading Lda" value={name} onChange={e => setName(e.target.value)} required className="w-full border border-zinc-200 bg-zinc-50 rounded-none px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">NIF</label>
                  <input type="text" placeholder="000000000" value={nif} onChange={e => setNif(e.target.value)} className="w-full border border-zinc-200 bg-zinc-50 rounded-none px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Telefone</label>
                  <input type="text" placeholder="+244 ..." value={phone} onChange={e => setPhone(e.target.value)} className="w-full border border-zinc-200 bg-zinc-50 rounded-none px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366]" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Email</label>
                <input type="email" placeholder="contato@fornecedor.com" value={email} onChange={e => setEmail(e.target.value)} className="w-full border border-zinc-200 bg-zinc-50 rounded-none px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Endereço Completo</label>
                <input type="text" placeholder="Rua ..., Luanda" value={address} onChange={e => setAddress(e.target.value)} className="w-full border border-zinc-200 bg-zinc-50 rounded-none px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366]" />
              </div>
              <div className="flex justify-end gap-4 mt-8 pt-4 border-t border-zinc-100">
                <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 text-xs font-bold text-zinc-500 uppercase tracking-widest hover:text-zinc-700">Cancelar</button>
                <button type="submit" className="bg-[#003366] text-white px-8 py-2.5 text-xs font-bold uppercase tracking-widest hover:bg-[#002244] transition-all shadow-md">Registar Fornecedor</button>
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
  const [image, setImage] = useState('');

  const tabs = [
    { id: 'stock', label: 'Stock', icon: Package },
    { id: 'movement', label: 'Movimento', icon: History },
    { id: 'price', label: 'Preços', icon: Tag },
    { id: 'associate', label: 'Associar', icon: LinkIcon },
    { id: 'warehouse', label: 'Armazém', icon: Home },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        unit: 'un',
        image
      })
    });
    if (res.ok) {
      setName(''); setReferente(''); setDataRegisto(''); setArmazem(''); setTipoDocumento(''); setPrecoCompra(''); setPrecoVenda(''); setFinalidade(''); setTipologia('mercadoria'); setImage('');
      setShowForm(false);
      onRefresh();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-8 border-b border-zinc-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 pb-4 text-sm font-bold transition-all relative ${
              activeTab === tab.id 
                ? 'text-[#003366] border-b-2 border-[#003366]' 
                : 'text-zinc-500 hover:text-zinc-800'
            }`}
          >
            <tab.icon size={18} className={activeTab === tab.id ? 'text-[#003366]' : 'text-zinc-400'} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'warehouse' ? (
        <WarehouseModule onRefresh={onRefresh} />
      ) : (
        <>
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-[#003366] uppercase tracking-tight">Produtos & Serviços</h3>
            <button 
              onClick={() => setShowForm(true)}
              className="bg-[#003366] text-white px-6 py-2.5 text-sm font-bold rounded-none hover:bg-[#002244] transition-all flex items-center gap-2"
            >
              <Plus size={18} /> Novo Produto
            </button>
          </div>
          {showForm && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-full max-w-4xl bg-white p-10 rounded-none shadow-2xl max-h-[90vh] overflow-y-auto"
              >
                <div className="flex justify-between items-center mb-8 border-b border-zinc-100 pb-4">
                  <h3 className="font-bold text-[#003366] text-2xl uppercase tracking-tight flex items-center gap-3">
                    <Package size={24} /> Novo Produto / Serviço
                  </h3>
                  <button onClick={() => setShowForm(false)} className="text-zinc-400 hover:text-zinc-600">
                    <X size={24} />
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Nome do Produto</label>
                    <input type="text" placeholder="Ex: Cimento 50kg" value={name} onChange={e => setName(e.target.value)} required className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-3 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Referência / Código</label>
                    <input type="text" placeholder="REF-001" value={referente} onChange={e => setReferente(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-3 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Data de Registo</label>
                    <input type="date" value={dataRegisto} onChange={e => setDataRegisto(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-3 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Armazém Padrão</label>
                    <input type="text" placeholder="Armazém Central" value={armazem} onChange={e => setArmazem(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-3 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Tipo de Documento</label>
                    <input type="text" placeholder="Fatura" value={tipoDocumento} onChange={e => setTipoDocumento(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-3 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Preço de Compra (Kz)</label>
                    <input type="number" step="0.01" placeholder="0.00" value={precoCompra} onChange={e => setPrecoCompra(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-3 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Preço de Venda (Kz)</label>
                    <input type="number" step="0.01" placeholder="0.00" value={precoVenda} onChange={e => setPrecoVenda(e.target.value)} required className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-3 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Finalidade</label>
                    <input type="text" placeholder="Revenda" value={finalidade} onChange={e => setFinalidade(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-3 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Tipologia</label>
                    <select value={tipologia} onChange={e => setTipologia(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-3 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm font-bold">
                      <option value="mercadoria">Mercadoria</option>
                      <option value="servico">Serviço</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>
                  <div className="md:col-span-3 space-y-2">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">URL da Imagem do Produto</label>
                    <div className="flex gap-4">
                      <input 
                        type="url" 
                        placeholder="https://exemplo.com/imagem.jpg" 
                        value={image} 
                        onChange={e => setImage(e.target.value)} 
                        className="flex-1 bg-zinc-50 border border-zinc-200 rounded-none px-4 py-3 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" 
                      />
                      {image && (
                        <div className="w-12 h-12 bg-zinc-100 border border-zinc-200 flex items-center justify-center overflow-hidden">
                          <img src={image} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="md:col-span-3 flex justify-end gap-4 mt-8 pt-6 border-t border-zinc-100">
                    <button type="button" onClick={() => setShowForm(false)} className="px-8 py-3 text-xs font-bold text-zinc-500 uppercase tracking-widest hover:text-zinc-700">Cancelar</button>
                    <button type="submit" className="bg-[#003366] text-white px-10 py-3 text-xs font-bold uppercase tracking-widest hover:bg-[#002244] transition-all shadow-lg">Guardar Produto</button>
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [fiscalYear, setFiscalYear] = useState('2026');
  const [companyName, setCompanyName] = useState('FaturaPronta Lda');
  const [companyNif, setCompanyNif] = useState('500123456');
  const [companyAddress, setCompanyAddress] = useState('Rua da Inovação, 123, 1000-001 Lisboa, Portugal');
  const [companyLogo, setCompanyLogo] = useState('');
  const [companyFooter, setCompanyFooter] = useState('Processado por computador • FaturaPronta Software');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [issuedDocuments, setIssuedDocuments] = useState<IssuedDocument[]>([]);
  const [workSites, setWorkSites] = useState<WorkSite[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [fiscalSeries, setFiscalSeries] = useState<FiscalSeries[]>([]);
  const [printingInvoice, setPrintingInvoice] = useState<Invoice | null>(null);
  const [viewingInvoiceId, setViewingInvoiceId] = useState<number | null>(null);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<IssuedDocument | null>(null);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [showCertifyModal, setShowCertifyModal] = useState(false);
  const [selectedClientForAccount, setSelectedClientForAccount] = useState<Client | null>(null);

  const fetchData = async () => {
    try {
      console.log('Fetching data...');
      const results = await Promise.allSettled([
        fetchJson('/api/stats'),
        fetchJson('/api/clients'),
        fetchJson('/api/products'),
        fetchJson('/api/invoices'),
        fetchJson('/api/issued-documents'),
        fetchJson('/api/work-sites'),
        fetchJson('/api/employees'),
        fetchJson('/api/fiscal-series')
      ]);

      const [s, c, p, i, d, w, e, fs] = results.map((res, idx) => {
        if (res.status === 'fulfilled') return res.value;
        console.error(`Fetch failed for index ${idx}:`, res.reason);
        return null;
      });
      
      console.log('Data fetched results:', { s, c, p, i, d, w, e, fs });
      
      if (s) setStats(s);
      setClients(Array.isArray(c) ? c : []);
      setProducts(Array.isArray(p) ? p : []);
      setInvoices(Array.isArray(i) ? i : []);
      setIssuedDocuments(Array.isArray(d) ? d : []);
      setWorkSites(Array.isArray(w) ? w : []);
      setEmployees(Array.isArray(e) ? e : []);
      setFiscalSeries(Array.isArray(fs) ? fs : []);
      
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

  const handleCertifyDocument = async (id: number) => {
    try {
      const res = await fetch(`/api/invoices/${id}/certify`, {
        method: 'POST'
      });
      if (res.ok) {
        await fetchData();
        setShowCertifyModal(false);
      }
    } catch (error) {
      console.error('Error certifying document:', error);
    }
  };

  const handleDocumentAction = async (action: string, doc: IssuedDocument) => {
    if (action === 'print_a4' || action === 'print_p24' || action === 'print_p24xl' || action === 'print_p80') {
      try {
        const res = await fetch(`/api/invoices/${doc.id}`);
        if (res.ok) {
          const invoiceData = await res.json();
          setPrintingInvoice(invoiceData);
          // Small delay to ensure component is rendered before printing
          setTimeout(() => {
            window.print();
          }, 500);
        }
      } catch (error) {
        console.error('Error fetching invoice for print:', error);
      }
    } else if (action === 'delete') {
      if (confirm(`Tem a certeza que deseja eliminar o documento ${doc.numero_documento}?`)) {
        try {
          const res = await fetch(`/api/invoices/${doc.id}`, { method: 'DELETE' });
          if (res.ok) {
            await fetchData();
            setSelectedDocument(null);
          }
        } catch (error) {
          console.error('Error deleting document:', error);
        }
      }
    } else if (action === 'clone') {
      try {
        const res = await fetch(`/api/invoices/${doc.id}/clone`, { method: 'POST' });
        if (res.ok) {
          await fetchData();
          setSelectedDocument(null);
          alert('Documento clonado com sucesso!');
        }
      } catch (error) {
        console.error('Error cloning document:', error);
      }
    } else if (action === 'whatsapp') {
      const text = `Olá, segue o documento ${doc.numero_documento} no valor de ${formatCurrency(doc.contravalor)}.`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    } else if (action === 'email') {
      alert(`Funcionalidade de envio de email para ${doc.client_name || 'cliente'} em desenvolvimento.`);
    } else {
      console.log(`Action ${action} for document ${doc.numero_documento}`);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const renderContent = () => {
    if (viewingInvoiceId) {
      return (
        <InvoiceDetail 
          id={viewingInvoiceId} 
          onBack={() => setViewingInvoiceId(null)}
          companyName={companyName}
          companyNif={companyNif}
          companyAddress={companyAddress}
          companyLogo={companyLogo}
          companyFooter={companyFooter}
        />
      );
    }

    switch (activeTab) {
      case 'dashboard': return <Dashboard stats={stats} />;
      case 'pos': return <POSModule products={products} onRefresh={fetchData} />;
      case 'invoices': return (
        <InvoiceList 
          invoices={invoices} 
          issuedDocuments={issuedDocuments}
          clients={clients} 
          workSites={workSites}
          employees={employees}
          onNew={() => setIsCreatingInvoice(true)} 
          onView={setViewingInvoiceId}
          onRegisterClient={() => setActiveTab('clients')}
          onAddWorkSite={handleAddWorkSite}
          onUpdateWorkSite={handleUpdateWorkSite}
          onAction={(doc) => {
            setSelectedDocument(doc);
            setShowActionsModal(true);
          }}
          onCertify={(doc) => {
            setSelectedDocument(doc);
            setShowCertifyModal(true);
          }}
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
          onCertify={(doc) => {
            setSelectedDocument(doc);
            setShowCertifyModal(true);
          }}
        />
      );
      case 'client-account': return selectedClientForAccount ? (
        <ClientAccount 
          client={selectedClientForAccount} 
          documents={issuedDocuments.filter(d => d.cliente_id === selectedClientForAccount.id)}
          onBack={() => setActiveTab('clients')}
        />
      ) : <Dashboard stats={stats} />;
      case 'cashier': return <CashierModule issuedDocuments={issuedDocuments} />;
      case 'clients': return (
        <ClientList 
          clients={clients} 
          onRefresh={fetchData} 
          onViewAccount={(client) => {
            setSelectedClientForAccount(client);
            setActiveTab('client-account');
          }}
        />
      );
      case 'suppliers': return <SupplierModule products={products} />;
      case 'products': return <ProductList products={products} onRefresh={fetchData} />;
      case 'financial': return <FinancialModule />;
      case 'hr': return <HRModule onRefresh={fetchData} />;
      case 'accounting': return <AccountingModule />;
      case 'specialized': return <SpecializedManagementModule />;
      case 'settings': return (
        <SettingsModule 
          fiscalYear={fiscalYear} 
          setFiscalYear={setFiscalYear}
          companyName={companyName}
          setCompanyName={setCompanyName}
          companyNif={companyNif}
          setCompanyNif={setCompanyNif}
          companyAddress={companyAddress}
          setCompanyAddress={setCompanyAddress}
          companyLogo={companyLogo}
          setCompanyLogo={setCompanyLogo}
          companyFooter={companyFooter}
          setCompanyFooter={setCompanyFooter}
        />
      );
      case 'secretary': return <SecretaryModule />;
      default: return <Dashboard stats={stats} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7f9] text-zinc-800 font-sans selection:bg-[#003366]/10 flex overflow-x-hidden">
      {sidebarOpen ? (
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={(t) => {
            setActiveTab(t);
            setViewingInvoiceId(null);
            setIsCreatingInvoice(false);
          }} 
          fiscalYear={fiscalYear} 
          setFiscalYear={setFiscalYear} 
          onToggle={() => setSidebarOpen(false)}
        />
      ) : (
        <div className="fixed left-4 top-4 z-50">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="p-3 bg-white border border-zinc-200 rounded-none text-[#003366] hover:bg-zinc-50 transition-all shadow-lg flex items-center justify-center"
            title="Mostrar Barra Lateral"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
      <main className="flex-1 min-h-screen transition-all duration-300 min-w-0">
        <div className="p-12">
          <div className="mb-8 flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-widest">
              <LayoutDashboard size={14} />
              <span>Sistema de Gestão</span>
              <ChevronRight size={12} />
              <span className="text-[#003366]">{activeTab}</span>
            </div>
          </div>
          <motion.div
            key={activeTab + viewingInvoiceId + sidebarOpen}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {renderContent()}
          </motion.div>
        </div>
      </main>

      {showActionsModal && selectedDocument && (
        <DocumentActionsModal 
          document={selectedDocument} 
          onClose={() => setShowActionsModal(false)} 
          onAction={handleDocumentAction}
        />
      )}

      {printingInvoice && (
        <div className="fixed inset-0 z-[200] bg-white overflow-auto print:p-0">
          <div className="print:hidden p-4 bg-zinc-900 text-white flex justify-between items-center sticky top-0">
            <span className="font-bold">Visualização de Impressão A4</span>
            <div className="flex gap-4">
              <button 
                onClick={() => window.print()}
                className="bg-[#003366] px-4 py-2 text-sm font-bold flex items-center gap-2"
              >
                <Printer size={18} /> Imprimir Agora
              </button>
              <button 
                onClick={() => setPrintingInvoice(null)}
                className="bg-zinc-700 px-4 py-2 text-sm font-bold"
              >
                Fechar
              </button>
            </div>
          </div>
          <div className="p-8 print:p-0">
            <PrintA4 invoice={printingInvoice} />
          </div>
        </div>
      )}

      {showCertifyModal && selectedDocument && (
        <CertifyModal 
          document={selectedDocument} 
          onConfirm={() => handleCertifyDocument(selectedDocument.id)}
          onClose={() => setShowCertifyModal(false)} 
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
                  fiscalSeries={fiscalSeries}
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
