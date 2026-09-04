import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Sprout, Tractor, Package, DollarSign, Search, Plus, MapPin, Calendar,
  Activity, BarChart3, CheckCircle, AlertTriangle, Leaf, Store, Edit,
  Trash2, Download, X, Save, ChevronLeft, Home, TrendingUp, Wheat,
  ShoppingCart, Truck, Wrench, CloudRain, FileText, RefreshCw, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────
type TabType = 'dashboard' | 'fazendas' | 'culturas' | 'pecuaria' | 'insumos' | 'vendas' | 'maquinaria' | 'custos' | 'clima' | 'relatorios';
type ViewMode = 'list' | 'form';

interface AgroProps {
  user?: any;
  companyData?: any;
  onNavigate?: (tab: string) => void;
  onEmitirFatura?: () => void;
  fiscalYear?: string;
}

interface Fazenda {
  id?: string; nome: string; provincia: string; municipio?: string;
  area_total_ha: number; tipo: string; tecnico_responsavel?: string;
  telefone?: string; observacoes?: string; ativa: boolean;
}
interface Cultura {
  id?: string; fazenda_id?: string; nome: string; variedade?: string;
  area_ha: number; data_plantio?: string; data_colheita_prev?: string;
  data_colheita_real?: string; status: string; est_rendimento_ton: number;
  real_rendimento_ton?: number; custo_producao: number; tecnico_responsavel?: string;
  observacoes?: string; fazenda?: string;
}
interface Animal {
  id?: string; fazenda_id?: string; tipo: string; raca?: string;
  quantidade: number; proposito: string; peso_medio_kg?: number;
  valor_mercado_aoa?: number; data_ultima_vacinacao?: string;
  data_proxima_vacina?: string; numero_lote_sanitario?: string;
  status: string; observacoes?: string; fazenda?: string;
}
interface Insumo {
  id?: string; nome: string; categoria: string; fornecedor?: string;
  local_armazem?: string; quantidade_atual: number; unidade: string;
  quantidade_minima: number; preco_unitario: number; numero_lote?: string;
  data_validade?: string; observacoes?: string;
}
interface VendaAgro {
  id?: string; produto: string; cultura_id?: string; cliente: string;
  quantidade: number; unidade: string; preco_unitario: number;
  valor_total: number; data_venda: string; transportadora?: string;
  destino?: string; numero_guia?: string; status_pagamento: string; observacoes?: string;
}
interface Maquina {
  id?: string; nome: string; tipo: string; marca?: string; modelo?: string;
  ano_fabricacao?: number; placa_matricula?: string; status: string;
  horas_uso: number; consumo_medio?: string; data_ultima_manutencao?: string;
  data_proxima_manutencao?: string; custo_manutencao_total: number; observacoes?: string;
}
interface Custo {
  id?: string; fazenda_id?: string; cultura_id?: string; descricao: string;
  categoria: string; valor_aoa: number; data_custo: string; observacoes?: string;
  fazenda?: string; cultura?: string;
}

// ─────────────────────────────────────────────────────────────────
// PROVINCIAS ANGOLA
// ─────────────────────────────────────────────────────────────────
const PROVINCIAS = [
  'Bengo','Benguela','Bié','Cabinda','Cuando Cubango','Cuanza Norte',
  'Cuanza Sul','Cunene','Huambo','Huíla','Luanda','Lunda Norte',
  'Lunda Sul','Malanje','Moxico','Namibe','Uíge','Zaire'
];

const FMT_AOA = (v: number) => new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', maximumFractionDigits: 0 }).format(v || 0);
const FMT_NUM = (v: number) => new Intl.NumberFormat('pt-AO').format(v || 0);

// ─────────────────────────────────────────────────────────────────
// ANGOLA MAP (SVG simplificado por províncias)
// ─────────────────────────────────────────────────────────────────
const AngolaMapSVG = ({ highlights = [] as string[] }) => (
  <div className="relative w-full bg-emerald-50 border border-emerald-200 rounded-md overflow-hidden p-4">
    <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-3 flex items-center gap-2">
      <MapPin size={12}/> Distribuição por Províncias
    </p>
    <div className="grid grid-cols-3 gap-1.5">
      {PROVINCIAS.map(prov => (
        <div key={prov} className={`text-[10px] font-bold py-1.5 px-2 rounded text-center transition-colors ${
          highlights.includes(prov)
            ? 'bg-emerald-600 text-white shadow-sm'
            : 'bg-white text-zinc-500 border border-zinc-200'
        }`}>
          {prov}
        </div>
      ))}
    </div>
    {highlights.length > 0 && (
      <p className="text-[10px] text-emerald-700 mt-2 font-bold">
        ● {highlights.length} {highlights.length === 1 ? 'Província' : 'Províncias'} com operações
      </p>
    )}
  </div>
);

