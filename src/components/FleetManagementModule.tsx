import React, { useState, useEffect, useCallback } from 'react';
import {
  Truck, AlertTriangle, Calendar, Settings, Plus, Wrench, FileText,
  Search, Fuel, Shield, MapPin, ClipboardList, TrendingUp, Edit2, Trash2,
  X, CheckCircle2, RefreshCw, BarChart2, Download, Printer, ArrowRight,
  Activity, DollarSign, Package, AlertCircle, Clock, Users, Star, Eye,
  Navigation, Zap, ChevronDown, ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// ─── FORMATTING ─────────────────────────────────────────────────────────────
const fmt = (v: number) => v.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA', minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtNum = (v: number) => v.toLocaleString('pt-PT');

// ─── FIELD COMPONENTS ───────────────────────────────────────────────────────
const Field = ({ label, children, half }: { label: string; children: React.ReactNode; half?: boolean }) => (
  <div className={half ? 'col-span-1' : 'col-span-2'}>
    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-wider mb-1">{label}</label>
    {children}
  </div>
);
const Inp = ({ ...p }) => <input {...p} className="w-full border border-zinc-300 bg-zinc-50 p-2.5 text-xs font-medium focus:outline-none focus:border-[#003366] focus:ring-1 focus:ring-[#003366]/20 transition-all" />;
const Sel = ({ children, ...p }: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) =>
  <select {...p} className="w-full border border-zinc-300 bg-zinc-50 p-2.5 text-xs font-medium focus:outline-none focus:border-[#003366] transition-all">{children}</select>;
const Tex = ({ ...p }) => <textarea {...p} className="w-full border border-zinc-300 bg-zinc-50 p-2.5 text-xs font-medium focus:outline-none focus:border-[#003366] resize-none transition-all" />;

// ─── STATUS BADGE ────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, string> = {
    'Ativo': 'bg-emerald-100 text-emerald-700',
    'Manutenção': 'bg-amber-100 text-amber-700',
    'Inativo': 'bg-zinc-100 text-zinc-500',
    'Vendido': 'bg-red-100 text-red-700',
    'Concluído': 'bg-emerald-100 text-emerald-700',
    'Em Curso': 'bg-blue-100 text-blue-700',
    'Agendado': 'bg-purple-100 text-purple-700',
    'Cancelado': 'bg-red-100 text-red-700',
  };
  return <span className={`px-2 py-0.5 text-[9px] font-black uppercase ${map[status] || 'bg-zinc-100 text-zinc-600'}`}>{status}</span>;
};

// ─── MODAL BASE ───────────────────────────────────────────────────────────────
const ModalBase = ({ title, icon: Icon, onClose, children, onSubmit, submitting }: any) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="bg-white w-full max-w-3xl shadow-2xl border border-zinc-200 my-4"
    >
      <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-100 bg-[#003366]">
        <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
          <Icon size={16} /> {title}
        </h3>
        <button onClick={onClose} className="p-1.5 text-white/60 hover:text-white hover:bg-white/20 transition-all rounded">
          <X size={16} />
        </button>
      </div>
      <form onSubmit={onSubmit}>
        <div className="p-6 grid grid-cols-2 gap-4 max-h-[75vh] overflow-y-auto">{children}</div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-zinc-100 bg-zinc-50">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold uppercase text-zinc-500 hover:text-zinc-800 transition-colors">Cancelar</button>
          <button type="submit" disabled={submitting}
            className="bg-[#003366] text-white px-6 py-2.5 text-xs font-black uppercase tracking-wider shadow hover:bg-[#002244] transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
            {submitting ? 'A guardar...' : 'Guardar'}
          </button>
        </div>
      </form>
    </motion.div>
  </div>
);

// ─── KPI CARD ──────────────────────────────────────────────────────────────
const KPI = ({ label, value, sub, icon: Icon, color, bg }: any) => (
  <div className="bg-white border border-zinc-200 p-5 flex items-center justify-between hover:shadow-md transition-all group">
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

// ─── TABS ─────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
  { id: 'vehicles', label: 'Viaturas', icon: Truck },
  { id: 'maintenance', label: 'Manutenção', icon: Wrench },
  { id: 'fuel', label: 'Combustível', icon: Fuel },
  { id: 'drivers', label: 'Condutores', icon: Users },
  { id: 'trips', label: 'Viagens', icon: Navigation },
  { id: 'fines', label: 'Multas / Infrações', icon: AlertTriangle },
  { id: 'reports', label: 'Relatórios', icon: FileText },
];

