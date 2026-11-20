import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Briefcase,
  Users,
  Building2,
  FolderKanban,
  PlusCircle,
  Search,
  Filter,
  RefreshCw,
  ArrowLeft,
  DollarSign,
  CheckCircle2,
  Clock,
  TrendingUp,
  Phone,
  Mail,
  Calendar,
  Edit,
  Trash2,
  Eye,
  BarChart3,
  FileText,
  Printer,
  ChevronRight,
  ShieldCheck,
  Check,
  X,
  FileSpreadsheet,
  Layers,
  ArrowUpDown,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { clienteService, Cliente } from '../services/clienteService';

interface CrmNegociosProps {
  onBackToApp: () => void;
  companyData?: any;
}

type TabType = 'negocios' | 'clientes' | 'empresas' | 'projetos' | 'adicionar' | 'relatorios';

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
  { id: 'novo', label: 'Novo Lead', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'contactado', label: 'Contactado', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'qualificado', label: 'Qualificado', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'proposta', label: 'Proposta Enviada', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'ganho', label: 'Ganho (Fechado)', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'perdido', label: 'Perdido', color: 'bg-rose-50 text-rose-700 border-rose-200' },
];

export const CrmNegociosModule: React.FC<CrmNegociosProps> = ({ onBackToApp, companyData }) => {
  const { user } = useAuth();
  const empresaId = user?.empresa_id || companyData?.id || '';

  // Tab ativa principal
  const [activeTab, setActiveTab] = useState<TabType>('negocios');
  const [activeReportSection, setActiveReportSection] = useState<'negocios' | 'clientes' | 'empresas' | 'projetos' | 'geral'>('negocios');

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  // Dados reais Supabase
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [empresas, setEmpresas] = useState<EmpresaItem[]>([]);
  const [projetos, setProjetos] = useState<ProjetoItem[]>([]);
  const [atividades, setAtividades] = useState<AtividadeItem[]>([]);

  // Modais de Criação
  const [showAddDealModal, setShowAddDealModal] = useState<boolean>(false);
  const [showAddClientModal, setShowAddClientModal] = useState<boolean>(false);
  const [showAddProjetoModal, setShowAddProjetoModal] = useState<boolean>(false);
  const [showAddAtividadeModal, setShowAddAtividadeModal] = useState<boolean>(false);

  // Modais de Edição
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [editingProjeto, setEditingProjeto] = useState<ProjetoItem | null>(null);

  // Modal de Detalhe Individual
  const [viewItem, setViewItem] = useState<{ title: string; data: Record<string, any> } | null>(null);

  // Form states de cadastro
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

  // Formatador Kz
  const formatKz = (val: number) => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA',
      maximumFractionDigits: 2
    }).format(val || 0).replace('AOA', 'Kz');
  };

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

  // ── MUTAÇÕES DE DADOS REAIS (CRIAR, EDITAR, EXCLUIR) ──

  // 1. Deals
  const handleSaveDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeal.titulo.trim()) {
      alert('Informe o título do negócio.');
      return;
    }

    const payload: Deal = {
      id: crypto.randomUUID ? crypto.randomUUID() : `deal-${Date.now()}`,
      empresa_id: empresaId,
      titulo: newDeal.titulo,
      cliente_nome: newDeal.cliente_nome || 'Cliente Comercial',
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
      await supabase.from('crm_deals').insert(payload);
    } catch (err) {
      console.warn('Fallback local para deals:', err);
    }

    const updated = [payload, ...deals];
    setDeals(updated);
    localStorage.setItem(`crm_deals_${empresaId || 'global'}`, JSON.stringify(updated));

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

  const handleUpdateDealStage = async (dealId: string, novaEtapa: Deal['etapa']) => {
    const updated = deals.map(d => d.id === dealId ? { ...d, etapa: novaEtapa } : d);
    setDeals(updated);
    localStorage.setItem(`crm_deals_${empresaId || 'global'}`, JSON.stringify(updated));

    try {
      await supabase.from('crm_deals').update({ etapa: novaEtapa }).eq('id', dealId);
    } catch (e) {
      console.warn('Erro ao atualizar etapa no Supabase:', e);
    }
  };

  const handleSaveEditDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDeal) return;

    try {
      await supabase.from('crm_deals').update({
        titulo: editingDeal.titulo,
        cliente_nome: editingDeal.cliente_nome,
        valor: Number(editingDeal.valor) || 0,
        etapa: editingDeal.etapa,
        probabilidade: Number(editingDeal.probabilidade) || 50,
        data_fecho_prevista: editingDeal.data_fecho_prevista,
        responsavel: editingDeal.responsavel,
        observacoes: editingDeal.observacoes
      }).eq('id', editingDeal.id);
    } catch (e) {
      console.warn('Fallback de atualização local de deal:', e);
    }

    const updated = deals.map(d => d.id === editingDeal.id ? editingDeal : d);
    setDeals(updated);
    localStorage.setItem(`crm_deals_${empresaId || 'global'}`, JSON.stringify(updated));
    setEditingDeal(null);
    alert('Negócio atualizado com sucesso!');
  };

  const handleDeleteDeal = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este negócio do CRM?')) return;

    try {
      await supabase.from('crm_deals').delete().eq('id', id);
    } catch (e) {
      console.warn('Erro ao excluir no Supabase:', e);
    }

    const updated = deals.filter(d => d.id !== id);
    setDeals(updated);
    localStorage.setItem(`crm_deals_${empresaId || 'global'}`, JSON.stringify(updated));
  };

  // 2. Clientes
  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.nome.trim()) {
      alert('Informe o nome do cliente.');
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

  const handleSaveEditCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCliente || !editingCliente.id) return;

    try {
      await clienteService.updateCliente(editingCliente.id, {
        nome: editingCliente.nome,
        nif: editingCliente.nif || editingCliente.contribuinte,
        email: editingCliente.email,
        telefone: editingCliente.telefone,
        morada: editingCliente.morada || editingCliente.endereco,
        provincia: editingCliente.provincia,
        saldo_inicial: Number(editingCliente.saldo_inicial) || 0
      });

      setClientes(prev => prev.map(c => c.id === editingCliente.id ? editingCliente : c));
      setEditingCliente(null);
      alert('Cliente atualizado com sucesso no banco de dados!');
    } catch (err: any) {
      alert(`Erro ao atualizar cliente: ${err.message || 'Erro'}`);
    }
  };

  const handleDeleteCliente = async (id: string | number) => {
    if (!window.confirm('Tem certeza que deseja desativar/excluir este cliente?')) return;

    try {
      await clienteService.deleteCliente(id);
      setClientes(prev => prev.filter(c => c.id !== id));
      alert('Cliente removido com sucesso!');
    } catch (e: any) {
      alert(`Erro ao excluir cliente: ${e.message}`);
    }
  };

  // 3. Projetos
  const handleSaveProjeto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjeto.nome.trim()) {
      alert('Informe o nome do projeto.');
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
      alert('Projeto gravado com sucesso no banco!');
    } catch (err) {
      alert('Erro ao registar projeto.');
    }
  };

  const handleSaveEditProjeto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProjeto) return;

    try {
      await supabase.from('proj_projetos').update({
        nome: editingProjeto.nome,
        descricao: editingProjeto.descricao,
        status: editingProjeto.status,
        orcamento: Number(editingProjeto.orcamento) || 0,
        cliente_nome: editingProjeto.cliente_nome,
        data_inicio: editingProjeto.data_inicio,
        data_fim: editingProjeto.data_fim
      }).eq('id', editingProjeto.id);

      setProjetos(prev => prev.map(p => p.id === editingProjeto.id ? editingProjeto : p));
      setEditingProjeto(null);
      alert('Projeto atualizado com sucesso!');
    } catch (e) {
      alert('Erro ao atualizar projeto.');
    }
  };

  const handleDeleteProjeto = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este projeto?')) return;
    try {
      await supabase.from('proj_projetos').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      setProjetos(prev => prev.filter(p => p.id !== id));
      alert('Projeto removido.');
    } catch (e) {
      alert('Erro ao excluir projeto.');
    }
  };

  // 4. Atividades
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
      console.warn('Fallback local para atividades');
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
    <div className="w-full min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans antialiased">
      
      {/* ── TOP HEADER CLÁSSICO BRANCO LEVE (FULL WIDTH) ── */}
      <header className="w-full bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-40 shadow-sm">
        <div className="w-full max-w-[1850px] mx-auto flex flex-col xl:flex-row items-center justify-between gap-4">
          
          {/* Identidade Corporativa Clássica */}
          <div className="flex items-center gap-3.5 self-start xl:self-center">
            <div className="w-12 h-12 bg-[#003366] text-white flex items-center justify-center font-bold shadow-sm rounded-none">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-[#003366] uppercase">
                  CRM NEGÓCIOS & EMPRESAS
                </h1>
                <span className="text-[10px] bg-blue-100 text-[#003366] font-bold px-2 py-0.5 rounded-none border border-blue-200 uppercase tracking-wider">
                  DADOS REAIS SUPABASE
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Gestão comercial unificada, pipeline de vendas, contas corporativas e contratos
              </p>
            </div>
          </div>

          {/* Navegação Principal em Botões Grandes Clássicos Quadrados */}
          <nav className="flex items-center flex-wrap gap-2 w-full xl:w-auto justify-start xl:justify-center">
            
            <button
              onClick={() => setActiveTab('negocios')}
              className={`flex items-center gap-2.5 px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all border rounded-none ${
                activeTab === 'negocios'
                  ? 'bg-[#003366] text-white border-[#003366] shadow-sm'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:border-slate-400'
              }`}
            >
              <DollarSign className="w-4 h-4 text-emerald-500" />
              GESTAO CRM NEGOCIOS
              <span className={`px-2 py-0.5 text-[11px] font-mono font-bold rounded-none ${
                activeTab === 'negocios' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
              }`}>
                {deals.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('clientes')}
              className={`flex items-center gap-2.5 px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all border rounded-none ${
                activeTab === 'clientes'
                  ? 'bg-[#003366] text-white border-[#003366] shadow-sm'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:border-slate-400'
              }`}
            >
              <Users className="w-4 h-4 text-blue-500" />
              GESTAO CRM CLIENTES
              <span className={`px-2 py-0.5 text-[11px] font-mono font-bold rounded-none ${
                activeTab === 'clientes' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
              }`}>
                {clientes.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('empresas')}
              className={`flex items-center gap-2.5 px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all border rounded-none ${
                activeTab === 'empresas'
                  ? 'bg-[#003366] text-white border-[#003366] shadow-sm'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:border-slate-400'
              }`}
            >
              <Building2 className="w-4 h-4 text-purple-500" />
              GESTAO CRM EMPRESAS
              <span className={`px-2 py-0.5 text-[11px] font-mono font-bold rounded-none ${
                activeTab === 'empresas' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
              }`}>
                {empresas.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('projetos')}
              className={`flex items-center gap-2.5 px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all border rounded-none ${
                activeTab === 'projetos'
                  ? 'bg-[#003366] text-white border-[#003366] shadow-sm'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:border-slate-400'
              }`}
            >
              <FolderKanban className="w-4 h-4 text-amber-500" />
              GESTAO CRM PROJETOS
              <span className={`px-2 py-0.5 text-[11px] font-mono font-bold rounded-none ${
                activeTab === 'projetos' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
              }`}>
                {projetos.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('adicionar')}
              className={`flex items-center gap-2.5 px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all border rounded-none ${
                activeTab === 'adicionar'
                  ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
              }`}
            >
              <PlusCircle className="w-4 h-4 text-emerald-600" />
              ADICIONAR GESTAO CRM
            </button>

            <button
              onClick={() => setActiveTab('relatorios')}
              className={`flex items-center gap-2.5 px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all border rounded-none ${
                activeTab === 'relatorios'
                  ? 'bg-indigo-700 text-white border-indigo-700 shadow-sm'
                  : 'bg-indigo-50 text-indigo-800 border-indigo-300 hover:bg-indigo-100'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
              RELATÓRIOS & IMPRESSÃO
            </button>
          </nav>

          {/* Botões Globais de Ação */}
          <div className="flex items-center gap-2.5 self-end xl:self-center">
            <button
              onClick={() => { setRefreshing(true); fetchAllData(); }}
              disabled={refreshing}
              title="Sincronizar dados frescos do banco"
              className="px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 rounded-none"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
              <span>Sincronizar</span>
            </button>

            <button
              onClick={onBackToApp}
              className="px-5 py-2.5 bg-[#cc0000] hover:bg-[#aa0000] text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 rounded-none shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao IMATEC ERP
            </button>
          </div>

        </div>
      </header>

      {/* ── CONTEÚDO PRINCIPAL (MAX WIDTH AMPLIADA, CLEAN & LEVE) ── */}
      <main className="flex-1 w-full max-w-[1850px] mx-auto px-6 py-5 space-y-4">

        {/* ── PAINEL DE CÁLCULOS E MÉTRICAS REAIS (COMPACTO, NÃO TOMA ESPAÇO EXCESSIVO) ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          
          <div className="bg-white border border-slate-200 p-3.5 rounded-none shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Pipeline Aberto</p>
              <p className="text-base font-black text-[#003366] font-mono mt-0.5">
                {formatKz(metrics.valorTotalPipeline)}
              </p>
              <span className="text-[10px] text-slate-400 font-medium">
                {metrics.dealsAtivosCount} negócio(s) em aberto
              </span>
            </div>
            <div className="w-8 h-8 bg-blue-50 text-blue-600 flex items-center justify-center rounded-none">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-3.5 rounded-none shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Receita Fechada</p>
              <p className="text-base font-black text-emerald-600 font-mono mt-0.5">
                {formatKz(metrics.valorTotalGanho)}
              </p>
              <span className="text-[10px] text-slate-400 font-medium">
                {metrics.dealsGanhosCount} negócio(s) ganhos
              </span>
            </div>
            <div className="w-8 h-8 bg-emerald-50 text-emerald-600 flex items-center justify-center rounded-none">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-3.5 rounded-none shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Taxa Conversão</p>
              <p className="text-base font-black text-indigo-700 font-mono mt-0.5">
                {metrics.taxaConversao}%
              </p>
              <span className="text-[10px] text-slate-400 font-medium">
                Ticket: {formatKz(metrics.ticketMedio)}
              </span>
            </div>
            <div className="w-8 h-8 bg-indigo-50 text-indigo-600 flex items-center justify-center rounded-none">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-3.5 rounded-none shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Clientes Ativos</p>
              <p className="text-base font-black text-slate-800 font-mono mt-0.5">
                {metrics.totalClientes} Clientes
              </p>
              <span className="text-[10px] text-emerald-600 font-medium">
                {metrics.clientesComNif} NIFs AGT regulares
              </span>
            </div>
            <div className="w-8 h-8 bg-purple-50 text-purple-600 flex items-center justify-center rounded-none">
              <Users className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-3.5 rounded-none shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Contas Empresas</p>
              <p className="text-base font-black text-slate-800 font-mono mt-0.5">
                {metrics.totalEmpresas} Empresas
              </p>
              <span className="text-[10px] text-slate-400 font-medium">
                Cadastros corporativos
              </span>
            </div>
            <div className="w-8 h-8 bg-amber-50 text-amber-600 flex items-center justify-center rounded-none">
              <Building2 className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-3.5 rounded-none shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Projetos & Obras</p>
              <p className="text-base font-black text-slate-800 font-mono mt-0.5">
                {metrics.totalProjetos} Projetos
              </p>
              <span className="text-[10px] text-slate-500 font-medium font-mono">
                {formatKz(metrics.orcamentoTotalProjetos)}
              </span>
            </div>
            <div className="w-8 h-8 bg-rose-50 text-rose-600 flex items-center justify-center rounded-none">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>

        </div>

        {/* ── BARRA DE FERRAMENTAS CLÁSSICA: PESQUISA, FILTROS E AÇÕES RÁPIDAS ── */}
        <div className="bg-white border border-slate-200 p-3 rounded-none shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
          
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por título, cliente, NIF, telefone ou descrição em tempo real..."
              className="w-full bg-[#f8fafc] border border-slate-300 rounded-none pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#003366] transition-colors"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto">
            {activeTab === 'negocios' && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 font-semibold uppercase">Filtro:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-[#f8fafc] border border-slate-300 rounded-none px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:border-[#003366]"
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
              onClick={() => {
                setActiveTab('relatorios');
                setActiveReportSection(activeTab === 'relatorios' ? 'geral' : (activeTab as any));
              }}
              className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold uppercase tracking-wider flex items-center gap-2 rounded-none transition-all shadow-sm"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>Imprimir Relatório</span>
            </button>
          </div>

        </div>

        {/* ── CONTEÚDO DA SEÇÃO ATIVA ── */}

        {/* 1. SEÇÃO: GESTÃO CRM NEGÓCIOS (Pipeline & Funil Kanban Profissional) */}
        {activeTab === 'negocios' && (
          <div className="space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div>
                <h2 className="text-base font-black text-[#003366] uppercase tracking-wide flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                  Funil de Vendas & Oportunidades Comerciais
                </h2>
                <p className="text-xs text-slate-500">
                  Visualização por estágio de fechamento. Clique nos botões para editar, excluir ou mudar de etapa.
                </p>
              </div>
              <button
                onClick={() => setShowAddDealModal(true)}
                className="px-4 py-2 bg-[#003366] hover:bg-[#002244] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 rounded-none shadow-sm transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                Novo Negócio
              </button>
            </div>

            {loading ? (
              <div className="text-center py-16 bg-white border border-slate-200 rounded-none">
                <RefreshCw className="w-8 h-8 text-[#003366] animate-spin mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-500">Carregando oportunidades do banco de dados...</p>
              </div>
            ) : filteredDeals.length === 0 ? (
              <div className="text-center py-14 bg-white border border-slate-200 p-8 rounded-none">
                <DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-700 uppercase">Nenhum negócio cadastrado no banco</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                  Cadastre oportunidades para rastrear propostas, probabilidades e receitas previstas.
                </p>
                <button
                  onClick={() => setShowAddDealModal(true)}
                  className="px-5 py-2.5 bg-[#003366] hover:bg-[#002244] text-white text-xs font-bold uppercase tracking-wider rounded-none shadow-sm"
                >
                  Registar Primeiro Negócio
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                {ETAPAS_DEAL.map((etapa) => {
                  const etapaDeals = filteredDeals.filter(d => d.etapa === etapa.id);
                  const totalEtapa = etapaDeals.reduce((sum, d) => sum + (Number(d.valor) || 0), 0);

                  return (
                    <div key={etapa.id} className="bg-white border border-slate-200 rounded-none p-3 flex flex-col min-h-[480px] shadow-sm">
                      
                      {/* Top da Coluna */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <span className={`text-[11px] font-black uppercase tracking-wider px-2 py-0.5 border rounded-none ${etapa.color}`}>
                          {etapa.label}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-none">
                          {etapaDeals.length}
                        </span>
                      </div>

                      <div className="py-2 text-[11px] font-bold text-slate-600 border-b border-slate-100">
                        Subtotal: <span className="font-mono text-[#003366] font-black">{formatKz(totalEtapa)}</span>
                      </div>

                      {/* Lista de Negócios */}
                      <div className="space-y-2.5 flex-1 overflow-y-auto pt-2.5 pr-0.5">
                        {etapaDeals.map((deal) => (
                          <div
                            key={deal.id}
                            className="bg-[#f8fafc] hover:bg-white border border-slate-200 hover:border-slate-300 p-3 rounded-none transition-all shadow-sm group"
                          >
                            <div className="flex items-start justify-between gap-1">
                              <h4 className="text-xs font-black text-slate-800 line-clamp-1 uppercase">
                                {deal.titulo}
                              </h4>
                            </div>

                            <p className="text-[11px] text-slate-600 font-medium mt-1 flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-slate-400" />
                              <span className="truncate">{deal.cliente_nome}</span>
                            </p>

                            <div className="mt-2 pt-2 border-t border-slate-200/80 flex items-center justify-between">
                              <span className="text-xs font-black text-emerald-700 font-mono">
                                {formatKz(deal.valor)}
                              </span>
                              <span className="text-[10px] font-bold font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-none">
                                {deal.probabilidade}% prob.
                              </span>
                            </div>

                            {/* Mover Etapa Dropdown */}
                            <div className="mt-2 pt-2 border-t border-slate-200/60">
                              <select
                                value={deal.etapa}
                                onChange={(e) => handleUpdateDealStage(deal.id, e.target.value as Deal['etapa'])}
                                className="w-full bg-white border border-slate-300 text-[10px] font-bold text-slate-700 px-1.5 py-1 rounded-none focus:outline-none"
                              >
                                {ETAPAS_DEAL.map(e => (
                                  <option key={e.id} value={e.id}>Mover p/ {e.label}</option>
                                ))}
                              </select>
                            </div>

                            {/* Ações: Editar, Excluir, Ver */}
                            <div className="mt-2.5 pt-2 border-t border-slate-200 flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setViewItem({
                                  title: `Negócio Comercial: ${deal.titulo}`,
                                  data: {
                                    'Título': deal.titulo,
                                    'Cliente': deal.cliente_nome,
                                    'Valor Previsto': formatKz(deal.valor),
                                    'Etapa Comercial': deal.etapa,
                                    'Probabilidade': `${deal.probabilidade}%`,
                                    'Responsável': deal.responsavel || 'Não definido',
                                    'Data Fecho Prevista': deal.data_fecho_prevista || 'Não estipulada',
                                    'Observações': deal.observacoes || 'Nenhuma observação',
                                    'Data de Criação': deal.created_at
                                  }
                                })}
                                title="Ver Ficha Completa"
                                className="p-1 text-slate-500 hover:text-blue-700 hover:bg-slate-100 rounded-none transition-all"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => setEditingDeal(deal)}
                                title="Editar Negócio"
                                className="p-1 text-slate-500 hover:text-amber-700 hover:bg-slate-100 rounded-none transition-all"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleDeleteDeal(deal.id)}
                                title="Excluir Negócio"
                                className="p-1 text-slate-500 hover:text-rose-700 hover:bg-slate-100 rounded-none transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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

        {/* 2. SEÇÃO: GESTÃO CRM CLIENTES */}
        {activeTab === 'clientes' && (
          <div className="space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div>
                <h2 className="text-base font-black text-[#003366] uppercase tracking-wide flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Base Comercial de Clientes
                </h2>
                <p className="text-xs text-slate-500">
                  Dados sincronizados em tempo real com a tabela 'clientes'. Permite editar, excluir e emitir relatório.
                </p>
              </div>
              <button
                onClick={() => setShowAddClientModal(true)}
                className="px-4 py-2 bg-[#003366] hover:bg-[#002244] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 rounded-none shadow-sm transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                Novo Cliente
              </button>
            </div>

            <div className="bg-white border border-slate-200 rounded-none shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Nome do Cliente</th>
                      <th className="py-3 px-4">NIF / Contribuinte</th>
                      <th className="py-3 px-4">Telefone</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Província</th>
                      <th className="py-3 px-4 text-right">Saldo Inicial</th>
                      <th className="py-3 px-4 text-center">Ações de Gestão</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredClientes.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500">
                          Nenhum cliente cadastrado no banco de dados.
                        </td>
                      </tr>
                    ) : (
                      filteredClientes.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {c.nome}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-700">
                            {c.nif || c.contribuinte || '999999999'}
                          </td>
                          <td className="py-3 px-4 text-slate-600">{c.telefone || '—'}</td>
                          <td className="py-3 px-4 text-slate-600">{c.email || '—'}</td>
                          <td className="py-3 px-4 text-slate-600">{c.provincia || 'Luanda'}</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                            {formatKz(Number(c.saldo_inicial) || 0)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              
                              <button
                                onClick={() => {
                                  setNewDeal(prev => ({
                                    ...prev,
                                    cliente_nome: c.nome,
                                    cliente_id: String(c.id || '')
                                  }));
                                  setShowAddDealModal(true);
                                }}
                                className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 text-[11px] font-bold uppercase rounded-none border border-blue-200 transition-all"
                              >
                                + Negócio
                              </button>

                              <button
                                onClick={() => setViewItem({
                                  title: `Ficha do Cliente: ${c.nome}`,
                                  data: {
                                    'Nome': c.nome,
                                    'NIF': c.nif || c.contribuinte || 'Consumidor Final',
                                    'Telefone': c.telefone || 'Não informado',
                                    'Email': c.email || 'Não informado',
                                    'Morada': c.morada || c.endereco || 'Não informada',
                                    'Província': c.provincia || 'Luanda',
                                    'Saldo Inicial': formatKz(Number(c.saldo_inicial) || 0),
                                    'Status': c.activo !== false ? 'Ativo' : 'Inativo'
                                  }
                                })}
                                title="Ver Detalhes"
                                className="p-1 text-slate-500 hover:text-blue-700 hover:bg-slate-100 rounded-none"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => setEditingCliente(c)}
                                title="Editar Cliente"
                                className="p-1 text-slate-500 hover:text-amber-700 hover:bg-slate-100 rounded-none"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => handleDeleteCliente(c.id!)}
                                title="Excluir Cliente"
                                className="p-1 text-slate-500 hover:text-rose-700 hover:bg-slate-100 rounded-none"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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

          </div>
        )}

        {/* 3. SEÇÃO: GESTÃO CRM EMPRESAS */}
        {activeTab === 'empresas' && (
          <div className="space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div>
                <h2 className="text-base font-black text-[#003366] uppercase tracking-wide flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-purple-600" />
                  Contas Empresariais & Corporativas
                </h2>
                <p className="text-xs text-slate-500">
                  Visualização das empresas cadastradas no sistema Supabase.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredEmpresas.length === 0 ? (
                <div className="col-span-full py-12 text-center bg-white border border-slate-200 p-8 rounded-none text-slate-500">
                  Nenhuma empresa registada no banco de dados.
                </div>
              ) : (
                filteredEmpresas.map((emp) => {
                  const nome = emp.nome || emp.nome_comercial || emp.razao_social || 'Empresa';
                  return (
                    <div key={emp.id} className="bg-white border border-slate-200 p-4 rounded-none shadow-sm space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#003366] text-white flex items-center justify-center font-bold text-sm rounded-none">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 line-clamp-1 uppercase">{nome}</h3>
                            <span className="text-xs font-mono font-bold text-slate-500">NIF: {emp.nif || '—'}</span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-none">
                          Ativa
                        </span>
                      </div>

                      <div className="space-y-1 text-xs text-slate-600 pt-2 border-t border-slate-100">
                        {emp.email && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span className="truncate">{emp.email}</span>
                          </div>
                        )}
                        {emp.telefone && (
                          <div className="flex items-center gap-2 text-slate-600">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{emp.telefone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-slate-600">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>{emp.provincia || emp.cidade || 'Angola'}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setViewItem({
                            title: `Ficha Corporativa: ${nome}`,
                            data: {
                              'Razão Social': nome,
                              'NIF': emp.nif || 'Não informado',
                              'Email': emp.email || 'Não informado',
                              'Telefone': emp.telefone || 'Não informado',
                              'Endereço': emp.endereco || 'Não informado',
                              'Cidade/Província': `${emp.cidade || ''} / ${emp.provincia || 'Angola'}`,
                              'Status': 'Ativa',
                              'Criada em': emp.created_at || 'Data anterior'
                            }
                          })}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold uppercase rounded-none"
                        >
                          Ver Detalhes
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        )}

        {/* 4. SEÇÃO: GESTÃO CRM PROJETOS */}
        {activeTab === 'projetos' && (
          <div className="space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div>
                <h2 className="text-base font-black text-[#003366] uppercase tracking-wide flex items-center gap-2">
                  <FolderKanban className="w-5 h-5 text-amber-600" />
                  Projetos, Obras & Contratos
                </h2>
                <p className="text-xs text-slate-500">
                  Controle orçamentário, prazos e clientes vinculados na tabela 'proj_projetos'.
                </p>
              </div>
              <button
                onClick={() => setShowAddProjetoModal(true)}
                className="px-4 py-2 bg-[#003366] hover:bg-[#002244] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 rounded-none shadow-sm transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                Novo Projeto
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredProjetos.length === 0 ? (
                <div className="col-span-full py-12 text-center bg-white border border-slate-200 p-8 rounded-none text-slate-500">
                  Nenhum projeto cadastrado no banco de dados.
                </div>
              ) : (
                filteredProjetos.map((proj) => (
                  <div key={proj.id} className="bg-white border border-slate-200 p-4 rounded-none shadow-sm space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 uppercase line-clamp-1">{proj.nome}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{proj.cliente_nome || 'Cliente do Projeto'}</p>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200 rounded-none">
                        {proj.status}
                      </span>
                    </div>

                    {proj.descricao && (
                      <p className="text-xs text-slate-600 line-clamp-2">{proj.descricao}</p>
                    )}

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-semibold uppercase">Orçamento:</span>
                      <span className="font-mono font-black text-emerald-700">
                        {formatKz(Number(proj.orcamento) || 0)}
                      </span>
                    </div>

                    {proj.data_inicio && (
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span>Início: {proj.data_inicio}</span>
                        {proj.data_fim && <span>Término: {proj.data_fim}</span>}
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setViewItem({
                          title: `Ficha de Projeto: ${proj.nome}`,
                          data: {
                            'Nome do Projeto': proj.nome,
                            'Cliente': proj.cliente_nome || 'Não definido',
                            'Orçamento Aprovado': formatKz(Number(proj.orcamento) || 0),
                            'Status': proj.status,
                            'Data Início': proj.data_inicio || 'Não estipulada',
                            'Data Previsão Término': proj.data_fim || 'Não estipulada',
                            'Descrição': proj.descricao || 'Sem descrição cadastrada'
                          }
                        })}
                        className="p-1 text-slate-500 hover:text-blue-700 hover:bg-slate-100 rounded-none"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setEditingProjeto(proj)}
                        className="p-1 text-slate-500 hover:text-amber-700 hover:bg-slate-100 rounded-none"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteProjeto(proj.id)}
                        className="p-1 text-slate-500 hover:text-rose-700 hover:bg-slate-100 rounded-none"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                ))
              )}
            </div>

          </div>
        )}

        {/* 5. SEÇÃO: ADICIONAR GESTÃO CRM (Central de Ações Rápidas) */}
        {activeTab === 'adicionar' && (
          <div className="space-y-4">
            
            <div className="border-b border-slate-200 pb-2">
              <h2 className="text-base font-black text-[#003366] uppercase tracking-wide flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-emerald-600" />
                Central de Cadastro e Operações Comerciais
              </h2>
              <p className="text-xs text-slate-500">
                Escolha a entidade para cadastrar diretamente no banco de dados com integridade multi-tenant.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
              
              <div 
                onClick={() => setShowAddDealModal(true)}
                className="bg-white border-2 border-slate-200 hover:border-[#003366] p-5 cursor-pointer transition-all rounded-none shadow-sm group"
              >
                <div className="w-10 h-10 bg-blue-50 text-blue-700 flex items-center justify-center mb-3 rounded-none">
                  <DollarSign className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 uppercase">Criar Negócio Comercial</h3>
                <p className="text-xs text-slate-500 mt-1 mb-3">
                  Registrar proposta, probabilidade, cliente e valor em pipeline.
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-[#003366] uppercase group-hover:underline">
                  Abrir Formulário <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>

              <div 
                onClick={() => setShowAddClientModal(true)}
                className="bg-white border-2 border-slate-200 hover:border-[#003366] p-5 cursor-pointer transition-all rounded-none shadow-sm group"
              >
                <div className="w-10 h-10 bg-purple-50 text-purple-700 flex items-center justify-center mb-3 rounded-none">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 uppercase">Cadastrar Novo Cliente</h3>
                <p className="text-xs text-slate-500 mt-1 mb-3">
                  Registrar novo cliente com NIF AGT, telefone e email.
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-[#003366] uppercase group-hover:underline">
                  Abrir Formulário <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>

              <div 
                onClick={() => setShowAddProjetoModal(true)}
                className="bg-white border-2 border-slate-200 hover:border-[#003366] p-5 cursor-pointer transition-all rounded-none shadow-sm group"
              >
                <div className="w-10 h-10 bg-amber-50 text-amber-700 flex items-center justify-center mb-3 rounded-none">
                  <FolderKanban className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 uppercase">Iniciar Novo Projeto</h3>
                <p className="text-xs text-slate-500 mt-1 mb-3">
                  Criar projeto vinculado a clientes com orçamentos e prazos.
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-[#003366] uppercase group-hover:underline">
                  Abrir Formulário <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>

              <div 
                onClick={() => setShowAddAtividadeModal(true)}
                className="bg-white border-2 border-slate-200 hover:border-[#003366] p-5 cursor-pointer transition-all rounded-none shadow-sm group"
              >
                <div className="w-10 h-10 bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3 rounded-none">
                  <Calendar className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 uppercase">Agendar Interação Comercial</h3>
                <p className="text-xs text-slate-500 mt-1 mb-3">
                  Registrar reunião, telefonema ou envio de proposta comercial.
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-[#003366] uppercase group-hover:underline">
                  Abrir Formulário <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>

            </div>

            {/* Atividades Registadas */}
            <div className="bg-white border border-slate-200 p-4 rounded-none shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-sm font-black text-[#003366] uppercase flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  Follow-ups e Atividades Agendadas
                </h3>
                <button
                  onClick={() => setShowAddAtividadeModal(true)}
                  className="px-3 py-1.5 bg-[#003366] hover:bg-[#002244] text-white text-xs font-bold uppercase rounded-none"
                >
                  + Agendar
                </button>
              </div>

              {atividades.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  Nenhuma atividade cadastrada no momento.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {atividades.map((act) => (
                    <div key={act.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 bg-slate-100 flex items-center justify-center rounded-none font-bold text-slate-700">
                          {act.tipo === 'reuniao' && <Calendar className="w-3.5 h-3.5 text-blue-600" />}
                          {act.tipo === 'chamada' && <Phone className="w-3.5 h-3.5 text-emerald-600" />}
                          {act.tipo === 'email' && <Mail className="w-3.5 h-3.5 text-indigo-600" />}
                          {act.tipo === 'proposta' && <FileText className="w-3.5 h-3.5 text-amber-600" />}
                          {act.tipo === 'tarefa' && <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900">{act.titulo}</h4>
                          <p className="text-[11px] text-slate-500">
                            {act.cliente_nome ? `Cliente: ${act.cliente_nome} • ` : ''}
                            Responsável: {act.responsavel || 'Equipa de Vendas'}
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-slate-100 text-slate-700 rounded-none border border-slate-200">
                        {act.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* 6. SEÇÃO: RELATÓRIOS & IMPRESSÃO DEDICADA */}
        {activeTab === 'relatorios' && (
          <div className="space-y-4">
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-base font-black text-[#003366] uppercase tracking-wide flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                  Centro de Relatórios Comerciais & Impressão
                </h2>
                <p className="text-xs text-slate-500">
                  Relatórios analíticos consolidados com dados reais do Supabase prontos para impressão oficial ou PDF.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-5 py-2.5 bg-[#003366] hover:bg-[#002244] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 rounded-none shadow-sm transition-all"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir Página / Salvar PDF
                </button>
              </div>
            </div>

            {/* Sub-navegação de Relatórios */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              {(['geral', 'negocios', 'clientes', 'empresas', 'projetos'] as const).map((sec) => (
                <button
                  key={sec}
                  onClick={() => setActiveReportSection(sec)}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-none border ${
                    activeReportSection === sec
                      ? 'bg-[#003366] text-white border-[#003366]'
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {sec === 'geral' ? 'Resumo Geral' : `Relatório ${sec}`}
                </button>
              ))}
            </div>

            {/* Conteúdo do Relatório */}
            <div className="bg-white border border-slate-300 p-8 rounded-none shadow-sm space-y-6 print:border-none print:p-0">
              
              <div className="border-b-2 border-[#003366] pb-4 flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-black text-[#003366] uppercase">
                    RELATÓRIO COMERCIAL DO CRM
                  </h1>
                  <p className="text-xs text-slate-600 font-semibold mt-0.5">
                    Empresa: {companyData?.nome || companyData?.name || 'IMATEC ERP'} • Emissão: {new Date().toLocaleDateString('pt-AO')} {new Date().toLocaleTimeString('pt-AO')}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-700 font-mono">CONFIDENCIAL</span>
                </div>
              </div>

              {activeReportSection === 'geral' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-none">
                      <span className="text-[11px] font-bold text-slate-500 uppercase">Clientes Cadastrados</span>
                      <p className="text-xl font-black text-slate-900 mt-1">{metrics.totalClientes}</p>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-none">
                      <span className="text-[11px] font-bold text-slate-500 uppercase">Negócios em Pipeline</span>
                      <p className="text-xl font-black text-blue-700 font-mono mt-1">{formatKz(metrics.valorTotalPipeline)}</p>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-none">
                      <span className="text-[11px] font-bold text-slate-500 uppercase">Receita Ganha</span>
                      <p className="text-xl font-black text-emerald-700 font-mono mt-1">{formatKz(metrics.valorTotalGanho)}</p>
                    </div>
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-none">
                      <span className="text-[11px] font-bold text-slate-500 uppercase">Taxa de Conversão</span>
                      <p className="text-xl font-black text-indigo-700 mt-1">{metrics.taxaConversao}%</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-[#003366] uppercase mb-2">Resumo dos Negócios Recentes</h3>
                    <table className="w-full text-left text-xs border border-slate-200">
                      <thead className="bg-slate-100 font-bold uppercase text-slate-700">
                        <tr>
                          <th className="p-2 border">Título</th>
                          <th className="p-2 border">Cliente</th>
                          <th className="p-2 border">Etapa</th>
                          <th className="p-2 border text-right">Valor (Kz)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deals.slice(0, 10).map(d => (
                          <tr key={d.id}>
                            <td className="p-2 border font-medium">{d.titulo}</td>
                            <td className="p-2 border">{d.cliente_nome}</td>
                            <td className="p-2 border uppercase font-bold text-[10px]">{d.etapa}</td>
                            <td className="p-2 border text-right font-mono font-bold text-emerald-700">{formatKz(d.valor)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeReportSection === 'negocios' && (
                <div>
                  <h3 className="text-sm font-bold text-[#003366] uppercase mb-2">Relatório Completo de Pipeline</h3>
                  <table className="w-full text-left text-xs border border-slate-200">
                    <thead className="bg-slate-100 font-bold uppercase text-slate-700">
                      <tr>
                        <th className="p-2 border">Título do Negócio</th>
                        <th className="p-2 border">Cliente Vinculado</th>
                        <th className="p-2 border">Etapa</th>
                        <th className="p-2 border text-center">Probabilidade</th>
                        <th className="p-2 border text-right">Valor Estimado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deals.map(d => (
                        <tr key={d.id}>
                          <td className="p-2 border font-bold text-slate-900">{d.titulo}</td>
                          <td className="p-2 border">{d.cliente_nome}</td>
                          <td className="p-2 border font-bold uppercase text-[10px]">{d.etapa}</td>
                          <td className="p-2 border text-center font-mono">{d.probabilidade}%</td>
                          <td className="p-2 border text-right font-mono font-bold text-emerald-700">{formatKz(d.valor)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeReportSection === 'clientes' && (
                <div>
                  <h3 className="text-sm font-bold text-[#003366] uppercase mb-2">Relação Comercial de Clientes</h3>
                  <table className="w-full text-left text-xs border border-slate-200">
                    <thead className="bg-slate-100 font-bold uppercase text-slate-700">
                      <tr>
                        <th className="p-2 border">Nome do Cliente</th>
                        <th className="p-2 border">NIF</th>
                        <th className="p-2 border">Telefone</th>
                        <th className="p-2 border">Email</th>
                        <th className="p-2 border">Província</th>
                        <th className="p-2 border text-right">Saldo Inicial</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientes.map(c => (
                        <tr key={c.id}>
                          <td className="p-2 border font-bold text-slate-900">{c.nome}</td>
                          <td className="p-2 border font-mono">{c.nif || c.contribuinte || '999999999'}</td>
                          <td className="p-2 border">{c.telefone || '—'}</td>
                          <td className="p-2 border">{c.email || '—'}</td>
                          <td className="p-2 border">{c.provincia || 'Luanda'}</td>
                          <td className="p-2 border text-right font-mono font-bold text-emerald-700">{formatKz(Number(c.saldo_inicial) || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeReportSection === 'projetos' && (
                <div>
                  <h3 className="text-sm font-bold text-[#003366] uppercase mb-2">Relação de Projetos e Contratos</h3>
                  <table className="w-full text-left text-xs border border-slate-200">
                    <thead className="bg-slate-100 font-bold uppercase text-slate-700">
                      <tr>
                        <th className="p-2 border">Projeto</th>
                        <th className="p-2 border">Cliente</th>
                        <th className="p-2 border">Status</th>
                        <th className="p-2 border">Início</th>
                        <th className="p-2 border text-right">Orçamento (Kz)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projetos.map(p => (
                        <tr key={p.id}>
                          <td className="p-2 border font-bold text-slate-900">{p.nome}</td>
                          <td className="p-2 border">{p.cliente_nome || '—'}</td>
                          <td className="p-2 border font-bold uppercase text-[10px]">{p.status}</td>
                          <td className="p-2 border">{p.data_inicio || '—'}</td>
                          <td className="p-2 border text-right font-mono font-bold text-emerald-700">{formatKz(Number(p.orcamento) || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeReportSection === 'empresas' && (
                <div>
                  <h3 className="text-sm font-bold text-[#003366] uppercase mb-2">Relação de Empresas Registadas</h3>
                  <table className="w-full text-left text-xs border border-slate-200">
                    <thead className="bg-slate-100 font-bold uppercase text-slate-700">
                      <tr>
                        <th className="p-2 border">Razão Social</th>
                        <th className="p-2 border">NIF</th>
                        <th className="p-2 border">Email</th>
                        <th className="p-2 border">Telefone</th>
                        <th className="p-2 border">Localidade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {empresas.map(e => (
                        <tr key={e.id}>
                          <td className="p-2 border font-bold text-slate-900">{e.nome || e.nome_comercial || 'Empresa'}</td>
                          <td className="p-2 border font-mono">{e.nif || '—'}</td>
                          <td className="p-2 border">{e.email || '—'}</td>
                          <td className="p-2 border">{e.telefone || '—'}</td>
                          <td className="p-2 border">{e.provincia || e.cidade || 'Angola'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

            </div>

          </div>
        )}

      </main>

      {/* ── MODAIS DE CADASTRO ── */}

      {/* MODAL: NOVO NEGÓCIO */}
      {showAddDealModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#003366] max-w-lg w-full p-6 shadow-2xl rounded-none space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-black text-[#003366] uppercase flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                Registar Oportunidade / Negócio
              </h3>
              <button onClick={() => setShowAddDealModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDeal} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold uppercase mb-1">Título do Negócio *</label>
                <input
                  type="text"
                  required
                  value={newDeal.titulo}
                  onChange={(e) => setNewDeal({ ...newDeal, titulo: e.target.value })}
                  placeholder="Ex: Fornecimento de Software ERP 2026"
                  className="w-full bg-[#f8fafc] border border-slate-300 rounded-none px-3 py-2 text-slate-800 focus:outline-none focus:border-[#003366]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">Cliente Associado</label>
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
                    className="w-full bg-[#f8fafc] border border-slate-300 rounded-none px-3 py-2 text-slate-800 focus:outline-none focus:border-[#003366]"
                  >
                    <option value="">Selecione...</option>
                    {clientes.map(c => (
                      <option key={c.id} value={c.nome}>{c.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">Valor Estimado (Kz) *</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    required
                    value={newDeal.valor}
                    onChange={(e) => setNewDeal({ ...newDeal, valor: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#f8fafc] border border-slate-300 rounded-none px-3 py-2 text-slate-800 font-mono font-bold focus:outline-none focus:border-[#003366]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">Etapa Inicial</label>
                  <select
                    value={newDeal.etapa}
                    onChange={(e) => setNewDeal({ ...newDeal, etapa: e.target.value as Deal['etapa'] })}
                    className="w-full bg-[#f8fafc] border border-slate-300 rounded-none px-3 py-2 text-slate-800 focus:outline-none focus:border-[#003366]"
                  >
                    {ETAPAS_DEAL.map(e => (
                      <option key={e.id} value={e.id}>{e.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">Probabilidade (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newDeal.probabilidade}
                    onChange={(e) => setNewDeal({ ...newDeal, probabilidade: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[#f8fafc] border border-slate-300 rounded-none px-3 py-2 text-slate-800 font-mono focus:outline-none focus:border-[#003366]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold uppercase mb-1">Data Prevista de Fecho</label>
                <input
                  type="date"
                  value={newDeal.data_fecho_prevista}
                  onChange={(e) => setNewDeal({ ...newDeal, data_fecho_prevista: e.target.value })}
                  className="w-full bg-[#f8fafc] border border-slate-300 rounded-none px-3 py-2 text-slate-800 focus:outline-none focus:border-[#003366]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold uppercase mb-1">Observações Comerciais</label>
                <textarea
                  rows={2}
                  value={newDeal.observacoes}
                  onChange={(e) => setNewDeal({ ...newDeal, observacoes: e.target.value })}
                  className="w-full bg-[#f8fafc] border border-slate-300 rounded-none px-3 py-2 text-slate-800 focus:outline-none focus:border-[#003366]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddDealModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold uppercase rounded-none"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#003366] hover:bg-[#002244] text-white font-bold uppercase rounded-none shadow-sm"
                >
                  Salvar Negócio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOVO CLIENTE */}
      {showAddClientModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#003366] max-w-lg w-full p-6 shadow-2xl rounded-none space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-black text-[#003366] uppercase flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Cadastrar Novo Cliente
              </h3>
              <button onClick={() => setShowAddClientModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold uppercase mb-1">Nome Completo / Empresa *</label>
                <input
                  type="text"
                  required
                  value={newClient.nome}
                  onChange={(e) => setNewClient({ ...newClient, nome: e.target.value })}
                  className="w-full bg-[#f8fafc] border border-slate-300 rounded-none px-3 py-2 text-slate-800 focus:outline-none focus:border-[#003366]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">NIF / Contribuinte</label>
                  <input
                    type="text"
                    value={newClient.nif}
                    onChange={(e) => setNewClient({ ...newClient, nif: e.target.value })}
                    placeholder="999999999 ou NIF AGT"
                    className="w-full bg-[#f8fafc] border border-slate-300 rounded-none px-3 py-2 text-slate-800 font-mono focus:outline-none focus:border-[#003366]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">Telefone</label>
                  <input
                    type="text"
                    value={newClient.telefone}
                    onChange={(e) => setNewClient({ ...newClient, telefone: e.target.value })}
                    className="w-full bg-[#f8fafc] border border-slate-300 rounded-none px-3 py-2 text-slate-800 focus:outline-none focus:border-[#003366]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">Email</label>
                  <input
                    type="email"
                    value={newClient.email}
                    onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                    className="w-full bg-[#f8fafc] border border-slate-300 rounded-none px-3 py-2 text-slate-800 focus:outline-none focus:border-[#003366]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">Província</label>
                  <select
                    value={newClient.provincia}
                    onChange={(e) => setNewClient({ ...newClient, provincia: e.target.value })}
                    className="w-full bg-[#f8fafc] border border-slate-300 rounded-none px-3 py-2 text-slate-800 focus:outline-none focus:border-[#003366]"
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
                <label className="block text-slate-700 font-bold uppercase mb-1">Endereço / Morada</label>
                <input
                  type="text"
                  value={newClient.endereco}
                  onChange={(e) => setNewClient({ ...newClient, endereco: e.target.value })}
                  className="w-full bg-[#f8fafc] border border-slate-300 rounded-none px-3 py-2 text-slate-800 focus:outline-none focus:border-[#003366]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddClientModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold uppercase rounded-none"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#003366] hover:bg-[#002244] text-white font-bold uppercase rounded-none shadow-sm"
                >
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOVO PROJETO */}
      {showAddProjetoModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#003366] max-w-lg w-full p-6 shadow-2xl rounded-none space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-black text-[#003366] uppercase flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-amber-600" />
                Criar Novo Projeto / Obra
              </h3>
              <button onClick={() => setShowAddProjetoModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProjeto} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold uppercase mb-1">Nome do Projeto *</label>
                <input
                  type="text"
                  required
                  value={newProjeto.nome}
                  onChange={(e) => setNewProjeto({ ...newProjeto, nome: e.target.value })}
                  placeholder="Ex: Instalação de Servidores e Redes"
                  className="w-full bg-[#f8fafc] border border-slate-300 rounded-none px-3 py-2 text-slate-800 focus:outline-none focus:border-[#003366]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">Cliente Vinculado</label>
                  <select
                    value={newProjeto.cliente_nome}
                    onChange={(e) => setNewProjeto({ ...newProjeto, cliente_nome: e.target.value })}
                    className="w-full bg-[#f8fafc] border border-slate-300 rounded-none px-3 py-2 text-slate-800 focus:outline-none focus:border-[#003366]"
                  >
                    <option value="">Selecione...</option>
                    {clientes.map(c => (
                      <option key={c.id} value={c.nome}>{c.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">Orçamento Previsto (Kz)</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={newProjeto.orcamento}
                    onChange={(e) => setNewProjeto({ ...newProjeto, orcamento: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#f8fafc] border border-slate-300 rounded-none px-3 py-2 text-slate-800 font-mono font-bold focus:outline-none focus:border-[#003366]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">Data Início</label>
                  <input
                    type="date"
                    value={newProjeto.data_inicio}
                    onChange={(e) => setNewProjeto({ ...newProjeto, data_inicio: e.target.value })}
                    className="w-full bg-[#f8fafc] border border-slate-300 rounded-none px-3 py-2 text-slate-800 focus:outline-none focus:border-[#003366]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">Previsão Término</label>
                  <input
                    type="date"
                    value={newProjeto.data_fim}
                    onChange={(e) => setNewProjeto({ ...newProjeto, data_fim: e.target.value })}
                    className="w-full bg-[#f8fafc] border border-slate-300 rounded-none px-3 py-2 text-slate-800 focus:outline-none focus:border-[#003366]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold uppercase mb-1">Descrição</label>
                <textarea
                  rows={2}
                  value={newProjeto.descricao}
                  onChange={(e) => setNewProjeto({ ...newProjeto, descricao: e.target.value })}
                  className="w-full bg-[#f8fafc] border border-slate-300 rounded-none px-3 py-2 text-slate-800 focus:outline-none focus:border-[#003366]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddProjetoModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold uppercase rounded-none"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#003366] hover:bg-[#002244] text-white font-bold uppercase rounded-none shadow-sm"
                >
                  Gravar Projeto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NOVA ATIVIDADE */}
      {showAddAtividadeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#003366] max-w-lg w-full p-6 shadow-2xl rounded-none space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-black text-[#003366] uppercase flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                Agendar Atividade Comercial
              </h3>
              <button onClick={() => setShowAddAtividadeModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAtividade} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold uppercase mb-1">Título da Atividade *</label>
                <input
                  type="text"
                  required
                  value={newAtividade.titulo}
                  onChange={(e) => setNewAtividade({ ...newAtividade, titulo: e.target.value })}
                  placeholder="Ex: Apresentação da Proposta Comercial"
                  className="w-full bg-[#f8fafc] border border-slate-300 rounded-none px-3 py-2 text-slate-800 focus:outline-none focus:border-[#003366]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">Tipo</label>
                  <select
                    value={newAtividade.tipo}
                    onChange={(e) => setNewAtividade({ ...newAtividade, tipo: e.target.value as AtividadeItem['tipo'] })}
                    className="w-full bg-[#f8fafc] border border-slate-300 rounded-none px-3 py-2 text-slate-800 focus:outline-none focus:border-[#003366]"
                  >
                    <option value="reuniao">Reunião</option>
                    <option value="chamada">Chamada Telefónica</option>
                    <option value="email">Envio de Email</option>
                    <option value="proposta">Entrega de Proposta</option>
                    <option value="tarefa">Tarefa</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">Cliente</label>
                  <select
                    value={newAtividade.cliente_nome}
                    onChange={(e) => setNewAtividade({ ...newAtividade, cliente_nome: e.target.value })}
                    className="w-full bg-[#f8fafc] border border-slate-300 rounded-none px-3 py-2 text-slate-800 focus:outline-none focus:border-[#003366]"
                  >
                    <option value="">Selecione...</option>
                    {clientes.map(c => (
                      <option key={c.id} value={c.nome}>{c.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold uppercase mb-1">Data e Hora</label>
                <input
                  type="datetime-local"
                  value={newAtividade.data_agendada}
                  onChange={(e) => setNewAtividade({ ...newAtividade, data_agendada: e.target.value })}
                  className="w-full bg-[#f8fafc] border border-slate-300 rounded-none px-3 py-2 text-slate-800 focus:outline-none focus:border-[#003366]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold uppercase mb-1">Notas / Detalhes</label>
                <textarea
                  rows={2}
                  value={newAtividade.descricao}
                  onChange={(e) => setNewAtividade({ ...newAtividade, descricao: e.target.value })}
                  className="w-full bg-[#f8fafc] border border-slate-300 rounded-none px-3 py-2 text-slate-800 focus:outline-none focus:border-[#003366]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddAtividadeModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold uppercase rounded-none"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#003366] hover:bg-[#002244] text-white font-bold uppercase rounded-none shadow-sm"
                >
                  Agendar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAIS DE EDIÇÃO ── */}

      {/* EDITAR DEAL */}
      {editingDeal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#003366] max-w-lg w-full p-6 shadow-2xl rounded-none space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-black text-[#003366] uppercase flex items-center gap-2">
                <Edit className="w-5 h-5 text-amber-600" />
                Editar Negócio Comercial
              </h3>
              <button onClick={() => setEditingDeal(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditDeal} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold uppercase mb-1">Título</label>
                <input
                  type="text"
                  required
                  value={editingDeal.titulo}
                  onChange={(e) => setEditingDeal({ ...editingDeal, titulo: e.target.value })}
                  className="w-full bg-[#f8fafc] border border-slate-300 rounded-none px-3 py-2 text-slate-800 focus:outline-none focus:border-[#003366]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">Cliente</label>
                  <input
                    type="text"
                    value={editingDeal.cliente_nome}
                    onChange={(e) => setEditingDeal({ ...editingDeal, cliente_nome: e.target.value })}
                    className="w-full bg-[#f8fafc] border border-slate-300 rounded-none px-3 py-2 text-slate-800 focus:outline-none focus:border-[#003366]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">Valor (Kz)</label>
                  <input
                    type="number"
                    min="0"
                    value={editingDeal.valor}
                    onChange={(e) => setEditingDeal({ ...editingDeal, valor: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#f8fafc] border border-slate-300 rounded-none px-3 py-2 text-slate-800 font-mono font-bold focus:outline-none focus:border-[#003366]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">Etapa</label>
                  <select
                    value={editingDeal.etapa}
                    onChange={(e) => setEditingDeal({ ...editingDeal, etapa: e.target.value as Deal['etapa'] })}
                    className="w-full bg-[#f8fafc] border border-slate-300 rounded-none px-3 py-2 text-slate-800 focus:outline-none focus:border-[#003366]"
                  >
                    {ETAPAS_DEAL.map(e => (
                      <option key={e.id} value={e.id}>{e.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">Probabilidade (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editingDeal.probabilidade}
                    onChange={(e) => setEditingDeal({ ...editingDeal, probabilidade: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[#f8fafc] border border-slate-300 rounded-none px-3 py-2 text-slate-800 font-mono focus:outline-none focus:border-[#003366]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingDeal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold uppercase rounded-none"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#003366] hover:bg-[#002244] text-white font-bold uppercase rounded-none shadow-sm"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDITAR CLIENTE */}
      {editingCliente && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#003366] max-w-lg w-full p-6 shadow-2xl rounded-none space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-black text-[#003366] uppercase flex items-center gap-2">
                <Edit className="w-5 h-5 text-amber-600" />
                Editar Dados do Cliente
              </h3>
              <button onClick={() => setEditingCliente(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditCliente} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold uppercase mb-1">Nome do Cliente</label>
                <input
                  type="text"
                  required
                  value={editingCliente.nome}
                  onChange={(e) => setEditingCliente({ ...editingCliente, nome: e.target.value })}
                  className="w-full bg-[#f8fafc] border border-slate-300 rounded-none px-3 py-2 text-slate-800 focus:outline-none focus:border-[#003366]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">NIF</label>
                  <input
                    type="text"
                    value={editingCliente.nif || editingCliente.contribuinte || ''}
                    onChange={(e) => setEditingCliente({ ...editingCliente, nif: e.target.value, contribuinte: e.target.value })}
                    className="w-full bg-[#f8fafc] border border-slate-300 rounded-none px-3 py-2 text-slate-800 font-mono focus:outline-none focus:border-[#003366]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">Telefone</label>
                  <input
                    type="text"
                    value={editingCliente.telefone || ''}
                    onChange={(e) => setEditingCliente({ ...editingCliente, telefone: e.target.value })}
                    className="w-full bg-[#f8fafc] border border-slate-300 rounded-none px-3 py-2 text-slate-800 focus:outline-none focus:border-[#003366]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">Email</label>
                  <input
                    type="email"
                    value={editingCliente.email || ''}
                    onChange={(e) => setEditingCliente({ ...editingCliente, email: e.target.value })}
                    className="w-full bg-[#f8fafc] border border-slate-300 rounded-none px-3 py-2 text-slate-800 focus:outline-none focus:border-[#003366]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">Saldo Inicial (Kz)</label>
                  <input
                    type="number"
                    value={editingCliente.saldo_inicial || 0}
                    onChange={(e) => setEditingCliente({ ...editingCliente, saldo_inicial: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#f8fafc] border border-slate-300 rounded-none px-3 py-2 text-slate-800 font-mono focus:outline-none focus:border-[#003366]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingCliente(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold uppercase rounded-none"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#003366] hover:bg-[#002244] text-white font-bold uppercase rounded-none shadow-sm"
                >
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDITAR PROJETO */}
      {editingProjeto && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#003366] max-w-lg w-full p-6 shadow-2xl rounded-none space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-black text-[#003366] uppercase flex items-center gap-2">
                <Edit className="w-5 h-5 text-amber-600" />
                Editar Projeto / Obra
              </h3>
              <button onClick={() => setEditingProjeto(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditProjeto} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold uppercase mb-1">Nome do Projeto</label>
                <input
                  type="text"
                  required
                  value={editingProjeto.nome}
                  onChange={(e) => setEditingProjeto({ ...editingProjeto, nome: e.target.value })}
                  className="w-full bg-[#f8fafc] border border-slate-300 rounded-none px-3 py-2 text-slate-800 focus:outline-none focus:border-[#003366]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">Status</label>
                  <select
                    value={editingProjeto.status}
                    onChange={(e) => setEditingProjeto({ ...editingProjeto, status: e.target.value })}
                    className="w-full bg-[#f8fafc] border border-slate-300 rounded-none px-3 py-2 text-slate-800 focus:outline-none focus:border-[#003366]"
                  >
                    <option value="Em Planeamento">Em Planeamento</option>
                    <option value="Em Execução">Em Execução</option>
                    <option value="Em Revisão">Em Revisão</option>
                    <option value="Concluído">Concluído</option>
                    <option value="Suspenso">Suspenso</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold uppercase mb-1">Orçamento (Kz)</label>
                  <input
                    type="number"
                    min="0"
                    value={editingProjeto.orcamento || 0}
                    onChange={(e) => setEditingProjeto({ ...editingProjeto, orcamento: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#f8fafc] border border-slate-300 rounded-none px-3 py-2 text-slate-800 font-mono font-bold focus:outline-none focus:border-[#003366]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold uppercase mb-1">Descrição</label>
                <textarea
                  rows={2}
                  value={editingProjeto.descricao || ''}
                  onChange={(e) => setEditingProjeto({ ...editingProjeto, descricao: e.target.value })}
                  className="w-full bg-[#f8fafc] border border-slate-300 rounded-none px-3 py-2 text-slate-800 focus:outline-none focus:border-[#003366]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingProjeto(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold uppercase rounded-none"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#003366] hover:bg-[#002244] text-white font-bold uppercase rounded-none shadow-sm"
                >
                  Salvar Projeto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: VER FICHA DETALHADA DO ITEM ── */}
      {viewItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#003366] max-w-lg w-full p-6 shadow-2xl rounded-none space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-black text-[#003366] uppercase flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-600" />
                {viewItem.title}
              </h3>
              <button onClick={() => setViewItem(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs divide-y divide-slate-100">
              {Object.entries(viewItem.data).map(([k, v]) => (
                <div key={k} className="pt-2 flex justify-between items-start gap-4">
                  <span className="font-bold text-slate-500 uppercase">{k}:</span>
                  <span className="font-medium text-slate-800 text-right">{String(v || '—')}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase rounded-none flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                Imprimir
              </button>
              <button
                onClick={() => setViewItem(null)}
                className="px-5 py-2 bg-[#003366] hover:bg-[#002244] text-white text-xs font-bold uppercase rounded-none"
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

export default CrmNegociosModule;