// ─────────────────────────────────────────────────────────────────
// BAR CHART (SVG inline)
// ─────────────────────────────────────────────────────────────────
const BarChart = ({ data, label }: { data: {name: string; value: number; color?: string}[]; label: string }) => {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div>
      <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">{label}</p>
      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-[10px] text-zinc-600 w-28 truncate font-medium">{d.name}</span>
            <div className="flex-1 bg-zinc-100 rounded-full h-4 overflow-hidden">
              <div
                className="h-4 rounded-full transition-all duration-700"
                style={{ width: `${(d.value / max) * 100}%`, backgroundColor: d.color || '#059669' }}
              />
            </div>
            <span className="text-[10px] font-bold text-zinc-700 w-20 text-right">{FMT_NUM(d.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// FORM INPUT
// ─────────────────────────────────────────────────────────────────
const FI = ({ label, required, children }: any) => (
  <div>
    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);
const inputCls = "w-full bg-zinc-50 border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors rounded-sm";
const selectCls = "w-full bg-zinc-50 border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 transition-colors rounded-sm";

// ─────────────────────────────────────────────────────────────────
// MAIN MODULE
// ─────────────────────────────────────────────────────────────────
export default function AgrobusinessModule({ user, companyData, onNavigate, onEmitirFatura, fiscalYear = '2026' }: AgroProps) {
  const empresaId: string = user?.empresa_id || user?.company_id || companyData?.id || user?.id || '00000000-0000-0000-0000-000000000000';

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // ── DATA STATE ──────────────────────────────────────────────────
  const [fazendas, setFazendas] = useState<Fazenda[]>([]);
  const [culturas, setCulturas] = useState<Cultura[]>([]);
  const [animais, setAnimais] = useState<Animal[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [vendas, setVendas] = useState<VendaAgro[]>([]);
  const [maquinaria, setMaquinaria] = useState<Maquina[]>([]);
  const [custos, setCustos] = useState<Custo[]>([]);

  // ── FORM STATE ──────────────────────────────────────────────────
  const emptyFazenda: Fazenda = { nome:'', provincia: PROVINCIAS[0], area_total_ha:0, tipo:'Agrícola', ativa:true };
  const emptyCultura: Cultura = { nome:'', area_ha:0, status:'Planejado', est_rendimento_ton:0, custo_producao:0 };
  const emptyAnimal: Animal   = { tipo:'', quantidade:0, proposito:'Corte', status:'Saudável' };
  const emptyInsumo: Insumo   = { nome:'', categoria:'Semente', quantidade_atual:0, unidade:'kg', quantidade_minima:0, preco_unitario:0 };
  const emptyVenda: VendaAgro = { produto:'', cliente:'', quantidade:0, unidade:'Ton', preco_unitario:0, valor_total:0, data_venda: new Date().toISOString().split('T')[0], status_pagamento:'Pendente' };
  const emptyMaquina: Maquina = { nome:'', tipo:'Trator', status:'Operacional', horas_uso:0, custo_manutencao_total:0 };
  const emptyCusto: Custo     = { descricao:'', categoria:'Mão-de-Obra', valor_aoa:0, data_custo: new Date().toISOString().split('T')[0] };

  const [formFazenda, setFormFazenda] = useState<Fazenda>(emptyFazenda);
  const [formCultura, setFormCultura] = useState<Cultura>(emptyCultura);
  const [formAnimal, setFormAnimal]   = useState<Animal>(emptyAnimal);
  const [formInsumo, setFormInsumo]   = useState<Insumo>(emptyInsumo);
  const [formVenda, setFormVenda]     = useState<VendaAgro>(emptyVenda);
  const [formMaquina, setFormMaquina] = useState<Maquina>(emptyMaquina);
  const [formCusto, setFormCusto]     = useState<Custo>(emptyCusto);

  // ── FETCH ───────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!empresaId) return;
    setLoading(true);
    try {
      const year = fiscalYear || new Date().getFullYear().toString();
      const [faz, cul, ani, ins, ven, maq, cus] = await Promise.all([
        supabase.from('agro_fazendas').select('*').eq('empresa_id', empresaId).is('deleted_at', null).order('nome'),
        supabase.from('agro_culturas').select('*').eq('empresa_id', empresaId).is('deleted_at', null).order('created_at', { ascending: false }),
        supabase.from('agro_animais').select('*').eq('empresa_id', empresaId).is('deleted_at', null).order('created_at', { ascending: false }),
        supabase.from('agro_insumos').select('*').eq('empresa_id', empresaId).is('deleted_at', null).order('nome'),
        supabase.from('agro_vendas_agro').select('*').eq('empresa_id', empresaId).like('data_venda', `${year}%`).is('deleted_at', null).order('data_venda', { ascending: false }),
        supabase.from('agro_maquinaria').select('*').eq('empresa_id', empresaId).is('deleted_at', null).order('nome'),
        supabase.from('agro_custos').select('*').eq('empresa_id', empresaId).like('data_custo', `${year}%`).is('deleted_at', null).order('data_custo', { ascending: false }),
      ]);
      if (faz.data)  setFazendas(faz.data);
      if (cul.data)  setCulturas(cul.data.map((c: any) => ({ ...c, fazenda: faz.data?.find((f: any) => f.id === c.fazenda_id)?.nome || '' })));
      if (ani.data)  setAnimais(ani.data.map((a: any) => ({ ...a, fazenda: faz.data?.find((f: any) => f.id === a.fazenda_id)?.nome || '' })));
      if (ins.data)  setInsumos(ins.data);
      if (ven.data)  setVendas(ven.data);
      if (maq.data)  setMaquinaria(maq.data);
      if (cus.data)  setCustos(cus.data.map((c: any) => ({
        ...c,
        fazenda: faz.data?.find((f: any) => f.id === c.fazenda_id)?.nome || '',
        cultura: cul.data?.find((cu: any) => cu.id === c.cultura_id)?.nome || '',
      })));
    } catch (e) {
      console.error('Erro ao carregar dados Agro:', e);
    } finally {
      setLoading(false);
    }
  }, [empresaId, fiscalYear]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── SAVE (INSERT / UPDATE) ───────────────────────────────────────
  const saveRecord = async (table: string, payload: any, id?: string) => {
    if (!empresaId) return alert('Sessão expirada. Recarregue a página.');
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

  // ── SOFT DELETE ─────────────────────────────────────────────────
  const deleteRecord = async (table: string, id: string) => {
    if (!empresaId) return;
    const { error } = await supabase.from(table).update({ deleted_at: new Date().toISOString() }).eq('id', id).eq('empresa_id', empresaId);
    if (error) alert('Erro ao apagar: ' + error.message);
    else { await fetchAll(); setDeleteConfirm(null); }
  };

  // ── OPEN FORM ───────────────────────────────────────────────────
  const openNew = () => {
    setEditingItem(null);
    if (activeTab === 'fazendas')   setFormFazenda(emptyFazenda);
    if (activeTab === 'culturas')   setFormCultura(emptyCultura);
    if (activeTab === 'pecuaria')   setFormAnimal(emptyAnimal);
    if (activeTab === 'insumos')    setFormInsumo(emptyInsumo);
    if (activeTab === 'vendas')     setFormVenda(emptyVenda);
    if (activeTab === 'maquinaria') setFormMaquina(emptyMaquina);
    if (activeTab === 'custos')     setFormCusto(emptyCusto);
    setViewMode('form');
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    if (activeTab === 'fazendas')   setFormFazenda(item);
    if (activeTab === 'culturas')   setFormCultura(item);
    if (activeTab === 'pecuaria')   setFormAnimal(item);
    if (activeTab === 'insumos')    setFormInsumo(item);
    if (activeTab === 'vendas')     setFormVenda(item);
    if (activeTab === 'maquinaria') setFormMaquina(item);
    if (activeTab === 'custos')     setFormCusto(item);
    setViewMode('form');
  };

  // ── FILTER ──────────────────────────────────────────────────────
  const filterList = (list: any[]) =>
    list.filter(item => Object.values(item).some(v => String(v).toLowerCase().includes(searchTerm.toLowerCase())));

  // ── DASHBOARD KPIs ──────────────────────────────────────────────
  const totalAreaPlantada = culturas.reduce((s, c) => s + Number(c.area_ha || 0), 0);
  const totalAnimais      = animais.reduce((s, a) => s + Number(a.quantidade || 0), 0);
  const receitaVendas     = vendas.filter(v => v.status_pagamento === 'Pago').reduce((s, v) => s + Number(v.valor_total || 0), 0);
  const totalCustos       = custos.reduce((s, c) => s + Number(c.valor_aoa || 0), 0);
  const margemBruta       = receitaVendas - totalCustos;
  const alertasInsumos    = insumos.filter(i => Number(i.quantidade_atual) <= Number(i.quantidade_minima));
  const maqEmManutencao   = maquinaria.filter(m => m.status !== 'Operacional').length;
  const provinciasFazendas = [...new Set(fazendas.map(f => f.provincia))];

  // ─────────────────────────────────────────────────────────────────
  // RENDER — FORM VIEW (opens as embedded page)
  // ─────────────────────────────────────────────────────────────────
  if (viewMode === 'form') {
    const isEdit = !!editingItem?.id;
    const title = isEdit ? 'Editar Registo' : 'Novo Registo';

    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        {/* Page header */}
        <div className="bg-white border border-zinc-200 shadow-sm p-5 flex items-center gap-4">
          <button onClick={() => { setViewMode('list'); setEditingItem(null); }} className="p-2 hover:bg-zinc-100 rounded-sm text-zinc-500">
            <ChevronLeft size={20} />
          </button>
          <div>
            <h2 className="font-black text-emerald-800 text-lg flex items-center gap-2">
              <Leaf size={20} /> {title} — {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            </h2>
            <p className="text-xs text-zinc-500">Preencha todos os campos obrigatórios e clique em Guardar.</p>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 shadow-sm p-6">
          {/* ── FAZENDAS FORM ── */}
          {activeTab === 'fazendas' && (
            <form onSubmit={async e => { e.preventDefault(); await saveRecord('agro_fazendas', formFazenda, editingItem?.id); }} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FI label="Nome da Fazenda" required><input required className={inputCls} value={formFazenda.nome} onChange={e => setFormFazenda({...formFazenda, nome: e.target.value})} /></FI>
                <FI label="Tipo">
                  <select className={selectCls} value={formFazenda.tipo} onChange={e => setFormFazenda({...formFazenda, tipo: e.target.value})}>
                    {['Agrícola','Pecuária','Mista','Florestal','Hortícola'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </FI>
                <FI label="Província" required>
                  <select required className={selectCls} value={formFazenda.provincia} onChange={e => setFormFazenda({...formFazenda, provincia: e.target.value})}>
                    {PROVINCIAS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </FI>
                <FI label="Município"><input className={inputCls} value={formFazenda.municipio||''} onChange={e => setFormFazenda({...formFazenda, municipio: e.target.value})} /></FI>
                <FI label="Área Total (ha)" required><input required type="number" min="0" step="0.01" className={inputCls} value={formFazenda.area_total_ha} onChange={e => setFormFazenda({...formFazenda, area_total_ha: +e.target.value})} /></FI>
                <FI label="Técnico Responsável"><input className={inputCls} value={formFazenda.tecnico_responsavel||''} onChange={e => setFormFazenda({...formFazenda, tecnico_responsavel: e.target.value})} /></FI>
                <FI label="Telefone"><input className={inputCls} value={formFazenda.telefone||''} onChange={e => setFormFazenda({...formFazenda, telefone: e.target.value})} /></FI>
                <FI label="Coordenadas GPS (lat,lng)"><input className={inputCls} placeholder="-11.2027,17.8739" value={(formFazenda as any).coordenadas||''} onChange={e => setFormFazenda({...formFazenda, ...{coordenadas: e.target.value}} as any)} /></FI>
                <FI label="Observações" ><textarea rows={2} className={inputCls} value={formFazenda.observacoes||''} onChange={e => setFormFazenda({...formFazenda, observacoes: e.target.value})} /></FI>
                <FI label="Estado">
                  <select className={selectCls} value={formFazenda.ativa ? 'ativa' : 'inativa'} onChange={e => setFormFazenda({...formFazenda, ativa: e.target.value === 'ativa'})}>
                    <option value="ativa">Activa</option>
                    <option value="inativa">Inactiva</option>
                  </select>
                </FI>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                <button type="button" onClick={() => { setViewMode('list'); setEditingItem(null); }} className="px-6 py-2 bg-zinc-100 text-zinc-600 font-bold text-xs uppercase hover:bg-zinc-200">Cancelar</button>
                <button type="submit" disabled={saving} className="px-8 py-2 bg-emerald-600 text-white font-bold text-xs uppercase hover:bg-emerald-700 disabled:opacity-60 flex items-center gap-2">
                  <Save size={14}/> {saving ? 'A guardar...' : 'Guardar'}
                </button>
              </div>
            </form>
          )}

          {/* ── CULTURAS FORM ── */}
          {activeTab === 'culturas' && (
            <form onSubmit={async e => { e.preventDefault(); await saveRecord('agro_culturas', formCultura, editingItem?.id); }} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FI label="Cultura / Variedade" required><input required className={inputCls} value={formCultura.nome} onChange={e => setFormCultura({...formCultura, nome: e.target.value})} /></FI>
                <FI label="Fazenda">
                  <select className={selectCls} value={formCultura.fazenda_id||''} onChange={e => setFormCultura({...formCultura, fazenda_id: e.target.value})}>
                    <option value="">— Selecionar —</option>
                    {fazendas.map((f: any) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                  </select>
                </FI>
                <FI label="Área (ha)" required><input required type="number" min="0" step="0.01" className={inputCls} value={formCultura.area_ha} onChange={e => setFormCultura({...formCultura, area_ha: +e.target.value})} /></FI>
                <FI label="Status">
                  <select className={selectCls} value={formCultura.status} onChange={e => setFormCultura({...formCultura, status: e.target.value})}>
                    {['Planejado','Germinação','Desenvolvimento','Em Crescimento','Pronto para Colheita','Colhido'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </FI>
                <FI label="Data Sementeira"><input type="date" className={inputCls} value={formCultura.data_plantio||''} onChange={e => setFormCultura({...formCultura, data_plantio: e.target.value})} /></FI>
                <FI label="Previsão Colheita"><input type="date" className={inputCls} value={formCultura.data_colheita_prev||''} onChange={e => setFormCultura({...formCultura, data_colheita_prev: e.target.value})} /></FI>
                <FI label="Est. Rendimento (Ton)"><input type="number" min="0" step="0.01" className={inputCls} value={formCultura.est_rendimento_ton} onChange={e => setFormCultura({...formCultura, est_rendimento_ton: +e.target.value})} /></FI>
                <FI label="Custo Produção (AOA)"><input type="number" min="0" className={inputCls} value={formCultura.custo_producao} onChange={e => setFormCultura({...formCultura, custo_producao: +e.target.value})} /></FI>
                <FI label="Técnico Responsável"><input className={inputCls} value={formCultura.tecnico_responsavel||''} onChange={e => setFormCultura({...formCultura, tecnico_responsavel: e.target.value})} /></FI>
                <FI label="Observações"><textarea rows={2} className={inputCls} value={formCultura.observacoes||''} onChange={e => setFormCultura({...formCultura, observacoes: e.target.value})} /></FI>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                <button type="button" onClick={() => { setViewMode('list'); setEditingItem(null); }} className="px-6 py-2 bg-zinc-100 text-zinc-600 font-bold text-xs uppercase hover:bg-zinc-200">Cancelar</button>
                <button type="submit" disabled={saving} className="px-8 py-2 bg-emerald-600 text-white font-bold text-xs uppercase hover:bg-emerald-700 disabled:opacity-60 flex items-center gap-2"><Save size={14}/>{saving ? 'A guardar...' : 'Guardar'}</button>
              </div>
            </form>
          )}

          {/* ── PECUÁRIA FORM ── */}
          {activeTab === 'pecuaria' && (
            <form onSubmit={async e => { e.preventDefault(); await saveRecord('agro_animais', formAnimal, editingItem?.id); }} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FI label="Tipo / Espécie" required><input required className={inputCls} value={formAnimal.tipo} onChange={e => setFormAnimal({...formAnimal, tipo: e.target.value})} placeholder="Ex: Bovino (Nelore)" /></FI>
                <FI label="Raça"><input className={inputCls} value={formAnimal.raca||''} onChange={e => setFormAnimal({...formAnimal, raca: e.target.value})} /></FI>
                <FI label="Fazenda">
                  <select className={selectCls} value={formAnimal.fazenda_id||''} onChange={e => setFormAnimal({...formAnimal, fazenda_id: e.target.value})}>
                    <option value="">— Selecionar —</option>
                    {fazendas.map((f: any) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                  </select>
                </FI>
                <FI label="Quantidade (Cabeças)" required><input required type="number" min="0" className={inputCls} value={formAnimal.quantidade} onChange={e => setFormAnimal({...formAnimal, quantidade: +e.target.value})} /></FI>
                <FI label="Propósito">
                  <select className={selectCls} value={formAnimal.proposito} onChange={e => setFormAnimal({...formAnimal, proposito: e.target.value})}>
                    {['Corte','Leite','Ovos','Reprodução','Misto'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </FI>
                <FI label="Status Saúde">
                  <select className={selectCls} value={formAnimal.status} onChange={e => setFormAnimal({...formAnimal, status: e.target.value})}>
                    {['Saudável','Atenção','Quarentena','Óbito'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </FI>
                <FI label="Peso Médio (kg)"><input type="number" min="0" step="0.1" className={inputCls} value={formAnimal.peso_medio_kg||''} onChange={e => setFormAnimal({...formAnimal, peso_medio_kg: +e.target.value})} /></FI>
                <FI label="Valor de Mercado (AOA/cabeça)"><input type="number" min="0" className={inputCls} value={formAnimal.valor_mercado_aoa||''} onChange={e => setFormAnimal({...formAnimal, valor_mercado_aoa: +e.target.value})} /></FI>
                <FI label="Última Vacinação"><input type="date" className={inputCls} value={formAnimal.data_ultima_vacinacao||''} onChange={e => setFormAnimal({...formAnimal, data_ultima_vacinacao: e.target.value})} /></FI>
                <FI label="Próxima Vacina"><input type="date" className={inputCls} value={formAnimal.data_proxima_vacina||''} onChange={e => setFormAnimal({...formAnimal, data_proxima_vacina: e.target.value})} /></FI>
                <FI label="Nº Lote Sanitário"><input className={inputCls} value={formAnimal.numero_lote_sanitario||''} onChange={e => setFormAnimal({...formAnimal, numero_lote_sanitario: e.target.value})} /></FI>
                <FI label="Observações"><textarea rows={2} className={inputCls} value={formAnimal.observacoes||''} onChange={e => setFormAnimal({...formAnimal, observacoes: e.target.value})} /></FI>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                <button type="button" onClick={() => { setViewMode('list'); setEditingItem(null); }} className="px-6 py-2 bg-zinc-100 text-zinc-600 font-bold text-xs uppercase hover:bg-zinc-200">Cancelar</button>
                <button type="submit" disabled={saving} className="px-8 py-2 bg-amber-600 text-white font-bold text-xs uppercase hover:bg-amber-700 disabled:opacity-60 flex items-center gap-2"><Save size={14}/>{saving ? 'A guardar...' : 'Guardar'}</button>
              </div>
            </form>
          )}

          {/* ── INSUMOS FORM ── */}
          {activeTab === 'insumos' && (
            <form onSubmit={async e => { e.preventDefault(); await saveRecord('agro_insumos', formInsumo, editingItem?.id); }} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FI label="Nome do Insumo" required><input required className={inputCls} value={formInsumo.nome} onChange={e => setFormInsumo({...formInsumo, nome: e.target.value})} /></FI>
                <FI label="Categoria">
                  <select className={selectCls} value={formInsumo.categoria} onChange={e => setFormInsumo({...formInsumo, categoria: e.target.value})}>
                    {['Semente','Fertilizante','Defensivo Agrícola','Ração','Ferramenta','Combustível','Outro'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </FI>
                <FI label="Fornecedor"><input className={inputCls} value={formInsumo.fornecedor||''} onChange={e => setFormInsumo({...formInsumo, fornecedor: e.target.value})} /></FI>
                <FI label="Armazém / Local"><input className={inputCls} value={formInsumo.local_armazem||''} onChange={e => setFormInsumo({...formInsumo, local_armazem: e.target.value})} /></FI>
                <FI label="Qtd. Actual" required><input required type="number" min="0" step="0.001" className={inputCls} value={formInsumo.quantidade_atual} onChange={e => setFormInsumo({...formInsumo, quantidade_atual: +e.target.value})} /></FI>
                <FI label="Unidade"><input className={inputCls} value={formInsumo.unidade} onChange={e => setFormInsumo({...formInsumo, unidade: e.target.value})} placeholder="kg, L, caixa..." /></FI>
                <FI label="Stock Mínimo (Alerta)"><input type="number" min="0" step="0.001" className={inputCls} value={formInsumo.quantidade_minima} onChange={e => setFormInsumo({...formInsumo, quantidade_minima: +e.target.value})} /></FI>
                <FI label="Preço Unitário (AOA)"><input type="number" min="0" className={inputCls} value={formInsumo.preco_unitario} onChange={e => setFormInsumo({...formInsumo, preco_unitario: +e.target.value})} /></FI>
                <FI label="Número de Lote"><input className={inputCls} value={formInsumo.numero_lote||''} onChange={e => setFormInsumo({...formInsumo, numero_lote: e.target.value})} /></FI>
                <FI label="Data de Validade"><input type="date" className={inputCls} value={formInsumo.data_validade||''} onChange={e => setFormInsumo({...formInsumo, data_validade: e.target.value})} /></FI>
                <FI label="Observações"><textarea rows={2} className={inputCls} value={formInsumo.observacoes||''} onChange={e => setFormInsumo({...formInsumo, observacoes: e.target.value})} /></FI>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                <button type="button" onClick={() => { setViewMode('list'); setEditingItem(null); }} className="px-6 py-2 bg-zinc-100 text-zinc-600 font-bold text-xs uppercase hover:bg-zinc-200">Cancelar</button>
                <button type="submit" disabled={saving} className="px-8 py-2 bg-blue-600 text-white font-bold text-xs uppercase hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"><Save size={14}/>{saving ? 'A guardar...' : 'Guardar'}</button>
              </div>
            </form>
          )}

          {/* ── VENDAS FORM ── */}
          {activeTab === 'vendas' && (
            <form onSubmit={async e => { e.preventDefault(); const payload = {...formVenda, valor_total: formVenda.quantidade * formVenda.preco_unitario}; await saveRecord('agro_vendas_agro', payload, editingItem?.id); }} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FI label="Produto / Cultura" required><input required className={inputCls} value={formVenda.produto} onChange={e => setFormVenda({...formVenda, produto: e.target.value})} /></FI>
                <FI label="Cliente / Comprador" required><input required className={inputCls} value={formVenda.cliente} onChange={e => setFormVenda({...formVenda, cliente: e.target.value})} /></FI>
                <FI label="Data da Venda" required><input required type="date" className={inputCls} value={formVenda.data_venda} onChange={e => setFormVenda({...formVenda, data_venda: e.target.value})} /></FI>
                <FI label="Quantidade" required><input required type="number" min="0" step="0.001" className={inputCls} value={formVenda.quantidade} onChange={e => setFormVenda({...formVenda, quantidade: +e.target.value, valor_total: +e.target.value * formVenda.preco_unitario})} /></FI>
                <FI label="Unidade"><input className={inputCls} value={formVenda.unidade} onChange={e => setFormVenda({...formVenda, unidade: e.target.value})} placeholder="Ton, Saco, kg..." /></FI>
                <FI label="Preço Unitário (AOA)" required><input required type="number" min="0" className={inputCls} value={formVenda.preco_unitario} onChange={e => setFormVenda({...formVenda, preco_unitario: +e.target.value, valor_total: formVenda.quantidade * +e.target.value})} /></FI>
                <FI label="Valor Total (AOA)">
                  <div className="w-full bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm font-bold text-emerald-800 rounded-sm">
                    {FMT_AOA(formVenda.quantidade * formVenda.preco_unitario)}
                  </div>
                </FI>
                <FI label="Status Pagamento">
                  <select className={selectCls} value={formVenda.status_pagamento} onChange={e => setFormVenda({...formVenda, status_pagamento: e.target.value})}>
                    {['Pago','Pendente','Cancelado','Parcial'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </FI>
                <FI label="Transportadora"><input className={inputCls} value={formVenda.transportadora||''} onChange={e => setFormVenda({...formVenda, transportadora: e.target.value})} /></FI>
                <FI label="Destino"><input className={inputCls} value={formVenda.destino||''} onChange={e => setFormVenda({...formVenda, destino: e.target.value})} /></FI>
                <FI label="Número da Guia"><input className={inputCls} value={formVenda.numero_guia||''} onChange={e => setFormVenda({...formVenda, numero_guia: e.target.value})} /></FI>
                <FI label="Observações"><textarea rows={2} className={inputCls} value={formVenda.observacoes||''} onChange={e => setFormVenda({...formVenda, observacoes: e.target.value})} /></FI>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                <button type="button" onClick={() => { setViewMode('list'); setEditingItem(null); }} className="px-6 py-2 bg-zinc-100 text-zinc-600 font-bold text-xs uppercase hover:bg-zinc-200">Cancelar</button>
                <button type="submit" disabled={saving} className="px-8 py-2 bg-[#003366] text-white font-bold text-xs uppercase hover:bg-[#002244] disabled:opacity-60 flex items-center gap-2"><Save size={14}/>{saving ? 'A guardar...' : 'Guardar'}</button>
              </div>
            </form>
          )}

          {/* ── MAQUINARIA FORM ── */}
          {activeTab === 'maquinaria' && (
            <form onSubmit={async e => { e.preventDefault(); await saveRecord('agro_maquinaria', formMaquina, editingItem?.id); }} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FI label="Nome / Descrição" required><input required className={inputCls} value={formMaquina.nome} onChange={e => setFormMaquina({...formMaquina, nome: e.target.value})} /></FI>
                <FI label="Tipo">
                  <select className={selectCls} value={formMaquina.tipo} onChange={e => setFormMaquina({...formMaquina, tipo: e.target.value})}>
                    {['Trator','Colheitadeira','Camião','Bomba de Água','Pulverizador','Outro'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </FI>
                <FI label="Marca"><input className={inputCls} value={formMaquina.marca||''} onChange={e => setFormMaquina({...formMaquina, marca: e.target.value})} /></FI>
                <FI label="Modelo"><input className={inputCls} value={formMaquina.modelo||''} onChange={e => setFormMaquina({...formMaquina, modelo: e.target.value})} /></FI>
                <FI label="Ano Fabrico"><input type="number" min="1950" max="2030" className={inputCls} value={formMaquina.ano_fabricacao||''} onChange={e => setFormMaquina({...formMaquina, ano_fabricacao: +e.target.value})} /></FI>
                <FI label="Matrícula / Placa"><input className={inputCls} value={formMaquina.placa_matricula||''} onChange={e => setFormMaquina({...formMaquina, placa_matricula: e.target.value})} /></FI>
                <FI label="Status">
                  <select className={selectCls} value={formMaquina.status} onChange={e => setFormMaquina({...formMaquina, status: e.target.value})}>
                    {['Operacional','Em Manutenção','Avariado','Inativo'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </FI>
                <FI label="Horas de Uso"><input type="number" min="0" className={inputCls} value={formMaquina.horas_uso} onChange={e => setFormMaquina({...formMaquina, horas_uso: +e.target.value})} /></FI>
                <FI label="Consumo Médio"><input className={inputCls} placeholder="Ex: 15L/h" value={formMaquina.consumo_medio||''} onChange={e => setFormMaquina({...formMaquina, consumo_medio: e.target.value})} /></FI>
                <FI label="Custo Manutenção Total (AOA)"><input type="number" min="0" className={inputCls} value={formMaquina.custo_manutencao_total} onChange={e => setFormMaquina({...formMaquina, custo_manutencao_total: +e.target.value})} /></FI>
                <FI label="Última Manutenção"><input type="date" className={inputCls} value={formMaquina.data_ultima_manutencao||''} onChange={e => setFormMaquina({...formMaquina, data_ultima_manutencao: e.target.value})} /></FI>
                <FI label="Próx. Manutenção"><input type="date" className={inputCls} value={formMaquina.data_proxima_manutencao||''} onChange={e => setFormMaquina({...formMaquina, data_proxima_manutencao: e.target.value})} /></FI>
                <FI label="Observações"><textarea rows={2} className={inputCls} value={formMaquina.observacoes||''} onChange={e => setFormMaquina({...formMaquina, observacoes: e.target.value})} /></FI>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                <button type="button" onClick={() => { setViewMode('list'); setEditingItem(null); }} className="px-6 py-2 bg-zinc-100 text-zinc-600 font-bold text-xs uppercase hover:bg-zinc-200">Cancelar</button>
                <button type="submit" disabled={saving} className="px-8 py-2 bg-[#003366] text-white font-bold text-xs uppercase hover:bg-[#002244] disabled:opacity-60 flex items-center gap-2"><Save size={14}/>{saving ? 'A guardar...' : 'Guardar'}</button>
              </div>
            </form>
          )}

          {/* ── CUSTOS FORM ── */}
          {activeTab === 'custos' && (
            <form onSubmit={async e => { e.preventDefault(); await saveRecord('agro_custos', formCusto, editingItem?.id); }} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FI label="Descrição do Custo" required><input required className={inputCls} value={formCusto.descricao} onChange={e => setFormCusto({...formCusto, descricao: e.target.value})} /></FI>
                <FI label="Categoria">
                  <select className={selectCls} value={formCusto.categoria} onChange={e => setFormCusto({...formCusto, categoria: e.target.value})}>
                    {['Mão-de-Obra','Fertilizantes','Transporte','Combustível','Sementes','Defensivos','Equipamento','Outro'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </FI>
                <FI label="Fazenda">
                  <select className={selectCls} value={formCusto.fazenda_id||''} onChange={e => setFormCusto({...formCusto, fazenda_id: e.target.value})}>
                    <option value="">— Selecionar —</option>
                    {fazendas.map((f: any) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                  </select>
                </FI>
                <FI label="Cultura (opcional)">
                  <select className={selectCls} value={formCusto.cultura_id||''} onChange={e => setFormCusto({...formCusto, cultura_id: e.target.value})}>
                    <option value="">— Selecionar —</option>
                    {culturas.map((c: any) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </FI>
                <FI label="Valor (AOA)" required><input required type="number" min="0" className={inputCls} value={formCusto.valor_aoa} onChange={e => setFormCusto({...formCusto, valor_aoa: +e.target.value})} /></FI>
                <FI label="Data do Custo" required><input required type="date" className={inputCls} value={formCusto.data_custo} onChange={e => setFormCusto({...formCusto, data_custo: e.target.value})} /></FI>
                <FI label="Observações"><textarea rows={2} className={inputCls} value={formCusto.observacoes||''} onChange={e => setFormCusto({...formCusto, observacoes: e.target.value})} /></FI>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                <button type="button" onClick={() => { setViewMode('list'); setEditingItem(null); }} className="px-6 py-2 bg-zinc-100 text-zinc-600 font-bold text-xs uppercase hover:bg-zinc-200">Cancelar</button>
                <button type="submit" disabled={saving} className="px-8 py-2 bg-rose-600 text-white font-bold text-xs uppercase hover:bg-rose-700 disabled:opacity-60 flex items-center gap-2"><Save size={14}/>{saving ? 'A guardar...' : 'Guardar'}</button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // RENDER — LIST VIEW
  // ─────────────────────────────────────────────────────────────────
  const tabsConfig = [
    { id: 'dashboard',  label: 'Resumo',       icon: BarChart3  },
    { id: 'fazendas',   label: 'Fazendas',      icon: Home       },
    { id: 'culturas',   label: 'Lavouras',      icon: Sprout     },
    { id: 'pecuaria',   label: 'Pecuária',      icon: Activity   },
    { id: 'insumos',    label: 'Insumos',       icon: Package    },
    { id: 'vendas',     label: 'Comercialização', icon: Store    },
    { id: 'maquinaria', label: 'Maquinaria',    icon: Tractor    },
    { id: 'custos',     label: 'Custos',        icon: TrendingUp },
    { id: 'clima',      label: 'Clima & Rega',  icon: CloudRain  },
    { id: 'relatorios', label: 'Relatórios',    icon: FileText   },
  ];

  const btnColors: Record<string, string> = {
    fazendas:'bg-emerald-600 hover:bg-emerald-700', culturas:'bg-emerald-600 hover:bg-emerald-700',
    pecuaria:'bg-amber-600 hover:bg-amber-700', insumos:'bg-blue-600 hover:bg-blue-700',
    vendas:'bg-[#003366] hover:bg-[#002244]', maquinaria:'bg-[#003366] hover:bg-[#002244]',
    custos:'bg-rose-600 hover:bg-rose-700',
  };

  const hasForm = ['fazendas','culturas','pecuaria','insumos','vendas','maquinaria','custos'].includes(activeTab);

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      'Operacional':'bg-emerald-100 text-emerald-800','Saudável':'bg-emerald-100 text-emerald-800','Em Crescimento':'bg-blue-100 text-blue-800',
      'Pago':'bg-emerald-100 text-emerald-800','Pendente':'bg-amber-100 text-amber-800','Cancelado':'bg-red-100 text-red-800','Parcial':'bg-orange-100 text-orange-800',
      'Em Manutenção':'bg-orange-100 text-orange-800','Avariado':'bg-red-100 text-red-800','Atenção':'bg-orange-100 text-orange-800','Quarentena':'bg-red-100 text-red-800',
      'Germinação':'bg-yellow-100 text-yellow-800','Desenvolvimento':'bg-blue-100 text-blue-800','Pronto para Colheita':'bg-emerald-100 text-emerald-800','Colhido':'bg-zinc-100 text-zinc-800',
      'Planejado':'bg-zinc-100 text-zinc-800','Inativo':'bg-zinc-100 text-zinc-600',
    };
    return `px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-sm ${map[s] || 'bg-zinc-100 text-zinc-600'}`;
  };

  return (
    <div className="space-y-5">
      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <div className="bg-white border border-zinc-200 shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <div className="w-full h-full" style={{background: 'linear-gradient(135deg, #059669 0%, #003366 100%)'}} />
        </div>
        <div className="relative z-10 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black text-emerald-800 flex items-center gap-2"><Leaf size={26}/> Gestão de Agronegócio</h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-wider border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Exercício {fiscalYear} Ativo
              </span>
            </div>
            <p className="text-zinc-500 text-sm mt-1">Painel integrado de fazendas, culturas, pecuária, insumos e comercialização — Angola</p>
            {!empresaId && <p className="text-amber-600 text-xs font-bold mt-2 bg-amber-50 border border-amber-200 px-3 py-1 rounded-sm inline-block">⚠ Sessão não autenticada — dados locais apenas</p>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchAll} disabled={loading} className="p-2 text-zinc-500 hover:text-emerald-700 hover:bg-emerald-50 border border-zinc-200 rounded-sm transition-colors" title="Recarregar dados">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={() => {
              if (onEmitirFatura) onEmitirFatura();
              else if (onNavigate) onNavigate('invoices');
            }} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 rounded-sm shadow-sm transition-colors">
              <FileText size={14}/> Emitir Fatura
            </button>
            {onNavigate && (
              <>
                <button onClick={() => onNavigate('invoices')} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-zinc-200 text-zinc-600 hover:bg-zinc-50 flex items-center gap-1 rounded-sm">
                  <ShoppingCart size={12}/> Vendas
                </button>
                <button onClick={() => onNavigate('purchases')} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-zinc-200 text-zinc-600 hover:bg-zinc-50 flex items-center gap-1 rounded-sm">
                  <Truck size={12}/> Compras
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── NAVIGATION ─────────────────────────────────────────────── */}
      <div className="bg-white border border-zinc-200 shadow-sm">
        <div className="flex gap-0 border-b border-zinc-100 overflow-x-auto">
          {tabsConfig.map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id as TabType); setViewMode('list'); setSearchTerm(''); }}
              className={`flex items-center gap-1.5 px-4 py-3 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id ? 'text-emerald-700 border-emerald-600 bg-emerald-50/50' : 'text-zinc-500 border-transparent hover:text-zinc-800 hover:bg-zinc-50'
              }`}>
              <tab.icon size={13}/>{tab.label}
            </button>
          ))}
        </div>

        {/* Search + Add button bar */}
        {hasForm && (
          <div className="p-3 flex items-center justify-between gap-3 bg-zinc-50/50 border-b border-zinc-100">
            <div className="relative flex-1 max-w-sm">
              <Search size={13} className="absolute left-3 top-2.5 text-zinc-400"/>
              <input type="text" placeholder="Pesquisar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-zinc-200 bg-white focus:outline-none focus:border-emerald-500 rounded-sm"/>
            </div>
            <button onClick={openNew} className={`${btnColors[activeTab] || 'bg-emerald-600 hover:bg-emerald-700'} text-white px-4 py-2 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 rounded-sm transition-colors`}>
              <Plus size={14}/> Novo Registo
            </button>
          </div>
        )}
      </div>

      {/* ── DASHBOARD ─────────────────────────────────────────────── */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label:'Área Plantada', value:`${FMT_NUM(totalAreaPlantada)} ha`, icon: Sprout,     color:'emerald' },
              { label:'Total Animais', value:`${FMT_NUM(totalAnimais)} cab.`, icon: Activity,   color:'amber'   },
              { label:'Receita Agro (Pago)', value: FMT_AOA(receitaVendas), icon: DollarSign, color:'blue'    },
              { label:'Margem Bruta', value: FMT_AOA(margemBruta), icon: TrendingUp, color: margemBruta >= 0 ? 'emerald' : 'red' },
            ].map((k, i) => (
              <div key={i} className="bg-white border border-zinc-200 shadow-sm p-5 flex items-start gap-3">
                <div className={`p-2.5 rounded-md bg-${k.color}-100 text-${k.color}-700 shrink-0`}><k.icon size={20}/></div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{k.label}</p>
                  <p className="text-lg font-black text-zinc-800 mt-0.5 leading-tight">{k.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Alerts Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-orange-200 shadow-sm p-4">
              <p className="text-[10px] font-bold uppercase text-orange-600 mb-3 flex items-center gap-1"><AlertTriangle size={12}/> Alertas de Stock</p>
              {alertasInsumos.length === 0 ? <p className="text-zinc-400 text-sm">Nenhum alerta activo.</p> :
                alertasInsumos.map((i: any) => (
                  <div key={i.id} className="flex justify-between items-center py-1.5 border-b border-orange-100 last:border-0">
                    <span className="text-sm font-bold text-orange-900">{i.nome}</span>
                    <span className="text-xs text-orange-700">{i.quantidade_atual}/{i.quantidade_minima} {i.unidade}</span>
                  </div>
                ))
              }
            </div>

            <div className="bg-white border border-red-200 shadow-sm p-4">
              <p className="text-[10px] font-bold uppercase text-red-600 mb-3 flex items-center gap-1"><Wrench size={12}/> Maquinaria em Falha</p>
              {maqEmManutencao === 0 ? <p className="text-zinc-400 text-sm">Toda a frota operacional.</p> :
                maquinaria.filter(m => m.status !== 'Operacional').map((m: any) => (
                  <div key={m.id} className="flex justify-between py-1.5 border-b border-red-100 last:border-0">
                    <span className="text-sm font-bold text-red-900">{m.nome}</span>
                    <span className={statusBadge(m.status)}>{m.status}</span>
                  </div>
                ))
              }
            </div>

            <div className="bg-white border border-zinc-200 shadow-sm p-4">
              <p className="text-[10px] font-bold uppercase text-zinc-500 mb-3 flex items-center gap-1"><Calendar size={12}/> Próximas Colheitas</p>
              {culturas.filter(c => c.data_colheita_prev && c.status !== 'Colhido').slice(0, 4).map((c: any) => (
                <div key={c.id} className="flex justify-between py-1.5 border-b border-zinc-100 last:border-0">
                  <span className="text-sm font-medium text-zinc-800">{c.nome}</span>
                  <span className="text-[10px] text-zinc-500">{c.data_colheita_prev}</span>
                </div>
              ))}
              {culturas.filter(c => c.data_colheita_prev && c.status !== 'Colhido').length === 0 && <p className="text-zinc-400 text-sm">Nenhuma colheita prevista.</p>}
            </div>
          </div>

          {/* Charts + Map */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-zinc-200 shadow-sm p-5">
              <BarChart
                label="Culturas — Área Plantada (ha)"
                data={culturas.slice(0, 6).map(c => ({ name: c.nome, value: c.area_ha, color: '#059669' }))}
              />
            </div>
            <div className="bg-white border border-zinc-200 shadow-sm p-5">
              <AngolaMapSVG highlights={provinciasFazendas} />
              <div className="mt-4 grid grid-cols-2 gap-2">
                {[
                  { l: 'Fazendas', v: fazendas.length, c: 'text-emerald-700' },
                  { l: 'Culturas Activas', v: culturas.filter(c => c.status !== 'Colhido').length, c: 'text-blue-700' },
                  { l: 'Vendas Totais', v: vendas.length, c: 'text-[#003366]' },
                  { l: 'Total Custos', v: FMT_AOA(totalCustos), c: 'text-rose-700' },
                ].map((s, i) => (
                  <div key={i} className="bg-zinc-50 border border-zinc-100 p-2 text-center">
                    <p className="text-[10px] font-bold uppercase text-zinc-400">{s.l}</p>
                    <p className={`text-base font-black ${s.c} mt-0.5`}>{s.v}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick redirect buttons */}
          <div className="bg-white border border-zinc-200 shadow-sm p-5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-4">Acesso Rápido</p>
            <div className="flex flex-wrap gap-3">
              {[
                { label:'Nova Fazenda',      tab:'fazendas',  icon: Home,      color:'emerald' },
                { label:'Registar Cultura',  tab:'culturas',  icon: Sprout,    color:'emerald' },
                { label:'Registar Venda',    tab:'vendas',    icon: Store,     color:'blue'    },
                { label:'Adicionar Custo',   tab:'custos',    icon: TrendingUp,color:'rose'    },
                { label:'Análise Avançada',  tab:'relatorios',icon: BarChart3, color:'purple'  },
              ].map((r, i) => (
                <button key={i} onClick={() => { setActiveTab(r.tab as TabType); if (['fazendas','culturas','vendas','custos'].includes(r.tab)) openNew(); }}
                  className={`flex items-center gap-2 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-white bg-${r.color}-600 hover:bg-${r.color}-700 rounded-sm transition-colors`}>
                  <r.icon size={13}/>{r.label}
                </button>
              ))}
              {onNavigate && (
                <button onClick={() => onNavigate('balanco')} className="flex items-center gap-2 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-white bg-[#003366] hover:bg-[#002244] rounded-sm transition-colors">
                  <FileText size={13}/> Balanço Financeiro
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── FAZENDAS LIST ─────────────────────────────────────────── */}
      {activeTab === 'fazendas' && (
        <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#003366] text-white text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Fazenda</th>
                  <th className="px-4 py-3">Província</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3 text-right">Área (ha)</th>
                  <th className="px-4 py-3">Técnico</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-center">Acções</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filterList(fazendas).length === 0
                  ? <tr><td colSpan={7} className="px-4 py-10 text-center text-zinc-400 text-sm">Nenhuma fazenda registada. Clique em "Novo Registo" para começar.</td></tr>
                  : filterList(fazendas).map((f: any) => (
                    <tr key={f.id} className="hover:bg-zinc-50 text-sm transition-colors">
                      <td className="px-4 py-3 font-bold text-zinc-800">{f.nome}</td>
                      <td className="px-4 py-3 text-zinc-600 flex items-center gap-1"><MapPin size={12} className="text-emerald-500"/>{f.provincia}</td>
                      <td className="px-4 py-3 text-zinc-600">{f.tipo}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">{FMT_NUM(f.area_total_ha)}</td>
                      <td className="px-4 py-3 text-zinc-500 text-xs">{f.tecnico_responsavel || '—'}</td>
                      <td className="px-4 py-3 text-center"><span className={statusBadge(f.ativa ? 'Operacional' : 'Inativo')}>{f.ativa ? 'Activa' : 'Inactiva'}</span></td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEdit(f)} className="p-1.5 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"><Edit size={13}/></button>
                          <button onClick={() => setDeleteConfirm(f.id)} className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={13}/></button>
                        </div>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CULTURAS LIST ─────────────────────────────────────────── */}
      {activeTab === 'culturas' && (
        <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#003366] text-white text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Cultura</th>
                  <th className="px-4 py-3">Fazenda</th>
                  <th className="px-4 py-3 text-right">Área (ha)</th>
                  <th className="px-4 py-3">Sementeira</th>
                  <th className="px-4 py-3">Prev. Colheita</th>
                  <th className="px-4 py-3 text-right">Est. Rend. (t)</th>
                  <th className="px-4 py-3 text-right">Custo Prod.</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-center">Acções</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filterList(culturas).length === 0
                  ? <tr><td colSpan={9} className="px-4 py-10 text-center text-zinc-400 text-sm">Nenhuma cultura registada.</td></tr>
                  : filterList(culturas).map((c: any) => (
                    <tr key={c.id} className="hover:bg-zinc-50 text-sm transition-colors">
                      <td className="px-4 py-3 font-bold text-zinc-800 flex items-center gap-1.5"><Sprout size={13} className="text-emerald-500"/>{c.nome}</td>
                      <td className="px-4 py-3 text-zinc-600">{c.fazenda || '—'}</td>
                      <td className="px-4 py-3 text-right font-mono text-zinc-700">{c.area_ha}</td>
                      <td className="px-4 py-3 text-zinc-500 text-xs">{c.data_plantio || '—'}</td>
                      <td className="px-4 py-3 text-zinc-500 text-xs">{c.data_colheita_prev || '—'}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">{c.est_rendimento_ton} t</td>
                      <td className="px-4 py-3 text-right text-xs text-zinc-600">{FMT_AOA(c.custo_producao)}</td>
                      <td className="px-4 py-3 text-center"><span className={statusBadge(c.status)}>{c.status}</span></td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEdit(c)} className="p-1.5 text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"><Edit size={13}/></button>
                          <button onClick={() => setDeleteConfirm(c.id)} className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={13}/></button>
                        </div>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── PECUÁRIA LIST ─────────────────────────────────────────── */}
      {activeTab === 'pecuaria' && (
        <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#003366] text-white text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Tipo / Espécie</th>
                  <th className="px-4 py-3">Fazenda</th>
                  <th className="px-4 py-3 text-center">Cabeças</th>
                  <th className="px-4 py-3">Propósito</th>
                  <th className="px-4 py-3 text-right">Peso Médio</th>
                  <th className="px-4 py-3">Última Vacina</th>
                  <th className="px-4 py-3 text-right">Valor/Cab.</th>
                  <th className="px-4 py-3 text-center">Saúde</th>
                  <th className="px-4 py-3 text-center">Acções</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filterList(animais).length === 0
                  ? <tr><td colSpan={9} className="px-4 py-10 text-center text-zinc-400 text-sm">Nenhum lote registado.</td></tr>
                  : filterList(animais).map((a: any) => (
                    <tr key={a.id} className="hover:bg-zinc-50 text-sm transition-colors">
                      <td className="px-4 py-3 font-bold text-zinc-800">{a.tipo}</td>
                      <td className="px-4 py-3 text-zinc-600">{a.fazenda || '—'}</td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-amber-700">{FMT_NUM(a.quantidade)}</td>
                      <td className="px-4 py-3 text-zinc-600">{a.proposito}</td>
                      <td className="px-4 py-3 text-right text-zinc-600">{a.peso_medio_kg ? `${a.peso_medio_kg} kg` : '—'}</td>
                      <td className="px-4 py-3 text-zinc-500 text-xs">{a.data_ultima_vacinacao || '—'}</td>
                      <td className="px-4 py-3 text-right text-xs text-zinc-600">{a.valor_mercado_aoa ? FMT_AOA(a.valor_mercado_aoa) : '—'}</td>
                      <td className="px-4 py-3 text-center"><span className={statusBadge(a.status)}>{a.status}</span></td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEdit(a)} className="p-1.5 text-zinc-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"><Edit size={13}/></button>
                          <button onClick={() => setDeleteConfirm(a.id)} className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={13}/></button>
                        </div>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── INSUMOS LIST ──────────────────────────────────────────── */}
      {activeTab === 'insumos' && (
        <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#003366] text-white text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Insumo</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Armazém</th>
                  <th className="px-4 py-3 text-right">Qtd. Actual</th>
                  <th className="px-4 py-3 text-right">Mínimo</th>
                  <th className="px-4 py-3 text-right">Preço Unit.</th>
                  <th className="px-4 py-3">Validade</th>
                  <th className="px-4 py-3 text-center">Stock</th>
                  <th className="px-4 py-3 text-center">Acções</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filterList(insumos).length === 0
                  ? <tr><td colSpan={9} className="px-4 py-10 text-center text-zinc-400 text-sm">Nenhum insumo registado.</td></tr>
                  : filterList(insumos).map((i: any) => {
                    const baixo = Number(i.quantidade_atual) <= Number(i.quantidade_minima);
                    return (
                      <tr key={i.id} className={`hover:bg-zinc-50 text-sm transition-colors ${baixo ? 'bg-orange-50/30' : ''}`}>
                        <td className="px-4 py-3 font-bold text-zinc-800">{i.nome}</td>
                        <td className="px-4 py-3 text-zinc-600">{i.categoria}</td>
                        <td className="px-4 py-3 text-zinc-500 text-xs">{i.local_armazem || '—'}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-blue-700">{i.quantidade_atual} {i.unidade}</td>
                        <td className="px-4 py-3 text-right font-mono text-zinc-500">{i.quantidade_minima} {i.unidade}</td>
                        <td className="px-4 py-3 text-right text-xs">{i.preco_unitario > 0 ? FMT_AOA(i.preco_unitario) : '—'}</td>
                        <td className="px-4 py-3 text-xs text-zinc-500">{i.data_validade || '—'}</td>
                        <td className="px-4 py-3 text-center">
                          {baixo
                            ? <span className="text-orange-600 font-bold text-xs flex items-center justify-center gap-1"><AlertTriangle size={12}/>Baixo</span>
                            : <span className="text-emerald-600 font-bold text-xs flex items-center justify-center gap-1"><CheckCircle size={12}/>OK</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => openEdit(i)} className="p-1.5 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"><Edit size={13}/></button>
                            <button onClick={() => setDeleteConfirm(i.id)} className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={13}/></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── VENDAS LIST ──────────────────────────────────────────── */}
      {activeTab === 'vendas' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { l: 'Total Vendas', v: FMT_AOA(vendas.reduce((s, v) => s + Number(v.valor_total||0), 0)), c: 'text-[#003366]' },
              { l: 'Pago', v: FMT_AOA(vendas.filter(v => v.status_pagamento==='Pago').reduce((s, v) => s + Number(v.valor_total||0), 0)), c: 'text-emerald-700' },
              { l: 'Pendente', v: FMT_AOA(vendas.filter(v => v.status_pagamento==='Pendente').reduce((s, v) => s + Number(v.valor_total||0), 0)), c: 'text-amber-600' },
              { l: 'Operações', v: vendas.length, c: 'text-zinc-700' },
            ].map((s, i) => (
              <div key={i} className="bg-white border border-zinc-200 shadow-sm p-4 text-center">
                <p className="text-[10px] font-bold uppercase text-zinc-400">{s.l}</p>
                <p className={`text-base font-black mt-1 ${s.c}`}>{s.v}</p>
              </div>
            ))}
          </div>
          <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#003366] text-white text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Produto</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3 text-right">Qtd.</th>
                    <th className="px-4 py-3 text-right">Preço Unit.</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3">Transportadora</th>
                    <th className="px-4 py-3 text-center">Pagamento</th>
                    <th className="px-4 py-3 text-center">Acções</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filterList(vendas).length === 0
                    ? <tr><td colSpan={9} className="px-4 py-10 text-center text-zinc-400 text-sm">Nenhuma venda registada.</td></tr>
                    : filterList(vendas).map((v: any) => (
                      <tr key={v.id} className="hover:bg-zinc-50 text-sm transition-colors">
                        <td className="px-4 py-3 text-zinc-500 text-xs">{v.data_venda}</td>
                        <td className="px-4 py-3 font-bold text-zinc-800">{v.produto}</td>
                        <td className="px-4 py-3 text-zinc-600">{v.cliente}</td>
                        <td className="px-4 py-3 text-right font-mono">{v.quantidade} {v.unidade}</td>
                        <td className="px-4 py-3 text-right text-xs">{FMT_AOA(v.preco_unitario)}</td>
                        <td className="px-4 py-3 text-right font-bold text-[#003366]">{FMT_AOA(v.valor_total)}</td>
                        <td className="px-4 py-3 text-zinc-500 text-xs">{v.transportadora || '—'}</td>
                        <td className="px-4 py-3 text-center"><span className={statusBadge(v.status_pagamento)}>{v.status_pagamento}</span></td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => openEdit(v)} className="p-1.5 text-zinc-400 hover:text-[#003366] hover:bg-blue-50 rounded transition-colors"><Edit size={13}/></button>
                            <button onClick={() => setDeleteConfirm(v.id)} className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={13}/></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── MAQUINARIA LIST ───────────────────────────────────────── */}
      {activeTab === 'maquinaria' && (
        <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#003366] text-white text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Equipamento</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Marca / Modelo</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Horas</th>
                  <th className="px-4 py-3">Consumo</th>
                  <th className="px-4 py-3">Próx. Manutenção</th>
                  <th className="px-4 py-3 text-right">Custo Manut.</th>
                  <th className="px-4 py-3 text-center">Acções</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filterList(maquinaria).length === 0
                  ? <tr><td colSpan={9} className="px-4 py-10 text-center text-zinc-400 text-sm">Nenhum equipamento registado.</td></tr>
                  : filterList(maquinaria).map((m: any) => (
                    <tr key={m.id} className="hover:bg-zinc-50 text-sm transition-colors">
                      <td className="px-4 py-3 font-bold text-zinc-800">{m.nome}</td>
                      <td className="px-4 py-3 text-zinc-600">{m.tipo}</td>
                      <td className="px-4 py-3 text-zinc-500 text-xs">{[m.marca, m.modelo].filter(Boolean).join(' ') || '—'}</td>
                      <td className="px-4 py-3 text-center"><span className={statusBadge(m.status)}>{m.status}</span></td>
                      <td className="px-4 py-3 text-right font-mono text-zinc-700">{FMT_NUM(m.horas_uso)} h</td>
                      <td className="px-4 py-3 text-zinc-500 text-xs">{m.consumo_medio || '—'}</td>
                      <td className="px-4 py-3 text-zinc-500 text-xs">{m.data_proxima_manutencao || '—'}</td>
                      <td className="px-4 py-3 text-right text-xs">{FMT_AOA(m.custo_manutencao_total)}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEdit(m)} className="p-1.5 text-zinc-400 hover:text-[#003366] hover:bg-blue-50 rounded transition-colors"><Edit size={13}/></button>
                          <button onClick={() => setDeleteConfirm(m.id)} className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={13}/></button>
                        </div>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CUSTOS LIST ───────────────────────────────────────────── */}
      {activeTab === 'custos' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(['Mão-de-Obra','Fertilizantes','Transporte','Combustível'] as string[]).map(cat => {
              const total = custos.filter(c => c.categoria === cat).reduce((s, c) => s + Number(c.valor_aoa||0), 0);
              return (
                <div key={cat} className="bg-white border border-zinc-200 shadow-sm p-4 text-center">
                  <p className="text-[10px] font-bold uppercase text-zinc-400">{cat}</p>
                  <p className="text-sm font-black mt-1 text-rose-700">{FMT_AOA(total)}</p>
                </div>
              );
            })}
          </div>
          <div className="bg-white border border-zinc-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#003366] text-white text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Descrição</th>
                    <th className="px-4 py-3">Categoria</th>
                    <th className="px-4 py-3">Fazenda</th>
                    <th className="px-4 py-3">Cultura</th>
                    <th className="px-4 py-3 text-right">Valor (AOA)</th>
                    <th className="px-4 py-3 text-center">Acções</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filterList(custos).length === 0
                    ? <tr><td colSpan={7} className="px-4 py-10 text-center text-zinc-400 text-sm">Nenhum custo registado.</td></tr>
                    : filterList(custos).map((c: any) => (
                      <tr key={c.id} className="hover:bg-zinc-50 text-sm transition-colors">
                        <td className="px-4 py-3 text-zinc-500 text-xs">{c.data_custo}</td>
                        <td className="px-4 py-3 font-medium text-zinc-800">{c.descricao}</td>
                        <td className="px-4 py-3 text-zinc-600">{c.categoria}</td>
                        <td className="px-4 py-3 text-zinc-500 text-xs">{c.fazenda || '—'}</td>
                        <td className="px-4 py-3 text-zinc-500 text-xs">{c.cultura || '—'}</td>
                        <td className="px-4 py-3 text-right font-bold text-rose-700">{FMT_AOA(c.valor_aoa)}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => openEdit(c)} className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"><Edit size={13}/></button>
                            <button onClick={() => setDeleteConfirm(c.id)} className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 size={13}/></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
          <div className="bg-white border border-zinc-200 shadow-sm p-5">
            <BarChart label="Custos por Categoria (AOA)"
              data={['Mão-de-Obra','Fertilizantes','Transporte','Combustível','Sementes','Defensivos','Equipamento','Outro'].map(cat => ({
                name: cat,
                value: custos.filter(c => c.categoria === cat).reduce((s, c) => s + Number(c.valor_aoa||0), 0),
                color: '#e11d48'
              })).filter(d => d.value > 0)}
            />
          </div>
        </div>
      )}

      {/* ── CLIMA & REGA ─────────────────────────────────────────── */}
      {activeTab === 'clima' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 border border-zinc-200 shadow-sm">
            <h3 className="font-bold text-[#003366] uppercase text-sm mb-4 flex items-center gap-2"><CloudRain size={16}/> Monitoramento Meteorológico</h3>
            <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-md mb-4">
              <div className="flex items-center gap-4">
                <div className="text-blue-600 text-5xl font-black">28°C</div>
                <div>
                  <p className="font-bold text-blue-900">Luanda, Angola</p>
                  <p className="text-xs text-blue-700">Céu Limpo • Humidade: 62%</p>
                </div>
              </div>
              <CloudRain size={40} className="text-blue-400 opacity-30"/>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[['Precipitação','12mm'],['Vento','8km/h'],['Pressão','1012hPa'],['UV','Alta']].map(([l,v]) => (
                <div key={l} className="text-center p-2 bg-zinc-50 border border-zinc-100 rounded-sm">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase">{l}</p>
                  <p className="font-black text-zinc-800 text-sm mt-0.5">{v}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-sm">
              <p className="text-xs font-bold text-amber-800">⚠ Previsão: Chuvas moderadas para os próximos 3 dias (est. 25mm). Recomenda-se suspender aplicação de defensivos.</p>
            </div>
          </div>
          <div className="bg-white p-6 border border-zinc-200 shadow-sm">
            <h3 className="font-bold text-[#003366] uppercase text-sm mb-4 flex items-center gap-2"><Activity size={16}/> Controlo de Rega</h3>
            <p className="text-xs text-zinc-500 mb-4 italic">Estado dos sistemas de irrigação por fazenda/lote.</p>
            <div className="space-y-3">
              {[
                { nome: 'Pivô Central 01 (Milho — Huambo)', ativo: true,  proxima: '06:00' },
                { nome: 'Gotejamento Lote 12 (Tomate)',       ativo: true,  proxima: '18:30' },
                { nome: 'Aspersão Sector A (Feijão)',          ativo: false, proxima: '—' },
                { nome: 'Irrigação Gotejo (Hortícola)',        ativo: false, proxima: '—' },
              ].map((r, i) => (
                <div key={i} className={`flex justify-between items-center p-3 border rounded-sm ${r.ativo ? 'border-emerald-200 bg-emerald-50' : 'border-zinc-100 bg-zinc-50 opacity-60'}`}>
                  <div>
                    <span className="font-bold text-sm text-zinc-800">{r.nome}</span>
                    {r.proxima !== '—' && <p className="text-[10px] text-zinc-500 mt-0.5">Próxima activação: {r.proxima}</p>}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.ativo ? 'bg-emerald-200 text-emerald-800' : 'bg-zinc-200 text-zinc-600'}`}>
                    {r.ativo ? '● Activo' : 'Desligado'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── RELATÓRIOS ────────────────────────────────────────────── */}
      {activeTab === 'relatorios' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-zinc-200 shadow-sm p-5">
              <p className="text-[10px] font-bold uppercase text-zinc-400 mb-3 flex items-center gap-1"><Wheat size={12}/> Produtividade</p>
              <div className="space-y-2">
                <div className="flex justify-between"><span className="text-xs text-zinc-600">Área Total Plantada</span><span className="text-xs font-bold">{FMT_NUM(totalAreaPlantada)} ha</span></div>
                <div className="flex justify-between"><span className="text-xs text-zinc-600">Culturas Activas</span><span className="text-xs font-bold">{culturas.filter(c => c.status !== 'Colhido').length}</span></div>
                <div className="flex justify-between"><span className="text-xs text-zinc-600">Est. Produção Total</span><span className="text-xs font-bold">{FMT_NUM(culturas.reduce((s,c) => s+c.est_rendimento_ton, 0))} t</span></div>
              </div>
            </div>
            <div className="bg-white border border-zinc-200 shadow-sm p-5">
              <p className="text-[10px] font-bold uppercase text-zinc-400 mb-3 flex items-center gap-1"><DollarSign size={12}/> Financeiro</p>
              <div className="space-y-2">
                <div className="flex justify-between"><span className="text-xs text-zinc-600">Receita Paga</span><span className="text-xs font-bold text-emerald-700">{FMT_AOA(receitaVendas)}</span></div>
                <div className="flex justify-between"><span className="text-xs text-zinc-600">Total Custos</span><span className="text-xs font-bold text-rose-700">{FMT_AOA(totalCustos)}</span></div>
                <div className="flex justify-between border-t border-zinc-100 pt-2"><span className="text-xs font-bold text-zinc-800">Margem Bruta</span><span className={`text-xs font-black ${margemBruta >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{FMT_AOA(margemBruta)}</span></div>
              </div>
            </div>
            <div className="bg-white border border-zinc-200 shadow-sm p-5">
              <p className="text-[10px] font-bold uppercase text-zinc-400 mb-3 flex items-center gap-1"><Activity size={12}/> Pecuária</p>
              <div className="space-y-2">
                <div className="flex justify-between"><span className="text-xs text-zinc-600">Total Animais</span><span className="text-xs font-bold">{FMT_NUM(totalAnimais)} cab.</span></div>
                <div className="flex justify-between"><span className="text-xs text-zinc-600">Lotes em Atenção</span><span className="text-xs font-bold text-orange-700">{animais.filter(a => a.status !== 'Saudável').length}</span></div>
                <div className="flex justify-between"><span className="text-xs text-zinc-600">Valor Est. Total</span><span className="text-xs font-bold">{FMT_AOA(animais.reduce((s, a) => s + (Number(a.quantidade||0) * Number(a.valor_mercado_aoa||0)), 0))}</span></div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-zinc-200 shadow-sm p-5">
              <BarChart label="Vendas por Produto (AOA)"
                data={Object.entries(vendas.reduce((acc, v) => { acc[v.produto] = (acc[v.produto]||0) + Number(v.valor_total||0); return acc; }, {} as Record<string, number>))
                  .map(([name, value]) => ({ name, value, color: '#003366' })).slice(0, 8)}
              />
            </div>
            <div className="bg-white border border-zinc-200 shadow-sm p-5">
              <BarChart label="Custos por Categoria (AOA)"
                data={Object.entries(custos.reduce((acc, c) => { acc[c.categoria] = (acc[c.categoria]||0) + Number(c.valor_aoa||0); return acc; }, {} as Record<string, number>))
                  .map(([name, value]) => ({ name, value, color: '#e11d48' })).filter(d => d.value > 0)}
              />
            </div>
          </div>

          {/* Province Map */}
          <div className="bg-white border border-zinc-200 shadow-sm p-5">
            <AngolaMapSVG highlights={provinciasFazendas} />
          </div>

          {/* Export Buttons */}
          <div className="bg-white border border-zinc-200 shadow-sm p-5 flex flex-wrap gap-3">
            <p className="w-full text-[10px] font-bold uppercase text-zinc-400 mb-1">Exportar Relatórios</p>
            <button onClick={() => { const w = window.open('','_blank'); if(w){ w.document.write(`<html><head><title>Relatório Agro</title></head><body><h1>Gestão de Agronegócio</h1><p>Empresa: ${companyData?.nome||''}</p><p>Data: ${new Date().toLocaleDateString('pt-AO')}</p><h2>Vendas</h2><table border=1>${vendas.map(v=>`<tr><td>${v.data_venda}</td><td>${v.produto}</td><td>${v.cliente}</td><td>${v.valor_total}</td><td>${v.status_pagamento}</td></tr>`).join('')}</table></body></html>`); w.document.close(); w.print(); }}}
              className="px-5 py-2 bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-emerald-700 transition-colors rounded-sm">
              <Download size={13}/> PDF Relatório Geral
            </button>
            <button onClick={() => {
              const rows = ['Data,Produto,Cliente,Quantidade,Unidade,Preco Unit,Valor Total,Status', ...vendas.map(v=>`${v.data_venda},${v.produto},${v.cliente},${v.quantidade},${v.unidade},${v.preco_unitario},${v.valor_total},${v.status_pagamento}`)];
              const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
              const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'vendas_agro.csv'; a.click();
            }} className="px-5 py-2 bg-[#1D6F42] text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-[#155232] transition-colors rounded-sm">
              <Download size={13}/> CSV Vendas
            </button>
            <button onClick={() => {
              const rows = ['Data,Descricao,Categoria,Fazenda,Cultura,Valor AOA', ...custos.map(c=>`${c.data_custo},${c.descricao},${c.categoria},${c.fazenda||''},${c.cultura||''},${c.valor_aoa}`)];
              const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
              const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'custos_agro.csv'; a.click();
            }} className="px-5 py-2 bg-rose-600 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-rose-700 transition-colors rounded-sm">
              <Download size={13}/> CSV Custos
            </button>
            {onNavigate && (
              <button onClick={() => onNavigate('balanco')} className="px-5 py-2 bg-[#003366] text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-[#002244] transition-colors rounded-sm">
                <FileText size={13}/> Ver Balanço Financeiro
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM DIALOG ─────────────────────────────────── */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-zinc-900/60 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-white shadow-2xl p-8 max-w-sm w-full text-center space-y-4">
              <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                <Trash2 size={24}/>
              </div>
              <h3 className="font-black text-zinc-800 text-lg">Apagar Registo?</h3>
              <p className="text-sm text-zinc-500">Esta acção não pode ser revertida. O registo será removido permanentemente.</p>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 bg-zinc-100 text-zinc-600 font-bold text-xs uppercase hover:bg-zinc-200 rounded-sm">Cancelar</button>
                <button onClick={() => {
                  const tableMap: Record<string, string> = {
                    fazendas:'agro_fazendas', culturas:'agro_culturas', pecuaria:'agro_animais',
                    insumos:'agro_insumos', vendas:'agro_vendas_agro', maquinaria:'agro_maquinaria', custos:'agro_custos'
                  };
                  deleteRecord(tableMap[activeTab], deleteConfirm!);
                }} className="flex-1 py-2.5 bg-red-600 text-white font-bold text-xs uppercase hover:bg-red-700 rounded-sm">Apagar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