// ─── VEHICLE MODAL ───────────────────────────────────────────────────────────
const VehicleModal = ({ initialData, empresaId, onClose, onSuccess }: any) => {
  const [form, setForm] = useState({
    matricula: initialData?.matricula || '',
    marca: initialData?.marca || '',
    modelo: initialData?.modelo || '',
    ano: initialData?.ano || new Date().getFullYear(),
    cor: initialData?.cor || '',
    tipo_combustivel: initialData?.tipo_combustivel || 'Gasolina',
    tipo_viatura: initialData?.tipo_viatura || 'Ligeiro de Passageiros',
    numero_chassis: initialData?.numero_chassis || '',
    numero_motor: initialData?.numero_motor || '',
    capacidade_lugares: initialData?.capacidade_lugares || 5,
    quilometragem: initialData?.quilometragem || 0,
    quilometragem_proxima_manutencao: initialData?.quilometragem_proxima_manutencao || 5000,
    data_inspecao: initialData?.data_inspecao || '',
    data_seguro: initialData?.data_seguro || '',
    numero_apolice: initialData?.numero_apolice || '',
    seguradora: initialData?.seguradora || '',
    valor_seguro: initialData?.valor_seguro || '',
    valor_aquisicao: initialData?.valor_aquisicao || '',
    data_aquisicao: initialData?.data_aquisicao || '',
    proprietario: initialData?.proprietario || 'Empresa',
    status: initialData?.status || 'Ativo',
    localizacao_atual: initialData?.localizacao_atual || 'Luanda',
    condutor_habitual: initialData?.condutor_habitual || '',
    observacoes: initialData?.observacoes || '',
  });
  const [submitting, setSubmitting] = useState(false);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = { ...form, empresa_id: empresaId };
      let error;
      if (initialData?.id) {
        ({ error } = await supabase.from('frota_veiculos').update(payload).eq('id', initialData.id));
      } else {
        ({ error } = await supabase.from('frota_veiculos').insert(payload));
      }
      if (error) { alert('Erro ao guardar viatura: ' + error.message); return; }
      onSuccess();
    } catch (err: any) { alert('Erro: ' + err.message); } finally { setSubmitting(false); }
  };

  return (
    <ModalBase title={initialData?.id ? 'Editar Viatura' : 'Nova Viatura'} icon={Truck} onClose={onClose} onSubmit={handleSubmit} submitting={submitting}>
      <Field label="Matrícula" half><Inp required value={form.matricula} onChange={(e: any) => set('matricula', e.target.value)} placeholder="LD-XX-XX-AB" /></Field>
      <Field label="Estado" half>
        <Sel value={form.status} onChange={(e: any) => set('status', e.target.value)}>
          <option>Ativo</option><option>Manutenção</option><option>Inativo</option><option>Vendido</option>
        </Sel>
      </Field>
      <Field label="Marca" half><Inp required value={form.marca} onChange={(e: any) => set('marca', e.target.value)} placeholder="Toyota, Ford, Mitsubishi..." /></Field>
      <Field label="Modelo" half><Inp required value={form.modelo} onChange={(e: any) => set('modelo', e.target.value)} placeholder="Hilux, Ranger, Pajero..." /></Field>
      <Field label="Ano" half><Inp type="number" value={form.ano} onChange={(e: any) => set('ano', e.target.value)} /></Field>
      <Field label="Cor" half><Inp value={form.cor} onChange={(e: any) => set('cor', e.target.value)} placeholder="Branco, Preto..." /></Field>
      <Field label="Tipo de Viatura" half>
        <Sel value={form.tipo_viatura} onChange={(e: any) => set('tipo_viatura', e.target.value)}>
          <option>Ligeiro de Passageiros</option><option>Ligeiro de Mercadorias</option>
          <option>Pesado de Passageiros</option><option>Pesado de Mercadorias</option>
          <option>Todo-o-Terreno</option><option>Motociclo</option><option>Empilhador</option>
        </Sel>
      </Field>
      <Field label="Combustível" half>
        <Sel value={form.tipo_combustivel} onChange={(e: any) => set('tipo_combustivel', e.target.value)}>
          <option>Gasolina</option><option>Diesel</option><option>GPL</option><option>Elétrico</option><option>Híbrido</option>
        </Sel>
      </Field>
      <Field label="Nº Chassis" half><Inp value={form.numero_chassis} onChange={(e: any) => set('numero_chassis', e.target.value)} /></Field>
      <Field label="Nº Motor" half><Ins value={form.numero_motor} onChange={(e: any) => set('numero_motor', e.target.value)} /></Field>
      <Field label="Quilometragem Atual" half><Inp type="number" value={form.quilometragem} onChange={(e: any) => set('quilometragem', e.target.value)} /></Field>
      <Field label="Lugares" half><Inp type="number" value={form.capacidade_lugares} onChange={(e: any) => set('capacidade_lugares', e.target.value)} /></Field>
      <Field label="Data Inspeção" half><Inp type="date" value={form.data_inspecao} onChange={(e: any) => set('data_inspecao', e.target.value)} /></Field>
      <Field label="Validade Seguro" half><Inp type="date" value={form.data_seguro} onChange={(e: any) => set('data_seguro', e.target.value)} /></Field>
      <Field label="Nº Apólice" half><Inp value={form.numero_apolice} onChange={(e: any) => set('numero_apolice', e.target.value)} /></Field>
      <Field label="Seguradora" half><Inp value={form.seguradora} onChange={(e: any) => set('seguradora', e.target.value)} placeholder="ENSA, AAA, Garantia..." /></Field>
      <Field label="Valor Seguro (AOA)" half><Inp type="number" value={form.valor_seguro} onChange={(e: any) => set('valor_seguro', e.target.value)} /></Field>
      <Field label="Valor Aquisição (AOA)" half><Inp type="number" value={form.valor_aquisicao} onChange={(e: any) => set('valor_aquisicao', e.target.value)} /></Field>
      <Field label="Data Aquisição" half><Inp type="date" value={form.data_aquisicao} onChange={(e: any) => set('data_aquisicao', e.target.value)} /></Field>
      <Field label="Condutor Habitual" half><Inp value={form.condutor_habitual} onChange={(e: any) => set('condutor_habitual', e.target.value)} /></Field>
      <Field label="Localização Atual" half>
        <Sel value={form.localizacao_atual} onChange={(e: any) => set('localizacao_atual', e.target.value)}>
          {['Luanda','Viana','Talatona','Cacuaco','Benguela','Lobito','Huambo','Lubango','Malanje','Cabinda'].map(l => <option key={l}>{l}</option>)}
        </Sel>
      </Field>
      <Field label="Proprietário">
        <Sel value={form.proprietario} onChange={(e: any) => set('proprietario', e.target.value)}>
          <option>Empresa</option><option>Alugado</option><option>Leasing</option>
        </Sel>
      </Field>
      <Field label="Observações"><Tex rows={2} value={form.observacoes} onChange={(e: any) => set('observacoes', e.target.value)} /></Field>
    </ModalBase>
  );
};

// Alias for typo above
const Ins = ({ ...p }: any) => <input {...p} className="w-full border border-zinc-300 bg-zinc-50 p-2.5 text-xs font-medium focus:outline-none focus:border-[#003366] transition-all" />;

// ─── MAINTENANCE MODAL ───────────────────────────────────────────────────────
const MaintenanceModal = ({ initialData, empresaId, vehicles, onClose, onSuccess }: any) => {
  const [form, setForm] = useState({
    veiculo_id: initialData?.veiculo_id || '',
    tipo: initialData?.tipo || 'Preventiva',
    descricao: initialData?.descricao || '',
    data_manutencao: initialData?.data_manutencao || new Date().toISOString().split('T')[0],
    quilometragem_entrada: initialData?.quilometragem_entrada || '',
    quilometragem_saida: initialData?.quilometragem_saida || '',
    oficina: initialData?.oficina || '',
    mecanico: initialData?.mecanico || '',
    custo_total: initialData?.custo_total || '',
    custo_pecas: initialData?.custo_pecas || '',
    custo_mao_obra: initialData?.custo_mao_obra || '',
    pecas_substituidas: initialData?.pecas_substituidas || '',
    proxima_manutencao_km: initialData?.proxima_manutencao_km || '',
    proxima_manutencao_data: initialData?.proxima_manutencao_data || '',
    status: initialData?.status || 'Agendado',
    prioridade: initialData?.prioridade || 'Normal',
    observacoes: initialData?.observacoes || '',
  });
  const [submitting, setSubmitting] = useState(false);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const v = vehicles.find((x: any) => x.id === form.veiculo_id);
      const payload = { ...form, empresa_id: empresaId, veiculo_matricula: v?.matricula || '' };
      let error;
      if (initialData?.id) {
        ({ error } = await supabase.from('frota_manutencao').update(payload).eq('id', initialData.id));
      } else {
        ({ error } = await supabase.from('frota_manutencao').insert(payload));
      }
      if (error) { alert('Erro: ' + error.message); return; }
      onSuccess();
    } catch (err: any) { alert('Erro: ' + err.message); } finally { setSubmitting(false); }
  };

  return (
    <ModalBase title={initialData?.id ? 'Editar Manutenção' : 'Nova Manutenção'} icon={Wrench} onClose={onClose} onSubmit={handleSubmit} submitting={submitting}>
      <Field label="Viatura">
        <Sel required value={form.veiculo_id} onChange={(e: any) => set('veiculo_id', e.target.value)}>
          <option value="">Selecionar viatura...</option>
          {vehicles.map((v: any) => <option key={v.id} value={v.id}>{v.matricula} — {v.marca} {v.modelo}</option>)}
        </Sel>
      </Field>
      <Field label="Tipo de Manutenção" half>
        <Sel value={form.tipo} onChange={(e: any) => set('tipo', e.target.value)}>
          <option>Preventiva</option><option>Correctiva</option><option>Pneus</option>
          <option>Limpeza</option><option>Inspeção</option><option>Elétrica</option><option>Outro</option>
        </Sel>
      </Field>
      <Field label="Estado" half>
        <Sel value={form.status} onChange={(e: any) => set('status', e.target.value)}>
          <option>Agendado</option><option>Em Curso</option><option>Concluído</option><option>Cancelado</option>
        </Sel>
      </Field>
      <Field label="Prioridade" half>
        <Sel value={form.prioridade} onChange={(e: any) => set('prioridade', e.target.value)}>
          <option>Baixa</option><option>Normal</option><option>Alta</option><option>Urgente</option>
        </Sel>
      </Field>
      <Field label="Data" half><Inp type="date" required value={form.data_manutencao} onChange={(e: any) => set('data_manutencao', e.target.value)} /></Field>
      <Field label="Km Entrada" half><Inp type="number" value={form.quilometragem_entrada} onChange={(e: any) => set('quilometragem_entrada', e.target.value)} /></Field>
      <Field label="Km Saída" half><Inp type="number" value={form.quilometragem_saida} onChange={(e: any) => set('quilometragem_saida', e.target.value)} /></Field>
      <Field label="Oficina" half><Inp value={form.oficina} onChange={(e: any) => set('oficina', e.target.value)} placeholder="Nome da oficina" /></Field>
      <Field label="Mecânico" half><Inp value={form.mecanico} onChange={(e: any) => set('mecanico', e.target.value)} /></Field>
      <Field label="Custo Total (AOA)" half><Inp type="number" value={form.custo_total} onChange={(e: any) => set('custo_total', e.target.value)} /></Field>
      <Field label="Custo Peças (AOA)" half><Inp type="number" value={form.custo_pecas} onChange={(e: any) => set('custo_pecas', e.target.value)} /></Field>
      <Field label="Custo Mão de Obra (AOA)" half><Inp type="number" value={form.custo_mao_obra} onChange={(e: any) => set('custo_mao_obra', e.target.value)} /></Field>
      <Field label="Próxima Manutenção (Km)" half><Inp type="number" value={form.proxima_manutencao_km} onChange={(e: any) => set('proxima_manutencao_km', e.target.value)} /></Field>
      <Field label="Próxima Manutenção (Data)" half><Inp type="date" value={form.proxima_manutencao_data} onChange={(e: any) => set('proxima_manutencao_data', e.target.value)} /></Field>
      <Field label="Descrição"><Tex rows={2} value={form.descricao} onChange={(e: any) => set('descricao', e.target.value)} /></Field>
      <Field label="Peças Substituídas"><Tex rows={2} value={form.pecas_substituidas} onChange={(e: any) => set('pecas_substituidas', e.target.value)} /></Field>
      <Field label="Observações"><Tex rows={2} value={form.observacoes} onChange={(e: any) => set('observacoes', e.target.value)} /></Field>
    </ModalBase>
  );
};

