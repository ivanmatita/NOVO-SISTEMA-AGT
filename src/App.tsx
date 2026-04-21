import React, { useState, useEffect, useRef } from 'react';
import { AnularModal } from './components/AnularModal';
import PrintA4 from './components/PrintA4';
import SecurityModule from './components/SecurityModule';
import BusinessOverview from './components/BusinessOverview';
import FleetManagementModule from './components/FleetManagementModule';
import ProjectManagementModule from './components/ProjectManagementModule';
import LiteracyModule from './components/LiteracyModule';
import ArchiveModule from './components/ArchiveModule';
import { QRCodeCanvas } from 'qrcode.react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { 
  Archive,
  LayoutDashboard, 
  Users, 
  Package, 
  Plus, 
  Search, 
  Download, 
  Trash2, 
  Edit,
  CheckCircle, 
  Clock, 
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ArrowLeft,
  Printer,
  Truck,
  ClipboardList,
  FileSignature,
  ShieldCheck,
  UserMinus,
  BadgeCheck,
  Layers,
  Filter,
  RefreshCw,
  UserPlus,
  FilePlus,
  FileText,
  Cloud,
  BarChart3,
  FileSpreadsheet,
  History,
  Activity,
  MoreHorizontal,
  MoreVertical,
  Mail,
  Share2,
  Upload,
  X,
  Check,
  Copy,
  XCircle,
  FileCode,
  FileDown,
  FileMinus2,
  Send,
  ExternalLink,
  Construction,
  Calendar,
  Link,
  TrendingUp,
  Tag,
  Wallet,
  BookOpen,
  Calculator,
  Receipt,
  Settings,
  Home,
  CreditCard,
  FileCheck,
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
  ArrowDownCircle,
  UserCheck,
  AlertTriangle,
  Building2,
  FileBox,
  Paperclip,
  AlertCircle,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  User as UserIcon,
  Camera,
  Briefcase,
  Table,
  Map,
  MapPin,
  Droplets,
  Image,
  Monitor,
  LogOut,
  GraduationCap,
  Bed,
  FolderKanban
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import EcosystemDashboard from './components/EcosystemDashboard';
import * as XLSX from 'xlsx';
import { validateAngolaNIF } from './utils/nifValidation';
import { Client, Product, Invoice, DashboardStats, InvoiceItem, Employee, Profession, WorkSite, WorkSiteMovement, IssuedDocument, Warehouse, Supplier, FiscalSeries, CostCenter, POSPoint, CashSession, SystemUser, Purchase, PurchaseItem, POSArea, Caixa, CaixaMovement, LaborTermination, StockMovement } from './types';
import ContractModal from './components/ContractModal';
import ChurchModule from './components/ChurchModule';
import AgrobusinessModule from './components/AgrobusinessModule';
import SchoolModule from './components/SchoolModule';
import RestaurantModule from './components/RestaurantModule';
import HotelModule from './components/HotelModule';
import { CaixaModule } from './components/CaixaModule';
import Modelo7Form from './components/Modelo7Form';
import AnexoFornecedoresForm from './components/AnexoFornecedoresForm';
import RegularizacaoClientesForm from './components/RegularizacaoClientesForm';
import RegimeSimplificadoForm from './components/RegimeSimplificadoForm';
import RetencaoPagarForm from './components/RetencaoPagarForm';
import RetencaoReceberForm from './components/RetencaoReceberForm';
import CalculosImpostosForm from './components/CalculosImpostosForm';
import FichaPessoal from './components/FichaPessoal';
import DeclaracaoServico from './components/DeclaracaoServico';
import AcordoConfidencialidade from './components/AcordoConfidencialidade';
import ColaboradoresDemitidos from './components/ColaboradoresDemitidos';
import RegimeExclusaoForm from './components/RegimeExclusaoForm';
import ImpostoPorContaForm from './components/ImpostoPorContaForm';
import DeclaracaoAnualForm from './components/DeclaracaoAnualForm';
import SaftExportForm from './components/SaftExportForm';
import { TopHeader } from './components/TopHeader';
import { RightSidebar } from './components/RightSidebar';
import { ClientForm } from './components/ClientForm';
import { MetricsModule, fetchMetrics, Metric } from './components/MetricsModule';

// --- Helpers ---

import { supabase } from './services/supabaseClient';


const fetchWithAuth = async (url: string, options?: RequestInit) => {
  const session = await supabase?.auth?.getSession();
  const token = session?.data?.session?.access_token;
  
  const headers = new Headers(options?.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(url, { ...options, headers });
};

const fetchJson = async (url: string, options?: RequestInit) => {
  const session = await supabase?.auth?.getSession();
  const token = session?.data?.session?.access_token;
  
  const headers = new Headers(options?.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch ${url}: ${errorText || response.statusText}`);
  }
  return response.json();
};

const CATEGORIES = ['Mercadoria', 'Serviço', 'Matéria-prima', 'Consumível', 'Equipamento', 'Outro'];
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
  if (s <= 150000) return (s - 100000) * 0.10;
  if (s <= 200000) return 5000 + (s - 150000) * 0.13;
  if (s <= 300000) return 11500 + (s - 200000) * 0.16;
  if (s <= 500000) return 27500 + (s - 300000) * 0.18;
  if (s <= 1000000) return 63500 + (s - 500000) * 0.19;
  if (s <= 1500000) return 158500 + (s - 1000000) * 0.20;
  if (s <= 2000000) return 258500 + (s - 1500000) * 0.21;
  if (s <= 5000000) return 363500 + (s - 2000000) * 0.22;
  if (s <= 10000000) return 1023500 + (s - 5000000) * 0.23;
  return 2173500 + (s - 10000000) * 0.25;
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

const WorkplaceModule = ({ onRefresh, clients }: { onRefresh: () => void, clients: Client[] }) => {
  const { user } = useAuth();
  const [workplaces, setWorkplaces] = useState<any[]>([]);
  const [selectedWorkplace, setSelectedWorkplace] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  const [clientId, setClientId] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [code, setCode] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [staffPerDay, setStaffPerDay] = useState(0);
  const [totalStaff, setTotalStaff] = useState(0);
  const [description, setDescription] = useState('');
  const [contact, setContact] = useState('');
  const [observations, setObservations] = useState('');

  const fetchWorkplaces = async () => {
    try {
      const data = await fetchJson(`/api/work-sites?company_id=${user?.company_id}`);
      setWorkplaces(data);
    } catch (err) {
      console.error('Error fetching workplaces:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkplaces();
  }, [user?.company_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchJson('/api/work-sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          client_id: clientId,
          title: name,
          start_date: startDate,
          end_date: endDate,
          staff_per_day: staffPerDay,
          total_staff: totalStaff,
          description,
          contact,
          observations,
          location, 
          code, 
          company_id: user?.company_id 
        })
      });
      setShowForm(false);
      fetchWorkplaces();
      onRefresh();
      
      // reset
      setClientId('');
      setName('');
      setLocation('');
      setCode('');
      setStartDate('');
      setEndDate('');
      setStaffPerDay(0);
      setTotalStaff(0);
      setDescription('');
      setContact('');
      setObservations('');
    } catch (err) {
      console.error('Error creating workplace:', err);
    }
  };

  if (selectedWorkplace) {
    return (
      <WorkSiteManagement 
        workSite={selectedWorkplace} 
        movements={[]} 
        invoices={[]} 
        onBack={() => setSelectedWorkplace(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-zinc-800 flex items-center gap-3">
            <MapPin size={24} className="text-[#003366]" />
            Locais de Trabalho
          </h2>
          <p className="text-zinc-500 text-sm">Gestão de obras e locais de prestação de serviços da empresa.</p>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="bg-[#003366] text-white px-6 py-2.5 font-bold text-xs uppercase tracking-widest flex items-center gap-2"
        >
          <Plus size={18} /> Novo Local
        </button>
      </div>

      <div className="bg-white border border-zinc-200 shadow-none overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#003366] text-white text-[11px] uppercase tracking-wider font-bold">
              <th className="px-6 py-4">Código</th>
              <th className="px-6 py-4">Nome / Designação</th>
              <th className="px-6 py-4">Localização</th>
              <th className="px-6 py-4">Cliente Associado</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {loading ? (
              <tr><td colSpan={5} className="p-12 text-center text-zinc-400 italic">Carregando...</td></tr>
            ) : workplaces.length === 0 ? (
              <tr><td colSpan={5} className="p-12 text-center text-zinc-400 italic">Nenhum local de trabalho registado.</td></tr>
            ) : workplaces.map((w) => (
              <tr key={w.id} className="hover:bg-zinc-50 transition-colors text-sm">
                <td className="px-6 py-4 font-mono text-xs font-bold text-[#003366]">{w.code || 'N/A'}</td>
                <td className="px-6 py-4 font-bold text-zinc-900">{w.title || w.name}</td>
                <td className="px-6 py-4 text-zinc-600">{w.location || 'N/A'}</td>
                <td className="px-6 py-4 text-zinc-500 font-bold">{w.client_name || 'N/A'}</td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => setSelectedWorkplace(w)}
                    className="bg-zinc-50 text-[#003366] px-3 py-1 text-[10px] font-black uppercase tracking-widest border border-zinc-200 hover:bg-zinc-100 transition-all mr-2"
                  >
                    Ver Relatório
                  </button>
                  <button className="text-zinc-400 hover:text-[#003366]"><MoreHorizontal size={18} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white p-8 rounded-none shadow-2xl"
          >
            <div className="flex justify-between items-center mb-6 border-b border-zinc-100 pb-4">
              <h3 className="font-bold text-[#003366] text-xl uppercase tracking-tight text-center w-full">Novo Local de Trabalho</h3>
              <button type="button" onClick={() => setShowForm(false)} className="text-zinc-400 hover:text-zinc-600 absolute right-8">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Seleccione um Cliente</label>
                  <select 
                    value={clientId} onChange={e => setClientId(e.target.value)} required
                    className="w-full border border-zinc-200 bg-white rounded-none px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366]"
                  >
                    <option value="">Selecionar Cliente...</option>
                    {clients?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Código</label>
                  <input type="text" value={code} onChange={e => setCode(e.target.value)} className="w-full border border-zinc-200 bg-white rounded-none px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366]" placeholder="Ex: OBRA-001" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Titulo da Obra/Serviço (Nome)</label>
                  <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full border border-zinc-200 bg-white rounded-none px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366]" placeholder="Ex: Edifício Kilamba" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Localização</label>
                  <input type="text" value={location} onChange={e => setLocation(e.target.value)} className="w-full border border-zinc-200 bg-white rounded-none px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366]" placeholder="Ex: Luanda, Talatona" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Data de Abertura de Obra/Serviço</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required className="w-full border border-zinc-200 bg-white rounded-none px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Data de Encerramento de Obra/Serviço</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required className="w-full border border-zinc-200 bg-white rounded-none px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total de Pessoal</label>
                  <input type="number" value={totalStaff} onChange={e => setTotalStaff(Number(e.target.value))} className="w-full border border-zinc-200 bg-white rounded-none px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Pessoal por Dia</label>
                  <input type="number" value={staffPerDay} onChange={e => setStaffPerDay(Number(e.target.value))} className="w-full border border-zinc-200 bg-white rounded-none px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Contacto</label>
                  <input type="text" value={contact} onChange={e => setContact(e.target.value)} className="w-full border border-zinc-200 bg-white rounded-none px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366]" />
                </div>
                <div className="col-span-1 md:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Descrição</label>
                  <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full border border-zinc-200 bg-white rounded-none px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366]" />
                </div>
                <div className="col-span-1 md:col-span-2 space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Observações</label>
                  <textarea value={observations} onChange={e => setObservations(e.target.value)} className="w-full border border-zinc-200 bg-white rounded-none px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366] min-h-[80px]" />
                </div>
              </div>
              <div className="flex justify-end gap-4 mt-6 border-t border-zinc-100 pt-6">
                <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 font-bold text-sm tracking-widest bg-zinc-100 text-zinc-500 hover:bg-zinc-200 uppercase">Cancelar</button>
                <button type="submit" className="bg-[#003366] text-white font-bold py-2.5 px-8 uppercase text-xs tracking-widest hover:bg-[#002244]">Registar Local</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

const Sidebar = ({ activeTab, setActiveTab }: { 
  activeTab: string, 
  setActiveTab: (t: string) => void
}) => {
  const [profileImg, setProfileImg] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('profileImg');
    if (saved) setProfileImg(saved);
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      setProfileImg(url);
      localStorage.setItem('profileImg', url);
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Painel de Bordo', icon: LayoutDashboard },
    { id: 'workplaces', label: 'Locais de Trabalho', icon: Briefcase },
    { id: 'secretary', label: 'Secretaria Beta', icon: Paperclip },
    { id: 'pos', label: 'Ponto de Venda', icon: Monitor, hasChevron: true },
    { id: 'electronic_invoices', label: 'Faturação Electrónica', icon: FileCheck },
    { id: 'security', label: 'Segurança Gestão privada', icon: ShieldCheck },
    { id: 'specialized', label: 'Gestão Especializada', icon: Briefcase, hasChevron: true },
    { id: 'archive', label: 'Arquivo', icon: Archive },
    { id: 'invoices', label: 'Vendas', icon: FileText, hasChevron: true },
    { id: 'suppliers', label: 'Compras', icon: ShoppingBag, hasChevron: true },
    { id: 'products', label: 'Stocks & Inventário', icon: Package, hasChevron: true },
    { id: 'financial', label: 'Finanças', icon: CreditCard, hasChevron: true },
    { id: 'accounting', label: 'Contabilidade', icon: Calculator, hasChevron: true },
    { id: 'hr', label: 'Recursos Humanos', icon: Users, hasChevron: true },
    { id: 'reports', label: 'Relatórios', icon: FileSpreadsheet, hasChevron: true },
    { id: 'agrobusiness', label: 'Agronegócio', icon: TrendingUp },
    { id: 'church', label: 'Gestão de Igreja', icon: Building2 }, 
    { id: 'settings', label: 'Definições', icon: Settings },
  ];

  return (
    <div className="w-64 bg-[#0a0e1c] text-zinc-300 h-screen sticky top-0 flex flex-col overflow-y-auto shrink-0 z-20">
      <div className="flex flex-col items-center pt-8 pb-6 border-b border-white/5">
        <label className="relative cursor-pointer group">
          <div className="w-20 h-20 rounded-full border-2 border-white/10 bg-[#16213e] flex items-center justify-center overflow-hidden mb-3 group-hover:border-blue-500 transition-colors">
            {profileImg ? (
              <img src={profileImg} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <UserIcon size={32} className="text-zinc-400" />
            )}
          </div>
          <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
        </label>
        <h2 className="text-white font-bold text-lg leading-tight">Admin</h2>
        <p className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase">ADMIN</p>
      </div>
      
      <div className="flex-1 px-3 py-4 space-y-1 pb-8">
        <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 px-2">Menu Principal</h3>
        <nav className="space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-none transition-all duration-200 mb-0.5 ${
                activeTab === item.id 
                  ? 'bg-[#1a4da6] text-white font-semibold shadow-md border-l-4 border-white' 
                  : 'bg-[#123375] text-zinc-300 hover:bg-[#1a4da6] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon size={18} className={activeTab === item.id ? 'text-white' : 'text-zinc-400'} />
                <span className="text-sm">{item.label}</span>
              </div>
              {item.hasChevron && (
                <ChevronRight size={14} className={activeTab === item.id ? 'text-white/70' : 'text-zinc-500'} />
              )}
            </button>
          ))}
        </nav>
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

const Dashboard = ({ 
  stats, 
  products,
  invoices,
  issuedDocuments,
  caixaMovements
}: { 
  stats: DashboardStats | null, 
  products: Product[],
  invoices: Invoice[],
  issuedDocuments: IssuedDocument[],
  caixaMovements: CaixaMovement[]
}) => {
  if (!stats) return <div className="p-8">Carregando...</div>;

  const totalInvoiced = stats.totalInvoiced || 0;
  const totalExpenses = stats.totalExpenses || 0;
  const cashBalance = stats.cashBalance || 0;
  const pendingCount = stats.pendingCount || 0;
  const clientCount = stats.clientCount || 0;

  const salesByPeriod = (issuedDocuments || []).reduce((acc: any, doc) => {
    const date = new Date(doc.date).toLocaleDateString('pt-PT', { month: 'short' });
    acc[date] = (acc[date] || 0) + (doc.counter_value || doc.total || 0);
    return acc;
  }, {});

  const salesData = Object.keys(salesByPeriod).map(date => ({ date, value: salesByPeriod[date] }));

  const profitVsExpenses = [
    { name: 'Faturação', value: totalInvoiced },
    { name: 'Despesas', value: totalExpenses },
  ];

  const docTypes = (issuedDocuments || []).reduce((acc: any, doc) => {
    const type = doc.document_type || 'Outro';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const docTypeData = Object.keys(docTypes).map(name => ({ name, value: docTypes[name] }));
  const COLORS = ['#003366', '#2563eb', '#16a34a', '#f59e0b'];

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-bold text-[#003366] tracking-tight">Painel Executivo</h2>
        <p className="text-zinc-500 text-sm">Visão geral do desempenho financeiro e operacional.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Faturação Total', value: totalInvoiced, type: 'currency' },
          { label: 'Saldo em Caixa', value: cashBalance, type: 'currency', color: true },
          { label: 'Faturas Pendentes', value: pendingCount, type: 'number', color: pendingCount > 0 },
          { label: 'Clientes Ativos', value: clientCount, type: 'number' },
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
        <div className="bg-white border border-zinc-200 p-6 rounded-none shadow-sm">
          <h3 className="font-bold text-[#003366] mb-6">Faturação por Período</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#003366" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 p-6 rounded-none shadow-sm">
          <h3 className="font-bold text-[#003366] mb-6">Faturação vs Despesas</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={profitVsExpenses}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#003366" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white border border-zinc-200 p-6 rounded-none shadow-sm lg:col-span-1">
          <h3 className="font-bold text-[#003366] mb-6">Tipos de Documentos</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={docTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {docTypeData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-none overflow-hidden shadow-sm lg:col-span-2">
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

const HRModule = ({ onRefresh, onSetIsContractModalOpen, onSetEmployee, caixas, companyName }: { onRefresh: () => void, onSetIsContractModalOpen: (b: boolean) => void, onSetEmployee: (e: Employee | null) => void, caixas: Caixa[], companyName: string }) => {
  const professionsRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
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
  const [searchTerm, setSearchTerm] = useState('');
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [selectedEmployeeForOptions, setSelectedEmployeeForOptions] = useState<Employee | null>(null);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [selectedMonthForMap, setSelectedMonthForMap] = useState(new Date().toISOString().slice(0, 7));
  const [selectedMapSubTab, setSelectedMapSubTab] = useState('irt_inss');
  const [selectedPaymentCaixa, setSelectedPaymentCaixa] = useState('');
  const [isProcessingComplete, setIsProcessingComplete] = useState(false);

  const [showDismissForm, setShowDismissForm] = useState(false);
  const [dismissData, setDismissData] = useState({ date: new Date().toISOString().split('T')[0], reason: '', observations: '', orderedBy: '' });

  const handleDismissEmployee = async () => {
    if (!selectedEmployeeForOptions) return;
    try {
      const res = await fetchWithAuth(`/api/employees/dismiss/${selectedEmployeeForOptions.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dismissData)
      });
      if (res.ok) {
        alert('Funcionário demitido com sucesso!');
        setShowDismissForm(false);
        setShowOptionsMenu(false);
        fetchHRData();
      }
    } catch (err) {
      console.error('Error dismissing employee:', err);
    }
  };

  const EmployeeOptionsMenu = ({ employee, onClose }: { employee: Employee, onClose: () => void }) => {
    const options = [
      { id: 'editar', label: 'Editar', icon: <Edit size={20} />, color: 'text-blue-600', bg: 'bg-blue-50', desc: 'Editar informações' },
      { id: 'demitir', label: 'Demitir', icon: <UserMinus size={20} />, color: 'text-red-600', bg: 'bg-red-50', desc: 'Processo de rescisão' },
      { id: 'ficha_pessoal', label: 'Cadastro', icon: <FileText size={20} />, color: 'text-[#003366]', bg: 'bg-zinc-50', desc: 'Ficha Pessoal' },
      { id: 'acerto_salarial', label: 'Situação Salarial', icon: <Calculator size={20} />, color: 'text-amber-600', bg: 'bg-amber-50', desc: 'Ajustes de vencimento' },
      { id: 'irt_inss_map', label: 'INSS', icon: <ShieldCheck size={20} />, color: 'text-emerald-600', bg: 'bg-emerald-50', desc: 'Segurança Social' },
      { id: 'emitir_contrato', label: 'Contrato', icon: <FileSignature size={20} />, color: 'text-[#003366]', bg: 'bg-zinc-50', desc: 'Contrato de Trabalho' },
    ];

    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      >
        <div 
          className="bg-white border border-zinc-200 w-full max-w-2xl shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="bg-[#003366] text-white p-8 flex justify-between items-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
            <div className="flex items-center gap-6 relative z-10">
              <div className="w-20 h-20 bg-white/10 rounded-none overflow-hidden border-2 border-white/20 flex items-center justify-center shadow-inner">
                {employee.image_url ? <img src={employee.image_url} className="w-full h-full object-cover" /> : <UserIcon size={40} />}
              </div>
              <div>
                <h3 className="text-2xl font-black uppercase tracking-[0.2em]">{employee.name}</h3>
                <p className="text-xs text-white/60 uppercase tracking-widest font-bold mt-1">{employee.role} • ID: {employee.id}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-3 hover:bg-white/10 transition-colors relative z-10">
              <X size={24} />
            </button>
          </div>
          <div className="p-8 grid grid-cols-2 gap-6 bg-zinc-50/50">
            {options.map(opt => (
              <button
                key={opt.id}
                onClick={() => {
                  if (opt.id === 'editar') {
                    handleEditEmployee(employee);
                    onClose();
                  } else if (opt.id === 'emitir_contrato') {
                    onSetEmployee(employee);
                    onSetIsContractModalOpen(true);
                    onClose();
                  } else if (opt.id === 'demitir') {
                    setShowDismissForm(true);
                  } else {
                    onSetEmployee(employee);
                    setActiveTab(opt.id);
                    onClose();
                  }
                }}
                className="flex items-center gap-6 p-6 bg-white border border-zinc-200 hover:border-[#003366] hover:shadow-xl transition-all group text-left"
              >
                <div className={`w-16 h-16 ${opt.bg} ${opt.color} rounded-none flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm`}>
                  {opt.icon}
                </div>
                <div>
                  <span className="block text-xs font-black uppercase tracking-widest text-[#003366] mb-1">{opt.label}</span>
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight">{opt.desc}</span>
                </div>
              </button>
            ))}
          </div>

          {showDismissForm && (
            <div className="absolute inset-0 z-[60] bg-white flex flex-col">
              <div className="p-6 bg-red-600 text-white flex justify-between items-center">
                <h4 className="font-black uppercase tracking-widest flex items-center gap-2">
                  <UserMinus size={18} /> Processo de Demissão
                </h4>
                <button onClick={() => setShowDismissForm(false)} className="hover:bg-white/10 p-2">
                  <X size={20} />
                </button>
              </div>
              <div className="p-8 space-y-6 overflow-y-auto">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Data de Demissão</label>
                    <input 
                      type="date" 
                      className="w-full border border-zinc-200 p-3 text-sm focus:outline-none focus:border-red-600"
                      value={dismissData.date}
                      onChange={e => setDismissData({...dismissData, date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Ordenado Por</label>
                    <input 
                      type="text" 
                      className="w-full border border-zinc-200 p-3 text-sm focus:outline-none focus:border-red-600"
                      placeholder="Nome do responsável"
                      value={dismissData.orderedBy}
                      onChange={e => setDismissData({...dismissData, orderedBy: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Motivo da Demissão</label>
                  <select 
                    className="w-full border border-zinc-200 p-3 text-sm focus:outline-none focus:border-red-600"
                    value={dismissData.reason}
                    onChange={e => setDismissData({...dismissData, reason: e.target.value})}
                  >
                    <option value="">Selecione o motivo...</option>
                    <option value="Rescisão por mútuo acordo">Rescisão por mútuo acordo</option>
                    <option value="Despedimento com justa causa">Despedimento com justa causa</option>
                    <option value="Despedimento por causas objetivas">Despedimento por causas objetivas</option>
                    <option value="Caducidade do contrato">Caducidade do contrato</option>
                    <option value="Pedido de demissão">Pedido de demissão</option>
                    <option value="Reforma">Reforma</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Observações Adicionais</label>
                  <textarea 
                    className="w-full border border-zinc-200 p-3 text-sm focus:outline-none focus:border-red-600 h-32 resize-none"
                    placeholder="Detalhes sobre o processo de rescisão..."
                    value={dismissData.observations}
                    onChange={e => setDismissData({...dismissData, observations: e.target.value})}
                  />
                </div>
                <div className="pt-4 flex gap-4">
                  <button 
                    onClick={() => setShowDismissForm(false)}
                    className="flex-1 bg-zinc-100 text-zinc-600 py-4 font-black uppercase tracking-widest text-xs hover:bg-zinc-200"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleDismissEmployee}
                    className="flex-2 bg-red-600 text-white py-4 font-black uppercase tracking-widest text-xs hover:bg-red-700 shadow-xl"
                  >
                    Confirmar Demissão
                  </button>
                </div>
              </div>
            </div>
          )}
          <div className="p-4 border-t border-zinc-100 bg-white text-center">
            <p className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.3em] italic">Secretária Digital • Gestão de Recursos Humanos</p>
          </div>
        </div>
      </motion.div>
    );
  };



  const OrdemTransferencia = ({ employee }: { employee: Employee | null }) => {
    if (!employee) return <div className="p-12 text-center text-zinc-400 italic">Selecione um colaborador para gerar a ordem de transferência.</div>;
    
    const inss = employee.salary * 0.03;
    const irt = calculateIRT(employee.salary - inss);
    const net = employee.salary - inss - irt;

    const downloadPDF = () => {
      const doc = new jsPDF('p', 'mm', 'a4');
      doc.setFontSize(18);
      doc.text('ORDEM DE TRANSFERÊNCIA', 14, 22);
      doc.setFontSize(10);
      doc.text(`Data: ${new Date().toLocaleDateString('pt-AO')}`, 14, 30);
      
      doc.text('Entidade Ordenante: Grupo TecnoSys ERP, LDA', 14, 45);
      doc.text(`Beneficiário: ${employee.name}`, 14, 52);
      doc.text(`IBAN: ${employee.iban || '---'}`, 14, 59);
      doc.text(`Valor: ${formatCurrency(net)}`, 14, 66);
      
      doc.text('Solicitamos a transferência bancária correspondente ao pagamento de vencimentos.', 14, 80);
      
      doc.save(`ordem_transferencia_${(employee.name || 'documento').toLowerCase().replace(/ /g, '_')}.pdf`);
    };

    return (
      <div className="bg-white border border-zinc-200 rounded-none shadow-lg max-w-4xl mx-auto overflow-hidden">
        <div className="bg-[#003366] text-white p-8 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-white/10 p-3">
              <ArrowRightLeft size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase tracking-[0.2em]">Ordem de Transferência</h2>
              <p className="text-xs text-white/60 uppercase tracking-widest font-bold">Pagamento de Vencimentos</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => window.print()}
              className="bg-white/10 hover:bg-white/20 px-4 py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all"
            >
              <Printer size={14} /> Imprimir
            </button>
            <button 
              onClick={downloadPDF}
              className="bg-[#F27D26] hover:bg-[#d96a1a] px-4 py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all"
            >
              <FileDown size={14} /> PDF
            </button>
          </div>
        </div>

        <div className="p-12 space-y-12 printable-area">
          {/* Bank Info */}
          <div className="grid grid-cols-2 gap-12">
            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-100 pb-2">Entidade Ordenante</h3>
              <div className="space-y-1">
                <p className="text-sm font-black text-[#003366] uppercase">Grupo TecnoSys ERP, LDA</p>
                <p className="text-xs text-zinc-500 font-bold">NIF: 5000123456</p>
                <p className="text-xs text-zinc-500 font-bold">Conta: 1234567890</p>
                <p className="text-xs text-zinc-500 font-bold">IBAN: AO06 0000 0000 1234 5678 9012 3</p>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-100 pb-2">Banco Destinatário</h3>
              <div className="space-y-1">
                <p className="text-sm font-black text-[#003366] uppercase">{employee.bank_name || 'BANCO BFA'}</p>
                <p className="text-xs text-zinc-500 font-bold">Data de Emissão: {new Date().toLocaleDateString('pt-AO')}</p>
                <p className="text-xs text-zinc-500 font-bold">Ref: OT-{new Date().getFullYear()}-{String(employee.id).padStart(4, '0')}</p>
              </div>
            </div>
          </div>

          {/* Transfer Details */}
          <div className="bg-zinc-50 border border-zinc-200 p-8 space-y-8">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-white border border-zinc-200 overflow-hidden flex items-center justify-center">
                  {employee.image_url ? <img src={employee.image_url} className="w-full h-full object-cover" /> : <UserIcon size={32} className="text-zinc-200" />}
                </div>
                <div>
                  <h4 className="text-lg font-black text-[#003366] uppercase tracking-tight">{employee.name}</h4>
                  <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">{employee.role}</p>
                  <p className="text-xs text-[#F27D26] font-black mt-1 uppercase tracking-tighter">IBAN: {employee.iban || '---'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Valor a Transferir</p>
                <p className="text-3xl font-black text-[#003366] font-mono">{formatCurrency(net)}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-zinc-200">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Salário Bruto</p>
                <p className="text-sm font-bold text-zinc-700">{formatCurrency(employee.salary)}</p>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Descontos (IRT/INSS)</p>
                <p className="text-sm font-bold text-red-500">-{formatCurrency(irt + inss)}</p>
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Período</p>
                <p className="text-sm font-bold text-zinc-700">Março / 2026</p>
              </div>
            </div>
          </div>

          {/* Bank Info */}
          <div className="bg-zinc-50 p-6 border border-zinc-100 mb-12 space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-200 pb-2">Dados do Ordenante</h3>
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Empresa</p>
                <p className="text-xs font-bold text-[#003366] uppercase">{companyName}</p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Banco / IBAN</p>
                <p className="text-xs font-bold text-zinc-700 uppercase">{bankName || 'BFA - Banco de Fomento Angola'}</p>
                <p className="text-[10px] font-mono font-bold text-zinc-500">{iban || 'AO06 0000 0000 0000 0000 0000 0'}</p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-100 pb-2">Descrição da Operação</h3>
            <p className="text-xs text-zinc-600 leading-relaxed font-bold italic">
              Solicitamos a transferência bancária da importância de {formatCurrency(net)} correspondente ao pagamento de vencimentos do colaborador acima identificado, referente ao período de Março de 2026.
            </p>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-24 pt-12">
            <div className="text-center space-y-4">
              <div className="border-t border-zinc-900 pt-4">
                <p className="text-[10px] font-black uppercase tracking-widest">Autorizado por</p>
                <p className="text-[8px] font-bold text-zinc-400 uppercase">Administração / Gerência</p>
              </div>
            </div>
            <div className="text-center space-y-4">
              <div className="border-t border-zinc-900 pt-4">
                <p className="text-[10px] font-black uppercase tracking-widest">Processado por</p>
                <p className="text-[8px] font-bold text-zinc-400 uppercase">Departamento de RH</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const filteredEmployees = Array.isArray(localEmployees) ? localEmployees.filter(emp => 
    (emp.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
    (emp.role || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
    (emp.profession_name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
    (emp.department || '').toLowerCase().includes((searchTerm || '').toLowerCase())
  ) : [];
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [salary, setSalary] = useState('');
  const [professionId, setProfessionId] = useState('');
  const [nif, setNif] = useState('');
  const [address, setAddress] = useState('');
  const [iban, setIban] = useState('');
  const [bankName, setBankName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('Masculino');
  const [maritalStatus, setMaritalStatus] = useState('Solteiro(a)');
  const [academicLevel, setAcademicLevel] = useState('Ensino Médio');
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [inssNumber, setInssNumber] = useState('');
  const [bi, setBi] = useState('');
  const [contractType, setContractType] = useState<'efetivo' | 'temporario' | 'estagiario'>('efetivo');
  const [dependents, setDependents] = useState('0');
  const [subjectToIRT, setSubjectToIRT] = useState(true);
  const [subjectToINSS, setSubjectToINSS] = useState(true);
  const [hiredAt, setHiredAt] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState('Março / 2026');
  const [processedAttendance, setProcessedAttendance] = useState<Record<number, boolean>>({});
  const [processedReceipts, setProcessedReceipts] = useState<any[]>([]);
  const [selectedProcedure, setSelectedProcedure] = useState<any | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [draftReceipt, setDraftReceipt] = useState<any | null>(null);
  const [appSelectedEmployee, setAppSelectedEmployee] = useState<Employee | null>(null);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [absences, setAbsences] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<number, Record<number, string>>>({});
  const [payrollInputs, setPayrollInputs] = useState<Record<number, { 
    premios: number, 
    gratificacoes: number, 
    abonos: number, 
    subsidioNatal: number, 
    alojamento: number, 
    outrosSubsidios: number,
    faltasJustificadas: number,
    faltasInjustificadas: number,
    ferias: number,
    horasExtras: number,
    horasPerdidas: number,
    subsidioTransporte: number,
    subsidioAlimentacao: number,
    adiantamentos: number,
    acertos: number,
    diasTrabalho: number,
    diasFolga: number
  }>>({});

  const updatePayrollInput = (empId: number, field: string, value: number) => {
    setPayrollInputs(prev => ({
      ...prev,
      [empId]: {
        ...(prev[empId] || { 
          premios: 0, 
          gratificacoes: 0, 
          abonos: 0, 
          subsidioNatal: 0, 
          alojamento: 0, 
          outrosSubsidios: 0,
          faltasJustificadas: 0,
          faltasInjustificadas: 0,
          ferias: 0,
          horasExtras: 0,
          horasPerdidas: 0,
          subsidioTransporte: 0,
          subsidioAlimentacao: 0,
          adiantamentos: 0,
          acertos: 0,
          diasTrabalho: 22,
          diasFolga: 8
        }),
        [field]: value
      }
    }));
  };

  const toggleAttendanceStatus = (empId: number, day: number) => {
    setAttendanceMap(prev => {
      const empAttendance = prev[empId] || {};
      const currentStatus = empAttendance[day] || 'P';
      const statuses = ['P', 'FJ', 'FI', 'FE', 'HE', 'HP', 'D'];
      const nextStatus = statuses[(statuses.indexOf(currentStatus) + 1) % statuses.length];
      return {
        ...prev,
        [empId]: {
          ...empAttendance,
          [day]: nextStatus
        }
      };
    });
  };

  const calculateAttendanceTotals = (empId: number) => {
    const empAttendance = attendanceMap[empId] || {};
    let fj = 0, fi = 0, fe = 0, he = 0, hp = 0, p = 0, d = 0;
    for (let day = 1; day <= 31; day++) {
      const status = empAttendance[day] || (day % 7 === 0 ? 'D' : 'P');
      if (status === 'FJ') fj++;
      else if (status === 'FI') fi++;
      else if (status === 'FE') fe++;
      else if (status === 'HE') he++;
      else if (status === 'HP') hp++;
      else if (status === 'P') p++;
      else if (status === 'D') d++;
    }
    return { fj, fi, fe, he, hp, p, d };
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, callback: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        callback(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const [laborTerminations, setLaborTerminations] = useState<LaborTermination[]>([]);

  const fetchHRData = async () => {
    try {
      const [p, e, att, abs, lt] = await Promise.all([
        fetchJson('/api/professions'),
        fetchJson('/api/employees'),
        fetchJson(`/api/employees/attendance?date=${attendanceDate}`),
        fetchJson('/api/employees/absences'),
        fetchJson('/api/labor-terminations')
      ]);
      setProfessions(Array.isArray(p) ? p : []);
      setLocalEmployees(Array.isArray(e) ? e : []);
      setAttendance(Array.isArray(att) ? att : []);
      setAbsences(Array.isArray(abs) ? abs : []);
      setLaborTerminations(Array.isArray(lt) ? lt : []);
    } catch (err) {
      console.error('Error fetching HR data:', err);
    }
  };

  useEffect(() => { fetchHRData(); }, [attendanceDate]);

  const handleMarkAttendance = async (employeeId: number, status: 'present' | 'absent' | 'late') => {
    try {
      await fetchWithAuth('/api/employees/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: employeeId, date: attendanceDate, status })
      });
      fetchHRData();
    } catch (err) {
      console.error('Error marking attendance:', err);
    }
  };

  const handleAddAbsence = async (employeeId: number, startDate: string, endDate: string, reason: string) => {
    try {
      await fetchWithAuth('/api/employees/absences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: employeeId, start_date: startDate, end_date: endDate, reason })
      });
      fetchHRData();
    } catch (err) {
      console.error('Error adding absence:', err);
    }
  };

  const handleDeleteProfession = async (id: number) => {
    if (!confirm('Tem a certeza que deseja eliminar esta profissão?')) return;
    try {
      await fetchWithAuth(`/api/professions/${id}`, { method: 'DELETE' });
      fetchHRData();
    } catch (err) {
      console.error('Error deleting profession:', err);
    }
  };

  const handleDeleteEmployee = async (id: number) => {
    if (!confirm('Tem a certeza que deseja eliminar este funcionário?')) return;
    try {
      await fetchWithAuth(`/api/employees/${id}`, { method: 'DELETE' });
      fetchHRData();
      onRefresh();
    } catch (err) {
      console.error('Error deleting employee:', err);
    }
  };

  const handleEditEmployee = (emp: Employee) => {
    setEditingEmployee(emp);
    setName(emp.name);
    setRole(emp.role);
    setSalary(String(emp.salary));
    setProfessionId(String(emp.profession_id || ''));
    setNif(emp.nif || '');
    setBi(emp.bi || '');
    setAddress(emp.address || '');
    setIban(emp.iban || '');
    setBankName(emp.bank_name || '');
    setImageUrl(emp.image_url || '');
    setBirthDate(emp.birth_date || '');
    setGender(emp.gender || 'Masculino');
    setMaritalStatus(emp.marital_status || 'Solteiro(a)');
    setAcademicLevel(emp.academic_level || 'Ensino Médio');
    setDepartment(emp.department || '');
    setContractType(emp.contract_type || 'efetivo');
    setDependents(String(emp.dependents || 0));
    setSubjectToIRT(emp.subject_to_irt !== false);
    setSubjectToINSS(emp.subject_to_inss !== false);
    setHiredAt(emp.hired_at || new Date().toISOString().split('T')[0]);
    setPhone(emp.phone || '');
    setEmail(emp.email || '');
    setBankAccount(emp.bank_account || '');
    setInssNumber(emp.inss_number || '');
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { 
      name, 
      role, 
      profession_id: professionId ? Number(professionId) : null,
      salary: Number(salary), 
      email,
      phone,
      nif,
      bi,
      address,
      iban,
      bank_name: bankName,
      image_url: imageUrl,
      birth_date: birthDate,
      gender,
      marital_status: maritalStatus,
      academic_level: academicLevel,
      department,
      contract_type: contractType,
      dependents: Number(dependents),
      subject_to_irt: subjectToIRT,
      subject_to_inss: subjectToINSS,
      hired_at: hiredAt,
      bank_account: bankAccount,
      inss_number: inssNumber,
      status: editingEmployee ? editingEmployee.status : 'active'
    };

    const url = editingEmployee ? `/api/employees/${editingEmployee.id}` : '/api/employees';
    const method = editingEmployee ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao registar funcionário');
      }

      setName(''); setRole(''); setSalary(''); setProfessionId(''); 
      setNif(''); setBi(''); setAddress(''); setIban(''); setBankName(''); 
      setImageUrl(''); setBirthDate(''); setGender('Masculino'); 
      setHiredAt(new Date().toISOString().split('T')[0]);
      setMaritalStatus('Solteiro(a)'); setAcademicLevel('Ensino Médio'); 
      setDepartment(''); setPhone(''); setEmail('');
      setBankAccount(''); setInssNumber('');
      setContractType('efetivo'); setDependents('0');
      setSubjectToIRT(true); setSubjectToINSS(true);
      setEditingEmployee(null);
      setShowForm(false);
      
      // Refresh data
      await fetchHRData();
      onRefresh();
      
      alert(editingEmployee ? 'Funcionário atualizado com sucesso!' : 'Funcionário registado com sucesso!');
    } catch (err) {
      console.error('Error submitting employee:', err);
      alert(err instanceof Error ? err.message : 'Erro ao processar pedido');
    }
  };

  const handleProcessPayroll = async (emp: Employee) => {
    const inss_worker = emp.salary * 0.03;
    const inss_company = emp.salary * 0.08;
    const irt = calculateIRT(emp.salary - inss_worker);
    const net_salary = emp.salary - inss_worker - irt;
    
    const now = new Date();
    const payload = {
      employee_id: emp.id,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      base_salary: emp.salary,
      inss_worker,
      inss_company,
      irt,
      net_salary
    };

    try {
      const res = await fetchWithAuth('/api/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert(`Salário de ${emp.name} processado com sucesso!`);
      }
    } catch (err) {
      console.error('Error processing payroll:', err);
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'DASHBOARD', icon: <LayoutDashboard size={14} />, description: 'Visão geral dos recursos humanos' },
    { id: 'attendance_map', label: 'ASSIDUIDADE', icon: <Clock size={14} />, description: 'Controle de presenças e faltas' },
    { id: 'professions', label: 'PROFISSÕES', icon: <Briefcase size={14} />, description: 'Gestão de cargos e salários base' },
    { id: 'list', label: 'COLABORADORES', icon: <Users size={14} />, description: 'Listagem e cadastro de pessoal' },
    { id: 'active_employees', label: 'TRABALHADORES ATIVOS', icon: <Users size={14} />, description: 'Lista de trabalhadores ativos' },
    { id: 'effective_list', label: 'LISTA EFETIVA', icon: <Users size={14} />, description: 'Lista detalhada de trabalhadores' },
    { id: 'salary_procedures', label: 'PROCEDIMENTOS DE SALÁRIO', icon: <FileText size={14} />, description: 'Gestão de procedimentos salariais' },
    { id: 'payroll', label: 'PROCESSAMENTO', icon: <Calculator size={14} />, description: 'Cálculo de vencimentos e subsídios' },
    { id: 'salary_receipts', label: 'RECIBOS DE SALÁRIO', icon: <FileCheck size={14} />, description: 'Emissão de recibos de vencimento' },
    { id: 'contracts', label: 'GESTÃO DE CONTRATOS', icon: <FileText size={14} />, description: 'Controle de vínculos laborais' },
    { id: 'irt_table', label: 'TABELA IRT', icon: <Table size={14} />, description: 'Configuração de escalões de imposto' },
    { id: 'transfer_order', label: 'ORDEM DE TRANSFERÊNCIA', icon: <ArrowRightLeft size={14} />, description: 'Pagamentos bancários' },
    { id: 'irt_inss_map', label: 'MAPA GERAL IRT/INSS', icon: <Layers size={14} />, description: 'Relatórios fiscais e segurança social' },
    { id: 'personal_registry', label: 'CADASTRO PESSOAL', icon: <UserCheck size={14} />, description: 'Dossier individual do colaborador' },
    { id: 'maps', label: 'MAPAS', icon: <Map size={14} />, description: 'Mapas estatísticos e obrigatórios' },
    { id: 'work_card', label: 'CARTÃO DE TRABALHO', icon: <CreditCard size={14} />, description: 'Identificação profissional' },
    { id: 'labor_registration', label: 'INSCRIÇÃO LABORAL', icon: <FilePlus size={14} />, description: 'Registo nos órgãos competentes' },
    { id: 'performance_analysis', label: 'ANÁLISE DE DESEMPENHO', icon: <TrendingUp size={14} />, description: 'Avaliação de produtividade' },
    { id: 'workstation_management', label: 'GESTÃO DE POSTO', icon: <Monitor size={14} />, description: 'Alocação de recursos físicos' },
    { id: 'labor_extinction', label: 'EXTINÇÃO LABORAL', icon: <UserMinus size={14} />, description: 'Processos de rescisão' },
    { id: 'print_list', label: 'IMPRIMIR LISTA', icon: <Printer size={14} />, description: 'Relatórios rápidos de pessoal' },
    { id: 'ficha_pessoal', label: 'FICHA PESSOAL', icon: <FileText size={14} />, description: 'Dossier individual do colaborador' },
    { id: 'declaracao_servico', label: 'DECLARAÇÃO DE SERVIÇO', icon: <FileSignature size={14} />, description: 'Emissão de declarações' },
    { id: 'acordo_confidencialidade', label: 'ACORDO DE CONFIDENCIALIDADE', icon: <ShieldCheck size={14} />, description: 'Acordo de confidencialidade' },
    { id: 'colaboradores_demitidos', label: 'COLABORADORES DEMITIDOS', icon: <UserMinus size={14} />, description: 'Gestão de demissões' },
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

      <div className="flex border-b border-zinc-200 overflow-x-auto no-scrollbar bg-white p-2 gap-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all border border-zinc-200 flex items-center gap-2 whitespace-nowrap ${
              activeTab === tab.id 
                ? 'bg-[#003366] text-white border-[#003366]' 
                : 'bg-white text-zinc-500 hover:bg-zinc-50'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {showForm && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
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
              className="relative w-full max-w-5xl bg-white rounded-none shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-[#003366] text-white">
                <h3 className="font-bold flex items-center gap-2 uppercase tracking-widest text-sm">
                  <UserPlus size={18} />
                  Registar Novo Funcionário
                </h3>
                <button onClick={() => setShowForm(false)} className="text-white/80 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Image Upload Section */}
                  <div className="flex items-center gap-6 pb-8 border-b border-zinc-100">
                    <div className="relative group">
                      <div className="w-24 h-24 bg-zinc-100 rounded-none border-2 border-dashed border-zinc-300 flex items-center justify-center overflow-hidden">
                        {imageUrl ? (
                          <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <UserIcon size={40} className="text-zinc-300" />
                        )}
                      </div>
                      <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <Camera size={20} />
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, setImageUrl)} />
                      </label>
                    </div>
                    <div>
                      <h4 className="font-bold text-zinc-700 uppercase text-xs tracking-wider">Foto do Funcionário</h4>
                      <p className="text-zinc-400 text-[10px] uppercase">Clique na imagem para carregar (JPG, PNG)</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Personal Info */}
                    <div className="space-y-4">
                      <h4 className="font-black text-[#003366] text-[10px] uppercase tracking-[0.2em] border-b border-zinc-100 pb-2">Informação Pessoal</h4>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Nome Completo</label>
                        <input value={name} onChange={e => setName(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-sm focus:outline-none focus:border-[#003366]" required />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Data de Nascimento</label>
                          <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-sm focus:outline-none focus:border-[#003366]" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Gênero</label>
                          <select value={gender} onChange={e => setGender(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-sm focus:outline-none focus:border-[#003366]">
                            <option>Masculino</option>
                            <option>Feminino</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">NIF</label>
                          <input value={nif} onChange={e => setNif(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-sm focus:outline-none focus:border-[#003366]" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">BI</label>
                          <input value={bi} onChange={e => setBi(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-sm focus:outline-none focus:border-[#003366]" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Estado Civil</label>
                          <select value={maritalStatus} onChange={e => setMaritalStatus(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-sm focus:outline-none focus:border-[#003366]">
                            <option>Solteiro(a)</option>
                            <option>Casado(a)</option>
                            <option>Divorciado(a)</option>
                            <option>Viúvo(a)</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Dependentes</label>
                          <input type="number" value={dependents} onChange={e => setDependents(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-sm focus:outline-none focus:border-[#003366]" />
                        </div>
                      </div>
                    </div>

                    {/* Professional Info */}
                    <div className="space-y-4">
                      <h4 className="font-black text-[#003366] text-[10px] uppercase tracking-[0.2em] border-b border-zinc-100 pb-2">Informação Profissional</h4>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Profissão / Cargo</label>
                        <select 
                          value={professionId} 
                          onChange={e => {
                            const pid = e.target.value;
                            setProfessionId(pid);
                            const prof = professions.find(p => p.id === Number(pid));
                            if (prof) {
                              setSalary(String(prof.base_salary || 0));
                              setRole(prof.name);
                            }
                          }} 
                          className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-sm focus:outline-none focus:border-[#003366]"
                          required
                        >
                          <option value="">Selecionar Profissão</option>
                          {professions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Departamento</label>
                          <input value={department} onChange={e => setDepartment(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-sm focus:outline-none focus:border-[#003366]" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Tipo de Contrato</label>
                          <select value={contractType} onChange={e => setContractType(e.target.value as any)} className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-sm focus:outline-none focus:border-[#003366]">
                            <option value="efetivo">Efetivo</option>
                            <option value="temporario">Temporário</option>
                            <option value="estagiario">Estagiário</option>
                          </select>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Salário Base</label>
                        <input type="number" value={salary} onChange={e => setSalary(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-sm focus:outline-none focus:border-[#003366]" required />
                      </div>
                      <div className="flex gap-6 py-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={subjectToIRT} onChange={e => setSubjectToIRT(e.target.checked)} className="w-4 h-4 text-[#003366] border-zinc-300 rounded-none focus:ring-[#003366]" />
                          <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Sujeito a IRT</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={subjectToINSS} onChange={e => setSubjectToINSS(e.target.checked)} className="w-4 h-4 text-[#003366] border-zinc-300 rounded-none focus:ring-[#003366]" />
                          <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Sujeito a INSS</span>
                        </label>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Habilitações Literárias</label>
                        <select value={academicLevel} onChange={e => setAcademicLevel(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-sm focus:outline-none focus:border-[#003366]">
                          <option>Ensino Primário</option>
                          <option>Ensino Básico</option>
                          <option>Ensino Médio</option>
                          <option>Licenciatura</option>
                          <option>Mestrado</option>
                          <option>Doutoramento</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Data de Admissão</label>
                        <input type="date" value={hiredAt} onChange={e => setHiredAt(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-sm focus:outline-none focus:border-[#003366]" />
                      </div>
                    </div>

                    {/* Contact & Banking */}
                    <div className="space-y-4">
                      <h4 className="font-black text-[#003366] text-[10px] uppercase tracking-[0.2em] border-b border-zinc-100 pb-2">Contacto & Bancário</h4>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Telefone</label>
                        <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-sm focus:outline-none focus:border-[#003366]" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Email</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-sm focus:outline-none focus:border-[#003366]" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Banco</label>
                        <input value={bankName} onChange={e => setBankName(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-sm focus:outline-none focus:border-[#003366]" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Conta Bancária</label>
                          <input value={bankAccount} onChange={e => setBankAccount(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-sm focus:outline-none focus:border-[#003366]" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Nº INSS</label>
                          <input value={inssNumber} onChange={e => setInssNumber(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-sm focus:outline-none focus:border-[#003366]" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">IBAN</label>
                        <input value={iban} onChange={e => setIban(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-sm focus:outline-none focus:border-[#003366]" />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-8 border-t border-zinc-100">
                    <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 text-sm font-bold text-zinc-400 hover:text-zinc-600 uppercase tracking-widest">Cancelar</button>
                    <button type="submit" className="bg-[#003366] text-white font-bold px-10 py-2.5 rounded-none hover:bg-[#002244] transition-all shadow-lg uppercase tracking-widest text-xs">Finalizar Registo</button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}

        {activeTab === 'salary_procedures' && (
          <div className="space-y-6">
            {!selectedProcedure ? (
              <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                  <h3 className="font-bold text-[#003366] uppercase tracking-widest text-xs">Procedimentos de Salário</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#003366] text-white text-[10px] uppercase tracking-widest font-black">
                        <th className="px-6 py-4">Funcionário</th>
                        <th className="px-6 py-4">Cargo</th>
                        <th className="px-6 py-4">Mês/Ano</th>
                        <th className="px-6 py-4 text-right">Salário Base</th>
                        <th className="px-6 py-4 text-right">Líquido</th>
                        <th className="px-6 py-4 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {processedReceipts.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-zinc-400 text-xs uppercase font-bold">
                            Nenhum procedimento registado.
                          </td>
                        </tr>
                      ) : (
                        processedReceipts.map(proc => (
                          <tr key={proc.id} className="hover:bg-zinc-50 transition-colors text-xs font-bold text-zinc-600">
                            <td className="px-6 py-4 uppercase">{proc.employee.name}</td>
                            <td className="px-6 py-4 uppercase text-zinc-400">{proc.employee.role}</td>
                            <td className="px-6 py-4 uppercase">{proc.period}</td>
                            <td className="px-6 py-4 text-right font-mono">{formatCurrency(proc.employee.salary)}</td>
                            <td className="px-6 py-4 text-right font-mono text-emerald-600">{formatCurrency(proc.calculations.totalNet)}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-center gap-2">
                                <button 
                                  onClick={() => setSelectedProcedure(proc)}
                                  className="p-1.5 text-zinc-400 hover:text-[#003366] transition-all"
                                  title="Visualizar"
                                >
                                  <Eye size={14} />
                                </button>
                                <button className="p-1.5 text-zinc-400 hover:text-[#003366] transition-all" title="Imprimir">
                                  <Printer size={14} />
                                </button>
                                <button className="p-1.5 text-zinc-400 hover:text-[#003366] transition-all" title="Editar">
                                  <Edit size={14} />
                                </button>
                                <button className="p-1.5 text-zinc-400 hover:text-[#003366] transition-all" title="Associar">
                                  <Link size={14} />
                                </button>
                                <button className="p-1.5 text-zinc-400 hover:text-red-500 transition-all" title="Apagar">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-zinc-200 shadow-2xl p-8 max-w-5xl mx-auto relative">
                <button 
                  onClick={() => setSelectedProcedure(null)}
                  className="absolute top-4 left-4 text-zinc-400 hover:text-[#003366] flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                >
                  <ArrowLeft size={16} /> Voltar
                </button>
                
                <div className="flex justify-end gap-2 mb-8">
                  <button className="bg-[#003366] text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    <Printer size={14} /> Imprimir
                  </button>
                  <button className="bg-[#F27D26] text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                    <FileDown size={14} /> Baixar
                  </button>
                </div>

                <div className="border-2 border-zinc-900 p-8">
                  <div className="flex justify-between items-start mb-8 border-b border-zinc-200 pb-6">
                    <div>
                      <h2 className="text-xl font-black text-[#003366] uppercase tracking-tighter">Procedimento de Processamento de Salário</h2>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Grupo TecnoSys - Recursos Humanos</p>
                    </div>
                    <div className="text-right text-[10px] font-bold uppercase">
                      <p>Data: {new Date().toLocaleDateString()}</p>
                      <p>Período: {selectedProcedure.period}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8 mb-8">
                    <div className="space-y-4">
                      <div className="bg-zinc-50 p-4 border border-zinc-100">
                        <h4 className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2">Dados do Colaborador</h4>
                        <p className="text-sm font-black text-[#003366] uppercase">{selectedProcedure.employee.name}</p>
                        <p className="text-[10px] font-bold text-zinc-600 uppercase mt-1">{selectedProcedure.employee.role}</p>
                        <p className="text-[10px] font-mono text-zinc-500 mt-1">NIF: {selectedProcedure.employee.nif || '---'}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="bg-zinc-50 p-4 border border-zinc-100">
                        <h4 className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2">Resumo Financeiro</h4>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase">Salário Base:</span>
                          <span className="text-xs font-black">{formatCurrency(selectedProcedure.employee.salary)}</span>
                        </div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase">Total Descontos:</span>
                          <span className="text-xs font-black text-red-500">-{formatCurrency(selectedProcedure.calculations.totalDeductions)}</span>
                        </div>
                        <div className="pt-2 border-t border-zinc-200 flex justify-between items-center">
                          <span className="text-[10px] font-black text-[#003366] uppercase">Valor Líquido:</span>
                          <span className="text-sm font-black text-emerald-600">{formatCurrency(selectedProcedure.calculations.totalNet)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-[10px]">
                      <thead>
                        <tr className="bg-zinc-900 text-white font-black uppercase tracking-widest">
                          <th className="px-4 py-2">Descrição</th>
                          <th className="px-4 py-2 text-right">Vencimentos</th>
                          <th className="px-4 py-2 text-right">Descontos</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 font-bold uppercase">
                        <tr>
                          <td className="px-4 py-3">Salário Base</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(selectedProcedure.employee.salary)}</td>
                          <td className="px-4 py-3 text-right">---</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3">Segurança Social (3%)</td>
                          <td className="px-4 py-3 text-right">---</td>
                          <td className="px-4 py-3 text-right text-red-500">{formatCurrency(selectedProcedure.calculations.inss)}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-3">IRT</td>
                          <td className="px-4 py-3 text-right">---</td>
                          <td className="px-4 py-3 text-right text-red-500">{formatCurrency(selectedProcedure.calculations.irt)}</td>
                        </tr>
                        {selectedProcedure.inputs.subsidioTransporte > 0 && (
                          <tr>
                            <td className="px-4 py-3">Subsídio de Transporte</td>
                            <td className="px-4 py-3 text-right">{formatCurrency(selectedProcedure.inputs.subsidioTransporte)}</td>
                            <td className="px-4 py-3 text-right">---</td>
                          </tr>
                        )}
                        {/* Add other subsidies as needed */}
                      </tbody>
                      <tfoot>
                        <tr className="bg-zinc-50 font-black uppercase">
                          <td className="px-4 py-3">Totais</td>
                          <td className="px-4 py-3 text-right">{formatCurrency(selectedProcedure.calculations.totalGross)}</td>
                          <td className="px-4 py-3 text-right text-red-500">{formatCurrency(selectedProcedure.calculations.totalDeductions)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="mt-12 grid grid-cols-2 gap-12 text-center">
                    <div className="border-t border-zinc-900 pt-4">
                      <p className="text-[10px] font-black uppercase tracking-widest">O Responsável</p>
                    </div>
                    <div className="border-t border-zinc-900 pt-4">
                      <p className="text-[10px] font-black uppercase tracking-widest">O Colaborador</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {activeTab === 'effective_list' && (
          <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-[#003366] text-white flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <Users size={14} /> Lista Efetiva de Trabalhadores
              </h3>
              <div className="flex gap-2">
                <button className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                  <Printer size={12} /> Imprimir
                </button>
                <button className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                  <FileDown size={12} /> Baixar
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[9px]">
                <thead>
                  <tr className="bg-zinc-100 text-zinc-600 font-black uppercase border-b border-zinc-200">
                    <th className="px-2 py-2 border-r border-zinc-200 text-center">Ln</th>
                    <th className="px-4 py-2 border-r border-zinc-200 min-w-[200px]">Nome Completo</th>
                    <th className="px-4 py-2 border-r border-zinc-200">Data Nasc.</th>
                    <th className="px-2 py-2 border-r border-zinc-200 text-center">Idade</th>
                    <th className="px-2 py-2 border-r border-zinc-200 text-center">Sexo</th>
                    <th className="px-4 py-2 border-r border-zinc-200">Estado Civil</th>
                    <th className="px-4 py-2 border-r border-zinc-200">NIF</th>
                    <th className="px-4 py-2 border-r border-zinc-200">BI</th>
                    <th className="px-4 py-2 border-r border-zinc-200 min-w-[150px]">Localidade</th>
                    <th className="px-4 py-2 border-r border-zinc-200">Telefone</th>
                    <th className="px-4 py-2 border-r border-zinc-200 min-w-[150px]">Email</th>
                    <th className="px-4 py-2 border-r border-zinc-200">Escolaridade</th>
                    <th className="px-4 py-2 border-r border-zinc-200 min-w-[150px]">Cargo</th>
                    <th className="px-4 py-2 border-r border-zinc-200">Departamento</th>
                    <th className="px-4 py-2 border-r border-zinc-200">Data Adm.</th>
                    <th className="px-4 py-2 border-r border-zinc-200">Tempo Serv.</th>
                    <th className="px-4 py-2 border-r border-zinc-200 text-right">Salário Base</th>
                    <th className="px-4 py-2 border-r border-zinc-200 text-right">IRT</th>
                    <th className="px-4 py-2 border-r border-zinc-200 text-right">INSS</th>
                    <th className="px-4 py-2 border-r border-zinc-200 text-right">Líquido</th>
                    <th className="px-4 py-2 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {localEmployees.map((emp, idx) => {
                    const age = emp.birth_date ? new Date().getFullYear() - new Date(emp.birth_date).getFullYear() : '---';
                    const inss = (emp.salary || 0) * 0.03;
                    const irt = calculateIRT((emp.salary || 0) - inss);
                    const net = (emp.salary || 0) - inss - irt;
                    const serviceTime = emp.hired_at ? `${new Date().getFullYear() - new Date(emp.hired_at).getFullYear()} anos` : '---';
                    
                    return (
                      <tr key={emp.id} className="hover:bg-zinc-50 transition-colors">
                        <td className="px-2 py-2 border-r border-zinc-200 text-center text-zinc-500">{idx + 1}</td>
                        <td className="px-4 py-2 border-r border-zinc-200 font-black text-[#003366] uppercase">{emp.name}</td>
                        <td className="px-4 py-2 border-r border-zinc-200">{emp.birth_date ? new Date(emp.birth_date).toLocaleDateString() : '---'}</td>
                        <td className="px-2 py-2 border-r border-zinc-200 text-center">{age}</td>
                        <td className="px-2 py-2 border-r border-zinc-200 text-center">{emp.gender?.substring(0, 1) || '---'}</td>
                        <td className="px-4 py-2 border-r border-zinc-200 uppercase">{emp.marital_status || '---'}</td>
                        <td className="px-4 py-2 border-r border-zinc-200 font-mono">{emp.nif || '---'}</td>
                        <td className="px-4 py-2 border-r border-zinc-200 font-mono">{emp.bi || '---'}</td>
                        <td className="px-4 py-2 border-r border-zinc-200 uppercase">{emp.address || '---'}</td>
                        <td className="px-4 py-2 border-r border-zinc-200">{emp.phone || '---'}</td>
                        <td className="px-4 py-2 border-r border-zinc-200 lowercase text-zinc-400">{emp.email || '---'}</td>
                        <td className="px-4 py-2 border-r border-zinc-200 uppercase">{emp.academic_level || '---'}</td>
                        <td className="px-4 py-2 border-r border-zinc-200 uppercase font-bold">{emp.role}</td>
                        <td className="px-4 py-2 border-r border-zinc-200 uppercase">{emp.department || '---'}</td>
                        <td className="px-4 py-2 border-r border-zinc-200">{emp.hired_at ? new Date(emp.hired_at).toLocaleDateString() : '---'}</td>
                        <td className="px-4 py-2 border-r border-zinc-200">{serviceTime}</td>
                        <td className="px-4 py-2 border-r border-zinc-200 text-right font-bold">{formatCurrency(emp.salary)}</td>
                        <td className="px-4 py-2 border-r border-zinc-200 text-right text-red-500">{formatCurrency(irt)}</td>
                        <td className="px-4 py-2 border-r border-zinc-200 text-right text-red-500">{formatCurrency(inss)}</td>
                        <td className="px-4 py-2 border-r border-zinc-200 text-right font-black text-emerald-600">{formatCurrency(net)}</td>
                        <td className="px-4 py-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button className="p-1 text-[#003366] hover:bg-zinc-100" title="Visualizar">
                              <Eye size={12} />
                            </button>
                            <button className="p-1 text-zinc-400 hover:text-[#003366] hover:bg-zinc-100" title="Imprimir">
                              <Printer size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tabs.filter(t => t.id !== 'dashboard').map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="bg-white border border-zinc-200 p-6 flex flex-col items-start gap-4 hover:border-[#003366] hover:shadow-md transition-all group text-left h-full"
              >
                <div className="w-12 h-12 bg-zinc-50 rounded-none flex items-center justify-center group-hover:bg-[#003366] group-hover:text-white transition-colors">
                  {React.cloneElement(tab.icon as React.ReactElement, { size: 24 })}
                </div>
                <div>
                  <h4 className="font-black text-[#003366] text-xs uppercase tracking-widest mb-1">{tab.label}</h4>
                  <p className="text-zinc-400 text-[10px] uppercase leading-relaxed">{tab.description}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {activeTab === 'salary_receipts' && (
          <div className="space-y-6">
            {!selectedReceipt ? (
              <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                  <h3 className="font-bold text-[#003366] uppercase tracking-widest text-xs">Recibos de Salário Processados</h3>
                  <div className="flex gap-2">
                    <button className="bg-[#003366] text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                      <Printer size={14} /> Imprimir Todos
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#1e293b] text-white text-[10px] uppercase tracking-widest font-black">
                        <th className="px-6 py-4">Funcionário</th>
                        <th className="px-6 py-4">Cargo</th>
                        <th className="px-6 py-4">Período</th>
                        <th className="px-6 py-4 text-right">Vencimento Base</th>
                        <th className="px-6 py-4 text-right">Total Líquido</th>
                        <th className="px-6 py-4 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {processedReceipts.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-zinc-400 text-xs uppercase font-bold">
                            Nenhum recibo processado. Vá para a aba "PROCESSAMENTO" e clique em "EXECUTAR".
                          </td>
                        </tr>
                      ) : (
                        processedReceipts.map(receipt => (
                          <tr key={receipt.id} className="hover:bg-zinc-50 transition-colors text-xs font-bold text-zinc-600">
                            <td className="px-6 py-4 uppercase">{receipt.employee.name}</td>
                            <td className="px-6 py-4 uppercase text-zinc-400">{receipt.employee.role}</td>
                            <td className="px-6 py-4 uppercase">{receipt.period}</td>
                            <td className="px-6 py-4 text-right font-mono">{Number(receipt.employee.salary).toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })}</td>
                            <td className="px-6 py-4 text-right font-mono text-[#16A34A]">{receipt.calculations.totalNet.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })}</td>
                            <td className="px-6 py-4 text-center">
                              <button 
                                onClick={() => setSelectedReceipt(receipt)}
                                className="text-[#003366] hover:text-[#F27D26] transition-colors uppercase text-[10px] font-black tracking-widest flex items-center gap-1 mx-auto"
                              >
                                <Eye size={14} /> Ver Recibo
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto bg-white border border-zinc-200 shadow-2xl p-12 relative overflow-hidden">
                <button 
                  onClick={() => setSelectedReceipt(null)}
                  className="absolute top-6 left-6 text-zinc-400 hover:text-[#003366] flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                >
                  <ArrowLeft size={16} /> Voltar à Lista
                </button>
                
                <div className="flex justify-end gap-2 absolute top-6 right-6 no-print">
                  <button className="bg-zinc-100 hover:bg-zinc-200 text-zinc-600 p-2 rounded-none transition-all">
                    <Printer size={18} />
                  </button>
                  <button className="bg-zinc-100 hover:bg-zinc-200 text-zinc-600 p-2 rounded-none transition-all">
                    <FileDown size={18} />
                  </button>
                </div>

                {/* Receipt Header */}
                <div className="flex justify-between items-start mb-12 mt-8 border-b-2 border-zinc-900 pb-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-[#003366] flex items-center justify-center text-white font-black text-xl">TS</div>
                      <div>
                        <h1 className="text-2xl font-black text-[#003366] uppercase tracking-tighter">Grupo TecnoSys</h1>
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Soluções Tecnológicas & Gestão</p>
                      </div>
                    </div>
                    <div className="text-[10px] font-bold text-zinc-600 space-y-1 uppercase">
                      <p>NIF: 000 000 000</p>
                      <p>Endereço: Luanda, Angola</p>
                      <p>Email: info@tecnosys.ao</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="bg-zinc-900 text-white px-6 py-2 font-black uppercase tracking-[0.3em] text-sm mb-4">
                      Recibo de Salário
                    </div>
                    <div className="text-[10px] font-bold text-zinc-600 space-y-1 uppercase">
                      <p>Nº Recibo: {new Date().getFullYear()}/{selectedReceipt.id.toString().padStart(4, '0')}</p>
                      <p>Data de Emissão: {new Date().toLocaleDateString('pt-AO')}</p>
                    </div>
                  </div>
                </div>

                {/* Employee Info */}
                <div className="grid grid-cols-2 gap-8 mb-12 bg-zinc-50 p-6 border border-zinc-100">
                  <div className="space-y-3">
                    <div>
                      <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Funcionário</label>
                      <p className="text-sm font-black text-[#003366] uppercase">{selectedReceipt.employee.name}</p>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase mt-1">Nº {1000 + selectedReceipt.employee.id}</p>
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Cargo / Função</label>
                      <p className="text-xs font-bold text-zinc-700 uppercase">{selectedReceipt.employee.role}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Data Admissão</label>
                        <p className="text-xs font-bold text-zinc-700 uppercase">{new Date(selectedReceipt.employee.hired_at).toLocaleDateString('pt-AO')}</p>
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Período</label>
                        <p className="text-xs font-bold text-zinc-700 uppercase">{selectedReceipt.period}</p>
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Data Pagamento</label>
                        <p className="text-xs font-bold text-zinc-700 uppercase">{selectedReceipt.paymentDate}</p>
                      </div>
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">IBAN para Depósito</label>
                      <p className="text-xs font-mono font-bold text-zinc-700">{selectedReceipt.employee.iban || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Earnings & Deductions Table */}
                <div className="mb-12">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b-2 border-zinc-900 text-[10px] font-black uppercase tracking-widest text-zinc-900">
                        <th className="py-3 w-16">Cód.</th>
                        <th className="py-3">Descrição das Verbas</th>
                        <th className="py-3 text-center w-24">Qtd/Ref</th>
                        <th className="py-3 text-right w-32">Vencimentos</th>
                        <th className="py-3 text-right w-32">Descontos</th>
                      </tr>
                    </thead>
                    <tbody className="text-[11px] font-bold text-zinc-700 uppercase">
                      <tr className="border-b border-zinc-100">
                        <td className="py-4">01</td>
                        <td className="py-4">Vencimento Base</td>
                        <td className="py-4 text-center">{selectedReceipt.inputs.diasTrabalho} Dias</td>
                        <td className="py-4 text-right font-mono">{Number(selectedReceipt.employee.salary).toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</td>
                        <td className="py-4 text-right font-mono">-</td>
                      </tr>
                      {selectedReceipt.inputs.subsidioTransporte > 0 && (
                        <tr className="border-b border-zinc-100">
                          <td className="py-4">02</td>
                          <td className="py-4">Subsídio de Transporte</td>
                          <td className="py-4 text-center">-</td>
                          <td className="py-4 text-right font-mono">{selectedReceipt.inputs.subsidioTransporte.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</td>
                          <td className="py-4 text-right font-mono">-</td>
                        </tr>
                      )}
                      {selectedReceipt.inputs.subsidioAlimentacao > 0 && (
                        <tr className="border-b border-zinc-100">
                          <td className="py-4">03</td>
                          <td className="py-4">Subsídio de Alimentação</td>
                          <td className="py-4 text-center">-</td>
                          <td className="py-4 text-right font-mono">{selectedReceipt.inputs.subsidioAlimentacao.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</td>
                          <td className="py-4 text-right font-mono">-</td>
                        </tr>
                      )}
                      {selectedReceipt.inputs.subsidioAlojamento > 0 && (
                        <tr className="border-b border-zinc-100">
                          <td className="py-4">04</td>
                          <td className="py-4">Subsídio de Alojamento</td>
                          <td className="py-4 text-center">-</td>
                          <td className="py-4 text-right font-mono">{selectedReceipt.inputs.subsidioAlojamento.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</td>
                          <td className="py-4 text-right font-mono">-</td>
                        </tr>
                      )}
                      {selectedReceipt.inputs.premios > 0 && (
                        <tr className="border-b border-zinc-100">
                          <td className="py-4">05</td>
                          <td className="py-4">Prémios de Desempenho</td>
                          <td className="py-4 text-center">-</td>
                          <td className="py-4 text-right font-mono">{selectedReceipt.inputs.premios.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</td>
                          <td className="py-4 text-right font-mono">-</td>
                        </tr>
                      )}
                      {selectedReceipt.inputs.gratificacoes > 0 && (
                        <tr className="border-b border-zinc-100">
                          <td className="py-4">06</td>
                          <td className="py-4">Gratificações</td>
                          <td className="py-4 text-center">-</td>
                          <td className="py-4 text-right font-mono">{selectedReceipt.inputs.gratificacoes.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</td>
                          <td className="py-4 text-right font-mono">-</td>
                        </tr>
                      )}
                      {selectedReceipt.inputs.abonos > 0 && (
                        <tr className="border-b border-zinc-100">
                          <td className="py-4">07</td>
                          <td className="py-4">Abonos</td>
                          <td className="py-4 text-center">-</td>
                          <td className="py-4 text-right font-mono">{selectedReceipt.inputs.abonos.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</td>
                          <td className="py-4 text-right font-mono">-</td>
                        </tr>
                      )}
                      {selectedReceipt.inputs.acertosSalariais > 0 && (
                        <tr className="border-b border-zinc-100">
                          <td className="py-4">08</td>
                          <td className="py-4">Acertos Salariais</td>
                          <td className="py-4 text-center">-</td>
                          <td className="py-4 text-right font-mono">{selectedReceipt.inputs.acertosSalariais.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</td>
                          <td className="py-4 text-right font-mono">-</td>
                        </tr>
                      )}
                      {selectedReceipt.inputs.subsidioNatal > 0 && (
                        <tr className="border-b border-zinc-100">
                          <td className="py-4">09</td>
                          <td className="py-4">Subsídio de Natal</td>
                          <td className="py-4 text-center">-</td>
                          <td className="py-4 text-right font-mono">{selectedReceipt.inputs.subsidioNatal.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</td>
                          <td className="py-4 text-right font-mono">-</td>
                        </tr>
                      )}
                      {selectedReceipt.inputs.outrosSubsidios > 0 && (
                        <tr className="border-b border-zinc-100">
                          <td className="py-4">10</td>
                          <td className="py-4">Outros Subsídios</td>
                          <td className="py-4 text-center">-</td>
                          <td className="py-4 text-right font-mono">{selectedReceipt.inputs.outrosSubsidios.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</td>
                          <td className="py-4 text-right font-mono">-</td>
                        </tr>
                      )}
                      {selectedReceipt.calculations.overtimePay > 0 && (
                        <tr className="border-b border-zinc-100">
                          <td className="py-4">11</td>
                          <td className="py-4">Horas Extraordinárias (50%)</td>
                          <td className="py-4 text-center">{selectedReceipt.inputs.horasExtras} Hrs</td>
                          <td className="py-4 text-right font-mono">{selectedReceipt.calculations.overtimePay.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</td>
                          <td className="py-4 text-right font-mono">-</td>
                        </tr>
                      )}
                      
                      {/* Deductions */}
                      <tr className="border-b border-zinc-100">
                        <td className="py-4">D1</td>
                        <td className="py-4">Segurança Social (INSS 3%)</td>
                        <td className="py-4 text-center">3%</td>
                        <td className="py-4 text-right font-mono">-</td>
                        <td className="py-4 text-right font-mono text-red-600">{selectedReceipt.calculations.inss_worker.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</td>
                      </tr>
                      <tr className="border-b border-zinc-100">
                        <td className="py-4">D2</td>
                        <td className="py-4">Imposto sobre Rendimento (IRT)</td>
                        <td className="py-4 text-center">Tabela</td>
                        <td className="py-4 text-right font-mono">-</td>
                        <td className="py-4 text-right font-mono text-red-600">{selectedReceipt.calculations.irt.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</td>
                      </tr>
                      {selectedReceipt.calculations.absenceDeduction > 0 && (
                        <tr className="border-b border-zinc-100">
                          <td className="py-4">D3</td>
                          <td className="py-4">Faltas Injustificadas</td>
                          <td className="py-4 text-center">{selectedReceipt.inputs.faltasInjustificadas} Dias</td>
                          <td className="py-4 text-right font-mono">-</td>
                          <td className="py-4 text-right font-mono text-red-600">{selectedReceipt.calculations.absenceDeduction.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      )}
                      {selectedReceipt.calculations.lostHoursDeduction > 0 && (
                        <tr className="border-b border-zinc-100">
                          <td className="py-4">D4</td>
                          <td className="py-4">Horas Perdidas</td>
                          <td className="py-4 text-center">{selectedReceipt.inputs.horasPerdidas} Hrs</td>
                          <td className="py-4 text-right font-mono">-</td>
                          <td className="py-4 text-right font-mono text-red-600">{selectedReceipt.calculations.lostHoursDeduction.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      )}
                      {selectedReceipt.inputs.adiantamentos > 0 && (
                        <tr className="border-b border-zinc-100">
                          <td className="py-4">D5</td>
                          <td className="py-4">Adiantamentos</td>
                          <td className="py-4 text-center">-</td>
                          <td className="py-4 text-right font-mono">-</td>
                          <td className="py-4 text-right font-mono text-red-600">{selectedReceipt.inputs.adiantamentos.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      )}
                      {selectedReceipt.inputs.faltasJustificadas > 0 && (
                        <tr className="border-b border-zinc-100">
                          <td className="py-4">I1</td>
                          <td className="py-4 text-zinc-400 italic">Faltas Justificadas (Informativo)</td>
                          <td className="py-4 text-center text-zinc-400 italic">{selectedReceipt.inputs.faltasJustificadas} Dias</td>
                          <td className="py-4 text-right font-mono text-zinc-400 italic">-</td>
                          <td className="py-4 text-right font-mono text-zinc-400 italic">-</td>
                        </tr>
                      )}
                      {selectedReceipt.inputs.ferias > 0 && (
                        <tr className="border-b border-zinc-100">
                          <td className="py-4">I2</td>
                          <td className="py-4 text-zinc-400 italic">Férias (Informativo)</td>
                          <td className="py-4 text-center text-zinc-400 italic">{selectedReceipt.inputs.ferias} Dias</td>
                          <td className="py-4 text-right font-mono text-zinc-400 italic">-</td>
                          <td className="py-4 text-right font-mono text-zinc-400 italic">-</td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-zinc-900 text-white font-black text-xs uppercase tracking-widest">
                        <td colSpan={3} className="px-6 py-4">Totais</td>
                        <td className="px-6 py-4 text-right font-mono">{selectedReceipt.calculations.totalGross.toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4 text-right font-mono">{(selectedReceipt.calculations.inss_worker + selectedReceipt.calculations.irt + selectedReceipt.calculations.absenceDeduction + selectedReceipt.calculations.lostHoursDeduction + (selectedReceipt.inputs.adiantamentos || 0)).toLocaleString('pt-AO', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Net Summary */}
                <div className="flex justify-end mb-12">
                  <div className="w-full max-w-sm space-y-4">
                    <div className="flex justify-between items-center bg-[#003366] text-white p-6">
                      <span className="font-black text-xs uppercase tracking-[0.2em]">Total a Receber</span>
                      <span className="text-xl font-black font-mono">{selectedReceipt.calculations.totalNet.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })}</span>
                    </div>
                    <div className="p-4 border-2 border-dashed border-zinc-200 text-[10px] font-bold text-zinc-500 uppercase leading-relaxed italic">
                      Recebi a importância de {selectedReceipt.calculations.totalNet.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })} por extenso, correspondente ao vencimento do período acima indicado.
                    </div>
                  </div>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-24 mt-24">
                  <div className="text-center space-y-4">
                    <div className="border-t border-zinc-900 pt-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-900">A Administração</p>
                      <p className="text-[8px] font-bold text-zinc-400 uppercase mt-1">Assinatura e Carimbo</p>
                    </div>
                  </div>
                  <div className="text-center space-y-4">
                    <div className="border-t border-zinc-900 pt-4">
                      <p className="text-[10px] font-black uppercase tracking-widest text-zinc-900">{selectedReceipt.employee.name}</p>
                      <p className="text-[8px] font-bold text-zinc-400 uppercase mt-1">Assinatura do Colaborador</p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-12 pt-8 border-t border-zinc-100 text-center">
                  <p className="text-[8px] font-bold text-zinc-300 uppercase tracking-[0.5em]">Processado por Sistema TecnoSys ERP - {new Date().getFullYear()}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'active_employees' && (
          <div className="bg-white border border-zinc-200 rounded-none overflow-hidden shadow-sm">
            <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
              <h3 className="font-bold text-[#003366] uppercase tracking-widest text-xs">Lista de Trabalhadores Ativos</h3>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                  <input 
                    type="text" 
                    placeholder="Pesquisar..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-1.5 bg-white border border-zinc-200 rounded-none text-xs focus:outline-none focus:border-[#003366]" 
                  />
                </div>
                <button className="bg-white border border-zinc-200 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-zinc-50">
                  <Printer size={14} /> Imprimir
                </button>
                <button className="bg-[#DC2626] text-white px-3 py-1.5 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-[#b91c1c]">
                  <FileDown size={14} /> PDF
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-[#003366] text-white text-[10px] uppercase tracking-[0.2em] font-black">
                    <th className="px-6 py-4">Nome</th>
                    <th className="px-6 py-4">Cargo</th>
                    <th className="px-6 py-4 text-right">Salário Base</th>
                    <th className="px-6 py-4 text-right">INSS</th>
                    <th className="px-6 py-4 text-right">IRT</th>
                    <th className="px-6 py-4 text-right">Salário Líquido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredEmployees.filter(e => e.status === 'active').map(emp => {
                    const inss = (emp.salary || 0) * 0.03;
                    const irt = calculateIRT((emp.salary || 0) - inss);
                    const net = (emp.salary || 0) - inss - irt;
                    return (
                      <tr key={emp.id} className="hover:bg-zinc-50 transition-colors text-xs">
                        <td className="px-6 py-4 font-black text-[#003366] uppercase">{emp.name}</td>
                        <td className="px-6 py-4 font-bold text-zinc-700">{emp.role}</td>
                        <td className="px-6 py-4 text-right font-bold text-zinc-600">{formatCurrency(emp.salary)}</td>
                        <td className="px-6 py-4 text-right text-red-400 font-medium">{formatCurrency(inss)}</td>
                        <td className="px-6 py-4 text-right text-red-400 font-medium">{formatCurrency(irt)}</td>
                        <td className="px-6 py-4 text-right font-black text-emerald-600">{formatCurrency(net)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'list' && (
          <div className="flex gap-6 items-start">
            <div className="flex-1 bg-white border border-zinc-200 rounded-none overflow-hidden shadow-sm">
              <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                <h3 className="font-bold text-[#003366] uppercase tracking-widest text-xs">Quadro de Pessoal</h3>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                    <input 
                      type="text" 
                      placeholder="Pesquisar funcionário..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 pr-4 py-1.5 bg-white border border-zinc-200 rounded-none text-xs focus:outline-none focus:border-[#003366]" 
                    />
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-[#003366] text-white text-[10px] uppercase tracking-[0.2em] font-black">
                      <th className="px-6 py-4 w-16">Foto</th>
                      <th className="px-6 py-4">Nome Completo</th>
                      <th className="px-6 py-4">Cargo / Profissão</th>
                      <th className="px-6 py-4 text-right">Salário Base</th>
                      <th className="px-6 py-4 text-center">Estado</th>
                      <th className="px-6 py-4 text-center">Opção</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredEmployees.map(emp => {
                      return (
                        <tr 
                          key={emp.id} 
                          className={`hover:bg-zinc-50 transition-colors text-xs group cursor-pointer ${selectedEmployeeForOptions?.id === emp.id ? 'bg-zinc-50 border-l-4 border-l-[#003366]' : ''}`}
                        >
                          <td className="px-6 py-3">
                            <div className="w-10 h-10 bg-zinc-100 rounded-none border border-zinc-200 overflow-hidden flex items-center justify-center">
                              {emp.image_url ? (
                                <img src={emp.image_url} alt={emp.name} className="w-full h-full object-cover" />
                              ) : (
                                <UserIcon size={18} className="text-zinc-300" />
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 font-black text-[#003366] uppercase tracking-tight">
                            <div>{emp.name}</div>
                            <div className="text-[9px] text-zinc-400 font-normal lowercase">{emp.email}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-bold text-zinc-700">{emp.profession_name || emp.role}</div>
                            <div className="text-[9px] text-zinc-400 uppercase tracking-widest">{emp.department || 'Geral'}</div>
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-zinc-600">{formatCurrency(emp.salary)}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-none border ${emp.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                              {emp.status === 'active' ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button 
                              onClick={() => {
                                setSelectedEmployeeForOptions(emp);
                                setShowOptionsMenu(true);
                              }}
                              className="bg-[#003366] text-white px-4 py-1.5 text-[9px] font-black uppercase tracking-widest hover:bg-[#002244] transition-all shadow-sm"
                            >
                              Opção
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Central Options Menu for HR */}
            <AnimatePresence>
              {showOptionsMenu && selectedEmployeeForOptions && (
                <EmployeeOptionsMenu 
                  employee={selectedEmployeeForOptions} 
                  onClose={() => setShowOptionsMenu(false)} 
                />
              )}
            </AnimatePresence>
          </div>
        )}

        {activeTab === 'attendance_map' && (
          <div className="space-y-6">
            {/* Header Bar */}
            <div className="bg-[#003366] text-white p-4 flex items-center justify-between shadow-md">
              <div className="flex items-center gap-4">
                <div className="bg-white/10 p-2 rounded-none">
                  <Calculator size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold uppercase tracking-widest">Mapa de Assiduidade dos Funcionários</h2>
                  <p className="text-[10px] text-white/60 uppercase tracking-tighter">Gestão de Presenças e Faltas</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 text-xs font-black uppercase tracking-widest transition-all">
                  <Printer size={16} />
                </button>
              </div>
            </div>

            {/* Filters Section */}
            <div className="bg-white p-6 border border-zinc-200 shadow-sm flex flex-wrap items-end gap-6">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Empresa:</label>
                <select className="w-full border border-zinc-200 px-4 py-2 text-xs focus:outline-none focus:border-[#003366] font-bold text-[#003366]">
                  <option>Grupo TecnoSys</option>
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Local de Trabalho:</label>
                <select className="w-full border border-zinc-200 px-4 py-2 text-xs focus:outline-none focus:border-[#003366] font-bold text-[#003366]">
                  <option>Filial Lisboa</option>
                  <option>Sede Luanda</option>
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Mês/Ano:</label>
                <select 
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full border border-zinc-200 px-4 py-2 text-xs focus:outline-none focus:border-[#003366] font-bold text-[#003366]"
                >
                  {[
                    "Janeiro / 2026", "Fevereiro / 2026", "Março / 2026", "Abril / 2026", "Maio / 2026", "Junho / 2026",
                    "Julho / 2026", "Agosto / 2026", "Setembro / 2026", "Outubro / 2026", "Novembro / 2026", "Dezembro / 2026"
                  ].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <button 
                onClick={() => {
                  localEmployees.forEach(emp => {
                    const totals = calculateAttendanceTotals(emp.id);
                    setPayrollInputs(prev => ({
                      ...prev,
                      [emp.id]: {
                        ...(prev[emp.id] || { 
                          premios: 0, gratificacoes: 0, abonos: 0, subsidioNatal: 0, alojamento: 0, outrosSubsidios: 0,
                          subsidioTransporte: 0, subsidioAlimentacao: 0, diasTrabalho: 22, diasFolga: 8
                        }),
                        faltasJustificadas: totals.fj,
                        faltasInjustificadas: totals.fi,
                        ferias: totals.fe,
                        horasExtras: totals.he,
                        horasPerdidas: totals.hp,
                        diasTrabalho: totals.p,
                        diasFolga: totals.d
                      }
                    }));
                    setProcessedAttendance(prev => ({ ...prev, [emp.id]: true }));
                  });
                  setActiveTab('payroll');
                }}
                className="bg-[#F27D26] hover:bg-[#d96a1a] text-white px-8 py-2 text-xs font-black uppercase tracking-widest transition-all shadow-lg h-[38px]"
              >
                Processar Assiduidade
              </button>
            </div>

            {/* Attendance Grid */}
            <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1500px]">
                  <thead>
                    <tr className="bg-[#003366] text-white text-[10px] uppercase tracking-widest font-black">
                      <th className="px-4 py-4 border-r border-white/10 sticky left-0 bg-[#003366] z-10" rowSpan={2}>Funcionário</th>
                      <th className="px-2 py-2 border-r border-white/10 text-center" colSpan={5}>Resumo</th>
                      {[...Array(31)].map((_, i) => (
                        <th key={i} className="px-2 py-4 border-r border-white/10 text-center w-10">{i + 1}</th>
                      ))}
                    </tr>
                    <tr className="bg-[#003366]/90 text-white text-[9px] uppercase tracking-tighter font-bold">
                      <th className="px-2 py-2 border-r border-white/10 text-center">FJ</th>
                      <th className="px-2 py-2 border-r border-white/10 text-center">FI</th>
                      <th className="px-2 py-2 border-r border-white/10 text-center">FE</th>
                      <th className="px-2 py-2 border-r border-white/10 text-center">HE</th>
                      <th className="px-2 py-2 border-r border-white/10 text-center">HP</th>
                      {[...Array(31)].map((_, i) => (
                        <th key={i} className="px-2 py-2 border-r border-white/10 text-center">
                          <input type="checkbox" className="rounded-none accent-[#F27D26]" defaultChecked />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {/* Select All Row */}
                    <tr className="bg-zinc-50 text-[10px] font-black uppercase text-zinc-400">
                      <td className="px-4 py-3 border-r border-zinc-200 sticky left-0 bg-zinc-50 z-10 flex items-center gap-2">
                        <input type="checkbox" className="rounded-none accent-[#003366]" />
                        <span>Seldet:</span>
                        <select className="bg-transparent border-none text-[10px] font-black text-[#003366] focus:outline-none">
                          <option>Selecionar funcionários</option>
                        </select>
                      </td>
                      <td className="px-2 py-3 border-r border-zinc-200 text-center"></td>
                      <td className="px-2 py-3 border-r border-zinc-200 text-center"></td>
                      <td className="px-2 py-3 border-r border-zinc-200 text-center"></td>
                      <td className="px-2 py-3 border-r border-zinc-200 text-center"></td>
                      <td className="px-2 py-3 border-r border-zinc-200 text-center"></td>
                      {[...Array(31)].map((_, i) => (
                        <td key={i} className="px-2 py-3 border-r border-zinc-200 text-center">
                          <div className="w-6 h-6 bg-emerald-600 text-white flex items-center justify-center mx-auto rounded-sm">
                            <Check size={12} />
                          </div>
                        </td>
                      ))}
                    </tr>

                    {/* Employee Rows */}
                    {localEmployees.map(emp => (
                      <tr key={emp.id} className="hover:bg-zinc-50 transition-colors group">
                        <td className="px-4 py-4 border-r border-zinc-200 sticky left-0 bg-white group-hover:bg-zinc-50 z-10">
                          <div className="flex items-center gap-3">
                            <input type="checkbox" className="rounded-none accent-[#003366]" />
                            <div className="w-10 h-10 bg-zinc-100 rounded-none overflow-hidden border border-zinc-200">
                              {emp.image_url ? <img src={emp.image_url} className="w-full h-full object-cover" /> : <UserIcon size={16} className="text-zinc-300 m-auto mt-3" />}
                            </div>
                            <div>
                              <div className="font-black text-[#003366] uppercase text-xs">{emp.name}</div>
                              <div className="text-[9px] text-zinc-400 uppercase">Nº {1000 + emp.id} • {emp.role}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-4 border-r border-zinc-200 text-center font-bold text-xs">
                          {calculateAttendanceTotals(emp.id).fj}
                        </td>
                        <td className="px-2 py-4 border-r border-zinc-200 text-center font-bold text-xs">
                          {calculateAttendanceTotals(emp.id).fi}
                        </td>
                        <td className="px-2 py-4 border-r border-zinc-200 text-center font-bold text-xs">
                          {calculateAttendanceTotals(emp.id).fe}
                        </td>
                        <td className="px-2 py-4 border-r border-zinc-200 text-center font-bold text-xs">
                          {calculateAttendanceTotals(emp.id).he}
                        </td>
                        <td className="px-2 py-4 border-r border-zinc-200 text-center font-bold text-xs">
                          {calculateAttendanceTotals(emp.id).hp}
                        </td>
                        {[...Array(31)].map((_, i) => {
                          const day = i + 1;
                          const status = attendanceMap[emp.id]?.[day] || (day % 7 === 0 ? 'D' : 'P');
                          const colors: Record<string, string> = {
                            'P': 'bg-emerald-500',
                            'FJ': 'bg-blue-400',
                            'FI': 'bg-red-500',
                            'FE': 'bg-indigo-500',
                            'HE': 'bg-amber-400',
                            'HP': 'bg-zinc-400',
                            'D': 'bg-orange-500'
                          };
                          return (
                            <td key={i} className="px-1 py-4 border-r border-zinc-200 text-center relative">
                              <select 
                                value={status}
                                onChange={(e) => {
                                  const nextStatus = e.target.value;
                                  setAttendanceMap(prev => ({
                                    ...prev,
                                    [emp.id]: {
                                      ...(prev[emp.id] || {}),
                                      [day]: nextStatus
                                    }
                                  }));
                                }}
                                className={`w-8 h-8 ${colors[status]} text-white text-[9px] font-black rounded-sm appearance-none text-center focus:outline-none cursor-pointer hover:scale-110 transition-transform`}
                              >
                                <option value="P">P</option>
                                <option value="FJ">FJ</option>
                                <option value="FI">FI</option>
                                <option value="FE">FE</option>
                                <option value="HE">HE</option>
                                <option value="HP">HP</option>
                                <option value="D">D</option>
                              </select>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-zinc-50 font-black text-[#003366] text-xs">
                      <td className="px-4 py-4 border-r border-zinc-200 sticky left-0 bg-zinc-50 z-10 uppercase tracking-widest">Total Geral:</td>
                      <td className="px-2 py-4 border-r border-zinc-200 text-center">61</td>
                      <td className="px-2 py-4 border-r border-zinc-200 text-center">15</td>
                      <td className="px-2 py-4 border-r border-zinc-200 text-center"></td>
                      <td className="px-2 py-4 border-r border-zinc-200 text-center"></td>
                      <td className="px-2 py-4 border-r border-zinc-200 text-center"></td>
                      {[...Array(22)].map((_, i) => (
                        <td key={i} className="px-2 py-4 border-r border-zinc-200 text-center">
                          {i % 5 === 0 ? '19:00' : i % 3 === 0 ? '11:00' : '€ 210,00'}
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex gap-6 text-[9px] font-black uppercase tracking-widest text-zinc-400">
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500"></div> P: Presente</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-400"></div> FJ: Justificada</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500"></div> FI: Injustificada</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-indigo-500"></div> FE: Férias</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-amber-400"></div> HE: Hora Extra</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-zinc-400"></div> HP: Hora Perdida</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-orange-500"></div> D: Descanso</div>
              </div>
            </div>

            {/* Footer Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
              <div className="space-y-4">
                <div className="flex justify-between border-b border-zinc-100 pb-2">
                  <span className="text-xs font-bold text-[#003366] uppercase tracking-widest">Horas Totais Trabalhadas:</span>
                  <span className="text-sm font-black">435.00</span>
                </div>
                <div className="flex justify-between border-b border-zinc-100 pb-2">
                  <span className="text-xs font-bold text-[#003366] uppercase tracking-widest">Horas Totais Perdidas:</span>
                  <span className="text-sm font-black">11:00</span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Base Legal:</span>
                  <span className="text-xs font-bold text-zinc-600">Lei Geral do Trabalho</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-[#003366] uppercase tracking-widest">Desconto Faltas Injustificadas:</span>
                  <span className="text-sm font-black text-red-600">- € 180,00</span>
                </div>
                <div className="flex justify-between items-center bg-[#003366]/5 p-4 border border-[#003366]/10">
                  <span className="text-sm font-black text-[#003366] uppercase tracking-widest">Total de Vencimentos a Pagar:</span>
                  <span className="text-xl font-black text-[#003366]">€ 5.040,00</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'payroll' && (
          <div className="space-y-6">
            <div className="bg-[#003366] text-white p-4 flex justify-between items-center">
              <h2 className="text-lg font-black uppercase tracking-widest">LISTA DE PROCESSAMENTO DE SALÁRIO</h2>
              {isProcessingComplete && (
                <button 
                  onClick={() => setActiveTab('transfer_order')}
                  className="bg-[#F27D26] hover:bg-[#d96a1a] text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all animate-pulse"
                >
                  <ArrowRightLeft size={14} /> Transferir
                </button>
              )}
            </div>

            <div className="bg-white p-6 border border-zinc-200 shadow-sm flex flex-wrap items-end justify-between gap-6">
              <div className="flex gap-6 flex-wrap">
                <div className="min-w-[200px]">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Empresa:</label>
                  <select className="w-full border border-zinc-200 px-4 py-2 text-xs focus:outline-none focus:border-[#003366] font-bold text-[#003366]">
                    <option>Grupo TecnoSys</option>
                  </select>
                </div>
                <div className="min-w-[200px]">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Caixa de Pagamento:</label>
                  <select 
                    value={selectedPaymentCaixa}
                    onChange={(e) => setSelectedPaymentCaixa(e.target.value)}
                    className="w-full border border-zinc-200 px-4 py-2 text-xs focus:outline-none focus:border-[#003366] font-bold text-[#003366]"
                  >
                    <option value="">Selecionar Caixa...</option>
                    {caixas.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="min-w-[200px]">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Mês/Ano:</label>
                  <select className="w-full border border-zinc-200 px-4 py-2 text-xs focus:outline-none focus:border-[#003366] font-bold text-[#003366]">
                    <option>Março / 2026</option>
                    <option>Fevereiro / 2026</option>
                    <option>Janeiro / 2026</option>
                  </select>
                </div>
              </div>
              <div className="relative min-w-[300px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Pesquisar funcionário..." 
                  className="w-full border border-zinc-200 pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-[#003366]"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                disabled={!selectedPaymentCaixa}
                onClick={() => {
                  const receipts = localEmployees.map(emp => {
                    const inputs = payrollInputs[emp.id] || { 
                      premios: 0, gratificacoes: 0, abonos: 0, subsidioNatal: 0, alojamento: 0, outrosSubsidios: 0,
                      faltasJustificadas: 0, faltasInjustificadas: 0, ferias: 0, horasExtras: 0, horasPerdidas: 0,
                      subsidioTransporte: 0, subsidioAlimentacao: 0, adiantamentos: 0, acertos: 0, diasTrabalho: 22, diasFolga: 8
                    };
                    const inss_worker = emp.subject_to_inss !== false ? emp.salary * 0.03 : 0;
                    const base_taxable = emp.subject_to_irt !== false ? (emp.salary - inss_worker) : 0;
                    const irt = emp.subject_to_irt !== false ? calculateIRT(base_taxable) : 0;
                    
                    const dailyRate = emp.salary / 22;
                    const hourlyRate = emp.salary / 173.33;
                    const overtimeRate = hourlyRate * 1.5;
                    const absenceDeduction = inputs.faltasInjustificadas * dailyRate;
                    const lostHoursDeduction = inputs.horasPerdidas * hourlyRate;
                    const overtimePay = inputs.horasExtras * overtimeRate;
                    
                    const totalGross = emp.salary + inputs.premios + inputs.gratificacoes + inputs.abonos + 
                                     inputs.subsidioNatal + inputs.alojamento + inputs.outrosSubsidios + 
                                     inputs.subsidioTransporte + inputs.subsidioAlimentacao + overtimePay + inputs.acertos;
                    
                    const totalNet = totalGross - inss_worker - irt - absenceDeduction - lostHoursDeduction - inputs.adiantamentos;

                    return {
                      id: emp.id,
                      employee: emp,
                      inputs,
                      calculations: {
                        inss_worker,
                        irt,
                        absenceDeduction,
                        lostHoursDeduction,
                        overtimePay,
                        totalGross,
                        totalNet,
                        dailyRate,
                        hourlyRate,
                        overtimeRate
                      },
                      period: selectedMonth,
                      paymentDate: new Date().toLocaleDateString('pt-AO')
                    };
                  });
                  setProcessedReceipts(receipts);
                  setIsProcessingComplete(true);
                  alert('Processamento concluído com sucesso para o caixa selecionado.');
                }}
                className={`px-8 py-2 text-xs font-black uppercase tracking-widest transition-all shadow-lg ${!selectedPaymentCaixa ? 'bg-zinc-300 cursor-not-allowed' : 'bg-[#F27D26] hover:bg-[#d96a1a] text-white'}`}
              >
                EXECUTAR PROCESSAMENTO
              </button>
              <div className="flex-1"></div>
              <button className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white px-4 py-2 text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2">
                <Printer size={14} /> Imprimir Lista
              </button>
              <button className="bg-[#DC2626] hover:bg-[#b91c1c] text-white px-4 py-2 text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2">
                <FileDown size={14} /> Baixar PDF
              </button>
              <button className="bg-[#16A34A] hover:bg-[#15803d] text-white px-4 py-2 text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2">
                <FileSpreadsheet size={14} /> Baixar Excel
              </button>
            </div>

            <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
              {!selectedPaymentCaixa ? (
                <div className="p-20 text-center space-y-6 bg-zinc-50/50">
                  <div className="w-24 h-24 bg-[#003366]/5 rounded-full flex items-center justify-center mx-auto border-2 border-dashed border-[#003366]/20">
                    <Wallet size={40} className="text-[#003366]/30" />
                  </div>
                  <div className="max-w-md mx-auto">
                    <h3 className="text-sm font-black text-[#003366] uppercase tracking-widest mb-2">Seleção de Caixa Obrigatória</h3>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase leading-relaxed">
                      Para visualizar a lista de processamento e executar os pagamentos, deve primeiro selecionar o caixa de pagamento correspondente no menu acima.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[1500px]">
                    <thead>
                      <tr className="bg-[#1e293b] text-white text-[9px] uppercase tracking-widest font-black">
                        <th className="px-4 py-4 border-r border-white/10 w-10 sticky left-0 bg-[#1e293b] z-20">
                          <input type="checkbox" className="rounded-none accent-[#F27D26]" />
                        </th>
                        <th className="px-4 py-4 border-r border-white/10 sticky left-10 bg-[#1e293b] z-20 min-w-[250px]">FUNCIONÁRIO</th>
                        <th className="px-2 py-4 border-r border-white/10 text-center">DIAS TRAB.</th>
                        <th className="px-2 py-4 border-r border-white/10 text-center">DIAS FOLGA</th>
                        <th className="px-2 py-4 border-r border-white/10 text-center">F. JUST.</th>
                        <th className="px-2 py-4 border-r border-white/10 text-center">F. INJUST.</th>
                        <th className="px-2 py-4 border-r border-white/10 text-center">FÉRIAS</th>
                        <th className="px-2 py-4 border-r border-white/10 text-center">H. EXTRAS</th>
                        <th className="px-2 py-4 border-r border-white/10 text-center">H. PERDIDAS</th>
                        <th className="px-2 py-4 border-r border-white/10 text-center">PREMIOS</th>
                        <th className="px-2 py-4 border-r border-white/10 text-center">GRATIFICAÇÕES</th>
                        <th className="px-2 py-4 border-r border-white/10 text-center">ABONOS</th>
                        <th className="px-2 py-4 border-r border-white/10 text-center">SUBS. NATAL</th>
                        <th className="px-2 py-4 border-r border-white/10 text-center">ALOJAMENTO</th>
                        <th className="px-2 py-4 border-r border-white/10 text-center">SUBS. TRANSP.</th>
                        <th className="px-2 py-4 border-r border-white/10 text-center">SUBS. ALIM.</th>
                        <th className="px-2 py-4 border-r border-white/10 text-center">OUTROS SUBS.</th>
                        <th className="px-2 py-4 border-r border-white/10 text-center">ADIANTAMENTOS</th>
                        <th className="px-2 py-4 border-r border-white/10 text-center">ACERTOS</th>
                        <th className="px-4 py-4 border-r border-white/10 text-center sticky right-0 bg-[#1e293b] z-20">VALOR PROCESSADO</th>
                        <th className="px-4 py-4 text-center">OPÇÕES</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      <tr className="bg-zinc-50/50 text-[9px] font-black text-zinc-400 uppercase">
                        <td className="px-4 py-2 border-r border-zinc-200"></td>
                        <td className="px-4 py-2 border-r border-zinc-200" colSpan={11}>Empresa: Grupo TecnoSys • Caixa: {selectedPaymentCaixa.replace('_', ' ').toUpperCase()}</td>
                      </tr>
                      {localEmployees.map(emp => {
                      const inputs = payrollInputs[emp.id] || { 
                        premios: 0, gratificacoes: 0, abonos: 0, subsidioNatal: 0, alojamento: 0, outrosSubsidios: 0,
                        faltasJustificadas: 0, faltasInjustificadas: 0, ferias: 0, horasExtras: 0, horasPerdidas: 0,
                        subsidioTransporte: 0, subsidioAlimentacao: 0, diasTrabalho: 22, diasFolga: 8
                      };
                      
                      const inss_worker = emp.subject_to_inss !== false ? emp.salary * 0.03 : 0;
                      const base_taxable = emp.subject_to_irt !== false ? (emp.salary - inss_worker) : 0;
                      const irt = emp.subject_to_irt !== false ? calculateIRT(base_taxable) : 0;
                      
                      const dailyRate = emp.salary / 22;
                      const hourlyRate = emp.salary / 173.33;
                      const overtimeRate = hourlyRate * 1.5;
                      const absenceDeduction = inputs.faltasInjustificadas * dailyRate;
                      const lostHoursDeduction = inputs.horasPerdidas * hourlyRate;
                      const overtimePay = inputs.horasExtras * overtimeRate;
                      
                      const totalGross = emp.salary + inputs.premios + inputs.gratificacoes + inputs.abonos + 
                                       inputs.subsidioNatal + inputs.alojamento + inputs.outrosSubsidios + 
                                       inputs.subsidioTransporte + inputs.subsidioAlimentacao + overtimePay + inputs.acertos;
                      
                      const totalNet = totalGross - inss_worker - irt - absenceDeduction - lostHoursDeduction - inputs.adiantamentos;

                      const receipt = {
                        id: emp.id,
                        employee: emp,
                        inputs,
                        calculations: {
                          inss_worker,
                          irt,
                          absenceDeduction,
                          lostHoursDeduction,
                          overtimePay,
                          totalGross,
                          totalNet,
                          dailyRate,
                          hourlyRate,
                          overtimeRate
                        },
                        period: selectedMonth,
                        paymentDate: new Date().toLocaleDateString('pt-AO')
                      };
                      
                      return (
                        <tr key={emp.id} className="hover:bg-zinc-50 transition-colors group">
                          <td className="px-4 py-4 border-r border-zinc-200 sticky left-0 bg-white group-hover:bg-zinc-50 z-10">
                            <input type="checkbox" className="rounded-none accent-[#003366]" />
                          </td>
                          <td className="px-4 py-4 border-r border-zinc-200 sticky left-10 bg-white group-hover:bg-zinc-50 z-10">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-zinc-100 rounded-none overflow-hidden border border-zinc-200 flex items-center justify-center">
                                {emp.image_url ? <img src={emp.image_url} className="w-full h-full object-cover" /> : <UserIcon size={16} className="text-zinc-300" />}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <div className="font-black text-[#003366] uppercase text-xs">{emp.name}</div>
                                  {processedAttendance[emp.id] && (
                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-600 text-[8px] font-black uppercase tracking-widest border border-emerald-200">
                                      Processado
                                    </span>
                                  )}
                                </div>
                                <div className="text-[9px] text-zinc-400 uppercase">Nº {String(emp.id).padStart(3, '0')} • {emp.role}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-2 py-4 border-r border-zinc-200">
                            <input 
                              type="number" 
                              value={inputs.diasTrabalho}
                              onChange={(e) => updatePayrollInput(emp.id, 'diasTrabalho', Number(e.target.value))}
                              className="w-16 border border-zinc-200 px-1 py-1 text-center text-xs focus:outline-none focus:border-[#003366]" 
                            />
                          </td>
                          <td className="px-2 py-4 border-r border-zinc-200">
                            <input 
                              type="number" 
                              value={inputs.diasFolga}
                              onChange={(e) => updatePayrollInput(emp.id, 'diasFolga', Number(e.target.value))}
                              className="w-16 border border-zinc-200 px-1 py-1 text-center text-xs focus:outline-none focus:border-[#003366]" 
                            />
                          </td>
                          <td className="px-2 py-4 border-r border-zinc-200">
                            <input 
                              type="number" 
                              value={inputs.faltasJustificadas}
                              onChange={(e) => updatePayrollInput(emp.id, 'faltasJustificadas', Number(e.target.value))}
                              className="w-16 border border-zinc-200 px-1 py-1 text-center text-xs focus:outline-none focus:border-[#003366]" 
                            />
                          </td>
                          <td className="px-2 py-4 border-r border-zinc-200">
                            <input 
                              type="number" 
                              value={inputs.faltasInjustificadas}
                              onChange={(e) => updatePayrollInput(emp.id, 'faltasInjustificadas', Number(e.target.value))}
                              className="w-16 border border-zinc-200 px-1 py-1 text-center text-xs focus:outline-none focus:border-[#003366]" 
                            />
                          </td>
                          <td className="px-2 py-4 border-r border-zinc-200">
                            <input 
                              type="number" 
                              value={inputs.ferias}
                              onChange={(e) => updatePayrollInput(emp.id, 'ferias', Number(e.target.value))}
                              className="w-16 border border-zinc-200 px-1 py-1 text-center text-xs focus:outline-none focus:border-[#003366]" 
                            />
                          </td>
                          <td className="px-2 py-4 border-r border-zinc-200">
                            <input 
                              type="number" 
                              value={inputs.horasExtras}
                              onChange={(e) => updatePayrollInput(emp.id, 'horasExtras', Number(e.target.value))}
                              className="w-16 border border-zinc-200 px-1 py-1 text-center text-xs focus:outline-none focus:border-[#003366]" 
                            />
                          </td>
                          <td className="px-2 py-4 border-r border-zinc-200">
                            <input 
                              type="number" 
                              value={inputs.horasPerdidas}
                              onChange={(e) => updatePayrollInput(emp.id, 'horasPerdidas', Number(e.target.value))}
                              className="w-16 border border-zinc-200 px-1 py-1 text-center text-xs focus:outline-none focus:border-[#003366]" 
                            />
                          </td>
                          <td className="px-2 py-4 border-r border-zinc-200">
                            <input 
                              type="number" 
                              value={inputs.premios}
                              onChange={(e) => updatePayrollInput(emp.id, 'premios', Number(e.target.value))}
                              className="w-20 border border-zinc-200 px-1 py-1 text-center text-xs focus:outline-none focus:border-[#003366]" 
                            />
                          </td>
                          <td className="px-2 py-4 border-r border-zinc-200">
                            <input 
                              type="number" 
                              value={inputs.gratificacoes}
                              onChange={(e) => updatePayrollInput(emp.id, 'gratificacoes', Number(e.target.value))}
                              className="w-20 border border-zinc-200 px-1 py-1 text-center text-xs focus:outline-none focus:border-[#003366]" 
                            />
                          </td>
                          <td className="px-2 py-4 border-r border-zinc-200">
                            <input 
                              type="number" 
                              value={inputs.abonos}
                              onChange={(e) => updatePayrollInput(emp.id, 'abonos', Number(e.target.value))}
                              className="w-20 border border-zinc-200 px-1 py-1 text-center text-xs focus:outline-none focus:border-[#003366]" 
                            />
                          </td>
                          <td className="px-2 py-4 border-r border-zinc-200">
                            <input 
                              type="number" 
                              value={inputs.subsidioNatal}
                              onChange={(e) => updatePayrollInput(emp.id, 'subsidioNatal', Number(e.target.value))}
                              className="w-20 border border-zinc-200 px-1 py-1 text-center text-xs focus:outline-none focus:border-[#003366]" 
                            />
                          </td>
                          <td className="px-2 py-4 border-r border-zinc-200">
                            <input 
                              type="number" 
                              value={inputs.alojamento}
                              onChange={(e) => updatePayrollInput(emp.id, 'alojamento', Number(e.target.value))}
                              className="w-20 border border-zinc-200 px-1 py-1 text-center text-xs focus:outline-none focus:border-[#003366]" 
                            />
                          </td>
                          <td className="px-2 py-4 border-r border-zinc-200">
                            <input 
                              type="number" 
                              value={inputs.subsidioTransporte}
                              onChange={(e) => updatePayrollInput(emp.id, 'subsidioTransporte', Number(e.target.value))}
                              className="w-20 border border-zinc-200 px-1 py-1 text-center text-xs focus:outline-none focus:border-[#003366]" 
                            />
                          </td>
                          <td className="px-2 py-4 border-r border-zinc-200">
                            <input 
                              type="number" 
                              value={inputs.subsidioAlimentacao}
                              onChange={(e) => updatePayrollInput(emp.id, 'subsidioAlimentacao', Number(e.target.value))}
                              className="w-20 border border-zinc-200 px-1 py-1 text-center text-xs focus:outline-none focus:border-[#003366]" 
                            />
                          </td>
                          <td className="px-2 py-4 border-r border-zinc-200">
                            <input 
                              type="number" 
                              value={inputs.outrosSubsidios}
                              onChange={(e) => updatePayrollInput(emp.id, 'outrosSubsidios', Number(e.target.value))}
                              className="w-20 border border-zinc-200 px-1 py-1 text-center text-xs focus:outline-none focus:border-[#003366]" 
                            />
                          </td>
                          <td className="px-2 py-4 border-r border-zinc-200">
                            <input 
                              type="number" 
                              value={inputs.adiantamentos}
                              onChange={(e) => updatePayrollInput(emp.id, 'adiantamentos', Number(e.target.value))}
                              className="w-20 border border-zinc-200 px-1 py-1 text-center text-xs focus:outline-none focus:border-[#003366]" 
                            />
                          </td>
                          <td className="px-2 py-4 border-r border-zinc-200">
                            <input 
                              type="number" 
                              value={inputs.acertos}
                              onChange={(e) => updatePayrollInput(emp.id, 'acertos', Number(e.target.value))}
                              className="w-20 border border-zinc-200 px-1 py-1 text-center text-xs focus:outline-none focus:border-[#003366]" 
                            />
                          </td>
                          <td className="px-4 py-4 border-r border-zinc-200 text-right sticky right-0 bg-white group-hover:bg-zinc-50 z-10">
                            <div className="flex flex-col items-end">
                              <div className="font-black text-[#16A34A] font-mono">{formatCurrency(totalNet)}</div>
                              <button 
                                onClick={() => setDraftReceipt(receipt)}
                                className="flex items-center gap-1 text-[8px] text-[#003366] hover:text-[#F27D26] mt-1 uppercase font-black"
                              >
                                <Eye size={10} /> Visualizar Recibo
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => {
                                  setAppSelectedEmployee(emp);
                                  setActiveTab('transfer_order');
                                }}
                                className="bg-[#003366] text-white px-3 py-1.5 text-[9px] font-black uppercase tracking-widest hover:bg-[#002244] flex items-center gap-1"
                              >
                                <ArrowRightLeft size={10} /> Ordem
                              </button>
                              <button className="bg-red-600 text-white px-3 py-1.5 text-[9px] font-black uppercase tracking-widest hover:bg-red-700">
                                Apagar
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-zinc-50 font-black text-[#003366] text-[10px] uppercase tracking-widest">
                      <td className="px-4 py-4 border-r border-zinc-200 sticky left-0 bg-zinc-50 z-10"></td>
                      <td className="px-4 py-4 border-r border-zinc-200 sticky left-10 bg-zinc-50 z-10">TOTAL GERAL</td>
                      <td className="px-2 py-4 border-r border-zinc-200 text-center">{(localEmployees || []).reduce((sum, emp) => sum + (payrollInputs[emp.id]?.diasTrabalho || 22), 0)}</td>
                      <td className="px-2 py-4 border-r border-zinc-200 text-center">{(localEmployees || []).reduce((sum, emp) => sum + (payrollInputs[emp.id]?.diasFolga || 8), 0)}</td>
                      <td className="px-2 py-4 border-r border-zinc-200 text-center">{(localEmployees || []).reduce((sum, emp) => sum + (payrollInputs[emp.id]?.faltasJustificadas || 0), 0)}</td>
                      <td className="px-2 py-4 border-r border-zinc-200 text-center">{(localEmployees || []).reduce((sum, emp) => sum + (payrollInputs[emp.id]?.faltasInjustificadas || 0), 0)}</td>
                      <td className="px-2 py-4 border-r border-zinc-200 text-center">{(localEmployees || []).reduce((sum, emp) => sum + (payrollInputs[emp.id]?.ferias || 0), 0)}</td>
                      <td className="px-2 py-4 border-r border-zinc-200 text-center">{(localEmployees || []).reduce((sum, emp) => sum + (payrollInputs[emp.id]?.horasExtras || 0), 0)}</td>
                      <td className="px-2 py-4 border-r border-zinc-200 text-center">{(localEmployees || []).reduce((sum, emp) => sum + (payrollInputs[emp.id]?.horasPerdidas || 0), 0)}</td>
                      <td className="px-2 py-4 border-r border-zinc-200 text-center">
                        {formatCurrency((localEmployees || []).reduce((sum, emp) => sum + (payrollInputs[emp.id]?.premios || 0), 0)).replace('€', '')} Kz
                      </td>
                      <td className="px-2 py-4 border-r border-zinc-200 text-center">
                        {formatCurrency((localEmployees || []).reduce((sum, emp) => sum + (payrollInputs[emp.id]?.gratificacoes || 0), 0)).replace('€', '')} Kz
                      </td>
                      <td className="px-2 py-4 border-r border-zinc-200 text-center">
                        {formatCurrency((localEmployees || []).reduce((sum, emp) => sum + (payrollInputs[emp.id]?.abonos || 0), 0)).replace('€', '')} Kz
                      </td>
                      <td className="px-2 py-4 border-r border-zinc-200 text-center">
                        {formatCurrency((localEmployees || []).reduce((sum, emp) => sum + (payrollInputs[emp.id]?.subsidioNatal || 0), 0)).replace('€', '')} Kz
                      </td>
                      <td className="px-2 py-4 border-r border-zinc-200 text-center">
                        {formatCurrency((localEmployees || []).reduce((sum, emp) => sum + (payrollInputs[emp.id]?.alojamento || 0), 0)).replace('€', '')} Kz
                      </td>
                      <td className="px-2 py-4 border-r border-zinc-200 text-center">
                        {formatCurrency((localEmployees || []).reduce((sum, emp) => sum + (payrollInputs[emp.id]?.subsidioTransporte || 0), 0)).replace('€', '')} Kz
                      </td>
                      <td className="px-2 py-4 border-r border-zinc-200 text-center">
                        {formatCurrency((localEmployees || []).reduce((sum, emp) => sum + (payrollInputs[emp.id]?.subsidioAlimentacao || 0), 0)).replace('€', '')} Kz
                      </td>
                      <td className="px-2 py-4 border-r border-zinc-200 text-center">
                        {formatCurrency((localEmployees || []).reduce((sum, emp) => sum + (payrollInputs[emp.id]?.outrosSubsidios || 0), 0))}
                      </td>
                      <td className="px-2 py-4 border-r border-zinc-200 text-center">
                        {formatCurrency((localEmployees || []).reduce((sum, emp) => sum + (payrollInputs[emp.id]?.adiantamentos || 0), 0))}
                      </td>
                      <td className="px-2 py-4 border-r border-zinc-200 text-center">
                        {formatCurrency((localEmployees || []).reduce((sum, emp) => sum + (payrollInputs[emp.id]?.acertos || 0), 0))}
                      </td>
                      <td className="px-4 py-4 border-r border-zinc-200 text-center text-[#F27D26] sticky right-0 bg-zinc-50 z-10">
                        {formatCurrency((localEmployees || []).reduce((sum, emp) => {
                          const inputs = payrollInputs[emp.id] || { 
                            premios: 0, gratificacoes: 0, abonos: 0, subsidioNatal: 0, alojamento: 0, outrosSubsidios: 0,
                            faltasJustificadas: 0, faltasInjustificadas: 0, ferias: 0, horasExtras: 0, horasPerdidas: 0,
                            subsidioTransporte: 0, subsidioAlimentacao: 0, adiantamentos: 0, acertos: 0, diasTrabalho: 22, diasFolga: 8
                          };
                          const inss_worker = emp.subject_to_inss !== false ? emp.salary * 0.03 : 0;
                          const base_taxable = emp.subject_to_irt !== false ? (emp.salary - inss_worker) : 0;
                          const irt = emp.subject_to_irt !== false ? calculateIRT(base_taxable) : 0;
                          
                          const dailyRate = emp.salary / 22;
                          const hourlyRate = emp.salary / 173.33;
                          const overtimeRate = hourlyRate * 1.5;
                          const absenceDeduction = inputs.faltasInjustificadas * dailyRate;
                          const lostHoursDeduction = inputs.horasPerdidas * hourlyRate;
                          const overtimePay = inputs.horasExtras * overtimeRate;
                          
                          const totalGross = emp.salary + inputs.premios + inputs.gratificacoes + inputs.abonos + 
                                           inputs.subsidioNatal + inputs.alojamento + inputs.outrosSubsidios + 
                                           inputs.subsidioTransporte + inputs.subsidioAlimentacao + overtimePay + inputs.acertos;
                          
                          const totalNet = totalGross - inss_worker - irt - absenceDeduction - lostHoursDeduction - inputs.adiantamentos;
                          return sum + totalNet;
                        }, 0))}
                      </td>
                      <td className="px-4 py-4"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              )}
            </div>

            <div className="flex flex-col gap-4 mt-6">
              <div className="text-sm font-bold text-zinc-700">Funcionários: {localEmployees.length}</div>
              <div className="flex justify-between items-center border-t border-zinc-200 pt-4">
                <div className="text-sm font-black text-[#003366] uppercase tracking-widest">
                  Total Processado: <span className="text-lg">{formatCurrency((localEmployees || []).reduce((sum, emp) => {
                    const inputs = payrollInputs[emp.id] || { 
                      premios: 0, gratificacoes: 0, abonos: 0, subsidioNatal: 0, alojamento: 0, outrosSubsidios: 0,
                      faltasJustificadas: 0, faltasInjustificadas: 0, ferias: 0, horasExtras: 0, horasPerdidas: 0,
                      subsidioTransporte: 0, subsidioAlimentacao: 0, diasTrabalho: 22, diasFolga: 8
                    };
                    const dailyRate = emp.salary / 22;
                    const overtimeRate = (emp.salary / 173.33) * 1.5;
                    const absenceDeduction = inputs.faltasInjustificadas * dailyRate;
                    const lostHoursDeduction = inputs.horasPerdidas * (emp.salary / 173.33);
                    const overtimePay = inputs.horasExtras * overtimeRate;
                    
                    return sum + (emp.salary + inputs.premios + inputs.gratificacoes + inputs.abonos + 
                                 inputs.subsidioNatal + inputs.alojamento + inputs.outrosSubsidios + 
                                 inputs.subsidioTransporte + inputs.subsidioAlimentacao + overtimePay - 
                                 absenceDeduction - lostHoursDeduction);
                  }, 0)).replace('€', '')} Kz</span>
                </div>
              </div>
            </div>
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
                  onClick={() => {
                    setShowProfessionForm(false);
                    setTimeout(() => {
                      professionsRef.current?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }}
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
                      className="w-full bg-zinc-50 border border-zinc-300 rounded-none px-4 py-2 text-sm focus:outline-none focus:border-[#003366]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Salário Base</label>
                    <input 
                      type="number" 
                      value={baseSalary}
                      onChange={e => setBaseSalary(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-zinc-50 border border-zinc-300 rounded-none px-4 py-2 text-sm focus:outline-none focus:border-[#003366]"
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
                      await fetchWithAuth('/api/professions', {
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

            <div ref={professionsRef} className="bg-white border border-zinc-200 rounded-none overflow-hidden shadow-sm">
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
              <h3 className="font-bold text-[#003366]">Efetividade Diária</h3>
              <input 
                type="date" 
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="bg-zinc-50 border border-zinc-200 rounded px-3 py-1 text-xs" 
              />
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="bg-zinc-50 text-[10px] font-bold uppercase text-zinc-400">
                  <th className="px-6 py-4">Funcionário</th>
                  <th className="px-6 py-4">Estado Atual</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {Array.isArray(localEmployees) && localEmployees.map(emp => {
                  const record = attendance.find(a => a.employee_id === emp.id);
                  return (
                    <tr key={emp.id} className="text-sm">
                      <td className="px-6 py-4 font-medium text-zinc-800">{emp.name}</td>
                      <td className="px-6 py-4">
                        {record ? (
                          <span className={`px-2 py-0.5 rounded-none text-[9px] font-black uppercase tracking-widest border ${
                            record.status === 'present' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            record.status === 'late' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                            'bg-red-50 text-red-600 border-red-100'
                          }`}>
                            {record.status === 'present' ? 'Presente' : record.status === 'late' ? 'Atrasado' : 'Ausente'}
                          </span>
                        ) : (
                          <span className="text-zinc-300 italic">Pendente</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleMarkAttendance(emp.id, 'present')}
                            className="px-2 py-1 bg-emerald-600 text-white text-[9px] font-bold uppercase hover:bg-emerald-700"
                          >
                            Presente
                          </button>
                          <button 
                            onClick={() => handleMarkAttendance(emp.id, 'late')}
                            className="px-2 py-1 bg-amber-500 text-white text-[9px] font-bold uppercase hover:bg-amber-600"
                          >
                            Atraso
                          </button>
                          <button 
                            onClick={() => handleMarkAttendance(emp.id, 'absent')}
                            className="px-2 py-1 bg-red-600 text-white text-[9px] font-bold uppercase hover:bg-red-700"
                          >
                            Ausente
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'absences' && (
          <div className="bg-white border border-zinc-200 rounded-none overflow-hidden shadow-sm p-6">
            <h3 className="font-bold text-[#003366] mb-6">Gestão de Férias & Ausências</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-zinc-50 p-6 border border-zinc-100">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4">Registar Ausência</h4>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const empId = (form.elements.namedItem('employee') as HTMLSelectElement).value;
                  const start = (form.elements.namedItem('start') as HTMLInputElement).value;
                  const end = (form.elements.namedItem('end') as HTMLInputElement).value;
                  const reason = (form.elements.namedItem('reason') as HTMLInputElement).value;
                  if (empId && start && end && reason) {
                    handleAddAbsence(Number(empId), start, end, reason);
                    form.reset();
                  }
                }} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Funcionário</label>
                    <select name="employee" className="w-full border border-zinc-200 px-3 py-2 text-xs">
                      <option value="">Selecionar...</option>
                      {localEmployees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Início</label>
                    <input type="date" name="start" className="w-full border border-zinc-200 px-3 py-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Fim</label>
                    <input type="date" name="end" className="w-full border border-zinc-200 px-3 py-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Motivo</label>
                    <input type="text" name="reason" className="w-full border border-zinc-200 px-3 py-2 text-xs" />
                  </div>
                  <button type="submit" className="w-full bg-[#003366] text-white py-2 text-[10px] font-black uppercase tracking-widest hover:bg-[#002244]">
                    Registar
                  </button>
                </form>
              </div>
              <div className="md:col-span-2">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-zinc-50 text-[10px] font-bold uppercase text-zinc-400">
                      <th className="px-6 py-4">Funcionário</th>
                      <th className="px-6 py-4">Período</th>
                      <th className="px-6 py-4">Motivo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {absences.map(abs => (
                      <tr key={abs.id} className="text-xs">
                        <td className="px-6 py-4 font-bold text-[#003366]">{abs.employee_name}</td>
                        <td className="px-6 py-4 text-zinc-500">{abs.start_date} - {abs.end_date}</td>
                        <td className="px-6 py-4 text-zinc-500 italic">{abs.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
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
                          {Array.isArray(localEmployees) && localEmployees.map(emp => {
  const inss3 = emp.salary * 0.03;
  const inss8 = emp.salary * 0.08;
  const irtBase = emp.salary - inss3;
  const irt = calculateIRT(irtBase);
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
                            <td className="px-6 py-4 text-right">{formatCurrency(Array.isArray(localEmployees) ? localEmployees.reduce((sum, e) => sum + e.salary, 0) : 0)}</td>
                            <td className="px-6 py-4 text-right text-red-500">{formatCurrency(Array.isArray(localEmployees) ? localEmployees.reduce((sum, e) => sum + e.salary * 0.03, 0) : 0)}</td>
                            <td className="px-6 py-4 text-right text-red-500">{formatCurrency(Array.isArray(localEmployees) ? localEmployees.reduce((sum, e) => sum + calculateIRT(e.salary - (e.salary * 0.03)), 0) : 0)}</td>
                            <td className="px-6 py-4 text-right text-emerald-600">{formatCurrency(Array.isArray(localEmployees) ? localEmployees.reduce((sum, e) => {
                              const inss3 = e.salary * 0.03;
                              const irt = calculateIRT(e.salary - inss3);
                              return sum + (e.salary - inss3 - irt);
                            }, 0) : 0)}</td>
                            <td className="px-6 py-4 text-right text-zinc-500">{formatCurrency(Array.isArray(localEmployees) ? localEmployees.reduce((sum, e) => sum + e.salary * 0.08, 0) : 0)}</td>
                            <td className="px-6 py-4 text-right text-[#003366]">{formatCurrency(Array.isArray(localEmployees) ? localEmployees.reduce((sum, e) => sum + e.salary * 1.08, 0) : 0)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
                
                {selectedReport === 'inss' && (
                  <div className="bg-white border border-zinc-200 rounded-none overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-zinc-100 bg-zinc-50 flex justify-between items-center">
                      <h3 className="font-bold text-[#003366]">Mapa de INSS - {new Date().toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[#003366] text-white text-[10px] uppercase tracking-wider font-bold">
                            <th className="px-6 py-4">Funcionário</th>
                            <th className="px-6 py-4 text-right">Salário Base</th>
                            <th className="px-6 py-4 text-right">Segurado (3%)</th>
                            <th className="px-6 py-4 text-right">Empresa (8%)</th>
                            <th className="px-6 py-4 text-right">Total (11%)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {Array.isArray(localEmployees) && localEmployees.map(emp => (
                            <tr key={emp.id} className="hover:bg-zinc-50 transition-colors text-xs">
                              <td className="px-6 py-4 font-bold text-[#003366]">{emp.name}</td>
                              <td className="px-6 py-4 text-right">{formatCurrency(emp.salary)}</td>
                              <td className="px-6 py-4 text-right text-red-500">{formatCurrency(emp.salary * 0.03)}</td>
                              <td className="px-6 py-4 text-right text-zinc-500">{formatCurrency(emp.salary * 0.08)}</td>
                              <td className="px-6 py-4 text-right font-bold text-[#003366]">{formatCurrency(emp.salary * 0.11)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-zinc-50 font-bold text-xs">
                            <td className="px-6 py-4 text-[#003366]">TOTAIS</td>
                            <td className="px-6 py-4 text-right">{formatCurrency(Array.isArray(localEmployees) ? localEmployees.reduce((sum, e) => sum + e.salary, 0) : 0)}</td>
                            <td className="px-6 py-4 text-right text-red-500">{formatCurrency(Array.isArray(localEmployees) ? localEmployees.reduce((sum, e) => sum + e.salary * 0.03, 0) : 0)}</td>
                            <td className="px-6 py-4 text-right text-zinc-500">{formatCurrency(Array.isArray(localEmployees) ? localEmployees.reduce((sum, e) => sum + e.salary * 0.08, 0) : 0)}</td>
                            <td className="px-6 py-4 text-right text-[#003366]">{formatCurrency(Array.isArray(localEmployees) ? localEmployees.reduce((sum, e) => sum + e.salary * 0.11, 0) : 0)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {selectedReport === 'irt' && (
                  <div className="bg-white border border-zinc-200 rounded-none overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-zinc-100 bg-zinc-50 flex justify-between items-center">
                      <h3 className="font-bold text-[#003366]">Mapa de IRT - {new Date().toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[#003366] text-white text-[10px] uppercase tracking-wider font-bold">
                            <th className="px-6 py-4">Funcionário</th>
                            <th className="px-6 py-4 text-right">Salário Bruto</th>
                            <th className="px-6 py-4 text-right">INSS (3%)</th>
                            <th className="px-6 py-4 text-right">Matéria Colectável</th>
                            <th className="px-6 py-4 text-right">IRT Devido</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {Array.isArray(localEmployees) && localEmployees.map(emp => {
                            const inss = emp.salary * 0.03;
                            const base = emp.salary - inss;
                            const irt = calculateIRT(base);
                            return (
                              <tr key={emp.id} className="hover:bg-zinc-50 transition-colors text-xs">
                                <td className="px-6 py-4 font-bold text-[#003366]">{emp.name}</td>
                                <td className="px-6 py-4 text-right">{formatCurrency(emp.salary)}</td>
                                <td className="px-6 py-4 text-right text-red-500">{formatCurrency(inss)}</td>
                                <td className="px-6 py-4 text-right font-medium">{formatCurrency(base)}</td>
                                <td className="px-6 py-4 text-right text-red-600 font-bold">{formatCurrency(irt)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot>
                          <tr className="bg-zinc-50 font-bold text-xs">
                            <td className="px-6 py-4 text-[#003366]">TOTAIS</td>
                            <td className="px-6 py-4 text-right">{formatCurrency(Array.isArray(localEmployees) ? localEmployees.reduce((sum, e) => sum + e.salary, 0) : 0)}</td>
                            <td className="px-6 py-4 text-right text-red-500">{formatCurrency(Array.isArray(localEmployees) ? localEmployees.reduce((sum, e) => sum + e.salary * 0.03, 0) : 0)}</td>
                            <td className="px-6 py-4 text-right">{formatCurrency(Array.isArray(localEmployees) ? localEmployees.reduce((sum, e) => sum + (e.salary * 0.97), 0) : 0)}</td>
                            <td className="px-6 py-4 text-right text-red-600">{formatCurrency(Array.isArray(localEmployees) ? localEmployees.reduce((sum, e) => sum + calculateIRT(e.salary * 0.97), 0) : 0)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {selectedReport === 'receipts' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.isArray(localEmployees) && localEmployees.map(emp => (
                      <div key={emp.id} className="bg-white border border-zinc-200 p-6 rounded-none shadow-sm flex flex-col gap-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold text-[#003366]">{emp.name}</h4>
                            <p className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">{emp.role}</p>
                          </div>
                          <Printer size={18} className="text-zinc-300" />
                        </div>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-zinc-500">Salário Base</span>
                            <span className="font-medium">{formatCurrency(emp.salary)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-500">INSS (3%)</span>
                            <span className="text-red-500">-{formatCurrency(emp.salary * 0.03)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-500">IRT</span>
                            <span className="text-red-500">-{formatCurrency(calculateIRT(emp.salary * 0.97))}</span>
                          </div>
                          <div className="pt-2 border-t border-zinc-50 flex justify-between font-bold text-[#003366]">
                            <span>Líquido a Receber</span>
                            <span>{formatCurrency(emp.salary - (emp.salary * 0.03) - calculateIRT(emp.salary * 0.97))}</span>
                          </div>
                        </div>
                        <button className="mt-2 w-full bg-[#003366] text-white py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-[#002244] transition-colors">
                          Emitir Recibo
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {['remunerations', 'inss', 'irt', 'receipts'].indexOf(selectedReport || '') === -1 && (
                  <div className="p-12 text-center text-zinc-400 italic bg-white border border-zinc-200">
                    Relatório em desenvolvimento...
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'ficha_pessoal' && (
          <div className="bg-white border border-zinc-200 rounded-none shadow-sm p-6">
            {!appSelectedEmployee ? (
              <div className="space-y-4">
                <h3 className="font-bold text-[#003366] uppercase tracking-widest text-xs mb-4">Selecione um Colaborador para ver a Ficha Pessoal</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {localEmployees.map(emp => (
                    <button
                      key={emp.id}
                      onClick={() => setAppSelectedEmployee(emp)}
                      className="bg-zinc-50 border border-zinc-200 p-4 flex items-center gap-4 hover:border-[#003366] transition-all text-left"
                    >
                      <div className="w-10 h-10 bg-zinc-200 rounded-none flex items-center justify-center overflow-hidden">
                        {emp.image_url ? <img src={emp.image_url} alt={emp.name} className="w-full h-full object-cover" /> : <UserIcon size={20} className="text-zinc-400" />}
                      </div>
                      <div>
                        <p className="font-bold text-[#003366] text-xs uppercase">{emp.name}</p>
                        <p className="text-[10px] text-zinc-500 uppercase">{emp.role}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <button 
                  onClick={() => setAppSelectedEmployee(null)}
                  className="flex items-center gap-2 text-zinc-500 hover:text-[#003366] transition-colors font-bold text-xs uppercase tracking-widest"
                >
                  <ArrowLeft size={14} /> Voltar à Seleção
                </button>
                <FichaPessoal employee={appSelectedEmployee} />
              </div>
            )}
          </div>
        )}

        {activeTab === 'declaracao_servico' && (
          <div className="bg-white border border-zinc-200 rounded-none shadow-sm p-6">
            {!appSelectedEmployee ? (
              <div className="space-y-4">
                <h3 className="font-bold text-[#003366] uppercase tracking-widest text-xs mb-4">Selecione um Colaborador para a Declaração de Serviço</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {localEmployees.map(emp => (
                    <button
                      key={emp.id}
                      onClick={() => setAppSelectedEmployee(emp)}
                      className="bg-zinc-50 border border-zinc-200 p-4 flex items-center gap-4 hover:border-[#003366] transition-all text-left"
                    >
                      <div className="w-10 h-10 bg-zinc-200 rounded-none flex items-center justify-center overflow-hidden">
                        {emp.image_url ? <img src={emp.image_url} alt={emp.name} className="w-full h-full object-cover" /> : <UserIcon size={20} className="text-zinc-400" />}
                      </div>
                      <div>
                        <p className="font-bold text-[#003366] text-xs uppercase">{emp.name}</p>
                        <p className="text-[10px] text-zinc-500 uppercase">{emp.role}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <button 
                  onClick={() => setAppSelectedEmployee(null)}
                  className="flex items-center gap-2 text-zinc-500 hover:text-[#003366] transition-colors font-bold text-xs uppercase tracking-widest"
                >
                  <ArrowLeft size={14} /> Voltar à Seleção
                </button>
                <DeclaracaoServico employee={appSelectedEmployee} />
              </div>
            )}
          </div>
        )}

        {activeTab === 'acordo_confidencialidade' && (
          <div className="bg-white border border-zinc-200 rounded-none shadow-sm p-6">
            {!appSelectedEmployee ? (
              <div className="space-y-4">
                <h3 className="font-bold text-[#003366] uppercase tracking-widest text-xs mb-4">Selecione um Colaborador para o Acordo de Confidencialidade</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {localEmployees.map(emp => (
                    <button
                      key={emp.id}
                      onClick={() => setAppSelectedEmployee(emp)}
                      className="bg-zinc-50 border border-zinc-200 p-4 flex items-center gap-4 hover:border-[#003366] transition-all text-left"
                    >
                      <div className="w-10 h-10 bg-zinc-200 rounded-none flex items-center justify-center overflow-hidden">
                        {emp.image_url ? <img src={emp.image_url} alt={emp.name} className="w-full h-full object-cover" /> : <UserIcon size={20} className="text-zinc-400" />}
                      </div>
                      <div>
                        <p className="font-bold text-[#003366] text-xs uppercase">{emp.name}</p>
                        <p className="text-[10px] text-zinc-500 uppercase">{emp.role}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <button 
                  onClick={() => setAppSelectedEmployee(null)}
                  className="flex items-center gap-2 text-zinc-500 hover:text-[#003366] transition-colors font-bold text-xs uppercase tracking-widest"
                >
                  <ArrowLeft size={14} /> Voltar à Seleção
                </button>
                <AcordoConfidencialidade employee={appSelectedEmployee} />
              </div>
            )}
          </div>
        )}

        {activeTab === 'labor_extinction' && (
          <div className="space-y-6">
            <div className="bg-[#003366] text-white p-4 flex justify-between items-center">
              <h2 className="text-lg font-black uppercase tracking-widest">Extensão Laboral (Demitidos)</h2>
              <button className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all">
                <Printer size={14} /> Imprimir Lista
              </button>
            </div>
            <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 text-[10px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-200">
                    <th className="px-6 py-4">Funcionário</th>
                    <th className="px-6 py-4">Cargo</th>
                    <th className="px-6 py-4">Data Extinção</th>
                    <th className="px-6 py-4">Motivo</th>
                    <th className="px-6 py-4">Ordenado Por</th>
                    <th className="px-6 py-4 text-right">Acções</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {laborTerminations.map(lt => (
                    <tr key={lt.id} className="hover:bg-zinc-50 transition-colors text-xs">
                      <td className="px-6 py-4 font-black text-[#003366] uppercase">{lt.employee_name}</td>
                      <td className="px-6 py-4 text-zinc-500 font-bold uppercase">{lt.employee_role}</td>
                      <td className="px-6 py-4 font-mono text-zinc-600">{new Date(lt.dismissal_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-zinc-600 italic">{lt.reason}</td>
                      <td className="px-6 py-4 text-zinc-500 font-medium">{lt.ordered_by}</td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2 text-zinc-400 hover:text-[#003366]">
                          <Eye size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {laborTerminations.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-zinc-400 italic">Nenhum registo de extinção laboral encontrado.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'colaboradores_demitidos' && (
          <ColaboradoresDemitidos employees={localEmployees} />
        )}

        {activeTab === 'irt_inss_map' && (
          <MapaSalarios 
            localEmployees={localEmployees}
            selectedMonthForMap={selectedMonth}
            setSelectedMonthForMap={setSelectedMonth}
            selectedMapSubTab={selectedMapSubTab}
            setSelectedMapSubTab={setSelectedMapSubTab}
            onSetEmployee={onSetEmployee}
            onSetIsContractModalOpen={onSetIsContractModalOpen}
          />
        )}

        {activeTab === 'transfer_order' && (
          <div className="space-y-6">
            <button 
              onClick={() => setActiveTab('payroll')}
              className="flex items-center gap-2 text-zinc-500 hover:text-[#003366] transition-colors font-bold text-xs uppercase tracking-widest"
            >
              <ArrowLeft size={14} /> Voltar ao Processamento
            </button>
            <OrdemTransferencia employee={appSelectedEmployee} />
          </div>
        )}

        {activeTab === 'maps' && (
          <MapaSalarios 
            localEmployees={localEmployees}
            selectedMonthForMap={selectedMonthForMap}
            setSelectedMonthForMap={setSelectedMonthForMap}
            selectedMapSubTab={selectedMapSubTab}
            setSelectedMapSubTab={setSelectedMapSubTab}
            onSetEmployee={onSetEmployee}
            onSetIsContractModalOpen={onSetIsContractModalOpen}
          />
        )}

        {activeTab === 'behavior' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <button 
                onClick={() => setActiveTab('employees')}
                className="flex items-center gap-2 text-zinc-500 hover:text-[#003366] transition-colors font-bold text-xs uppercase tracking-widest"
              >
                <ArrowLeft size={14} /> Voltar aos Colaboradores
              </button>
              <div className="flex gap-2">
                <button className="bg-[#003366] text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-[#002244] transition-all">
                  <Plus size={14} /> Novo Registro
                </button>
              </div>
            </div>

            <div className="bg-white border border-zinc-200 rounded-none shadow-sm overflow-hidden">
              <div className="bg-[#003366] text-white p-6 flex items-center gap-4 border-b border-white/10">
                <div className="w-16 h-16 bg-white/10 rounded-none overflow-hidden border border-white/20 flex items-center justify-center">
                  {appSelectedEmployee?.image_url ? <img src={appSelectedEmployee.image_url} className="w-full h-full object-cover" /> : <UserIcon size={32} />}
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-widest">{appSelectedEmployee?.name}</h3>
                  <p className="text-xs text-white/60 uppercase tracking-tighter font-bold">{appSelectedEmployee?.role} • ID: {appSelectedEmployee?.id}</p>
                </div>
              </div>

              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-emerald-50 border border-emerald-100 p-6 text-center">
                    <span className="block text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-2">Elogios / Méritos</span>
                    <span className="text-3xl font-black text-emerald-700">04</span>
                  </div>
                  <div className="bg-amber-50 border border-amber-100 p-6 text-center">
                    <span className="block text-[10px] font-black uppercase tracking-widest text-amber-600 mb-2">Advertências Verbais</span>
                    <span className="text-3xl font-black text-amber-700">01</span>
                  </div>
                  <div className="bg-red-50 border border-red-100 p-6 text-center">
                    <span className="block text-[10px] font-black uppercase tracking-widest text-red-600 mb-2">Advertências Escritas</span>
                    <span className="text-3xl font-black text-red-700">00</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-black text-[#003366] uppercase tracking-widest text-xs border-b border-zinc-100 pb-2">Histórico de Ocorrências</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-[10px]">
                      <thead>
                        <tr className="bg-zinc-100 text-zinc-600 uppercase tracking-widest font-black">
                          <th className="px-4 py-3 border-b border-zinc-200">Data</th>
                          <th className="px-4 py-3 border-b border-zinc-200">Tipo</th>
                          <th className="px-4 py-3 border-b border-zinc-200">Descrição</th>
                          <th className="px-4 py-3 border-b border-zinc-200">Responsável</th>
                          <th className="px-4 py-3 border-b border-zinc-200 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {[
                          { date: '15/03/2026', type: 'Elogio', desc: 'Excelente desempenho no projeto trimestral.', resp: 'Admin' },
                          { date: '02/02/2026', type: 'Advertência Verbal', desc: 'Atrasos recorrentes na entrada.', resp: 'Supervisor' },
                          { date: '10/01/2026', type: 'Mérito', desc: 'Colaborador do mês de Janeiro.', resp: 'Direção' },
                        ].map((item, idx) => (
                          <tr key={idx} className="hover:bg-zinc-50 transition-colors">
                            <td className="px-4 py-3 font-bold text-zinc-500">{item.date}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 font-black uppercase tracking-tighter ${
                                item.type.includes('Elogio') || item.type.includes('Mérito') ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                                {item.type}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-zinc-600 italic">{item.desc}</td>
                            <td className="px-4 py-3 font-bold text-[#003366]">{item.resp}</td>
                            <td className="px-4 py-3 text-center">
                              <button className="text-zinc-400 hover:text-[#003366] transition-colors"><Printer size={14} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'redirection' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <button 
                onClick={() => setActiveTab('employees')}
                className="flex items-center gap-2 text-zinc-500 hover:text-[#003366] transition-colors font-bold text-xs uppercase tracking-widest"
              >
                <ArrowLeft size={14} /> Voltar aos Colaboradores
              </button>
            </div>

            <div className="bg-white border border-zinc-200 rounded-none shadow-sm overflow-hidden">
              <div className="bg-[#003366] text-white p-6 flex items-center gap-4 border-b border-white/10">
                <div className="w-16 h-16 bg-white/10 rounded-none overflow-hidden border border-white/20 flex items-center justify-center">
                  {appSelectedEmployee?.image_url ? <img src={appSelectedEmployee.image_url} className="w-full h-full object-cover" /> : <UserIcon size={32} />}
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-widest">Redirecionamento Interno</h3>
                  <p className="text-xs text-white/60 uppercase tracking-tighter font-bold">{appSelectedEmployee?.name} • {appSelectedEmployee?.role}</p>
                </div>
              </div>

              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="font-black text-[#003366] uppercase tracking-widest text-xs border-b border-zinc-100 pb-2">Detalhes da Transferência</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Novo Departamento:</label>
                        <select className="w-full border border-zinc-200 px-4 py-2 text-xs focus:outline-none focus:border-[#003366] font-bold text-[#003366]">
                          <option>Administração</option>
                          <option>Recursos Humanos</option>
                          <option>Financeiro</option>
                          <option>Operações</option>
                          <option>TI</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Nova Categoria Profissional:</label>
                        <input type="text" className="w-full border border-zinc-200 px-4 py-2 text-xs focus:outline-none focus:border-[#003366]" placeholder="Ex: Gestor de Projetos" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Data de Início:</label>
                        <input type="date" className="w-full border border-zinc-200 px-4 py-2 text-xs focus:outline-none focus:border-[#003366]" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-black text-[#003366] uppercase tracking-widest text-xs border-b border-zinc-100 pb-2">Justificativa / Observações</h4>
                    <textarea 
                      className="w-full h-40 border border-zinc-200 p-4 text-xs focus:outline-none focus:border-[#003366] resize-none"
                      placeholder="Descreva o motivo do redirecionamento..."
                    ></textarea>
                    <button className="w-full bg-[#F27D26] text-white py-3 font-black uppercase tracking-widest text-[10px] hover:bg-[#d96a1a] transition-all shadow-lg">
                      Confirmar Redirecionamento
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'functions' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <button 
                onClick={() => setActiveTab('employees')}
                className="flex items-center gap-2 text-zinc-500 hover:text-[#003366] transition-colors font-bold text-xs uppercase tracking-widest"
              >
                <ArrowLeft size={14} /> Voltar aos Colaboradores
              </button>
              <button className="bg-[#003366] text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-[#002244] transition-all">
                <Edit size={14} /> Editar Funções
              </button>
            </div>

            <div className="bg-white border border-zinc-200 rounded-none shadow-sm overflow-hidden">
              <div className="bg-[#003366] text-white p-6 flex items-center gap-4 border-b border-white/10">
                <div className="w-16 h-16 bg-white/10 rounded-none overflow-hidden border border-white/20 flex items-center justify-center">
                  {appSelectedEmployee?.image_url ? <img src={appSelectedEmployee.image_url} className="w-full h-full object-cover" /> : <UserIcon size={32} />}
                </div>
                <div>
                  <h3 className="text-xl font-black uppercase tracking-widest">Funções e Atribuições</h3>
                  <p className="text-xs text-white/60 uppercase tracking-tighter font-bold">{appSelectedEmployee?.name} • {appSelectedEmployee?.role}</p>
                </div>
              </div>

              <div className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-black text-[#003366] uppercase tracking-widest text-[10px] mb-4 flex items-center gap-2">
                        <div className="w-2 h-2 bg-[#F27D26]"></div> Descrição do Cargo
                      </h4>
                      <p className="text-xs text-zinc-600 leading-relaxed italic border-l-2 border-zinc-100 pl-4">
                        Responsável pela coordenação e execução das atividades administrativas da unidade, garantindo a conformidade com os processos internos e a eficiência operacional.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-black text-[#003366] uppercase tracking-widest text-[10px] mb-4 flex items-center gap-2">
                        <div className="w-2 h-2 bg-[#F27D26]"></div> Responsabilidades Chave
                      </h4>
                      <ul className="space-y-3">
                        {[
                          'Gestão de documentos e arquivos físicos/digitais.',
                          'Coordenação de fluxos de caixa e pequenos pagamentos.',
                          'Supervisão da equipe de apoio administrativo.',
                          'Elaboração de relatórios mensais de desempenho.',
                          'Interface com fornecedores e prestadores de serviço.'
                        ].map((resp, idx) => (
                          <li key={idx} className="flex items-start gap-3 text-xs text-zinc-600">
                            <Check size={14} className="text-emerald-500 mt-0.5" />
                            <span>{resp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h4 className="font-black text-[#003366] uppercase tracking-widest text-[10px] mb-4 flex items-center gap-2">
                        <div className="w-2 h-2 bg-[#F27D26]"></div> Competências Necessárias
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {['Liderança', 'Organização', 'Comunicação Assertiva', 'Domínio de Excel', 'Gestão de Tempo'].map((comp, idx) => (
                          <span key={idx} className="px-3 py-1 bg-zinc-100 text-zinc-600 text-[9px] font-black uppercase tracking-widest">
                            {comp}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="bg-zinc-50 p-6 border border-zinc-100">
                      <h4 className="font-black text-[#003366] uppercase tracking-widest text-[10px] mb-4">Metas do Trimestre</h4>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-[9px] font-black uppercase tracking-widest mb-1">
                            <span>Eficiência Operacional</span>
                            <span>85%</span>
                          </div>
                          <div className="w-full h-1 bg-zinc-200">
                            <div className="h-full bg-[#F27D26]" style={{ width: '85%' }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-[9px] font-black uppercase tracking-widest mb-1">
                            <span>Redução de Custos</span>
                            <span>60%</span>
                          </div>
                          <div className="w-full h-1 bg-zinc-200">
                            <div className="h-full bg-blue-600" style={{ width: '60%' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {draftReceipt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-[800px] shadow-2xl relative">
            <div className="sticky top-0 bg-zinc-100 p-4 border-b border-zinc-200 flex justify-between items-center z-10">
              <h3 className="text-sm font-black uppercase tracking-widest text-[#003366]">Recibo de Salário - Rascunho</h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => setDraftReceipt(null)}
                  className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:bg-zinc-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    setProcessedReceipts(prev => [...prev, draftReceipt]);
                    setDraftReceipt(null);
                    setActiveTab('salary_receipts');
                  }}
                  className="px-6 py-2 text-[10px] font-black uppercase tracking-widest bg-[#16A34A] text-white hover:bg-[#15803d] transition-all shadow-lg"
                >
                  Finalizar e Registar
                </button>
              </div>
            </div>

            <div className="p-8 bg-white min-h-[1123px] font-sans text-zinc-800">
              {/* Header */}
              <div className="flex justify-between items-start mb-8 border-b-2 border-[#003366] pb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-[#003366] flex items-center justify-center text-white font-black text-2xl">
                    TS
                  </div>
                  <div>
                    <h1 className="text-xl font-black text-[#003366] uppercase tracking-tighter">Grupo TecnoSys</h1>
                    <p className="text-[10px] text-zinc-500 uppercase font-bold">Soluções Tecnológicas Integradas</p>
                    <p className="text-[9px] text-zinc-400 mt-1">Luanda, Angola • NIF: 5417283940</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="bg-[#003366] text-white px-4 py-1 text-[10px] font-black uppercase tracking-widest mb-2">
                    Recibo de Salário
                  </div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase">Período: {draftReceipt.period}</p>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase">Data: {draftReceipt.paymentDate}</p>
                </div>
              </div>

              {/* Employee Info */}
              <div className="grid grid-cols-2 gap-8 mb-8 bg-zinc-50 p-6 border border-zinc-200">
                <div className="space-y-2">
                  <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest">Funcionário</label>
                  <p className="text-sm font-black text-[#003366] uppercase">{draftReceipt.employee.name}</p>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase">{draftReceipt.employee.role}</p>
                  <p className="text-[10px] text-zinc-400 uppercase">NIF: {draftReceipt.employee.nif || '---'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest">Nº Empregado</label>
                    <p className="text-xs font-bold text-zinc-700">{String(draftReceipt.employee.id).padStart(4, '0')}</p>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest">Data Admissão</label>
                    <p className="text-xs font-bold text-zinc-700">{draftReceipt.employee.hired_at || '---'}</p>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest">IBAN</label>
                    <p className="text-[10px] font-bold text-zinc-700">{draftReceipt.employee.iban || '---'}</p>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest">Seg. Social</label>
                    <p className="text-xs font-bold text-zinc-700">{draftReceipt.employee.inss_number || '---'}</p>
                  </div>
                </div>
              </div>

              {/* Earnings & Deductions Table */}
              <div className="border border-zinc-200 mb-8">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#003366] text-white text-[10px] uppercase font-black tracking-widest">
                      <th className="px-4 py-3 border-r border-white/10">Descrição</th>
                      <th className="px-4 py-3 border-r border-white/10 text-center w-24">Qtd/Base</th>
                      <th className="px-4 py-3 border-r border-white/10 text-right w-32">Vencimentos</th>
                      <th className="px-4 py-3 text-right w-32">Descontos</th>
                    </tr>
                  </thead>
                  <tbody className="text-[11px] font-bold text-zinc-700 divide-y divide-zinc-100">
                    {/* Salary Base */}
                    <tr>
                      <td className="px-4 py-3 uppercase">Salário Base</td>
                      <td className="px-4 py-3 text-center">30 Dias</td>
                      <td className="px-4 py-3 text-right font-mono">{formatCurrency(draftReceipt.employee.salary)}</td>
                      <td className="px-4 py-3 text-right font-mono">---</td>
                    </tr>

                    {/* Subsidies - Editable */}
                    {[
                      { label: 'Subsídio de Alimentação', field: 'subsidioAlimentacao' },
                      { label: 'Subsídio de Transporte', field: 'subsidioTransporte' },
                      { label: 'Subsídio de Alojamento', field: 'alojamento' },
                      { label: 'Prêmios', field: 'premios' },
                      { label: 'Gratificações', field: 'gratificacoes' },
                      { label: 'Abonos', field: 'abonos' },
                      { label: 'Acertos Salariais', field: 'acertos' },
                      { label: 'Subsídio de Natal', field: 'subsidioNatal' },
                      { label: 'Outros Subsídios', field: 'outrosSubsidios' },
                    ].map(item => (
                      <tr key={item.field}>
                        <td className="px-4 py-3 uppercase">{item.label}</td>
                        <td className="px-4 py-3 text-center">---</td>
                        <td className="px-4 py-3 text-right">
                          <input 
                            type="number"
                            value={draftReceipt.inputs[item.field]}
                            onChange={(e) => {
                              const newVal = Number(e.target.value);
                              const updatedInputs = { ...draftReceipt.inputs, [item.field]: newVal };
                              
                              // Recalculate
                              const inss_worker = draftReceipt.employee.subject_to_inss !== false ? draftReceipt.employee.salary * 0.03 : 0;
                              const base_taxable = draftReceipt.employee.subject_to_irt !== false ? (draftReceipt.employee.salary - inss_worker) : 0;
                              const irt = draftReceipt.employee.subject_to_irt !== false ? calculateIRT(base_taxable) : 0;
                              
                              const dailyRate = draftReceipt.employee.salary / 22;
                              const hourlyRate = draftReceipt.employee.salary / 173.33;
                              const overtimeRate = hourlyRate * 1.5;
                              const absenceDeduction = updatedInputs.faltasInjustificadas * dailyRate;
                              const lostHoursDeduction = updatedInputs.horasPerdidas * hourlyRate;
                              const overtimePay = updatedInputs.horasExtras * overtimeRate;
                              
                              const totalGross = draftReceipt.employee.salary + updatedInputs.premios + updatedInputs.gratificacoes + updatedInputs.abonos + 
                                               updatedInputs.subsidioNatal + updatedInputs.alojamento + updatedInputs.outrosSubsidios + 
                                               updatedInputs.subsidioTransporte + updatedInputs.subsidioAlimentacao + overtimePay + updatedInputs.acertos;
                              
                              const totalNet = totalGross - inss_worker - irt - absenceDeduction - lostHoursDeduction - updatedInputs.adiantamentos;

                              setDraftReceipt({
                                ...draftReceipt,
                                inputs: updatedInputs,
                                calculations: {
                                  ...draftReceipt.calculations,
                                  totalGross,
                                  totalNet,
                                  inss_worker,
                                  irt,
                                  absenceDeduction,
                                  lostHoursDeduction,
                                  overtimePay
                                }
                              });
                            }}
                            className="w-full bg-zinc-50 border-b border-zinc-200 text-right font-mono focus:outline-none focus:border-[#003366] p-1"
                          />
                        </td>
                        <td className="px-4 py-3 text-right font-mono">---</td>
                      </tr>
                    ))}

                    {/* Overtime */}
                    <tr>
                      <td className="px-4 py-3 uppercase">Horas Extras (50%)</td>
                      <td className="px-4 py-3 text-center">
                        <input 
                          type="number"
                          value={draftReceipt.inputs.horasExtras}
                          onChange={(e) => {
                            const newVal = Number(e.target.value);
                            const updatedInputs = { ...draftReceipt.inputs, horasExtras: newVal };
                            // Recalculate...
                            const hourlyRate = draftReceipt.employee.salary / 173.33;
                            const overtimeRate = hourlyRate * 1.5;
                            const overtimePay = newVal * overtimeRate;
                            
                            const inss_worker = draftReceipt.employee.subject_to_inss !== false ? draftReceipt.employee.salary * 0.03 : 0;
                            const base_taxable = draftReceipt.employee.subject_to_irt !== false ? (draftReceipt.employee.salary - inss_worker) : 0;
                            const irt = draftReceipt.employee.subject_to_irt !== false ? calculateIRT(base_taxable) : 0;
                            const dailyRate = draftReceipt.employee.salary / 22;
                            const absenceDeduction = updatedInputs.faltasInjustificadas * dailyRate;
                            const lostHoursDeduction = updatedInputs.horasPerdidas * hourlyRate;

                            const totalGross = draftReceipt.employee.salary + updatedInputs.premios + updatedInputs.gratificacoes + updatedInputs.abonos + 
                                             updatedInputs.subsidioNatal + updatedInputs.alojamento + updatedInputs.outrosSubsidios + 
                                             updatedInputs.subsidioTransporte + updatedInputs.subsidioAlimentacao + overtimePay + updatedInputs.acertos;
                            
                            const totalNet = totalGross - inss_worker - irt - absenceDeduction - lostHoursDeduction - updatedInputs.adiantamentos;

                            setDraftReceipt({
                              ...draftReceipt,
                              inputs: updatedInputs,
                              calculations: {
                                ...draftReceipt.calculations,
                                overtimePay,
                                totalGross,
                                totalNet,
                                inss_worker,
                                irt,
                                absenceDeduction,
                                lostHoursDeduction
                              }
                            });
                          }}
                          className="w-12 bg-zinc-50 border-b border-zinc-200 text-center focus:outline-none focus:border-[#003366] p-1"
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-mono">{formatCurrency(draftReceipt.calculations.overtimePay)}</td>
                      <td className="px-4 py-3 text-right font-mono">---</td>
                    </tr>

                    {/* Deductions */}
                    <tr>
                      <td className="px-4 py-3 uppercase">Segurança Social (3%)</td>
                      <td className="px-4 py-3 text-center">3%</td>
                      <td className="px-4 py-3 text-right font-mono">---</td>
                      <td className="px-4 py-3 text-right font-mono text-red-600">{formatCurrency(draftReceipt.calculations.inss_worker)}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 uppercase">IRT (Imposto de Rendimento)</td>
                      <td className="px-4 py-3 text-center">Tabela</td>
                      <td className="px-4 py-3 text-right font-mono">---</td>
                      <td className="px-4 py-3 text-right font-mono text-red-600">{formatCurrency(draftReceipt.calculations.irt)}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 uppercase">Faltas Injustificadas</td>
                      <td className="px-4 py-3 text-center">
                        <input 
                          type="number"
                          value={draftReceipt.inputs.faltasInjustificadas}
                          onChange={(e) => {
                            const newVal = Number(e.target.value);
                            const updatedInputs = { ...draftReceipt.inputs, faltasInjustificadas: newVal };
                            // Recalculate...
                            const dailyRate = draftReceipt.employee.salary / 22;
                            const absenceDeduction = newVal * dailyRate;
                            
                            const inss_worker = draftReceipt.employee.subject_to_inss !== false ? draftReceipt.employee.salary * 0.03 : 0;
                            const base_taxable = draftReceipt.employee.subject_to_irt !== false ? (draftReceipt.employee.salary - inss_worker) : 0;
                            const irt = draftReceipt.employee.subject_to_irt !== false ? calculateIRT(base_taxable) : 0;
                            const hourlyRate = draftReceipt.employee.salary / 173.33;
                            const overtimeRate = hourlyRate * 1.5;
                            const overtimePay = updatedInputs.horasExtras * overtimeRate;
                            const lostHoursDeduction = updatedInputs.horasPerdidas * hourlyRate;

                            const totalGross = draftReceipt.employee.salary + updatedInputs.premios + updatedInputs.gratificacoes + updatedInputs.abonos + 
                                             updatedInputs.subsidioNatal + updatedInputs.alojamento + updatedInputs.outrosSubsidios + 
                                             updatedInputs.subsidioTransporte + updatedInputs.subsidioAlimentacao + overtimePay + updatedInputs.acertos;
                            
                            const totalNet = totalGross - inss_worker - irt - absenceDeduction - lostHoursDeduction - updatedInputs.adiantamentos;

                            setDraftReceipt({
                              ...draftReceipt,
                              inputs: updatedInputs,
                              calculations: {
                                ...draftReceipt.calculations,
                                absenceDeduction,
                                totalGross,
                                totalNet,
                                inss_worker,
                                irt,
                                overtimePay,
                                lostHoursDeduction
                              }
                            });
                          }}
                          className="w-12 bg-zinc-50 border-b border-zinc-200 text-center focus:outline-none focus:border-[#003366] p-1"
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-mono">---</td>
                      <td className="px-4 py-3 text-right font-mono text-red-600">{formatCurrency(draftReceipt.calculations.absenceDeduction)}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 uppercase">Horas Perdidas</td>
                      <td className="px-4 py-3 text-center">
                        <input 
                          type="number"
                          value={draftReceipt.inputs.horasPerdidas}
                          onChange={(e) => {
                            const newVal = Number(e.target.value);
                            const updatedInputs = { ...draftReceipt.inputs, horasPerdidas: newVal };
                            // Recalculate...
                            const hourlyRate = draftReceipt.employee.salary / 173.33;
                            const lostHoursDeduction = newVal * hourlyRate;
                            
                            const inss_worker = draftReceipt.employee.subject_to_inss !== false ? draftReceipt.employee.salary * 0.03 : 0;
                            const base_taxable = draftReceipt.employee.subject_to_irt !== false ? (draftReceipt.employee.salary - inss_worker) : 0;
                            const irt = draftReceipt.employee.subject_to_irt !== false ? calculateIRT(base_taxable) : 0;
                            const dailyRate = draftReceipt.employee.salary / 22;
                            const absenceDeduction = updatedInputs.faltasInjustificadas * dailyRate;
                            const overtimeRate = hourlyRate * 1.5;
                            const overtimePay = updatedInputs.horasExtras * overtimeRate;

                            const totalGross = draftReceipt.employee.salary + updatedInputs.premios + updatedInputs.gratificacoes + updatedInputs.abonos + 
                                             updatedInputs.subsidioNatal + updatedInputs.alojamento + updatedInputs.outrosSubsidios + 
                                             updatedInputs.subsidioTransporte + updatedInputs.subsidioAlimentacao + overtimePay + updatedInputs.acertos;
                            
                            const totalNet = totalGross - inss_worker - irt - absenceDeduction - lostHoursDeduction - updatedInputs.adiantamentos;

                            setDraftReceipt({
                              ...draftReceipt,
                              inputs: updatedInputs,
                              calculations: {
                                ...draftReceipt.calculations,
                                lostHoursDeduction,
                                totalGross,
                                totalNet,
                                inss_worker,
                                irt,
                                absenceDeduction,
                                overtimePay
                              }
                            });
                          }}
                          className="w-12 bg-zinc-50 border-b border-zinc-200 text-center focus:outline-none focus:border-[#003366] p-1"
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-mono">---</td>
                      <td className="px-4 py-3 text-right font-mono text-red-600">{formatCurrency(draftReceipt.calculations.lostHoursDeduction)}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 uppercase">Adiantamentos</td>
                      <td className="px-4 py-3 text-center">---</td>
                      <td className="px-4 py-3 text-right font-mono">---</td>
                      <td className="px-4 py-3 text-right font-mono text-red-600">
                        <input 
                          type="number"
                          value={draftReceipt.inputs.adiantamentos}
                          onChange={(e) => {
                            const newVal = Number(e.target.value);
                            const updatedInputs = { ...draftReceipt.inputs, adiantamentos: newVal };
                            // Recalculate...
                            const totalNet = draftReceipt.calculations.totalGross - draftReceipt.calculations.inss_worker - draftReceipt.calculations.irt - draftReceipt.calculations.absenceDeduction - draftReceipt.calculations.lostHoursDeduction - newVal;
                            setDraftReceipt({
                              ...draftReceipt,
                              inputs: updatedInputs,
                              calculations: {
                                ...draftReceipt.calculations,
                                totalNet
                              }
                            });
                          }}
                          className="w-full bg-zinc-50 border-b border-zinc-200 text-right font-mono focus:outline-none focus:border-[#003366] p-1"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="grid grid-cols-3 gap-0 border-2 border-[#003366] mb-12">
                <div className="p-4 bg-zinc-50 border-r border-[#003366]">
                  <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Total Vencimentos</label>
                  <p className="text-lg font-black text-[#003366] font-mono">{formatCurrency(draftReceipt.calculations.totalGross)}</p>
                </div>
                <div className="p-4 bg-zinc-50 border-r border-[#003366]">
                  <label className="block text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Total Descontos</label>
                  <p className="text-lg font-black text-red-600 font-mono">
                    {formatCurrency(draftReceipt.calculations.inss_worker + draftReceipt.calculations.irt + draftReceipt.calculations.absenceDeduction + draftReceipt.calculations.lostHoursDeduction + draftReceipt.inputs.adiantamentos)}
                  </p>
                </div>
                <div className="p-4 bg-[#003366] text-white">
                  <label className="block text-[9px] font-black text-white/50 uppercase tracking-widest mb-1">Líquido a Receber</label>
                  <p className="text-xl font-black font-mono">{formatCurrency(draftReceipt.calculations.totalNet)}</p>
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-16 mt-24">
                <div className="text-center">
                  <div className="border-t border-zinc-400 pt-2">
                    <p className="text-[10px] font-black uppercase text-[#003366]">A Entidade Empregadora</p>
                    <p className="text-[8px] text-zinc-400 mt-1">Carimbo e Assinatura</p>
                  </div>
                </div>
                <div className="text-center">
                  <div className="border-t border-zinc-400 pt-2">
                    <p className="text-[10px] font-black uppercase text-[#003366]">O Funcionário</p>
                    <p className="text-[8px] text-zinc-400 mt-1">Assinatura</p>
                  </div>
                </div>
              </div>

              {/* Footer Note */}
              <div className="mt-16 text-center text-[8px] text-zinc-400 uppercase font-bold tracking-widest">
                Este documento serve como comprovativo de pagamento de salário para efeitos legais.
              </div>
            </div>
          </div>
        </div>
      )}
      {showOptionsMenu && selectedEmployeeForOptions && (
        <EmployeeOptionsMenu 
          employee={selectedEmployeeForOptions} 
          onClose={() => setShowOptionsMenu(false)} 
        />
      )}
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

            <button onClick={() => handleAction('cancel')} className="flex flex-col items-center gap-3 p-6 border border-zinc-100 hover:bg-red-50 hover:border-red-200 transition-all group">
              <XCircle size={24} className="text-zinc-400 group-hover:text-red-600" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 group-hover:text-red-600 text-center">Anular Documento</span>
            </button>

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

            {/* Removed duplicate Anular button as it was moved to the top */}

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



const ProfitLossReport = ({ fiscalYear, company_id }: { fiscalYear: string, company_id?: string }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJson(`/api/reports/profit-loss?year=${fiscalYear}${company_id ? `&company_id=${company_id}` : ''}`)
      .then(setData)
      .catch(err => console.error('Error fetching profit-loss report:', err))
      .finally(() => setLoading(false));
  }, [fiscalYear, company_id]);

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const formatValue = (val: number) => {
    return val.toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (loading) return <div className="p-12 text-center text-zinc-400 italic">Carregando relatório...</div>;

  const totals = (data || []).reduce((acc, curr) => {
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
  const impPrevisional = Math.max(0, (a - b - c - d) * 0.25);

  const chartData = months.map((monthName, idx) => {
    const monthNum = idx + 1;
    const d = data.find(item => Number(item.month) === monthNum) || {
      facturacaoSImposto: 0,
      totaisCustos: 0,
      margem: 0
    };
    return {
      name: monthName.substring(0, 3),
      Receita: d.facturacaoSImposto,
      Custos: d.totaisCustos,
      Margem: d.margem
    };
  });

  const getMonthValue = (idx: number, key: string) => {
    const monthNum = idx + 1;
    const d = data.find(item => Number(item.month) === monthNum);
    return d ? d[key] : 0;
  };

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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-zinc-50 p-4 border border-zinc-100">
          <p className="text-[9px] font-black text-zinc-400 uppercase mb-1">Total Facturação (S/ Imp)</p>
          <p className="text-lg font-black text-[#003366]">{formatCurrency(totals.facturacaoSImposto)}</p>
        </div>
        <div className="bg-zinc-50 p-4 border border-zinc-100">
          <p className="text-[9px] font-black text-zinc-400 uppercase mb-1">Total Custos Aceites</p>
          <p className="text-lg font-black text-red-600">{formatCurrency(totals.totaisCustos)}</p>
        </div>
        <div className="bg-zinc-50 p-4 border border-zinc-100">
          <p className="text-[9px] font-black text-zinc-400 uppercase mb-1">Margem Bruta Acumulada</p>
          <p className="text-lg font-black text-emerald-600">{formatCurrency(totals.margem)}</p>
        </div>
        <div className="bg-[#003366] p-4 text-white">
          <p className="text-[9px] font-black text-white/60 uppercase mb-1">Imp. Industrial Prev.</p>
          <p className="text-lg font-black">{formatCurrency(impPrevisional)}</p>
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
            { months.map((_, idx) => <td key={idx} className="text-right py-2 px-1 text-zinc-500">{formatValue(getMonthValue(idx, 'facturacaoSImposto'))}</td>) }
            <td className="text-right py-2 px-1 font-bold text-zinc-700">{formatValue(totals.facturacaoSImposto)}</td>
          </tr>
          <tr>
            <td className="py-2 font-medium text-zinc-700">Imposto Recebido</td>
            { months.map((_, idx) => <td key={idx} className="text-right py-2 px-1 text-zinc-500">{formatValue(getMonthValue(idx, 'impostoRecebido'))}</td>) }
            <td className="text-right py-2 px-1 font-bold text-zinc-700">{formatValue(totals.impostoRecebido)}</td>
          </tr>
          <tr className="bg-zinc-50/50">
            <td className="py-2 font-bold text-zinc-800">Facturação c/ imposto</td>
            { months.map((_, idx) => <td key={idx} className="text-right py-2 px-1 text-zinc-600 font-medium">{formatValue(getMonthValue(idx, 'facturacaoCImposto'))}</td>) }
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
            { months.map((_, idx) => <td key={idx} className="text-right py-2 px-1 text-zinc-500">{formatValue(getMonthValue(idx, 'custosAceites'))}</td>) }
            <td className="text-right py-2 px-1 font-bold text-zinc-700">{formatValue(totals.custosAceites)}</td>
          </tr>
          <tr>
            <td className="py-2 font-medium text-zinc-700">Fornecedores S/ imposto(b)</td>
            { months.map((_, idx) => <td key={idx} className="text-right py-2 px-1 text-zinc-500">{formatValue(getMonthValue(idx, 'fornecedoresSImposto'))}</td>) }
            <td className="text-right py-2 px-1 font-bold text-zinc-700">{formatValue(totals.fornecedoresSImposto)}</td>
          </tr>
          <tr>
            <td className="py-2 font-medium text-zinc-700">Iva Suportado</td>
            { months.map((_, idx) => <td key={idx} className="text-right py-2 px-1 text-zinc-500">{formatValue(getMonthValue(idx, 'ivaSuportado'))}</td>) }
            <td className="text-right py-2 px-1 font-bold text-zinc-700">{formatValue(totals.ivaSuportado)}</td>
          </tr>
          <tr>
            <td className="py-2 font-medium text-zinc-700 italic text-blue-800">Salarios(c)</td>
            { months.map((_, idx) => <td key={idx} className="text-right py-2 px-1 text-blue-800 italic">{formatValue(getMonthValue(idx, 'salarios'))}</td>) }
            <td className="text-right py-2 px-1 font-bold text-blue-900 italic">{formatValue(totals.salarios)}</td>
          </tr>
          <tr>
            <td className="py-2 font-medium text-zinc-700 italic text-blue-800">INSS 8%(d)</td>
            { months.map((_, idx) => <td key={idx} className="text-right py-2 px-1 text-blue-800 italic">{formatValue(getMonthValue(idx, 'inss'))}</td>) }
            <td className="text-right py-2 px-1 font-bold text-blue-900 italic">{formatValue(totals.inss)}</td>
          </tr>
          <tr className="bg-zinc-50/50 border-t border-zinc-200">
            <td className="py-2 font-bold text-zinc-800">Totais</td>
            {months.map((_, idx) => <td key={idx} className="text-right py-2 px-1 text-zinc-600 font-medium">{formatValue(getMonthValue(idx, 'totaisCustos'))}</td>)}
            <td className="text-right py-2 px-1 font-black text-zinc-900">{formatValue(totals.totaisCustos)}</td>
          </tr>

          <tr><td colSpan={14} className="py-4"></td></tr>
          <tr className="bg-zinc-100 border-y border-zinc-200">
            <td className="py-3 font-black text-zinc-900 uppercase">Margem</td>
            {months.map((_, idx) => <td key={idx} className="text-right py-3 px-1 font-black text-zinc-900">{formatValue(getMonthValue(idx, 'margem'))}</td>)}
            <td className="text-right py-3 px-1 font-black text-zinc-900">{formatValue(totals.margem)}</td>
          </tr>
        </tbody>
      </table>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8 border-t border-zinc-100">
        <div className="space-y-4">
          <p className="text-[9px] text-zinc-400 leading-relaxed italic">
            Obs: Imposto Industrial Previsional (Pode dferir do imposto real a pagar. Não contempla os impostos já pagos e considera as facturas não aceites fiscalmente)
          </p>
          <p className="text-[9px] text-zinc-400 leading-relaxed italic">
            O Imposto previsional Contab pode dferir do imposto real a pagar . Não contempla os impostos já pagos e considera apenas os custos aceites fiscalmente.
          </p>
          <div className="pt-8">
            <h4 className="text-[10px] font-black text-zinc-800 uppercase tracking-widest mb-4">GRAFICO COMPARATIVO DE RECEITAS E CUSTOS</h4>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#003366" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#003366" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCustos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#DC2626" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#DC2626" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} tickFormatter={(value) => `${value/1000}k`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '0px', border: '1px solid #e2e8f0', fontSize: '10px' }}
                    formatter={(value: number) => [formatCurrency(value), '']}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '20px' }} />
                  <Area type="monotone" dataKey="Receita" stroke="#003366" fillOpacity={1} fill="url(#colorReceita)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Custos" stroke="#DC2626" fillOpacity={1} fill="url(#colorCustos)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
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

const OtherMovements = ({ transactions, onRefresh, caixas, user }: { transactions: any[], onRefresh: () => void, caixas: Caixa[], user: any }) => {
  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [category, setCategory] = useState('Outros');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [reference, setReference] = useState('');
  const [observation, setObservation] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTransactions = (transactions || []).filter(t => 
    (t.description || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
    (t.category || '').toLowerCase().includes((searchTerm || '').toLowerCase())
  );

  const totalIncome = (transactions || []).filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = (transactions || []).filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetchWithAuth('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        description, 
        amount: Number(amount), 
        type, 
        category,
        payment_method: paymentMethod,
        reference,
        observation,
        date,
        company_id: user?.company_id
      })
    });
    if (res.ok) {
      setDescription('');
      setAmount('');
      setCategory('Outros');
      setPaymentMethod('');
      setReference('');
      setObservation('');
      setDate(new Date().toISOString().split('T')[0]);
      setShowForm(false);
      onRefresh();
    }
  };

  const categories = ['Vendas', 'Serviços', 'Aluguer', 'Salários', 'Impostos', 'Fornecedores', 'Manutenção', 'Outros'];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-zinc-200 p-8 rounded-none shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-2">Total Entradas</p>
          <p className="text-3xl font-black text-emerald-600">{formatCurrency(totalIncome)}</p>
          <div className="mt-4 flex items-center gap-2 text-emerald-600">
            <ArrowUpRight size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Receitas Diversas</span>
          </div>
        </div>
        <div className="bg-white border border-zinc-200 p-8 rounded-none shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-2">Total Saídas</p>
          <p className="text-3xl font-black text-red-600">{formatCurrency(totalExpense)}</p>
          <div className="mt-4 flex items-center gap-2 text-red-600">
            <ArrowDownRight size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Despesas Manuais</span>
          </div>
        </div>
        <div className="bg-white border border-zinc-200 p-8 rounded-none shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#003366]/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-2">Saldo de Caixa</p>
          <p className={`text-3xl font-black ${balance >= 0 ? 'text-[#003366]' : 'text-red-600'}`}>{formatCurrency(balance)}</p>
          <div className="mt-4 flex items-center gap-2 text-[#003366]">
            <Wallet size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Disponibilidade Atual</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 border border-zinc-200 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
          <input 
            placeholder="Pesquisar movimentos..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-none text-sm focus:outline-none focus:border-[#003366] font-medium" 
          />
        </div>
        <button onClick={() => setShowForm(true)} className="bg-[#003366] hover:bg-[#002244] text-white font-bold px-8 py-2.5 rounded-none flex items-center gap-2 transition-all shadow-sm text-sm uppercase tracking-widest">
          <Plus size={18} /> Novo Movimento
        </button>
      </div>

      <div className="bg-white border border-zinc-200 rounded-none overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#003366] text-white text-[10px] font-black uppercase tracking-widest border-b border-zinc-200">
              <th className="px-6 py-4">Data</th>
              <th className="px-6 py-4">Descrição</th>
              <th className="px-6 py-4">Categoria</th>
              <th className="px-6 py-4">Ref/Obs</th>
              <th className="px-6 py-4">Pagamento</th>
              <th className="px-6 py-4">Tipo</th>
              <th className="px-6 py-4 text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filteredTransactions.map((t) => (
              <tr key={t.id} className="hover:bg-zinc-50 transition-colors text-xs border-b border-zinc-50">
                <td className="px-6 py-4 text-zinc-400 font-medium">{new Date(t.date || t.created_at).toLocaleDateString('pt-PT')}</td>
                <td className="px-6 py-4 font-bold text-zinc-900">
                  <div>{t.description}</div>
                </td>
                <td className="px-6 py-4 text-zinc-500 uppercase text-[10px] font-black tracking-tighter">{t.category}</td>
                <td className="px-6 py-4">
                  <p className="text-[10px] text-zinc-500 font-medium">{t.reference || '---'}</p>
                  {t.observation && <p className="text-[9px] text-zinc-400 italic mt-0.5">{t.observation}</p>}
                </td>
                <td className="px-6 py-4">
                  <span className="text-[9px] font-bold text-zinc-600 flex items-center gap-1.5 uppercase">
                    <CreditCard size={12} className="text-zinc-400" />
                    {t.payment_method || 'Caixa'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-none ${
                    t.type === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                  }`}>
                    {t.type === 'income' ? 'Entrada' : 'Saída'}
                  </span>
                </td>
                <td className={`px-6 py-4 text-right font-black ${t.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredTransactions.length === 0 && (
          <div className="p-12 text-center text-zinc-400 text-sm font-medium">Nenhum movimento registado.</div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg p-8 rounded-none shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-4">
              <h3 className="text-xl font-bold text-[#003366] uppercase tracking-tight">Novo Movimento Financeiro</h3>
              <button onClick={() => setShowForm(false)} className="text-zinc-400 hover:text-zinc-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Data</label>
                  <input 
                    type="date"
                    required 
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full border border-zinc-200 p-2.5 text-sm focus:outline-none focus:border-[#003366] bg-zinc-50 font-medium" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Tipo de Movimento</label>
                  <select 
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full border border-zinc-200 p-2.5 text-sm focus:outline-none focus:border-[#003366] bg-zinc-50 font-bold"
                  >
                    <option value="income">Entrada (Receita)</option>
                    <option value="expense">Saída (Despesa)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Descrição</label>
                <input 
                  required 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-zinc-200 p-2.5 text-sm focus:outline-none focus:border-[#003366] bg-zinc-50 font-medium" 
                  placeholder="Ex: Pagamento de luz, Venda avulsa..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Categoria</label>
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full border border-zinc-200 p-2.5 text-sm focus:outline-none focus:border-[#003366] bg-zinc-50 font-medium"
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Valor (Kz)</label>
                  <input 
                    type="number" 
                    required 
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full border border-zinc-200 p-2.5 text-sm focus:outline-none focus:border-[#003366] bg-zinc-50 font-bold" 
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Método de Pagamento</label>
                  <select 
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full border border-zinc-200 p-2.5 text-sm focus:outline-none focus:border-[#003366] bg-zinc-50 font-medium"
                  >
                    <option value="">Selecionar...</option>
                    {caixas.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    <option value="TPA">TPA</option>
                    <option value="Transferência">Transferência</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Referência (Doc nº)</label>
                  <input 
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="w-full border border-zinc-200 p-2.5 text-sm focus:outline-none focus:border-[#003366] bg-zinc-50 font-medium" 
                    placeholder="Ex: FT 2026/001"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Observações</label>
                <textarea 
                  value={observation}
                  onChange={(e) => setObservation(e.target.value)}
                  className="w-full border border-zinc-200 p-2.5 text-sm focus:outline-none focus:border-[#003366] bg-zinc-50 font-medium h-20 resize-none" 
                  placeholder="Informações adicionais..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 text-zinc-500 font-bold text-xs uppercase tracking-widest">Cancelar</button>
                <button type="submit" className="bg-[#003366] text-white px-8 py-2 font-bold text-xs uppercase tracking-widest hover:bg-[#002244] shadow-lg">Registar Movimento</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const FinancialModule = ({ 
  caixas, 
  setCaixas, 
  caixaMovements, 
  setCaixaMovements, 
  employees,
  user
}: { 
  caixas: Caixa[], 
  setCaixas: React.Dispatch<React.SetStateAction<Caixa[]>>,
  caixaMovements: CaixaMovement[],
  setCaixaMovements: React.Dispatch<React.SetStateAction<CaixaMovement[]>>,
  employees: Employee[],
  user: any
}) => {
  const [activeSubTab, setActiveSubTab] = useState('menu');
  const [issuedDocuments, setIssuedDocuments] = useState<IssuedDocument[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [selectedMonthForMap, setSelectedMonthForMap] = useState(new Date().toISOString().slice(0, 7));
  const [selectedMapSubTab, setSelectedMapSubTab] = useState('irt_inss');

  const fetchIssuedDocuments = () => {
    setLoading(true);
    fetchJson(`/api/issued-documents?company_id=${user?.company_id}`)
      .then(setIssuedDocuments)
      .catch(err => console.error('Error fetching issued documents:', err))
      .finally(() => setLoading(false));
  };

  const fetchTransactions = () => {
    setLoading(true);
    fetchJson(`/api/transactions?company_id=${user?.company_id}`)
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
    await fetchWithAuth('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description, amount: Number(amount), type, category: 'manual', company_id: user?.company_id })
    });
    setDescription(''); setAmount(''); setShowForm(false);
    fetchTransactions();
  };

  const menuItems = [
    { id: 'caixa', label: 'Sessões de Caixas', icon: Wallet, description: 'Gestão de fluxos financeiros e conciliação' },
    { id: 'irt_inss_map', label: 'Mapa Geral IRT/INSS', icon: Calculator, description: 'Relatório consolidado de encargos sociais' },
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

      {activeSubTab === 'caixa' && (
        <CaixaModule 
          caixas={caixas} 
          setCaixas={setCaixas} 
          movements={caixaMovements} 
          setMovements={setCaixaMovements} 
        />
      )}

      {activeSubTab === 'irt_inss_map' && (
        <MapaSalarios 
          localEmployees={employees}
          selectedMonthForMap={selectedMonthForMap}
          setSelectedMonthForMap={setSelectedMonthForMap}
          selectedMapSubTab="irt_inss"
          setSelectedMapSubTab={setSelectedMapSubTab}
          onSetEmployee={() => {}}
          onSetIsContractModalOpen={() => {}}
        />
      )}

      {activeSubTab === 'profit-loss-report' && (
        <ProfitLossReport fiscalYear={new Date().getFullYear().toString()} company_id={user?.company_id} />
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
                  <span className="font-bold text-emerald-600">{formatCurrency((transactions || []).filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0))}</span>
                </div>
                <div className="border-t border-zinc-100 pt-4 flex justify-between items-center font-bold">
                  <span className="text-zinc-900">Total Proveitos</span>
                  <span className="text-[#003366]">{formatCurrency((transactions || []).filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0))}</span>
                </div>
              </div>
            </div>
            <div className="bg-white border border-zinc-200 p-6 rounded-none shadow-sm">
              <h3 className="text-sm font-bold text-[#003366] uppercase tracking-wider mb-4">Resumo de Custos</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 text-sm">Despesas Operacionais</span>
                  <span className="font-bold text-red-600">{formatCurrency((transactions || []).filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0))}</span>
                </div>
                <div className="border-t border-zinc-100 pt-4 flex justify-between items-center font-bold">
                  <span className="text-zinc-900">Total Custos</span>
                  <span className="text-red-600">{formatCurrency((transactions || []).filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0))}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white border border-zinc-200 p-6 rounded-none shadow-sm">
            <h3 className="text-sm font-bold text-[#003366] uppercase tracking-wider mb-4">Resultado Líquido</h3>
            <div className="flex items-center gap-4">
              <div className="text-3xl font-bold text-[#003366]">
                {formatCurrency((transactions || []).filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0) - (transactions || []).filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0))}
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
        <OtherMovements transactions={transactions} onRefresh={fetchTransactions} caixas={caixas} user={user} />
      )}
    </div>
  );
};

const IssuedDocumentsList = ({ documents, onAction, onCertify, onViewDetail }: { 
  documents: IssuedDocument[], 
  onAction: (action: string, doc: IssuedDocument) => void, 
  onCertify: (doc: IssuedDocument) => void,
  onViewDetail?: (doc: IssuedDocument) => void
}) => {
  const [showActionsModal, setShowActionsModal] = useState<IssuedDocument | null>(null);
  const [showAnularModal, setShowAnularModal] = useState<IssuedDocument | null>(null);

  return (
    <div className="bg-white border border-zinc-200 rounded-none overflow-x-auto shadow-sm">
      <table className="w-full text-left border-collapse min-w-[1200px]">
        <thead>
          <tr className="bg-[#003366] text-white text-[10px] uppercase tracking-widest font-black border-b border-zinc-200">
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
            <tr 
              key={doc.id} 
              onClick={() => onViewDetail?.(doc)}
              className="hover:bg-zinc-50 text-xs border-b border-zinc-50 group transition-colors cursor-pointer"
            >
              <td className="px-6 py-4 text-zinc-900 font-bold whitespace-nowrap">
                {new Date(doc.date || doc.data_emissao || '').toLocaleDateString()}
              </td>
              <td className="px-6 py-4 text-zinc-500 whitespace-nowrap font-medium">
                {doc.due_date ? new Date(doc.due_date).toLocaleDateString() : (doc.data_vencimento ? new Date(doc.data_vencimento).toLocaleDateString() : 'N/A')}
              </td>
              <td className="px-6 py-4 font-black text-[#003366] whitespace-nowrap">
                <div className="uppercase tracking-tighter">{doc.document_type || doc.tipo_documento}</div>
                {doc.series_name && <div className="text-[9px] text-zinc-400 font-black uppercase tracking-widest">{doc.series_name}</div>}
              </td>
              <td className="px-6 py-4 font-mono text-[10px] text-zinc-600 font-black whitespace-nowrap bg-zinc-50/50">{doc.invoice_number || doc.numero_documento}</td>
              <td className="px-6 py-4 text-zinc-900 font-black min-w-[150px] uppercase">{doc.client_name || doc.cliente_id || doc.client_id}</td>
              <td className="px-6 py-4 text-zinc-500 font-bold text-[10px] uppercase tracking-tight">{doc.work_site_title || doc.local_trabalho || 'N/A'}</td>
              <td className="px-6 py-4">
                <span className="px-2 py-0.5 bg-zinc-100 text-zinc-600 uppercase text-[9px] font-black tracking-widest border border-zinc-200">
                  {doc.payment_method || 'N/A'}
                </span>
              </td>
              <td className="px-6 py-4 text-zinc-400 text-[9px] font-black uppercase tracking-widest">{doc.cash_box || 'N/A'}</td>
              <td className="px-6 py-4 text-right font-black text-[#003366] text-sm whitespace-nowrap">
                {formatCurrency(doc.counter_value || doc.total || doc.contravalor || 0)}
              </td>
              <td className="px-6 py-4 text-center">
                <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-none border ${(doc.status || doc.estado_documento) === 'ativo' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                  {(doc.status || doc.estado_documento) === 'anulado' ? 'ANULADO - SEM VALIDADE' : (doc.status || doc.estado_documento || 'ativo')}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center justify-center gap-3">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onAction('print_a4', doc);
                    }} 
                    title="Imprimir"
                    className="text-zinc-300 hover:text-[#003366] transition-all p-1.5 hover:bg-zinc-100"
                  >
                    <Printer size={14} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onCertify(doc);
                    }}
                    disabled={doc.is_certified}
                    title={doc.is_certified ? "Documento Certificado" : "Certificar Documento"}
                    className={`transition-all p-1.5 ${doc.is_certified ? 'text-emerald-500 cursor-default' : 'text-zinc-300 hover:text-emerald-500 hover:bg-emerald-50'}`}
                  >
                    <BadgeCheck size={16} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowActionsModal(doc);
                    }} 
                    title="Mais Ações"
                    className="text-zinc-300 hover:text-[#003366] transition-all p-1.5 hover:bg-zinc-100"
                  >
                    <MoreHorizontal size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {documents.length === 0 && (
        <div className="p-20 text-center">
          <FileText size={48} className="mx-auto text-zinc-100 mb-4" />
          <p className="text-zinc-400 text-sm font-bold uppercase tracking-widest">Nenhum documento emitido até ao momento.</p>
        </div>
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
              className="relative w-full max-w-xl bg-white p-8 rounded-none shadow-2xl border-t-4 border-[#003366]"
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="font-black text-[#003366] text-xl uppercase tracking-tighter">Opções do Documento</h3>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.2em] mt-1">
                     {showActionsModal.numero_documento || showActionsModal.invoice_number} • {showActionsModal.client_name}
                  </p>
                </div>
                <button onClick={() => setShowActionsModal(null)} className="text-zinc-400 hover:text-red-500 transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto pr-2 p-1 custom-scrollbar">
                {/* 1. Editar Documento */}
                <button 
                  onClick={() => { onAction('edit', showActionsModal); setShowActionsModal(null); }}
                  className="w-full flex items-center gap-4 p-4 hover:bg-zinc-50 transition-all border border-zinc-100 group shadow-sm bg-white"
                >
                  <div className={`w-10 h-10 flex items-center justify-center transition-colors ${showActionsModal.is_certified ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-[#003366]'} group-hover:bg-[#003366] group-hover:text-white`}>
                    <Edit size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-zinc-900 text-xs uppercase">Editar Documento</p>
                    <p className="text-[9px] text-zinc-500 uppercase tracking-tighter">
                      {showActionsModal.is_certified ? 'Apenas campos não fiscais' : 'Edição completa permitida'}
                    </p>
                  </div>
                </button>

                {/* 2. Clonar Documento */}
                <button 
                  onClick={() => { onAction('clone', showActionsModal); setShowActionsModal(null); }}
                  className="w-full flex items-center gap-4 p-4 hover:bg-zinc-50 transition-all border border-zinc-100 group shadow-sm bg-white"
                >
                  <div className="w-10 h-10 bg-zinc-100 text-zinc-600 flex items-center justify-center group-hover:bg-[#003366] group-hover:text-white transition-colors">
                    <Copy size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-zinc-900 text-xs uppercase">Clonar Documento</p>
                    <p className="text-[9px] text-zinc-500 uppercase tracking-tighter">Duplicar c/ nova numeração</p>
                  </div>
                </button>

                {/* 3. Exportar PDF */}
                <button 
                  onClick={() => { onAction('export_pdf', showActionsModal); setShowActionsModal(null); }}
                  className="w-full flex items-center gap-4 p-4 hover:bg-zinc-50 transition-all border border-zinc-100 group shadow-sm bg-white"
                >
                  <div className="w-10 h-10 bg-zinc-100 text-red-600 flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-colors">
                    <FileDown size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-zinc-900 text-xs uppercase">Exportar PDF</p>
                    <p className="text-[9px] text-zinc-500 uppercase tracking-tighter">Baixar formato A4 Profissional</p>
                  </div>
                </button>

                {/* 4. Enviar Email / WhatsApp */}
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => { onAction('send_email', showActionsModal); setShowActionsModal(null); }}
                    className="flex flex-col items-center justify-center gap-2 p-3 hover:bg-zinc-50 transition-all border border-zinc-100 group bg-white"
                  >
                    <Mail size={18} className="text-[#003366] group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-zinc-900 text-[9px] uppercase tracking-widest">Email</span>
                  </button>
                  <button 
                    onClick={() => { onAction('share_whatsapp', showActionsModal); setShowActionsModal(null); }}
                    className="flex flex-col items-center justify-center gap-2 p-3 hover:bg-zinc-50 transition-all border border-zinc-100 group bg-white"
                  >
                    <MessageCircle size={18} className="text-emerald-600 group-hover:scale-110 transition-transform" />
                    <span className="font-bold text-zinc-900 text-[9px] uppercase tracking-widest">WhatsApp</span>
                  </button>
                </div>

                {/* 5. Impressões Térmicas */}
                <div className="col-span-2 grid grid-cols-4 gap-2 bg-zinc-50 p-3 border border-zinc-100 text-center">
                   <button onClick={() => { onAction('print_a4', showActionsModal); setShowActionsModal(null); }} className="flex flex-col items-center gap-1 p-2 hover:bg-white transition-all border border-transparent hover:border-zinc-200">
                     <Printer size={16} className="text-zinc-400" />
                     <span className="text-[8px] font-black uppercase">A4</span>
                   </button>
                   <button onClick={() => { onAction('print_p24', showActionsModal); setShowActionsModal(null); }} className="flex flex-col items-center gap-1 p-2 hover:bg-white transition-all border border-transparent hover:border-zinc-200">
                     <Printer size={16} className="text-zinc-400" />
                     <span className="text-[8px] font-black uppercase">P24</span>
                   </button>
                   <button onClick={() => { onAction('print_p24xl', showActionsModal); setShowActionsModal(null); }} className="flex flex-col items-center gap-1 p-2 hover:bg-white transition-all border border-transparent hover:border-zinc-200">
                     <Printer size={16} className="text-zinc-400" />
                     <span className="text-[8px] font-black uppercase">P24-XL</span>
                   </button>
                   <button onClick={() => { onAction('print_p80', showActionsModal); setShowActionsModal(null); }} className="flex flex-col items-center gap-1 p-2 hover:bg-white transition-all border border-transparent hover:border-zinc-200">
                     <Printer size={16} className="text-zinc-400" />
                     <span className="text-[8px] font-black uppercase">P80</span>
                   </button>
                </div>

                {/* 6. Recibo (Apenas Faturas) */}
                <button 
                  disabled={!(showActionsModal.document_type === 'Fatura' || showActionsModal.tipo_documento === 'FT') || showActionsModal.status === 'pago'}
                  onClick={() => { onAction('receipt', showActionsModal); setShowActionsModal(null); }}
                  className={`w-full flex items-center gap-4 p-4 transition-all border shadow-sm ${(!(showActionsModal.document_type === 'Fatura' || showActionsModal.tipo_documento === 'FT') || showActionsModal.status === 'pago') ? 'bg-zinc-50 border-zinc-100 opacity-50 cursor-not-allowed' : 'bg-white border-zinc-100 hover:bg-zinc-50 group'}`}
                >
                  <div className="w-10 h-10 bg-zinc-100 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <Receipt size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-zinc-900 text-xs uppercase">Liquidar / Recibo</p>
                    <p className="text-[9px] text-zinc-500 uppercase tracking-tighter">Registar pagamento parcial ou total</p>
                  </div>
                </button>

                {/* 7. Guia de Entrega / Nota de Crédito */}
                <div className="grid grid-cols-1 gap-2">
                   <button 
                     disabled={!showActionsModal.is_certified}
                     onClick={() => { onAction('delivery_guide', showActionsModal); setShowActionsModal(null); }}
                     className={`flex items-center gap-3 p-3 transition-all border ${!showActionsModal.is_certified ? 'bg-zinc-50 border-zinc-100 opacity-50 cursor-not-allowed' : 'bg-white border-blue-50 hover:bg-blue-50 group'}`}
                   >
                     <Truck size={16} className="text-blue-600" />
                     <span className="font-bold text-zinc-900 text-[9px] uppercase tracking-widest">Guia de Entrega</span>
                   </button>
                   <button 
                     disabled={!showActionsModal.is_certified}
                     onClick={() => { onAction('credit_note', showActionsModal); setShowActionsModal(null); }}
                     className={`flex items-center gap-3 p-3 transition-all border ${!showActionsModal.is_certified ? 'bg-zinc-50 border-zinc-100 opacity-50 cursor-not-allowed' : 'bg-white border-red-50 hover:bg-red-50 group'}`}
                   >
                     <FileMinus2 size={16} className="text-red-600" />
                     <span className="font-bold text-zinc-900 text-[9px] uppercase tracking-widest">Nota de Crédito</span>
                   </button>
                </div>

                {/* 8. Anular Documento (SENSÍVEL) */}
                <button 
                  disabled={!showActionsModal.is_certified || showActionsModal.status === 'anulado'}
                  onClick={() => { onAction('void', showActionsModal); setShowActionsModal(null); }}
                  className={`col-span-2 w-full flex items-center gap-4 p-4 transition-all border shadow-sm ${(!showActionsModal.is_certified || showActionsModal.status === 'anulado') ? 'bg-zinc-50 border-zinc-100 opacity-50 cursor-not-allowed' : 'bg-red-50 border-red-100 hover:bg-red-100 group'}`}
                >
                  <div className="w-10 h-10 bg-white text-red-600 flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-colors border border-red-200">
                    <Trash2 size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-red-700 text-xs uppercase">Anular Documento</p>
                    <p className="text-[9px] text-red-400 uppercase tracking-tighter">Operação irreversível • Gera Nota de Crédito</p>
                  </div>
                </button>

                {/* 9. Faturar / Converter */}
                <button 
                  onClick={() => { onAction('convert', showActionsModal); setShowActionsModal(null); }}
                  className="col-span-2 w-full flex items-center gap-4 p-4 hover:bg-zinc-50 transition-all border border-zinc-100 group shadow-sm bg-white"
                >
                  <div className="w-10 h-10 bg-zinc-100 text-[#003366] flex items-center justify-center group-hover:bg-[#003366] group-hover:text-white transition-colors">
                    <RefreshCw size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-zinc-900 text-xs uppercase">Faturar / Converter</p>
                    <p className="text-[9px] text-zinc-500 uppercase tracking-tighter">Transformar em outro tipo de documento fiscal</p>
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

const POSManagementView = ({ 
  title, 
  icon: Icon, 
  onBack,
  caixas = [],
  invoices = [],
  issuedDocuments = [],
  clients = [],
  workSites = [],
  employees = [],
  onNew = () => {},
  onView = () => {},
  onRegisterClient = () => {},
  onAddWorkSite = () => {},
  onUpdateWorkSite = () => {},
  onAction = (action: string, doc: IssuedDocument) => {},
  onCertify = (doc: IssuedDocument) => {}
}: { 
  title: string, 
  icon: any, 
  onBack: () => void,
  caixas?: Caixa[],
  invoices?: Invoice[],
  issuedDocuments?: IssuedDocument[],
  clients?: Client[],
  workSites?: WorkSite[],
  employees?: Employee[],
  onNew?: () => void,
  onView?: (id: number) => void,
  onRegisterClient?: () => void,
  onAddWorkSite?: (site: Omit<WorkSite, 'id'>) => void,
  onUpdateWorkSite?: (id: number, site: Omit<WorkSite, 'id'>) => void,
  onAction?: (action: string, doc: IssuedDocument) => void,
  onCertify?: (doc: IssuedDocument) => void
}) => {
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

const POSModule = ({ products, onRefresh, caixas }: { products: Product[], onRefresh: () => void, caixas: Caixa[] }) => {
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
  const [paymentMethod, setPaymentMethod] = useState('');
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

  const subtotal = (cart ?? []).reduce((sum, item) => sum + (item.product.price * item.qty), 0);
  const itemDiscounts = (cart ?? []).reduce((sum, item) => sum + (item.discount), 0);
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
      const posRes = await fetchWithAuth('/api/pos/sales', {
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
      const invRes = await fetchWithAuth('/api/invoices', {
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
    const res = await fetchWithAuth('/api/cash/open', {
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
    const res = await fetchWithAuth(`/api/cash/close/${activeSession.id}`, {
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
    const res = await fetchWithAuth('/api/pos-points', {
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
      return <POSManagementView title={item.label} icon={item.icon} onBack={() => setActiveArea('dashboard')} caixas={caixas} invoices={[]} issuedDocuments={[]} clients={[]} workSites={[]} employees={[]} onNew={() => {}} onView={() => {}} onRegisterClient={() => {}} onAddWorkSite={() => {}} onUpdateWorkSite={() => {}} onAction={(action, doc) => {}} onCertify={() => {}} />;
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
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Caixa / Meio de Pagamento</label>
                <select 
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full bg-white border border-zinc-200 px-3 py-2 font-bold text-[#003366] focus:outline-none focus:border-[#003366] text-xs"
                >
                  <option value="">Selecionar...</option>
                  {caixas.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                  <option value="TPA">TPA</option>
                  <option value="Transferência">Transferência</option>
                </select>
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
  const [activeModule, setActiveModule] = useState<string | null>(null);

  if (activeModule === 'literacy') return (
    <div>
      <button onClick={() => setActiveModule(null)} className="mb-4 text-[#003366] font-bold text-xs uppercase hover:underline flex items-center gap-1">← Voltar para Gestão Especializada</button>
      <LiteracyModule />
    </div>
  );

  if (activeModule === 'school') return (
    <div>
      <button onClick={() => setActiveModule(null)} className="mb-4 text-[#003366] font-bold text-xs uppercase hover:underline flex items-center gap-1">← Voltar para Gestão Especializada</button>
      <SchoolModule />
    </div>
  );
  
  if (activeModule === 'restaurant') return (
    <div>
      <button onClick={() => setActiveModule(null)} className="mb-4 text-[#003366] font-bold text-xs uppercase hover:underline flex items-center gap-1">← Voltar para Gestão Especializada</button>
      <RestaurantModule />
    </div>
  );

  if (activeModule === 'hotel') return (
    <div>
      <button onClick={() => setActiveModule(null)} className="mb-4 text-[#003366] font-bold text-xs uppercase hover:underline flex items-center gap-1">← Voltar para Gestão Especializada</button>
      <HotelModule />
    </div>
  );

  if (activeModule === 'fleet') return (
    <div>
      <button onClick={() => setActiveModule(null)} className="mb-4 text-[#003366] font-bold text-xs uppercase hover:underline flex items-center gap-1">← Voltar para Gestão Especializada</button>
      <FleetManagementModule />
    </div>
  );

  if (activeModule === 'projects') return (
    <div>
      <button onClick={() => setActiveModule(null)} className="mb-4 text-[#003366] font-bold text-xs uppercase hover:underline flex items-center gap-1">← Voltar para Gestão Especializada</button>
      <ProjectManagementModule />
    </div>
  );

  return (
    <div className="space-y-8">
      <header>
        <Breadcrumbs paths={['Home', 'Área Reservada', 'Gestão Especializada']} />
        <h2 className="text-2xl font-bold text-[#003366] tracking-tight">Gestão Especializada</h2>
        <p className="text-zinc-500 text-sm">Módulos de ERP focados para gerir fluxos de trabalho do seu setor.</p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          { id: 'school', label: 'Gestão Escolar ERP', desc: 'Matrículas, Turmas, Notas e Tesouraria Académica.', icon: GraduationCap },
          { id: 'restaurant', label: 'Restaurante / Bar', desc: 'Gestão de mesas, pedidos Cozinha/Bar e Ementa.', icon: Utensils },
          { id: 'hotel', label: 'Hotelaria / Alojamento', desc: 'Check-in, Reservas, Quartos e Housekeeping.', icon: Bed },
          { id: 'literacy', label: 'Literacia Financeira e Fiscal', desc: 'Biblioteca de conhecimentos fiscais angolanos.', icon: BookOpen },
          { id: 'inventory', label: 'Inventário / Stock', desc: 'Controlo de stock e múltiplos armazéns.', icon: Package },
          { id: 'projects', label: 'Gestão de Projetos', desc: 'Acompanhamento de tarefas e prazos.', icon: Layers },
          { id: 'fleet', label: 'Gestão de Frotas', desc: 'Manutenção e custos de veículos.', icon: Truck },
        ].map((m) => (
          <div key={m.id} 
            onClick={() => setActiveModule(m.id)}
            className="bg-white border border-zinc-200 p-8 rounded-none shadow-sm space-y-4 hover:border-[#003366] transition-colors cursor-pointer group"
          >
            <div className="w-12 h-12 bg-[#003366]/5 text-[#003366] rounded-none flex items-center justify-center transition-colors group-hover:bg-[#003366] group-hover:text-white">
              <m.icon size={24} />
            </div>
            <h3 className="font-bold text-[#003366] text-lg">{m.label}</h3>
            <p className="text-zinc-500 text-sm min-h-[40px]">{m.desc}</p>
            <div className="pt-4 flex items-center text-xs font-bold text-[#003366] uppercase tracking-widest">
              Entrar no Módulo <ChevronRight size={14} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
const UsersSettings = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [profession, setProfession] = useState('');
  const [date, setDate] = useState('');
  const [permissionArea, setPermissionArea] = useState('');
  const [contact, setContact] = useState('');
  const [morada, setMorada] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await fetchWithAuth(`/api/system-users?company_id=${user?.company_id}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    if (user?.company_id) {
      fetchUsers();
    }
  }, [user?.company_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchWithAuth('/api/system-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          profession,
          date,
          permission_area: permissionArea,
          contact,
          morada,
          company_id: user?.company_id
        })
      });
      if (res.ok) {
        fetchUsers();
        setShowForm(false);
        setName(''); setProfession(''); setDate(''); setPermissionArea(''); setContact(''); setMorada('');
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
                <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full bg-zinc-50 border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Profissão</label>
                <input type="text" value={profession} onChange={e => setProfession(e.target.value)} className="w-full bg-zinc-50 border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Data</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-zinc-50 border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Área de Permissão</label>
                <select value={permissionArea} onChange={e => setPermissionArea(e.target.value)} className="w-full bg-zinc-50 border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm">
                  <option value="">Selecionar Área</option>
                  <option value="admin">Administrador</option>
                  <option value="faturacao">Faturação</option>
                  <option value="rh">Recursos Humanos</option>
                  <option value="financeiro">Financeiro</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Contacto</label>
                <input type="text" value={contact} onChange={e => setContact(e.target.value)} className="w-full bg-zinc-50 border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Morada</label>
                <input type="text" value={morada} onChange={e => setMorada(e.target.value)} className="w-full bg-zinc-50 border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" />
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

const MapaSalarios = ({ localEmployees, selectedMonthForMap, setSelectedMonthForMap, selectedMapSubTab, setSelectedMapSubTab, onSetEmployee, onSetIsContractModalOpen }: { 
  localEmployees: Employee[], 
  selectedMonthForMap: string, 
  setSelectedMonthForMap: (m: string) => void, 
  selectedMapSubTab: string, 
  setSelectedMapSubTab: (s: string) => void,
  onSetEmployee: (e: Employee) => void,
  onSetIsContractModalOpen: (o: boolean) => void
}) => {
  const mapTabs = [
    { id: 'inss', label: 'MAPA INSS', icon: <ShieldCheck size={16} /> },
    { id: 'colaboradores', label: 'MAPA COLABORADORES', icon: <Users size={16} /> },
    { id: 'efetividade', label: 'MAPA EFETIVIDADE', icon: <Clock size={16} /> },
    { id: 'irt_inss', label: 'MAPA IRT E INSS', icon: <Calculator size={16} /> },
    { id: 'relatorios', label: 'RELATÓRIOS', icon: <FileText size={16} /> },
  ];

  const renderMapContent = () => {
    switch (selectedMapSubTab) {
      case 'inss':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-end border-b-2 border-[#003366] pb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#003366] flex items-center justify-center">
                  <ShieldCheck className="text-white" size={24} />
                </div>
                <div>
                  <h4 className="text-lg font-black text-[#003366] uppercase tracking-tighter">Mapa de Contribuições INSS</h4>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Folha de Remunerações para a Segurança Social</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-zinc-500 uppercase">Período de Referência</p>
                <p className="text-sm font-black text-[#003366]">{selectedMonthForMap}</p>
              </div>
            </div>

            <table className="w-full text-left border-collapse min-w-[1000px] text-[10px]">
              <thead>
                <tr className="bg-[#003366] text-white uppercase tracking-widest font-black">
                  <th className="px-4 py-4 border-r border-white/10">No inss</th>
                  <th className="px-4 py-4 border-r border-white/10">Cód Prof</th>
                  <th className="px-4 py-4 border-r border-white/10 min-w-[200px]">Segurado (Nome Completo)</th>
                  <th className="px-4 py-4 border-r border-white/10 text-right">Vencimento Base</th>
                  <th className="px-4 py-4 border-r border-white/10 text-right">Outras Remunerações</th>
                  <th className="px-4 py-4 border-r border-white/10 text-right">Parcela Contribuinte (8%)</th>
                  <th className="px-4 py-4 border-r border-white/10 text-right">Parcela Segurado (3%)</th>
                  <th className="px-4 py-4 border-r border-white/10 text-center">Taxa Seg</th>
                  <th className="px-4 py-4 border-r border-white/10 text-right">Valor Final</th>
                  <th className="px-4 py-4 text-right">Total Remuneração</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {localEmployees.map((emp, idx) => {
                  const rem = emp.salary;
                  const otherRem = 0;
                  const totalRem = rem + otherRem;
                  const inss3 = totalRem * 0.03;
                  const inss8 = totalRem * 0.08;
                  const totalInss = inss3 + inss8;
                  return (
                    <tr key={emp.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-4 py-3 border-r border-zinc-100 font-mono text-zinc-500">{emp.inss_number || `000${idx + 1}`}</td>
                      <td className="px-4 py-3 border-r border-zinc-100 font-mono text-zinc-400">001</td>
                      <td className="px-4 py-3 border-r border-zinc-100 font-black text-[#003366] uppercase">{emp.name}</td>
                      <td className="px-4 py-3 border-r border-zinc-100 text-right font-mono">{formatCurrency(rem)}</td>
                      <td className="px-4 py-3 border-r border-zinc-100 text-right font-mono text-zinc-400">{formatCurrency(otherRem)}</td>
                      <td className="px-4 py-3 border-r border-zinc-100 text-right font-mono text-blue-600 font-bold">{formatCurrency(inss8)}</td>
                      <td className="px-4 py-3 border-r border-zinc-100 text-right font-mono text-red-500 font-bold">{formatCurrency(inss3)}</td>
                      <td className="px-4 py-3 border-r border-zinc-100 text-center font-bold text-zinc-400">3%</td>
                      <td className="px-4 py-3 border-r border-zinc-100 text-right font-mono font-black text-zinc-900">{formatCurrency(totalInss)}</td>
                      <td className="px-4 py-3 text-right font-mono font-black text-[#003366]">{formatCurrency(totalRem)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-zinc-900 text-white font-black uppercase tracking-widest">
                  <td colSpan={3} className="px-4 py-4">TOTAIS ACUMULADOS</td>
                  <td className="px-4 py-4 text-right font-mono">{formatCurrency((localEmployees || []).reduce((sum, e) => sum + e.salary, 0))}</td>
                  <td className="px-4 py-4 text-right font-mono">0,00 Kz</td>
                  <td className="px-4 py-4 text-right font-mono text-blue-400">{formatCurrency((localEmployees || []).reduce((sum, e) => sum + e.salary * 0.08, 0))}</td>
                  <td className="px-4 py-4 text-right font-mono text-red-400">{formatCurrency((localEmployees || []).reduce((sum, e) => sum + e.salary * 0.03, 0))}</td>
                  <td className="px-4 py-4 text-center">---</td>
                  <td className="px-4 py-4 text-right font-mono">{formatCurrency((localEmployees || []).reduce((sum, e) => sum + e.salary * 0.11, 0))}</td>
                  <td className="px-4 py-4 text-right font-mono">{formatCurrency((localEmployees || []).reduce((sum, e) => sum + e.salary, 0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        );
      case 'colaboradores':
        return (
          <table className="w-full text-left border-collapse min-w-[1000px] text-[10px]">
            <thead>
              <tr className="bg-[#003366] text-white uppercase tracking-widest font-black">
                <th className="px-4 py-4 border-r border-white/10">ID</th>
                <th className="px-4 py-4 border-r border-white/10 min-w-[200px]">NOME COMPLETO</th>
                <th className="px-4 py-4 border-r border-white/10">CARGO / FUNÇÃO</th>
                <th className="px-4 py-4 border-r border-white/10">NIF</th>
                <th className="px-4 py-4 border-r border-white/10">IBAN</th>
                <th className="px-4 py-4 text-right">SALÁRIO BASE</th>
                <th className="px-4 py-4 text-right">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {localEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-3 border-r border-zinc-100 font-bold text-zinc-400">{emp.id}</td>
                  <td className="px-4 py-3 border-r border-zinc-100 font-black text-[#003366] uppercase">{emp.name}</td>
                  <td className="px-4 py-3 border-r border-zinc-100 uppercase font-bold text-zinc-500">{emp.role}</td>
                  <td className="px-4 py-3 border-r border-zinc-100 font-mono">{emp.nif || '---'}</td>
                  <td className="px-4 py-3 border-r border-zinc-100 font-mono text-[9px]">{emp.iban || '---'}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold">{formatCurrency(emp.salary)}</td>
                  <td className="px-4 py-3 text-right">
                    <button 
                      onClick={() => { onSetEmployee(emp); onSetIsContractModalOpen(true); }}
                      className="text-[9px] bg-[#003366] text-white px-2 py-1 rounded hover:bg-[#002244]"
                    >
                      Emitir Contrato
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case 'efetividade':
        return (
          <table className="w-full text-left border-collapse min-w-[1000px] text-[10px]">
            <thead>
              <tr className="bg-[#003366] text-white uppercase tracking-widest font-black">
                <th className="px-4 py-4 border-r border-white/10">Nº</th>
                <th className="px-4 py-4 border-r border-white/10 min-w-[200px]">NOME DO FUNCIONÁRIO</th>
                <th className="px-4 py-4 border-r border-white/10 text-center">DIAS ÚTEIS</th>
                <th className="px-4 py-4 border-r border-white/10 text-center">PRESENÇAS</th>
                <th className="px-4 py-4 border-r border-white/10 text-center">FALTAS JUST.</th>
                <th className="px-4 py-4 border-r border-white/10 text-center">FALTAS INJUST.</th>
                <th className="px-4 py-4 text-center">EFETIVIDADE (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {localEmployees.map((emp, idx) => (
                <tr key={emp.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-3 border-r border-zinc-100 font-bold text-zinc-400">{idx + 1}</td>
                  <td className="px-4 py-3 border-r border-zinc-100 font-black text-[#003366] uppercase">{emp.name}</td>
                  <td className="px-4 py-3 border-r border-zinc-100 text-center font-bold">22</td>
                  <td className="px-4 py-3 border-r border-zinc-100 text-center font-bold text-emerald-600">22</td>
                  <td className="px-4 py-3 border-r border-zinc-100 text-center font-bold text-blue-500">0</td>
                  <td className="px-4 py-3 border-r border-zinc-100 text-center font-bold text-red-500">0</td>
                  <td className="px-4 py-3 text-center font-black text-emerald-600">100%</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case 'relatorios':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-end border-b-2 border-[#003366] pb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#003366] flex items-center justify-center">
                  <FileText className="text-white" size={24} />
                </div>
                <div>
                  <h4 className="text-lg font-black text-[#003366] uppercase tracking-tighter">Relatórios</h4>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Relatórios Diversos</p>
                </div>
              </div>
            </div>
            <div className="bg-white border border-zinc-200 p-8 text-center text-zinc-500">
              <FileText size={48} className="mx-auto text-zinc-300 mb-4" />
              <h3 className="text-lg font-bold text-[#003366] mb-2">Relatórios em Desenvolvimento</h3>
              <p className="text-sm">Esta secção estará disponível em breve.</p>
            </div>
          </div>
        );
      case 'irt_inss':
      default:
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-start border-b-2 border-[#003366] pb-6">
              <div className="flex gap-6">
                <div className="w-20 h-20 bg-[#003366] flex items-center justify-center">
                  <Calculator className="text-white" size={40} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-2xl font-black text-[#003366] uppercase tracking-tighter">MAPA GERAL IRT / INSS</h4>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Relatório Consolidado de Encargos Sociais e Impostos</p>
                  <div className="flex gap-4 mt-2">
                    <div className="text-[10px] font-bold text-zinc-400 uppercase">Empresa: <span className="text-zinc-900">C&V Enterprise</span></div>
                    <div className="text-[10px] font-bold text-zinc-400 uppercase">NIF: <span className="text-zinc-900">5000780316</span></div>
                    <div className="text-[10px] font-bold text-zinc-400 uppercase">INSS: <span className="text-zinc-900">6061684</span></div>
                  </div>
                </div>
              </div>
              <div className="bg-zinc-900 text-white p-4 text-center min-w-[150px]">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Mês de Referência</p>
                <p className="text-xl font-black uppercase">{selectedMonthForMap}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1800px] text-[9px]">
                <thead>
                  <tr className="bg-[#003366] text-white uppercase tracking-widest font-black">
                    <th className="px-2 py-4 border-r border-white/10 sticky left-0 bg-[#003366] z-10">No Ident.</th>
                    <th className="px-2 py-4 border-r border-white/10 min-w-[180px] sticky left-[60px] bg-[#003366] z-10">Nome do Funcionário</th>
                    <th className="px-2 py-4 border-r border-white/10 text-right">Venc. Base</th>
                    <th className="px-2 py-4 border-r border-white/10 text-right">Faltas</th>
                    <th className="px-2 py-4 border-r border-white/10 text-right">H. Extra</th>
                    <th className="px-2 py-4 border-r border-white/10 text-right">Sub. Natal</th>
                    <th className="px-2 py-4 border-r border-white/10 text-right">Sub. Férias</th>
                    <th className="px-2 py-4 border-r border-white/10 text-right">Sub. Transp.</th>
                    <th className="px-2 py-4 border-r border-white/10 text-right">Sub. Alim.</th>
                    <th className="px-2 py-4 border-r border-white/10 text-right">Outros Sub.</th>
                    <th className="px-2 py-4 border-r border-white/10 text-right bg-zinc-800">Bruto Total</th>
                    <th className="px-2 py-4 border-r border-white/10 text-right text-red-300">INSS (3%)</th>
                    <th className="px-2 py-4 border-r border-white/10 text-right text-blue-300">INSS (8%)</th>
                    <th className="px-2 py-4 border-r border-white/10 text-right font-bold">Mat. Colect.</th>
                    <th className="px-2 py-4 border-r border-white/10 text-right text-red-400">IRT</th>
                    <th className="px-2 py-4 border-r border-white/10 text-right">Outros Desc.</th>
                    <th className="px-2 py-4 text-right bg-emerald-600">Líquido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {localEmployees.map((emp, idx) => {
                    const inss3 = emp.salary * 0.03;
                    const inss8 = emp.salary * 0.08;
                    const base = emp.salary - inss3;
                    const irt = calculateIRT(base);
                    const subsidies = 0; 
                    const gross = emp.salary + subsidies;
                    const net = gross - inss3 - irt;
                    return (
                      <tr key={emp.id} className="hover:bg-zinc-50 transition-colors">
                        <td className="px-2 py-3 border-r border-zinc-100 font-bold text-zinc-400 sticky left-0 bg-white">{idx + 1}</td>
                        <td className="px-2 py-3 border-r border-zinc-100 font-black text-[#003366] uppercase sticky left-[60px] bg-white">{emp.name}</td>
                        <td className="px-2 py-3 border-r border-zinc-100 text-right font-mono">{formatCurrency(emp.salary)}</td>
                        <td className="px-2 py-3 border-r border-zinc-100 text-right font-mono text-red-400">0,00</td>
                        <td className="px-2 py-3 border-r border-zinc-100 text-right font-mono text-emerald-600">0,00</td>
                        <td className="px-2 py-3 border-r border-zinc-100 text-right font-mono">0,00</td>
                        <td className="px-2 py-3 border-r border-zinc-100 text-right font-mono">0,00</td>
                        <td className="px-2 py-3 border-r border-zinc-100 text-right font-mono">0,00</td>
                        <td className="px-2 py-3 border-r border-zinc-100 text-right font-mono">0,00</td>
                        <td className="px-2 py-3 border-r border-zinc-100 text-right font-mono">0,00</td>
                        <td className="px-2 py-3 border-r border-zinc-100 text-right font-mono font-bold bg-zinc-50">{formatCurrency(gross)}</td>
                        <td className="px-2 py-3 border-r border-zinc-100 text-right font-mono text-red-500">{formatCurrency(inss3)}</td>
                        <td className="px-2 py-3 border-r border-zinc-100 text-right font-mono text-blue-500">{formatCurrency(inss8)}</td>
                        <td className="px-2 py-3 border-r border-zinc-100 text-right font-mono text-zinc-500 font-bold">{formatCurrency(base)}</td>
                        <td className="px-2 py-3 border-r border-zinc-100 text-right font-mono text-red-600 font-bold">{formatCurrency(irt)}</td>
                        <td className="px-2 py-3 border-r border-zinc-100 text-right font-mono text-red-400">0,00</td>
                        <td className="px-2 py-3 text-right font-mono font-black text-emerald-700 bg-emerald-50">{formatCurrency(net)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-zinc-900 text-white font-black uppercase tracking-widest">
                    <td colSpan={2} className="px-2 py-4 sticky left-0 bg-zinc-900 z-10">TOTAIS GERAIS</td>
                    <td className="px-2 py-4 text-right font-mono">{formatCurrency((localEmployees || []).reduce((sum, e) => sum + e.salary, 0))}</td>
                    <td className="px-2 py-4 text-right font-mono">0,00</td>
                    <td className="px-2 py-4 text-right font-mono">0,00</td>
                    <td className="px-2 py-4 text-right font-mono">0,00</td>
                    <td className="px-2 py-4 text-right font-mono">0,00</td>
                    <td className="px-2 py-4 text-right font-mono">0,00</td>
                    <td className="px-2 py-4 text-right font-mono">0,00</td>
                    <td className="px-2 py-4 text-right font-mono">0,00</td>
                    <td className="px-2 py-4 text-right font-mono">{formatCurrency((localEmployees || []).reduce((sum, e) => sum + e.salary, 0))}</td>
                    <td className="px-2 py-4 text-right font-mono text-red-400">{formatCurrency((localEmployees || []).reduce((sum, e) => sum + e.salary * 0.03, 0))}</td>
                    <td className="px-2 py-4 text-right font-mono text-blue-400">{formatCurrency((localEmployees || []).reduce((sum, e) => sum + e.salary * 0.08, 0))}</td>
                    <td className="px-2 py-4 text-right font-mono">{formatCurrency((localEmployees || []).reduce((sum, e) => sum + (e.salary * 0.97), 0))}</td>
                    <td className="px-2 py-4 text-right font-mono text-red-400">{formatCurrency((localEmployees || []).reduce((sum, e) => sum + calculateIRT(e.salary * 0.97), 0))}</td>
                    <td className="px-2 py-4 text-right font-mono">0,00</td>
                    <td className="px-2 py-4 text-right font-mono text-emerald-400">{formatCurrency((localEmployees || []).reduce((sum, e) => sum + (e.salary * 0.97 - calculateIRT(e.salary * 0.97)), 0))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        );
    }
  };

  const downloadPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    const title = mapTabs.find(t => t.id === selectedMapSubTab)?.label || 'MAPA';
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(10);
    doc.text(`Período: ${selectedMonthForMap}`, 14, 30);
    
    const table = document.querySelector('.printable-area table');
    if (table) {
      autoTable(doc, { 
        html: table as HTMLTableElement,
        startY: 35,
        styles: { fontSize: 7, cellPadding: 1 },
        headStyles: { fillColor: [0, 51, 102] }
      });
      doc.save(`${(title || '').toLowerCase().replace(/ /g, '_')}_${selectedMonthForMap}.pdf`);
    }
  };

  const downloadExcel = () => {
    const table = document.querySelector('.printable-area table');
    if (table) {
      const wb = XLSX.utils.table_to_book(table);
      const title = mapTabs.find(t => t.id === selectedMapSubTab)?.label || 'MAPA';
      XLSX.writeFile(wb, `${title.toLowerCase().replace(/ /g, '_')}_${selectedMonthForMap}.xlsx`);
    }
  };

  return (
    <div className="bg-white border border-zinc-200 rounded-none overflow-hidden shadow-sm">
      <div className="p-6 border-b border-zinc-100 bg-zinc-50 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-[#003366] text-white p-2">
            <Map size={20} />
          </div>
          <div>
            <h3 className="font-black text-[#003366] uppercase tracking-widest text-sm">Mapas de Salários e Encargos</h3>
            <p className="text-[10px] text-zinc-400 uppercase tracking-tighter">Relatórios Consolidados de RH</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={selectedMonthForMap}
            onChange={(e) => setSelectedMonthForMap(e.target.value)}
            className="border border-zinc-200 px-4 py-2 text-xs font-bold text-[#003366] focus:outline-none focus:border-[#003366]"
          >
            <option value="2026-01">Janeiro / 2026</option>
            <option value="2026-02">Fevereiro / 2026</option>
            <option value="2026-03">Março / 2026</option>
            <option value="2026-04">Abril / 2026</option>
            <option value="2026-05">Maio / 2026</option>
            <option value="2026-06">Junho / 2026</option>
            <option value="2026-07">Julho / 2026</option>
            <option value="2026-08">Agosto / 2026</option>
            <option value="2026-09">Setembro / 2026</option>
            <option value="2026-10">Outubro / 2026</option>
            <option value="2026-11">Novembro / 2026</option>
            <option value="2026-12">Dezembro / 2026</option>
          </select>
          <div className="flex gap-2">
            <button 
              onClick={() => window.print()}
              className="bg-white border border-zinc-200 px-4 py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-zinc-50 transition-colors"
            >
              <Printer size={14} /> Imprimir
            </button>
            <button 
              onClick={downloadPDF}
              className="bg-[#DC2626] text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-[#b91c1c] transition-colors"
            >
              <FileDown size={14} /> PDF
            </button>
            <button 
              onClick={downloadExcel}
              className="bg-[#16A34A] text-white px-4 py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-[#15803d] transition-colors"
            >
              <FileSpreadsheet size={14} /> Excel
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {mapTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedMapSubTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                selectedMapSubTab === tab.id 
                  ? 'bg-[#003366] text-white shadow-md' 
                  : 'bg-white text-zinc-500 border border-zinc-200 hover:bg-zinc-50'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className="printable-area overflow-x-auto">
          {renderMapContent()}
        </div>
      </div>
    </div>
  );
};

const OrdemTransferencia = ({ employee }: { employee: Employee | null }) => {
  if (!employee) return <div className="p-12 text-center text-zinc-400 italic">Selecione um colaborador para gerar a ordem de transferência.</div>;
  
  const inss = employee.salary * 0.03;
  const irt = calculateIRT(employee.salary - inss);
  const net = employee.salary - inss - irt;
  const dateStr = new Date().toLocaleDateString('pt-AO');
  const monthName = new Date().toLocaleDateString('pt-AO', { month: 'long' });
  const year = new Date().getFullYear();

  return (
    <div className="bg-white p-12 max-w-5xl mx-auto shadow-sm border border-zinc-100 printable-area min-h-[800px]">
      {/* Header */}
      <div className="flex justify-between items-start mb-12">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-[#003366] flex items-center justify-center">
            <Layers className="text-white" size={32} />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#003366] tracking-tighter">C&V</h1>
            <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">Enterprise Solutions</p>
          </div>
        </div>
        <div className="text-right space-y-1">
          <div className="flex justify-between gap-8">
            <span className="text-[10px] font-bold text-zinc-500 uppercase">N/ Ref Nº :</span>
            <span className="text-[10px] font-black">1263.6/{dateStr.replace(/\//g, '')}</span>
          </div>
          <div className="flex justify-between gap-8">
            <span className="text-[10px] font-bold text-zinc-500 uppercase">Data :</span>
            <span className="text-[10px] font-black">{dateStr}</span>
          </div>
          <div className="flex justify-between gap-8">
            <span className="text-[10px] font-bold text-zinc-500 uppercase">Nº Total Transferencias :</span>
            <span className="text-[10px] font-black">1</span>
          </div>
          <div className="flex justify-between gap-8">
            <span className="text-[10px] font-bold text-zinc-500 uppercase">Montante Total :</span>
            <span className="text-[10px] font-black">{formatCurrency(net).replace('€', '')} akz</span>
          </div>
        </div>
      </div>

      <div className="text-center mb-16">
        <h2 className="text-xl font-black uppercase tracking-[0.3em] text-zinc-800 mb-2">ORDEM TRANSFERENCIA</h2>
        <p className="text-lg font-bold text-zinc-600 italic">A Direcção</p>
      </div>

      <div className="border-t-2 border-zinc-800 pt-8">
        <div className="grid grid-cols-[1fr_200px_100px] border-b border-zinc-200 pb-4">
          <div className="space-y-3">
            <div className="flex gap-4">
              <span className="text-lg font-bold text-zinc-500 w-24">Nome</span>
              <span className="text-lg font-black uppercase">{employee.name}</span>
            </div>
            <div className="flex gap-4">
              <span className="text-lg font-bold text-zinc-500 w-24">Banco</span>
              <span className="text-lg font-black uppercase">{employee.bank_name || 'BM'}</span>
            </div>
            <div className="flex gap-4">
              <span className="text-lg font-bold text-zinc-500 w-24">Conta Nº</span>
              <span className="text-lg font-black">{employee.bank_account || '510710125'}</span>
            </div>
            <div className="flex gap-4">
              <span className="text-lg font-bold text-zinc-500 w-24">Iban</span>
              <span className="text-lg font-black uppercase">{employee.iban || 'AO005500000250510710125'} Cod. Swift =</span>
            </div>
          </div>

          <div className="flex flex-col justify-center items-center bg-zinc-50 border-x border-zinc-200 px-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Montante a Transferir</span>
            <span className="text-sm font-black bg-white px-4 py-2 border border-zinc-200 shadow-sm">{formatCurrency(net).replace('€', '')} akz</span>
          </div>

          <div className="flex flex-col justify-between items-center py-2">
            <span className="text-5xl font-black text-zinc-800">1</span>
            <div className="text-center">
              <span className="block text-[10px] font-black border-t border-zinc-800 pt-1">IDNF:1</span>
              <div className="w-6 h-6 border-2 border-zinc-800 mx-auto mt-2 flex items-center justify-center">
                <div className="w-3 h-3 bg-zinc-800"></div>
              </div>
            </div>
          </div>
        </div>
        <div className="py-4 text-xs font-bold text-zinc-500 italic">
          Transferência Salario de {monthName} de {year} de {employee.name}
        </div>
      </div>

      {/* Footer Buttons (Hidden on Print) */}
      <div className="mt-20 flex justify-center gap-4 no-print">
        <button 
          onClick={() => window.print()}
          className="bg-[#003366] text-white px-8 py-3 font-black uppercase tracking-widest flex items-center gap-2 hover:bg-[#002244] transition-all"
        >
          <Printer size={18} /> Imprimir Ordem
        </button>
        <button 
          className="bg-zinc-100 text-zinc-600 px-8 py-3 font-black uppercase tracking-widest flex items-center gap-2 hover:bg-zinc-200 transition-all"
        >
          <FileDown size={18} /> Baixar PDF
        </button>
      </div>
    </div>
  );
};

const SecretaryModule = ({ appSelectedEmployee }: { appSelectedEmployee: Employee | null }) => {
  const [activeSection, setActiveSection] = useState('docs');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const sections = [
    { id: 'docs', label: 'Documento da Empresa', icon: Building2 },
    { id: 'letters', label: 'Cartas', icon: Mail },
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

const CompanySettingsModal = ({ isOpen, onClose, onSave, initialData }: { isOpen: boolean, onClose: () => void, onSave: () => void, initialData: any }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome_empresa: initialData?.nome_empresa || initialData?.name || '',
    nif: initialData?.nif || '',
    matricula: initialData?.matricula || '',
    alvara: initialData?.alvara || '',
    localizacao: initialData?.localizacao || initialData?.address || '',
    provincia: initialData?.provincia || '',
    codigo_postal: initialData?.codigo_postal || '',
    inss: initialData?.inss || '',
    contacto: initialData?.contacto || initialData?.contact || '',
    responsavel: initialData?.responsavel || '',
    email: initialData?.email || '',
    regime: initialData?.regime || 'Regime geral',
    tipo_empresa: initialData?.tipo_empresa || 'Serviços',
    coordenadas_bancarias: initialData?.coordenadas_bancarias || '',
    logo_url: initialData?.logo_url || initialData?.logo || '',
    watermark_url: initialData?.watermark_url || '',
    footer_image_url: initialData?.footer_image_url || initialData?.footer || ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        nome_empresa: initialData.nome_empresa || initialData.name || '',
        nif: initialData.nif || '',
        matricula: initialData.matricula || '',
        alvara: initialData.alvara || '',
        localizacao: initialData.localizacao || initialData.address || '',
        provincia: initialData.provincia || '',
        codigo_postal: initialData.codigo_postal || '',
        inss: initialData.inss || '',
        contacto: initialData.contacto || initialData.contact || '',
        responsavel: initialData.responsavel || '',
        email: initialData.email || '',
        regime: initialData.regime || 'Regime geral',
        tipo_empresa: initialData.tipo_empresa || 'Serviços',
        coordenadas_bancarias: initialData.coordenadas_bancarias || '',
        logo_url: initialData.logo_url || initialData.logo || '',
        watermark_url: initialData.watermark_url || '',
        footer_image_url: initialData.footer_image_url || initialData.footer || ''
      });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        name: formData.nome_empresa 
      };
      const res = await fetchWithAuth(`/api/company/${user?.company_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert('Dados da empresa atualizados com sucesso!');
        onSave();
        onClose();
      } else {
        const error = await res.text();
        alert('Erro ao atualizar: ' + error);
      }
    } catch (error) {
      console.error('Error saving company:', error);
      alert('Erro ao atualizar os dados.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#003366]/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-4xl bg-white shadow-2xl rounded-none flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-zinc-200 bg-[#003366] text-white flex justify-between items-center shrink-0">
          <h2 className="text-xl font-bold">Configuração da Empresa</h2>
          <button onClick={onClose} className="hover:text-blue-200 transition-colors"><X size={24} /></button>
        </div>
        
        <div className="p-8 overflow-y-auto flex-1 bg-zinc-50">
          <form id="company-settings-form" onSubmit={handleSubmit} className="space-y-8">
            
            <div>
              <h3 className="text-sm font-bold text-[#003366] uppercase tracking-wider mb-4 border-b border-zinc-200 pb-2">Informações Gerais</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Nome da Empresa *</label>
                  <input required type="text" name="nome_empresa" value={formData.nome_empresa} onChange={handleChange} className="w-full bg-zinc-50 border border-zinc-300 px-4 py-2 text-sm focus:outline-none focus:border-[#003366]" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">NIF da Empresa *</label>
                  <input required type="text" name="nif" value={formData.nif} onChange={handleChange} className="w-full bg-zinc-50 border border-zinc-300 px-4 py-2 text-sm focus:outline-none focus:border-[#003366]" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Número de Matrícula</label>
                  <input type="text" name="matricula" value={formData.matricula} onChange={handleChange} className="w-full bg-zinc-50 border border-zinc-300 px-4 py-2 text-sm focus:outline-none focus:border-[#003366]" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Número de Alvará</label>
                  <input type="text" name="alvara" value={formData.alvara} onChange={handleChange} className="w-full bg-zinc-50 border border-zinc-300 px-4 py-2 text-sm focus:outline-none focus:border-[#003366]" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Regime</label>
                  <select name="regime" value={formData.regime} onChange={handleChange} className="w-full bg-zinc-50 border border-zinc-300 px-4 py-2 text-sm focus:outline-none focus:border-[#003366]">
                    <option value="Regime geral">Regime geral</option>
                    <option value="Regime simplificado">Regime simplificado</option>
                    <option value="Regime de exclusão">Regime de exclusão</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Tipo de Empresa</label>
                  <select name="tipo_empresa" value={formData.tipo_empresa} onChange={handleChange} className="w-full bg-zinc-50 border border-zinc-300 px-4 py-2 text-sm focus:outline-none focus:border-[#003366]">
                    <option value="Serviços">Serviços</option>
                    <option value="Comércio">Comércio</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-[#003366] uppercase tracking-wider mb-4 border-b border-zinc-200 pb-2">Contactos e Localização</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Localização (Morada)</label>
                  <input type="text" name="localizacao" value={formData.localizacao} onChange={handleChange} className="w-full bg-zinc-50 border border-zinc-300 px-4 py-2 text-sm focus:outline-none focus:border-[#003366]" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Província</label>
                  <input type="text" name="provincia" value={formData.provincia} onChange={handleChange} className="w-full bg-zinc-50 border border-zinc-300 px-4 py-2 text-sm focus:outline-none focus:border-[#003366]" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Código Postal</label>
                  <input type="text" name="codigo_postal" value={formData.codigo_postal} onChange={handleChange} className="w-full bg-zinc-50 border border-zinc-300 px-4 py-2 text-sm focus:outline-none focus:border-[#003366]" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Contacto Telefónico</label>
                  <input type="text" name="contacto" value={formData.contacto} onChange={handleChange} className="w-full bg-zinc-50 border border-zinc-300 px-4 py-2 text-sm focus:outline-none focus:border-[#003366]" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Email</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full bg-zinc-50 border border-zinc-300 px-4 py-2 text-sm focus:outline-none focus:border-[#003366]" />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-[#003366] uppercase tracking-wider mb-4 border-b border-zinc-200 pb-2">Dados Legais e Bancários</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Nº Contribuinte INSS</label>
                  <input type="text" name="inss" value={formData.inss} onChange={handleChange} className="w-full bg-zinc-50 border border-zinc-300 px-4 py-2 text-sm focus:outline-none focus:border-[#003366]" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Responsável</label>
                  <input type="text" name="responsavel" value={formData.responsavel} onChange={handleChange} className="w-full bg-zinc-50 border border-zinc-300 px-4 py-2 text-sm focus:outline-none focus:border-[#003366]" />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Coordenadas Bancárias (IBAN, Swift, etc)</label>
                  <textarea name="coordenadas_bancarias" value={formData.coordenadas_bancarias} onChange={handleChange} rows={3} className="w-full bg-zinc-50 border border-zinc-300 px-4 py-2 text-sm focus:outline-none focus:border-[#003366]" placeholder="Ex: AO06.0040.0000.1234.5678.9 (BAI)"></textarea>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-[#003366] uppercase tracking-wider mb-4 border-b border-zinc-200 pb-2">Identidade Visual (URLs)</h3>
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Logotipo (URL)</label>
                  <input type="text" name="logo_url" value={formData.logo_url} onChange={handleChange} placeholder="https://exemplo.com/logo.png" className="w-full bg-zinc-50 border border-zinc-300 px-4 py-2 text-sm focus:outline-none focus:border-[#003366]" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Marca d'água (URL)</label>
                  <input type="text" name="watermark_url" value={formData.watermark_url} onChange={handleChange} placeholder="https://exemplo.com/watermark.png" className="w-full bg-zinc-50 border border-zinc-300 px-4 py-2 text-sm focus:outline-none focus:border-[#003366]" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Rodapé (URL ou Texto)</label>
                  <input type="text" name="footer_image_url" value={formData.footer_image_url} onChange={handleChange} className="w-full bg-zinc-50 border border-zinc-300 px-4 py-2 text-sm focus:outline-none focus:border-[#003366]" />
                </div>
              </div>
            </div>

          </form>
        </div>

        <div className="p-6 border-t border-zinc-200 bg-white flex justify-end gap-4 shrink-0">
          <button onClick={onClose} type="button" className="px-6 py-2 border border-zinc-300 text-zinc-700 font-medium hover:bg-zinc-50 text-sm">Cancelar</button>
          <button form="company-settings-form" type="submit" disabled={loading} className="px-8 py-2 bg-[#003366] text-white font-bold hover:bg-[#002244] text-sm flex items-center gap-2">
            {loading ? 'A Guardar...' : <><RefreshCw size={16} /> Salvar Alterações</>}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const AlertsManagement = ({ alerts, setAlerts }: { alerts: any[], setAlerts: (a: any[]) => void }) => {
  return (
    <div className="bg-white border border-zinc-200 p-8">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-[#003366] tracking-tight">Gestão de Alertas</h3>
      </div>
      
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-[#003366] text-white text-[11px] uppercase tracking-wider font-bold">
            <th className="px-4 py-3">Nome</th>
            <th className="px-4 py-3">Tipo</th>
            <th className="px-4 py-3">Responsável</th>
            <th className="px-4 py-3">Início</th>
            <th className="px-4 py-3">Fim</th>
            <th className="px-4 py-3">Aviso (Dias)</th>
            <th className="px-4 py-3 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200">
          {alerts.length === 0 ? (
            <tr><td colSpan={7} className="p-8 text-center text-zinc-400">Nenhum alerta registado</td></tr>
          ) : (
            alerts.map((a: any) => (
              <tr key={a.id} className="hover:bg-zinc-50 text-sm">
                <td className="px-4 py-3 font-bold text-zinc-800">{a.name}</td>
                <td className="px-4 py-3 text-zinc-500 capitalize">{a.type.replace('_', ' ')}</td>
                <td className="px-4 py-3 text-zinc-600">{a.responsible}</td>
                <td className="px-4 py-3 text-zinc-500">{new Date(a.startDate).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-zinc-500">{new Date(a.endDate).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-zinc-500">{a.advanceTime}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button className="text-blue-600 hover:text-blue-800 text-xs font-bold uppercase tracking-widest"><Edit size={14} className="inline mr-1"/>Editar</button>
                  <button className="text-zinc-600 hover:text-zinc-800 text-xs font-bold uppercase tracking-widest"><LinkIcon size={14} className="inline mr-1"/>Associar</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

const SettingsModule = ({ companyData, onRefreshData, alerts, setAlerts }: { companyData: any, onRefreshData: () => void, alerts: any[], setAlerts: (a: any[]) => void }) => {
  const [activeTab, setActiveTab] = useState('geral');
  const [isModalOpen, setIsModalOpen] = useState(false);

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
          onClick={() => setActiveTab('alertas')}
          className={`pb-2 text-sm font-bold ${activeTab === 'alertas' ? 'text-[#003366] border-b-2 border-[#003366]' : 'text-zinc-500 hover:text-zinc-800'}`}
        >
          Gestão de Alertas
        </button>
        <button 
          onClick={() => setActiveTab('metrica')}
          className={`pb-2 text-sm font-bold ${activeTab === 'metrica' ? 'text-[#003366] border-b-2 border-[#003366]' : 'text-zinc-500 hover:text-zinc-800'}`}
        >
          Métrica
        </button>
        <button 
          onClick={() => setActiveTab('utilizadores')}
          className={`pb-2 text-sm font-bold ${activeTab === 'utilizadores' ? 'text-[#003366] border-b-2 border-[#003366]' : 'text-zinc-500 hover:text-zinc-800'}`}
        >
          Utilizadores
        </button>
      </div>

      {activeTab === 'geral' && (
        <div className="bg-white border border-zinc-200 rounded-none shadow-sm p-8">
          <div className="flex flex-col items-center justify-center p-12 text-center max-w-2xl mx-auto">
            <div className="w-24 h-24 bg-zinc-100 rounded-full flex items-center justify-center mb-6 border border-zinc-200 overflow-hidden">
              {companyData?.logo_url || companyData?.logo ? (
                <img src={companyData.logo_url || companyData.logo} alt="Logo" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
              ) : (
                <LayoutDashboard size={40} className="text-zinc-300" />
              )}
            </div>
            <h3 className="text-2xl font-bold text-[#003366] mb-2">{companyData?.nome_empresa || companyData?.name || 'Vossa Empresa'}</h3>
            <p className="text-sm text-zinc-500 mb-8">{companyData?.localizacao || companyData?.address || 'Sem localização configurada'}</p>
            
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-[#003366] text-white font-bold px-8 py-3 rounded-none text-sm shadow-sm flex items-center gap-2 hover:bg-[#002244] transition-colors"
            >
              <RefreshCw size={16} />
              Actualizar dados da empresa
            </button>
          </div>

          <CompanySettingsModal 
            isOpen={isModalOpen} 
            onClose={() => setIsModalOpen(false)} 
            onSave={onRefreshData}
            initialData={companyData} 
          />
        </div>
      )}
      
      {activeTab === 'alertas' && <AlertsManagement alerts={alerts} setAlerts={setAlerts} />}
      {activeTab === 'metrica' && <MetricsModule />}
      {activeTab === 'utilizadores' && <UsersSettings />}
    </div>
  );
};

const CashierModule = ({ issuedDocuments = [] }: { issuedDocuments?: IssuedDocument[] }) => {
  const { user } = useAuth();
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
      const res = await fetchWithAuth(`/api/cash/sessions?company_id=${user?.company_id}`);
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
    if (user?.company_id) {
      fetchSessions();
    }
  }, [user?.company_id]);

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchWithAuth('/api/cash/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          initial_balance: Number(initialBalance), 
          pos_point_id: posPointId ? Number(posPointId) : null,
          company_id: user?.company_id
        })
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
      const res = await fetchWithAuth(`/api/cash/close/${id}`, {
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
                  <input type="number" step="0.01" value={initialBalance} onChange={e => setInitialBalance(e.target.value)} required className="w-full bg-zinc-50 border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm" />
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
              <p className="text-2xl font-black text-emerald-600">{formatCurrency((issuedDocuments ?? []).reduce((acc, doc) => acc + (doc.contravalor || 0), 0))}</p>
            </div>
            <div className="bg-zinc-50 p-6 border border-zinc-200">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Total Saídas</p>
              <p className="text-2xl font-black text-red-600">{formatCurrency(0)}</p>
            </div>
            <div className="bg-zinc-50 p-6 border border-zinc-200">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Saldo Consolidado</p>
              <p className="text-2xl font-black text-[#003366]">{formatCurrency((issuedDocuments ?? []).reduce((acc, doc) => acc + (doc.contravalor || 0), 0))}</p>
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
                <p className="text-xl font-black text-[#003366]">{formatCurrency((issuedDocuments ?? []).reduce((acc, doc) => acc + (doc.contravalor || 0), 0))}</p>
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

const AccountingModule = ({ invoices, clients, fiscalSeries, onRefresh, employees, issuedDocuments }: { 
  invoices: Invoice[], 
  clients: Client[], 
  fiscalSeries: FiscalSeries[], 
  onRefresh: () => void, 
  employees: Employee[],
  issuedDocuments: IssuedDocument[]
}) => {
  const [activeSubTab, setActiveSubTab] = useState<string | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [activeRegimeTab, setActiveRegimeTab] = useState<'geral' | 'fornecedores' | 'clientes'>('geral');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  useEffect(() => {
    fetch('/api/purchases').then(r => r.json()).then(setPurchases);
    fetch('/api/suppliers').then(r => r.json()).then(setSuppliers);
  }, []);

  const totalSales = (invoices || []).reduce((sum, inv) => sum + inv.total, 0);
  const totalPurchases = (purchases || []).reduce((sum, pur) => sum + pur.total, 0);
  const vatLiquidated = (invoices || []).reduce((sum, inv) => sum + (inv.total * 0.14), 0);
  const vatDeductible = (purchases || []).reduce((sum, pur) => sum + (pur.total * 0.14), 0);
  const vatToPay = vatLiquidated - vatDeductible;

  const sections = [
    { id: 'daily-movements', label: 'Movimento Diário', icon: <History size={24} />, description: 'Registo cronológico de todos os movimentos contabilísticos diários.' },
    { id: 'general-regime', label: 'Regime Geral', icon: <BadgeCheck size={24} />, description: 'Contabilidade para empresas enquadradas no regime geral de tributação.' },
    { id: 'simplified-regime', label: 'Regime Simplificado', icon: <Layers size={24} />, description: 'Gestão simplificada para empresas com volume de negócios reduzido.' },
    { id: 'exclusion-regime', label: 'Regime de Exclusão', icon: <XCircle size={24} />, description: 'Controlo de entidades isentas ou excluídas do regime de IVA.' },
    { id: 'accounting-calculations', label: 'Cálculos Contabilísticos', icon: <Calculator size={24} />, description: 'Processamento de amortizações, provisões e apuramentos fiscais.' },
    { id: 'accounting-maps', label: 'Mapas Contabilísticos', icon: <FileText size={24} />, description: 'Emissão de balancetes, balanços e demonstrações de resultados.' },
    { id: 'movement-maps', label: 'Mapas de Movimento', icon: <TrendingUp size={24} />, description: 'Análise gráfica e tabular dos fluxos financeiros da empresa.' },
    { id: 'retencao-pagar', label: 'Retenção na Fonte a Pagar', icon: <FileText size={24} />, description: 'Gestão de retenções na fonte a pagar.' },
    { id: 'retencao-receber', label: 'Retenção na Fonte a Receber', icon: <FileText size={24} />, description: 'Gestão de retenções na fonte a receber.' },
    { id: 'calculos-impostos', label: 'Cálculos de Impostos', icon: <Calculator size={24} />, description: 'Cálculos de impostos diversos.' },
    { id: 'regime-exclusao', label: 'Regime de Exclusão', icon: <XCircle size={24} />, description: 'Controlo de entidades isentas ou excluídas do regime de IVA.' },
    { id: 'imposto-por-conta', label: 'Imposto por Conta', icon: <Calculator size={24} />, description: 'Gestão de impostos por conta.' },
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
      case 'simplified-regime':
        return <RegimeSimplificadoForm invoices={invoices} purchases={purchases} />;
      case 'retencao-pagar':
        return <RetencaoPagarForm purchases={purchases} suppliers={suppliers} />;
      case 'retencao-receber':
        return <RetencaoReceberForm invoices={invoices} clients={clients} />;
      case 'calculos-impostos':
        return <CalculosImpostosForm invoices={invoices} />;
      case 'regime-exclusao':
        return <RegimeExclusaoForm />;
      case 'imposto-por-conta':
        return <ImpostoPorContaForm />;
      case 'annual-declarations':
        return <DeclaracaoAnualForm />;
      case 'saft':
        return <SaftExportForm />;
      case 'general-regime':
        if (selectedClient) {
          const clientDocs = invoices.filter(i => i.client_id === selectedClient.id).map(i => ({
            ...i,
            tipo_documento: i.document_type || 'Fatura',
            data_emissao: i.date,
            numero_documento: i.invoice_number,
            contravalor: i.total
          }));
          return <ClientAccount client={selectedClient} documents={clientDocs as any} onBack={() => setSelectedClient(null)} />;
        }
        if (selectedSupplier) {
          // Reusing ClientAccount for SupplierAccount for simplicity, mapping fields
          const supplierDocs = purchases.filter(p => p.supplier_id === selectedSupplier.id).map(p => ({
            ...p,
            tipo_documento: p.document_type || 'Fatura de Compra',
            data_emissao: p.date,
            numero_documento: p.invoice_number || `COMP-${p.id}`,
            contravalor: p.total
          }));
          return <ClientAccount client={{...selectedSupplier, tipo_cliente: 'Fornecedor'} as any} documents={supplierDocs as any} onBack={() => setSelectedSupplier(null)} />;
        }
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-4 mb-6">
              <button onClick={() => setActiveSubTab(null)} className="p-2 hover:bg-zinc-100 rounded-none text-zinc-400 transition-colors">
                <ChevronLeft size={24} />
              </button>
              <h2 className="text-xl font-bold text-[#003366]">Regime Geral</h2>
            </div>
            
            <div className="flex gap-4 border-b border-zinc-200 mb-6">
              <button 
                onClick={() => setActiveRegimeTab('geral')}
                className={`px-6 py-3 text-sm font-bold uppercase tracking-widest ${activeRegimeTab === 'geral' ? 'text-[#003366] border-b-2 border-[#003366]' : 'text-zinc-400 hover:text-zinc-600'}`}
              >
                Visão Geral
              </button>
              <button 
                onClick={() => setActiveRegimeTab('fornecedores')}
                className={`px-6 py-3 text-sm font-bold uppercase tracking-widest flex items-center gap-2 ${activeRegimeTab === 'fornecedores' ? 'text-[#003366] border-b-2 border-[#003366]' : 'text-zinc-400 hover:text-zinc-600'}`}
              >
                <Truck size={16} /> Anexo Fornecedores
              </button>
              <button 
                onClick={() => setActiveRegimeTab('clientes')}
                className={`px-6 py-3 text-sm font-bold uppercase tracking-widest flex items-center gap-2 ${activeRegimeTab === 'clientes' ? 'text-[#003366] border-b-2 border-[#003366]' : 'text-zinc-400 hover:text-zinc-600'}`}
              >
                <Users size={16} /> Regularização Clientes
              </button>
            </div>

            {activeRegimeTab === 'geral' && (
              <div className="space-y-8">
                <Modelo7Form invoices={invoices} purchases={purchases} />
                <div className="bg-white border border-zinc-200 p-8 rounded-none shadow-sm space-y-8">
                  <h3 className="text-sm font-bold text-[#003366] uppercase tracking-widest mb-6 flex items-center gap-3">
                    <BadgeCheck size={18} /> Apuramento de IVA e Totais
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-6 border border-zinc-100 bg-zinc-50">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Total Vendas</p>
                      <p className="text-2xl font-bold text-[#003366]">{formatCurrency(totalSales)}</p>
                    </div>
                    <div className="p-6 border border-zinc-100 bg-zinc-50">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Total Compras</p>
                      <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalPurchases)}</p>
                    </div>
                    <div className="p-6 border border-zinc-100 bg-zinc-50">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">IVA a Pagar/Recuperar</p>
                      <p className={`text-2xl font-bold ${vatToPay > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatCurrency(Math.abs(vatToPay))}</p>
                      <p className="text-xs text-zinc-500 mt-1">{vatToPay > 0 ? 'A pagar' : 'A recuperar'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeRegimeTab === 'fornecedores' && (
              <div className="space-y-8">
                <AnexoFornecedoresForm purchases={purchases} suppliers={suppliers} />
                <div className="bg-white border border-zinc-200 p-8 rounded-none shadow-sm space-y-6">
                  <h3 className="text-sm font-bold text-[#003366] uppercase tracking-widest mb-6 flex items-center gap-3">
                    <Truck size={18} /> Lista de Fornecedores
                  </h3>
                  <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#003366] text-white text-[11px] uppercase tracking-wider font-bold">
                      <th className="px-6 py-4">Fornecedor</th>
                      <th className="px-6 py-4">NIF</th>
                      <th className="px-6 py-4 text-right">Total Compras</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {suppliers.map(s => {
                      const supplierPurchases = purchases.filter(p => p.supplier_id === s.id);
                      const total = (supplierPurchases ?? []).reduce((sum, p) => sum + p.total, 0);
                      return (
                        <tr key={s.id} className="hover:bg-zinc-50">
                          <td className="px-6 py-4 text-sm font-medium text-zinc-900">{s.name}</td>
                          <td className="px-6 py-4 text-sm text-zinc-500">{s.nif}</td>
                          <td className="px-6 py-4 text-sm text-right font-bold text-zinc-900">{formatCurrency(total)}</td>
                          <td className="px-6 py-4 text-sm text-right">
                            <button onClick={() => setSelectedSupplier(s)} className="text-[#003366] hover:underline font-bold text-xs uppercase">Conta Corrente</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              </div>
            )}

            {activeRegimeTab === 'clientes' && (
              <div className="space-y-8">
                <RegularizacaoClientesForm invoices={invoices} clients={clients} />
                <div className="bg-white border border-zinc-200 p-8 rounded-none shadow-sm space-y-6">
                  <h3 className="text-sm font-bold text-[#003366] uppercase tracking-widest mb-6 flex items-center gap-3">
                    <Users size={18} /> Lista de Clientes
                  </h3>
                  <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#003366] text-white text-[11px] uppercase tracking-wider font-bold">
                      <th className="px-6 py-4">Cliente</th>
                      <th className="px-6 py-4">NIF</th>
                      <th className="px-6 py-4 text-right">Total Vendas</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {clients.map(c => {
                      const clientInvoices = invoices.filter(i => i.client_id === c.id);
                      const total = (clientInvoices ?? []).reduce((sum, i) => sum + i.total, 0);
                      return (
                        <tr key={c.id} className="hover:bg-zinc-50">
                          <td className="px-6 py-4 text-sm font-medium text-zinc-900">{c.name}</td>
                          <td className="px-6 py-4 text-sm text-zinc-500">{c.contribuinte}</td>
                          <td className="px-6 py-4 text-sm text-right font-bold text-zinc-900">{formatCurrency(total)}</td>
                          <td className="px-6 py-4 text-sm text-right">
                            <button onClick={() => setSelectedClient(c)} className="text-[#003366] hover:underline font-bold text-xs uppercase">Conta Corrente</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              </div>
            )}
          </div>
        );
      default:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-4 mb-6">
              <button onClick={() => setActiveSubTab(null)} className="p-2 hover:bg-zinc-100 rounded-none text-zinc-400 transition-colors">
                <ChevronLeft size={24} />
              </button>
              <h2 className="text-xl font-bold text-[#003366] capitalize">{activeSubTab.replace('-', ' ')}</h2>
            </div>
            <div className="bg-white border border-zinc-200 p-8 rounded-none shadow-sm">
              <div className="p-12 text-center text-zinc-400 italic bg-zinc-50 border border-dashed border-zinc-200">
                Em desenvolvimento.
              </div>
            </div>
          </div>
        );
    }
  };

  return renderContent();
};

const FiscalSeriesModule = ({ series, onRefresh, users }: { series: FiscalSeries[], onRefresh: () => void, users: Employee[] }) => {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [showOptionsId, setShowOptionsId] = useState<number | null>(null);
  
  const [name, setName] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [type, setType] = useState<'normal' | 'manual'>('normal');
  const [destiny, setDestiny] = useState('');
  
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const year = new Date().getFullYear().toString();
    const reference = `S${series.length + 1}${year}`;
    
    try {
      await fetchWithAuth('/api/fiscal-series', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: name,
          user_id: selectedUser,
          type,
          reference: type === 'normal' ? reference : '',
          counter: 1,
          year,
          data_inicio: new Date().toISOString().split('T')[0],
          destino: destiny,
          is_active: true,
          company_id: user?.company_id
        })
      });
      setShowForm(false);
      onRefresh();
      setName('');
      setDestiny('');
      setType('normal');
    } catch (error) {
      console.error('Error creating series:', error);
    }
  };

  const OPTIONS = [
    { label: 'Gestão de Utilizadores', icon: <Users size={14} /> },
    { label: 'Configurar Logotipo', icon: <Image size={14} /> },
    { label: 'Configurar Cabeçalho Cartas', icon: <FileText size={14} /> },
    { label: 'Configurar Rodapé Cartas', icon: <FileText size={14} /> },
    { label: 'Configurar Marca D\'Agua', icon: <Droplets size={14} /> },
    { label: 'Configurar Bancos', icon: <Building2 size={14} /> },
    { label: 'Editar Destino da Serie', icon: <Edit size={14} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 border border-zinc-200">
        <div>
          <h2 className="text-xl font-bold text-[#003366]">Séries Fiscais</h2>
          <p className="text-xs text-zinc-500 uppercase tracking-widest font-medium">Gestão de numeração e configuração de documentos</p>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="bg-[#003366] text-white px-6 py-2.5 text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-[#002244] transition-all shadow-lg"
        >
          <Plus size={16} /> Criar Série
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
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
              className="relative w-full max-w-md bg-white rounded-none shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <h3 className="font-bold text-[#003366] flex items-center gap-2 uppercase tracking-widest text-xs">
                  <FileText size={16} />
                  Criar Nova Série
                </h3>
                <button 
                  onClick={() => setShowForm(false)}
                  className="p-2 hover:bg-zinc-200 rounded-full transition-colors text-zinc-400 hover:text-zinc-600"
                >
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleRegister} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Nome da Série</label>
                  <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-sm focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Selecionar Utilizador</label>
                  <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)} className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-sm focus:outline-none">
                    <option value="">Todos</option>
                    {users.map(u => <option key={u.id} value={u.id.toString()}>{u.nome_completo}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Tipo de Série</label>
                  <select value={type} onChange={e => setType(e.target.value as 'normal' | 'manual')} className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2 text-sm focus:outline-none">
                    <option value="normal">Normal</option>
                    <option value="manual">Recuperação Documentos Manuais</option>
                  </select>
                </div>
                <button type="submit" className="w-full bg-[#003366] text-white py-3 text-xs font-bold uppercase tracking-widest hover:bg-[#002244]">Registar Série</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-white border border-zinc-200 shadow-sm overflow-x-auto">
        <table className="w-full text-left text-[11px] font-medium text-zinc-600 border-collapse">
          <thead>
            <tr className="bg-[#003366] text-white text-[10px] uppercase tracking-[0.1em] font-black">
              <th rowSpan={2} className="px-4 py-4 border-r border-zinc-700/50">Data Inicio</th>
              <th rowSpan={2} className="px-4 py-4 border-r border-zinc-700/50">Série</th>
              <th rowSpan={2} className="px-4 py-4 border-r border-zinc-700/50">Referência</th>
              <th rowSpan={2} className="px-4 py-4 border-r border-zinc-700/50">Destino</th>
              <th rowSpan={2} className="px-2 py-4 border-r border-zinc-700/50 text-center">Tipo</th>
              <th colSpan={6} className="px-4 py-2 border-b border-r border-zinc-700/50 text-center text-[9px] opacity-70">Documentos Habilitados</th>
              <th colSpan={3} className="px-4 py-2 border-b border-r border-zinc-700/50 text-center text-[9px] opacity-70">Configuração Grafica</th>
              <th rowSpan={2} className="px-4 py-4 border-r border-zinc-700/50 text-center uppercase">Users</th>
              <th rowSpan={2} className="px-4 py-4 border-r border-zinc-700/50 text-center uppercase">Bancos</th>
              <th rowSpan={2} className="px-4 py-4 text-center">Ações</th>
            </tr>
            <tr className="bg-[#003366]/90 text-white/70 text-[9px] uppercase font-bold">
              <th className="px-2 py-2 border-r border-zinc-700/30 text-center">FT</th>
              <th className="px-2 py-2 border-r border-zinc-700/30 text-center">NC</th>
              <th className="px-2 py-2 border-r border-zinc-700/30 text-center">ND</th>
              <th className="px-2 py-2 border-r border-zinc-700/30 text-center">RE</th>
              <th className="px-2 py-2 border-r border-zinc-700/30 text-center">PP</th>
              <th className="px-2 py-2 border-r border-zinc-700/50 text-center">GR</th>
              <th className="px-2 py-2 border-r border-zinc-700/30 text-center">TOP</th>
              <th className="px-2 py-2 border-r border-zinc-700/30 text-center">DOWN</th>
              <th className="px-2 py-2 border-r border-zinc-700/50 text-center italic">Marca</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {series.map(s => (
              <tr key={s.id} className="hover:bg-zinc-50 border-b border-zinc-100 transition-colors">
                <td className="px-4 py-3 border-r border-zinc-100 text-zinc-400">{s.data_inicio || '---'}</td>
                <td className="px-4 py-3 border-r border-zinc-100 font-bold text-[#003366]">{s.name}</td>
                <td className="px-4 py-3 border-r border-zinc-100 font-mono text-[10px] text-zinc-500">{s.reference || '---'}</td>
                <td className="px-4 py-3 border-r border-zinc-100">{s.destino || '---'}</td>
                <td className="px-2 py-3 border-r border-zinc-100 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${s.type === 'manual' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {s.type === 'manual' ? 'Manual' : 'Normal'}
                  </span>
                </td>
                <td className="px-2 py-3 border-r border-zinc-100 text-center font-bold text-emerald-600">✓</td>
                <td className="px-2 py-3 border-r border-zinc-100 text-center font-bold text-emerald-600">✓</td>
                <td className="px-2 py-3 border-r border-zinc-100 text-center font-bold text-emerald-600">✓</td>
                <td className="px-2 py-3 border-r border-zinc-100 text-center font-bold text-emerald-600">✓</td>
                <td className="px-2 py-3 border-r border-zinc-100 text-center font-bold text-emerald-600">✓</td>
                <td className="px-2 py-3 border-r border-zinc-100 text-center font-bold text-emerald-600">✓</td>
                <td className="px-2 py-3 border-r border-zinc-100 text-center text-red-600 font-black">X</td>
                <td className="px-2 py-3 border-r border-zinc-100 text-center text-red-600 font-black">X</td>
                <td className="px-2 py-3 border-r border-zinc-200 text-center text-blue-600 font-bold underline cursor-pointer">Setup</td>
                <td className="px-4 py-3 border-r border-zinc-100 text-center font-bold">{s.user_id ? '1' : 'Tdos'}</td>
                <td className="px-4 py-3 border-r border-zinc-100 text-center font-bold text-zinc-400">0 / 5</td>
                <td className="px-4 py-3 text-center relative">
                  <button 
                    onClick={() => setShowOptionsId(showOptionsId === s.id ? null : s.id)}
                    className="p-1.5 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition-all flex items-center justify-center mx-auto"
                  >
                    <BarChart3 size={14} />
                  </button>
                  
                  {showOptionsId === s.id && (
                    <AnimatePresence>
                      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          onClick={() => setShowOptionsId(null)}
                          className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
                        />
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 10 }}
                          className="relative w-full max-w-xs bg-white rounded-none shadow-2xl overflow-hidden p-6 space-y-3 border border-zinc-200"
                        >
                          <div className="flex justify-between items-center mb-4 border-b border-zinc-100 pb-2">
                            <p className="text-[10px] font-black text-[#003366] uppercase tracking-widest italic">Opções da Série</p>
                            <button onClick={() => setShowOptionsId(null)} className="text-zinc-400 hover:text-red-500"><X size={16}/></button>
                          </div>
                          {OPTIONS.map((opt, idx) => (
                            <button 
                              key={idx}
                              onClick={() => setShowOptionsId(null)}
                              className="w-full h-10 bg-white hover:bg-zinc-50 border border-zinc-100 rounded-none px-4 flex items-center gap-3 text-zinc-800 text-[10px] font-bold uppercase tracking-tight transition-all group active:scale-95"
                            >
                              <div className="w-6 h-6 bg-zinc-50 text-[#003366] flex items-center justify-center group-hover:bg-[#003366] group-hover:text-white transition-all">
                                {opt.icon}
                              </div>
                              {opt.label}
                            </button>
                          ))}
                        </motion.div>
                      </div>
                    </AnimatePresence>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {series.length === 0 && (
          <div className="p-20 text-center bg-zinc-50/50">
            <p className="text-zinc-400 text-sm font-medium italic">Nenhuma série fiscal configurada.</p>
          </div>
        )}
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
  onCertify,
  onViewDetail,
  onViewBusinessOverview,
  setActiveTab,
  caixas,
  mode = 'standard',
  fiscalSeries,
  onRefresh
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
  onAction: (action: string, doc: IssuedDocument) => void,
  onCertify: (doc: IssuedDocument) => void,
  onViewDetail?: (doc: IssuedDocument) => void,
  onViewBusinessOverview?: () => void,
  setActiveTab: (tab: string) => void,
  caixas: Caixa[],
  mode?: 'standard' | 'electronic',
  fiscalSeries: FiscalSeries[],
  onRefresh: () => void
}) => {
  const { user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState('emitidos');
  const [searchTerm, setSearchTerm] = useState('');
  const [serieFilter, setSerieFilter] = useState('Todas');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [typeFilter, setTypeFilter] = useState('Todos');
  const [minValue, setMinValue] = useState('');
  const [maxValue, setMaxValue] = useState('');
  const [showWorkSiteForm, setShowWorkSiteForm] = useState(false);
  const [selectedWorkSite, setSelectedWorkSite] = useState<WorkSite | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showManagementView, setShowManagementView] = useState(false);
  const [showRegistrationView, setShowRegistrationView] = useState(false);
  const [showMovementForm, setShowMovementForm] = useState(false);
  const [movements, setMovements] = useState<WorkSiteMovement[]>([]);
  const [selectedMonthForMap, setSelectedMonthForMap] = useState(new Date().toISOString().slice(0, 7));
  const [selectedMapSubTab, setSelectedMapSubTab] = useState('irt_inss');

  const fetchMovements = async (workSiteId: number) => {
    try {
      const response = await fetchWithAuth(`/api/work-sites/${workSiteId}/movements?company_id=${user?.company_id}`);
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
      const response = await fetchWithAuth(`/api/work-sites/${selectedWorkSite.id}/movements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...movement, company_id: user?.company_id })
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

  if (showRegistrationView && selectedWorkSite) {
    return (
      <WorkSiteRegistration 
        workSite={selectedWorkSite} 
        onBack={() => setShowRegistrationView(false)} 
      />
    );
  }

  const tabs = [
    { id: 'emitidos', label: 'Documentos emitidos', icon: ClipboardList },
    { id: 'recebidos', label: 'Documentos recebidos', icon: ClipboardList },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'sales_report', label: 'Relatório de Vendas', icon: BarChart3 },
    { id: 'adesao', label: 'Local de trabalho', icon: MapPin },
    { id: 'series', label: 'Taxas e impostos', icon: FileText },
    { id: 'fiscal-series', label: 'Série Fiscal', icon: BadgeCheck },
  ];

  const filteredIssuedDocuments = Array.isArray(issuedDocuments) ? issuedDocuments.filter(doc => {
    const searchStr = searchTerm.toLowerCase();
    const matchesSearch = (doc.invoice_number || doc.numero_documento || '').toLowerCase().includes(searchStr) ||
                         (doc.client_name || doc.cliente_id || '').toString().toLowerCase().includes(searchStr);
    const matchesStatus = statusFilter === 'Todos' || 
                         (statusFilter === 'PAGO' && (doc.status === 'paid' || doc.estado_documento === 'ativo' || doc.payment_status === 'paid')) ||
                         (statusFilter === 'PENDENTE' && (doc.status === 'pending' || doc.estado_documento === 'anulado' || doc.payment_status === 'pending'));
    
    const docValue = doc.contravalor || doc.total || 0;
    const matchesMin = minValue === '' || docValue >= Number(minValue);
    const matchesMax = maxValue === '' || docValue <= Number(maxValue);

    return matchesSearch && matchesStatus && matchesMin && matchesMax;
  }) : [];

  return (
    <div className="space-y-0 -mt-12 -mx-12">
      {/* Tabs Header */}
      <div className="bg-[#f5f5f7] border-b border-zinc-200 px-12 pt-8">
        <div className="flex gap-12">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => tab.id === 'clientes' ? setActiveTab('clients') : setActiveSubTab(tab.id)}
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
        {activeSubTab === 'fiscal-series' && (
          <FiscalSeriesModule 
            series={fiscalSeries} 
            onRefresh={onRefresh} 
            users={employees} 
          />
        )}
        {activeSubTab === 'sales_report' && (
          <SalesReport issuedDocuments={issuedDocuments} />
        )}
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
                    {mode === 'electronic' ? 'Emitir Fatura Electrónica' : 'Nova Fatura'}
                  </button>
                )}
                <button 
                  onClick={() => setActiveTab('financial')}
                  className="bg-white border border-zinc-200 text-zinc-600 font-bold px-6 py-2.5 rounded-none flex items-center gap-2 hover:bg-zinc-50 transition-all shadow-sm text-sm"
                >
                  <History size={18} className="text-zinc-400" />
                  Relatórios
                </button>
                <button 
                  onClick={onViewBusinessOverview}
                  className="bg-[#4f46e5] hover:bg-indigo-700 text-white font-bold px-6 py-2.5 rounded-none flex items-center gap-2 transition-all shadow-sm text-sm"
                >
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

              <div className="w-32 space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Valor Mín.</label>
                <input 
                  type="number" 
                  placeholder="0.00" 
                  value={minValue}
                  onChange={(e) => setMinValue(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="w-32 space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Valor Máx.</label>
                <input 
                  type="number" 
                  placeholder="0.00" 
                  value={maxValue}
                  onChange={(e) => setMaxValue(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <button 
                onClick={() => {
                  setSearchTerm('');
                  setSerieFilter('Todas');
                  setStatusFilter('Todos');
                  setTypeFilter('Todos');
                  setMinValue('');
                  setMaxValue('');
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
                documents={filteredIssuedDocuments} 
                onAction={onAction}
                onCertify={onCertify}
                onViewDetail={onViewDetail}
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
                    {filteredIssuedDocuments
                      .filter(doc => 
                        (doc.document_type || doc.tipo_documento || '').toLowerCase().includes('fatura recibo') || 
                        (doc.document_type || doc.tipo_documento || '').toLowerCase().includes('recibo') ||
                        (doc.document_type || doc.tipo_documento || '').toLowerCase().includes('fatura-recibo')
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
                          <FileText size={16} />
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
                        onClick={() => { setShowActionMenu(false); setShowRegistrationView(true); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-none bg-purple-50 flex items-center justify-center text-purple-600">
                          <Construction size={16} />
                        </div>
                        <span>Cadastro Obra</span>
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
                        movements={movements}
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

const CreateInvoice = ({ clients, products, workSites, fiscalSeries, onBack, onSuccess, caixas, initialData = null, fixedDocumentType }: { 
  clients: Client[], 
  products: Product[], 
  workSites: WorkSite[], 
  fiscalSeries: FiscalSeries[],
  onBack: () => void, 
  onSuccess: () => void,
  caixas: Caixa[],
  initialData?: IssuedDocument | null,
  fixedDocumentType?: string
}) => {
  const { user } = useAuth();
  const [clientId, setClientId] = useState<number | ''>(initialData?.cliente_id || initialData?.client_id || '');
  const [documentType, setDocumentType] = useState(fixedDocumentType || initialData?.document_type || 'Fatura');
  const [seriesId, setSeriesId] = useState<number | ''>(initialData?.series_id || '');
  const [date, setDate] = useState(initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : (initialData?.data_emissao ? new Date(initialData.data_emissao).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]));
  const [countryCode, setCountryCode] = useState('Angola');
  const [workSiteId, setWorkSiteId] = useState<string>(initialData?.work_site_id?.toString() || '');
  const [dueDate, setDueDate] = useState<string>(initialData?.due_date ? new Date(initialData.due_date).toISOString().split('T')[0] : '');
  const [vatWithholding, setVatWithholding] = useState<string>(initialData?.vat_withholding?.toString() || '0');
  const [exchangeRate, setExchangeRate] = useState<string>(initialData?.exchange_rate?.toString() || '1');
  const [currency, setCurrency] = useState<string>(initialData?.currency || 'Kwanza');
  const [counterValue, setCounterValue] = useState<string>('0');
  const [globalDiscount, setGlobalDiscount] = useState<string>(initialData?.global_discount?.toString() || '0');
  const [serviceDate, setServiceDate] = useState(initialData?.service_date ? new Date(initialData.service_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
  const [serviceLocation, setServiceLocation] = useState(initialData?.service_location || '');
  const [items, setItems] = useState<Partial<InvoiceItem>[]>(initialData?.items || []);
  const [cashBox, setCashBox] = useState(initialData?.cash_box || '');
  const [paymentMethod, setPaymentMethod] = useState(initialData?.payment_method || '');
  const [paymentCondition, setPaymentCondition] = useState(initialData?.payment_method === 'A Prazo' ? 'A Prazo' : 'Pronto Pagamento');
  
  const isCertified = !!initialData?.is_certified;
  const [expandedDimensions, setExpandedDimensions] = useState<number | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [documentNumberManual, setDocumentNumberManual] = useState('');
  const [referenceManual, setReferenceManual] = useState('');

  useEffect(() => {
    fetchJson('/api/warehouses').then(data => setWarehouses(data || []));
  }, []);

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
      const q = field === 'quantity' ? Number(value) : (newItems[index].quantity || 0);
      const p = field === 'unit_price' ? Number(value) : (newItems[index].unit_price || 0);
      const d = field === 'desconto' ? Number(value) : (newItems[index].desconto || 0);
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

  const total = (items ?? []).reduce((sum, item) => sum + (item.total || 0), 0);
  const vatAmount = total * 0.14;
  const finalTotal = total + vatAmount - Number(globalDiscount || 0);

  const selectedSeries = fiscalSeries.find(s => s.id === Number(seriesId));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    if (!seriesId) { alert('Por favor, selecione uma série.'); return; }
    if (!clientId) { alert('Por favor, selecione um cliente.'); return; }

    const client = clients.find(c => c.id === Number(clientId));
    const isManual = selectedSeries?.type === 'manual';

    const url = initialData ? `/api/invoices/${initialData.id}` : '/api/invoices';
    const method = initialData ? 'PUT' : 'POST';

    const res = await fetchWithAuth(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        cliente_id: clientId, 
        client_name: client?.name || '',
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
        cash_box: paymentCondition === 'Pronto Pagamento' ? cashBox : '',
        payment_method: paymentCondition === 'Pronto Pagamento' ? paymentMethod : 'A Prazo',
        series_id: seriesId,
        invoice_number: isManual ? documentNumberManual : (initialData?.numero_documento || initialData?.invoice_number || undefined),
        series_reference: isManual ? referenceManual : selectedSeries?.reference,
        total: finalTotal,
        company_id: user?.company_id
      })
    });

    if (res.ok) {
      onSuccess();
    } else {
      const errorData = await res.json().catch(() => ({ error: 'Erro desconhecido ao emitir documento' }));
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
          <h2 className="text-xl font-bold text-[#003366]">
            {fixedDocumentType ? `Emitir ${fixedDocumentType}` : 'Informações do documento'}
          </h2>
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
                disabled={!!fixedDocumentType}
                required
                className={`w-full border border-zinc-200 rounded-none px-4 py-2.5 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm ${fixedDocumentType ? 'bg-zinc-100 text-zinc-500' : 'bg-zinc-50'}`}
              >
                <option value="Fatura">Fatura</option>
                <option value="Fatura Recibo">Fatura Recibo</option>
                <option value="Fatura Proforma">Fatura Proforma</option>
                <option value="Orçamento">Orçamento</option>
                <option value="Nota de Crédito">Nota de Crédito</option>
                <option value="Nota de Débito">Nota de Débito</option>
                <option value="Guia de Remessa">Guia de Remessa</option>
                <option value="Guia de Transporte">Guia de Transporte</option>
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
                {fiscalSeries.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.type === 'manual' ? 'Manual' : 'Auto'})</option>
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
                {workSites.map(ws => <option key={ws.id} value={ws.id.toString()}>{ws.title}</option>)}
              </select>
            </div>

            {selectedSeries?.type === 'manual' && (
              <div className="col-span-1 md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6 bg-amber-50/50 p-4 border border-amber-100">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-amber-600 block">Número do Doc. Manual <span className="text-red-500">*</span></label>
                  <input type="text" value={documentNumberManual} onChange={e => setDocumentNumberManual(e.target.value)} required className="w-full border border-amber-300 px-3 py-2 text-sm focus:outline-none focus:border-amber-600 bg-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-amber-600 block">Ref. da Série Manual <span className="text-red-500">*</span></label>
                  <input type="text" value={referenceManual} onChange={e => setReferenceManual(e.target.value)} required className="w-full border border-amber-300 px-3 py-2 text-sm focus:outline-none focus:border-amber-600 bg-white" />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-600">Data de emissão</label>
              <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                required
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
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-600">Condição de Pagamento</label>
              <select 
                value={paymentCondition} 
                onChange={(e) => setPaymentCondition(e.target.value)}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2.5 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm"
              >
                <option value="Pronto Pagamento">Pronto Pagamento</option>
                <option value="A Prazo">A Prazo</option>
              </select>
            </div>
            {paymentCondition === 'Pronto Pagamento' && (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-600">Método de Pagamento <span className="text-red-500">*</span></label>
                  <select 
                    value={paymentMethod} 
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    required
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2.5 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm"
                  >
                    <option value="">Selecione...</option>
                    <option value="Numerário">Numerário / Dinheiro</option>
                    <option value="Multicaixa">TPA / Multicaixa</option>
                    <option value="Transferência">Transferência Bancária</option>
                    <option value="Depósito">Depósito Bancário</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-600">Caixa / Conta <span className="text-red-500">*</span></label>
                  <select 
                    value={cashBox} 
                    onChange={(e) => setCashBox(e.target.value)}
                    required
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2.5 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm"
                  >
                    <option value="">Selecione...</option>
                    {caixas.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Section 2: Informações do adquirente */}
        <div className="bg-white border border-zinc-200 p-8 rounded-none shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-[#003366] border-b border-zinc-100 pb-4">Informações do adquirente (Cliente)</h3>
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
                onChange={(e) => setClientId(e.target.value ? Number(e.target.value) : '')}
                required
                className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2.5 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm"
              >
                <option value="">Selecione um cliente</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.contribuinte})</option>)}
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
                  <div className="col-span-3 space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Descrição</label>
                    <input 
                      type="text" 
                      value={item.description} 
                      onChange={(e) => updateItem(idx, 'description', e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded-none px-3 py-2 text-xs text-zinc-800 focus:outline-none focus:border-[#003366]"
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Tipologia</label>
                    <select 
                      value={item.tipologia || 'S/T'}
                      onChange={(e) => updateItem(idx, 'tipologia', e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded-none px-3 py-2 text-xs text-zinc-800 focus:outline-none focus:border-[#003366]"
                    >
                      <option value="Mercadoria">Mercadoria</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Armazém</label>
                    <select 
                      value={item.warehouse_id || ''}
                      onChange={(e) => updateItem(idx, 'warehouse_id', e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded-none px-3 py-2 text-xs text-zinc-800 focus:outline-none focus:border-[#003366]"
                    >
                      <option value="">Geral</option>
                      {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-1 space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Tipo</label>
                    <select 
                      value={item.tipo_artigo || 'produto'}
                      onChange={(e) => updateItem(idx, 'tipo_artigo', e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded-none px-3 py-2 text-xs text-zinc-800 focus:outline-none focus:border-[#003366]"
                    >
                      <option value="produto">PRO</option>
                      <option value="servico">SER</option>
                    </select>
                  </div>
                  <div className="col-span-1 space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Taxa</label>
                    <select 
                      value={item.tax || ALL_TAXES[0]}
                      onChange={(e) => {
                        updateItem(idx, 'tax', e.target.value);
                      }}
                      className="w-full bg-white border border-zinc-200 rounded-none px-3 py-2 text-xs text-zinc-800 focus:outline-none focus:border-[#003366]"
                    >
                      {ALL_TAXES.map((t, i) => <option key={i} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="col-span-1">
                    <button type="button" onClick={() => removeItem(idx)} className="w-full bg-red-50 text-red-500 p-2 border border-red-100 hover:bg-red-500 hover:text-white transition-all"><X size={16}/></button>
                  </div>
                </div>

                <div className="grid grid-cols-12 gap-4 items-end bg-white p-3 border border-zinc-100">
                   <div className="col-span-2 space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase">Qtd</label>
                      <input type="number" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} className="w-full border-none focus:ring-0 text-sm font-bold text-[#003366]" />
                   </div>
                   <div className="col-span-3 space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase">P. Unitário</label>
                      <input type="number" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', e.target.value)} className="w-full border-none focus:ring-0 text-sm font-bold text-[#003366]" />
                   </div>
                   <div className="col-span-2 space-y-1">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase">Desconto</label>
                      <input type="number" value={item.desconto || 0} onChange={e => updateItem(idx, 'desconto', e.target.value)} className="w-full border-none focus:ring-0 text-sm font-bold text-red-500" />
                   </div>
                   <div className="col-span-3 space-y-1 border-l pl-4">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase">Subtotal Líquido</label>
                      <p className="text-sm font-black text-[#003366]">{formatCurrency(item.total || 0)}</p>
                   </div>
                   <div className="col-span-2">
                      <button 
                        type="button"
                        onClick={() => setExpandedDimensions(expandedDimensions === idx ? null : idx)}
                        className={`w-full py-1 text-[9px] font-black uppercase tracking-widest border transition-all ${expandedDimensions === idx ? 'bg-[#003366] text-white border-[#003366]' : 'bg-zinc-50 text-zinc-400 border-zinc-200'}`}
                      >
                         {expandedDimensions === idx ? 'Fechar Dimensões' : 'Dimensões (cm)'}
                      </button>
                   </div>
                </div>

                {expandedDimensions === idx && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="grid grid-cols-3 gap-4 pt-2">
                     <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-400 uppercase">Comprimento</label>
                        <input type="number" value={item.comprimento || 0} onChange={e => updateItem(idx, 'comprimento', e.target.value)} className="w-full bg-white border border-zinc-100 p-2 text-xs focus:border-[#003366] outline-none" />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-400 uppercase">Largura</label>
                        <input type="number" value={item.largura || 0} onChange={e => updateItem(idx, 'largura', e.target.value)} className="w-full bg-white border border-zinc-100 p-2 text-xs focus:border-[#003366] outline-none" />
                     </div>
                     <div className="space-y-1">
                        <label className="text-[9px] font-bold text-zinc-400 uppercase">Altura</label>
                        <input type="number" value={item.altura || 0} onChange={e => updateItem(idx, 'altura', e.target.value)} className="w-full bg-white border border-zinc-100 p-2 text-xs focus:border-[#003366] outline-none" />
                     </div>
                  </motion.div>
                )}
              </div>
            ))}
            
            {items.length === 0 && (
              <div className="py-20 text-center border-2 border-dashed border-zinc-100 text-zinc-300 font-bold uppercase tracking-widest text-sm italic">
                Aguardando itens para furação...
              </div>
            )}
          </div>

          <div className="flex justify-end pt-8">
            <div className="w-full max-w-xs space-y-3 bg-zinc-50 p-6 border border-zinc-100">
               <div className="flex justify-between text-xs font-bold text-zinc-500">
                  <span>SUBTOTAL BRUTO</span>
                  <span>{formatCurrency(total)}</span>
               </div>
               <div className="flex justify-between text-xs font-bold text-emerald-500">
                  <span>IVA ESTIMADO (14%)</span>
                  <span>+ {formatCurrency(vatAmount)}</span>
               </div>
               {Number(globalDiscount) > 0 && (
                 <div className="flex justify-between text-xs font-bold text-red-500">
                    <span>DESCONTO GLOBAL</span>
                    <span>- {formatCurrency(Number(globalDiscount))}</span>
                 </div>
               )}
               <div className="pt-4 border-t border-zinc-200 flex justify-between items-center">
                  <span className="text-[10px] font-black text-[#003366] uppercase tracking-widest">Total Documento</span>
                  <span className="text-xl font-black text-[#003366]">{formatCurrency(finalTotal)}</span>
               </div>
               <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-tighter mt-1 italic leading-none">
                 * Os valores finais podem sofrer ajustes automáticos de moeda e retenção de fonte.
               </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-6 pb-20">
          <button 
            type="button" 
            onClick={onBack}
            className="px-10 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-600 transition-all"
          >
            Cancelar Emissão
          </button>
          <button 
            type="submit"
            className="bg-[#003366] text-white px-12 py-4 rounded-none text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-blue-900/30 hover:bg-[#002244] active:scale-95 transition-all"
          >
            Confirmar e Emitir Documento
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
    if (!clientId) return;
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
          className="w-full bg-zinc-50 border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm"
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
          className="w-full bg-zinc-50 border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Data de Abertura de Obra/Serviço</label>
        <input 
          type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required
          className="w-full bg-zinc-50 border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Data de Encerramento de Obra/Serviço</label>
        <input 
          type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required
          className="w-full bg-zinc-50 border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">COD de Obra/Serv</label>
        <input 
          type="text" value={code} onChange={e => setCode(e.target.value)} required
          placeholder="Código identificador da obra"
          className="w-full bg-zinc-50 border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total de Efectivos por Dia</label>
        <input 
          type="number" value={staffPerDay} onChange={e => setStaffPerDay(Number(e.target.value))} required
          placeholder="Número de trabalhadores diários"
          className="w-full bg-zinc-50 border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total de Efectivos</label>
        <input 
          type="number" value={totalStaff} onChange={e => setTotalStaff(Number(e.target.value))} required
          placeholder="Total de trabalhadores no projeto"
          className="w-full bg-zinc-50 border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Localização da Obra/Serviço</label>
        <input 
          type="text" value={location} onChange={e => setLocation(e.target.value)} required
          placeholder="Endereço ou coordenadas da obra"
          className="w-full bg-zinc-50 border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Contacto da Obra/Serviço</label>
        <input 
          type="text" value={contact} onChange={e => setContact(e.target.value)} required
          placeholder="Telefone ou responsável no local"
          className="w-full bg-zinc-50 border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Descrição da Obra/Serviço</label>
        <textarea 
          value={description} onChange={e => setDescription(e.target.value)} required
          placeholder="Breve descrição dos trabalhos a realizar"
          className="w-full bg-zinc-50 border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm min-h-[80px]"
        />
      </div>
      <div className="md:col-span-2 space-y-1">
        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Observações</label>
        <textarea 
          value={observations} onChange={e => setObservations(e.target.value)}
          placeholder="Notas adicionais ou restrições"
          className="w-full bg-zinc-50 border border-zinc-300 rounded-none px-4 py-2 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm min-h-[80px]"
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

const WorkSiteMovementForm = ({ onBack, onSuccess, movements = [] }: { onBack: () => void, onSuccess: (movement: any) => void, movements?: WorkSiteMovement[] }) => {
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
    <div className="space-y-8">
      <form onSubmit={handleSubmit} className="space-y-4 bg-zinc-50 p-6 border border-zinc-200">
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

      <div className="space-y-3">
        <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
          <History size={14} />
          Movimentos Associados Recentemente
        </h4>
        <div className="border border-zinc-200 max-h-[200px] overflow-y-auto">
          <table className="w-full text-left text-[11px]">
            <thead className="bg-zinc-100 sticky top-0">
              <tr className="text-zinc-500 font-bold uppercase tracking-tighter">
                <th className="px-4 py-2">Data</th>
                <th className="px-4 py-2">Doc</th>
                <th className="px-4 py-2 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {movements.slice().reverse().map(m => (
                <tr key={m.id}>
                  <td className="px-4 py-2 text-zinc-500">{new Date(m.date).toLocaleDateString()}</td>
                  <td className="px-4 py-2 font-bold text-zinc-700">{m.doc_no}</td>
                  <td className={`px-4 py-2 text-right font-bold ${m.debit > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {formatCurrency(m.debit > 0 ? m.debit : m.credit)}
                  </td>
                </tr>
              ))}
              {movements.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-zinc-400 italic">Nenhum movimento associado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const WorkSiteRegistration = ({ workSite, onBack }: { workSite: WorkSite, onBack: () => void }) => {
  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Ficha de Cadastro de Obra', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`REF: ${workSite.code}`, 20, 40);
    doc.text(`Título: ${workSite.title}`, 20, 50);
    doc.text(`Cliente: ${workSite.client_name}`, 20, 60);
    doc.text(`Localização: ${workSite.location}`, 20, 70);
    doc.text(`Data Início: ${new Date(workSite.start_date).toLocaleDateString('pt-PT')}`, 20, 80);
    doc.text(`Data Fim: ${new Date(workSite.end_date).toLocaleDateString('pt-PT')}`, 20, 90);
    doc.text(`Total Efectivos: ${workSite.total_staff}`, 20, 100);
    doc.text(`Descrição:`, 20, 110);
    doc.setFontSize(10);
    const splitDescription = doc.splitTextToSize(workSite.description || 'N/A', 170);
    doc.text(splitDescription, 20, 120);
    
    doc.save(`cadastro_obra_${workSite.code}.pdf`);
  };

  return (
    <div className="bg-white min-h-screen p-8 sm:p-12 space-y-10 max-w-5xl mx-auto shadow-2xl border border-zinc-100">
      {/* Document Header */}
      <div className="flex justify-between items-start border-b-4 border-[#003366] pb-8">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-[#003366] flex items-center justify-center text-white">
            <Construction size={40} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-[#003366] tracking-tighter uppercase">Ficha de Cadastro de Obra</h1>
            <p className="text-zinc-400 text-xs font-bold uppercase tracking-[0.3em] mt-1">Registo Oficial de Local de Trabalho</p>
          </div>
        </div>
        <div className="text-right space-y-1">
          <div className="bg-zinc-100 px-4 py-2 font-mono text-sm font-bold text-[#003366]">
            REF: {workSite.code}
          </div>
          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Data de Emissão: {new Date().toLocaleDateString('pt-PT')}</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column - Main Info */}
        <div className="md:col-span-2 space-y-8">
          <section className="space-y-4">
            <h3 className="text-sm font-black text-[#003366] uppercase tracking-widest border-l-4 border-[#003366] pl-3">Informações Gerais</h3>
            <div className="grid grid-cols-2 gap-6 bg-zinc-50/50 p-6 border border-zinc-100">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-zinc-400 uppercase">Título do Projecto</p>
                <p className="font-bold text-zinc-800 text-lg">{workSite.title}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-zinc-400 uppercase">Cliente Responsável</p>
                <p className="font-bold text-zinc-800">{workSite.client_name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-zinc-400 uppercase">Localização / Endereço</p>
                <p className="font-medium text-zinc-600">{workSite.location}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-zinc-400 uppercase">Contacto de Emergência</p>
                <p className="font-bold text-zinc-800">{workSite.contact}</p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-black text-[#003366] uppercase tracking-widest border-l-4 border-[#003366] pl-3">Cronograma e Prazos</h3>
            <div className="grid grid-cols-2 gap-6 bg-zinc-50/50 p-6 border border-zinc-100">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                  <Calendar size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase">Data de Abertura</p>
                  <p className="font-bold text-zinc-800">{new Date(workSite.start_date).toLocaleDateString('pt-PT')}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600">
                  <Calendar size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase">Previsão de Conclusão</p>
                  <p className="font-bold text-zinc-800">{new Date(workSite.end_date).toLocaleDateString('pt-PT')}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-black text-[#003366] uppercase tracking-widest border-l-4 border-[#003366] pl-3">Descrição dos Trabalhos</h3>
            <div className="bg-zinc-50/50 p-6 border border-zinc-100 min-h-[120px]">
              <p className="text-zinc-600 text-sm leading-relaxed whitespace-pre-wrap">{workSite.description || 'Nenhuma descrição detalhada fornecida.'}</p>
            </div>
          </section>
        </div>

        {/* Right Column - Stats and Meta */}
        <div className="space-y-8">
          <section className="space-y-4">
            <h3 className="text-sm font-black text-[#003366] uppercase tracking-widest border-l-4 border-[#003366] pl-3">Recursos Humanos</h3>
            <div className="space-y-4">
              <div className="bg-[#003366] text-white p-6 shadow-lg">
                <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-2">Total de Efectivos</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black">{workSite.total_staff}</span>
                  <span className="text-xs font-bold uppercase opacity-60">Colaboradores</span>
                </div>
              </div>
              <div className="bg-white border border-zinc-200 p-6">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Média Diária</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-zinc-800">{workSite.staff_per_day}</span>
                  <span className="text-xs font-bold uppercase text-zinc-400">Pessoas/Dia</span>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm font-black text-[#003366] uppercase tracking-widest border-l-4 border-[#003366] pl-3">Observações Adicionais</h3>
            <div className="bg-amber-50/50 p-6 border border-amber-100 min-h-[150px]">
              <p className="text-amber-900/70 text-xs leading-relaxed italic">{workSite.observations || 'Sem observações registadas.'}</p>
            </div>
          </section>
        </div>
      </div>

      {/* Action Buttons - No Print */}
      <div className="flex justify-end gap-4 pt-12 border-t border-zinc-100 no-print">
        <button 
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-white border border-zinc-300 text-zinc-700 px-6 py-3 font-bold text-sm hover:bg-zinc-50 transition-all shadow-sm"
        >
          <Printer size={18} /> Imprimir Ficha
        </button>
        <button 
          onClick={handleDownloadPDF}
          className="flex items-center gap-2 bg-[#003366] text-white px-6 py-3 font-bold text-sm hover:bg-[#002244] transition-all shadow-lg"
        >
          <Download size={18} /> Baixar PDF
        </button>
        <button 
          onClick={onBack}
          className="flex items-center gap-2 bg-zinc-100 text-zinc-600 px-6 py-3 font-bold text-sm hover:bg-zinc-200 transition-all"
        >
          Voltar à Lista
        </button>
      </div>

      {/* Signatures */}
      <div className="pt-20 grid grid-cols-2 gap-20 text-center">
        <div className="space-y-8">
          <div className="border-b border-zinc-300 pb-2"></div>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Responsável pelo Cadastro</p>
        </div>
        <div className="space-y-8">
          <div className="border-b border-zinc-300 pb-2"></div>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Aprovação Direcção</p>
        </div>
      </div>

      <div className="text-center pt-10">
        <p className="text-[8px] text-zinc-300 font-bold uppercase tracking-[0.4em]">Este documento é um registo oficial do sistema de gestão AGT</p>
      </div>
    </div>
  );
};

const WorkSiteManagement = ({ workSite, movements, invoices = [], onBack }: { 
  workSite: WorkSite, 
  movements: WorkSiteMovement[], 
  invoices?: IssuedDocument[],
  onBack: () => void 
}) => {
  const [activeTab, setActiveTab] = useState<'finance' | 'invoices'>('finance');
  const totalDebit = (movements ?? []).reduce((sum, m) => sum + m.debit, 0);
  const totalCredit = (movements ?? []).reduce((sum, m) => sum + m.credit, 0);
  const currentBalance = movements.length > 0 ? movements[movements.length - 1].balance : 0;
  
  const siteInvoices = invoices.filter(inv => Number(inv.work_site_id) === workSite.id);
  const totalInvoiced = (siteInvoices ?? []).reduce((sum, inv) => sum + inv.contravalor, 0);
  const totalPaid = (siteInvoices ?? []).filter(inv => inv.status === 'paid' || inv.estado_documento === 'ativo').reduce((sum, inv) => sum + inv.contravalor, 0);
  const totalPending = totalInvoiced - totalPaid;

  return (
    <div className="bg-white min-h-screen p-8 sm:p-12 space-y-10 max-w-6xl mx-auto shadow-2xl border border-zinc-100">
      {/* Report Header */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-8 border-b-2 border-[#003366] pb-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#003366] flex items-center justify-center text-white">
              <BarChart3 size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-[#003366] tracking-tighter uppercase">Gestão do Local de Trabalho</h1>
              <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-[0.2em]">Controlo de Movimentação e Facturação</p>
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
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Total Facturado</p>
          <p className="text-2xl font-black text-[#003366]">{formatCurrency(totalInvoiced)}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5">PAGO: {formatCurrency(totalPaid)}</span>
          </div>
        </div>
        <div className="p-8">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Total Débito (Custos)</p>
          <p className="text-2xl font-black text-red-600">{formatCurrency(totalDebit)}</p>
        </div>
        <div className="p-8">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Total Crédito</p>
          <p className="text-2xl font-black text-emerald-600">{formatCurrency(totalCredit)}</p>
        </div>
        <div className="p-8 bg-[#003366] text-white">
          <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-2">Saldo de Obra</p>
          <p className="text-2xl font-black">{formatCurrency(currentBalance)}</p>
          <p className="text-[10px] text-white/40 mt-1 font-bold italic">Pendente Cliente: {formatCurrency(totalPending)}</p>
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
              <button 
                onClick={() => window.print()} 
                className="flex items-center gap-2 px-4 py-2 border border-zinc-200 hover:bg-zinc-50 transition-colors text-zinc-600 text-[10px] font-bold uppercase tracking-widest"
              >
                <Printer size={16} />
                Imprimir Relatório
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
  onPrint,
  companyName,
  companyNif,
  companyAddress,
  companyLogo,
  companyFooter
}: { 
  id: number, 
  onBack: () => void,
  onPrint: (invoice: Invoice) => void,
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
          <button 
            onClick={() => invoice && onPrint(invoice)}
            className="bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 px-4 py-2 rounded-none flex items-center gap-2 transition-all text-sm shadow-sm"
          >
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
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [filteredMovements, setFilteredMovements] = useState<any[]>([]);

  useEffect(() => {
    handleSearch();
  }, [documents]);

  const handleSearch = () => {
    const movements = documents.map(doc => {
      const isSupplier = (client as any).tipo_cliente === 'Fornecedor';
      let isCredit = false;
      let isDebit = false;
      
      if (isSupplier) {
        isCredit = ['Fatura de Compra', 'Fatura Recibo de Compra', 'Nota de Débito de Fornecedor'].includes(doc.tipo_documento);
        isDebit = ['Pagamento', 'Recibo', 'Fatura Recibo de Compra', 'Nota de Crédito de Fornecedor'].includes(doc.tipo_documento);
      } else {
        isCredit = ['RE', 'NC', 'FR', 'Recibo', 'Fatura Recibo'].includes(doc.tipo_documento);
        isDebit = ['FT', 'ND', 'FR', 'Fatura', 'Fatura Recibo'].includes(doc.tipo_documento);
      }
      
      return {
        ...doc,
        debito: isDebit ? doc.contravalor : 0,
        credito: isCredit ? doc.contravalor : 0
      };
    }).filter(m => {
      if (!m.data_emissao) return true; // Show it anyway if date is missing, let it be at the top/bottom
      try {
        const date = new Date(m.data_emissao).toISOString().split('T')[0];
        if (startDate && date < startDate) return false;
        if (endDate && date > endDate) return false;
      } catch (e) {
        console.error("Invalid date:", m.data_emissao);
      }
      return true;
    });
    setFilteredMovements(movements);
  };

  const totalDebito = (filteredMovements ?? []).reduce((acc, m) => acc + m.debito, 0);
  const totalCredito = (filteredMovements ?? []).reduce((acc, m) => acc + m.credito, 0);
  const initialBalance = client.saldo_inicial || 0;
  const saldoAtual = initialBalance + totalDebito - totalCredito;

  const handleExportXLSX = () => {
    const headers = ['Data', 'Documento', 'URN', 'Doc Nº', 'Descrição', 'Crédito', 'Débito', 'Saldo'];
    let runningSaldo = initialBalance;
    const rows = filteredMovements.map(m => {
      runningSaldo += (m.debito - m.credito);
      return [new Date(m.data_emissao).toLocaleDateString(), m.numero_documento, '', '', m.tipo_documento, m.credito, m.debito, runningSaldo];
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `extrato_${client.name}.csv`);
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div className="space-y-6 bg-zinc-50/50 p-6 min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white rounded-full transition-colors text-zinc-400 shadow-sm">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-[#003366] tracking-tight">Extrato de Conta Corrente</h2>
            <p className="text-zinc-500 font-medium uppercase text-[10px] tracking-widest">{client.name}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={handleExportXLSX} className="bg-white text-zinc-600 border border-zinc-200 px-4 py-2 text-xs font-bold flex items-center gap-2 hover:bg-zinc-50 transition-all">
            <FileSpreadsheet size={16} /> XLSX
          </button>
          <button onClick={() => window.print()} className="bg-[#003366] text-white px-4 py-2 text-xs font-bold flex items-center gap-2 hover:bg-[#002244] transition-all shadow-lg">
            <Printer size={16} /> Imprimir PDF
          </button>
        </div>
      </div>

      <div className="bg-white border border-zinc-200 p-8 shadow-sm space-y-8">
        {/* Header Info based on Image */}
        <div className="grid grid-cols-2 gap-8 border-b border-zinc-100 pb-8">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-[10px]">
              <div>
                <p className="font-bold text-zinc-400 uppercase">Data de Emissão</p>
                <p className="text-zinc-800">{new Date().toLocaleString()}</p>
              </div>
              <div>
                <p className="font-bold text-zinc-400 uppercase">Nº Contribuinte</p>
                <p className="text-zinc-800 font-mono">{client.contribuinte || 'N/A'}</p>
              </div>
            </div>
            <div>
              <p className="text-lg font-bold text-[#003366]">Extrato Cliente</p>
              <p className="text-xs text-zinc-500 font-mono">CC-{client.id} {client.name.toUpperCase()}</p>
            </div>
          </div>
          <div className="text-right space-y-2">
            <div className="inline-block bg-zinc-100 px-6 py-3 border-r-4 border-[#003366]">
              <h3 className="text-xl font-black text-[#003366]">{client.name.toUpperCase()}</h3>
            </div>
            <div className="text-[10px] text-zinc-500 space-y-0.5">
              <p>{client.localidade || 'LUANDA'}</p>
              <p>{client.municipio || 'BELAS'}</p>
              <p>{client.codigo_postal || '0000-000'}</p>
              <p>{client.provincia || 'LUANDA'}</p>
              <p>{client.pais || 'AO'}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-end gap-4 bg-zinc-50 p-4 border border-zinc-100 no-print">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Data Inicial</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-white border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:border-[#003366]" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Data Final</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-white border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:border-[#003366]" />
          </div>
          <button 
            onClick={handleSearch}
            className="bg-[#003366] text-white px-6 py-2 text-sm font-bold hover:bg-[#002244] transition-all flex items-center gap-2"
          >
            <Search size={16} /> Pesquisar
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-zinc-200 text-[10px] uppercase tracking-wider font-black text-zinc-400">
                <th className="px-4 py-3">Data Valor<br/>Data Documento</th>
                <th className="px-4 py-3">File Interno<br/>File Cliente</th>
                <th className="px-4 py-3">URN<br/>EndService</th>
                <th className="px-4 py-3">Doc Nº<br/>OriginatingOn</th>
                <th className="px-4 py-3">Descrição<br/>Doc. Suporte</th>
                <th className="px-4 py-3 text-right">Crédito</th>
                <th className="px-4 py-3 text-right">Débito</th>
                <th className="px-4 py-3 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              <tr className="bg-zinc-50/50 font-bold text-xs">
                <td colSpan={5} className="px-4 py-3 text-right uppercase tracking-widest text-zinc-400">Saldo Inicial</td>
                <td className="px-4 py-3 text-right">-</td>
                <td className="px-4 py-3 text-right">-</td>
                <td className="px-4 py-3 text-right text-[#003366]">{formatCurrency(initialBalance)}</td>
              </tr>
              {filteredMovements.map((m, idx) => {
                const runningSaldo = initialBalance + (filteredMovements ?? []).slice(0, idx + 1).reduce((acc, curr) => acc + (curr.debito - curr.credito), 0);
                return (
                  <tr key={m.id} className="hover:bg-zinc-50 text-[11px]">
                    <td className="px-4 py-4 text-zinc-500">{new Date(m.data_emissao).toLocaleDateString()}</td>
                    <td className="px-4 py-4 text-zinc-400 font-mono">INT-{m.id}</td>
                    <td className="px-4 py-4 text-zinc-400">-</td>
                    <td className="px-4 py-4 font-bold text-zinc-800">{m.numero_documento}</td>
                    <td className="px-4 py-4 text-zinc-600">{m.tipo_documento}</td>
                    <td className="px-4 py-4 text-right text-emerald-600 font-bold">{m.credito > 0 ? formatCurrency(m.credito) : '-'}</td>
                    <td className="px-4 py-4 text-right text-red-600 font-bold">{m.debito > 0 ? formatCurrency(m.debito) : '-'}</td>
                    <td className="px-4 py-4 text-right font-black text-[#003366]">{formatCurrency(runningSaldo)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-zinc-200 font-black text-xs">
                <td colSpan={5} className="px-4 py-6 text-right uppercase tracking-widest text-zinc-400">Acumulados do Período</td>
                <td className="px-4 py-6 text-right text-emerald-600 border-b-2 border-zinc-200">{formatCurrency(totalCredito)}</td>
                <td className="px-4 py-6 text-right text-red-600 border-b-2 border-zinc-200">{formatCurrency(totalDebito)}</td>
                <td className="px-4 py-6 text-right text-[#003366] bg-zinc-50">{formatCurrency(saldoAtual)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {filteredMovements.length === 0 && (
          <div className="p-12 text-center text-zinc-400 text-sm italic">Nenhum movimento encontrado no período selecionado.</div>
        )}

        <div className="flex justify-between items-center pt-8 border-t border-zinc-100">
          <div className="text-[10px] text-zinc-400 font-bold uppercase tracking-[0.2em]">
            [AOA] Moeda Corrente
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Saldo Acumulado Geral</span>
            <span className="text-xl font-black text-[#003366]">{formatCurrency(saldoAtual)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const ClientList = ({ clients, issuedDocuments, onRefresh, onViewAccount }: { 
  clients: Client[], 
  issuedDocuments: IssuedDocument[],
  onRefresh: () => void,
  onViewAccount: (client: Client) => void
}) => {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showOptionsModal, setShowOptionsModal] = useState<Client | null>(null);
  const [showInitialBalanceModal, setShowInitialBalanceModal] = useState<Client | null>(null);
  const [showSettledDocsModal, setShowSettledDocsModal] = useState<Client | null>(null);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [nif, setNif] = useState('');
  const [morada, setMorada] = useState('');
  const [localidade, setLocalidade] = useState('');
  const [codigo_postal, setCodigoPostal] = useState('');
  const [provincia, setProvincia] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [pais, setPais] = useState('');
  const [telefone, setTelefone] = useState('');
  const [webpage, setWebpage] = useState('');
  const [tipo_cliente, setTipoCliente] = useState('normal');
  const [estado_nif, setEstadoNif] = useState('não encontrado');
  const [saldo_inicial, setSaldoInicial] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredClients = clients.filter(c => 
    (c.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
    (c.contribuinte || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes((searchTerm || '').toLowerCase()))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (nif && !validateAngolaNIF(nif)) {
      alert('O NIF inserido é inválido segundo as regras da AGT Angola. Deve conter 10 dígitos e começar com 1, 2, 3, 4 ou 5.');
      return;
    }

    const clientData = { 
      name: name, 
      email, 
      contribuinte: nif, 
      morada: morada, 
      localidade, 
      codigo_postal, 
      provincia, 
      municipio, 
      pais, 
      telefone, 
      webpage, 
      tipo_cliente, 
      saldo_inicial: Number(saldo_inicial),
      estado_nif,
      company_id: user?.company_id 
    };
    
    try {
      const url = selectedClient ? `/api/clients/${selectedClient.id}` : '/api/clients';
      const method = selectedClient ? 'PUT' : 'POST';
      
      await fetchJson(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientData)
      });
      
      resetForm();
      setShowForm(false);
      onRefresh();
    } catch (error) {
      console.error('Error saving client:', error);
    }
  };

  const resetForm = () => {
    setSelectedClient(null);
    setName(''); setEmail(''); setNif(''); setMorada(''); setLocalidade(''); setCodigoPostal(''); setProvincia(''); setMunicipio(''); setPais(''); setTelefone(''); setWebpage(''); setTipoCliente('normal'); setEstadoNif('não encontrado'); setSaldoInicial(0);
  };

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setName(client.name);
    setEmail(client.email || '');
    setNif(client.contribuinte || '');
    setMorada(client.morada || '');
    setLocalidade(client.localidade || '');
    setCodigoPostal(client.codigo_postal || '');
    setProvincia(client.provincia || '');
    setMunicipio(client.municipio || '');
    setPais(client.pais || '');
    setTelefone(client.telefone || '');
    setWebpage(client.webpage || '');
    setTipoCliente(client.tipo_cliente || 'normal');
    setEstadoNif(client.estado_nif || 'não encontrado');
    setSaldoInicial(client.saldo_inicial || 0);
    setShowForm(true);
    setShowOptionsModal(null);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportXLSX = () => {
    // Basic CSV export as XLSX placeholder
    const headers = ['NIF', 'Nome', 'Email', 'Telefone', 'Localidade', 'Tipo'];
    const rows = filteredClients.map(c => [c.contribuinte, c.name, c.email, c.telefone, c.localidade, c.tipo_cliente]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "lista_clientes.csv");
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 border border-zinc-200 shadow-sm">
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
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input 
              type="text" 
              placeholder="Pesquisar clientes..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 text-sm focus:outline-none focus:border-[#003366] w-64 transition-all"
            />
          </div>
          <button 
            onClick={handlePrint}
            className="p-2.5 bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-all border border-zinc-200"
            title="Imprimir Lista"
          >
            <Printer size={18} />
          </button>
          <button 
            onClick={handleExportXLSX}
            className="p-2.5 bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-all border border-zinc-200"
            title="Exportar XLSX"
          >
            <FileSpreadsheet size={18} />
          </button>
          <button 
            onClick={() => {
              resetForm();
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
              <ClientForm 
                initialData={selectedClient} 
                onSuccess={() => { setShowForm(false); onRefresh(); }} 
                onBack={() => setShowForm(false)} 
              />
            </motion.div>
          </div>
        )}

        {showOptionsModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowOptionsModal(null)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-none shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <h3 className="font-bold text-[#003366] flex items-center gap-2 uppercase tracking-widest text-xs">
                  <Settings size={16} />
                  Opções do Cliente
                </h3>
                <button 
                  onClick={() => setShowOptionsModal(null)}
                  className="p-2 hover:bg-zinc-200 rounded-full transition-colors text-zinc-400 hover:text-zinc-600"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm font-bold text-zinc-800 mb-4">{showOptionsModal.name}</p>
                <button 
                  onClick={() => handleEdit(showOptionsModal)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-zinc-50 transition-all border border-zinc-100 group"
                >
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <Edit size={20} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-zinc-800">Editar Cliente</p>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Alterar dados cadastrais</p>
                  </div>
                </button>
                <button 
                  onClick={() => {
                    setShowInitialBalanceModal(showOptionsModal);
                    setShowOptionsModal(null);
                  }}
                  className="w-full flex items-center gap-4 p-4 hover:bg-zinc-50 transition-all border border-zinc-100 group"
                >
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all">
                    <CreditCard size={20} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-zinc-800">Saldo Inicial</p>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Configurar saldo de conta corrente</p>
                  </div>
                </button>
                <button 
                  onClick={() => {
                    setShowSettledDocsModal(showOptionsModal);
                    setShowOptionsModal(null);
                  }}
                  className="w-full flex items-center gap-4 p-4 hover:bg-zinc-50 transition-all border border-zinc-100 group"
                >
                  <div className="w-10 h-10 bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-all">
                    <FileCheck size={20} />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-zinc-800">Documentos Liquidados</p>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Ver faturas e recibos pagos</p>
                  </div>
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showInitialBalanceModal && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInitialBalanceModal(null)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-none shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <h3 className="font-bold text-[#003366] flex items-center gap-2 uppercase tracking-widest text-xs">
                  <CreditCard size={16} />
                  Saldo Inicial de Conta Corrente
                </h3>
                <button 
                  onClick={() => setShowInitialBalanceModal(null)}
                  className="p-2 hover:bg-zinc-200 rounded-full transition-colors text-zinc-400 hover:text-zinc-600"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-8">
                <p className="text-sm font-bold text-zinc-800 mb-6">{showInitialBalanceModal.name}</p>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Valor do Saldo Inicial</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      defaultValue={showInitialBalanceModal.saldo_inicial || 0}
                      id="initial_balance_input"
                      className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-3 text-zinc-800 focus:outline-none focus:border-[#003366] text-lg font-bold" 
                      placeholder="0.00" 
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <button onClick={() => setShowInitialBalanceModal(null)} className="px-6 py-2 text-sm font-bold text-zinc-500 hover:bg-zinc-100 transition-all">Cancelar</button>
                    <button 
                      onClick={async () => {
                        const val = (document.getElementById('initial_balance_input') as HTMLInputElement).value;
                        try {
                          await fetchJson(`/api/clients/${showInitialBalanceModal.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ ...showInitialBalanceModal, saldo_inicial: Number(val) })
                          });
                          setShowInitialBalanceModal(null);
                          onRefresh();
                        } catch (error) {
                          console.error('Error updating initial balance:', error);
                        }
                      }}
                      className="bg-emerald-600 text-white px-8 py-2 text-sm font-bold shadow-lg hover:bg-emerald-700 transition-all"
                    >
                      Guardar Saldo
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showSettledDocsModal && (
          <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettledDocsModal(null)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-4xl bg-white rounded-none shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <h3 className="font-bold text-[#003366] flex items-center gap-2 uppercase tracking-widest text-xs">
                  <FileCheck size={16} />
                  Documentos Liquidados
                </h3>
                <button 
                  onClick={() => setShowSettledDocsModal(null)}
                  className="p-2 hover:bg-zinc-200 rounded-full transition-colors text-zinc-400 hover:text-zinc-600"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-8 overflow-y-auto">
                <p className="text-sm font-bold text-zinc-800 mb-6">{showSettledDocsModal.name}</p>
                <div className="bg-white border border-zinc-200 rounded-none overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-50 text-zinc-400 text-[10px] uppercase tracking-wider font-bold border-b border-zinc-100">
                        <th className="px-6 py-3">Data</th>
                        <th className="px-6 py-3">Documento</th>
                        <th className="px-6 py-3">Tipo</th>
                        <th className="px-6 py-3 text-right">Valor</th>
                        <th className="px-6 py-3 text-right">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {issuedDocuments.filter(d => d.cliente_id === showSettledDocsModal.id && d.status === 'pago').length > 0 ? (
                        issuedDocuments.filter(d => d.cliente_id === showSettledDocsModal.id && d.status === 'pago').map(d => (
                          <tr key={d.id} className="text-sm hover:bg-zinc-50">
                            <td className="px-6 py-4 text-zinc-500">{new Date(d.data_emissao).toLocaleDateString()}</td>
                            <td className="px-6 py-4 font-bold text-zinc-800">{d.numero_documento}</td>
                            <td className="px-6 py-4 text-zinc-600">{d.tipo_documento}</td>
                            <td className="px-6 py-4 text-right font-bold text-[#003366]">{formatCurrency(d.contravalor)}</td>
                            <td className="px-6 py-4 text-right">
                              <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase">Liquidado</span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr className="text-sm">
                          <td className="px-6 py-4 text-zinc-500 italic" colSpan={5}>Nenhum documento liquidado encontrado.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* NIF Portal removed as it is now opened in a new tab */}

      <div className="bg-white border border-zinc-200 rounded-none overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#003366] text-white text-[11px] uppercase tracking-wider font-bold">
              <th className="px-6 py-4">NIF</th>
              <th className="px-6 py-4">Estado NIF</th>
              <th className="px-6 py-4">Nome</th>
              <th className="px-6 py-4">Localidade</th>
              <th className="px-6 py-4">Telefone</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filteredClients.map((client) => (
              <tr key={client.id} className="hover:bg-zinc-50 text-sm transition-colors">
                <td className="px-6 py-4 font-mono text-xs text-zinc-400">{client.contribuinte || 'N/A'}</td>
                <td className="px-6 py-4">
                  {client.estado_nif === 'ativo' && <span className="text-emerald-600" title="Ativo">🟢</span>}
                  {client.estado_nif === 'suspenso' && <span className="text-red-600" title="Suspenso">🔴</span>}
                  {client.estado_nif === 'inválido' && <span className="text-amber-600" title="Inválido">⚠️</span>}
                  {client.estado_nif === 'não encontrado' && <span className="text-zinc-600" title="Não encontrado">🚫</span>}
                  {!client.estado_nif && <span className="text-zinc-400" title="Não definido">⚪</span>}
                </td>
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
                    <button 
                      onClick={() => setShowOptionsModal(client)}
                      className="text-zinc-400 hover:text-[#003366] p-1.5 hover:bg-zinc-100 transition-all"
                      title="Opções"
                    >
                      <Settings size={18} />
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

const CreatePurchase = ({ suppliers, products, workSites, fiscalSeries, onBack, onSuccess, caixas }: { 
  suppliers: Supplier[], 
  products: Product[], 
  workSites: WorkSite[], 
  fiscalSeries: FiscalSeries[],
  onBack: () => void, 
  onSuccess: () => void,
  caixas: Caixa[]
}) => {
  const [supplierId, setSupplierId] = useState<number | ''>('');
  const [documentType, setDocumentType] = useState('Fatura de Compra');
  const [seriesId, setSeriesId] = useState<number | ''>('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [countryCode, setCountryCode] = useState('Angola');
  const [nif, setNif] = useState('');
  const [supplierName, setSupplierName] = useState('');
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
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  useEffect(() => {
    fetchJson('/api/warehouses').then(data => setWarehouses(data || []));
  }, []);

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

  const total = (items ?? []).reduce((sum, item) => sum + (item.total || 0), 0);
  const vatAmount = total * 0.14;
  const finalTotal = total + vatAmount - Number(globalDiscount || 0);

  const handleSearchSupplier = () => {
    const client = suppliers.find(c => c.nif === nif);
    if (client) {
      setSupplierId(client.id);
      setSupplierName(client.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    let finalSupplierId = supplierId;
    if (!finalSupplierId && supplierName) {
      const res = await fetchWithAuth('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: supplierName, nif, email: '', address: '' })
      });
      if (res.ok) {
        const data = await res.json();
        finalSupplierId = data.id;
      }
    }

    if (!finalSupplierId) {
      alert('Por favor, selecione um fornecedor ou digite o nome de um novo fornecedor.');
      return;
    }

    const res = await fetchWithAuth('/api/purchases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        supplier_id: finalSupplierId, 
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
                <option value="Fatura de Compra">Fatura de Compra</option>
                <option value="Fatura Recibo de Compra">Fatura Recibo de Compra</option>
                <option value="Pagamento">Pagamento (Recibo)</option>
                <option value="Nota de Crédito de Fornecedor">Nota de Crédito de Fornecedor</option>
                <option value="Nota de Débito de Fornecedor">Nota de Débito de Fornecedor</option>
                <option value="Guia de Entrada">Guia de Entrada</option>
                <option value="Guia de Devolução">Guia de Devolução</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-600">Série</label>
              <select 
                value={seriesId} 
                onChange={(e) => {
                  const id = e.target.value ? Number(e.target.value) : '';
                  setSeriesId(id);
                  const s = fiscalSeries.find(f => f.id === id);
                  if (s && s.type === 'manual') {
                    setDocumentNumber('');
                  }
                }} 
                required
                className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2.5 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm"
              >
                <option value="">Selecionar Série</option>
                {fiscalSeries.filter(s => s.is_active).map(s => (
                  <option key={s.id} value={s.id}>{s.description} ({s.reference})</option>
                ))}
              </select>
            </div>
            {fiscalSeries.find(s => s.id === seriesId)?.type === 'manual' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-600">Nº do Documento Manual <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={documentNumber} 
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  placeholder="Ex: FT 2026/1"
                  required
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2.5 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm font-mono font-bold"
                />
              </div>
            )}
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
            {(documentType === 'Fatura Recibo de Compra' || documentType === 'Pagamento') && (
              <>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-600">Selecionar caixa de pagamento</label>
                  <select 
                    value={cashBox} 
                    onChange={(e) => setCashBox(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2.5 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm"
                  >
                    <option value="">Selecione a caixa</option>
                    {caixas.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
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

        {/* Section 2: Informações do fornecedor */}
        <div className="bg-white border border-zinc-200 p-8 rounded-none shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-[#003366] border-b border-zinc-100 pb-4">Informações do fornecedor</h3>
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
              <label className="text-xs font-bold text-zinc-600">Selecionar fornecedor <span className="text-red-500">*</span></label>
              <select 
                value={supplierId} 
                onChange={(e) => {
                  const id = e.target.value;
                  setSupplierId(id ? Number(id) : '');
                  const client = suppliers.find(c => c.id === Number(id));
                  if (client) {
                    setSupplierName(client.name);
                    setNif(client.nif);
                  } else {
                    setSupplierName('');
                    setNif('');
                  }
                }}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-none px-4 py-2.5 text-zinc-800 focus:outline-none focus:border-[#003366] text-sm"
              >
                <option value="">Selecione um fornecedor</option>
                {suppliers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.nif})</option>)}
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
                  <div className="col-span-4 space-y-1">
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
                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Armazém</label>
                    <select 
                      value={item.warehouse_id || ''} 
                      onChange={(e) => updateItem(idx, 'warehouse_id', e.target.value ? Number(e.target.value) : undefined)}
                      className="w-full bg-white border border-zinc-200 rounded-none px-3 py-2 text-xs text-zinc-800 focus:outline-none focus:border-[#003366]"
                    >
                      <option value="">Nenhum</option>
                      {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
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
            Registar Compra
          </button>
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

const PurchasesModule = ({ suppliers, products, workSites, fiscalSeries, caixas }: { suppliers: Supplier[], products: Product[], workSites: WorkSite[], fiscalSeries: FiscalSeries[], caixas: Caixa[] }) => {
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
    console.log("Purchases loaded:", purchases);
  }, []);

  if (isCreating) {
    return (
      <CreatePurchase 
        suppliers={suppliers} 
        products={products} 
        workSites={workSites} 
        fiscalSeries={fiscalSeries} 
        onBack={() => setIsCreating(false)} 
        onSuccess={() => {
          setIsCreating(false);
          fetchPurchases();
        }} 
        caixas={caixas}
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
                (p.supplier_name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) || 
                (p.purchase_number || '').toLowerCase().includes((searchTerm || '').toLowerCase())
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

const SupplierAccount = ({ supplier, purchases, onBack }: { 
  supplier: Supplier, 
  purchases: Purchase[], 
  onBack: () => void 
}) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [filteredMovements, setFilteredMovements] = useState<any[]>([]);

  useEffect(() => {
    handleSearch();
  }, [purchases]);

  const handleSearch = () => {
    const movements = purchases.map(p => {
      const isCredit = ['Fatura de Compra', 'Fatura Recibo de Compra', 'Nota de Débito de Fornecedor', 'FTC'].includes(p.document_type || '');
      const isDebit = ['Pagamento', 'Recibo', 'Fatura Recibo de Compra', 'Nota de Crédito de Fornecedor', 'RCT'].includes(p.document_type || '');
      
      return {
        ...p,
        debito: isDebit ? p.total : 0,
        credito: isCredit ? p.total : 0,
        data_emissao: p.date,
        numero_documento: p.purchase_number,
        tipo_documento: p.document_type
      };
    }).filter(m => {
      if (!m.data_emissao) return true;
      try {
        const date = new Date(m.data_emissao).toISOString().split('T')[0];
        if (startDate && date < startDate) return false;
        if (endDate && date > endDate) return false;
      } catch (e) {
        console.error("Invalid date:", m.data_emissao);
      }
      return true;
    });
    setFilteredMovements(movements);
  };

  const totalDebito = (filteredMovements ?? []).reduce((acc, m) => acc + m.debito, 0);
  const totalCredito = (filteredMovements ?? []).reduce((acc, m) => acc + m.credito, 0);
  const initialBalance = (supplier as any).saldo_inicial || 0;
  const saldoAtual = initialBalance + totalCredito - totalDebito; // For suppliers, Credit (Purchase) increases debt, Debit (Payment) decreases it

  return (
    <div className="space-y-6 bg-zinc-50/50 p-6 min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white rounded-full transition-colors text-zinc-400 shadow-sm">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-[#003366] tracking-tight uppercase">Conta Corrente Fornecedor</h2>
            <p className="text-zinc-500 font-medium uppercase text-[10px] tracking-widest">{supplier.name}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="bg-white text-zinc-600 border border-zinc-200 px-4 py-2 text-xs font-bold flex items-center gap-2 hover:bg-zinc-50 transition-all">
            <FileSpreadsheet size={16} /> XLSX
          </button>
          <button onClick={() => window.print()} className="bg-[#003366] text-white px-4 py-2 text-xs font-bold flex items-center gap-2 hover:bg-[#002244] transition-all shadow-lg">
            <Printer size={16} /> Imprimir PDF
          </button>
        </div>
      </div>

      <div className="bg-white border border-zinc-200 p-8 shadow-sm space-y-8">
        <div className="grid grid-cols-2 gap-8 border-b border-zinc-100 pb-8">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-[10px]">
              <div>
                <p className="font-bold text-zinc-400 uppercase">Data de Emissão</p>
                <p className="text-zinc-800">{new Date().toLocaleString()}</p>
              </div>
              <div>
                <p className="font-bold text-zinc-400 uppercase">NIF</p>
                <p className="text-zinc-800 font-mono">{supplier.nif || 'N/A'}</p>
              </div>
            </div>
            <div>
              <p className="text-lg font-bold text-[#003366]">Extrato Fornecedor</p>
              <p className="text-xs text-zinc-500 font-mono">FORN-{supplier.id} {supplier.name.toUpperCase()}</p>
            </div>
          </div>
          <div className="text-right space-y-2">
            <div className="inline-block bg-zinc-100 px-6 py-3 border-r-4 border-[#003366]">
              <h3 className="text-xl font-black text-[#003366]">{supplier.name.toUpperCase()}</h3>
            </div>
          </div>
        </div>

        <div className="flex items-end gap-4 bg-zinc-50 p-4 border border-zinc-100 no-print">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Data Inicial</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-white border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:border-[#003366]" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Data Final</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-white border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:border-[#003366]" />
          </div>
          <button 
            onClick={handleSearch}
            className="bg-[#003366] text-white px-6 py-2 text-sm font-bold hover:bg-[#002244] transition-all flex items-center gap-2"
          >
            <Search size={16} /> Pesquisar
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-zinc-200 text-[10px] uppercase tracking-wider font-black text-zinc-400">
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Doc Nº</th>
                <th className="px-4 py-3">Tipo Documento</th>
                <th className="px-4 py-3 text-right">Crédito (Aumento Dívida)</th>
                <th className="px-4 py-3 text-right">Débito (Pagamento)</th>
                <th className="px-4 py-3 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              <tr className="bg-zinc-50/50 font-bold text-xs">
                <td colSpan={3} className="px-4 py-3 text-right uppercase tracking-widest text-zinc-400">Saldo Inicial</td>
                <td className="px-4 py-3 text-right">-</td>
                <td className="px-4 py-3 text-right">-</td>
                <td className="px-4 py-3 text-right text-[#003366]">{formatCurrency(initialBalance)}</td>
              </tr>
              {filteredMovements.map((m, idx) => {
                const runningSaldo = initialBalance + filteredMovements.slice(0, idx + 1).reduce((acc, curr) => acc + (curr.credito - curr.debito), 0);
                return (
                  <tr key={m.id} className="hover:bg-zinc-50 text-[11px]">
                    <td className="px-4 py-4 text-zinc-500">{new Date(m.data_emissao).toLocaleDateString()}</td>
                    <td className="px-4 py-4 font-bold text-zinc-800">{m.numero_documento}</td>
                    <td className="px-4 py-4 text-zinc-600 font-bold uppercase">{m.tipo_documento}</td>
                    <td className="px-4 py-4 text-right text-red-600 font-bold">{m.credito > 0 ? formatCurrency(m.credito) : '-'}</td>
                    <td className="px-4 py-4 text-right text-emerald-600 font-bold">{m.debito > 0 ? formatCurrency(m.debito) : '-'}</td>
                    <td className="px-4 py-4 text-right font-black text-[#003366]">{formatCurrency(runningSaldo)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-zinc-200 font-black text-xs">
                <td colSpan={3} className="px-4 py-6 text-right uppercase tracking-widest text-zinc-400">Acumulados</td>
                <td className="px-4 py-6 text-right text-red-600">{formatCurrency(totalCredito)}</td>
                <td className="px-4 py-6 text-right text-emerald-600">{formatCurrency(totalDebito)}</td>
                <td className="px-4 py-6 text-right text-[#003366] bg-zinc-50">{formatCurrency(saldoAtual)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

const SupplierModule = ({ products, workSites, fiscalSeries, caixas }: { products: Product[], workSites: WorkSite[], fiscalSeries: FiscalSeries[], caixas: Caixa[] }) => {
  const [activeSubTab, setActiveSubTab] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [nif, setNif] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [localidade, setLocalidade] = useState('');
  const [codigoPostal, setCodigoPostal] = useState('');
  const [provincia, setProvincia] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [pais, setPais] = useState('Angola');
  const [webpage, setWebpage] = useState('');
  const [siglasBanco, setSiglasBanco] = useState('');
  const [iban, setIban] = useState('');
  const [tipoCliente, setTipoCliente] = useState('normal');

  useEffect(() => {
    fetch('/api/suppliers').then(r => r.json()).then(setSuppliers);
    fetch('/api/purchases').then(r => r.json()).then(setPurchases);
  }, []);

  const handleSearchNif = () => {
    if (nif) {
      window.open(`https://agt.minfin.gov.ao/`, 'AGT_NIF', 'width=800,height=600,left=200,top=100');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (nif && !validateAngolaNIF(nif)) {
      alert('O NIF inserido é inválido segundo as regras da AGT Angola. Deve conter 10 dígitos e começar com 1, 2, 3, 4 ou 5.');
      return;
    }

    const res = await fetchWithAuth('/api/suppliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        name, nif, email, phone, address, 
        localidade, codigo_postal: codigoPostal, provincia, municipio, 
        pais, webpage, siglas_banco: siglasBanco, iban, tipo_cliente: tipoCliente 
      })
    });
    if (res.ok) {
      setName(''); setNif(''); setEmail(''); setPhone(''); setAddress('');
      setLocalidade(''); setCodigoPostal(''); setProvincia(''); setMunicipio('');
      setPais('Angola'); setWebpage(''); setSiglasBanco(''); setIban(''); setTipoCliente('normal');
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
        return <PurchasesModule suppliers={suppliers} products={products} workSites={workSites} fiscalSeries={fiscalSeries} caixas={caixas} />;
      case 'current-accounts':
        if (selectedSupplier) {
          return <SupplierAccount supplier={selectedSupplier} purchases={purchases.filter(p => p.supplier_id === selectedSupplier.id)} onBack={() => setSelectedSupplier(null)} />;
        }
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-[#003366] uppercase tracking-tight flex items-center gap-3">
              <FileText size={24} /> Contas Correntes Fornecedores
            </h3>
            <div className="bg-white border border-zinc-200 rounded-none overflow-x-auto shadow-sm">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-[#003366] text-white text-[11px] uppercase tracking-wider font-bold">
                    <th className="px-6 py-4">Fornecedor</th>
                    <th className="px-6 py-4">NIF</th>
                    <th className="px-6 py-4 text-right">Saldo Atual</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {suppliers.map(s => {
                    const sPurchases = purchases.filter(p => p.supplier_id === s.id);
                    const debt = sPurchases.reduce((acc, p) => acc + (['Fatura de Compra', 'Fatura Recibo de Compra', 'Nota de Débito de Fornecedor'].includes(p.document_type || '') ? (p.total || 0) : 0), 0);
                    const paid = sPurchases.reduce((acc, p) => acc + (['Pagamento', 'Recibo', 'Fatura Recibo de Compra', 'Nota de Crédito de Fornecedor'].includes(p.document_type || '') ? (p.total || 0) : 0), 0);
                    const initial = (s as any).saldo_inicial || 0;
                    const balance = initial + debt - paid;
                    
                    return (
                      <tr key={s.id} className="hover:bg-zinc-50 border-b border-zinc-50">
                        <td className="px-6 py-4 font-bold text-zinc-900">{s.name}</td>
                        <td className="px-6 py-4 text-zinc-700 font-mono font-bold">{s.nif}</td>
                        <td className={`px-6 py-4 text-right font-black ${balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {formatCurrency(balance)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => setSelectedSupplier(s)}
                            className="text-[#003366] font-bold text-xs uppercase hover:underline"
                          >
                            Ver Extrato
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
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
            <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Contribuinte (NIF)</label>
                  <div className="relative">
                    <input type="text" placeholder="000000000" value={nif} onChange={e => setNif(e.target.value)} className="w-full border border-zinc-200 bg-zinc-50 rounded-none pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:border-[#003366]" />
                    {nif && (
                      <button type="button" onClick={handleSearchNif} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#003366] hover:text-[#002244]">
                        <Search size={16} />
                      </button>
                    )}
                  </div>
                  <p className="text-[9px] text-zinc-400">Insira o NIF de Angola AGT e clique na lupa para consultar</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Nome do Fornecedor</label>
                  <input type="text" placeholder="Ex: Angola Trading Lda" value={name} onChange={e => setName(e.target.value)} required className="w-full border border-zinc-200 bg-zinc-50 rounded-none px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366]" />
                  <p className="text-[9px] text-zinc-400">Nome completo da empresa ou fornecedor</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Morada</label>
                <input type="text" placeholder="Rua ..., Luanda" value={address} onChange={e => setAddress(e.target.value)} className="w-full border border-zinc-200 bg-zinc-50 rounded-none px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366]" />
                <p className="text-[9px] text-zinc-400">Endereço completo do fornecedor</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Localidade</label>
                  <input type="text" placeholder="Localidade" value={localidade} onChange={e => setLocalidade(e.target.value)} className="w-full border border-zinc-200 bg-zinc-50 rounded-none px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366]" />
                  <p className="text-[9px] text-zinc-400">Bairro ou zona</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Código Postal</label>
                  <input type="text" placeholder="Código Postal" value={codigoPostal} onChange={e => setCodigoPostal(e.target.value)} className="w-full border border-zinc-200 bg-zinc-50 rounded-none px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366]" />
                  <p className="text-[9px] text-zinc-400">Código postal da morada</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Província</label>
                  <input type="text" placeholder="Província" value={provincia} onChange={e => setProvincia(e.target.value)} className="w-full border border-zinc-200 bg-zinc-50 rounded-none px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366]" />
                  <p className="text-[9px] text-zinc-400">Província de residência</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Município</label>
                  <select value={municipio} onChange={e => setMunicipio(e.target.value)} className="w-full border border-zinc-200 bg-zinc-50 rounded-none px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366]">
                    <option value="">Selecione...</option>
                    <option value="Luanda">Luanda</option>
                    <option value="Belas">Belas</option>
                    <option value="Viana">Viana</option>
                    <option value="Cazenga">Cazenga</option>
                    <option value="Cacuaco">Cacuaco</option>
                    <option value="Talatona">Talatona</option>
                    <option value="Kilamba Kiaxi">Kilamba Kiaxi</option>
                  </select>
                  <p className="text-[9px] text-zinc-400">Município de residência</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">País</label>
                  <select value={pais} onChange={e => setPais(e.target.value)} className="w-full border border-zinc-200 bg-zinc-50 rounded-none px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366]">
                    <option value="Angola">Angola</option>
                    <option value="Portugal">Portugal</option>
                    <option value="Brasil">Brasil</option>
                    <option value="Outro">Outro</option>
                  </select>
                  <p className="text-[9px] text-zinc-400">País de origem</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Telefone</label>
                  <input type="text" placeholder="+244 ..." value={phone} onChange={e => setPhone(e.target.value)} className="w-full border border-zinc-200 bg-zinc-50 rounded-none px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366]" />
                  <p className="text-[9px] text-zinc-400">Contacto telefónico principal</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Email</label>
                  <input type="email" placeholder="contato@fornecedor.com" value={email} onChange={e => setEmail(e.target.value)} className="w-full border border-zinc-200 bg-zinc-50 rounded-none px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366]" />
                  <p className="text-[9px] text-zinc-400">Endereço de email</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">WebPage</label>
                  <input type="url" placeholder="https://www..." value={webpage} onChange={e => setWebpage(e.target.value)} className="w-full border border-zinc-200 bg-zinc-50 rounded-none px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366]" />
                  <p className="text-[9px] text-zinc-400">Website do fornecedor</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Siglas do Banco</label>
                  <input type="text" placeholder="Ex: BAI, BFA" value={siglasBanco} onChange={e => setSiglasBanco(e.target.value)} className="w-full border border-zinc-200 bg-zinc-50 rounded-none px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366]" />
                  <p className="text-[9px] text-zinc-400">Sigla do banco principal</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">IBAN</label>
                  <input type="text" placeholder="AO06..." value={iban} onChange={e => setIban(e.target.value)} className="w-full border border-zinc-200 bg-zinc-50 rounded-none px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366]" />
                  <p className="text-[9px] text-zinc-400">IBAN para transferências</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Tipo de Cliente</label>
                  <select value={tipoCliente} onChange={e => setTipoCliente(e.target.value)} className="w-full border border-zinc-200 bg-zinc-50 rounded-none px-4 py-2.5 text-sm focus:outline-none focus:border-[#003366]">
                    <option value="normal">Cliente Normal</option>
                    <option value="nao_grupo">Fornecedor Não Grupo Nacionais</option>
                    <option value="estrangeiro">Estrangeiro</option>
                  </select>
                  <p className="text-[9px] text-zinc-400">Classificação do fornecedor</p>
                </div>
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

const SalesReport = ({ issuedDocuments }: { issuedDocuments: IssuedDocument[] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });

  const filteredDocs = issuedDocuments.filter(doc => {
    const matchesSearch = (doc.client_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (doc.invoice_number || '').toLowerCase().includes(searchTerm.toLowerCase());
    const docDate = new Date(doc.date || doc.data_emissao || '');
    const matchesStart = !dateFilter.start || docDate >= new Date(dateFilter.start);
    const matchesEnd = !dateFilter.end || docDate <= new Date(dateFilter.end);
    return matchesSearch && matchesStart && matchesEnd;
  });

  const totalSold = filteredDocs.reduce((acc, doc) => acc + (doc.counter_value || doc.total || 0), 0);
  const totalVat = filteredDocs.reduce((acc, doc) => acc + (doc.vat_amount || 0), 0);
  const totalNet = totalSold - totalVat;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-zinc-200 p-8 rounded-none shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-2">Total Bruto</p>
          <p className="text-3xl font-black text-[#003366]">{formatCurrency(totalSold)}</p>
          <div className="mt-4 flex items-center gap-2 text-emerald-600">
            <TrendingUp size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Vendas Totais</span>
          </div>
        </div>
        <div className="bg-white border border-zinc-200 p-8 rounded-none shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#003366]/5 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-2">Total Líquido</p>
          <p className="text-3xl font-black text-[#003366]">{formatCurrency(totalNet)}</p>
          <div className="mt-4 flex items-center gap-2 text-[#003366]">
            <BarChart3 size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">Base Tributável</span>
          </div>
        </div>
        <div className="bg-white border border-zinc-200 p-8 rounded-none shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full -mr-12 -mt-12 transition-transform group-hover:scale-110" />
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-2">Total Impostos</p>
          <p className="text-3xl font-black text-amber-600">{formatCurrency(totalVat)}</p>
          <div className="mt-4 flex items-center gap-2 text-amber-600">
            <ShieldCheck size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">IVA Liquidado</span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-zinc-200 p-6 rounded-none shadow-sm flex flex-wrap gap-6 items-end">
        <div className="flex-1 min-w-[300px] space-y-2">
          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Pesquisar Movimento</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input 
              type="text" 
              placeholder="Nome do cliente ou número do documento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-none pl-10 pr-4 py-3 text-xs font-bold focus:outline-none focus:border-[#003366] transition-all"
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Período</label>
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              value={dateFilter.start}
              onChange={(e) => setDateFilter(prev => ({ ...prev, start: e.target.value }))}
              className="bg-zinc-50 border border-zinc-200 rounded-none px-4 py-3 text-xs font-bold focus:outline-none focus:border-[#003366]" 
            />
            <span className="text-zinc-300">/</span>
            <input 
              type="date" 
              value={dateFilter.end}
              onChange={(e) => setDateFilter(prev => ({ ...prev, end: e.target.value }))}
              className="bg-zinc-50 border border-zinc-200 rounded-none px-4 py-3 text-xs font-bold focus:outline-none focus:border-[#003366]" 
            />
          </div>
        </div>
        <button className="bg-[#003366] text-white px-8 py-3.5 text-xs font-black uppercase tracking-widest hover:bg-[#002244] transition-all flex items-center gap-2 shadow-sm">
          <Filter size={14} /> Filtrar
        </button>
      </div>

      <div className="bg-white border border-zinc-200 rounded-none overflow-hidden shadow-sm">
        <div className="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
          <h3 className="text-xs font-black text-[#003366] uppercase tracking-widest">Listagem de Movimentos de Venda</h3>
          <button className="text-[10px] font-black text-zinc-400 hover:text-[#003366] uppercase tracking-widest flex items-center gap-2 transition-colors">
            <FileDown size={14} /> Exportar Excel
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-white text-[10px] uppercase tracking-widest font-black text-zinc-400 border-b border-zinc-100">
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Documento</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Pagamento</th>
                <th className="px-6 py-4 text-right">Base</th>
                <th className="px-6 py-4 text-right">IVA</th>
                <th className="px-6 py-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {filteredDocs.map((doc) => (
                <tr key={doc.id} className="hover:bg-zinc-50 text-[11px] transition-colors group">
                  <td className="px-6 py-4 text-zinc-500 font-bold">{new Date(doc.date || doc.data_emissao || '').toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <div className="font-black text-[#003366] uppercase">{doc.document_type || doc.tipo_documento}</div>
                    <div className="text-[9px] text-zinc-400 font-bold font-mono">{doc.invoice_number || doc.numero_documento}</div>
                  </td>
                  <td className="px-6 py-4 text-zinc-900 font-black uppercase">{doc.client_name || doc.cliente_id || 'Consumidor Final'}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 bg-zinc-100 text-zinc-500 text-[9px] font-black uppercase tracking-widest border border-zinc-200">
                      {doc.payment_method || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-zinc-600 font-bold">{formatCurrency((doc.counter_value || doc.total || 0) - (doc.vat_amount || 0))}</td>
                  <td className="px-6 py-4 text-right text-amber-600 font-bold">{formatCurrency(doc.vat_amount || 0)}</td>
                  <td className="px-6 py-4 text-right font-black text-[#003366]">{formatCurrency(doc.counter_value || doc.total || 0)}</td>
                </tr>
              ))}
              {filteredDocs.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-20 text-center">
                    <BarChart3 size={48} className="mx-auto text-zinc-100 mb-4" />
                    <p className="text-zinc-400 text-sm font-bold uppercase tracking-widest">Nenhum movimento encontrado para os filtros aplicados.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const WarehouseModule = ({ onRefresh }: { onRefresh: () => void }) => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchWarehouses = async () => {
    try {
      const res = await fetchWithAuth('/api/warehouses');
      if (res.ok) {
        const data = await res.json();
        setWarehouses(data);
      }
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    const res = await fetchWithAuth('/api/warehouses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (res.ok) {
      fetchWarehouses();
      onRefresh();
      setShowForm(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 border border-zinc-200 shadow-sm">
        <div>
          <h3 className="text-lg font-bold text-[#003366] uppercase tracking-tight flex items-center gap-2">
            <Home size={20} /> Gestão de Armazéns
          </h3>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mt-1">Configure os locais de armazenamento da sua empresa.</p>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="bg-[#003366] text-white px-6 py-2.5 text-[10px] font-black uppercase tracking-widest hover:bg-[#002244] transition-all shadow-sm flex items-center gap-2"
        >
          <Plus size={16} /> Novo Armazém
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {warehouses.map(w => (
          <div key={w.id} className="bg-white border border-zinc-200 p-6 space-y-4 hover:border-[#003366] transition-all group">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 bg-zinc-50 flex items-center justify-center text-[#003366] group-hover:bg-[#003366] group-hover:text-white transition-all">
                <Home size={20} />
              </div>
              <span className="text-[9px] font-black text-zinc-300 uppercase tracking-widest">ID: {w.id}</span>
            </div>
            <div>
              <h4 className="font-black text-[#003366] uppercase tracking-tight text-sm">{w.name}</h4>
              <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-wider">{w.localidade || 'Sem localização'}</p>
            </div>
            <div className="space-y-2 pt-4 border-t border-zinc-50">
              <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-medium">
                <UserCheck size={12} className="text-zinc-300" />
                <span>Resp: {w.responsavel || '---'}</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-medium">
                <Mail size={12} className="text-zinc-300" />
                <span>Cont: {w.contacto || '---'}</span>
              </div>
            </div>
          </div>
        ))}
        {warehouses.length === 0 && !loading && (
          <div className="md:col-span-3 p-12 text-center text-zinc-400 text-sm font-medium bg-white border border-zinc-200 border-dashed">
            Nenhum armazém configurado.
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md p-8 rounded-none shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-4">
              <h3 className="text-lg font-bold text-[#003366] uppercase tracking-tight">Novo Armazém</h3>
              <button onClick={() => setShowForm(false)} className="text-zinc-400 hover:text-zinc-600"><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Nome do Armazém</label>
                <input name="name" required className="w-full bg-zinc-50 border border-zinc-200 p-3 text-sm focus:outline-none focus:border-[#003366] font-bold" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Localidade</label>
                  <input name="localidade" className="w-full bg-zinc-50 border border-zinc-200 p-3 text-sm focus:outline-none focus:border-[#003366] font-medium" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Província</label>
                  <input name="provincia" className="w-full bg-zinc-50 border border-zinc-200 p-3 text-sm focus:outline-none focus:border-[#003366] font-medium" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Responsável</label>
                <input name="responsavel" className="w-full bg-zinc-50 border border-zinc-200 p-3 text-sm focus:outline-none focus:border-[#003366] font-medium" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Contacto</label>
                <input name="contacto" className="w-full bg-zinc-50 border border-zinc-200 p-3 text-sm focus:outline-none focus:border-[#003366] font-medium" />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2 text-xs font-bold text-zinc-500 uppercase tracking-widest">Cancelar</button>
                <button type="submit" className="bg-[#003366] text-white px-8 py-2.5 text-xs font-bold uppercase tracking-widest hover:bg-[#002244] shadow-lg transition-all">Salvar Armazém</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const ProductList = ({ products, onRefresh, stockMovements, warehouses }: { 
  products: Product[], 
  onRefresh: () => void,
  stockMovements: StockMovement[],
  warehouses: Warehouse[]
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('stock');
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showProductDetailModal, setShowProductDetailModal] = useState(false);
  const [showStockReportModal, setShowStockReportModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockFilter, setStockFilter] = useState<'all' | 'positive' | 'negative' | 'low'>('all');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('all');

  const calculatePOPM = () => {
    return products.reduce((total, p) => {
      const productMovements = stockMovements.filter(m => m.product_id === p.id && m.type === 'entry');
      if (productMovements.length === 0) return total + (p.stock_quantity * (p.cost_price || 0));
      
      const totalCost = productMovements.reduce((sum, m) => sum + (m.quantity * (m.unit_price || 0)), 0);
      const totalQty = productMovements.reduce((sum, m) => sum + m.quantity, 0);
      const avgPrice = totalQty > 0 ? totalCost / totalQty : (p.cost_price || 0);
      
      return total + (p.stock_quantity * avgPrice);
    }, 0);
  };

  const calculatePIPO = () => {
    return products.reduce((total, p) => {
      const lastEntry = [...stockMovements]
        .filter(m => m.product_id === p.id && m.type === 'entry')
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
      
      const price = lastEntry ? (lastEntry.unit_price || 0) : (p.cost_price || 0);
      return total + (p.stock_quantity * price);
    }, 0);
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = (p.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) || 
      (p.referente && p.referente.toLowerCase().includes((searchTerm || '').toLowerCase())) ||
      (p.barcode && p.barcode.includes(searchTerm));
    
    if (!matchesSearch) return false;

    if (warehouseFilter !== 'all' && p.warehouse_id !== Number(warehouseFilter)) return false;

    if (stockFilter === 'positive') return p.stock_quantity > 0;
    if (stockFilter === 'negative') return p.stock_quantity < 0;
    if (stockFilter === 'low') return p.stock_quantity <= (p.min_stock || 0) && p.stock_quantity > 0;
    
    return true;
  });

  const handleAdjustment = async (productId: number, type: string, quantity: number, description: string) => {
    const res = await fetchWithAuth('/api/stock/movements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        product_id: productId, 
        type, 
        quantity, 
        description,
        company_id: user?.company_id
      })
    });
    if (res.ok) {
      onRefresh();
      setShowAdjustmentModal(false);
    }
  };

  const handleTransfer = async (productId: number, fromWh: number, toWh: number, quantity: number) => {
    const res = await fetchWithAuth('/api/stock/movements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        product_id: productId, 
        type: 'transfer', 
        quantity, 
        warehouse_id: fromWh, 
        to_warehouse_id: toWh,
        company_id: user?.company_id
      })
    });
    if (res.ok) {
      onRefresh();
      setShowTransferModal(false);
    }
  };

  const tabs = [
    { id: 'stock', label: 'Stock Atual', icon: Package },
    { id: 'movements', label: 'Movimentos', icon: History },
    { id: 'warehouse', label: 'Armazéns', icon: Home },
    { id: 'reports', label: 'Relatórios', icon: FileText },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 border border-zinc-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-[#003366] flex items-center gap-2 uppercase tracking-tight">
            <Package size={24} /> Gestão de Stock & Inventário
          </h2>
          <p className="text-zinc-500 text-xs mt-1 uppercase font-bold tracking-wider">Controle total de entradas, saídas e transferências de mercadoria.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input 
              placeholder="Pesquisar produtos..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-none text-sm focus:outline-none focus:border-[#003366] w-64 font-medium" 
            />
          </div>
          <button onClick={() => setShowForm(true)} className="bg-[#003366] hover:bg-[#002244] text-white font-bold px-6 py-2.5 rounded-none flex items-center gap-2 transition-all shadow-sm text-sm uppercase tracking-widest">
            <Plus size={18} /> Novo Produto
          </button>
        </div>
      </div>

      <div className="flex gap-8 border-b border-zinc-200 bg-white px-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 pb-4 text-[10px] font-black uppercase tracking-widest transition-all relative ${
              activeTab === tab.id 
                ? 'text-[#003366] border-b-2 border-[#003366]' 
                : 'text-zinc-400 hover:text-zinc-600'
            }`}
          >
            <tab.icon size={14} className={activeTab === tab.id ? 'text-[#003366]' : 'text-zinc-300'} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'warehouse' ? (
        <WarehouseModule onRefresh={onRefresh} />
      ) : activeTab === 'stock' ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 bg-white p-4 border border-zinc-200">
            <div className="flex-1 flex gap-2">
              <button 
                onClick={() => setStockFilter('all')}
                className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest border ${stockFilter === 'all' ? 'bg-[#003366] text-white border-[#003366]' : 'bg-zinc-50 text-zinc-500 border-zinc-200'}`}
              >
                Todos
              </button>
              <button 
                onClick={() => setStockFilter('positive')}
                className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest border ${stockFilter === 'positive' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-zinc-50 text-zinc-500 border-zinc-200'}`}
              >
                Stock Positivo
              </button>
              <button 
                onClick={() => setStockFilter('negative')}
                className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest border ${stockFilter === 'negative' ? 'bg-red-600 text-white border-red-600' : 'bg-zinc-50 text-zinc-500 border-zinc-200'}`}
              >
                Stock Negativo
              </button>
              <button 
                onClick={() => setStockFilter('low')}
                className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest border ${stockFilter === 'low' ? 'bg-amber-500 text-white border-amber-500' : 'bg-zinc-50 text-zinc-500 border-zinc-200'}`}
              >
                Stock Baixo
              </button>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Armazém:</label>
              <select 
                value={warehouseFilter}
                onChange={(e) => setWarehouseFilter(e.target.value)}
                className="bg-zinc-50 border border-zinc-200 text-[10px] font-bold uppercase tracking-widest px-3 py-2 focus:outline-none focus:border-[#003366]"
              >
                <option value="all">Todos os Armazéns</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-none overflow-hidden shadow-sm overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-[#003366] text-white text-[10px] font-black uppercase tracking-widest border-b border-zinc-200">
                  <th className="px-6 py-4">Imagem</th>
                  <th className="px-6 py-4">Ver</th>
                  <th className="px-6 py-4">Artº Nº</th>
                  <th className="px-6 py-4">Descrição</th>
                  <th className="px-6 py-4">Número</th>
                  <th className="px-6 py-4">Série</th>
                  <th className="px-6 py-4 text-center">Entradas</th>
                  <th className="px-6 py-4 text-center">Saídas</th>
                  <th className="px-6 py-4 text-center">Stock Total</th>
                  <th className="px-6 py-4 text-center">Relatório</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredProducts.map((p) => {
                  const entries = (stockMovements ?? []).filter(m => m.product_id === p.id && (m.type === 'entry' || m.type === 'adjustment_plus')).reduce((sum, m) => sum + m.quantity, 0);
                  const exits = (stockMovements ?? []).filter(m => m.product_id === p.id && (m.type === 'exit' || m.type === 'adjustment_minus')).reduce((sum, m) => sum + m.quantity, 0);
                  const isNegative = p.stock_quantity < 0;
                  const isLow = p.stock_quantity <= (p.min_stock || 0);

                  return (
                    <tr key={p.id} className="hover:bg-zinc-50 transition-colors text-xs group border-b border-zinc-50">
                      <td className="px-6 py-4">
                        <div className="w-10 h-10 bg-zinc-100 flex items-center justify-center overflow-hidden border border-zinc-200">
                          {p.image ? (
                            <img src={p.image} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <Package size={20} className="text-zinc-300" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={() => { setSelectedProduct(p); setShowProductDetailModal(true); }}
                          className="p-2 bg-zinc-100 text-[#003366] hover:bg-zinc-200 transition-all"
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                      <td className="px-6 py-4 text-zinc-500 font-mono text-[10px]">{p.referente || '---'}</td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-zinc-900">{p.name}</div>
                        <div className="text-[9px] text-zinc-400 uppercase font-black tracking-tighter">{p.category || 'Sem categoria'}</div>
                      </td>
                      <td className="px-6 py-4 text-zinc-500 font-medium">{p.barcode || p.id}</td>
                      <td className="px-6 py-4 text-zinc-500 font-medium">{p.tipologia || '---'}</td>
                      <td className="px-6 py-4 text-center text-emerald-600 font-bold">
                        {(stockMovements ?? []).filter(m => 
                          m.product_id === p.id && 
                          (warehouseFilter === 'all' || m.warehouse_id === Number(warehouseFilter) || m.to_warehouse_id === Number(warehouseFilter)) &&
                          (m.type === 'entry' || m.type === 'adjustment_plus' || (m.type === 'transfer' && m.to_warehouse_id === Number(warehouseFilter)))
                        ).reduce((sum, m) => sum + m.quantity, 0)}
                      </td>
                      <td className="px-6 py-4 text-center text-red-600 font-bold">
                        {(stockMovements ?? []).filter(m => 
                          m.product_id === p.id && 
                          (warehouseFilter === 'all' || m.warehouse_id === Number(warehouseFilter)) &&
                          (m.type === 'exit' || m.type === 'adjustment_minus' || (m.type === 'transfer' && m.warehouse_id === Number(warehouseFilter)))
                        ).reduce((sum, m) => sum + m.quantity, 0)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 font-black rounded-none ${isNegative ? 'text-red-600 bg-red-50' : isLow ? 'text-amber-600 bg-amber-50' : 'text-[#003366] bg-zinc-50'}`}>
                          {p.stock_quantity} {p.unit}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => { setSelectedProduct(p); setShowStockReportModal(true); }}
                          className="text-[#003366] hover:underline font-bold text-[10px] uppercase tracking-widest"
                        >
                          Ver Relatório
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => { setSelectedProduct(p); setShowAdjustmentModal(true); }}
                            className="p-2 text-zinc-400 hover:text-[#003366] hover:bg-zinc-100 transition-all"
                            title="Ajuste de Stock"
                          >
                            <Settings size={14} />
                          </button>
                          <button 
                            onClick={() => { setSelectedProduct(p); setShowTransferModal(true); }}
                            className="p-2 text-zinc-400 hover:text-[#003366] hover:bg-zinc-100 transition-all"
                            title="Transferir Produto"
                          >
                            <Truck size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredProducts.length === 0 && (
              <div className="p-12 text-center text-zinc-400 text-sm font-medium">Nenhum produto encontrado no stock.</div>
            )}
          </div>
        </div>
      ) : activeTab === 'movements' ? (
        <div className="bg-white border border-zinc-200 rounded-none overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#003366] text-white text-[10px] font-black uppercase tracking-widest border-b border-zinc-200">
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Produto</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Qtd</th>
                <th className="px-6 py-4">Stock Anterior</th>
                <th className="px-6 py-4">Stock Atual</th>
                <th className="px-6 py-4">Descrição</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {stockMovements.map((m) => (
                <tr key={m.id} className="hover:bg-zinc-50 transition-colors text-xs border-b border-zinc-50">
                  <td className="px-6 py-4 text-zinc-400 font-medium">{new Date(m.created_at).toLocaleString()}</td>
                  <td className="px-6 py-4 font-bold text-zinc-900">{m.product_name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-none ${
                      m.type === 'entry' ? 'bg-emerald-50 text-emerald-600' :
                      m.type === 'exit' ? 'bg-red-50 text-red-600' :
                      m.type === 'transfer' ? 'bg-blue-50 text-blue-600' :
                      'bg-zinc-100 text-zinc-600'
                    }`}>
                      {m.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-black">{m.quantity}</td>
                  <td className="px-6 py-4 text-zinc-400 font-bold">{m.previous_stock}</td>
                  <td className="px-6 py-4 font-black text-[#003366]">{m.current_stock}</td>
                  <td className="px-6 py-4 text-zinc-500 italic font-medium">{m.description || '---'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {stockMovements.length === 0 && (
            <div className="p-12 text-center text-zinc-400 text-sm font-medium">Nenhum movimento de stock registado.</div>
          )}
        </div>
      ) : activeTab === 'reports' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-zinc-200 p-8 space-y-6">
            <h3 className="text-lg font-bold text-[#003366] uppercase tracking-tight flex items-center gap-2">
              <FileText size={20} /> Valorização de Stock (POPM / PIPO)
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-zinc-50 border border-zinc-100">
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Método POPM (Preço Médio Ponderado)</div>
                <div className="text-xl font-black text-[#003366]">
                  {calculatePOPM().toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })}
                </div>
              </div>
              <div className="p-4 bg-zinc-50 border border-zinc-100">
                <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Método PIPO (First-In First-Out)</div>
                <div className="text-xl font-black text-[#003366]">
                  {calculatePIPO().toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })}
                </div>
                <p className="text-[9px] text-zinc-400 mt-2 italic">* Cálculo baseado no histórico de movimentos de entrada.</p>
              </div>
            </div>
            <button className="w-full bg-[#003366] text-white font-bold py-3 text-xs uppercase tracking-widest hover:bg-[#002244] transition-all">
              Gerar Relatório Detalhado
            </button>
          </div>

          <div className="bg-white border border-zinc-200 p-8 space-y-6">
            <h3 className="text-lg font-bold text-[#003366] uppercase tracking-tight flex items-center gap-2">
              <History size={20} /> Relatórios de Movimento
            </h3>
            <div className="space-y-3">
              <button className="w-full flex items-center justify-between p-4 bg-zinc-50 border border-zinc-100 hover:bg-zinc-100 transition-all group">
                <span className="text-xs font-bold text-zinc-600 uppercase tracking-wider">Entradas do Mês</span>
                <ChevronRight size={16} className="text-zinc-300 group-hover:text-[#003366]" />
              </button>
              <button className="w-full flex items-center justify-between p-4 bg-zinc-50 border border-zinc-100 hover:bg-zinc-100 transition-all group">
                <span className="text-xs font-bold text-zinc-600 uppercase tracking-wider">Saídas do Mês</span>
                <ChevronRight size={16} className="text-zinc-300 group-hover:text-[#003366]" />
              </button>
              <button className="w-full flex items-center justify-between p-4 bg-zinc-50 border border-zinc-100 hover:bg-zinc-100 transition-all group">
                <span className="text-xs font-bold text-zinc-600 uppercase tracking-wider">Stock Abaixo do Mínimo</span>
                <ChevronRight size={16} className="text-zinc-300 group-hover:text-[#003366]" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center text-zinc-400 text-sm font-medium bg-white border border-zinc-200">Módulo em desenvolvimento.</div>
      )}

      {/* Modals for Adjustments and Transfers */}
      {showStockReportModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl p-8 rounded-none shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-4">
              <div>
                <h3 className="text-xl font-bold text-[#003366] uppercase tracking-tight">Relatório de Stock: {selectedProduct.name}</h3>
                <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">Histórico completo de movimentos e variações de inventário.</p>
              </div>
              <button onClick={() => setShowStockReportModal(false)} className="text-zinc-400 hover:text-zinc-600"><X size={24} /></button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-zinc-50 border border-zinc-100">
                <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Stock Atual</div>
                <div className="text-xl font-black text-[#003366]">{selectedProduct.stock_quantity} {selectedProduct.unit}</div>
              </div>
              <div className="p-4 bg-zinc-50 border border-zinc-100">
                <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Total Entradas</div>
                <div className="text-xl font-black text-emerald-600">
                  {(stockMovements ?? []).filter(m => m.product_id === selectedProduct.id && (m.type === 'entry' || m.type === 'adjustment_plus')).reduce((sum, m) => sum + m.quantity, 0)}
                </div>
              </div>
              <div className="p-4 bg-zinc-50 border border-zinc-100">
                <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Total Saídas</div>
                <div className="text-xl font-black text-red-600">
                  {(stockMovements ?? []).filter(m => m.product_id === selectedProduct.id && (m.type === 'exit' || m.type === 'adjustment_minus')).reduce((sum, m) => sum + m.quantity, 0)}
                </div>
              </div>
              <div className="p-4 bg-zinc-50 border border-zinc-100">
                <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Valor em Stock</div>
                <div className="text-xl font-black text-[#003366]">
                  {formatCurrency(selectedProduct.stock_quantity * (selectedProduct.cost_price || 0))}
                </div>
              </div>
            </div>

            <div className="bg-white border border-zinc-200 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 text-[10px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-200">
                    <th className="px-6 py-4">Data</th>
                    <th className="px-6 py-4">Tipo</th>
                    <th className="px-6 py-4">Armazém</th>
                    <th className="px-6 py-4 text-center">Qtd</th>
                    <th className="px-6 py-4 text-center">Stock Ant.</th>
                    <th className="px-6 py-4 text-center">Stock Atual</th>
                    <th className="px-6 py-4">Descrição</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {stockMovements.filter(m => m.product_id === selectedProduct.id).map(m => (
                    <tr key={m.id} className="text-xs hover:bg-zinc-50 transition-colors">
                      <td className="px-6 py-4 text-zinc-500 font-medium">{new Date(m.created_at).toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-none ${
                          m.type === 'entry' || m.type === 'adjustment_plus' ? 'bg-emerald-50 text-emerald-600' :
                          m.type === 'exit' || m.type === 'adjustment_minus' ? 'bg-red-50 text-red-600' :
                          m.type === 'transfer' ? 'bg-blue-50 text-blue-600' :
                          'bg-zinc-100 text-zinc-600'
                        }`}>
                          {m.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-zinc-600 font-bold">
                        {warehouses.find(w => w.id === m.warehouse_id)?.name || 'Geral'}
                        {m.type === 'transfer' && ` → ${warehouses.find(w => w.id === m.to_warehouse_id)?.name || 'Geral'}`}
                      </td>
                      <td className="px-6 py-4 text-center font-black">{m.quantity}</td>
                      <td className="px-6 py-4 text-center text-zinc-400 font-bold">{m.previous_stock}</td>
                      <td className="px-6 py-4 text-center font-black text-[#003366]">{m.current_stock}</td>
                      <td className="px-6 py-4 text-zinc-500 italic font-medium">{m.description || '---'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-zinc-100">
              <button 
                onClick={() => window.print()}
                className="flex items-center gap-2 px-6 py-2 text-[#003366] font-bold text-xs uppercase tracking-widest hover:bg-zinc-100"
              >
                <Printer size={16} /> Imprimir Relatório
              </button>
              <button 
                onClick={() => setShowStockReportModal(false)}
                className="bg-[#003366] text-white px-8 py-2 font-bold text-xs uppercase tracking-widest hover:bg-[#002244] shadow-lg"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
      {showProductDetailModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl p-8 rounded-none shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-4">
              <h3 className="text-xl font-bold text-[#003366] uppercase tracking-tight">Detalhes do Produto</h3>
              <button onClick={() => setShowProductDetailModal(false)} className="text-zinc-400 hover:text-zinc-600"><X size={24} /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="aspect-square bg-zinc-100 border border-zinc-200 flex items-center justify-center overflow-hidden">
                  {selectedProduct.image ? (
                    <img src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <Package size={64} className="text-zinc-300" />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-zinc-50 border border-zinc-100">
                    <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Stock Atual</div>
                    <div className="text-lg font-black text-[#003366]">{selectedProduct.stock_quantity} {selectedProduct.unit}</div>
                  </div>
                  <div className="p-3 bg-zinc-50 border border-zinc-100">
                    <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Preço Venda</div>
                    <div className="text-lg font-black text-[#003366]">{selectedProduct.price.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })}</div>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-black text-[#003366] uppercase tracking-widest mb-2 border-b border-zinc-100 pb-1">Informação Geral</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400 font-bold uppercase">Nome:</span>
                      <span className="text-zinc-800 font-medium">{selectedProduct.name}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400 font-bold uppercase">Referência:</span>
                      <span className="text-zinc-800 font-mono">{selectedProduct.referente || '---'}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400 font-bold uppercase">Categoria:</span>
                      <span className="text-zinc-800 font-medium">{selectedProduct.category || '---'}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400 font-bold uppercase">Código de Barras:</span>
                      <span className="text-zinc-800 font-medium">{selectedProduct.barcode || '---'}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-zinc-400 font-bold uppercase">Armazém:</span>
                      <span className="text-zinc-800 font-medium">{warehouses.find(w => w.id === selectedProduct.warehouse_id)?.name || 'Geral'}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-black text-[#003366] uppercase tracking-widest mb-2 border-b border-zinc-100 pb-1">Histórico Recente</h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto pr-2">
                    {stockMovements.filter(m => m.product_id === selectedProduct.id).slice(0, 5).map(m => (
                      <div key={m.id} className="text-[10px] flex justify-between py-1 border-b border-zinc-50 last:border-0">
                        <span className="text-zinc-400">{new Date(m.created_at).toLocaleDateString()}</span>
                        <span className={`font-bold ${m.type === 'entry' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {m.type === 'entry' ? '+' : '-'}{m.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-6 border-t border-zinc-100">
              <button 
                onClick={() => setShowProductDetailModal(false)}
                className="bg-[#003366] text-white px-8 py-2 font-bold text-xs uppercase tracking-widest hover:bg-[#002244] shadow-lg"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
      {showTransferModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md p-8 rounded-none shadow-2xl space-y-6">
            <h3 className="text-xl font-bold text-[#003366] uppercase tracking-tight">Transferência de Stock: {selectedProduct.name}</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Armazém de Origem</label>
                <select id="trans-from" className="w-full border border-zinc-200 p-2.5 text-sm focus:outline-none focus:border-[#003366] bg-zinc-50 font-bold">
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Armazém de Destino</label>
                <select id="trans-to" className="w-full border border-zinc-200 p-2.5 text-sm focus:outline-none focus:border-[#003366] bg-zinc-50 font-bold">
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Quantidade</label>
                <input id="trans-qty" type="number" className="w-full border border-zinc-200 p-2.5 text-sm focus:outline-none focus:border-[#003366] bg-zinc-50 font-bold" placeholder="0" />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button onClick={() => setShowTransferModal(false)} className="px-6 py-2 text-zinc-500 font-bold text-xs uppercase tracking-widest">Cancelar</button>
              <button 
                onClick={() => {
                  const from = Number((document.getElementById('trans-from') as HTMLSelectElement).value);
                  const to = Number((document.getElementById('trans-to') as HTMLSelectElement).value);
                  const qty = Number((document.getElementById('trans-qty') as HTMLInputElement).value);
                  handleTransfer(selectedProduct.id, from, to, qty);
                }}
                className="bg-[#003366] text-white px-8 py-2 font-bold text-xs uppercase tracking-widest hover:bg-[#002244] shadow-lg"
              >
                Confirmar Transferência
              </button>
            </div>
          </div>
        </div>
      )}
      {showAdjustmentModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md p-8 rounded-none shadow-2xl space-y-6">
            <h3 className="text-xl font-bold text-[#003366] uppercase tracking-tight">Ajuste de Stock: {selectedProduct.name}</h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Tipo de Ajuste</label>
                <select id="adj-type" className="w-full border border-zinc-200 p-2.5 text-sm focus:outline-none focus:border-[#003366] bg-zinc-50 font-bold">
                  <option value="adjustment_plus">Entrada (Acerto Positivo)</option>
                  <option value="adjustment_minus">Saída (Acerto Negativo)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Quantidade</label>
                <input id="adj-qty" type="number" className="w-full border border-zinc-200 p-2.5 text-sm focus:outline-none focus:border-[#003366] bg-zinc-50 font-bold" placeholder="0" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Motivo / Descrição</label>
                <textarea id="adj-desc" className="w-full border border-zinc-200 p-2.5 text-sm focus:outline-none focus:border-[#003366] bg-zinc-50 font-medium" rows={3} placeholder="Ex: Quebra de stock, erro de inventário..."></textarea>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button onClick={() => setShowAdjustmentModal(false)} className="px-6 py-2 text-zinc-500 font-bold text-xs uppercase tracking-widest">Cancelar</button>
              <button 
                onClick={() => {
                  const type = (document.getElementById('adj-type') as HTMLSelectElement).value;
                  const qty = Number((document.getElementById('adj-qty') as HTMLInputElement).value);
                  const desc = (document.getElementById('adj-desc') as HTMLTextAreaElement).value;
                  handleAdjustment(selectedProduct.id, type, qty, desc);
                }}
                className="bg-[#003366] text-white px-8 py-2 font-bold text-xs uppercase tracking-widest hover:bg-[#002244] shadow-lg"
              >
                Confirmar Ajuste
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl p-10 rounded-none shadow-2xl my-8">
            <div className="flex justify-between items-center mb-8 border-b border-zinc-100 pb-4">
              <h3 className="text-2xl font-bold text-[#003366] uppercase tracking-tight flex items-center gap-3">
                <Package size={24} /> Registar Novo Produto
              </h3>
              <button onClick={() => setShowForm(false)} className="text-zinc-400 hover:text-zinc-600"><X size={24} /></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const data = Object.fromEntries(formData.entries());
              try {
                const res = await fetchWithAuth('/api/products', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    ...data,
                    price: Number(data.price),
                    cost_price: Number(data.cost_price),
                    stock_quantity: Number(data.stock_quantity),
                    min_stock: Number(data.min_stock),
                    warehouse_id: data.warehouse_id ? Number(data.warehouse_id) : null,
                    company_id: user?.company_id
                  })
                });
                if (res.ok) {
                  onRefresh();
                  setShowForm(false);
                } else {
                  const errorData = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
                  alert('Erro ao salvar produto: ' + (errorData.error || 'Verifique os dados e tente novamente.'));
                }
              } catch (error) {
                console.error('Erro de rede:', error);
                alert('Erro de rede ao salvar produto.');
              }
            }} className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Nome do Produto</label>
                <input name="name" required className="w-full bg-zinc-50 border border-zinc-200 p-3 text-sm focus:outline-none focus:border-[#003366] font-medium" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Referência / SKU</label>
                <input name="referente" className="w-full bg-zinc-50 border border-zinc-200 p-3 text-sm focus:outline-none focus:border-[#003366] font-medium" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Preço de Venda (Kz)</label>
                <input name="price" type="number" step="0.01" required className="w-full bg-zinc-50 border border-zinc-200 p-3 text-sm focus:outline-none focus:border-[#003366] font-bold" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Preço de Custo (Kz)</label>
                <input name="cost_price" type="number" step="0.01" className="w-full bg-zinc-50 border border-zinc-200 p-3 text-sm focus:outline-none focus:border-[#003366] font-bold" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Stock Inicial</label>
                <input name="stock_quantity" type="number" className="w-full bg-zinc-50 border border-zinc-200 p-3 text-sm focus:outline-none focus:border-[#003366] font-bold" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Stock Mínimo</label>
                <input name="min_stock" type="number" className="w-full bg-zinc-50 border border-zinc-200 p-3 text-sm focus:outline-none focus:border-[#003366] font-bold" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Categoria</label>
                <input name="category" className="w-full bg-zinc-50 border border-zinc-200 p-3 text-sm focus:outline-none focus:border-[#003366] font-medium" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Unidade</label>
                <input name="unit" className="w-full bg-zinc-50 border border-zinc-200 p-3 text-sm focus:outline-none focus:border-[#003366] font-medium" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Barcode</label>
                <input name="barcode" className="w-full bg-zinc-50 border border-zinc-200 p-3 text-sm focus:outline-none focus:border-[#003366] font-medium" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Data de Registo</label>
                <input name="data_registo" type="date" className="w-full bg-zinc-50 border border-zinc-200 p-3 text-sm focus:outline-none focus:border-[#003366] font-medium" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Unidade</label>
                <select name="unit" className="w-full bg-zinc-50 border border-zinc-200 p-3 text-sm focus:outline-none focus:border-[#003366] font-bold">
                  <option value="">Selecione a unidade</option>
                  <option value="un">Unidade (un)</option>
                  <option value="kg">Quilograma (kg)</option>
                  <option value="lt">Litro (lt)</option>
                  <option value="mt">Metro (mt)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Armazém</label>
                <select name="warehouse_id" className="w-full bg-zinc-50 border border-zinc-200 p-3 text-sm focus:outline-none focus:border-[#003366] font-bold">
                  <option value="">Selecione o armazém</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div className="md:col-span-3 flex justify-end pt-4">
                <button type="submit" className="bg-[#003366] text-white px-8 py-3 text-sm font-bold hover:bg-[#002244] transition-all">Registar Produto</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Main App ---

const ReceiptModal = ({ document: doc, caixas, onClose, onSuccess }: { 
  document: IssuedDocument, 
  caixas: Caixa[], 
  onClose: () => void, 
  onSuccess: () => void 
}) => {
  const { user } = useAuth();
  const remaining = (doc.contravalor || 0) - (doc.paid_amount || 0);
  const [amount, setAmount] = useState(remaining > 0 ? remaining : 0);
  const [paymentMethod, setPaymentMethod] = useState('Dinheiro');
  const [cashBox, setCashBox] = useState(caixas[0]?.name || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetchWithAuth('/api/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_id: doc.id,
          company_id: user?.company_id,
          amount,
          payment_method: paymentMethod,
          cash_box: cashBox,
          date
        })
      });
      if (res.ok) onSuccess();
    } catch (error) {
      console.error('Error creating receipt:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white w-full max-w-md p-8 rounded-none shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-[#003366] text-xl uppercase tracking-tight">Emitir Recibo</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600"><X size={20} /></button>
        </div>
        <div className="mb-6 p-4 bg-zinc-50 border border-zinc-100">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Documento</p>
          <p className="font-bold text-[#003366]">{doc.numero_documento}</p>
          <div className="flex justify-between items-end mt-2">
            <p className="text-xs text-zinc-500">{doc.client_name}</p>
            <div className="text-right">
              <p className="text-[9px] text-zinc-400 uppercase font-bold">Saldo em falta</p>
              <p className="text-sm font-black text-red-600 font-mono">{formatCurrency(remaining)}</p>
            </div>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Valor a Liquidar</label>
            <input 
              type="number" 
              step="0.01" 
              value={amount} 
              onChange={(e) => setAmount(Number(e.target.value))} 
              className="w-full bg-zinc-50 border border-zinc-200 p-3 text-sm focus:outline-none focus:border-[#003366] font-bold"
              required 
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Forma de Pagamento</label>
            <select 
              value={paymentMethod} 
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 p-3 text-sm focus:outline-none focus:border-[#003366] font-bold"
            >
              <option>Dinheiro</option>
              <option>Transferência</option>
              <option>Multicaixa</option>
              <option>Depósito</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Caixa / Banco</label>
            <select 
              value={cashBox} 
              onChange={(e) => setCashBox(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 p-3 text-sm focus:outline-none focus:border-[#003366] font-bold"
            >
              {caixas.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Data do Pagamento</label>
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              className="w-full bg-zinc-50 border border-zinc-200 p-3 text-sm focus:outline-none focus:border-[#003366] font-bold"
              required 
            />
          </div>
          <div className="flex justify-end gap-4 pt-6">
            <button type="button" onClick={onClose} className="px-6 py-2 text-xs font-bold text-zinc-500 uppercase tracking-widest">Cancelar</button>
            <button type="submit" className="bg-[#003366] text-white px-8 py-2 text-xs font-bold uppercase tracking-widest hover:bg-[#002244] shadow-lg">Confirmar Pagamento</button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const ConvertDocumentModal = ({ document, onClose, onSuccess }: { 
  document: IssuedDocument, 
  onClose: () => void, 
  onSuccess: () => void 
}) => {
  const { user } = useAuth();
  const [targetType, setTargetType] = useState('Fatura');

  const handleConvert = async () => {
    try {
      // In a real app, this would call a backend endpoint to create a new document based on this one
      // For now, we'll just simulate it by creating a new invoice with the same items
      const res = await fetchWithAuth('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...document,
          id: undefined,
          document_type: targetType,
          date: new Date().toISOString().split('T')[0],
          company_id: user?.company_id,
          items: document.items || [] // Assuming items are available
        })
      });
      if (res.ok) onSuccess();
    } catch (error) {
      console.error('Error converting document:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white w-full max-w-md p-8 rounded-none shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-[#003366] text-xl uppercase tracking-tight">Faturar / Converter</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600"><X size={20} /></button>
        </div>
        <div className="mb-6 p-4 bg-zinc-50 border border-zinc-100">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Documento Origem</p>
          <p className="font-bold text-[#003366]">{document.numero_documento}</p>
          <p className="text-xs text-zinc-500">{document.tipo_documento}</p>
        </div>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Converter para Tipo</label>
            <select 
              value={targetType} 
              onChange={(e) => setTargetType(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 p-3 text-sm focus:outline-none focus:border-[#003366] font-bold"
            >
              <option>Fatura</option>
              <option>Fatura Recibo</option>
              <option>Orçamento</option>
              <option>Fatura Proforma</option>
            </select>
          </div>
          <div className="flex justify-end gap-4 pt-6">
            <button type="button" onClick={onClose} className="px-6 py-2 text-xs font-bold text-zinc-500 uppercase tracking-widest">Cancelar</button>
            <button onClick={handleConvert} className="bg-[#003366] text-white px-8 py-2 text-xs font-bold uppercase tracking-widest hover:bg-[#002244] shadow-lg">Converter Documento</button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default function App() {
  const { user, logout } = useAuth();
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
  const [isPrintingDraft, setIsPrintingDraft] = useState(false);
  const [viewingInvoiceId, setViewingInvoiceId] = useState<number | null>(null);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<IssuedDocument | null>(null);
  const [fixedDocumentType, setFixedDocumentType] = useState<string | undefined>(undefined);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [showCertifyModal, setShowCertifyModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [selectedClientForAccount, setSelectedClientForAccount] = useState<Client | null>(null);
  const [appSelectedEmployee, setAppSelectedEmployee] = useState<Employee | null>(null);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [showAnularModal, setShowAnularModal] = useState<IssuedDocument | null>(null);
  const [caixas, setCaixas] = useState<Caixa[]>([]);
  const [caixaMovements, setCaixaMovements] = useState<CaixaMovement[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [securityOccurrences, setSecurityOccurrences] = useState<any[]>([]);
  const [securityArmory, setSecurityArmory] = useState<any[]>([]);
  const [securityRoster, setSecurityRoster] = useState<any[]>([]);
  const [companyData, setCompanyData] = useState<any>(null);
  
  // Task/Alert modal state
  const [alerts, setAlerts] = useState<any[]>(() => {
    const saved = localStorage.getItem('app_alerts');
    return saved ? JSON.parse(saved) : [];
  });
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskFormData, setTaskFormData] = useState({
    name: '', type: 'imposto', description: '', responsible: '', startDate: '', endDate: '', advanceTime: '', obs: ''
  });

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    const newAlerts = [...alerts, { ...taskFormData, id: Date.now().toString() }];
    setAlerts(newAlerts);
    localStorage.setItem('app_alerts', JSON.stringify(newAlerts));
    setIsTaskModalOpen(false);
    setTaskFormData({ name: '', type: 'imposto', description: '', responsible: '', startDate: '', endDate: '', advanceTime: '', obs: '' });
  };

  const fetchData = async () => {
    if (!user) return;
    try {
      console.log('Fetching data for company:', user.company_id);
      const companyId = user.company_id;
      const results = await Promise.allSettled([
        fetchJson(`/api/stats?company_id=${companyId}`),
        fetchJson(`/api/clients?company_id=${companyId}`),
        fetchJson(`/api/products?company_id=${companyId}`),
        fetchJson(`/api/transactions?company_id=${companyId}`),
        fetchJson(`/api/invoices?company_id=${companyId}`),
        fetchJson(`/api/issued-documents?company_id=${companyId}`),
        fetchJson(`/api/work-sites?company_id=${companyId}`),
        fetchJson(`/api/employees?company_id=${companyId}`),
        fetchJson(`/api/fiscal-series?company_id=${companyId}`),
        fetchJson(`/api/caixas?company_id=${companyId}`),
        fetchJson(`/api/caixa-movements?company_id=${companyId}`),
        fetchJson(`/api/stock/movements?company_id=${companyId}`),
        fetchJson(`/api/warehouses?company_id=${companyId}`),
        fetchJson(`/api/security/occurrences?company_id=${companyId}`),
        fetchJson(`/api/security/armory?company_id=${companyId}`),
        fetchJson(`/api/security/roster?company_id=${companyId}`),
        fetchJson(`/api/company/${companyId}`)
      ]);

      const [s, c, p, tr, i, d, w, e, fs, cx, cm, sm, wh, occ, arm, rost, comp] = results.map((res, idx) => {
        if (res.status === 'fulfilled') return res.value;
        console.error(`Fetch failed for index ${idx}:`, res.reason);
        return null;
      });
      
      console.log('Data fetched results:', { s, c, p, tr, i, d, w, e, fs, comp });
      
      if (s) setStats(s);
      setClients(Array.isArray(c) ? c : []);
      setProducts(Array.isArray(p) ? p : []);
      setTransactions(Array.isArray(tr) ? tr : []);
      setInvoices(Array.isArray(i) ? i : []);
      setIssuedDocuments(Array.isArray(d) ? d : []);
      setWorkSites(Array.isArray(w) ? w : []);
      setEmployees(Array.isArray(e) ? e : []);
      setFiscalSeries(Array.isArray(fs) ? fs : []);
      if (comp) {
        setCompanyData(comp);
        setCompanyName(comp.nome_empresa || comp.name || 'FaturaPronta Lda');
        setCompanyNif(comp.nif || '500123456');
        setCompanyAddress(comp.localizacao || comp.address || 'Sem localização');
        setCompanyLogo(comp.logo_url || comp.logo || '');
        setCompanyFooter(comp.footer_image_url || comp.footer || 'Processado por computador • FaturaPronta');
      }
      setCaixas(Array.isArray(cx) ? cx : []);
      setCaixaMovements(Array.isArray(cm) ? cm : []);
      setStockMovements(Array.isArray(sm) ? sm : []);
      setWarehouses(Array.isArray(wh) ? wh : []);
      setSecurityOccurrences(Array.isArray(occ) ? occ : []);
      setSecurityArmory(Array.isArray(arm) ? arm : []);
      setSecurityRoster(Array.isArray(rost) ? rost : []);
      
      console.log('Data state updated');
    } catch (error) {
      console.error('Critical error in fetchData:', error);
    }
  };

  const handleAddWorkSite = async (site: Omit<WorkSite, 'id'>) => {
    console.log('Adding work site:', site);
    try {
      const res = await fetchWithAuth('/api/work-sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...site, company_id: user?.company_id })
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
      const res = await fetchWithAuth(`/api/work-sites/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...site, company_id: user?.company_id })
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
      const res = await fetchWithAuth(`/api/invoices/${id}/certify`, { method: 'POST' });
      if (res.ok) {
        setShowCertifyModal(false);
        await fetchData();
        alert('Documento certificado com sucesso!');
      }
    } catch (error) {
      console.error('Error certifying document:', error);
    }
  };

  const handleDocumentAction = async (action: string, doc: IssuedDocument) => {
    if (action === 'edit') {
      setSelectedDocument(doc);
      setIsCreatingInvoice(true);
    } else if (action === 'print_a4' || action === 'print_p24' || action === 'print_p24xl' || action === 'print_p80') {
      try {
        const res = await fetchWithAuth(`/api/invoices/${doc.id}`);
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
    } else if (action === 'export_pdf') {
      try {
        const res = await fetchWithAuth(`/api/invoices/${doc.id}`);
        if (res.ok) {
          const invoiceData = await res.json();
          const pdf = new jsPDF();
          
          // Company Header
          pdf.setFontSize(20);
          pdf.setTextColor(0, 51, 102);
          pdf.text(companyName, 20, 20);
          
          pdf.setFontSize(10);
          pdf.setTextColor(100);
          pdf.text(`NIF: ${companyNif}`, 20, 30);
          pdf.text(companyAddress, 20, 35);
          
          // Document Info
          pdf.setFontSize(14);
          pdf.setTextColor(0);
          pdf.text(`${doc.document_type || doc.tipo_documento} ${doc.numero_documento || doc.invoice_number}`, 120, 20);
          
          pdf.setFontSize(10);
          pdf.text(`Data: ${new Date(doc.date || doc.data_emissao || '').toLocaleDateString()}`, 120, 30);
          pdf.text(`Vencimento: ${doc.due_date ? new Date(doc.due_date).toLocaleDateString() : 'N/A'}`, 120, 35);
          
          // Client Info
          pdf.setFontSize(12);
          pdf.text('Cliente:', 20, 55);
          pdf.setFontSize(10);
          pdf.text(doc.client_name || 'N/A', 20, 62);
          
          // Items Table
          const tableData = (invoiceData.items || []).map((item: any) => [
            item.description,
            item.quantity,
            formatCurrency(item.unit_price),
            formatCurrency(item.total)
          ]);
          
          autoTable(pdf, {
            startY: 75,
            head: [['Descrição', 'Qtd', 'Preço Unit.', 'Total']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [0, 51, 102] }
          });
          
          const finalY = (pdf as any).lastAutoTable.cursor.y + 10;
          pdf.setFontSize(12);
          pdf.text(`Total: ${formatCurrency(doc.counter_value || doc.total || 0)}`, 140, finalY);
          
          pdf.save(`${doc.numero_documento || 'documento'}.pdf`);
        }
      } catch (error) {
        console.error('Error exporting PDF:', error);
        alert('Erro ao gerar PDF.');
      }
    } else if (action === 'void') {
      setShowAnularModal(doc);
    } else if (action === 'draft') {
      try {
        const res = await fetchWithAuth(`/api/invoices/${doc.id}`);
        if (res.ok) {
          const invoiceData = await res.json();
          setPrintingInvoice(invoiceData);
          setIsPrintingDraft(true);
          setTimeout(() => { window.print(); }, 500);
        }
      } catch (error) {
        console.error('Error fetching draft:', error);
      }
    } else if (action === 'credit_note') {
      setSelectedDocument(doc);
      setFixedDocumentType('Nota de Crédito');
      setIsCreatingInvoice(true);
    } else if (action === 'delete') {
      if (confirm(`Tem a certeza que deseja eliminar o documento ${doc.numero_documento || doc.invoice_number}?`)) {
        try {
          const res = await fetchWithAuth(`/api/invoices/${doc.id}`, { method: 'DELETE' });
          if (res.ok) {
            await fetchData();
            alert('Documento eliminado com sucesso!');
          }
        } catch (error) {
          console.error('Error deleting document:', error);
        }
      }
    } else if (action === 'clone') {
      try {
        const res = await fetchWithAuth(`/api/invoices/${doc.id}/clone`, { method: 'POST' });
        if (res.ok) {
          const cloned = await res.json();
          await fetchData();
          alert(`Documento clonado com sucesso! Novo número: ${cloned.invoice_number}`);
        }
      } catch (error) {
        console.error('Error cloning document:', error);
      }
    } else if (action === 'send_email' || action === 'email') {
      const subject = encodeURIComponent(`${doc.document_type || doc.tipo_documento} ${doc.numero_documento || doc.invoice_number} - ${companyName}`);
      const body = encodeURIComponent(`Olá ${doc.client_name || 'Prezado Cliente'},\n\nSegue em anexo o documento solicitado.\n\nAtenciosamente,\n${companyName}`);
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
    } else if (action === 'share_whatsapp' || action === 'whatsapp') {
      const text = `Prezado Cliente, segue o link para visualizar o documento ${doc.numero_documento || doc.invoice_number}: [Link do Documento] No valor de ${formatCurrency(doc.total || doc.counter_value || 0)}. Obrigado!`;
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    } else if (action === 'receipt') {
      setSelectedDocument(doc);
      setShowReceiptModal(true);
    } else if (action === 'convert') {
      setSelectedDocument(doc);
      setShowConvertModal(true);
    } else {
      console.log(`Action ${action} for document ${doc.numero_documento}`);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#f4f7f9] text-zinc-800 font-sans selection:bg-[#003366]/10 flex overflow-x-hidden">
        {sidebarOpen && (
          <Sidebar 
            activeTab={activeTab} 
            setActiveTab={(t) => {
              setActiveTab(t);
              setViewingInvoiceId(null);
              setIsCreatingInvoice(false);
            }} 
          />
        )}
        
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          <TopHeader 
            fiscalYear={fiscalYear} 
            setFiscalYear={setFiscalYear} 
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            onAddTask={() => setIsTaskModalOpen(true)}
            alerts={alerts}
          />
          <main className="flex-1 overflow-y-auto w-full transition-all duration-300">
            <div className="p-6 md:p-8 max-w-[1600px] mx-auto">
              <div className="mb-6 flex items-center justify-between border-b border-zinc-200/60 pb-4">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-widest">
                  <LayoutDashboard size={14} />
                  <span>Sistema de Gestão</span>
                  <ChevronRight size={12} />
                  <span className="text-[#003366]">{activeTab}</span>
                </div>
                {/* Minimal Logout */}
                <button 
                  onClick={logout}
                  className="p-1.5 bg-white border border-zinc-200 text-red-500 hover:bg-red-50 transition-all rounded-md"
                  title="Sair do Sistema"
                >
                  <LogOut size={16} />
                </button>
              </div>
              <motion.div
                key={activeTab + viewingInvoiceId + sidebarOpen}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {isCreatingInvoice ? (
                  <CreateInvoice 
                    clients={clients} 
                    products={products} 
                    workSites={workSites}
                    fiscalSeries={fiscalSeries}
                    initialData={selectedDocument}
                    fixedDocumentType={fixedDocumentType}
                    onBack={() => {
                      setIsCreatingInvoice(false);
                      setSelectedDocument(null);
                      setFixedDocumentType(undefined);
                    }} 
                    onSuccess={() => {
                      setIsCreatingInvoice(false);
                      setSelectedDocument(null);
                      setFixedDocumentType(undefined);
                      fetchData();
                    }} 
                    caixas={caixas}
                  />
                ) : viewingInvoiceId ? (
                  <InvoiceDetail 
                    id={viewingInvoiceId} 
                    onBack={() => setViewingInvoiceId(null)}
                    onPrint={(doc) => setPrintingInvoice(doc as any)}
                    companyName={companyName}
                    companyNif={companyNif}
                    companyAddress={companyAddress}
                    companyLogo={companyLogo}
                    companyFooter={companyFooter}
                  />
                ) : (
                  <>
                    {showAnularModal && (
                      <AnularModal 
                        document={showAnularModal} 
                        onClose={() => setShowAnularModal(null)} 
                        onAnular={async (reason) => {
                          try {
                            const res = await fetchWithAuth(`/api/invoices/${showAnularModal.id}/void`, { 
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ reason })
                            });
                            if (res.ok) {
                              await fetchData();
                              alert('Documento anulado com sucesso!');
                              setShowAnularModal(null);
                            } else {
                              alert('Erro ao anular');
                            }
                          } catch (error) {
                            console.error('Error voiding document:', error);
                          }
                        }}
                      />
                    )}
                    {(() => {
                      switch (activeTab) {
                        case 'dashboard':
                          return <EcosystemDashboard stats={stats} issuedDocuments={issuedDocuments} setActiveTab={setActiveTab} />;
                        case 'pos':
                          return <POSModule products={products} onRefresh={fetchData} caixas={caixas} />;
                        case 'electronic_invoices':
                        case 'invoices':
                        case 'vendas':
                          return (
                            <InvoiceList 
                              invoices={invoices} 
                              issuedDocuments={issuedDocuments}
                              clients={clients} 
                              workSites={workSites}
                              employees={employees}
                              onNew={() => setIsCreatingInvoice(true)} 
                              onView={setViewingInvoiceId}
                              onRegisterClient={() => setIsClientModalOpen(true)}
                              onAddWorkSite={handleAddWorkSite}
                              onUpdateWorkSite={handleUpdateWorkSite}
                              onAction={handleDocumentAction}
                              onCertify={(doc) => {
                                setSelectedDocument(doc);
                                setShowCertifyModal(true);
                              }}
                              onViewDetail={(doc) => setViewingInvoiceId(doc.id)}
                              onViewBusinessOverview={() => setActiveTab('business_overview')}
                              setActiveTab={setActiveTab}
                              caixas={caixas}
                              mode={activeTab === 'electronic_invoices' ? 'electronic' : 'standard'}
                              fiscalSeries={fiscalSeries}
                              onRefresh={fetchData}
                            />
                          );
                        case 'tax-settings':
                          return <TaxSeriesModule />;
                        case 'issued-documents':
                          return (
                            <IssuedDocumentsList 
                              documents={issuedDocuments} 
                              onAction={handleDocumentAction}
                              onCertify={(doc) => {
                                setSelectedDocument(doc);
                                setShowCertifyModal(true);
                              }}
                              onViewDetail={(doc) => setViewingInvoiceId(doc.id)}
                            />
                          );
                        case 'client-account':
                          return selectedClientForAccount ? (
                            <ClientAccount 
                              client={selectedClientForAccount} 
                              documents={issuedDocuments
                                .filter(d => Number(d.cliente_id) === Number(selectedClientForAccount.id))
                                .map(d => ({
                                  ...d,
                                  tipo_documento: d.document_type || 'Fatura',
                                  data_emissao: d.date,
                                  numero_documento: d.invoice_number,
                                  contravalor: d.total
                                })) as any}
                              onBack={() => setActiveTab('clients')}
                            />
                          ) : (
                            <EcosystemDashboard stats={stats} issuedDocuments={issuedDocuments} setActiveTab={setActiveTab} />
                          );
                        case 'cashier':
                          return <CashierModule issuedDocuments={issuedDocuments} />;
                        case 'caixa':
                          return <CaixaModule caixas={caixas} setCaixas={setCaixas} movements={caixaMovements} setMovements={setCaixaMovements} />;
                        case 'security':
                          return (
                            <SecurityModule 
                              occurrences={securityOccurrences}
                              armory={securityArmory}
                              roster={securityRoster}
                              employees={employees}
                              workSites={workSites}
                              onRefresh={fetchData}
                            />
                          );
                        case 'fleet':
                          return <FleetManagementModule />;
                        case 'projects':
                          return <ProjectManagementModule />;
                        case 'business_overview':
                        case 'cost-revenue':
                          return (
                            <BusinessOverview 
                              invoices={issuedDocuments} 
                              products={products} 
                              clients={clients} 
                              transactions={transactions} 
                            />
                          );
                        case 'workplaces':
                          return <WorkplaceModule onRefresh={fetchData} clients={clients} />;
                        case 'clients':
                          return (
                            <ClientList 
                              clients={clients} 
                              issuedDocuments={issuedDocuments}
                              onRefresh={fetchData} 
                              onViewAccount={(client) => {
                                setSelectedClientForAccount(client);
                                setActiveTab('client-account');
                              }}
                            />
                          );
                        case 'suppliers':
                          return <SupplierModule products={products} workSites={workSites} fiscalSeries={fiscalSeries} caixas={caixas} />;
                        case 'products':
                          return (
                            <ProductList 
                              products={products} 
                              onRefresh={fetchData} 
                              stockMovements={stockMovements}
                              warehouses={warehouses}
                            />
                          );
                        case 'financial':
                          return (
                            <FinancialModule 
                              caixas={caixas} 
                              setCaixas={setCaixas} 
                              caixaMovements={caixaMovements} 
                              setCaixaMovements={setCaixaMovements} 
                              employees={employees}
                              user={user}
                            />
                          );
                        case 'hr':
                          return <HRModule onRefresh={fetchData} onSetIsContractModalOpen={setIsContractModalOpen} onSetEmployee={setAppSelectedEmployee} caixas={caixas} companyName={companyName} />;
                        case 'accounting':
                          return <AccountingModule invoices={invoices} clients={clients} fiscalSeries={fiscalSeries} onRefresh={fetchData} employees={employees} issuedDocuments={issuedDocuments} />;
                        case 'specialized':
                          return <SpecializedManagementModule activeTab={activeTab} setActiveTab={setActiveTab} />;
                        case 'archive':
                          return <ArchiveModule />;
                        case 'church':
                          return <ChurchModule />;
                        case 'agrobusiness':
                          return <AgrobusinessModule />;
                        case 'tax-series':
                          return <FiscalSeriesModule series={fiscalSeries} onRefresh={fetchData} users={employees} />;
                        case 'profit-loss-report':
                          return <ProfitLossReport fiscalYear={fiscalYear} company_id={user?.company_id} />;
                        case 'settings':
                          return (
                            <div className="space-y-6">
                              <SettingsModule 
                                companyData={companyData}
                                onRefreshData={fetchData}
                                alerts={alerts}
                                setAlerts={setAlerts}
                              />
                            </div>
                          );
                        case 'secretary':
                          return <SecretaryModule appSelectedEmployee={appSelectedEmployee} />;
                        default:
                          return <EcosystemDashboard stats={stats} issuedDocuments={issuedDocuments} setActiveTab={setActiveTab} />;
                      }
                    })()}
                  </>
                )}
              </motion.div>
            </div>
          </main>
        </div>
        
        <RightSidebar />
        
        {isClientModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-4xl bg-white shadow-2xl overflow-hidden"
            >
              <ClientForm 
                onBack={() => setIsClientModalOpen(false)} 
                onSuccess={() => {
                  setIsClientModalOpen(false);
                  fetchData();
                }} 
              />
            </motion.div>
          </div>
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
                onClick={() => {
                  setPrintingInvoice(null);
                  setIsPrintingDraft(false);
                }}
                className="bg-zinc-700 px-4 py-2 text-sm font-bold"
              >
                Fechar
              </button>
            </div>
          </div>
          <div className="p-8 print:p-0">
            <PrintA4 invoice={printingInvoice} isDraft={isPrintingDraft} />
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

      {showReceiptModal && selectedDocument && (
        <ReceiptModal 
          document={selectedDocument}
          caixas={caixas}
          onClose={() => setShowReceiptModal(false)}
          onSuccess={() => {
            setShowReceiptModal(false);
            fetchData();
          }}
        />
      )}

      {showConvertModal && selectedDocument && (
        <ConvertDocumentModal 
          document={selectedDocument}
          onClose={() => setShowConvertModal(false)}
          onSuccess={() => {
            setShowConvertModal(false);
            fetchData();
          }}
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
                  onSuccess={async () => {
                    setIsCreatingInvoice(false);
                    // Add a small delay to ensure backend has processed the transaction
                    await new Promise(resolve => setTimeout(resolve, 500));
                    await fetchData();
                    setActiveTab('invoices');
                  }}
                  caixas={caixas}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {isContractModalOpen && appSelectedEmployee && (
        <ContractModal 
          employee={appSelectedEmployee} 
          onClose={() => { setIsContractModalOpen(false); setAppSelectedEmployee(null); }}
        />
      )}

      {/* Tarefas / Alertas Modal */}
      <AnimatePresence>
        {isTaskModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-2xl rounded-none shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="px-6 py-4 border-b border-zinc-100 flex justify-between items-center bg-[#003366] text-white">
                <h3 className="font-bold text-lg flex items-center gap-2 uppercase tracking-wide">
                  <AlertCircle size={20} /> Registar Alerta / Tarefa
                </h3>
                <button onClick={() => setIsTaskModalOpen(false)} className="text-white/70 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              <div className="p-6 overflow-y-auto">
                <form onSubmit={handleSaveTask} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Nome</label>
                      <input required type="text" value={taskFormData.name} onChange={e => setTaskFormData({...taskFormData, name: e.target.value})} className="w-full border border-zinc-200 bg-zinc-50 rounded-none px-4 py-2 text-sm focus:outline-none focus:border-[#003366]" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Tipo de Tarefa</label>
                      <select required value={taskFormData.type} onChange={e => setTaskFormData({...taskFormData, type: e.target.value})} className="w-full border border-zinc-200 bg-zinc-50 rounded-none px-4 py-2 text-sm focus:outline-none focus:border-[#003366]">
                        <option value="imposto">Imposto</option>
                        <option value="tarefas_empresa">Tarefas Empresa</option>
                        <option value="outras_tarefas">Outras Tarefas</option>
                      </select>
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Descrição</label>
                      <input required type="text" value={taskFormData.description} onChange={e => setTaskFormData({...taskFormData, description: e.target.value})} className="w-full border border-zinc-200 bg-zinc-50 rounded-none px-4 py-2 text-sm focus:outline-none focus:border-[#003366]" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Responsável</label>
                      <input required type="text" value={taskFormData.responsible} onChange={e => setTaskFormData({...taskFormData, responsible: e.target.value})} className="w-full border border-zinc-200 bg-zinc-50 rounded-none px-4 py-2 text-sm focus:outline-none focus:border-[#003366]" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Antecedência Alerta (Dias)</label>
                      <input required type="number" min="0" value={taskFormData.advanceTime} onChange={e => setTaskFormData({...taskFormData, advanceTime: e.target.value})} className="w-full border border-zinc-200 bg-zinc-50 rounded-none px-4 py-2 text-sm focus:outline-none focus:border-[#003366]" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Data de Início</label>
                      <input required type="date" value={taskFormData.startDate} onChange={e => setTaskFormData({...taskFormData, startDate: e.target.value})} className="w-full border border-zinc-200 bg-zinc-50 rounded-none px-4 py-2 text-sm focus:outline-none focus:border-[#003366]" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Data de Fim</label>
                      <input required type="date" value={taskFormData.endDate} onChange={e => setTaskFormData({...taskFormData, endDate: e.target.value})} className="w-full border border-zinc-200 bg-zinc-50 rounded-none px-4 py-2 text-sm focus:outline-none focus:border-[#003366]" />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Observações</label>
                      <textarea value={taskFormData.obs} onChange={e => setTaskFormData({...taskFormData, obs: e.target.value})} className="w-full border border-zinc-200 bg-zinc-50 rounded-none px-4 py-2 text-sm focus:outline-none focus:border-[#003366] min-h-[60px]" />
                    </div>
                  </div>
                  <div className="pt-4 flex justify-end gap-3 border-t border-zinc-100 mt-6">
                    <button type="button" onClick={() => setIsTaskModalOpen(false)} className="px-6 py-2.5 text-zinc-500 font-bold uppercase tracking-widest text-xs hover:bg-zinc-100 transition-colors">Cancelar</button>
                    <button type="submit" className="bg-[#003366] text-white px-8 py-2.5 font-bold uppercase tracking-widest text-xs hover:bg-[#002244] shadow-lg flex items-center gap-2">
                      <CheckCircle size={16} /> Registar Alerta
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
    </ProtectedRoute>
  );
}
