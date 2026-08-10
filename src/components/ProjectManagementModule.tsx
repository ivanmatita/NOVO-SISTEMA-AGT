import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, FileText, Users, Settings, Plus, CheckCircle, Clock,
  MoreVertical, Search, Filter, AlertCircle, BarChart3, TrendingUp, DollarSign,
  Briefcase, Calendar, ChevronRight, Play, Pause, Square, Trash2, Edit,
  CheckCircle2, Info, X, PieChart, Layers, Target, Activity, Zap, Shield,
  Download, MapPin, ChevronLeft, RefreshCw, Save, FolderPlus, UserPlus, FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';

interface ProjectProps {
  user?: any;
  companyData?: any;
  onNavigate?: (tab: string) => void;
  onEmitirFatura?: () => void;
}

type TabType = 'dashboard' | 'projetos' | 'kanban' | 'equipa' | 'orcamento' | 'milestones' | 'relatorios';
type ViewMode = 'list' | 'form';

interface Projeto {
  id?: string; nome: string; cliente: string; descricao?: string;
  orcamento_total_aoa: number; orcamento_executado_aoa: number;
  progresso_pct: number; data_inicio?: string; data_fim_prevista?: string;
  status: string; prioridade: string; gerente_nome?: string; categoria?: string; provincia?: string;
}

interface TarefaProj {
  id?: string; projeto_id?: string; nome: string; responsavel_nome?: string;
  status: string; prioridade: string; horas_estimadas?: number; data_limite?: string; projeto_nome?: string;
}

interface RecursoEquipa {
  id?: string; nome: string; cargo: string; email?: string;
  custo_hora_aoa: number; disponibilidade_pct: number; projetos_ativos_count: number;
}

interface CustoProjeto {
  id?: string; projeto_id?: string; descricao: string; categoria: string;
  valor_aoa: number; data_custo: string; status_pagamento: string; projeto_nome?: string;
}

const PROVINCIAS_ANGOLA = [
  'Bengo','Benguela','Bié','Cabinda','Cuando Cubango','Cuanza Norte',
  'Cuanza Sul','Cunene','Huambo','Huíla','Luanda','Lunda Norte',
  'Lunda Sul','Malanje','Moxico','Namibe','Uíge','Zaire'
];

const fmtAOA = (v: number) => new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 }).format(v || 0);
const fmtNum = (v: number) => new Intl.NumberFormat('pt-AO').format(v || 0);