// ─── FUEL MODAL ─────────────────────────────────────────────────────────────
const FuelModal = ({ initialData, empresaId, vehicles, onClose, onSuccess }: any) => {
  const [form, setForm] = useState({
    veiculo_id: initialData?.veiculo_id || '',
    data_abastecimento: initialData?.data_abastecimento || new Date().toISOString().split('T')[0],
    litros: initialData?.litros || '',
    preco_litro: initialData?.preco_litro || '180',
    custo_total: initialData?.custo_total || '',
    quilometragem: initialData?.quilometragem || '',
    posto_combustivel: initialData?.posto_combustivel || '',
    tipo_combustivel: initialData?.tipo_combustivel || 'Diesel',
    motorista: initialData?.motorista || '',
    metodo_pagamento: initialData?.metodo_pagamento || 'Numerário',
    observacoes: initialData?.observacoes || '',
  });
  const [submitting, setSubmitting] = useState(false);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (form.litros && form.preco_litro) {
      set('custo_total', (parseFloat(form.litros) * parseFloat(form.preco_litro)).toFixed(0));
    }
  }, [form.litros, form.preco_litro]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const v = vehicles.find((x: any) => x.id === form.veiculo_id);
      const payload = { ...form, empresa_id: empresaId, veiculo_matricula: v?.matricula || '' };
      let error;
      if (initialData?.id) {
        ({ error } = await supabase.from('frota_combustivel').update(payload).eq('id', initialData.id));
      } else {
        ({ error } = await supabase.from('frota_combustivel').insert(payload));
      }
      if (error) { alert('Erro: ' + error.message); return; }
      onSuccess();
    } catch (err: any) { alert('Erro: ' + err.message); } finally { setSubmitting(false); }
  };

  return (
    <ModalBase title={initialData?.id ? 'Editar Abastecimento' : 'Novo Abastecimento'} icon={Fuel} onClose={onClose} onSubmit={handleSubmit} submitting={submitting}>
      <Field label="Viatura">
        <Sel required value={form.veiculo_id} onChange={(e: any) => set('veiculo_id', e.target.value)}>
          <option value="">Selecionar viatura...</option>
          {vehicles.map((v: any) => <option key={v.id} value={v.id}>{v.matricula} — {v.marca} {v.modelo}</option>)}
        </Sel>
      </Field>
      <Field label="Data" half><Inp type="date" required value={form.data_abastecimento} onChange={(e: any) => set('data_abastecimento', e.target.value)} /></Field>
      <Field label="Combustível" half>
        <Sel value={form.tipo_combustivel} onChange={(e: any) => set('tipo_combustivel', e.target.value)}>
          <option>Diesel</option><option>Gasolina</option><option>GPL</option>
        </Sel>
      </Field>
      <Field label="Litros" half><Inp type="number" required value={form.litros} onChange={(e: any) => set('litros', e.target.value)} /></Field>
      <Field label="Preço/Litro (AOA)" half><Inp type="number" value={form.preco_litro} onChange={(e: any) => set('preco_litro', e.target.value)} /></Field>
      <Field label="Custo Total (AOA)" half><Inp type="number" value={form.custo_total} onChange={(e: any) => set('custo_total', e.target.value)} /></Field>
      <Field label="Km Actual" half><Inp type="number" value={form.quilometragem} onChange={(e: any) => set('quilometragem', e.target.value)} /></Field>
      <Field label="Posto de Combustível" half><Inp value={form.posto_combustivel} onChange={(e: any) => set('posto_combustivel', e.target.value)} placeholder="Sonangol, Pumangol..." /></Field>
      <Field label="Motorista" half><Inp value={form.motorista} onChange={(e: any) => set('motorista', e.target.value)} /></Field>
      <Field label="Método de Pagamento" half>
        <Sel value={form.metodo_pagamento} onChange={(e: any) => set('metodo_pagamento', e.target.value)}>
          <option>Numerário</option><option>Cartão</option><option>Transferência</option><option>Conta Corrente</option>
        </Sel>
      </Field>
      <Field label="Observações"><Tex rows={2} value={form.observacoes} onChange={(e: any) => set('observacoes', e.target.value)} /></Field>
    </ModalBase>
  );
};

