import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard, Users, MessageSquare, Bot, Zap, UserCheck, Calendar,
  FileText, Package, FileSpreadsheet, Settings, Search, Plus, Filter,
  Phone, Mail, CheckCircle2, Clock, AlertCircle, TrendingUp, TrendingDown,
  DollarSign, ArrowUpRight, ChevronRight, X, Sparkles, Send, MessageCircle,
  HelpCircle, RefreshCw, Eye, Edit2, Trash2, ArrowLeft, Building2, User
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export interface LeadDeal {
  id: string;
  name: string;
  contact: string;
  company?: string;
  email?: string;
  value: number;
  stage: 'new' | 'contacted' | 'qualified' | 'proposal' | 'won';
  source?: string;
  avatar?: string;
  date?: string;
  notes?: string;
}

export interface ConversationItem {
  id: string;
  contactName: string;
  channel: 'whatsapp' | 'email' | 'sms';
  lastMessage: string;
  time: string;
  unreadCount?: number;
  status: 'active' | 'resolved' | 'pending';
}

export interface AiAssistantTask {
  id: string;
  title: string;
  query: string;
  response: string;
  status: 'replied' | 'pending';
  category: string;
  time: string;
}

interface CrmNegociosModuleProps {
  onBackToApp?: () => void;
  companyData?: any;
}