const ProjBarChart = ({ data, label, color = '#003366' }: { data: { name: string; value: number }[]; label: string; color?: string }) => {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div>
      <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">{label}</p>
      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-[10px] text-zinc-600 w-28 truncate font-medium">{d.name}</span>
            <div className="flex-1 bg-zinc-100 rounded-full h-4 overflow-hidden">
              <div className="h-4 rounded-full transition-all duration-700" style={{ width: `${(d.value / max) * 100}%`, backgroundColor: color }} />
            </div>
            <span className="text-[10px] font-bold text-zinc-700 w-20 text-right">{fmtNum(d.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function ProjectManagementModule({ user, companyData, onNavigate, onEmitirFatura }: ProjectProps) {
  const empresaId: string = user?.empresa_id || user?.company_id || companyData?.id || user?.id || '00000000-0000-0000-0000-000000000000';

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // States
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [tarefas, setTarefas] = useState<TarefaProj[]>([]);
  const [recursos, setRecursos] = useState<RecursoEquipa[]>([]);
  const [custos, setCustos] = useState<CustoProjeto[]>([]);

  // Form States
  const emptyProjeto: Projeto = { nome:'', cliente:'', orcamento_total_aoa:0, orcamento_executado_aoa:0, progresso_pct:0, status:'Planeamento', prioridade:'Normal', categoria:'Infraestrutura', provincia:'Luanda' };
  const emptyTarefa: TarefaProj = { nome:'', status:'Pendente', prioridade:'Média', horas_estimadas:8 };
  const emptyRecurso: RecursoEquipa = { nome:'', cargo:'Engenheiro de Software', custo_hora_aoa:5000, disponibilidade_pct:100, projetos_ativos_count:1 };
  const emptyCusto: CustoProjeto = { descricao:'', categoria:'Materiais', valor_aoa:0, data_custo: new Date().toISOString().split('T')[0], status_pagamento:'Pendente' };

  const [formProjeto, setFormProjeto] = useState<Projeto>(emptyProjeto);
  const [formTarefa, setFormTarefa] = useState<TarefaProj>(emptyTarefa);
  const [formRecurso, setFormRecurso] = useState<RecursoEquipa>(emptyRecurso);
  const [formCusto, setFormCusto] = useState<CustoProjeto>(emptyCusto);

  // Fetch
  const fetchAll = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const [pRes, tRes, rRes, cRes] = await Promise.all([
        supabase.from('proj_projetos').select('*').eq('empresa_id', empresaId).is('deleted_at', null).order('nome'),
        supabase.from('proj_tarefas').select('*').eq('empresa_id', empresaId).is('deleted_at', null).order('created_at', { ascending: false }),
        supabase.from('proj_equipa_recursos').select('*').eq('empresa_id', empresaId).is('deleted_at', null).order('nome'),
        supabase.from('proj_orcamentos_custos').select('*').eq('empresa_id', empresaId).is('deleted_at', null).order('data_custo', { ascending: false }),
      ]);
      if (pRes.data) setProjetos(pRes.data);
      if (tRes.data) setTarefas(tRes.data.map((t: any) => ({ ...t, projeto_nome: pRes.data?.find((p: any) => p.id === t.projeto_id)?.nome || '' })));
      if (rRes.data) setRecursos(rRes.data);
      if (cRes.data) setCustos(cRes.data.map((c: any) => ({ ...c, projeto_nome: pRes.data?.find((p: any) => p.id === c.projeto_id)?.nome || '' })));
    } catch (e) {
      console.error('Erro ao carregar dados de Projetos:', e);
    } finally {
      setLoading(false);
    }
  }, [empresaId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Save
  const saveRecord = async (table: string, payload: any, id?: string) => {
    setSaving(true);
    try {
      const row = { ...payload, empresa_id: empresaId };
      if (id) {
        const { error } = await supabase.from(table).update(row).eq('id', id).eq('empresa_id', empresaId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(table).insert({ ...row, created_by: user?.id });
        if (error) throw error;
      }
      await fetchAll();
      setViewMode('list');
      setEditingItem(null);
    } catch (e: any) {
      alert('Erro ao guardar: ' + (e?.message || JSON.stringify(e)));
    } finally {
      setSaving(false);
    }
  };

  // Delete
  const deleteRecord = async (table: string, id: string) => {
    const { error } = await supabase.from(table).update({ deleted_at: new Date().toISOString() }).eq('id', id).eq('empresa_id', empresaId);
    if (error) alert('Erro ao apagar: ' + error.message);
    else { await fetchAll(); setDeleteConfirm(null); }
  };

  const openNew = () => {
    setEditingItem(null);
    if (activeTab === 'projetos') setFormProjeto(emptyProjeto);
    if (activeTab === 'kanban') setFormTarefa(emptyTarefa);
    if (activeTab === 'equipa') setFormRecurso(emptyRecurso);
    if (activeTab === 'orcamento') setFormCusto(emptyCusto);
    setViewMode('form');
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    if (activeTab === 'projetos') setFormProjeto(item);
    if (activeTab === 'kanban') setFormTarefa(item);
    if (activeTab === 'equipa') setFormRecurso(item);
    if (activeTab === 'orcamento') setFormCusto(item);
    setViewMode('form');
  };

  const filterList = (list: any[]) =>
    list.filter(item => Object.values(item).some(v => String(v).toLowerCase().includes(searchTerm.toLowerCase())));

  // Dashboard Stats
  const projetosAtivos = projetos.filter(p => p.status !== 'Concluído').length;
  const orcamentoTotal = projetos.reduce((s, p) => s + Number(p.orcamento_total_aoa || 0), 0);
  const orcamentoExecutado = projetos.reduce((s, p) => s + Number(p.orcamento_executado_aoa || 0), 0);
  const tarefasConcluidas = tarefas.filter(t => t.status === 'Concluído').length;

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      'Em Progresso':'bg-blue-100 text-blue-800','Concluído':'bg-emerald-100 text-emerald-800','Planeamento':'bg-zinc-100 text-zinc-800',
      'Atrasado':'bg-red-100 text-red-800','Pendente':'bg-amber-100 text-amber-800','Pago':'bg-emerald-100 text-emerald-800'
    };
    return `px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-sm ${map[s] || 'bg-zinc-100 text-zinc-600'}`;
  };

  // Form View
  if (viewMode === 'form') {
    const isEdit = !!editingItem?.id;
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="bg-white border border-zinc-200 shadow-sm p-5 flex items-center gap-4">
          <button onClick={() => { setViewMode('list'); setEditingItem(null); }} className="p-2 hover:bg-zinc-100 rounded-sm text-zinc-500">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className="font-black text-[#003366] text-lg flex items-center gap-2">
              <Briefcase size={20} /> {isEdit ? 'Editar Registo' : 'Novo Registo'} — {activeTab.toUpperCase()}
            </h2>
            <p className="text-xs text-zinc-500">Preencha todos os campos necessários.</p>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 shadow-sm p-6">
          {activeTab === 'projetos' && (
            <form onSubmit={async e => { e.preventDefault(); await saveRecord('proj_projetos', formProjeto, editingItem?.id); }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Nome do Projeto *</label><input required className="w-full bg-zinc-50 border p-2 text-sm" value={formProjeto.nome} onChange={e => setFormProjeto({...formProjeto, nome: e.target.value})} /></div>
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Cliente / Entidade *</label><input required className="w-full bg-zinc-50 border p-2 text-sm" value={formProjeto.cliente} onChange={e => setFormProjeto({...formProjeto, cliente: e.target.value})} /></div>
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Orçamento Total (AOA) *</label><input required type="number" min="0" className="w-full bg-zinc-50 border p-2 text-sm" value={formProjeto.orcamento_total_aoa} onChange={e => setFormProjeto({...formProjeto, orcamento_total_aoa: +e.target.value})} /></div>
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Orçamento Executado (AOA)</label><input type="number" min="0" className="w-full bg-zinc-50 border p-2 text-sm" value={formProjeto.orcamento_executado_aoa} onChange={e => setFormProjeto({...formProjeto, orcamento_executado_aoa: +e.target.value})} /></div>
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Progresso (%)</label><input type="number" min="0" max="100" className="w-full bg-zinc-50 border p-2 text-sm" value={formProjeto.progresso_pct} onChange={e => setFormProjeto({...formProjeto, progresso_pct: +e.target.value})} /></div>
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Status</label>
                  <select className="w-full bg-zinc-50 border p-2 text-sm" value={formProjeto.status} onChange={e => setFormProjeto({...formProjeto, status: e.target.value})}>
                    {['Planeamento','Em Progresso','Em Revisão','Concluído','Atrasado'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Gerente de Projeto</label><input className="w-full bg-zinc-50 border p-2 text-sm" value={formProjeto.gerente_nome||''} onChange={e => setFormProjeto({...formProjeto, gerente_nome: e.target.value})} /></div>
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Província</label>
                  <select className="w-full bg-zinc-50 border p-2 text-sm" value={formProjeto.provincia||'Luanda'} onChange={e => setFormProjeto({...formProjeto, provincia: e.target.value})}>
                    {PROVINCIAS_ANGOLA.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Data Início</label><input type="date" className="w-full bg-zinc-50 border p-2 text-sm" value={formProjeto.data_inicio||''} onChange={e => setFormProjeto({...formProjeto, data_inicio: e.target.value})} /></div>
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Previsão Fim</label><input type="date" className="w-full bg-zinc-50 border p-2 text-sm" value={formProjeto.data_fim_prevista||''} onChange={e => setFormProjeto({...formProjeto, data_fim_prevista: e.target.value})} /></div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setViewMode('list')} className="px-6 py-2 bg-zinc-100 font-bold text-xs uppercase">Cancelar</button>
                <button type="submit" disabled={saving} className="px-8 py-2 bg-[#003366] text-white font-bold text-xs uppercase"><Save size={14} className="inline mr-1"/>Guardar Projeto</button>
              </div>
            </form>
          )}

          {activeTab === 'kanban' && (
            <form onSubmit={async e => { e.preventDefault(); await saveRecord('proj_tarefas', formTarefa, editingItem?.id); }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Nome da Tarefa *</label><input required className="w-full bg-zinc-50 border p-2 text-sm" value={formTarefa.nome} onChange={e => setFormTarefa({...formTarefa, nome: e.target.value})} /></div>
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Projeto</label>
                  <select className="w-full bg-zinc-50 border p-2 text-sm" value={formTarefa.projeto_id||''} onChange={e => setFormTarefa({...formTarefa, projeto_id: e.target.value})}>
                    <option value="">— Selecionar —</option>
                    {projetos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </div>
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Responsável</label><input className="w-full bg-zinc-50 border p-2 text-sm" value={formTarefa.responsavel_nome||''} onChange={e => setFormTarefa({...formTarefa, responsavel_nome: e.target.value})} /></div>
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Status</label>
                  <select className="w-full bg-zinc-50 border p-2 text-sm" value={formTarefa.status} onChange={e => setFormTarefa({...formTarefa, status: e.target.value})}>
                    {['Pendente','Em Progresso','Em Revisão','Concluído'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Prioridade</label>
                  <select className="w-full bg-zinc-50 border p-2 text-sm" value={formTarefa.prioridade} onChange={e => setFormTarefa({...formTarefa, prioridade: e.target.value})}>
                    {['Crítica','Alta','Média','Baixa'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Data Limite</label><input type="date" className="w-full bg-zinc-50 border p-2 text-sm" value={formTarefa.data_limite||''} onChange={e => setFormTarefa({...formTarefa, data_limite: e.target.value})} /></div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setViewMode('list')} className="px-6 py-2 bg-zinc-100 font-bold text-xs uppercase">Cancelar</button>
                <button type="submit" disabled={saving} className="px-8 py-2 bg-[#003366] text-white font-bold text-xs uppercase"><Save size={14} className="inline mr-1"/>Guardar Tarefa</button>
              </div>
            </form>
          )}

          {activeTab === 'equipa' && (
            <form onSubmit={async e => { e.preventDefault(); await saveRecord('proj_equipa_recursos', formRecurso, editingItem?.id); }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Nome Completo *</label><input required className="w-full bg-zinc-50 border p-2 text-sm" value={formRecurso.nome} onChange={e => setFormRecurso({...formRecurso, nome: e.target.value})} /></div>
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Cargo / Especialidade *</label><input required className="w-full bg-zinc-50 border p-2 text-sm" value={formRecurso.cargo} onChange={e => setFormRecurso({...formRecurso, cargo: e.target.value})} /></div>
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">E-mail</label><input type="email" className="w-full bg-zinc-50 border p-2 text-sm" value={formRecurso.email||''} onChange={e => setFormRecurso({...formRecurso, email: e.target.value})} /></div>
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Custo por Hora (AOA)</label><input type="number" min="0" className="w-full bg-zinc-50 border p-2 text-sm" value={formRecurso.custo_hora_aoa} onChange={e => setFormRecurso({...formRecurso, custo_hora_aoa: +e.target.value})} /></div>
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Disponibilidade (%)</label><input type="number" min="0" max="100" className="w-full bg-zinc-50 border p-2 text-sm" value={formRecurso.disponibilidade_pct} onChange={e => setFormRecurso({...formRecurso, disponibilidade_pct: +e.target.value})} /></div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setViewMode('list')} className="px-6 py-2 bg-zinc-100 font-bold text-xs uppercase">Cancelar</button>
                <button type="submit" disabled={saving} className="px-8 py-2 bg-[#003366] text-white font-bold text-xs uppercase"><Save size={14} className="inline mr-1"/>Guardar Recurso</button>
              </div>
            </form>
          )}

          {activeTab === 'orcamento' && (
            <form onSubmit={async e => { e.preventDefault(); await saveRecord('proj_orcamentos_custos', formCusto, editingItem?.id); }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Descrição do Custo *</label><input required className="w-full bg-zinc-50 border p-2 text-sm" value={formCusto.descricao} onChange={e => setFormCusto({...formCusto, descricao: e.target.value})} /></div>
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Projeto</label>
                  <select className="w-full bg-zinc-50 border p-2 text-sm" value={formCusto.projeto_id||''} onChange={e => setFormCusto({...formCusto, projeto_id: e.target.value})}>
                    <option value="">— Selecionar —</option>
                    {projetos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </div>
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Categoria</label>
                  <select className="w-full bg-zinc-50 border p-2 text-sm" value={formCusto.categoria} onChange={e => setFormCusto({...formCusto, categoria: e.target.value})}>
                    {['Materiais','Mão-de-Obra','Subcontratados','Equipamentos','Licenças','Viagens','Outro'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Valor (AOA) *</label><input required type="number" min="0" className="w-full bg-zinc-50 border p-2 text-sm" value={formCusto.valor_aoa} onChange={e => setFormCusto({...formCusto, valor_aoa: +e.target.value})} /></div>
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Data</label><input required type="date" className="w-full bg-zinc-50 border p-2 text-sm" value={formCusto.data_custo} onChange={e => setFormCusto({...formCusto, data_custo: e.target.value})} /></div>
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Status Pagamento</label>
                  <select className="w-full bg-zinc-50 border p-2 text-sm" value={formCusto.status_pagamento} onChange={e => setFormCusto({...formCusto, status_pagamento: e.target.value})}>
                    <option value="Pago">Pago</option><option value="Pendente">Pendente</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setViewMode('list')} className="px-6 py-2 bg-zinc-100 font-bold text-xs uppercase">Cancelar</button>
                <button type="submit" disabled={saving} className="px-8 py-2 bg-[#003366] text-white font-bold text-xs uppercase"><Save size={14} className="inline mr-1"/>Guardar Custo</button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    );
  }

  // Header & Lists
  const tabs = [
    { id: 'dashboard',  label: 'Resumo Geral',     icon: LayoutDashboard },
    { id: 'projetos',   label: 'Portfólio',        icon: Briefcase       },
    { id: 'kanban',     label: 'Quadro & Tarefas',  icon: Layers          },
    { id: 'equipa',     label: 'Equipa & Recursos',icon: Users           },
    { id: 'orcamento',  label: 'Orçamento & Custos',icon: DollarSign     },
    { id: 'relatorios', label: 'Relatórios & Mapa', icon: FileText        },
  ];

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="bg-white border border-zinc-200 shadow-sm p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#003366] flex items-center gap-2"><Briefcase size={26}/> Gestão de Projetos & Obras</h2>
          <p className="text-zinc-500 text-sm mt-1">Planeamento, acompanhamento orçamental, equipas e cronograma de tarefas — Angola</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchAll} disabled={loading} className="p-2 border text-zinc-500 hover:text-[#003366] rounded-sm"><RefreshCw size={16} className={loading ? 'animate-spin' : ''}/></button>
          <button onClick={() => {
            if (onEmitirFatura) onEmitirFatura();
            else if (onNavigate) onNavigate('invoices');
          }} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 rounded-sm shadow-sm transition-colors">
            <FileText size={14}/> Emitir Fatura ao Cliente
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border border-zinc-200 shadow-sm">
        <div className="flex gap-0 border-b border-zinc-100 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => { setActiveTab(t.id as TabType); setViewMode('list'); setSearchTerm(''); }}
              className={`flex items-center gap-1.5 px-4 py-3 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-colors ${
                activeTab === t.id ? 'text-[#003366] border-[#003366] bg-blue-50/50' : 'text-zinc-500 border-transparent hover:text-zinc-800'
              }`}>
              <t.icon size={13}/>{t.label}
            </button>
          ))}
        </div>

        {['projetos','kanban','equipa','orcamento'].includes(activeTab) && (
          <div className="p-3 flex items-center justify-between gap-3 bg-zinc-50 border-b">
            <div className="relative flex-1 max-w-sm">
              <Search size={13} className="absolute left-3 top-2.5 text-zinc-400"/>
              <input type="text" placeholder="Pesquisar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border bg-white focus:outline-none focus:border-[#003366] rounded-sm"/>
            </div>
            <button onClick={openNew} className="bg-[#003366] hover:bg-[#002244] text-white px-4 py-2 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 rounded-sm">
              <Plus size={14}/> Novo Registo
            </button>
          </div>
        )}
      </div>

      {/* Dashboard */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { l: 'Projetos Ativos', v: fmtNum(projetosAtivos), icon: Briefcase, c: 'blue' },
              { l: 'Orçamento Total', v: fmtAOA(orcamentoTotal), icon: DollarSign, c: 'emerald' },
              { l: 'Execução Orçamental', v: fmtAOA(orcamentoExecutado), icon: TrendingUp, c: 'purple' },
              { l: 'Tarefas Concluídas', v: fmtNum(tarefasConcluidas), icon: CheckCircle, c: 'amber' },
            ].map((k, i) => (
              <div key={i} className="bg-white border border-zinc-200 shadow-sm p-5 flex items-start gap-3">
                <div className={`p-2.5 rounded bg-${k.c}-100 text-${k.c}-700 shrink-0`}><k.icon size={20}/></div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-zinc-500">{k.l}</p>
                  <p className="text-lg font-black text-zinc-800 mt-0.5">{k.v}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-zinc-200 shadow-sm p-5">
              <ProjBarChart label="Orçamento por Projeto (AOA)"
                data={projetos.slice(0, 6).map(p => ({ name: p.nome, value: p.orcamento_total_aoa }))}
              />
            </div>
            <div className="bg-white border border-zinc-200 shadow-sm p-5 space-y-3">
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Estado dos Projetos</p>
              {projetos.slice(0, 5).map(p => (
                <div key={p.id} className="p-3 bg-zinc-50 border border-zinc-100 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-sm text-[#003366]">{p.nome}</p>
                    <p className="text-[10px] text-zinc-500">Cliente: {p.cliente} • {p.progresso_pct}% Concluído</p>
                  </div>
                  <span className={statusBadge(p.status)}>{p.status}</span>
                </div>
              ))}
              {projetos.length === 0 && <p className="text-zinc-400 text-sm">Nenhum projeto registado.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Projetos List */}
      {activeTab === 'projetos' && (
        <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#003366] text-white text-[11px] uppercase">
              <tr>
                <th className="p-3">Projeto</th><th className="p-3">Cliente</th><th className="p-3 text-right">Orçamento</th>
                <th className="p-3 text-center">Progresso</th><th className="p-3 text-center">Status</th><th className="p-3 text-center">Acções</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filterList(projetos).map(p => (
                <tr key={p.id} className="hover:bg-zinc-50">
                  <td className="p-3 font-bold text-zinc-800">{p.nome}</td>
                  <td className="p-3 text-zinc-600">{p.cliente}</td>
                  <td className="p-3 text-right font-bold text-[#003366]">{fmtAOA(p.orcamento_total_aoa)}</td>
                  <td className="p-3 text-center">
                    <div className="w-full bg-zinc-200 rounded-full h-2 overflow-hidden">
                      <div className="bg-emerald-600 h-2" style={{ width: `${p.progresso_pct}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-zinc-500">{p.progresso_pct}%</span>
                  </td>
                  <td className="p-3 text-center"><span className={statusBadge(p.status)}>{p.status}</span></td>
                  <td className="p-3 text-center">
                    <button onClick={() => openEdit(p)} className="p-1 text-zinc-400 hover:text-[#003366] mr-1"><Edit size={13}/></button>
                    <button onClick={() => setDeleteConfirm(p.id!)} className="p-1 text-zinc-400 hover:text-red-600"><Trash2 size={13}/></button>
                  </td>
                </tr>
              ))}
              {filterList(projetos).length === 0 && <tr><td colSpan={6} className="p-8 text-center text-zinc-400">Nenhum projeto registado.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Kanban / Tarefas */}
      {activeTab === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {['Pendente','Em Progresso','Concluído'].map(st => (
            <div key={st} className="bg-zinc-50 border border-zinc-200 p-4 rounded-sm space-y-3">
              <h4 className="font-bold text-xs uppercase text-zinc-600 border-b pb-2 flex justify-between">
                <span>{st}</span>
                <span className="bg-zinc-200 px-2 rounded text-[10px]">{tarefas.filter(t => t.status === st).length}</span>
              </h4>
              {tarefas.filter(t => t.status === st).map(t => (
                <div key={t.id} className="bg-white p-3 border shadow-xs space-y-2">
                  <p className="font-bold text-sm text-zinc-800">{t.nome}</p>
                  <p className="text-[10px] text-zinc-400">Resp: {t.responsavel_nome || '—'}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded">{t.prioridade}</span>
                    <div>
                      <button onClick={() => openEdit(t)} className="p-1 text-zinc-400 hover:text-[#003366] mr-1"><Edit size={12}/></button>
                      <button onClick={() => setDeleteConfirm(t.id!)} className="p-1 text-zinc-400 hover:text-red-600"><Trash2 size={12}/></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Equipa */}
      {activeTab === 'equipa' && (
        <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#003366] text-white text-[11px] uppercase">
              <tr>
                <th className="p-3">Nome</th><th className="p-3">Cargo</th><th className="p-3 text-right">Custo/Hora</th>
                <th className="p-3 text-center">Disponibilidade</th><th className="p-3 text-center">Acções</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filterList(recursos).map(r => (
                <tr key={r.id} className="hover:bg-zinc-50">
                  <td className="p-3 font-bold text-zinc-800">{r.nome}</td>
                  <td className="p-3 text-zinc-600">{r.cargo}</td>
                  <td className="p-3 text-right font-bold">{fmtAOA(r.custo_hora_aoa)}</td>
                  <td className="p-3 text-center font-mono">{r.disponibilidade_pct}%</td>
                  <td className="p-3 text-center">
                    <button onClick={() => openEdit(r)} className="p-1 text-zinc-400 hover:text-[#003366] mr-1"><Edit size={13}/></button>
                    <button onClick={() => setDeleteConfirm(r.id!)} className="p-1 text-zinc-400 hover:text-red-600"><Trash2 size={13}/></button>
                  </td>
                </tr>
              ))}
              {filterList(recursos).length === 0 && <tr><td colSpan={5} className="p-8 text-center text-zinc-400">Nenhum recurso registado.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Relatórios */}
      {activeTab === 'relatorios' && (
        <div className="bg-white border border-zinc-200 shadow-sm p-6 space-y-5">
          <h3 className="font-bold text-[#003366] text-base">Exportar Dados & Relatórios de Projetos</h3>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => {
              const rows = ['Nome,Cliente,Orcamento Total,Executado,Progresso,Status', ...projetos.map(p => `${p.nome},${p.cliente},${p.orcamento_total_aoa},${p.orcamento_executado_aoa},${p.progresso_pct},${p.status}`)];
              const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
              const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'projetos.csv'; a.click();
            }} className="px-5 py-2 bg-emerald-600 text-white font-bold text-xs uppercase flex items-center gap-2 rounded-sm">
              <Download size={13}/> CSV Projetos
            </button>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-zinc-900/60 p-4">
            <div className="bg-white p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
              <Trash2 size={32} className="text-red-600 mx-auto"/>
              <h3 className="font-bold text-lg">Apagar Registo?</h3>
              <div className="flex gap-2">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2 bg-zinc-100 font-bold text-xs">Cancelar</button>
                <button onClick={() => {
                  const map: Record<string, string> = { projetos:'proj_projetos', kanban:'proj_tarefas', equipa:'proj_equipa_recursos', orcamento:'proj_orcamentos_custos' };
                  deleteRecord(map[activeTab], deleteConfirm);
                }} className="flex-1 py-2 bg-red-600 text-white font-bold text-xs">Confirmar</button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
