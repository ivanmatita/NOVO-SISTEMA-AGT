import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Banknote, Calendar, Heart, PieChart, Plus, Download, Edit, Trash2, HeartHandshake,
  BookOpen, Music, Activity, Target, Shield, MapPin, Search, BarChart3, TrendingUp,
  FileText, Save, ChevronLeft, RefreshCw, CheckCircle, AlertTriangle, Cross, DollarSign,
  Package, Store, Eye, Printer, Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';

interface ChurchProps {
  user?: any;
  companyData?: any;
  onNavigate?: (tab: string) => void;
  onEmitirFatura?: () => void;
  fiscalYear?: string;
}

type TabType = 'dashboard' | 'membros' | 'departamentos' | 'dizimos' | 'eventos' | 'patrimonio' | 'missoes' | 'relatorios';
type ViewMode = 'list' | 'form';

interface Membro {
  id?: string; nome: string; cargo: string; departamento?: string; telefone?: string;
  email?: string; provincia?: string; municipio?: string; data_nascimento?: string;
  data_baptismo?: string; status: string; observacoes?: string;
}
interface DizimoOferta {
  id?: string; tipo: string; membro_id?: string; doador_nome?: string; valor_aoa: number;
  data_movimento: string; metodo_pagamento: string; referencia?: string; status: string; observacoes?: string;
}
interface EventoCulto {
  id?: string; titulo: string; tipo: string; data_evento: string; hora_evento?: string;
  local?: string; capacidade_estimada?: number; orcamento_aoa?: number; status: string; descricao?: string;
}
interface Ministerio {
  id?: string; nome: string; lider_nome?: string; total_integrantes: number;
  dia_reuniao?: string; hora_reuniao?: string; descricao?: string;
}
interface PatrimonioIgreja {
  id?: string; nome_item: string; categoria: string; valor_estimado_aoa: number;
  estado_conservacao: string; localizacao?: string; data_aquisicao?: string; observacoes?: string;
}

const PROVINCIAS_ANGOLA = [
  'Bengo','Benguela','Bié','Cabinda','Cuando Cubango','Cuanza Norte',
  'Cuanza Sul','Cunene','Huambo','Huíla','Luanda','Lunda Norte',
  'Lunda Sul','Malanje','Moxico','Namibe','Uíge','Zaire'
];

const fmtAOA = (v: number) => new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 }).format(v || 0);
const fmtNum = (v: number) => new Intl.NumberFormat('pt-AO').format(v || 0);