// ─── TRIP MODAL ─────────────────────────────────────────────────────────────
const TripModal = ({ initialData, empresaId, vehicles, onClose, onSuccess }: any) => {
  const [form, setForm] = useState({
    veiculo_id: initialData?.veiculo_id || '',
    motorista: initialData?.motorista || '',
    destino: initialData?.destino || '',
    origem: initialData?.origem || 'Luanda',
    data_partida: initialData?.data_partida || new Date().toISOString().split('T')[0],
    hora_partida: initialData?.hora_partida || '08:00',
    data_chegada: initialData?.data_chegada || '',
    hora_chegada: initialData?.hora_chegada || '',
    km_partida: initialData?.km_partida || '',
    km_chegada: initialData?.km_chegada || '',
    motivo: initialData?.motivo || 'Serviço Operacional',
    passageiros: initialData?.passageiros || '',
    custo_estimado: initialData?.custo_estimado || '',
    status: initialData?.status || 'Em Curso',
    observacoes: initialData?.observacoes || '',
  });
  const [submitting, setSubmitting] = useState(false);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const v = vehicles.find((x: any) => x.id === form.veiculo_id);
      const payload = { ...form, empresa_id: empresaId, veiculo_matricula: v?.matricula || '' };
      let error;
      if (initialData?.id) {
        ({ error } = await supabase.from('frota_viagens').update(payload).eq('id', initialData.id));
      } else {
        ({ error } = await supabase.from('frota_viagens').insert(payload));
      }
      if (error) { alert('Erro: ' + error.message); return; }
      onSuccess();
    } catch (err: any) { alert('Erro: ' + err.message); } finally { setSubmitting(false); }
  };

  return (
    <ModalBase title={initialData?.id ? 'Editar Viagem' : 'Nova Viagem'} icon={Navigation} onClose={onClose} onSubmit={handleSubmit} submitting={submitting}>
      <Field label="Viatura">
        <Sel required value={form.veiculo_id} onChange={(e: any) => set('veiculo_id', e.target.value)}>
          <option value="">Selecionar viatura...</option>
          {vehicles.map((v: any) => <option key={v.id} value={v.id}>{v.matricula} — {v.marca} {v.modelo}</option>)}
        </Sel>
      </Field>
      <Field label="Motorista" half><Inp required value={form.motorista} onChange={(e: any) => set('motorista', e.target.value)} /></Field>
      <Field label="Estado" half>
        <Sel value={form.status} onChange={(e: any) => set('status', e.target.value)}>
          <option>Agendada</option><option>Em Curso</option><option>Concluída</option><option>Cancelada</option>
        </Sel>
      </Field>
      <Field label="Origem" half><Inp value={form.origem} onChange={(e: any) => set('origem', e.target.value)} /></Field>
      <Field label="Destino" half><Inp required value={form.destino} onChange={(e: any) => set('destino', e.target.value)} /></Field>
      <Field label="Data Partida" half><Inp type="date" required value={form.data_partida} onChange={(e: any) => set('data_partida', e.target.value)} /></Field>
      <Field label="Hora Partida" half><Inp type="time" value={form.hora_partida} onChange={(e: any) => set('hora_partida', e.target.value)} /></Field>
      <Field label="Data Chegada" half><Inp type="date" value={form.data_chegada} onChange={(e: any) => set('data_chegada', e.target.value)} /></Field>
      <Field label="Hora Chegada" half><Inp type="time" value={form.hora_chegada} onChange={(e: any) => set('hora_chegada', e.target.value)} /></Field>
      <Field label="Km Partida" half><Inp type="number" value={form.km_partida} onChange={(e: any) => set('km_partida', e.target.value)} /></Field>
      <Field label="Km Chegada" half><Inp type="number" value={form.km_chegada} onChange={(e: any) => set('km_chegada', e.target.value)} /></Field>
      <Field label="Motivo" half>
        <Sel value={form.motivo} onChange={(e: any) => set('motivo', e.target.value)}>
          <option>Serviço Operacional</option><option>Transporte de Materiais</option>
          <option>Reunião / Visita</option><option>Entregas</option><option>Recolha</option><option>Outro</option>
        </Sel>
      </Field>
      <Field label="Custo Estimado (AOA)" half><Inp type="number" value={form.custo_estimado} onChange={(e: any) => set('custo_estimado', e.target.value)} /></Field>
      <Field label="Passageiros"><Inp value={form.passageiros} onChange={(e: any) => set('passageiros', e.target.value)} placeholder="Nomes dos passageiros..." /></Field>
      <Field label="Observações"><Tex rows={2} value={form.observacoes} onChange={(e: any) => set('observacoes', e.target.value)} /></Field>
    </ModalBase>
  );
};

// ─── FINE MODAL ─────────────────────────────────────────────────────────────
const FineModal = ({ initialData, empresaId, vehicles, onClose, onSuccess }: any) => {
  const [form, setForm] = useState({
    veiculo_id: initialData?.veiculo_id || '',
    motorista: initialData?.motorista || '',
    data_multa: initialData?.data_multa || new Date().toISOString().split('T')[0],
    tipo_infracao: initialData?.tipo_infracao || 'Excesso de Velocidade',
    local: initialData?.local || '',
    valor_multa: initialData?.valor_multa || '',
    entidade_emissora: initialData?.entidade_emissora || 'DNTT',
    numero_auto: initialData?.numero_auto || '',
    prazo_pagamento: initialData?.prazo_pagamento || '',
    status_pagamento: initialData?.status_pagamento || 'Pendente',
    observacoes: initialData?.observacoes || '',
  });
  const [submitting, setSubmitting] = useState(false);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const v = vehicles.find((x: any) => x.id === form.veiculo_id);
      const payload = { ...form, empresa_id: empresaId, veiculo_matricula: v?.matricula || '' };
      let error;
      if (initialData?.id) {
        ({ error } = await supabase.from('frota_multas').update(payload).eq('id', initialData.id));
      } else {
        ({ error } = await supabase.from('frota_multas').insert(payload));
      }
      if (error) { alert('Erro: ' + error.message); return; }
      onSuccess();
    } catch (err: any) { alert('Erro: ' + err.message); } finally { setSubmitting(false); }
  };

  return (
    <ModalBase title={initialData?.id ? 'Editar Multa' : 'Registar Multa / Infração'} icon={AlertTriangle} onClose={onClose} onSubmit={handleSubmit} submitting={submitting}>
      <Field label="Viatura">
        <Sel required value={form.veiculo_id} onChange={(e: any) => set('veiculo_id', e.target.value)}>
          <option value="">Selecionar viatura...</option>
          {vehicles.map((v: any) => <option key={v.id} value={v.id}>{v.matricula} — {v.marca} {v.modelo}</option>)}
        </Sel>
      </Field>
      <Field label="Motorista" half><Inp value={form.motorista} onChange={(e: any) => set('motorista', e.target.value)} /></Field>
      <Field label="Data" half><Inp type="date" required value={form.data_multa} onChange={(e: any) => set('data_multa', e.target.value)} /></Field>
      <Field label="Tipo de Infração" half>
        <Sel value={form.tipo_infracao} onChange={(e: any) => set('tipo_infracao', e.target.value)}>
          <option>Excesso de Velocidade</option><option>Paragem Proibida</option><option>Semáforo Vermelho</option>
          <option>Documentação Inválida</option><option>Alcoolemia</option><option>Uso do Telemóvel</option><option>Outro</option>
        </Sel>
      </Field>
      <Field label="Entidade Emissora" half>
        <Sel value={form.entidade_emissora} onChange={(e: any) => set('entidade_emissora', e.target.value)}>
          <option>DNTT</option><option>Polícia Nacional</option><option>Câmara Municipal</option><option>INAE</option>
        </Sel>
      </Field>
      <Field label="Nº Auto" half><Inp value={form.numero_auto} onChange={(e: any) => set('numero_auto', e.target.value)} /></Field>
      <Field label="Local" half><Inp value={form.local} onChange={(e: any) => set('local', e.target.value)} /></Field>
      <Field label="Valor (AOA)" half><Inp type="number" required value={form.valor_multa} onChange={(e: any) => set('valor_multa', e.target.value)} /></Field>
      <Field label="Prazo de Pagamento" half><Inp type="date" value={form.prazo_pagamento} onChange={(e: any) => set('prazo_pagamento', e.target.value)} /></Field>
      <Field label="Estado Pagamento" half>
        <Sel value={form.status_pagamento} onChange={(e: any) => set('status_pagamento', e.target.value)}>
          <option>Pendente</option><option>Pago</option><option>Contestado</option><option>Cancelado</option>
        </Sel>
      </Field>
      <Field label="Observações"><Tex rows={2} value={form.observacoes} onChange={(e: any) => set('observacoes', e.target.value)} /></Field>
    </ModalBase>
  );
};

// ─── MAIN MODULE ─────────────────────────────────────────────────────────────
interface FleetModuleProps {
  user?: any;
  companyData?: any;
  onEmitirFatura?: () => void;
  onNavigate?: (tab: string) => void;
}