export const CrmNegociosModule: React.FC<CrmNegociosModuleProps> = ({
  onBackToApp,
  companyData
}) => {
  const { user } = useAuth();
  const currentEmpresaId = user?.empresa_id || (companyData as any)?.id || 'empresa_crm_negocios';
  const userName = user?.name || user?.username || 'John Anderson';

  const [activeNav, setActiveNav] = useState<string>('dashboard');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('May 20 - May 27, 2025');

  // Modais de Criação
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [newLeadForm, setNewLeadForm] = useState({
    name: '',
    email: '',
    contact: '',
    company: '',
    value: '',
    stage: 'new',
    notes: ''
  });

  // Leads e Deals do Pipeline
  const [deals, setDeals] = useState<LeadDeal[]>(() => {
    const saved = localStorage.getItem(`crm_deals_${currentEmpresaId}`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      { id: '1', name: 'Alex Morgan', contact: '+244 923 111 222', email: 'alex@nexora.com', company: 'Morgan Logística', value: 2500, stage: 'new', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100' },
      { id: '2', name: 'Sam Wilson', contact: '+244 912 333 444', email: 'sam@wilson.ao', company: 'Wilson Trading', value: 1200, stage: 'new', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100' },
      { id: '3', name: 'Taylor Smith', contact: '+244 945 555 666', email: 'taylor@smith.ao', company: 'Smith Consultores', value: 3400, stage: 'new', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100' },
      { id: '4', name: 'Jaime Clark', contact: '+244 931 777 888', email: 'jaime@clark.ao', company: 'Clark Distribuidora', value: 2800, stage: 'contacted', avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100' },
      { id: '5', name: 'Casey Brown', contact: '+244 922 888 999', email: 'casey@brown.ao', company: 'Brown Serviços', value: 1600, stage: 'contacted', avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100' },
      { id: '6', name: 'Jordan Lee', contact: '+244 918 000 111', email: 'jordan@lee.ao', company: 'Lee Automóveis', value: 2700, stage: 'contacted', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100' },
      { id: '7', name: 'Riley Green', contact: '+244 927 222 333', email: 'riley@green.ao', company: 'Green Telecom', value: 5200, stage: 'qualified', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' },
      { id: '8', name: 'Avery White', contact: '+244 934 444 555', email: 'avery@white.ao', company: 'White Tech', value: 3600, stage: 'qualified', avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=100' },
      { id: '9', name: 'Morgan Lee', contact: '+244 911 666 777', email: 'morgan@lee.ao', company: 'Morgan Engenharia', value: 4500, stage: 'proposal', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100' },
      { id: '10', name: 'Cameron Ford', contact: '+244 947 888 999', email: 'cameron@ford.ao', company: 'Ford Angola', value: 3900, stage: 'proposal', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100' },
      { id: '11', name: 'Jamie Scott', contact: '+244 923 999 000', email: 'scott@industria.ao', company: 'Scott Indústria', value: 6200, stage: 'won', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100' },
      { id: '12', name: 'Reese Cooper', contact: '+244 935 123 456', email: 'reese@cooper.ao', company: 'Cooper Farmacêutica', value: 5100, stage: 'won', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=100' }
    ];
  });

  // Salvar no localStorage e sincronizar se supabase estiver disponível
  useEffect(() => {
    localStorage.setItem(`crm_deals_${currentEmpresaId}`, JSON.stringify(deals));
  }, [deals, currentEmpresaId]);

  // Carregar contatos/clientes reais do banco de dados como leads adicionais
  useEffect(() => {
    const loadDbClients = async () => {
      try {
        if (!currentEmpresaId) return;
        const { data: dbClients } = await supabase
          .from('clientes')
          .select('id, nome, name, email, telefone, phone, nif')
          .eq('empresa_id', currentEmpresaId)
          .limit(10);

        if (dbClients && dbClients.length > 0) {
          const mapped: LeadDeal[] = dbClients.map((c: any, idx: number) => ({
            id: `db-${c.id}`,
            name: c.nome || c.name || 'Cliente Base',
            contact: c.telefone || c.phone || '+244 923 000 000',
            email: c.email || 'contato@cliente.ao',
            company: 'Cliente Cadastrado',
            value: 2000 + (idx * 500),
            stage: idx % 2 === 0 ? 'qualified' : 'won',
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.nome || c.id}`
          }));

          setDeals(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const fresh = mapped.filter(m => !existingIds.has(m.id));
            return [...prev, ...fresh];
          });
        }
      } catch (err) {
        console.warn('[CRM Negocios] Clientes DB sync fallback:', err);
      }
    };

    loadDbClients();
  }, [currentEmpresaId]);

  // Conversas Recentes
  const [conversations] = useState<ConversationItem[]>([
    { id: '1', contactName: 'Alex Morgan', channel: 'whatsapp', lastMessage: "Hi, I'm interested in your services.", time: '10:24 AM', unreadCount: 2, status: 'active' },
    { id: '2', contactName: 'Jamie Clark', channel: 'email', lastMessage: 'Can you share more details on pricing?', time: '09:15 AM', status: 'active' },
    { id: '3', contactName: 'Taylor Smith', channel: 'whatsapp', lastMessage: "What's the pricing for pro plan?", time: 'Yesterday', status: 'active' },
    { id: '4', contactName: 'Casey Brown', channel: 'email', lastMessage: 'Thanks! Please send the invoice.', time: 'May 26', status: 'resolved' },
    { id: '5', contactName: 'Jordan Lee', channel: 'whatsapp', lastMessage: "I'd like to schedule a demo.", time: 'May 26', status: 'active' }
  ]);

  // AI Reply Assistant
  const [aiTasks] = useState<AiAssistantTask[]>([
    { id: '1', title: 'Pricing Inquiry', query: 'What are your software tiers?', response: 'Thanks for your interest! Our pricing starts at...', status: 'replied', category: 'Pricing', time: '10m ago' },
    { id: '2', title: 'Service Details', query: 'Do you offer implementation?', response: 'Certainly! We provide full guided onboarding...', status: 'replied', category: 'Support', time: '45m ago' },
    { id: '3', title: 'Demo Request', query: 'Can I test live system?', response: 'Sure! You can book a demo here...', status: 'replied', category: 'Sales', time: '2h ago' },
    { id: '4', title: 'General Question', query: 'Are invoices AGT compliant?', response: 'Yes! All documents are 100% certified...', status: 'replied', category: 'Fiscal', time: '3h ago' },
    { id: '5', title: 'Support Request', query: 'Issue with receipt sync', response: "We're checking your request right now...", status: 'pending', category: 'Tech', time: '5h ago' }
  ]);

  // Faturas do Overview
  const [invoicesOverview] = useState([
    { id: 'INV-2025-001', client: 'Alex Morgan', value: 2500, status: 'Paid' },
    { id: 'INV-2025-002', client: 'Jamie Clark', value: 1800, status: 'Sent' },
    { id: 'INV-2025-003', client: 'Taylor Smith', value: 3400, status: 'Pending' },
    { id: 'INV-2025-004', client: 'Casey Brown', value: 2100, status: 'Paid' },
    { id: 'INV-2025-005', client: 'Jordan Lee', value: 1600, status: 'Sent' }
  ]);

  // Cálculos de KPIs
  const totalLeadsCount = deals.length * 195 + 10;
  const openDealsCount = deals.filter(d => d.stage !== 'won').length * 28 + 4;
  const totalRevenue = deals.reduce((sum, d) => sum + (d.stage === 'won' ? d.value * 9.5 : d.value * 0.4), 0);
  const totalPipelineValue = deals.reduce((sum, d) => sum + d.value, 0);

  // Adicionar Lead / Deal
  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadForm.name.trim()) {
      toast.error('Informe o nome do Lead');
      return;
    }

    const created: LeadDeal = {
      id: String(Date.now()),
      name: newLeadForm.name.trim(),
      email: newLeadForm.email.trim() || 'lead@empresa.ao',
      contact: newLeadForm.contact.trim() || '+244 923 000 000',
      company: newLeadForm.company.trim() || 'Negócio Geral',
      value: Number(newLeadForm.value) || 2000,
      stage: (newLeadForm.stage as any) || 'new',
      notes: newLeadForm.notes,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${newLeadForm.name}`
    };

    setDeals([created, ...deals]);
    toast.success('Novo Lead adicionado com sucesso!');
    setIsNewLeadModalOpen(false);
    setNewLeadForm({ name: '', email: '', contact: '', company: '', value: '', stage: 'new', notes: '' });
  };

  const getStageDeals = (stage: LeadDeal['stage']) => {
    return deals.filter(d => d.stage === stage);
  };

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-zinc-800 font-sans flex antialiased select-none">
      
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* SIDEBAR EXCLUSIVA NEXORA CRM (Fundo Escuro Dark Navy da Imagem)   */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <aside className="w-64 bg-[#081528] text-white flex flex-col justify-between shrink-0 min-h-screen border-r border-[#0f233d]">
        <div>
          {/* Logo Brand Header */}
          <div className="px-6 py-6 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                <Zap size={20} className="fill-white" />
              </div>
              <div>
                <span className="text-sm font-black tracking-wider block uppercase leading-none">NEXORA</span>
                <span className="text-[10px] text-zinc-400 font-bold tracking-widest block uppercase mt-0.5">CRM AUTOMATION</span>
              </div>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="p-4 space-y-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'leads', label: 'Leads', icon: UserCheck },
              { id: 'conversations', label: 'Conversations', icon: MessageSquare, badge: '5' },
              { id: 'ai', label: 'AI Assistant', icon: Bot },
              { id: 'automations', label: 'Automations', icon: Zap },
              { id: 'contacts', label: 'Contacts', icon: Users },
              { id: 'calendar', label: 'Calendar', icon: Calendar },
              { id: 'invoices', label: 'Invoices', icon: FileText },
              { id: 'products', label: 'Products', icon: Package },
              { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
              { id: 'settings', label: 'Settings', icon: Settings },
            ].map(item => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveNav(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#1b64f2] text-white shadow-md shadow-blue-500/20 font-bold'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={17} className={isActive ? 'text-white' : 'text-zinc-400'} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-[#1b64f2] text-white">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Cards: Upgrade & Plan Info */}
        <div className="p-4 space-y-3">
          {/* Upgrade Plan Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#10274c] to-[#0d1e38] border border-blue-500/20 space-y-2.5 shadow-xl">
            <span className="text-xs font-black text-white block uppercase tracking-wider">Upgrade Plan</span>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Unlock advanced features and automation limits.
            </p>
            <button
              onClick={() => toast.success('Módulo Pro ilimitado ativado!')}
              className="w-full py-2 bg-white text-[#081528] rounded-xl text-xs font-black uppercase tracking-wider hover:bg-zinc-100 transition-all cursor-pointer shadow-md"
            >
              Upgrade Now
            </button>
          </div>

          {/* Your Plan Card */}
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block">Your Plan</span>
                <span className="text-xs font-bold text-white">Pro Plan</span>
              </div>
              <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Active
              </span>
            </div>
            <div>
              <span className="text-[10px] text-zinc-400 block">Renews on May 28, 2025</span>
              <div className="w-full bg-white/10 h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div className="bg-[#1b64f2] h-full w-[78%] rounded-full"></div>
              </div>
              <span className="text-[9px] text-zinc-400 mt-1 block font-mono">78% Used</span>
            </div>
            <button
              onClick={() => toast('Detalhes da subscrição ativos.', { icon: 'ℹ️' })}
              className="text-[10px] text-blue-400 hover:text-blue-300 font-bold block pt-1 cursor-pointer"
            >
              View Plan Details
            </button>
          </div>

          {/* Botão para retornar ao ERP Master se solicitado */}
          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="w-full flex items-center justify-center gap-2 py-2 text-zinc-400 hover:text-white text-xs font-bold rounded-lg hover:bg-white/5 transition-all cursor-pointer"
            >
              <ArrowLeft size={14} /> Voltar ao IMATEC ERP
            </button>
          )}
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* ÁREA DE CONTEÚDO PRINCIPAL (DASHBOARD CLARO, MODERNO E RESPONSIVO) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">

        {/* Top Header Bar */}
        <header className="h-18 bg-white border-b border-zinc-200/80 px-8 flex items-center justify-between gap-4 sticky top-0 z-30 shadow-xs">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by name, email or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200/80 rounded-xl text-xs font-medium text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:border-[#1b64f2] focus:bg-white transition-all shadow-2xs"
            />
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsNewLeadModalOpen(true)}
              className="w-9 h-9 rounded-full bg-[#1b64f2] text-white flex items-center justify-center shadow-md shadow-blue-500/20 hover:bg-blue-600 transition-all cursor-pointer"
              title="Add New Lead or Deal"
            >
              <Plus size={18} />
            </button>

            <button
              onClick={() => toast.success('Nenhuma notificação pendente!')}
              className="w-9 h-9 rounded-full bg-zinc-100 text-zinc-600 flex items-center justify-center hover:bg-zinc-200 transition-all cursor-pointer relative"
              title="Notifications"
            >
              <MessageSquare size={16} />
              <span className="w-2 h-2 rounded-full bg-red-500 absolute top-1.5 right-1.5 ring-2 ring-white"></span>
            </button>

            {/* User Profile Capsule */}
            <div className="flex items-center gap-3 pl-2 border-l border-zinc-200">
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100"
                alt="Profile"
                className="w-9 h-9 rounded-full object-cover ring-2 ring-blue-500/30"
              />
              <div className="hidden sm:block text-left">
                <span className="text-xs font-bold text-zinc-900 block leading-tight">{userName}</span>
                <span className="text-[10px] text-zinc-400 font-medium block">Admin</span>
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Body Container */}
        <div className="p-8 space-y-6">

          {/* Welcome Banner & Date Range Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-zinc-900 tracking-tight flex items-center gap-2">
                Welcome back, {userName.split(' ')[0]}! <span className="inline-block animate-wave">👋</span>
              </h1>
              <p className="text-xs text-zinc-400 font-medium mt-0.5">
                Here's what's happening with your business today.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-700 shadow-2xs">
                <Calendar size={14} className="text-zinc-400" />
                <span>{dateFilter}</span>
              </div>

              <button
                onClick={() => toast('Filtro de período atualizado.', { icon: '🔍' })}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-zinc-200 rounded-xl text-xs font-bold text-zinc-700 shadow-2xs hover:bg-zinc-50 cursor-pointer transition-all"
              >
                <Filter size={13} className="text-zinc-400" />
                <span>Filter</span>
              </button>
            </div>
          </div>

          {/* 4 Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Total Leads */}
            <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Total Leads</span>
                <strong className="text-2xl font-black text-zinc-900 font-mono block mt-1">2,350</strong>
                <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 mt-2">
                  <ArrowUpRight size={13} />
                  <span>+18.6%</span>
                  <span className="text-zinc-400 font-normal">vs last 7 days</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Users size={22} />
              </div>
            </div>

            {/* Card 2: Open Deals */}
            <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Open Deals</span>
                <strong className="text-2xl font-black text-zinc-900 font-mono block mt-1">320</strong>
                <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 mt-2">
                  <ArrowUpRight size={13} />
                  <span>+12.4%</span>
                  <span className="text-zinc-400 font-normal">vs last 7 days</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Package size={22} />
              </div>
            </div>

            {/* Card 3: Revenue */}
            <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Revenue</span>
                <strong className="text-2xl font-black text-zinc-900 font-mono block mt-1">$58,420</strong>
                <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 mt-2">
                  <ArrowUpRight size={13} />
                  <span>+24.8%</span>
                  <span className="text-zinc-400 font-normal">vs last 7 days</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1b64f2] flex items-center justify-center">
                <DollarSign size={22} />
              </div>
            </div>

            {/* Card 4: Conversations */}
            <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Conversations</span>
                <strong className="text-2xl font-black text-zinc-900 font-mono block mt-1">1,234</strong>
                <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 mt-2">
                  <ArrowUpRight size={13} />
                  <span>+16.3%</span>
                  <span className="text-zinc-400 font-normal">vs last 7 days</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <MessageSquare size={22} />
              </div>
            </div>

          </div>

          {/* Middle Row: Lead Pipeline (Left) & Automation Overview (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* 1. Lead Pipeline Card (2 Columns Span) */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-zinc-900 uppercase tracking-wider">Lead Pipeline</h3>
                </div>
                <button
                  onClick={() => setIsNewLeadModalOpen(true)}
                  className="text-xs font-bold text-[#1b64f2] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={13} /> Add Deal
                </button>
              </div>

              {/* 5 Stages Chevron Grid */}
              <div className="grid grid-cols-5 gap-2 text-center text-xs">
                {[
                  { id: 'new', label: 'New Lead', count: '350 Leads', color: 'bg-blue-50/80 text-blue-700' },
                  { id: 'contacted', label: 'Contacted', count: '280 Leads', color: 'bg-cyan-50/80 text-cyan-700' },
                  { id: 'qualified', label: 'Qualified', count: '180 Leads', color: 'bg-indigo-50/80 text-indigo-700' },
                  { id: 'proposal', label: 'Proposal', count: '120 Leads', color: 'bg-purple-50/80 text-purple-700' },
                  { id: 'won', label: 'Won', count: '85 Leads', color: 'bg-emerald-50/80 text-emerald-700' },
                ].map(col => (
                  <div key={col.id} className="space-y-3">
                    <div className={`p-2 rounded-xl ${col.color} border border-black/5`}>
                      <span className="font-bold block text-[11px] leading-tight">{col.label}</span>
                      <span className="text-[9px] opacity-75 font-mono block mt-0.5">{col.count}</span>
                    </div>

                    {/* Cards Inside Stage */}
                    <div className="space-y-2">
                      {getStageDeals(col.id as any).slice(0, 3).map(d => (
                        <div
                          key={d.id}
                          className="bg-zinc-50 hover:bg-zinc-100/80 p-2.5 rounded-xl border border-zinc-200/70 text-left transition-all cursor-pointer group"
                        >
                          <div className="flex items-center gap-2">
                            <img
                              src={d.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                              alt={d.name}
                              className="w-6 h-6 rounded-full object-cover shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <span className="text-[11px] font-bold text-zinc-900 block truncate leading-tight group-hover:text-[#1b64f2]">
                                {d.name}
                              </span>
                              <span className="text-[10px] text-zinc-500 font-mono block">
                                ${d.value.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <span className="text-[10px] text-zinc-400 font-bold block pt-1">
                      +{getStageDeals(col.id as any).length * 15} More
                    </span>
                  </div>
                ))}
              </div>

              {/* Total Pipeline Footer */}
              <div className="pt-4 border-t border-zinc-100 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-zinc-400 font-bold uppercase tracking-wider block">Total Pipeline Value:</span>
                  <strong className="text-base font-black text-zinc-900 font-mono">
                    ${totalPipelineValue.toLocaleString()}
                  </strong>
                </div>

                <button
                  onClick={() => toast('Exibindo todos os 1,015 negócios cadastrados.', { icon: '💼' })}
                  className="px-3.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  View All Deals
                </button>
              </div>
            </div>

            {/* 2. Automation Overview Card (Right) */}
            <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <h3 className="text-sm font-black text-zinc-900 uppercase tracking-wider">Automation Overview</h3>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>

              <div className="space-y-3">
                {[
                  { name: 'WhatsApp Automation', detail: '1,880 Sent', icon: MessageCircle, color: 'text-emerald-600 bg-emerald-50' },
                  { name: 'Email Automation', detail: '980 Sent', icon: Mail, color: 'text-blue-600 bg-blue-50' },
                  { name: 'AI Reply Assistant', detail: '452 Conversations', icon: Bot, color: 'text-purple-600 bg-purple-50' },
                  { name: 'Invoice Automation', detail: '220 Invoices', icon: FileText, color: 'text-amber-600 bg-amber-50' },
                ].map((auto, i) => {
                  const Icon = auto.icon;
                  return (
                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-200/60">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl ${auto.color} flex items-center justify-center`}>
                          <Icon size={18} />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-zinc-900 block leading-tight">{auto.name}</span>
                          <span className="text-[10px] text-zinc-400 font-mono block mt-0.5">{auto.detail}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Active
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Lower Row: Recent Conversations | AI Reply Assistant | Invoices Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Column 1: Recent Conversations */}
            <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <h3 className="text-xs font-black text-zinc-900 uppercase tracking-wider">Recent Conversations</h3>
                <button
                  onClick={() => toast('Carregando histórico do WhatsApp e Email...', { icon: '💬' })}
                  className="text-xs font-bold text-[#1b64f2] hover:underline cursor-pointer"
                >
                  View All
                </button>
              </div>

              <div className="space-y-3">
                {conversations.map(conv => (
                  <div
                    key={conv.id}
                    onClick={() => toast(`Abrindo conversa de ${conv.contactName}`, { icon: '📱' })}
                    className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-zinc-50 transition-colors cursor-pointer border border-transparent hover:border-zinc-200/60"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                      {conv.channel === 'whatsapp' ? <MessageCircle size={16} /> : <Mail size={16} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-900 truncate">{conv.contactName}</span>
                        <span className="text-[10px] text-zinc-400 font-mono">{conv.time}</span>
                      </div>
                      <p className="text-[11px] text-zinc-500 truncate mt-0.5">{conv.lastMessage}</p>
                    </div>
                    {conv.unreadCount && (
                      <span className="w-4 h-4 rounded-full bg-[#1b64f2] text-white text-[9px] font-black flex items-center justify-center shrink-0 mt-1">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Column 2: AI Reply Assistant */}
            <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <h3 className="text-xs font-black text-zinc-900 uppercase tracking-wider">AI Reply Assistant</h3>
                <button
                  onClick={() => toast('IA configurada com respostas automáticas ativas.', { icon: '🤖' })}
                  className="text-xs font-bold text-[#1b64f2] hover:underline cursor-pointer"
                >
                  View All
                </button>
              </div>

              <div className="space-y-3">
                {aiTasks.map(task => (
                  <div key={task.id} className="flex items-start gap-3 p-2.5 rounded-xl bg-zinc-50/70 border border-zinc-200/60">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-white font-bold text-[10px] ${
                      task.status === 'replied' ? 'bg-purple-600' : 'bg-amber-500'
                    }`}>
                      AI
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-zinc-900 truncate">{task.title}</span>
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                          task.status === 'replied' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {task.status === 'replied' ? 'AI Replied' : 'Pending'}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 truncate mt-0.5">{task.response}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 3: Invoices Overview */}
            <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <h3 className="text-xs font-black text-zinc-900 uppercase tracking-wider">Invoices Overview</h3>
                <button
                  onClick={() => toast('Redirecionando para faturamento...', { icon: '📄' })}
                  className="text-xs font-bold text-[#1b64f2] hover:underline cursor-pointer"
                >
                  View All
                </button>
              </div>

              <div className="space-y-3">
                {invoicesOverview.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50/70 border border-zinc-200/60 text-xs">
                    <div>
                      <span className="font-mono font-bold text-zinc-900 block">{inv.id}</span>
                      <span className="text-[11px] text-zinc-500 block">{inv.client}</span>
                    </div>

                    <div className="text-right">
                      <span className="font-mono font-bold text-zinc-900 block">${inv.value.toLocaleString()}</span>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                        inv.status === 'Paid'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : inv.status === 'Sent'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {inv.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Bottom Workflow Automation Timeline */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="text-sm font-black text-zinc-900 uppercase tracking-wider">Workflow Automation</h3>
              <span className="text-xs font-bold text-[#1b64f2] hover:underline cursor-pointer">Edit Workflow</span>
            </div>

            {/* Stepper Interactive Timeline */}
            <div className="flex items-center justify-between gap-2 overflow-x-auto py-2">
              {[
                { title: 'New Lead Captured', subtitle: 'Trigger', icon: UserCheck, color: 'text-emerald-600 bg-emerald-50' },
                { title: 'Send WhatsApp', subtitle: 'Welcome Message', icon: MessageCircle, color: 'text-emerald-600 bg-emerald-50' },
                { title: 'Wait', subtitle: '1 Hour', icon: Clock, color: 'text-blue-600 bg-blue-50' },
                { title: 'AI Reply', subtitle: 'Smart Response', icon: Bot, color: 'text-purple-600 bg-purple-50' },
                { title: 'Send Email', subtitle: 'Follow Up', icon: Mail, color: 'text-blue-600 bg-blue-50' },
                { title: 'Update CRM', subtitle: 'Add to Pipeline', icon: Zap, color: 'text-amber-600 bg-amber-50' },
              ].map((step, idx, arr) => {
                const Icon = step.icon;
                return (
                  <React.Fragment key={idx}>
                    <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-50 border border-zinc-200/80 min-w-[170px] shrink-0">
                      <div className={`w-9 h-9 rounded-xl ${step.color} flex items-center justify-center shrink-0`}>
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-zinc-900 block truncate leading-tight">{step.title}</span>
                        <span className="text-[10px] text-zinc-400 font-medium block mt-0.5">{step.subtitle}</span>
                      </div>
                    </div>
                    {idx < arr.length - 1 && (
                      <div className="text-zinc-300 shrink-0">
                        <ChevronRight size={18} />
                      </div>
                    )}
                  </React.Fragment>
                );
              })}

              <button
                onClick={() => toast.success('Novo bloco de automação adicionado!')}
                className="w-10 h-10 rounded-2xl border-2 border-dashed border-zinc-300 text-zinc-400 hover:text-[#1b64f2] hover:border-[#1b64f2] flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                title="Add step"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

        </div>

      </main>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODAL PARA ADICIONAR NOVO LEAD OU NEGÓCIO                          */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {isNewLeadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-[#081528] to-[#10274c] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <UserCheck size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider">Novo Lead / Negócio</h3>
                  <span className="text-[10px] text-zinc-400 font-normal">Cadastre na esteira de CRM Negócios</span>
                </div>
              </div>
              <button
                onClick={() => setIsNewLeadModalOpen(false)}
                className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="p-6 space-y-4 text-xs font-sans">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: João Silva"
                    value={newLeadForm.name}
                    onChange={e => setNewLeadForm({ ...newLeadForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-[#1b64f2] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                    Empresa / Negócio
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Silva Comércio Lda"
                    value={newLeadForm.company}
                    onChange={e => setNewLeadForm({ ...newLeadForm, company: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-[#1b64f2] focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="+244 923 000 000"
                    value={newLeadForm.contact}
                    onChange={e => setNewLeadForm({ ...newLeadForm, contact: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-[#1b64f2] focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="contato@cliente.ao"
                    value={newLeadForm.email}
                    onChange={e => setNewLeadForm({ ...newLeadForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-[#1b64f2] focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                    Valor Estimado ($ ou Kz)
                  </label>
                  <input
                    type="number"
                    placeholder="Ex: 3500"
                    value={newLeadForm.value}
                    onChange={e => setNewLeadForm({ ...newLeadForm, value: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-[#1b64f2] focus:bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                    Etapa Inicial
                  </label>
                  <select
                    value={newLeadForm.stage}
                    onChange={e => setNewLeadForm({ ...newLeadForm, stage: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-[#1b64f2] focus:bg-white font-bold cursor-pointer"
                  >
                    <option value="new">New Lead</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="proposal">Proposal</option>
                    <option value="won">Won (Fechado)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                  Notas / Observações
                </label>
                <textarea
                  rows={2}
                  placeholder="Informações adicionais do cliente ou negócio..."
                  value={newLeadForm.notes}
                  onChange={e => setNewLeadForm({ ...newLeadForm, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-[#1b64f2] focus:bg-white"
                ></textarea>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsNewLeadModalOpen(false)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1b64f2] hover:bg-blue-600 text-white font-black uppercase tracking-wider rounded-xl shadow-md cursor-pointer"
                >
                  Salvar Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
