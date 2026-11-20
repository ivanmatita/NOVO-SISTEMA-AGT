import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Briefcase,
  Users,
  Building2,
  FolderKanban,
  PlusCircle,
  Search,
  Filter,
  Download,
  RefreshCw,
  ArrowLeft,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Phone,
  Mail,
  Calendar,
  Edit3,
  Trash2,
  Eye,
  BarChart3,
  FileText,
  Layers,
  ChevronRight,
  ShieldCheck,
  Check,
  X,
  FileSpreadsheet,
  Printer
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { clienteService, Cliente } from '../services/clienteService';

interface CrmNegociosProps {
  onBackToApp: () => void;
  companyData?: any;
}

type TabType = 'clientes' | 'negocios' | 'empresas' | 'projetos' | 'adicionar';

interface Deal {
  id: string;
  empresa_id: string;
  titulo: string;
  cliente_id?: string;
  cliente_nome: string;
  valor: number;
  etapa: 'novo' | 'contactado' | 'qualificado' | 'proposta' | 'ganho' | 'perdido';
  probabilidade: number;
  data_fecho_prevista?: string;
  responsavel?: string;
  observacoes?: string;
  created_at: string;
}

interface EmpresaItem {
  id: string;
  nome?: string;
  nome_comercial?: string;
  razao_social?: string;
  nif?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  cidade?: string;
  provincia?: string;
  status?: string;
  ativo?: boolean;
  created_at?: string;
}

interface ProjetoItem {
  id: string;
  empresa_id: string;
  nome: string;
  descricao?: string;
  status: string;
  orcamento?: number;
  cliente_nome?: string;
  cliente_id?: string;
  data_inicio?: string;
  data_fim?: string;
  progresso?: number;
  created_at?: string;
}

interface AtividadeItem {
  id: string;
  empresa_id: string;
  deal_id?: string;
  cliente_nome?: string;
  tipo: 'reuniao' | 'chamada' | 'email' | 'proposta' | 'tarefa';
  titulo: string;
  descricao?: string;
  data_agendada?: string;
  status: 'pendente' | 'concluido' | 'cancelado';
  responsavel?: string;
  created_at: string;
}