const FleetManagementModule: React.FC<FleetModuleProps> = ({ user, companyData, onEmitirFatura, onNavigate }) => {
  const { user: authUser } = useAuth();
  const eid = companyData?.id || authUser?.empresa_id || user?.empresa_id || '';

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [fuelLogs, setFuelLogs] = useState<any[]>([]);
  const [trips, setTrips] = useState<any[]>([]);
  const [fines, setFines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingItem, setEditingItem] = useState<any>(null);

  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [showTripModal, setShowTripModal] = useState(false);
  const [showFineModal, setShowFineModal] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!eid) return;
    setLoading(true);
    try {
      const [vRes, mRes, fRes, tRes, fnRes] = await Promise.all([
        supabase.from('frota_veiculos').select('*').eq('empresa_id', eid).is('deleted_at', null).order('created_at', { ascending: false }),
        supabase.from('frota_manutencao').select('*').eq('empresa_id', eid).is('deleted_at', null).order('data_manutencao', { ascending: false }),
        supabase.from('frota_combustivel').select('*').eq('empresa_id', eid).is('deleted_at', null).order('data_abastecimento', { ascending: false }),
        supabase.from('frota_viagens').select('*').eq('empresa_id', eid).is('deleted_at', null).order('data_partida', { ascending: false }),
        supabase.from('frota_multas').select('*').eq('empresa_id', eid).is('deleted_at', null).order('data_multa', { ascending: false }),
      ]);
      setVehicles(vRes.data || []);
      setMaintenance(mRes.data || []);
      setFuelLogs(fRes.data || []);
      setTrips(tRes.data || []);
      setFines(fnRes.data || []);
    } finally { setLoading(false); }
  }, [eid]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleDelete = async (table: string, id: string) => {
    if (!window.confirm('Apagar este registo?')) return;
    await supabase.from(table).update({ deleted_at: new Date().toISOString() }).eq('id', id);
    fetchAll();
  };

  // KPIs
  const totalVehicles = vehicles.length;
  const activeVehicles = vehicles.filter(v => v.status === 'Ativo').length;
  const inMaintenance = vehicles.filter(v => v.status === 'Manutenção').length;
  const totalFuelCost = fuelLogs.reduce((s, f) => s + Number(f.custo_total || 0), 0);
  const totalMaintenanceCost = maintenance.reduce((s, m) => s + Number(m.custo_total || 0), 0);
  const totalKm = vehicles.reduce((s, v) => s + Number(v.quilometragem || 0), 0);
  const pendingFines = fines.filter(f => f.status_pagamento === 'Pendente').length;
  const finesCost = fines.filter(f => f.status_pagamento === 'Pendente').reduce((s, f) => s + Number(f.valor_multa || 0), 0);

  // Chart data
  const monthlyFuel = (() => {
    const m: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      m[key] = 0;
    }
    fuelLogs.forEach(f => {
      const key = (f.data_abastecimento || '').substring(0, 7);
      if (key in m) m[key] += Number(f.custo_total || 0);
    });
    return Object.entries(m).map(([k, v]) => ({ name: k.substring(5), combustivel: v }));
  })();

  const vehicleTypeData = (() => {
    const m: Record<string, number> = {};
    vehicles.forEach(v => { m[v.tipo_viatura || 'Outro'] = (m[v.tipo_viatura || 'Outro'] || 0) + 1; });
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  })();

  const COLORS = ['#003366','#0066cc','#3399ff','#66b2ff','#99ccff','#cce5ff'];

  const filteredVehicles = vehicles.filter(v =>
    !search || `${v.matricula} ${v.marca} ${v.modelo} ${v.condutor_habitual}`.toLowerCase().includes(search.toLowerCase())
  );

  const printReport = (title: string) => {
    const w = window.open('', '_blank');
    if (!w) return;
    let html = `<html><head><title>Gestão de Frotas - ${title}</title>
      <style>body{font-family:Arial,sans-serif;font-size:11px;color:#1a1a1a;padding:24px}
      h1{font-size:16px;font-weight:900;text-transform:uppercase;color:#003366;border-bottom:2px solid #003366;padding-bottom:8px}
      table{width:100%;border-collapse:collapse;margin-top:12px}
      th{background:#003366;color:white;padding:6px 8px;text-align:left;font-size:9px;text-transform:uppercase}
      td{padding:5px 8px;border-bottom:1px solid #e5e7eb;font-size:10px}
      tr:nth-child(even){background:#f9fafb}</style></head><body>
      <div style="text-align:right;font-size:9px;color:#999">Emitido: ${new Date().toLocaleString('pt-PT')}</div>
      <h1>Gestão de Frotas — ${title}</h1>`;
    if (title === 'Frota de Viaturas') {
      html += `<table><tr><th>Matrícula</th><th>Marca/Modelo</th><th>Ano</th><th>Estado</th><th>Km</th><th>Condutor</th></tr>`;
      vehicles.forEach(v => { html += `<tr><td>${v.matricula}</td><td>${v.marca} ${v.modelo}</td><td>${v.ano}</td><td>${v.status}</td><td>${fmtNum(v.quilometragem||0)} km</td><td>${v.condutor_habitual||'—'}</td></tr>`; });
      html += '</table>';
    } else if (title === 'Histórico de Manutenções') {
      html += `<table><tr><th>Data</th><th>Viatura</th><th>Tipo</th><th>Oficina</th><th>Custo</th><th>Estado</th></tr>`;
      maintenance.forEach(m => { html += `<tr><td>${m.data_manutencao}</td><td>${m.veiculo_matricula||'—'}</td><td>${m.tipo}</td><td>${m.oficina||'—'}</td><td>${fmt(m.custo_total||0)}</td><td>${m.status}</td></tr>`; });
      html += '</table>';
    } else if (title === 'Registo de Combustível') {
      html += `<table><tr><th>Data</th><th>Viatura</th><th>Litros</th><th>Posto</th><th>Custo</th></tr>`;
      fuelLogs.forEach(f => { html += `<tr><td>${f.data_abastecimento}</td><td>${f.veiculo_matricula||'—'}</td><td>${f.litros}L</td><td>${f.posto_combustivel||'—'}</td><td>${fmt(f.custo_total||0)}</td></tr>`; });
      html += '</table>';
    }
    html += '</body></html>';
    w.document.write(html);
    w.document.close();
    w.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#003366] p-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-32 translate-x-32" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-24 -translate-x-24" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Truck size={28} className="text-white" />
              <h2 className="text-2xl font-black text-white tracking-tight">Gestão de Frotas</h2>
            </div>
            <p className="text-blue-200 text-sm">Controlo total da frota: viaturas, manutenções, combustível, viagens e multas.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onEmitirFatura}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg"
            >
              <FileText size={15} /> Emitir Fatura
              <ArrowRight size={13} />
            </button>
            <button onClick={fetchAll} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 text-xs font-bold uppercase flex items-center gap-2 transition-all">
              <RefreshCw size={14} /> Atualizar
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide bg-white border border-zinc-200 p-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all flex-shrink-0 ${
              activeTab === tab.id ? 'bg-[#003366] text-white' : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800'
            }`}
          >
            <tab.icon size={13} /> {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }}>

          {/* ── DASHBOARD ── */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPI label="Total Viaturas" value={totalVehicles} sub={`${activeVehicles} ativas`} icon={Truck} color="text-blue-700" bg="bg-blue-50" />
                <KPI label="Em Manutenção" value={inMaintenance} sub="aguardam serviço" icon={Wrench} color="text-amber-700" bg="bg-amber-50" />
                <KPI label="Custo Combustível" value={fmt(totalFuelCost)} sub="total registado" icon={Fuel} color="text-green-700" bg="bg-green-50" />
                <KPI label="Custo Manutenção" value={fmt(totalMaintenanceCost)} sub="total registado" icon={DollarSign} color="text-purple-700" bg="bg-purple-50" />
                <KPI label="Total Quilómetros" value={`${fmtNum(totalKm)} km`} sub="frota total" icon={Navigation} color="text-cyan-700" bg="bg-cyan-50" />
                <KPI label="Multas Pendentes" value={pendingFines} sub={fmt(finesCost)} icon={AlertTriangle} color="text-red-700" bg="bg-red-50" />
                <KPI label="Viagens" value={trips.length} sub={`${trips.filter(t=>t.status==='Em Curso').length} em curso`} icon={MapPin} color="text-indigo-700" bg="bg-indigo-50" />
                <KPI label="Eficiência" value={`${vehicles.length > 0 ? Math.round((activeVehicles/totalVehicles)*100) : 0}%`} sub="viaturas ativas" icon={Activity} color="text-emerald-700" bg="bg-emerald-50" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-zinc-200 p-5">
                  <h3 className="text-xs font-black text-zinc-800 uppercase tracking-wider mb-4">Custo de Combustível (6 Meses)</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={monthlyFuel}>
                      <defs>
                        <linearGradient id="colorFuel" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#003366" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#003366" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: any) => fmt(v)} />
                      <Area type="monotone" dataKey="combustivel" stroke="#003366" fill="url(#colorFuel)" name="Combustível" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white border border-zinc-200 p-5">
                  <h3 className="text-xs font-black text-zinc-800 uppercase tracking-wider mb-4">Distribuição por Tipo de Viatura</h3>
                  {vehicleTypeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={vehicleTypeData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                          {vehicleTypeData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[220px] flex items-center justify-center text-zinc-400 italic text-sm">Adicione viaturas para ver o gráfico.</div>
                  )}
                </div>
              </div>

              {/* Alerts section */}
              <div className="bg-white border border-zinc-200 p-5">
                <h3 className="text-xs font-black text-zinc-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <AlertCircle size={14} className="text-amber-500" /> Alertas e Notificações
                </h3>
                <div className="space-y-2">
                  {inMaintenance > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-amber-50 border-l-4 border-amber-500">
                      <Wrench size={14} className="text-amber-600" />
                      <p className="text-xs font-semibold text-amber-800">{inMaintenance} viatura(s) em manutenção — verifique o estado.</p>
                    </div>
                  )}
                  {pendingFines > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-red-50 border-l-4 border-red-500">
                      <AlertTriangle size={14} className="text-red-600" />
                      <p className="text-xs font-semibold text-red-800">{pendingFines} multa(s) pendentes totalizando {fmt(finesCost)}.</p>
                    </div>
                  )}
                  {vehicles.filter(v => v.data_seguro && new Date(v.data_seguro) < new Date(Date.now() + 30*24*60*60*1000)).length > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-orange-50 border-l-4 border-orange-500">
                      <Shield size={14} className="text-orange-600" />
                      <p className="text-xs font-semibold text-orange-800">{vehicles.filter(v => v.data_seguro && new Date(v.data_seguro) < new Date(Date.now() + 30*24*60*60*1000)).length} seguro(s) a vencer em 30 dias.</p>
                    </div>
                  )}
                  {inMaintenance === 0 && pendingFines === 0 && (
                    <div className="flex items-center gap-3 p-3 bg-emerald-50 border-l-4 border-emerald-500">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      <p className="text-xs font-semibold text-emerald-800">Sem alertas críticos — a frota está em bom estado.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick actions */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Registar Viatura', icon: Truck, action: () => { setEditingItem(null); setShowVehicleModal(true); setActiveTab('vehicles'); } },
                  { label: 'Agendar Manutenção', icon: Wrench, action: () => { setEditingItem(null); setShowMaintenanceModal(true); setActiveTab('maintenance'); } },
                  { label: 'Registar Combustível', icon: Fuel, action: () => { setEditingItem(null); setShowFuelModal(true); setActiveTab('fuel'); } },
                  { label: 'Nova Viagem', icon: Navigation, action: () => { setEditingItem(null); setShowTripModal(true); setActiveTab('trips'); } },
                ].map((a, i) => (
                  <button key={i} onClick={a.action} className="bg-white border border-zinc-200 hover:border-[#003366] hover:bg-blue-50/50 p-4 flex flex-col items-center gap-2 text-center transition-all group">
                    <div className="w-10 h-10 bg-zinc-100 group-hover:bg-[#003366] flex items-center justify-center transition-all">
                      <a.icon size={18} className="text-zinc-500 group-hover:text-white transition-all" />
                    </div>
                    <p className="text-[10px] font-black uppercase text-zinc-600 group-hover:text-[#003366] transition-colors">{a.label}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── VEHICLES ── */}
          {activeTab === 'vehicles' && (
            <div className="space-y-4">
              <div className="bg-white border border-zinc-200 p-4 flex flex-wrap gap-3 items-center justify-between">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="Pesquisar por matrícula, marca ou condutor..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9 pr-4 py-2 border border-zinc-300 text-xs font-medium focus:outline-none focus:border-[#003366] w-72"
                  />
                </div>
                <button onClick={() => { setEditingItem(null); setShowVehicleModal(true); }} className="bg-[#003366] text-white px-4 py-2 text-[10px] font-black uppercase flex items-center gap-2 shadow hover:bg-[#002244] transition-all">
                  <Plus size={14} /> Nova Viatura
                </button>
              </div>

              {loading ? (
                <div className="py-20 text-center text-zinc-400 italic">A carregar viaturas...</div>
              ) : filteredVehicles.length === 0 ? (
                <div className="py-20 text-center text-zinc-400 italic bg-white border border-dashed border-zinc-200">
                  Nenhuma viatura encontrada. Clique em "Nova Viatura" para adicionar.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredVehicles.map((v: any) => (
                    <div key={v.id} className="bg-white border border-zinc-200 hover:shadow-md transition-all group overflow-hidden">
                      <div className={`h-1.5 ${v.status === 'Ativo' ? 'bg-emerald-500' : v.status === 'Manutenção' ? 'bg-amber-500' : 'bg-zinc-400'}`} />
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="text-lg font-black text-zinc-900 font-mono tracking-wider">{v.matricula}</p>
                            <p className="text-xs font-bold text-zinc-600 mt-0.5">{v.marca} {v.modelo} — {v.ano}</p>
                          </div>
                          <StatusBadge status={v.status} />
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[10px] text-zinc-500 mb-3">
                          <span className="flex items-center gap-1"><Fuel size={10} /> {v.tipo_combustivel}</span>
                          <span className="flex items-center gap-1"><Navigation size={10} /> {fmtNum(v.quilometragem||0)} km</span>
                          <span className="flex items-center gap-1"><Users size={10} /> {v.condutor_habitual || 'Sem condutor'}</span>
                          <span className="flex items-center gap-1"><MapPin size={10} /> {v.localizacao_atual || 'Luanda'}</span>
                        </div>

                        {v.data_seguro && (
                          <div className={`text-[9px] font-bold px-2 py-1 mb-3 ${new Date(v.data_seguro) < new Date() ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                            🛡 Seguro: {new Date(v.data_seguro).toLocaleDateString('pt-PT')}
                          </div>
                        )}

                        <div className="flex gap-1 pt-3 border-t border-zinc-100 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => { setEditingItem(v); setShowMaintenanceModal(true); }} className="flex-1 py-1.5 text-[9px] font-black uppercase bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all flex items-center justify-center gap-1">
                            <Wrench size={11} /> Manutenção
                          </button>
                          <button onClick={() => { setEditingItem(v); setShowVehicleModal(true); }} className="p-1.5 text-zinc-400 hover:text-[#003366] hover:bg-blue-50 transition-all">
                            <Edit2 size={13} />
                          </button>
                          <button onClick={() => handleDelete('frota_veiculos', v.id)} className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-all">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── MAINTENANCE ── */}
          {activeTab === 'maintenance' && (
            <div className="space-y-4">
              <div className="bg-white border border-zinc-200 p-4 flex justify-between items-center">
                <div>
                  <p className="text-xs font-black text-zinc-800 uppercase">{maintenance.length} Registos de Manutenção</p>
                  <p className="text-[10px] text-zinc-500">Custo total: {fmt(totalMaintenanceCost)}</p>
                </div>
                <button onClick={() => { setEditingItem(null); setShowMaintenanceModal(true); }} className="bg-[#003366] text-white px-4 py-2 text-[10px] font-black uppercase flex items-center gap-2 shadow hover:bg-[#002244] transition-all">
                  <Plus size={14} /> Agendar Manutenção
                </button>
              </div>
              <div className="bg-white border border-zinc-200 overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-100 text-[10px] font-black text-zinc-500 uppercase border-b border-zinc-200 tracking-wider">
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3">Viatura</th>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Oficina</th>
                      <th className="px-4 py-3">Custo</th>
                      <th className="px-4 py-3">Prioridade</th>
                      <th className="px-4 py-3 text-center">Estado</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {maintenance.length === 0 ? (
                      <tr><td colSpan={8} className="py-16 text-center text-zinc-400 italic">Nenhuma manutenção registada.</td></tr>
                    ) : maintenance.map((m: any) => (
                      <tr key={m.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-zinc-600">{m.data_manutencao}</td>
                        <td className="px-4 py-3 font-bold text-[#003366]">{m.veiculo_matricula || '—'}</td>
                        <td className="px-4 py-3 text-zinc-700">{m.tipo}</td>
                        <td className="px-4 py-3 text-zinc-600">{m.oficina || '—'}</td>
                        <td className="px-4 py-3 font-bold">{m.custo_total ? fmt(m.custo_total) : '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 text-[9px] font-black uppercase ${m.prioridade === 'Urgente' ? 'bg-red-100 text-red-700' : m.prioridade === 'Alta' ? 'bg-orange-100 text-orange-700' : 'bg-zinc-100 text-zinc-600'}`}>{m.prioridade || 'Normal'}</span>
                        </td>
                        <td className="px-4 py-3 text-center"><StatusBadge status={m.status} /></td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => { setEditingItem(m); setShowMaintenanceModal(true); }} className="p-1.5 text-zinc-400 hover:text-[#003366] hover:bg-blue-50 transition-all"><Edit2 size={13} /></button>
                            <button onClick={() => handleDelete('frota_manutencao', m.id)} className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-all"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── FUEL ── */}
          {activeTab === 'fuel' && (
            <div className="space-y-4">
              <div className="bg-white border border-zinc-200 p-4 flex justify-between items-center">
                <div>
                  <p className="text-xs font-black text-zinc-800 uppercase">{fuelLogs.length} Abastecimentos Registados</p>
                  <p className="text-[10px] text-zinc-500">Custo total: {fmt(totalFuelCost)}</p>
                </div>
                <button onClick={() => { setEditingItem(null); setShowFuelModal(true); }} className="bg-[#003366] text-white px-4 py-2 text-[10px] font-black uppercase flex items-center gap-2 shadow hover:bg-[#002244] transition-all">
                  <Plus size={14} /> Registar Abastecimento
                </button>
              </div>
              <div className="bg-white border border-zinc-200 overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-100 text-[10px] font-black text-zinc-500 uppercase border-b border-zinc-200 tracking-wider">
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3">Viatura</th>
                      <th className="px-4 py-3">Litros</th>
                      <th className="px-4 py-3">Posto</th>
                      <th className="px-4 py-3">Motorista</th>
                      <th className="px-4 py-3">Custo</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {fuelLogs.length === 0 ? (
                      <tr><td colSpan={7} className="py-16 text-center text-zinc-400 italic">Nenhum abastecimento registado.</td></tr>
                    ) : fuelLogs.map((f: any) => (
                      <tr key={f.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-zinc-600">{f.data_abastecimento}</td>
                        <td className="px-4 py-3 font-bold text-[#003366]">{f.veiculo_matricula || '—'}</td>
                        <td className="px-4 py-3">{f.litros}L</td>
                        <td className="px-4 py-3 text-zinc-600">{f.posto_combustivel || '—'}</td>
                        <td className="px-4 py-3 text-zinc-700">{f.motorista || '—'}</td>
                        <td className="px-4 py-3 font-bold text-emerald-700">{fmt(f.custo_total || 0)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => { setEditingItem(f); setShowFuelModal(true); }} className="p-1.5 text-zinc-400 hover:text-[#003366] hover:bg-blue-50 transition-all"><Edit2 size={13} /></button>
                            <button onClick={() => handleDelete('frota_combustivel', f.id)} className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-all"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── TRIPS ── */}
          {activeTab === 'trips' && (
            <div className="space-y-4">
              <div className="bg-white border border-zinc-200 p-4 flex justify-between items-center">
                <p className="text-xs font-black text-zinc-800 uppercase">{trips.length} Viagens Registadas</p>
                <button onClick={() => { setEditingItem(null); setShowTripModal(true); }} className="bg-[#003366] text-white px-4 py-2 text-[10px] font-black uppercase flex items-center gap-2 shadow hover:bg-[#002244] transition-all">
                  <Plus size={14} /> Nova Viagem
                </button>
              </div>
              <div className="space-y-3">
                {trips.length === 0 ? (
                  <div className="py-16 text-center text-zinc-400 italic bg-white border border-dashed border-zinc-200">Nenhuma viagem registada.</div>
                ) : trips.map((t: any) => (
                  <div key={t.id} className="bg-white border border-zinc-200 p-5 hover:shadow-md transition-all group">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-black text-[#003366] text-sm">{t.veiculo_matricula || '—'}</span>
                          <StatusBadge status={t.status} />
                          <span className="text-[10px] text-zinc-400 font-bold">{t.motivo}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-600 mb-1">
                          <MapPin size={12} className="text-zinc-400" />
                          <span className="font-semibold">{t.origem}</span>
                          <ArrowRight size={12} className="text-zinc-400" />
                          <span className="font-bold text-zinc-800">{t.destino}</span>
                        </div>
                        <div className="flex gap-4 text-[10px] text-zinc-500">
                          <span>{t.data_partida} {t.hora_partida}</span>
                          {t.data_chegada && <span>→ {t.data_chegada} {t.hora_chegada}</span>}
                          {t.motorista && <span className="flex items-center gap-1"><Users size={10} /> {t.motorista}</span>}
                          {t.km_partida && t.km_chegada && <span className="flex items-center gap-1"><Navigation size={10} /> {fmtNum(t.km_chegada - t.km_partida)} km</span>}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => { setEditingItem(t); setShowTripModal(true); }} className="p-1.5 text-zinc-400 hover:text-[#003366] hover:bg-blue-50 transition-all"><Edit2 size={13} /></button>
                        <button onClick={() => handleDelete('frota_viagens', t.id)} className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-all"><Trash2 size={13} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── FINES ── */}
          {activeTab === 'fines' && (
            <div className="space-y-4">
              <div className="bg-white border border-zinc-200 p-4 flex justify-between items-center">
                <div>
                  <p className="text-xs font-black text-zinc-800 uppercase">{fines.length} Multas / Infrações</p>
                  <p className="text-[10px] text-zinc-500">{pendingFines} pendentes — {fmt(finesCost)}</p>
                </div>
                <button onClick={() => { setEditingItem(null); setShowFineModal(true); }} className="bg-[#003366] text-white px-4 py-2 text-[10px] font-black uppercase flex items-center gap-2 shadow hover:bg-[#002244] transition-all">
                  <Plus size={14} /> Registar Multa
                </button>
              </div>
              <div className="bg-white border border-zinc-200 overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-100 text-[10px] font-black text-zinc-500 uppercase border-b border-zinc-200 tracking-wider">
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3">Viatura</th>
                      <th className="px-4 py-3">Infração</th>
                      <th className="px-4 py-3">Motorista</th>
                      <th className="px-4 py-3">Valor</th>
                      <th className="px-4 py-3">Prazo</th>
                      <th className="px-4 py-3 text-center">Estado</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {fines.length === 0 ? (
                      <tr><td colSpan={8} className="py-16 text-center text-zinc-400 italic">Nenhuma multa registada.</td></tr>
                    ) : fines.map((f: any) => (
                      <tr key={f.id} className="hover:bg-red-50/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-zinc-600">{f.data_multa}</td>
                        <td className="px-4 py-3 font-bold text-[#003366]">{f.veiculo_matricula || '—'}</td>
                        <td className="px-4 py-3 text-zinc-700">{f.tipo_infracao}</td>
                        <td className="px-4 py-3 text-zinc-600">{f.motorista || '—'}</td>
                        <td className="px-4 py-3 font-bold text-red-700">{fmt(f.valor_multa || 0)}</td>
                        <td className="px-4 py-3 font-mono text-zinc-500">{f.prazo_pagamento || '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 text-[9px] font-black uppercase ${f.status_pagamento === 'Pago' ? 'bg-emerald-100 text-emerald-700' : f.status_pagamento === 'Contestado' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                            {f.status_pagamento}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => { setEditingItem(f); setShowFineModal(true); }} className="p-1.5 text-zinc-400 hover:text-[#003366] hover:bg-blue-50 transition-all"><Edit2 size={13} /></button>
                            <button onClick={() => handleDelete('frota_multas', f.id)} className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-all"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── DRIVERS ── */}
          {activeTab === 'drivers' && (
            <div className="bg-white border border-zinc-200 p-8 text-center">
              <Users size={48} className="mx-auto text-zinc-300 mb-4" />
              <h3 className="font-black text-zinc-600 uppercase text-sm">Gestão de Condutores</h3>
              <p className="text-zinc-400 text-xs mt-2">Os condutores são atribuídos diretamente em cada viatura e viagem. Use a aba Viaturas para actualizar o condutor habitual.</p>
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                {[...new Set(vehicles.filter(v => v.condutor_habitual).map((v: any) => v.condutor_habitual))].map((name: any, i: number) => (
                  <div key={i} className="border border-zinc-200 p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#003366] flex items-center justify-center text-white font-black text-sm">{String(name).charAt(0)}</div>
                    <div>
                      <p className="text-xs font-bold text-zinc-800">{name}</p>
                      <p className="text-[10px] text-zinc-400">{vehicles.filter((v: any) => v.condutor_habitual === name).map((v: any) => v.matricula).join(', ')}</p>
                    </div>
                  </div>
                ))}
                {[...new Set(vehicles.filter(v => v.condutor_habitual).map((v: any) => v.condutor_habitual))].length === 0 && (
                  <div className="col-span-3 text-zinc-400 italic text-xs">Nenhum condutor associado a viaturas.</div>
                )}
              </div>
            </div>
          )}

          {/* ── REPORTS ── */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-zinc-200 p-4 text-center">
                  <p className="text-2xl font-black text-[#003366]">{totalVehicles}</p>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase">Total Viaturas</p>
                </div>
                <div className="bg-white border border-zinc-200 p-4 text-center">
                  <p className="text-lg font-black text-emerald-700">{fmt(totalFuelCost)}</p>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase">Custo Combustível</p>
                </div>
                <div className="bg-white border border-zinc-200 p-4 text-center">
                  <p className="text-lg font-black text-amber-700">{fmt(totalMaintenanceCost)}</p>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase">Custo Manutenção</p>
                </div>
                <div className="bg-white border border-zinc-200 p-4 text-center">
                  <p className="text-lg font-black text-red-700">{fmt(finesCost)}</p>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase">Multas Pendentes</p>
                </div>
              </div>

              <div className="bg-white border border-zinc-200 p-5">
                <h3 className="text-xs font-black text-zinc-800 uppercase tracking-wider mb-4">Gerar Relatórios em PDF</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    { title: 'Frota de Viaturas', desc: 'Lista completa de todas as viaturas', icon: Truck },
                    { title: 'Histórico de Manutenções', desc: 'Todos os registos de manutenção e custos', icon: Wrench },
                    { title: 'Registo de Combustível', desc: 'Todos os abastecimentos realizados', icon: Fuel },
                    { title: 'Viagens Realizadas', desc: 'Histórico completo de viagens', icon: Navigation },
                    { title: 'Multas e Infrações', desc: 'Registo de todas as infrações e custos', icon: AlertTriangle },
                    { title: 'Relatório Executivo', desc: 'Resumo completo da gestão de frotas', icon: TrendingUp },
                  ].map((r, i) => (
                    <div key={i} onClick={() => printReport(r.title)}
                      className="flex items-center gap-3 p-4 border border-zinc-200 hover:border-[#003366] hover:bg-blue-50/30 cursor-pointer transition-all group"
                    >
                      <div className="w-9 h-9 bg-zinc-100 group-hover:bg-[#003366] flex items-center justify-center transition-all">
                        <r.icon size={16} className="text-zinc-500 group-hover:text-white transition-all" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-zinc-900 group-hover:text-[#003366] transition-colors">{r.title}</p>
                        <p className="text-[10px] text-zinc-400">{r.desc}</p>
                      </div>
                      <Printer size={14} className="text-zinc-300 group-hover:text-[#003366] transition-all" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-zinc-200 p-5">
                <h3 className="text-xs font-black text-zinc-800 uppercase tracking-wider mb-4">Custos Totais por Categoria</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={[
                    { name: 'Combustível', valor: totalFuelCost },
                    { name: 'Manutenção', valor: totalMaintenanceCost },
                    { name: 'Multas', valor: finesCost },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: any) => fmt(v)} />
                    <Bar dataKey="valor" fill="#003366" name="Custo (AOA)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>

      {/* Modals */}
      {showVehicleModal && (
        <VehicleModal initialData={editingItem} empresaId={eid} onClose={() => { setShowVehicleModal(false); setEditingItem(null); }} onSuccess={() => { setShowVehicleModal(false); setEditingItem(null); fetchAll(); }} />
      )}
      {showMaintenanceModal && (
        <MaintenanceModal initialData={editingItem} empresaId={eid} vehicles={vehicles} onClose={() => { setShowMaintenanceModal(false); setEditingItem(null); }} onSuccess={() => { setShowMaintenanceModal(false); setEditingItem(null); fetchAll(); }} />
      )}
      {showFuelModal && (
        <FuelModal initialData={editingItem} empresaId={eid} vehicles={vehicles} onClose={() => { setShowFuelModal(false); setEditingItem(null); }} onSuccess={() => { setShowFuelModal(false); setEditingItem(null); fetchAll(); }} />
      )}
      {showTripModal && (
        <TripModal initialData={editingItem} empresaId={eid} vehicles={vehicles} onClose={() => { setShowTripModal(false); setEditingItem(null); }} onSuccess={() => { setShowTripModal(false); setEditingItem(null); fetchAll(); }} />
      )}
      {showFineModal && (
        <FineModal initialData={editingItem} empresaId={eid} vehicles={vehicles} onClose={() => { setShowFineModal(false); setEditingItem(null); }} onSuccess={() => { setShowFineModal(false); setEditingItem(null); fetchAll(); }} />
      )}
    </div>
  );
};

export default FleetManagementModule;