// SVG Inline BarChart
const ChurchBarChart = ({ data, label, color = '#003366' }: { data: { name: string; value: number }[]; label: string; color?: string }) => {
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

export default function ChurchModule({ user, companyData, onNavigate, onEmitirFatura, fiscalYear = '2026' }: ChurchProps) {
  const empresaId: string = user?.empresa_id || user?.company_id || companyData?.id || user?.id || '00000000-0000-0000-0000-000000000000';

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // States
  const [membros, setMembros] = useState<Membro[]>([]);
  const [dizimos, setDizimos] = useState<DizimoOferta[]>([]);
  const [eventos, setEventos] = useState<EventoCulto[]>([]);
  const [ministerios, setMinisterios] = useState<Ministerio[]>([]);
  const [patrimonio, setPatrimonio] = useState<PatrimonioIgreja[]>([]);

  // Form States
  const emptyMembro: Membro = { nome:'', cargo:'Membro', provincia:'Luanda', status:'Ativo' };
  const emptyDizimo: DizimoOferta = { tipo:'Dízimo', doador_nome:'', valor_aoa:0, data_movimento: new Date().toISOString().split('T')[0], metodo_pagamento:'TPA / Multicaixa', status:'Confirmado' };
  const emptyEvento: EventoCulto = { titulo:'', tipo:'Culto Dominical', data_evento: new Date().toISOString().split('T')[0], status:'Agendado', capacidade_estimada:200, orcamento_aoa:0 };
  const emptyMinisterio: Ministerio = { nome:'', total_integrantes:1, dia_reuniao:'Sábado' };
  const emptyPatrimonio: PatrimonioIgreja = { nome_item:'', categoria:'Equipamento de Som', valor_estimado_aoa:0, estado_conservacao:'Bom' };

  const [formMembro, setFormMembro] = useState<Membro>(emptyMembro);
  const [formDizimo, setFormDizimo] = useState<DizimoOferta>(emptyDizimo);
  const [formEvento, setFormEvento] = useState<EventoCulto>(emptyEvento);
  const [formMinisterio, setFormMinisterio] = useState<Ministerio>(emptyMinisterio);
  const [formPatrimonio, setFormPatrimonio] = useState<PatrimonioIgreja>(emptyPatrimonio);

  // Fetch Supabase
  const fetchAll = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const year = fiscalYear || new Date().getFullYear().toString();
      const [mRes, dRes, eRes, minRes, pRes] = await Promise.all([
        supabase.from('church_membros').select('*').eq('empresa_id', empresaId).is('deleted_at', null).order('nome'),
        supabase.from('church_dizimos_ofertas').select('*').eq('empresa_id', empresaId).like('data_movimento', `${year}%`).is('deleted_at', null).order('data_movimento', { ascending: false }),
        supabase.from('church_eventos').select('*').eq('empresa_id', empresaId).like('data_evento', `${year}%`).is('deleted_at', null).order('data_evento', { ascending: false }),
        supabase.from('church_ministerios').select('*').eq('empresa_id', empresaId).is('deleted_at', null).order('nome'),
        supabase.from('church_patrimonio').select('*').eq('empresa_id', empresaId).is('deleted_at', null).order('nome_item'),
      ]);
      if (mRes.data) setMembros(mRes.data);
      if (dRes.data) setDizimos(dRes.data);
      if (eRes.data) setEventos(eRes.data);
      if (minRes.data) setMinisterios(minRes.data);
      if (pRes.data) setPatrimonio(pRes.data);
    } catch (err) {
      console.error('Erro ao carregar dados de Igreja:', err);
    } finally {
      setLoading(false);
    }
  }, [empresaId, fiscalYear]);

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
    if (activeTab === 'membros') setFormMembro(emptyMembro);
    if (activeTab === 'dizimos') setFormDizimo(emptyDizimo);
    if (activeTab === 'eventos') setFormEvento(emptyEvento);
    if (activeTab === 'departamentos') setFormMinisterio(emptyMinisterio);
    if (activeTab === 'patrimonio') setFormPatrimonio(emptyPatrimonio);
    setViewMode('form');
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    if (activeTab === 'membros') setFormMembro(item);
    if (activeTab === 'dizimos') setFormDizimo(item);
    if (activeTab === 'eventos') setFormEvento(item);
    if (activeTab === 'departamentos') setFormMinisterio(item);
    if (activeTab === 'patrimonio') setFormPatrimonio(item);
    setViewMode('form');
  };

  const filterList = (list: any[]) =>
    list.filter(item => Object.values(item).some(v => String(v).toLowerCase().includes(searchTerm.toLowerCase())));

  // Dashboard Stats
  const totalMembrosAtivos = membros.filter(m => m.status === 'Ativo').length;
  const totalDizimosAOA = dizimos.filter(d => d.tipo === 'Dízimo').reduce((s, d) => s + Number(d.valor_aoa || 0), 0);
  const totalOfertasAOA = dizimos.filter(d => d.tipo !== 'Dízimo').reduce((s, d) => s + Number(d.valor_aoa || 0), 0);
  const valorPatrimonioTotal = patrimonio.reduce((s, p) => s + Number(p.valor_estimado_aoa || 0), 0);

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      'Ativo':'bg-emerald-100 text-emerald-800','Confirmado':'bg-emerald-100 text-emerald-800','Agendado':'bg-blue-100 text-blue-800',
      'Inativo':'bg-zinc-100 text-zinc-600','Pendente':'bg-amber-100 text-amber-800','Cancelado':'bg-red-100 text-red-800','Concluído':'bg-emerald-100 text-emerald-800',
      'Bom':'bg-emerald-100 text-emerald-800','Regular':'bg-amber-100 text-amber-800','Danificado':'bg-red-100 text-red-800'
    };
    return `px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-sm ${map[s] || 'bg-zinc-100 text-zinc-600'}`;
  };

  // Form rendering
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
              <Cross size={20} /> {isEdit ? 'Editar Registo' : 'Novo Registo'} — {activeTab.toUpperCase()}
            </h2>
            <p className="text-xs text-zinc-500">Preencha os campos abaixo e clique em Guardar.</p>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 shadow-sm p-6">
          {activeTab === 'membros' && (
            <form onSubmit={async e => { e.preventDefault(); await saveRecord('church_membros', formMembro, editingItem?.id); }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Nome Completo *</label><input required className="w-full bg-zinc-50 border p-2 text-sm" value={formMembro.nome} onChange={e => setFormMembro({...formMembro, nome: e.target.value})} /></div>
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Cargo / Função</label>
                  <select className="w-full bg-zinc-50 border p-2 text-sm" value={formMembro.cargo} onChange={e => setFormMembro({...formMembro, cargo: e.target.value})}>
                    {['Pastor','Pastor Auxiliar','Diácono','Diaconisa','Presbítero','Líder de Louvor','Obreiro','Membro','Visitante'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Telefone</label><input className="w-full bg-zinc-50 border p-2 text-sm" value={formMembro.telefone||''} onChange={e => setFormMembro({...formMembro, telefone: e.target.value})} /></div>
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">E-mail</label><input type="email" className="w-full bg-zinc-50 border p-2 text-sm" value={formMembro.email||''} onChange={e => setFormMembro({...formMembro, email: e.target.value})} /></div>
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Província</label>
                  <select className="w-full bg-zinc-50 border p-2 text-sm" value={formMembro.provincia||'Luanda'} onChange={e => setFormMembro({...formMembro, provincia: e.target.value})}>
                    {PROVINCIAS_ANGOLA.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Data Baptismo</label><input type="date" className="w-full bg-zinc-50 border p-2 text-sm" value={formMembro.data_baptismo||''} onChange={e => setFormMembro({...formMembro, data_baptismo: e.target.value})} /></div>
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Estado</label>
                  <select className="w-full bg-zinc-50 border p-2 text-sm" value={formMembro.status} onChange={e => setFormMembro({...formMembro, status: e.target.value})}>
                    <option value="Ativo">Ativo</option><option value="Inativo">Inativo</option><option value="Transferido">Transferido</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setViewMode('list')} className="px-6 py-2 bg-zinc-100 font-bold text-xs uppercase">Cancelar</button>
                <button type="submit" disabled={saving} className="px-8 py-2 bg-[#003366] text-white font-bold text-xs uppercase"><Save size={14} className="inline mr-1"/>Guardar</button>
              </div>
            </form>
          )}

          {activeTab === 'dizimos' && (
            <form onSubmit={async e => { e.preventDefault(); await saveRecord('church_dizimos_ofertas', formDizimo, editingItem?.id); }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Tipo de Entrada *</label>
                  <select className="w-full bg-zinc-50 border p-2 text-sm" value={formDizimo.tipo} onChange={e => setFormDizimo({...formDizimo, tipo: e.target.value})}>
                    {['Dízimo','Oferta de Culto','Oferta Especial','Fundo de Construção','Missões','Ação Social'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Nome do Doador / Membro</label><input className="w-full bg-zinc-50 border p-2 text-sm" placeholder="Deixe em branco para anónimo" value={formDizimo.doador_nome||''} onChange={e => setFormDizimo({...formDizimo, doador_nome: e.target.value})} /></div>
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Valor (AOA) *</label><input required type="number" min="0" className="w-full bg-zinc-50 border p-2 text-sm" value={formDizimo.valor_aoa} onChange={e => setFormDizimo({...formDizimo, valor_aoa: +e.target.value})} /></div>
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Data *</label><input required type="date" className="w-full bg-zinc-50 border p-2 text-sm" value={formDizimo.data_movimento} onChange={e => setFormDizimo({...formDizimo, data_movimento: e.target.value})} /></div>
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Método Pagamento</label>
                  <select className="w-full bg-zinc-50 border p-2 text-sm" value={formDizimo.metodo_pagamento} onChange={e => setFormDizimo({...formDizimo, metodo_pagamento: e.target.value})}>
                    {['TPA / Multicaixa','Transferência Bancária','Espécie / Caixas','MCX Express'].map(m => <option key={m}>{m}</option>)}
                  </select>
                </div>
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Nº Comprovativo / Ref.</label><input className="w-full bg-zinc-50 border p-2 text-sm" value={formDizimo.referencia||''} onChange={e => setFormDizimo({...formDizimo, referencia: e.target.value})} /></div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setViewMode('list')} className="px-6 py-2 bg-zinc-100 font-bold text-xs uppercase">Cancelar</button>
                <button type="submit" disabled={saving} className="px-8 py-2 bg-[#003366] text-white font-bold text-xs uppercase"><Save size={14} className="inline mr-1"/>Guardar Entrada</button>
              </div>
            </form>
          )}

          {activeTab === 'eventos' && (
            <form onSubmit={async e => { e.preventDefault(); await saveRecord('church_eventos', formEvento, editingItem?.id); }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Título do Evento *</label><input required className="w-full bg-zinc-50 border p-2 text-sm" value={formEvento.titulo} onChange={e => setFormEvento({...formEvento, titulo: e.target.value})} /></div>
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Tipo</label>
                  <select className="w-full bg-zinc-50 border p-2 text-sm" value={formEvento.tipo} onChange={e => setFormEvento({...formEvento, tipo: e.target.value})}>
                    {['Culto Dominical','Culto de Ensino','Vigília','Conferência','Seminário','Reunião de Jovens','Retiro'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Data *</label><input required type="date" className="w-full bg-zinc-50 border p-2 text-sm" value={formEvento.data_evento} onChange={e => setFormEvento({...formEvento, data_evento: e.target.value})} /></div>
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Hora</label><input type="time" className="w-full bg-zinc-50 border p-2 text-sm" value={formEvento.hora_evento||''} onChange={e => setFormEvento({...formEvento, hora_evento: e.target.value})} /></div>
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Local</label><input className="w-full bg-zinc-50 border p-2 text-sm" value={formEvento.local||''} onChange={e => setFormEvento({...formEvento, local: e.target.value})} placeholder="Santuário Principal..." /></div>
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Orçamento (AOA)</label><input type="number" min="0" className="w-full bg-zinc-50 border p-2 text-sm" value={formEvento.orcamento_aoa||0} onChange={e => setFormEvento({...formEvento, orcamento_aoa: +e.target.value})} /></div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setViewMode('list')} className="px-6 py-2 bg-zinc-100 font-bold text-xs uppercase">Cancelar</button>
                <button type="submit" disabled={saving} className="px-8 py-2 bg-[#003366] text-white font-bold text-xs uppercase"><Save size={14} className="inline mr-1"/>Guardar Evento</button>
              </div>
            </form>
          )}

          {activeTab === 'departamentos' && (
            <form onSubmit={async e => { e.preventDefault(); await saveRecord('church_ministerios', formMinisterio, editingItem?.id); }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Nome do Ministério *</label><input required className="w-full bg-zinc-50 border p-2 text-sm" value={formMinisterio.nome} onChange={e => setFormMinisterio({...formMinisterio, nome: e.target.value})} placeholder="Ex: Ministério de Louvor" /></div>
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Líder Responsável</label><input className="w-full bg-zinc-50 border p-2 text-sm" value={formMinisterio.lider_nome||''} onChange={e => setFormMinisterio({...formMinisterio, lider_nome: e.target.value})} /></div>
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Nº Integrantes</label><input type="number" min="1" className="w-full bg-zinc-50 border p-2 text-sm" value={formMinisterio.total_integrantes} onChange={e => setFormMinisterio({...formMinisterio, total_integrantes: +e.target.value})} /></div>
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Dia Reunião</label><input className="w-full bg-zinc-50 border p-2 text-sm" value={formMinisterio.dia_reuniao||''} onChange={e => setFormMinisterio({...formMinisterio, dia_reuniao: e.target.value})} placeholder="Ex: Sábado às 16h" /></div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setViewMode('list')} className="px-6 py-2 bg-zinc-100 font-bold text-xs uppercase">Cancelar</button>
                <button type="submit" disabled={saving} className="px-8 py-2 bg-[#003366] text-white font-bold text-xs uppercase"><Save size={14} className="inline mr-1"/>Guardar Ministério</button>
              </div>
            </form>
          )}

          {activeTab === 'patrimonio' && (
            <form onSubmit={async e => { e.preventDefault(); await saveRecord('church_patrimonio', formPatrimonio, editingItem?.id); }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Nome do Item *</label><input required className="w-full bg-zinc-50 border p-2 text-sm" value={formPatrimonio.nome_item} onChange={e => setFormPatrimonio({...formPatrimonio, nome_item: e.target.value})} /></div>
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Categoria</label>
                  <select className="w-full bg-zinc-50 border p-2 text-sm" value={formPatrimonio.categoria} onChange={e => setFormPatrimonio({...formPatrimonio, categoria: e.target.value})}>
                    {['Equipamento de Som','Instrumento Musical','Mobiliário','Viatura / Transporte','Informática','Imóvel / Edifício'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Valor Estimado (AOA)</label><input type="number" min="0" className="w-full bg-zinc-50 border p-2 text-sm" value={formPatrimonio.valor_estimado_aoa} onChange={e => setFormPatrimonio({...formPatrimonio, valor_estimado_aoa: +e.target.value})} /></div>
                <div><label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">Estado Conservação</label>
                  <select className="w-full bg-zinc-50 border p-2 text-sm" value={formPatrimonio.estado_conservacao} onChange={e => setFormPatrimonio({...formPatrimonio, estado_conservacao: e.target.value})}>
                    <option value="Excelente">Excelente</option><option value="Bom">Bom</option><option value="Regular">Regular</option><option value="Danificado">Danificado</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setViewMode('list')} className="px-6 py-2 bg-zinc-100 font-bold text-xs uppercase">Cancelar</button>
                <button type="submit" disabled={saving} className="px-8 py-2 bg-[#003366] text-white font-bold text-xs uppercase"><Save size={14} className="inline mr-1"/>Guardar Item</button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    );
  }

  // Header & Main View
  const tabs = [
    { id: 'dashboard',     label: 'Resumo Geral',      icon: BarChart3  },
    { id: 'membros',       label: 'Rol de Membros',    icon: Users      },
    { id: 'dizimos',       label: 'Dízimos & Ofertas', icon: Banknote   },
    { id: 'eventos',       label: 'Cultos & Eventos',   icon: Calendar   },
    { id: 'departamentos', label: 'Ministérios',       icon: Target     },
    { id: 'patrimonio',    label: 'Património & Bens',  icon: Package    },
    { id: 'relatorios',    label: 'Relatórios & Mapa',  icon: FileText   },
  ];

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="bg-white border border-zinc-200 shadow-sm p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black text-[#003366] flex items-center gap-2"><Cross size={26}/> Gestão Ecuménica & Igreja</h2>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Exercício {fiscalYear} Ativo
            </span>
          </div>
          <p className="text-zinc-500 text-sm mt-1">Administração de membros, tesouraria espiritual, dízimos, cultos e ministérios — Angola</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchAll} disabled={loading} className="p-2 border text-zinc-500 hover:text-[#003366] rounded-sm"><RefreshCw size={16} className={loading ? 'animate-spin' : ''}/></button>
          <button onClick={() => {
            if (onEmitirFatura) onEmitirFatura();
            else if (onNavigate) onNavigate('invoices');
          }} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 rounded-sm shadow-sm transition-colors">
            <FileText size={14}/> Emitir Fatura / Recibo
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

        {['membros','dizimos','eventos','departamentos','patrimonio'].includes(activeTab) && (
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
              { l: 'Membros Activos', v: fmtNum(totalMembrosAtivos), icon: Users, c: 'blue' },
              { l: 'Dízimos Acumulados', v: fmtAOA(totalDizimosAOA), icon: Banknote, c: 'emerald' },
              { l: 'Ofertas Acumuladas', v: fmtAOA(totalOfertasAOA), icon: Heart, c: 'amber' },
              { l: 'Valor Património', v: fmtAOA(valorPatrimonioTotal), icon: Package, c: 'purple' },
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
              <ChurchBarChart label="Dízimos & Entradas (AOA)"
                data={dizimos.slice(0, 6).map(d => ({ name: d.doador_nome || d.tipo, value: d.valor_aoa }))}
              />
            </div>
            <div className="bg-white border border-zinc-200 shadow-sm p-5 space-y-3">
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Próximos Cultos & Eventos</p>
              {eventos.slice(0, 4).map(e => (
                <div key={e.id} className="p-3 bg-zinc-50 border border-zinc-100 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-sm text-[#003366]">{e.titulo}</p>
                    <p className="text-[10px] text-zinc-500">{e.data_evento} • {e.local || 'Santuário'}</p>
                  </div>
                  <span className={statusBadge(e.status)}>{e.status}</span>
                </div>
              ))}
              {eventos.length === 0 && <p className="text-zinc-400 text-sm">Nenhum evento agendado.</p>}
            </div>
          </div>
        </div>
      )}

      {/* Membros List */}
      {activeTab === 'membros' && (
        <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#003366] text-white text-[11px] uppercase">
              <tr>
                <th className="p-3">Nome</th><th className="p-3">Cargo</th><th className="p-3">Telefone</th>
                <th className="p-3">Província</th><th className="p-3 text-center">Status</th><th className="p-3 text-center">Acções</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filterList(membros).map(m => (
                <tr key={m.id} className="hover:bg-zinc-50">
                  <td className="p-3 font-bold text-zinc-800">{m.nome}</td>
                  <td className="p-3 text-zinc-600">{m.cargo}</td>
                  <td className="p-3 text-zinc-500 text-xs">{m.telefone || '—'}</td>
                  <td className="p-3 text-zinc-600">{m.provincia || 'Luanda'}</td>
                  <td className="p-3 text-center"><span className={statusBadge(m.status)}>{m.status}</span></td>
                  <td className="p-3 text-center">
                    <button onClick={() => openEdit(m)} className="p-1 text-zinc-400 hover:text-[#003366] mr-1"><Edit size={13}/></button>
                    <button onClick={() => setDeleteConfirm(m.id!)} className="p-1 text-zinc-400 hover:text-red-600"><Trash2 size={13}/></button>
                  </td>
                </tr>
              ))}
              {filterList(membros).length === 0 && <tr><td colSpan={6} className="p-8 text-center text-zinc-400">Nenhum membro registado.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Dizimos List */}
      {activeTab === 'dizimos' && (
        <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#003366] text-white text-[11px] uppercase">
              <tr>
                <th className="p-3">Data</th><th className="p-3">Tipo</th><th className="p-3">Doador / Membro</th>
                <th className="p-3 text-right">Valor (AOA)</th><th className="p-3">Método</th><th className="p-3 text-center">Status</th><th className="p-3 text-center">Acções</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filterList(dizimos).map(d => (
                <tr key={d.id} className="hover:bg-zinc-50">
                  <td className="p-3 text-xs text-zinc-500">{d.data_movimento}</td>
                  <td className="p-3 font-bold text-zinc-800">{d.tipo}</td>
                  <td className="p-3 text-zinc-600">{d.doador_nome || 'Anónimo'}</td>
                  <td className="p-3 text-right font-bold text-emerald-700">{fmtAOA(d.valor_aoa)}</td>
                  <td className="p-3 text-xs text-zinc-500">{d.metodo_pagamento}</td>
                  <td className="p-3 text-center"><span className={statusBadge(d.status)}>{d.status}</span></td>
                  <td className="p-3 text-center">
                    <button onClick={() => openEdit(d)} className="p-1 text-zinc-400 hover:text-[#003366] mr-1"><Edit size={13}/></button>
                    <button onClick={() => setDeleteConfirm(d.id!)} className="p-1 text-zinc-400 hover:text-red-600"><Trash2 size={13}/></button>
                  </td>
                </tr>
              ))}
              {filterList(dizimos).length === 0 && <tr><td colSpan={7} className="p-8 text-center text-zinc-400">Nenhum registo de dízimo/oferta.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Relatorios & Export */}
      {activeTab === 'relatorios' && (
        <div className="bg-white border border-zinc-200 shadow-sm p-6 space-y-5">
          <h3 className="font-bold text-[#003366] text-base">Exportar Dados & Relatórios da Igreja</h3>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => {
              const rows = ['Nome,Cargo,Telefone,Provincia,Status', ...membros.map(m => `${m.nome},${m.cargo},${m.telefone||''},${m.provincia||''},${m.status}`)];
              const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
              const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'membros_igreja.csv'; a.click();
            }} className="px-5 py-2 bg-emerald-600 text-white font-bold text-xs uppercase flex items-center gap-2 rounded-sm">
              <Download size={13}/> CSV Membros
            </button>
            <button onClick={() => {
              const rows = ['Data,Tipo,Doador,Valor AOA,Metodo,Status', ...dizimos.map(d => `${d.data_movimento},${d.tipo},${d.doador_nome||''},${d.valor_aoa},${d.metodo_pagamento},${d.status}`)];
              const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
              const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'dizimos_ofertas.csv'; a.click();
            }} className="px-5 py-2 bg-blue-600 text-white font-bold text-xs uppercase flex items-center gap-2 rounded-sm">
              <Download size={13}/> CSV Dízimos & Ofertas
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
                  const map: Record<string, string> = { membros:'church_membros', dizimos:'church_dizimos_ofertas', eventos:'church_eventos', departamentos:'church_ministerios', patrimonio:'church_patrimonio' };
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