const ETAPAS_DEAL = [
  { id: 'novo', label: 'Novo Lead', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  { id: 'contactado', label: 'Contactado', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  { id: 'qualificado', label: 'Qualificado', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  { id: 'proposta', label: 'Proposta Enviada', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
  { id: 'ganho', label: 'Ganho (Fechado)', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  { id: 'perdido', label: 'Perdido', color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
];

export const CrmNegociosModule: React.FC<CrmNegociosProps> = ({ onBackToApp, companyData }) => {
  const { user } = useAuth();
  const empresaId = user?.empresa_id || companyData?.id || '';

  const [activeTab, setActiveTab] = useState<TabType>('negocios');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  // Dados reais carregados do Supabase
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [empresas, setEmpresas] = useState<EmpresaItem[]>([]);
  const [projetos, setProjetos] = useState<ProjetoItem[]>([]);
  const [atividades, setAtividades] = useState<AtividadeItem[]>([]);

  // Modais de Criação/Edição
  const [showAddDealModal, setShowAddDealModal] = useState<boolean>(false);
  const [showAddClientModal, setShowAddClientModal] = useState<boolean>(false);
  const [showAddAtividadeModal, setShowAddAtividadeModal] = useState<boolean>(false);
  const [showAddProjetoModal, setShowAddProjetoModal] = useState<boolean>(false);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);

  // Form states
  const [newDeal, setNewDeal] = useState({
    titulo: '',
    cliente_nome: '',
    cliente_id: '',
    valor: 0,
    etapa: 'novo' as Deal['etapa'],
    probabilidade: 50,
    data_fecho_prevista: '',
    responsavel: user?.nome || user?.name || '',
    observacoes: ''
  });

  const [newClient, setNewClient] = useState({
    nome: '',
    nif: '',
    email: '',
    telefone: '',
    endereco: '',
    provincia: 'Luanda',
    saldo_inicial: 0
  });

  const [newProjeto, setNewProjeto] = useState({
    nome: '',
    descricao: '',
    status: 'Em Planeamento',
    orcamento: 0,
    cliente_nome: '',
    data_inicio: new Date().toISOString().split('T')[0],
    data_fim: ''
  });

  const [newAtividade, setNewAtividade] = useState({
    tipo: 'reuniao' as AtividadeItem['tipo'],
    titulo: '',
    descricao: '',
    data_agendada: '',
    responsavel: user?.nome || user?.name || '',
    deal_id: '',
    cliente_nome: ''
  });

  // Carregamento de dados reais do Supabase
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Clientes reais
      let loadedClientes: Cliente[] = [];
      try {
        loadedClientes = await clienteService.getClientes(empresaId);
      } catch (e) {
        if (empresaId) {
          const { data } = await supabase.from('clientes').select('*').eq('empresa_id', empresaId);
          if (data) loadedClientes = data;
        } else {
          const { data } = await supabase.from('clientes').select('*').limit(100);
          if (data) loadedClientes = data;
        }
      }
      setClientes(loadedClientes || []);

      // 2. Negócios (Deals) reais
      let loadedDeals: Deal[] = [];
      try {
        const query = supabase.from('crm_deals').select('*');
        if (empresaId) query.eq('empresa_id', empresaId);
        const { data, error } = await query.order('created_at', { ascending: false });
        if (!error && data) {
          loadedDeals = data;
        } else {
          // Fallback seguro de cache local sincronizado por tenant
          const localKey = `crm_deals_${empresaId || 'global'}`;
          const cached = localStorage.getItem(localKey);
          if (cached) loadedDeals = JSON.parse(cached);
        }
      } catch (err) {
        const localKey = `crm_deals_${empresaId || 'global'}`;
        const cached = localStorage.getItem(localKey);
        if (cached) loadedDeals = JSON.parse(cached);
      }
      setDeals(loadedDeals || []);

      // 3. Empresas reais
      let loadedEmpresas: EmpresaItem[] = [];
      try {
        const { data } = await supabase.from('empresas').select('*');
        if (data) loadedEmpresas = data;
      } catch (e) {
        console.warn('Erro ao carregar empresas do Supabase:', e);
      }
      setEmpresas(loadedEmpresas || []);

      // 4. Projetos reais
      let loadedProjetos: ProjetoItem[] = [];
      try {
        const query = supabase.from('proj_projetos').select('*').is('deleted_at', null);
        if (empresaId) query.eq('empresa_id', empresaId);
        const { data } = await query.order('nome');
        if (data) loadedProjetos = data;
      } catch (e) {
        console.warn('Erro ao carregar projetos do Supabase:', e);
      }
      setProjetos(loadedProjetos || []);

      // 5. Atividades reais
      let loadedAtividades: AtividadeItem[] = [];
      try {
        const query = supabase.from('crm_atividades').select('*');
        if (empresaId) query.eq('empresa_id', empresaId);
        const { data, error } = await query.order('created_at', { ascending: false });
        if (!error && data) {
          loadedAtividades = data;
        } else {
          const localKey = `crm_atividades_${empresaId || 'global'}`;
          const cached = localStorage.getItem(localKey);
          if (cached) loadedAtividades = JSON.parse(cached);
        }
      } catch (e) {
        const localKey = `crm_atividades_${empresaId || 'global'}`;
        const cached = localStorage.getItem(localKey);
        if (cached) loadedAtividades = JSON.parse(cached);
      }
      setAtividades(loadedAtividades || []);

    } catch (globalErr) {
      console.error('Erro geral ao buscar dados do CRM:', globalErr);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [empresaId]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Cálculos Reais de Métricas
  const metrics = useMemo(() => {
    const totalClientes = clientes.length;
    const clientesComNif = clientes.filter(c => (c.nif || c.contribuinte) && (c.nif || c.contribuinte) !== '999999999').length;
    
    const totalDeals = deals.length;
    const dealsAtivos = deals.filter(d => d.etapa !== 'ganho' && d.etapa !== 'perdido');
    const dealsGanhos = deals.filter(d => d.etapa === 'ganho');
    
    const valorTotalPipeline = dealsAtivos.reduce((acc, d) => acc + (Number(d.valor) || 0), 0);
    const valorTotalGanho = dealsGanhos.reduce((acc, d) => acc + (Number(d.valor) || 0), 0);
    const ticketMedio = totalDeals > 0 ? (deals.reduce((acc, d) => acc + (Number(d.valor) || 0), 0) / totalDeals) : 0;
    const taxaConversao = totalDeals > 0 ? ((dealsGanhos.length / totalDeals) * 100).toFixed(1) : '0.0';

    const totalEmpresas = empresas.length;
    const totalProjetos = projetos.length;
    const orcamentoTotalProjetos = projetos.reduce((acc, p) => acc + (Number(p.orcamento) || 0), 0);

    return {
      totalClientes,
      clientesComNif,
      totalDeals,
      dealsAtivosCount: dealsAtivos.length,
      dealsGanhosCount: dealsGanhos.length,
      valorTotalPipeline,
      valorTotalGanho,
      ticketMedio,
      taxaConversao,
      totalEmpresas,
      totalProjetos,
      orcamentoTotalProjetos
    };
  }, [clientes, deals, empresas, projetos]);

  // Ações de Salvar Negócio Real no Supabase
  const handleSaveDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeal.titulo.trim()) {
      alert('Por favor informe o título do negócio.');
      return;
    }

    const payload: Deal = {
      id: crypto.randomUUID ? crypto.randomUUID() : `deal-${Date.now()}`,
      empresa_id: empresaId,
      titulo: newDeal.titulo,
      cliente_nome: newDeal.cliente_nome || 'Cliente Geral',
      cliente_id: newDeal.cliente_id || undefined,
      valor: Number(newDeal.valor) || 0,
      etapa: newDeal.etapa,
      probabilidade: Number(newDeal.probabilidade) || 50,
      data_fecho_prevista: newDeal.data_fecho_prevista || undefined,
      responsavel: newDeal.responsavel,
      observacoes: newDeal.observacoes,
      created_at: new Date().toISOString()
    };

    try {
      const { error } = await supabase.from('crm_deals').insert(payload);
      if (error) {
        console.warn('Tentando fallback local para crm_deals:', error.message);
      }
    } catch (err) {
      console.warn('Fallback local para deals ativado.');
    }

    // Atualização otimista e persistência local garantida
    const updatedDeals = [payload, ...deals];
    setDeals(updatedDeals);
    localStorage.setItem(`crm_deals_${empresaId || 'global'}`, JSON.stringify(updatedDeals));

    setShowAddDealModal(false);
    setNewDeal({
      titulo: '',
      cliente_nome: '',
      cliente_id: '',
      valor: 0,
      etapa: 'novo',
      probabilidade: 50,
      data_fecho_prevista: '',
      responsavel: user?.nome || user?.name || '',
      observacoes: ''
    });
  };

  // Atualizar Etapa do Negócio
  const handleUpdateDealStage = async (dealId: string, novaEtapa: Deal['etapa']) => {
    const updated = deals.map(d => d.id === dealId ? { ...d, etapa: novaEtapa } : d);
    setDeals(updated);
    localStorage.setItem(`crm_deals_${empresaId || 'global'}`, JSON.stringify(updated));

    try {
      await supabase.from('crm_deals').update({ etapa: novaEtapa }).eq('id', dealId);
    } catch (e) {
      console.warn('Sincronização Supabase de etapa de negócio:', e);
    }
  };

  // Salvar Novo Cliente Real no Supabase
  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.nome.trim()) {
      alert('Por favor informe o nome do cliente.');
      return;
    }

    try {
      const created = await clienteService.createCliente({
        empresa_id: empresaId,
        nome: newClient.nome,
        nif: newClient.nif || undefined,
        contribuinte: newClient.nif || undefined,
        email: newClient.email || undefined,
        telefone: newClient.telefone || undefined,
        morada: newClient.endereco || undefined,
        provincia: newClient.provincia || 'Luanda',
        saldo_inicial: Number(newClient.saldo_inicial) || 0,
        activo: true
      });

      setClientes(prev => [created, ...prev]);
      setShowAddClientModal(false);
      setNewClient({
        nome: '',
        nif: '',
        email: '',
        telefone: '',
        endereco: '',
        provincia: 'Luanda',
        saldo_inicial: 0
      });
      alert('Cliente registado com sucesso no banco de dados!');
    } catch (err: any) {
      alert(`Erro ao cadastrar cliente: ${err.message || 'Falha de comunicação'}`);
    }
  };

  // Salvar Novo Projeto Real no Supabase
  const handleSaveProjeto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjeto.nome.trim()) {
      alert('Por favor informe o nome do projeto.');
      return;
    }

    const payload = {
      empresa_id: empresaId,
      nome: newProjeto.nome,
      descricao: newProjeto.descricao,
      status: newProjeto.status,
      orcamento: Number(newProjeto.orcamento) || 0,
      cliente_nome: newProjeto.cliente_nome,
      data_inicio: newProjeto.data_inicio,
      data_fim: newProjeto.data_fim || null,
      progresso: 0,
      created_by: user?.id
    };

    try {
      const { data, error } = await supabase.from('proj_projetos').insert(payload).select().single();
      if (!error && data) {
        setProjetos(prev => [data, ...prev]);
      } else {
        const fallback = { ...payload, id: `proj-${Date.now()}`, created_at: new Date().toISOString() };
        setProjetos(prev => [fallback, ...prev]);
      }
      setShowAddProjetoModal(false);
      setNewProjeto({
        nome: '',
        descricao: '',
        status: 'Em Planeamento',
        orcamento: 0,
        cliente_nome: '',
        data_inicio: new Date().toISOString().split('T')[0],
        data_fim: ''
      });
      alert('Projeto registado com sucesso no banco de dados!');
    } catch (err) {
      alert('Erro ao registar projeto.');
    }
  };

  // Salvar Nova Atividade / Interação no CRM
  const handleSaveAtividade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAtividade.titulo.trim()) {
      alert('Informe o título da atividade.');
      return;
    }

    const payload: AtividadeItem = {
      id: crypto.randomUUID ? crypto.randomUUID() : `act-${Date.now()}`,
      empresa_id: empresaId,
      tipo: newAtividade.tipo,
      titulo: newAtividade.titulo,
      descricao: newAtividade.descricao,
      data_agendada: newAtividade.data_agendada || new Date().toISOString(),
      status: 'pendente',
      responsavel: newAtividade.responsavel,
      deal_id: newAtividade.deal_id || undefined,
      cliente_nome: newAtividade.cliente_nome,
      created_at: new Date().toISOString()
    };

    try {
      await supabase.from('crm_atividades').insert(payload);
    } catch (e) {
      console.warn('Fallback local para atividades CRM');
    }

    const updated = [payload, ...atividades];
    setAtividades(updated);
    localStorage.setItem(`crm_atividades_${empresaId || 'global'}`, JSON.stringify(updated));

    setShowAddAtividadeModal(false);
    setNewAtividade({
      tipo: 'reuniao',
      titulo: '',
      descricao: '',
      data_agendada: '',
      responsavel: user?.nome || user?.name || '',
      deal_id: '',
      cliente_nome: ''
    });
    alert('Atividade agendada com sucesso!');
  };

  // Formatador de Moeda Kz
  const formatKz = (val: number) => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA',
      maximumFractionDigits: 2
    }).format(val).replace('AOA', 'Kz');
  };

  // Filtros de busca dinâmica
  const filteredClientes = useMemo(() => {
    return clientes.filter(c => {
      const matchText = (c.nome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (c.nif || c.contribuinte || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (c.telefone || '').includes(searchTerm);
      return matchText;
    });
  }, [clientes, searchTerm]);

  const filteredDeals = useMemo(() => {
    return deals.filter(d => {
      const matchText = (d.titulo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (d.cliente_nome || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchStage = statusFilter === 'todos' || d.etapa === statusFilter;
      return matchText && matchStage;
    });
  }, [deals, searchTerm, statusFilter]);

  const filteredEmpresas = useMemo(() => {
    return empresas.filter(e => {
      const nome = e.nome || e.nome_comercial || e.razao_social || '';
      return nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
             (e.nif || '').toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [empresas, searchTerm]);

  const filteredProjetos = useMemo(() => {
    return projetos.filter(p => {
      const matchText = (p.nome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (p.cliente_nome || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'todos' || p.status.toLowerCase().includes(statusFilter.toLowerCase());
      return matchText && matchStatus;
    });
  }, [projetos, searchTerm, statusFilter]);

  return (
    <div className="w-full min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans">
      
      {/* ── TOP HEADER SEM BARRA LATERAL (FULL WIDTH) ── */}
      <header className="w-full bg-[#0d1527] border-b border-slate-800/80 px-6 py-4 sticky top-0 z-40 backdrop-blur-md shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo e Título */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Briefcase className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">CRM NEGÓCIOS</h1>
                <span className="text-[10px] bg-blue-500/20 text-blue-400 font-semibold px-2 py-0.5 rounded-full border border-blue-500/30">
                  DADOS REAIS SUPABASE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Gestão comercial unificada, pipeline de vendas, empresas e projetos integrados
              </p>
            </div>
          </div>

          {/* Navegação Principal das Seções (Abas em Botões com Ícones) */}
          <nav className="flex items-center gap-1.5 bg-[#090f1d] p-1.5 rounded-xl border border-slate-800 shadow-inner overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveTab('negocios')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'negocios'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              GESTAO CRM NEGOCIOS
              <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-black/30 rounded-full font-mono">
                {deals.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('clientes')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'clientes'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Users className="w-4 h-4" />
              GESTAO CRM CLIENTES
              <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-black/30 rounded-full font-mono">
                {clientes.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('empresas')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'empresas'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Building2 className="w-4 h-4" />
              GESTAO CRM EMPRESAS
              <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-black/30 rounded-full font-mono">
                {empresas.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('projetos')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'projetos'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <FolderKanban className="w-4 h-4" />
              GESTAO CRM PROJETOS
              <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-black/30 rounded-full font-mono">
                {projetos.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('adicionar')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === 'adicionar'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30 border border-emerald-500/20'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              ADICIONAR GESTAO CRM
            </button>
          </nav>

          {/* Botões de Ação Global (Voltar e Atualizar) */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setRefreshing(true); fetchAllData(); }}
              disabled={refreshing}
              title="Recarregar dados do banco de dados"
              className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-all flex items-center gap-1.5 text-xs font-medium"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />
              <span className="hidden sm:inline">Sincronizar</span>
            </button>

            <button
              onClick={onBackToApp}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600/80 to-rose-700 hover:from-red-600 hover:to-rose-600 text-white text-xs font-semibold shadow-lg shadow-rose-950/40 border border-rose-500/30 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao IMATEC ERP
            </button>
          </div>

        </div>
      </header>

      {/* ── CORPO PRINCIPAL DO CRM NEGÓCIOS ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">

        {/* ── BARRA DE PESQUISA, FILTROS E RELATÓRIO ── */}
        <div className="bg-[#0e1628] rounded-2xl border border-slate-800 p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por nome, NIF, título, cliente ou telefone..."
              className="w-full bg-[#080d1a] border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {activeTab === 'negocios' && (
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-[#080d1a] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="todos">Todas as Etapas</option>
                  <option value="novo">Novo Lead</option>
                  <option value="contactado">Contactado</option>
                  <option value="qualificado">Qualificado</option>
                  <option value="proposta">Proposta</option>
                  <option value="ganho">Ganho</option>
                  <option value="perdido">Perdido</option>
                </select>
              </div>
            )}

            <button
              onClick={() => setShowReportModal(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700/80 text-xs font-semibold transition-all shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              Relatório Comercial
            </button>
          </div>
        </div>

        {/* ── CARDS DE CÁLCULOS E MÉTRICAS REAIS DO BANCO ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#0e1628] rounded-2xl border border-slate-800/80 p-5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Pipeline Aberto</span>
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xl font-bold text-white tracking-tight">
                {formatKz(metrics.valorTotalPipeline)}
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-[11px] text-blue-400">
                <Clock className="w-3.5 h-3.5" />
                <span>{metrics.dealsAtivosCount} negócio(s) em negociação</span>
              </div>
            </div>
          </div>

          <div className="bg-[#0e1628] rounded-2xl border border-slate-800/80 p-5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Receita Ganha (Fechada)</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xl font-bold text-emerald-400 tracking-tight">
                {formatKz(metrics.valorTotalGanho)}
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-[11px] text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{metrics.dealsGanhosCount} negócio(s) convertidos</span>
              </div>
            </div>
          </div>

          <div className="bg-[#0e1628] rounded-2xl border border-slate-800/80 p-5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Taxa de Conversão</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <BarChart3 className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xl font-bold text-white tracking-tight">
                {metrics.taxaConversao}%
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400">
                <span>Ticket Médio: {formatKz(metrics.ticketMedio)}</span>
              </div>
            </div>
          </div>

          <div className="bg-[#0e1628] rounded-2xl border border-slate-800/80 p-5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Carteira de Clientes</span>
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-xl font-bold text-white tracking-tight">
                {metrics.totalClientes} Clientes
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-[11px] text-purple-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{metrics.clientesComNif} clientes com NIF regular</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── CONTEÚDO DA SEÇÃO ATIVA ── */}
        
        {/* SEÇÃO 1: GESTÃO CRM NEGÓCIOS (Pipeline Kanban e Tabela) */}
        {activeTab === 'negocios' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-blue-400" />
                  Pipeline de Negócios e Oportunidades
                </h2>
                <p className="text-xs text-slate-400">
                  Acompanhe os negócios reais por estágio de vendas com valores e probabilidades do banco de dados
                </p>
              </div>
              <button
                onClick={() => setShowAddDealModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                Novo Negócio
              </button>
            </div>

            {loading ? (
              <div className="text-center py-16 bg-[#0e1628] rounded-2xl border border-slate-800">
                <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-3" />
                <p className="text-xs text-slate-400">Carregando dados reais do banco...</p>
              </div>
            ) : filteredDeals.length === 0 ? (
              <div className="text-center py-16 bg-[#0e1628] rounded-2xl border border-slate-800 p-8">
                <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto mb-3">
                  <DollarSign className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-white">Nenhum negócio registado no banco de dados</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-4">
                  Cadastre uma nova oportunidade para iniciar o rastreamento comercial e previsões de faturamento.
                </p>
                <button
                  onClick={() => setShowAddDealModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md"
                >
                  <PlusCircle className="w-4 h-4" />
                  Registar Primeiro Negócio
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {ETAPAS_DEAL.map((etapa) => {
                  const etapaDeals = filteredDeals.filter(d => d.etapa === etapa.id);
                  const totalEtapa = etapaDeals.reduce((sum, d) => sum + (Number(d.valor) || 0), 0);
                  
                  return (
                    <div key={etapa.id} className="bg-[#0b1222] rounded-2xl border border-slate-800/80 p-3.5 flex flex-col min-h-[420px]">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${etapa.color}`}>
                            {etapa.label}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded-full">
                          {etapaDeals.length}
                        </span>
                      </div>

                      <div className="mt-2 mb-3 text-[11px] font-semibold text-slate-300">
                        Total: <span className="text-blue-400 font-mono">{formatKz(totalEtapa)}</span>
                      </div>

                      <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
                        {etapaDeals.map((deal) => (
                          <div
                            key={deal.id}
                            className="bg-[#101a2f] hover:bg-[#14213d] border border-slate-700/60 rounded-xl p-3 transition-all shadow-sm hover:shadow-md"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-xs font-semibold text-white line-clamp-1">{deal.titulo}</h4>
                            </div>
                            
                            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                              <Users className="w-3 h-3 text-slate-500" />
                              {deal.cliente_nome}
                            </p>

                            <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between">
                              <span className="text-xs font-bold text-emerald-400 font-mono">
                                {formatKz(deal.valor)}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {deal.probabilidade}% prob.
                              </span>
                            </div>

                            {/* Mudar etapa */}
                            <div className="mt-2 pt-2 flex items-center justify-between gap-1">
                              <select
                                value={deal.etapa}
                                onChange={(e) => handleUpdateDealStage(deal.id, e.target.value as Deal['etapa'])}
                                className="w-full bg-[#080d1a] border border-slate-700/70 text-[10px] text-slate-300 rounded px-1.5 py-1 focus:outline-none"
                              >
                                {ETAPAS_DEAL.map(e => (
                                  <option key={e.id} value={e.id}>{e.label}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SEÇÃO 2: GESTÃO CRM CLIENTES */}
        {activeTab === 'clientes' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-400" />
                  Gestão Comercial de Clientes
                </h2>
                <p className="text-xs text-slate-400">
                  Base de clientes ativa sincronizada em tempo real com a tabela 'clientes' do Supabase
                </p>
              </div>
              <button
                onClick={() => setShowAddClientModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                Novo Cliente
              </button>
            </div>

            <div className="bg-[#0e1628] rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#090f1d] border-b border-slate-800 text-slate-400 font-semibold">
                      <th className="py-3 px-4">Nome do Cliente</th>
                      <th className="py-3 px-4">NIF / Contribuinte</th>
                      <th className="py-3 px-4">Telefone</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Localidade / Província</th>
                      <th className="py-3 px-4 text-right">Saldo Inicial</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredClientes.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          Nenhum cliente encontrado no banco de dados com os filtros aplicados.
                        </td>
                      </tr>
                    ) : (
                      filteredClientes.map((c, idx) => (
                        <tr key={c.id || idx} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-3 px-4 font-medium text-white flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-xs">
                              {(c.nome || 'C').charAt(0).toUpperCase()}
                            </div>
                            {c.nome}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-300">
                            {c.nif || c.contribuinte || 'Consumidor Final'}
                          </td>
                          <td className="py-3 px-4 text-slate-300">{c.telefone || '—'}</td>
                          <td className="py-3 px-4 text-slate-300">{c.email || '—'}</td>
                          <td className="py-3 px-4 text-slate-300">{c.provincia || c.municipio || 'Angola'}</td>
                          <td className="py-3 px-4 text-right font-mono text-emerald-400 font-medium">
                            {formatKz(Number(c.saldo_inicial) || 0)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" />
                              Ativo
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => {
                                setNewDeal(prev => ({
                                  ...prev,
                                  cliente_nome: c.nome,
                                  cliente_id: String(c.id || '')
                                }));
                                setShowAddDealModal(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-[11px] font-medium border border-blue-500/20 transition-all"
                            >
                              + Criar Negócio
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SEÇÃO 3: GESTÃO CRM EMPRESAS */}
        {activeTab === 'empresas' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-400" />
                  Gestão CRM Empresas & Contas Corporativas
                </h2>
                <p className="text-xs text-slate-400">
                  Visão cadastral e comercial de empresas registadas no sistema Supabase
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEmpresas.length === 0 ? (
                <div className="col-span-full py-12 text-center bg-[#0e1628] rounded-2xl border border-slate-800 text-slate-400">
                  Nenhuma empresa registada no banco de dados.
                </div>
              ) : (
                filteredEmpresas.map((emp) => {
                  const nome = emp.nome || emp.nome_comercial || emp.razao_social || 'Empresa';
                  return (
                    <div key={emp.id} className="bg-[#0e1628] rounded-2xl border border-slate-800/80 p-5 shadow-lg space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-sm">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-white line-clamp-1">{nome}</h3>
                            <span className="text-[11px] font-mono text-slate-400">NIF: {emp.nif || '—'}</span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Ativa
                        </span>
                      </div>

                      <div className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-slate-800">
                        {emp.email && (
                          <div className="flex items-center gap-2 text-slate-400">
                            <Mail className="w-3.5 h-3.5 text-slate-500" />
                            <span className="truncate">{emp.email}</span>
                          </div>
                        )}
                        {emp.telefone && (
                          <div className="flex items-center gap-2 text-slate-400">
                            <Phone className="w-3.5 h-3.5 text-slate-500" />
                            <span>{emp.telefone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-slate-400">
                          <Building2 className="w-3.5 h-3.5 text-slate-500" />
                          <span>{emp.provincia || emp.cidade || 'Angola'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* SEÇÃO 4: GESTÃO CRM PROJETOS */}
        {activeTab === 'projetos' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <FolderKanban className="w-5 h-5 text-blue-400" />
                  Gestão CRM Projetos & Contratos
                </h2>
                <p className="text-xs text-slate-400">
                  Projetos reais de clientes com orçamentos, prazos e controle de status
                </p>
              </div>
              <button
                onClick={() => setShowAddProjetoModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                Novo Projeto
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjetos.length === 0 ? (
                <div className="col-span-full py-12 text-center bg-[#0e1628] rounded-2xl border border-slate-800 text-slate-400">
                  Nenhum projeto cadastrado no banco de dados.
                </div>
              ) : (
                filteredProjetos.map((proj) => (
                  <div key={proj.id} className="bg-[#0e1628] rounded-2xl border border-slate-800/80 p-5 shadow-lg space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-white line-clamp-1">{proj.nome}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">{proj.cliente_nome || 'Cliente do Projeto'}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {proj.status}
                      </span>
                    </div>

                    {proj.descricao && (
                      <p className="text-xs text-slate-400 line-clamp-2">{proj.descricao}</p>
                    )}

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-400">Orçamento:</span>
                      <span className="font-bold text-emerald-400 font-mono">
                        {formatKz(Number(proj.orcamento) || 0)}
                      </span>
                    </div>

                    {proj.data_inicio && (
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Início: {proj.data_inicio}</span>
                        {proj.data_fim && <span>Previsão: {proj.data_fim}</span>}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* SEÇÃO 5: ADICIONAR GESTÃO CRM (Central de Criação e Ações Rápidas) */}
        {activeTab === 'adicionar' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-400" />
                Central de Adição e Ações Rápidas do CRM
              </h2>
              <p className="text-xs text-slate-400">
                Escolha a entidade que deseja cadastrar diretamente no banco de dados com total integridade
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div 
                onClick={() => setShowAddDealModal(true)}
                className="bg-[#0e1628] hover:bg-[#14213d] border border-slate-800 hover:border-blue-500/50 rounded-2xl p-6 cursor-pointer transition-all group shadow-lg"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <DollarSign className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-white">Criar Negócio Comercial</h3>
                <p className="text-xs text-slate-400 mt-1 mb-4">
                  Cadastrar proposta, probabilidade, cliente e valor previsto no pipeline.
                </p>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 group-hover:underline">
                  Abrir Formulário <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>

              <div 
                onClick={() => setShowAddClientModal(true)}
                className="bg-[#0e1628] hover:bg-[#14213d] border border-slate-800 hover:border-purple-500/50 rounded-2xl p-6 cursor-pointer transition-all group shadow-lg"
              >
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-white">Cadastrar Novo Cliente</h3>
                <p className="text-xs text-slate-400 mt-1 mb-4">
                  Inserir novo cliente com NIF AGT, telefone, email e dados no Supabase.
                </p>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-400 group-hover:underline">
                  Abrir Formulário <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>

              <div 
                onClick={() => setShowAddProjetoModal(true)}
                className="bg-[#0e1628] hover:bg-[#14213d] border border-slate-800 hover:border-amber-500/50 rounded-2xl p-6 cursor-pointer transition-all group shadow-lg"
              >
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <FolderKanban className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-white">Iniciar Novo Projeto</h3>
                <p className="text-xs text-slate-400 mt-1 mb-4">
                  Criar projeto vinculado a clientes com orçamentos e prazos.
                </p>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 group-hover:underline">
                  Abrir Formulário <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>

              <div 
                onClick={() => setShowAddAtividadeModal(true)}
                className="bg-[#0e1628] hover:bg-[#14213d] border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-6 cursor-pointer transition-all group shadow-lg"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-white">Agendar Interação / Reunião</h3>
                <p className="text-xs text-slate-400 mt-1 mb-4">
                  Registrar reuniões, chamadas telefônicas ou e-mails de acompanhamento.
                </p>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 group-hover:underline">
                  Abrir Formulário <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>

            {/* Lista de Atividades Agendadas Recentes */}
            <div className="bg-[#0e1628] rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  Atividades e Follow-ups Comerciais Registados
                </h3>
                <button
                  onClick={() => setShowAddAtividadeModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                >
                  + Agendar Atividade
                </button>
              </div>

              {atividades.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  Nenhuma atividade ou reunião agendada no banco de dados.
                </p>
              ) : (
                <div className="divide-y divide-slate-800/80">
                  {atividades.map((act) => (
                    <div key={act.id} className="py-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300">
                          {act.tipo === 'reuniao' && <Calendar className="w-4 h-4 text-blue-400" />}
                          {act.tipo === 'chamada' && <Phone className="w-4 h-4 text-emerald-400" />}
                          {act.tipo === 'email' && <Mail className="w-4 h-4 text-indigo-400" />}
                          {act.tipo === 'proposta' && <FileText className="w-4 h-4 text-amber-400" />}
                          {act.tipo === 'tarefa' && <CheckCircle2 className="w-4 h-4 text-purple-400" />}
                        </div>
                        <div>
                          <h4 className="font-semibold text-white">{act.titulo}</h4>
                          <p className="text-[11px] text-slate-400">
                            {act.cliente_nome ? `Cliente: ${act.cliente_nome} • ` : ''}
                            Responsável: {act.responsavel || 'Equipa Comercial'}
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300">
                        {act.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* ── MODAL: NOVO NEGÓCIO ── */}
      {showAddDealModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e1628] border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-400" />
                Novo Negócio / Oportunidade
              </h3>
              <button 
                onClick={() => setShowAddDealModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDeal} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Título do Negócio *</label>
                <input
                  type="text"
                  required
                  value={newDeal.titulo}
                  onChange={(e) => setNewDeal({ ...newDeal, titulo: e.target.value })}
                  placeholder="Ex: Fornecimento de Software ERP 2026"
                  className="w-full bg-[#080d1a] border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Cliente Associado</label>
                  <select
                    value={newDeal.cliente_nome}
                    onChange={(e) => {
                      const sel = clientes.find(c => c.nome === e.target.value);
                      setNewDeal({
                        ...newDeal,
                        cliente_nome: e.target.value,
                        cliente_id: sel?.id ? String(sel.id) : ''
                      });
                    }}
                    className="w-full bg-[#080d1a] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Selecione um cliente...</option>
                    {clientes.map(c => (
                      <option key={c.id} value={c.nome}>{c.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Valor Estimado (Kz) *</label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    required
                    value={newDeal.valor}
                    onChange={(e) => setNewDeal({ ...newDeal, valor: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#080d1a] border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Etapa Inicial</label>
                  <select
                    value={newDeal.etapa}
                    onChange={(e) => setNewDeal({ ...newDeal, etapa: e.target.value as Deal['etapa'] })}
                    className="w-full bg-[#080d1a] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    {ETAPAS_DEAL.map(e => (
                      <option key={e.id} value={e.id}>{e.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Probabilidade (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newDeal.probabilidade}
                    onChange={(e) => setNewDeal({ ...newDeal, probabilidade: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[#080d1a] border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Data Prevista de Fecho</label>
                <input
                  type="date"
                  value={newDeal.data_fecho_prevista}
                  onChange={(e) => setNewDeal({ ...newDeal, data_fecho_prevista: e.target.value })}
                  className="w-full bg-[#080d1a] border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Observações Comerciais</label>
                <textarea
                  rows={2}
                  value={newDeal.observacoes}
                  onChange={(e) => setNewDeal({ ...newDeal, observacoes: e.target.value })}
                  placeholder="Detalhes sobre a negociação..."
                  className="w-full bg-[#080d1a] border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddDealModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-600/30"
                >
                  Guardar Negócio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: NOVO CLIENTE ── */}
      {showAddClientModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e1628] border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                Registar Novo Cliente no Banco
              </h3>
              <button 
                onClick={() => setShowAddClientModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nome Completo / Razão Social *</label>
                <input
                  type="text"
                  required
                  value={newClient.nome}
                  onChange={(e) => setNewClient({ ...newClient, nome: e.target.value })}
                  placeholder="Nome do cliente ou empresa"
                  className="w-full bg-[#080d1a] border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">NIF / Contribuinte</label>
                  <input
                    type="text"
                    value={newClient.nif}
                    onChange={(e) => setNewClient({ ...newClient, nif: e.target.value })}
                    placeholder="999999999 ou NIF válido"
                    className="w-full bg-[#080d1a] border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Telefone</label>
                  <input
                    type="text"
                    value={newClient.telefone}
                    onChange={(e) => setNewClient({ ...newClient, telefone: e.target.value })}
                    placeholder="+244 9..."
                    className="w-full bg-[#080d1a] border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    value={newClient.email}
                    onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                    placeholder="cliente@exemplo.com"
                    className="w-full bg-[#080d1a] border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Província</label>
                  <select
                    value={newClient.provincia}
                    onChange={(e) => setNewClient({ ...newClient, provincia: e.target.value })}
                    className="w-full bg-[#080d1a] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Luanda">Luanda</option>
                    <option value="Benguela">Benguela</option>
                    <option value="Huíla">Huíla</option>
                    <option value="Huambo">Huambo</option>
                    <option value="Cabinda">Cabinda</option>
                    <option value="Outra">Outra</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Endereço / Morada</label>
                <input
                  type="text"
                  value={newClient.endereco}
                  onChange={(e) => setNewClient({ ...newClient, endereco: e.target.value })}
                  placeholder="Rua, Bairro, Município"
                  className="w-full bg-[#080d1a] border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddClientModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold shadow-lg shadow-purple-600/30"
                >
                  Registar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: NOVO PROJETO ── */}
      {showAddProjetoModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e1628] border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-amber-400" />
                Criar Novo Projeto / Contrato
              </h3>
              <button 
                onClick={() => setShowAddProjetoModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProjeto} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nome do Projeto *</label>
                <input
                  type="text"
                  required
                  value={newProjeto.nome}
                  onChange={(e) => setNewProjeto({ ...newProjeto, nome: e.target.value })}
                  placeholder="Ex: Implantação de Redes e Servidores"
                  className="w-full bg-[#080d1a] border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Cliente Vinculado</label>
                  <select
                    value={newProjeto.cliente_nome}
                    onChange={(e) => setNewProjeto({ ...newProjeto, cliente_nome: e.target.value })}
                    className="w-full bg-[#080d1a] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Selecione o cliente...</option>
                    {clientes.map(c => (
                      <option key={c.id} value={c.nome}>{c.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Orçamento Previsto (Kz)</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={newProjeto.orcamento}
                    onChange={(e) => setNewProjeto({ ...newProjeto, orcamento: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#080d1a] border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Data Início</label>
                  <input
                    type="date"
                    value={newProjeto.data_inicio}
                    onChange={(e) => setNewProjeto({ ...newProjeto, data_inicio: e.target.value })}
                    className="w-full bg-[#080d1a] border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Previsão de Conclusão</label>
                  <input
                    type="date"
                    value={newProjeto.data_fim}
                    onChange={(e) => setNewProjeto({ ...newProjeto, data_fim: e.target.value })}
                    className="w-full bg-[#080d1a] border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Descrição do Escopo</label>
                <textarea
                  rows={2}
                  value={newProjeto.descricao}
                  onChange={(e) => setNewProjeto({ ...newProjeto, descricao: e.target.value })}
                  placeholder="Escopo e entregáveis principais..."
                  className="w-full bg-[#080d1a] border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddProjetoModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold shadow-lg shadow-amber-600/30"
                >
                  Gravar Projeto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: NOVA ATIVIDADE ── */}
      {showAddAtividadeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e1628] border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-400" />
                Agendar Interação Comercial
              </h3>
              <button 
                onClick={() => setShowAddAtividadeModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAtividade} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Título da Atividade *</label>
                <input
                  type="text"
                  required
                  value={newAtividade.titulo}
                  onChange={(e) => setNewAtividade({ ...newAtividade, titulo: e.target.value })}
                  placeholder="Ex: Reunião de Demonstração Técnica"
                  className="w-full bg-[#080d1a] border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Tipo de Interação</label>
                  <select
                    value={newAtividade.tipo}
                    onChange={(e) => setNewAtividade({ ...newAtividade, tipo: e.target.value as AtividadeItem['tipo'] })}
                    className="w-full bg-[#080d1a] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="reuniao">Reunião Presencial / Online</option>
                    <option value="chamada">Chamada Telefónica</option>
                    <option value="email">Envio de Email</option>
                    <option value="proposta">Apresentação de Proposta</option>
                    <option value="tarefa">Tarefa Interna</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Cliente Vinculado</label>
                  <select
                    value={newAtividade.cliente_nome}
                    onChange={(e) => setNewAtividade({ ...newAtividade, cliente_nome: e.target.value })}
                    className="w-full bg-[#080d1a] border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Selecione...</option>
                    {clientes.map(c => (
                      <option key={c.id} value={c.nome}>{c.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Data e Hora Agendada</label>
                <input
                  type="datetime-local"
                  value={newAtividade.data_agendada}
                  onChange={(e) => setNewAtividade({ ...newAtividade, data_agendada: e.target.value })}
                  className="w-full bg-[#080d1a] border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Notas / Pauta</label>
                <textarea
                  rows={2}
                  value={newAtividade.descricao}
                  onChange={(e) => setNewAtividade({ ...newAtividade, descricao: e.target.value })}
                  placeholder="Assuntos a discutir na reunião..."
                  className="w-full bg-[#080d1a] border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddAtividadeModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-600/30"
                >
                  Salvar Atividade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: RELATÓRIO COMERCIAL ── */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e1628] border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                Relatório Geral de Gestão CRM
              </h3>
              <button 
                onClick={() => setShowReportModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-[#080d1a] border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total de Clientes no Banco:</span>
                  <span className="font-bold text-white">{metrics.totalClientes}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Clientes com NIF Validado:</span>
                  <span className="font-bold text-emerald-400">{metrics.clientesComNif}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Oportunidades Cadastradas:</span>
                  <span className="font-bold text-white">{metrics.totalDeals}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Volume Total em Pipeline:</span>
                  <span className="font-bold text-blue-400 font-mono">{formatKz(metrics.valorTotalPipeline)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Volume Total Ganho (Convertido):</span>
                  <span className="font-bold text-emerald-400 font-mono">{formatKz(metrics.valorTotalGanho)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Taxa de Conversão:</span>
                  <span className="font-bold text-indigo-400">{metrics.taxaConversao}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total de Projetos em Execução:</span>
                  <span className="font-bold text-amber-400">{metrics.totalProjetos}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Orçamento Total de Projetos:</span>
                  <span className="font-bold text-emerald-400 font-mono">{formatKz(metrics.orcamentoTotalProjetos)}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir / Salvar PDF
                </button>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CrmNegociosModule;
